// store/src/lib/adminColors.ts
//
// Semantic status colors (success/critical/warning/info/violet) used across
// admin dashboard/analytics charts and KPI text. The light-mode values are
// Tailwind-500/600 swatches; the dark-mode values are desaturated
// substitutes validated with the dataviz skill's validate_palette.js
// against surface #232323 (lightness band, chroma floor, CVD separation,
// contrast all pass — see 2026-07-09 admin dark mode fix).
export const ADMIN_STATUS_LIGHT = {
  success: '#10B981',
  critical: '#EF4444',
  criticalStrong: '#DC2626',
  warning: '#F59E0B',
  info: '#3B82F6',
  infoStrong: '#1D4ED8',
  violet: '#8B5CF6',
  violetStrong: '#5B21B6',
} as const

export const ADMIN_STATUS_DARK = {
  success: '#30A46C',
  critical: '#E5484D',
  criticalStrong: '#E5484D',
  warning: '#B8770F',
  info: '#1798D6',
  infoStrong: '#1798D6',
  violet: '#A855F7',
  violetStrong: '#A855F7',
} as const

export type AdminStatusColors = Record<keyof typeof ADMIN_STATUS_LIGHT, string>

export function getAdminStatusColors(isDark: boolean): AdminStatusColors {
  return isDark ? ADMIN_STATUS_DARK : ADMIN_STATUS_LIGHT
}
