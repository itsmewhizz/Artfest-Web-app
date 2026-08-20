-- ============================================================
-- Poster Templates: poster_templates table + RLS
-- Run in the Supabase Dashboard (SQL Editor).
--
-- PURPOSE: store reusable poster designs (background + positioned
-- text layers) so they are SHARED with every user. Templates never
-- hold real result data — that is injected at render time when the
-- Results page auto-generates a poster per template.
--
-- Public (anon) may read the designs so the Results page can render
-- generated posters for all visitors; writes are restricted to
-- `authenticated` sessions (admins only).
--
-- Idempotent: safe to run multiple times.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Table (camelCase columns match the app's template model)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.poster_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Untitled Template',
  type text NOT NULL DEFAULT 'result',
  canvas jsonb,
  background jsonb,
  elements jsonb NOT NULL DEFAULT '[]'::jsonb,
  "teamsToShow" integer NOT NULL DEFAULT 8,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 2. RLS
-- ------------------------------------------------------------
ALTER TABLE public.poster_templates ENABLE ROW LEVEL SECURITY;

-- Public read so the Results page (anon) can render generated posters.
CREATE POLICY "public_read_poster_templates" ON public.poster_templates
  FOR SELECT TO anon, authenticated USING (true);

-- Admin (authenticated) write access.
CREATE POLICY "admin_write_poster_templates" ON public.poster_templates
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_write_poster_templates_update" ON public.poster_templates
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_write_poster_templates_delete" ON public.poster_templates
  FOR DELETE TO authenticated USING (true);

-- ------------------------------------------------------------
-- 3. Grants
-- ------------------------------------------------------------
GRANT SELECT ON TABLE public.poster_templates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.poster_templates TO authenticated;

-- ------------------------------------------------------------
-- 4. Touch updatedAt on any write
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_poster_template_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW."updatedAt" := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_poster_template_updated_at ON public.poster_templates;
CREATE TRIGGER trg_touch_poster_template_updated_at
  BEFORE INSERT OR UPDATE ON public.poster_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_poster_template_updated_at();

-- ------------------------------------------------------------
-- 5. Refresh PostgREST schema cache
-- ------------------------------------------------------------
NOTIFY pgrst, 'reload schema';