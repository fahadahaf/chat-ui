'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, role: isAdmin ? 'admin' : 'user' })
      })
      if (!res.ok) throw new Error(await res.text())
      router.push('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center">
      <div className="fixed right-4 top-4 z-50">
        <ThemeToggle />
      </div>
      <form onSubmit={onSubmit} className="flex w-full max-w-xs flex-col gap-2 rounded-md border border-primary/15 p-4">
        <h1 className="text-sm font-medium uppercase">Register</h1>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <input className="h-9 rounded-md border border-primary/15 bg-background p-2 text-sm" placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="h-9 rounded-md border border-primary/15 bg-background p-2 text-sm" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="h-9 rounded-md border border-primary/15 bg-background p-2 text-sm" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <p className="text-xs text-secondary">Account creation is disabled. Contact an administrator.</p>
        <a href="/login" className="text-xs text-primary underline">Back to login</a>
      </form>
    </div>
  )
}


