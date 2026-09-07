"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Radio,
  Lock,
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  Zap,
  RotateCcw,
  UserCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { AuthProviderType } from "@/lib/auth/types";

// Official Provider Icons as crisp inline SVGs
function GitHubIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

function GoogleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
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
  );
}

function BitbucketIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 40 62 58" fill="none">
      <defs>
        <linearGradient id="bitbucketGrad" x1="64" y1="65" x2="32" y2="90" gradientUnits="userSpaceOnUse">
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
        fill="url(#bitbucketGrad)"
      />
    </svg>
  );
}

function GitLabIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#E24329"
        d="M12 21.43l3.68-11.32H8.32L12 21.43z"
      />
      <path
        fill="#FC6D26"
        d="M12 21.43l-3.68-11.32H1.93L12 21.43z"
      />
      <path
        fill="#FCA326"
        d="M1.93 10.11l-.85 2.62a1 1 0 0 0 .36 1.12L12 21.43 1.93 10.11z"
      />
      <path
        fill="#E24329"
        d="M1.93 10.11h6.39L5.61 1.77a.64.64 0 0 0-1.22 0L1.93 10.11z"
      />
      <path
        fill="#FC6D26"
        d="M12 21.43l3.68-11.32h6.39L12 21.43z"
      />
      <path
        fill="#FCA326"
        d="M22.07 10.11l.85 2.62a1 1 0 0 1-.36 1.12L12 21.43l10.07-11.32z"
      />
      <path
        fill="#E24329"
        d="M22.07 10.11h-6.39l2.71-8.34a.64.64 0 0 1 1.22 0l2.46 8.34z"
      />
    </svg>
  );
}

