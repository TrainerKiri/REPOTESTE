/*
  # Add Spotify tracks to memories

  1. New Table
    - `memory_tracks`
      - `id` (uuid, primary key)
      - `memory_id` (uuid, reference to memories)
      - `spotify_track_id` (text, Spotify track ID)
      - `track_name` (text, name of the song)
      - `artist_name` (text, name of the artist)
      - `preview_url` (text, 30-second preview URL)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for:
      - Public read access
      - Authenticated users can add/delete tracks
*/

CREATE TABLE memory_tracks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id uuid REFERENCES memories(id) ON DELETE CASCADE NOT NULL,
    spotify_track_id text NOT NULL,
    track_name text NOT NULL,
    artist_name text NOT NULL,
    preview_url text,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE memory_tracks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Tracks are publicly visible"
    ON memory_tracks
    FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Authenticated users can add tracks"
    ON memory_tracks
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM memories
            WHERE id = memory_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own tracks"
    ON memory_tracks
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM memories
            WHERE id = memory_id
            AND user_id = auth.uid()
        )
    );