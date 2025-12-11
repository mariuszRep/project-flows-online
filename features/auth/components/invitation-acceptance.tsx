'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { UserCheck, AlertCircle, ArrowRight } from 'lucide-react'
import { acceptInvitation } from '@/features/invitations/invitation-actions'

interface InvitationDetails {
  invitationId: string
  organizationId: string
  organizationName: string
  roleName: string
  roleDescription: string | null
  workspaceCount: number
}

interface InvitationAcceptanceProps {
  invitationDetails: InvitationDetails
}

export function InvitationAcceptance({ invitationDetails }: InvitationAcceptanceProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleAcceptInvitation = async () => {
    setIsLoading(true)
    try {
      const result = await acceptInvitation(invitationDetails.invitationId)

      if (result.success) {
        toast.success('Invitation accepted!', {
          description: `Welcome to ${invitationDetails.organizationName}`,
        })

        // Redirect based on workspace access
        if (invitationDetails.workspaceCount > 0) {
          router.push(`/organization/${invitationDetails.organizationId}`)
        } else {
          router.push(`/organization/${invitationDetails.organizationId}/settings`)
        }
      } else {
        toast.error('Failed to accept invitation', {
          description: result.error || 'An unexpected error occurred',
        })
      }
    } catch (error) {
      console.error('Error accepting invitation:', error)
      toast.error('Failed to accept invitation', {
        description: 'An unexpected error occurred',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <UserCheck className="h-6 w-6 text-primary" />
          <CardTitle>You've Been Invited!</CardTitle>
        </div>
        <CardDescription>Accept your invitation to get started</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Organization</span>
            <span className="font-medium">{invitationDetails.organizationName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Your Role</span>
            <Badge variant="secondary" className="capitalize">
              {invitationDetails.roleName}
            </Badge>
          </div>
          {invitationDetails.roleDescription && (
            <p className="text-sm text-muted-foreground">{invitationDetails.roleDescription}</p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Workspace Access</span>
            <span className="font-medium">
              {invitationDetails.workspaceCount} workspace
              {invitationDetails.workspaceCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {invitationDetails.workspaceCount === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No workspace access</AlertTitle>
            <AlertDescription>
              You don't have access to any workspaces yet. Contact your admin to get workspace access.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleAcceptInvitation} disabled={isLoading} className="w-full">
          {isLoading ? 'Accepting...' : 'Accept Invitation'}
          {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </CardFooter>
    </Card>
  )
}
