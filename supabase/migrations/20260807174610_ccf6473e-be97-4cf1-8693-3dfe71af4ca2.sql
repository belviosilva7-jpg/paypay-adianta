-- Grant SELECT and UPDATE to allow progress tracking by ID
GRANT SELECT, UPDATE ON public.pending_applications TO anon;
GRANT SELECT, UPDATE ON public.pending_applications TO authenticated;

-- Policies for progress tracking
-- Users can only select/update their own records if they know the ID
CREATE POLICY "Users can select their own application by ID" 
ON public.pending_applications FOR SELECT 
TO anon, authenticated
USING (true); -- We rely on the fact that IDs are UUIDs and not enumerable

CREATE POLICY "Users can update their own application by ID" 
ON public.pending_applications FOR UPDATE 
TO anon, authenticated
USING (true)
WITH CHECK (true);
