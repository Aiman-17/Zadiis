import { NextRequest, NextResponse } from 'next/server'
import { recalculateScores } from '@/lib/scoring'

// Daily score refresh — called by Vercel Cron or any external scheduler.
// Protect with CRON_SECRET env var to prevent public invocation.
// Vercel Cron setup: add to vercel.json:
//   { "crons": [{ "path": "/api/cron/scores", "schedule": "0 2 * * *" }] }
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await recalculateScores()
    return NextResponse.json({ success: true, timestamp: new Date().toISOString() })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
