#!/usr/bin/env python3
"""F: keyboard navigation lightbox + search focus"""
from pathlib import Path

f = Path('src/components/features/cartes/Encyclopedie.tsx')
s = f.read_text('utf-8')

# Ajouter useEffect pour les raccourcis clavier
old_lightbox_state = "  const [lightbox,   setLightbox]    = useState<EnrichedCard|null>(null)"
new_lightbox_state = """  const [lightbox,   setLightbox]    = useState<EnrichedCard|null>(null)

  // Keyboard navigation
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

assert old_lightbox_state in s, "CIBLE LIGHTBOX STATE"
s = s.replace(old_lightbox_state, new_lightbox_state, 1)
print('  > keyboard nav')

f.write_text(s, 'utf-8')
print('OK')
