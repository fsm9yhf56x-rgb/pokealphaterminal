import { ImageResponse } from 'next/og'
import sharp from 'sharp'

// Runtime node : requis pour sharp (decodage image) + fetch polices.
export const runtime = 'nodejs'

// ── Helpers ────────────────────────────────────────────────────────────────
async function fetchBuf(url: string, ms = 6000): Promise<Buffer | null> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), ms)
    const res = await fetch(url, { cache: 'force-cache', signal: ctrl.signal })
    clearTimeout(t)
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch {
    return null
  }
}

// Illustration -> PNG data URL, quel que soit le format source (webp/jpg/png).
// Satori ne decode PAS le webp -> on passe TOUT par sharp -> PNG garanti.
async function imageToPngDataUrl(url: string): Promise<string | null> {
  const raw = await fetchBuf(url)
  if (!raw) return null
  try {
    const png = await sharp(raw).resize(620, 866, { fit: 'cover' }).png().toBuffer()
    return `data:image/png;base64,${png.toString('base64')}`
  } catch {
    return null
  }
}

async function fetchFont(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url, { cache: 'force-cache' })
    if (!res.ok) return null
    return await res.arrayBuffer()
  } catch {
    return null
  }
}

const FLAG: Record<string, string> = { FR: '🇫🇷', EN: '🇺🇸', JP: '🇯🇵' }
const S = (v: string | null, max: number, def = '') => (v || def).slice(0, max)

