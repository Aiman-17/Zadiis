import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: "ZADII'S — Women's Fashion",
    template: "%s | ZADII'S",
  },
  description: 'Discover women\'s fashion crafted for the modern Pakistani woman. Shop dresses, suits, and more.',
  openGraph: {
    siteName: "ZADII'S",
    type: 'website',
    locale: 'en_PK',
  },
  twitter: {
    card: 'summary_large_image',
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://zadiis.com'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the beforeInteractive script below adds the
    // "dark" class here before hydration (to prevent a light-mode flash on
    // load for /admin) — this intentionally mutates the attribute React
    // rendered server-side, so React must be told not to treat that as a
    // hydration bug. Scoped to this element only, not a blanket suppression.
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
        {/* beforeInteractive: Next.js always hoists this into <head> itself
            regardless of where it's placed (per the Script component docs) —
            manually rendering a <head> element in the App Router isn't the
            supported pattern and was the actual cause of the console warning,
            not the beforeInteractive strategy itself. A raw <script> tag
            rendered by a client component (as this used to be, in
            admin/layout.tsx) never executes on any subsequent client render,
            which is exactly what React's "script tags are never executed
            when rendering on the client" warning was catching. Gated to
            /admin so a customer's browser (which never sets the admin
            dark-mode flag) can never have this touch the storefront — .dark
            also redefines --brand-bg/--brand-text, which the storefront's
            own body styles read. */}
        <Script id="admin-dark-mode-init" strategy="beforeInteractive">
          {`try{if(location.pathname.startsWith('/admin')&&localStorage.getItem('zadiis-admin-dark-mode')==='1')document.documentElement.classList.add('dark')}catch(e){}`}
        </Script>
      </body>
    </html>
  )
}
