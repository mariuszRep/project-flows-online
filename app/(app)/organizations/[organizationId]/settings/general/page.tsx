import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ContentWrapper } from '@/components/layout/content-wrapper'
import { ThemeToggle } from '@/components/theme-toggle'

interface GeneralSettingsPageProps {
  params: Promise<{ organizationId: string }>
}

export default async function GeneralSettingsPage({ params }: GeneralSettingsPageProps) {
  const { organizationId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <ContentWrapper variant="narrow">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">General Settings</h2>
          <p className="text-muted-foreground">
            Manage your organization's general settings.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-medium">Organization Profile</h3>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">
              Organization profile settings will be implemented here.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-medium">Appearance</h3>
          <div className="rounded-lg border p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Theme</p>
              <p className="text-sm text-muted-foreground">
                Customize the appearance of the application. Source: System, Dark, Light.
              </p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </ContentWrapper>
  )
}
