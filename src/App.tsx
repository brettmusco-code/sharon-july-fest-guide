import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index.tsx";
import Install from "./pages/Install.tsx";
import Auth from "./pages/Auth.tsx";
import Info from "./pages/Info.tsx";
import SharePhotos from "./pages/SharePhotos.tsx";
import SponsorsPage from "./pages/SponsorsPage.tsx";
import ScrollToTop from "@/components/ScrollToTop";
import AdminEvents from "./pages/admin/AdminEvents.tsx";
import AdminMap from "./pages/admin/AdminMap.tsx";
import AdminCategories from "./pages/admin/AdminCategories.tsx";
import AdminMessages from "./pages/admin/AdminMessages.tsx";
import AdminFaqs from "./pages/admin/AdminFaqs.tsx";
import AdminQuestions from "./pages/admin/AdminQuestions.tsx";
import AdminAnalytics from "./pages/admin/AdminAnalytics.tsx";
import AdminSponsors from "./pages/admin/AdminSponsors.tsx";
import AdminPhotos from "./pages/admin/AdminPhotos.tsx";
import AdminSettings from "./pages/admin/AdminSettings.tsx";
import NotFound from "./pages/NotFound.tsx";
import { PushNotificationsRegister } from "@/components/PushNotificationsRegister";
import { hydrateOfflineCache, startOfflinePersistence } from "@/lib/offline-cache";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep cached data around long enough to survive a cold start with no network.
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
      staleTime: 1000 * 30,
      retry: 2,
    },
  },
});

// Hydrate before any provider mounts so first render uses cached data offline.
hydrateOfflineCache(queryClient);

const App = () => {
  useEffect(() => {
    return startOfflinePersistence(queryClient);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PushNotificationsRegister />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/install" element={<Install />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/info" element={<Info />} />
              <Route path="/share-photos" element={<SharePhotos />} />
              <Route path="/sponsors" element={<SponsorsPage />} />
              <Route path="/admin" element={<AdminEvents />} />
              <Route path="/admin/map" element={<AdminMap />} />
              <Route path="/admin/categories" element={<AdminCategories />} />
              <Route path="/admin/messages" element={<AdminMessages />} />
              <Route path="/admin/faqs" element={<AdminFaqs />} />
              <Route path="/admin/questions" element={<AdminQuestions />} />
              <Route path="/admin/analytics" element={<AdminAnalytics />} />
              <Route path="/admin/sponsors" element={<AdminSponsors />} />
              <Route path="/admin/photos" element={<AdminPhotos />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
