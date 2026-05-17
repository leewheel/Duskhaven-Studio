const loadNative = require('./loadNative');

function missingNativeModule() {
  throw new Error(
    'The optional native dependency "crazymem" is not installed or could not be built. ' +
    'Install the Windows C++ build tools and Windows SDK, then run npm install again.'
  );
}

function createMissingRobotUtils() {
  return {
    Memory: missingNativeModule,
    Window: {
      getList: missingNativeModule,
    },
  };
}

function loadCrazyMem() {
  try {
    return loadNative('crazymem').RobotUtils;
  } catch (error) {
    return createMissingRobotUtils();
  }
}

module.exports = loadCrazyMem();
