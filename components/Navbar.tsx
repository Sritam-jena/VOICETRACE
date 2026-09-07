"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radio, AudioLines, Menu, X, User, LogOut, ChevronDown, Shield, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth/context";

// Provider mini badge with authentic official vector marks
function ProviderMiniIcon({ provider }: { provider: string }) {
  if (provider === "google") {
    return (
      <div className="w-3.5 h-3.5 rounded-full bg-white border border-zinc-900 shadow-sm flex items-center justify-center overflow-hidden">
        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
      </div>
    );
  }
  if (provider === "github") {
    return (
      <div className="w-3.5 h-3.5 rounded-full bg-zinc-950 border border-zinc-800 shadow-sm flex items-center justify-center text-white">
        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
          />
        </svg>
      </div>
    );
  }
  if (provider === "bitbucket") {
    return (
      <div className="w-3.5 h-3.5 rounded-full bg-zinc-950 border border-zinc-800 shadow-sm flex items-center justify-center p-0.5">
        <svg className="w-2.5 h-2.5" viewBox="0 40 62 58" fill="none">
          <defs>
            <linearGradient id="navMiniBitGrad" x1="64" y1="65" x2="32" y2="90" gradientUnits="userSpaceOnUse">
              <stop offset="18%" stopColor="#0052CC" />
              <stop offset="100%" stopColor="#2684FF" />
            </linearGradient>
          </defs>
          <path
            d="M2 41.25a2 2 0 0 0-2 2.32l8.49 51.54a2.72 2.72 0 0 0 2.66 2.27h40.73a2 2 0 0 0 2-1.68l8.51-52.11a2 2 0 0 0-2-2.32zm35.75 37.25h-13l-3.52-18.38h19.67z"
            fill="#2684FF"
          />
          <path
            d="M59.67 60.12h-18.77l-3.15 18.38h-13l-15.35 18.23a2.71 2.71 0 0 0 1.75.66h40.74a2 2 0 0 0 2-1.68z"
            fill="url(#navMiniBitGrad)"
          />
        </svg>
      </div>
    );
  }
  if (provider === "gitlab") {
    return (
      <div className="w-3.5 h-3.5 rounded-full bg-zinc-950 border border-zinc-800 shadow-sm flex items-center justify-center p-0.5">
        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24">
          <path fill="#E24329" d="M12 21.43l3.68-11.32H8.32L12 21.43z" />
          <path fill="#FC6D26" d="M12 21.43l-3.68-11.32H1.93L12 21.43z" />
          <path fill="#FCA326" d="M1.93 10.11l-.85 2.62a1 1 0 0 0 .36 1.12L12 21.43 1.93 10.11z" />
          <path fill="#E24329" d="M1.93 10.11h6.39L5.61 1.77a.64.64 0 0 0-1.22 0L1.93 10.11z" />
          <path fill="#FC6D26" d="M12 21.43l3.68-11.32h6.39L12 21.43z" />
          <path fill="#FCA326" d="M22.07 10.11l.85 2.62a1 1 0 0 1-.36 1.12L12 21.43l10.07-11.32z" />
          <path fill="#E24329" d="M22.07 10.11h-6.39l2.71-8.34a.64.64 0 0 1 1.22 0l2.46 8.34z" />
        </svg>
      </div>
    );
  }
  return null;
}

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { user, isAuthenticated, logout } = useAuth();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

        {/* Right: User Profile / Sign In & Live Mic */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/live"
            className="hidden sm:flex px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-[#2CC3E9] text-zinc-950 hover:bg-[#00F0FF] transition-all items-center gap-1.5 shadow-[0_0_15px_rgba(44,195,233,0.4)] hover:shadow-[0_0_20px_rgba(0,240,255,0.6)]"
          >
            <AudioLines className="w-3.5 h-3.5" />
            <span>Live Mic</span>
          </Link>

          {/* Authentication Section */}
          {isAuthenticated && user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 py-1 px-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-zinc-900/80 hover:bg-zinc-800/80 transition-all select-none cursor-pointer"
              >
                {/* Clean un-obscured User Avatar */}
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-7 h-7 rounded-lg object-cover border border-white/20 shrink-0"
                />

                <span className="hidden sm:inline text-xs font-semibold text-zinc-200 max-w-[90px] truncate">
                  {user.name.split(" ")[0]}
                </span>

                {/* Inline Provider Icon (Zero Overlap) */}
                <ProviderMiniIcon provider={user.provider} />

                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              </button>

              {/* User Dropdown Menu - Floats with balanced ~7px gap and aligned with right edge */}
              {userDropdownOpen && (
                <div className="absolute right-0 sm:-right-5 top-full mt-[20px] w-72 bg-[#0b0c10] rounded-2xl border border-zinc-700/80 p-3 shadow-[0_25px_60px_rgba(0,0,0,0.95)] z-50 animate-in fade-in-50 zoom-in-95">
                  {/* User Profile Card */}
                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 mb-2">
                    <div className="flex items-center gap-3">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-10 h-10 rounded-xl object-cover border border-white/20 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                          <span>{user.name}</span>
                          <ProviderMiniIcon provider={user.provider} />
                        </div>
                        <div className="text-xs text-zinc-400 truncate">
                          {user.email}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                      <span className="px-2 py-0.5 rounded-md bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30 uppercase font-mono font-semibold text-[10px]">
                        {user.provider}
                      </span>
                      <span className="text-zinc-400 capitalize flex items-center gap-1">
                        <Shield className="w-3 h-3 text-emerald-400" />
                        {user.role}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-1">
                    <Link
                      href="/settings"
                      onClick={() => setUserDropdownOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#00F0FF]" />
                      <span>Workspace Settings</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors cursor-pointer text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold border border-[#00F0FF]/40 bg-[#00F0FF]/10 text-[#00F0FF] hover:bg-[#00F0FF] hover:text-zinc-950 transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,240,255,0.15)] hover:shadow-[0_0_20px_rgba(0,240,255,0.4)]"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
          )}

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
        <div className="md:hidden mt-2 max-w-6xl mx-auto bg-[#0b0c10] rounded-xl border border-zinc-700/80 p-3 space-y-1 shadow-[0_20px_50px_rgba(0,0,0,0.95)]">
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

          <div className="pt-2 mt-2 border-t border-white/10">
            {isAuthenticated && user ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 px-3 py-1.5">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-7 h-7 rounded-lg object-cover border border-white/20"
                  />
                  <div className="text-xs">
                    <div className="font-bold text-white">{user.name}</div>
                    <div className="text-zinc-400 capitalize">{user.provider}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-950/30 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold bg-[#00F0FF] text-zinc-950 shadow-[0_0_15px_rgba(0,240,255,0.4)]"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In to VoiceTrace</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
