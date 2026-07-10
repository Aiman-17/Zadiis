import { useRef, useState } from 'react'

const DEFAULT_THRESHOLD_MS = 500

// Shared press-and-hold gesture (spec 006, US6) — reveals hidden row actions
// on mobile without changing what the actions themselves do or require.
// Distinct from ProductImageGallery's swipe handling: this is a stationary
// timer, not a move-tracking gesture, so a scroll/drag cancels it.
export function useLongPress(threshold: number = DEFAULT_THRESHOLD_MS) {
  const [revealed, setRevealed] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clear = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const start = () => {
    clear()
    timerRef.current = setTimeout(() => setRevealed(r => !r), threshold)
  }

  return {
    revealed,
    reset: () => setRevealed(false),
    handlers: {
      onTouchStart: start,
      onTouchEnd: clear,
      onTouchMove: clear,
      onTouchCancel: clear,
    },
  }
}
