'use client'
import { useState } from 'react'
import Image from 'next/image'

export default function ProductImageGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0)

  if (!images.length) {
    return (
      <div className="aspect-[3/4] rounded-lg bg-gray-100 flex items-center justify-center">
        <span className="text-gray-400 text-sm">No image</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="aspect-[3/4] relative rounded-lg overflow-hidden bg-white">
        <Image src={images[active]} alt={name} fill className="object-cover" />
      </div>
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
  )
}
