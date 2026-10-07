import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // treat <cyber-*> tags as custom elements, not Vue components
          isCustomElement: (tag) => tag.startsWith('cyber-'),
        },
      },
    }),
  ],
});
