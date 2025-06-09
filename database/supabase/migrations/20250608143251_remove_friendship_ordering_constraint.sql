-- Remove friendship ordering constraint
-- This simplifies the friendship model to be more intuitive

-- Drop the ordering constraint
ALTER TABLE friendships DROP CONSTRAINT friendship_ordering;

-- Update the unique constraint to handle bidirectional relationships
-- We'll keep the existing unique constraint but handle duplicates in application logic
-- The unique constraint (user1_id, user2_id) will prevent exact duplicates
-- Application logic will check for (A,B) or (B,A) relationships before inserting