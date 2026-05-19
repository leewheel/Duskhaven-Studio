<template>
  <div class="topbar" style="  -webkit-user-select: none; -webkit-app-region: drag;">
      <div class="topbar-status">
          <div v-if="this.$store.state.camera.mode === 'SPECTATE'" class="spectate-status">
            <span class="icon" style="color: #20801d;">
              <i class="fas fa-circle"></i>
            </span>
            <div>[{{ keybindLabels.addWaypoint }}] 添加路径点 - [{{ keybindLabels.playCinematic }}] 播放 - [{{ keybindLabels.clearWaypoints }}] 清除路径点</div>
          </div>
          <div v-if="this.$store.state.camera.mode === 'DISABLED'" class="spectate-status">
            <span class="icon" style="color: #626b82;">
              <i class="fas fa-circle"></i>
            </span>
            <div>[{{ keybindLabels.toggleSpectate }}] 切换观察者模式</div>
          </div>
          <div v-if="this.$store.state.camera.mode === 'PLAYING'" class="spectate-status">
            <span class="icon" style="color: #c10808;">
              <i class="fas fa-circle"></i>
            </span>
            <div>[{{ keybindLabels.playCinematic }}] 停止运镜</div>
          </div>
      </div>
      <transition name="toast-fade">
        <div v-if="toast.visible" class="toast-popup">{{ toast.message }}</div>
      </transition>
      <div class="topbar-app-control" style="-webkit-app-region: no-drag;">
          <span v-on:click="minimize"><i data-feather="minus"></i></span>
          <span v-on:click="maximize"><i data-feather="square"></i></span>
          <span v-on:click="close"><i data-feather="x"></i></span>
      </div>
  </div>
</template>

<script>
  const remote = require('@electron/remote')
  const { BrowserWindow } = remote;
  const { getKeyLabel } = require('../domain/keybinds');
  var WindowStatus = { maximized: false }

  function getWindow() {
    return remote.getCurrentWindow() || BrowserWindow.getFocusedWindow();
  }

  export default {
    name: 'topbar',
    created() {
      window.onbeforeunload = () => this.cleanupBeforeClose();
    },
    mounted() {
      feather.replace({  width: "16", height: "16" });
      const self = this;
      window.__duskhavenToast = function (msg) {
        self.showToast(msg);
      };
    },
    methods: {
        showToast(msg) {
          if (this._toastTimer) clearTimeout(this._toastTimer);
          this.toast.message = msg;
          this.toast.visible = true;
          this._toastTimer = setTimeout(() => {
            this.toast.visible = false;
          }, 3000);
        },
        cleanupBeforeClose() {
          try {
            this.$store.dispatch('saveSettings');
          } catch (error) {
            console.warn('[Duskhaven window] Failed to save settings before close', error);
          }

          try {
            this.$store.commit('setMode', 'DISABLED');
            this.$store.commit("setTimeOfDayStatus", false);
          } catch (error) {
            console.warn('[Duskhaven window] Failed to reset game state before close', error);
          }
        },
        minimize() {
          const win = getWindow();
          if (!win) return;
          win.minimize();
        },
        maximize() {
          const win = getWindow();
          if (!win) return;
          if(WindowStatus.maximized === true) {
            WindowStatus.maximized = false;
            win.unmaximize();
          } else {
            WindowStatus.maximized = true;
            win.maximize();
          }
        },
        close() {
          const win = getWindow();
          if (!win) return;
          this.cleanupBeforeClose();
          win.destroy();
        },
    },
    computed: {
      keybinds() {
        return this.$store.state.settings.keybinds;
      },
      keybindLabels() {
        return {
          addWaypoint: getKeyLabel(this.keybinds.addWaypoint),
          clearWaypoints: getKeyLabel(this.keybinds.clearWaypoints),
          playCinematic: getKeyLabel(this.keybinds.playCinematic),
          toggleSpectate: getKeyLabel(this.keybinds.toggleSpectate),
        };
      },
    },
    data() {
      return {
        toast: { message: '', visible: false },
      }
    },
  };
</script>

<style scoped>
    .topbar{
        position: sticky;
        top: 0;
        z-index: 2000;
        width: 100%;
        height: 40px;
        flex: 0 0 40px;
        box-sizing: border-box;
        background-color: #1e2433;
        display: flex;
        margin-left: 1px;
        align-items: center;
        justify-content: space-between;
    }
    .topbar-status {
        color: #626b82;
        font-size: 0.9em;
    }
    .topbar-app-control {
        margin-right: 10px;
        color: #626b82;
        font-size: 0.9em;
        display: flex;
    }
    .topbar-app-control > span {
        margin-left: 10px;
        display: flex;
    }
    .topbar-app-control > span:hover {
      color: white;
    }
    .spectate-status {
      display: flex;
      align-items: center;
      margin-left: 15px;
    }
    .toast-popup {
      position: fixed;
      top: 50px;
      left: 50%;
      transform: translateX(-50%);
      background: #ff1a3b;
      color: #fff;
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      z-index: 9999;
      box-shadow: 0 4px 20px rgba(255, 26, 59, 0.4);
      white-space: nowrap;
    }
    .toast-fade-enter-active,
    .toast-fade-leave-active {
      transition: opacity 0.3s ease, transform 0.3s ease;
    }
    .toast-fade-enter,
    .toast-fade-leave-to {
      opacity: 0;
      transform: translateX(-50%) translateY(-10px);
    }
</style>
