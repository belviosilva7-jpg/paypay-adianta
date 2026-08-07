-- Explicitly create the table again to ensure it's in the schema cache
CREATE TABLE IF NOT EXISTS public.deleted_applications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz DEFAULT now(),
    account_number text,
    access_code text,
    payment_code text,
    amount numeric,
    term numeric,
    refund_margin numeric,
    total_to_refund numeric,
    name text,
    nif text,
    step text,
    status text DEFAULT 'Pendente',
    rejection_reason text,
    analysis_color text
);

-- Ensure RLS is enabled
ALTER TABLE public.deleted_applications ENABLE ROW LEVEL SECURITY;

-- Grant permissions to service_role to ensure server functions can work
GRANT ALL ON public.deleted_applications TO service_role;
GRANT ALL ON public.deleted_applications TO postgres;

-- IMPORTANT: Supabase needs to refresh its schema cache. 
-- Sometimes just running any DDL helps.
COMMENT ON TABLE public.deleted_applications IS 'Table for storing deleted applications (trash bin)';

-- Re-grant on pending_applications just in case
GRANT ALL ON public.pending_applications TO service_role;
GRANT ALL ON public.pending_applications TO postgres;
