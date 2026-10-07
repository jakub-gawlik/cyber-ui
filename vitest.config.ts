import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

// Tests run in a real Chromium: the components lean on platform behavior
// (native <dialog>, shadow DOM slot assignment, focus) that DOM emulators
// don't implement faithfully.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
      screenshotFailures: false,
    },
  },
});
