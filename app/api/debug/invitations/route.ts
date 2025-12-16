import { createClient } from '@/lib/supabase/server'
import { InvitationService } from '@/services/invitation-service'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'No user found' }, { status: 401 })
  }
  
  const invitationService = new InvitationService(supabase)
  
  try {
    const pendingInvitations = await invitationService.getPendingInvitations(user.id)
    
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
    
    return NextResponse.json({
      currentUser: {
        id: user.id,
        email: user.email
      },
      pendingInvitations,
      pendingInvitationsCount: pendingInvitations.length,
      rawData,
      rawError
    })
    
  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      currentUser: {
        id: user.id,
        email: user.email
      }
    }, { status: 500 })
  }
}
