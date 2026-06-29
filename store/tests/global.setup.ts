import { test as setup, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const authFile = 'tests/.auth/admin.json'

setup('authenticate as admin', async ({ page }) => {
  const password = process.env.ADMIN_PASSWORD
  if (!password) throw new Error('ADMIN_PASSWORD env var is required for admin tests')

  fs.mkdirSync(path.dirname(authFile), { recursive: true })

  await page.goto('/admin/login')
  await page.getByPlaceholder('Password').fill(password)
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page).toHaveURL('/admin', { timeout: 10_000 })

  await page.context().storageState({ path: authFile })
})
