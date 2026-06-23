import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const prompt = searchParams.get("prompt");

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const backendUrl = process.env.NEXT_PUBLIC_AI_ENGINE_URL || "http://127.0.0.1:8000";
    
    const res = await fetch(`${backendUrl}/api/generate_image?prompt=${encodeURIComponent(prompt)}`, {
      method: "GET",
      headers: {
        "X-API-Key": process.env.AI_ENGINE_API_KEY || "", 
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Backend Image Error:", errorText);
      return NextResponse.json(
        { error: `Backend Python Gagal: ${res.status} - ${errorText}` },
        { status: res.status }
      );
    }

    // Return the raw image blob
    const imageBlob = await res.blob();
    return new NextResponse(imageBlob, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
    
  } catch (error: any) {
    console.error("Next.js Proxy Error:", error.message);
    return NextResponse.json(
      { error: "Gagal menyambung ke server AI Engine untuk gambar" },
      { status: 500 }
    );
  }
}
