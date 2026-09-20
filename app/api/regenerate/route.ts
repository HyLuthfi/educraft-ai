import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const backendUrl = process.env.NEXT_PUBLIC_AI_ENGINE_URL || "http://127.0.0.1:8000";

    const res = await fetch(`${backendUrl}/api/regenerate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.AI_ENGINE_API_KEY || "",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Backend Regenerate Error:", errorText);
      return NextResponse.json(
        { error: `Backend Python Gagal: ${res.status} - ${errorText}` },
        { status: res.status }
      );
    }

    return NextResponse.json(await res.json());
  } catch (error: any) {
    console.error("Next.js Regenerate Proxy Error:", error.message);
    return NextResponse.json(
      { error: "Gagal menyambung ke server AI Engine" },
      { status: 500 }
    );
  }
}
