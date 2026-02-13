const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('orthoscan', {
  platform: process.platform,
})
