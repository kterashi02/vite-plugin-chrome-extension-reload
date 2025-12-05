import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export function getClientCode(type: 'background' | 'runtime', port: number): string {
  // Try to read the bundled IIFE client first (from dist/client/)
  const bundledPath = resolve(__dirname, `client/${type}.global.js`)

  let code: string

  if (existsSync(bundledPath)) {
    code = readFileSync(bundledPath, 'utf-8')
  } else {
    // Fallback: read source file directly (for development of the plugin itself)
    const srcPath = resolve(__dirname, `../src/client/${type}.ts`)
    const reloadClientPath = resolve(__dirname, '../src/client/reload-client.ts')

    const reloadClientCode = readFileSync(reloadClientPath, 'utf-8')
      .replace(/export /g, '')
      .replace(/\/\/ @ts-nocheck\n?/, '')

    const clientCode = readFileSync(srcPath, 'utf-8')
      .replace(/import \{ createReloadClient \} from ['"]\.\/reload-client\.js['"];?\n?/, '')
      .replace(/\/\/ @ts-nocheck\n?/, '')

    code = `${reloadClientCode}\n${clientCode}`
  }

  // Replace placeholder with actual port
  return code.replace(/__RELOAD_PORT__/g, String(port))
}

export function wrapClientCode(clientCode: string): string {
  return `;(function() {\n${clientCode}\n})();`
}
