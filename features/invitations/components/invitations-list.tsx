'use client'

import { useState, useMemo, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import {
  MoreHorizontal,
  UserPlus,
  Settings,
  Mail,
  Trash2,
  AlertCircle,
} from 'lucide-react'
import { revokeInvitation, bulkRevokeInvitations } from '../invitation-actions'
import { DataTable } from '@/components/data-table'
import { useInvitations } from '@/hooks/use-invitations'
import { InvitationForm } from './invitation-form'
import { getAllRoles } from '@/features/roles/role-actions'

interface Invitation {
  id: string
  email: string
  status: string
  userId: string
  orgRole: string
  workspaceCount: number
  expiresAt: string
  createdAt: string
}

interface InvitationsListProps {
  organizationId: string
  onInviteUser?: () => void
  onBulkRevoke?: (invitations: Invitation[]) => void
}

export function InvitationsList({ organizationId, onInviteUser, onBulkRevoke }: InvitationsListProps) {
  const { invitations, loading, error, router, refresh } = useInvitations({ organizationId })
  const [invitationToDelete, setInvitationToDelete] = useState<string | null>(null)
  const [isRevoking, setIsRevoking] = useState(false)
  const [selectedRows, setSelectedRows] = useState<Invitation[]>([])
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [showBulkRevokeDialog, setShowBulkRevokeDialog] = useState(false)
  const [roles, setRoles] = useState<Array<{ id: string; name: string; description: string | null }>>([])
  const [loadingRoles, setLoadingRoles] = useState(false)

  useEffect(() => {
    if (showInviteDialog) {
      loadRoles()
    }
  }, [showInviteDialog])

  async function loadRoles() {
    try {
      setLoadingRoles(true)
      const result = await getAllRoles()

      console.log('getAllRoles result:', result)

      if (result.success && result.roles) {
        // All roles are usable for organization invitations
        // Roles with org_id = null are system-wide roles
        // Roles with org_id set are org-specific custom roles
        setRoles(result.roles)
      } else {
        console.error('Failed to load roles:', result.error)
        toast.error(result.error || 'Failed to load roles')
        setRoles([])
      }
    } catch (error) {
      console.error('Error loading roles:', error)
      toast.error('Failed to load roles')
      setRoles([])
    } finally {
      setLoadingRoles(false)
    }
  }

  const handleConfigureWorkspaces = (userId: string) => {
    router.push(`/organization/${organizationId}/invitations/${userId}/workspaces`)
  }

  const handleResendEmail = async (invitationId: string, email: string) => {
    // TODO: Implement resend email functionality
    toast.info('Resend email', {
      description: `This feature will resend the invitation to ${email}`,
    })
  }

  const handleRevokeInvitation = async (invitationId: string) => {
    setIsRevoking(true)
    try {
      const result = await revokeInvitation(invitationId, organizationId)

      if (result.success) {
        toast.success('Invitation revoked', {
          description: 'The invitation has been revoked and user access removed',
        })
        refresh()
      } else {
        toast.error('Failed to revoke invitation', {
          description: result.error || 'An error occurred',
        })
      }
    } catch (error) {
      console.error('Error revoking invitation:', error)
      toast.error('Failed to revoke invitation', {
        description: 'An unexpected error occurred',
      })
    } finally {
      setIsRevoking(false)
      setInvitationToDelete(null)
    }
  }

  const handleBulkRevoke = async () => {
    if (onBulkRevoke) {
      // Use custom handler if provided
      onBulkRevoke(selectedRows)
      setShowBulkRevokeDialog(false)
      return
    }

    // Default implementation
    setIsRevoking(true)
    try {
      const invitationIds = selectedRows.map(inv => inv.id)
      const result = await bulkRevokeInvitations(invitationIds, organizationId)

      if (result.success && result.data) {
        const { count, errors } = result.data

        if (errors.length > 0) {
          toast.warning(`Revoked ${count} invitation(s)`, {
            description: `${errors.length} failed: ${errors[0]}`,
          })
        } else {
          toast.success(`Revoked ${count} invitation(s)`, {
            description: 'The invitations have been revoked and user access removed',
          })
        }

        // Clear selection and refresh
        setSelectedRows([])
        refresh()
      } else {
        toast.error('Failed to revoke invitations', {
          description: result.error || 'An error occurred',
        })
      }
    } catch (error) {
      console.error('Error bulk revoking invitations:', error)
      toast.error('Failed to revoke invitations', {
        description: 'An unexpected error occurred',
      })
    } finally {
      setIsRevoking(false)
      setShowBulkRevokeDialog(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'accepted':
        return <Badge variant="default">Accepted</Badge>
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const bulkActionButton = selectedRows.length > 0 ? (
    <Button
      variant="destructive"
      size="sm"
      onClick={() => setShowBulkRevokeDialog(true)}
    >
      <Trash2 className="mr-2 h-4 w-4" />
      Revoke ({selectedRows.length})
    </Button>
  ) : null

  const columns: ColumnDef<Invitation>[] = useMemo(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => <div className="font-medium">{row.getValue('email')}</div>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => getStatusBadge(row.getValue('status')),
    },
    {
      accessorKey: 'orgRole',
      header: 'Organization Role',
      cell: ({ row }) => <div className="capitalize">{row.getValue('orgRole')}</div>,
    },
    {
      accessorKey: 'workspaceCount',
      header: 'Workspaces',
      cell: ({ row }) => <div>{row.getValue('workspaceCount')}</div>,
    },
    {
      accessorKey: 'createdAt',
      header: 'Invited',
      cell: ({ row }) => (
        <div className="text-muted-foreground">
          {formatDistanceToNow(new Date(row.getValue('createdAt')), { addSuffix: true })}
        </div>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const invitation = row.original
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleConfigureWorkspaces(invitation.userId)}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Configure Workspaces
                </DropdownMenuItem>
                {invitation.status === 'pending' && (
                  <>
                    <DropdownMenuItem
                      onClick={() => handleResendEmail(invitation.id, invitation.email)}
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Resend Email
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => setInvitationToDelete(invitation.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Revoke Invitation
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ], [])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={invitations}
        searchKey="email"
        searchPlaceholder="Filter by email..."
        title="Invitations"
        description="Manage user invitations to your organization"
        action={
          <Button
            size="sm"
            onClick={() => {
              if (onInviteUser) {
                onInviteUser()
              } else {
                setShowInviteDialog(true)
              }
            }}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Invite User
          </Button>
        }
        enableRowSelection={true}
        onRowSelectionChange={setSelectedRows}
        bulkActions={bulkActionButton}
      />

      <AlertDialog open={!!invitationToDelete} onOpenChange={() => setInvitationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke this invitation? This action will remove the user's access
              to the organization and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => invitationToDelete && handleRevokeInvitation(invitationToDelete)}
              className="bg-red-600 hover:bg-red-700"
              disabled={isRevoking}
            >
              {isRevoking ? 'Revoking...' : 'Revoke'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Revoke Confirmation Dialog */}
      <AlertDialog open={showBulkRevokeDialog} onOpenChange={setShowBulkRevokeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke {selectedRows.length} Invitation(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke {selectedRows.length} invitation(s)? This will remove user access
              to the organization for all selected invitations and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkRevoke}
              className="bg-red-600 hover:bg-red-700"
              disabled={isRevoking}
            >
              {isRevoking ? 'Revoking...' : `Revoke ${selectedRows.length}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              Send an invitation to join this organization
            </DialogDescription>
          </DialogHeader>
          <InvitationForm
            organizationId={organizationId}
            roles={roles}
            loadingRoles={loadingRoles}
            onSuccess={() => {
              setShowInviteDialog(false)
              refresh()
            }}
            onCancel={() => setShowInviteDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
