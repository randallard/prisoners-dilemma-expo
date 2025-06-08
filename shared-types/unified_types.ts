// unified_types.ts - Minimal implementation for TDD
// This compiles but will fail most tests - that's the point!

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// ============================================================================
// DATABASE ENUMS (matching SQL schema exactly)
// ============================================================================
export type FriendshipStatus = "pending" | "accepted" | "blocked";
export type GameType = "tic_tac_toe";
export type SessionStatus = "invited" | "accepted" | "in_progress" | "completed";
export type MessageType = "text" | "image" | "system";

// ============================================================================
// DATABASE RECORD INTERFACES (for persistence)
// ============================================================================

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Friendship {
  id: string;
  user1_id: string;
  user2_id: string;
  status: FriendshipStatus;
  created_at: string;
  accepted_at: string | null;
}

export interface GameSession {
  id: string;
  player1_id: string;
  player2_id: string;
  game_type: GameType;
  status: SessionStatus;
  winner_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface TicTacToeGame {
  session_id: string;
  board_state: string[];
  current_turn: string;
}

export interface ChatMessageRecord {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: MessageType;
  created_at: string;
  read_at: string | null;
}

// ============================================================================
// REAL-TIME MESSAGE TYPES (for WebSocket communication)
// ============================================================================

export type RealtimeMessageType = 
  | "chat"
  | "game_move" 
  | "game_invite"
  | "game_accept"
  | "game_complete"
  | "friend_request"
  | "friend_accept"
  | "presence_update"
  | "typing_indicator"
  | "connection_status";

export interface RealtimeMessage<TPayload = any> {
  type: RealtimeMessageType;
  payload: TPayload;
  userId: string;
  timestamp: string;
  messageId?: string;
}

// ============================================================================
// REAL-TIME PAYLOAD INTERFACES
// ============================================================================

export interface ChatPayload {
  content: string;
  receiverId: string;
  messageType: MessageType;
}

export interface GameMovePayload {
  sessionId: string;
  gameType: GameType;
  moveData: TicTacToeMoveData | any;
}

export interface TicTacToeMoveData {
  position: number;
  player: string;
  boardState: string[];
}

export interface GameInvitePayload {
  invitedUserId: string;
  gameType: GameType;
  sessionId: string;
}

export interface FriendRequestPayload {
  targetUserId: string;
  requesterId: string;
  requesterName: string;
}

export interface PresencePayload {
  status: "online" | "away" | "offline";
  lastSeen?: string;
}

export interface TypingIndicatorPayload {
  conversationId: string;
  isTyping: boolean;
}

// ============================================================================
// TRANSFORMATION UTILITIES (minimal stub implementations)
// ============================================================================

export class MessageTransformer {
  
  static chatRecordToRealtime(record: ChatMessageRecord): RealtimeMessage<ChatPayload> {
    // TODO: Implement proper transformation
    return {
      type: "chat",
      payload: {
        content: "",
        receiverId: "",
        messageType: "text"
      },
      userId: "",
      timestamp: ""
    };
  }

  static realtimeChatToRecord(
    message: RealtimeMessage<ChatPayload>, 
    generatedId: string
  ): Omit<ChatMessageRecord, 'created_at' | 'read_at'> {
    // TODO: Implement proper transformation
    return {
      id: "",
      sender_id: "",
      receiver_id: "",
      content: "",
      message_type: "text"
    };
  }

  static gameSessionToRealtimeInvite(session: GameSession): RealtimeMessage<GameInvitePayload> {
    // TODO: Implement proper transformation
    return {
      type: "game_invite",
      payload: {
        invitedUserId: "",
        gameType: "tic_tac_toe",
        sessionId: ""
      },
      userId: "",
      timestamp: ""
    };
  }

  static ticTacToeGameToRealtimeMove(
    game: TicTacToeGame, 
    lastMove: number
  ): RealtimeMessage<GameMovePayload> {
    // TODO: Implement proper transformation
    return {
      type: "game_move",
      payload: {
        sessionId: "",
        gameType: "tic_tac_toe",
        moveData: {
          position: 0,
          player: "",
          boardState: []
        }
      },
      userId: "",
      timestamp: ""
    };
  }

  static friendshipToRealtimeRequest(friendship: Friendship, requesterProfile: UserProfile): RealtimeMessage<FriendRequestPayload> {
    // TODO: Implement proper transformation
    return {
      type: "friend_request",
      payload: {
        targetUserId: "",
        requesterId: "",
        requesterName: ""
      },
      userId: "",
      timestamp: ""
    };
  }
}

// ============================================================================
// VALIDATION FUNCTIONS (minimal stub implementations that always fail)
// ============================================================================

export function validateUserProfile(profile: any): ValidationResult {
  // TODO: Implement proper validation
  return {
    isValid: false,
    errors: ["Not implemented yet"]
  };
}

export function validateFriendship(friendship: any): ValidationResult {
  // TODO: Implement proper validation
  return {
    isValid: false,
    errors: ["Not implemented yet"]
  };
}

export function validateGameSession(session: any): ValidationResult {
  // TODO: Implement proper validation
  return {
    isValid: false,
    errors: ["Not implemented yet"]
  };
}

export function validateTicTacToeGame(game: any): ValidationResult {
  // TODO: Implement proper validation
  return {
    isValid: false,
    errors: ["Not implemented yet"]
  };
}

export function validateChatMessageRecord(message: any): ValidationResult {
  // TODO: Implement proper validation
  return {
    isValid: false,
    errors: ["Not implemented yet"]
  };
}

export function validateRealtimeMessage(message: any): ValidationResult {
  // TODO: Implement proper validation
  return {
    isValid: false,
    errors: ["Not implemented yet"]
  };
}

export function validateChatPayload(payload: any): ValidationResult {
  // TODO: Implement proper validation
  return {
    isValid: false,
    errors: ["Not implemented yet"]
  };
}

export function validateGameMovePayload(payload: any): ValidationResult {
  // TODO: Implement proper validation
  return {
    isValid: false,
    errors: ["Not implemented yet"]
  };
}

// ============================================================================
// UTILITY FUNCTIONS (minimal stub implementations)
// ============================================================================

export function createRealtimeMessage<T>(
  type: RealtimeMessageType,
  payload: T,
  userId: string,
  messageId?: string
): RealtimeMessage<T> {
  // TODO: Implement proper message creation
  return {
    type,
    payload,
    userId,
    timestamp: "",
    messageId
  };
}

export function ensureFriendshipOrdering(user1Id: string, user2Id: string): [string, string] {
  // TODO: Implement proper ordering
  return [user1Id, user2Id];
}