"use client";

import { useState } from "react";
import { MessageCircle, Send, Bot, User } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AIChatSupport() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Bonjour ! Je suis l'assistant IA de CinéMax. Comment puis-je t'aider aujourd'hui ?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, history: messages }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || "Désolé, une erreur s'est produite." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Désolé, je ne peux pas répondre pour le moment." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-10 rounded-2xl border border-white/10 bg-zinc-900/60 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <MessageCircle className="h-5 w-5 text-violet-400" />
        <h2 className="text-lg font-semibold text-white">Assistant IA CinéMax</h2>
        <span className="ml-auto text-xs text-zinc-500">Réponse automatique</span>
      </div>

      <div className="h-80 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "assistant" && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/20">
                <Bot className="h-4 w-4 text-violet-400" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-800 text-zinc-200"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
            {msg.role === "user" && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700">
                <User className="h-4 w-4 text-zinc-300" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/20">
              <Bot className="h-4 w-4 text-violet-400" />
            </div>
            <div className="rounded-2xl bg-zinc-800 px-4 py-2 text-sm text-zinc-400">
              En train d&apos;écrire...
            </div>
          </div>
        )}
      </div>

      <form onSubmit={sendMessage} className="flex gap-2 border-t border-white/10 p-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Posez votre question..."
          className="flex-1 rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex items-center justify-center rounded-lg bg-violet-600 px-4 py-2 text-white hover:bg-violet-700 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
