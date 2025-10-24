import { NextResponse } from 'next/server'
import { getGEXLevel } from '@/lib/gexbot'

export const runtime = 'nodejs'

export async function GET(){
  const level = await getGEXLevel()
  return NextResponse.json({ level, note: level === 'high' ? 'Gamma positive; tighter moves' : level === 'low' ? 'Gamma negative; wider swings' : 'Neutral' })
}
