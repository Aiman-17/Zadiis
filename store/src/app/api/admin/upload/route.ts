// store/src/app/api/admin/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    let formData: FormData
    try {
      formData = await req.formData()
    } catch (e) {
      console.error('[upload] formData parse error:', e)
      return NextResponse.json({ error: 'Failed to parse form data', detail: String(e) }, { status: 400 })
    }

    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    console.log('[upload] file received:', file.name, file.type, file.size)

    const ext = file.type === 'image/png' ? 'png' : 'jpg'
    const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.log('[upload] uploading to path:', path, 'size:', buffer.length)

    const { data, error } = await supabaseAdmin.storage
      .from('product-images')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      console.error('[upload] Storage error:', error)
      return NextResponse.json({ error: error.message, detail: JSON.stringify(error) }, { status: 500 })
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('product-images')
      .getPublicUrl(data.path)

    console.log('[upload] success, url:', publicUrl)
    return NextResponse.json({ url: publicUrl })
  } catch (err) {
    console.error('[upload] Unexpected error:', err)
    return NextResponse.json({ error: 'Upload failed', detail: String(err) }, { status: 500 })
  }
}
