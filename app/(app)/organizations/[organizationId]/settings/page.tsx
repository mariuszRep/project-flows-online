import { redirect } from 'next/navigation'

interface SettingsPageProps {
  params: Promise<{ organizationId: string }>
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { organizationId } = await params
  redirect(`/organizations/${organizationId}/settings/general`)
}
