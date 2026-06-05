/**
 * Hooks para las tarjetas de categorías del Home (tabla public.category_cards).
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/app/libs/supabase";

export interface CategoryCard {
  id: string;
  name: string;
  image_url: string;
  alt_text: string | null;
  href: string | null;
  sort_order: number;
  is_active: boolean;
}

export type CategoryCardInput = Partial<CategoryCard> & {
  name: string;
  image_url: string;
};

const KEY = ["category_cards"];

export const useCategoryCards = () =>
  useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<CategoryCard[]> => {
      const { data, error } = await supabase
        .from("category_cards")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as CategoryCard[];
    },
  });

export const useSaveCategoryCard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (card: CategoryCardInput) => {
      const { id, ...values } = card;
      const payload = { ...values, updated_at: new Date().toISOString() };
      const { error } = id
        ? await supabase.from("category_cards").update(payload).eq("id", id)
        : await supabase.from("category_cards").insert(payload);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useDeleteCategoryCard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("category_cards").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};
