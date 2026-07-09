import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import WhatsAppButton from '@/components/layout/WhatsAppButton'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [{ data: sale }, { data: cancelSetting }] = await Promise.all([
    supabaseAdmin
      .from('sales')
      .select('id')
      .eq('is_active', true)
      .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
      .maybeSingle(),
    supabaseAdmin
      .from('store_settings')
      .select('value')
      .eq('key', 'cancellations_enabled')
      .maybeSingle(),
  ])
  const hasSale = !!sale
  const cancellationsEnabled = cancelSetting?.value !== 'false'

  return (
    <>
      <Header hasSale={hasSale} />
      <main className="min-h-screen">{children}</main>
      <Footer hasSale={hasSale} cancellationsEnabled={cancellationsEnabled} />
      <WhatsAppButton />
    </>
  )
}
