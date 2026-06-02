import type { Metadata } from 'next'
import LandingPage from '@/components/landing/LandingPage'

export const metadata: Metadata = {
  metadataBase: new URL('https://kodocards.com'),
  title: 'Kodo Cards — Intelligence de marché Pokémon TCG',
  description:
    "Cote FR native, prix consolidés eBay · Cardmarket · PSA et suivi de portefeuille en temps réel. L'intelligence du marché Pokémon TCG.",
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: 'https://kodocards.com',
    siteName: 'Kodo Cards',
    locale: 'fr_FR',
    title: 'Kodo Cards — Intelligence de marché Pokémon TCG',
    description:
      'Cote FR native, prix consolidés eBay · Cardmarket · PSA et suivi de portefeuille en temps réel.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kodo Cards — Intelligence de marché Pokémon TCG',
    description: 'Cote FR native, prix temps réel, suivi de portefeuille.',
  },
}

export default function RootPage() {
  return <LandingPage />
}
