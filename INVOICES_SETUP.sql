-- ============================================================
-- Cacao Import — Tabla de Facturas (módulo Facturación / Clientes)
-- Ejecutar UNA SOLA VEZ en: Supabase > SQL Editor
-- Soluciona: "Could not find the table 'public.invoices' in the schema cache"
-- ============================================================

create table if not exists public.invoices (
  id              bigint generated always as identity primary key,
  created_at      timestamptz not null default now(),
  client_name     text not null,
  client_phone    text,
  profile_id      uuid,
  order_id        uuid,
  seller          text,
  payment_methods text,                       -- métodos separados por coma (ej: "Efectivo,Transferencia")
  delivered       boolean not null default false,
  subtotal        numeric not null default 0,
  total           numeric not null default 0,
  address         jsonb,                       -- { address, address_line_2, department_name, phone }
  items           jsonb not null default '[]'::jsonb  -- [{ name, sku, quantity, unit_price }]
);

-- Índices para las consultas del módulo (por cliente y por fecha)
create index if not exists idx_invoices_created_at on public.invoices (created_at desc);
create index if not exists idx_invoices_profile_id on public.invoices (profile_id);

-- ============================================================
-- RLS: datos internos del panel. Solo usuarios autenticados (admin).
-- ============================================================
alter table public.invoices enable row level security;

drop policy if exists "invoices auth all" on public.invoices;
create policy "invoices auth all"
  on public.invoices for all
  to authenticated
  using (true)
  with check (true);
