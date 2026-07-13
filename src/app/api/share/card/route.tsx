import { ImageResponse } from 'next/og'
import sharp from 'sharp'
import QRCode from 'qrcode'

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
  } catch { return null }
}
async function imageToPngDataUrl(url: string, w: number, h: number): Promise<string | null> {
  const raw = await fetchBuf(url)
  if (!raw) return null
  try {
    const png = await sharp(raw).resize(w, h, { fit: 'cover' }).png().toBuffer()
    return `data:image/png;base64,${png.toString('base64')}`
  } catch { return null }
}
async function qrDataUrl(text: string, dark: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(text, { margin: 1, width: 220, errorCorrectionLevel: 'M', color: { dark, light: '#00000000' } })
  } catch { return null }
}
async function fetchFont(url: string): Promise<ArrayBuffer | null> {
  try { const r = await fetch(url, { cache: 'force-cache' }); return r.ok ? await r.arrayBuffer() : null } catch { return null }
}
const FLAG: Record<string, string> = { FR: '🇫🇷', EN: '🇺🇸', JP: '🇯🇵' }
const S = (v: string | null, max: number, def = '') => (v || def).slice(0, max)
const GRADER_COLOR: Record<string, string> = { PSA: '#C0392B', CCC: '#2C5FAF', CGC: '#1E7F4E', BGS: '#22344F', PCA: '#7A3FB0', SGC: '#4A4A4A' }
const CACHE = 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800'

