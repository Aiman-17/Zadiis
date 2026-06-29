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
      name: 'store',
      testMatch: '**/store/**/*.spec.ts',
      dependencies: [],
    },
    {
      name: 'admin',
      testMatch: '**/admin/**/*.spec.ts',
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
