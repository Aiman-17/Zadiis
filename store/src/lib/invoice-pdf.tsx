import path from 'path'
import { Document, Page, View, Text, Font, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import type { EmailItem } from './email'

const FONTS_DIR = path.join(process.cwd(), 'src', 'lib', 'fonts')

Font.register({
  family: 'Inter',
  fonts: [
    { src: path.join(FONTS_DIR, 'Inter-Regular.ttf'), fontWeight: 'normal' },
    { src: path.join(FONTS_DIR, 'Inter-SemiBold.ttf'), fontWeight: 'semibold' },
  ],
})
Font.register({
  family: 'Playfair Display',
  src: path.join(FONTS_DIR, 'PlayfairDisplay-Bold.ttf'),
  fontWeight: 'bold',
})

const GOLD = '#A68B6E'
const INK = '#1C1C1C'
const CREAM = '#FAF8F5'
const BORDER = '#E8DDD4'
const MUTED = '#6B7280'
const PAID_GREEN = '#15803D'

const styles = StyleSheet.create({
  page: { padding: 32, fontFamily: 'Inter', fontSize: 10, color: INK },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingBottom: 12,
    borderBottom: `2 solid ${GOLD}`,
  },
  brand: { fontFamily: 'Playfair Display', fontWeight: 'bold', fontSize: 22, color: INK, letterSpacing: 2 },
  brandSub: { fontSize: 8, color: GOLD, letterSpacing: 1, marginTop: 4 },
  invoiceLabel: { fontSize: 13, fontWeight: 'bold', color: INK, textAlign: 'right' },
  invoiceNumber: { fontFamily: 'Playfair Display', fontWeight: 'bold', fontSize: 12, color: GOLD, textAlign: 'right', marginTop: 4 },
  metaLine: { fontSize: 9, color: MUTED, textAlign: 'right', marginTop: 2 },
  sectionLabel: { fontSize: 8, fontWeight: 'semibold', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  billName: { fontSize: 11, fontWeight: 'semibold', color: INK },
  billAddress: { fontSize: 9, color: '#4B5563', marginTop: 2 },
  table: { marginTop: 16, marginBottom: 12 },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: CREAM, borderBottom: `2 solid ${BORDER}`, paddingVertical: 6, paddingHorizontal: 8 },
  tableRow: { flexDirection: 'row', borderBottom: `1 solid ${BORDER}`, paddingVertical: 6, paddingHorizontal: 8 },
  colItem: { flex: 3 },
  colQty: { flex: 1, textAlign: 'center' },
  colTotal: { flex: 1, textAlign: 'right' },
  tableHeaderText: { fontSize: 8, color: MUTED, textTransform: 'uppercase' },
  totalsBlock: { marginBottom: 16 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalsLabel: { fontSize: 9, color: MUTED },
  totalsValue: { fontSize: 9, color: INK },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTop: `2 solid ${BORDER}`, paddingTop: 6, marginTop: 2 },
  grandTotalLabel: { fontSize: 11, fontWeight: 'semibold', color: INK },
  grandTotalValue: { fontSize: 11, fontWeight: 'semibold', color: GOLD },
  paymentBox: { backgroundColor: CREAM, border: `1 solid ${BORDER}`, borderRadius: 4, padding: 12 },
  paymentLine: { fontSize: 9, color: MUTED, marginTop: 3 },
  paymentStatus: { color: PAID_GREEN, fontWeight: 'semibold' },
  footer: { marginTop: 20, fontSize: 8, color: '#9CA3AF', textAlign: 'center' },
})

const PAYMENT_METHOD_LABELS: Record<string, string> = { cod: 'Cash on Delivery', card: 'Card', jazzcash: 'JazzCash', easypaisa: 'Easypaisa' }

export type InvoicePdfData = {
  invoice_number: string
  order_number: string
  customer_name: string
  address: string
  city: string
  items: EmailItem[]
  subtotal: number
  delivery_charge: number
  total: number
  payment_method: string
  transaction_id?: string
}

function InvoiceDocument(d: InvoicePdfData) {
  const date = new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })
  const method = PAYMENT_METHOD_LABELS[d.payment_method] || d.payment_method

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>ZADII&apos;S</Text>
            <Text style={styles.brandSub}>AUTHENTIC PAKISTANI FASHION</Text>
          </View>
          <View>
            <Text style={styles.invoiceLabel}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{d.invoice_number}</Text>
            <Text style={styles.metaLine}>Order: {d.order_number}</Text>
            <Text style={styles.metaLine}>Date: {date}</Text>
          </View>
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={styles.sectionLabel}>Bill To</Text>
          <Text style={styles.billName}>{d.customer_name}</Text>
          <Text style={styles.billAddress}>{d.address}, {d.city}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colItem, styles.tableHeaderText]}>Item</Text>
            <Text style={[styles.colQty, styles.tableHeaderText]}>Qty</Text>
            <Text style={[styles.colTotal, styles.tableHeaderText]}>Total</Text>
          </View>
          {d.items.map((item, i) => (
            <View style={styles.tableRow} key={i}>
              <Text style={styles.colItem}>{item.product_name}{item.size ? ` (${item.size}${item.color ? `, ${item.color}` : ''})` : ''}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colTotal}>PKR {Number(item.price * item.quantity).toLocaleString()}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>PKR {Number(d.subtotal).toLocaleString()}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Delivery</Text>
            <Text style={styles.totalsValue}>PKR {Number(d.delivery_charge).toLocaleString()}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>PKR {Number(d.total).toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.paymentBox}>
          <Text style={styles.sectionLabel}>Payment Details</Text>
          <Text style={styles.paymentLine}>Method: {method}</Text>
          <Text style={[styles.paymentLine, styles.paymentStatus]}>Status: PAID</Text>
          {d.transaction_id && <Text style={styles.paymentLine}>Transaction ID: {d.transaction_id}</Text>}
        </View>

        <Text style={styles.footer}>This is a computer-generated invoice and does not require a physical signature.</Text>
      </Page>
    </Document>
  )
}

export async function renderInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument {...data} />)
}
