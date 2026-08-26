import React from "react";
import { Building2, ShieldCheck } from "lucide-react";

export default function StaffLogin() {
  const handleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/staff";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: form */}
      <div className="flex flex-col justify-between p-8 lg:p-14 bg-white">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-slate-900 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="font-heading font-extrabold text-lg tracking-tight text-slate-900">PropTriage</span>
        </div>

        <div className="max-w-md mx-auto w-full">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Staff Access</p>
          <h1 className="font-heading text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
            Welcome back
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Sign in to manage resident requests, triage issues, and coordinate your maintenance teams.
          </p>

          <button
            data-testid="staff-login-btn"
            onClick={handleLogin}
            className="mt-8 w-full flex items-center justify-center gap-3 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3.5 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" opacity="0" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
              <path fill="#4285F4" d="M23 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.16c-.27 1.39-1.06 2.56-2.26 3.36v2.79h3.65C21.66 18.82 23 15.85 23 12.27z" />
              <path fill="#FBBC05" d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18L2.18 7.07a10.99 10.99 0 0 0 0 9.86l3.66-2.84z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.65-2.79c-1.01.68-2.31 1.08-3.63 1.08-2.86 0-5.29-1.93-6.16-4.53L2.18 16.93C3.99 20.53 7.7 23 12 23z" />
            </svg>
            Continue with Google
          </button>

          <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
            <ShieldCheck className="h-4 w-4 text-slate-400" />
            Restricted to authorized property staff only.
          </div>
        </div>

        <a href="/" data-testid="back-to-resident-link" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors duration-200">
          ← Are you a resident? Submit a request
        </a>
      </div>

      {/* Right: image */}
      <div className="hidden lg:block relative">
        <img
          src="https://images.unsplash.com/photo-1624204386084-dd8c05e32226?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600"
          alt="Modern apartment building"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
        <div className="absolute bottom-10 left-10 right-10 text-white">
          <p className="font-heading text-2xl font-bold tracking-tight">Rivergate Commons</p>
          <p className="text-white/80 mt-1">Resident issue triage, done right.</p>
        </div>
      </div>
    </div>
  );
}
