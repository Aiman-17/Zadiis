import Link from 'next/link'

export default function Footer() {
  return (
    <footer style={{ backgroundColor: '#1C1C1C', color: '#E8DDD4' }} className="py-12 mt-auto">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Brand */}
        <div>
          <p className="text-lg font-bold mb-3" style={{ fontFamily: 'Playfair Display, serif', color: 'white' }}>ZADIIS</p>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>Dressed in Confidence. Women&apos;s fashion crafted for the modern Pakistani woman.</p>
        </div>
        {/* Quick Links */}
        <div>
          <p className="text-sm font-semibold mb-3 uppercase tracking-widest" style={{ color: '#A68B6E' }}>Quick Links</p>
          <ul className="space-y-2 text-sm" style={{ color: '#9CA3AF' }}>
            <li><Link href="/shop" className="hover:text-white transition-colors">Shop</Link></li>
            <li><Link href="/cart" className="hover:text-white transition-colors">Cart</Link></li>
            <li><Link href="/sale" className="hover:text-white transition-colors">Sale</Link></li>
          </ul>
        </div>
        {/* Policies */}
        <div>
          <p className="text-sm font-semibold mb-3 uppercase tracking-widest" style={{ color: '#A68B6E' }}>Policies</p>
          <ul className="space-y-2 text-sm" style={{ color: '#9CA3AF' }}>
            <li><Link href="/returns" className="hover:text-white transition-colors">Returns & Exchanges</Link></li>
            <li><Link href="/shipping" className="hover:text-white transition-colors">Shipping Info</Link></li>
            <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 mt-8 pt-6 border-t text-center text-xs" style={{ borderColor: '#374151', color: '#6B7280' }}>
        © {new Date().getFullYear()} ZADIIS. All rights reserved.
      </div>
    </footer>
  )
}
