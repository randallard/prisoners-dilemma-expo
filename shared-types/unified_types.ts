// ============================================================================
// UNIFIED TYPE SYSTEM - Real-time + Database Persistence
// ============================================================================
// This replaces both database.ts and message.ts with a unified approach
// that supports real-time messaging and database persistence for all game types

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
  board_state: string[]; // Matches JSONB array in database
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

// Generic real-time message envelope
export interface RealtimeMessage<TPayload = any> {
  type: RealtimeMessageType;
  payload: TPayload;
  userId: string;
  timestamp: string;
  messageId?: string; // For correlation with database records
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
  moveData: TicTacToeMoveData | any; // Extensible for future game types
}

export interface TicTacToeMoveData {
  position: number; // 0-8 for board position
  player: string; // user ID
  boardState: string[]; // Updated board state
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
  conversationId: string; // Can be friend ID or game session ID
  isTyping: boolean;
}

// ============================================================================
// TRANSFORMATION UTILITIES
// ============================================================================

export class MessageTransformer {
  
  // Chat message transformations
  static chatRecordToRealtime(record: ChatMessageRecord): RealtimeMessage<ChatPayload> {
    return {
      type: "chat",
      payload: {
        content: record.content,
        receiverId: record.receiver_id,
        messageType: record.message_type
      },
      userId: record.sender_id,
      timestamp: record.created_at,
      messageId: record.id
    };
  }

  static realtimeChatToRecord(
    message: RealtimeMessage<ChatPayload>, 
    generatedId: string
  ): Omit<ChatMessageRecord, 'created_at' | 'read_at'> {
    return {
      id: generatedId,
      sender_id: message.userId,
      receiver_id: message.payload.receiverId,
      content: message.payload.content,
      message_type: message.payload.messageType
    };
  }

  // Game move transformations  
  static gameSessionToRealtimeInvite(session: GameSession): RealtimeMessage<GameInvitePayload> {
    return {
      type: "game_invite",
      payload: {
        invitedUserId: session.player2_id,
        gameType: session.game_type,
        sessionId: session.id
      },
      userId: session.player1_id,
      timestamp: session.created_at,
      messageId: session.id
    };
  }

  static ticTacToeGameToRealtimeMove(
    game: TicTacToeGame, 
    lastMove: number
  ): RealtimeMessage<GameMovePayload> {
    return {
      type: "game_move",
      payload: {
        sessionId: game.session_id,
        gameType: "tic_tac_toe",
        moveData: {
          position: lastMove,
          player: game.current_turn,
          boardState: game.board_state
        }
      },
      userId: game.current_turn,
      timestamp: new Date().toISOString()
    };
  }

  // Friend request transformations
  static friendshipToRealtimeRequest(friendship: Friendship, requesterProfile: UserProfile): RealtimeMessage<FriendRequestPayload> {
    return {
      type: "friend_request",
      payload: {
        targetUserId: friendship.user2_id,
        requesterId: friendship.user1_id,
        requesterName: requesterProfile.display_name
      },
      userId: friendship.user1_id,
      timestamp: friendship.created_at,
      messageId: friendship.id
    };
  }
}

// ============================================================================
// VALIDATION FUNCTIONS (Enhanced from original)
// ============================================================================

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidISODate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString === date.toISOString();
}

function isValidFriendshipStatus(status: string): status is FriendshipStatus {
  return ["pending", "accepted", "blocked"].includes(status);
}

function isValidGameType(gameType: string): gameType is GameType {
  return ["tic_tac_toe"].includes(gameType);
}

function isValidSessionStatus(status: string): status is SessionStatus {
  return ["invited", "accepted", "in_progress", "completed"].includes(status);
}

function isValidMessageType(messageType: string): messageType is MessageType {
  return ["text", "image", "system"].includes(messageType);
}

function isValidRealtimeMessageType(type: string): type is RealtimeMessageType {
  return [
    "chat", "game_move", "game_invite", "game_accept", "game_complete",
    "friend_request", "friend_accept", "presence_update", "typing_indicator", "connection_status"
  ].includes(type);
}

// ============================================================================
// DATABASE RECORD VALIDATION
// ============================================================================

export function validateUserProfile(profile: any): ValidationResult {
  if (!profile || typeof profile !== "object") {
    return { isValid: false, errors: ["Profile must be an object"] };
  }

  const errors: string[] = [];

  if (!profile.id || typeof profile.id !== "string" || !isValidUUID(profile.id)) {
    errors.push("Invalid UUID format for id");
  }

  if (!profile.email || typeof profile.email !== "string" || !isValidEmail(profile.email)) {
    errors.push("Invalid email format");
  }

  if (!profile.display_name || typeof profile.display_name !== "string" || profile.display_name.trim() === "") {
    errors.push("Display name cannot be empty");
  }

  if (profile.avatar_url !== null && typeof profile.avatar_url !== "string") {
    errors.push("Avatar URL must be a string or null");
  }

  if (!profile.created_at || typeof profile.created_at !== "string" || !isValidISODate(profile.created_at)) {
    errors.push("Invalid date format for created_at");
  }

  if (!profile.updated_at || typeof profile.updated_at !== "string" || !isValidISODate(profile.updated_at)) {
    errors.push("Invalid date format for updated_at");
  }

  return { isValid: errors.length === 0, errors };
}

