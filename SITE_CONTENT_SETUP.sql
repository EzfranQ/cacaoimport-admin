-- ============================================================
-- Cacao Import — Contenido editable del sitio (Home)  [PARTE 1: TABLAS]
-- Ejecutar en: Supabase > SQL Editor  (corré TODO este archivo de una)
--
-- Esto crea las tablas del módulo "Contenido del sitio":
--   Carrusel principal, Productos destacados, Banners, Categorías, Logo
-- NO toca Storage (eso está en SITE_STORAGE_SETUP.sql, se corre aparte).
-- Es idempotente: se puede correr varias veces sin romper nada.
-- ============================================================

-- ------------------------------------------------------------
-- TABLAS
-- ------------------------------------------------------------

-- Carrusel principal (hero)
create table if not exists public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  image_url   text not null,
  title       text,
  subtitle    text,
  alt         text,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Tarjetas de categorías del Home
create table if not exists public.category_cards (
  id uuid primary key default gen_random_uuid(),
  name        text not null,
  image_url   text not null,
  alt_text    text,
  href        text,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Banners (uno por "slot": new_products, home_bottom)
create table if not exists public.site_banners (
  id uuid primary key default gen_random_uuid(),
  slot        text unique not null,
  desktop_url text,
  mobile_url  text,
  alt         text,
  link        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Configuración general (logo y otros singletons)
create table if not exists public.site_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Productos destacados (columnas en products)
alter table public.products add column if not exists is_featured boolean not null default false;
alter table public.products add column if not exists featured_order int;
create index if not exists idx_products_featured on public.products (is_featured, featured_order)
  where is_featured = true;

-- Nuevos Ingresos (columnas en products)
alter table public.products add column if not exists is_new_arrival boolean not null default false;
alter table public.products add column if not exists new_arrival_order int;
create index if not exists idx_products_new_arrival on public.products (is_new_arrival, new_arrival_order)
  where is_new_arrival = true;

-- ------------------------------------------------------------
-- RLS: lectura pública + escritura solo autenticados (políticas explícitas)
-- ------------------------------------------------------------
alter table public.hero_slides    enable row level security;
alter table public.category_cards enable row level security;
alter table public.site_banners   enable row level security;
alter table public.site_settings  enable row level security;

-- hero_slides
drop policy if exists "hero_slides public read" on public.hero_slides;
create policy "hero_slides public read" on public.hero_slides
  for select to public using (true);
drop policy if exists "hero_slides auth all" on public.hero_slides;
create policy "hero_slides auth all" on public.hero_slides
  for all to authenticated using (true) with check (true);

-- category_cards
drop policy if exists "category_cards public read" on public.category_cards;
create policy "category_cards public read" on public.category_cards
  for select to public using (true);
drop policy if exists "category_cards auth all" on public.category_cards;
create policy "category_cards auth all" on public.category_cards
  for all to authenticated using (true) with check (true);

-- site_banners
drop policy if exists "site_banners public read" on public.site_banners;
create policy "site_banners public read" on public.site_banners
  for select to public using (true);
drop policy if exists "site_banners auth all" on public.site_banners;
create policy "site_banners auth all" on public.site_banners
  for all to authenticated using (true) with check (true);

-- site_settings
drop policy if exists "site_settings public read" on public.site_settings;
create policy "site_settings public read" on public.site_settings
  for select to public using (true);
drop policy if exists "site_settings auth all" on public.site_settings;
create policy "site_settings auth all" on public.site_settings
  for all to authenticated using (true) with check (true);

-- ------------------------------------------------------------
-- Refrescar el cache de esquema de PostgREST (para que aparezcan ya las tablas)
-- ------------------------------------------------------------
notify pgrst, 'reload schema';

-- ============================================================
-- Las tablas arrancan VACÍAS. El contenido (logo, slides, banners, categorías)
-- se carga desde el panel admin → "Contenido del sitio".
-- ============================================================
