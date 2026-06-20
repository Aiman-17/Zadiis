'use client'
import { useState } from 'react'
import Image from 'next/image'
import { X, ZoomIn } from 'lucide-react'

export default function ProductImageGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0)
  const [zoomed, setZoomed] = useState(false)

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
        {/* Main image — click to zoom */}
        <div
          className="aspect-[3/4] relative rounded-lg overflow-hidden bg-white cursor-zoom-in group"
          onClick={() => setZoomed(true)}
        >
          <Image src={images[active]} alt={name} fill className="object-cover" />
          <div
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}
          >
            <div className="bg-white rounded-full p-2 shadow">
              <ZoomIn size={20} style={{ color: '#1C1C1C' }} />
            </div>
          </div>
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
                <Image src={img} alt={`${name} view ${i + 1}`} fill className="object-cover" />
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

          {/* Full image */}
          <div
            className="relative w-full h-full max-w-3xl mx-4"
            style={{ maxHeight: '90vh' }}
            onClick={e => e.stopPropagation()}
          >
            <Image
              src={images[active]}
              alt={name}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 800px"
            />
          </div>
        </div>
      )}
    </>
  )
}
