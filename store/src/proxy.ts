import { NextRequest, NextResponse } from 'next/server'

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isAdminRoute = pathname.startsWith('/admin')
  const isAdminLogin = pathname === '/admin/login'
  const isAdminApi = pathname.startsWith('/api/admin')
  const isAuthEndpoint = pathname === '/api/admin/auth'

  if (!isAdminRoute && !isAdminApi) return NextResponse.next()
  if (isAdminLogin) return NextResponse.next()
  if (isAuthEndpoint) return NextResponse.next()

  const cookie = req.cookies.get('admin-auth')
  const authenticated = cookie?.value === 'zadiis-admin-session-v1'

  if (!authenticated) {
    if (isAdminApi) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const loginUrl = new URL('/admin/login', req.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
