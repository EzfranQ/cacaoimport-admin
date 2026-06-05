/**
 * Hooks para gestionar los productos de "Nuevos Ingresos" del Home.
 * El estado vive en las columnas products.is_new_arrival / new_arrival_order.
 * Máximo recomendado: 6 (para no romper el diseño de la grilla).
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/app/libs/supabase";

export const MAX_NEW_ARRIVALS = 6;

export interface NewArrivalProduct {
  id: string;
  name: string;
  price: number;
  sku: string | null;
  new_arrival_order: number | null;
  imageUrl: string | null;
}

const KEY = ["new_arrivals"];

/** Trae las URLs de imagen primaria para un conjunto de productos. */
async function fetchPrimaryImages(
  productIds: string[]
): Promise<Record<string, string | null>> {
  const map: Record<string, string | null> = {};
  if (productIds.length === 0) return map;

  const { data, error } = await supabase
    .from("product_images")
    .select("product_id, images:images(bucket, storage_path)")
    .in("product_id", productIds)
    .is("deleted_at", null)
    .eq("is_primary", true);

  if (!error && data) {
    data.forEach((row: any) => {
      const bucket = row.images?.bucket;
      const path = row.images?.storage_path;
      if (bucket && path) {
        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
        map[row.product_id] = pub?.publicUrl ?? null;
      }
    });
  }
  return map;
}

export const useNewArrivals = () =>
  useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<NewArrivalProduct[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, sku, new_arrival_order")
        .eq("is_new_arrival", true)
        .is("deleted_at", null)
        .order("new_arrival_order", { ascending: true, nullsFirst: false });
      if (error) throw new Error(error.message);

      const rows = data ?? [];
      const images = await fetchPrimaryImages(rows.map((r: any) => r.id));

      return rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        price: Number(r.price ?? 0),
        sku: r.sku ?? null,
        new_arrival_order: r.new_arrival_order ?? null,
        imageUrl: images[r.id] ?? null,
      }));
    },
  });

/** Marca un producto como Nuevo Ingreso, al final del orden. */
export const useAddNewArrival = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, nextOrder }: { productId: string; nextOrder: number }) => {
      const { error } = await supabase
        .from("products")
        .update({ is_new_arrival: true, new_arrival_order: nextOrder })
        .eq("id", productId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

/** Quita un producto de Nuevos Ingresos. */
export const useRemoveNewArrival = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from("products")
        .update({ is_new_arrival: false, new_arrival_order: null })
        .eq("id", productId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

/** Persiste el orden completo de los Nuevos Ingresos. */
export const useReorderNewArrivals = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      for (let i = 0; i < orderedIds.length; i++) {
        const { error } = await supabase
          .from("products")
          .update({ new_arrival_order: i })
          .eq("id", orderedIds[i]);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};
