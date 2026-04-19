import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Category {
  id: string;
  slug: string;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
}

export interface FestivalEvent {
  id: string;
  title: string;
  description: string;
  time: string;
  location: string;
  category_slug: string;
  icon: string;
  pin_x: number;
  pin_y: number;
  sort_order: number;
  image_url: string | null;
}

export const useCategories = () =>
  useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useEvents = () =>
  useQuery({
    queryKey: ["events"],
    queryFn: async (): Promise<FestivalEvent[]> => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((e) => ({
        ...e,
        pin_x: Number(e.pin_x),
        pin_y: Number(e.pin_y),
      }));
    },
  });

export const useMapSettings = () =>
  useQuery({
    queryKey: ["map_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("map_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
