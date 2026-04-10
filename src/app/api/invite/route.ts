import { NextResponse } from 'next/server'

import { getPublicSiteUrl } from '@/lib/site-url'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type InviteBody = {
  email?: string
  role?: string
  organisation_id?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidEmail(email: string): boolean {
  const s = email.trim().toLowerCase()
  return s.length > 0 && s.length <= 320 && EMAIL_RE.test(s)
}

function inviteRedirectUrl(): string {
  const base = getPublicSiteUrl()
  const next = encodeURIComponent('/onboarding')
  return `${base}/auth/callback?next=${next}`
}

export async function POST(request: Request) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Missing SUPABASE_SERVICE_ROLE_KEY' },
        { status: 500 },
      )
    }

    let body: InviteBody
    try {
      body = (await request.json()) as InviteBody
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const email = String(body.email ?? '')
      .trim()
      .toLowerCase()
    let organisationId = String(body.organisation_id ?? '').trim()
    const role = String(body.role ?? '').trim()

    if (!email || !organisationId || !role) {
      return NextResponse.json(
        { error: 'email, role, and organisation_id are required' },
        { status: 400 },
      )
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, organisation_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (profile.role !== 'admin' && profile.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const allowedRoles =
      profile.role === 'superadmin'
        ? ['clinician', 'manager', 'admin']
        : ['clinician', 'manager']

    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    if (profile.role !== 'superadmin') {
      organisationId = profile.organisation_id as string
    }

    if (!organisationId) {
      return NextResponse.json(
        { error: 'organisation_id is required' },
        { status: 400 },
      )
    }

    if (
      profile.role !== 'superadmin' &&
      organisationId !== profile.organisation_id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const admin = createAdminClient()

    const { data: existingByEmail } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingByEmail) {
      return NextResponse.json(
        { error: 'A user with that email already exists' },
        { status: 409 },
      )
    }

    const redirectTo = inviteRedirectUrl()

    const { data: inviteData, error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
      })

    if (inviteError || !inviteData?.user?.id) {
      console.error('[api/invite] inviteUserByEmail', inviteError)
      return NextResponse.json(
        { error: inviteError?.message ?? 'Failed to send invite email' },
        { status: 500 },
      )
    }

    const newUserId = inviteData.user.id

    const profilePayload = {
      id: newUserId,
      email,
      organisation_id: organisationId,
      role,
      full_name: '',
      updated_at: new Date().toISOString(),
    }

    const { error: upsertProfileError } = await admin
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' })

    if (upsertProfileError) {
      console.error('[api/invite] profiles upsert', upsertProfileError)
      return NextResponse.json(
        { error: upsertProfileError.message },
        { status: 500 },
      )
    }

    await admin.from('organisation_invites').delete().eq('email', email)

    const { error: inviteRowError } = await admin
      .from('organisation_invites')
      .insert({
        email,
        organisation_id: organisationId,
        role,
        full_name: '',
        invited_by: user.id,
      })

    if (inviteRowError) {
      console.error('[api/invite] organisation_invites', inviteRowError)
      return NextResponse.json(
        {
          success: true,
          warning:
            'Invite was sent, but the invite record could not be saved: ' +
            inviteRowError.message,
        },
        { status: 200 },
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Invitation email sent.',
      },
      { status: 200 },
    )
  } catch (e) {
    console.error('[api/invite]', e)
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}
