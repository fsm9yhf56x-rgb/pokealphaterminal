'use client'

import { useState, useRef } from 'react'
import { readCardNumber, readCardName, type OcrNumberResult, type OcrNameResult } from '@/lib/scan/ocr'

type Lang = 'fr' | 'en' | 'jp'

// Zones NUMERO (chiffres, sans langue).
const NUM_ZONES: { name: string; x: number; y: number; w: number; h: number; psm: '7' | '11' }[] = [
  { name: 'num bas-droite', x: 0.42, y: 0.85, w: 0.58, h: 0.15, psm: '7' },
  { name: 'num bas-gauche', x: 0.0, y: 0.85, w: 0.58, h: 0.15, psm: '7' },
  { name: 'num bande-basse', x: 0.0, y: 0.82, w: 1.0, h: 0.18, psm: '11' },
  { name: 'num label haut-gauche', x: 0.0, y: 0.0, w: 0.6, h: 0.16, psm: '11' },
  { name: 'num label bande-haute', x: 0.0, y: 0.0, w: 1.0, h: 0.18, psm: '11' },
]

// Zones NOM (langue). Raw : nom en haut de carte. Gradee : nom sous le label.
const NAME_ZONES: { name: string; x: number; y: number; w: number; h: number }[] = [
  { name: 'nom haut (raw)', x: 0.05, y: 0.04, w: 0.75, h: 0.10 },
  { name: 'nom sous-label (gradee)', x: 0.05, y: 0.20, w: 0.75, h: 0.10 },
  { name: 'nom haut large', x: 0.0, y: 0.02, w: 1.0, h: 0.16 },
]

