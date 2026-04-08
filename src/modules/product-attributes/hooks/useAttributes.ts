/**
 * Hooks de TanStack Query para el maestro de Atributos de Producto
 * Implementa listado, creación, actualización y soft delete con Supabase.
 *
 * Notas:
 * - Minimalista: solo name y description.
 * - Soft delete mediante deleted_at.
 * - Invalida la query "attributes" tras mutaciones.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/app/libs/supabase";

export interface Attribute {
  id: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface CreateAttributeInput {
  name: string;
  description?: string | null;
}

export interface UpdateAttributeInput {
  name?: string;
  description?: string | null;
  deleted_at?: string | null;
}

export interface AttributesQueryParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  includeDeleted?: boolean;
}

export interface AttributesResult {
  data: Attribute[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface AttributeUsageDetails {
  is_used: boolean;
  product_attributes_count: number;
  attribute_units_count: number;
  product_attributes: Array<{
    id: string;
    product_id: string;
    value: string;
  }>;
  attribute_units: Array<{
    id: string;
    unit_id: string;
  }>;
}

export const useAttributes = (params: AttributesQueryParams = {}) => {
  const {
    page = 1,
    pageSize = 10,
    sortBy = "created_at",
    sortOrder = "desc",
    search,
    includeDeleted = false,
  } = params;

  return useQuery({
    queryKey: [
      "attributes",
      { page, pageSize, sortBy, sortOrder, search, includeDeleted },
    ],
    queryFn: async (): Promise<AttributesResult> => {
      const offset = (page - 1) * pageSize;

      let query = supabase
        .from("attributes")
        .select(
          "id,name,description,created_at,updated_at,created_by,updated_by,deleted_at,deleted_by",
          { count: "exact" }
        );

      if (search) {
        query = query.or(
          `name.ilike.%${search}%,description.ilike.%${search}%`
        );
      }

      if (!includeDeleted) {
        query = query.is("deleted_at", null);
      }

      const allowedSortBy = ["name", "created_at", "updated_at"];
      const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : "created_at";

      const { data, error, count } = await query
        .order(safeSortBy, { ascending: sortOrder === "asc" })
        .range(offset, offset + pageSize - 1);

      if (error) {
        throw new Error(`Error fetching attributes: ${error.message}`);
      }

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        data: (data ?? []) as Attribute[],
        totalCount,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useAttribute = (id: string) => {
  return useQuery({
    queryKey: ["attributes", id],
    queryFn: async (): Promise<Attribute> => {
      const { data, error } = await supabase
        .from("attributes")
        .select(
          "id,name,description,created_at,updated_at,created_by,updated_by,deleted_at,deleted_by"
        )
        .eq("id", id)
        .single();

      if (error) {
        throw new Error(`Error fetching attribute: ${error.message}`);
      }

      return data as Attribute;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useCreateAttribute = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAttributeInput) => {
      const { data, error } = await supabase
        .from("attributes")
        .insert([
          {
            name: input.name,
            description: input.description ?? null,
          },
        ])
        .select(
          "id,name,description,created_at,updated_at,created_by,updated_by,deleted_at,deleted_by"
        )
        .single();

      if (error) {
        throw new Error(`Error creating attribute: ${error.message}`);
      }
      return data as Attribute;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attributes"] });
    },
  });
};

export const useUpdateAttribute = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateAttributeInput }) => {
      const { data, error } = await supabase
        .from("attributes")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select(
          "id,name,description,created_at,updated_at,created_by,updated_by,deleted_at,deleted_by"
        )
        .single();

      if (error) {
        throw new Error(`Error updating attribute: ${error.message}`);
      }
      return data as Attribute;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attributes"] });
    },
  });
};

export const useDeleteAttribute = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("attributes")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)
        .select(
          "id,name,description,created_at,updated_at,created_by,updated_by,deleted_at,deleted_by"
        )
        .single();

      if (error) {
        throw new Error(`Error deleting attribute: ${error.message}`);
      }
      return data as Attribute;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attributes"] });
    },
  });
};

export const useRestoreAttribute = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("attributes")
        .update({ deleted_at: null, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select(
          "id,name,description,created_at,updated_at,created_by,updated_by,deleted_at,deleted_by"
        )
        .single();

      if (error) {
        throw new Error(`Error restoring attribute: ${error.message}`);
      }
      return data as Attribute;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attributes"] });
    },
  });
};

export const useCheckAttributeUsage = () => {
  return useMutation({
    mutationFn: async (attributeId: string): Promise<AttributeUsageDetails> => {
      const { data, error } = await supabase.rpc("get_attribute_usage_details", {
        p_attribute_id: attributeId,
      });

      if (error) {
        throw new Error(`Error checking attribute usage: ${error.message}`);
      }

      return data as AttributeUsageDetails;
    },
  });
};

export const useDeleteAttributeWithValidation = () => {
  const queryClient = useQueryClient();
  const checkUsage = useCheckAttributeUsage();

  return useMutation({
    mutationFn: async (id: string) => {
      // First check if the attribute is in use
      const usageDetails = await checkUsage.mutateAsync(id);

      if (usageDetails.is_used) {
        // Construct detailed error message
        let errorMessage = "No se puede eliminar este atributo porque está siendo utilizado:\n\n";
        
        if (usageDetails.product_attributes_count > 0) {
          errorMessage += `• ${usageDetails.product_attributes_count} producto(s) tienen este atributo asignado\n`;
        }
        
        if (usageDetails.attribute_units_count > 0) {
          errorMessage += `• ${usageDetails.attribute_units_count} unidad(es) están asociadas a este atributo\n`;
        }
        
        errorMessage += "\nPara eliminar este atributo, primero debe:\n";
        errorMessage += "1. Remover el atributo de todos los productos que lo utilizan\n";
        errorMessage += "2. Desasociar todas las unidades de medida de este atributo\n";
        errorMessage += "3. Luego podrá eliminar el atributo de forma segura";

        throw new Error(errorMessage);
      }

      // If not in use, proceed with deletion
      const { data, error } = await supabase
        .from("attributes")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)
        .select(
          "id,name,description,created_at,updated_at,created_by,updated_by,deleted_at,deleted_by"
        )
        .single();

      if (error) {
        throw new Error(`Error deleting attribute: ${error.message}`);
      }
      return data as Attribute;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attributes"] });
    },
  });
};