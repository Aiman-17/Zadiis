import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: "ZADII'S — Women's Fashion",
  description: "Discover the latest women's fashion at ZADII'S. Shop kurtas, dresses, and more.",
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
