import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  getPartnerUsers,
  getPartnerUsersByMobile,
  getDirectChat,
  sendDirectChatMessage,
  STREAM_API_ROOT,
  type PartnerUserSummary,
  type DirectChatMessage,
} from "../services/vibeCodeApi";
import { LOGO } from "../data/journeyData";
import "./PartnerUsersDashboard.css";

function formatDate(raw: string | null): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: string | null): string {
  if (!status) return "Unknown";
  if (status === "PERSON_MATCHED") return "Matched";
  if (status === "CANDIDATES_SHOWN") return "Reviewing";
  if (status === "NO_MATCH_FOUND") return "No Match";
  if (status === "STARTED") return "In Progress";
  return status;
}

function statusClass(status: string | null): string {
  if (status === "PERSON_MATCHED") return "pud-badge pud-badge--matched";
  if (status === "CANDIDATES_SHOWN") return "pud-badge pud-badge--reviewing";
  if (status === "NO_MATCH_FOUND") return "pud-badge pud-badge--nomatch";
  return "pud-badge pud-badge--started";
}

type ChatPanelProps = { sessionId: string; userName: string | null };

const messageTime = (raw: unknown): number => {
  if (Array.isArray(raw)) return new Date(Number(raw[0]), Number(raw[1]) - 1, Number(raw[2]), Number(raw[3] || 0), Number(raw[4] || 0), Number(raw[5] || 0)).getTime() || 0;
  return raw ? Date.parse(String(raw)) || 0 : 0;
};
const clock = (raw: unknown) => {
  const t = messageTime(raw);
  return t ? new Date(t).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "";
};
const messageKey = (m: DirectChatMessage) => String(m.id ?? `${m.senderType}-${m.createdAt}-${m.message}`);
const byTime = (a: DirectChatMessage, b: DirectChatMessage) => messageTime(a.createdAt) - messageTime(b.createdAt);

