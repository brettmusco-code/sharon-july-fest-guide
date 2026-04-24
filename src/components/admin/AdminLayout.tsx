import { ReactNode, useState } from "react";
import { Navigate, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Calendar, Map, Tag, LogOut, Home, ShieldCheck, MessageSquare, HelpCircle, BarChart3, MessageCircleQuestion, Handshake } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const tabs = [
  { to: "/admin", label: "Events", icon: Calendar, end: true },
  { to: "/admin/map", label: "Map", icon: Map, end: false },
  { to: "/admin/categories", label: "Categories", icon: Tag, end: false },
  { to: "/admin/messages", label: "Messages", icon: MessageSquare, end: false },
  { to: "/admin/faqs", label: "FAQs", icon: HelpCircle, end: false },
  { to: "/admin/questions", label: "Questions", icon: MessageCircleQuestion, end: false },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3, end: false },
];

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { session, isAdmin, loading, signOut, user } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [claiming, setClaiming] = useState(false);

  const claimAdmin = async () => {
    setClaiming(true);
    const { data, error } = await supabase.rpc("claim_admin");
    setClaiming(false);
    if (error) {
      toast({ title: "Could not claim admin", description: error.message, variant: "destructive" });
      return;
    }
    if (data === true) {
      toast({ title: "You are now admin!" });
      qc.invalidateQueries();
      window.location.reload();
    } else {
      toast({
        title: "Admin already exists",
        description: "An admin account already exists. Ask them to grant you access.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }
  if (!session) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }
  if (!isAdmin) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 text-center">
        <div className="max-w-md">
          <h1 className="font-heading text-3xl mb-3">No admin access</h1>
          <p className="text-muted-foreground mb-6">
            Your account ({user?.email}) is signed in but does not have the admin role.
            If you're the first user, click <strong>Claim admin</strong> to set yourself up.
            Otherwise ask an existing admin to grant you access.
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            <Button onClick={claimAdmin} disabled={claiming}>
              <ShieldCheck className="w-4 h-4 mr-1" />
              {claiming ? "Claiming…" : "Claim admin"}
            </Button>
            <Button asChild variant="outline"><NavLink to="/">Back to site</NavLink></Button>
            <Button onClick={signOut} variant="ghost">Sign out</Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-card border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎆</span>
            <h1 className="font-heading text-xl">Festival Admin</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <NavLink to="/"><Home className="w-4 h-4 mr-1" />View site</NavLink>
            </Button>
            <Button onClick={signOut} variant="outline" size="sm">
              <LogOut className="w-4 h-4 mr-1" />Sign out
            </Button>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `inline-flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`
              }
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
};

export default AdminLayout;
