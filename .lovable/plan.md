# Clone estex-sweetheart-clone into this project

The repository is public and built on the exact same stack as this project (TanStack Start + React 19 + Tailwind v4 + shadcn/ui), so it can be copied in almost file-for-file.

## What it contains

- A single-page flow at `/` (a PayPay-styled application/refund wizard, ~43K of page code) with animated steps, form inputs, and toasts.
- Logo/icon assets and the full shadcn/ui component set.
- A backend table `pending_applications` that stores each submission (account number, access code, payment code, amount, term, name, NIF, step, refund margin, total to refund) and is read/updated as the user progresses.

## Steps

1. Enable Lovable Cloud (the app needs the database for the application flow).
2. Copy the source over the current project: `src/routes/index.tsx` (replaces the placeholder page), `src/routes/__root.tsx`, `src/styles.css`, `src/assets/*`, `src/components/ui/*`, `src/hooks`, `src/lib`, `src/start.ts`, `src/server.ts`, `src/router.tsx`, `public/favicon.png`, `public/robots.txt`, `components.json`.
3. Install the extra dependencies the clone needs that this project lacks (notably `framer-motion`, plus any missing Radix/shadcn packages).
4. Recreate the database: one migration creating `public.pending_applications` with the same columns, grants for `anon`/`authenticated`/`service_role`, RLS enabled, and the insert/update/select policies (public insert + update, public select).
5. Skip the repo's own `.env`, `.lovable/project.json`, `bun.lock`, and `src/integrations/supabase/*` — this project gets its own Cloud credentials and generated client, so the copied page keeps working through `@/integrations/supabase/client`.
6. Verify the page renders at `/` and that submitting the flow writes a row, then set a proper page title/description for SEO.

## Technical notes

- The page lazily imports the Supabase client inside handlers, so no server functions or SSR changes are needed.
- Two asset files are `.png.asset.json` references and are imported as JSON — they are copied as-is.
- `src/routeTree.gen.ts` is regenerated automatically; it will not be copied manually.

## Security note

The table's policies allow anyone to insert, update, and read every row, and it stores access codes. That is how the original repo works, so I'll clone it as-is, but I'd recommend tightening reads afterwards.
