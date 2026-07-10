'use client'
import { useAdminDarkMode } from '@/hooks/useAdminDarkMode'
import { getAdminStatusColors } from '@/lib/adminColors'

export default function SaleStatusBadge({ isActive, isCompleted }: { isActive: boolean; isCompleted: boolean }) {
  const isDark = useAdminDarkMode()
  const C = getAdminStatusColors(isDark)

  if (isActive) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
        style={{ backgroundColor: isDark ? `color-mix(in srgb, ${C.success} 25%, var(--admin-surface))` : '#DCFCE7', color: C.success }}>
        Active
      </span>
    )
  }
  if (isCompleted) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
        style={{ backgroundColor: isDark ? `color-mix(in srgb, ${C.infoStrong} 25%, var(--admin-surface))` : '#DBEAFE', color: C.infoStrong }}>
        Completed
      </span>
    )
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ backgroundColor: 'var(--admin-divider)', color: 'var(--admin-muted)' }}>
      Inactive
    </span>
  )
}
