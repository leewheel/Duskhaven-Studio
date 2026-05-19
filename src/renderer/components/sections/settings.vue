<template>
  <div>
    <div class="tabs is-boxed">
      <settingsMenu></settingsMenu>
    </div>
    <div class="container">
      <div class="settings-grid">
        <section class="settings-panel">
          <label class="label">窗口</label>
          <label class="checkbox checkbox-custom">
            <input
              type="checkbox"
              id="always_on_top"
              name="always_on_top"
              v-model="alwaysOnTop"
              v-on:change="setAlwaysOnTop($event)"
            />
            <label for="always_on_top">
              <span></span>窗口置顶显示
            </label>
            <div class="checkbox_indicator no-drop"></div>
          </label>
          <button class="button devtools-button" v-on:click="openDevTools">打开开发者工具</button>
        </section>

        <section class="settings-panel">
          <label class="label">快捷键</label>
          <div
            class="field keybind-row"
            v-for="binding in keybindOptions"
            v-bind:key="binding.action"
          >
            <label class="keybind-label">{{ binding.label }}</label>
            <div class="control">
              <button
                class="button keybind-button"
                v-bind:class="{ 'is-listening': listeningAction === binding.action }"
                v-on:click="startKeybindCapture(binding.action)"
              >
                {{ listeningAction === binding.action ? '按下按键...' : getKeyLabel(keybinds[binding.action]) }}
              </button>
            </div>
          </div>
        </section>
      </div>

      <div class="columns settings-path">
        配置文件保存路径：{{ this.$store.state.settings.configPath }}
      </div>
    </div>
  </div>
</template>

<script>
const { BrowserWindow } = require('@electron/remote');
const { getKeyLabel, keyNameFromEvent } = require('../../domain/keybinds');

export default {
  name: 'settings',
  components: {
    settingsMenu: require('./settingsMenu'),
  },
  methods: {
    openDevTools() {
      BrowserWindow.getFocusedWindow().webContents.openDevTools();
    },
    setAlwaysOnTop({ target: element }) {
      this.$store.commit('setAlwaysOnTop', element.checked);
      BrowserWindow.getFocusedWindow().setAlwaysOnTop(element.checked);
    },
    startKeybindCapture(action) {
      this.listeningAction = action;
    },
    getKeyLabel,
    handleKeybindCapture(event) {
      if (!this.listeningAction) return;
      const key = keyNameFromEvent(event);
      event.preventDefault();
      event.stopPropagation();
      if (!key) return;
      const action = this.listeningAction;
      this.$store.commit('setKeybind', { action, key });
      this.keybinds = Object.assign({}, this.keybinds, {
        [action]: key,
      });
      this.listeningAction = null;
    },
  },
  mounted() {
    document.addEventListener('keydown', this.handleKeybindCapture, true);
  },
  destroyed() {
    document.removeEventListener('keydown', this.handleKeybindCapture, true);
  },
  data() {
    return {
      alwaysOnTop: this.$store.state.settings.alwaysOnTop,
      keybindOptions: [
        { action: 'toggleSpectate', label: '切换观察者' },
        { action: 'addWaypoint', label: '添加路径点' },
        { action: 'playCinematic', label: '播放' },
        { action: 'clearWaypoints', label: '清除路径点' },
      ],
      keybinds: Object.assign({}, this.$store.state.settings.keybinds),
      listeningAction: null,
    };
  },
};
</script>

<style scoped>
  .settings-grid {
    display: grid;
    grid-template-columns: minmax(260px, 320px) minmax(320px, 420px);
    gap: 18px;
    align-items: start;
    margin-top: 8px;
  }
  .settings-panel {
    border: 1px solid #263247;
    background-color: #10151f;
    padding: 18px;
  }
  .devtools-button {
    margin-top: 18px;
    background-color: #10151f;
    border: 1px solid #23c7d8;
    color: #fff;
  }
  .devtools-button:hover,
  .devtools-button:focus {
    color: #fff;
    border-color: #40e7f1;
    box-shadow: 0 0 0 1px rgba(35, 199, 216, 0.35);
  }
  .keybind-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 10px;
  }
  .keybind-label {
    color: #fff;
    font-weight: 600;
  }
  .keybind-button {
    min-width: 110px;
    background-color: #10151f;
    border: 1px solid #263247;
    color: #fff;
    justify-content: center;
  }
  .keybind-button:hover,
  .keybind-button:focus,
  .keybind-button.is-listening {
    color: #fff;
    border-color: #23c7d8;
    box-shadow: 0 0 0 1px rgba(35, 199, 216, 0.35);
  }
  .keybind-button.is-listening {
    background-color: #092532;
  }
  .settings-path {
    margin-top: 16px;
    color: #626b82;
  }
  @media (max-width: 900px) {
    .settings-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
