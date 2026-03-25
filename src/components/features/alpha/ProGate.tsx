'use client'

import { ReactNode } from 'react'

type Feature = { icon: string; label: string }

const CFG: Record<string, { title:string; desc:string; preview:string; features:Feature[] }> = {
  signals: {
    title:   'Alpha Signals',
    desc:    "L'IA détecte en temps réel les cartes sous-évaluées avant que le marché ne les remarque. Signaux classés S / A / B avec score de confiance, raison détaillée et cible de prix.",
    preview: '6 signaux actifs maintenant',
    features: [
      { icon:'⚡', label:'Signaux S / A / B illimités' },
      { icon:'🎯', label:'Score de confiance IA' },
      { icon:'📊', label:'PSA Pop · cible de prix' },
      { icon:'🔔', label:'Alertes en temps réel' },
    ],
  },
  deals: {
    title:   'Deal Hunter',
    desc:    "Scanne eBay et Cardmarket toutes les 15 minutes pour détecter les cartes listées sous leur valeur marché.",
    preview: '8 deals détectés maintenant',
    features: [
      { icon:'🔍', label:'Scan eBay + Cardmarket + TCGPlayer' },
      { icon:'⏱', label:'Mise à jour toutes les 15 min' },
      { icon:'🌐', label:'Filtres langue · condition · source' },
      { icon:'❤️', label:'Sauvegarde tes deals favoris' },
    ],
  },
  whales: {
    title:   'Whale Tracker',
    desc:    "Suis les plus grands collectionneurs Pokémon dans le monde. Vois ce que les acheteurs LEGEND accumulent en temps réel et reçois un signal Dexy à chaque gros move.",
    preview: "4 whales trackés · 10 moves aujourd'hui",
    features: [
      { icon:'🐋', label:'4 profils LEGEND trackés' },
      { icon:'📡', label:'Feed de moves en temps réel' },
      { icon:'🤖', label:'Signal Dexy sur chaque gros move' },
      { icon:'📈', label:'Volumes · portefeuilles · stratégies' },
    ],
  },
  dexy: {
    title:   'Dexy AI',
    desc:    "Un analyste TCG IA disponible 24h/24, propulsé par Claude. Analyse de cartes, comparaisons d'investissement, stratégies portfolio — avec contexte de marché réel intégré.",
    preview: 'Requêtes illimitées avec Pro',
    features: [
      { icon:'🤖', label:'Propulsé par Claude (Anthropic)' },
      { icon:'💬', label:'Requêtes illimitées' },
      { icon:'📊', label:'Contexte marché TCG intégré' },
      { icon:'🎯', label:'Analyse cartes · stratégies · ROI' },
    ],
  },
}

export function ProGate({ page, children }: { page: keyof typeof CFG; children: ReactNode }) {
  const cfg = CFG[page]

  return (
    <>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        .pro-cta:hover    { transform:translateY(-1px) !important; box-shadow:0 8px 28px rgba(224,48,32,0.55) !important; }
      `}</style>

      <div style={{ animation:'fadeIn 0.25s ease-out', width:'100%' }}>

        <div style={{ marginBottom:'28px' }}>
          <p style={{ fontSize:'10px', color:'#AAA', textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 4px', fontFamily:'var(--font-display)' }}>Alpha</p>
          <h1 style={{ fontSize:'26px', fontWeight:600, color:'#111', fontFamily:'var(--font-display)', letterSpacing:'-0.5px', margin:0 }}>{cfg.title}</h1>
        </div>

        <div style={{ background:'linear-gradient(135deg,#111 0%,#1A1208 100%)', borderRadius:'20px', padding:'44px 40px', marginBottom:'24px', position:'relative', overflow:'hidden', textAlign:'center' }}>
          <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle at 20% 60%, rgba(255,107,53,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 40%, rgba(224,48,32,0.07) 0%, transparent 50%)', pointerEvents:'none' }} />

          <div style={{ width:'64px', height:'64px', borderRadius:'18px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:'28px', animation:'float 3s ease-in-out infinite' }}>🔒</div>

          <div style={{ fontSize:'11px', fontWeight:700, color:'#E03020', textTransform:'uppercase', letterSpacing:'0.15em', fontFamily:'var(--font-display)', marginBottom:'10px' }}>Fonctionnalité Pro</div>
          <div style={{ fontSize:'26px', fontWeight:700, color:'#fff', fontFamily:'var(--font-display)', letterSpacing:'-0.5px', marginBottom:'12px' }}>{cfg.title}</div>
          <p style={{ fontSize:'14px', color:'rgba(255,255,255,0.5)', maxWidth:'460px', margin:'0 auto 28px', lineHeight:1.75, fontFamily:'var(--font-sans)' }}>{cfg.desc}</p>

          <div style={{ display:'flex', justifyContent:'center', gap:'10px', marginBottom:'32px', flexWrap:'wrap' }}>
            {cfg.features.map(f=>(
              <div key={f.label} style={{ display:'flex', alignItems:'center', gap:'8px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', padding:'8px 14px' }}>
                <span style={{ fontSize:'15px' }}>{f.icon}</span>
                <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.65)', fontFamily:'var(--font-display)', whiteSpace:'nowrap' }}>{f.label}</span>
              </div>
            ))}
          </div>

          <button className="pro-cta" style={{ padding:'15px 40px', borderRadius:'14px', background:'linear-gradient(135deg,#E03020,#FF4433)', color:'#fff', border:'none', fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:'var(--font-display)', boxShadow:'0 6px 20px rgba(224,48,32,0.45)', letterSpacing:'-0.2px', transition:'all 0.15s' }}>
            Passer Pro — €9,99 / mois
          </button>
          <div style={{ marginTop:'10px', fontSize:'11px', color:'rgba(255,255,255,0.2)', fontFamily:'var(--font-display)' }}>Sans engagement · Annulation à tout moment</div>

          <div style={{ marginTop:'20px', display:'inline-flex', alignItems:'center', gap:'6px', background:'rgba(46,158,106,0.15)', border:'1px solid rgba(46,158,106,0.25)', borderRadius:'20px', padding:'5px 14px' }}>
            <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#2E9E6A' }} />
            <span style={{ fontSize:'11px', color:'rgba(46,158,106,0.9)', fontFamily:'var(--font-display)', fontWeight:500 }}>{cfg.preview}</span>
          </div>
        </div>

        <div style={{ position:'relative', overflow:'hidden', borderRadius:'14px' }}>
          <div style={{ fontSize:'11px', fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:'0.09em', fontFamily:'var(--font-display)', marginBottom:'12px', display:'flex', alignItems:'center', gap:'8px' }}>
            <div style={{ width:'3px', height:'14px', borderRadius:'2px', background:'#EBEBEB' }} />
            Aperçu
          </div>
          <div style={{ filter:'blur(5px)', pointerEvents:'none', userSelect:'none' as const, opacity:0.65 }}>
            {children}
          </div>
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'220px', background:'linear-gradient(to bottom, transparent, #FAFAFA)', pointerEvents:'none' }} />
        </div>

      </div>
    </>
  )
}
