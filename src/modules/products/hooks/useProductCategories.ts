/**
 * Hook para gestionar las relaciones entre productos y categorías
 * Permite cargar, crear y eliminar asociaciones entre productos y categorías
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/app/libs/supabase";
import type { Category } from "@/modules/categories/hooks/useCategories";

export interface ProductCategory {
  id: string;
  product_id: string;
  category_id: string;
  created_at: string;
  created_by?: string;
  category?: Category;
}

/**
 * Hook para obtener las categorías asociadas a un producto
 */
export const useProductCategories = (productId: string) => {
  return useQuery({
    queryKey: ["product-categories", productId],
    queryFn: async (): Promise<ProductCategory[]> => {
      const { data, error } = await supabase
        .from("product_categories")
        .select(`
          id,
          product_id,
          category_id,
          created_at,
          created_by,
          category:categories(*)
        `)
        .eq("product_id", productId);

      if (error) {
        throw new Error(`Error fetching product categories: ${error.message}`);
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        category_id: item.category_id,
        created_at: item.created_at,
        created_by: item.created_by,
        category: item.category?.[0] || undefined,
      }));
    },
    enabled: !!productId,
  });
};

/**
 * Hook para actualizar las categorías de un producto
 * Elimina las asociaciones existentes y crea las nuevas
 */
export const useUpdateProductCategories = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      categoryIds,
    }: {
      productId: string;
      categoryIds: string[];
    }) => {
      // Primero eliminamos todas las asociaciones existentes
      const { error: deleteError } = await supabase
        .from("product_categories")
        .delete()
        .eq("product_id", productId);

      if (deleteError) {
        throw new Error(`Error deleting product categories: ${deleteError.message}`);
      }

      // Si hay nuevas categorías, las creamos
      if (categoryIds.length > 0) {
        const { error: insertError } = await supabase
          .from("product_categories")
          .insert(
            categoryIds.map((categoryId) => ({
              product_id: productId,
              category_id: categoryId,
            }))
          );

        if (insertError) {
          throw new Error(`Error creating product categories: ${insertError.message}`);
        }
      }

      return true;
    },
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ["product-categories", productId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
};