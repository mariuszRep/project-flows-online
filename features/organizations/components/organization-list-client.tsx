'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { OrganizationCard } from '@/features/organizations/components/organization-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { createOrganization } from '@/features/organizations/organization-actions'

interface OrganizationData {
  id: string
  name: string
  memberCount: number
  workspaceCount: number
  invitation?: {
    invitationId: string
    roleName?: string
    roleDescription?: string | null
    expiresAt: string
  }
}

interface OrganizationListClientProps {
  organizations: OrganizationData[]
}

export function OrganizationListClient({ organizations }: OrganizationListClientProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [organizationName, setOrganizationName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleCreateOrganization = async () => {
    if (!organizationName.trim()) {
      toast.error('Please enter an organization name')
      return
    }

    if (organizationName.trim().length > 100) {
      toast.error('Organization name must be less than 100 characters')
      return
    }

    setIsLoading(true)
    try {
      const result = await createOrganization(organizationName.trim())

      if (result.success && result.organization) {
        toast.success('Organization created!', {
          description: `${result.organization.name} has been created successfully.`,
        })
        setDialogOpen(false)
        setOrganizationName('')
        router.refresh()
      } else {
        toast.error('Failed to create organization', {
          description: result.error || 'An unexpected error occurred',
        })
      }
    } catch (error) {
      console.error('Error creating organization:', error)
      toast.error('Failed to create organization')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground mt-2">
            Select an organization to view its workspaces
          </p>
        </div>

        {/* Grid Layout with Create Card as First Item */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Create Organization Card */}
          <OrganizationCard
            variant="create"
            onCreate={() => setDialogOpen(true)}
          />

          {/* All Organizations (with optional invitation attachments) */}
          {organizations.map((org) => (
            <OrganizationCard
              key={org.id}
              variant={org.invitation ? 'invitation' : 'default'}
              id={org.id}
              name={org.name}
              memberCount={org.memberCount}
              workspaceCount={org.workspaceCount}
              invitationId={org.invitation?.invitationId}
              roleName={org.invitation?.roleName}
              roleDescription={org.invitation?.roleDescription}
              expiresAt={org.invitation?.expiresAt}
            />
          ))}
        </div>
      </div>

      {/* Create Organization Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Organization</DialogTitle>
            <DialogDescription>
              Add a new organization to your account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                placeholder="e.g., Acme Inc, My Company"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isLoading) {
                    handleCreateOrganization()
                  }
                }}
                disabled={isLoading}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false)
                setOrganizationName('')
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateOrganization} disabled={isLoading || !organizationName.trim()}>
              {isLoading ? 'Creating...' : 'Create Organization'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
