import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import WhatsAppButton from '@/components/layout/WhatsAppButton'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const { data: sale } = await supabaseAdmin
    .from('sales')
    .select('id')
    .eq('is_active', true)
    .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
    .maybeSingle()
  const hasSale = !!sale

  return (
    <>
      <Header hasSale={hasSale} />
      <main className="min-h-screen">{children}</main>
      <Footer hasSale={hasSale} />
      <WhatsAppButton />
    </>
  )
}
