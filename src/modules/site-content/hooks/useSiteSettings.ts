/**
 * Hooks para configuración general del sitio (tabla public.site_settings).
 * Cada fila es un par key/value (JSONB). Usado p. ej. para el logo.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/app/libs/supabase";

export interface LogoSetting {
  url: string;
  alt?: string;
}

export const useSiteSetting = <T = any>(key: string) =>
  useQuery({
    queryKey: ["site_settings", key],
    queryFn: async (): Promise<T | null> => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data?.value ?? null) as T | null;
    },
  });

export const useUpsertSiteSetting = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase
        .from("site_settings")
        .upsert(
          { key, value, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ["site_settings", vars.key] }),
  });
};
