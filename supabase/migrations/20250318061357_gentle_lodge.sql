/*
  # Create Storage Bucket for Memories

  1. Storage
    - Create a new public bucket named 'memories' for storing memory images
    - Enable public access for the bucket

  2. Security
    - Allow authenticated users to upload files
    - Allow public access for viewing files
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('memories', 'memories', true);

-- Create policy to allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'memories');

-- Create policy to allow public access to files
CREATE POLICY "Public can view files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'memories');