require('@electron/remote/main').initialize();
const { app, BrowserWindow, desktopCapturer, ipcMain, screen, powerSaveBlocker } = require('electron');

import * as remoteMain from '@electron/remote/main';

const path = require('path');
/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\') // eslint-disable-line
}

let mainWindow;
let windowTools = null;
let recordingPowerSaveBlockerId = null;
const winURL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:9080'
  : `file://${__dirname}/index.html`;

function getWindowTools() {
  if (windowTools) return windowTools;

  try {
    const koffi = require('koffi');
    const user32 = koffi.load('user32.dll');
    const RECT = koffi.struct('RECT', {
      left: 'long',
      top: 'long',
      right: 'long',
      bottom: 'long',
    });
    const POINT = koffi.struct('POINT', {
      x: 'long',
      y: 'long',
    });

    const getWindowRect = user32.func('bool __stdcall GetWindowRect(void* hWnd, _Out_ RECT* lpRect)');
    const getClientRect = user32.func('bool __stdcall GetClientRect(void* hWnd, _Out_ RECT* lpRect)');
    const clientToScreen = user32.func('bool __stdcall ClientToScreen(void* hWnd, _Inout_ POINT* lpPoint)');
    const isIconic = user32.func('bool __stdcall IsIconic(void* hWnd)');
    const showWindow = user32.func('bool __stdcall ShowWindow(void* hWnd, int nCmdShow)');
    const bringWindowToTop = user32.func('bool __stdcall BringWindowToTop(void* hWnd)');
    const setForegroundWindow = user32.func('bool __stdcall SetForegroundWindow(void* hWnd)');

    windowTools = {
      getBounds(hwnd) {
        const rect = {};
        if (!getWindowRect(hwnd, rect)) return null;

        const width = rect.right - rect.left;
        const height = rect.bottom - rect.top;
        if (width <= 0 || height <= 0) return null;

        const bounds = {
          left: rect.left,
          top: rect.top,
          width,
          height,
        };

        const clientRect = {};
        const clientPoint = { x: 0, y: 0 };
        if (getClientRect(hwnd, clientRect) && clientToScreen(hwnd, clientPoint)) {
          const clientWidth = clientRect.right - clientRect.left;
          const clientHeight = clientRect.bottom - clientRect.top;
          if (clientWidth > 0 && clientHeight > 0) {
            bounds.clientLeft = clientPoint.x;
            bounds.clientTop = clientPoint.y;
            bounds.clientWidth = clientWidth;
            bounds.clientHeight = clientHeight;
            bounds.clientOffsetX = Math.max(0, clientPoint.x - rect.left);
            bounds.clientOffsetY = Math.max(0, clientPoint.y - rect.top);
          }
        }

        return bounds;
      },
      focus(hwnd) {
        const SW_RESTORE = 9;
        if (isIconic(hwnd)) showWindow(hwnd, SW_RESTORE);
        bringWindowToTop(hwnd);
        return Boolean(setForegroundWindow(hwnd));
      },
    };
  } catch (error) {
    windowTools = {
      getBounds() {
        return null;
      },
      focus() {
        return false;
      },
    };
  }

  return windowTools;
}

function parseSourceHwnd(sourceId) {
  const parts = String(sourceId || '').split(':');
  if (parts.length < 2 || parts[0] !== 'window') return null;

  const hwnd = Number(parts[1]);
  return Number.isFinite(hwnd) && hwnd > 0 ? hwnd : null;
}

function getDisplayForBounds(bounds) {
  const displays = screen.getAllDisplays();
  const center = {
    x: bounds.left + (bounds.width / 2),
    y: bounds.top + (bounds.height / 2),
  };

  for (let index = 0; index < displays.length; index += 1) {
    const displayBounds = displays[index].bounds;
    if (
      center.x >= displayBounds.x &&
      center.x < displayBounds.x + displayBounds.width &&
      center.y >= displayBounds.y &&
      center.y < displayBounds.y + displayBounds.height
    ) {
      return {
        index,
        bounds: displayBounds,
        scaleFactor: displays[index].scaleFactor || 1,
      };
    }
  }

  return {
    index: 0,
    bounds: displays[0] ? displays[0].bounds : { x: 0, y: 0, width: 1920, height: 1080 },
    scaleFactor: displays[0] ? displays[0].scaleFactor || 1 : 1,
  };
}

