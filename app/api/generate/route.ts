import { NextResponse } from "next/server";
import { buatSupabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const supabase = await buatSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user && body.konten_materi) {
      const { data: existing } = await supabase
        .from("bank_materi")
        .select("id")
        .eq("user_id", user.id)
        .eq("konten_mentah", body.konten_materi)
        .single();
        
      if (!existing) {
        let judul = body.konten_materi.substring(0, 50).trim();
        if (body.konten_materi.length > 50) judul += "...";
        
        await supabase.from("bank_materi").insert({
          user_id: user.id,
          judul: judul,
          jenis_sumber: "teks",
          konten_mentah: body.konten_materi
        });
      }
    }

    
    const backendUrl = process.env.NEXT_PUBLIC_AI_ENGINE_URL || "http://127.0.0.1:8000";
    
    const res = await fetch(`${backendUrl}/api/generate`, {
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

    const data = await res.json();
    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error("Next.js Proxy Error:", error.message);
    return NextResponse.json(
      { error: "Gagal menyambung ke server AI Engine" },
      { status: 500 }
    );
  }
}
