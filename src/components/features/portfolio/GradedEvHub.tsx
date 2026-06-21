"use client"
// ─────────────────────────────────────────────────────────────────────────────
// GradedEvHub — page Portfolio > Graded.ev
//
// État actuel HONNÊTE : le moteur Graded.ev fonctionne déjà sur chaque fiche
// carte. Le dashboard d'analyse en masse du portfolio (scan de toutes les cartes
// raw, tri par gain espéré) est le prochain chantier. En attendant :
//   - Premium : on explique le concept + on renvoie vers les fiches (où ça marche)
//   - Free/Pro : teaser de conversion vers Premium
//
// Aucun faux dashboard, aucune donnée simulée.
// ─────────────────────────────────────────────────────────────────────────────
import { usePlan } from "@/lib/usePlan"
import { SNOW, FONT } from "@/lib/design/snow"

export function GradedEvHub() {
  const { isPremium } = usePlan()

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "8px 0 60px" }}>
      {/* En-tête */}
      <div style={{ marginBottom: 8 }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display, letterSpacing: "-0.02em", margin: 0 }}>
          Faut-il grader tes cartes ?
        </h1>
        <p style={{ fontSize: 15, color: SNOW.muted, fontFamily: FONT.body, lineHeight: 1.55, marginTop: 12, maxWidth: 620 }}>
          Graded.ev calcule le gain réellement espéré d'une gradation PSA, à partir
          de la distribution réelle des notes et des prix par grade — frais déduits,
          sans promesse du meilleur cas. Tu sais quelles cartes valent le coup, et
          lesquelles valent autant en l'état.
        </p>
      </div>

      {/* Carte principale */}
      <div style={{ marginTop: 28, borderRadius: 20, background: SNOW.surface, border: `1px solid ${SNOW.border}`, padding: "32px 34px" }}>
        {isPremium ? (
          // ── PREMIUM : dashboard à venir + renvoi vers les fiches ──
          <>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 13px", borderRadius: 9, background: "rgba(0,163,104,0.10)", color: "#00A368", fontSize: 12, fontWeight: 700, fontFamily: FONT.display, letterSpacing: ".02em", marginBottom: 18 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00A368", display: "inline-block" }} />
              Inclus dans ton plan Premium
            </div>
            <div style={{ fontSize: 19, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display, marginBottom: 10 }}>
              Le tableau de bord de ta collection arrive
            </div>
            <p style={{ fontSize: 14.5, color: SNOW.muted, fontFamily: FONT.body, lineHeight: 1.6, marginBottom: 8, maxWidth: 600 }}>
              Bientôt, Graded.ev analysera toutes les cartes non gradées de ton
              portfolio d'un coup et les classera par gain espéré net — pour repérer
              en un regard celles qui méritent l'envoi en gradation.
            </p>
            <p style={{ fontSize: 14.5, color: SNOW.muted, fontFamily: FONT.body, lineHeight: 1.6, marginBottom: 24, maxWidth: 600 }}>
              En attendant, l'analyse complète est déjà disponible sur chaque fiche
              carte, dans la section <strong style={{ color: SNOW.ink }}>« Faut-il la grader ? »</strong>.
            </p>
            <a href="/cartes" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 22px", borderRadius: 12, background: "#1D1D1F", color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: FONT.display, textDecoration: "none" }}>
              Explorer mes cartes
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </a>
          </>
        ) : (
          // ── FREE / PRO : teaser de conversion ──
          <>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 13px", borderRadius: 9, background: SNOW.surfaceSoft, border: `1px solid ${SNOW.border}`, color: SNOW.muted, fontSize: 11.5, fontWeight: 700, fontFamily: FONT.display, letterSpacing: ".03em", marginBottom: 18 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={SNOW.muted} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Premium
            </div>
            <div style={{ fontSize: 19, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display, marginBottom: 12 }}>
              Découvre quelles cartes valent le coup d'être gradées
            </div>
            <div style={{ display: "grid", gap: 12, marginBottom: 26, maxWidth: 560 }}>
              {[
                ["Gain espéré net", "Le vrai gain après frais de gradation, pas le prix d'un PSA 10 hypothétique."],
                ["Probabilité de note", "Basée sur la distribution PSA réelle — combien obtiennent vraiment un 10, un 9…"],
                ["Recommandation claire", "Grader, garder en l'état, ou revendre : un verdict pour chaque carte."],
              ].map(([t, d]) => (
                <div key={t} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ marginTop: 5, width: 6, height: 6, borderRadius: "50%", background: SNOW.red, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 600, color: SNOW.ink, fontFamily: FONT.display }}>{t}</div>
                    <div style={{ fontSize: 13.5, color: SNOW.muted, fontFamily: FONT.body, lineHeight: 1.5 }}>{d}</div>
                  </div>
                </div>
              ))}
            </div>
            <a href="/abonnement" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 22px", borderRadius: 12, background: "#1D1D1F", color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: FONT.display, textDecoration: "none" }}>
              Débloquer Graded.ev avec Premium
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </a>
          </>
        )}
      </div>
    </div>
  )
}
