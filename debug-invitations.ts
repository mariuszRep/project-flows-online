import { createClient } from '@/lib/supabase/server'
import { InvitationService } from '@/services/invitation-service'

async function testInvitationFetch() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    console.log('No user found')
    return
  }
  
  console.log('Current user:', user.id, user.email)
  
  const invitationService = new InvitationService(supabase)
  
  try {
    const pendingInvitations = await invitationService.getPendingInvitations(user.id)
    console.log('Pending invitations:', pendingInvitations)
    console.log('Count:', pendingInvitations.length)
    
    // Test the raw query as well
    const { data: rawData, error: rawError } = await supabase
      .from('invitations')
      .select(`
        id,
        org_id,
        expires_at,
        status,
        organizations(id, name, created_at)
      `)
      .eq('user_id', user.id)
      .eq('status', 'pending')
    
    console.log('Raw query result:', rawData)
    console.log('Raw query error:', rawError)
    
  } catch (error) {
    console.error('Error:', error)
  }
}

testInvitationFetch()
