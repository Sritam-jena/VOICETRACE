import { NextRequest, NextResponse } from "next/server";
import { AuthProviderType, AuthUser } from "@/lib/auth/types";

// Standard demo profiles for seamless, zero-friction developer testing
const PROVIDER_PROFILES: Record<Exclude<AuthProviderType, "email">, Omit<AuthUser, "id" | "createdAt">> = {
  github: {
    name: "Alex Dev (GitHub)",
    email: "alex.dev@github.com",
    username: "alexdev",
    provider: "github",
    role: "engineer",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=faces&auto=format&q=80",
  },
  google: {
    name: "Sarah Cloud (Google)",
    email: "sarah.cloud@gmail.com",
    username: "sarahcloud",
    provider: "google",
    role: "admin",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&h=128&fit=crop&crop=faces&auto=format&q=80",
  },
  bitbucket: {
    name: "Morgan Atlassian (Bitbucket)",
    email: "morgan.reed@atlassian.com",
    username: "morganreed",
    provider: "bitbucket",
    role: "engineer",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop&crop=faces&auto=format&q=80",
  },
  gitlab: {
    name: "Jordan DevOps (GitLab)",
    email: "jordan.vance@gitlab.com",
    username: "jordanvance",
    provider: "gitlab",
    role: "admin",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=128&h=128&fit=crop&crop=faces&auto=format&q=80",
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { provider = "github", email, rememberMe = true } = body;

    let user: AuthUser;
    const now = new Date().toISOString();

    if (provider === "email") {
      const sanitizedEmail = (email && typeof email === "string" && email.includes("@"))
        ? email.trim()
        : "developer@voicetrace.ai";
      
      const localPart = sanitizedEmail.split("@")[0];
      const displayName = localPart
        .replace(/[._-]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      user = {
        id: `usr_${Math.random().toString(36).substring(2, 11)}`,
        name: displayName || "VoiceTrace Engineer",
        email: sanitizedEmail,
        username: localPart,
        provider: "email",
        role: "engineer",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&h=128&fit=crop&crop=faces&auto=format&q=80",
        createdAt: now,
      };
    } else if (PROVIDER_PROFILES[provider as Exclude<AuthProviderType, "email">]) {
      const template = PROVIDER_PROFILES[provider as Exclude<AuthProviderType, "email">];
      user = {
        ...template,
        id: `usr_${provider}_${Math.random().toString(36).substring(2, 9)}`,
        createdAt: now,
      };
    } else {
      return NextResponse.json(
        { success: false, error: `Unsupported auth provider: ${provider}` },
        { status: 400 }
      );
    }

    // Generate lightweight deterministic session token
    const token = `vt_sess_${Buffer.from(JSON.stringify({ userId: user.id, p: user.provider, t: Date.now() })).toString("base64url")}`;
    const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24; // 30 days vs 1 day

    const response = NextResponse.json({
      success: true,
      user,
      token,
      message: `Successfully authenticated via ${provider.toUpperCase()}`,
    });

    // Set secure HTTP session cookie
    response.cookies.set("voicetrace_session", JSON.stringify({ user, token }), {
      httpOnly: false, // readable for quick client hydration
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge,
      path: "/",
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Authentication process failed" },
      { status: 500 }
    );
  }
}
