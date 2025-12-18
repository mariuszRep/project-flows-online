'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import {
  getAllRoles,
  createRole as createRoleAction,
  updateRole as updateRoleAction,
  deleteRole as deleteRoleAction,
} from '@/features/roles/role-actions'
import type { Role, CreateRoleInput, UpdateRoleInput } from '@/types/roles'

interface UseRolesProps {
  organizationId?: string
}

interface UseRolesReturn {
  // Data
  roles: Role[]

  // State
  loading: boolean
  error: string | null

  // Dialog state
  addRoleOpen: boolean
  editRoleOpen: boolean
  selectedRole: Role | null

  // Actions
  refresh: () => Promise<void>
  createRole: (data: CreateRoleInput) => Promise<{ success: boolean; role?: Role; error?: string }>
  updateRole: (id: string, data: UpdateRoleInput) => Promise<{ success: boolean; role?: Role; error?: string }>
  deleteRole: (id: string) => Promise<{ success: boolean; error?: string }>

  // Dialog management
  openAddRoleDialog: () => void
  openEditRoleDialog: (role: Role) => void
  closeRoleDialog: () => void
}

export function useRoles({ organizationId }: UseRolesProps = {}): UseRolesReturn {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog state
  const [addRoleOpen, setAddRoleOpen] = useState(false)
  const [editRoleOpen, setEditRoleOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)

  // Track if we've loaded data to prevent duplicate fetches
  const loadedRef = useRef(false)
  const currentOrgIdRef = useRef<string | undefined>(undefined)

  // Memoize loadRoles so it doesn't change on every render
  const loadRoles = useCallback(async () => {
    console.log('[useRoles] loadRoles called for org:', organizationId)
    try {
      setLoading(true)
      setError(null)

      const rolesResult = await getAllRoles(organizationId)
      if (rolesResult.success && rolesResult.roles) {
        setRoles(rolesResult.roles)
      } else {
        setError(rolesResult.error || 'Failed to load roles')
      }
    } catch (err) {
      console.error('Error loading roles:', err)
      setError('Failed to load roles')
      toast.error('Failed to load roles')
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    console.log('[useRoles] useEffect running', {
      loaded: loadedRef.current,
      currentOrgId: currentOrgIdRef.current,
      newOrgId: organizationId
    })
    // Only load if we haven't loaded yet or if the org ID changed
    if (!loadedRef.current || currentOrgIdRef.current !== organizationId) {
      console.log('[useRoles] Triggering loadRoles')
      currentOrgIdRef.current = organizationId
      loadedRef.current = true
      loadRoles()
    }
    // We intentionally only depend on organizationId here to prevent loops
    // loadRoles is stable and only changes when organizationId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId])

  const createRole = useCallback(async (data: CreateRoleInput) => {
    try {
      const result = await createRoleAction(data)

      if (result.success) {
        toast.success('Role created successfully')
        // Refresh roles data after successful creation
        await loadRoles()
      } else {
        toast.error(result.error || 'Failed to create role')
      }

      return result
    } catch (err) {
      console.error('Error creating role:', err)
      const error = 'An unexpected error occurred'
      toast.error(error)
      return { success: false, error }
    }
  }, [loadRoles])

  const updateRole = useCallback(async (id: string, data: UpdateRoleInput) => {
    try {
      const result = await updateRoleAction(id, data)

      if (result.success) {
        toast.success('Role updated successfully')
        // Refresh roles data after successful update
        await loadRoles()
      } else {
        toast.error(result.error || 'Failed to update role')
      }

      return result
    } catch (err) {
      console.error('Error updating role:', err)
      const error = 'An unexpected error occurred'
      toast.error(error)
      return { success: false, error }
    }
  }, [loadRoles])

  const deleteRole = useCallback(async (id: string) => {
    try {
      const result = await deleteRoleAction(id)

      if (result.success) {
        toast.success('Role deleted successfully')
        // Refresh roles data after successful deletion
        await loadRoles()
      } else {
        toast.error(result.error || 'Failed to delete role')
      }

      return result
    } catch (err) {
      console.error('Error deleting role:', err)
      const error = 'An unexpected error occurred'
      toast.error(error)
      return { success: false, error }
    }
  }, [loadRoles])

  // Dialog management functions
  const openAddRoleDialog = useCallback(() => {
    setSelectedRole(null)
    setAddRoleOpen(true)
    setEditRoleOpen(false)
  }, [])

  const openEditRoleDialog = useCallback((role: Role) => {
    setSelectedRole(role)
    setAddRoleOpen(false)
    setEditRoleOpen(true)
  }, [])

  const closeRoleDialog = useCallback(() => {
    setAddRoleOpen(false)
    setEditRoleOpen(false)
    setSelectedRole(null)
  }, [])

  return {
    roles,
    loading,
    error,
    addRoleOpen,
    editRoleOpen,
    selectedRole,
    refresh: loadRoles,
    createRole,
    updateRole,
    deleteRole,
    openAddRoleDialog,
    openEditRoleDialog,
    closeRoleDialog,
  }
}
