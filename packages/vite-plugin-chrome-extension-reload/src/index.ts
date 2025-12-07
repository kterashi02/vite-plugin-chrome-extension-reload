import type { Plugin, ResolvedConfig } from 'vite'
import type { OutputBundle, OutputChunk } from 'rollup'
import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname, basename } from 'path'
import type { PluginOptions, ResolvedOptions } from './types.js'
import { HMRServer } from './server.js'
import { getClientCode, wrapClientCode } from './client-code.js'
import { PLUGIN_NAME } from './const.js'

function resolveOptions(options: PluginOptions = {}): ResolvedOptions {
  return {
    port: options.port ?? 8789,
    backgroundInput: options.backgroundInput,
    contentScriptOutputs: options.contentScriptOutputs ?? [],
    log: options.log ?? false,
  }
}

function removeExtension(path: string): string {
  return path.replace(/\.[^/.]+$/, '')
}

export default function chromeExtensionHmr(options: PluginOptions = {}): Plugin {
  const resolvedOptions = resolveOptions(options)
  let config: ResolvedConfig
  let server: HMRServer | null = null
  let isWatchMode = false
  let lastChangedFiles: Set<string> = new Set()

  // Map: output path (without extension) -> actual file path
  const contentScriptActualPaths: Map<string, string> = new Map()

  return {
    name: 'vite-plugin-chrome-extension-hmr',

    configResolved(resolvedConfig) {
      config = resolvedConfig
      isWatchMode = !!config.build.watch
    },

    transform(code, id) {
      if (!isWatchMode) {
        return null
      }

      // Check if this is background script
      if (resolvedOptions.backgroundInput && id.endsWith(resolvedOptions.backgroundInput)) {
        const clientCode = getClientCode('background', resolvedOptions.port)
        return `${wrapClientCode(clientCode)}\n${code}`
      }

      return null
    },

    buildStart() {
      if (!isWatchMode) {
        return
      }

      if (!server) {
        server = new HMRServer(resolvedOptions.port, resolvedOptions.log)
        server.start()
      }
    },

    watchChange(id) {
      lastChangedFiles.add(id)
    },

    generateBundle(_outputOptions, bundle: OutputBundle) {
      if (!isWatchMode) {
        return
      }

      // Process each chunk in the bundle
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'chunk' || !chunk.isEntry) {
          continue
        }

        const fileNameWithoutExt = removeExtension(fileName)

        // Check if this is a content script
        const isContentScript = resolvedOptions.contentScriptOutputs.some(
          (cs) => removeExtension(cs) === fileNameWithoutExt
        )

        if (isContentScript) {
          // Rename to .actual.js
          const dir = dirname(fileName)
          const baseName = basename(fileName, '.js')
          const actualFileName = `${baseName}.actual.js`
          const actualFilePath = dir && dir !== '.' ? `${dir}/${actualFileName}` : actualFileName

          contentScriptActualPaths.set(fileNameWithoutExt, actualFilePath)

          // Rename chunk
          ;(chunk as OutputChunk).fileName = actualFilePath
          delete bundle[fileName]
          bundle[actualFilePath] = chunk
        }
      }
    },

    writeBundle(outputOptions) {
      if (!isWatchMode) {
        return
      }

      const outDir = outputOptions.dir || config.build.outDir

      // Generate stub files for content scripts
      for (const contentScriptPath of resolvedOptions.contentScriptOutputs) {
        const pathWithoutExt = removeExtension(contentScriptPath)
        const actualFilePath = contentScriptActualPaths.get(pathWithoutExt)

        if (!actualFilePath) {
          console.error(`[${PLUGIN_NAME}] ❌ Content script not found in bundle: ${contentScriptPath}`)
          console.error(`\nPlease ensure that:`)
          console.error(`1. The contentScriptOutputs configuration matches your Vite output.entryFileNames pattern`)
          console.error(`2. The path "${contentScriptPath}" exists in the build output\n`)
          console.error(`Current bundle files:`)
          Array.from(contentScriptActualPaths.keys()).forEach(k => {
            console.error(`  - ${k}.js`)
          })
          console.error('')
          process.exit(1)
        }

        const stubFilePath = resolve(outDir, contentScriptPath)
        const stubDir = dirname(stubFilePath)

        const hmrClientCode = getClientCode('runtime', resolvedOptions.port)
        const actualFileName = basename(actualFilePath)
        const stubCode = `${wrapClientCode(hmrClientCode)}import('./${actualFileName}');`

        try {
          mkdirSync(stubDir, { recursive: true })
          writeFileSync(stubFilePath, stubCode)
        } catch (error) {
          console.error(`[${PLUGIN_NAME}] Failed to generate stub file for ${contentScriptPath}:`, error)
          continue
        }

        if (resolvedOptions.log) {
          console.log(`[${PLUGIN_NAME}] Generated stub: ${contentScriptPath} -> ${actualFilePath}`)
        }
      }

      contentScriptActualPaths.clear()
    },

    closeBundle() {
      if (!isWatchMode || !server) {
        return
      }

      // Check if background was changed
      if (resolvedOptions.backgroundInput) {
        const hasBackgroundChange = Array.from(lastChangedFiles).some((file) =>
          file.endsWith(resolvedOptions.backgroundInput!)
        )

        if (hasBackgroundChange) {
          server.sendReloadExtension()
          lastChangedFiles.clear()
          return
        }
      }

      server.sendReloadTab()
      lastChangedFiles.clear()
    },

    closeWatcher() {
      server?.stop()
      server = null
    },
  }
}

export type { PluginOptions, HMRMessage, HMRMessageType } from './types.js'
