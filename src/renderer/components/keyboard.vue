<template>
</template>

<script>
  const ActiveWindow = require('../../core/native/activeWindow');
  const ApplyEnvironment = require('../domain/applyEnvironment');
  const CreateCinematicBuilder = require('../domain/cinematicBuilder');
  const CinematicBuilder = CreateCinematicBuilder.default(ApplyEnvironment.default);
  const gui = require('../../core/native/globalUserInput');
  gui.init();
  let currTime = new Date();
  let debugTime = 0;
  let previousKeyState = {};
  const keyMap = {
    F3: 0x72,
    F4: 0x73,
    F5: 0x74,
    F6: 0x75,
  };
  const shouldNotify = () => {
    const now = new Date().getTime();
    if (now > currTime.getTime() + 300) {
      currTime = new Date();
      return true;
    }
  };

  function pressingKey(key) {
    return gui.keyboard.isDown(key) && shouldNotify();
  }

  function isGameActive() {
    const activeWindow = ActiveWindow.find();
    return activeWindow && activeWindow.includes('World of Warcraft');
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
    const keyState = Object.keys(keyMap).reduce((state, keyName) => {
      state[keyName] = gui.keyboard.isDown(keyMap[keyName]);
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
        if (!isGameActive()) return;
        if (pressingKey(0x72)) { // F3
          if (cinematic && cinematic.tween) cinematic.stop();
          store.dispatch('toggleSpectate');
        }
        if (pressingKey(0x73)) store.dispatch('addWaypoint'); // F4
        if (pressingKey(0x74)) { // F5
          if (store.getters.mode === 'SPECTATE') store.dispatch('playCinematic');
          if (store.getters.mode === 'PLAYING' && (cinematic && cinematic.tween)) {
            cinematic.stop();
            store.commit('setMode', 'SPECTATE');
          }
        }
        if (pressingKey(0x75)) store.dispatch('cleanWaypoints'); // F6
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
