export async function getGEXLevel(): Promise<'low'|'neutral'|'high'> {
  const key = process.env.GEXBOT_API_KEY
  if (!key) return 'neutral'
  try {
    // Placeholder: replace with actual GEXBOT endpoint
    // const res = await fetch('https://api.gexbot.example/level?key='+key, { cache: 'no-store' })
    // const data = await res.json()
    // return data.level || 'neutral'
    return 'neutral'
  } catch {
    return 'neutral'
  }
}
