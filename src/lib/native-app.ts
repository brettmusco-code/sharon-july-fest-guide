import { Capacitor } from "@capacitor/core";

/** True inside the native iOS/Android shell (store builds). False in the browser / PWA. */
export function isNativeCapacitorApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}
