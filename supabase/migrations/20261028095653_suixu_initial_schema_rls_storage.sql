-- Suixu fresh backend: single-owner private workspace.
-- Approved GitHub provider ID is the public account ID for hemol8433-cell.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.is_phd_atlas_owner()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM auth.identities AS i
    WHERE i.user_id = (SELECT auth.uid())
      AND i.provider = 'github'
      AND i.provider_id = '280190617'
  );
$function$;
REVOKE ALL ON FUNCTION private.is_phd_atlas_owner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_phd_atlas_owner() TO authenticated;

CREATE TABLE IF NOT EXISTS public.phd_private_papers (
  id integer PRIMARY KEY CHECK (id = 1),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.phd_private_papers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.phd_private_papers FROM anon, authenticated;
GRANT SELECT ON TABLE public.phd_private_papers TO authenticated;
DROP POLICY IF EXISTS "approved_github_owner_can_read_gate" ON public.phd_private_papers;
CREATE POLICY "approved_github_owner_can_read_gate"
  ON public.phd_private_papers FOR SELECT TO authenticated
  USING ((SELECT private.is_phd_atlas_owner()) AND id = 1);
INSERT INTO public.phd_private_papers (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.phd_workspace_state (
  owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  document jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.phd_workspace_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.phd_workspace_state FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.phd_workspace_state TO authenticated;
DROP POLICY IF EXISTS "owner_can_manage_own_workspace" ON public.phd_workspace_state;
CREATE POLICY "owner_can_manage_own_workspace"
  ON public.phd_workspace_state FOR ALL TO authenticated
  USING (owner_id = (SELECT auth.uid()) AND (SELECT private.is_phd_atlas_owner()))
  WITH CHECK (owner_id = (SELECT auth.uid()) AND (SELECT private.is_phd_atlas_owner()));

INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES (
  'phd-atlas-private','phd-atlas-private',false,26214400,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf','text/plain','text/markdown','text/csv',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation']::text[]
)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,public=false,
  file_size_limit=EXCLUDED.file_size_limit,allowed_mime_types=EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "suixu_owner_read_private_files" ON storage.objects;
CREATE POLICY "suixu_owner_read_private_files" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='phd-atlas-private' AND name LIKE ((SELECT auth.uid())::text || '/uploads/%')
AND (SELECT private.is_phd_atlas_owner()));
DROP POLICY IF EXISTS "suixu_owner_upload_private_files" ON storage.objects;
CREATE POLICY "suixu_owner_upload_private_files" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='phd-atlas-private' AND name LIKE ((SELECT auth.uid())::text || '/uploads/%')
AND (SELECT private.is_phd_atlas_owner()));
DROP POLICY IF EXISTS "suixu_owner_update_private_files" ON storage.objects;
CREATE POLICY "suixu_owner_update_private_files" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='phd-atlas-private' AND name LIKE ((SELECT auth.uid())::text || '/uploads/%')
AND (SELECT private.is_phd_atlas_owner()))
WITH CHECK (bucket_id='phd-atlas-private' AND name LIKE ((SELECT auth.uid())::text || '/uploads/%')
AND (SELECT private.is_phd_atlas_owner()));
DROP POLICY IF EXISTS "suixu_owner_delete_private_files" ON storage.objects;
CREATE POLICY "suixu_owner_delete_private_files" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='phd-atlas-private' AND name LIKE ((SELECT auth.uid())::text || '/uploads/%')
AND (SELECT private.is_phd_atlas_owner()));
