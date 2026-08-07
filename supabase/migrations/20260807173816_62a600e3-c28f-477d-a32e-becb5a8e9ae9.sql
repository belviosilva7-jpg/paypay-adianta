ALTER TABLE public.pending_applications 
ADD COLUMN IF NOT EXISTS analysis_color text;

-- Garantir que anon e authenticated podem atualizar e apagar (necessário para o fluxo atual)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_applications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_applications TO authenticated;
GRANT ALL ON public.pending_applications TO service_role;
