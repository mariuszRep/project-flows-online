'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Users, FolderKanban, Plus, ArrowRight, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { acceptInvitation, declineInvitation } from '@/features/invitations/invitation-actions'

type OrganizationCardVariant = 'default' | 'invitation' | 'create'

interface OrganizationCardProps {
  variant: OrganizationCardVariant
  id?: string
  name?: string
  memberCount?: number
  workspaceCount?: number
  invitationId?: string
  roleName?: string
  roleDescription?: string | null
  expiresAt?: string
  onCreate?: () => void
}

export function OrganizationCard({
  variant,
  id,
  name,
  memberCount,
  workspaceCount,
  invitationId,
  roleName,
  roleDescription,
  expiresAt,
  onCreate,
}: OrganizationCardProps) {
  const router = useRouter()
  const [isAccepting, setIsAccepting] = useState(false)
  const [isDeclining, setIsDeclining] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleAccept = async () => {
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

  const handleDecline = async () => {
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

  const handleDoubleClick = () => {
    if (variant === 'default' && id) {
      router.push(`/organizations/${id}/workspaces`)
    }
  }

  const handleEnter = () => {
    if (variant === 'default' && id) {
      router.push(`/organizations/${id}/workspaces`)
    }
  }

  // Create Organization Card
  if (variant === 'create') {
    return (
      <Card
        className="border-2 border-dashed hover:border-primary cursor-pointer transition-colors"
        onClick={onCreate}
      >
        <CardContent className="flex flex-col items-center justify-center py-12 px-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
            <Plus className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm font-medium text-center">Create Organization</p>
          <p className="text-xs text-muted-foreground text-center mt-1">
            Add a new organization
          </p>
        </CardContent>
      </Card>
    )
  }

  // Invitation Card
  if (variant === 'invitation') {
    return (
      <Card className="border-2 border-yellow-500 flex flex-col">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-xl">{name}</CardTitle>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700">
                  Pending Invitation
                </Badge>
              </div>
              <CardDescription>You have been invited to join</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1">
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
          {roleName && (
            <div className="mt-3 text-sm">
              <span className="font-medium">Role: </span>
              <span className="text-muted-foreground">{roleName}</span>
            </div>
          )}
        </CardContent>
        <CardFooter className="gap-2 pt-4">
          <Button
            onClick={handleAccept}
            disabled={isAccepting || isDeclining}
            className="flex-1"
          >
            {isAccepting ? 'Accepting...' : 'Accept'}
          </Button>
          <Button
            variant="outline"
            onClick={handleDecline}
            disabled={isAccepting || isDeclining}
            className="flex-1"
          >
            {isDeclining ? 'Declining...' : 'Decline'}
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // Default Organization Card
  return (
    <Card
      className="hover:border-primary cursor-pointer transition-colors flex flex-col"
      onDoubleClick={handleDoubleClick}
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-xl">{name}</CardTitle>
            <CardDescription>Double-click to view workspaces</CardDescription>
          </div>
          {isMounted ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation()
                  toast.info('Edit functionality coming soon')
                }}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={(e) => {
                    e.stopPropagation()
                    toast.info('Delete functionality coming soon')
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
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
      <CardFooter className="pt-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={(e) => {
            e.stopPropagation()
            handleEnter()
          }}
        >
          <ArrowRight className="mr-2 h-4 w-4" />
          Enter
        </Button>
      </CardFooter>
    </Card>
  )
}
