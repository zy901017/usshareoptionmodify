import { OptionsChain, StrategyResult, OptionContract } from './types'
import { normCdf, clamp } from './math'
import { isLiquid, mid } from './liquidity'
import { roundTo } from './utils'

type Ctx = {
  symbol: string
  S: number
  chain: OptionsChain
  iv_atm: number
  DTE: number
  r: number
  ivr: number | { ivr: number }
  ta: { score: number }
  targetNet: number
  avoidEarnings: boolean
  gex: 'low'|'neutral'|'high'
}

function sigmaPrice(S:number, iv:number, DTE:number){
  return S * iv * Math.sqrt(Math.max(1, DTE)/365)
}

function probInRange(S:number, iv:number, DTE:number, L:number, U:number){
  const std = S * iv * Math.sqrt(Math.max(1, DTE)/365)
  const zL = (L - S) / std
  const zU = (U - S) / std
  return clamp(normCdf(zU) - normCdf(zL), 0, 1)
}

function probAbove(S:number, iv:number, DTE:number, K:number){
  const std = S * iv * Math.sqrt(Math.max(1, DTE)/365)
  const z = (K - S) / std
  return clamp(1 - normCdf(z), 0, 1)
}

function pickStrike(options: OptionContract[], type:'call'|'put', target:number){
  // nearest strike to target
  const pool = options.filter(o=>o.type===type)
  let best = pool[0]
  let bestDist = Infinity
  for (const o of pool){
    const dist = Math.abs(o.strike - target)
    if (dist < bestDist){ best = o; bestDist = dist }
  }
  return best
}

function priceSpread(legs: OptionContract[]){
  // credit from shorts minus longs (mid prices)
  let credit = 0
  for (const o of legs){
    const m = mid(o)
    credit += (o as any).side === 'short' ? +m : -m
  }
  return credit
}

function liqScore(legs: OptionContract[]){
  const flags = legs.map(isLiquid)
  const ratio = flags.filter(Boolean).length / legs.length
  return ratio // 0..1
}

