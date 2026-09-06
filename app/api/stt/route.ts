import { NextRequest, NextResponse } from "next/server";
import { getLlmApiKey } from "@/lib/config/env";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("audio") as Blob | null;

    if (!file || file.size < 100) {
      return NextResponse.json(
        { success: false, error: "No audio data received or audio clip is empty." },
        { status: 400 }
      );
    }

    const { key, provider } = getLlmApiKey();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Try Groq Whisper (Blazing fast ~120ms transcription)
    const groqKey = (provider === "groq" ? key : process.env.GROQ_API_KEY)?.trim();
    if (groqKey && groqKey.length > 5) {
      try {
        const groqFormData = new FormData();
        const audioBlob = new Blob([buffer], { type: file.type || "audio/webm" });
        groqFormData.append("file", audioBlob, "speech.webm");
        groqFormData.append("model", "whisper-large-v3-turbo");
        groqFormData.append("response_format", "json");

        const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${groqKey}`,
          },
          body: groqFormData,
        });

        if (groqRes.ok) {
          const data = await groqRes.json();
          const transcript = (data.text || "").trim();
          return NextResponse.json({
            success: true,
            transcript,
            provider: "Groq Whisper (whisper-large-v3-turbo)",
          });
        }
      } catch (groqErr) {
        console.warn("Groq Whisper attempt failed, attempting fallback:", groqErr);
      }
    }

    // 2. Try Google Gemini Multimodal Audio (Native audio understanding)
    const geminiKey = (provider === "gemini" ? key : process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)?.trim();
    if (geminiKey && geminiKey.length > 5) {
      const base64Audio = buffer.toString("base64");
      const mimeType = file.type?.includes("wav") ? "audio/wav" : "audio/webm";

      const candidateModels = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-2.5-flash", "gemini-1.5-flash"];
      for (const model of candidateModels) {
        try {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        inlineData: {
                          mimeType,
                          data: base64Audio,
                        },
                      },
                      {
                        text: "Transcribe the spoken audio verbatim into plain text. Output ONLY the exact transcribed words spoken, with no markdown, quotes, preamble, or metadata. If there is only silence or unintelligible noise, output nothing.",
                      },
                    ],
                  },
                ],
                generationConfig: {
                  temperature: 0.1,
                  maxOutputTokens: 250,
                },
              }),
            }
          );

          if (geminiRes.ok) {
            const geminiData = await geminiRes.json();
            const transcript =
              geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
            return NextResponse.json({
              success: true,
              transcript,
              provider: `Gemini (${model} Audio AI)`,
            });
          }
        } catch (geminiErr) {
          console.warn(`Gemini (${model}) audio transcription attempt failed:`, geminiErr);
        }
      }
    }

    // 3. Try OpenAI Whisper (whisper-1)
    const openaiKey = (provider === "openai" ? key : process.env.OPENAI_API_KEY)?.trim();
    if (openaiKey && openaiKey.length > 5) {
      try {
        const openaiFormData = new FormData();
        const audioBlob = new Blob([buffer], { type: file.type || "audio/webm" });
        openaiFormData.append("file", audioBlob, "speech.webm");
        openaiFormData.append("model", "whisper-1");

        const openaiRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
          },
          body: openaiFormData,
        });

        if (openaiRes.ok) {
          const data = await openaiRes.json();
          const transcript = (data.text || "").trim();
          return NextResponse.json({
            success: true,
            transcript,
            provider: "OpenAI Whisper",
          });
        }
      } catch (openaiErr) {
        console.warn("OpenAI Whisper attempt failed:", openaiErr);
      }
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "No Whisper or Gemini API key configured for speech transcription. Please activate a free Groq or Gemini key in Settings.",
      },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process audio transcription" },
      { status: 500 }
    );
  }
}
