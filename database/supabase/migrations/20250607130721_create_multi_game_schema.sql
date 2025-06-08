-- Multi-Game Platform Database Schema
-- Matches TypeScript interfaces in shared-types/database.ts
-- Integrates with Supabase Auth (auth.users)

-- Create enum types matching TypeScript unions
CREATE TYPE friendship_status AS ENUM ('pending', 'accepted', 'blocked');
CREATE TYPE game_type AS ENUM ('tic_tac_toe');
CREATE TYPE session_status AS ENUM ('invited', 'accepted', 'in_progress', 'completed');
CREATE TYPE message_type AS ENUM ('text', 'image', 'system');

-- User profiles table (extends auth.users)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Friendships table (bidirectional relationships)
CREATE TABLE friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    status friendship_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    
    -- Prevent self-relationships
    CONSTRAINT no_self_friendship CHECK (user1_id != user2_id),
    
    -- Ensure consistent ordering (user1_id < user2_id) to prevent duplicates
    CONSTRAINT friendship_ordering CHECK (user1_id < user2_id),
    
    -- Unique constraint for bidirectional friendship
    CONSTRAINT unique_friendship UNIQUE (user1_id, user2_id)
);

-- Game sessions table (shared across all game types)
CREATE TABLE game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player1_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    player2_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    game_type game_type NOT NULL,
    status session_status NOT NULL DEFAULT 'invited',
    winner_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Prevent self-games
    CONSTRAINT no_self_game CHECK (player1_id != player2_id),
    
    -- Winner must be one of the players
    CONSTRAINT winner_is_player CHECK (
        winner_id IS NULL OR 
        winner_id = player1_id OR 
        winner_id = player2_id
    ),
    
    -- Completed games must have completion timestamp
    CONSTRAINT completed_games_have_timestamp CHECK (
        (status = 'completed' AND completed_at IS NOT NULL) OR
        (status != 'completed' AND completed_at IS NULL)
    )
);

-- Tic-tac-toe specific game data
CREATE TABLE tic_tac_toe_games (
    session_id UUID PRIMARY KEY REFERENCES game_sessions(id) ON DELETE CASCADE,
    board_state JSONB NOT NULL DEFAULT '["","","","","","","","",""]',
    current_turn UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    -- Validate board state structure (9-element array)
    CONSTRAINT valid_board_state CHECK (
        jsonb_typeof(board_state) = 'array' AND
        jsonb_array_length(board_state) = 9
    )
);

-- Chat messages table
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type message_type NOT NULL DEFAULT 'text',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    
    -- Prevent self-messaging
    CONSTRAINT no_self_message CHECK (sender_id != receiver_id)
);

-- Indexes for performance
CREATE INDEX idx_friendships_user1 ON friendships(user1_id);
CREATE INDEX idx_friendships_user2 ON friendships(user2_id);
CREATE INDEX idx_friendships_status ON friendships(status);

CREATE INDEX idx_game_sessions_player1 ON game_sessions(player1_id);
CREATE INDEX idx_game_sessions_player2 ON game_sessions(player2_id);
CREATE INDEX idx_game_sessions_status ON game_sessions(status);
CREATE INDEX idx_game_sessions_game_type ON game_sessions(game_type);

CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_receiver ON chat_messages(receiver_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- Composite indexes for common queries
CREATE INDEX idx_friendships_lookup ON friendships(user1_id, user2_id, status);
CREATE INDEX idx_chat_conversation ON chat_messages(sender_id, receiver_id, created_at);

-- Update triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_sessions_updated_at 
    BEFORE UPDATE ON game_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tic_tac_toe_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- User profiles: Users can read all profiles, but only update their own
CREATE POLICY "Public profiles are viewable by everyone" 
    ON user_profiles FOR SELECT 
    USING (true);

CREATE POLICY "Users can insert their own profile" 
    ON user_profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
    ON user_profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Friendships: Users can see friendships they're part of
CREATE POLICY "Users can view their friendships" 
    ON friendships FOR SELECT 
    USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create friendships" 
    ON friendships FOR INSERT 
    WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can update their friendships" 
    ON friendships FOR UPDATE 
    USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Game sessions: Players can see/manage their games
CREATE POLICY "Players can view their game sessions" 
    ON game_sessions FOR SELECT 
    USING (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "Players can create game sessions" 
    ON game_sessions FOR INSERT 
    WITH CHECK (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "Players can update their game sessions" 
    ON game_sessions FOR UPDATE 
    USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- Tic-tac-toe games: Players can see/update their game data
CREATE POLICY "Players can view their tic-tac-toe games" 
    ON tic_tac_toe_games FOR SELECT 
    USING (
        session_id IN (
            SELECT id FROM game_sessions 
            WHERE auth.uid() = player1_id OR auth.uid() = player2_id
        )
    );

CREATE POLICY "Players can insert their tic-tac-toe games" 
    ON tic_tac_toe_games FOR INSERT 
    WITH CHECK (
        session_id IN (
            SELECT id FROM game_sessions 
            WHERE auth.uid() = player1_id OR auth.uid() = player2_id
        )
    );

CREATE POLICY "Players can update their tic-tac-toe games" 
    ON tic_tac_toe_games FOR UPDATE 
    USING (
        session_id IN (
            SELECT id FROM game_sessions 
            WHERE auth.uid() = player1_id OR auth.uid() = player2_id
        )
    );

-- Chat messages: Users can see messages they sent or received
CREATE POLICY "Users can view their messages" 
    ON chat_messages FOR SELECT 
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages" 
    ON chat_messages FOR INSERT 
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update messages they sent" 
    ON chat_messages FOR UPDATE 
    USING (auth.uid() = sender_id);