export function validateFriendship(friendship: any): ValidationResult {
  if (!friendship || typeof friendship !== "object") {
    return { isValid: false, errors: ["Friendship must be an object"] };
  }

  const errors: string[] = [];

  if (!friendship.id || typeof friendship.id !== "string" || !isValidUUID(friendship.id)) {
    errors.push("Invalid UUID format for id");
  }

  if (!friendship.user1_id || typeof friendship.user1_id !== "string" || !isValidUUID(friendship.user1_id)) {
    errors.push("Invalid UUID format for user1_id");
  }

  if (!friendship.user2_id || typeof friendship.user2_id !== "string" || !isValidUUID(friendship.user2_id)) {
    errors.push("Invalid UUID format for user2_id");
  }

  if (friendship.user1_id === friendship.user2_id) {
    errors.push("Users cannot be friends with themselves");
  }

  // REMOVED: Friendship ordering constraint validation
  // Application will handle duplicate prevention with lookup logic

  if (!friendship.status || !isValidFriendshipStatus(friendship.status)) {
    errors.push("Invalid friendship status");
  }

  if (!friendship.created_at || typeof friendship.created_at !== "string" || !isValidISODate(friendship.created_at)) {
    errors.push("Invalid date format for created_at");
  }

  if (friendship.status === "accepted" && !friendship.accepted_at) {
    errors.push("Accepted friendships must have accepted_at timestamp");
  }

  if (friendship.accepted_at && (typeof friendship.accepted_at !== "string" || !isValidISODate(friendship.accepted_at))) {
    errors.push("Invalid date format for accepted_at");
  }

  return { isValid: errors.length === 0, errors };
}

export function validateGameSession(session: any): ValidationResult {
  if (!session || typeof session !== "object") {
    return { isValid: false, errors: ["Game session must be an object"] };
  }

  const errors: string[] = [];

  if (!session.id || typeof session.id !== "string" || !isValidUUID(session.id)) {
    errors.push("Invalid UUID format for id");
  }

  if (!session.player1_id || typeof session.player1_id !== "string" || !isValidUUID(session.player1_id)) {
    errors.push("Invalid UUID format for player1_id");
  }

  if (!session.player2_id || typeof session.player2_id !== "string" || !isValidUUID(session.player2_id)) {
    errors.push("Invalid UUID format for player2_id");
  }

  if (session.player1_id === session.player2_id) {
    errors.push("Players cannot play against themselves");
  }

  if (!session.game_type || !isValidGameType(session.game_type)) {
    errors.push("Invalid game type");
  }

  if (!session.status || !isValidSessionStatus(session.status)) {
    errors.push("Invalid session status");
  }

  if (session.winner_id !== null && (typeof session.winner_id !== "string" || !isValidUUID(session.winner_id))) {
    errors.push("Invalid UUID format for winner_id");
  }

  // Validate winner is one of the players (matching database constraint)
  if (session.winner_id && session.winner_id !== session.player1_id && session.winner_id !== session.player2_id) {
    errors.push("Winner must be one of the players");
  }

  if (!session.created_at || typeof session.created_at !== "string" || !isValidISODate(session.created_at)) {
    errors.push("Invalid date format for created_at");
  }

  if (!session.updated_at || typeof session.updated_at !== "string" || !isValidISODate(session.updated_at)) {
    errors.push("Invalid date format for updated_at");
  }

  // Validate completion logic (matching database constraint)
  if (session.status === "completed") {
    if (!session.completed_at) {
      errors.push("Completed sessions must have completed_at timestamp");
    }
  } else {
    if (session.completed_at) {
      errors.push("Non-completed sessions must not have completed_at timestamp");
    }
  }

  if (session.completed_at && (typeof session.completed_at !== "string" || !isValidISODate(session.completed_at))) {
    errors.push("Invalid date format for completed_at");
  }

  return { isValid: errors.length === 0, errors };
}

export function validateTicTacToeGame(game: any): ValidationResult {
  if (!game || typeof game !== "object") {
    return { isValid: false, errors: ["Tic-tac-toe game must be an object"] };
  }

  const errors: string[] = [];

  if (!game.session_id || typeof game.session_id !== "string" || !isValidUUID(game.session_id)) {
    errors.push("Invalid UUID format for session_id");
  }

  if (!Array.isArray(game.board_state) || game.board_state.length !== 9) {
    errors.push("Tic-tac-toe board must have exactly 9 positions");
  } else {
    for (const position of game.board_state) {
      if (typeof position !== "string" || !["X", "O", ""].includes(position)) {
        errors.push("Board positions must be 'X', 'O', or empty string");
        break;
      }
    }
  }

  if (!game.current_turn || typeof game.current_turn !== "string" || !isValidUUID(game.current_turn)) {
    errors.push("Invalid UUID format for current_turn");
  }

  return { isValid: errors.length === 0, errors };
}

