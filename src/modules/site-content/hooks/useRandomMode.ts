/**
 * Modo aleatorio para "Productos destacados" y "Nuevos Ingresos".
 * Se guarda en site_settings:
 *   - key "featured_random"     → boolean
 *   - key "new_arrivals_random" → boolean
 * Si está en true, el front muestra productos al azar e ignora la selección manual.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/app/libs/supabase";

export type RandomModeKey = "featured_random" | "new_arrivals_random";

export const useRandomMode = (key: RandomModeKey) =>
  useQuery({
    queryKey: ["site_settings", key],
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data?.value === true;
    },
  });

export const useSetRandomMode = (key: RandomModeKey) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (value: boolean) => {
      const { error } = await supabase
        .from("site_settings")
        .upsert(
          { key, value, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site_settings", key] }),
  });
};
