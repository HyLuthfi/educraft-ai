import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ format: string }> }) {
  try {
    const { format } = await params; // "pdf" or "docx"
    const body = await req.json();
    
    if (format !== "pdf" && format !== "docx") {
      return NextResponse.json({ error: "Format tidak didukung" }, { status: 400 });
    }

    const backendUrl = process.env.NEXT_PUBLIC_AI_ENGINE_URL || "http://127.0.0.1:8000";
    
    const res = await fetch(`${backendUrl}/api/export/${format}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.AI_ENGINE_API_KEY || "", 
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Backend Error:", errorText);
      return NextResponse.json(
        { error: `Backend Python Gagal: ${res.status} - ${errorText}` },
        { status: res.status }
      );
    }

    // Proxy the response as a blob/buffer
    const arrayBuffer = await res.arrayBuffer();
    const headers = new Headers();
    
    if (format === "pdf") {
      headers.set("Content-Type", "application/pdf");
      headers.set("Content-Disposition", "attachment; filename=soal-educraft.pdf");
    } else {
      headers.set("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      headers.set("Content-Disposition", "attachment; filename=soal-educraft.docx");
    }

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: headers,
    });
    
  } catch (error: any) {
    console.error("Next.js Proxy Error:", error.message);
    return NextResponse.json(
      { error: "Gagal menyambung ke server AI Engine" },
      { status: 500 }
    );
  }
}