function parseDisplayIndex(sourceId) {
  const parts = String(sourceId || '').split(':');
  if (parts.length < 2 || parts[0] !== 'display') return null;

  const index = Number(parts[1]);
  return Number.isFinite(index) && index >= 0 ? index : null;
}

function createWindow() {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    width: 1360,
    minWidth: 1180,
    height: 430,
    minHeight: 410,
    backgroundColor: "#161b26",
    frame: false,
    title: 'Duskhaven Studio',
    bottom: 0,
    icon: path.join(__dirname, '/../../static/resources/duskhavenstudio.ico'),
    transparent: true,
    webPreferences: {
      backgroundThrottling: false,
      devTools: true,
      contextIsolation: false,
      nodeIntegration: true,
      nodeIntegrationInWorker: true,                                                  
      enableRemoteModule: true  
    },
  });
  remoteMain.enable(mainWindow.webContents);
  mainWindow.loadURL(winURL);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.handle('duskhaven:get-capture-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['window'],
    thumbnailSize: { width: 220, height: 124 },
  });

  const wowSources = sources.filter(source => {
    return source.name.toLowerCase().indexOf('world of warcraft') !== -1;
  }).map(source => {
    const hwnd = parseSourceHwnd(source.id);
    const bounds = hwnd ? getWindowTools().getBounds(hwnd) : null;
    const display = bounds ? getDisplayForBounds(bounds) : null;

    return {
      type: 'window',
      id: source.id,
      hwnd,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL(),
      captureMode: 'window',
      captureId: source.id,
      displayIndex: display ? display.index : null,
    };
  });

  return wowSources;
});

ipcMain.handle('duskhaven:get-window-bounds', async (event, sourceId) => {
  const displayIndex = parseDisplayIndex(sourceId);
  if (displayIndex !== null) {
    const displays = screen.getAllDisplays();
    const display = displays[displayIndex];
    if (!display) return null;

    return {
      type: 'display',
      left: display.bounds.x,
      top: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
      displayIndex,
      displayLeft: display.bounds.x,
      displayTop: display.bounds.y,
      displayWidth: display.bounds.width,
      displayHeight: display.bounds.height,
      scaleFactor: display.scaleFactor || 1,
    };
  }

  const hwnd = parseSourceHwnd(sourceId);
  if (!hwnd) return null;

  const bounds = getWindowTools().getBounds(hwnd);
  if (!bounds) return null;

  const display = getDisplayForBounds(bounds);
  return Object.assign({}, bounds, {
    displayIndex: display.index,
    displayLeft: display.bounds.x,
    displayTop: display.bounds.y,
    displayWidth: display.bounds.width,
    displayHeight: display.bounds.height,
    scaleFactor: display.scaleFactor || 1,
  });
});

ipcMain.handle('duskhaven:focus-capture-window', async (event, sourceId) => {
  const hwnd = parseSourceHwnd(sourceId);
  if (!hwnd) return false;
  return getWindowTools().focus(hwnd);
});

ipcMain.handle('duskhaven:set-recording-power-save-blocker', async (event, enabled) => {
  if (enabled) {
    if (recordingPowerSaveBlockerId === null) {
      recordingPowerSaveBlockerId = powerSaveBlocker.start('prevent-app-suspension');
    }
    return true;
  }

  if (recordingPowerSaveBlockerId !== null && powerSaveBlocker.isStarted(recordingPowerSaveBlockerId)) {
    powerSaveBlocker.stop(recordingPowerSaveBlockerId);
  }
  recordingPowerSaveBlockerId = null;
  return true;
});

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

/*
import { autoUpdater } from 'electron-updater'

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
})
 */
