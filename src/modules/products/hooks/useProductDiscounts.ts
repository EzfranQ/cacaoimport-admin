import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/app/libs/supabase";

export type DiscountType = "percentage" | "fixed";

export interface ProductDiscount {
  id: string;
  product_id: string;
  min_quantity: number;
  max_quantity: number | null;
  discount_type: DiscountType;
  discount_value: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProductDiscountInput {
  product_id: string;
  min_quantity: number;
  max_quantity: number | null;
  discount_type: DiscountType;
  discount_value: number;
  active?: boolean;
}

export interface UpdateProductDiscountInput {
  min_quantity?: number;
  max_quantity?: number | null;
  discount_type?: DiscountType;
  discount_value?: number;
  active?: boolean;
}

export interface ProductDiscountsQueryParams {
  product_id: string;
  includeInactive?: boolean;
}

// Hook para obtener descuentos de un producto
export const useProductDiscounts = (params: ProductDiscountsQueryParams) => {
  return useQuery({
    queryKey: ["product-discounts", params.product_id, params.includeInactive],
    queryFn: async () => {
      let query = supabase
        .from("product_discounts")
        .select("*")
        .eq("product_id", params.product_id)
        .order("min_quantity", { ascending: true });

      if (!params.includeInactive) {
        query = query.eq("active", true);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Error fetching product discounts: ${error.message}`);
      }

      return data as ProductDiscount[];
    },
    enabled: Boolean(params.product_id),
  });
};

// Hook para crear un descuento
export const useCreateProductDiscount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProductDiscountInput) => {
      const { data, error } = await supabase
        .from("product_discounts")
        .insert([
          {
            product_id: input.product_id,
            min_quantity: input.min_quantity,
            max_quantity: input.max_quantity,
            discount_type: input.discount_type,
            discount_value: input.discount_value,
            active: input.active ?? true,
          },
        ])
        .select("*")
        .single();

      if (error) {
        throw new Error(`Error creating product discount: ${error.message}`);
      }

      return data as ProductDiscount;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ["product-discounts", data.product_id] 
      });
    },
  });
};

// Hook para actualizar un descuento
export const useUpdateProductDiscount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: UpdateProductDiscountInput 
    }) => {
      const { data, error } = await supabase
        .from("product_discounts")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        throw new Error(`Error updating product discount: ${error.message}`);
      }

      return data as ProductDiscount;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ["product-discounts", data.product_id] 
      });
    },
  });
};

// Hook para eliminar un descuento
export const useDeleteProductDiscount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Primero obtenemos el product_id para invalidar la cache
      const { data: discount } = await supabase
        .from("product_discounts")
        .select("product_id")
        .eq("id", id)
        .single();

      const { error } = await supabase
        .from("product_discounts")
        .delete()
        .eq("id", id);

      if (error) {
        throw new Error(`Error deleting product discount: ${error.message}`);
      }

      return { id, product_id: discount?.product_id };
    },
    onSuccess: (data) => {
      if (data.product_id) {
        queryClient.invalidateQueries({ 
          queryKey: ["product-discounts", data.product_id] 
        });
      }
    },
  });
};

// Hook para activar/desactivar un descuento
export const useToggleProductDiscountStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { data, error } = await supabase
        .from("product_discounts")
        .update({ active })
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        throw new Error(`Error toggling product discount status: ${error.message}`);
      }

      return data as ProductDiscount;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ["product-discounts", data.product_id] 
      });
    },
  });
};

// Hook para gestionar múltiples descuentos de un producto (batch operations)
export const useBatchUpdateProductDiscounts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      discounts,
    }: {
      product_id: string;
      discounts: (CreateProductDiscountInput | (ProductDiscount & { _action: 'update' | 'delete' }))[];
    }) => {
      const results = [];

      for (const discount of discounts) {
        if ('_action' in discount) {
          if (discount._action === 'delete') {
            await supabase
              .from("product_discounts")
              .delete()
              .eq("id", discount.id);
          } else if (discount._action === 'update') {
            const { _action, id, created_at, updated_at, ...updates } = discount;
            const { data } = await supabase
              .from("product_discounts")
              .update(updates)
              .eq("id", id)
              .select("*")
              .single();
            results.push(data);
          }
        } else {
          // Create new discount
          const { data } = await supabase
            .from("product_discounts")
            .insert([discount])
            .select("*")
            .single();
          results.push(data);
        }
      }

      return results;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["product-discounts", variables.product_id] 
      });
    },
  });
};