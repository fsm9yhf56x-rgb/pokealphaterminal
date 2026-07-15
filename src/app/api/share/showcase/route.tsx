import { ImageResponse } from 'next/og'
import sharp from 'sharp'
import QRCode from 'qrcode'
import { checkPublicRateLimit } from '@/lib/rate-limit'

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
  // Route publique : protection cout / abus (fail-open si Upstash down).
  const _rl = await checkPublicRateLimit(req, 'costly')
  if (_rl) return _rl

  const { searchParams } = new URL(req.url)
  const count = S(searchParams.get('count'), 6)
  const ref = S(searchParams.get('ref'), 32)
  const fmt = searchParams.get('format')
  const format = fmt === 'wide' ? 'wide' : fmt === 'post' ? 'post' : 'story'
  const imgs = (searchParams.get('imgs') || '').split('|').map(s => s.trim()).filter(Boolean).slice(0, 9)

  const isWide = format === 'wide'
  const isPost = format === 'post'
  const W = isWide ? 1200 : 1080
  const H = isWide ? 675 : isPost ? 1350 : 1920
  const shareLink = `https://kodocards.com${ref ? `?ref=${ref}` : ''}`
  const hookLabel = `${count} PIÈCE${Number(count) > 1 ? 'S' : ''} D'EXCEPTION`

  try {
    if (isWide) {
      // WIDE : rangee unique de cartes qui remplit, cadree
      const cols = Math.min(imgs.length, 5) || 1
      const pad = 40
      const gap = 16
      const tileW = Math.floor((W - pad * 2 - gap * (cols - 1)) / cols)
      const tileH = Math.round(tileW / 0.716)
      const rendered = await Promise.all(imgs.slice(0, cols).map(u => cardPng(u, Math.min(tileW, 300), Math.round(Math.min(tileW, 300) / 0.716))))
      const ok = rendered.filter(Boolean) as string[]
      const [qr, dmMed, dmBold] = await Promise.all([
        qrDataUrl(shareLink),
        fetchFont('https://cdn.jsdelivr.net/npm/@fontsource/dm-sans@5.0.8/files/dm-sans-latin-500-normal.woff'),
        fetchFont('https://cdn.jsdelivr.net/npm/@fontsource/dm-sans@5.0.8/files/dm-sans-latin-700-normal.woff'),
      ])
      const fonts: { name: string; data: ArrayBuffer; weight: 500 | 700; style: 'normal' }[] = []
      if (dmMed) fonts.push({ name: 'DM Sans', data: dmMed, weight: 500, style: 'normal' })
      if (dmBold) fonts.push({ name: 'DM Sans', data: dmBold, weight: 700, style: 'normal' })
      const FF = fonts.length ? 'DM Sans' : 'sans-serif'
      return new ImageResponse(
        (
          <div style={{ width: `${W}px`, height: `${H}px`, display: 'flex', flexDirection: 'column', background: '#0A0A14', fontFamily: FF, position: 'relative', justifyContent: 'space-between' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: `${W}px`, height: `${H}px`, display: 'flex', background: 'radial-gradient(ellipse at 50% 0%, rgba(90,55,140,0.4) 0%, rgba(90,55,140,0) 58%)' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '38px 44px 0', zIndex: 5 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', width: '9px', height: '9px', borderRadius: '50%', background: '#E03020', marginRight: '9px', boxShadow: '0 0 12px rgba(224,48,32,0.85)' }} />
                  <div style={{ display: 'flex', fontSize: '17px', fontWeight: 700, color: '#E03020', letterSpacing: '3px' }}>{hookLabel}</div>
                </div>
                <div style={{ display: 'flex', fontSize: '48px', fontWeight: 700, color: '#fff', letterSpacing: '-1.5px' }}>Ma Vitrine</div>
              </div>
              <div style={{ display: 'flex', fontSize: '30px', fontWeight: 700, color: '#E03020', letterSpacing: '-1px' }}>Kodo Cards</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: `0 ${pad}px` }}>
              {ok.map((src, i) => (<img key={i} src={src} width={tileW} height={tileH} style={{ borderRadius: '12px', objectFit: 'cover', marginLeft: i === 0 ? 0 : gap, border: '2px solid rgba(255,255,255,0.12)', boxShadow: '0 20px 50px rgba(0,0,0,0.55)' }} />))}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 44px 34px', zIndex: 5 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', fontSize: '22px', fontWeight: 700, color: '#fff' }}>kodocards.com</div>
                <div style={{ display: 'flex', fontSize: '17px', fontWeight: 700, color: '#E03020', marginTop: '4px' }}>Crée ta vitrine →</div>
              </div>
              {qr ? (<div style={{ display: 'flex', padding: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}><img src={qr} width={78} height={78} /></div>) : null}
            </div>
          </div>
        ),
        { width: W, height: H, fonts: fonts.length ? fonts : undefined, headers: { 'Cache-Control': CACHE } },
      )
    }

    // STORY/POST : piece maitresse en grand + grille dessous, cadre et dense
    const heroW = isPost ? 400 : 560
    const heroH = Math.round(heroW / 0.716)
    const gCols = 4
    const gPad = 60
    const gGap = isPost ? 12 : 16
    const gTileW = Math.floor((W - gPad * 2 - gGap * (gCols - 1)) / gCols)
    const gTileH = Math.round(gTileW / 0.716)
    const rendered = await Promise.all(imgs.map((u, i) => cardPng(u, i === 0 ? heroW : Math.min(gTileW, 260), i === 0 ? heroH : Math.round(Math.min(gTileW, 260) / 0.716))))
    const ok = rendered.filter(Boolean) as string[]
    const hero = ok[0]
    const grid = ok.slice(1, 1 + gCols)
    const [qr, dmMed, dmBold] = await Promise.all([
      qrDataUrl(shareLink),
      fetchFont('https://cdn.jsdelivr.net/npm/@fontsource/dm-sans@5.0.8/files/dm-sans-latin-500-normal.woff'),
      fetchFont('https://cdn.jsdelivr.net/npm/@fontsource/dm-sans@5.0.8/files/dm-sans-latin-700-normal.woff'),
    ])
    const fonts: { name: string; data: ArrayBuffer; weight: 500 | 700; style: 'normal' }[] = []
    if (dmMed) fonts.push({ name: 'DM Sans', data: dmMed, weight: 500, style: 'normal' })
    if (dmBold) fonts.push({ name: 'DM Sans', data: dmBold, weight: 700, style: 'normal' })
    const FF = fonts.length ? 'DM Sans' : 'sans-serif'

    return new ImageResponse(
      (
        <div style={{ width: `${W}px`, height: `${H}px`, display: 'flex', flexDirection: 'column', background: '#0A0A14', fontFamily: FF, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: `${W}px`, height: '1000px', display: 'flex', background: 'radial-gradient(ellipse at 50% 16%, rgba(90,55,140,0.5) 0%, rgba(90,55,140,0) 60%)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: `${W}px`, height: '480px', display: 'flex', background: 'radial-gradient(ellipse at 50% 100%, rgba(224,48,32,0.13) 0%, rgba(224,48,32,0) 72%)' }} />

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isPost ? '48px 60px 0' : '60px 72px 0', zIndex: 5 }}>
            <div style={{ display: 'flex', fontSize: isPost ? '38px' : '46px', fontWeight: 700, color: '#E03020', letterSpacing: '-1px' }}>Kodo Cards</div>
            <div style={{ display: 'flex', fontSize: isPost ? '18px' : '22px', fontWeight: 700, color: 'rgba(255,255,255,0.42)', letterSpacing: '5px' }}>MA VITRINE</div>
          </div>

          {/* Accroche + titre */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: isPost ? '22px' : '34px', zIndex: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: isPost ? '10px' : '14px' }}>
              <div style={{ display: 'flex', width: '11px', height: '11px', borderRadius: '50%', background: '#E03020', marginRight: '11px', boxShadow: '0 0 12px rgba(224,48,32,0.85)' }} />
              <div style={{ display: 'flex', fontSize: isPost ? '20px' : '24px', fontWeight: 700, color: '#E03020', letterSpacing: '3px' }}>{hookLabel}</div>
            </div>
            <div style={{ display: 'flex', fontSize: isPost ? '64px' : '84px', fontWeight: 700, color: '#fff', letterSpacing: '-2px' }}>Ma Vitrine</div>
          </div>

          {/* Piece maitresse en grand */}
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 0', position: 'relative' }}>
            {/* halo rayonnant colore derriere la piece maitresse */}
            <div style={{ position: 'absolute', left: '50%', top: '46%', width: `${heroW + 340}px`, height: `${heroW + 340}px`, transform: 'translate(-50%,-50%)', display: 'flex', background: 'radial-gradient(circle at 50% 50%, rgba(224,120,60,0.32) 0%, rgba(150,90,220,0.22) 38%, rgba(150,90,220,0) 66%)' }} />
            {hero ? (
              <div style={{ display: 'flex', borderRadius: '24px', padding: '4px', background: 'rgba(255,255,255,0.24)', boxShadow: '0 0 100px rgba(224,140,80,0.28), 0 44px 110px rgba(0,0,0,0.7)' }}>
                <img src={hero} width={heroW} height={heroH} style={{ borderRadius: '21px', objectFit: 'cover' }} />
              </div>
            ) : null}
            {/* legende elegante SOUS la carte */}
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '24px' }}>
              <div style={{ display: 'flex', fontSize: '20px', fontWeight: 700, color: '#E03020', letterSpacing: '2px', textTransform: 'uppercase' }}>Pièce maîtresse</div>
            </div>
          </div>

          {/* separateur lumineux */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '22px' }}>
            <div style={{ display: 'flex', width: '620px', height: '2px', background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.26) 50%, rgba(255,255,255,0) 100%)' }} />
          </div>

          {/* Grille des autres pieces, alignee */}
          {grid.length ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: `0 ${gPad}px`, marginBottom: '10px' }}>
              {grid.map((src, i) => (<img key={i} src={src} width={gTileW} height={gTileH} style={{ borderRadius: '12px', objectFit: 'cover', marginLeft: i === 0 ? 0 : gGap, border: '2px solid rgba(255,255,255,0.14)', boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }} />))}
            </div>
          ) : null}

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '30px 60px 56px', zIndex: 5 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', fontSize: '30px', fontWeight: 700, color: '#fff' }}>kodocards.com</div>
              <div style={{ display: 'flex', fontSize: '22px', fontWeight: 700, color: '#E03020', marginTop: '6px' }}>Crée ta vitrine →</div>
            </div>
            {qr ? (<div style={{ display: 'flex', padding: '12px', background: 'rgba(255,255,255,0.06)', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.1)' }}><img src={qr} width={110} height={110} /></div>) : null}
          </div>
        </div>
      ),
      { width: W, height: H, fonts: fonts.length ? fonts : undefined, headers: { 'Cache-Control': CACHE } },
    )
  } catch {
    return new ImageResponse(
      (<div style={{ width: `${W}px`, height: `${H}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0A0A14', textAlign: 'center', padding: '0 90px' }}>
        <div style={{ display: 'flex', fontSize: '42px', fontWeight: 700, color: '#E03020', marginBottom: '20px' }}>Kodo Cards</div>
        <div style={{ display: 'flex', fontSize: '64px', fontWeight: 700, color: '#fff' }}>Ma Vitrine</div>
        <div style={{ display: 'flex', fontSize: '24px', color: 'rgba(255,255,255,0.6)', marginTop: '30px' }}>kodocards.com</div>
      </div>),
      { width: W, height: H, headers: { 'Cache-Control': 'public, max-age=60' } },
    )
  }
}
