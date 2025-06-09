// backend/websocket_auth.ts
// Use any for now to avoid type import issues during initial setup
type SupabaseClient = any;

export interface AuthResult {
  success: boolean;
  userId?: string;
  email?: string;
  error?: string;
}

export class WebSocketAuthenticator {
  constructor(private supabase: SupabaseClient) {}

  async validateJWT(jwt: string): Promise<AuthResult> {
    // Handle empty JWT token
    if (!jwt || jwt.trim() === "") {
      return {
        success: false,
        error: "Missing JWT token"
      };
    }

    try {
      // Use Supabase auth.getUser to validate the JWT
      const { data, error } = await this.supabase.auth.getUser(jwt);

      // Handle authentication errors
      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      // Handle case where no user is returned
      if (!data.user) {
        return {
          success: false,
          error: "No user found for token"
        };
      }

      // Return successful authentication result
      return {
        success: true,
        userId: data.user.id,
        email: data.user.email
      };
    } catch (error) {
      return {
        success: false,
        error: `JWT validation failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  extractJWTFromURL(url: string): string | null {
    try {
      // Parse the URL to extract query parameters
      const urlObject = new URL(url);
      const token = urlObject.searchParams.get("token");
      
      return token;
    } catch (error) {
      // Handle malformed URLs
      return null;
    }
  }
}

export class ConnectionManager {
  private connections: Map<string, WebSocket> = new Map();

  addConnection(userId: string, webSocket: WebSocket): void {
    // Store the WebSocket connection, replacing any existing connection for this user
    this.connections.set(userId, webSocket);
  }

  removeConnection(userId: string): void {
    // Remove the connection for the specified user
    this.connections.delete(userId);
  }

  hasConnection(userId: string): boolean {
    // Check if a connection exists for the specified user
    return this.connections.has(userId);
  }

  getConnection(userId: string): WebSocket | null {
    // Get the WebSocket connection for the specified user, or null if not found
    return this.connections.get(userId) || null;
  }

  getAllConnections(): Map<string, WebSocket> {
    // Return a copy of the connections map to prevent external modification
    return new Map(this.connections);
  }
}