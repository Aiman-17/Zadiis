'use client'

const REASONS = [
  { key: 'customer_changed_mind', label: 'Customer Changed Mind' },
  { key: 'no_response',           label: 'No Response (No Pickup)' },
  { key: 'wrong_address',         label: 'Wrong Address' },
  { key: 'duplicate_order',       label: 'Duplicate Order' },
  { key: 'out_of_stock',          label: 'Out of Stock' },
  { key: 'delivery_delay',        label: 'Delivery Too Slow' },
  { key: 'other',                 label: 'Other' },
]

export default function CancelModal({
  onConfirm,
  onClose,
}: {
  onConfirm: (reason: string) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--admin-surface)] rounded-lg p-6 w-full max-w-sm shadow-xl mx-4">
        <h3 className="font-semibold mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
          Cancel Order
        </h3>
        <p className="text-xs mb-4" style={{ color: 'var(--admin-subtle)' }}>Select the reason for cancellation</p>
        <div className="space-y-2">
          {REASONS.map(r => (
            <button
              key={r.key}
              onClick={() => onConfirm(r.key)}
              className="w-full text-left text-sm px-4 py-2.5 rounded border transition-colors"
              style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--admin-bg)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
            >
              {r.label}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full text-sm py-2 rounded border transition-colors"
          style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-subtle)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--admin-divider)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
        >
          Keep Order
        </button>
      </div>
    </div>
  )
}
