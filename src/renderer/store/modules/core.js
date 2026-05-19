
export default {
  state: {
    core: undefined,
    searching: false,
  },
  getters: {
    core: state => state.core,
    isGameConnected: state => !!state.core,
  },
  mutations: {
    setCore(state, core) {
      state.core = core;
    },
    setSearching(state, searching) {
      state.searching = searching;
    },
  },
};
