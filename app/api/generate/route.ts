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
    
    // --- OPSI 2: Download dari Pollinations & Upload ke Supabase ---
    if (data.soal && Array.isArray(data.soal)) {
      const uploadPromises = data.soal.map(async (soalItem: any) => {
        if (soalItem.image_prompt && soalItem.image_prompt.trim() !== "") {
          try {
            // 1. Fetch dari Pollinations
            const promptEncoded = encodeURIComponent(soalItem.image_prompt);
            const pollUrl = `https://image.pollinations.ai/prompt/${promptEncoded}?width=800&height=400&nologo=true&seed=42`;
            const imageRes = await fetch(pollUrl);
            if (!imageRes.ok) throw new Error("Gagal fetch dari Pollinations");
            
            const arrayBuffer = await imageRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            // 2. Upload ke Supabase
            const fileName = `generated_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
            
            const { error: uploadError } = await supabase.storage
              .from("assets")
              .upload(fileName, buffer, {
                contentType: "image/jpeg",
                upsert: false
              });
              
            if (uploadError) {
               console.error("Gagal upload Supabase:", uploadError);
               soalItem.image_url = pollUrl; // Fallback
            } else {
               // 3. Dapatkan Public URL permanen
               const { data: publicUrlData } = supabase.storage
                 .from("assets")
                 .getPublicUrl(fileName);
                 
               soalItem.image_url = publicUrlData.publicUrl;
            }
          } catch (e) {
             console.error("Gagal proses gambar:", e);
             soalItem.image_url = `https://image.pollinations.ai/prompt/${encodeURIComponent(soalItem.image_prompt)}?width=800&height=400&nologo=true&seed=42`;
          }
        }
      });
      
      // Eksekusi semua proses download & upload secara paralel!
      await Promise.all(uploadPromises);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Next.js Proxy Error:", error.message);
    return NextResponse.json(
      { error: "Gagal menyambung ke server AI Engine" },
      { status: 500 }
    );
  }
}
