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

    const { key, provider, baseUrl } = getLlmApiKey();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Qwen Audio Transcription (qwen-audio-turbo / Qwen2-Audio)
    const qwenKey = (provider === "qwen" ? key : process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY)?.trim();
    if (qwenKey && qwenKey.length > 5) {
      const base64Audio = buffer.toString("base64");
      const mimeType = file.type?.includes("wav") ? "audio/wav" : "audio/webm";

      const candidateModels = ["qwen-audio-turbo", "qwen2-audio-instruct"];
      for (const model of candidateModels) {
        try {
          const endpoint = `${(baseUrl || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1").replace(/\/+$/, "")}/chat/completions`;
          const qwenRes = await fetch(endpoint, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${qwenKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "audio_url",
                      audio_url: {
                        url: `data:${mimeType};base64,${base64Audio}`,
                      },
                    },
                    {
                      type: "text",
                      text: "Transcribe the spoken audio verbatim into plain text. Output ONLY the exact transcribed words spoken, with no markdown, quotes, preamble, or metadata.",
                    },
                  ],
                },
              ],
              temperature: 0.1,
              max_tokens: 250,
            }),
          });

          if (qwenRes.ok) {
            const data = await qwenRes.json();
            const transcript = data?.choices?.[0]?.message?.content?.trim() || "";
            if (transcript) {
              return NextResponse.json({
                success: true,
                transcript,
                provider: `Qwen Audio (${model})`,
              });
            }
          }
        } catch (qwenErr) {
          console.warn(`Qwen (${model}) audio transcription attempt failed:`, qwenErr);
        }
      }
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "No Qwen API key configured for speech transcription. Please activate your Qwen key in Settings.",
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
