import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash;
    const match = hash.match(/session_id=([^&]+)/);
    const sessionId = match ? match[1] : null;

    const run = async () => {
      if (!sessionId) {
        navigate("/staff/login", { replace: true });
        return;
      }
      try {
        const res = await api.post("/auth/session", null, {
          headers: { "X-Session-ID": sessionId },
        });
        setUser(res.data);
        window.history.replaceState(null, "", window.location.pathname);
        navigate("/staff", { replace: true });
      } catch (e) {
        navigate("/staff/login", { replace: true });
      }
    };
    run();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="h-8 w-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
    </div>
  );
}
