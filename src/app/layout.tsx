import type { Metadata } from 'next'
import { Outfit, Space_Grotesk } from 'next/font/google'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
  weight: ['300', '400', '500', '600'],
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space',
  display: 'swap',
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  title: {
    default:  'PokéAlpha Terminal',
    template: '%s · PokéAlpha Terminal',
  },
  description: 'The Bloomberg of Pokémon Cards — real-time prices, AI signals, deal discovery.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${outfit.variable} ${spaceGrotesk.variable}`}
      suppressHydrationWarning
    >
      <body style={{
        margin: 0,
        padding: 0,
        background: '#FAFAFA',
        fontFamily: 'var(--font-outfit, system-ui)',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      }}>
        {children}
      </body>
    </html>
  )
}
