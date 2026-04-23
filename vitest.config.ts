import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,        // describe/it/expect disponibles sans import
    environment: 'node',  // pas besoin de jsdom pour nos fonctions pures
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**'],
    },
  },
});
