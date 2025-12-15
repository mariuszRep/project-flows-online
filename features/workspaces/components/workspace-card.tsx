'use client'

import Link from 'next/link'
import { FolderKanban, Users, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface WorkspaceCardProps {
  id: string
  organizationId: string
  name: string
  memberCount: number
  updatedAt: string
}

export function WorkspaceCard({ id, organizationId, name, memberCount, updatedAt }: WorkspaceCardProps) {
  const lastUpdated = new Date(updatedAt)
  const now = new Date()
  const diffMs = now.getTime() - lastUpdated.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  let timeAgo = ''
  if (diffDays === 0) {
    timeAgo = 'Today'
  } else if (diffDays === 1) {
    timeAgo = 'Yesterday'
  } else if (diffDays < 7) {
    timeAgo = `${diffDays} days ago`
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    timeAgo = `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`
  } else {
    const months = Math.floor(diffDays / 30)
    timeAgo = `${months} ${months === 1 ? 'month' : 'months'} ago`
  }

  return (
    <Link href={`/organizations/${organizationId}/workspaces/${id}`}>
      <Card className="hover:border-primary transition-colors cursor-pointer h-full">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <FolderKanban className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">{name}</CardTitle>
                <CardDescription>Click to open workspace</CardDescription>
              </div>
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
              <Clock className="h-4 w-4" />
              <span>Updated {timeAgo}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
