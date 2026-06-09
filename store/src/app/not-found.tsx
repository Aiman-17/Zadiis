import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center text-center px-4" style={{ backgroundColor: '#FAF8F5' }}>
      <div>
        <h1 className="text-6xl font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif', color: '#A68B6E' }}>404</h1>
        <p className="text-xl mb-2">Page not found</p>
        <p className="text-gray-500 mb-8">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Button asChild className="text-white rounded-none uppercase tracking-widest" style={{ backgroundColor: '#1C1C1C' }}>
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    </div>
  )
}
