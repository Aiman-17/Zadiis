'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function NewSalePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ title: '', description: '', is_active: false, delivery_charge_override: '', starts_at: '', ends_at: '' })
  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        description: form.description || null,
        is_active: form.is_active,
        delivery_charge_override: form.delivery_charge_override ? Number(form.delivery_charge_override) : null,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed to create sale'); setLoading(false); return }
    router.push(`/admin/sales/${data.id}/edit`)
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>New Sale</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg border" style={{ borderColor: '#E8DDD4' }}>
        <div>
          <Label htmlFor="title">Sale Title *</Label>
          <Input id="title" required value={form.title} onChange={e => set('title', e.target.value)} placeholder="Eid Sale 2026" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="desc">Description</Label>
          <textarea id="desc" value={form.description} onChange={e => set('description', e.target.value)} rows={2} className="w-full border rounded px-3 py-2 text-sm mt-1 resize-none" style={{ borderColor: '#E2E8F0' }} placeholder="Up to 40% off on selected items" />
        </div>
        <div>
          <Label htmlFor="delivery">Delivery Charge Override (PKR, optional)</Label>
          <Input id="delivery" type="number" min="0" value={form.delivery_charge_override} onChange={e => set('delivery_charge_override', e.target.value)} placeholder="Leave blank to keep zone pricing" className="mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="starts">Starts At</Label>
            <Input id="starts" type="datetime-local" value={form.starts_at} onChange={e => set('starts_at', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="ends">Ends At</Label>
            <Input id="ends" type="datetime-local" value={form.ends_at} onChange={e => set('ends_at', e.target.value)} className="mt-1" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="w-4 h-4" />
          <Label htmlFor="is_active">Activate immediately</Label>
        </div>
        {error && <p className="text-sm" style={{ color: '#B91C1C' }}>{error}</p>}
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1 rounded-none" onClick={() => router.push('/admin/sales')}>Cancel</Button>
          <Button type="submit" disabled={loading} className="flex-1 text-white rounded-none" style={{ backgroundColor: '#1C1C1C' }}>
            {loading ? 'Creating...' : 'Create Sale'}
          </Button>
        </div>
      </form>
    </div>
  )
}
