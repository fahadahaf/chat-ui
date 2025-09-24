'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  // If already authenticated, bounce to app immediately
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' })
        if (!cancelled && res.ok) {
          window.location.replace('/')
        }
      } catch {}
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
        cache: 'no-store'
      })
      if (!res.ok) throw new Error(await res.text())
      // Confirm cookie is set and session readable before navigating
      let ok = false
      for (let i = 0; i < 10; i++) {
        try {
          const chk = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' })
          if (chk.ok) {
            ok = true
            break
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 200))
      }
      // Hard navigate to ensure full boot before user can interact
      window.location.href = ok ? '/' : '/'
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={onSubmit} className="relative flex w-full max-w-xs flex-col gap-2 rounded-md border border-primary/15 p-4">
        <h1 className="text-sm font-medium uppercase">Login</h1>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <input disabled={loading} className="h-9 rounded-md border border-primary/15 bg-background p-2 text-sm disabled:opacity-50" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input disabled={loading} className="h-9 rounded-md border border-primary/15 bg-background p-2 text-sm disabled:opacity-50" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button disabled={loading} className="flex h-9 items-center justify-center gap-2 rounded-md bg-primary text-sm text-background hover:bg-primary/80 disabled:opacity-50">
          {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />}
          {loading ? 'Logging in…' : 'Login'}
        </button>
        <p className="text-xs text-secondary">Don’t have an account? Contact the administrator.</p>
        {loading && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-md bg-background/60">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </form>
    </div>
  )
}


