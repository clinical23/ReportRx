// Supabase middleware client for refreshing auth tokens and persisting cookies.
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
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
        setAll(cookiesToSet, responseHeaders) {
          try {
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value)
            })
          } catch {
            // Request cookies can be read-only in some runtimes.
          }

          supabaseResponse = NextResponse.next({
            request,
          })

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })

          Object.entries(responseHeaders).forEach(([key, value]) => {
            supabaseResponse.headers.set(key, value)
          })
        },
      },
    },
  )

  // Validates JWT and refreshes the session; updated cookies flow through setAll().
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    console.warn('[supabase/middleware] getUser:', userError.message)
  }

  const publicPaths = ['/login', '/auth/callback', '/auth/confirm', '/privacy']
  const isPublicPath = publicPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  )

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (
    user &&
    !request.nextUrl.pathname.startsWith('/onboarding') &&
    !isPublicPath
  ) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('organisation_id, full_name')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.organisation_id || !profile.full_name) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }

    // TODO: When organisations.mfa_required is true, force MFA enrolment for all users in that org
    // For now, MFA is optional — users can enable it in Settings
    const path = request.nextUrl.pathname
    if (!path.startsWith('/mfa-verify') && !path.startsWith('/api/')) {
      const { data: aalData } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (
        aalData?.nextLevel === 'aal2' &&
        aalData?.currentLevel === 'aal1'
      ) {
        const url = request.nextUrl.clone()
        url.pathname = '/mfa-verify'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}
