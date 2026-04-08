#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/cartes/Encyclopedie.tsx')
s = f.read_text('utf-8')

# 1. Retirer le useEffect mal place
old = """  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // / = focus search
      if (e.key === '/' && !lightbox && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        const input = document.querySelector<HTMLInputElement>('input[placeholder*="Rechercher"]')
        input?.focus()
        return
      }
      // Escape = close lightbox or clear search
      if (e.key === 'Escape') {
        if (lightbox) { setLightbox(null); return }
        if (search) { setSearch(''); return }
      }
      // Arrow keys in lightbox
      if (lightbox) {
        const setCards = filtered.filter(c=>c.setId===lightbox.setId).sort((a,b)=>parseInt(a.localId)-parseInt(b.localId))
        const idx = setCards.findIndex(c=>c.id===lightbox.id)
        if (e.key === 'ArrowLeft' && idx > 0) { e.preventDefault(); setLightbox(setCards[idx-1]) }
        if (e.key === 'ArrowRight' && idx < setCards.length-1) { e.preventDefault(); setLightbox(setCards[idx+1]) }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightbox, search, filtered])"""

assert old in s, "CIBLE OLD"
s = s.replace(old, "", 1)
print('  > removed early useEffect')

# 2. Ajouter apres filtered est defini
old_after = "  }, [allCards, filEra, filSet, filRarity, search, sort])"
new_after = """  }, [allCards, filEra, filSet, filRarity, search, sort])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !lightbox && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        const input = document.querySelector<HTMLInputElement>('input[placeholder*="Rechercher"]')
        input?.focus()
        return
      }
      if (e.key === 'Escape') {
        if (lightbox) { setLightbox(null); return }
        if (search) { setSearch(''); return }
      }
      if (lightbox) {
        const sc = filtered.filter(c=>c.setId===lightbox.setId).sort((a,b)=>parseInt(a.localId)-parseInt(b.localId))
        const idx = sc.findIndex(c=>c.id===lightbox.id)
        if (e.key === 'ArrowLeft' && idx > 0) { e.preventDefault(); setLightbox(sc[idx-1]) }
        if (e.key === 'ArrowRight' && idx < sc.length-1) { e.preventDefault(); setLightbox(sc[idx+1]) }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightbox, search, filtered])"""

assert old_after in s, "CIBLE AFTER"
s = s.replace(old_after, new_after, 1)
print('  > keyboard after filtered')

f.write_text(s, 'utf-8')
print('OK')