// ── Route ──────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const name = S(searchParams.get('name'), 60, 'Ma carte')
  const setName = S(searchParams.get('set'), 60)
  const number = S(searchParams.get('num'), 12)
  const lang = S(searchParams.get('lang'), 2, 'FR').toUpperCase()
  const rarity = S(searchParams.get('rarity'), 40)
  const condition = S(searchParams.get('cond'), 24)
  const grade = S(searchParams.get('grade'), 16)
  const grader = S(searchParams.get('grader'), 6).toUpperCase()
  const ref = S(searchParams.get('ref'), 32)
  const fmt = searchParams.get('format')
  const format = fmt === 'post' ? 'post' : fmt === 'wide' ? 'wide' : 'story'
  const priceNum = Number(searchParams.get('price') || '0')
  const imgUrl = searchParams.get('img') || ''
  const hasPrice = Number.isFinite(priceNum) && priceNum > 0
  const priceLabel = hasPrice ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(priceNum) : ''
  const flag = FLAG[lang] || ''

  const isWide = format === 'wide'
  const W = isWide ? 1200 : 1080
  const H = format === 'wide' ? 675 : format === 'post' ? 1350 : 1920
  const cardW = isWide ? 397 : format === 'post' ? 520 : 620
  const cardH = Math.round(cardW / 0.716)

  const isGraded = !!grade
  const isPremium = hasPrice && priceNum >= 100
  const graderCol = GRADER_COLOR[grader] || '#C0392B'
  // Premium/gradee -> contour blanc subtil + glow blanc (remplace le dore)
  const framed = isGraded || isPremium

  // Accroche contextuelle : UN seul label base sur la vraie data.
  // Priorite : GEM MINT (PSA 10) > 1re EDITION > PIECE MAITRESSE (chere).
  const meta = `${rarity} ${setName}`.toLowerCase()
  const gemMint = /\b10\b/.test(grade) || /gem/i.test(grade)
  const firstEd = /1st|[ée]dition\s*1/.test(meta)
  const hook = gemMint ? 'GEM MINT' : firstEd ? '1ʳᵉ ÉDITION' : isPremium ? 'PIÈCE MAÎTRESSE' : ''

  const shareLink = `https://kodocards.com${ref ? `?ref=${ref}` : ''}`

  const Hook = () => hook ? (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '14px' }}>
      <div style={{ display: 'flex', width: '9px', height: '9px', borderRadius: '50%', background: '#E03020', marginRight: '10px', boxShadow: '0 0 10px rgba(224,48,32,0.85)' }} />
      <div style={{ display: 'flex', fontSize: isWide ? '18px' : '22px', fontWeight: 700, color: '#E03020', letterSpacing: '3px', textTransform: 'uppercase' }}>{hook}</div>
    </div>
  ) : null

  const Chips = () => (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {flag ? (<div style={{ display: 'flex', alignItems: 'center', fontSize: isWide ? '24px' : '28px', color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', padding: isWide ? '7px 16px' : '9px 20px', marginRight: '12px' }}><span style={{ marginRight: '8px' }}>{flag}</span>{lang}</div>) : null}
      {rarity ? (<div style={{ display: 'flex', fontSize: isWide ? '20px' : '24px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', padding: isWide ? '9px 16px' : '11px 20px', marginRight: '12px', letterSpacing: '1px', textTransform: 'uppercase' }}>{rarity}</div>) : null}
      {condition && !isGraded ? (<div style={{ display: 'flex', fontSize: isWide ? '20px' : '24px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', padding: isWide ? '9px 16px' : '11px 20px', letterSpacing: '1px', textTransform: 'uppercase' }}>{condition}</div>) : null}
    </div>
  )

  // Prix "heros" : blanc, tres gros, avec un glow blanc quand la valeur est elevee.
  const priceGlow = isPremium ? '0 0 44px rgba(255,255,255,0.30)' : 'none'

  try {
    const [imgData, qr, dmMed, dmBold] = await Promise.all([
      imgUrl ? imageToPngDataUrl(imgUrl, cardW, cardH) : Promise.resolve(null),
      qrDataUrl(shareLink, '#FFFFFF'),
      fetchFont('https://cdn.jsdelivr.net/npm/@fontsource/dm-sans@5.0.8/files/dm-sans-latin-500-normal.woff'),
      fetchFont('https://cdn.jsdelivr.net/npm/@fontsource/dm-sans@5.0.8/files/dm-sans-latin-700-normal.woff'),
    ])
    const fonts: { name: string; data: ArrayBuffer; weight: 500 | 700; style: 'normal' }[] = []
    if (dmMed) fonts.push({ name: 'DM Sans', data: dmMed, weight: 500, style: 'normal' })
    if (dmBold) fonts.push({ name: 'DM Sans', data: dmBold, weight: 700, style: 'normal' })
    const FF = fonts.length ? 'DM Sans' : 'sans-serif'

    const CardBlock = () => (
      <div style={{ display: 'flex', position: 'relative', borderRadius: '26px', padding: framed ? '3px' : '0', background: framed ? 'rgba(255,255,255,0.16)' : 'transparent', boxShadow: framed ? '0 0 60px rgba(255,255,255,0.16), 0 34px 90px rgba(0,0,0,0.55)' : '0 34px 90px rgba(0,0,0,0.6)' }}>
        {imgData ? (
          <img src={imgData} width={cardW} height={cardH} style={{ borderRadius: '22px', objectFit: 'cover' }} />
        ) : (
          <div style={{ display: 'flex', width: `${cardW}px`, height: `${cardH}px`, borderRadius: '22px', background: 'linear-gradient(160deg,#15151f,#0d0d16)', border: '1px solid rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', padding: '0 30px', textAlign: 'center', fontSize: '34px', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>{name}</div>
        )}
        {isGraded ? (
          <div style={{ display: 'flex', position: 'absolute', top: '-22px', right: '-22px', background: graderCol, borderRadius: '16px', padding: isWide ? '10px 18px' : '14px 22px', boxShadow: '0 12px 30px rgba(0,0,0,0.5)', border: '2px solid rgba(255,255,255,0.25)' }}>
            <div style={{ display: 'flex', fontSize: isWide ? '30px' : '38px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>{grade}</div>
          </div>
        ) : null}
      </div>
    )

    // ══ LAYOUT WIDE (paysage, pour X) ══
    if (isWide) {
      return new ImageResponse(
        (
          <div style={{ width: `${W}px`, height: `${H}px`, display: 'flex', flexDirection: 'row', background: '#0A0A14', fontFamily: FF, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: `${W}px`, height: `${H}px`, display: 'flex', background: 'radial-gradient(ellipse at 22% 30%, rgba(90,55,140,0.5) 0%, rgba(90,55,140,0) 60%)' }} />
            <div style={{ display: 'flex', width: '520px', alignItems: 'center', justifyContent: 'center', padding: '40px 0 40px 40px' }}>
              <CardBlock />
            </div>
            <div style={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'space-between', padding: '52px 56px 44px 30px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', fontSize: '34px', fontWeight: 700, color: '#E03020', letterSpacing: '-1px' }}>Kodo Cards</div>
                <div style={{ display: 'flex', fontSize: '18px', fontWeight: 700, color: 'rgba(255,255,255,0.42)', letterSpacing: '5px' }}>MA CARTE</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <Hook />
                {setName ? (<div style={{ display: 'flex', fontSize: '22px', fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '10px' }}>{setName}{number ? ` · #${number}` : ''}</div>) : null}
                <div style={{ display: 'flex', fontSize: '58px', fontWeight: 700, color: '#fff', letterSpacing: '-1.5px', lineHeight: 1.02, marginBottom: '20px' }}>{name}</div>
                <Chips />
                {hasPrice ? (
                  <div style={{ display: 'flex', flexDirection: 'column', marginTop: '26px' }}>
                    <div style={{ display: 'flex', fontSize: '18px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '3px', textTransform: 'uppercase' }}>Valeur estimée</div>
                    <div style={{ display: 'flex', fontSize: isPremium ? '82px' : '72px', fontWeight: 700, color: '#fff', letterSpacing: '-2px', textShadow: priceGlow }}>{priceLabel}</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', marginTop: '26px', fontSize: '24px', fontWeight: 700, color: 'rgba(224,48,32,0.9)', letterSpacing: '3px', textTransform: 'uppercase' }}>Dans ma collection</div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', fontSize: '24px', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>kodocards.com</div>
                  <div style={{ display: 'flex', fontSize: '18px', fontWeight: 700, color: '#E03020', marginTop: '4px' }}>Estime ta collection →</div>
                </div>
                {qr ? (<div style={{ display: 'flex', padding: '9px', background: 'rgba(255,255,255,0.06)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)' }}><img src={qr} width={92} height={92} /></div>) : null}
              </div>
            </div>
          </div>
        ),
        { width: W, height: H, fonts: fonts.length ? fonts : undefined, headers: { 'Cache-Control': CACHE } },
      )
    }

    // ══ LAYOUT VERTICAL (story 9:16 / post 4:5) ══
    return new ImageResponse(
      (
        <div style={{ width: `${W}px`, height: `${H}px`, display: 'flex', flexDirection: 'column', background: '#0A0A14', fontFamily: FF, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: `${W}px`, height: `${Math.round(H * 0.46)}px`, display: 'flex', background: 'radial-gradient(ellipse at 50% 0%, rgba(90,55,140,0.55) 0%, rgba(90,55,140,0) 68%)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: `${W}px`, height: '520px', display: 'flex', background: 'radial-gradient(ellipse at 50% 100%, rgba(224,48,32,0.16) 0%, rgba(224,48,32,0) 70%)' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '64px 72px 0' }}>
            <div style={{ display: 'flex', fontSize: '46px', fontWeight: 700, color: '#E03020', letterSpacing: '-1px' }}>Kodo Cards</div>
            <div style={{ display: 'flex', fontSize: '24px', fontWeight: 700, color: 'rgba(255,255,255,0.42)', letterSpacing: '6px' }}>MA CARTE</div>
          </div>
          <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', padding: '30px 0' }}>
            <CardBlock />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 72px' }}>
            <div style={{ display: 'flex', marginBottom: hook ? '4px' : '0' }}><Hook /></div>
            {setName ? (<div style={{ display: 'flex', fontSize: '26px', fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '4px', textTransform: 'uppercase' }}>{setName}{number ? ` · #${number}` : ''}</div>) : null}
            <div style={{ display: 'flex', fontSize: '68px', fontWeight: 700, color: '#fff', letterSpacing: '-1.5px', marginTop: '12px', textAlign: 'center' }}>{name}</div>
            <div style={{ display: 'flex', marginTop: '22px' }}><Chips /></div>
            {hasPrice ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '32px' }}>
                <div style={{ display: 'flex', fontSize: '22px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '4px', textTransform: 'uppercase' }}>Valeur estimée</div>
                <div style={{ display: 'flex', fontSize: format === 'post' ? (isPremium ? '108px' : '96px') : (isPremium ? '124px' : '110px'), fontWeight: 700, color: '#fff', letterSpacing: '-3px', marginTop: '2px', textShadow: priceGlow }}>{priceLabel}</div>
              </div>
            ) : (
              <div style={{ display: 'flex', marginTop: '32px', fontSize: '28px', fontWeight: 700, color: 'rgba(224,48,32,0.9)', letterSpacing: '4px', textTransform: 'uppercase' }}>Dans ma collection</div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '36px 60px 56px', marginTop: '34px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', fontSize: '30px', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>kodocards.com</div>
              <div style={{ display: 'flex', fontSize: '22px', fontWeight: 700, color: '#E03020', marginTop: '6px' }}>Estime ta collection →</div>
            </div>
            {qr ? (<div style={{ display: 'flex', padding: '12px', background: 'rgba(255,255,255,0.06)', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.1)' }}><img src={qr} width={116} height={116} /></div>) : null}
          </div>
        </div>
      ),
      { width: W, height: H, fonts: fonts.length ? fonts : undefined, headers: { 'Cache-Control': CACHE } },
    )
  } catch {
    return new ImageResponse(
      (
        <div style={{ width: `${W}px`, height: `${H}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0A0A14', padding: '0 90px', textAlign: 'center' }}>
          <div style={{ display: 'flex', fontSize: '42px', fontWeight: 700, color: '#E03020', marginBottom: '30px' }}>Kodo Cards</div>
          <div style={{ display: 'flex', fontSize: '56px', fontWeight: 700, color: '#fff' }}>{name}</div>
          <div style={{ display: 'flex', fontSize: '24px', color: 'rgba(255,255,255,0.6)', marginTop: '40px' }}>kodocards.com</div>
        </div>
      ),
      { width: W, height: H, headers: { 'Cache-Control': 'public, max-age=60' } },
    )
  }
}
