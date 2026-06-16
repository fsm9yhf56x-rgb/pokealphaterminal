'use client'
import { useState } from 'react'
import { SoonModal } from '@/components/ui/snow'

// Spreads cross-marketplace = feature v2.0 (cf navigation.ts).
// La page n'affiche plus le mock: elle ouvre le SoonModal v2.0.
export default function SpreadsPage() {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <SoonModal
        open={open}
        onClose={() => setOpen(false)}
        feature="Spreads Cross-Marketplace"
        version="v2.0"
        description="Detection automatique des ecarts de prix entre marches (Cardmarket EU, eBay US, JP) pour identifier les opportunites d'arbitrage, classees par confiance."
        bullets={[
          'Gaps captures automatiquement entre marches',
          'Score de confiance S / A / B',
          'Calcul ROI net apres frais',
          'Alertes sur opportunites premium',
        ]}
        brevoListId={null}
      />
    </div>
  )
}
