import { useState, useEffect } from "react";
import { Download, Check, Share, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));

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

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center px-4">
      <div className="bg-card rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
        <div className="mb-6">
          <span className="text-6xl">🎆</span>
        </div>

        <h1 className="font-heading text-3xl text-foreground mb-2">Install the App</h1>
        <p className="font-body text-muted-foreground mb-8">
          Get quick access to the Sharon July 4th schedule and map right from your home screen.
        </p>

        {installed ? (
          <div className="flex flex-col items-center gap-2 text-primary">
            <Check className="w-12 h-12" />
            <p className="font-body font-bold text-lg">Installed!</p>
            <a href="/" className="text-sm text-muted-foreground underline mt-2">
              Back to schedule
            </a>
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
              To install on iPhone/iPad:
            </p>
            <ol className="font-body text-muted-foreground space-y-3 list-decimal list-inside">
              <li className="flex items-start gap-2">
                <Share className="w-4 h-4 mt-1 flex-shrink-0 text-primary" />
                <span>Tap the <strong>Share</strong> button in Safari</span>
              </li>
              <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
              <li>Tap <strong>"Add"</strong> to confirm</li>
            </ol>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="font-body text-muted-foreground text-sm">
              Open this page in your mobile browser to install the app, or use your browser's menu to "Add to Home Screen."
            </p>
            <a href="/" className="text-sm text-primary underline">
              Back to schedule
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default Install;
