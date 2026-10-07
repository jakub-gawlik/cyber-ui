import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  // Dev server serves the demo; `vite build` ignores root and builds the lib entry.
  root: resolve(root, 'demo'),
  publicDir: false,
  build: {
    outDir: resolve(root, 'dist'),
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: resolve(root, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'cyber-ui.js',
    },
    rollupOptions: {
      output: {
        assetFileNames: 'cyber-ui.[ext]',
      },
    },
  },
});
