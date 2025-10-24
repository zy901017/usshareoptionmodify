import { NextRequest, NextResponse } from 'next/server'
import { taScore } from '@/lib/ta'

export const runtime = 'nodejs'

export async function GET(req: NextRequest){
  const { searchParams } = new URL(req.url)
  const symbol = (searchParams.get('symbol')||'').toUpperCase()
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 })
  const snap = await taScore(symbol)
  return NextResponse.json(snap)
}