export function validateChatMessageRecord(message: any): ValidationResult {
  if (!message || typeof message !== "object") {
    return { isValid: false, errors: ["Message must be an object"] };
  }

  const errors: string[] = [];

  if (!message.id || typeof message.id !== "string" || !isValidUUID(message.id)) {
    errors.push("Invalid UUID format for id");
  }

  if (!message.sender_id || typeof message.sender_id !== "string" || !isValidUUID(message.sender_id)) {
    errors.push("Invalid UUID format for sender_id");
  }

  if (!message.receiver_id || typeof message.receiver_id !== "string" || !isValidUUID(message.receiver_id)) {
    errors.push("Invalid UUID format for receiver_id");
  }

  if (message.sender_id === message.receiver_id) {
    errors.push("Sender and receiver cannot be the same user");
  }

  if (!message.content || typeof message.content !== "string" || message.content.trim() === "") {
    errors.push("Message content cannot be empty");
  } else if (message.content.length > 5000) {
    errors.push("Message content exceeds maximum length of 5000 characters");
  }

  if (!message.message_type || !isValidMessageType(message.message_type)) {
    errors.push("Invalid message type");
  }

  if (!message.created_at || typeof message.created_at !== "string" || !isValidISODate(message.created_at)) {
    errors.push("Invalid date format for created_at");
  }

  if (message.read_at !== null && (typeof message.read_at !== "string" || !isValidISODate(message.read_at))) {
    errors.push("Invalid date format for read_at");
  }

  return { isValid: errors.length === 0, errors };
}

// ============================================================================
// REAL-TIME MESSAGE VALIDATION
// ============================================================================

export function validateRealtimeMessage(message: any): ValidationResult {
  if (!message || typeof message !== "object") {
    return { isValid: false, errors: ["Message must be an object"] };
  }

  const errors: string[] = [];

  if (!message.type || !isValidRealtimeMessageType(message.type)) {
    errors.push("Invalid message type");
  }

  if (!message.payload || typeof message.payload !== "object") {
    errors.push("Payload must be an object");
  }

  if (!message.userId || typeof message.userId !== "string" || !isValidUUID(message.userId)) {
    errors.push("Invalid UUID format for userId");
  }

  if (!message.timestamp || typeof message.timestamp !== "string" || !isValidISODate(message.timestamp)) {
    errors.push("Invalid date format for timestamp");
  }

  if (message.messageId && (typeof message.messageId !== "string" || !isValidUUID(message.messageId))) {
    errors.push("Invalid UUID format for messageId");
  }

  return { isValid: errors.length === 0, errors };
}

export function validateChatPayload(payload: any): ValidationResult {
  if (!payload || typeof payload !== "object") {
    return { isValid: false, errors: ["Chat payload must be an object"] };
  }

  const errors: string[] = [];

  if (!payload.content || typeof payload.content !== "string" || payload.content.trim() === "") {
    errors.push("Content must be a non-empty string");
  }

  if (!payload.receiverId || typeof payload.receiverId !== "string" || !isValidUUID(payload.receiverId)) {
    errors.push("Invalid UUID format for receiverId");
  }

  if (!payload.messageType || !isValidMessageType(payload.messageType)) {
    errors.push("Invalid message type");
  }

  return { isValid: errors.length === 0, errors };
}

export function validateGameMovePayload(payload: any): ValidationResult {
  if (!payload || typeof payload !== "object") {
    return { isValid: false, errors: ["Game move payload must be an object"] };
  }

  const errors: string[] = [];

  if (!payload.sessionId || typeof payload.sessionId !== "string" || !isValidUUID(payload.sessionId)) {
    errors.push("Invalid UUID format for sessionId");
  }

  if (!payload.gameType || !isValidGameType(payload.gameType)) {
    errors.push("Invalid game type");
  }

  if (!payload.moveData || typeof payload.moveData !== "object") {
    errors.push("Move data must be an object");
  }

  // Validate tic-tac-toe specific move data
  if (payload.gameType === "tic_tac_toe" && payload.moveData) {
    const moveData = payload.moveData;
    
    if (typeof moveData.position !== "number" || moveData.position < 0 || moveData.position > 8) {
      errors.push("Tic-tac-toe position must be a number between 0 and 8");
    }

    if (!moveData.player || typeof moveData.player !== "string" || !isValidUUID(moveData.player)) {
      errors.push("Invalid UUID format for player");
    }

    if (!Array.isArray(moveData.boardState) || moveData.boardState.length !== 9) {
      errors.push("Board state must be an array of 9 elements");
    }
  }

  return { isValid: errors.length === 0, errors };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function createRealtimeMessage<T>(
  type: RealtimeMessageType,
  payload: T,
  userId: string,
  messageId?: string
): RealtimeMessage<T> {
  return {
    type,
    payload,
    userId,
    timestamp: new Date().toISOString(),
    messageId
  };
}

export function ensureFriendshipOrdering(user1Id: string, user2Id: string): [string, string] {
  return user1Id < user2Id ? [user1Id, user2Id] : [user2Id, user1Id];
}

export function getFriendshipQueryPairs(user1: string, user2: string): [string, string][] {
  return [[user1, user2], [user2, user1]];
}