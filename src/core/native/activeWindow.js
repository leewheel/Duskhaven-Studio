const loadNative = require('./loadNative');

function createWindowsActiveWindow() {
  const koffi = loadNative('koffi');
  const user32 = koffi.load('user32.dll');
  const getForegroundWindow = user32.func('void* __stdcall GetForegroundWindow()');
  const getWindowTextA = user32.func('int __stdcall GetWindowTextA(void* hWnd, char* lpString, int nMaxCount)');

  return {
    source: 'koffi:GetForegroundWindow',
    find() {
      const hwnd = getForegroundWindow();
      if (!hwnd) return null;

      const title = Buffer.alloc(512);
      const length = getWindowTextA(hwnd, title, title.length);
      if (!length) return null;

      return title.toString('utf8', 0, length);
    },
  };
}

function loadActiveWindow() {
  try {
    const nativeActiveWindow = loadNative('active-window-sync');
    nativeActiveWindow.source = 'active-window-sync';
    return nativeActiveWindow;
  } catch (error) {
    try {
      return createWindowsActiveWindow();
    } catch (koffiError) {
      return {
        source: 'none',
        find() {
          return null;
        },
      };
    }
  }
}

module.exports = loadActiveWindow();
