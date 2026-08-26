import "@/App.css";
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

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-8 w-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/staff/login" replace />;
  return children;
}

function AppRouter() {
  const location = useLocation();
  // read hash from useLocation (reactive), process OAuth callback first
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<ResidentPortal />} />
      <Route path="/staff/login" element={<StaffLogin />} />
      <Route
        path="/staff"
        element={
          <ProtectedRoute>
            <StaffDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/knowledge"
        element={
          <ProtectedRoute>
            <PropertyKnowledge />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/insights"
        element={
          <ProtectedRoute>
            <TrendInsights />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/demo"
        element={
          <ProtectedRoute>
            <DemoMode />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
          <Toaster position="bottom-right" richColors />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
