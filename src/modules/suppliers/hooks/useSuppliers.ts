/**
 * Hooks de TanStack Query para el maestro de Proveedores
 * CRUD completo con Supabase y soporte de soft delete.
 *
 * Campos: id, business_name, contact_name, phone, email, address, notes, timestamps.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/app/libs/supabase";

export interface Supplier {
  id: string;
  business_name: string;
  contact_name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface CreateSupplierInput {
  business_name: string;
  contact_name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface UpdateSupplierInput {
  business_name?: string;
  contact_name?: string;
  phone?: string;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  is_active?: boolean;
  deleted_at?: string | null;
}

export interface SuppliersQueryParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  includeDeleted?: boolean;
  isActive?: boolean;
}

export interface SuppliersResult {
  data: Supplier[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Hook para obtener la lista de proveedores con paginación y filtros
 */
export const useSuppliers = (params: SuppliersQueryParams = {}) => {
  const {
    page = 1,
    pageSize = 10,
    sortBy = "business_name",
    sortOrder = "asc",
    search = "",
    includeDeleted = false,
    isActive = true,
  } = params;

  return useQuery({
    queryKey: ["suppliers", { page, pageSize, sortBy, sortOrder, search, includeDeleted, isActive }],
    queryFn: async (): Promise<SuppliersResult> => {
      let query = supabase
        .from("suppliers")
        .select(
          "id,business_name,contact_name,phone,email,address,notes,is_active,created_at,updated_at,created_by,updated_by,deleted_at,deleted_by",
          { count: "exact" }
        );

      // Filtro de soft delete
      if (!includeDeleted) {
        query = query.is("deleted_at", null);
      }

      // Filtro de activos/inactivos
      if (isActive !== undefined) {
        query = query.eq("is_active", isActive);
      }

      // Búsqueda por texto
      if (search.trim()) {
        query = query.or(
          `business_name.ilike.%${search}%,contact_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`
        );
      }

      // Ordenamiento
      query = query.order(sortBy, { ascending: sortOrder === "asc" });

      // Paginación
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Error fetching suppliers: ${error.message}`);
      }

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        data: (data as Supplier[]) || [],
        totalCount,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    },
  });
};

/**
 * Hook para obtener un proveedor por ID
 */
export const useSupplier = (id: string) => {
  return useQuery({
    queryKey: ["supplier", id],
    queryFn: async (): Promise<Supplier> => {
      const { data, error } = await supabase
        .from("suppliers")
        .select(
          "id,business_name,contact_name,phone,email,address,notes,is_active,created_at,updated_at,created_by,updated_by,deleted_at,deleted_by"
        )
        .eq("id", id)
        .single();

      if (error) {
        throw new Error(`Error fetching supplier: ${error.message}`);
      }

      return data as Supplier;
    },
    enabled: !!id,
  });
};

/**
 * Hook para crear un nuevo proveedor
 */
export const useCreateSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSupplierInput) => {
      const { data, error } = await supabase
        .from("suppliers")
        .insert([
          {
            business_name: input.business_name,
            contact_name: input.contact_name,
            phone: input.phone,
            email: input.email ?? null,
            address: input.address ?? null,
            notes: input.notes ?? null,
          },
        ])
        .select(
          "id,business_name,contact_name,phone,email,address,notes,is_active,created_at,updated_at,created_by,updated_by,deleted_at,deleted_by"
        )
        .single();

      if (error) {
        throw new Error(`Error creating supplier: ${error.message}`);
      }
      return data as Supplier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
};

/**
 * Hook para obtener lista simple de proveedores activos (para selects)
 */
export const useActiveSuppliersForSelect = () => {
  return useQuery({
    queryKey: ["suppliers", "active-select"],
    queryFn: async (): Promise<Pick<Supplier, 'id' | 'business_name'>[]> => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id,business_name")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("business_name", { ascending: true });

      if (error) {
        throw new Error(`Error fetching active suppliers: ${error.message}`);
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
};

/**
 * Hook para actualizar un proveedor existente
 */
export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateSupplierInput }) => {
      const { data, error } = await supabase
        .from("suppliers")
        .update({
          business_name: input.business_name,
          contact_name: input.contact_name,
          phone: input.phone,
          email: input.email,
          address: input.address,
          notes: input.notes,
          is_active: input.is_active,
          deleted_at: input.deleted_at,
        })
        .eq("id", id)
        .select(
          "id,business_name,contact_name,phone,email,address,notes,is_active,created_at,updated_at,created_by,updated_by,deleted_at,deleted_by"
        )
        .single();

      if (error) {
        throw new Error(`Error updating supplier: ${error.message}`);
      }
      return data as Supplier;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["supplier", data.id] });
    },
  });
};

/**
 * Hook para eliminar un proveedor (soft delete)
 */
export const useDeleteSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("suppliers")
        .update({
          deleted_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select(
          "id,business_name,contact_name,phone,email,address,notes,is_active,created_at,updated_at,created_by,updated_by,deleted_at,deleted_by"
        )
        .single();

      if (error) {
        throw new Error(`Error deleting supplier: ${error.message}`);
      }
      return data as Supplier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
};

/**
 * Hook para restaurar un proveedor eliminado
 */
export const useRestoreSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("suppliers")
        .update({
          deleted_at: null,
        })
        .eq("id", id)
        .select(
          "id,business_name,contact_name,phone,email,address,notes,is_active,created_at,updated_at,created_by,updated_by,deleted_at,deleted_by"
        )
        .single();

      if (error) {
        throw new Error(`Error restoring supplier: ${error.message}`);
      }
      return data as Supplier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
};