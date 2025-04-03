/*
  # Add YouTube URL support to memories table

  1. Changes
    - Add `youtube_url` column to `memories` table for storing YouTube video URLs
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'memories' AND column_name = 'youtube_url'
  ) THEN
    ALTER TABLE memories ADD COLUMN youtube_url text;
  END IF;
END $$;