/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    // Hermetic env: obviously-fake values for every VITE_* var the code under
    // test reads. Without these, tests that exercise an endpoint-building path
    // pass on machines carrying .env.local and fail on CI, which has none -
    // the forget-flow tests did exactly that on PR #231's first run. Tests
    // must never depend on developer-local env, and these values make a local
    // run behave identically to the runner.
    env: {
      VITE_CHAT_ENDPOINT: 'https://chat.test.invalid',
      VITE_CONTACT_ENDPOINT: 'https://contact.test.invalid',
      VITE_NEWSLETTER_ENDPOINT: 'https://newsletter.test.invalid',
      VITE_METRICS_ENDPOINT: 'https://metrics.test.invalid',
      VITE_KB_BUILDER_ENDPOINT: 'https://kb.test.invalid',
      VITE_SESSION_ENDPOINT: 'https://session.test.invalid',
      VITE_COGNITO_USER_POOL_ID: 'us-east-1_TESTPOOL',
      VITE_COGNITO_CLIENT_ID: 'test-client-id',
    },
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs'],
    css: false,
    reporters: ['default', ['junit', { outputFile: 'test-results/junit.xml' }]],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/__tests__/**', 'src/main.tsx', 'src/vite-env.d.ts', 'src/data/**'],
      thresholds: {
        lines: 66,
        statements: 64,
        branches: 62,
        functions: 60,
      },
    },
  },
});
