import "@/App.css";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import AuthCallback from "@/pages/AuthCallback";
import ResidentPortal from "@/pages/ResidentPortal";
import StaffLogin from "@/pages/StaffLogin";
import StaffDashboard from "@/pages/StaffDashboard";
import PropertyKnowledge from "@/pages/PropertyKnowledge";
import TrendInsights from "@/pages/TrendInsights";
import DemoMode from "@/pages/DemoMode";
import AdminLeads from "@/pages/AdminLeads";
import Home from "@/pages/public/Home";
import Product from "@/pages/public/Product";
import Pricing from "@/pages/public/Pricing";
import About from "@/pages/public/About";
import Contact from "@/pages/public/Contact";
import Privacy from "@/pages/public/Privacy";
import Terms from "@/pages/public/Terms";

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const t = setTimeout(() => {
        const el = document.getElementById(hash.slice(1));
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
      return () => clearTimeout(t);
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

function ProtectedRoute({ children }) {
  const { user, loading, checkAuth } = useAuth();
  useEffect(() => {
    // Entering a staff route: verify session (public pages skip the /me call).
    if (!user) checkAuth();
    // eslint-disable-next-line
  }, []);
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-8 w-8 border-2 border-slate-300 border-t-brand-700 rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/staff/login" replace />;
  return children;
}

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      {/* Public marketing */}
      <Route path="/" element={<Home />} />
      <Route path="/product" element={<Product />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />

      {/* Resident app */}
      <Route path="/portal" element={<ResidentPortal />} />

      {/* Staff */}
      <Route path="/staff/login" element={<StaffLogin />} />
      <Route path="/staff" element={<ProtectedRoute><StaffDashboard /></ProtectedRoute>} />
      <Route path="/staff/knowledge" element={<ProtectedRoute><PropertyKnowledge /></ProtectedRoute>} />
      <Route path="/staff/insights" element={<ProtectedRoute><TrendInsights /></ProtectedRoute>} />
      <Route path="/staff/leads" element={<ProtectedRoute><AdminLeads /></ProtectedRoute>} />
      <Route path="/staff/demo" element={<ProtectedRoute><DemoMode /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <AppRouter />
          <Toaster position="bottom-right" richColors />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
