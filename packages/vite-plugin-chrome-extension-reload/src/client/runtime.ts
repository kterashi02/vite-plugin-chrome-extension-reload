import { createReloadClient } from './reload-client.js'

const PLUGIN_NAME = 'Chrome Extension Reload'

createReloadClient((message) => {
  switch (message.type) {
    case 'reload-tab':
      // Delay reload for non-visible tabs
      if (document.visibilityState === 'visible') {
        console.log(`[${PLUGIN_NAME}] Reloading page...`)
        location.reload()
      } else {
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            console.log(`[${PLUGIN_NAME}] Tab became visible, reloading...`)
            location.reload()
          }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)
      }
      break
  }
})
