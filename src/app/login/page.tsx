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
    <div className="flex min-h-screen flex-col">
      {/* Main content area */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and Header */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Logo"
                className="h-16 w-16 object-contain"
              />
              <h1 className="text-3xl font-bold tracking-tight">AI Assistant</h1>
            </div>
            <p className="text-center text-m text-muted-foreground">
              Sign in to access the chat interface
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={onSubmit} className="relative flex w-full flex-col gap-4 rounded-lg border border-primary/15 bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Login</h2>
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  disabled={loading}
                  className="h-10 w-full rounded-md border border-primary/15 bg-background px-3 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  disabled={loading}
                  className="h-10 w-full rounded-md border border-primary/15 bg-background px-3 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex h-10 items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-black transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />}
              {loading ? 'Logging in…' : 'Login'}
            </button>
            <p className="text-center text-xs text-muted-foreground">
              Don't have an account? Contact the administrator.
            </p>
            {loading && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-lg bg-background/60 backdrop-blur-sm">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-primary/10 bg-card/50 px-6 py-4">
        <div className="mx-auto max-w-7xl">
          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Company XYZ. All rights reserved. Property of Company XYZ.
          </p>
        </div>
      </footer>
    </div>
  )
}


