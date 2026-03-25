import type { Metadata } from 'next'
import { Space_Grotesk, Outfit } from 'next/font/google'
import { AuthProvider } from '@/lib/auth/AuthContext'
import './globals.css'

const display = Space_Grotesk({ subsets:['latin'], variable:'--font-display', weight:['400','500','600','700'] })
const body    = Outfit({ subsets:['latin'], variable:'--font-sans', weight:['300','400','500','600'] })

export const metadata: Metadata = {
  title: 'PokéAlpha Terminal',
  description: 'Le Bloomberg des cartes Pokémon',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${display.variable} ${body.variable}`} style={{ margin:0, background:'#FAFAFA' }}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
