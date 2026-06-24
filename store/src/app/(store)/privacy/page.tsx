export const metadata = { title: 'Privacy Policy | ZADIIS' }

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl mb-8" style={{ fontFamily: 'Playfair Display, serif' }}>Privacy Policy</h1>
      <div className="prose prose-sm max-w-none space-y-6 text-gray-700">
        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#1C1C1C' }}>Information We Collect</h2>
          <p>We collect your name, phone number, email address, and delivery address when you place an order. This information is used solely to process and deliver your order.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#1C1C1C' }}>Reviews</h2>
          <p>When you submit a product review, only your name and review content are displayed publicly. Your email address and contact details are never shared.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#1C1C1C' }}>Data Sharing</h2>
          <p>We do not sell or share your personal information with third parties except as required to fulfill your order (e.g., delivery partners).</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#1C1C1C' }}>Contact</h2>
          <p>For privacy concerns, email us at <a href="mailto:support@zadiis.com" className="underline">support@zadiis.com</a>.</p>
        </section>
      </div>
    </div>
  )
}
