import { NextRequest, NextResponse } from 'next/server'
import { getIVR } from '@/lib/ivr'
import { getOptionsChain } from '@/lib/alphaVantage'

export const runtime = 'nodejs'

export async function GET(req: NextRequest){
  const { searchParams } = new URL(req.url)
  const symbol = (searchParams.get('symbol')||'').toUpperCase()
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 })
  const chain = await getOptionsChain(symbol).catch(()=>null)
  const ivr = await getIVR(symbol, chain ?? undefined as any)
  return NextResponse.json(ivr)
}
