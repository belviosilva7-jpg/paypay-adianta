-- Remove loose public permissions
REVOKE ALL ON public.pending_applications FROM anon;
REVOKE ALL ON public.pending_applications FROM authenticated;

-- Grant minimal permissions
GRANT INSERT ON public.pending_applications TO anon;
GRANT INSERT ON public.pending_applications TO authenticated;
GRANT ALL ON public.pending_applications TO service_role;

-- Refine RLS Policies
DROP POLICY IF EXISTS "Anyone can insert pending applications" ON public.pending_applications;
DROP POLICY IF EXISTS "Anyone can update pending applications" ON public.pending_applications;
DROP POLICY IF EXISTS "Anyone can select pending applications" ON public.pending_applications;
DROP POLICY IF EXISTS "Anyone can delete pending applications" ON public.pending_applications;

-- Public can only insert
CREATE POLICY "Public can insert applications" 
ON public.pending_applications FOR INSERT 
WITH CHECK (true);

-- No one can select/update/delete via the Public API (only service_role/admin functions can)
-- service_role bypasses RLS, so no policies needed for it.

-- Optional: Allow users to see THEIR OWN status if we had auth, but we don't.
-- So we'll use a server function for the status check to avoid exposing all records.
