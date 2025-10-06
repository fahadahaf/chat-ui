import { NextRequest } from 'next/server'
import { getUserById, getChatById, getMessagesByChatId, createMessage } from '@/lib/server/db'

async function requireUserId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get('auth_token')?.value
  if (!token) return null
  const user = await getUserById(token)
  return user?.id ?? null
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId(req)
  if (!userId) return new Response('Unauthorized', { status: 401 })
  
  const { id } = await ctx.params
  const session = await getChatById(id)
  if (!session || session.user_id !== userId) return new Response('Not found', { status: 404 })
  
  const msgs = await getMessagesByChatId(id)
  return new Response(JSON.stringify(msgs), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId(req)
  if (!userId) return new Response('Unauthorized', { status: 401 })
  
  const { id } = await ctx.params
  const session = await getChatById(id)
  if (!session || session.user_id !== userId) return new Response('Not found', { status: 404 })
  
  const body = await req.json()
  const { role, content, extra_data } = body as { role: 'user' | 'agent' | 'system' | 'tool'; content: string; extra_data?: unknown }
  
  const msg = await createMessage({
    chat_session_id: id,
    role,
    content,
    extra_data
  })
  
  return new Response(JSON.stringify(msg), { status: 201, headers: { 'Content-Type': 'application/json' } })
}


