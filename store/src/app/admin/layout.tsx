import Link from 'next/link'
import { LayoutDashboard, Package, ShoppingBag } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-56 shrink-0 flex flex-col py-6 px-4 gap-1" style={{ backgroundColor: '#1C1C1C', color: 'white' }}>
        <h2 className="text-lg px-2 mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>ZADII'S Admin</h2>
        <Link href="/admin" className="flex items-center gap-3 px-2 py-2 rounded text-sm hover:bg-white/10 transition-colors">
          <LayoutDashboard size={16} />Dashboard
        </Link>
        <Link href="/admin/products" className="flex items-center gap-3 px-2 py-2 rounded text-sm hover:bg-white/10 transition-colors">
          <Package size={16} />Products
        </Link>
        <Link href="/admin/orders" className="flex items-center gap-3 px-2 py-2 rounded text-sm hover:bg-white/10 transition-colors">
          <ShoppingBag size={16} />Orders
        </Link>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}
