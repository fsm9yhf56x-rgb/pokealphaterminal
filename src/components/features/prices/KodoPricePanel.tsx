'use client'
import { useEffect, useState } from 'react'

interface Props { cardId: string; locked?: boolean; onUpgrade?: () => void }

const INK = '#1D1D1F', MUTED = '#6E6E73', BORDER = '#E5E5EA', SURF = '#F5F5F7', UP = '#1D9E75', ACCENT = '#E03020'
const MONO = 'var(--font-data)', DISP = 'var(--font-display)'

const RAW_ORDER = ['NEAR_MINT','LIGHTLY_PLAYED','MODERATELY_PLAYED','HEAVILY_PLAYED','DAMAGED']
const RAW_LABEL: Record<string,string> = {
  NEAR_MINT:'Near Mint', LIGHTLY_PLAYED:'Lightly Played', MODERATELY_PLAYED:'Moderately Played',
  HEAVILY_PLAYED:'Heavily Played', DAMAGED:'Damaged',
}
const SRC_PRIORITY: Record<string,number> = { tcgplayer:0, ebay:1, ppt_tcgplayer:2, ppt_ebay:3, cardmarket:4, cardmarket_unsold:9 }
const METHOD_LABEL: Record<string,string> = {
  cardmarket_trend:'Ventes Cardmarket', us_nm_fx:'Marché US · NM', eu_asking_decote:'Annonces EU',
}


// Transparence vente/annonce : un ask ne doit JAMAIS s'afficher comme un vendu.
function basisSub(g: any): string | null {
  const isAsk = g?.basis === 'ask' || g?.is_asking === true
  const noun = isAsk ? 'annonce' : 'vente'
  if (g?.sale_count) return g.sale_count + ' ' + noun + (g.sale_count > 1 ? 's' : '')
  return isAsk ? 'annonce' : null
}

