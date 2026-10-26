import { useEffect, useRef, useState } from "react";
import { createConversationForSession, getChatToken, listSharedSessions, SessionChatError, type SessionSummary } from "../services/sessionChatApi";
import SessionChatPage from "./SessionChatPage";
import JourneyLoginModal from "./JourneyLoginModal";
import { LOGO } from "../data/journeyData";
import "./PartnerChatsDashboard.css";

export default function PartnerChatsDashboard() {
  const [authenticated, setAuthenticated] = useState(Boolean(getChatToken()));
  const [loginOpen, setLoginOpen] = useState(false);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [creating, setCreating] = useState(false);
  const [revision, setRevision] = useState(0);
  const cursor = useRef(0);
  useEffect(() => {
    if (!authenticated) return;
    const controller = new AbortController();
    let active = true, busy = false;
    async function refresh() {
      if (busy || document.hidden) return;
      busy = true; setLoading(true);
      try {
        const page = await listSharedSessions(query, 0, controller.signal);
        if (!active) return;
        setSessions(page.sessions); setOffset(page.nextOffset); cursor.current = page.nextOffset; setHasMore(page.hasMore); setError("");
      } catch (err) {
        if (!active) return;
        if (err instanceof SessionChatError && err.status === 401) { setAuthenticated(false); setSessions([]); setSelected(""); setLoginOpen(true); }
        setError(err instanceof Error ? err.message : "Unable to load your conversations.");
      } finally { busy = false; if (active) setLoading(false); }
    }
    const debounce = setTimeout(() => void refresh(), 250);
    const timer = setInterval(() => { if (cursor.current <= 30) void refresh(); }, 10000);
    return () => { active = false; controller.abort(); clearTimeout(debounce); clearInterval(timer); };
  }, [authenticated, query, revision]);
  async function more() {
    if (loading) return;
    setLoading(true);
    try {
      const page = await listSharedSessions(query, offset);
      setSessions(prev => [...new Map([...prev, ...page.sessions].map(s => [s.sessionId, s])).values()]);
      setOffset(page.nextOffset); cursor.current = page.nextOffset; setHasMore(page.hasMore); setError("");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load more chats."); }
    finally { setLoading(false); }
  }
  async function newConversation() {
    if (!selected || creating) return;
    setCreating(true);
    try { const created = await createConversationForSession(selected); setSelected(created.sessionId); setQuery(""); setRevision(n => n + 1); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to start a conversation."); }
    finally { setCreating(false); }
  }
  return <div className={`pc-dashboard ${selected ? "pc-has-selection" : ""}`}>
    <header className="pc-header"><a href="/" className="pc-brand"><img src={LOGO} alt="OXY Journeys" /></a><div><span className="pc-label">YOUR CONNECTIONS</span><h1>Partner chats</h1></div><a href="/">Explore journeys ↗</a></header>
    <main className="pc-layout">
      <aside className="pc-inbox"><div className="pc-inbox-heading"><h2>Conversations</h2><button onClick={() => setRevision(n => n + 1)} disabled={loading} aria-label="Refresh chats">↻</button></div>
        <div className="pc-search"><span aria-hidden="true">⌕</span><input aria-label="Search conversations" placeholder="Search people or journeys" value={query} onChange={e => setQuery(e.target.value)} />{query && <button type="button" className="pc-search-clear" onClick={() => setQuery("")} aria-label="Clear search">×</button>}</div>
        <p className="pc-hint">Pick up where you left off.</p>
        {error && <div className="pc-error" role="alert">{error}<button onClick={() => setRevision(n => n + 1)}>Try again</button></div>}
        {!authenticated ? <div className="pc-empty"><h3>Your conversations, together.</h3><p>Sign in to see every journey you share with your journey partners.</p><button onClick={() => setLoginOpen(true)}>Sign in</button></div> : <div className="pc-list" aria-busy={loading}>
          {loading && !sessions.length ? <div className="pc-skeleton" role="status" aria-label="Loading conversations"><i /><i /><i /></div> : !sessions.length && !error ? <div className="pc-empty"><h3>{query ? "No matching conversations" : "Your chats will appear here"}</h3><p>{query ? "Try a person’s name or journey." : "Open your conversation link from WhatsApp to begin."}</p></div> : sessions.map(session => {
            const other = session.participants.find(p => p.userId !== session.currentUserId);
            return <button key={session.sessionId} className={`pc-row ${selected === session.sessionId ? "is-selected" : ""}`} onClick={() => setSelected(session.sessionId)} aria-pressed={selected === session.sessionId}>
              <span className="pc-avatar">{other?.name.charAt(0).toUpperCase() || "J"}</span><span className="pc-row-body"><span className="pc-row-top"><strong>{other?.name || "Journey participant"}</strong><time>{session.updatedAt ? new Date(session.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}</time></span><span className="pc-title">{session.title}</span><span className="pc-preview">{session.lastMessage?.content || "Start this conversation"}</span><span className="pc-started">{session.createdAt ? `Started ${new Date(session.createdAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : "Your shared journey"}</span></span>
            </button>;
          })}
          {hasMore && <button className="pc-more" disabled={loading} onClick={() => void more()}>{loading ? "Loading…" : "Load more chats"}</button>}
        </div>}
      </aside>
      <section className="pc-detail" aria-label="Selected conversation">{selected ? <><div className="pc-detail-tools"><button onClick={() => setSelected("")} className="pc-back">← Chats</button><a href={`/oxy-journey/chat/${encodeURIComponent(selected)}`}>Open chat ↗</a><button onClick={() => void newConversation()} disabled={creating}>{creating ? "Starting…" : "Start another conversation"}</button></div><SessionChatPage key={selected} sessionId={selected} embedded /></> : <div className="pc-welcome"><span className="pc-welcome-icon">↗</span><span className="pc-label">ROOM FOR YOUR NEXT STEP</span><h2>One connection.<br />Many journeys.</h2><p>Choose a conversation to pick up where you left off. Each conversation keeps its own messages, so you can explore a new journey with the same person.</p><span className="pc-welcome-note">Your people. Your journeys. Your conversations.</span></div>}</section>
    </main>
    <JourneyLoginModal sessionId="" open={loginOpen} onClose={() => setLoginOpen(false)} onSuccess={auth => { if (!auth.accessToken) throw new Error("Login did not return an access token."); setLoginOpen(false); setAuthenticated(true); }} />
  </div>;
}
