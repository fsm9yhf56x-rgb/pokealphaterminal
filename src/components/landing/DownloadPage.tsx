'use client'

import { useState } from 'react'
import { Footer } from '@/components/layout/Footer'

export default function DownloadPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle')

  async function submit() {
    if (status === 'loading') return
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setStatus('err'); return }
    setStatus('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'app_mobile' }),
      })
      setStatus(res.ok ? 'ok' : 'err')
    } catch { setStatus('err') }
  }

  return (
    <div className="kc-dl">
      <style>{CSS}</style>

      <div className="kc-dl-bokeh" aria-hidden>
        <span className="kc-dl-n1" /><span className="kc-dl-n2" />
        <span className="kc-dl-n3" /><span className="kc-dl-n4" />
      </div>

      <header className="kc-dl-top">
        <a href="/" className="kc-dl-logo">Kodo<span> Cards</span></a>
        <a href="/" className="kc-dl-back">← Retour à l’accueil</a>
      </header>

      <main className="kc-dl-main">
        <div className="kc-dl-copy">
          <span className="kc-dl-eyebrow">Application mobile</span>
          <h1 className="kc-dl-h1">L’app Kodo <span className="kc-dl-grad">arrive bientôt.</span></h1>
          <p className="kc-dl-sub">
            Toute ta collection et sa valeur du jour, dans ta poche. iOS et Android,
            en cours de finition. Laisse ton email — on te prévient le jour du lancement.
          </p>

          <div className="kc-dl-stores">
            <button className="kc-store" disabled>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M16.5 12.3c0-2 1.6-2.9 1.7-3-0.9-1.4-2.4-1.5-2.9-1.6-1.2-0.1-2.4 0.7-3 0.7s-1.6-0.7-2.6-0.7c-1.3 0-2.6 0.8-3.3 2-1.4 2.4-0.4 6 1 8 0.7 1 1.4 2 2.5 2 1 0 1.3-0.6 2.5-0.6s1.5 0.6 2.6 0.6 1.7-1 2.4-2c0.7-1 1-2 1-2-0.1 0-2-0.7-2-2.8zM14.6 6.3c0.5-0.7 0.9-1.6 0.8-2.5-0.8 0-1.7 0.5-2.3 1.2-0.5 0.6-0.9 1.5-0.8 2.4 0.9 0.1 1.7-0.4 2.3-1.1z"/></svg>
              <span><small>Bientôt sur</small>App Store</span>
            </button>
            <button className="kc-store" disabled>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M3.6 2.2c-0.2 0.2-0.3 0.5-0.3 0.9v17.8c0 0.4 0.1 0.7 0.3 0.9l0.1 0.1L13.5 12v-0.1L3.7 2.1zM17 15.3l-3.3-3.3L17 8.7l3.9 2.2c1.1 0.6 1.1 1.6 0 2.3zM13.5 12.1L16.6 15.6 5.5 21.9c-0.4 0.2-0.8 0.2-1.1 0zM5.5 2.1l11.1 6.3-3.1 3.5z"/></svg>
              <span><small>Bientôt sur</small>Google Play</span>
            </button>
          </div>

          {status === 'ok' ? (
            <div className="kc-dl-ok">✓ Parfait — on t’écrit dès la sortie.</div>
          ) : (
            <div className="kc-dl-form">
              <input
                type="email" inputMode="email" placeholder="vous@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (status === 'err') setStatus('idle') }}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                aria-label="Adresse email"
              />
              <button className="kc-dl-btn" onClick={submit} disabled={status === 'loading'}>
                {status === 'loading' ? 'Envoi…' : 'Me prévenir'}
              </button>
            </div>
          )}
          {status === 'err' && <p className="kc-dl-err">Email invalide ou envoi impossible — réessaie.</p>}
        </div>

        <div className="kc-dl-visual">
          <div className="kc-phone">
            <div className="kc-phone-notch" />
            <div className="kc-phone-screen">
              <div className="kc-ph-status"><span>9:41</span><span className="kc-ph-dots"><i /><i /><i /></span></div>
              <div className="kc-ph-head"><span className="kc-ph-logo">K</span><b>Kodo Cards</b></div>
              <div className="kc-ph-hero">
                <span>Ma collection</span>
                <div className="kc-ph-val">4 280 €</div>
                <div className="kc-ph-up">128 cartes · 6 séries</div>
              </div>
              <div className="kc-ph-row"><span>Dracaufeu · PSA 9</span><b>3 381 €</b></div>
              <div className="kc-ph-row"><span>Mewtwo · holo</span><b>188 €</b></div>
              <div className="kc-ph-row"><span>Léviator · 1st Ed</span><b>412 €</b></div>
              <div className="kc-ph-tabs"><i className="kc-on" /><i /><i /><i /></div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

const CSS = `
.kc-dl{
  --ink:#1D1D1F;--muted:#6E6E73;--faint:#86868B;--border:#E5E5EA;--accent:#E03020;--accent2:#FF4433;--green:#2E9E6A;--surface:#F5F5F7;
  --display:var(--font-display,'Sora',system-ui,sans-serif);--body:var(--font-sans,'DM Sans',system-ui,sans-serif);--mono:var(--font-mono,'Space Mono',ui-monospace,monospace);
  --ease:cubic-bezier(.16,1,.3,1);
  position:relative;min-height:100vh;background:#fff;color:var(--ink);font-family:var(--body);overflow-x:hidden;display:flex;flex-direction:column;
}
.kc-dl *{box-sizing:border-box;}
.kc-dl-bokeh{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;}
.kc-dl-bokeh span{position:absolute;border-radius:50%;filter:blur(70px);opacity:.5;will-change:transform;}
.kc-dl-n1{width:42vw;height:42vw;top:-8vw;left:-6vw;background:radial-gradient(circle,rgba(255,138,90,.5),transparent 70%);animation:d1 28s var(--ease) infinite alternate;}
.kc-dl-n2{width:40vw;height:40vw;top:0;right:-10vw;background:radial-gradient(circle,rgba(90,150,255,.45),transparent 70%);animation:d2 32s var(--ease) infinite alternate;}
.kc-dl-n3{width:34vw;height:34vw;bottom:-8vw;left:10vw;background:radial-gradient(circle,rgba(170,120,255,.4),transparent 70%);animation:d3 30s var(--ease) infinite alternate;}
.kc-dl-n4{width:36vw;height:36vw;bottom:-10vw;right:-4vw;background:radial-gradient(circle,rgba(255,120,170,.4),transparent 70%);animation:d4 34s var(--ease) infinite alternate;}
@keyframes d1{to{transform:translate(7vw,5vw) scale(1.15);}}
@keyframes d2{to{transform:translate(-6vw,8vw) scale(1.1);}}
@keyframes d3{to{transform:translate(6vw,-5vw) scale(1.18);}}
@keyframes d4{to{transform:translate(-7vw,-7vw) scale(1.14);}}

.kc-dl-top{position:relative;z-index:2;max-width:1160px;margin:0 auto;width:100%;height:64px;padding:0 24px;display:flex;align-items:center;gap:20px;}
.kc-dl-logo{font-family:var(--display);font-weight:700;font-size:19px;letter-spacing:-.02em;text-decoration:none;color:var(--ink);}
.kc-dl-logo span{color:var(--accent);}
.kc-dl-back{margin-left:auto;font-size:13px;color:var(--muted);text-decoration:none;font-weight:500;}
.kc-dl-back:hover{color:var(--ink);}

.kc-dl-main{position:relative;z-index:1;flex:1;max-width:1100px;margin:0 auto;width:100%;padding:48px 24px 80px;display:grid;grid-template-columns:1.05fr .95fr;gap:56px;align-items:center;}
.kc-dl-eyebrow{display:inline-block;font-family:var(--mono);font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);background:rgba(224,48,32,.08);padding:7px 13px;border-radius:999px;margin-bottom:22px;}
.kc-dl-h1{font-family:var(--display);font-weight:700;font-size:clamp(34px,5vw,56px);line-height:1.05;letter-spacing:-.03em;margin:0;}
.kc-dl-grad{background:linear-gradient(120deg,var(--accent),var(--accent2));-webkit-background-clip:text;background-clip:text;color:transparent;}
.kc-dl-sub{font-size:clamp(15px,1.6vw,18px);line-height:1.6;color:var(--muted);margin:22px 0 0;max-width:40ch;}
.kc-dl-stores{display:flex;gap:12px;margin-top:30px;flex-wrap:wrap;}
.kc-store{display:inline-flex;align-items:center;gap:11px;background:#1D1D1F;color:#fff;border:none;border-radius:14px;padding:11px 18px;cursor:not-allowed;opacity:.92;font-family:var(--display);text-align:left;}
.kc-store svg{flex-shrink:0;}
.kc-store span{display:flex;flex-direction:column;line-height:1.1;font-size:15px;font-weight:600;}
.kc-store small{font-size:9.5px;font-weight:500;opacity:.7;letter-spacing:.04em;text-transform:uppercase;}
.kc-dl-form{display:flex;gap:10px;margin-top:30px;max-width:420px;}
.kc-dl-form input{flex:1;height:50px;padding:0 18px;border-radius:13px;border:none;box-shadow:inset 0 0 0 1px var(--border);background:rgba(255,255,255,.9);font-family:var(--body);font-size:15px;color:var(--ink);outline:none;transition:box-shadow .2s;}
.kc-dl-form input:focus{box-shadow:inset 0 0 0 2px var(--accent);}
.kc-dl-btn{height:50px;padding:0 22px;border:none;border-radius:13px;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;font-family:var(--display);font-weight:600;font-size:15px;cursor:pointer;box-shadow:0 6px 20px rgba(224,48,32,.28);transition:transform .15s,box-shadow .25s;}
.kc-dl-btn:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(224,48,32,.34);}
.kc-dl-ok{margin-top:30px;display:inline-flex;align-items:center;gap:9px;font-family:var(--display);font-weight:600;font-size:16px;color:var(--green);background:rgba(46,158,106,.1);padding:14px 22px;border-radius:14px;}
.kc-dl-err{color:var(--accent);font-size:13px;margin-top:12px;}

.kc-dl-visual{display:flex;justify-content:center;}
.kc-phone{position:relative;width:280px;height:570px;border-radius:46px;padding:12px;background:linear-gradient(160deg,#fafafa,#e8e8ec);box-shadow:0 40px 90px rgba(0,0,0,.18),0 12px 30px rgba(0,0,0,.1),inset 0 1px 0 rgba(255,255,255,.9);animation:phfloat 7s ease-in-out infinite;will-change:transform;}
@keyframes phfloat{0%,100%{transform:translateY(0) rotate(-.6deg);}50%{transform:translateY(-16px) rotate(.6deg);}}
.kc-phone-notch{position:absolute;top:24px;left:50%;transform:translateX(-50%);width:96px;height:24px;background:#0c0c0e;border-radius:14px;z-index:3;}
.kc-phone-screen{position:relative;height:100%;border-radius:36px;background:linear-gradient(180deg,#fff,#f3f3f6);overflow:hidden;padding:18px 16px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.05);display:flex;flex-direction:column;}
.kc-ph-status{display:flex;justify-content:space-between;align-items:center;font-family:var(--mono);font-size:11px;color:var(--ink);padding:2px 6px 14px;}
.kc-ph-dots{display:flex;gap:3px;}
.kc-ph-dots i{width:5px;height:5px;border-radius:50%;background:var(--ink);opacity:.5;}
.kc-ph-head{display:flex;align-items:center;gap:8px;padding:0 4px 14px;}
.kc-ph-logo{width:24px;height:24px;border-radius:7px;background:#1D1D1F;color:#fff;font-family:var(--display);font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center;}
.kc-ph-head b{font-family:var(--display);font-size:15px;letter-spacing:-.02em;}
.kc-ph-hero{border-radius:18px;padding:16px;background:linear-gradient(135deg,rgba(224,48,32,.08),rgba(255,68,51,.04));box-shadow:inset 0 0 0 1px rgba(224,48,32,.12);margin-bottom:12px;}
.kc-ph-hero>span{font-size:11px;color:var(--faint);font-family:var(--mono);text-transform:uppercase;letter-spacing:.08em;}
.kc-ph-val{font-family:var(--display);font-weight:700;font-size:30px;letter-spacing:-.03em;margin-top:4px;}
.kc-ph-up{font-family:var(--mono);font-size:12px;color:var(--green);margin-top:2px;}
.kc-ph-row{display:flex;justify-content:space-between;align-items:center;padding:11px 12px;border-radius:12px;background:rgba(255,255,255,.7);box-shadow:inset 0 0 0 1px rgba(0,0,0,.04);margin-bottom:8px;font-size:13px;}
.kc-ph-row span{color:var(--muted);}
.kc-ph-row b{font-family:var(--mono);}
.kc-ph-tabs{margin-top:auto;display:flex;justify-content:space-around;padding:14px 0 4px;border-top:1px solid rgba(0,0,0,.05);}
.kc-ph-tabs i{width:22px;height:22px;border-radius:7px;background:var(--surface);}
.kc-ph-tabs .kc-on{background:linear-gradient(135deg,var(--accent),var(--accent2));}

@media(max-width:880px){
  .kc-dl-main{grid-template-columns:1fr;gap:48px;text-align:center;}
  .kc-dl-copy{display:flex;flex-direction:column;align-items:center;}
  .kc-dl-stores,.kc-dl-form{justify-content:center;}
}
@media(prefers-reduced-motion:reduce){.kc-dl-bokeh span,.kc-phone{animation:none!important;}}
`
