import { NextRequest } from 'next/server'
import { readDB } from '@/lib/server/db'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value
  if (!token) return new Response('Unauthorized', { status: 401 })
  const db = readDB()
  const user = db.users.find((u) => u.id === token)
  if (!user) return new Response('Unauthorized', { status: 401 })
  return new Response(JSON.stringify({ id: user.id, email: user.email, role: user.role, name: user.name || '' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}


