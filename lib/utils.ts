export function roundTo(x:number, step:number){
  return Math.round(x/step)*step
}

export function daysBetweenISO(a:string, b:string){
  const da = new Date(a)
  const db = new Date(b)
  return Math.max(0, Math.round((db.getTime()-da.getTime())/86400000))
}

export function todayISO(){
  const d = new Date()
  // normalize to UTC date part
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth()+1).padStart(2,'0')
  const day = String(d.getUTCDate()).padStart(2,'0')
  return `${y}-${m}-${day}`
}
