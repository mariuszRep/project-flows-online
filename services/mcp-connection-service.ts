import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export interface CreateConnectionParams {
  userId: string;
  organizationId: string;
  name: string;
  expiresInDays?: number;
}

export interface ConnectionToken {
  token: string;
  connectionId: string;
  expiresAt: Date;
}

/**
 * Service for managing MCP connections
 */
export class MCPConnectionService {
  /**
   * Creates a new MCP connection token
   */
  static async createConnection(params: CreateConnectionParams): Promise<ConnectionToken> {
    const { userId, organizationId, name, expiresInDays = 90 } = params;

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('base64url');
    
    // Hash the token for storage
    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Store in database
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('mcp_connections')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        name,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create connection: ${error.message}`);
    }

    return {
      token,
      connectionId: data.id,
      expiresAt,
    };
  }

  /**
   * Lists all active connections for a user
   */
  static async listConnections(userId: string, organizationId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('mcp_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list connections: ${error.message}`);
    }

    return data;
  }

  /**
   * Revokes a connection
   */
  static async revokeConnection(connectionId: string, userId: string) {
    const supabase = await createClient();
    const { error } = await supabase
      .from('mcp_connections')
      .update({ 
        revoked_at: new Date().toISOString(),
        is_connected: false 
      })
      .eq('id', connectionId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to revoke connection: ${error.message}`);
    }
  }
}
