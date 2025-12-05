import { WebSocketServer, WebSocket } from 'ws'
import type { HMRMessage } from './types.js'
import { PLUGIN_NAME } from './const.js'

export class HMRServer {
  private wss: WebSocketServer | null = null
  private clients: Set<WebSocket> = new Set()
  private port: number
  private log: boolean

  constructor(port: number, log: boolean = true) {
    this.port = port
    this.log = log
  }

  start(): void {
    if (this.wss) {
      return
    }

    this.wss = new WebSocketServer({ port: this.port })

    this.wss.on('connection', (ws) => {
      this.clients.add(ws)
      if (this.log) {
        console.log(`[${PLUGIN_NAME}] Client connected (total: ${this.clients.size})`)
      }

      ws.on('close', () => {
        this.clients.delete(ws)
        if (this.log) {
          console.log(`[${PLUGIN_NAME}] Client disconnected (total: ${this.clients.size})`)
        }
      })

      ws.on('error', (error) => {
        if (this.log) {
          console.error(`[${PLUGIN_NAME}] WebSocket error:`, error.message)
        }
        this.clients.delete(ws)
      })
    })

    this.wss.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`[${PLUGIN_NAME}] Port ${this.port} is already in use`)
        console.error(`Please ensure that:`)
        console.error(`1. No other instance of this dev server is running`)
        console.error(`2. Or use a different port in the plugin configuration`)
        process.exit(1)
      } else {
        console.error(`[${PLUGIN_NAME}] Server error:`, error.message)
        process.exit(1)
      }
    })

    if (this.log) {
      console.log(`[${PLUGIN_NAME}] WebSocket server started on ws://localhost:${this.port}`)
    }
  }

  broadcast(message: HMRMessage): void {
    const data = JSON.stringify(message)
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data)
      }
    }
  }

  sendReloadExtension(): void {
    if (this.log) {
      console.log(`[${PLUGIN_NAME}] Sending reload-extension to all clients`)
    }
    this.broadcast({ type: 'reload-extension' })
  }

  sendReloadTab(): void {
    if (this.log) {
      console.log(`[${PLUGIN_NAME}] Sending reload-tab to all clients`)
    }
    this.broadcast({ type: 'reload-tab' })
  }

  stop(): void {
    if (this.wss) {
      for (const client of this.clients) {
        client.close()
      }
      this.clients.clear()
      this.wss.close()
      this.wss = null

      if (this.log) {
        console.log(`[${PLUGIN_NAME}] WebSocket server stopped`)
      }
    }
  }
}
