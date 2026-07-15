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
  try { return await QRCode.toDataURL(text, { margin: 1, width: 200, errorCorrectionLevel: 'M', color: { dark: '#0A0A14', light: '#00000000' } }) } catch { return null }
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
  const year = S(searchParams.get('year'), 4, '2026')
  const total = S(searchParams.get('total'), 20)
  const cardsN = S(searchParams.get('cards'), 8)
  const setsN = S(searchParams.get('sets'), 8)
  const starName = S(searchParams.get('starName'), 40)
  const roi = S(searchParams.get('roi'), 8)
  const gradedN = S(searchParams.get('graded'), 6)
  const topSet = S(searchParams.get('topSet'), 34)
  const hasRoi = /^\+?\d/.test(roi) && roi !== '0%' && roi !== '+0%'
  const starImg = searchParams.get('starImg') || ''
  const ref = S(searchParams.get('ref'), 32)

  const fmt = searchParams.get('format')
  const format = fmt === 'post' ? 'post' : 'story'
  const isPost = format === 'post'
  const W = 1080, H = isPost ? 1350 : 1920
  // echelles adaptatives (post = plus compact)
  const TITLE = isPost ? 96 : 158
  const YEARSUB = isPost ? 44 : 66
  const HERO = isPost ? 74 : 92
  const STAT = isPost ? 46 : 58
  const NAME = isPost ? 34 : 44
  const shareLink = `https://kodocards.com${ref ? `?ref=${ref}` : ''}`
  const cardW = isPost ? 268 : 400, cardH = Math.round(cardW / 0.716)

  try {
    const [star, qr, dmMed, dmBold] = await Promise.all([
      starImg ? cardPng(starImg, cardW, cardH) : Promise.resolve(null),
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
        <div style={{ width: `${W}px`, height: `${H}px`, display: 'flex', flexDirection: 'column', fontFamily: FF, position: 'relative', background: 'linear-gradient(155deg, #2A1758 0%, #4A1D6E 34%, #7A1E52 64%, #E03020 100%)' }}>
          {/* halos lumineux festifs (blobs Spotify vibrants) */}
          <div style={{ position: 'absolute', top: '-60px', left: '-80px', width: '720px', height: '720px', display: 'flex', background: 'radial-gradient(circle at 50% 50%, rgba(190,120,255,0.75) 0%, rgba(190,120,255,0) 62%)' }} />
          <div style={{ position: 'absolute', bottom: '-120px', right: '-120px', width: '820px', height: '820px', display: 'flex', background: 'radial-gradient(circle at 50% 50%, rgba(255,90,60,0.7) 0%, rgba(255,90,60,0) 64%)' }} />
          <div style={{ position: 'absolute', top: '620px', right: '-160px', width: '560px', height: '560px', display: 'flex', background: 'radial-gradient(circle at 50% 50%, rgba(255,60,140,0.45) 0%, rgba(255,60,140,0) 66%)' }} />

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '64px 68px 0' }}>
            <div style={{ display: 'flex', fontSize: '42px', fontWeight: 700, color: '#fff', letterSpacing: '-1px' }}>Kodo Cards</div>
            <div style={{ display: 'flex', fontSize: '20px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '4px' }}>{year}</div>
          </div>

          {/* Titre WRAPPED */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: isPost ? '12px' : '20px', marginBottom: isPost ? '14px' : '0' }}>
            <div style={{ display: 'flex', fontSize: `${TITLE}px`, fontWeight: 700, color: '#fff', letterSpacing: '-6px', lineHeight: 0.9 }}>WRAPPED</div>
            <div style={{ display: 'flex', fontSize: `${YEARSUB}px`, fontWeight: 700, color: 'rgba(255,255,255,0.92)', letterSpacing: '12px', marginTop: '4px' }}>{year}</div>
          </div>

          {/* spacer haut (centre le bloc sans deborder) */}
          <div style={{ display: 'flex', flex: 1 }} />

          {/* Carte star */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {star ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                <div style={{ display: 'flex', fontSize: isPost ? '18px' : '22px', fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: isPost ? '16px' : '24px' }}>Ta pièce maîtresse</div>
                <div style={{ position: 'absolute', top: '60px', left: '50%', width: isPost ? '520px' : '640px', height: isPost ? '520px' : '640px', transform: 'translateX(-50%)', display: 'flex', background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0) 60%)' }} />
                <div style={{ display: 'flex', borderRadius: '26px', padding: '6px', background: 'rgba(255,255,255,0.35)', boxShadow: '0 40px 90px rgba(0,0,0,0.5)' }}>
                  <img src={star} width={cardW} height={cardH} style={{ borderRadius: '20px', objectFit: 'cover' }} />
                </div>
                {starName ? (<div style={{ display: 'flex', fontSize: `${NAME}px`, fontWeight: 700, color: '#fff', marginTop: isPost ? '16px' : '26px', textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>{starName}</div>) : null}
              </div>
            ) : null}
          </div>

          {/* espace carte -> valeur (garanti, pas de chevauchement) */}
          <div style={{ display: 'flex', height: isPost ? '30px' : '44px' }} />

          {/* Valeur héros + ROI */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: isPost ? '12px' : '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', fontSize: `${HERO}px`, fontWeight: 700, color: '#fff', letterSpacing: '-3px', lineHeight: 1, textShadow: '0 2px 30px rgba(0,0,0,0.25)' }}>{total}</div>
              {hasRoi ? (<div style={{ display: 'flex', marginLeft: '16px', marginBottom: '14px', fontSize: '26px', fontWeight: 700, color: '#fff', background: 'rgba(61,220,109,0.9)', borderRadius: '999px', padding: '6px 16px' }}>{roi}</div>) : null}
            </div>
            <div style={{ display: 'flex', fontSize: '18px', fontWeight: 700, color: 'rgba(255,255,255,0.72)', letterSpacing: '3px', textTransform: 'uppercase', marginTop: '8px' }}>Valeur de la collection</div>
          </div>

          {/* Ligne stats : Cartes · Séries · Gradées */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 60px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{ display: 'flex', fontSize: `${STAT}px`, fontWeight: 700, color: '#fff', letterSpacing: '-2px', lineHeight: 1 }}>{cardsN}</div>
              <div style={{ display: 'flex', fontSize: '17px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '8px' }}>Cartes</div>
            </div>
            <div style={{ display: 'flex', width: '1px', height: '66px', background: 'rgba(255,255,255,0.25)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{ display: 'flex', fontSize: `${STAT}px`, fontWeight: 700, color: '#fff', letterSpacing: '-2px', lineHeight: 1 }}>{setsN}</div>
              <div style={{ display: 'flex', fontSize: '17px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '8px' }}>Séries</div>
            </div>
            <div style={{ display: 'flex', width: '1px', height: '66px', background: 'rgba(255,255,255,0.25)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{ display: 'flex', fontSize: `${STAT}px`, fontWeight: 700, color: '#fff', letterSpacing: '-2px', lineHeight: 1 }}>{gradedN || '0'}</div>
              <div style={{ display: 'flex', fontSize: '17px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '8px' }}>Gradées</div>
            </div>
          </div>

          {/* Série favorite */}
          {topSet ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '26px' }}>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.14)', borderRadius: '999px', padding: '12px 26px' }}>
                <div style={{ display: 'flex', fontSize: '18px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '2px', textTransform: 'uppercase', marginRight: '12px' }}>Série favorite</div>
                <div style={{ display: 'flex', fontSize: '22px', fontWeight: 700, color: '#fff' }}>{topSet}</div>
              </div>
            </div>
          ) : null}

          {/* spacer bas */}
          <div style={{ display: 'flex', flex: 1 }} />

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 60px 56px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', fontSize: '30px', fontWeight: 700, color: '#fff' }}>kodocards.com</div>
              <div style={{ display: 'flex', fontSize: '22px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginTop: '6px' }}>Fais ton Wrapped →</div>
            </div>
            {qr ? (<div style={{ display: 'flex', padding: '12px', background: '#fff', borderRadius: '18px' }}><img src={qr} width={104} height={104} /></div>) : null}
          </div>
        </div>
      ),
      { width: W, height: H, fonts: fonts.length ? fonts : undefined, headers: { 'Cache-Control': CACHE } },
    )
  } catch {
    return new ImageResponse(
      (<div style={{ width: `${W}px`, height: `${H}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(155deg,#2A1758,#E03020)', textAlign: 'center', padding: '0 90px' }}>
        <div style={{ display: 'flex', fontSize: '120px', fontWeight: 700, color: '#fff' }}>WRAPPED</div>
        <div style={{ display: 'flex', fontSize: '56px', fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: '8px', marginTop: '10px' }}>{year}</div>
        <div style={{ display: 'flex', fontSize: '24px', color: 'rgba(255,255,255,0.85)', marginTop: '40px' }}>kodocards.com</div>
      </div>),
      { width: W, height: H, headers: { 'Cache-Control': 'public, max-age=60' } },
    )
  }
}
