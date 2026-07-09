'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react'

const SWIPE_THRESHOLD_PX = 50

type Props = {
  images: string[]
  name: string
  // Color-to-image matching (US2) — optional; index-aligned with `images`.
  // Selecting a color jumps the active image to its first tagged match, if
  // any. No match is a no-op — the gallery is otherwise fully unaffected.
  imageColors?: (string | null)[]
  selectedColor?: string
}

export default function ProductImageGallery({ images, name, imageColors, selectedColor }: Props) {
  const [active, setActive] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const touchStartX = useRef<number | null>(null)

  useEffect(() => {
    if (!selectedColor || !imageColors) return
    const matchIndex = imageColors.findIndex(c => c?.toLowerCase() === selectedColor.toLowerCase())
    if (matchIndex !== -1) setActive(matchIndex)
  }, [selectedColor, imageColors])

  const goNext = () => setActive(i => (i + 1) % images.length)
  const goPrev = () => setActive(i => (i - 1 + images.length) % images.length)

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || images.length < 2) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (delta <= -SWIPE_THRESHOLD_PX) goNext()
    else if (delta >= SWIPE_THRESHOLD_PX) goPrev()
    touchStartX.current = null
  }

  if (!images.length) {
    return (
      <div className="aspect-[3/4] rounded-lg bg-gray-100 flex items-center justify-center">
        <span className="text-sm" style={{ color: '#9CA3AF' }}>No image</span>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {/* Main image — click to zoom, swipe/arrows to navigate */}
        <div
          className="aspect-[3/4] relative rounded-lg overflow-hidden bg-white cursor-zoom-in group"
          onClick={() => setZoomed(true)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <Image src={images[active]} alt={name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
          <div
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}
          >
            <div className="bg-white rounded-full p-2 shadow">
              <ZoomIn size={20} style={{ color: '#1C1C1C' }} />
            </div>
          </div>
          {images.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); goPrev() }}
                aria-label="Previous image"
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: 'rgba(255,255,255,0.85)', color: '#1C1C1C' }}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); goNext() }}
                aria-label="Next image"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: 'rgba(255,255,255,0.85)', color: '#1C1C1C' }}
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="grid grid-cols-4 gap-2">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className="aspect-square relative rounded overflow-hidden bg-white transition-all"
                style={{
                  outline: active === i ? '2px solid #A68B6E' : '2px solid transparent',
                  outlineOffset: '2px',
                }}
              >
                <Image src={img} alt={`${name} view ${i + 1}`} fill className="object-cover" sizes="25vw" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen zoom modal */}
      {zoomed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
          onClick={() => setZoomed(false)}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 rounded-full p-2 z-10 transition-colors"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
            onClick={() => setZoomed(false)}
          >
            <X size={24} />
          </button>

          {/* Dot navigation */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={e => { e.stopPropagation(); setActive(i) }}
                  className="w-2 h-2 rounded-full transition-colors"
                  style={{ backgroundColor: active === i ? '#A68B6E' : 'rgba(255,255,255,0.4)' }}
                />
              ))}
            </div>
          )}

          {/* Full image — swipe/arrows to navigate, independent of the main view's handlers */}
          <div
            className="relative w-full h-full max-w-3xl mx-4"
            style={{ maxHeight: '90vh' }}
            onClick={e => e.stopPropagation()}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <Image
              src={images[active]}
              alt={name}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 800px"
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); goPrev() }}
                  aria-label="Previous image"
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full p-2 transition-colors"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); goNext() }}
                  aria-label="Next image"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 transition-colors"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                >
                  <ChevronRight size={22} />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
