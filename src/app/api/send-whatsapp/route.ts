import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { phone, message } = await request.json();

    if (!process.env.FONNTE_TOKEN) {
      console.error("WhatsApp Error: FONNTE_TOKEN is not defined in .env");
      return NextResponse.json({ success: false, error: "Token not configured" }, { status: 500 });
    }

    // Memanggil API Fonnte dari sisi server
    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: process.env.FONNTE_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target: phone,
        message: message,
        // Parameter 'url' dihapus karena Fonnte memerlukan URL publik yang bisa diakses internet
        // Jika ingin menggunakan gambar, pastikan menggunakan URL lengkap (https://...)
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Fonnte API Error Response:", data);
      return NextResponse.json({ success: false, data }, { status: response.status });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("WhatsApp API Route Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
