import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";

/**
 * Registers for remote push on native iOS/Android, then stores the FCM token in Supabase
 * via register_push_token (requires Firebase in native projects — see README).
 */
export function PushNotificationsRegister() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let mounted = true;
    const cleanups: Array<() => void> = [];

    void (async () => {
      try {
        const perm = await PushNotifications.checkPermissions();
        let receive = perm.receive;
        if (receive === "prompt") {
          receive = (await PushNotifications.requestPermissions()).receive;
        }
        if (receive !== "granted" || !mounted) return;

        const hReg = await PushNotifications.addListener("registration", async ({ value }) => {
          const platform = Capacitor.getPlatform() === "ios" ? "ios" : "android";
          const { error } = await supabase.rpc("register_push_token", {
            p_token: value,
            p_platform: platform,
          });
          if (error) console.warn("[push] register_push_token failed:", error.message);
        });
        cleanups.push(() => void hReg.remove());

        const hErr = await PushNotifications.addListener("registrationError", (err) => {
          console.warn("[push] registration error:", err.error);
        });
        cleanups.push(() => void hErr.remove());

        await PushNotifications.register();
      } catch (e) {
        console.warn("[push] setup failed:", e);
      }
    })();

    return () => {
      mounted = false;
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return null;
}
