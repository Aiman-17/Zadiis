import { useSyncExternalStore } from 'react'

const COLLAPSED_KEY = 'zadiis-admin-sidebar-collapsed'

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback)
  window.addEventListener('zadiis-sidebar-collapsed-changed', callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener('zadiis-sidebar-collapsed-changed', callback)
  }
}

function getSnapshot() {
  return localStorage.getItem(COLLAPSED_KEY) === '1'
}

function getServerSnapshot() {
  return false
}

export function setSidebarCollapsed(next: boolean) {
  localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
  window.dispatchEvent(new Event('zadiis-sidebar-collapsed-changed'))
}

// Same useSyncExternalStore pattern as useAdminDarkMode — no effect, no
// render-phase setState, single source of truth read across the layout.
export function useSidebarCollapsed(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
