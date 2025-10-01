import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const ragUrl = req.nextUrl.searchParams.get('base')
  if (!ragUrl) return new Response('Missing base', { status: 400 })
  
  try {
    const upstream = await fetch(`${ragUrl.replace(/\/$/, '')}/queries`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    
    if (!upstream.ok) {
      return new Response(upstream.body, {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch queries' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

