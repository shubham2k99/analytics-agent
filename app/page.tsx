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
  error?: string;
}

export default function Home() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [showAbout, setShowAbout] = useState(false);

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

  if (!session) {
    return (
      <div className="h-screen grid-paper flex items-center justify-center">
        <p className="font-data text-sm" style={{ color: "var(--ink-faint)" }}>loading…</p>
      </div>
    );
  }

  if (!session.connected) {
    return (
      <div className="h-screen grid-paper flex flex-col items-center justify-center gap-6 px-6">
        <div className="text-center max-w-md">
          <p className="font-data text-xs tracking-widest uppercase mb-3" style={{ color: "var(--accent-ink)" }}>
            Instrument · GA4 reader
          </p>
          <h1 className="font-display text-4xl mb-4" style={{ color: "var(--ink)" }}>
            GAnalyst
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "var(--ink-muted)" }}>
            Connect Google Analytics to ask questions about your site's traffic in plain
            English, and get answers, charts, and summaries back.
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
              GAnalyst is an AI agent that connects to Google Analytics 4 and answers
              plain-English questions about a site's traffic, generating charts and
              summaries on the fly.
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
                Read the full story
              </a>
            </div>
          </div>
        )}
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
