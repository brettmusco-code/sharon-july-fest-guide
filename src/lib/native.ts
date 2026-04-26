import { Capacitor } from "@capacitor/core";
import { Badge } from "@capawesome/capacitor-badge";
import { StatusBar, Style as StatusBarStyle } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";

const isNative = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

/**
 * Brand status bar — deep festival red, white icons.
 * Matches --primary (356 72% 45%) ≈ #c5202e.
 * Call once on app boot.
 */
export async function initStatusBar() {
  if (!isNative()) return;
  try {
    await StatusBar.setStyle({ style: StatusBarStyle.Dark }); // light icons on dark bg
    await StatusBar.setBackgroundColor({ color: "#c5202e" }); // Android only; iOS ignores
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch {
    /* ignore */
  }
}

/** Hide the native splash once the app shell has hydrated. */
export async function hideSplash() {
  if (!isNative()) return;
  try {
    await SplashScreen.hide({ fadeOutDuration: 250 });
  } catch {
    /* ignore */
  }
}

/** Set the iOS/Android app icon badge. Web is a no-op. */
export async function setAppBadge(count: number) {
  if (!isNative()) return;
  try {
    const supported = await Badge.isSupported();
    if (!supported.isSupported) return;
    const perm = await Badge.checkPermissions();
    if (perm.display !== "granted") {
      const req = await Badge.requestPermissions();
      if (req.display !== "granted") return;
    }
    if (count <= 0) {
      await Badge.clear();
    } else {
      await Badge.set({ count });
    }
  } catch {
    /* ignore */
  }
}
