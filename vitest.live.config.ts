import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/smoke/live-endpoint.test.ts'],
    testTimeout: 10_000
  }
});
