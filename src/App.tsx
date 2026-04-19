import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index.tsx";
import Install from "./pages/Install.tsx";
import Auth from "./pages/Auth.tsx";
import AdminEvents from "./pages/admin/AdminEvents.tsx";
import AdminMap from "./pages/admin/AdminMap.tsx";
import AdminCategories from "./pages/admin/AdminCategories.tsx";
import AdminMessages from "./pages/admin/AdminMessages.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/install" element={<Install />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<AdminEvents />} />
            <Route path="/admin/map" element={<AdminMap />} />
            <Route path="/admin/categories" element={<AdminCategories />} />
            <Route path="/admin/messages" element={<AdminMessages />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
