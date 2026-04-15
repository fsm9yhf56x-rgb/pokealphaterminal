import { NextResponse } from 'next/server'

// eBay Marketplace Account Deletion notification endpoint
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const challengeCode = searchParams.get('challenge_code')
  if (challengeCode) {
    const crypto = require('crypto')
    const verificationToken = 'pokealpha_2026'
    const endpoint = 'https://pokealphaterminal.vercel.app/api/ebay/deletion'
    const hash = crypto.createHash('sha256')
    hash.update(challengeCode + verificationToken + endpoint)
    return NextResponse.json({ challengeResponse: hash.digest('hex') })
  }
  return NextResponse.json({ status: 'ok' })
}

export async function POST() {
  // We don't store eBay user data, so nothing to delete
  return NextResponse.json({ status: 'acknowledged' })
}
