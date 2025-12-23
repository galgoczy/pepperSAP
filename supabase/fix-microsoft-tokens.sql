-- Fix microsoft_tokens table: add missing columns
-- Run this in Supabase SQL Editor

-- Add user_id column (optional, to link to the logged-in admin who connected it)
ALTER TABLE microsoft_tokens
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES user_profiles(id);

-- Add user_name column (display name from Microsoft)
ALTER TABLE microsoft_tokens
ADD COLUMN IF NOT EXISTS user_name TEXT;

-- Create unique index on user_email (if not exists) for upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_microsoft_tokens_user_email
ON microsoft_tokens(user_email);
