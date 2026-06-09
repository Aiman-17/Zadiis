import { MessageCircle } from 'lucide-react'

export default function ContactPage() {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '923001234567'

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <h1 className="text-3xl mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>Get in Touch</h1>
      <p className="text-gray-500 mb-8">Have a question about an order or product? We&apos;re here to help.</p>
      <a
        href={`https://wa.me/${phone}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-3 text-white px-8 py-4 rounded-full font-medium transition-colors hover:opacity-90"
        style={{ backgroundColor: '#22C55E' }}
      >
        <MessageCircle size={20} />
        Chat on WhatsApp
      </a>
      <p className="text-sm text-gray-400 mt-6">We usually reply within a few hours</p>
    </div>
  )
}
