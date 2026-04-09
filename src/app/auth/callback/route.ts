// Handles the magic-link / OAuth redirect: exchange code and attach session cookies to the response.
import { createServerClient, parseCookieHeader } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/'
  const origin = url.origin

  const safeNext = next.startsWith('/') ? next : `/${next}`

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const response = NextResponse.redirect(`${origin}${safeNext}`)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get('cookie') ?? '').map(
            ({ name, value }) => ({ name, value: value ?? '' }),
          )
        },
        setAll(cookiesToSet, responseHeaders) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
          Object.entries(responseHeaders).forEach(([key, value]) => {
            response.headers.set(key, value)
          })
        },
      },
    },
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('Auth callback exchange failed:', error.message)
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  return response
}
