import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const ragUrl = req.nextUrl.searchParams.get('base')
  if (!ragUrl) return new Response('Missing base', { status: 400 })
  const body = await req.text()
  
  try {
    // For predefined queries, we just execute the plan directly
    // The RAG service's gremlin_execution function will handle it
    const planData = JSON.parse(body)
    
    // Call the RAG service's plan endpoint with a dummy text
    // and override with the predefined plan
    const upstream = await fetch(`${ragUrl.replace(/\/$/, '')}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(planData)
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
      JSON.stringify({ error: 'Failed to execute query' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

