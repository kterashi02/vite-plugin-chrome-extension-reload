// @ts-nocheck

const PLUGIN_NAME = 'Chrome Extension Reload'

declare const __RELOAD_PORT__: number

type ReloadMessage = {
  type: 'reload-extension' | 'reload-tab' | 'keepalive'
}

type MessageHandler = (message: ReloadMessage, ws: WebSocket) => void

export function createReloadClient(onMessage: MessageHandler): { getWs: () => WebSocket | null } {
  const port = __RELOAD_PORT__
  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempts = 0
  const MAX_RECONNECT_ATTEMPTS = 5
  const RECONNECT_DELAY = 3000

  function connect(): void {
    if (ws?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      ws = new WebSocket(`ws://localhost:${port}`)

      ws.onopen = () => {
        console.log(`[${PLUGIN_NAME}] Connected to dev server`)
        reconnectAttempts = 0 // Reset attempts on successful connection
        if (reconnectTimer) {
          clearTimeout(reconnectTimer)
          reconnectTimer = null
        }
      }

      ws.onmessage = (event) => {
        try {
          const message: ReloadMessage = JSON.parse(event.data)
          onMessage(message, ws!)
        } catch {
          // Ignore invalid messages
        }
      }

      ws.onclose = () => {
        ws = null
        scheduleReconnect()
      }

      ws.onerror = () => {
        ws?.close()
      }
    } catch (error) {
      console.error(`[${PLUGIN_NAME}] Failed to connect:`, error)
      scheduleReconnect()
    }
  }

  function scheduleReconnect(): void {
    if (reconnectTimer) {
      return
    }

    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.log(`[${PLUGIN_NAME}] Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Stopping reconnection.`)
      return
    }

    reconnectAttempts++
    console.log(`[${PLUGIN_NAME}] Attempting reconnection ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${RECONNECT_DELAY}ms...`)

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connect()
    }, RECONNECT_DELAY)
  }

  connect()

  return {
    getWs: () => ws
  }
}
