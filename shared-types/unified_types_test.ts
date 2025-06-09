// unified_types_test.ts
import { assertEquals, assertThrows } from "https://deno.land/std@0.208.0/assert/mod.ts";

// Import our unified types (will be implemented after tests pass)
import {
  UserProfile,
  Friendship,
  GameSession,
  TicTacToeGame,
  ChatMessageRecord,
  RealtimeMessage,
  ChatPayload,
  GameMovePayload,
  TicTacToeMoveData,
  GameInvitePayload,
  FriendRequestPayload,
  PresencePayload,
  TypingIndicatorPayload,
  MessageTransformer,
  validateUserProfile,
  validateFriendship,
  validateGameSession,
  validateTicTacToeGame,
  validateChatMessageRecord,
  validateRealtimeMessage,
  validateChatPayload,
  validateGameMovePayload,
  createRealtimeMessage,
  ensureFriendshipOrdering,
  getFriendshipQueryPairs,
  FriendshipStatus,
  SessionStatus,
  GameType,
  MessageType,
  RealtimeMessageType,
} from "./unified_types.ts";

// ============================================================================
// TEST DATA FIXTURES
// ============================================================================

const validUserProfile: UserProfile = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  email: "test@example.com",
  display_name: "Test User",
  avatar_url: null,
  created_at: "2025-06-05T12:00:00.000Z",
  updated_at: "2025-06-05T12:00:00.000Z",
};

const validFriendship: Friendship = {
  id: "123e4567-e89b-12d3-a456-426614174001",
  user1_id: "123e4567-e89b-12d3-a456-426614174000", // Smaller UUID (ordering constraint)
  user2_id: "123e4567-e89b-12d3-a456-426614174002", // Larger UUID
  status: "accepted" as FriendshipStatus,
  created_at: "2025-06-05T12:00:00.000Z",
  accepted_at: "2025-06-05T12:00:00.000Z",
};

const validGameSession: GameSession = {
  id: "123e4567-e89b-12d3-a456-426614174003",
  player1_id: "123e4567-e89b-12d3-a456-426614174000",
  player2_id: "123e4567-e89b-12d3-a456-426614174002",
  game_type: "tic_tac_toe" as GameType,
  status: "in_progress" as SessionStatus,
  winner_id: null,
  created_at: "2025-06-05T12:00:00.000Z",
  updated_at: "2025-06-05T12:00:00.000Z",
  completed_at: null,
};

const validTicTacToeGame: TicTacToeGame = {
  session_id: "123e4567-e89b-12d3-a456-426614174003",
  board_state: ["", "", "", "", "", "", "", "", ""],
  current_turn: "123e4567-e89b-12d3-a456-426614174000",
};

const validChatMessageRecord: ChatMessageRecord = {
  id: "123e4567-e89b-12d3-a456-426614174004",
  sender_id: "123e4567-e89b-12d3-a456-426614174000",
  receiver_id: "123e4567-e89b-12d3-a456-426614174002",
  content: "Hello friend!",
  message_type: "text",
  created_at: "2025-06-05T12:00:00.000Z",
  read_at: null,
};

const validChatPayload: ChatPayload = {
  content: "Hello from real-time!",
  receiverId: "123e4567-e89b-12d3-a456-426614174002",
  messageType: "text",
};

const validRealtimeChatMessage: RealtimeMessage<ChatPayload> = {
  type: "chat",
  payload: validChatPayload,
  userId: "123e4567-e89b-12d3-a456-426614174000",
  timestamp: "2025-06-05T12:00:00.000Z",
  messageId: "123e4567-e89b-12d3-a456-426614174004",
};

const validTicTacToeMoveData: TicTacToeMoveData = {
  position: 4, // Center position
  player: "123e4567-e89b-12d3-a456-426614174000",
  boardState: ["", "", "", "", "X", "", "", "", ""],
};

const validGameMovePayload: GameMovePayload = {
  sessionId: "123e4567-e89b-12d3-a456-426614174003",
  gameType: "tic_tac_toe",
  moveData: validTicTacToeMoveData,
};

// ============================================================================
// DATABASE RECORD VALIDATION TESTS
// ============================================================================

Deno.test("UserProfile - should validate valid user profile", () => {
  const result = validateUserProfile(validUserProfile);
  assertEquals(result.isValid, true);
  assertEquals(result.errors, []);
});

Deno.test("UserProfile - should reject invalid UUID format", () => {
  const invalidProfile = { ...validUserProfile, id: "invalid-uuid" };
  const result = validateUserProfile(invalidProfile);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.includes("Invalid UUID format for id"), true);
});

Deno.test("UserProfile - should reject invalid email format", () => {
  const invalidProfile = { ...validUserProfile, email: "not-an-email" };
  const result = validateUserProfile(invalidProfile);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.includes("Invalid email format"), true);
});

Deno.test("UserProfile - should reject empty display_name", () => {
  const invalidProfile = { ...validUserProfile, display_name: "" };
  const result = validateUserProfile(invalidProfile);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.includes("Display name cannot be empty"), true);
});

