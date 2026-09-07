import "./globals.css";
import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { AuthProvider } from "@/lib/auth/context";

export const metadata: Metadata = {
  title: "VoiceTrace — Realtime Voice Agent Observability",
  description:
    "Developer observability, regression, and failure reproduction platform for realtime voice agents.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#09090b] text-[#f4f4f5] min-h-screen antialiased selection:bg-[#2CC3E9]/30 selection:text-white flex flex-col">
        <AuthProvider>
          {/* Floating Centered Top Navigation Bar with Reactive Blue Dot */}
          <Navbar />

          {/* Centered Main Viewport (No Left Sidebar Bias) */}
          <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
        </AuthProvider>

        {/* Minimal Footer */}
        <footer className="w-full border-t border-white/5 py-6 text-center text-xs text-zinc-500">
          <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>VoiceTrace • Observed-Output Consistency Engine</span>
            <div className="flex items-center gap-4">
              <span className="text-zinc-400">Rime Neural Voices Active</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                PostgreSQL Ready
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
