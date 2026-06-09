import Link from 'next/link'

export default function Footer() {
  return (
    <footer style={{ backgroundColor: '#1C1C1C', color: 'white' }} className="mt-20">
      <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="text-xl mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>ZADIIS</h3>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>Modern Pakistani women&apos;s fashion. Quality you can feel.</p>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Shop</h4>
          <ul className="space-y-2 text-sm" style={{ color: '#9CA3AF' }}>
            <li><Link href="/shop" className="hover:text-white transition-colors">All Products</Link></li>
            <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
            <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Help</h4>
          <ul className="space-y-2 text-sm" style={{ color: '#9CA3AF' }}>
            <li><Link href="/contact" className="hover:text-white transition-colors">WhatsApp Support</Link></li>
            <li>Free delivery on orders over PKR 2,000</li>
          </ul>
        </div>
      </div>
      <div className="border-t text-center py-4 text-xs" style={{ borderColor: '#374151', color: '#6B7280' }}>
        © {new Date().getFullYear()} ZADIIS. All rights reserved.
      </div>
    </footer>
  )
}
