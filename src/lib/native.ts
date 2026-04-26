import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Share } from "@capacitor/share";
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

/** Light tap — pin selection, button presses. Safe no-op on web. */
export async function hapticLight() {
  if (!isNative()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    /* ignore */
  }
}

/** Medium tap — confirms an action like a filter switch. */
export async function hapticMedium() {
  if (!isNative()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {
    /* ignore */
  }
}

/** Success buzz — form submitted, photo uploaded. */
export async function hapticSuccess() {
  if (!isNative()) return;
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    /* ignore */
  }
}

/** Error buzz — submission failed. */
export async function hapticError() {
  if (!isNative()) return;
  try {
    await Haptics.notification({ type: NotificationType.Error });
  } catch {
    /* ignore */
  }
}

/**
 * Native share sheet on iOS/Android, falls back to web Share API,
 * then to clipboard copy. Returns true if anything was shown.
 */
export async function shareSomething(opts: {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}): Promise<boolean> {
  // Native first
  if (isNative()) {
    try {
      await Share.share({
        title: opts.title,
        text: opts.text,
        url: opts.url,
        dialogTitle: opts.dialogTitle ?? "Share",
      });
      return true;
    } catch (e) {
      // user cancelled, etc.
      return false;
    }
  }

  const nav: (Navigator & { clipboard?: Clipboard }) | undefined =
    typeof navigator !== "undefined" ? navigator : undefined;

  // Web Share API (Safari/Chrome on mobile)
  if (nav && typeof nav.share === "function") {
    try {
      await nav.share({
        title: opts.title,
        text: opts.text,
        url: opts.url,
      });
      return true;
    } catch {
      /* user cancelled */
      return false;
    }
  }

  // Clipboard fallback
  if (nav?.clipboard?.writeText) {
    try {
      const payload = [opts.title, opts.text, opts.url].filter(Boolean).join("\n");
      await nav.clipboard.writeText(payload);
      return true;
    } catch {
      /* ignore */
    }
  }
  return false;
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
