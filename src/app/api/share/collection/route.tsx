import { ImageResponse } from 'next/og'
import sharp from 'sharp'
import QRCode from 'qrcode'

export const runtime = 'nodejs'

async function fetchBuf(url: string, ms = 5000): Promise<Buffer | null> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), ms)
    const res = await fetch(url, { cache: 'force-cache', signal: ctrl.signal })
    clearTimeout(t)
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch { return null }
}
async function cardPng(url: string, w: number, h: number): Promise<string | null> {
  const raw = await fetchBuf(url)
  if (!raw) return null
  try { const png = await sharp(raw).resize(w, h, { fit: 'cover' }).png().toBuffer(); return `data:image/png;base64,${png.toString('base64')}` } catch { return null }
}
async function qrDataUrl(text: string): Promise<string | null> {
  try { return await QRCode.toDataURL(text, { margin: 1, width: 220, errorCorrectionLevel: 'M', color: { dark: '#FFFFFF', light: '#00000000' } }) } catch { return null }
}
async function fetchFont(url: string): Promise<ArrayBuffer | null> {
  try { const r = await fetch(url, { cache: 'force-cache' }); return r.ok ? await r.arrayBuffer() : null } catch { return null }
}
const S = (v: string | null, max: number, def = '') => (v || def).slice(0, max)
const CACHE = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const total = S(searchParams.get('total'), 20)
  const cardsN = S(searchParams.get('cards'), 8)
  const setsN = S(searchParams.get('sets'), 8)
  const roi = S(searchParams.get('roi'), 8)
  const ref = S(searchParams.get('ref'), 32)
  const fmt = searchParams.get('format')
  const format = fmt === 'wide' ? 'wide' : 'story'
  const imgs = (searchParams.get('imgs') || '').split('|').map(s => s.trim()).filter(Boolean).slice(0, 30)

  const isWide = format === 'wide'
  const W = isWide ? 1200 : 1080
  const H = isWide ? 675 : 1920
  const shareLink = `https://kodocards.com${ref ? `?ref=${ref}` : ''}`
  const hasRoi = /^\+?\d/.test(roi) && roi !== '0%' && roi !== '+0%'
  const hookLabel = `${cardsN} CARTES · ${setsN} SÉRIES`

  const cols = isWide ? 8 : 6
  const tileW = Math.ceil(W / cols)
  const tileH = Math.round(tileW / 0.716)
  const rows = Math.ceil(H / tileH) + 1
  const need = cols * rows

  try {
    const pool = imgs
    const filled: string[] = []
    for (let i = 0; i < need && pool.length; i++) filled.push(pool[i % pool.length])

    const [tiles, qr, dmMed, dmBold] = await Promise.all([
      Promise.all(filled.map(u => cardPng(u, Math.min(tileW, 200), Math.round(Math.min(tileW, 200) / 0.716)))),
      qrDataUrl(shareLink),
      fetchFont('https://cdn.jsdelivr.net/npm/@fontsource/dm-sans@5.0.8/files/dm-sans-latin-500-normal.woff'),
      fetchFont('https://cdn.jsdelivr.net/npm/@fontsource/dm-sans@5.0.8/files/dm-sans-latin-700-normal.woff'),
    ])
    const ok = tiles.filter(Boolean) as string[]
    const fonts: { name: string; data: ArrayBuffer; weight: 500 | 700; style: 'normal' }[] = []
    if (dmMed) fonts.push({ name: 'DM Sans', data: dmMed, weight: 500, style: 'normal' })
    if (dmBold) fonts.push({ name: 'DM Sans', data: dmBold, weight: 700, style: 'normal' })
    const FF = fonts.length ? 'DM Sans' : 'sans-serif'

    const Wall = () => (
      <div style={{ display: 'flex', flexWrap: 'wrap', width: `${cols * tileW}px`, alignContent: 'flex-start' }}>
        {ok.map((src, i) => (<img key={i} src={src} width={tileW} height={tileH} style={{ objectFit: 'cover', display: 'flex' }} />))}
      </div>
    )

    // ══ STORY ══
    if (!isWide) {
      return new ImageResponse(
        (
          <div style={{ width: `${W}px`, height: `${H}px`, display: 'flex', background: '#0A0A14', fontFamily: FF, position: 'relative', overflow: 'hidden' }}>
            {/* Mur (top-aligne sous le header) */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: `${cols * tileW}px`, height: `${H}px`, display: 'flex', paddingTop: '150px', boxSizing: 'border-box' }}>
              {ok.length ? <Wall /> : null}
            </div>
            {/* Voile LEGER : cartes vibrantes */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: `${W}px`, height: `${H}px`, display: 'flex', background: 'rgba(10,10,20,0.20)' }} />
            {/* Halo violet haut (DA cohérente carte) */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: `${W}px`, height: '620px', display: 'flex', background: 'radial-gradient(ellipse at 50% 0%, rgba(90,55,140,0.5) 0%, rgba(90,55,140,0) 66%)' }} />
            {/* Bandeau header */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: `${W}px`, height: '250px', display: 'flex', background: 'linear-gradient(180deg, #0A0A14 30%, rgba(10,10,20,0))' }} />
            {/* SOCLE bas NET pour les stats */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: `${W}px`, height: '1050px', display: 'flex', background: 'linear-gradient(0deg, #0A0A14 0%, #0A0A14 50%, rgba(10,10,20,0) 100%)' }} />
            {/* lueur rouge bas (DA carte) */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: `${W}px`, height: '460px', display: 'flex', background: 'radial-gradient(ellipse at 50% 100%, rgba(224,48,32,0.14) 0%, rgba(224,48,32,0) 72%)' }} />

            {/* Header */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: `${W}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '64px 72px 0', zIndex: 3 }}>
              <div style={{ display: 'flex', fontSize: '46px', fontWeight: 700, color: '#E03020', letterSpacing: '-1px' }}>Kodo Cards</div>
              <div style={{ display: 'flex', fontSize: '22px', fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '5px' }}>MA COLLECTION</div>
            </div>

            {/* Stats (socle) */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: `${W}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 72px', zIndex: 3 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', width: '11px', height: '11px', borderRadius: '50%', background: '#E03020', marginRight: '11px', boxShadow: '0 0 12px rgba(224,48,32,0.85)' }} />
                  <div style={{ display: 'flex', fontSize: '24px', fontWeight: 700, color: '#E03020', letterSpacing: '3px' }}>{hookLabel}</div>
                </div>
                <div style={{ display: 'flex', fontSize: '24px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '4px', textTransform: 'uppercase' }}>Valeur estimée</div>
                <div style={{ display: 'flex', fontSize: '132px', fontWeight: 700, color: '#fff', letterSpacing: '-4px', marginTop: '2px', textShadow: '0 0 50px rgba(255,255,255,0.32)' }}>{total}</div>
                {hasRoi ? (<div style={{ display: 'flex', marginTop: '12px', fontSize: '30px', fontWeight: 700, color: '#3ddc6d', background: 'rgba(61,220,109,0.16)', borderRadius: '999px', padding: '8px 22px' }}>{roi} depuis l'achat</div>) : null}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '28px 0 54px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', fontSize: '30px', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>kodocards.com</div>
                  <div style={{ display: 'flex', fontSize: '22px', fontWeight: 700, color: '#E03020', marginTop: '6px' }}>Estime ta collection →</div>
                </div>
                {qr ? (<div style={{ display: 'flex', padding: '12px', background: 'rgba(255,255,255,0.08)', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.12)' }}><img src={qr} width={110} height={110} /></div>) : null}
              </div>
            </div>
          </div>
        ),
        { width: W, height: H, fonts: fonts.length ? fonts : undefined, headers: { 'Cache-Control': CACHE } },
      )
    }

    // ══ WIDE (X) — mur en fond, socle a droite pour stats ══
    return new ImageResponse(
      (
        <div style={{ width: `${W}px`, height: `${H}px`, display: 'flex', background: '#0A0A14', fontFamily: FF, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: `${cols * tileW}px`, height: `${H}px`, display: 'flex' }}>
            {ok.length ? <Wall /> : null}
          </div>
          <div style={{ position: 'absolute', top: 0, left: 0, width: `${W}px`, height: `${H}px`, display: 'flex', background: 'rgba(10,10,20,0.20)' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, width: `${W}px`, height: `${H}px`, display: 'flex', background: 'radial-gradient(ellipse at 18% 0%, rgba(90,55,140,0.42) 0%, rgba(90,55,140,0) 52%)' }} />
          {/* socle droit */}
          <div style={{ position: 'absolute', top: 0, right: 0, width: `${W}px`, height: `${H}px`, display: 'flex', background: 'linear-gradient(90deg, rgba(10,10,20,0) 30%, #0A0A14 66%)' }} />
          {/* bandeau bas pleine largeur : rend le footer gauche lisible sur les cartes */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: `${W}px`, height: '170px', display: 'flex', background: 'linear-gradient(0deg, #0A0A14 22%, rgba(10,10,20,0))' }} />
          <div style={{ display: 'flex', flex: 1 }} />
          <div style={{ display: 'flex', width: '620px', flexDirection: 'column', justifyContent: 'space-between', padding: '48px 52px 44px 0', position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', fontSize: '16px', fontWeight: 700, color: 'rgba(255,255,255,0.42)', letterSpacing: '4px', marginRight: '14px' }}>MA COLLECTION</div>
              <div style={{ display: 'flex', fontSize: '32px', fontWeight: 700, color: '#E03020', letterSpacing: '-1px' }}>Kodo Cards</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', width: '9px', height: '9px', borderRadius: '50%', background: '#E03020', marginRight: '9px', boxShadow: '0 0 10px rgba(224,48,32,0.85)' }} />
                <div style={{ display: 'flex', fontSize: '17px', fontWeight: 700, color: '#E03020', letterSpacing: '2px' }}>{hookLabel}</div>
              </div>
              <div style={{ display: 'flex', fontSize: '17px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '3px', textTransform: 'uppercase' }}>Valeur estimée</div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {hasRoi ? (<div style={{ display: 'flex', marginRight: '14px', marginBottom: '18px', fontSize: '24px', fontWeight: 700, color: '#3ddc6d', background: 'rgba(61,220,109,0.16)', borderRadius: '999px', padding: '6px 15px' }}>{roi}</div>) : null}
                <div style={{ display: 'flex', fontSize: '92px', fontWeight: 700, color: '#fff', letterSpacing: '-3px', textShadow: '0 0 44px rgba(255,255,255,0.25)' }}>{total}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', fontSize: '22px', fontWeight: 700, color: '#fff' }}>kodocards.com</div>
                <div style={{ display: 'flex', fontSize: '17px', fontWeight: 700, color: '#E03020', marginTop: '4px' }}>Estime ta collection →</div>
              </div>
              {qr ? (<div style={{ display: 'flex', padding: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)' }}><img src={qr} width={84} height={84} /></div>) : null}
            </div>
          </div>
        </div>
      ),
      { width: W, height: H, fonts: fonts.length ? fonts : undefined, headers: { 'Cache-Control': CACHE } },
    )
  } catch {
    return new ImageResponse(
      (<div style={{ width: `${W}px`, height: `${H}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0A0A14', textAlign: 'center', padding: '0 90px' }}>
        <div style={{ display: 'flex', fontSize: '42px', fontWeight: 700, color: '#E03020', marginBottom: '24px' }}>Kodo Cards</div>
        <div style={{ display: 'flex', fontSize: '64px', fontWeight: 700, color: '#fff' }}>{total || 'Ma collection'}</div>
        <div style={{ display: 'flex', fontSize: '24px', color: 'rgba(255,255,255,0.6)', marginTop: '30px' }}>kodocards.com</div>
      </div>),
      { width: W, height: H, headers: { 'Cache-Control': 'public, max-age=60' } },
    )
  }
}
