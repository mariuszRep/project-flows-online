import { NextRequest } from 'next/server';
import { ConnectionValidator, ConnectionContext } from './connection-validator';

/**
 * Authentication context providing clean API for accessing validated connection
 * throughout the MCP request lifecycle
 */
export class AuthContext {
  private connection: ConnectionContext;

  private constructor(connection: ConnectionContext) {
    this.connection = connection;
  }

  /**
   * Creates AuthContext from NextRequest by extracting and validating connection token
   * @throws Error if Authorization header is missing or token is invalid
   */
  static async fromRequest(request: NextRequest): Promise<AuthContext> {
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    // Extract token from Bearer scheme
    // Handle both "Bearer <token>" and "Bearer: <token>" (adapter bug workaround)
    const parts = authHeader.split(' ');

    // Check for valid Bearer format (with or without colon)
    if (parts.length !== 2 || (!parts[0].startsWith('Bearer'))) {
      throw new Error('Invalid Authorization header format. Expected: Bearer <token>');
    }

    const token = parts[1];
    const connection = await ConnectionValidator.validateToken(token);

    return new AuthContext(connection);
  }

  /**
   * Gets the user ID from the connection
   */
  getUserId(): string {
    return this.connection.userId;
  }

  /**
   * Gets the organization ID from the connection
   */
  getOrganizationId(): string {
    return this.connection.organizationId;
  }

  /**
   * Gets the connection ID
   */
  getConnectionId(): string {
    return this.connection.connectionId;
  }

  /**
   * Gets the connection name
   */
  getConnectionName(): string {
    return this.connection.name;
  }

  /**
   * Gets the array of scopes (for future use)
   */
  getScopes(): string[] {
    return ['mcp:execute']; // Default scope for all connections
  }

  /**
   * Checks if the user has a specific scope
   */
  hasScope(scope: string): boolean {
    return this.getScopes().includes(scope);
  }
}
