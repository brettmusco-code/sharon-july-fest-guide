import { ReactNode } from "react";
import { Navigate, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Calendar, Map, Tag, LogOut, Home } from "lucide-react";

const tabs = [
  { to: "/admin", label: "Events", icon: Calendar, end: true },
  { to: "/admin/map", label: "Map", icon: Map, end: false },
  { to: "/admin/categories", label: "Categories", icon: Tag, end: false },
];

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { session, isAdmin, loading, signOut, user } = useAuth();
  const location = useLocation();

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
            Ask an existing admin to grant you access in Lovable Cloud → Database → user_roles.
          </p>
          <div className="flex gap-2 justify-center">
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
