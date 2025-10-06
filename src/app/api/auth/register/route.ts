import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  // Registration is disabled - users must be added manually by administrators
  return new Response('Registration is disabled. Please contact an administrator.', { 
    status: 403 
  })
}

// Commented out for when registration needs to be re-enabled:
/*
import bcrypt from 'bcryptjs'
import { getUserByEmail, createUser, type Role } from '@/lib/server/db'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { email, password, name, role } = body as { email: string; password: string; name?: string; role?: Role }
  if (!email || !password) return new Response('Missing credentials', { status: 400 })
  
  const existingUser = await getUserByEmail(email)
  if (existingUser) {
    return new Response('Email already registered', { status: 409 })
  }
  
  const hash = await bcrypt.hash(password, 10)
  const user = await createUser({
    email,
    password_hash: hash,
    name,
    role: role === 'admin' ? 'admin' : 'user'
  })
  
  return new Response(JSON.stringify({ id: user.id, email: user.email, role: user.role }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  })
}
*/