export default function KodoPricePanel({ cardId, locked = false, onUpgrade }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let on = true
    setLoading(true); setData(null)
    fetch('/api/kodo/prices/' + encodeURIComponent(cardId))
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (on) { setData(j); setLoading(false) } })
      .catch(() => { if (on) setLoading(false) })
    return () => { on = false }
  }, [cardId])

  if (loading) return <div style={{ color: MUTED, fontFamily: MONO, fontSize: 12, padding: '14px 2px' }}>Chargement des prix…</div>
  const matrix: any[] = data?.matrix || []
  if (!matrix.length) return <div style={{ color: MUTED, fontFamily: MONO, fontSize: 12, padding: '14px 2px' }}>Pas encore de données marché pour cette carte.</div>

  // Meilleure ligne par tier : ventes réelles > annonces, puis priorité de source
  const best: Record<string, any> = {}
  for (const r of matrix) {
    if (r.spot == null) continue
    const c = best[r.tier]
    const better = !c
      || (c.is_asking && !r.is_asking)
      || (c.is_asking === r.is_asking && (SRC_PRIORITY[r.source] ?? 8) < (SRC_PRIORITY[c.source] ?? 8))
    if (better) best[r.tier] = r
  }

  const fmt = (v: number, cur: string) => cur === 'EUR' ? v.toFixed(2).replace('.', ',') + ' €' : '$' + v.toFixed(2)
  const rawRows = RAW_ORDER.filter(t => best[t]).map(t => best[t])
  const gradeRows = Object.keys(best)
    .filter(t => /^(PSA|BGS|CGC|SGC|ACE|TAG)_/.test(t))
    .map(t => { const parts = t.split('_'); return { ...best[t], company: parts[0], grade: parts.slice(1).join('.') } })
  const companies = ['PSA','BGS','CGC','SGC','ACE','TAG'].filter(co => gradeRows.some(g => g.company === co))
  const byGradeDesc = (a: any, b: any) => parseFloat(b.grade) - parseFloat(a.grade)
  const teaser = gradeRows.filter(g => g.company === 'PSA').sort(byGradeDesc)[0] || gradeRows.sort(byGradeDesc)[0]

  const Section = ({ title, children }: any) => (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: MUTED, fontFamily: DISP, fontWeight: 600, marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  )
  const Row = ({ left, right, sub }: any) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '7px 10px', borderBottom: '0.5px solid ' + BORDER }}>
      <span style={{ fontSize: 12, color: INK, fontFamily: DISP }}>{left}{sub ? <span style={{ color: MUTED, fontSize: 10, marginLeft: 6 }}>{sub}</span> : null}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: INK, fontFamily: MONO }}>{right}</span>
    </div>
  )

  return (
    <div>
      {/* Bloc 1 — Prix marché */}
      <div style={{ background: SURF, borderRadius: 12, padding: '12px 14px', border: '0.5px solid ' + BORDER }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: MUTED, fontFamily: DISP, fontWeight: 600 }}>Prix marché</span>
          {data.fairValueMethod ? <span style={{ fontSize: 9, color: UP, border: '0.5px solid ' + UP, borderRadius: 99, padding: '2px 8px', fontFamily: MONO }}>{METHOD_LABEL[data.fairValueMethod] || data.fairValueMethod}</span> : null}
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: INK, fontFamily: MONO, marginTop: 4 }}>
          {data.fairValueEur != null ? data.fairValueEur.toFixed(2).replace('.', ',') + ' €' : '—'}
        </div>
        {data.coteLang?.avg != null && data.card?.lang === 'fr' ? (
          <div style={{ fontSize: 11, color: MUTED, fontFamily: MONO, marginTop: 2 }}>
            Cote France : <b style={{ color: INK }}>{Number(data.coteLang.avg).toFixed(2).replace('.', ',')} €</b>
            {data.coteLang.saleCount ? ' · ' + data.coteLang.saleCount + ' annonces' : ''}
          </div>
        ) : null}
      </div>

      {/* Bloc 2 — Par état */}
      {rawRows.length ? (
        <Section title="Prix par état">
          <div style={{ border: '0.5px solid ' + BORDER, borderRadius: 12, overflow: 'hidden', background: '#FFF' }}>
            {rawRows.map((r: any) => (
              <Row key={r.tier} left={RAW_LABEL[r.tier]} sub={r.sale_count ? r.sale_count + ' ventes' : (r.is_asking ? 'annonces' : null)} right={fmt(r.spot, r.currency)} />
            ))}
          </div>
        </Section>
      ) : null}

      {/* Bloc 3 — Gradés */}
      {gradeRows.length ? (
        <Section title="Prix gradés">
          {locked ? (
            <div style={{ border: '0.5px solid ' + BORDER, borderRadius: 12, overflow: 'hidden', background: '#FFF' }}>
              {teaser ? <Row left={teaser.company + ' ' + teaser.grade} sub={basisSub(teaser)} right={fmt(teaser.spot, teaser.currency)} /> : null}
              <button onClick={onUpgrade} style={{ width: '100%', padding: '10px', background: INK, color: '#FFF', border: 'none', fontSize: 12, fontFamily: DISP, fontWeight: 600, cursor: 'pointer' }}>
                Débloquer toutes les notes ({gradeRows.length} cotations) · Premium
              </button>
            </div>
          ) : (
            companies.map(co => (
              <div key={co} style={{ border: '0.5px solid ' + BORDER, borderRadius: 12, overflow: 'hidden', background: '#FFF', marginBottom: 8 }}>
                <div style={{ padding: '6px 10px', background: SURF, fontSize: 10, fontWeight: 700, color: INK, fontFamily: DISP, letterSpacing: '0.06em' }}>{co}</div>
                {gradeRows.filter(g => g.company === co).sort(byGradeDesc).map(g => (
                  <Row key={g.company + g.grade} left={'Note ' + g.grade} sub={basisSub(g)} right={fmt(g.spot, g.currency)} />
                ))}
              </div>
            ))
          )}
        </Section>
      ) : null}

      <div style={{ marginTop: 10, fontSize: 9, color: MUTED, fontFamily: MONO, display: 'flex', justifyContent: 'space-between' }}>
        <span>Kodo Engine</span>
        {data.asOf ? <span>màj {new Date(data.asOf).toLocaleDateString('fr-FR')}</span> : null}
      </div>
    </div>
  )
}