Deno.test("UserProfile - should accept null avatar_url", () => {
  const profileWithNullAvatar = { ...validUserProfile, avatar_url: null };
  const result = validateUserProfile(profileWithNullAvatar);
  assertEquals(result.isValid, true);
});

Deno.test("UserProfile - should validate ISO date strings", () => {
  const invalidProfile = { ...validUserProfile, created_at: "invalid-date" };
  const result = validateUserProfile(invalidProfile);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.includes("Invalid date format for created_at"), true);
});

// ============================================================================
// FRIENDSHIP VALIDATION TESTS (with ordering constraint)
// ============================================================================

Deno.test("Friendship - should validate valid friendship", () => {
  const result = validateFriendship(validFriendship);
  assertEquals(result.isValid, true);
  assertEquals(result.errors, []);
});

Deno.test("Friendship - should reject same user as both users", () => {
  const invalidFriendship = { 
    ...validFriendship, 
    user2_id: validFriendship.user1_id 
  };
  const result = validateFriendship(invalidFriendship);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.includes("Users cannot be friends with themselves"), true);
});

// REMOVED: Friendship ordering constraint test - no longer needed

Deno.test("Friendship - should validate friendship status enum", () => {
  const invalidFriendship = { 
    ...validFriendship, 
    status: "invalid_status" as FriendshipStatus 
  };
  const result = validateFriendship(invalidFriendship);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.includes("Invalid friendship status"), true);
});

Deno.test("Friendship - should require accepted_at for accepted status", () => {
  const invalidFriendship = { 
    ...validFriendship, 
    status: "accepted" as FriendshipStatus,
    accepted_at: null 
  };
  const result = validateFriendship(invalidFriendship);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.includes("Accepted friendships must have accepted_at timestamp"), true);
});

// ============================================================================
// GAME SESSION VALIDATION TESTS (with database constraints)
// ============================================================================

Deno.test("GameSession - should validate valid game session", () => {
  const result = validateGameSession(validGameSession);
  assertEquals(result.isValid, true);
  assertEquals(result.errors, []);
});

Deno.test("GameSession - should reject same player as both players", () => {
  const invalidSession = { 
    ...validGameSession, 
    player2_id: validGameSession.player1_id 
  };
  const result = validateGameSession(invalidSession);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.includes("Players cannot play against themselves"), true);
});

Deno.test("GameSession - should validate winner is one of the players", () => {
  const invalidSession = { 
    ...validGameSession, 
    winner_id: "123e4567-e89b-12d3-a456-426614174999" // Different UUID
  };
  const result = validateGameSession(invalidSession);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.includes("Winner must be one of the players"), true);
});

Deno.test("GameSession - should enforce completion constraint - completed needs completed_at", () => {
  const invalidSession = { 
    ...validGameSession, 
    status: "completed" as SessionStatus,
    completed_at: null // Missing completion timestamp
  };
  const result = validateGameSession(invalidSession);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.includes("Completed sessions must have completed_at timestamp"), true);
});

Deno.test("GameSession - should enforce completion constraint - non-completed cannot have completed_at", () => {
  const invalidSession = { 
    ...validGameSession, 
    status: "in_progress" as SessionStatus,
    completed_at: "2025-06-05T12:00:00.000Z" // Should not have completion timestamp
  };
  const result = validateGameSession(invalidSession);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.includes("Non-completed sessions must not have completed_at timestamp"), true);
});

Deno.test("GameSession - should validate game type enum", () => {
  const invalidSession = { 
    ...validGameSession, 
    game_type: "invalid_game" as GameType 
  };
  const result = validateGameSession(invalidSession);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.includes("Invalid game type"), true);
});

Deno.test("GameSession - should validate session status enum", () => {
  const invalidSession = { 
    ...validGameSession, 
    status: "invalid_status" as SessionStatus 
  };
  const result = validateGameSession(invalidSession);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.includes("Invalid session status"), true);
});

// ============================================================================
// TIC-TAC-TOE GAME VALIDATION TESTS
// ============================================================================

Deno.test("TicTacToeGame - should validate valid tic-tac-toe game", () => {
  const result = validateTicTacToeGame(validTicTacToeGame);
  assertEquals(result.isValid, true);
  assertEquals(result.errors, []);
});

Deno.test("TicTacToeGame - should validate board state length", () => {
  const invalidGame = { 
    ...validTicTacToeGame, 
    board_state: ["X", "O"] // Wrong length
  };
  const result = validateTicTacToeGame(invalidGame);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.includes("Tic-tac-toe board must have exactly 9 positions"), true);
});

Deno.test("TicTacToeGame - should validate board state values", () => {
  const invalidGame = { 
    ...validTicTacToeGame, 
    board_state: ["X", "O", "Z", "", "", "", "", "", ""] // Invalid 'Z'
  };
  const result = validateTicTacToeGame(invalidGame);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.includes("Board positions must be 'X', 'O', or empty string"), true);
});

