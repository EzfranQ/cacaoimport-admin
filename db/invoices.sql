-- ============================================================================
-- Tabla de facturas (invoices)
-- Ejecutar este script en el SQL Editor de Supabase.
--
-- Diseño ligero: 1 fila por factura. Los ítems y la dirección se guardan como
-- snapshot en columnas JSONB, evitando tablas auxiliares y joins. El id es
-- secuencial (bigint) para ahorrar espacio frente a un uuid.
--
-- Fuentes de una factura:
--   * Facturación manual (panel admin): profile_id y order_id quedan en NULL.
--   * Pedido facturado: profile_id = orders.profile_id, order_id = orders.id.
-- ============================================================================

create table if not exists public.invoices (
  id              bigint generated always as identity primary key,
  created_at      timestamptz not null default now(),
  client_name     text not null,
  client_phone    text,
  profile_id      uuid references public.profiles(id) on delete set null,
  order_id        uuid references public.orders(id)   on delete set null,
  seller          text,
  payment_methods text,                                  -- ej "Efectivo,Transferencia"
  delivered       boolean not null default false,
  subtotal        numeric(12,2) not null default 0,
  total           numeric(12,2) not null default 0,
  address         jsonb,                                 -- {address, address_line_2, department_name, phone}
  items           jsonb not null default '[]'::jsonb     -- [{name, sku, quantity, unit_price}]
);

create index if not exists invoices_profile_id_idx  on public.invoices (profile_id);
create index if not exists invoices_created_at_idx   on public.invoices (created_at);
create index if not exists invoices_client_name_idx  on public.invoices (lower(client_name));

-- RLS: mismo modelo que el resto del panel (anon key + sesión = rol authenticated).
alter table public.invoices enable row level security;

drop policy if exists "invoices_authenticated_all" on public.invoices;
create policy "invoices_authenticated_all" on public.invoices
  for all
  to authenticated
  using (true)
  with check (true);
