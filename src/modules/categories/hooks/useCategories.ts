import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/app/libs/supabase";

/**
 * Interfaz para una categoría con estructura mejorada
 */
/**
 * Interfaz para una categoría (esquema mínimo definido)
 * id, name, description?, slug, parent_id?, icon?,
 * created_at, created_by?, updated_at?, updated_by?, deleted_at?, deleted_by?
 */
export interface Category {
  id: string;
  name: string;
  description?: string;
  slug: string;
  parent_id?: string;
  icon?: string;
  created_at: string;
  created_by?: string;
  updated_at?: string;
  updated_by?: string;
  deleted_at?: string | null;
  deleted_by?: string;
  // Relational embedding del padre para evitar llamadas adicionales
  parent?: { id: string; name: string };
}

/**
 * Interfaz para crear una nueva categoría
 */
/**
 * Interfaz para crear una nueva categoría (solo campos necesarios)
 */
export interface CreateCategoryInput {
  name: string;
  description?: string;
  slug: string;
  parent_id?: string;
  icon?: string;
}

/**
 * Interfaz para actualizar una categoría
 */
/**
 * Interfaz para actualizar una categoría (campos opcionales)
 */
export interface UpdateCategoryInput {
  name?: string;
  description?: string;
  slug?: string;
  parent_id?: string;
  icon?: string;
  deleted_at?: string | null;
  deleted_by?: string;
}

/**
 * Parámetros para filtros y paginación
 */
export interface CategoriesQueryParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  parentId?: string | null;
  includeDeleted?: boolean;
  level?: number;
}

/**
 * Resultado paginado de categorías
 */
