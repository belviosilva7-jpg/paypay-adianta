CREATE TABLE public.deleted_applications (
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

ALTER TABLE public.deleted_applications ENABLE ROW LEVEL SECURITY;

-- Only service_role (server functions) can manage this table
GRANT ALL ON public.deleted_applications TO service_role;
-- No anon/authenticated access needed for trash directly
