const loadNative = require('./loadNative');

function createWindowsInput() {
  const koffi = loadNative('koffi');
  const user32 = koffi.load('user32.dll');
  const getAsyncKeyState = user32.func('short __stdcall GetAsyncKeyState(int vKey)');

  const inputState = {
    isDown(key) {
      return (getAsyncKeyState(key) & 0x8000) !== 0;
    },
  };

  return {
    source: 'koffi:GetAsyncKeyState',
    init() {},
    keyboard: inputState,
    mouse: inputState,
  };
}

function loadGlobalUserInput() {
  try {
    const nativeInput = loadNative('globaluserinput').default;
    nativeInput.source = 'globaluserinput';
    return nativeInput;
  } catch (error) {
    try {
      return createWindowsInput();
    } catch (koffiError) {
      const inputState = {
        isDown() {
          return false;
        },
      };

      return {
        source: 'none',
        init() {},
        keyboard: inputState,
        mouse: inputState,
      };
    }
  }
}

module.exports = loadGlobalUserInput();
