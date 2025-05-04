import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    wasm(),            // ← enables `.wasm?url` imports
  ],
  build: {
    target: 'esnext',  // DuckDB-WASM needs modern syntax
  },
  worker: {
    // ensure workers still load in ES format
    format: 'es',
  },
});
