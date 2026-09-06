import { NextRequest, NextResponse } from "next/server";
import { getLlmApiKey, setLlmApiKey } from "@/lib/config/env";

export async function GET() {
  const { key, provider } = getLlmApiKey();
  const configured = Boolean(key && key.length > 5);

  return NextResponse.json({
    configured,
    provider: provider || null,
    maskedKey: configured ? "••••••••••••••••" : "",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const provider = body.provider as "groq" | "gemini" | "openai" | "ollama";
    const apiKey = (body.apiKey || "").trim();

    if (!provider || !["groq", "gemini", "openai", "ollama"].includes(provider)) {
      return NextResponse.json(
        { success: false, error: "Invalid provider. Must be 'groq', 'gemini', 'openai', or 'ollama'." },
        { status: 400 }
      );
    }

    if (!apiKey && provider !== "ollama") {
      return NextResponse.json(
        { success: false, error: "API key cannot be empty." },
        { status: 400 }
      );
    }

    // Quick connectivity verification
    if (provider === "groq") {
      const testRes = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!testRes.ok) {
        return NextResponse.json(
          { success: false, error: "Invalid Groq API key (Authentication failed). Please check your key at console.groq.com." },
          { status: 400 }
        );
      }
    } else if (provider === "gemini") {
      const testRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );
      if (!testRes.ok) {
        return NextResponse.json(
          { success: false, error: "Invalid Google Gemini API key. Please check your key at aistudio.google.com." },
          { status: 400 }
        );
      }
    } else if (provider === "openai") {
      const testRes = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!testRes.ok) {
        return NextResponse.json(
          { success: false, error: "Invalid OpenAI API key (Authentication failed)." },
          { status: 400 }
        );
      }
    } else if (provider === "ollama") {
      const host = apiKey || "http://127.0.0.1:11434";
      try {
        const testRes = await fetch(`${host}/api/tags`);
        if (!testRes.ok) {
          return NextResponse.json(
            { success: false, error: `Could not reach Ollama at ${host}.` },
            { status: 400 }
          );
        }
      } catch (e: any) {
        return NextResponse.json(
          { success: false, error: `Ollama connection failed: ${e.message}. Make sure 'ollama serve' is running.` },
          { status: 400 }
        );
      }
    }

    setLlmApiKey(provider, apiKey || "http://127.0.0.1:11434");

    return NextResponse.json({
      success: true,
      provider,
      message: `${provider.toUpperCase()} AI Brain successfully saved and active!`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update LLM key" },
      { status: 500 }
    );
  }
}

