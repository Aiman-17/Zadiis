'use client'
import { MessageCircle } from 'lucide-react'

export default function WhatsAppButton() {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '923001234567'
  const message = encodeURIComponent('Hi! I have a question about my order.')

  return (
    <a
      href={`https://wa.me/${phone}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-110"
      style={{ backgroundColor: '#22C55E' }}
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle size={24} />
    </a>
  )
}