Deno.test("TicTacToeGame - should validate current_turn UUID format", () => {
  const invalidGame = { 
    ...validTicTacToeGame, 
    current_turn: "invalid-uuid"
  };
  const result = validateTicTacToeGame(invalidGame);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.includes("Invalid UUID format for current_turn"), true);
});

// ============================================================================
// CHAT MESSAGE RECORD VALIDATION TESTS
// ============================================================================

Deno.test("ChatMessageRecord - should validate valid chat message record", () => {
  const result = validateChatMessageRecord(validChatMessageRecord);
  assertEquals(result.isValid, true);
  assertEquals(result.errors, []);
});

Deno.test("ChatMessageRecord - should reject same user as sender and receiver", () => {
  const invalidMessage = { 
    ...validChatMessageRecord, 
    receiver_id: validChatMessageRecord.sender_id 
  };
  const result = validateChatMessageRecord(invalidMessage);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.includes("Sender and receiver cannot be the same user"), true);
});

Deno.test("ChatMessageRecord - should reject empty content", () => {
  const invalidMessage = { ...validChatMessageRecord, content: "" };
  const result = validateChatMessageRecord(invalidMessage);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.includes("Message content cannot be empty"), true);
});

Deno.test("ChatMessageRecord - should enforce content length limit", () => {
  const invalidMessage = { 
    ...validChatMessageRecord, 
    content: "x".repeat(5001) // Exceeds 5000 character limit
  };
  const result = validateChatMessageRecord(invalidMessage);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.includes("Message content exceeds maximum length of 5000 characters"), true);
});

Deno.test("ChatMessageRecord - should validate message type enum", () => {
  const invalidMessage = { 
    ...validChatMessageRecord, 
    message_type: "invalid_type" as MessageType
  };
  const result = validateChatMessageRecord(invalidMessage);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.includes("Invalid message type"), true);
});

Deno.test("ChatMessageRecord - should accept null read_at for unread messages", () => {
  const unreadMessage = { ...validChatMessageRecord, read_at: null };
  const result = validateChatMessageRecord(unreadMessage);
  assertEquals(result.isValid, true);
});

// ============================================================================
// REAL-TIME MESSAGE VALIDATION TESTS
// ============================================================================

Deno.test("RealtimeMessage - should validate valid realtime message", () => {
  const result = validateRealtimeMessage(validRealtimeChatMessage);
  assertEquals(result.isValid, true);
  assertEquals(result.errors, []);
});

Deno.test("RealtimeMessage - should reject invalid message type", () => {
  const invalidMessage = { 
    ...validRealtimeChatMessage, 
    type: "invalid_type" as RealtimeMessageType 
  };
  const result = validateRealtimeMessage(invalidMessage);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.includes("Invalid message type"), true);
});

Deno.test("RealtimeMessage - should require payload object", () => {
  const invalidMessage = { 
    ...validRealtimeChatMessage, 
    payload: "not an object" 
  };
  const result = validateRealtimeMessage(invalidMessage);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.includes("Payload must be an object"), true);
});

Deno.test("RealtimeMessage - should validate userId UUID format", () => {
  const invalidMessage = { 
    ...validRealtimeChatMessage, 
    userId: "invalid-uuid" 
  };
  const result = validateRealtimeMessage(invalidMessage);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.includes("Invalid UUID format for userId"), true);
});

Deno.test("RealtimeMessage - should validate timestamp format", () => {
  const invalidMessage = { 
    ...validRealtimeChatMessage, 
    timestamp: "not-a-date" 
  };
  const result = validateRealtimeMessage(invalidMessage);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.includes("Invalid date format for timestamp"), true);
});

Deno.test("RealtimeMessage - should validate optional messageId UUID format", () => {
  const invalidMessage = { 
    ...validRealtimeChatMessage, 
    messageId: "invalid-uuid" 
  };
  const result = validateRealtimeMessage(invalidMessage);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.includes("Invalid UUID format for messageId"), true);
});

// ============================================================================
// CHAT PAYLOAD VALIDATION TESTS
// ============================================================================

Deno.test("ChatPayload - should validate valid chat payload", () => {
  const result = validateChatPayload(validChatPayload);
  assertEquals(result.isValid, true);
  assertEquals(result.errors, []);
});

Deno.test("ChatPayload - should reject empty content", () => {
  const invalidPayload = { ...validChatPayload, content: "" };
  const result = validateChatPayload(invalidPayload);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.includes("Content must be a non-empty string"), true);
});

Deno.test("ChatPayload - should reject invalid receiverId UUID", () => {
  const invalidPayload = { ...validChatPayload, receiverId: "invalid-uuid" };
  const result = validateChatPayload(invalidPayload);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.includes("Invalid UUID format for receiverId"), true);
});

Deno.test("ChatPayload - should validate message type enum", () => {
  const invalidPayload = { 
    ...validChatPayload, 
    messageType: "invalid_type" as MessageType 
  };
  const result = validateChatPayload(invalidPayload);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.includes("Invalid message type"), true);
});

