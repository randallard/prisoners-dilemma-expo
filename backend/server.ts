import { Hono } from "hono";
import { cors } from "hono/middleware.ts";
import { load } from "dotenv";

// Load environment variables
const env = await load();

// Create Hono app instance
const app = new Hono();

// Configure CORS for mobile app
app.use("*", cors({
  origin: ["*"], // In production, specify your mobile app origins
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));

// Health check endpoint
app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

// API v1 routes group
const api = new Hono();

// Basic API health check
api.get("/", (c) => {
  return c.json({
    message: "Prisoners Dilemma API v1",
    status: "ready",
    endpoints: {
      health: "/health",
      api: "/api/v1",
      websocket: "/ws (coming soon)"
    }
  });
});

// Mount API routes
app.route("/api/v1", api);

// 404 handler
app.notFound((c) => {
  return c.json({
    error: "Not Found",
    message: "The requested endpoint does not exist"
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error("Server error:", err);
  return c.json({
    error: "Internal Server Error",
    message: "Something went wrong"
  }, 500);
});

// Start server
const port = parseInt(env.PORT || "8000");
console.log(`🚀 Server starting on port ${port}`);
console.log(`📡 Health check: http://localhost:${port}/health`);
console.log(`🔗 API v1: http://localhost:${port}/api/v1`);

Deno.serve({ port }, app.fetch);