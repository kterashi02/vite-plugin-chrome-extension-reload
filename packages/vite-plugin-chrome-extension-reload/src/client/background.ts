import { createReloadClient } from './reload-client.js'

const PLUGIN_NAME = 'Chrome Extension Reload'

const client = createReloadClient((message, ws) => {
  switch (message.type) {
    case 'reload-extension':
      console.log(`[${PLUGIN_NAME}] Reloading extension...`)
      chrome.runtime.reload()
      break
  }
})

// Keep Service Worker alive by sending periodic messages
// Based on Chrome Extension docs: https://developer.chrome.com/docs/extensions/how-to/web-platform/websockets
setInterval(() => {
  const ws = client.getWs()
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'keepalive' }))
  }
}, 20000)
