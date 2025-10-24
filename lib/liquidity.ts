import { OptionContract } from './types'

export function mid(o: OptionContract){
  const m = (o.bid + o.ask)/2
  return Number.isFinite(m) ? m : 0
}

export function isLiquid(o: OptionContract){
  const spread = o.ask - o.bid
  const m = mid(o)
  if (m <= 0) return false
  const tight = spread <= Math.max(0.15*m, 0.05) // 15% or $0.05
  const oiok = (o.oi ?? 0) >= 50
  return tight && oiok
}
