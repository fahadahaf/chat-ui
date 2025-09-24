import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { readDB, writeDB, uid, type Role } from '@/lib/server/db'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { email, password, name, role } = body as { email: string; password: string; name?: string; role?: Role }
  if (!email || !password) return new Response('Missing credentials', { status: 400 })
  const db = readDB()
  if (db.users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return new Response('Email already registered', { status: 409 })
  }
  const hash = await bcrypt.hash(password, 10)
  const user = {
    id: uid('u_'),
    email,
    name,
    password_hash: hash,
    role: role === 'admin' ? 'admin' : 'user',
    created_at: Date.now()
  }
  db.users.push(user)
  writeDB(db)
  return new Response(JSON.stringify({ id: user.id, email: user.email, role: user.role }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  })
}


