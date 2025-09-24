import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const base = req.nextUrl.searchParams.get('base')
  if (!base) {
    return NextResponse.json({ error: 'Missing base parameter' }, { status: 400 })
  }
  const url = `${base.replace(/\/$/, '')}/api/tags`
  try {
    const res = await fetch(url, { method: 'GET', cache: 'no-store' })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ models: [] }, { status: 503 })
  }
}


