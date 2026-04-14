import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/app/libs/supabase";

export interface Profile {
  id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone?: string;
  bio?: string;
  created_at?: string;
}

export const useUsers = () => {
  return useQuery({
    queryKey: ["users-filtered"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, phone, bio, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }
      return data as Profile[];
    },
  });
};
