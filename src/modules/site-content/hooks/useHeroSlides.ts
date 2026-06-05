/**
 * Hooks para el carrusel principal del Home (tabla public.hero_slides).
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/app/libs/supabase";

export interface HeroSlide {
  id: string;
  image_url: string;
  title: string | null;
  subtitle: string | null;
  alt: string | null;
  sort_order: number;
  is_active: boolean;
}

export type HeroSlideInput = Partial<HeroSlide> & { image_url: string };

const KEY = ["hero_slides"];

export const useHeroSlides = () =>
  useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<HeroSlide[]> => {
      const { data, error } = await supabase
        .from("hero_slides")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as HeroSlide[];
    },
  });

export const useSaveHeroSlide = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slide: HeroSlideInput) => {
      const { id, ...values } = slide;
      const payload = { ...values, updated_at: new Date().toISOString() };
      const { error } = id
        ? await supabase.from("hero_slides").update(payload).eq("id", id)
        : await supabase.from("hero_slides").insert(payload);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useDeleteHeroSlide = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hero_slides").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};
