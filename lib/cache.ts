const cache = new Map<string, { t: number, v: any }>()

export function memo<T=any>(key:string, getter:()=>Promise<T>, ttlMs=15_000): Promise<T> {
  const now = Date.now()
  const hit = cache.get(key)
  if (hit && now - hit.t < ttlMs) return Promise.resolve(hit.v as T)
  return getter().then(v => {
    cache.set(key, {t: now, v})
    return v
  })
}
