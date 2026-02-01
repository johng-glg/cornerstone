-- Create storage bucket for litigation documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('litigation-documents', 'litigation-documents', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for litigation documents bucket
CREATE POLICY "Staff can view litigation documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'litigation-documents');

CREATE POLICY "Staff can upload litigation documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'litigation-documents');

CREATE POLICY "Staff can update litigation documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'litigation-documents');

CREATE POLICY "Staff can delete litigation documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'litigation-documents');