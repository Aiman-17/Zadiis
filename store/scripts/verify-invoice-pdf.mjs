// Spec 004 US4 — automated check for the PDF invoice renderer.
//
// This is deliberately NOT a Playwright spec: Playwright Test's own esbuild
// bundler mishandles `@react-pdf/renderer`'s custom React reconciler when a
// .tsx file importing it is pulled into its transform pipeline (confirmed
// this session — `renderToBuffer` throws "Cannot read properties of null
// (reading 'props')" under Playwright's transform, but produces a correct
// PDF when run directly under Node/tsx, which is also how it actually runs
// in production inside the Next.js API routes that use it). Running this as
// a plain script sidesteps that incompatibility entirely.
//
// Run with: npx tsx scripts/verify-invoice-pdf.mjs

import { renderInvoicePdf } from '../src/lib/invoice-pdf.tsx'

async function assertValidPdf(label, data) {
  const buffer = await renderInvoicePdf(data)
  if (!Buffer.isBuffer(buffer)) throw new Error(`[${label}] not a Buffer`)
  if (buffer.length === 0) throw new Error(`[${label}] empty buffer`)
  const magic = buffer.subarray(0, 4).toString('utf-8')
  if (magic !== '%PDF') throw new Error(`[${label}] missing PDF magic bytes, got: ${magic}`)
  console.log(`[${label}] OK — ${buffer.length} bytes, valid PDF`)
}

async function main() {
  await assertValidPdf('with transaction_id', {
    invoice_number: 'INV-TEST-0001',
    order_number: 'ZD-TEST',
    customer_name: 'Test Customer',
    address: '123 Test Street',
    city: 'Karachi',
    items: [{ product_name: 'Test Product', size: 'M', color: 'Black', quantity: 2, price: 1500 }],
    subtotal: 3000,
    delivery_charge: 200,
    total: 3200,
    payment_method: 'card',
    transaction_id: 'TXN-TEST-123',
  })

  await assertValidPdf('without transaction_id', {
    invoice_number: 'INV-TEST-0002',
    order_number: 'ZD-TEST-2',
    customer_name: 'Test Customer Two',
    address: '456 Test Avenue',
    city: 'Lahore',
    items: [{ product_name: 'Another Product', size: 'L', color: 'Red', quantity: 1, price: 2500 }],
    subtotal: 2500,
    delivery_charge: 200,
    total: 2700,
    payment_method: 'jazzcash',
  })

  console.log('All invoice PDF checks passed.')
}

main().catch(e => {
  console.error('FAILED:', e)
  process.exit(1)
})
