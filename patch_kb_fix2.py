#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/cartes/Encyclopedie.tsx')
s = f.read_text('utf-8')

# 1. Remove early useEffect (already done? check)
early = """  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {"""
if early in s:
    end = s.find("  }, [lightbox, search, filtered])")
    if end > 0:
        end += len("  }, [lightbox, search, filtered])")
        start = s.find("  // Keyboard navigation\n  useEffect")
        s = s[:start] + s[end:]
        print('  > removed early')

# 2. Add after the correct line
old = "  }, [allCards, filEra, filSet, search, sort])"
assert old in s, "CIBLE: " + repr(old)
new = """  }, [allCards, filEra, filSet, search, sort])

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
        const ci = sc.findIndex(c=>c.id===lightbox.id)
        if (e.key === 'ArrowLeft' && ci > 0) { e.preventDefault(); setLightbox(sc[ci-1]) }
        if (e.key === 'ArrowRight' && ci < sc.length-1) { e.preventDefault(); setLightbox(sc[ci+1]) }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightbox, search, filtered])"""

s = s.replace(old, new, 1)
print('  > keyboard added')

f.write_text(s, 'utf-8')
print('OK')
