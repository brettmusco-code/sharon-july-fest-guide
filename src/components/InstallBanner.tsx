import { useEffect, useState } from "react";
import { X, Download, Share } from "lucide-react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "install-banner-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallBanner = () => {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Don't show if already installed
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    if (isStandalone) return;

    // Mobile only
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    if (!isMobile) return;

    if (localStorage.getItem(STORAGE_KEY)) return;

    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
    setIsIOS(ios);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS never fires beforeinstallprompt — show banner immediately
    if (ios) {
      const t = setTimeout(() => setShow(true), 1500);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", handler);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setShow(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-40 md:hidden animate-fade-in">
      <div className="flex items-center gap-3 rounded-xl border-2 border-primary/20 bg-card p-3 shadow-2xl">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <span className="text-2xl">🎆</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading text-sm text-foreground leading-tight">
            Add to Home Screen
          </p>
          <p className="font-body text-xs text-muted-foreground mt-0.5">
            Quick access at the festival
          </p>
        </div>
        {deferredPrompt ? (
          <button
            onClick={handleInstall}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
          >
            <Download className="h-3.5 w-3.5" />
            Install
          </button>
        ) : (
          <Link
            to="/install"
            onClick={dismiss}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
          >
            {isIOS ? <Share className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
            How
          </Link>
        )}
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default InstallBanner;
