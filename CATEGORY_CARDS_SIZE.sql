-- Agregar columna image_size_px a category_cards
-- Ejecutar en: Supabase > SQL Editor
-- Es idempotente: se puede correr varias veces sin error.

ALTER TABLE public.category_cards
  ADD COLUMN IF NOT EXISTS image_size_px INTEGER DEFAULT 40;
