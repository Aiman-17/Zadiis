'use client'
export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-6 py-2 rounded text-sm font-medium text-white no-print"
      style={{ backgroundColor: '#1C1C1C' }}
    >
      Print / Save as PDF
    </button>
  )
}
