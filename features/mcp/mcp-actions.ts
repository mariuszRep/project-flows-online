'use server';

import { createClient } from '@/lib/supabase/server';
import { MCPConnectionService } from '@/services/mcp-connection-service';
import { SessionManager, type SessionRecord } from '@/lib/mcp/session-manager';
import { revalidatePath } from 'next/cache';

export interface GenerateTokenResult {
  success: boolean;
  token?: string;
  connectionId?: string;
  expiresAt?: string;
  error?: string;
}

export interface Connection {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string;
  is_connected: boolean;
}

export type MCPSession = SessionRecord;

/**
 * Generates a new MCP connection token for the authenticated user
 */
export async function generateMCPToken(
  organizationId: string,
  name?: string
): Promise<GenerateTokenResult> {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Generate connection name if not provided
    const connectionName = name || `Connection ${new Date().toLocaleDateString()}`;

    // Create connection token
    const connection = await MCPConnectionService.createConnection({
      userId: user.id,
      organizationId,
      name: connectionName,
      expiresInDays: 90,
    });

    revalidatePath(`/organizations/${organizationId}/settings/mcp/connections`);

    return {
      success: true,
      token: connection.token,
      connectionId: connection.connectionId,
      expiresAt: connection.expiresAt.toISOString(),
    };
  } catch (error) {
    console.error('Failed to generate MCP token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate token',
    };
  }
}

async function ensureOrganizationAccess(organizationId: string): Promise<{ userId: string } | null> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: permissions, error: permError } = await supabase
    .from('permissions')
    .select('id')
    .eq('principal_id', user.id)
    .eq('principal_type', 'user')
    .eq('org_id', organizationId)
    .is('deleted_at', null)
    .limit(1);

  if (permError || !permissions || permissions.length === 0) {
    return null;
  }

  return { userId: user.id };
}

/**
 * Lists all active MCP sessions for the organization
 */
export async function listMCPSessions(organizationId: string): Promise<MCPSession[]> {
  const access = await ensureOrganizationAccess(organizationId);
  if (!access) {
    return [];
  }

  return SessionManager.listSessionsByOrganization(organizationId);
}

/**
 * Deletes a specific MCP session
 */
export async function deleteMCPSession(
  sessionId: string,
  userId: string,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  const access = await ensureOrganizationAccess(organizationId);
  if (!access) {
    return { success: false, error: 'Not authorized' };
  }

  const session = await SessionManager.getSession(sessionId, userId);
  if (!session || session.organizationId !== organizationId) {
    return { success: false, error: 'Session not found' };
  }

  try {
    await SessionManager.deleteSession(sessionId, userId);
    revalidatePath(`/organizations/${organizationId}/settings/mcp/sessions`);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete session:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete session',
    };
  }
}

/**
 * Bulk deletes MCP sessions
 */
export async function bulkDeleteMCPSessions(
  sessions: { sessionId: string; userId: string }[],
  organizationId: string
): Promise<{ successCount: number; failCount: number; successIds: string[] }> {
  const access = await ensureOrganizationAccess(organizationId);
  if (!access) {
    return { successCount: 0, failCount: sessions.length, successIds: [] };
  }

  let successCount = 0;
  let failCount = 0;
  const successIds: string[] = [];

  for (const session of sessions) {
    const result = await deleteMCPSession(session.sessionId, session.userId, organizationId);
    if (result.success) {
      successCount += 1;
      successIds.push(session.sessionId);
    } else {
      failCount += 1;
    }
  }

  return { successCount, failCount, successIds };
}

/**
 * Lists all active MCP connections for the authenticated user
 */
export async function listMCPConnections(organizationId: string): Promise<Connection[]> {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return [];
    }

    const connections = await MCPConnectionService.listConnections(user.id, organizationId);
    
    return connections as Connection[];
  } catch (error) {
    console.error('Failed to list connections:', error);
    return [];
  }
}

/**
 * Revokes an MCP connection
 */
export async function revokeMCPConnection(
  connectionId: string,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    await MCPConnectionService.revokeConnection(connectionId, user.id);
    
    revalidatePath(`/organizations/${organizationId}/settings/mcp/connections`);

    return { success: true };
  } catch (error) {
    console.error('Failed to revoke connection:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to revoke connection',
    };
  }
}
