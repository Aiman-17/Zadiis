export type Category = {
  id: string
  name: string
  slug: string
  is_active: boolean
}

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
  is_active: boolean
  created_at: string
  categories?: Category
}

export type OrderItem = {
  product_id: string
  product_name: string
  size: string
  color: string
  quantity: number
  price: number
}

export type Order = {
  id: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  address: string
  city: string
  items: OrderItem[]
  subtotal: number
  total: number
  payment_method: 'jazzcash' | 'easypaisa' | 'card' | 'cod'
  payment_status: 'pending' | 'paid' | 'failed'
  order_status: 'new' | 'processing' | 'shipped' | 'delivered' | 'returned'
  created_at: string
}
