import { NextRequest } from 'next/server'
import { getUserById, getChatsByUserId, createChat } from '@/lib/server/db'

async function requireUserId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get('auth_token')?.value
  if (!token) return null
  const user = await getUserById(token)
  return user?.id ?? null
}

export async function GET(req: NextRequest) {
  const userId = await requireUserId(req)
  if (!userId) return new Response('Unauthorized', { status: 401 })
  
  const sessions = await getChatsByUserId(userId)
  return new Response(JSON.stringify(sessions), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId(req)
  if (!userId) return new Response('Unauthorized', { status: 401 })
  
  const body = await req.json()
  const { provider } = body as { session_name?: string; provider: 'ollama' | 'amazon' }
  
  const userSessions = await getChatsByUserId(userId)
  if (userSessions.length >= 6) {
    return new Response('Chat limit reached (6). Delete a chat to create a new one.', { status: 400 })
  }
  
  const nextIndex = userSessions.length + 1
  const sessionName = `New Chat ${nextIndex}`
  const session = await createChat({
    user_id: userId,
    provider,
    session_name: sessionName
  })
  
  return new Response(JSON.stringify(session), { status: 201, headers: { 'Content-Type': 'application/json' } })
}


