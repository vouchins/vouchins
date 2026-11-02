import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { sanitizeReturnTo } from '@/lib/auth/return-to'

function noIndex(response: NextResponse) {
  response.headers.set('X-Robots-Tag', 'noindex, follow')
  return response
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostHeader = (request.headers.get('host') || '').toLowerCase()
  const [hostname] = hostHeader.split(':')
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost')
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

  function redirectWithCookies(destination: URL | string, status?: number) {
    const res = NextResponse.redirect(destination, status)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      res.cookies.set(cookie.name, cookie.value, cookie)
    })
    return res
  }

  const allCookies = request.cookies.getAll()
  const hasAuthCookie = allCookies.some((c) =>
    (c.name.startsWith('sb-') && c.name.includes('-auth-token') && !c.name.includes('-code-verifier')) ||
    c.name.includes('supabase-auth-token')
  )

  let user = null

  if (hasAuthCookie) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key",
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
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

    try {
      const userPromise = supabase.auth.getUser()
      const timeoutMs = isLocalHost ? 3000 : 4000
      const timeoutPromise = new Promise<{ data: { user: null } }>((resolve) =>
        setTimeout(() => resolve({ data: { user: null } }), timeoutMs)
      )
      const res = await Promise.race([userPromise, timeoutPromise])
      user = res?.data?.user ?? null
    } catch {
      user = null
    }
  }

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
    '/jobs',
    '/jobs/dashboard',
    '/jobs/recommend',
    '/robots.txt',
    '/sitemap.xml',
    '/llms.txt',
  ]
  const publicPrefixes = ['/blog', '/posts/', '/flatmates-in-hyderabad', '/jobs']

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
    '/jobs',
    '/jobs/dashboard',
    '/jobs/recommend',
  ]
  const isIndexableRoute =
    indexablePaths.includes(url.pathname) ||
    url.pathname === '/blog' ||
    url.pathname.startsWith('/blog/') ||
    url.pathname.startsWith('/posts/') ||
    url.pathname === '/flatmates-in-hyderabad' ||
    url.pathname.startsWith('/flatmates-in-hyderabad/')
  // If user is logged in and trying to access an auth route, redirect to the appropriate dashboard or returnTo
  if (user && isAuthRoute) {
    if (isRecruiterAuthRoute) {
      url.pathname = '/recruiter/dashboard'
      return noIndex(redirectWithCookies(url))
    }
    const rawReturnTo = url.searchParams.get('returnTo')
    const safeReturnTo = sanitizeReturnTo(rawReturnTo)
    if (safeReturnTo) {
      if (safeReturnTo.startsWith('http://') || safeReturnTo.startsWith('https://')) {
        return noIndex(redirectWithCookies(new URL(safeReturnTo)))
      }
      url.pathname = safeReturnTo
      url.search = ''
      return noIndex(redirectWithCookies(url))
    }
    url.pathname = '/feed'
    return noIndex(redirectWithCookies(url))
  }

  // If user is logged in and visits the landing page, redirect to feed (Industry Standard)
  if (user && url.pathname === '/') {
    url.pathname = '/feed'
    return redirectWithCookies(url)
  }

  // If user is not logged in and trying to access a protected route, redirect to login
  if (!user && !isPublicRoute && !url.pathname.startsWith('/api/')) {
    const returnTo = `${url.pathname}${url.search}`
    if (url.pathname.startsWith('/recruiter')) {
      url.pathname = '/recruiter/login'
    } else {
      url.pathname = '/login'
    }
    url.searchParams.set('returnTo', returnTo)
    return noIndex(redirectWithCookies(url))
  }

  const isProductionHost = isMainHost || isWardenHost

  if (!isProductionHost || (!isIndexableRoute && !isWardenHost)) {
    return noIndex(supabaseResponse)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots\\.txt|sitemap\\.xml|llms\\.txt|sw\\.js|manifest\\.json|offline\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
