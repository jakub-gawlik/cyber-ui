import { defineConfig, type Plugin } from 'vite';
import { fileURLToPath } from 'node:url';
import { readdirSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));
const styles = resolve(root, 'src/styles');

/** Cascade layers, lowest priority first. Any unlayered consumer CSS beats
    all of them; within cyber-ui, effects beat components beat base. */
const LAYERS = ['tokens', 'base', 'components', 'fx'] as const;
const LAYER_ORDER = `@layer ${LAYERS.map((l) => `cyber-ui.${l}`).join(', ')};`;

/** One entry per element file, published as dist/components/<name>.js. */
const componentEntries = Object.fromEntries(
  readdirSync(resolve(root, 'src/components'))
    .filter((file) => file.endsWith('.ts'))
    .map((file) => [
      `components/${basename(file, '.ts')}`,
      resolve(root, 'src/components', file),
    ]),
);

/**
 * Emits every stylesheet on its own as dist/styles/<name>.css, wrapped in
 * its cascade layer. Each file restates the layer order first, so the
 * order holds whichever file a consumer happens to import first. The
 * all-in-one dist/cyber-ui.css gets the same layers from the
 * `@import … layer()` statements in src/styles/index.css.
 */
function layeredStylesheets(): Plugin {
  const files: [path: string, layer: (typeof LAYERS)[number]][] = [
    ['tokens.css', 'tokens'],
    ['themes.css', 'tokens'],
    ['base.css', 'base'],
    ['effects.css', 'fx'],
    ...readdirSync(resolve(styles, 'components'))
      .filter((file) => file.endsWith('.css'))
      .map(
        (file) =>
          [`components/${file}`, 'components'] as [string, 'components'],
      ),
  ];
  return {
    name: 'cyber-ui:layered-stylesheets',
    generateBundle() {
      for (const [path, layer] of files) {
        const css = readFileSync(resolve(styles, path), 'utf8');
        this.emitFile({
          type: 'asset',
          fileName: `styles/${basename(path)}`,
          source: `${LAYER_ORDER}\n\n@layer cyber-ui.${layer} {\n${css}}\n`,
        });
      }
    },
  };
}

export default defineConfig({
  publicDir: false,
  plugins: [layeredStylesheets()],
  build: {
    outDir: resolve(root, 'dist'),
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: {
        'cyber-ui': resolve(root, 'src/index.ts'),
        ...componentEntries,
      },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
    },
    rollupOptions: {
      // consumers install lit once (it's a dependency) and share it
      external: [/^lit(\/.*)?$/, /^@lit\//],
      output: {
        assetFileNames: 'cyber-ui.[ext]',
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
    },
  },
});
