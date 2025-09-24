import { NextRequest } from 'next/server'
import { readDB, writeDB, uid } from '@/lib/server/db'

function requireUserId(req: NextRequest): string | null {
  const token = req.cookies.get('auth_token')?.value
  if (!token) return null
  const db = readDB()
  const user = db.users.find((u) => u.id === token)
  return user?.id ?? null
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const userId = requireUserId(req)
  if (!userId) return new Response('Unauthorized', { status: 401 })
  const { id } = await ctx.params
  const db = readDB()
  const session = db.chats.find((c) => c.id === id && c.user_id === userId)
  if (!session) return new Response('Not found', { status: 404 })
  const msgs = db.messages.filter((m) => m.chat_session_id === id)
  return new Response(JSON.stringify(msgs), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const userId = requireUserId(req)
  if (!userId) return new Response('Unauthorized', { status: 401 })
  const { id } = await ctx.params
  const db = readDB()
  const session = db.chats.find((c) => c.id === id && c.user_id === userId)
  if (!session) return new Response('Not found', { status: 404 })
  const body = await req.json()
  const { role, content, extra_data } = body as { role: 'user' | 'agent' | 'system' | 'tool'; content: string; extra_data?: unknown }
  const msg = { id: uid('m_'), chat_session_id: id, role, content, extra_data, created_at: Date.now() }
  db.messages.push(msg)
  writeDB(db)
  return new Response(JSON.stringify(msg), { status: 201, headers: { 'Content-Type': 'application/json' } })
}


