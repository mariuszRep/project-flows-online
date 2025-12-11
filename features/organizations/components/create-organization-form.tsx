'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { createOrganization } from '@/features/organizations/organization-actions'

export function CreateOrganizationForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      toast.error('Please enter an organization name')
      return
    }

    setIsLoading(true)
    try {
      const result = await createOrganization(name.trim())

      if (result.success && result.organization) {
        toast.success('Organization created!', {
          description: `${result.organization.name} has been created successfully.`,
        })
        router.push(`/organization/${result.organization.id}/workspace`)
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
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>
            Enter a name for your new organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Organization Name</Label>
            <Input
              id="name"
              placeholder="e.g., Acme Corp, My Company"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/organization')}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !name.trim()}>
            {isLoading ? 'Creating...' : 'Create Organization'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
