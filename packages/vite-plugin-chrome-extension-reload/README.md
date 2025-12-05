# vite-plugin-chrome-extension-reload

Vite plugin for Chrome Extension auto reload with Manifest V3 support.

## Features

- 🔥 **Automatic extension reload** when background script changes
- 🔄 **Automatic tab reload** when content scripts change
-  **WebSocket-based communication** with keepalive for Service Worker persistence
- 🎯 **Smart reload strategy** - only reloads what's necessary

## Installation

```bash
npm install -D vite-plugin-chrome-extension-reload
# or
pnpm add -D vite-plugin-chrome-extension-reload
# or
yarn add -D vite-plugin-chrome-extension-reload
```

## Usage

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import chromeExtensionReload from 'vite-plugin-chrome-extension-reload'

export default defineConfig({
  plugins: [
    chromeExtensionReload({
      port: 8789,                                  // WebSocket port (default: 8789)
      backgroundInput: 'src/background/index.ts',  // Input path for background script
      contentScriptOutputs: ['src/content/index.js'], // Output paths for content scripts (as in manifest.json)
      log: true,                                   // Enable logging (default: true)
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        popup: 'src/popup/index.html',
        sidepanel: 'src/sidepanel/index.html',
        content: 'src/content/index.ts',
        background: 'src/background/index.ts',
      },
      output: {
        entryFileNames: 'src/[name]/index.js',
      }
    },
  },
})
```

Then run with watch mode:

```bash
vite build --mode development --watch
```

## How it works

### Architecture

1. **Transform Hook (Background Script Only)**
   - Injects HMR client code into background script during build

2. **WriteBundle Hook (Content Scripts)**
   - Creates stub files for content scripts that include HMR client
   - Generates `.actual.js` files with the actual application code
   - Stub files handle dynamic imports to bypass Chrome's caching

3. **WebSocket Server**
   - Starts on the specified port to communicate with extensions
   - Broadcasts reload messages based on file changes
   - Maintains keepalive connection with Service Worker

4. **Change Detection**
   - Background script changes → `reload-extension` → `chrome.runtime.reload()`
   - Content script changes → `reload-tab` → `location.reload()`


## Configuration

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | `number` | `8789` | WebSocket server port |
| `backgroundInput` | `string` | `undefined` | Input path for background script (e.g., `'src/background/index.ts'`) |
| `contentScriptOutputs` | `string[]` | `[]` | Output paths for content scripts as specified in manifest.json (e.g., `['src/content/index.js']`) |
| `log` | `boolean` | `true` | Enable console logging |

### Important Notes

1. **Path Configuration**:
   - `backgroundInput`: Use the **input path** (source file) for background script
   - `contentScriptOutputs`: Use the **output paths** that match your manifest.json and Vite's `output.entryFileNames` pattern

2. **Build Configuration**:
   - The plugin requires Vite's watch mode (`--watch` flag)

## License

MIT