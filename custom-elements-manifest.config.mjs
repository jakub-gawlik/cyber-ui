// Builds dist/custom-elements.json (the package's `customElements` field)
// plus the editor and framework integrations derived from it. Runs as the
// last step of `npm run build`, after vite and tsc have filled dist/.
import { customElementVsCodePlugin } from 'custom-element-vs-code-integration';
import { customElementJetBrainsPlugin } from 'custom-element-jet-brains-integration';
import {
  documentedEventsOnly,
  frameworkTypes,
  publishedPaths,
} from './scripts/cem-plugins.mjs';

export default {
  // the form base classes are analyzed too, so their members (name,
  // disabled, value, …) are inherited into each element's declaration
  globs: [
    'src/index.ts',
    'src/components/*.ts',
    'src/components/internal/form-control.ts',
    'src/components/internal/text-control.ts',
    'src/components/internal/toggle-control.ts',
    'src/components/internal/bar.ts',
  ],
  outdir: 'dist',
  litelement: true,
  plugins: [
    documentedEventsOnly(),
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
