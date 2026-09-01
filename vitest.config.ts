import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/smoke/live-endpoint.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: 'reports/coverage',
      include: ['src/**/*.ts'],
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 75,
        branches: 70
      }
    }
  }
});
