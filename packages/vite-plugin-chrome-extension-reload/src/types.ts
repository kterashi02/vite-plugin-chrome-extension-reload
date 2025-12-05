export type PluginOptions = {
  /**
   * WebSocket server port
   * @default 8789
   */
  port?: number

  /**
   * Input path for background script
   * @example 'src/background/index.ts'
   */
  backgroundInput?: string

  /**
   * Output paths for content scripts (as specified in manifest.json)
   * These will use stub loader for cache busting
   * @example ['src/content/index.js']
   */
  contentScriptOutputs?: string[]

  /**
   * Enable logging
   * @default true in development
   */
  log?: boolean
}

export type HMRMessageType = 'reload-extension' | 'reload-tab' | 'keepalive'

export type HMRMessage = {
  type: HMRMessageType
}

export type ResolvedOptions = {
  port: number
  backgroundInput: string | undefined
  contentScriptOutputs: string[]
  log: boolean
}
