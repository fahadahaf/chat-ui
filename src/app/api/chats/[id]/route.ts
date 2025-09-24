import { NextRequest } from 'next/server'
import { readDB, writeDB } from '@/lib/server/db'

function requireUserId(req: NextRequest): string | null {
  const token = req.cookies.get('auth_token')?.value
  if (!token) return null
  const db = readDB()
  const user = db.users.find((u) => u.id === token)
  return user?.id ?? null
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = requireUserId(req)
  if (!userId) return new Response('Unauthorized', { status: 401 })
  const body = await req.json()
  const { session_name } = body as { session_name: string }
  const db = readDB()
  const s = db.chats.find((c) => c.id === params.id && c.user_id === userId)
  if (!s) return new Response('Not found', { status: 404 })
  s.session_name = session_name ?? s.session_name
  writeDB(db)
  return new Response(JSON.stringify(s), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = requireUserId(req)
  if (!userId) return new Response('Unauthorized', { status: 401 })
  const db = readDB()
  const idx = db.chats.findIndex((c) => c.id === params.id && c.user_id === userId)
  if (idx === -1) return new Response('Not found', { status: 404 })
  db.chats.splice(idx, 1)
  db.messages = db.messages.filter((m) => m.chat_session_id !== params.id)
  writeDB(db)
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}


