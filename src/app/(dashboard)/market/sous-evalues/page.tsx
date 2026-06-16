'use client'
// Alias historique de /market/spreads — desormais feature v2.0.
import { useState } from 'react'
import { SoonModal } from '@/components/ui/snow'

export default function SousEvaluesPage() {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <SoonModal
        open={open}
        onClose={() => setOpen(false)}
        feature="Spreads Cross-Marketplace"
        version="v2.0"
        description="Detection automatique des ecarts de prix entre marches pour l'arbitrage, classees par niveau de confiance."
        bullets={[
          'Gaps captures automatiquement',
          'Score de confiance S / A / B',
          'Calcul ROI net apres frais',
          'Alertes sur opportunites premium',
        ]}
        brevoListId={null}
      />
    </div>
  )
}
