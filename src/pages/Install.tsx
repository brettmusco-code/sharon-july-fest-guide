import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Download, Check, Share, Smartphone, AlertCircle, ExternalLink, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isNativeCapacitorApp } from "@/lib/native-app";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (isNativeCapacitorApp()) return;

    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));
    setIsAndroid(/Android/.test(ua));

    // Detect Instagram, Facebook, TikTok, LinkedIn in-app browsers
    setIsInAppBrowser(
      /FBAN|FBAV|Instagram|LinkedInApp|TikTok|Twitter|Snapchat/i.test(ua)
    );

    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        // @ts-expect-error iOS Safari
        window.navigator.standalone === true
    );

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  };

  const copyUrl = async () => {
    await navigator.clipboard.writeText(window.location.origin);
  };

  if (isNativeCapacitorApp()) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center px-4 py-8">
      <div className="bg-card rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
        <div className="mb-6">
          <span className="text-6xl">🎆</span>
        </div>

        <h1 className="font-heading text-3xl text-foreground mb-2">Install the App</h1>
        <p className="font-body text-muted-foreground mb-8">
          Get quick access to the Sharon July 4th schedule and map right from your home screen.
        </p>

        {installed || isStandalone ? (
          <div className="flex flex-col items-center gap-2 text-primary">
            <Check className="w-12 h-12" />
            <p className="font-body font-bold text-lg">All set!</p>
            <p className="text-sm text-muted-foreground">The app is already installed.</p>
            <a href="/" className="text-sm text-primary underline mt-2">
              Back to schedule
            </a>
          </div>
        ) : isInAppBrowser ? (
          <div className="space-y-4 text-left">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-body font-semibold text-foreground mb-1">
                  Open in your browser first
                </p>
                <p className="font-body text-sm text-muted-foreground">
                  You're viewing this inside another app (like Instagram or Facebook). To install,
                  open this page in {isIOS ? "Safari" : "Chrome"}.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="font-body text-sm font-semibold text-foreground">How to switch:</p>
              <ol className="font-body text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Tap the <strong>•••</strong> menu (top-right corner)</li>
                <li>Tap <strong>"Open in {isIOS ? "Safari" : "Chrome"}"</strong></li>
                <li>Then come back to this page</li>
              </ol>
            </div>
            <Button onClick={copyUrl} variant="outline" className="w-full gap-2">
              <ExternalLink className="w-4 h-4" />
              Copy link
            </Button>
          </div>
        ) : deferredPrompt ? (
          <Button onClick={handleInstall} size="lg" className="w-full gap-2 text-lg py-6">
            <Download className="w-5 h-5" />
            Install App
          </Button>
        ) : isIOS ? (
          <div className="space-y-4 text-left">
            <p className="font-body font-semibold text-foreground flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              Install on iPhone or iPad
            </p>
            <ol className="space-y-3">
              <li className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  1
                </span>
                <div className="flex-1">
                  <p className="font-body text-sm text-foreground">
                    Tap the <Share className="inline w-4 h-4 mx-1 text-primary" />
                    <strong>Share</strong> button at the bottom of Safari
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  2
                </span>
                <div className="flex-1">
                  <p className="font-body text-sm text-foreground">
                    Scroll down and tap <Plus className="inline w-4 h-4 mx-1 text-primary" />
                    <strong>"Add to Home Screen"</strong>
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  3
                </span>
                <div className="flex-1">
                  <p className="font-body text-sm text-foreground">
                    Tap <strong>"Add"</strong> in the top-right corner
                  </p>
                </div>
              </li>
            </ol>
            <p className="text-xs text-muted-foreground italic text-center pt-2">
              Note: Apple requires these manual steps — apps cannot install themselves on iPhone.
            </p>
          </div>
        ) : isAndroid ? (
          <div className="space-y-4 text-left">
            <p className="font-body font-semibold text-foreground flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              Install on Android
            </p>
            <ol className="space-y-3">
              <li className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  1
                </span>
                <p className="font-body text-sm text-foreground flex-1">
                  Tap the <strong>•••</strong> menu in Chrome
                </p>
              </li>
              <li className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  2
                </span>
                <p className="font-body text-sm text-foreground flex-1">
                  Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>
                </p>
              </li>
            </ol>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="font-body text-muted-foreground text-sm">
              Open this page on your phone to install. Use Safari on iPhone or Chrome on Android.
            </p>
            <Button onClick={copyUrl} variant="outline" className="w-full gap-2">
              <ExternalLink className="w-4 h-4" />
              Copy link to share
            </Button>
            <a href="/" className="block text-sm text-primary underline">
              Back to schedule
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default Install;
