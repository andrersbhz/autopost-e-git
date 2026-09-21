-- Create storage bucket for article images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('article-images', 'article-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow public read access to images
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'article-images');

-- Policy: Allow authenticated users to upload their own images
CREATE POLICY "Authenticated users can upload images" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'article-images' AND 
  auth.role() = 'authenticated'
);

-- Policy: Allow users to update their own images
CREATE POLICY "Users can update their own images" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'article-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Allow users to delete their own images
CREATE POLICY "Users can delete their own images" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'article-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);