-- ============================================================
-- Cacao Import — Vaciar papelera de productos (BORRADO DEFINITIVO)
-- Ejecutar UNA SOLA VEZ en: Supabase > SQL Editor
--
-- Crea la función purge_deleted_products(), que elimina PARA SIEMPRE
-- únicamente los productos con deleted_at NOT NULL (los de la papelera),
-- junto con sus datos asociados, para liberar espacio:
--   - archivos de imagen en Storage (bucket product-images)
--   - registros en images / product_images
--   - product_categories / product_attributes / product_discounts
--   - desvincula productos hijos (self-FK)
--
-- NO toca el historial de órdenes: order_items guarda un snapshot propio
-- (nombre, sku, precio) y no depende de la fila del producto.
-- ============================================================

create or replace function public.purge_deleted_products()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  ids uuid[];
  removed integer;
begin
  -- IDs de los productos en la papelera
  select array_agg(id) into ids from products where deleted_at is not null;
  if ids is null then
    return 0;
  end if;

  -- 1) Borrar los archivos físicos del Storage (bucket product-images)
  delete from storage.objects
   where bucket_id = 'product-images'
     and name in (
       select i.storage_path
         from images i
         join product_images pi on pi.image_id = i.id
        where pi.product_id = any(ids)
     );

  -- 2) Borrar los registros de imágenes vinculados a esos productos
  delete from images
   where id in (select image_id from product_images where product_id = any(ids));

  -- 3) Borrar relaciones hijas
  delete from product_images     where product_id = any(ids);
  delete from product_categories where product_id = any(ids);
  delete from product_attributes where product_id = any(ids);
  delete from product_discounts  where product_id = any(ids);

  -- 4) Desvincular productos hijos que apuntaban a uno que se va a borrar (self-FK)
  update products set product_id = null where product_id = any(ids);

  -- 5) Borrar definitivamente los productos de la papelera
  delete from products where id = any(ids);
  get diagnostics removed = row_count;

  return removed;
end;
$$;

-- Permitir que el panel (usuarios autenticados) ejecute la función
grant execute on function public.purge_deleted_products() to authenticated;

-- Refrescar el cache de PostgREST para que la función esté disponible por RPC
notify pgrst, 'reload schema';
