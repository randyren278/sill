import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load .env.test.local for test-only secrets (RESEND_API_KEY for verification,
// CRON_SHARED_SECRET to trigger the digest, SUPABASE_SERVICE_ROLE_KEY for
// DB cleanup). Falls back to .env.local for shared values (VITE_SUPABASE_URL).
dotenv.config({ path: path.resolve(__dirname, '.env.test.local'), quiet: true })
dotenv.config({ path: path.resolve(__dirname, '.env.local'), quiet: true })

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'https://pleasepleasepleasewater.me'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,           // tests share the live DB; serial avoids races
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
