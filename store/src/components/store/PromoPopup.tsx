'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, Truck, X } from 'lucide-react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { DialogTitle, DialogDescription } from '@/components/ui/dialog'

const SALE_KEY = 'zadiis-promo-dismissed-sale'
const DELIVERY_KEY = 'zadiis-promo-dismissed-free-delivery'

// A floating, non-blocking card — not a modal. Built directly on
// DialogPrimitive (skipping the shared DialogContent/DialogOverlay) with
// modal={false} and no overlay, so the rest of the page stays fully
// interactive and in the accessibility tree while the card is up. This
// corrects an initial version that used the standard modal Dialog: Radix
// marks everything else aria-hidden and focus-trapped when modal, which is
// appropriate for a real modal but not for a promotional nudge — and broke
// every store E2E test that didn't already expect a blocking popup, since
// none of them could find page content behind it. See research notes for
// spec 006 US5.
function PopupCard({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  children: React.ReactNode
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          onOpenAutoFocus={e => e.preventDefault()}
          className="fixed z-40 bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-full sm:max-w-sm rounded-lg border p-5 shadow-xl text-center data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom-2 data-[state=open]:slide-in-from-bottom-2"
        >
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

// Sequenced (sale, then free-delivery) so the two never overlap on screen —
// showing both cards simultaneously would look broken, not like two
// distinct offers. Mounts closed and only opens post-hydration after
// checking sessionStorage, matching this codebase's existing
// hydration-safety convention — never decide visibility synchronously in
// initial state.
export default function PromoPopups({
  saleActive,
  saleTitle,
  freeDeliveryEnabled,
}: {
  saleActive: boolean
  saleTitle?: string | null
  freeDeliveryEnabled: boolean
}) {
  const [stage, setStage] = useState<'sale' | 'free-delivery' | 'done'>('sale')

  useEffect(() => {
    if (saleActive && sessionStorage.getItem(SALE_KEY) !== '1') {
      setStage('sale')
    } else if (freeDeliveryEnabled && sessionStorage.getItem(DELIVERY_KEY) !== '1') {
      setStage('free-delivery')
    } else {
      setStage('done')
    }
    // Intentionally runs once on mount — session gating shouldn't re-trigger
    // mid-session if these props change (e.g. a sale ending while browsing).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dismissSale = () => {
    sessionStorage.setItem(SALE_KEY, '1')
    if (freeDeliveryEnabled && sessionStorage.getItem(DELIVERY_KEY) !== '1') setStage('free-delivery')
    else setStage('done')
  }

  const dismissDelivery = () => {
    sessionStorage.setItem(DELIVERY_KEY, '1')
    setStage('done')
  }

  return (
    <>
      <PopupCard open={stage === 'sale'} onOpenChange={o => { if (!o) dismissSale() }}>
        <div style={{ backgroundColor: '#1C1C1C', color: 'white', margin: '-1.25rem', padding: '1.25rem', borderRadius: '0.5rem' }}>
          <DialogPrimitive.Close className="absolute top-3 right-3 opacity-70 hover:opacity-100 transition-opacity" style={{ color: 'white' }}>
            <X size={16} />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
          <div className="flex justify-center mb-1">
            <span
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
              style={{ backgroundColor: '#C62828', color: 'white' }}
            >
              <Sparkles size={11} /> Limited Time
            </span>
          </div>
          <DialogTitle className="text-xl" style={{ fontFamily: 'Playfair Display, serif', color: 'white' }}>
            {saleTitle || 'A Sale Is On Right Now'}
          </DialogTitle>
          <DialogDescription style={{ color: '#D1D5DB' }}>
            Don&apos;t miss out — browse discounted styles before they&apos;re gone.
          </DialogDescription>
          <Link
            href="/sale"
            onClick={dismissSale}
            className="mt-3 inline-block w-full py-2.5 text-sm font-semibold rounded-md transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#A68B6E', color: '#1C1C1C' }}
          >
            View Sale →
          </Link>
        </div>
      </PopupCard>

      <PopupCard open={stage === 'free-delivery'} onOpenChange={o => { if (!o) dismissDelivery() }}>
        <DialogPrimitive.Close className="absolute top-3 right-3 opacity-70 hover:opacity-100 transition-opacity" style={{ color: '#6B7280' }}>
          <X size={16} />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
        <div className="flex justify-center mb-1">
          <span
            className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full text-white"
            style={{ backgroundColor: '#10B981' }}
          >
            <Truck size={11} /> Free Delivery
          </span>
        </div>
        <DialogTitle className="text-xl" style={{ fontFamily: 'Playfair Display, serif', color: '#1C1C1C' }}>
          Free Delivery on 5+ Items
        </DialogTitle>
        <DialogDescription style={{ color: '#6B7280' }}>
          Add 5 or more items to your cart and delivery is on us.
        </DialogDescription>
        <Link
          href="/shop"
          onClick={dismissDelivery}
          className="mt-3 inline-block w-full py-2.5 text-sm font-semibold rounded-md text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#1C1C1C' }}
        >
          Start Shopping →
        </Link>
      </PopupCard>
    </>
  )
}
