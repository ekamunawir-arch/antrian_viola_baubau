/**
 * @fileOverview Service untuk mengirim pesan WhatsApp menggunakan Fonnte API.
 * File ini disiapkan untuk integrasi notifikasi antrian di masa mendatang.
 */

const FONNTE_API = "https://api.fonnte.com/send";
const FONNTE_TOKEN = process.env.FONNTE_TOKEN;

/**
 * Mengirim pesan WhatsApp melalui API Fonnte.
 * @param phone Nomor WhatsApp tujuan (format: 08xxx atau 628xxx).
 * @param message Isi pesan yang akan dikirim.
 * @returns Object response dari Fonnte atau null jika terjadi kesalahan.
 */
export async function sendWhatsAppMessage(
  phone: string,
  message: string
) {
  try {
    const response = await fetch(FONNTE_API, {
      method: 'POST',
      headers: {
        'Authorization': FONNTE_TOKEN || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: phone,
        message: message,
        // URL gambar opsional, disesuaikan dengan instruksi prompt Anda
        url: "/Antrian-Viola.png" 
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("WhatsApp send error:", error);
    return null;
  }
}
