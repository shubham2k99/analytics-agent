"use client";

import { useEffect, useState } from "react";
import Chat from "@/components/Chat";

interface GA4Property {
  propertyId: string;
  displayName: string;
  accountName: string;
}

interface SessionState {
  connected: boolean;
  properties?: GA4Property[];
  selectedPropertyId?: string | null;
  selectedPropertyName?: string | null;
  hasAnthropicKey?: boolean;
  usingOwnKey?: boolean;
  error?: string;
}

export default function Home() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [keyError, setKeyError] = useState("");
  const [savingKey, setSavingKey] = useState(false);

  async function loadSession() {
    const res = await fetch("/api/session");
    setSession(await res.json());
  }

  useEffect(() => {
    loadSession();
  }, []);

  async function selectProperty(p: GA4Property) {
    await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId: p.propertyId, propertyName: p.displayName }),
    });
    loadSession();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    loadSession();
  }

  async function saveKey() {
    setKeyError("");
    setSavingKey(true);
    try {
      const res = await fetch("/api/session/anthropic-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anthropicApiKey: keyInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setKeyError(data.error || "Something went wrong.");
      } else {
        setKeyInput("");
        loadSession();
      }
    } finally {
      setSavingKey(false);
    }
  }

  if (!session) {
    return (
      <div className="h-screen grid-paper flex items-center justify-center">
        <p className="font-data text-sm" style={{ color: "var(--ink-faint)" }}>loading…</p>
      </div>
    );
  }

  if (!session.connected) {
    return (
      <div className="h-screen grid-paper flex flex-col px-6">
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="text-center max-w-md">
            <h1 className="font-display text-4xl mb-4" style={{ color: "var(--ink)" }}>
              GAnalyst
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: "var(--ink-muted)" }}>
              Connect Google Analytics and ask GAnalyst what's driving growth, where
              engagement is dropping off, and what to look into next.
            </p>
          </div>
          <a
            href="/api/auth/google"
            className="px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--ink)", borderRadius: "2px" }}
          >
            Connect Google Analytics
          </a>
          {session.error && (
            <p className="font-data text-xs" style={{ color: "#b4483a" }}>{session.error}</p>
          )}

          <button
            onClick={() => setShowAbout(!showAbout)}
            className="font-data text-xs uppercase tracking-wide underline underline-offset-4"
            style={{ color: "var(--ink-faint)" }}
          >
            {showAbout ? "Hide" : "About this project"}
          </button>

          {showAbout && (
            <div
              className="max-w-md text-sm leading-relaxed text-left p-5 flex flex-col gap-4"
              style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
            >
              <p style={{ color: "var(--ink)" }}>
                GAnalyst is an AI agent that gets your ad hoc analytics requests done
                fast — it connects to Google Analytics 4 via OAuth, translates a plain-English
                question into a real GA4 Data API report, and returns a written answer,
                a chart, and a quick suggestion on what's worth looking into next. Built
                with Next.js and Claude's tool-use API, so the model decides what data
                to fetch and the app executes the real query, rather than guessing at numbers.
              </p>
              <div className="flex gap-3">
                <a
                  href="https://github.com/shubham2k99/analytics-agent"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-data text-xs px-4 py-2 text-center flex-1"
                  style={{ border: "1px solid var(--ink)", color: "var(--ink)" }}
                >
                  GitHub repo
                </a>
                <a
                  href="https://shubham2k99.github.io/analytics-agent/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-data text-xs px-4 py-2 text-center flex-1 text-white"
                  style={{ background: "var(--ink)" }}
              >
                Behind the Project
              </a>
            </div>
          </div>
        )}
        </div>

        <p className="font-data text-xs text-center py-4" style={{ color: "var(--ink-faint)" }}>
          Live access requires your own Google + Anthropic credentials and is currently
          limited to approved testers — to run this yourself, follow the{" "}
          <a
            href="https://github.com/shubham2k99/analytics-agent#readme"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            style={{ color: "var(--accent-ink)" }}
          >
            setup guide on GitHub
          </a>.
        </p>
      </div>
    );
  }

  if (!session.selectedPropertyId) {
    return (
      <div className="h-screen grid-paper flex flex-col items-center justify-center gap-4 px-6">
        <h1 className="font-display text-2xl mb-2" style={{ color: "var(--ink)" }}>
          Choose a property
        </h1>
        <div className="w-full max-w-md space-y-2">
          {(session.properties ?? []).map((p) => (
            <button
              key={p.propertyId}
              onClick={() => selectProperty(p)}
              className="block w-full text-left px-4 py-3 transition-colors"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: "2px",
              }}
            >
              <div className="font-medium text-sm" style={{ color: "var(--ink)" }}>{p.displayName}</div>
              <div className="font-data text-xs mt-0.5" style={{ color: "var(--ink-faint)" }}>{p.accountName}</div>
            </button>
          ))}
          {(session.properties ?? []).length === 0 && (
            <p className="text-sm text-center" style={{ color: "var(--ink-muted)" }}>
              No GA4 properties found on this Google account.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!session.hasAnthropicKey) {
    return (
      <div className="h-screen grid-paper flex flex-col items-center justify-center gap-4 px-6">
        <div className="text-center max-w-md">
          <h1 className="font-display text-2xl mb-3" style={{ color: "var(--ink)" }}>
            Add your Anthropic API key
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "var(--ink-muted)" }}>
            The chat is powered by Claude, and this demo runs on a bring-your-own-key
            basis — your key is stored only in your own encrypted session, never on a
            server database, and never shared. Get one free at{" "}
            <a
              href="https://console.anthropic.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: "var(--accent-ink)" }}
            >
              console.anthropic.com
            </a>.
          </p>
        </div>
        <div className="w-full max-w-md flex flex-col gap-2">
          <input
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="sk-ant-..."
            type="password"
            className="w-full px-4 py-2.5 text-sm font-data focus:outline-none"
            style={{ border: "1px solid var(--line)", color: "var(--ink)", background: "var(--surface)" }}
          />
          <button
            onClick={saveKey}
            disabled={savingKey || !keyInput.trim()}
            className="px-6 py-3 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: "var(--ink)" }}
          >
            {savingKey ? "Saving…" : "Continue"}
          </button>
          {keyError && (
            <p className="font-data text-xs" style={{ color: "#b4483a" }}>{keyError}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: "var(--surface)" }}>
      <header className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--line)" }}>
        <div>
          <h1 className="font-display text-lg leading-none" style={{ color: "var(--ink)" }}>GAnalyst</h1>
          <p className="font-data text-xs mt-1" style={{ color: "var(--accent-ink)" }}>{session.selectedPropertyName}</p>
        </div>
        <div className="flex gap-4 items-center">
          <button
            onClick={() => setSession({ ...session, selectedPropertyId: null })}
            className="font-data text-xs uppercase tracking-wide"
            style={{ color: "var(--ink-faint)" }}
          >
            Switch
          </button>
          <button onClick={logout} className="font-data text-xs uppercase tracking-wide" style={{ color: "var(--ink-faint)" }}>
            Disconnect
          </button>
        </div>
      </header>
      <div className="brass-rule" />
      <div className="flex-1 min-h-0">
        <Chat />
      </div>
    </div>
  );
}
