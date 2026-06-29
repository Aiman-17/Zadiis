import { test, expect } from '@playwright/test'

// Auth tests run WITHOUT the saved admin auth state — fresh browser context
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Admin auth guard', () => {

  test('unauthenticated /admin redirects to /admin/login', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL('/admin/login', { timeout: 8_000 })
  })

  test('unauthenticated /admin/products redirects to /admin/login', async ({ page }) => {
    await page.goto('/admin/products')
    await expect(page).toHaveURL('/admin/login', { timeout: 8_000 })
  })

  test('unauthenticated /admin/orders redirects to /admin/login', async ({ page }) => {
    await page.goto('/admin/orders')
    await expect(page).toHaveURL('/admin/login', { timeout: 8_000 })
  })

  test('login page renders password field and submit button', async ({ page }) => {
    await page.goto('/admin/login')
    await expect(page.getByPlaceholder('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: /Login/i })).toBeVisible()
  })

  test('wrong password shows Invalid password error', async ({ page }) => {
    await page.goto('/admin/login')
    await page.getByPlaceholder('Password').fill('wrongpassword123')
    await page.getByRole('button', { name: /Login/i }).click()
    await expect(page.getByText(/Invalid password/i)).toBeVisible({ timeout: 5_000 })
  })

  test('correct password logs in and redirects to /admin', async ({ page }) => {
    const password = process.env.ADMIN_PASSWORD
    if (!password) test.skip()

    await page.goto('/admin/login')
    await page.getByPlaceholder('Password').fill(password!)
    await page.getByRole('button', { name: /Login/i }).click()
    await expect(page).toHaveURL('/admin', { timeout: 8_000 })
  })

  test('logout returns to login page', async ({ page }) => {
    const password = process.env.ADMIN_PASSWORD
    if (!password) test.skip()

    await page.goto('/admin/login')
    await page.getByPlaceholder('Password').fill(password!)
    await page.getByRole('button', { name: /Login/i }).click()
    await expect(page).toHaveURL('/admin', { timeout: 8_000 })

    await page.getByRole('button', { name: /Logout/i }).click()
    await expect(page).toHaveURL('/admin/login', { timeout: 5_000 })
  })

})
