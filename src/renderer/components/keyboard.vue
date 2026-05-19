<template>
</template>

<script>
  const ActiveWindow = require('../../core/native/activeWindow');
  const ApplyEnvironment = require('../domain/applyEnvironment');
  const CreateCinematicBuilder = require('../domain/cinematicBuilder');
  const { getKeyCode, KEY_CODES } = require('../domain/keybinds');
  const CinematicBuilder = CreateCinematicBuilder.default(ApplyEnvironment.default);
  const gui = require('../../core/native/globalUserInput');
  gui.init();
  const defaultKeybinds = {
    addWaypoint: 'F4',
    clearWaypoints: 'F6',
    playCinematic: 'F5',
    toggleSpectate: 'F3',
  };
  let debugTime = 0;
  let previousKeyState = {};
  let actionKeyState = {};
  let coreLaunchPending = false;
  let pendingCoreAction = null;
  const keybindActions = ['toggleSpectate', 'addWaypoint', 'playCinematic', 'clearWaypoints'];

  function didPressAction(store, action) {
    const keyCode = getActionKeyCode(store, action);
    const isDown = gui.keyboard.isDown(keyCode);
    const wasDown = Boolean(actionKeyState[action]);
    actionKeyState[action] = isDown;
    return isDown && !wasDown;
  }

  function syncActionKeyState(store) {
    keybindActions.forEach((action) => {
      actionKeyState[action] = gui.keyboard.isDown(getActionKeyCode(store, action));
    });
  }

  function ensureCoreReady(store, action) {
    if (store.getters.core && store.getters.core.camera) return true;
    if (action) pendingCoreAction = action;
    if (coreLaunchPending) return false;
    if (typeof window.launch !== 'function') {
      window.__duskhavenToast && window.__duskhavenToast('未检测到魔兽世界运行');
      return false;
    }

    coreLaunchPending = true;
    window.launch((error, AppManager) => {
      coreLaunchPending = false;
      if (error) {
        window.__duskhavenToast && window.__duskhavenToast('未检测到魔兽世界运行');
        if (store && store.commit) store.commit('setMode', 'DISABLED');
        return;
      }

      store.commit('setGameInfo', AppManager.Game);
      store.commit('setCore', AppManager);
      if (pendingCoreAction) {
        const readyAction = pendingCoreAction;
        pendingCoreAction = null;
        readyAction();
      }
    });

    return false;
  }

  function isDebugEnabled() {
    return Boolean(
      (typeof window !== 'undefined' && window.__DUSKHAVEN_KEY_DEBUG)
      || (typeof global !== 'undefined' && global.__DUSKHAVEN_KEY_DEBUG)
    );
  }

  function logKeyboardDebug() {
    if (!isDebugEnabled()) return;

    const now = Date.now();
    const activeWindow = ActiveWindow.find();
    const gameActive = activeWindow && activeWindow.includes('World of Warcraft');
    const keyState = Object.keys(KEY_CODES).reduce((state, keyName) => {
      state[keyName] = gui.keyboard.isDown(KEY_CODES[keyName]);
      return state;
    }, {});

    const changedKeys = Object.keys(keyState).filter((keyName) => keyState[keyName] !== previousKeyState[keyName]);
    if (changedKeys.length) {
      changedKeys.forEach((keyName) => {
        console.log(`[Duskhaven keyboard] ${keyName} ${keyState[keyName] ? 'down' : 'up'}`);
      });
      previousKeyState = keyState;
    }

    if (now > debugTime + 1000) {
      debugTime = now;
      console.log('[Duskhaven keyboard] status', {
        inputSource: gui.source || 'unknown',
        activeWindowSource: ActiveWindow.source || 'unknown',
        activeWindow,
        gameActive,
        keyState,
      });
    }
  }

  function shouldPlayCinematic(newMode, oldMode) {
    return newMode === 'PLAYING' || (newMode === 'SPECTATE' && oldMode === 'SPECTATE');
  }

  function startCinematicFromBeginning(store) {
    if (cinematic && cinematic.tween) cinematic.stop();
    if (store.getters.mode === 'PLAYING') store.commit('setMode', 'SPECTATE');
    if (store.getters.mode === 'DISABLED') store.commit('setMode', 'SPECTATE');
    setTimeout(() => store.dispatch('playCinematic'), 50);
  }

  function getActionKeyCode(store, action) {
    const key = store.state.settings.keybinds[action];
    return getKeyCode(key) || getKeyCode(defaultKeybinds[action]);
  }

  function runKeyboardAction(store, action) {
    if (action === 'toggleSpectate') {
      if (cinematic && cinematic.tween) cinematic.stop();
      store.dispatch('toggleSpectate');
    }

    if (action === 'addWaypoint') store.dispatch('addWaypoint');

    if (action === 'playCinematic') {
      if (store.getters.mode === 'SPECTATE') store.dispatch('playCinematic');
      if (store.getters.mode === 'PLAYING' && (cinematic && cinematic.tween)) {
        cinematic.stop();
        store.commit('setMode', 'SPECTATE');
      }
    }

    if (action === 'clearWaypoints') store.dispatch('cleanWaypoints');
  }

  let cinematic;
  export default {
    name: 'keyboard',
    data() {
      return {
        
      };
    },
    mounted() {
      if (typeof window !== 'undefined') {
        window.DuskhavenKeyboardDebug = {
          enable() {
            window.__DUSKHAVEN_KEY_DEBUG = true;
            if (typeof global !== 'undefined') global.__DUSKHAVEN_KEY_DEBUG = true;
            console.log('[Duskhaven keyboard] debug enabled');
          },
          disable() {
            window.__DUSKHAVEN_KEY_DEBUG = false;
            if (typeof global !== 'undefined') global.__DUSKHAVEN_KEY_DEBUG = false;
            console.log('[Duskhaven keyboard] debug disabled');
          },
        };
      }

      const store = this.$store;
      this.playFromStartHandler = () => startCinematicFromBeginning(store);
      window.addEventListener('duskhaven-play-cinematic-from-start', this.playFromStartHandler);

      setInterval(() => {
        logKeyboardDebug();
        const pressedAction = keybindActions.find(action => didPressAction(store, action));
        if (!pressedAction) return;
        const action = () => runKeyboardAction(store, pressedAction);
        if (!ensureCoreReady(store, action)) return;
        action();
      }, 20);
    },
    destroyed() {
      if (this.playFromStartHandler) {
        window.removeEventListener('duskhaven-play-cinematic-from-start', this.playFromStartHandler);
      }
    },
    computed: {
      mode() { return this.$store.state.camera.mode; }
    },
    watch: {
      mode: {
        handler (newMode, previousMode) {
          if (newMode === 'SPECTATE' && previousMode === 'DISABLED' && this.$route.path !== '/spectate/cinematicBuilder') {
            this.$router.push({ path: '/spectate/cinematicBuilder' });
          }
          if (shouldPlayCinematic(newMode, previousMode)) {
            this.$store.dispatch('playCinematic');
            const steps = this.$store.getters.steps;
            const speed = this.$store.getters.cinematicSpeed;
            const shouldLoop = this.$store.state.camera.loopCinematic;
            const store = this.$store;
            const easing = `${this.$store.state.camera.easing}.${this.$store.state.camera.easingTypeSelected}`;
            cinematic = CinematicBuilder(steps, speed, store, shouldLoop, easing);
          }
        },
        deep: true
      }
    },
  };
</script>

<style scoped>
</style>
