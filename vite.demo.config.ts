import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));

// Builds the demo page as a static site for the dedicated demo website.
// `npm run build:demo` → demo-dist/
export default defineConfig({
  root: resolve(root, 'demo'),
  // relative base: the built demo works from any path on any host
  base: './',
  publicDir: false,
  build: {
    outDir: resolve(root, 'demo-dist'),
    emptyOutDir: true,
  },
});
