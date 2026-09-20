import { NextResponse } from "next/server";

const backendUrl = process.env.NEXT_PUBLIC_AI_ENGINE_URL || "http://127.0.0.1:8000";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const res = await fetch(`${backendUrl}/api/attendance/fill-status`, {
      method: "POST",
      headers: {
        "X-API-Key": process.env.AI_ENGINE_API_KEY || "",
      },
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Backend Fill-Status Error:", errorText);
      return NextResponse.json(
        { error: `Gagal mengisi status: ${res.status} - ${errorText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Next.js Proxy Fill-Status Error:", error.message);
    return NextResponse.json(
      { error: "Gagal menyambung ke server AI Engine" },
      { status: 500 }
    );
  }
}