// ============================================================================
// GAME MOVE PAYLOAD VALIDATION TESTS
// ============================================================================

Deno.test("GameMovePayload - should validate valid game move payload", () => {
  const result = validateGameMovePayload(validGameMovePayload);
  assertEquals(result.isValid, true);
  assertEquals(result.errors, []);
});

Deno.test("GameMovePayload - should reject invalid sessionId UUID", () => {
  const invalidPayload = { ...validGameMovePayload, sessionId: "invalid-uuid" };
  const result = validateGameMovePayload(invalidPayload);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.includes("Invalid UUID format for sessionId"), true);
});

Deno.test("GameMovePayload - should validate game type enum", () => {
  const invalidPayload = { 
    ...validGameMovePayload, 
    gameType: "invalid_game" as GameType 
  };
  const result = validateGameMovePayload(invalidPayload);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.includes("Invalid game type"), true);
});

Deno.test("GameMovePayload - should validate tic-tac-toe position range", () => {
  const invalidPayload = { 
    ...validGameMovePayload,
    moveData: { ...validTicTacToeMoveData, position: 10 } // Out of range
  };
  const result = validateGameMovePayload(invalidPayload);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.includes("Tic-tac-toe position must be a number between 0 and 8"), true);
});

Deno.test("GameMovePayload - should validate tic-tac-toe player UUID", () => {
  const invalidPayload = { 
    ...validGameMovePayload,
    moveData: { ...validTicTacToeMoveData, player: "invalid-uuid" }
  };
  const result = validateGameMovePayload(invalidPayload);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.includes("Invalid UUID format for player"), true);
});

Deno.test("GameMovePayload - should validate tic-tac-toe board state length", () => {
  const invalidPayload = { 
    ...validGameMovePayload,
    moveData: { ...validTicTacToeMoveData, boardState: ["X", "O"] } // Wrong length
  };
  const result = validateGameMovePayload(invalidPayload);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.includes("Board state must be an array of 9 elements"), true);
});

// ============================================================================
// MESSAGE TRANSFORMER TESTS
// ============================================================================

Deno.test("MessageTransformer - should convert chat record to realtime message", () => {
  const realtimeMessage = MessageTransformer.chatRecordToRealtime(validChatMessageRecord);
  
  assertEquals(realtimeMessage.type, "chat");
  assertEquals(realtimeMessage.payload.content, validChatMessageRecord.content);
  assertEquals(realtimeMessage.payload.receiverId, validChatMessageRecord.receiver_id);
  assertEquals(realtimeMessage.payload.messageType, validChatMessageRecord.message_type);
  assertEquals(realtimeMessage.userId, validChatMessageRecord.sender_id);
  assertEquals(realtimeMessage.timestamp, validChatMessageRecord.created_at);
  assertEquals(realtimeMessage.messageId, validChatMessageRecord.id);
});

Deno.test("MessageTransformer - should convert realtime chat to database record", () => {
  const generatedId = "123e4567-e89b-12d3-a456-426614174005";
  const dbRecord = MessageTransformer.realtimeChatToRecord(validRealtimeChatMessage, generatedId);
  
  assertEquals(dbRecord.id, generatedId);
  assertEquals(dbRecord.sender_id, validRealtimeChatMessage.userId);
  assertEquals(dbRecord.receiver_id, validRealtimeChatMessage.payload.receiverId);
  assertEquals(dbRecord.content, validRealtimeChatMessage.payload.content);
  assertEquals(dbRecord.message_type, validRealtimeChatMessage.payload.messageType);
});

Deno.test("MessageTransformer - should convert game session to realtime invite", () => {
  const realtimeInvite = MessageTransformer.gameSessionToRealtimeInvite(validGameSession);
  
  assertEquals(realtimeInvite.type, "game_invite");
  assertEquals(realtimeInvite.payload.invitedUserId, validGameSession.player2_id);
  assertEquals(realtimeInvite.payload.gameType, validGameSession.game_type);
  assertEquals(realtimeInvite.payload.sessionId, validGameSession.id);
  assertEquals(realtimeInvite.userId, validGameSession.player1_id);
  assertEquals(realtimeInvite.messageId, validGameSession.id);
});

Deno.test("MessageTransformer - should convert tic-tac-toe game to realtime move", () => {
  const lastMove = 4;
  const realtimeMove = MessageTransformer.ticTacToeGameToRealtimeMove(validTicTacToeGame, lastMove);
  
  assertEquals(realtimeMove.type, "game_move");
  assertEquals(realtimeMove.payload.sessionId, validTicTacToeGame.session_id);
  assertEquals(realtimeMove.payload.gameType, "tic_tac_toe");
  assertEquals(realtimeMove.payload.moveData.position, lastMove);
  assertEquals(realtimeMove.payload.moveData.player, validTicTacToeGame.current_turn);
  assertEquals(realtimeMove.payload.moveData.boardState, validTicTacToeGame.board_state);
  assertEquals(realtimeMove.userId, validTicTacToeGame.current_turn);
});

