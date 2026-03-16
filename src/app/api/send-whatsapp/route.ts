import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { phone, message } = await request.json();

    if (!process.env.FONNTE_TOKEN) {
      console.error("[SERVER] WhatsApp Error: Variabel FONNTE_TOKEN tidak ditemukan di environment (.env)");
      return NextResponse.json(
        { 
          success: false, 
          error: "Konfigurasi token tidak ditemukan di server. Pastikan FONNTE_TOKEN sudah diatur di environment Firebase/Server." 
        }, 
        { status: 500 }
      );
    }

    console.log(`[SERVER] Menghubungi Fonnte untuk mengirim pesan ke ${phone}...`);

    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: process.env.FONNTE_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target: phone,
        message: message,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[SERVER] Error dari API Fonnte:", data);
      return NextResponse.json(
        { success: false, error: data.reason || "Terjadi kesalahan pada API Fonnte", detail: data }, 
        { status: response.status }
      );
    }

    console.log(`[SERVER] WhatsApp berhasil diteruskan ke Fonnte untuk ${phone}.`);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[SERVER] Critical API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: error.message }, 
      { status: 500 }
    );
  }
}
