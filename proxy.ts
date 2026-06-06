import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicRoutes = ['/login']
const protectedRoutes = ['/lobby', '/room', '/game', '/ranking', '/profile', '/settings', '/spectator']

function exactPath(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`)
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('token')?.value
  const guestMode = request.cookies.get('guest_mode')?.value === 'true'
  const devBypass = process.env.NODE_ENV === 'development' && request.nextUrl.searchParams.get('dev') === 'true'

  if (pathname === '/') {
    if (!token && !devBypass) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    return NextResponse.redirect(new URL(guestMode ? '/lobby?mode=guest' : '/lobby', request.url))
  }

  if (publicRoutes.some((route) => exactPath(pathname, route))) {
    if (token) {
      return NextResponse.redirect(new URL(guestMode ? '/lobby?mode=guest' : '/lobby', request.url))
    }

    return NextResponse.next()
  }

  if (protectedRoutes.some((route) => exactPath(pathname, route)) && !token && !devBypass) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/login', '/lobby/:path*', '/room/:path*', '/game/:path*', '/ranking/:path*', '/profile/:path*', '/settings/:path*', '/spectator/:path*'],
}
