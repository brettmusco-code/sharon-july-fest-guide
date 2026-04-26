import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, Camera, HelpCircle, Building2, Home } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { trackEvent } from "@/lib/analytics";

const AppMenu = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";

  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open menu"
        className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-card/90 backdrop-blur shadow-md border border-border text-foreground hover:bg-card transition-colors"
      >
        <Menu className="w-5 h-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle className="font-heading text-2xl flex items-center gap-2">
            <span>🎆</span> Menu
          </SheetTitle>
        </SheetHeader>

        <nav className="mt-6 flex flex-col gap-1">
          {!isHome && (
            <Link
              to="/"
              onClick={() => {
                trackEvent("menu_click", "home", "Home");
                close();
              }}
              className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted font-body text-base"
            >
              <Home className="w-5 h-5 text-primary" />
              Home
            </Link>
          )}

          <Link
            to="/share-photos"
            onClick={() => {
              trackEvent("share_photos_click", "menu", "Share photos (menu)");
              close();
            }}
            className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted font-body text-base"
          >
            <Camera className="w-5 h-5 text-primary" />
            Share Your Photos
          </Link>

          <Link
            to="/info"
            onClick={() => {
              trackEvent("menu_click", "info", "Info & FAQ");
              close();
            }}
            className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted font-body text-base"
          >
            <HelpCircle className="w-5 h-5 text-primary" />
            Info & FAQ
          </Link>

          <Link
            to="/sponsors"
            onClick={() => {
              trackEvent("menu_click", "sponsors", "Corporate Sponsors");
              close();
            }}
            className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted font-body text-base"
          >
            <Building2 className="w-5 h-5 text-primary" />
            Corporate Sponsors
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default AppMenu;
