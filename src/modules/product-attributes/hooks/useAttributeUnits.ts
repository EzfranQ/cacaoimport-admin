/**
 * Hooks de TanStack Query para gestionar la relación Atributo ↔ Unidades (tabla puente attribute_units)
 *
 * - useAttributeUnits(attributeId): Obtiene los unit_ids actualmente activos vinculados a un atributo.
 * - useUpsertAttributeUnits(): Recibe { attributeId, unitIds } y sincroniza la tabla puente:
 *   - Inserta los vínculos nuevos
 *   - "Resucita" vínculos soft-deleted (deleted_at != null) poniéndolos nuevamente activos
 *   - Soft-delete los vínculos que ya no estén seleccionados
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/app/libs/supabase";

/**
 * Estructura de retorno para unidades vinculadas a un atributo.
 * - unitIds: IDs de unidades activas vinculadas al atributo.
 * - defaultUnitId: ID de la unidad marcada como default (si existe).
 */
export interface AttributeUnitsResult {
  unitIds: string[];
  defaultUnitId?: string | null;
}

/**
 * Obtiene los unit_ids activos (deleted_at IS NULL) para un atributo dado.
 */
export const useAttributeUnits = (attributeId: string) => {
  return useQuery<AttributeUnitsResult>({
    queryKey: ["attribute_units", attributeId],
    queryFn: async () => {
      if (!attributeId) return { unitIds: [] };

      const { data, error } = await supabase
        .from("attribute_units")
        .select("unit_id, deleted_at, is_default")
        .eq("attribute_id", attributeId);

      if (error) {
        throw new Error(`Error fetching attribute units: ${error.message}`);
      }

      const activeRows = (data ?? []).filter((row: any) => row.deleted_at === null);
      const unitIds = activeRows.map((row: any) => row.unit_id as string);
      const defaultRow = activeRows.find((row: any) => row.is_default === true);
      const defaultUnitId = defaultRow ? (defaultRow.unit_id as string) : null;

      return { unitIds, defaultUnitId };
    },
    enabled: !!attributeId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export interface UpsertAttributeUnitsInput {
  attributeId: string;
  unitIds: string[];
  defaultUnitId?: string | null;
}

/**
 * Sincroniza la relación attribute_units con el conjunto de unitIds entregado.
 * - Agrega nuevas relaciones
 * - "Resucita" relaciones soft-deleted
 * - Soft-delete relaciones que sobran
 */
export const useUpsertAttributeUnits = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ attributeId, unitIds, defaultUnitId }: UpsertAttributeUnitsInput) => {
      if (!attributeId) throw new Error("attributeId es requerido");

      // 1) Obtener relaciones actuales (tanto activas como soft-deleted)
      const { data: existingRows, error: fetchError } = await supabase
        .from("attribute_units")
        .select("id, unit_id, deleted_at, is_default")
        .eq("attribute_id", attributeId);

      if (fetchError) {
        throw new Error(`Error fetching current attribute_units: ${fetchError.message}`);
      }

      const activeUnitIds = new Set(
        (existingRows ?? [])
          .filter((r: any) => r.deleted_at === null)
          .map((r: any) => r.unit_id as string)
      );

      const desiredUnitIds = new Set(unitIds);

      // 2) Calcular diferencias
      const toAdd: string[] = Array.from(desiredUnitIds).filter((id) => !activeUnitIds.has(id));
      const toRemove: string[] = Array.from(activeUnitIds).filter((id) => !desiredUnitIds.has(id));

      // 3) Resucitar los que existan soft-deleted y estén en toAdd
      if (toAdd.length > 0) {
        const { data: existingToAdd, error: fetchExistingToAddError } = await supabase
          .from("attribute_units")
          .select("id, unit_id, deleted_at, is_default")
          .eq("attribute_id", attributeId)
          .in("unit_id", toAdd);

        if (fetchExistingToAddError) {
          throw new Error(`Error checking existing attribute_units: ${fetchExistingToAddError.message}`);
        }

        const resurrectIds = (existingToAdd ?? [])
          .filter((r: any) => r.deleted_at !== null)
          .map((r: any) => r.unit_id as string);

        if (resurrectIds.length > 0) {
          const { error: resurrectError } = await supabase
            .from("attribute_units")
            .update({ deleted_at: null, updated_at: new Date().toISOString() })
            .eq("attribute_id", attributeId)
            .in("unit_id", resurrectIds);

          if (resurrectError) {
            throw new Error(`Error resurrecting attribute_units: ${resurrectError.message}`);
          }
        }

        const missingIds = toAdd.filter(
          (id) => !(existingToAdd ?? []).some((r: any) => r.unit_id === id)
        );

        if (missingIds.length > 0) {
          const rowsToInsert = missingIds.map((unit_id) => ({
            attribute_id: attributeId,
            unit_id,
            created_at: new Date().toISOString(),
            is_default: defaultUnitId === unit_id ? true : false,
          }));

          const { error: insertError } = await supabase
            .from("attribute_units")
            .insert(rowsToInsert);

          if (insertError) {
            throw new Error(`Error inserting attribute_units: ${insertError.message}`);
          }
        }
      }

      // 4) Soft-delete los vínculos que ya no estén seleccionados
      if (toRemove.length > 0) {
        const { error: removeError } = await supabase
          .from("attribute_units")
          .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("attribute_id", attributeId)
          .in("unit_id", toRemove)
          .is("deleted_at", null);

        if (removeError) {
          throw new Error(`Error soft-deleting attribute_units: ${removeError.message}`);
        }
      }

      // 5) Asegurar una sola unidad por defecto: poner todas en false y marcar solo la elegida si sigue activa
      // Primero, desmarcar todos los vínculos activos
      const { error: clearDefaultError } = await supabase
        .from("attribute_units")
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq("attribute_id", attributeId)
        .is("deleted_at", null);

      if (clearDefaultError) {
        throw new Error(`Error clearing defaults in attribute_units: ${clearDefaultError.message}`);
      }

      // Luego, marcar la unidad seleccionada como default si existe entre las activas
      if (defaultUnitId) {
        const { error: setDefaultError } = await supabase
          .from("attribute_units")
          .update({ is_default: true, updated_at: new Date().toISOString() })
          .eq("attribute_id", attributeId)
          .eq("unit_id", defaultUnitId)
          .is("deleted_at", null);

        if (setDefaultError) {
          throw new Error(`Error setting default in attribute_units: ${setDefaultError.message}`);
        }
      }

      return { attributeId, unitIds };
    },
    onSuccess: (_result, variables) => {
      // Refrescar lista de vínculos del atributo
      queryClient.invalidateQueries({ queryKey: ["attribute_units", variables.attributeId] });
    },
  });
};