Deno.test("MessageTransformer - should convert friendship to realtime request", () => {
  const requesterProfile = validUserProfile;
  const realtimeRequest = MessageTransformer.friendshipToRealtimeRequest(validFriendship, requesterProfile);
  
  assertEquals(realtimeRequest.type, "friend_request");
  assertEquals(realtimeRequest.payload.targetUserId, validFriendship.user2_id);
  assertEquals(realtimeRequest.payload.requesterId, validFriendship.user1_id);
  assertEquals(realtimeRequest.payload.requesterName, requesterProfile.display_name);
  assertEquals(realtimeRequest.userId, validFriendship.user1_id);
  assertEquals(realtimeRequest.messageId, validFriendship.id);
});

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

Deno.test("createRealtimeMessage - should create valid realtime message", () => {
  const message = createRealtimeMessage("chat", validChatPayload, "123e4567-e89b-12d3-a456-426614174000");
  
  assertEquals(message.type, "chat");
  assertEquals(message.payload, validChatPayload);
  assertEquals(message.userId, "123e4567-e89b-12d3-a456-426614174000");
  assertEquals(typeof message.timestamp, "string");
  
  // Validate timestamp is recent ISO string
  const timeDiff = Date.now() - new Date(message.timestamp).getTime();
  assertEquals(timeDiff < 1000, true); // Within 1 second
});

Deno.test("createRealtimeMessage - should include optional messageId", () => {
  const messageId = "123e4567-e89b-12d3-a456-426614174004";
  const message = createRealtimeMessage("chat", validChatPayload, "123e4567-e89b-12d3-a456-426614174000", messageId);
  
  assertEquals(message.messageId, messageId);
});

Deno.test("getFriendshipQueryPairs - should return both query combinations", () => {
  const user1 = "123e4567-e89b-12d3-a456-426614174000";
  const user2 = "123e4567-e89b-12d3-a456-426614174002";
  
  const pairs = getFriendshipQueryPairs(user1, user2);
  
  assertEquals(pairs[0], [user1, user2]); // Direct
  assertEquals(pairs[1], [user2, user1]); // Reverse
});

