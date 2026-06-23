'use client'
import { Input } from '@/components/ui/input'
import type { VariantStock } from '@/types'

interface Props {
  colors: string[]
  sizes: string[]
  value: VariantStock
  onChange: (v: VariantStock) => void
}

export default function VariantStockGrid({ colors, sizes, value, onChange }: Props) {
  const effectiveSizes = sizes.length === 0 || (sizes.length === 1 && sizes[0] === 'Unstitched') ? ['_'] : sizes
  const effectiveColors = colors.length === 0 ? ['_'] : colors

  const get = (c: string, s: string) => value?.[c]?.[s] ?? 0

  const set = (c: string, s: string, qty: number) => {
    const next: VariantStock = JSON.parse(JSON.stringify(value || {}))
    if (!next[c]) next[c] = {}
    next[c][s] = Math.max(0, qty)
    onChange(next)
  }

  if (effectiveColors.length === 1 && effectiveColors[0] === '_' && effectiveSizes.length === 1 && effectiveSizes[0] === '_') {
    return (
      <div className="text-sm text-gray-500">Add colors or sizes above to enable per-variant stock</div>
    )
  }

  const showColorCol = !(effectiveColors.length === 1 && effectiveColors[0] === '_')
  const showSizeRow = !(effectiveSizes.length === 1 && effectiveSizes[0] === '_')

  return (
    <div className="overflow-x-auto">
      <table className="text-sm border-collapse w-full">
        <thead>
          <tr>
            {showColorCol && <th className="text-left pr-3 pb-2 font-medium text-gray-600">Color</th>}
            {showSizeRow
              ? effectiveSizes.map(s => (
                  <th key={s} className="px-2 pb-2 font-medium text-gray-600 text-center min-w-[64px]">{s}</th>
                ))
              : <th className="px-2 pb-2 font-medium text-gray-600 text-center min-w-[64px]">Qty</th>
            }
          </tr>
        </thead>
        <tbody>
          {effectiveColors.map(c => (
            <tr key={c}>
              {showColorCol && (
                <td className="pr-3 py-1 font-medium text-gray-700 capitalize">{c}</td>
              )}
              {effectiveSizes.map(s => (
                <td key={s} className="px-2 py-1">
                  <Input
                    type="number"
                    min="0"
                    value={get(c, s)}
                    onChange={e => set(c, s, Number(e.target.value))}
                    className="w-16 text-center h-8 text-sm"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
