import { NextRequest, NextResponse } from "next/server";
import { audioStore } from "@/lib/engine/audio-store";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const item = await audioStore.getArtifact(params.id);

    if (!item || !item.buffer) {
      return NextResponse.json(
        { error: "Audio artifact not found" },
        { status: 404 }
      );
    }

    const contentType =
      item.artifact.audio_format === "wav" ? "audio/wav" : "audio/mpeg";

    return new NextResponse(new Uint8Array(item.buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": item.buffer.length.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
