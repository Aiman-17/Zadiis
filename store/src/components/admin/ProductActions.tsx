'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

export default function ProductActions({ id }: { id: string }) {
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm('Delete this product? It will be hidden from the store.')) return
    setDeleting(true)
    await fetch('/api/admin/products', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    router.refresh()
  }

  return (
    <div className="flex items-center gap-3">
      <Link href={`/admin/products/${id}/edit`} style={{ color: '#A68B6E' }} className="hover:underline text-sm">
        Edit
      </Link>
      <button
        onClick={handleDelete}
        disabled={deleting}
        title="Delete product"
        className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
      >
        <Trash2 size={15} />
      </button>
    </div>
  )
}
