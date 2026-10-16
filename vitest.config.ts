// Root config: server-side tests only. Client tests run from client/ with its own jsdom config.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['client/**', 'node_modules/**'],
  },
});
