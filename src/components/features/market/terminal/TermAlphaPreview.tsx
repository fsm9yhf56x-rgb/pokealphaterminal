'use client'

import { useRouter } from 'next/navigation'
import type { AlphaSignalPreview } from '@/lib/useMarketData'
import { SNOW, FONT, GLASS } from '@/lib/design/snow'

const POS = SNOW.greenAccent
const EDGE = '0 0 0 0.5px rgba(255,255,255,0.7)'

export function TermAlphaPreview({
  signals, isPro,
}: {
  signals: AlphaSignalPreview[]
  isPro: boolean
}) {
  const router = useRouter()
  const hasData = signals.length > 0

  return (
    <div style={{ ...GLASS.card, overflow:'hidden', boxShadow:`${GLASS.card.boxShadow as string}, ${EDGE}` }}>
      <style>{`
        .ap-row{transition:background .12s}
        .ap-row:hover{background:rgba(0,0,0,0.022)}
        .ap-foot{transition:background .12s, color .12s}
        .ap-foot:hover{background:rgba(0,0,0,0.03);color:${SNOW.ink}!important}
        .ap-cta{transition:transform .15s cubic-bezier(.16,1,.3,1), background .15s}
        .ap-cta:hover{transform:translateY(-1px);background:${SNOW.red}!important}
      `}</style>
      <Header isPro={isPro} />

      {!hasData ? (
        <EmptyState />
      ) : (
        <div style={{ position:'relative' }}>
          {signals.slice(0, 3).map((sig, i) => (
            <SignalRow key={sig.id} signal={sig} gated={!isPro && i > 0} />
          ))}
          {!isPro && signals.length > 1 && (
            <ProUpgradeOverlay onClick={() => router.push('/pricing')} />
          )}
        </div>
      )}

      <button className="ap-foot" onClick={() => router.push('/market/signals')} style={{
        width:'100%', padding:'10px', background:'transparent', border:'none',
        borderTop:`1px solid ${SNOW.borderSoft}`, color:SNOW.muted, fontSize:'11px', fontWeight:600,
        cursor:'pointer', fontFamily:FONT.display,
      }}>
        Voir tous les signaux →
      </button>
    </div>
  )
}

function Header({ isPro }: { isPro: boolean }) {
  return (
    <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'10px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
        <span style={{ fontSize:'11px', color:'#C9A84C', fontWeight:700 }}>◆</span>
        <span style={{ fontSize:'10px', fontWeight:600, color:SNOW.muted, textTransform:'uppercase', letterSpacing:'0.1em', fontFamily:FONT.display }}>Alpha Signals</span>
      </div>
      {isPro ? (
        <span style={{ padding:'2px 7px', background:'#FFF8E0', color:'#8B6E00', fontSize:'9px', fontWeight:700, fontFamily:FONT.display, textTransform:'uppercase', letterSpacing:'0.08em', borderRadius:'5px' }}>PRO</span>
      ) : (
        <span style={{ fontSize:'9px', color:SNOW.mutedExtraLight, fontFamily:FONT.display, textTransform:'uppercase', letterSpacing:'0.05em' }}>3 signaux disponibles</span>
      )}
    </div>
  )
}

function SignalRow({ signal, gated }: { signal: AlphaSignalPreview; gated: boolean }) {
  const upside = signal.target_price > signal.current_price
    ? ((signal.target_price - signal.current_price) / signal.current_price) * 100
    : 0
  const tierStyle = TIER_STYLES[signal.tier]

  return (
    <div className={gated ? '' : 'ap-row'} style={{
      padding:'12px 16px', borderTop:`1px solid ${SNOW.borderSoft}`,
      filter:gated?'blur(4px)':'none', pointerEvents:gated?'none':'auto', userSelect:gated?'none':'auto',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'6px' }}>
        <div style={{ padding:'2px 6px', background:tierStyle.bg, color:tierStyle.color, fontSize:'10px', fontWeight:700, borderRadius:'5px', fontFamily:FONT.data, flexShrink:0 }}>{signal.tier}</div>
        <div style={{ fontSize:'12px', fontWeight:600, color:SNOW.ink, fontFamily:FONT.display, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', flex:1, minWidth:0 }}>{signal.card_name}</div>
        <div style={{ fontSize:'10px', color:SNOW.muted, fontFamily:FONT.data, flexShrink:0 }}>
          <span style={{ fontWeight:600 }}>{signal.confidence}%</span>
          <span style={{ marginLeft:'3px', opacity:0.7 }}>conf.</span>
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'baseline', gap:'14px', fontSize:'11px', fontFamily:FONT.data, fontVariantNumeric:'tabular-nums' }}>
        <span style={{ color:SNOW.muted }}>Actuel: <span style={{ color:SNOW.ink, fontWeight:600 }}>{formatEUR(signal.current_price)}</span></span>
        <span style={{ color:SNOW.mutedExtraLight }}>→</span>
        <span style={{ color:SNOW.muted }}>Cible: <span style={{ color:SNOW.ink, fontWeight:600 }}>{formatEUR(signal.target_price)}</span></span>
        {upside > 0 && (
          <span style={{ marginLeft:'auto', padding:'2px 6px', background:'rgba(38,166,91,.10)', color:POS, borderRadius:'5px', fontSize:'11px', fontWeight:700 }}>
            +{Number(upside ?? 0).toFixed(0)}% upside
          </span>
        )}
      </div>

      {signal.reason && (
        <div style={{ fontSize:'10px', color:SNOW.mutedLight, marginTop:'6px', fontStyle:'italic', fontFamily:FONT.display, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{signal.reason}</div>
      )}
    </div>
  )
}

function ProUpgradeOverlay({ onClick }: { onClick: () => void }) {
  return (
    <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'60%', background:'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.92) 60%, rgba(255,255,255,1) 100%)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end', paddingBottom:'14px', pointerEvents:'none' }}>
      <button className="ap-cta" onClick={onClick} style={{ padding:'8px 18px', background:'linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.7) 100%)', backdropFilter:'blur(20px) saturate(190%)', WebkitBackdropFilter:'blur(20px) saturate(190%)', color:SNOW.ink, border:'0.5px solid rgba(255,255,255,0.6)', borderRadius:'999px', fontSize:'11px', fontWeight:700, cursor:'pointer', fontFamily:FONT.display, letterSpacing:'0.02em', pointerEvents:'auto', boxShadow:'0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.95)' }}>
        🔒 Débloquer avec Pro
      </button>
      <div style={{ marginTop:'6px', fontSize:'10px', color:SNOW.muted, fontFamily:FONT.display, textAlign:'center' }}>Accès illimité aux signaux Alpha</div>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ padding:'32px 20px', textAlign:'center' }}>
      <div style={{ fontSize:'11px', color:SNOW.mutedExtraLight, fontFamily:FONT.display, marginBottom:'4px' }}>Pas de signaux actifs pour le moment</div>
      <div style={{ fontSize:'10px', color:SNOW.mutedExtraLight, fontFamily:FONT.display }}>Les signaux Alpha apparaîtront dès détection.</div>
    </div>
  )
}

const TIER_STYLES: Record<'S'|'A'|'B', { bg: string; color: string }> = {
  S: { bg:'#FFF8E0', color:'#8B6E00' },
  A: { bg:'rgba(38,166,91,.10)', color:SNOW.greenAccent },
  B: { bg:SNOW.surface, color:SNOW.muted },
}

function formatEUR(v: number): string {
  if (v >= 1000) return `€${Number(v / 1000).toFixed(1)}K`
  return `€${Number(v ?? 0).toFixed(0)}`
}
