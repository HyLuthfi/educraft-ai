import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_AI_ENGINE_URL || "http://127.0.0.1:8000";
    const body = await req.json();

    const res = await fetch(`${backendUrl}/api/correct`, {
      method: "POST",
      headers: {
        "X-API-Key": process.env.AI_ENGINE_API_KEY || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok || !res.body) {
      const errorText = await res.text();
      console.error("Backend Error:", errorText);
      return NextResponse.json(
        { error: `Backend Python Gagal: ${res.status} - ${errorText}` },
        { status: res.status || 500 }
      );
    }

    // Teruskan stream SSE apa adanya ke client (tanpa buffering).
    return new Response(res.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Next.js Proxy Error:", error.message);
    return NextResponse.json(
      { error: "Gagal menyambung ke server AI Engine" },
      { status: 500 }
    );
  }
}
