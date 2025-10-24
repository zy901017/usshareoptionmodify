import { NextRequest, NextResponse } from 'next/server'
import { getQuote, getOptionsChain, getRiskFreeRate } from '@/lib/alphaVantage'
import { getOptionsChainYahoo } from '@/lib/yahoo'
import { getIVR } from '@/lib/ivr'
import { taScore } from '@/lib/ta'
import { chooseStrategies } from '@/lib/strategies'
import { getGEXLevel } from '@/lib/gexbot'
import { earningsWithin } from '@/lib/earnings'

export const runtime = 'nodejs'

export async function GET(req: NextRequest){
  const { searchParams } = new URL(req.url)
  const symbol = (searchParams.get('symbol')||'').toUpperCase()
  const exp = searchParams.get('exp')||undefined
  const targetNet = Number(searchParams.get('targetNet')||150)
  const avoidEarnings = searchParams.get('avoidEarnings') !== 'false'
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 })
  try {
    const [quote, chainAV, r, gex, ta] = await Promise.all([
      getQuote(symbol),
      getOptionsChain(symbol, exp).catch(()=>null),
      getRiskFreeRate(),
      getGEXLevel(),
      taScore(symbol),
    ])
    const chain = chainAV ?? await getOptionsChainYahoo(symbol, exp).catch(()=>null)
    if (!chain) return NextResponse.json({ error: 'Options chain unavailable' }, { status: 502 })
    const ivr = await getIVR(symbol, chain)
    const earningsSoon = avoidEarnings ? await earningsWithin(symbol, 7) : false
    const S = quote.last
    const DTE = chain.dte
    const iv_atm = chain.atmIV ?? 0.5
    const sigma = S * iv_atm * Math.sqrt(Math.max(1, DTE)/365)
    const strategies = chooseStrategies({ symbol, S, chain, iv_atm, DTE, r, ivr, ta, targetNet, avoidEarnings, gex })
      .map(s => earningsSoon ? ({...s, score: Math.max(0, s.score - 5), reasons: [...s.reasons, '近7日有财报，已扣分']}) : s)

    const summary = {
      S, DTE, iv_atm, ivr: (ivr as any).ivr ?? ivr, sigma: [Number((S - sigma).toFixed(2)), Number((S + sigma).toFixed(2))] as [number,number],
      gex, earningsSoon
    }
    return NextResponse.json({ summary, strategies })
  } catch (e:any) {
    return NextResponse.json({ error: e.message || 'internal error' }, { status: 500 })
  }
}
