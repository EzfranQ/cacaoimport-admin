/**
 * Hooks para gestionar la relación producto-atributos (tabla product_attributes)
 * Incluye consulta y upsert (insertar/restaurar/soft-delete diferencias).
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/app/libs/supabase";

interface ProductAttributesResult {
  attributeIds: string[];
  values: Record<string, string | null>;
  units: Record<string, string | null>;
}

/**
 * Información de una unidad vinculada a un atributo, incluyendo si es default.
 */
interface AttributeUnit {
  unit_id: string;
  unit_name: string;
  unit_symbol: string;
  is_default?: boolean;
}

interface AttributeUnitsResult {
  data: AttributeUnit[];
  error: Error | null;
}

export const useProductAttributes = (productId: string) => {
  return useQuery({
    queryKey: ["product-attributes", productId],
    queryFn: async (): Promise<ProductAttributesResult> => {
      // Consultamos directamente la tabla product_attributes para incluir
      // atributos aunque no tengan unidad seleccionada.
      const { data, error } = await supabase
        .from("product_attributes")
        .select("product_id,attribute_id,value,unit_id")
        .eq("product_id", productId);

      if (error) throw error;

      // Evita IDs duplicados
      const attributeIds = Array.from(new Set(data.map((pa) => pa.attribute_id)));
      const values = data.reduce(
        (acc, pa) => ({ ...acc, [pa.attribute_id]: pa.value }),
        {}
      );
      const units = data.reduce(
        (acc, pa) => ({ ...acc, [pa.attribute_id]: pa.unit_id ?? null }),
        {}
      );

      return {
        attributeIds,
        values,
        units,
      };
    },
    enabled: Boolean(productId),
    // Asegura que siempre se revalide al montar para evitar ver datos en caché
    staleTime: 0,
    refetchOnMount: "always",
  });
};

export const useUpsertProductAttributes = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      productId,
      attributes,
    }: {
      productId: string;
      attributes: Array<{
        id: string;
        value: string | null;
        unit_id: string | null;
      }>;
    }) => {
      // Primero eliminar todos los atributos existentes
      const { error: deleteError } = await supabase
        .from("product_attributes")
        .delete()
        .eq("product_id", productId);

      if (deleteError) throw deleteError;

      // Luego insertar los nuevos
      if (attributes.length === 0) return;

      const { error: insertError } = await supabase
        .from("product_attributes")
        .insert(
          attributes.map((attr) => ({
            product_id: productId,
            attribute_id: attr.id,
            value: attr.value,
            unit_id: attr.unit_id,
          }))
        );

      if (insertError) throw insertError;
    },
    onSuccess: (_data, variables) => {
      // Invalida las queries relacionadas para que al reabrir el formulario
      // se vean inmediatamente los valores actualizados.
      if (variables?.productId) {
        queryClient.invalidateQueries({ queryKey: ["product-attributes", variables.productId] });
      }
      // Prefijo: invalida todas las queries batch de unidades (por atributo)
      queryClient.invalidateQueries({ queryKey: ["attribute-units-batch"] });
    },
  });
};

export const useAttributeUnits = (attributeId: string) => {
  return useQuery<AttributeUnitsResult>({
    queryKey: ["attribute-units", attributeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attribute_units")
        .select(`
          unit_id,
          is_default,
          units (
            name,
            symbol
          )
        `)
        .eq("attribute_id", attributeId)
        .is("deleted_at", null);

      if (error) throw error;

      return {
        data: data.map((au) => {
          // Supabase puede devolver relaciones anidadas como objeto o como array según cómo esté definida la FK.
          // Aquí normalizamos para manejar ambos casos.
          const units = Array.isArray(au.units) ? au.units[0] : au.units;
          const unitSafe = (units ?? {}) as { name?: string; symbol?: string };

        return {
          unit_id: au.unit_id,
          unit_name: unitSafe.name ?? "",
          unit_symbol: unitSafe.symbol ?? "",
          is_default: !!au.is_default,
        };
      }),
      error: null,
    };
    },
    enabled: Boolean(attributeId),
  });
};

// Batch query de unidades por múltiples atributos para evitar romper las reglas de hooks
export const useAttributeUnitsBatch = (attributeIds: string[]) => {
  return useQuery<{ [attributeId: string]: AttributeUnit[] }>({
    queryKey: ["attribute-units-batch", [...attributeIds].sort()],
    enabled: Array.isArray(attributeIds) && attributeIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attribute_units")
        .select(`
          attribute_id,
          unit_id,
          is_default,
          units (
            name,
            symbol
          )
        `)
        .in("attribute_id", attributeIds)
        .is("deleted_at", null);

      if (error) throw error;

      const result: Record<string, AttributeUnit[]> = {};
      (data ?? []).forEach((au: any) => {
        const units = Array.isArray(au.units) ? au.units[0] : au.units;
        const unitSafe = (units ?? {}) as { name?: string; symbol?: string };
        const item: AttributeUnit = {
          unit_id: au.unit_id,
          unit_name: unitSafe.name ?? "",
          unit_symbol: unitSafe.symbol ?? "",
          is_default: !!au.is_default,
        };
        if (!result[au.attribute_id]) result[au.attribute_id] = [];
        result[au.attribute_id].push(item);
      });

      return result;
    },
  });
};
