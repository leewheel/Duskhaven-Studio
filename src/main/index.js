require('@electron/remote/main').initialize();
const { app, BrowserWindow, desktopCapturer, ipcMain } = require('electron');

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
const winURL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:9080'
  : `file://${__dirname}/index.html`;

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

  return sources.filter(source => {
    return source.name.toLowerCase().indexOf('world of warcraft') !== -1;
  }).map(source => ({
    id: source.id,
    name: source.name,
    thumbnail: source.thumbnail.toDataURL(),
  }));
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
