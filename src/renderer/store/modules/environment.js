
export default {
  state: {
    timeOfDay: { hour: 0, minutes: 0 },
    isTimeOfDayEnabled: false,
  },
  getters: {
    timeOfDay: state => state.timeOfDay,
    isTimeOfDayEnabled: state => state.isTimeOfDayEnabled,
  },
  mutations: {
    setTimeOfDayStatus(state, isEnabled) {
      const environmentCore = this.getters.core && this.getters.core.environment;
      state.isTimeOfDayEnabled = isEnabled;
      if (!environmentCore) {
        window.__duskhavenToast && window.__duskhavenToast('未检测到魔兽世界运行');
        return;
      }
      if (isEnabled) return environmentCore.enableTimeOfDay();
      return environmentCore.disableTimeOfDay();
    },
    setTimeOfDay(state, TimeOfDay) {
      const environmentCore = this.getters.core && this.getters.core.environment;
      state.timeOfDay = TimeOfDay;
      if (!environmentCore) {
        window.__duskhavenToast && window.__duskhavenToast('未检测到魔兽世界运行');
        return;
      }
      environmentCore.setTimeOfday({ ...TimeOfDay });
    },
  },
};