export default function ScanTestPage() {
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [lang, setLang] = useState<Lang>('fr')
  const [num, setNum] = useState<OcrNumberResult | null>(null)
  const [nameRes, setNameRes] = useState<OcrNameResult | null>(null)
  const [numZone, setNumZone] = useState<string | null>(null)
  const [nameZone, setNameZone] = useState<string | null>(null)
  const [attempts, setAttempts] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [resolveResult, setResolveResult] = useState<any>(null)
  const [err, setErr] = useState<string | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setErr(null); setNum(null); setNameRes(null); setResolveResult(null); setAttempts([]); setNumZone(null); setNameZone(null)
    setImgUrl(URL.createObjectURL(file))
  }

  function crop(img: HTMLImageElement, z: { x: number; y: number; w: number; h: number }): HTMLCanvasElement {
    const W = img.naturalWidth, H = img.naturalHeight
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(W * z.w)); c.height = Math.max(1, Math.round(H * z.h))
    c.getContext('2d')!.drawImage(img, W * z.x, H * z.y, W * z.w, H * z.h, 0, 0, c.width, c.height)
    return c
  }

  async function runOcr() {
    if (!imgRef.current) return
    setErr(null); setNum(null); setNameRes(null); setResolveResult(null); setLoading(true)
    const log: string[] = []
    try {
      const img = imgRef.current

      // 1) NUMERO : priorite au vrai N/T
      let numWithTotal: { res: OcrNumberResult; zone: string } | null = null
      let numOnly: { res: OcrNumberResult; zone: string } | null = null
      for (const z of NUM_ZONES) {
        const res = await readCardNumber(crop(img, z), z.psm)
        log.push(`${z.name}: raw=${JSON.stringify(res.raw)} num=${res.number ?? '—'} tot=${res.total ?? '—'}`)
        if (res.number && res.total && !numWithTotal) numWithTotal = { res, zone: z.name }
        if (res.number && !numOnly) numOnly = { res, zone: z.name }
      }
      const numChosen = numWithTotal || numOnly
      if (numChosen) { setNum(numChosen.res); setNumZone(numChosen.zone) }

      // 2) NOM : dans la langue choisie, on garde le plus long candidat
      let bestName: { res: OcrNameResult; zone: string } | null = null
      for (const z of NAME_ZONES) {
        const res = await readCardName(crop(img, z), lang)
        log.push(`${z.name}: raw=${JSON.stringify(res.raw)} name=${res.name ?? '—'}`)
        if (res.name && (!bestName || res.name.length > (bestName.res.name?.length || 0))) bestName = { res, zone: z.name }
      }
      if (bestName) { setNameRes(bestName.res); setNameZone(bestName.zone) }

      setAttempts(log)
    } catch (e: any) {
      setErr('OCR: ' + (e?.message || 'echec'))
    } finally {
      setLoading(false)
    }
  }

  async function resolve() {
    const n = nameRes?.name
    const number = num?.number
    if (!number) { setErr('pas de numéro lu'); return }
    setErr(null); setResolveResult(null)
    const params = new URLSearchParams({ number, lang })
    if (n) params.set('name', n)        // pivot principal si dispo
    if (num?.total) params.set('total', String(num.total)) // bonus
    try {
      const r = await fetch('/api/v1/scan/resolve?' + params.toString())
      setResolveResult(await r.json())
    } catch (e: any) {
      setErr('resolve: ' + (e?.message || 'echec'))
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 24, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Scan test — nom + numero</h1>
      <p style={{ color: '#6E6E73', marginBottom: 16, fontSize: 14 }}>
        Choisis la langue (charge le bon moteur), upload, Lire. L OCR lit le numero
        ET le nom, puis interroge le resolveur en mode nom (pivot 92%).
      </p>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 14 }}>Langue :</span>
        {(['fr', 'en', 'jp'] as Lang[]).map((l) => (
          <button key={l} onClick={() => setLang(l)}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #C7C7CC', cursor: 'pointer',
              background: lang === l ? '#1D1D1F' : '#FFF', color: lang === l ? '#FFF' : '#1D1D1F', fontWeight: 600, fontSize: 13 }}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <input type="file" accept="image/*" onChange={onFile} style={{ marginBottom: 16 }} />

      {imgUrl && (
        <div style={{ marginBottom: 16 }}>
          <img ref={imgRef} src={imgUrl} alt="" style={{ maxWidth: 320, display: 'block', borderRadius: 8, border: '1px solid #E5E5EA', marginBottom: 12 }} />
          <button onClick={runOcr}
            style={{ padding: '10px 22px', borderRadius: 8, border: 'none', background: '#1D1D1F', color: '#FFF', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
            Lire (nom + numero)
          </button>
        </div>
      )}

      {loading && <p style={{ color: '#185FA5' }}>Lecture OCR… (1er scan d une langue = chargement, ~5-10s)</p>}

      {(num || nameRes) && (
        <div style={{ background: '#F5F5F7', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 14, lineHeight: 1.9 }}>
            <div>nom : <b style={{ color: '#E03020' }}>{nameRes?.name ?? '—'}</b> {nameZone && <span style={{ fontSize: 11, color: '#86868B' }}>({nameZone})</span>}</div>
            <div>number : <b style={{ color: '#E03020' }}>{num?.number ?? '—'}</b> {numZone && <span style={{ fontSize: 11, color: '#86868B' }}>({numZone})</span>}</div>
            <div>total : <b style={{ color: '#E03020' }}>{num?.total ?? '—'}</b></div>
          </div>
          <details style={{ marginTop: 12, fontSize: 11 }}>
            <summary style={{ cursor: 'pointer', color: '#6E6E73' }}>detail OCR ({attempts.length} zones)</summary>
            <div style={{ fontFamily: 'monospace', marginTop: 8 }}>
              {attempts.map((a, i) => <div key={i} style={{ padding: '1px 0' }}>{a}</div>)}
            </div>
          </details>
          <button onClick={resolve} disabled={!num?.number}
            style={{ marginTop: 14, padding: '8px 18px', borderRadius: 8, border: 'none', background: '#E03020', color: '#FFF',
              fontWeight: 700, fontSize: 14, cursor: num?.number ? 'pointer' : 'not-allowed', opacity: num?.number ? 1 : 0.5 }}>
            Resoudre →
          </button>
        </div>
      )}

      {err && <p style={{ color: '#E03020' }}>{err}</p>}

      {resolveResult && (
        <div style={{ background: '#F5F5F7', borderRadius: 12, padding: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>
            Resolveur : <span style={{ color: '#185FA5' }}>{resolveResult.status}</span>
            {resolveResult.candidateCount != null && ` (${resolveResult.candidateCount})`}
            {Array.isArray(resolveResult.candidates) && ` — ${resolveResult.candidates.length} affiches`}
          </div>
          {resolveResult.message && <p style={{ fontSize: 13, color: '#6E6E73' }}>{resolveResult.message}</p>}
          {Array.isArray(resolveResult.candidates) && resolveResult.candidates.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12, marginTop: 12 }}>
              {resolveResult.candidates.slice(0, 12).map((c: any) => (
                <div key={c.kCardId} style={{ textAlign: 'center', fontSize: 12 }}>
                  {c.image && <img src={c.image} alt="" style={{ width: '100%', borderRadius: 6, border: '1px solid #E5E5EA' }} />}
                  <div style={{ fontWeight: 600, marginTop: 4 }}>{c.name}</div>
                  <div style={{ color: '#6E6E73' }}>{c.setName} · {c.lang}</div>
                  <div style={{ color: '#86868B' }}>#{c.number}{c.matchKind === 'fuzzy' && c.similarity ? ` · sim ${c.similarity.toFixed(2)}` : ''}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
