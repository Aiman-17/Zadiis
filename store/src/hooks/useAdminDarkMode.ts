import { useSyncExternalStore } from 'react'

const DARK_MODE_KEY = 'zadiis-admin-dark-mode'

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback)
  window.addEventListener('zadiis-dark-mode-changed', callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener('zadiis-dark-mode-changed', callback)
  }
}

function getSnapshot() {
  return localStorage.getItem(DARK_MODE_KEY) === '1'
}

function getServerSnapshot() {
  return false
}

export function setAdminDarkMode(next: boolean) {
  localStorage.setItem(DARK_MODE_KEY, next ? '1' : '0')
  // storage events don't fire for same-document writes — notify this tab too.
  window.dispatchEvent(new Event('zadiis-dark-mode-changed'))
}

// Single source of truth for admin dark mode — read via useSyncExternalStore
// (no effect, no render-phase setState) so every consumer (the sidebar
// toggle, AnalyticsClient/DashboardCharts/YoyWidget chart palettes) reacts
// to the same localStorage key without duplicating read/write logic.
export function useAdminDarkMode(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
