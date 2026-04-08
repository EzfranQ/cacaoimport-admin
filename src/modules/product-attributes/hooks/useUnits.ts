/**
 * Hooks de TanStack Query para el maestro de Unidades de Medida
 * CRUD mínimo con Supabase.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/app/libs/supabase";

export interface Unit {
  id: string;
  name: string;
  code: string;
  symbol?: string | null;
  created_at: string;
  updated_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface CreateUnitInput {
  name: string;
  code: string;
  symbol?: string | null;
}

export interface UpdateUnitInput {
  name?: string;
  code?: string;
  symbol?: string | null;
  deleted_at?: string | null;
}

export interface UnitsQueryParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  includeDeleted?: boolean;
}

export interface UnitsResult {
  data: Unit[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export const useUnits = (params: UnitsQueryParams = {}) => {
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
      "units",
      { page, pageSize, sortBy, sortOrder, search, includeDeleted },
    ],
    queryFn: async (): Promise<UnitsResult> => {
      const offset = (page - 1) * pageSize;

      let query = supabase
        .from("units")
        .select(
          "id,name,code,symbol,created_at,updated_at,created_by,updated_by,deleted_at,deleted_by",
          { count: "exact" }
        );

      if (search) {
        query = query.or(
          `name.ilike.%${search}%,code.ilike.%${search}%,symbol.ilike.%${search}%`
        );
      }

      if (!includeDeleted) {
        query = query.is("deleted_at", null);
      }

      const allowedSortBy = ["name", "code", "created_at", "updated_at"];
      const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : "created_at";

      const { data, error, count } = await query
        .order(safeSortBy, { ascending: sortOrder === "asc" })
        .range(offset, offset + pageSize - 1);

      if (error) {
        throw new Error(`Error fetching units: ${error.message}`);
      }

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        data: (data ?? []) as Unit[],
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

export const useUnit = (id: string) => {
  return useQuery({
    queryKey: ["units", id],
    queryFn: async (): Promise<Unit> => {
      const { data, error } = await supabase
        .from("units")
        .select(
          "id,name,code,symbol,created_at,updated_at,created_by,updated_by,deleted_at,deleted_by"
        )
        .eq("id", id)
        .single();

      if (error) {
        throw new Error(`Error fetching unit: ${error.message}`);
      }

      return data as Unit;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useCreateUnit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateUnitInput) => {
      const { data, error } = await supabase
        .from("units")
        .insert([
          {
            name: input.name,
            code: input.code,
            symbol: input.symbol ?? null,
          },
        ])
        .select(
          "id,name,code,symbol,created_at,updated_at,created_by,updated_by,deleted_at,deleted_by"
        )
        .single();

      if (error) {
        throw new Error(`Error creating unit: ${error.message}`);
      }
      return data as Unit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
    },
  });
};

export const useUpdateUnit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateUnitInput }) => {
      const { data, error } = await supabase
        .from("units")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select(
          "id,name,code,symbol,created_at,updated_at,created_by,updated_by,deleted_at,deleted_by"
        )
        .single();

      if (error) {
        throw new Error(`Error updating unit: ${error.message}`);
      }
      return data as Unit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
    },
  });
};

export const useDeleteUnit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("units")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)
        .select(
          "id,name,code,symbol,created_at,updated_at,created_by,updated_by,deleted_at,deleted_by"
        )
        .single();

      if (error) {
        throw new Error(`Error deleting unit: ${error.message}`);
      }
      return data as Unit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
    },
  });
};

export const useRestoreUnit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("units")
        .update({ deleted_at: null, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select(
          "id,name,code,symbol,created_at,updated_at,created_by,updated_by,deleted_at,deleted_by"
        )
        .single();

      if (error) {
        throw new Error(`Error restoring unit: ${error.message}`);
      }
      return data as Unit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
    },
  });
};

export interface UnitUsageDetails {
  usage_type: string;
  count: number;
  details: any;
}

/**
 * Hook para verificar si una unidad está en uso antes de eliminarla
 */
export const useCheckUnitUsage = () => {
  return useMutation({
    mutationFn: async (unitId: string): Promise<UnitUsageDetails[]> => {
      const { data, error } = await supabase.rpc('get_unit_usage_details', {
        unit_id_param: unitId
      });

      if (error) {
        throw new Error(`Error checking unit usage: ${error.message}`);
      }

      return data || [];
    },
  });
};

/**
 * Hook mejorado para eliminar unidades con validación de uso
 */
export const useDeleteUnitWithValidation = () => {
  const queryClient = useQueryClient();
  const checkUsage = useCheckUnitUsage();

  return useMutation({
    mutationFn: async (unit: Unit) => {
      // Primero verificar si la unidad está en uso
      const usageDetails = await checkUsage.mutateAsync(unit.id);
      
      if (usageDetails.length > 0) {
        // Construir mensaje de error detallado
        let errorMessage = `No se puede eliminar la unidad "${unit.name}" porque está siendo utilizada:\n\n`;
        
        usageDetails.forEach(usage => {
          if (usage.usage_type === 'product_attributes') {
            errorMessage += `• En ${usage.count} producto(s)\n`;
          } else if (usage.usage_type === 'attribute_units') {
            errorMessage += `• Asociada a ${usage.count} atributo(s)\n`;
          }
        });
        
        errorMessage += '\nPara eliminar esta unidad, primero debe:\n';
        errorMessage += '1. Cambiar la unidad en todos los productos que la usan\n';
        errorMessage += '2. Desasociarla de todos los atributos';
        
        throw new Error(errorMessage);
      }

      // Si no está en uso, proceder con la eliminación
      const { data, error } = await supabase
        .from("units")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", unit.id)
        .select(
          "id,name,code,symbol,created_at,updated_at,created_by,updated_by,deleted_at,deleted_by"
        )
        .single();

      if (error) {
        throw new Error(`Error deleting unit: ${error.message}`);
      }
      return data as Unit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
    },
  });
};