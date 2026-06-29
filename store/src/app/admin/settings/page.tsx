'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2 } from 'lucide-react'
import type { DeliveryZone } from '@/types'

export default function AdminSettings() {
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [codEnabled, setCodEnabled] = useState(false)
  const [newCity, setNewCity] = useState('')
  const [newCharge, setNewCharge] = useState('')
  const [saving, setSaving] = useState(false)
  const [heroImage, setHeroImage] = useState('')
  const [heroUploading, setHeroUploading] = useState(false)
  const [jazzcashNumber, setJazzcashNumber] = useState('')
  const [easypaisaNumber, setEasypaisaNumber] = useState('')
  const [numbersSaving, setNumbersSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/delivery-zones')
      .then(r => r.json())
      .then(setZones)
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then((s: Record<string, string>) => {
        setCodEnabled(s.cod_enabled === 'true')
        setHeroImage(s.hero_image || '')
        setJazzcashNumber(s.jazzcash_number || '')
        setEasypaisaNumber(s.easypaisa_number || '')
      })
  }, [])

  const addZone = async () => {
    if (!newCity.trim() || !newCharge) return
    setSaving(true)
    const res = await fetch('/api/admin/delivery-zones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city: newCity.trim(), delivery_charge: Number(newCharge) }),
    })
    if (res.ok) {
      const zone = await res.json()
      setZones(z => [...z, zone])
      setNewCity('')
      setNewCharge('')
    }
    setSaving(false)
  }

  const updateZone = async (id: string, fields: Partial<DeliveryZone>) => {
    setZones(z => z.map(zone => zone.id === id ? { ...zone, ...fields } : zone))
    await fetch('/api/admin/delivery-zones', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...fields }),
    })
  }

  const deleteZone = async (id: string) => {
    if (!confirm('Remove this city?')) return
    await fetch('/api/admin/delivery-zones', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setZones(z => z.filter(zone => zone.id !== id))
  }

  const uploadHero = async (file: File) => {
    setHeroUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
    if (res.ok) {
      const { url } = await res.json()
      setHeroImage(url)
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'hero_image', value: url }),
      })
    }
    setHeroUploading(false)
  }

  const toggleCod = async (enabled: boolean) => {
    setCodEnabled(enabled)
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'cod_enabled', value: String(enabled) }),
    })
  }

  const savePaymentNumbers = async () => {
    setNumbersSaving(true)
    await Promise.all([
      fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'jazzcash_number', value: jazzcashNumber.trim() }),
      }),
      fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'easypaisa_number', value: easypaisaNumber.trim() }),
      }),
    ])
    setNumbersSaving(false)
  }

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl" style={{ fontFamily: 'Playfair Display, serif' }}>Settings</h1>

      {/* Hero Banner */}
      <div className="bg-white rounded-lg border p-6" style={{ borderColor: '#E8DDD4' }}>
        <h2 className="font-semibold mb-4">Hero Banner Image</h2>
        {heroImage && (
          <div className="relative w-full rounded overflow-hidden mb-4 bg-gray-100" style={{ aspectRatio: '16/6' }}>
            <img src={heroImage} alt="Hero banner preview" className="w-full h-full object-cover" />
          </div>
        )}
        <label className="flex items-center gap-2 border-2 border-dashed rounded px-4 py-3 text-sm cursor-pointer hover:bg-gray-50 transition-colors" style={{ borderColor: '#E8DDD4', color: '#A68B6E' }}>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => e.target.files?.[0] && uploadHero(e.target.files[0])}
          />
          {heroUploading ? 'Uploading...' : heroImage ? 'Replace Banner Image' : 'Upload Banner Image'}
        </label>
        {heroImage && (
          <button
            onClick={async () => {
              setHeroImage('')
              await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'hero_image', value: '' }),
              })
            }}
            className="mt-2 text-xs hover:opacity-80"
            style={{ color: '#EF4444' }}
          >
            Remove banner
          </button>
        )}
      </div>

      {/* Delivery Zones */}
      <div className="bg-white rounded-lg border p-6" style={{ borderColor: '#E8DDD4' }}>
        <h2 className="font-semibold mb-4">Delivery Zones</h2>
        <div className="overflow-x-auto">
        <table className="w-full text-sm mb-4 min-w-[360px]">
          <thead>
            <tr className="border-b" style={{ borderColor: '#E8DDD4' }}>
              <th className="text-left py-2 font-medium">City</th>
              <th className="text-left py-2 font-medium">Charge (PKR)</th>
              <th className="text-left py-2 font-medium">Active</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {zones.map(zone => (
              <tr key={zone.id} className="border-b last:border-0" style={{ borderColor: '#F3F4F6' }}>
                <td className="py-2">{zone.city}</td>
                <td className="py-2">
                  <input
                    type="number"
                    className="border rounded px-2 py-1 text-sm w-24"
                    style={{ borderColor: '#E2E8F0' }}
                    defaultValue={zone.delivery_charge}
                    key={zone.id}
                    onBlur={e => updateZone(zone.id, { delivery_charge: Number(e.target.value) })}
                  />
                </td>
                <td className="py-2">
                  <input
                    type="checkbox"
                    checked={zone.is_active}
                    onChange={e => updateZone(zone.id, { is_active: e.target.checked })}
                    className="w-4 h-4"
                  />
                </td>
                <td className="py-2">
                  <button onClick={() => deleteZone(zone.id)} className="text-gray-400 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <Label className="text-xs">City</Label>
            <Input value={newCity} onChange={e => setNewCity(e.target.value)} placeholder="Lahore" className="mt-1 w-32" />
          </div>
          <div>
            <Label className="text-xs">Charge (PKR)</Label>
            <Input type="number" value={newCharge} onChange={e => setNewCharge(e.target.value)} placeholder="250" className="mt-1 w-28" />
          </div>
          <Button onClick={addZone} disabled={saving} className="text-white rounded-none" style={{ backgroundColor: '#1C1C1C' }}>
            Add City
          </Button>
        </div>
      </div>

      {/* Payment Settings */}
      <div className="bg-white rounded-lg border p-6" style={{ borderColor: '#E8DDD4' }}>
        <h2 className="font-semibold mb-4">Payment Settings</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Cash on Delivery (COD)</p>
            <p className="text-xs text-gray-500 mt-0.5">When enabled, COD option appears in checkout</p>
          </div>
          <button
            onClick={() => toggleCod(!codEnabled)}
            className="relative w-11 h-6 rounded-full transition-colors"
            style={{ backgroundColor: codEnabled ? '#1C1C1C' : '#D1D5DB' }}
          >
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow"
              style={{ transform: codEnabled ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </div>
      </div>

      {/* Fallback Payment Numbers */}
      <div className="bg-white rounded-lg border p-6" style={{ borderColor: '#E8DDD4' }}>
        <h2 className="font-semibold mb-1">Fallback Payment Numbers</h2>
        <p className="text-xs text-gray-500 mb-4">Shown to customers when Safepay is down. Enter your personal number customers can transfer to.</p>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">JazzCash Number</Label>
            <Input
              value={jazzcashNumber}
              onChange={e => setJazzcashNumber(e.target.value)}
              placeholder="03001234567"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Easypaisa Number</Label>
            <Input
              value={easypaisaNumber}
              onChange={e => setEasypaisaNumber(e.target.value)}
              placeholder="03001234567"
              className="mt-1"
            />
          </div>
          <Button
            onClick={savePaymentNumbers}
            disabled={numbersSaving}
            className="text-white rounded-none"
            style={{ backgroundColor: '#1C1C1C' }}
          >
            {numbersSaving ? 'Saving...' : 'Save Numbers'}
          </Button>
        </div>
      </div>
    </div>
  )
}
