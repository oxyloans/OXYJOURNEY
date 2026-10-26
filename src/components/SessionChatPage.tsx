import { useEffect, useRef, useState } from "react";
import Icon3D from "./Icon3D";
import JourneyLoginModal from "./JourneyLoginModal";
import { getChatToken, getSharedSession, getSharedMessages, postSharedMessage, SessionChatError, type SharedMessage, type SharedSession } from "../services/sessionChatApi";
import { LOGO } from "../data/journeyData";
import "./SessionChatPage.css";

type LocalMessage = SharedMessage & { state?: "sending" | "failed"; error?: string };
function Icon({ name, ...props }: { name: "chat" | "send" | "link" | "arrow" | "refresh"; [key: string]: unknown }) {
  const paths = { chat: "M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9H13a8.5 8.5 0 0 1 8 8v.5Z", send: "m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13", link: "M10 13a5 5 0 0 0 7 .5l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7-.5l-3 3a5 5 0 0 0 7 7l2-2", arrow: "m12 19-7-7 7-7M5 12h14", refresh: "M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-2l2 3M4 16l2 3a7 7 0 0 0 12-2" };
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]} /></svg>;
}
function combine(previous: LocalMessage[], incoming: SharedMessage[]) {
  const map = new Map(previous.map(m => [`${m.senderId}:${m.clientMessageId}`, m]));
  for (const message of incoming) map.set(`${message.senderId}:${message.clientMessageId}`, message);
  return [...map.values()].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || (Number(a.id) || 0) - (Number(b.id) || 0));
}
const initialOf = (name?: string) => (name || "").trim().charAt(0).toUpperCase() || "•";
const STARTERS = ["Hello 👋 Thanks for connecting", "When is a good time to talk?", "Could you share a few more details?"];
const dateLabel = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

