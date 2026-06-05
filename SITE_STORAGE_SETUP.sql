-- ============================================================
-- Cacao Import — Storage del sitio  [PARTE 2: BUCKET site-assets]
-- Ejecutar en: Supabase > SQL Editor, DESPUÉS de SITE_CONTENT_SETUP.sql
-- (Correr aparte para que un error de permisos acá no afecte las tablas.)
--
-- Permite subir imágenes (logo, banners, slides, categorías) desde el panel.
-- Si ya creaste el bucket "site-assets" por el dashboard, igual corré esto
-- para habilitar la SUBIDA (insert) de usuarios autenticados.
-- ============================================================

-- Crear el bucket (si no existe) y dejarlo público para lectura
insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do update set public = true;

-- Lectura pública
drop policy if exists "site-assets public read" on storage.objects;
create policy "site-assets public read"
  on storage.objects for select
  to public
  using (bucket_id = 'site-assets');

-- Subir: usuarios autenticados (panel admin)
drop policy if exists "site-assets auth insert" on storage.objects;
create policy "site-assets auth insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'site-assets');

-- Actualizar: usuarios autenticados
drop policy if exists "site-assets auth update" on storage.objects;
create policy "site-assets auth update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'site-assets')
  with check (bucket_id = 'site-assets');

-- Borrar: usuarios autenticados
drop policy if exists "site-assets auth delete" on storage.objects;
create policy "site-assets auth delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'site-assets');
