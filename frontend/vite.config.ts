import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  plugins: [angular()],
  resolve: {
    alias: {
      '@angular/animations/browser':
        './node_modules/@angular/animations/fesm2022/browser.mjs',
    },
  },
  build: {
    target: 'es2022',
  },
  optimizeDeps: {
    include: ['@angular/animations/browser'],
  },
});
