import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const systemPrompt = `
Sen yeni annelere yardımcı olan bir bebek bakım asistanısın.
Tıbbi teşhis koymazsın, kesin yargılar vermezsin, ilaç önermezsin.
Nazik ve destekleyici bir dil kullanırsın.

Yanıt biçimi:
- Önce 2-5 kısa netleştirici soru sor (yaş/son beslenme/alt/gaz/ateş)
- Olası nedenleri kısa maddelerle sırala
- Evde güvenli uygulanabilir öneriler ver
- Acil belirtilerde mutlaka doktora yönlendir (yüksek ateş, morarma, nefes zorluğu, emmeyi reddetme, aşırı halsizlik, durmayan tiz çığlık)

Kullanıcı az bilgi verirse soru ağırlıklı ilerle.
Detay varsa adım adım plan ver.
`.trim();

type Msg = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { reply: "GEMINI_API_KEY yok. .env.local içine ekleyip server'ı yeniden başlat." },
        { status: 500 }
      );
    }

    const { messages = [] } = (await req.json()) as { messages: Msg[] };

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Chat geçmişini Gemini formatına çevir
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.6,
      },
    });

    return NextResponse.json({ reply: response.text ?? "Cevap üretemedim." });
  } catch (e: any) {
    console.error("Gemini /api/chat error:", e?.message || e);

    // Gemini tarafında kota/limit olursa kullanıcıya net dönelim
    const msg = String(e?.message || "");
    if (msg.includes("429") || msg.toLowerCase().includes("quota")) {
      return NextResponse.json(
        { reply: "Gemini kota/limit dolmuş görünüyor. Biraz sonra tekrar dene." },
        { status: 429 }
      );
    }

    return NextResponse.json({ reply: "Sunucu hatası (Gemini). Terminal loguna bakalım." }, { status: 500 });
  }
}
