import { chromium } from '../node_modules/playwright/index.mjs'

const PASS = '✅'
const FAIL = '❌'
const results = []

function log(label, ok, detail = '') {
  results.push({ label, ok, detail })
  console.log(`${ok ? PASS : FAIL} ${label}${detail ? ' — ' + detail : ''}`)
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext()
const page = await context.newPage()

const errors = []
const net400 = []
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
page.on('response', r => { if (r.status() >= 400) net400.push(`${r.status()} ${r.url()}`) })

// ── TEST 1: Unauthenticated access to /admin → redirect to login ──
console.log('\n─── Test 1: Unauthenticated /admin redirect ───')
await page.goto('https://zadiis.com.pk/admin', { waitUntil: 'networkidle' })
const afterUnauthNav = page.url()
log(
  'Unauthenticated /admin → redirected to login',
  afterUnauthNav.includes('/admin/login'),
  afterUnauthNav
)

// ── TEST 2: Login page loads clean ──
console.log('\n─── Test 2: Login page loads ───')
errors.length = 0; net400.length = 0
await page.goto('https://zadiis.com.pk/admin/login', { waitUntil: 'networkidle' })
const hasPasswordInput = await page.$('input[type="password"]') !== null
log('Login page has password input', hasPasswordInput)
log('No 4xx/5xx on login page', net400.length === 0, net400.join(', ') || 'none')
log('No console errors on login page', errors.length === 0, errors.join(', ') || 'none')

// ── TEST 3: Login with correct password ──
console.log('\n─── Test 3: Login with correct password ───')
errors.length = 0; net400.length = 0
await page.fill('input[type="password"]', 'zadiis@admin2006')
await page.click('button[type="submit"]')
await page.waitForTimeout(4000)
const afterLogin = page.url()
log('Login → navigates to /admin dashboard', afterLogin === 'https://zadiis.com.pk/admin', afterLogin)
log('No console errors after login', errors.length === 0, errors.join(', ') || 'none')

const bodyText = await page.locator('body').innerText()
log('Dashboard shows admin content', bodyText.includes('Dashboard') || bodyText.includes('Orders'), bodyText.slice(0, 80))

// ── TEST 4: Navigate to protected sub-pages while logged in ──
console.log('\n─── Test 4: Protected pages accessible while logged in ───')
for (const path of ['/admin/orders', '/admin/products']) {
  errors.length = 0; net400.length = 0
  await page.goto(`https://zadiis.com.pk${path}`, { waitUntil: 'networkidle' })
  const url = page.url()
  log(`${path} accessible (not redirected to login)`, !url.includes('/admin/login'), url)
}

// ── TEST 5: Logout ──
console.log('\n─── Test 5: Logout ───')
errors.length = 0; net400.length = 0
await page.goto('https://zadiis.com.pk/admin', { waitUntil: 'networkidle' })
const logoutBtn = await page.$('button:has-text("Logout"), a:has-text("Logout"), [aria-label="Logout"]')
if (logoutBtn) {
  await logoutBtn.click()
  await page.waitForTimeout(3000)
  const afterLogout = page.url()
  log('Logout → redirected to /admin/login', afterLogout.includes('/admin/login'), afterLogout)
} else {
  // Try clicking the logout icon (LogOut icon in sidebar)
  const logoutViaApi = await fetch('https://zadiis.com.pk/api/admin/auth', {
    method: 'DELETE',
    headers: { Cookie: await context.cookies().then(cs => cs.map(c => `${c.name}=${c.value}`).join('; ')) }
  })
  log('Logout button found', false, 'button not found in DOM — used API fallback, status: ' + logoutViaApi.status)
}

// ── TEST 6: After logout, /admin must block ──
console.log('\n─── Test 6: Post-logout /admin blocked ───')
await page.goto('https://zadiis.com.pk/admin', { waitUntil: 'networkidle' })
const afterLogoutNav = page.url()
log(
  'Post-logout /admin → redirected to login (cookie cleared)',
  afterLogoutNav.includes('/admin/login'),
  afterLogoutNav
)

await browser.close()

// ── Summary ──
console.log('\n════════════════════════════════')
const passed = results.filter(r => r.ok).length
const failed = results.filter(r => !r.ok).length
console.log(`Results: ${passed} passed, ${failed} failed`)
if (failed > 0) {
  console.log('\nFailed tests:')
  results.filter(r => !r.ok).forEach(r => console.log(`  ✗ ${r.label}: ${r.detail}`))
  process.exit(1)
}
