/**
 * Hooks de TanStack Query para el maestro de Productos
 * CRUD completo con Supabase y soporte de soft delete.
 *
 * Campos: id, name, product_id (auto-relación nullable), description, price, timestamps.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/app/libs/supabase";

export interface Product {
  id: string;
  name: string;
  sku?: string | null;
  product_id?: string | null;
  description?: string | null;
  price: number;
  supplier_id?: string | null;
  supplier_name?: string | null;
  created_at: string;
  updated_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
  qty_box?: number | null;
}

export interface CreateProductInput {
  name: string;
  sku?: string | null;
  product_id?: string | null;
  description?: string | null;
  price: number;
  supplier_id?: string | null;
  qty_box?: number | null;
}

export interface UpdateProductInput {
  name?: string;
  sku?: string | null;
  product_id?: string | null;
  description?: string | null;
  price?: number;
  supplier_id?: string | null;
  deleted_at?: string | null;
  qty_box?: number | null;
}

export interface ProductsQueryParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  supplierSearch?: string;
  includeDeleted?: boolean;
}

export interface ProductsResult {
  data: Product[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export const useProducts = (params: ProductsQueryParams = {}) => {
  const {
    page = 1,
    pageSize = 10,
    sortBy = "created_at",
    sortOrder = "desc",
    search,
    supplierSearch,
    includeDeleted = false,
  } = params;

  return useQuery({
    queryKey: [
      "products",
      { page, pageSize, sortBy, sortOrder, search, supplierSearch, includeDeleted },
    ],
    queryFn: async (): Promise<ProductsResult> => {
      const offset = (page - 1) * pageSize;

      let query = supabase
        .from("products")
        .select(
          `id,name,sku,product_id,description,price,supplier_id,qty_box,created_at,updated_at,created_by,updated_by,deleted_at,deleted_by,
          suppliers!left(business_name)`,
          { count: "exact" }
        );

      if (search) {
        query = query.or(
          `name.ilike.%${search}%,description.ilike.%${search}%,sku.ilike.%${search}%`
        );
      }

      if (supplierSearch) {
        query = query.not("suppliers", "is", null).filter("suppliers.business_name", "ilike", `%${supplierSearch}%`);
      }

      if (!includeDeleted) {
        query = query.is("deleted_at", null);
      }

      const allowedSortBy = ["name", "price", "created_at", "updated_at"];
      const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : "created_at";

      const { data, error, count } = await query
        .order(safeSortBy, { ascending: sortOrder === "asc" })
        .range(offset, offset + pageSize - 1);

      if (error) {
        throw new Error(`Error fetching products: ${error.message}`);
      }

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / pageSize);

      // Procesar los datos para extraer el nombre del proveedor
      const processedData = (data ?? []).map((product: any) => ({
        ...product,
        supplier_name: product.suppliers?.business_name || null,
        suppliers: undefined, // Remover el objeto anidado
      })) as Product[];

      return {
        data: processedData,
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

export const useProduct = (id: string) => {
  return useQuery({
    queryKey: ["products", id],
    queryFn: async (): Promise<Product> => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id,name,sku,product_id,description,price,supplier_id,created_at,updated_at,created_by,updated_by,deleted_at,deleted_by"
        )
        .eq("id", id)
        .single();

      if (error) {
        throw new Error(`Error fetching product: ${error.message}`);
      }

      return data as Product;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProductInput) => {
      const { data, error } = await supabase
        .from("products")
        .insert([
          {
            name: input.name,
            sku: input.sku ?? null,
            product_id: input.product_id ?? null,
            description: input.description ?? null,
            price: input.price,
            supplier_id:
              input.supplier_id && input.supplier_id.trim() !== ""
                ? input.supplier_id
                : null,
            qty_box: input.qty_box ?? null,
          },
        ])
        .select(
          "id,name,sku,product_id,description,price,supplier_id,created_at,updated_at,created_by,updated_by,deleted_at,deleted_by"
        )
        .single();

      if (error) {
        throw new Error(`Error creating product: ${error.message}`);
      }
      return data as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateProductInput }) => {
      const { data, error } = await supabase
        .from("products")
        .update({
          ...updates,
          supplier_id:
            updates.supplier_id && updates.supplier_id.trim() !== ""
              ? updates.supplier_id
              : updates.supplier_id === undefined
              ? undefined
              : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select(
          "id,name,sku,product_id,description,price,supplier_id,created_at,updated_at,created_by,updated_by,deleted_at,deleted_by"
        )
        .single();

      if (error) {
        throw new Error(`Error updating product: ${error.message}`);
      }
      return data as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("products")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)
        .select(
          "id,name,product_id,description,price,created_at,updated_at,created_by,updated_by,deleted_at,deleted_by"
        )
        .single();

      if (error) {
        throw new Error(`Error deleting product: ${error.message}`);
      }
      // No retornamos la representación porque la política SELECT
      // oculta filas con deleted_at != null; invalidamos cache y listo.
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
};

export const useRestoreProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("products")
        .update({ deleted_at: null })
        .eq("id", id)
        .select(
          "id,name,product_id,description,price,created_at,updated_at,created_by,updated_by,deleted_at,deleted_by"
        )
        .single();

      if (error) {
        throw new Error(`Error restoring product: ${error.message}`);
      }
      return data as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
};
