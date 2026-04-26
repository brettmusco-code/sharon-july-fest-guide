import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Reads admin-controlled public values from app_config.
 * Currently exposes: fireworks_at (countdown + Live Activity target).
 */
export function usePublicConfig() {
  return useQuery({
    queryKey: ["public-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_config")
        .select("key, value")
        .eq("key", "fireworks_at");
      if (error) throw error;
      const map = new Map((data ?? []).map((r) => [r.key, r.value]));
      return {
        fireworks_at: map.get("fireworks_at") ?? null,
      };
    },
    staleTime: 60_000,
  });
}
