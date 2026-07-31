import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function noIndex(response: NextResponse) {
  response.headers.set('X-Robots-Tag', 'noindex, follow')
  return response
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostname = (request.headers.get('host') || '').split(':')[0].toLowerCase()
  const isWardenHost = hostname === 'warden.vouchins.com'
  const isMainHost = hostname === 'vouchins.com' || hostname === 'www.vouchins.com'

  if (isMainHost && (url.pathname === '/warden' || url.pathname.startsWith('/warden/'))) {
    const destination = new URL(url.pathname.replace(/^\/warden/, '') || '/', 'https://warden.vouchins.com')
    destination.search = url.search
    return noIndex(NextResponse.redirect(destination, 308))
  }

  if (isWardenHost && (url.pathname === '/warden' || url.pathname.startsWith('/warden/'))) {
    const destination = new URL(url.pathname.replace(/^\/warden/, '') || '/', 'https://warden.vouchins.com')
    destination.search = url.search
    return noIndex(NextResponse.redirect(destination, 308))
  }

  if (isWardenHost && url.pathname === '/') {
    url.pathname = '/warden'
    return NextResponse.rewrite(url)
  }

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

  const isRecruiterAuthRoute = url.pathname === '/recruiter/login' || url.pathname === '/recruiter/signup'
  const isStandardAuthRoute = url.pathname === '/login' || url.pathname === '/signup' || url.pathname === '/forgot-password' || url.pathname === '/reset-password'
  const isAuthRoute = isStandardAuthRoute || isRecruiterAuthRoute

  const publicPaths = [
    '/',
    '/about',
    '/privacy',
    '/terms',
    '/contact',
    '/how-it-works',
    '/safety',
    '/warden',
    '/business',
    '/verified-professional-community',
    '/employee-referrals',
    '/verified-flatmates',
    '/corporate-marketplace',
    '/trusted-recommendations',
    '/robots.txt',
    '/sitemap.xml',
  ]
  const publicPrefixes = ['/blog', '/posts/']

  const isPublicRoute =
    isAuthRoute ||
    publicPaths.includes(url.pathname) ||
    publicPrefixes.some(prefix => url.pathname.startsWith(prefix))
  const indexablePaths = [
    '/',
    '/about',
    '/privacy',
    '/terms',
    '/contact',
    '/how-it-works',
    '/safety',
    '/business',
    '/verified-professional-community',
    '/employee-referrals',
    '/verified-flatmates',
    '/corporate-marketplace',
    '/trusted-recommendations',
  ]
  const isIndexableRoute =
    indexablePaths.includes(url.pathname) ||
    url.pathname === '/blog' ||
    url.pathname.startsWith('/blog/')
  // If user is logged in and trying to access an auth route, redirect to the appropriate dashboard
  if (user && isAuthRoute) {
    if (isRecruiterAuthRoute) {
      url.pathname = '/recruiter/dashboard'
    } else {
      url.pathname = '/feed'
    }
    return noIndex(NextResponse.redirect(url))
  }

  // If user is logged in and visits the landing page, redirect to feed (Industry Standard)
  if (user && url.pathname === '/') {
    url.pathname = '/feed'
    return NextResponse.redirect(url)
  }

  // If user is not logged in and trying to access a protected route, redirect to login
  if (!user && !isPublicRoute && !url.pathname.startsWith('/api/')) {
    if (url.pathname.startsWith('/recruiter')) {
      url.pathname = '/recruiter/login'
    } else {
      url.pathname = '/login'
    }
    return noIndex(NextResponse.redirect(url))
  }

  if (!isIndexableRoute && !isWardenHost) {
    return noIndex(supabaseResponse)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots\\.txt|sitemap\\.xml|sw\\.js|manifest\\.json|offline\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
