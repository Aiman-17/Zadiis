// store/src/components/admin/ImageUploader.tsx
'use client'
import { useState, useRef } from 'react'
import Image from 'next/image'
import { X, Upload, AlertTriangle } from 'lucide-react'

type Props = {
  images: string[]
  onChange: (urls: string[]) => void
  // Color-to-image matching (spec 006, US2) — optional; when the product has
  // colors defined, each uploaded image can be tagged with one. Index-aligned
  // with `images`. Omitted entirely for products with no colors.
  availableColors?: string[]
  imageColors?: (string | null)[]
  onColorsChange?: (colors: (string | null)[]) => void
}

type Preview = {
  file: File
  objectUrl: string
  width: number
  height: number
  originalSize: number
  compressedSize?: number
  warning?: string
  uploading?: boolean
  uploaded?: boolean
  error?: string
}

async function compressImage(file: File): Promise<{ blob: Blob; width: number; height: number; originalSize: number; compressedSize: number; warning?: string }> {
  return new Promise((resolve) => {
    const img = new window.Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const originalSize = file.size
      const warning = img.width < 800 ? 'Image too small — may look blurry on product page' : undefined
      const maxWidth = 1200
      const scale = img.width > maxWidth ? maxWidth / img.width : 1
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        resolve({
          blob: blob!,
          width: canvas.width,
          height: canvas.height,
          originalSize,
          compressedSize: blob!.size,
          warning,
        })
      }, 'image/jpeg', 0.8)
    }
    img.src = objectUrl
  })
}

export default function ImageUploader({ images, onChange, availableColors, imageColors, onColorsChange }: Props) {
  const [previews, setPreviews] = useState<Preview[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const setColorAt = (index: number, color: string) => {
    if (!onColorsChange) return
    const next = [...(imageColors ?? [])]
    while (next.length < images.length) next.push(null)
    next[index] = color || null
    onColorsChange(next)
  }

  const handleFiles = async (files: FileList) => {
    const newPreviews: Preview[] = []
    const currentTotal = images.length + previews.filter(p => !p.uploaded).length
    const remaining = Math.max(0, 8 - currentTotal)
    for (const file of Array.from(files).slice(0, remaining)) {
      const objectUrl = URL.createObjectURL(file)
      const img = new window.Image()
      await new Promise<void>(res => { img.onload = () => res(); img.src = objectUrl })
      newPreviews.push({
        file,
        objectUrl,
        width: img.width,
        height: img.height,
        originalSize: file.size,
        warning: img.width < 800 ? 'Image too small — may look blurry on product page' : undefined,
      })
    }
    setPreviews(prev => [...prev, ...newPreviews])
  }

  const uploadPreview = async (index: number) => {
    const preview = previews[index]
    setPreviews(prev => prev.map((p, i) => i === index ? { ...p, uploading: true } : p))
    try {
      const { blob, width, height, compressedSize, warning } = await compressImage(preview.file)
      const formData = new FormData()
      formData.append('file', new File([blob], 'image.jpg', { type: 'image/jpeg' }))
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Upload failed')
      const { url } = await res.json()
      setPreviews(prev => prev.map((p, i) =>
        i === index ? { ...p, uploading: false, uploaded: true, width, height, compressedSize, warning } : p
      ))
      onChange([...images, url])
      if (onColorsChange) onColorsChange([...(imageColors ?? []), null])
    } catch {
      setPreviews(prev => prev.map((p, i) =>
        i === index ? { ...p, uploading: false, error: 'Upload failed. Try again.' } : p
      ))
    }
  }

  const removeUploaded = (url: string) => {
    const idx = images.indexOf(url)
    onChange(images.filter(u => u !== url))
    if (onColorsChange && idx !== -1) {
      onColorsChange((imageColors ?? []).filter((_, i) => i !== idx))
    }
  }

  const removePreview = (index: number) => {
    URL.revokeObjectURL(previews[index].objectUrl)
    setPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const formatSize = (bytes: number) => bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)}KB`
    : `${(bytes / 1024 / 1024).toFixed(1)}MB`

  return (
    <div className="space-y-3">
      {/* Already uploaded images */}
      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((url, i) => (
            <div key={i} className="space-y-1">
              <div className="relative aspect-[3/4] rounded overflow-hidden bg-[var(--admin-divider)] group">
                <Image src={url} alt={`Product image ${i + 1}`} fill className="object-cover" />
                <button
                  type="button"
                  onClick={() => removeUploaded(url)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
              </div>
              {availableColors && availableColors.length > 0 && (
                <select
                  value={imageColors?.[i] ?? ''}
                  onChange={e => setColorAt(i, e.target.value)}
                  className="w-full text-[10px] border rounded px-1 py-0.5"
                  style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-muted)' }}
                >
                  <option value="">No color tag</option>
                  {availableColors.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pending previews */}
      {previews.filter(p => !p.uploaded).map((preview, index) => (
        <div key={index} className="flex gap-3 border rounded p-3 items-start" style={{ borderColor: 'var(--admin-border)' }}>
          <div className="w-16 h-20 relative rounded overflow-hidden bg-[var(--admin-divider)] shrink-0">
            <Image src={preview.objectUrl} alt="Preview" fill className="object-cover" />
          </div>
          <div className="flex-1 text-xs space-y-1" style={{ color: 'var(--admin-muted)' }}>
            <p>{preview.width}×{preview.height}px · {formatSize(preview.originalSize)}</p>
            {preview.compressedSize && (
              <p className="text-green-600">After compression: {formatSize(preview.compressedSize)}</p>
            )}
            {preview.warning && (
              <p className="flex items-center gap-1" style={{ color: '#B45309' }}>
                <AlertTriangle size={11} />{preview.warning}
              </p>
            )}
            {preview.error && <p className="text-red-500">{preview.error}</p>}
          </div>
          <div className="flex gap-2 shrink-0">
            {!preview.uploading && !preview.uploaded && (
              <button
                type="button"
                onClick={() => uploadPreview(index)}
                className="text-xs px-3 py-1 text-white rounded"
                style={{ backgroundColor: '#1C1C1C' }}
              >
                Upload
              </button>
            )}
            {preview.uploading && (
              <span className="text-xs py-1" style={{ color: 'var(--admin-subtle)' }}>Uploading...</span>
            )}
            <button
              type="button"
              onClick={() => removePreview(index)}
              className="hover:text-red-500"
              style={{ color: 'var(--admin-subtle)' }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ))}

      {/* Upload button */}
      {images.length + previews.filter(p => !p.uploaded).length < 8 && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 border-2 border-dashed rounded px-4 py-3 text-sm w-full justify-center hover:bg-[var(--admin-divider)] transition-colors"
          style={{ borderColor: 'var(--admin-border)', color: '#A68B6E' }}
        >
          <Upload size={16} />
          Upload Images (max 8)
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => e.target.files && handleFiles(e.target.files)}
      />
    </div>
  )
}
