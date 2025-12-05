import { defineConfig } from 'tsup'

export default defineConfig([
  // Main plugin
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
    external: ['vite'],
    shims: true, // Add shims for import.meta in CJS
  },
  // Client bundles (to be injected as strings)
  {
    entry: {
      'client/background': 'src/client/background.ts',
      'client/runtime': 'src/client/runtime.ts',
    },
    format: ['iife'],
    clean: false,
    minify: true,
    outDir: 'dist',
  },
])
