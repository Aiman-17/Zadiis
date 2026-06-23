export const metadata = { title: 'Shipping Information | ZADIIS' }

export default function ShippingPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl mb-8" style={{ fontFamily: 'Playfair Display, serif' }}>Shipping Information</h1>
      <div className="prose prose-sm max-w-none space-y-6 text-gray-700">
        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#1C1C1C' }}>Delivery Times</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Karachi: 1–2 business days</li>
            <li>Lahore, Islamabad: 2–3 business days</li>
            <li>Other major cities: 3–5 business days</li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#1C1C1C' }}>Delivery Charges</h2>
          <p>Delivery charges vary by city and are shown at checkout. Free delivery is available on orders over PKR 10,000.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#1C1C1C' }}>Tracking Your Order</h2>
          <p>Once your order is dispatched, you will receive a tracking number via email or WhatsApp.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#1C1C1C' }}>Questions?</h2>
          <p>Contact us on WhatsApp or email <a href="mailto:support@zadiis.com" className="underline">support@zadiis.com</a>.</p>
        </section>
      </div>
    </div>
  )
}
