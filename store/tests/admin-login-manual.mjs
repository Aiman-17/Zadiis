import { chromium } from '../node_modules/playwright/index.mjs'

const errors = []
const networkLog = []

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext()
const page = await context.newPage()

page.on('console', msg => {
  if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`)
})
page.on('response', res => {
  if (res.status() >= 400) networkLog.push(`${res.status()} ${res.url()}`)
})

console.log('--- Step 1: Navigate to /admin/login ---')
await page.goto('https://zadiis.com.pk/admin/login', { waitUntil: 'networkidle' })
console.log('URL:', page.url())

console.log('HTTP 4xx/5xx on login page:', networkLog.slice())
errors.length = 0
networkLog.length = 0

const pwInput = await page.$('input[type="password"]')
if (!pwInput) {
  console.log('ERROR: No password input found!')
  console.log(await page.locator('body').innerText().then(t => t.slice(0, 500)))
  await browser.close()
  process.exit(1)
}

console.log('\n--- Step 2: Submit password ---')
await page.fill('input[type="password"]', 'zadiis@admin2006')
await page.click('button[type="submit"]')
await page.waitForTimeout(4000)

console.log('URL after submit:', page.url())
console.log('HTTP errors after submit:', networkLog)
console.log('Console errors after submit:', errors)

const bodyText = await page.locator('body').innerText()
console.log('\nPage text (first 600 chars):\n', bodyText.slice(0, 600))

await browser.close()
