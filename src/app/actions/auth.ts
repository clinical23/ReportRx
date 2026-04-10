'use server'

import { awaitLogAuditWithServerSupabase } from '@/lib/audit'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function signOutAction() {
  const supabase = await createClient()
  await awaitLogAuditWithServerSupabase(supabase, 'logout', 'auth')
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
