import type { Page } from '@playwright/test'

export type CartItem = {
  id: string
  name: string
  price: number
  quantity: number
  size: string
  color: string
  image: string
}

export const TEST_ITEM: CartItem = {
  id: '__test_product__',
  name: 'Test Lawn Suit',
  price: 3500,
  quantity: 1,
  size: 'M',
  color: 'White',
  image: '',
}

/**
 * Seed the cart via localStorage so tests skip the add-to-cart UI flow.
 * Must be called after at least one page load (localStorage needs an origin).
 */
export async function seedCart(page: Page, item: CartItem = TEST_ITEM) {
  await page.goto('/')
  await page.evaluate((cartItem) => {
    // Key is 'zadiis-cart' (hyphen) — see src/lib/cart-store.ts. The older
    // checkout.spec.ts seeds 'zadiis_cart' (underscore), which no longer works.
    localStorage.setItem('zadiis-cart', JSON.stringify([cartItem]))
  }, item)
}

/**
 * Checkout calls POST /api/cart/validate on load and removes items whose
 * product id is not found in the database. The seeded test item is fake,
 * so without this mock the cart empties and checkout redirects to /cart.
 */
export async function mockCartValidate(page: Page) {
  await page.route('**/api/cart/validate', (route) =>
    route.fulfill({ json: { unavailable: [] } })
  )
}

/**
 * Seed cart, mock stock validation, and land on /checkout ready to fill the form.
 */
export async function seedCartAndGoToCheckout(page: Page, item: CartItem = TEST_ITEM) {
  await mockCartValidate(page)
  await seedCart(page, item)
  await page.goto('/checkout')
}

/**
 * Add a REAL product to the cart through the shop UI. Required for tests that
 * place real orders — POST /api/orders validates the product exists in the DB
 * and rejects the fake seeded item with 400 "Product not found".
 * Returns the product name, or null when the store has no purchasable products.
 */
export async function addRealProductToCart(page: Page): Promise<string | null> {
  await page.goto('/shop')
  const productLink = page.locator('a[href^="/shop/"]').first()
  try {
    await productLink.waitFor({ state: 'visible', timeout: 8_000 })
  } catch {
    return null // no products in the store
  }
  await productLink.click()
  await page.waitForURL(/\/shop\/.+/, { timeout: 8_000 })

  const addBtn = page.getByRole('button', { name: /Add to Cart/i })
  try {
    await addBtn.waitFor({ state: 'visible', timeout: 8_000 })
  } catch {
    return null // product page without purchase section (sold out layout)
  }

  // Color FIRST — selecting a color resets the chosen size (AddToCartButton).
  // Swatch buttons carry the color name as their accessible text label.
  const colorGroup = page.locator('div', { has: page.locator('p', { hasText: /^Color$/ }) }).last()
  const firstColor = colorGroup.locator('button:enabled').first()
  if (await firstColor.isVisible().catch(() => false)) {
    await firstColor.click()
  }

  const sizeButtons = page.getByRole('button').filter({ hasText: /^(XS|S|M|L|XL|XXL|Unstitched)$/i })
  if (await sizeButtons.first().isVisible().catch(() => false)) {
    await sizeButtons.first().click()
  }

  const name = await page.getByRole('heading').first().textContent()
  await addBtn.click()

  // Validation error means a required option was missed — not purchasable
  if (await page.getByText(/Please select a (color|size)/i).isVisible().catch(() => false)) {
    return null
  }

  return name?.trim() ?? 'unknown product'
}

/**
 * Fill every checkout field except payment method.
 * Email blur triggers the OTP send — mock OTP routes first (helpers/otp.ts).
 */
export async function fillCheckoutForm(
  page: Page,
  overrides: Partial<{ name: string; phone: string; email: string; address: string }> = {}
) {
  const data = {
    name: 'E2E Test Fatima',
    phone: '03001234567',
    email: 'e2e-test@zadiis.test',
    address: 'House 12, Block B, Gulberg — E2E TEST ORDER',
    ...overrides,
  }
  // Checkout fields expose accessible names via labels (no placeholders)
  await page.getByRole('textbox', { name: /full name/i }).fill(data.name)
  await page.getByRole('textbox', { name: /phone/i }).fill(data.phone)
  await page.getByRole('textbox', { name: /email/i }).fill(data.email)
  await page.getByRole('textbox', { name: /address/i }).fill(data.address)

  const citySelect = page.locator('#city').or(page.getByRole('combobox').first()).first()
  const options = await citySelect.locator('option').all()
  if (options.length > 1) await citySelect.selectOption({ index: 1 })

  // Blur email last so the OTP send fires after all fields are stable
  await page.getByRole('textbox', { name: /email/i }).blur()

  return data
}