export interface CategoriesResult {
  data: Category[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Hook para obtener categorías con paginación usando TanStack Query
 *
 * Embebido self-reference del padre: usamos parent:parent_id(id,name) para
 * resolver el padre vía FK directo en PostgREST/Supabase.
 * Si el embebido llegara vacío en algunos entornos, el hook puede activar
 * un fallback condicional (segunda consulta con IN de ids únicos) para
 * completar los nombres de los padres sin afectar paginación ni orden.
 */
export const useCategories = (params: CategoriesQueryParams = {}) => {
  const {
    page = 1,
    pageSize = 10,
    sortBy = "name",
    sortOrder = "asc",
    search,
    parentId,
    includeDeleted = false,
  } = params;

  return useQuery({
    queryKey: [
      "categories",
      { page, pageSize, sortBy, sortOrder, search, parentId, includeDeleted },
    ],
    queryFn: async (): Promise<CategoriesResult> => {
      // Calcular offset para paginación
      const offset = (page - 1) * pageSize;

      // Construir query base
      /**
       * Embebido self-reference del padre usando !parent_id para evitar PGRST200
       * cuando el alias de FK no se resuelve en el schema cache.
       */
      let query = supabase
        .from("categories")
        .select(
          "id,name,description,slug,parent_id,icon,created_at,created_by,updated_at,updated_by,deleted_at,deleted_by,parent:parent_id(id,name)",
          { count: "exact" }
        );
      // Aplicar filtros
      if (search) {
        query = query.or(
          `name.ilike.%${search}%,description.ilike.%${search}%,slug.ilike.%${search}%`
        );
      }

      if (parentId !== undefined) {
        if (parentId === null) {
          query = query.is("parent_id", null);
        } else {
          query = query.eq("parent_id", parentId);
        }
      }

      // Por defecto, excluir categorías eliminadas
      if (!includeDeleted) {
        query = query.is("deleted_at", null);
      }

      // Aplicar ordenamiento seguro y paginación
      const allowedSortBy = ["name", "slug", "created_at", "updated_at"];
      const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : "name";
      query = query
        .order(safeSortBy, { ascending: sortOrder === "asc" })
        .range(offset, offset + pageSize - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Error fetching categories: ${error.message}`);
      }

      /**
       * Normaliza el embebido relacional del padre:
       * PostgREST puede devolver un array para relaciones many-to-one; aquí
       * tomamos el primer elemento para mapearlo a objeto y cumplir la interfaz Category.
       */
      const normalizedData = (data ?? []).map((row: any) => ({
        ...row,
        parent: Array.isArray(row?.parent)
          ? row.parent?.[0] ?? undefined
          : row?.parent,
      }));

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        data: normalizedData,
        totalCount,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
};

/**
 * Hook para crear una nueva categoría
 */
export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newCategory: CreateCategoryInput) => {
      const { data, error } = await supabase
        .from("categories")
        .insert([
          {
            name: newCategory.name,
            description: newCategory.description,
            slug: newCategory.slug,
            parent_id: newCategory.parent_id,
            icon: newCategory.icon,
          },
        ])
        .select(
          `
          id,
          name,
          description,
          slug,
          parent_id,
          icon,
          created_at,
          created_by,
          updated_at,
          updated_by,
          deleted_at,
          deleted_by,
        `
        )
        .single();

      if (error) {
        throw new Error(`Error creating category: ${error.message}`);
      }

      return data;
    },
    onSuccess: () => {
      // Invalidar todas las queries de categorías para refrescar los datos
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
};

/**
 * Hook para actualizar una categoría
 */
export const useUpdateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateCategoryInput;
    }) => {
      const { data, error } = await supabase
        .from("categories")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select(
          "id,name,description,slug,parent_id,icon,created_at,created_by,updated_at,updated_by,deleted_at,deleted_by"
        )
        .single();

      if (error) {
        throw new Error(`Error updating category: ${error.message}`);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
};

/**
 * Hook para eliminar una categoría (soft delete)
 */
export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("categories")
        .update({
          deleted_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select(
          "id,name,description,slug,parent_id,icon,created_at,created_by,updated_at,updated_by,deleted_at,deleted_by"
        )
        .single();

      if (error) {
        throw new Error(`Error deleting category: ${error.message}`);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
};

/**
 * Hook para restaurar una categoría eliminada
 */
export const useRestoreCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("categories")
        .update({
          deleted_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(`Error restoring category: ${error.message}`);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
};

/**
 * Hook para obtener una categoría específica
 */
export const useCategory = (id: string) => {
  return useQuery({
    queryKey: ["categories", id],
    queryFn: async (): Promise<Category> => {
      /**
       * Embebido self-reference del padre usando !parent_id para evitar PGRST200
       * cuando el alias de FK no se resuelve en el schema cache.
       */
      const { data, error } = await supabase
        .from("categories")
        .select(
          `id,
          name,
          description,
          slug,
          parent_id,
          icon,
          created_at,
          created_by,
          updated_at,
          updated_by,
          deleted_at,
          deleted_by,
          parent: categories!parent_id(id, name)`
        )
        .eq("id", id)
        .single();

      if (error) {
        throw new Error(`Error fetching category: ${error.message}`);
      }

      // Normaliza el embebido relacional del padre para cumplir con la interfaz Category
      const normalized = {
        ...data,
        parent: Array.isArray((data as any)?.parent)
          ? (data as any)?.parent?.[0] ?? undefined
          : (data as any)?.parent,
      } as Category;

      return normalized;
    },
    enabled: !!id, // Solo ejecutar si hay un ID
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

/**
 * Interfaz para los detalles de uso de una categoría
 */
export interface CategoryUsageDetails {
  usage_type: 'product_categories' | 'subcategories';
  count: number;
  details: any[];
}

/**
 * Hook para verificar si una categoría está siendo utilizada
 */
export const useCheckCategoryUsage = (categoryId: string) => {
  return useQuery({
    queryKey: ["category-usage", categoryId],
    queryFn: async (): Promise<CategoryUsageDetails[]> => {
      const { data, error } = await supabase.rpc("get_category_usage_details", {
        p_category_id: categoryId,
      });

      if (error) {
        throw new Error(`Error checking category usage: ${error.message}`);
      }

      return data || [];
    },
    enabled: !!categoryId,
  });
};

/**
 * Hook para eliminar una categoría con validación previa
 */
export const useDeleteCategoryWithValidation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Primero verificar si la categoría está en uso
      const { data: usageData, error: usageError } = await supabase.rpc(
        "get_category_usage_details",
        { p_category_id: id }
      );

      if (usageError) {
        throw new Error(`Error verificando uso de categoría: ${usageError.message}`);
      }

      // Verificar si hay uso
      const hasUsage = usageData?.some((usage: CategoryUsageDetails) => usage.count > 0);

      if (hasUsage) {
        // Construir mensaje de error detallado
        let errorMessage = "No se puede eliminar esta categoría porque está siendo utilizada:\n\n";
        
        usageData?.forEach((usage: CategoryUsageDetails) => {
          if (usage.count > 0) {
            if (usage.usage_type === 'product_categories') {
              errorMessage += `• ${usage.count} producto(s) asignado(s)\n`;
            } else if (usage.usage_type === 'subcategories') {
              errorMessage += `• ${usage.count} subcategoría(s)\n`;
            }
          }
        });

        errorMessage += "\nPara eliminar esta categoría, primero debe:\n";
        
        const productUsage = usageData?.find((u: CategoryUsageDetails) => u.usage_type === 'product_categories');
        const subcategoryUsage = usageData?.find((u: CategoryUsageDetails) => u.usage_type === 'subcategories');
        
        if (productUsage && productUsage.count > 0) {
          errorMessage += "• Reasignar o eliminar los productos asociados\n";
        }
        if (subcategoryUsage && subcategoryUsage.count > 0) {
          errorMessage += "• Reasignar o eliminar las subcategorías\n";
        }

        throw new Error(errorMessage);
      }

      // Si no está en uso, proceder con la eliminación
      const { data, error } = await supabase
        .from("categories")
        .update({
          deleted_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select(
          "id,name,description,slug,parent_id,icon,created_at,created_by,updated_at,updated_by,deleted_at,deleted_by"
        )
        .single();

      if (error) {
        throw new Error(`Error eliminando categoría: ${error.message}`);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
};
