'use server';

import { createClient } from '@/lib/supabase/server';
import { MCPConnectionService } from '@/services/mcp-connection-service';
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
