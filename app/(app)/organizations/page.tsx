import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OrganizationService } from '@/services/organization-service'
import { OrganizationListClient } from '@/features/organizations/components/organization-list-client'

export default async function OrganizationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const organizationService = new OrganizationService(supabase)
  const organizationsData = await organizationService.getCombinedOrganizationsWithInvitations(user.id)

  return (
    <OrganizationListClient organizations={organizationsData} />
  )
}