// ── Route ──────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const name = S(searchParams.get('name'), 60, 'Ma carte')
  const setName = S(searchParams.get('set'), 60)
  const number = S(searchParams.get('num'), 12)
  const lang = S(searchParams.get('lang'), 2, 'FR').toUpperCase()
  const rarity = S(searchParams.get('rarity'), 40)
  const condition = S(searchParams.get('cond'), 24)
  const priceNum = Number(searchParams.get('price') || '0')
  const imgUrl = searchParams.get('img') || ''
  const hasPrice = Number.isFinite(priceNum) && priceNum > 0
  const priceLabel = hasPrice
    ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(priceNum)
    : ''
  const flag = FLAG[lang] || ''

  try {
    const [imgData, dmMed, dmBold] = await Promise.all([
      imgUrl ? imageToPngDataUrl(imgUrl) : Promise.resolve(null),
      fetchFont('https://cdn.jsdelivr.net/npm/@fontsource/dm-sans@5.0.8/files/dm-sans-latin-500-normal.woff'),
      fetchFont('https://cdn.jsdelivr.net/npm/@fontsource/dm-sans@5.0.8/files/dm-sans-latin-700-normal.woff'),
    ])

    const fonts: { name: string; data: ArrayBuffer; weight: 500 | 700; style: 'normal' }[] = []
    if (dmMed) fonts.push({ name: 'DM Sans', data: dmMed, weight: 500, style: 'normal' })
    if (dmBold) fonts.push({ name: 'DM Sans', data: dmBold, weight: 700, style: 'normal' })
    const FF = fonts.length ? 'DM Sans' : 'sans-serif'

    return new ImageResponse(
      (
        <div style={{ width: '1080px', height: '1920px', display: 'flex', flexDirection: 'column', background: '#0A0A14', fontFamily: FF, position: 'relative' }}>
          {/* Halo violet haut */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '1080px', height: '860px', display: 'flex', background: 'radial-gradient(ellipse at 50% 0%, rgba(90,55,140,0.55) 0%, rgba(90,55,140,0) 68%)' }} />
          {/* Lueur rouge basse */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '1080px', height: '520px', display: 'flex', background: 'radial-gradient(ellipse at 50% 100%, rgba(224,48,32,0.18) 0%, rgba(224,48,32,0) 70%)' }} />

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '70px 72px 0' }}>
            <div style={{ display: 'flex', fontSize: '46px', fontWeight: 700, color: '#E03020', letterSpacing: '-1px' }}>Kodo Cards</div>
            <div style={{ display: 'flex', fontSize: '24px', fontWeight: 700, color: 'rgba(255,255,255,0.42)', letterSpacing: '6px' }}>MA CARTE</div>
          </div>

          {/* Illustration */}
          <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
            {imgData ? (
              <img src={imgData} width={620} height={866} style={{ borderRadius: '28px', objectFit: 'cover', boxShadow: '0 40px 100px rgba(0,0,0,0.6)' }} />
            ) : (
              <div style={{ display: 'flex', width: '620px', height: '866px', borderRadius: '28px', background: 'linear-gradient(160deg,#15151f,#0d0d16)', border: '1px solid rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', padding: '0 40px', textAlign: 'center', fontSize: '40px', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>
                {name}
              </div>
            )}
          </div>

          {/* Infos carte */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 72px' }}>
            {setName ? (
              <div style={{ display: 'flex', fontSize: '26px', fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '4px', textTransform: 'uppercase' }}>
                {setName}{number ? ` · #${number}` : ''}
              </div>
            ) : null}
            <div style={{ display: 'flex', fontSize: '72px', fontWeight: 700, color: '#fff', letterSpacing: '-1.5px', marginTop: '14px', textAlign: 'center' }}>{name}</div>

            {/* Chips */}
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '26px' }}>
              {flag ? (
                <div style={{ display: 'flex', alignItems: 'center', fontSize: '30px', color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', padding: '10px 22px', marginRight: '14px' }}>
                  <span style={{ marginRight: '10px' }}>{flag}</span>{lang}
                </div>
              ) : null}
              {rarity ? (
                <div style={{ display: 'flex', fontSize: '26px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', padding: '12px 22px', marginRight: '14px', letterSpacing: '1px', textTransform: 'uppercase' }}>{rarity}</div>
              ) : null}
              {condition ? (
                <div style={{ display: 'flex', fontSize: '26px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', padding: '12px 22px', letterSpacing: '1px', textTransform: 'uppercase' }}>{condition}</div>
              ) : null}
            </div>

            {/* Prix conditionnel */}
            {hasPrice ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '40px' }}>
                <div style={{ display: 'flex', fontSize: '22px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '4px', textTransform: 'uppercase' }}>Valeur estimée</div>
                <div style={{ display: 'flex', fontSize: '110px', fontWeight: 700, color: '#fff', letterSpacing: '-3px', marginTop: '4px' }}>{priceLabel}</div>
              </div>
            ) : (
              <div style={{ display: 'flex', marginTop: '40px', fontSize: '28px', fontWeight: 700, color: 'rgba(224,48,32,0.9)', letterSpacing: '4px', textTransform: 'uppercase' }}>Dans ma collection</div>
            )}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '48px 72px 70px', marginTop: '46px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', fontSize: '26px', color: 'rgba(255,255,255,0.55)' }}>Ma collection Pokémon</div>
            <div style={{ display: 'flex', fontSize: '28px', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>kodocards.com</div>
          </div>
        </div>
      ),
      { width: 1080, height: 1920, fonts: fonts.length ? fonts : undefined },
    )
  } catch {
    // Filet de securite ULTIME : jamais de crash / page blanche.
    // Une image minimale (nom + branding) est renvoyee meme si tout a echoue.
    return new ImageResponse(
      (
        <div style={{ width: '1080px', height: '1920px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0A0A14', padding: '0 90px', textAlign: 'center' }}>
          <div style={{ display: 'flex', fontSize: '46px', fontWeight: 700, color: '#E03020', marginBottom: '40px' }}>Kodo Cards</div>
          <div style={{ display: 'flex', fontSize: '72px', fontWeight: 700, color: '#fff' }}>{name}</div>
          <div style={{ display: 'flex', fontSize: '28px', color: 'rgba(255,255,255,0.6)', marginTop: '60px' }}>kodocards.com</div>
        </div>
      ),
      { width: 1080, height: 1920 },
    )
  }
}
