import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

// macOS 27 protects ~/Library/Application Support/Firefox, which Playwright's
// bundled Firefox also uses, so it quits with "Could not find profile
// folder" (microsoft/playwright#42768). Pointing CFFIXED_USER_HOME at a fresh
// per-run directory works around it; per-run, because a shared one collides
// between concurrent runs. Remove once Playwright ships a fix.
function firefoxProvider() {
  if (process.platform !== 'darwin') return playwright();
  const home = mkdtempSync(join(tmpdir(), 'cyber-ui-firefox-'));
  process.on('exit', () => {
    // best-effort: macOS may refuse to delete the Downloads folder Firefox
    // creates in there; the OS cleans the temp dir eventually anyway
    try {
      rmSync(home, { recursive: true, force: true });
    } catch {}
  });
  return playwright({
    launchOptions: { env: { ...process.env, CFFIXED_USER_HOME: home } },
  });
}

// Tests run in real browsers — Chromium, Firefox and WebKit: the components
// lean on platform behavior (native <dialog>, shadow DOM slot assignment,
// focus) that DOM emulators don't implement faithfully, and that differs
// between engines.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [
        { browser: 'chromium' },
        { browser: 'firefox', provider: firefoxProvider() },
        { browser: 'webkit' },
      ],
      screenshotFailures: false,
    },
  },
});
