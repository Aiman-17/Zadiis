import { chromium } from 'playwright'

const BASE = 'https://zadiis.com.pk'
const PASSWORD = 'zadiis@admin2006'

async function run() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  let passed = 0
  let failed = 0

  function ok(label) { console.log(`  ✅ ${label}`); passed++ }
  function fail(label, detail) { console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`); failed++ }

  // ── Login ──────────────────────────────────────────────────────────────────
  console.log('\n[1] Login')
  await page.goto(`${BASE}/admin/login`)
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL(`${BASE}/admin`, { timeout: 10000 })
  ok('Logged in, landed on /admin')

  // ── Dashboard KPIs ─────────────────────────────────────────────────────────
  console.log('\n[2] Dashboard KPI cards')
  await page.waitForSelector('text=Dashboard', { timeout: 8000 })

  const kpiLabels = [
    'Gross Revenue (7d)',
    'Revenue This Month',
    'Orders This Month',
    'Avg. Order Value',
    'Total Products',
    'Revenue This Year',
    'Repeat Rate',
  ]
  for (const label of kpiLabels) {
    const el = page.getByText(label, { exact: true })
    if (await el.count() > 0) ok(`KPI card visible: "${label}"`)
    else fail(`KPI card missing: "${label}"`)
  }

  // Revenue This Year should show PKR value above it
  const thisYearCard = await page.locator('text=Revenue This Year').locator('..').innerHTML()
  if (thisYearCard.includes('PKR')) ok('Revenue This Year shows PKR value')
  else fail('Revenue This Year has no PKR value')

  // Repeat Rate card should show "X of Y customers" sub-line
  const repeatCard = await page.locator('text=Repeat Rate').locator('..').innerHTML()
  if (repeatCard.includes('customers')) ok('Repeat Rate shows customer count sub-line')
  else fail('Repeat Rate sub-line missing')

  // ── Analytics → Revenue tab ────────────────────────────────────────────────
  console.log('\n[3] Analytics page — Revenue tab')
  await page.goto(`${BASE}/admin/analytics`)
  await page.waitForSelector('text=Analytics', { timeout: 8000 })

  // Confirm Revenue tab is active by default
  const revenueTab = page.getByRole('button', { name: 'Revenue' })
  await revenueTab.click()
  await page.waitForTimeout(500)

  const analyticsKpis = [
    'Gross Revenue',
    'Net Revenue',
    'Gross Profit',
    'Unique Customers',
    'Repeat Rate',
    'Avg Orders / Customer',
  ]
  for (const label of analyticsKpis) {
    const el = page.getByText(label, { exact: true })
    if (await el.count() > 0) ok(`Analytics KPI visible: "${label}"`)
    else fail(`Analytics KPI missing: "${label}"`)
  }

  // Repeat Rate card should show "X repeat customers"
  const analyticsRepeat = await page.locator('text=Repeat Rate').first().locator('..').innerHTML()
  if (analyticsRepeat.includes('repeat customers') || analyticsRepeat.includes('customers')) ok('Analytics Repeat Rate sub-line present')
  else fail('Analytics Repeat Rate sub-line missing')

  // ── Analytics range switching ──────────────────────────────────────────────
  console.log('\n[4] Analytics range buttons')
  for (const range of ['7 Days', '30 Days', '90 Days', '12 Months']) {
    const btn = page.getByRole('button', { name: range })
    if (await btn.count() > 0) {
      await btn.click()
      await page.waitForTimeout(600)
      // KPIs should still be visible after range change
      const stillVisible = await page.getByText('Unique Customers', { exact: true }).count() > 0
      if (stillVisible) ok(`Range "${range}" — Unique Customers KPI still visible`)
      else fail(`Range "${range}" — Unique Customers KPI disappeared`)
    } else {
      fail(`Range button "${range}" not found`)
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n────────────────────────────────`)
  console.log(`  Passed: ${passed}  Failed: ${failed}`)
  console.log(`  Verdict: ${failed === 0 ? 'PASS ✅' : 'FAIL ❌'}`)

  await browser.close()
  process.exit(failed > 0 ? 1 : 0)
}

run().catch(e => { console.error(e); process.exit(1) })
