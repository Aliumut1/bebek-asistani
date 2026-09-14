"use client";

import { useMemo, useState } from "react";

type Role = "user" | "assistant";
type Msg = { role: Role; content: string };

export default function Home() {
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Merhaba! Yeni anneler için bebek asistanıyım. Bebeğiniz kaç aylık ve şu an ne oluyor?",
    },
  ]);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  async function send() {
    if (!canSend) return;

    const text = input.trim();
    setInput("");

    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      const data: unknown = await res.json();

      if (!res.ok) {
        const msg =
          typeof data === "object" && data && "reply" in data && typeof (data as any).reply === "string"
            ? (data as any).reply
            : "Sunucu hatası oldu (API).";
        setMessages([...next, { role: "assistant", content: msg }]);
        return;
      }

      const reply =
        typeof data === "object" && data && "reply" in data && typeof (data as any).reply === "string"
          ? (data as any).reply
          : "Cevap formatı beklenmedik geldi.";

      setMessages([...next, { role: "assistant", content: reply }]);
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "Bağlantı sorunu oluştu. Lütfen tekrar dener misiniz?" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-4">
          <div className="text-lg">Bebek Asistanı</div>
          <div className="text-sm text-zinc-400">
            Bu asistan tıbbi teşhis yerine geçmez.
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="h-[60vh] space-y-3 overflow-auto pr-2">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-900"
                      : "max-w-[85%] rounded-2xl bg-zinc-800 px-4 py-3 text-sm"
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-zinc-800 px-4 py-3 text-sm">
                  Yazıyor...
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              placeholder="Örn: 3 haftalık, 20 dk önce emdi, altı temiz, gaz çıkarmadık"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none"
            />
            <button
              onClick={send}
              disabled={!canSend}
              className="rounded-xl bg-zinc-100 px-4 py-3 text-sm text-zinc-900 disabled:opacity-40"
            >
              Gönder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
