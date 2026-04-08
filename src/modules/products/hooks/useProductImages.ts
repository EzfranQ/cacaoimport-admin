/**
 * Hooks para gestionar imágenes de productos usando Supabase Storage y tablas public.images y public.product_images
 * - Carga de imágenes existentes por producto
 * - Subida de nuevas imágenes y enlace al producto (incluyendo portada única)
 * - Marcar/desmarcar portada
 * - Desvincular (soft delete) una imagen del producto
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/app/libs/supabase";

export interface ProductImageItem {
  productImageId: string;
  productId: string;
  imageId: string;
  sortOrder: number;
  isPrimary: boolean;
  storagePath: string;
  alt?: string | null;
  deletedAt?: string | null;
  publicUrl: string;
}

const BUCKET = "product-images";

function getPublicUrl(path: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export const useProductImages = (productId: string) => {
  return useQuery({
    queryKey: ["product_images", productId],
    queryFn: async (): Promise<ProductImageItem[]> => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from("product_images")
        .select(
          "id, product_id, image_id, sort_order, is_primary, deleted_at, images:images(id, storage_path, alt)"
        )
        .eq("product_id", productId)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true });

      if (error) {
        throw new Error(`Error fetching product images: ${error.message}`);
      }

      const items: ProductImageItem[] = (data ?? []).map((row: any) => {
        const img = Array.isArray(row.images) ? row.images[0] : row.images;
        return {
          productImageId: row.id,
          productId: row.product_id,
          imageId: row.image_id,
          sortOrder: row.sort_order ?? 0,
          isPrimary: !!row.is_primary,
          storagePath: img?.storage_path,
          alt: img?.alt ?? null,
          deletedAt: row.deleted_at ?? null,
          publicUrl: img?.storage_path ? getPublicUrl(img.storage_path) : "",
        };
      });

      return items;
    },
    enabled: !!productId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

export interface UploadImageItemInput {
  file: File;
  alt?: string | null;
  isPrimary?: boolean;
  sortOrder?: number;
}

function extFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

export const useUploadProductImages = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, items }: { productId: string; items: UploadImageItemInput[] }) => {
      if (!productId) throw new Error("productId es requerido");
      const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
      const MAX = 1572864; // 1.5 MB

      // Normalizar: asegurar que haya como máximo UNA portada en el lote
      let foundPrimary = false;
      const normalizedItems = items.map((i) => {
        if (i.isPrimary && !foundPrimary) {
          foundPrimary = true;
          return { ...i, isPrimary: true };
        }
        // Si hay múltiples marcadas, las posteriores se fuerzan a no ser portada
        return { ...i, isPrimary: false };
      });

      // Si alguna imagen marcada como portada, limpiar portada previa
      if (foundPrimary) {
        const { error: upErr } = await supabase
          .from("product_images")
          .update({ is_primary: false })
          .eq("product_id", productId)
          .is("deleted_at", null)
          .eq("is_primary", true);
        if (upErr) throw new Error(`Error desmarcando portada previa: ${upErr.message}`);
      }

      let sortCursor = 0;
      for (const item of normalizedItems) {
        const file = item.file;
        if (!allowed.has(file.type)) {
          throw new Error("Formato no permitido. Solo JPG/PNG/WEBP.");
        }
        if (file.size > MAX) {
          throw new Error("Archivo supera 1.5 MB.");
        }

        const ext = extFromMime(file.type);
        const path = `${productId}/${crypto.randomUUID()}.${ext}`;

        const uploadRes = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (uploadRes.error) {
          throw new Error(`Error subiendo archivo: ${uploadRes.error.message}`);
        }

        const { data: imageRow, error: imgErr } = await supabase
          .from("images")
          .insert({
            bucket: BUCKET,
            storage_path: path,
            alt: item.alt ?? null,
            mime_type: file.type,
            size_bytes: file.size,
          })
          .select("id")
          .single();
        if (imgErr) {
          throw new Error(`Error creando registro de imagen: ${imgErr.message}`);
        }

        const { error: linkErr } = await supabase
          .from("product_images")
          .insert({
            product_id: productId,
            image_id: imageRow.id,
            sort_order: typeof item.sortOrder === "number" ? item.sortOrder : sortCursor,
            is_primary: !!item.isPrimary,
          });
        if (linkErr) {
          throw new Error(`Error vinculando imagen al producto: ${linkErr.message}`);
        }

        sortCursor++;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["product_images", variables.productId] });
    },
  });
};

export const useDeleteProductImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productImageId }: { productImageId: string; productId: string }) => {
      const { error } = await supabase
        .from("product_images")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", productImageId);
      if (error) throw new Error(`Error desvinculando imagen: ${error.message}`);
    },
    onSuccess: (_data, variables) => {
      // Invalidar específicamente las queries del producto afectado
      queryClient.invalidateQueries({ queryKey: ["product_images", variables.productId] });
      queryClient.invalidateQueries({ queryKey: ["primary_product_image", variables.productId] });
    },
  });
};

export const useSetPrimaryProductImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, productImageId }: { productId: string; productImageId: string }) => {
      // Desmarcar otras portadas activas
      const { error: clearErr } = await supabase
        .from("product_images")
        .update({ is_primary: false })
        .eq("product_id", productId)
        .is("deleted_at", null)
        .eq("is_primary", true);
      if (clearErr) throw new Error(`Error limpiando portada: ${clearErr.message}`);

      const { error: setErr } = await supabase
        .from("product_images")
        .update({ is_primary: true })
        .eq("id", productImageId);
      if (setErr) throw new Error(`Error marcando portada: ${setErr.message}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["product_images", variables.productId] });
    },
  });
};

/**
 * Actualiza el texto alternativo (alt) de la imagen original en la tabla public.images
 */
export const useUpdateImageAlt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ imageId, alt }: { imageId: string; alt: string | null }) => {
      const { error } = await supabase
        .from("images")
        .update({ alt })
        .eq("id", imageId);
      if (error) throw new Error(`Error actualizando alt: ${error.message}`);
    },
    onSuccess: () => {
      // Invalidar listado de imágenes del producto y la posible portada
      queryClient.invalidateQueries({ queryKey: ["product_images"] });
      queryClient.invalidateQueries({ queryKey: ["primary_product_image"] });
    },
  });
};
export const usePrimaryProductImage = (productId: string) => {
  return useQuery({
    queryKey: ["primary_product_image", productId],
    queryFn: async (): Promise<ProductImageItem | null> => {
      if (!productId) return null;
      const { data, error } = await supabase
        .from("product_images")
        .select(
          "id, product_id, image_id, sort_order, is_primary, deleted_at, images:images(id, storage_path, alt)"
        )
        .eq("product_id", productId)
        .eq("is_primary", true)
        .is("deleted_at", null)
        .limit(1);

      if (error) {
        throw new Error(`Error fetching primary image: ${error.message}`);
      }

      const row = (data ?? [])[0];
      if (!row) return null;
      const img = Array.isArray(row.images) ? row.images[0] : row.images;

      return {
        productImageId: row.id,
        productId: row.product_id,
        imageId: row.image_id,
        sortOrder: row.sort_order ?? 0,
        isPrimary: !!row.is_primary,
        storagePath: img?.storage_path,
        alt: img?.alt ?? null,
        deletedAt: row.deleted_at ?? null,
        publicUrl: img?.storage_path ? getPublicUrl(img.storage_path) : "",
      };
    },
    enabled: !!productId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};