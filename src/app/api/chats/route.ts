import { NextRequest } from 'next/server'
import { readDB, writeDB, uid } from '@/lib/server/db'

function requireUserId(req: NextRequest): string | null {
  const token = req.cookies.get('auth_token')?.value
  if (!token) return null
  const db = readDB()
  const user = db.users.find((u) => u.id === token)
  return user?.id ?? null
}

export async function GET(req: NextRequest) {
  const userId = requireUserId(req)
  if (!userId) return new Response('Unauthorized', { status: 401 })
  const db = readDB()
  const sessions = db.chats.filter((c) => c.user_id === userId)
  return new Response(JSON.stringify(sessions), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

export async function POST(req: NextRequest) {
  const userId = requireUserId(req)
  if (!userId) return new Response('Unauthorized', { status: 401 })
  const body = await req.json()
  const { provider } = body as { session_name?: string; provider: 'ollama' | 'amazon' }
  const db = readDB()
  const userSessions = db.chats.filter((c) => c.user_id === userId)
  if (userSessions.length >= 6) {
    return new Response('Chat limit reached (6). Delete a chat to create a new one.', { status: 400 })
  }
  const nextIndex = userSessions.length + 1
  const sessionName = `New Chat ${nextIndex}`
  const session = { id: uid('s_'), user_id: userId, provider, session_name: sessionName, created_at: Date.now() }
  db.chats.unshift(session)
  writeDB(db)
  return new Response(JSON.stringify(session), { status: 201, headers: { 'Content-Type': 'application/json' } })
}


