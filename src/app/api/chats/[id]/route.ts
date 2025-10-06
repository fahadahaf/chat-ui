import { NextRequest } from 'next/server'
import { getUserById, getChatById, updateChatSessionName, deleteChat } from '@/lib/server/db'

async function requireUserId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get('auth_token')?.value
  if (!token) return null
  const user = await getUserById(token)
  return user?.id ?? null
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId(req)
  if (!userId) return new Response('Unauthorized', { status: 401 })
  
  const { id } = await params
  const body = await req.json()
  const { session_name } = body as { session_name: string }
  
  const chat = await getChatById(id)
  if (!chat || chat.user_id !== userId) return new Response('Not found', { status: 404 })
  
  await updateChatSessionName(id, session_name ?? chat.session_name)
  const updatedChat = await getChatById(id)
  
  return new Response(JSON.stringify(updatedChat), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId(req)
  if (!userId) return new Response('Unauthorized', { status: 401 })
  
  const { id } = await params
  const chat = await getChatById(id)
  if (!chat || chat.user_id !== userId) return new Response('Not found', { status: 404 })
  
  await deleteChat(id)
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}


