'use client'
import { useState } from 'react'

const RETURN_REASONS = [
  { key: 'wrong_size',      label: 'Wrong Size' },
  { key: 'defective_item',  label: 'Defective / Damaged Item' },
  { key: 'changed_mind',    label: 'Customer Changed Mind' },
  { key: 'wrong_item_sent', label: 'Wrong Item Sent' },
  { key: 'other',           label: 'Other' },
]

export default function ReturnModal({
  onConfirm,
  onClose,
}: {
  onConfirm: (reason: string, notes: string) => void
  onClose: () => void
}) {
  const [notes, setNotes] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl mx-4">
        <h3 className="font-semibold mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
          Mark as Returned
        </h3>
        <p className="text-xs mb-4" style={{ color: '#9CA3AF' }}>
          Select the reason. Stock will be credited back automatically.
        </p>
        <div className="space-y-2 mb-4">
          {RETURN_REASONS.map(r => (
            <button
              key={r.key}
              onClick={() => onConfirm(r.key, notes)}
              className="w-full text-left text-sm px-4 py-2.5 rounded border transition-colors"
              style={{ borderColor: '#E8DDD4', color: '#1C1C1C' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#FAF8F5' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
            >
              {r.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Additional notes (optional)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="w-full text-sm border rounded px-3 py-2 mb-4 outline-none"
          style={{ borderColor: '#E8DDD4' }}
        />
        <button
          onClick={onClose}
          className="w-full text-sm py-2 rounded border transition-colors"
          style={{ borderColor: '#E8DDD4', color: '#9CA3AF' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#F9FAFB' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
