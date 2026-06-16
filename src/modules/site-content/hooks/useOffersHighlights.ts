/**
 * Hooks para gestionar las Ofertas Destacadas de la tienda.
 * Los datos viven en la tabla featured_offers (product_id, position).
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/app/libs/supabase";

export interface OfferProduct {
  id: string;
  name: string;
  price: number;
  sku: string | null;
  position: number;
  imageUrl: string | null;
}

const KEY = ["featured_offers"];

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

export const useOffersHighlights = () =>
  useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<OfferProduct[]> => {
      const { data: rows, error } = await supabase
        .from("featured_offers")
        .select("product_id, position")
        .order("position", { ascending: true });
      if (error) throw new Error(error.message);
      if (!rows || rows.length === 0) return [];

      const productIds = rows.map((r: any) => r.product_id as string);
      const { data: prods, error: prodErr } = await supabase
        .from("products")
        .select("id, name, price, sku")
        .in("id", productIds)
        .is("deleted_at", null);
      if (prodErr) throw new Error(prodErr.message);

      const images = await fetchPrimaryImages(productIds);
      const byId = Object.fromEntries((prods ?? []).map((p: any) => [p.id, p]));

      return productIds
        .map((id, i) => {
          const p = byId[id];
          if (!p) return null;
          return {
            id: p.id as string,
            name: p.name as string,
            price: Number(p.price ?? 0),
            sku: p.sku ?? null,
            position: rows[i].position,
            imageUrl: images[id] ?? null,
          };
        })
        .filter(Boolean) as OfferProduct[];
    },
  });

export const useAddOfferHighlight = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, nextPosition }: { productId: string; nextPosition: number }) => {
      const { error } = await supabase
        .from("featured_offers")
        .upsert({ product_id: productId, position: nextPosition }, { onConflict: "product_id" });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useRemoveOfferHighlight = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from("featured_offers")
        .delete()
        .eq("product_id", productId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useReorderOfferHighlights = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await Promise.all(
        orderedIds.map((id, i) =>
          supabase.from("featured_offers").update({ position: i }).eq("product_id", id)
        )
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};
