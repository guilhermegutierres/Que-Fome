-- Supabase Storage normally enables RLS on storage.objects. Refuse to install
-- policies that would otherwise be inert; do not enable RLS here because that
-- could change access behavior for unrelated buckets.
DO $$
DECLARE
  storage_objects_rls_enabled BOOLEAN;
BEGIN
  SELECT c.relrowsecurity
  INTO storage_objects_rls_enabled
  FROM pg_catalog.pg_class AS c
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'storage' AND c.relname = 'objects';

  IF storage_objects_rls_enabled IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION
      'RLS must already be enabled on storage.objects before applying Que-Fome upload policies';
  END IF;
END
$$;

CREATE POLICY que_fome_upload_receitas_proprias
ON storage.objects
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receitas'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

-- Restrictive policies make the ownership boundary hold even if another
-- permissive Storage policy also applies to these commands.
CREATE POLICY que_fome_restringe_insert_receitas
ON storage.objects
AS RESTRICTIVE
FOR INSERT
TO public
WITH CHECK (
  bucket_id <> 'receitas'
  OR (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

CREATE POLICY que_fome_restringe_update_receitas
ON storage.objects
AS RESTRICTIVE
FOR UPDATE
TO public
USING (
  bucket_id <> 'receitas'
  OR (storage.foldername(name))[1] = (SELECT auth.uid()::text)
)
WITH CHECK (
  bucket_id <> 'receitas'
  OR (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

CREATE POLICY que_fome_restringe_delete_receitas
ON storage.objects
AS RESTRICTIVE
FOR DELETE
TO public
USING (
  bucket_id <> 'receitas'
  OR (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);
