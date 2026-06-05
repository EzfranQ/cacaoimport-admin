/**
 * Hooks para gestionar los Productos Destacados del Home.
 * El estado "destacado" vive en las columnas products.is_featured / featured_order.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/app/libs/supabase";

export interface FeaturedProduct {
  id: string;
  name: string;
  price: number;
  sku: string | null;
  featured_order: number | null;
  imageUrl: string | null;
}

const KEY = ["featured_products"];

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

export const useFeaturedProducts = () =>
  useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<FeaturedProduct[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, sku, featured_order")
        .eq("is_featured", true)
        .is("deleted_at", null)
        .order("featured_order", { ascending: true, nullsFirst: false });
      if (error) throw new Error(error.message);

      const rows = data ?? [];
      const images = await fetchPrimaryImages(rows.map((r: any) => r.id));

      return rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        price: Number(r.price ?? 0),
        sku: r.sku ?? null,
        featured_order: r.featured_order ?? null,
        imageUrl: images[r.id] ?? null,
      }));
    },
  });

/** Marca un producto como destacado, ubicándolo al final del orden. */
export const useAddFeatured = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, nextOrder }: { productId: string; nextOrder: number }) => {
      const { error } = await supabase
        .from("products")
        .update({ is_featured: true, featured_order: nextOrder })
        .eq("id", productId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

/** Quita un producto de destacados. */
export const useRemoveFeatured = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from("products")
        .update({ is_featured: false, featured_order: null })
        .eq("id", productId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

/** Persiste el orden completo de los destacados. */
export const useReorderFeatured = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      for (let i = 0; i < orderedIds.length; i++) {
        const { error } = await supabase
          .from("products")
          .update({ featured_order: i })
          .eq("id", orderedIds[i]);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};
