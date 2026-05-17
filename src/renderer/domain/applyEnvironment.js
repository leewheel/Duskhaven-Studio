function applyEnvironment(cinematicValues, firstStep, keyframes, store) {
    if (!firstStep.environment) return;
    const environmentCore = store.getters.core && store.getters.core.environment;
    if (!environmentCore) return;
    const timeOfDay = firstStep.environment.timeOfDay;
    const time = environmentCore.GetNormalizedTimeOfDay(timeOfDay.hour, timeOfDay.minutes);
    cinematicValues.timeOfDay = time;
    keyframes = keyframes.map((keyframe) => {
        const timeOfDay = keyframe.environment.timeOfDay;
        keyframe.timeOfDay = environmentCore.GetNormalizedTimeOfDay(timeOfDay.hour, timeOfDay.minutes);
        return keyframe;
    });
}

export default applyEnvironment;
