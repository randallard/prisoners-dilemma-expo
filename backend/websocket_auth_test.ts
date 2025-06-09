// backend/websocket_auth_test.ts
import { assertEquals, assertRejects } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { WebSocketAuthenticator, ConnectionManager } from "./websocket_auth.ts";

// Mock Supabase client for testing
const mockSupabase = {
  auth: {
    getUser: async (jwt: string) => {
      // Mock valid JWT
      if (jwt === "valid_jwt_token") {
        return {
          data: {
            user: {
              id: "user_123",
              email: "test@example.com",
              aud: "authenticated"
            }
          },
          error: null
        };
      }
      // Mock expired JWT
      if (jwt === "expired_jwt_token") {
        return {
          data: { user: null },
          error: { message: "JWT expired" }
        };
      }
      // Mock invalid JWT
      return {
        data: { user: null },
        error: { message: "Invalid JWT" }
      };
    }
  }
};

Deno.test("WebSocketAuthenticator - should validate valid JWT token", async () => {
  const authenticator = new WebSocketAuthenticator(mockSupabase as any);
  
  const result = await authenticator.validateJWT("valid_jwt_token");
  
  assertEquals(result.success, true);
  assertEquals(result.userId, "user_123");
  assertEquals(result.email, "test@example.com");
});

Deno.test("WebSocketAuthenticator - should reject expired JWT token", async () => {
  const authenticator = new WebSocketAuthenticator(mockSupabase as any);
  
  const result = await authenticator.validateJWT("expired_jwt_token");
  
  assertEquals(result.success, false);
  assertEquals(result.error, "JWT expired");
});

Deno.test("WebSocketAuthenticator - should reject invalid JWT token", async () => {
  const authenticator = new WebSocketAuthenticator(mockSupabase as any);
  
  const result = await authenticator.validateJWT("invalid_jwt_token");
  
  assertEquals(result.success, false);
  assertEquals(result.error, "Invalid JWT");
});

Deno.test("WebSocketAuthenticator - should reject empty JWT token", async () => {
  const authenticator = new WebSocketAuthenticator(mockSupabase as any);
  
  const result = await authenticator.validateJWT("");
  
  assertEquals(result.success, false);
  assertEquals(result.error, "Missing JWT token");
});

Deno.test("WebSocketAuthenticator - should extract JWT from WebSocket URL", () => {
  const authenticator = new WebSocketAuthenticator(mockSupabase as any);
  
  const jwt = authenticator.extractJWTFromURL("ws://localhost:8000/ws?token=abc123");
  
  assertEquals(jwt, "abc123");
});

Deno.test("WebSocketAuthenticator - should handle missing token in URL", () => {
  const authenticator = new WebSocketAuthenticator(mockSupabase as any);
  
  const jwt = authenticator.extractJWTFromURL("ws://localhost:8000/ws");
  
  assertEquals(jwt, null);
});

Deno.test("WebSocketAuthenticator - should handle malformed URL", () => {
  const authenticator = new WebSocketAuthenticator(mockSupabase as any);
  
  const jwt = authenticator.extractJWTFromURL("not-a-url");
  
  assertEquals(jwt, null);
});

// Connection Manager Tests
Deno.test("ConnectionManager - should store WebSocket connection", () => {
  const connectionManager = new ConnectionManager();
  const mockWebSocket = {} as WebSocket;
  
  connectionManager.addConnection("user_123", mockWebSocket);
  
  assertEquals(connectionManager.hasConnection("user_123"), true);
  assertEquals(connectionManager.getConnection("user_123"), mockWebSocket);
});

Deno.test("ConnectionManager - should remove WebSocket connection", () => {
  const connectionManager = new ConnectionManager();
  const mockWebSocket = {} as WebSocket;
  
  connectionManager.addConnection("user_123", mockWebSocket);
  connectionManager.removeConnection("user_123");
  
  assertEquals(connectionManager.hasConnection("user_123"), false);
  assertEquals(connectionManager.getConnection("user_123"), null);
});

Deno.test("ConnectionManager - should get all active connections", () => {
  const connectionManager = new ConnectionManager();
  const mockWebSocket1 = {} as WebSocket;
  const mockWebSocket2 = {} as WebSocket;
  
  connectionManager.addConnection("user_123", mockWebSocket1);
  connectionManager.addConnection("user_456", mockWebSocket2);
  
  const connections = connectionManager.getAllConnections();
  
  assertEquals(connections.size, 2);
  assertEquals(connections.has("user_123"), true);
  assertEquals(connections.has("user_456"), true);
});

Deno.test("ConnectionManager - should handle duplicate connections", () => {
  const connectionManager = new ConnectionManager();
  const mockWebSocket1 = {} as WebSocket;
  const mockWebSocket2 = {} as WebSocket;
  
  connectionManager.addConnection("user_123", mockWebSocket1);
  connectionManager.addConnection("user_123", mockWebSocket2); // Should replace
  
  assertEquals(connectionManager.hasConnection("user_123"), true);
  assertEquals(connectionManager.getConnection("user_123"), mockWebSocket2);
});

// Integration Tests
Deno.test("WebSocket Authentication Flow - should authenticate and store connection", async () => {
  const authenticator = new WebSocketAuthenticator(mockSupabase as any);
  const connectionManager = new ConnectionManager();
  const mockWebSocket = {} as WebSocket;
  
  // Extract JWT from URL
  const jwt = authenticator.extractJWTFromURL("ws://localhost:8000/ws?token=valid_jwt_token");
  assertEquals(jwt, "valid_jwt_token");
  
  // Validate JWT
  const authResult = await authenticator.validateJWT(jwt!);
  assertEquals(authResult.success, true);
  
  // Store connection
  connectionManager.addConnection(authResult.userId!, mockWebSocket);
  assertEquals(connectionManager.hasConnection("user_123"), true);
});

Deno.test("WebSocket Authentication Flow - should reject invalid authentication", async () => {
  const authenticator = new WebSocketAuthenticator(mockSupabase as any);
  const connectionManager = new ConnectionManager();
  
  // Extract JWT from URL
  const jwt = authenticator.extractJWTFromURL("ws://localhost:8000/ws?token=invalid_jwt_token");
  assertEquals(jwt, "invalid_jwt_token");
  
  // Validate JWT
  const authResult = await authenticator.validateJWT(jwt!);
  assertEquals(authResult.success, false);
  
  // Should not store connection
  assertEquals(connectionManager.hasConnection("user_123"), false);
});