import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: 'html',

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'setup', testMatch: '**/global.setup.ts' },
    {
      // Anchor to tests/store — the repo folder is also named "store", so a
      // bare '**/store/**' pattern matches EVERY spec path (including admin)
      name: 'store',
      testMatch: '**/tests/store/**/*.spec.ts',
      dependencies: [],
    },
    {
      name: 'admin',
      testMatch: '**/tests/admin/**/*.spec.ts',
      dependencies: ['setup'],
      use: {
        storageState: 'tests/.auth/admin.json',
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
