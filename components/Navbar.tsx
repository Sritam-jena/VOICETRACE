"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radio, Mic, Menu, X } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Command Center" },
    { href: "/live", label: "Live Studio" },
    { href: "/sessions", label: "Sessions" },
    { href: "/regression", label: "Regression Lab" },
    { href: "/chaos", label: "Chaos Voice" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full px-4 sm:px-6 lg:px-8 pt-4 pb-2">
      <div className="max-w-6xl mx-auto rime-glass rounded-2xl border border-white/10 px-5 py-3 flex items-center justify-between shadow-2xl backdrop-blur-xl">
        {/* Left: Brand & Rime Core Pill */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-xl border border-[#2CC3E9]/40 bg-[#2CC3E9]/10 flex items-center justify-center shadow-[0_0_15px_rgba(44,195,233,0.25)] group-hover:scale-105 transition-transform">
            <Radio className="w-4 h-4 text-[#2CC3E9]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold tracking-tight text-white text-base">
              VoiceTrace
            </span>
            <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-[#2CC3E9]/20 text-[#2CC3E9] border border-[#2CC3E9]/40 font-semibold">
              RIME
            </span>
          </div>
        </Link>

        {/* Center: Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? "bg-white/10 text-white font-semibold shadow-inner"
                    : "text-zinc-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right: Telemetry Badge & Quick Live Mic Button */}
        <div className="flex items-center gap-2.5">
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900/80 border border-white/10 text-xs text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Sub-100ms TTFB</span>
          </div>

          <Link
            href="/live"
            className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-[#2CC3E9] text-zinc-950 hover:bg-[#00F0FF] transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(44,195,233,0.4)] hover:shadow-[0_0_20px_rgba(0,240,255,0.6)]"
          >
            <Mic className="w-3.5 h-3.5 fill-current" />
            <span>Live Mic</span>
          </Link>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg border border-white/10 text-zinc-300 hover:text-white hover:bg-white/5"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2 max-w-6xl mx-auto rime-glass rounded-xl border border-white/10 p-3 space-y-1 shadow-2xl backdrop-blur-xl">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                  isActive
                    ? "bg-white/10 text-white font-bold"
                    : "text-zinc-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
