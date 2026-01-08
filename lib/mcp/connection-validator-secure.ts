import { createClient as createAnonClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export interface ConnectionContext {
  connectionId: string;
  userId: string;
  organizationId: string;
  name: string;
}

interface ValidateTokenResponse {
  connection_id: string;
  user_id: string;
  organization_id: string;
  connection_name: string;
  has_permission: boolean;
}

/**
 * Validates MCP connection tokens against the database
 * Uses database function with SECURITY DEFINER instead of service role key
 * This is more secure as it limits the scope of elevated privileges
 */
export class ConnectionValidator {
  /**
   * Creates an anonymous Supabase client (no service role key needed)
   */
  private static createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase URL or anon key');
    }

    return createAnonClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

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

    // Use anonymous client with database function (SECURITY DEFINER)
    // This is safer than service role key as it limits scope of elevated privileges
    const supabase = this.createClient();

    // Call the secure database function
    const { data, error } = await supabase
      .rpc('validate_mcp_token', { p_token_hash: tokenHash })
      .single();

    if (error) {
      console.error('Token validation error:', error);
      throw new Error('Failed to validate connection token');
    }

    if (!data) {
      throw new Error('Invalid or expired connection token');
    }

    // Type assertion for the response
    const result = data as unknown as ValidateTokenResponse;

    // Check if user has permissions
    if (!result.has_permission) {
      throw new Error('User does not have access to this organization');
    }

    return {
      connectionId: result.connection_id,
      userId: result.user_id,
      organizationId: result.organization_id,
      name: result.connection_name,
    };
  }

  /**
   * Marks a connection as disconnected
   * Note: This still needs service role or a separate SECURITY DEFINER function
   */
  static async disconnect(connectionId: string): Promise<void> {
    const supabase = this.createClient();
    
    // Call disconnect function (you'd need to create this too)
    const { error } = await supabase
      .rpc('disconnect_mcp_connection', { p_connection_id: connectionId });

    if (error) {
      console.error('Disconnect error:', error);
      throw new Error('Failed to disconnect');
    }
  }
}
