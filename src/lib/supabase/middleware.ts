// Supabase middleware client for refreshing auth tokens
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
          } catch {
            // Request cookies may be read-only in some runtime contexts.
          }
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh the session — this is critical for server components
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If no user and not on a public page, redirect to login
  const publicPaths = ['/login', '/auth/callback', '/auth/confirm']
  const isPublicPath = publicPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If user exists but profile incomplete, redirect to onboarding
  if (user && !request.nextUrl.pathname.startsWith('/onboarding') && !isPublicPath) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('organisation_id, full_name')
      .eq('id', user.id)
      .single()

    // No profile at all, or no org — send to onboarding
    if (!profile || !profile.organisation_id || !profile.full_name) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