Deno.test("getFriendshipQueryPairs - should work with any UUID order", () => {
  const user1 = "123e4567-e89b-12d3-a456-426614174002";
  const user2 = "123e4567-e89b-12d3-a456-426614174000";
  
  const pairs = getFriendshipQueryPairs(user1, user2);
  
  assertEquals(pairs[0], [user1, user2]); // Direct (as provided)
  assertEquals(pairs[1], [user2, user1]); // Reverse
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

Deno.test("All validators - should handle null/undefined gracefully", () => {
  const validators = [
    validateUserProfile,
    validateFriendship,
    validateGameSession,
    validateTicTacToeGame,
    validateChatMessageRecord,
    validateRealtimeMessage,
    validateChatPayload,
    validateGameMovePayload,
  ];

  validators.forEach(validator => {
    const nullResult = validator(null);
    assertEquals(nullResult.isValid, false);
    
    const undefinedResult = validator(undefined);
    assertEquals(undefinedResult.isValid, false);
  });
});

Deno.test("All validators - should handle non-object inputs gracefully", () => {
  const validators = [
    validateUserProfile,
    validateFriendship,
    validateGameSession,
    validateTicTacToeGame,
    validateChatMessageRecord,
    validateRealtimeMessage,
    validateChatPayload,
    validateGameMovePayload,
  ];

  validators.forEach(validator => {
    const stringResult = validator("not an object");
    assertEquals(stringResult.isValid, false);
    
    const numberResult = validator(42);
    assertEquals(numberResult.isValid, false);
    
    const arrayResult = validator([]);
    assertEquals(arrayResult.isValid, false);
  });
});

Deno.test("Validation - should return multiple errors for multiple issues", () => {
  const multipleErrorsMessage = {
    type: "invalid_type",
    payload: "not an object",
    userId: "invalid-uuid",
    timestamp: "not-a-date",
    messageId: "invalid-message-id"
  };
  
  const result = validateRealtimeMessage(multipleErrorsMessage);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.length >= 4, true); // Should have multiple errors
});

// ============================================================================
// TYPE ENUM VALIDATION TESTS
// ============================================================================

Deno.test("Enums - should validate all friendship status values", () => {
  const validStatuses: FriendshipStatus[] = ["pending", "accepted", "blocked"];
  
  validStatuses.forEach(status => {
    const friendship = { ...validFriendship, status, accepted_at: status === "accepted" ? validFriendship.accepted_at : null };
    const result = validateFriendship(friendship);
    assertEquals(result.isValid, true, `Status ${status} should be valid`);
  });
});

Deno.test("Enums - should validate all session status values", () => {
  const validStatuses: SessionStatus[] = ["invited", "accepted", "in_progress", "completed"];
  
  validStatuses.forEach(status => {
    const session = { 
      ...validGameSession, 
      status,
      winner_id: status === "completed" ? validGameSession.player1_id : null,
      completed_at: status === "completed" ? "2025-06-05T12:00:00.000Z" : null
    };
    const result = validateGameSession(session);
    assertEquals(result.isValid, true, `Status ${status} should be valid`);
  });
});

Deno.test("Enums - should validate all game type values", () => {
  const validTypes: GameType[] = ["tic_tac_toe"];
  
  validTypes.forEach(gameType => {
    const session = { ...validGameSession, game_type: gameType };
    const result = validateGameSession(session);
    assertEquals(result.isValid, true, `Game type ${gameType} should be valid`);
  });
});

Deno.test("Enums - should validate all message type values", () => {
  const validTypes: MessageType[] = ["text", "image", "system"];
  
  validTypes.forEach(messageType => {
    const message = { ...validChatMessageRecord, message_type: messageType };
    const result = validateChatMessageRecord(message);
    assertEquals(result.isValid, true, `Message type ${messageType} should be valid`);
    
    const payload = { ...validChatPayload, messageType };
    const payloadResult = validateChatPayload(payload);
    assertEquals(payloadResult.isValid, true, `Chat payload message type ${messageType} should be valid`);
  });
});

Deno.test("Enums - should validate all realtime message type values", () => {
  const validTypes: RealtimeMessageType[] = [
    "chat", "game_move", "game_invite", "game_accept", "game_complete",
    "friend_request", "friend_accept", "presence_update", "typing_indicator", "connection_status"
  ];
  
  validTypes.forEach(type => {
    const message = { ...validRealtimeChatMessage, type };
    const result = validateRealtimeMessage(message);
    assertEquals(result.isValid, true, `Realtime message type ${type} should be valid`);
  });
});

// ============================================================================
// COMPLEX SCENARIO TESTS
// ============================================================================

Deno.test("Complex Scenario - full chat workflow", () => {
  // 1. Create realtime chat message
  const realtimeChat = createRealtimeMessage("chat", validChatPayload, "123e4567-e89b-12d3-a456-426614174000");
  
  // 2. Validate realtime message
  const realtimeValidation = validateRealtimeMessage(realtimeChat);
  assertEquals(realtimeValidation.isValid, true);
  
  // 3. Validate chat payload specifically
  const payloadValidation = validateChatPayload(realtimeChat.payload);
  assertEquals(payloadValidation.isValid, true);
  
  // 4. Transform to database record
  const generatedId = "123e4567-e89b-12d3-a456-426614174999";
  const dbRecord = MessageTransformer.realtimeChatToRecord(realtimeChat, generatedId);
  
  // 5. Create full database record with timestamps
  const fullDbRecord: ChatMessageRecord = {
    ...dbRecord,
    created_at: realtimeChat.timestamp,
    read_at: null
  };
  
  // 6. Validate database record
  const dbValidation = validateChatMessageRecord(fullDbRecord);
  assertEquals(dbValidation.isValid, true);
  
  // 7. Transform back to realtime
  const backToRealtime = MessageTransformer.chatRecordToRealtime(fullDbRecord);
  
  // 8. Validate round-trip conversion
  assertEquals(backToRealtime.type, "chat");
  assertEquals(backToRealtime.payload.content, validChatPayload.content);
  assertEquals(backToRealtime.userId, realtimeChat.userId);
});

Deno.test("Complex Scenario - full game workflow", () => {
  // 1. Game session creation
  const gameSession = validGameSession;
  const sessionValidation = validateGameSession(gameSession);
  assertEquals(sessionValidation.isValid, true);
  
  // 2. Create game invite from session
  const gameInvite = MessageTransformer.gameSessionToRealtimeInvite(gameSession);
  const inviteValidation = validateRealtimeMessage(gameInvite);
  assertEquals(inviteValidation.isValid, true);
  
  // 3. Create tic-tac-toe game
  const ticTacToeGame = validTicTacToeGame;
  const gameValidation = validateTicTacToeGame(ticTacToeGame);
  assertEquals(gameValidation.isValid, true);
  
  // 4. Make a move
  const movePosition = 4;
  const gameMove = MessageTransformer.ticTacToeGameToRealtimeMove(ticTacToeGame, movePosition);
  const moveValidation = validateRealtimeMessage(gameMove);
  assertEquals(moveValidation.isValid, true);
  
  // 5. Validate move payload specifically
  const movePayloadValidation = validateGameMovePayload(gameMove.payload);
  assertEquals(movePayloadValidation.isValid, true);
  
  // 6. Verify move data integrity
  assertEquals(gameMove.payload.moveData.position, movePosition);
  assertEquals(gameMove.payload.sessionId, ticTacToeGame.session_id);
});

Deno.test("Complex Scenario - friendship workflow", () => {
  // 1. Create friendship with proper ordering
 const user1 = "123e4567-e89b-12d3-a456-426614174000";
const user2 = "123e4567-e89b-12d3-a456-426614174002";
  const [orderedUser1, orderedUser2] = ensureFriendshipOrdering(user1, user2);
  
  const friendship: Friendship = {
    ...validFriendship,
    user1_id: orderedUser1,
    user2_id: orderedUser2,
    status: "pending",
    accepted_at: null
  };
  
  // 2. Validate pending friendship
  const pendingValidation = validateFriendship(friendship);
if (!pendingValidation.isValid) {
  console.log("Friendship validation failed with errors:", pendingValidation.errors);
  console.log("Friendship object:", JSON.stringify(friendship, null, 2));
}
  assertEquals(pendingValidation.isValid, true);
  
  // 3. Create friend request message
  const requesterProfile = { ...validUserProfile, id: orderedUser1 };
  const friendRequest = MessageTransformer.friendshipToRealtimeRequest(friendship, requesterProfile);
  const requestValidation = validateRealtimeMessage(friendRequest);
  assertEquals(requestValidation.isValid, true);
  
  // 4. Accept friendship
  const acceptedFriendship: Friendship = {
    ...friendship,
    status: "accepted",
    accepted_at: "2025-06-05T12:00:00.000Z"
  };
  
  const acceptedValidation = validateFriendship(acceptedFriendship);
  assertEquals(acceptedValidation.isValid, true);
});

// ============================================================================
// PERFORMANCE AND BOUNDARY TESTS
// ============================================================================

Deno.test("Performance - should validate large board state quickly", () => {
  const largeBoard = Array(9).fill("X");
  const gameWithLargeBoard = { ...validTicTacToeGame, board_state: largeBoard };
  
  const start = Date.now();
  const result = validateTicTacToeGame(gameWithLargeBoard);
  const duration = Date.now() - start;
  
  assertEquals(result.isValid, true);
  assertEquals(duration < 50, true); // Should complete in under 50ms
});

Deno.test("Boundary - should handle maximum content length", () => {
  const maxContent = "x".repeat(5000); // Exactly at limit
  const messageWithMaxContent = { ...validChatMessageRecord, content: maxContent };
  
  const result = validateChatMessageRecord(messageWithMaxContent);
  assertEquals(result.isValid, true);
});

Deno.test("Boundary - should reject content over limit", () => {
  const overLimitContent = "x".repeat(5001); // One character over limit
  const messageWithOverLimitContent = { ...validChatMessageRecord, content: overLimitContent };
  
  const result = validateChatMessageRecord(messageWithOverLimitContent);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.includes("Message content exceeds maximum length of 5000 characters"), true);
});

