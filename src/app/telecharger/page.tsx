import type { Metadata } from 'next'
import DownloadPage from '@/components/landing/DownloadPage'

export const metadata: Metadata = {
  title: 'Télécharger l’app — Kodo Cards',
  description: "L'application mobile Kodo Cards arrive bientôt sur iOS et Android.",
}

export default function Page() {
  return <DownloadPage />
}
