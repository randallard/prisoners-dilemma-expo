import { createClient } from "supabase";
import type { Database } from "shared-types/database.ts";

// Environment variables validation
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY"
  );
}

// Create typed Supabase client
export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false, // Server-side, no persistent sessions
    },
    realtime: {
      enabled: true, // Enable real-time subscriptions
    },
  }
);

// Database connection test utility
export async function testDatabaseConnection(): Promise<{
  success: boolean;
  message: string;
  timestamp: string;
}> {
  try {
    // Simple query to test connection
    const { data, error } = await supabase
      .from("users")
      .select("count")
      .limit(1);

    if (error) {
      return {
        success: false,
        message: `Database connection error: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      success: true,
      message: "Database connection successful",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      message: `Connection test failed: ${error.message}`,
      timestamp: new Date().toISOString(),
    };
  }
}

// User management utilities
export class UserService {
  // Get user by ID
  static async getUser(userId: string) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      throw new Error(`Failed to get user: ${error.message}`);
    }

    return data;
  }

  // Create or update user profile
  static async upsertUser(user: {
    id: string;
    email?: string;
    username?: string;
    display_name?: string;
  }) {
    const { data, error } = await supabase
      .from("users")
      .upsert(user)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to upsert user: ${error.message}`);
    }

    return data;
  }

  // Get user by email
  static async getUserByEmail(email: string) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error && error.code !== "PGRST116") { // PGRST116 = no rows returned
      throw new Error(`Failed to get user by email: ${error.message}`);
    }

    return data;
  }
}

// JWT verification utility
export async function verifySupabaseJWT(token: string): Promise<{
  valid: boolean;
  user?: any;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error) {
      return {
        valid: false,
        error: error.message,
      };
    }

    if (!data.user) {
      return {
        valid: false,
        error: "No user found for token",
      };
    }

    return {
      valid: true,
      user: data.user,
    };
  } catch (error) {
    return {
      valid: false,
      error: `JWT verification failed: ${error.message}`,
    };
  }
}

// Connection management utilities
export class ConnectionService {
  // Create a new connection link
  static async createConnectionLink(userId: string, expiresIn: number = 3600) {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    const { data, error } = await supabase
      .from("connection_links")
      .insert({
        token,
        created_by: userId,
        expires_at: expiresAt.toISOString(),
        is_used: false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create connection link: ${error.message}`);
    }

    return data;
  }

  // Validate and use connection link
  static async acceptConnectionLink(token: string, userId: string) {
    // Start a transaction
    const { data: linkData, error: linkError } = await supabase
      .from("connection_links")
      .select("*")
      .eq("token", token)
      .eq("is_used", false)
      .single();

    if (linkError) {
      throw new Error(`Connection link not found or already used`);
    }

    // Check if link is expired
    if (new Date(linkData.expires_at) < new Date()) {
      throw new Error("Connection link has expired");
    }

    // Check if user is trying to connect to themselves
    if (linkData.created_by === userId) {
      throw new Error("Cannot connect to yourself");
    }

    // Mark link as used
    const { error: updateError } = await supabase
      .from("connection_links")
      .update({ is_used: true, used_by: userId, used_at: new Date().toISOString() })
      .eq("token", token);

    if (updateError) {
      throw new Error(`Failed to update connection link: ${updateError.message}`);
    }

    // Create friendship (bidirectional)
    const { error: friendshipError } = await supabase
      .from("friendships")
      .insert([
        {
          user_id: linkData.created_by,
          friend_id: userId,
          status: "accepted",
        },
        {
          user_id: userId,
          friend_id: linkData.created_by,
          status: "accepted",
        },
      ]);

    if (friendshipError) {
      throw new Error(`Failed to create friendship: ${friendshipError.message}`);
    }

    return {
      success: true,
      friendId: linkData.created_by,
    };
  }
}