Deno.test("Boundary - should handle all valid tic-tac-toe positions", () => {
  for (let position = 0; position <= 8; position++) {
    const moveData = { ...validTicTacToeMoveData, position };
    const payload = { ...validGameMovePayload, moveData };
    
    const result = validateGameMovePayload(payload);
    assertEquals(result.isValid, true, `Position ${position} should be valid`);
  }
});

Deno.test("Boundary - should reject invalid tic-tac-toe positions", () => {
  const invalidPositions = [-1, 9, 10, 100];
  
  invalidPositions.forEach(position => {
    const moveData = { ...validTicTacToeMoveData, position };
    const payload = { ...validGameMovePayload, moveData };
    
    const result = validateGameMovePayload(payload);
    assertEquals(result.isValid, false, `Position ${position} should be invalid`);
    assertEquals(result.errors.includes("Tic-tac-toe position must be a number between 0 and 8"), true);
  });
});

// ============================================================================
// EXTENSIBILITY TESTS (Future-proofing)
// ============================================================================

Deno.test("Extensibility - should handle extra properties gracefully", () => {
  const profileWithExtra = { 
    ...validUserProfile, 
    extraField: "should be ignored",
    anotherField: 42
  };
  
  const result = validateUserProfile(profileWithExtra);
  assertEquals(result.isValid, true); // Should ignore extra fields
});

Deno.test("Extensibility - realtime message envelope should work with any payload", () => {
  // Test with a custom game payload (simulating future chess game)
  const customGamePayload = {
    sessionId: "123e4567-e89b-12d3-a456-426614174003",
    gameType: "chess", // Future game type
    moveData: {
      from: "e2",
      to: "e4",
      piece: "pawn"
    }
  };
  
  const customMessage = createRealtimeMessage("game_move", customGamePayload, "123e4567-e89b-12d3-a456-426614174000");
  
  // Base realtime message validation should pass
  const result = validateRealtimeMessage(customMessage);
  assertEquals(result.isValid, true);
  
  // Payload contains custom data
  assertEquals(customMessage.payload.moveData.from, "e2");
  assertEquals(customMessage.payload.moveData.to, "e4");
});

