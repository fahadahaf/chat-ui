import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const base = req.nextUrl.searchParams.get('base')
  if (!base) {
    return new Response('Missing base parameter', { status: 400 })
  }

  const body = await req.text()
  const upstream = await fetch(`${base.replace(/\/$/, '')}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })

  // Stream raw response through
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' }
  })
}


