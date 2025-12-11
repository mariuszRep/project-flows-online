import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CreateOrganizationForm } from '@/features/organizations/components/create-organization-form'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function NewOrganizationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/organization">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Organization</h1>
          <p className="text-muted-foreground mt-2">
            Add a new organization to your account
          </p>
        </div>
      </div>

      <CreateOrganizationForm />
    </div>
  )
}
