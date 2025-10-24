export function normCdf(x:number){
  // Abramowitz-Stegun 7.1.26 approximation
  const t = 1/(1+0.2316419*Math.abs(x))
  const d = Math.exp(-0.5*x*x)/Math.sqrt(2*Math.PI)
  let p = d*(0.31938153*t - 0.356563782*t**2 + 1.781477937*t**3 - 1.821255978*t**4 + 1.330274429*t**5)
  return x>0 ? 1-p : p
}

export function clamp(x:number, lo:number, hi:number){
  return Math.max(lo, Math.min(hi, x))
}

export function mean(xs:number[]){
  if (!xs.length) return 0
  return xs.reduce((a,b)=>a+b,0)/xs.length
}
