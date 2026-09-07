import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("voicetrace_session")?.value;

    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
    }

    try {
      const parsed = JSON.parse(sessionCookie);
      if (parsed?.user) {
        return NextResponse.json({
          authenticated: true,
          user: parsed.user,
          token: parsed.token || null,
        });
      }
    } catch {
      // Invalid cookie format
    }

    return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { authenticated: false, user: null, error: error?.message },
      { status: 500 }
    );
  }
}
