-- ============================================================
-- Gallery Footer Overlay: gallery_footers table + RLS
-- Run in the Supabase Dashboard (SQL Editor).
--
-- PURPOSE: top-level storage for the transparent "frame" overlay
-- applied to newly uploaded gallery photos. Public (anon) may read
-- the list so any gallery flow can find the active footer; writes
-- are restricted to `authenticated` sessions (admins/judges only).
--
-- Idempotent: safe to run multiple times.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gallery_footers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Footer',
  image_url text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 2. RLS
-- ------------------------------------------------------------
ALTER TABLE public.gallery_footers ENABLE ROW LEVEL SECURITY;

-- Public read so the gallery page (anon) can discover the active footer
-- and composited uploads can reference it.
CREATE POLICY "public_read_gallery_footers" ON public.gallery_footers
  FOR SELECT TO anon, authenticated USING (true);

-- Admin (authenticated) write access, matching the spotlight pattern.
CREATE POLICY "admin_write_gallery_footers" ON public.gallery_footers
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_write_gallery_footers_update" ON public.gallery_footers
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_write_gallery_footers_delete" ON public.gallery_footers
  FOR DELETE TO authenticated USING (true);

-- ------------------------------------------------------------
-- 3. Grants
-- ------------------------------------------------------------
GRANT SELECT ON TABLE public.gallery_footers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.gallery_footers TO authenticated;

-- ------------------------------------------------------------
-- 4. Ensure at most one active footer stays active at any time.
--    Trigger keeps single-active semantics even if the app races.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_single_active_footer()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_active THEN
    UPDATE public.gallery_footers SET is_active = false WHERE is_active = true AND id <> NEW.id;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_single_active_footer ON public.gallery_footers;
CREATE TRIGGER trg_single_active_footer
  BEFORE INSERT OR UPDATE ON public.gallery_footers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_active_footer();

-- ------------------------------------------------------------
-- 5. Refresh PostgREST schema cache
-- ------------------------------------------------------------
NOTIFY pgrst, 'reload schema';