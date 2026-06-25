import ReturnRequestForm from '@/components/store/ReturnRequestForm'

export const metadata = { title: 'Returns & Exchanges | ZADIIS' }

export default function ReturnsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl mb-8" style={{ fontFamily: 'Playfair Display, serif' }}>Returns & Exchanges</h1>
      <div className="prose prose-sm max-w-none space-y-6 text-gray-700">
        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#1C1C1C' }}>7-Day Return Policy</h2>
          <p>We accept returns within 7 days of your order date. Items must be unworn, unwashed, and in original packaging with all tags attached.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#1C1C1C' }}>How to Return</h2>
          <ol className="list-decimal list-inside space-y-1">
            <li>Submit your return request using the form below</li>
            <li>We will confirm your return within 24 hours and provide the return address</li>
            <li>Ship the item back (do not ship before receiving our confirmation)</li>
            <li>Refund or exchange is processed within 3–5 business days of receiving the item</li>
          </ol>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#1C1C1C' }}>Non-Returnable Items</h2>
          <p>Sale items, customised orders, and items marked as final sale cannot be returned.</p>
        </section>
      </div>

      <div className="mt-12 border-t pt-10" style={{ borderColor: '#E8DDD4' }}>
        <h2 className="text-2xl mb-2" style={{ fontFamily: 'Playfair Display, serif', color: '#1C1C1C' }}>
          Submit a Return Request
        </h2>
        <p className="text-sm mb-8" style={{ color: '#6B7280' }}>
          Fill in the details below. We will review your request and respond within 24 hours.
        </p>
        <ReturnRequestForm />
      </div>
    </div>
  )
}
