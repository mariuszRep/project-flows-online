'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { sendInvitation } from '../invitation-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Send } from 'lucide-react'

const invitationSchema = z.object({
  email: z.string().email('Invalid email format'),
  orgRoleId: z.string().uuid('Please select a role'),
})

interface Role {
  id: string
  name: string
  description: string | null
}

interface InvitationFormProps {
  organizationId: string
  organizationName?: string
  roles: Role[]
  loadingRoles?: boolean
  onSuccess?: () => void
  onCancel?: () => void
}

export function InvitationForm({ organizationId, roles, loadingRoles = false, onSuccess, onCancel }: InvitationFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [orgRoleId, setOrgRoleId] = useState('')
  const [errors, setErrors] = useState<{ email?: string; orgRoleId?: string }>({})
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const validation = invitationSchema.safeParse({ email, orgRoleId })
    if (!validation.success) {
      const fieldErrors: { email?: string; orgRoleId?: string } = {}
      validation.error.issues.forEach((issue) => {
        const field = issue.path[0] as 'email' | 'orgRoleId'
        fieldErrors[field] = issue.message
      })
      setErrors(fieldErrors)
      return
    }

    setIsLoading(true)

    try {
      const result = await sendInvitation({
        email,
        orgRoleId,
        orgId: organizationId,
      })

      if (result.success && result.data) {
        if (result.data.isExistingUser) {
          toast.success('Invitation sent to existing user!', {
            description: `${email} has been sent a magic link to access this organization.`,
          })
        } else {
          toast.success('Invitation sent successfully!', {
            description: `An invitation email has been sent to ${email}`,
          })
        }

        setEmail('')
        setOrgRoleId('')

        if (onSuccess) {
          onSuccess()
        } else {
          router.push(
            `/organization/${organizationId}/invitations/${result.data.userId}/workspaces`
          )
        }
      } else {
        toast.error('Failed to send invitation', {
          description: result.error || 'An unexpected error occurred',
        })
      }
    } catch (error) {
      console.error('Error sending invitation:', error)
      toast.error('Failed to send invitation', {
        description: 'An unexpected error occurred',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Organization Role</Label>
          <Select
            value={orgRoleId}
            onValueChange={setOrgRoleId}
            disabled={isLoading || loadingRoles}
          >
            <SelectTrigger
              id="role"
              className={errors.orgRoleId ? 'border-red-500' : ''}
            >
              <SelectValue placeholder={loadingRoles ? "Loading roles..." : "Select a role"} />
            </SelectTrigger>
            <SelectContent>
              {roles.length > 0 ? (
                roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    <div className="flex flex-col">
                      <span className="font-medium capitalize">{role.name}</span>
                      {role.description && (
                        <span className="text-xs text-muted-foreground">
                          {role.description}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))
              ) : (
                <div className="p-2 text-sm text-muted-foreground">No roles available</div>
              )}
            </SelectContent>
          </Select>
          {errors.orgRoleId && (
            <p className="text-sm text-red-500">{errors.orgRoleId}</p>
          )}
        </div>
      </div>

      <DialogFooter>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>Sending...</>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send Invitation
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}
