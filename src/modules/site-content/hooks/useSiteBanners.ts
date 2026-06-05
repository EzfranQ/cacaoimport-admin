/**
 * Hooks para los banners del sitio (tabla public.site_banners), uno por "slot".
 * Slots usados en el Home: "new_products" y "home_bottom".
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/app/libs/supabase";

export interface SiteBanner {
  id: string;
  slot: string;
  desktop_url: string | null;
  mobile_url: string | null;
  alt: string | null;
  link: string | null;
}

export type SiteBannerInput = {
  slot: string;
  desktop_url?: string | null;
  mobile_url?: string | null;
  alt?: string | null;
  link?: string | null;
};

const KEY = ["site_banners"];

export const useSiteBanners = () =>
  useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<SiteBanner[]> => {
      const { data, error } = await supabase
        .from("site_banners")
        .select("*")
        .order("slot", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as SiteBanner[];
    },
  });

export const useSaveBanner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (banner: SiteBannerInput) => {
      const payload = { ...banner, updated_at: new Date().toISOString() };
      const { error } = await supabase
        .from("site_banners")
        .upsert(payload, { onConflict: "slot" });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};
