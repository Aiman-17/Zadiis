export const metadata = { title: 'Returns & Exchanges | ZADIIS' }

export default function ReturnsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl mb-8" style={{ fontFamily: 'Playfair Display, serif' }}>Returns & Exchanges</h1>
      <div className="prose prose-sm max-w-none space-y-6 text-gray-700">
        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#1C1C1C' }}>7-Day Return Policy</h2>
          <p>We accept returns within 7 days of delivery. Items must be unworn, unwashed, and in original packaging with all tags attached.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#1C1C1C' }}>How to Return</h2>
          <ol className="list-decimal list-inside space-y-1">
            <li>WhatsApp us your order number and reason for return</li>
            <li>We will confirm your return request within 24 hours</li>
            <li>Ship the item back to our address (provided on confirmation)</li>
            <li>Refund or exchange is processed within 3–5 business days of receiving the item</li>
          </ol>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#1C1C1C' }}>Non-Returnable Items</h2>
          <p>Sale items, customised orders, and items marked as final sale cannot be returned.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#1C1C1C' }}>Contact</h2>
          <p>For any return queries, please WhatsApp us or email <a href="mailto:support@zadiis.com" className="underline">support@zadiis.com</a>.</p>
        </section>
      </div>
    </div>
  )
}
