export type CartItem = {
  id: string
  name: string
  sku?: string
  price: number
  originalPrice?: number
  image: string
  size: string
  color: string
  quantity: number
}

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  const cart = localStorage.getItem('zadiis-cart')
  return cart ? JSON.parse(cart) : []
}

export function saveCart(items: CartItem[]) {
  localStorage.setItem('zadiis-cart', JSON.stringify(items))
}

export function addToCart(item: CartItem) {
  const cart = getCart()
  const existing = cart.find(i => i.id === item.id && i.size === item.size && i.color === item.color)
  if (existing) {
    existing.quantity += item.quantity
  } else {
    cart.push(item)
  }
  saveCart(cart)
}

export function removeFromCart(id: string, size: string, color: string) {
  const cart = getCart().filter(i => !(i.id === id && i.size === size && i.color === color))
  saveCart(cart)
}

export function getCartCount(): number {
  return getCart().reduce((sum, i) => sum + i.quantity, 0)
}

export function clearCart() {
  localStorage.removeItem('zadiis-cart')
}
