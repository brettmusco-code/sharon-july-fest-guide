import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "festival_session_id";

const getSessionId = (): string => {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
};

type AnalyticsEventType = "page_visit" | "event_click" | "sponsor_click" | "faq_open" | "map_pin_click" | "question_submit";

export const trackEvent = async (
  eventType: AnalyticsEventType,
  targetId?: string,
  targetLabel?: string,
) => {
  try {
    await supabase.from("analytics_events").insert({
      event_type: eventType,
      target_id: targetId ?? null,
      target_label: targetLabel ?? null,
      session_id: getSessionId(),
    });
  } catch {
    // Silent fail — analytics should never break the app
  }
};