export default function SessionChatPage({ sessionId, embedded = false }: { sessionId: string; embedded?: boolean }) {
  const valid = /^[A-Za-z0-9_-]{1,128}$/.test(sessionId);
  const [authenticated, setAuthenticated] = useState(Boolean(getChatToken()));
  const [loginOpen, setLoginOpen] = useState(false);
  const [session, setSession] = useState<SharedSession | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState("");
  const [notice, setNotice] = useState("");
  const list = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const followBottom = useRef(true);
  const refresh = useRef<() => void>(() => {});
  const mounted = useRef(true);
  const sendLock = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useEffect(() => {
    setSession(null); setMessages([]); setLastSync(""); setError(""); setBlocked(false);
    if (!valid || !authenticated) { setLoading(false); return; }
    let active = true, busy = false, cursor = "", terminal = false;
    const controller = new AbortController();
    async function sync() {
      if (!active || busy || terminal || !navigator.onLine || document.hidden) return;
      busy = true;
      try {
        const current = await getSharedSession(sessionId, controller.signal);
        if (!active) return;
        setSession(current);
        // Fetch all pages, retaining the server cursor for subsequent refreshes.
        let more = true;
        while (more && active) {
          const page = await getSharedMessages(sessionId, cursor, controller.signal);
          if (!active) return;
          if (page.hasMore && page.nextCursor === cursor) throw new Error("The chat service returned an invalid message cursor.");
          setMessages(prev => combine(prev, page.messages));
          cursor = page.nextCursor;
          more = page.hasMore;
        }
        setError(""); setLastSync(new Date().toISOString());
      } catch (err) {
        if (!active) return;
        if (err instanceof SessionChatError && err.status === 401) {
          setAuthenticated(false); setLoginOpen(true);
        } else {
          if (err instanceof SessionChatError && [403, 404].includes(err.status)) { terminal = true; setBlocked(true); }
          setError(err instanceof Error ? err.message : "Could not refresh messages.");
        }
      } finally { busy = false; if (active) setLoading(false); }
    }
    setLoading(true);
    refresh.current = () => { terminal = false; setBlocked(false); void sync(); };
    const onOnline = () => { setOnline(true); void sync(); };
    const onOffline = () => setOnline(false);
    const onVisible = () => { if (!document.hidden) void sync(); };
    const timer = window.setInterval(() => void sync(), 3000);
    window.addEventListener("online", onOnline); window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);
    void sync();
    return () => { active = false; controller.abort(); clearInterval(timer); refresh.current = () => {}; window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); document.removeEventListener("visibilitychange", onVisible); };
  }, [sessionId, valid, authenticated]);

  useEffect(() => {
    if (followBottom.current && list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [messages]);
  useEffect(() => {
    if (textarea.current) { textarea.current.style.height = "auto"; textarea.current.style.height = `${Math.min(textarea.current.scrollHeight, 140)}px`; }
  }, [draft]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(""), 3000); return () => clearTimeout(timer); }, [notice]);

  async function send(existing?: LocalMessage) {
    if (!session || sendLock.current || !online || blocked) return;
    const content = existing?.content ?? draft.trim();
    if (!content || content.length > 4000) return;
    const message: LocalMessage = { id: existing?.id ?? crypto.randomUUID(), clientMessageId: existing?.clientMessageId ?? crypto.randomUUID(), senderId: session.currentUserId, content, createdAt: existing?.createdAt ?? new Date().toISOString(), state: "sending" };
    followBottom.current = true; sendLock.current = true; setSending(true);
    setMessages(prev => combine(prev, [message]));
    if (!existing) setDraft("");
    try {
      const saved = await postSharedMessage(sessionId, content, message.clientMessageId);
      if (mounted.current) { setMessages(prev => combine(prev, [saved])); refresh.current(); }
    } catch (err) {
      if (!mounted.current) return;
      setMessages(prev => prev.map(m => m.clientMessageId === message.clientMessageId && m.state ? { ...m, state: "failed", error: "Could not send. Try again." } : m));
      if (err instanceof SessionChatError && err.status === 401) { setDraft(current => current || content); setAuthenticated(false); setLoginOpen(true); }
      if (err instanceof SessionChatError && err.status === 403) { setBlocked(true); setError(err.message); }
    } finally { sendLock.current = false; if (mounted.current) setSending(false); }
  }
  async function copyLink() {
    const url = `${window.location.origin}/oxy-journey/chat/${encodeURIComponent(sessionId)}`;
    try { await navigator.clipboard.writeText(url); setNotice("Conversation link copied"); }
    catch { setNotice("Copy the conversation link from your browser address bar."); }
  }
  const me = session?.participants.find(p => p.userId === session.currentUserId);
  const other = session?.participants.find(p => p.userId !== session.currentUserId);
  const canSend = Boolean(session && online && authenticated && !blocked);
  const status = !online ? "You are offline" : loading ? "Connecting…" : blocked ? "Conversation unavailable" : error ? "Waiting to reconnect" : lastSync ? "Conversation connected" : "Sign in to connect";

  const connected = Boolean(lastSync && online && !blocked && !error);
  const youName = me ? (me.role === "PARTNER" ? "Journey partner" : "Journey user") : "";

  return <div className={`oj-chat-page sc-page ${embedded ? "oj-chat-embedded" : ""}`}>
    <header className="oj-chat-brand sc-top">
      <a href="/" className="oj-chat-logo"><img src={LOGO} alt="OXY Journeys" /></a>
      <span className="oj-chat-tagline">Every journey, one partner</span>
      <a href="/oxy-journey/partner/chats" className="oj-chat-home"><Icon name="arrow" /> <span>All chats</span></a>
    </header>

    <main className="oj-chat-shell sc-shell">
      <aside className="oj-chat-sidebar sc-side">
        <div className="sc-hero">
          <div className="sc-stage">
            <span className="sc-orbit sc-orbit-a" /><span className="sc-orbit sc-orbit-b" />
            <Icon3D palette="violet" size={60}>
              <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9H13a8.5 8.5 0 0 1 8 8v.5Z" stroke="currentColor" />
            </Icon3D>
          </div>
          <span className="oj-chat-eyebrow">YOUR SHARED SPACE</span>
          <h1>A conversation.<br />A new possibility.</h1>
          <p>Connect with your journey partner and take the next step together.</p>
        </div>

        <div className={`sc-pill ${connected ? "is-on" : ""}`} role="status"><i />{status}</div>

        <div className="oj-chat-people sc-people">
          <h2>In this conversation</h2>
          {session ? <div className="sc-people-list">
            {session.participants.map((person, index) => <div key={person.userId} className="sc-person">
              <span className={`sc-avatar ${person.role === "PARTNER" ? "is-partner" : ""}`}>{initialOf(person.name)}</span>
              <div><strong>{person.name}{person.userId === session.currentUserId && person.name !== "You" ? " (You)" : ""}</strong><span>{person.role === "PARTNER" ? "Journey partner" : "Journey user"}</span></div>
              {index === 0 && session.participants.length > 1 && <i className="sc-link" aria-hidden="true" />}
            </div>)}
          </div> : <p>Sign in to view the people in this conversation.</p>}
        </div>

        <button type="button" className="sc-copy" onClick={copyLink} disabled={!valid}><Icon name="link" /> Copy conversation link</button>
        <p className="sc-note">Keep your journey moving. Share this conversation with your partner.</p>
      </aside>

      <section className="oj-chat-window sc-window" aria-label="Session conversation">
        <header className="oj-chat-window-header sc-head">
          <span className="sc-avatar is-partner sc-head-avatar">{other ? initialOf(other.name) : <Icon name="chat" />}</span>
          <div className="oj-chat-heading"><h2>{other?.name || "Your journey chat"}</h2><p><span className={`oj-chat-status-dot ${connected ? "is-connected" : ""}`} />{status}</p></div>
          <button className="oj-chat-icon-button" onClick={() => refresh.current()} aria-label="Refresh conversation" disabled={!authenticated || loading}><Icon name="refresh" /></button>
          <button className="oj-chat-share-button" onClick={copyLink} disabled={!valid}><Icon name="link" /><span>Copy link</span></button>
        </header>
        {error && <div role="alert" className="oj-chat-alert">{error}<button onClick={() => refresh.current()}>Try again</button></div>}
        {!online && <div className="oj-chat-alert" role="status">You are offline. Your draft is here; reconnect to send messages.</div>}

        <div ref={list} className="oj-chat-messages sc-messages" onScroll={() => { if (list.current) followBottom.current = list.current.scrollHeight - list.current.scrollTop - list.current.clientHeight < 80; }} role="log" aria-label="Messages" aria-live="polite" aria-relevant="additions text" aria-busy={loading}>
          {!valid ? <div className="oj-chat-empty sc-empty"><Icon3D palette="blue" size={54}><path d="M10 13a5 5 0 0 0 7 .5l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7-.5l-3 3a5 5 0 0 0 7 7l2-2" stroke="currentColor" /></Icon3D><h3>This link is incomplete</h3><p>Please open the full conversation link you received on WhatsApp.</p><a href="/">Explore journeys</a></div>
          : !authenticated ? <div className="oj-chat-empty sc-empty"><Icon3D palette="violet" size={54}><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9H13a8.5 8.5 0 0 1 8 8v.5Z" stroke="currentColor" /></Icon3D><span className="oj-chat-eyebrow">WELCOME TO YOUR JOURNEY</span><h3>Let’s connect.</h3><p>Sign in with the mobile number linked to this journey to join your shared conversation.</p><button className="oj-chat-primary" onClick={() => setLoginOpen(true)}>Sign in to join <Icon name="arrow" style={{ transform: "rotate(180deg)" }} /></button><small>Continue your journey together.</small></div>
          : loading && !messages.length ? <div className="oj-chat-empty sc-empty"><span className="oj-chat-loader" /><h3>Opening your conversation…</h3></div>
          : !messages.length ? <div className="oj-chat-empty sc-empty">
              <Icon3D palette={blocked ? "violet" : "blue"} size={58}><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9H13a8.5 8.5 0 0 1 8 8v.5Z" stroke="currentColor" /></Icon3D>
              <h3>{blocked ? "Unable to join this conversation" : error ? "Waiting for the chat service" : other ? `Say hello to ${other.name}` : "Your next step starts here"}</h3>
              <p>{blocked ? "This conversation is unavailable for your account. Please check the link or sign in with the correct mobile number." : error ? "Use Try again to reconnect." : "Share your requirements and start the conversation. Everything you send here stays in this shared space."}</p>
              {canSend && <div className="sc-starters">{STARTERS.map(text => <button key={text} type="button" onClick={() => { setDraft(text); textarea.current?.focus(); }}>{text}</button>)}</div>}
            </div>
          : <div className="sc-thread">{messages.map((m, index) => {
              const own = m.senderId === session?.currentUserId;
              const sender = session?.participants.find(person => person.userId === m.senderId);
              const senderName = sender?.name || "Participant";
              const showDate = index === 0 || dateLabel(messages[index - 1].createdAt) !== dateLabel(m.createdAt);
              const previous = messages[index - 1];
              const grouped = !showDate && previous && previous.senderId === m.senderId;
              return <div key={`${m.senderId}:${m.clientMessageId}`}>
                {showDate && <div className="oj-chat-date sc-date"><span>{dateLabel(m.createdAt)}</span></div>}
                <div className={`oj-chat-message-row sc-row ${own ? "is-own" : "is-other"} ${grouped ? "is-grouped" : ""}`}>
                  {!own && (grouped ? <span className="sc-avatar-spacer" /> : <span className="sc-avatar is-partner sc-msg-avatar" aria-hidden="true">{initialOf(senderName)}</span>)}
                  <div className={`oj-chat-bubble sc-bubble ${m.state === "failed" ? "is-failed" : ""}`}>
                    {!own && !grouped && <strong className="oj-chat-sender sc-sender">{senderName}</strong>}
                    <p>{m.content}</p>
                    <div className="oj-chat-message-meta sc-meta"><time dateTime={m.createdAt}>{timeLabel(m.createdAt)}</time>{own && <span>{m.state === "sending" ? "Sending…" : m.state === "failed" ? "Not sent" : "Sent"}</span>}</div>
                    {m.state === "failed" && <button className="oj-chat-retry" onClick={() => void send(m)} disabled={!canSend || sending}>Retry message</button>}
                  </div>
                </div>
              </div>;
            })}</div>}
        </div>

        <footer className="oj-chat-composer sc-composer">
          <form onSubmit={e => { e.preventDefault(); void send(); }}>
            <label className="oj-chat-sr-only" htmlFor="journey-message">Message your journey partner</label>
            <textarea ref={textarea} id="journey-message" placeholder={canSend ? "Write a message…" : "Sign in and connect to start chatting"} value={draft} onChange={e => setDraft(e.target.value)} maxLength={4000} rows={1} disabled={!canSend} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && !window.matchMedia("(max-width: 640px)").matches) { e.preventDefault(); void send(); } }} />
            <button type="submit" className="oj-chat-send sc-send" disabled={!canSend || sending || !draft.trim()} aria-label="Send message"><Icon name="send" /></button>
          </form>
          <div className="oj-chat-composer-caption"><span>{me ? `Chatting as ${youName}` : "Sign in to start your conversation"}</span>{draft.length > 3500 ? <span>{4000 - draft.length} characters left</span> : <span>Enter to send · Shift+Enter for a new line</span>}</div>
        </footer>
      </section>
    </main>
    <div role="status" aria-live="polite" className={notice ? "oj-chat-toast" : "oj-chat-sr-only"}>{notice}</div>
    <JourneyLoginModal open={loginOpen && valid} sessionId={sessionId} onClose={() => setLoginOpen(false)} onSuccess={auth => { if (!auth.accessToken) throw new Error("Login did not return an access token. Please contact support."); setLoginOpen(false); setAuthenticated(true); }} />
  </div>;
}
