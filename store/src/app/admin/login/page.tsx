'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function AdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      // Full page reload so the browser sends the newly-set cookie
      // on the next request — soft router.push() can miss httpOnly cookies
      const from = searchParams.get('from') || '/admin'
      window.location.href = from
    } else {
      setError('Invalid password')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAF8F5' }}>
      <div className="bg-white p-8 rounded-lg shadow-sm w-full max-w-sm border" style={{ borderColor: '#E8DDD4' }}>
        <h1 className="text-2xl text-center mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>Admin Login</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button
            type="submit"
            disabled={loading}
            className="w-full text-white rounded-none"
            style={{ backgroundColor: '#1C1C1C' }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
      </div>
    </div>
  )
}