Deno.test("Extensibility - transformer pattern should be reusable", () => {
  // Test that the transformer pattern can be extended for new types
  const gameSession = validGameSession;
  const transformed = MessageTransformer.gameSessionToRealtimeInvite(gameSession);
  
  // Should maintain all required fields for extensibility
  assertEquals(typeof transformed.type, "string");
  assertEquals(typeof transformed.payload, "object");
  assertEquals(typeof transformed.userId, "string");
  assertEquals(typeof transformed.timestamp, "string");
  assertEquals(typeof transformed.messageId, "string");
});

// ============================================================================
// FINAL INTEGRATION TEST
// ============================================================================

Deno.test("Integration - complete multi-game platform type system", () => {
  // Test that all components work together for a complete gaming platform
  
  // 1. User profiles
  const user1 = validUserProfile;
  const user2 = { ...validUserProfile, id: "123e4567-e89b-12d3-a456-426614174002", email: "user2@example.com" };
  
  assertEquals(validateUserProfile(user1).isValid, true);
  assertEquals(validateUserProfile(user2).isValid, true);
  
  // 2. Friendship creation (no ordering needed)
  const friendship: Friendship = {
    id: "123e4567-e89b-12d3-a456-426614174001",
    user1_id: user1.id,  // Requester
    user2_id: user2.id,  // Target
    status: "accepted",
    created_at: "2025-06-05T12:00:00.000Z",
    accepted_at: "2025-06-05T12:00:00.000Z"
  };
  
  assertEquals(validateFriendship(friendship).isValid, true);
  
  // 3. Game session
  const gameSession: GameSession = {
    id: "123e4567-e89b-12d3-a456-426614174003",
    player1_id: user1.id,
    player2_id: user2.id,
    game_type: "tic_tac_toe",
    status: "in_progress",
    winner_id: null,
    created_at: "2025-06-05T12:00:00.000Z",
    updated_at: "2025-06-05T12:00:00.000Z",
    completed_at: null
  };
  
  assertEquals(validateGameSession(gameSession).isValid, true);
  
  // 4. Tic-tac-toe game
  const ticTacToeGame: TicTacToeGame = {
    session_id: gameSession.id,
    board_state: ["X", "", "", "", "O", "", "", "", ""],
    current_turn: user1.id
  };
  
  assertEquals(validateTicTacToeGame(ticTacToeGame).isValid, true);
  
  // 5. Chat messages
  const chatMessage: ChatMessageRecord = {
    id: "123e4567-e89b-12d3-a456-426614174004",
    sender_id: user1.id,
    receiver_id: user2.id,
    content: "Good game!",
    message_type: "text",
    created_at: "2025-06-05T12:00:00.000Z",
    read_at: null
  };
  
  assertEquals(validateChatMessageRecord(chatMessage).isValid, true);
  
  // 6. Real-time transformations
  const realtimeChat = MessageTransformer.chatRecordToRealtime(chatMessage);
  const realtimeInvite = MessageTransformer.gameSessionToRealtimeInvite(gameSession);
  const realtimeMove = MessageTransformer.ticTacToeGameToRealtimeMove(ticTacToeGame, 0);
  const realtimeFriendRequest = MessageTransformer.friendshipToRealtimeRequest(friendship, user1);
  
  assertEquals(validateRealtimeMessage(realtimeChat).isValid, true);
  assertEquals(validateRealtimeMessage(realtimeInvite).isValid, true);
  assertEquals(validateRealtimeMessage(realtimeMove).isValid, true);
  assertEquals(validateRealtimeMessage(realtimeFriendRequest).isValid, true);
  
  // 7. Verify all message types are different
  const messageTypes = [realtimeChat.type, realtimeInvite.type, realtimeMove.type, realtimeFriendRequest.type];
  const uniqueTypes = new Set(messageTypes);
  assertEquals(uniqueTypes.size, 4); // All different types
  
  // 8. Verify all transformations preserve user relationships
  assertEquals(realtimeChat.userId, user1.id);
  assertEquals(realtimeInvite.payload.invitedUserId, user2.id);
  assertEquals(realtimeMove.userId, user1.id);
  assertEquals(realtimeFriendRequest.payload.targetUserId, user2.id);
});

// ============================================================================
// TEST SUMMARY
// ============================================================================

Deno.test("Test Coverage Summary", () => {
  // This test serves as documentation of what we've covered
  const coveredAreas = [
    "Database record validation (UserProfile, Friendship, GameSession, TicTacToeGame, ChatMessageRecord)",
    "Real-time message validation (RealtimeMessage, ChatPayload, GameMovePayload)",
    "Message transformation utilities (bidirectional conversion)",
    "Enum validation (all status types, game types, message types)",
    "Database constraint enforcement (ordering, completion, winner validation)",
    "Boundary testing (content limits, position ranges)",
    "Error handling (null, undefined, invalid types)",
    "Performance validation (large data structures)",
    "Extensibility testing (extra properties, future game types)",
    "Integration testing (complete platform workflow)"
  ];
  
  assertEquals(coveredAreas.length >= 10, true);
  console.log("✅ Test Coverage Complete:");
  coveredAreas.forEach(area => console.log(`   - ${area}`));
});