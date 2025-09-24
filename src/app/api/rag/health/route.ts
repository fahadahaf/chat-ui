import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const ragUrl = req.nextUrl.searchParams.get('base')
  if (!ragUrl) return NextResponse.json({ ok: false }, { status: 400 })
  try {
    const res = await fetch(`${ragUrl.replace(/\/$/, '')}/health`, { cache: 'no-store' })
    return NextResponse.json({ ok: res.ok }, { status: res.ok ? 200 : res.status })
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 })
  }
}


