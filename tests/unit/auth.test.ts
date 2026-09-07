import { describe, it, expect } from "vitest";
import { POST as loginHandler } from "../../app/api/auth/login/route";
import { GET as sessionHandler } from "../../app/api/auth/session/route";
import { POST as logoutHandler } from "../../app/api/auth/logout/route";
import { NextRequest } from "next/server";

describe("Unified Authentication Suite", () => {
  it("authenticates via GitHub provider with zero interruption", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "github" }),
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.provider).toBe("github");
    expect(data.user.name).toContain("GitHub");
    expect(data.token).toBeDefined();

    // Verify session cookie was set
    const cookieHeader = res.headers.get("set-cookie");
    expect(cookieHeader).toContain("voicetrace_session");
  });

  it("authenticates via Google provider with zero interruption", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "google" }),
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.provider).toBe("google");
    expect(data.user.name).toContain("Google");
  });

  it("authenticates via Bitbucket provider with zero interruption", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "bitbucket" }),
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.provider).toBe("bitbucket");
    expect(data.user.name).toContain("Bitbucket");
  });

  it("authenticates via GitLab provider with zero interruption", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "gitlab" }),
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.provider).toBe("gitlab");
    expect(data.user.name).toContain("GitLab");
  });

  it("authenticates via Email & Password with custom name formatting", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "email", email: "elena.rostova@acme.ai" }),
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.email).toBe("elena.rostova@acme.ai");
    expect(data.user.name).toBe("Elena Rostova");
  });

  it("rejects unsupported providers gracefully", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "unsupported_provider" }),
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("Unsupported auth provider");
  });

  it("reads active user session from cookies", async () => {
    const mockSession = JSON.stringify({
      user: {
        id: "usr_123",
        name: "Test Engineer",
        email: "test@voicetrace.ai",
        provider: "github",
        role: "engineer",
      },
      token: "vt_sess_xyz",
    });

    const req = new NextRequest("http://localhost:3000/api/auth/session", {
      headers: {
        cookie: `voicetrace_session=${encodeURIComponent(mockSession)}`,
      },
    });

    const res = await sessionHandler(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.authenticated).toBe(true);
    expect(data.user.name).toBe("Test Engineer");
  });

  it("returns unauthenticated when session cookie is absent", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/session");
    const res = await sessionHandler(req);
    const data = await res.json();
    expect(data.authenticated).toBe(false);
    expect(data.user).toBeNull();
  });

  it("clears session on logout", async () => {
    const res = await logoutHandler();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
