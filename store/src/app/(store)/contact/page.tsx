import { MessageCircle, Mail, HeadphonesIcon } from 'lucide-react'

export default function ContactPage() {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '923001234567'

  return (
    <div className="max-w-xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-3xl mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>Get in Touch</h1>
        <p className="text-gray-500">Have a question? We&apos;re here to help through any of these channels.</p>
      </div>

      <div className="space-y-4">
        {/* WhatsApp */}
        <a
          href={`https://wa.me/${phone}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 p-5 rounded-xl border transition-colors hover:border-green-300 hover:bg-green-50"
          style={{ borderColor: '#E8DDD4' }}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#22C55E' }}>
            <MessageCircle size={22} color="white" />
          </div>
          <div>
            <p className="font-semibold" style={{ color: '#1C1C1C' }}>WhatsApp Support</p>
            <p className="text-sm text-gray-500">Fastest response · Usually replies within hours</p>
          </div>
        </a>

        {/* General info */}
        <a
          href="mailto:info@zadiis.com.pk"
          className="flex items-center gap-4 p-5 rounded-xl border transition-colors hover:border-amber-200 hover:bg-amber-50"
          style={{ borderColor: '#E8DDD4' }}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#A68B6E' }}>
            <Mail size={22} color="white" />
          </div>
          <div>
            <p className="font-semibold" style={{ color: '#1C1C1C' }}>General Inquiries</p>
            <p className="text-sm" style={{ color: '#A68B6E' }}>info@zadiis.com.pk</p>
          </div>
        </a>

        {/* Customer support */}
        <a
          href="mailto:support@zadiis.com.pk"
          className="flex items-center gap-4 p-5 rounded-xl border transition-colors hover:border-amber-200 hover:bg-amber-50"
          style={{ borderColor: '#E8DDD4' }}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#1C1C1C' }}>
            <HeadphonesIcon size={22} color="white" />
          </div>
          <div>
            <p className="font-semibold" style={{ color: '#1C1C1C' }}>Customer Support</p>
            <p className="text-sm" style={{ color: '#A68B6E' }}>support@zadiis.com.pk</p>
          </div>
        </a>
      </div>

      <p className="text-center text-xs text-gray-400 mt-8">We respond to all emails within 24 hours</p>
    </div>
  )
}
