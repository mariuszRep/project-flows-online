'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Building2, Users, FolderKanban, Mail, UserCheck, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { acceptInvitation, declineInvitation } from '@/features/invitations/invitation-actions'

interface OrganizationCardProps {
  id: string
  name: string
  memberCount: number
  workspaceCount: number
  // Invitation-specific props (optional)
  isInvitation?: boolean
  invitationId?: string
  roleName?: string
  roleDescription?: string | null
  expiresAt?: string
}

export function OrganizationCard({ 
  id, 
  name, 
  memberCount, 
  workspaceCount,
  isInvitation = false,
  invitationId,
  roleName,
  roleDescription,
  expiresAt,
}: OrganizationCardProps) {
  const router = useRouter()
  const [isAccepting, setIsAccepting] = useState(false)
  const [isDeclining, setIsDeclining] = useState(false)

  const handleAccept = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!invitationId) return
    
    setIsAccepting(true)
    try {
      const result = await acceptInvitation(invitationId)
      
      if (result.success) {
        toast.success('Invitation accepted!', {
          description: `Welcome to ${name}`,
        })
        router.refresh()
      } else {
        toast.error('Failed to accept invitation', {
          description: result.error,
        })
      }
    } catch (error) {
      toast.error('Failed to accept invitation')
    } finally {
      setIsAccepting(false)
    }
  }

  const handleDecline = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!invitationId) return
    
    setIsDeclining(true)
    try {
      const result = await declineInvitation(invitationId)
      
      if (result.success) {
        toast.success('Invitation declined')
        router.refresh()
      } else {
        toast.error('Failed to decline invitation', {
          description: result.error,
        })
      }
    } catch (error) {
      toast.error('Failed to decline invitation')
    } finally {
      setIsDeclining(false)
    }
  }

  const expiryDate = expiresAt ? new Date(expiresAt) : null
  const isExpiringSoon = expiryDate ? expiryDate.getTime() - Date.now() < 24 * 60 * 60 * 1000 : false

  const cardContent = (
    <div className="relative w-full">
      {/* Invitation Panel (behind the card, sliding out on the right) */}
      {isInvitation && (
        <div className="absolute -right-2 top-0 bottom-0 w-28 bg-accent border-2 border-border rounded-lg flex flex-col justify-center p-2 gap-2 shadow-md z-0">
          <Badge variant="secondary" className="text-xs justify-center py-1">
            Invitation
          </Badge>
          <Button
            onClick={handleAccept}
            disabled={isAccepting || isDeclining}
            className="w-full h-7 text-xs px-2"
            size="sm"
          >
            {isAccepting ? '...' : 'Accept'}
          </Button>
          <Button
            variant="outline"
            onClick={handleDecline}
            disabled={isAccepting || isDeclining}
            className="w-full h-7 text-xs px-2"
            size="sm"
          >
            {isDeclining ? '...' : 'Decline'}
          </Button>
        </div>
      )}

      {/* Main Organization Card (on top, covering most of the invitation panel) */}
      <Card className={`relative z-10 transition-colors ${
        isInvitation ? 'mr-24' : 'hover:border-primary cursor-pointer'
      }`}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">{name}</CardTitle>
              <CardDescription>
                {isInvitation ? 'You have been invited to join' : 'Click to view workspaces'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FolderKanban className="h-4 w-4" />
              <span>{workspaceCount} {workspaceCount === 1 ? 'workspace' : 'workspaces'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  // Only wrap in Link if it's not an invitation
  if (isInvitation) {
    return cardContent
  }

  return (
    <Link href={`/organization/${id}/workspace`}>
      {cardContent}
    </Link>
  )
}
