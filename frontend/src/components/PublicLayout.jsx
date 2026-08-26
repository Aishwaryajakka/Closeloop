import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BrandMark } from "@/components/BrandMark";
import { useDemoEntry } from "@/lib/useDemoEntry";
import { ArrowRight, Menu, X } from "lucide-react";

const NAV = [
  { to: "/product", label: "Product" },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export function PublicHeader() {
  const enterDemo = useDemoEntry();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/85 border-b border-slate-200/70">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" data-testid="public-logo" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-brand-700 flex items-center justify-center">
            <BrandMark className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="font-heading font-extrabold tracking-tight text-slate-900 text-lg">CloseLoop</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} data-testid={`nav-${n.label.toLowerCase()}`}
              className={`text-sm font-semibold transition-colors ${location.pathname === n.to ? "text-slate-900" : "text-slate-500 hover:text-slate-900"}`}>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/staff/login" data-testid="header-staff-login" className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors">Staff Login</Link>
          <button data-testid="header-view-demo" onClick={enterDemo}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-700 hover:bg-brand-800 text-white px-4 py-2 text-sm font-semibold transition-colors">
            View Demo <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <button className="md:hidden text-slate-700" onClick={() => setOpen((v) => !v)} data-testid="mobile-menu-toggle">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-slate-200 bg-white px-6 py-4 space-y-3">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="block text-sm font-semibold text-slate-700">{n.label}</Link>
          ))}
          <Link to="/staff/login" onClick={() => setOpen(false)} className="block text-sm font-semibold text-slate-700">Staff Login</Link>
          <button onClick={enterDemo} className="w-full inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-700 text-white px-4 py-2 text-sm font-semibold">View Demo <ArrowRight className="h-4 w-4" /></button>
        </div>
      )}
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-brand-700 flex items-center justify-center">
              <BrandMark className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="font-heading font-extrabold tracking-tight text-slate-900">CloseLoop</span>
          </div>
          <p className="mt-3 text-sm text-slate-500 max-w-[220px]">AI resident operations built around resolution.</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Product</p>
          <ul className="space-y-2 text-sm text-slate-600">
            <li><Link to="/product" className="hover:text-slate-900">Product</Link></li>
            <li><Link to="/pricing" className="hover:text-slate-900">Pricing</Link></li>
            <li><Link to="/contact" className="hover:text-slate-900">View Demo</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Company</p>
          <ul className="space-y-2 text-sm text-slate-600">
            <li><Link to="/about" className="hover:text-slate-900">About</Link></li>
            <li><Link to="/contact" className="hover:text-slate-900">Contact</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Legal</p>
          <ul className="space-y-2 text-sm text-slate-600">
            <li><Link to="/privacy" className="hover:text-slate-900">Privacy</Link></li>
            <li><Link to="/terms" className="hover:text-slate-900">Terms</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-sm text-slate-400">© 2026 CloseLoop</p>
          <p className="text-sm font-medium text-slate-400">Report once. Stay informed. Get resolved.</p>
        </div>
      </div>
    </footer>
  );
}

export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
