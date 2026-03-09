import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { phone, message } = await request.json();

    if (!process.env.FONNTE_TOKEN) {
      console.error("WhatsApp Error: FONNTE_TOKEN is not defined in .env");
      return NextResponse.json({ success: false, error: "Token not configured" }, { status: 500 });
    }

    console.log(`Attempting to send WhatsApp to ${phone}...`);

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
        // Gunakan URL gambar publik yang valid agar Fonnte bisa memprosesnya
        url: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Fonnte API Error Response:", data);
      return NextResponse.json({ success: false, error: data.reason || "Fonnte API error", data }, { status: response.status });
    }

    console.log(`WhatsApp successfully sent to ${phone} via Fonnte.`);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("WhatsApp API Route Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
  }
}