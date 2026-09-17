/**
 * Canonical Pokémon card-number handling shared by scan resolvers.
 *
 * Catalog imports do not all use the same representation: the same card can be
 * stored as "62", "062" or "62/64". Normalizing both the OCR value and the SQL
 * column prevents valid scans from being rejected at the encyclopedia boundary.
 */
export function normalizeCardNumber(value: string): string {
  const head = String(value ?? '').split('/')[0].trim().toLowerCase()
  return head.replace(/^0+(?=\d)/, '')
}

export function normalizedCardNumberSql(expression: string): string {
  return `lower(COALESCE(NULLIF(ltrim(split_part(${expression}, '/', 1), '0'), ''), '0'))`
}
