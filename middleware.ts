import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const isAuthRoute = url.pathname === '/login' || url.pathname === '/signup' || url.pathname === '/forgot-password' || url.pathname === '/reset-password'
  const isPostDetailsRoute = url.pathname.startsWith('/posts/')
  const isPublicRoute = isAuthRoute || isPostDetailsRoute || url.pathname === '/' || url.pathname === '/about' || url.pathname === '/privacy' || url.pathname === '/terms' || url.pathname === '/contact' || url.pathname === '/blog' || url.pathname === '/how-it-works'

  // If user is logged in and trying to access an auth route, redirect to feed
  if (user && isAuthRoute) {
    url.pathname = '/feed'
    return NextResponse.redirect(url)
  }

  // If user is logged in and visits the landing page, redirect to feed (Industry Standard)
  if (user && url.pathname === '/') {
    url.pathname = '/feed'
    return NextResponse.redirect(url)
  }

  // If user is not logged in and trying to access a protected route, redirect to login
  if (!user && !isPublicRoute && !url.pathname.startsWith('/api/')) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}