interface ProviderConfig {
  id: AuthProviderType;
  name: string;
  tagline: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  borderHover: string;
  glowColor: string;
  btnBg: string;
  textColor: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: "github",
    name: "GitHub",
    tagline: "Developer & Enterprise Organizations",
    badge: "Most Popular",
    icon: GitHubIcon,
    borderHover: "hover:border-zinc-400 group-hover:border-zinc-300",
    glowColor: "rgba(255, 255, 255, 0.15)",
    btnBg: "bg-zinc-900/90 hover:bg-zinc-800/90",
    textColor: "text-white",
  },
  {
    id: "google",
    name: "Google",
    tagline: "Google Cloud & Workspace SSO",
    badge: "Fast Login",
    icon: GoogleIcon,
    borderHover: "hover:border-blue-400/80 group-hover:border-blue-400/80",
    glowColor: "rgba(66, 133, 244, 0.25)",
    btnBg: "bg-zinc-900/90 hover:bg-[#4285F4]/10",
    textColor: "text-zinc-100",
  },
  {
    id: "bitbucket",
    name: "Bitbucket",
    tagline: "Atlassian Cloud & Jira Ecosystem",
    badge: "Enterprise",
    icon: BitbucketIcon,
    borderHover: "hover:border-[#2684FF]/80 group-hover:border-[#2684FF]/80",
    glowColor: "rgba(38, 132, 255, 0.25)",
    btnBg: "bg-zinc-900/90 hover:bg-[#2684FF]/10",
    textColor: "text-zinc-100",
  },
  {
    id: "gitlab",
    name: "GitLab",
    tagline: "Self-Hosted & GitLab.com CI/CD",
    badge: "DevOps",
    icon: GitLabIcon,
    borderHover: "hover:border-[#FC6D26]/80 group-hover:border-[#FC6D26]/80",
    glowColor: "rgba(252, 109, 38, 0.25)",
    btnBg: "bg-zinc-900/90 hover:bg-[#FC6D26]/10",
    textColor: "text-zinc-100",
  },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/";

  const { user, isAuthenticated, login } = useAuth();

  // Active tab: 'oauth' or 'credentials'
  const [activeTab, setActiveTab] = useState<"oauth" | "credentials">("oauth");

  // Interactive states for OAuth buttons
  const [activeProvider, setActiveProvider] = useState<AuthProviderType | null>(null);
  const [loadingStage, setLoadingStage] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Email form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submittingForm, setSubmittingForm] = useState(false);

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated && user) {
      setStatusMessage({
        type: "success",
        text: `Welcome back, ${user.name}! Redirecting to workspace...`,
      });
      const timer = setTimeout(() => {
        router.push(returnUrl);
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user, returnUrl, router]);

  // Handle OAuth provider login with dynamic interactive stages
  const handleProviderLogin = async (provider: AuthProviderType) => {
    setActiveProvider(provider);
    setStatusMessage(null);

    // Stage 1: Initiating Handshake
    setLoadingStage(`Connecting to ${provider.toUpperCase()} Identity Provider...`);
    await new Promise((r) => setTimeout(r, 260));

    // Stage 2: Token exchange
    setLoadingStage("Verifying developer cryptographic credentials...");
    await new Promise((r) => setTimeout(r, 320));

    // Stage 3: Complete login via Auth API
    setLoadingStage("Establishing secure session...");
    const result = await login(provider);

    if (result.success) {
      setLoadingStage("Access Granted! Loading VoiceTrace workspace...");
      setStatusMessage({
        type: "success",
        text: `Successfully authenticated via ${provider.toUpperCase()}!`,
      });
      setTimeout(() => {
        router.push(returnUrl);
      }, 700);
    } else {
      setStatusMessage({
        type: "error",
        text: result.error || "Authentication could not be completed.",
      });
      setActiveProvider(null);
      setLoadingStage("");
    }
  };

  // Handle Credentials form submission
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setStatusMessage({ type: "error", text: "Please enter your developer email address." });
      return;
    }

    setSubmittingForm(true);
    setStatusMessage(null);

    const result = await login("email", email, password);

    if (result.success) {
      setStatusMessage({
        type: "success",
        text: "Credentials verified! Loading VoiceTrace...",
      });
      setTimeout(() => {
        router.push(returnUrl);
      }, 700);
    } else {
      setStatusMessage({
        type: "error",
        text: result.error || "Invalid credentials provided.",
      });
      setSubmittingForm(false);
    }
  };

  // Quick autofill demo credentials
  const autofillDemo = (demoEmail: string, demoPass: string = "voicetrace2026") => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="w-full max-w-xl mx-auto py-6 sm:py-10">
      {/* Top Branding Card */}
      <div className="text-center mb-8 space-y-2">
        <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-[#2CC3E9]/10 border border-[#2CC3E9]/30 text-[#00F0FF] text-xs font-semibold tracking-wide uppercase mb-2 shadow-[0_0_20px_rgba(0,240,255,0.2)]">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span>Unified Developer Access</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Sign In to <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F0FF] via-[#2CC3E9] to-white">VoiceTrace</span>
        </h1>
        <p className="text-sm text-zinc-400 max-w-md mx-auto">
          Developer observability and regression platform for realtime voice agents. Select your code repository or enterprise SSO.
        </p>
      </div>

      {/* Main Glassmorphic Login Container */}
      <div className="rime-glass rounded-2xl border border-white/10 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#00F0FF]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Status Message Alert */}
        {statusMessage && (
          <div
            className={`mb-6 p-3.5 rounded-xl border flex items-center gap-3 text-sm transition-all duration-300 animate-in fade-in-50 ${
              statusMessage.type === "success"
                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                : "bg-red-950/40 border-red-500/40 text-red-300"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 animate-bounce" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
        )}

        {/* Tab Switcher: OAuth vs Credentials */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-zinc-950/70 border border-white/5 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab("oauth")}
            className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === "oauth"
                ? "bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-white/10"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#00F0FF]" />
            <span>Git &amp; OAuth Providers</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("credentials")}
            className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === "credentials"
                ? "bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-white/10"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-[#2CC3E9]" />
            <span>Email &amp; Password</span>
          </button>
        </div>

        {/* TAB 1: OAuth Providers (GitHub, Google, Bitbucket, GitLab) */}
        {activeTab === "oauth" && (
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2 flex items-center justify-between">
              <span>Choose Identity Provider</span>
              <span className="text-emerald-400 text-[11px] font-normal flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Zero-Config Ready
              </span>
            </div>

            {/* Provider Buttons Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PROVIDERS.map((provider) => {
                const IconComponent = provider.icon;
                const isSelected = activeProvider === provider.id;
                const isDisabled = activeProvider !== null && !isSelected;

                return (
                  <button
                    key={provider.id}
                    type="button"
                    disabled={isDisabled || isSelected}
                    onClick={() => handleProviderLogin(provider.id)}
                    style={{
                      boxShadow: isSelected ? `0 0 25px ${provider.glowColor}` : undefined,
                    }}
                    className={`group relative p-4 rounded-xl border border-white/10 text-left transition-all duration-200 select-none overflow-hidden cursor-pointer ${
                      provider.btnBg
                    } ${provider.borderHover} ${
                      isSelected
                        ? "border-[#00F0FF] ring-2 ring-[#00F0FF]/30 scale-[1.02]"
                        : "hover:scale-[1.015] active:scale-[0.985]"
                    } ${isDisabled ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    {/* Top Row: Icon + Badge */}
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="p-2 rounded-lg bg-white/5 border border-white/10 group-hover:border-white/20 transition-colors">
                        <IconComponent className="w-5 h-5 transition-transform group-hover:scale-110" />
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-300">
                        {provider.badge}
                      </span>
                    </div>

                    {/* Middle Row: Name & Tagline with aligned Arrow indicator */}
                    <div>
                      <div className="text-base font-bold text-white flex items-center justify-between gap-2">
                        <span>Continue with {provider.name}</span>
                        {!isSelected && (
                          <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-[#00F0FF] transition-all transform group-hover:translate-x-1 shrink-0 opacity-70 group-hover:opacity-100" />
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                        {provider.tagline}
                      </p>
                    </div>

                    {/* Bottom Status / Spinner if Active */}
                    {isSelected && (
                      <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center gap-2 text-xs text-[#00F0FF] animate-pulse">
                        <RotateCcw className="w-3.5 h-3.5 animate-spin shrink-0" />
                        <span className="font-mono text-[11px] truncate">{loadingStage}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick 1-Click Sandbox Test Profiles */}
            <div className="mt-6 pt-5 border-t border-white/10">
              <div className="text-xs text-zinc-400 font-medium mb-2.5 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Instant Developer Sandbox Profiles (1-Click Test):</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleProviderLogin("github")}
                  className="py-1.5 px-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-mono flex items-center justify-center gap-1.5 transition-colors"
                >
                  <GitHubIcon className="w-3 h-3 shrink-0" />
                  <span>alex.dev</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleProviderLogin("google")}
                  className="py-1.5 px-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-mono flex items-center justify-center gap-1.5 transition-colors"
                >
                  <GoogleIcon className="w-3 h-3 shrink-0" />
                  <span>sarah.cloud</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleProviderLogin("bitbucket")}
                  className="py-1.5 px-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-mono flex items-center justify-center gap-1.5 transition-colors"
                >
                  <BitbucketIcon className="w-3 h-3 shrink-0" />
                  <span>morgan.reed</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleProviderLogin("gitlab")}
                  className="py-1.5 px-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-mono flex items-center justify-center gap-1.5 transition-colors"
                >
                  <GitLabIcon className="w-3 h-3 shrink-0" />
                  <span>jordan.ops</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Email & Password */}
        {activeTab === "credentials" && (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="engineer@company.ai"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/80 border border-zinc-800 focus:border-[#00F0FF] focus:ring-1 focus:ring-[#00F0FF] rounded-xl text-sm text-white placeholder:text-zinc-600 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => autofillDemo("lead.engineer@voicetrace.ai")}
                  className="text-xs text-[#00F0FF] hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Autofill Demo
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-zinc-950/80 border border-zinc-800 focus:border-[#00F0FF] focus:ring-1 focus:ring-[#00F0FF] rounded-xl text-sm text-white placeholder:text-zinc-600 outline-none transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-zinc-900 border-zinc-700 text-[#00F0FF] focus:ring-0 focus:ring-offset-0"
                />
                <span>Keep me signed in for 30 days</span>
              </label>
              <span className="text-zinc-500">SSO auto-discovery enabled</span>
            </div>

            <button
              type="submit"
              disabled={submittingForm}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-[#00F0FF] via-[#2CC3E9] to-[#00D1FF] hover:from-white hover:to-white text-zinc-950 shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:shadow-[0_0_25px_rgba(255,255,255,0.6)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submittingForm ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Sign In to VoiceTrace</span>
                </>
              )}
            </button>

            {/* Quick 1-Click Sandbox Test Profiles for Email & Password Tab */}
            <div className="mt-5 pt-4 border-t border-white/10">
              <div className="text-xs text-zinc-400 font-medium mb-2.5 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Instant Developer Sandbox Profiles (1-Click Test):</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleProviderLogin("github")}
                  className="py-1.5 px-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <GitHubIcon className="w-3 h-3 shrink-0" />
                  <span>alex.dev</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleProviderLogin("google")}
                  className="py-1.5 px-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <GoogleIcon className="w-3 h-3 shrink-0" />
                  <span>sarah.cloud</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleProviderLogin("bitbucket")}
                  className="py-1.5 px-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <BitbucketIcon className="w-3 h-3 shrink-0" />
                  <span>morgan.reed</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleProviderLogin("gitlab")}
                  className="py-1.5 px-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <GitLabIcon className="w-3 h-3 shrink-0" />
                  <span>jordan.ops</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Security & Audit Verification Footer */}
        <div className="mt-8 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-500 gap-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>End-to-End Cryptographic Session Token</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="hover:text-zinc-300 transition-colors">
              Command Center
            </Link>
            <span>•</span>
            <Link href="/live" className="hover:text-zinc-300 transition-colors">
              Live Mic
            </Link>
            <span>•</span>
            <Link href="/settings" className="hover:text-zinc-300 transition-colors">
              API Keys
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px] text-zinc-400">
          <RotateCcw className="w-6 h-6 animate-spin text-[#00F0FF]" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
