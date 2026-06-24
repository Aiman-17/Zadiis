import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'ZADIIS — Women\'s Fashion',
    template: '%s | ZADIIS',
  },
  description: 'Discover women\'s fashion crafted for the modern Pakistani woman. Shop dresses, suits, and more.',
  openGraph: {
    siteName: 'ZADIIS',
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
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
