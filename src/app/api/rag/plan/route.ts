import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const ragUrl = req.nextUrl.searchParams.get('base')
  if (!ragUrl) return new Response('Missing base', { status: 400 })
  const body = await req.text()
  const upstream = await fetch(`${ragUrl.replace(/\/$/, '')}/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  })
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' }
  })
}


