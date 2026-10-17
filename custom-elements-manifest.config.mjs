// Builds dist/custom-elements.json (the package's `customElements` field)
// plus the editor and framework integrations derived from it. Runs as the
// last step of `npm run build`, after vite and tsc have filled dist/.
import { customElementVsCodePlugin } from 'custom-element-vs-code-integration';
import { customElementJetBrainsPlugin } from 'custom-element-jet-brains-integration';
import {
  cyberEventsOnly,
  frameworkTypes,
  publishedPaths,
} from './scripts/cem-plugins.mjs';

export default {
  globs: ['src/index.ts', 'src/components/*.ts'],
  outdir: 'dist',
  litelement: true,
  plugins: [
    cyberEventsOnly(),
    publishedPaths(),
    // VS Code: point `html.customData` at this file (see docs/architecture.md)
    customElementVsCodePlugin({
      outdir: 'dist',
      htmlFileName: 'vscode.html-custom-data.json',
      cssFileName: null,
      hideLogs: true,
    }),
    // JetBrains IDEs pick this up through the package's `web-types` field
    customElementJetBrainsPlugin({
      outdir: 'dist',
      webTypesFileName: 'web-types.json',
      packageJson: false,
      hideLogs: true,
    }),
    frameworkTypes({ outdir: 'dist/types', importFrom: '../index.js' }),
  ],
};
