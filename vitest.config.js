import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: ['**/node_modules/**', '**/dist/**', '**/tests/e2e/**'],
    coverage: {
      provider: 'v8',
      include: ['app.js', 'config.js', 'utils.js', 'api.js', 'sound.js', 'speech.js', 'map.js'],
      reporter: ['text', 'json', 'html']
    }
  },
});
