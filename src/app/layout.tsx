import type { Metadata, Viewport } from 'next'
import { Sora, DM_Sans, Space_Mono, Teko } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth/AuthProvider'
import CookieConsent from '@/components/layout/CookieConsent'
import Analytics from '@/components/layout/Analytics'
const delaGothic = Teko({
  weight: '700',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-shonen',
})

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm',
  display: 'swap',
  weight: ['400', '500', '700'],
})
const spaceMono = Space_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '700'],
})
export const metadata: Metadata = {
  title: {
    default: 'Kodo Cards',
    template: '%s | Kodo Cards',
  },
  description: 'Réunis toute ta collection Pokémon, suis sa valeur au jour le jour et termine tes séries. FR, EN et JP.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    siteName: 'Kodo Cards',
    locale: 'fr_FR',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
}
interface RootLayoutProps {
  children: React.ReactNode
}
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="fr"
      className={`${sora.variable} ${dmSans.variable} ${spaceMono.variable} ${delaGothic.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-bg font-sans">
        <AuthProvider>
          {children}
          <CookieConsent />
          <Analytics />
        </AuthProvider>
      </body>
    </html>
  )
}
