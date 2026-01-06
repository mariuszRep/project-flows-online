import { createServiceRoleClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export interface ConnectionContext {
  connectionId: string;
  userId: string;
  organizationId: string;
  name: string;
}

/**
 * Validates MCP connection tokens against the database
 * Replaces JWT validation for better UX with long-lived tokens
 */
export class ConnectionValidator {
  /**
   * Validates a connection token and returns the connection context
   * @throws Error if token is invalid, expired, or revoked
   */
  static async validateToken(token: string): Promise<ConnectionContext> {
    if (!token) {
      throw new Error('Missing connection token');
    }

    // Hash the token for comparison (tokens are stored hashed)
    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Query the database for the connection using service role to bypass RLS
    // MCP token validation happens before user authentication
    const supabase = createServiceRoleClient();

    const { data: connection, error } = await supabase
      .from('mcp_connections')
      .select('*')
      .eq('token_hash', tokenHash)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !connection) {
      throw new Error('Invalid or expired connection token');
    }

    // CRITICAL: Verify user still has access to the organization
    // Prevents revoked members from using old tokens
    const { data: permission, error: permError } = await supabase
      .from('permissions')
      .select('id')
      .eq('principal_id', connection.user_id)
      .eq('principal_type', 'user')
      .eq('org_id', connection.organization_id)
      .is('deleted_at', null)
      .single();

    if (permError || !permission) {
      // User no longer has org access - auto-revoke the token
      await supabase
        .from('mcp_connections')
        .update({
          revoked_at: new Date().toISOString(),
          is_connected: false
        })
        .eq('id', connection.id);

      throw new Error('Connection token revoked: user no longer has organization access');
    }

    // Update last_used_at
    await supabase
      .from('mcp_connections')
      .update({
        last_used_at: new Date().toISOString(),
        is_connected: true
      })
      .eq('id', connection.id);

    return {
      connectionId: connection.id,
      userId: connection.user_id,
      organizationId: connection.organization_id,
      name: connection.name,
    };
  }

  /**
   * Marks a connection as disconnected
   */
  static async disconnect(connectionId: string): Promise<void> {
    const supabase = createServiceRoleClient();
    await supabase
      .from('mcp_connections')
      .update({ is_connected: false })
      .eq('id', connectionId);
  }
}
