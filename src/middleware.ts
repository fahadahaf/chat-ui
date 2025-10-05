import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/api/auth/login',
  '/api/auth/register',
  '/_next',
  '/favicon.ico',
  '/logo.png',
  '/logo.svg'
]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next()

  const token = req.cookies.get('auth_token')?.value
  if (!token) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
  // Lightweight check in middleware: just require cookie to exist
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api/auth).*)']
}


