import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { readDB } from '@/lib/server/db'
// Token will be a simple opaque user id for demo purposes

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { email, password } = body as { email: string; password: string }
  if (!email || !password) return new Response('Missing credentials', { status: 400 })
  const db = readDB()
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (!user) return new Response('Invalid credentials', { status: 401 })
  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) return new Response('Invalid credentials', { status: 401 })

  const cookie = `auth_token=${user.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookie }
  })
}


