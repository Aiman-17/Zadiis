// store/src/types/index.ts

export type Category = {
  id: string
  name: string
  slug: string
  is_active: boolean
}

// variant_stock shape: { [color: string]: { [size: string]: number } }
// Sentinel key "_" is used when dimension is absent (e.g. color-only product).
// Empty object {} means legacy product — no per-variant filtering applied.
export type VariantStock = Record<string, Record<string, number>>

export type Product = {
  id: string
  name: string
  slug: string
  description: string
  price: number
  category_id: string
  images: string[]
  sizes: string[]
  colors: string[]
  stock_quantity: number
  variant_stock: VariantStock
  is_bestseller: boolean
  sku?: string
  is_active: boolean
  created_at: string
  categories?: Category
}

export type OrderItem = {
  product_id: string
  product_name: string
  sku?: string
  size: string
  color: string
  quantity: number
  price: number
  original_price: number
}

export type Order = {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  address: string
  city: string
  items: OrderItem[]
  subtotal: number
  delivery_charge: number
  total: number
  payment_method: 'jazzcash' | 'easypaisa' | 'card' | 'cod'
  payment_status: 'pending' | 'paid' | 'failed'
  order_status: 'new' | 'processing' | 'shipped' | 'delivered' | 'returned' | 'cancelled'
  cancellation_reason?: string | null
  is_archived: boolean
  is_sale: boolean
  safepay_tracker?: string
  safepay_transaction_id?: string
  payment_verified_at?: string
  created_at: string
}

export type DeliveryZone = {
  id: string
  city: string
  delivery_charge: number
  is_active: boolean
  created_at: string
}

export type Review = {
  id: string
  product_id: string
  customer_name: string
  rating: number
  comment: string | null
  created_at: string
}

export type Sale = {
  id: string
  title: string
  description: string | null
  is_active: boolean
  delivery_charge_override: number | null
  starts_at: string | null
  ends_at: string | null
  created_at: string
}

export type SaleProduct = {
  id: string
  sale_id: string
  product_id: string
  sale_price: number
  created_at: string
  products?: Product
}
