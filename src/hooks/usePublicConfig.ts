import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Reads admin-controlled public values from app_config.
 * Currently exposes:
 *  - fireworks_at: ISO timestamp (countdown + Live Activity target)
 *  - photo_drive_folder_id: Google Drive folder where photo submissions go
 */
export function usePublicConfig() {
  return useQuery({
    queryKey: ["public-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_config")
        .select("key, value")
        .in("key", ["fireworks_at", "photo_drive_folder_id"]);
      if (error) throw error;
      const map = new Map((data ?? []).map((r) => [r.key, r.value]));
      return {
        fireworks_at: map.get("fireworks_at") ?? null,
        photo_drive_folder_id: map.get("photo_drive_folder_id") ?? null,
      };
    },
    staleTime: 60_000,
  });
}
