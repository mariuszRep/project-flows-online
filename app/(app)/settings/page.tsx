import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getUserOrganizations } from '@/features/organizations/organization-actions'
import { SettingsClient } from '@/features/settings/components/settings-client'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

function SettingsError({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg rounded-xl border bg-card p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold">Unable to load settings</h1>
        <p className="text-muted-foreground mt-3 text-sm">{message}</p>
      </div>
    </div>
  )
}

function ErrorAlert({ error }: { error: string }) {
  const errorMessages: Record<string, { title: string; description: string }> = {
    no_organization: {
      title: 'No Organization Found',
      description: 'You need to create an organization to access the portal. Create one below to get started.',
    },
  }

  const errorInfo = errorMessages[error] || {
    title: 'Notice',
    description: error,
  }

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{errorInfo.title}</AlertTitle>
      <AlertDescription>{errorInfo.description}</AlertDescription>
    </Alert>
  )
}

async function SettingsContent({ searchParams }: { searchParams?: { error?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const result = await getUserOrganizations()

  if (!result.success) {
    return <SettingsError message={result.error || 'Failed to load organizations'} />
  }

  // If user has organizations, redirect to the first one's settings page
  if (result.organizations && result.organizations.length > 0) {
    const firstOrg = result.organizations[0]
    redirect(`/organization/${firstOrg.id}`)
  }

  const userData = {
    name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
    email: user.email || '',
    avatar: user.user_metadata?.avatar_url || '',
  }

  return (
    <div className="flex min-h-screen flex-col bg-background p-6">
      {searchParams?.error && <ErrorAlert error={searchParams.error} />}
      <SettingsClient
        organizations={result.organizations || []}
        user={userData}
      />
    </div>
  )
}

function SettingsLoading() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="flex w-full flex-col gap-4 p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    </div>
  )
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>
}) {
  const params = await searchParams

  return (
    <Suspense fallback={<SettingsLoading />}>
      <SettingsContent searchParams={params} />
    </Suspense>
  )
}
