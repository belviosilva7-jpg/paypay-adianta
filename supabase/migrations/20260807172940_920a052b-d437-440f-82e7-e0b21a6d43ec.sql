ALTER TABLE public.pending_applications 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'Pendente',
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Policy to allow anyone to select (needed for NIF check)
-- Check if policy exists first is better, but SUPABASE_MIGRATION tool handles it via pure SQL.
-- We already have a SELECT policy from previous turns, but let's make sure it covers everyone.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'pending_applications' AND policyname = 'Public can read application status'
    ) THEN
        CREATE POLICY "Public can read application status" 
        ON public.pending_applications FOR SELECT 
        TO anon, authenticated 
        USING (true);
    END IF;
END
$$;

GRANT UPDATE ON public.pending_applications TO authenticated;
GRANT UPDATE ON public.pending_applications TO service_role;