function ChatPanel({ sessionId, userName }: ChatPanelProps) {
  const [messages, setMessages] = useState<DirectChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [live, setLive] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const addMessages = (incoming: DirectChatMessage[]) =>
    setMessages(prev => {
      const map = new Map(prev.map(m => [messageKey(m), m]));
      for (const m of incoming) map.set(messageKey(m), m);
      return [...map.values()].sort(byTime);
    });

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setMessages([]);
    const load = () => getDirectChat(sessionId)
      .then((items: DirectChatMessage[]) => { if (active) { setError(""); addMessages(items); } })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Could not load chat history."); })
      .finally(() => { if (active) setLoading(false); });
    void load();

    // New messages appear the moment they are sent (Server-Sent Events); reload after any reconnect.
    let source: EventSource | null = null;
    if (typeof EventSource !== "undefined") {
      source = new EventSource(`${STREAM_API_ROOT}/ai-service/vibe-code/${encodeURIComponent(sessionId)}/stream`);
      source.addEventListener("connected", () => { if (active) { setLive(true); void load(); } });
      source.addEventListener("message", event => {
        try { if (active) addMessages([JSON.parse((event as MessageEvent).data)]); } catch { /* ignore */ }
      });
      source.onerror = () => { if (active) setLive(false); };
    }
    return () => { active = false; source?.close(); };
  }, [sessionId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages.length]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true); setSendError("");
    try {
      const saved = await sendDirectChatMessage(sessionId, {
        message: text,
        senderName: (localStorage.getItem("userName") || "").trim() || messages.find(m => !/^(USER|CUSTOMER)$/i.test(m.senderType || ""))?.senderName || "Partner",
        senderType: "PARTNER",
      });
      setDraft("");
      if (saved) addMessages([saved]);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Could not send. Try again.");
    } finally { setSending(false); }
  }

  return (
    <div className="pud-chat">
      <div className="pud-chat-heading">
        <span className="pud-avatar">{(userName || "U").trim().charAt(0).toUpperCase()}</span>
        <div className="pud-chat-title">
          <h3>Chat with {userName || "User"}</h3>
          <span className="pud-chat-sub">Direct conversation after matching</span>
        </div>
        <span className={`pud-live-pill ${live ? "is-on" : ""}`}><i />{live ? "Live" : "Connecting…"}</span>
      </div>
      {loading && <div className="pud-chat-loading">Loading messages…</div>}
      {error && <div className="pud-chat-error">{error}</div>}
      {!loading && !error && messages.length === 0 && (
        <div className="pud-chat-empty">No messages yet. Say hello below — it reaches {userName || "the user"} instantly.</div>
      )}
      {!loading && messages.length > 0 && (
        <div className="pud-messages">
          {messages.map((msg) => {
            const senderType = (msg.senderType || "").toUpperCase();
            const isUser = senderType === "USER" || senderType === "CUSTOMER";
            const role = isUser ? "user" : "partner";
            const label = isUser ? (userName || "User") : (msg.senderName || "Partner");
            return (
              <div key={messageKey(msg)} className={`pud-msg pud-msg--${role}`}>
                <span className="pud-msg-label">{label}</span>
                <p className="pud-msg-text">{msg.message}</p>
                <time className="pud-msg-time">{clock(msg.createdAt)}</time>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      )}
      <form className="pud-composer" onSubmit={send}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder={`Reply to ${userName || "user"}…`}
          maxLength={4000}
          aria-label="Write a reply"
        />
        <button type="submit" disabled={sending || !draft.trim()}>{sending ? "Sending…" : "Send"}</button>
      </form>
      {sendError && <div className="pud-send-error" role="alert">{sendError}</div>}
    </div>
  );
}

export default function PartnerUsersDashboard() {
  // ?mobile= is the primary identifier (sent in WhatsApp link, always populated).
  // ?id= is kept as fallback for older links that used personId.
  const params = new URLSearchParams(window.location.search);
  const partnerMobile = params.get("mobile") ?? "";
  const partnerId = params.get("id") ?? "";

  const [users, setUsers] = useState<PartnerUserSummary[]>([]);
  const [filtered, setFiltered] = useState<PartnerUserSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<PartnerUserSummary | null>(null);
  const [query, setQuery] = useState("");

  const hasIdentifier = Boolean(partnerMobile || partnerId);

  useEffect(() => {
    if (!hasIdentifier) return;
    let active = true;
    setLoading(true);
    setError("");
    const fetch = partnerMobile
      ? getPartnerUsersByMobile(partnerMobile)
      : getPartnerUsers(partnerId);
    fetch
      .then((data) => {
        if (!active) return;
        setUsers(data);
        setFiltered(data);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Could not load users.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [partnerId, partnerMobile]);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) { setFiltered(users); return; }
    setFiltered(
      users.filter(
        (u) =>
          (u.userName ?? "").toLowerCase().includes(q) ||
          (u.journeyCategoryValue ?? "").toLowerCase().includes(q)
      )
    );
  }, [query, users]);

  return (
    <div className={`pud-root ${selected ? "pud-has-selection" : ""}`}>
      <header className="pud-header">
        <a href="/" className="pud-brand"><img src={LOGO} alt="OXY Journeys" /></a>
        <div>
          <span className="pud-label">YOUR CONNECTIONS</span>
          <h1>Matched users</h1>
        </div>
        <a href="/oxy-journey">Explore journeys ↗</a>
      </header>

      <main className="pud-layout">
        <aside className="pud-sidebar">
          <div className="pud-sidebar-heading">
            <h2>Users ({filtered.length})</h2>
          </div>

          <div className="pud-search">
            <span aria-hidden="true">⌕</span>
            <input
              aria-label="Search users"
              placeholder="Search by name or journey"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                className="pud-search-clear"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >×</button>
            )}
          </div>

          {!hasIdentifier && (
            <div className="pud-gate">
              <p>No partner ID found. Please open this page using the link sent to you on WhatsApp.</p>
            </div>
          )}

          {hasIdentifier && loading && (
            <div className="pud-skeleton" role="status" aria-label="Loading">
              <i /><i /><i />
            </div>
          )}

          {hasIdentifier && error && (
            <div className="pud-error" role="alert">{error}</div>
          )}

          {hasIdentifier && !loading && !error && filtered.length === 0 && (
            <div className="pud-empty">
              <h3>{query ? "No matching users" : "No users yet"}</h3>
              <p>{query ? "Try a different search." : "Users matched to you will appear here."}</p>
            </div>
          )}

          {hasIdentifier && !loading && filtered.length > 0 && (
            <ul className="pud-list">
              {filtered.map((u) => {
                const sid = u.sessionId ?? "";
                const isActive = selected?.sessionId === sid;
                return (
                  <li key={sid}>
                    <button
                      className={`pud-row ${isActive ? "pud-row--active" : ""}`}
                      onClick={() => setSelected(isActive ? null : u)}
                      aria-pressed={isActive}
                    >
                      <span className="pud-avatar">
                        {(u.userName ?? "U").charAt(0).toUpperCase()}
                      </span>
                      <span className="pud-row-body">
                        <span className="pud-row-top">
                          <strong>{u.userName || "Anonymous"}</strong>
                          <time>{formatDate(u.matchedAt)}</time>
                        </span>
                        <span className="pud-category">
                          {u.journeyCategoryValue || "General Journey"}
                        </span>
                        <span className={statusClass(u.leadStatus)}>
                          {statusLabel(u.leadStatus)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <section className="pud-detail" aria-label="User conversation">
          {selected && selected.sessionId ? (
            <>
              <div className="pud-detail-tools">
                <button className="pud-back" onClick={() => setSelected(null)}>← Users</button>
                <a className="pud-live-btn" href={`/oxy-journey/chat/${encodeURIComponent(selected.sessionId)}/partner`}>
                  <span className="pud-live-dot" /> Open live chat <span aria-hidden="true">↗</span>
                </a>
              </div>
              <ChatPanel
                key={selected.sessionId}
                sessionId={selected.sessionId}
                userName={selected.userName}
              />
            </>
          ) : (
            <div className="pud-welcome">
              <span className="pud-welcome-icon">↗</span>
              <span className="pud-label">CHAT HISTORY</span>
              <h2>Select a user<br />to view your chat.</h2>
              <p>
                See the direct conversation you had with each matched user
                after connecting on OXY Journey.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