export function chooseStrategies(ctx: Ctx){
  const { S, chain, iv_atm, DTE, targetNet } = ctx
  const kSigma = ctx.gex === 'high' ? 1.1 : ctx.gex === 'low' ? 0.85 : 1.0
  const sigma = sigmaPrice(S, iv_atm, DTE)

  const candidates: StrategyResult[] = []

  // Iron Condor
  ;(()=>{
    const widthChoices = ctx.gex === 'high' ? [12, 15] : ctx.gex === 'low' ? [8, 10] : [10, 12]
    for (const width of widthChoices){
      const putShortK = roundTo(S - kSigma*sigma, 0.5)
      const callShortK = roundTo(S + kSigma*sigma, 0.5)
      const putShort = pickStrike(chain.options, 'put', putShortK)
      const putLong = pickStrike(chain.options, 'put', putShort.strike - width)
      const callShort = pickStrike(chain.options, 'call', callShortK)
      const callLong = pickStrike(chain.options, 'call', callShort.strike + width)
      const legs = [
        Object.assign({}, putShort, {side:'short'}),
        Object.assign({}, putLong,  {side:'long'}),
        Object.assign({}, callShort,{side:'short'}),
        Object.assign({}, callLong, {side:'long'}),
      ]
      const credit = priceSpread(legs)
      const maxRisk = (width - credit) * 100
      const netReceive = credit * 100
      const qty = Math.max(1, Math.ceil(targetNet / Math.max(1, netReceive)))
      const winProb = probInRange(S, iv_atm, DTE, putShort.strike, callShort.strike)
      const roc = netReceive / maxRisk
      const liq = liqScore(legs)
      const ivr = typeof ctx.ivr === 'number' ? ctx.ivr : ctx.ivr.ivr
      const score = 30*winProb + 20*roc + 15*(ctx.ta.score/100) + 15*(ivr/100) + 10*liq + 5*(ctx.gex==='high'?1:ctx.gex==='low'?0.6:0.8)
      candidates.push({ type:'Iron Condor', legs: formatLegs(legs), width, credit, qty, netReceive: netReceive*qty, maxRisk: maxRisk*qty, winProb, roc, score, reasons:[`IVR ${(ivr|0)} 高卖波动`,`±1σ区间中部`,`GEX ${ctx.gex}`] })
    }
  })()

  // Put Credit Spread (bullish)
  ;(()=>{
    const width = 10
    const putShortK = roundTo(S - 0.9*kSigma*sigma, 0.5)
    const putLongK = putShortK - width
    const putShort = pickStrike(chain.options, 'put', putShortK)
    const putLong = pickStrike(chain.options, 'put', putLongK)
    const legs = [
      Object.assign({}, putShort, {side:'short'}),
      Object.assign({}, putLong,  {side:'long'}),
    ]
    const credit = priceSpread(legs)
    const maxRisk = (width - credit) * 100
    const netReceive = credit * 100
    const qty = Math.max(1, Math.ceil(targetNet / Math.max(1, netReceive)))
    const winProb = probAbove(S, iv_atm, DTE, putShort.strike)
    const roc = netReceive / maxRisk
    const liq = liqScore(legs)
    const ivr = typeof ctx.ivr === 'number' ? ctx.ivr : ctx.ivr.ivr
    const score = 30*winProb + 20*roc + 15*(ctx.ta.score/100) + 15*(ivr/100) + 10*liq + 5*(ctx.gex!=='low'?1:0.7)
    candidates.push({ type:'Put Credit Spread', legs: formatLegs(legs), width, credit, qty, netReceive: netReceive*qty, maxRisk: maxRisk*qty, winProb, roc, score, reasons:[`短腿≈-0.9σ`,`TA偏多 ${ctx.ta.score}`] })
  })()

  // Iron Butterfly
  ;(()=>{
    const width = 10
    const shortK = roundTo(S, 1)
    const putLong = pickStrike(chain.options, 'put', shortK - width)
    const callLong = pickStrike(chain.options, 'call', shortK + width)
    const shortPut = pickStrike(chain.options, 'put', shortK)
    const shortCall = pickStrike(chain.options, 'call', shortK)
    const legs = [
      Object.assign({}, shortPut, {side:'short'}),
      Object.assign({}, shortCall,{side:'short'}),
      Object.assign({}, putLong,  {side:'long'}),
      Object.assign({}, callLong, {side:'long'}),
    ]
    const credit = priceSpread(legs)
    const maxRisk = (width - credit) * 100
    const netReceive = credit * 100
    const qty = Math.max(1, Math.ceil(targetNet / Math.max(1, netReceive)))
    const winProb = probInRange(S, iv_atm, DTE, shortK - 0.5*width, shortK + 0.5*width)
    const roc = netReceive / maxRisk
    const ivr = typeof ctx.ivr === 'number' ? ctx.ivr : ctx.ivr.ivr
    const liq = liqScore(legs)
    const score = 30*winProb + 20*roc + 15*(ctx.ta.score/100) + 15*(ivr/100) + 10*liq + 5
    candidates.push({ type:'Iron Butterfly', legs: formatLegs(legs), width, credit, qty, netReceive: netReceive*qty, maxRisk: maxRisk*qty, winProb, roc, score, reasons:[`IVR ${(ivr|0)} 偏高`,`趋势不明确适合收Theta`] })
  })()

  // Covered Call (synthetic evaluation; assumes 100 shares if user selects; here we price only option leg)
  ;(()=>{
    const callShortK = roundTo(S + 0.5*sigma, 1)
    const callShort = pickStrike(chain.options, 'call', callShortK)
    const legs = [ Object.assign({}, callShort, {side:'short'}) ]
    const credit = mid(callShort)
    const netReceive = credit * 100
    const qty = Math.max(1, Math.ceil(targetNet / Math.max(1, netReceive)))
    const maxRisk = 0 // option leg alone has no defined max loss without stock; we set 0 and handle ROC as 0
    const winProb = probInRange(S, iv_atm, DTE, -Infinity, callShort.strike)
    const roc = 0
    const liq = liqScore(legs)
    const score = 20*winProb + 15*liq + 10
    candidates.push({ type:'Covered Call', legs: formatLegs(legs), credit, qty, netReceive: netReceive*qty, maxRisk, winProb, roc, score, reasons:[`以卖出看涨覆盖成本，偏中性/小幅看涨`] })
  })()

  // Call Ratio Spread (1x2) — buy 1 call near ATM, sell 2 OTM calls; aim for low/zero debit
  ;(()=>{
    const longK = roundTo(S + 0.2*sigma, 1)
    const shortK = roundTo(S + 0.9*sigma, 1)
    const long = pickStrike(chain.options, 'call', longK)
    const short = pickStrike(chain.options, 'call', shortK)
    const legs = [
      Object.assign({}, long, {side:'long'}),
      Object.assign({}, short,{side:'short'}),
      Object.assign({}, short,{side:'short'}),
    ]
    const credit = priceSpread(legs)
    const netReceive = credit * 100
    const qty = Math.max(1, Math.ceil(targetNet / Math.max(1, Math.abs(netReceive)))) // allow debit/credit
    const maxRisk = netReceive >= 0 ? Infinity : Infinity // risk can be unbounded without management
    const winProb = probInRange(S, iv_atm, DTE, -Infinity, short.strike) * 0.9
    const roc = 0
    const score = 15*winProb + 10
    candidates.push({ type:'Call Ratio Spread', legs: formatLegs(legs), credit, qty, netReceive: netReceive*qty, maxRisk, winProb, roc, score, reasons:[`高IV下博弈上沿，需严格风控`] })
  })()

  // Calendar Spread (ATM): sell near, buy next expiration (simplified using same chain pricing proxy)
  ;(()=>{
    // In absence of multi-exp data, approximate with current chain as same-exp diagonal-like debit
    const longK = roundTo(S, 1)
    const long = pickStrike(chain.options, 'call', longK)
    const short = pickStrike(chain.options, 'call', longK)
    const legs = [ Object.assign({}, long, {side:'long'}), Object.assign({}, short, {side:'short'}) ]
    const debit = Math.max(0.1, Math.abs(priceSpread(legs))*0.3) // approximate small debit
    const qty = Math.max(1, Math.ceil(targetNet / Math.max(1, 100*debit))) // aim target via multiple
    const maxRisk = 100*debit
    const winProb = 0.5
    const roc = 0
    const score = 10 + (ctx.ta.score/10)
    candidates.push({ type:'Calendar Spread', legs: formatLegs(legs), debit, qty, netReceive: -debit*100*qty, maxRisk: maxRisk*qty, winProb, roc, score, reasons:[`IV升水有利，趋势中性`] })
  })()

  // Diagonal Spread (bullish): buy longer-dated call, sell nearer OTM call (approximated)
  ;(()=>{
    const longK = roundTo(S - 0.2*sigma, 1)
    const shortK = roundTo(S + 0.6*sigma, 1)
    const long = pickStrike(chain.options, 'call', longK)
    const short = pickStrike(chain.options, 'call', shortK)
    const debit = Math.max(0.1, Math.abs(mid(long) - mid(short)))
    const qty = Math.max(1, Math.ceil(targetNet / Math.max(1, 100*debit)))
    const maxRisk = 100*debit
    const winProb = probInRange(S, iv_atm, DTE, -Infinity, short.strike)
    const roc = 0
    const score = 12 + 10*winProb
    candidates.push({ type:'Diagonal Spread', legs: formatLegs([Object.assign({}, long,{side:'long'}), Object.assign({}, short,{side:'short'})]), debit, qty, netReceive: -debit*100*qty, maxRisk: maxRisk*qty, winProb, roc, score, reasons:[`温和看涨，时间结构获利`] })
  })()

  // Collar (zero-cost attempt): sell OTM call, buy OTM put; aim near-zero net
  ;(()=>{
    const callK = roundTo(S + 0.8*sigma, 1)
    const putK  = roundTo(S - 0.8*sigma, 1)
    const c = pickStrike(chain.options, 'call', callK)
    const p = pickStrike(chain.options, 'put', putK)
    const legs = [ Object.assign({}, c,{side:'short'}), Object.assign({}, p,{side:'long'}) ]
    const credit = priceSpread(legs) // may be +/-
    const qty = Math.max(1, Math.ceil(targetNet / Math.max(1, Math.abs(credit*100)))) // scale to target
    const netReceive = credit * 100
    const maxRisk = Infinity // without stock, collar payoff undefined; treat as undefined risk
    const winProb = probInRange(S, iv_atm, DTE, putK, callK)
    const roc = 0
    const score = 10 + 10*winProb
    candidates.push({ type:'Collar', legs: formatLegs(legs), credit, qty, netReceive: netReceive*qty, maxRisk, winProb, roc, score, reasons:[`零成本保护区间，需结合持仓`] })
  })()

  // Filter: remove strategies with NaN or nonsense
  const sane = candidates.filter(c=> Number.isFinite(c.netReceive) && Number.isFinite(c.maxRisk) && Number.isFinite(c.winProb))

  // Sort by score desc
  sane.sort((a,b)=> b.score - a.score)

  // Return top 3
  return sane.slice(0,3)
}

function formatLegs(legs: any[]){
  // Keep only essential fields for UI clarity
  return legs.map(l=>({
    side: (l as any).side,
    type: l.type,
    strike: l.strike,
    exp: l.exp,
    iv: l.iv,
    bid: l.bid,
    ask: l.ask
  }))
}
