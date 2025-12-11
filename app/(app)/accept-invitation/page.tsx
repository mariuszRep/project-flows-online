import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { acceptInvitation } from '@/features/invitations/invitation-actions'

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const params = await searchParams
  const invitationId = params.id

  if (!invitationId) {
    redirect('/organizations')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Verify the invitation exists and is still pending
  const { data: invitation } = await supabase
    .from('invitations')
    .select('id, status, expires_at')
    .eq('id', invitationId)
    .eq('status', 'pending')
    .maybeSingle()

  if (!invitation) {
    // Invitation doesn't exist or already processed
    redirect('/organizations')
  }

  const now = new Date()
  const expiresAt = new Date(invitation.expires_at)

  if (now > expiresAt) {
    // Mark as expired
    await supabase
      .from('invitations')
      .update({ status: 'expired' })
      .eq('id', invitationId)
    redirect('/organizations')
  }

  // Accept the invitation
  const result = await acceptInvitation(invitationId)

  if (!result.success) {
    console.error('Failed to accept invitation:', result.error)
  }

  // Redirect to organizations list which will now show the accepted organization
  redirect('/organizations')
}
