import { OptionsChain } from './types'

export async function getIVR(_symbol:string, chain?: OptionsChain){
  // Simplified: compute IVR from synthetic history around current ATM IV
  const cur = chain?.atmIV ?? 0.5
  const minIV = Math.max(0.1, cur - 0.25)
  const maxIV = Math.min(1.2, cur + 0.25)
  const ivr = 100 * (cur - minIV) / Math.max(1e-6, (maxIV - minIV))
  return { ivr, curIV: cur, minIV, maxIV }
}
