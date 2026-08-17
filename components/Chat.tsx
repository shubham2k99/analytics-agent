"use client";

import { useState, useRef, useEffect } from "react";
import ChartRenderer from "./ChartRenderer";
import { ChartSpec } from "@/lib/claude";

interface Message {
  role: "user" | "assistant";
  content: string;
  chart?: ChartSpec;
}

const SUGGESTIONS = [
  "How many active users did we get in the last 30 days?",
  "Show me a chart of sessions by day this month",
  "What are our top 5 traffic sources?",
  "Compare this month's users to last month",
];

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (data.error) {
        setMessages((m) => [...m, { role: "assistant", content: `⚠ ${data.error}` }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: data.reply, chart: data.chart }]);
      }
    } catch (err: any) {
      setMessages((m) => [...m, { role: "assistant", content: `⚠ ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  function timestamp() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="flex flex-col h-full grid-paper">
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-2 max-w-md">
            <p className="font-data text-xs uppercase tracking-widest mb-3" style={{ color: "var(--accent-ink)" }}>
              Suggested queries
            </p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="block w-full text-left px-4 py-2.5 text-sm transition-colors"
                style={{ background: "var(--surface)", border: "1px solid var(--line)", color: "var(--ink)" }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={m.role === "user" ? "max-w-[80%]" : "max-w-[92%] w-full"}>
              {m.role === "user" ? (
                <div
                  className="px-4 py-2.5 text-sm"
                  style={{ background: "var(--ink)", color: "#f5f4f0" }}
                >
                  {m.content}
                </div>
              ) : (
                <div
                  className="px-4 py-3 text-sm leading-relaxed"
                  style={{
                    background: "var(--surface)",
                    borderLeft: "3px solid var(--accent)",
                    color: "var(--ink)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  <p className="font-data text-[11px] mb-1.5" style={{ color: "var(--ink-faint)" }}>
                    {timestamp()}
                  </p>
                  {m.content}
                </div>
              )}
              {m.chart && <ChartRenderer chart={m.chart} />}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div
              className="px-4 py-3 text-sm font-data"
              style={{ background: "var(--surface)", borderLeft: "3px solid var(--accent)", color: "var(--ink-muted)" }}
            >
              reading GA4…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="p-3 flex gap-2"
        style={{ borderTop: "1px solid var(--line)", background: "var(--surface)" }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your site's analytics…"
          className="flex-1 px-4 py-2.5 text-sm focus:outline-none"
          style={{ border: "1px solid var(--line)", color: "var(--ink)", background: "var(--bg)" }}
        />
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: "var(--accent)" }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
