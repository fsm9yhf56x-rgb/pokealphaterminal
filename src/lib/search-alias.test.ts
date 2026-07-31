import { describe, it, expect } from 'vitest'
import { norm, setIdAliases, numberAliases, aliasBag, matchQuery,
  compileQuery, matchCompiled, scoreCompiled, queryTokenCount } from './search-alias'

describe('norm', () => {
  it('retire accents et ponctuation, garde la barre de fraction', () => {
    expect(norm('Évolution Céleste')).toBe('evolution celeste')
    expect(norm('Herbizarre ME1 (134/132)')).toBe('herbizarre me1 134/132')
  })
})

describe('setIdAliases', () => {
  it('donne le code FR avec et sans zero', () => {
    expect(setIdAliases('swsh1')).toEqual(expect.arrayContaining(['swsh1', 'eb1', 'eb01']))
    expect(setIdAliases('me01')).toEqual(expect.arrayContaining(['me01', 'me1']))
    expect(setIdAliases('sv03.5')).toEqual(expect.arrayContaining(['ev3.5']))
  })
})

describe('numberAliases', () => {
  it('expose le numero seul et sur le total', () => {
    expect(numberAliases('134', 132)).toEqual(expect.arrayContaining(['134', '134/132']))
  })
})

describe('matchQuery', () => {
  const carte = aliasBag({
    name: 'Herbizarre', setId: 'me01', setName: 'Méga-Évolution',
    setNameEn: 'Mega Evolution', localId: '134', setTotal: 132,
  })
  const swsh1 = aliasBag({
    name: 'Zacian V', setId: 'swsh1', setName: 'Épée et Bouclier',
    setNameEn: 'Sword & Shield', localId: '138', setTotal: 202,
  })

  it('trouve par code de serie', () => {
    expect(matchQuery(swsh1, 'EB1')).toBe(true)
    expect(matchQuery(swsh1, 'eb01')).toBe(true)
  })
  it('trouve sur un copier-coller de marketplace', () => {
    expect(matchQuery(carte, 'Herbizarre ME1 (134/132)')).toBe(true)
  })
  it('trouve par nom de serie anglais', () => {
    expect(matchQuery(swsh1, 'sword shield zacian')).toBe(true)
  })
  it('ignore les accents', () => {
    expect(matchQuery(swsh1, 'epee et bouclier')).toBe(true)
  })
  it('un numero ne matche pas un fragment', () => {
    expect(matchQuery(carte, '13')).toBe(false)
    expect(matchQuery(carte, '134')).toBe(true)
  })
  it('tous les jetons doivent trouver preneur', () => {
    expect(matchQuery(carte, 'herbizarre eb1')).toBe(false)
  })
})

describe('degradation', () => {
  const carte = aliasBag({
    name: 'Herbizarre', setId: 'me01', setName: 'Méga-Évolution',
    setNameEn: 'Mega Evolution', localId: '134', setTotal: 132,
  })
  it('un jeton fautif ne doit pas effacer un jeton juste', () => {
    const c = compileQuery('em1 herbi')
    expect(matchCompiled(carte, c)).toBe(false)   // conjonction stricte : non
    expect(scoreCompiled(carte, c)).toBe(1)       // mais 'herbi' correspond
    expect(queryTokenCount(c)).toBe(2)
  })
})
