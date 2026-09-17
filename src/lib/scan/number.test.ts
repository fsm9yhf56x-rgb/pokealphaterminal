import { describe, expect, it } from 'vitest'
import { normalizeCardNumber, normalizedCardNumberSql } from './number'

describe('normalizeCardNumber', () => {
  it.each([
    ['62', '62'],
    ['062', '62'],
    ['62/64', '62'],
    [' 062/064 ', '62'],
    ['GG18', 'gg18'],
    ['000', '0'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeCardNumber(input)).toBe(expected)
  })
})

describe('normalizedCardNumberSql', () => {
  it('normalizes trusted SQL expressions', () => {
    expect(normalizedCardNumberSql('kp.number')).toContain("split_part(kp.number, '/', 1)")
    expect(normalizedCardNumberSql('$2::text')).toContain("split_part($2::text, '/', 1)")
  })
})
