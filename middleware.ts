import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          supabaseResponse.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          supabaseResponse.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const dashboardRoutes = [
    '/create',
    '/library',
    '/settings',
    '/dashboard',
    '/absensi',
    '/bank-materi',
    '/kelompok',
    '/koreksi',
    '/perencana',
    '/play',
    '/profil',
    '/ranking',
    '/rapor',
    '/roda-undian',
  ]

  const isDashboardRoute = dashboardRoutes.some(
    (route) => request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(`${route}/`)
  )

  if (!user && isDashboardRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Lindungi endpoint internal /api/* dari pemanggilan tanpa otentikasi
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')
  if (!user && isApiRoute) {
    const apiKey = request.headers.get('x-api-key') || ''
    const validKey = process.env.AI_ENGINE_API_KEY || 'dev-key-educraft'
    if (apiKey !== validKey) {
      return NextResponse.json(
        { error: 'Sesi login tidak valid atau telah kedaluwarsa. Silakan login terlebih dahulu.' },
        { status: 401 }
      )
    }
  }

  const isAuthRoute = request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register'
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    const nextDestination = request.nextUrl.searchParams.get('next') || '/create'
    url.pathname = nextDestination
    url.search = ''
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
