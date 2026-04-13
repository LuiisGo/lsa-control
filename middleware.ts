import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    // If trying to access /admin but not admin role
    if (pathname.startsWith('/admin') && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/empleado', req.url))
    }

    // If trying to access /empleado but not empleado (admin can also access)
    if (pathname.startsWith('/empleado') && token?.role !== 'empleado' && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Redirect from root to appropriate dashboard
    if (pathname === '/') {
      if (token?.role === 'admin') return NextResponse.redirect(new URL('/admin', req.url))
      if (token?.role === 'empleado') return NextResponse.redirect(new URL('/empleado', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname
        if (pathname.startsWith('/admin') || pathname.startsWith('/empleado')) {
          return !!token
        }
        return true
      },
    },
    pages: {
      signIn: '/login',
    },
  }
)

export const config = {
  matcher: ['/admin/:path*', '/empleado/:path*', '/'],
  // /portal/* is intentionally excluded — public access
}
