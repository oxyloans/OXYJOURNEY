import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, MessageSquare, Sparkles } from "lucide-react";
import {
  formatAdminTimeAgo,
  getAdminDateTimestamp,
  type AdminMessage,
  type AdminSession,
} from "../../services/adminApi";
import { getVibeCodeHistory } from "../../services/vibeCodeApi";
import "./AdminConversations.css";

type Role = "user" | "partner" | "ai";

type Bubble = { key: string; role: Role; name: string; text: string; ts: number };

type Convo = {
  sessionId: string;
  messages: AdminMessage[];
  last: number;
  userName: string;
  partnerName: string;
};

type Props = {
  messages: AdminMessage[];
  sessions: AdminSession[];
  searchQuery: string;
  /** Opens this conversation (e.g. from a session's "Logs" button). */
  focusSessionId: string;
};

const roleOf = (senderType?: string | null): Role => {
  const type = (senderType || "").toUpperCase();
  if (type === "AI") return "ai";
  if (type === "PARTNER") return "partner";
  return "user";
};

const initialOf = (name: string) => (name.trim().charAt(0) || "•").toUpperCase();
const normalize = (text: string) => text.trim().toLowerCase().replace(/\s+/g, " ");
const dayLabel = (ts: number) => new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const timeLabel = (ts: number) => new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

export default function AdminConversations({ messages, sessions, searchQuery, focusSessionId }: Props) {
  const [activeId, setActiveId] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [intake, setIntake] = useState<Bubble[]>([]);
  const threadRef = useRef<HTMLDivElement>(null);

  const sessionById = useMemo(() => new Map(sessions.map(item => [item.sessionId, item])), [sessions]);

  // Every conversation, newest activity first.
  const convos = useMemo(() => {
    const bySession = new Map<string, AdminMessage[]>();
    for (const message of messages) {
      if (!message.sessionId) continue;
      const list = bySession.get(message.sessionId) || [];
      list.push(message);
      bySession.set(message.sessionId, list);
    }
    // A session opened from "Logs" is shown even if it has no direct messages yet.
    if (focusSessionId && !bySession.has(focusSessionId)) bySession.set(focusSessionId, []);

    const built: Convo[] = [];
    for (const [sessionId, list] of bySession) {
      const sorted = [...list].sort((a, b) => getAdminDateTimestamp(a.createdAt) - getAdminDateTimestamp(b.createdAt));
      const session = sessionById.get(sessionId);
      const firstUser = sorted.find(item => roleOf(item.senderType) === "user");
      const firstPartner = sorted.find(item => roleOf(item.senderType) === "partner");
      built.push({
        sessionId,
        messages: sorted,
        last: sorted.length ? getAdminDateTimestamp(sorted[sorted.length - 1].createdAt) : getAdminDateTimestamp(session?.updatedAt ?? null),
        userName: session?.userName || firstUser?.senderName || "User",
        partnerName: session?.matchedPersonName || firstPartner?.senderName || "Partner",
      });
    }
    return built.sort((a, b) => b.last - a.last);
  }, [messages, sessionById, focusSessionId]);

  const visible = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return convos;
    return convos.filter(convo =>
      convo.userName.toLowerCase().includes(q) ||
      convo.partnerName.toLowerCase().includes(q) ||
      convo.messages.some(item => item.message.toLowerCase().includes(q) || (item.senderName || "").toLowerCase().includes(q))
    );
  }, [convos, searchQuery]);

  // Opening from a session's "Logs" button jumps straight to that conversation.
  useEffect(() => {
    if (focusSessionId) { setActiveId(focusSessionId); setMobileOpen(true); }
  }, [focusSessionId]);

  // Otherwise default to the most recent conversation on wide screens.
  useEffect(() => {
    if (activeId && visible.some(convo => convo.sessionId === activeId)) return;
    if (focusSessionId && activeId === focusSessionId) return;
    if (window.innerWidth > 860 && visible[0]) setActiveId(visible[0].sessionId);
    else if (!visible.length) setActiveId("");
  }, [visible, activeId, focusSessionId]);

  const active = convos.find(convo => convo.sessionId === activeId);

  // The AI part before the hand-off comes from the session history.
  useEffect(() => {
    if (!activeId) { setIntake([]); return; }
    let cancelled = false;
    getVibeCodeHistory(activeId)
      .then(items => {
        if (cancelled) return;
        setIntake(
          (Array.isArray(items) ? items : [])
            .filter(item => String(item?.message ?? "").trim())
            .map((item, index): Bubble => {
              const sender = String(item.sender || "").toUpperCase();
              const role: Role = sender === "AI" ? "ai" : sender === "PARTNER" ? "partner" : "user";
              return {
                key: `intake-${item.id ?? index}`,
                role,
                name: role === "ai" ? "OXY AI" : role === "partner" ? "Partner" : "User",
                text: String(item.message).trim(),
                ts: getAdminDateTimestamp(item.createdAt as never),
              };
            })
        );
      })
      .catch(() => { if (!cancelled) setIntake([]); });
    return () => { cancelled = true; };
  }, [activeId]);

  const bubbles = useMemo<Bubble[]>(() => {
    if (!active) return [];
    const direct = active.messages.map((item): Bubble => {
      const role = roleOf(item.senderType);
      return {
        key: `chat-${item.id}`,
        role,
        name: item.senderName || (role === "partner" ? active.partnerName : role === "ai" ? "OXY AI" : active.userName),
        text: item.message,
        ts: getAdminDateTimestamp(item.createdAt),
      };
    });
    // The history can repeat direct messages; keep each message once.
    const seen = new Set(direct.map(item => `${item.role}|${normalize(item.text)}`));
    const earlier = intake
      .filter(item => !seen.has(`${item.role}|${normalize(item.text)}`))
      .map(item => ({ ...item, name: item.role === "user" ? active.userName : item.role === "partner" ? active.partnerName : item.name }));
    return [...earlier, ...direct].sort((a, b) => a.ts - b.ts);
  }, [active, intake]);

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [bubbles.length, activeId]);

  if (!convos.length) {
    return (
      <div className="ac-empty">
        <span className="ac-empty-icon"><MessageSquare size={30} /></span>
        <h3>No conversations yet</h3>
      </div>
    );
  }

  return (
    <div className={`ac-shell ${mobileOpen ? "is-thread-open" : ""}`}>
      <aside className="ac-list" aria-label="Conversations">
        <div className="ac-list-scroll">
          {visible.length === 0 ? (
            <p className="ac-list-empty">No conversations found.</p>
          ) : visible.map(convo => {
            const lastMessage = convo.messages[convo.messages.length - 1];
            return (
              <button
                key={convo.sessionId}
                type="button"
                className={`ac-item ${convo.sessionId === activeId ? "is-active" : ""}`}
                onClick={() => { setActiveId(convo.sessionId); setMobileOpen(true); }}
              >
                <span className="ac-pair" aria-hidden="true">
                  <span className="ac-avatar is-user">{initialOf(convo.userName)}</span>
                  <span className="ac-avatar is-partner">{initialOf(convo.partnerName)}</span>
                </span>
                <span className="ac-item-body">
                  <span className="ac-item-top">
                    <strong>{convo.userName} <i>↔</i> {convo.partnerName}</strong>
                    {convo.last > 0 && <time>{formatAdminTimeAgo(new Date(convo.last).toISOString())}</time>}
                  </span>
                  <span className="ac-item-preview">{lastMessage ? lastMessage.message : "No messages yet"}</span>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="ac-thread" aria-label="Conversation">
        {!active ? (
          <div className="ac-thread-empty"><MessageSquare size={30} /></div>
        ) : (
          <>
            <header className="ac-thread-head">
              <button type="button" className="ac-back" onClick={() => setMobileOpen(false)} aria-label="Back to conversations"><ArrowLeft size={18} /></button>
              <span className="ac-pair" aria-hidden="true">
                <span className="ac-avatar is-user">{initialOf(active.userName)}</span>
                <span className="ac-avatar is-partner">{initialOf(active.partnerName)}</span>
              </span>
              <h3>{active.userName} <i>↔</i> {active.partnerName}</h3>
            </header>

            <div className="ac-messages" ref={threadRef} role="log" aria-label="Messages">
              {!bubbles.length && <p className="ac-note">No messages yet.</p>}
              {bubbles.map((bubble, index) => {
                const previous = bubbles[index - 1];
                const showDay = !previous || dayLabel(previous.ts) !== dayLabel(bubble.ts);
                const grouped = !showDay && previous && previous.role === bubble.role && previous.name === bubble.name;
                return (
                  <div key={bubble.key}>
                    {showDay && bubble.ts > 0 && <div className="ac-day"><span>{dayLabel(bubble.ts)}</span></div>}
                    <div className={`ac-row is-${bubble.role} ${grouped ? "is-grouped" : ""}`}>
                      {bubble.role !== "user" && (
                        grouped ? <span className="ac-avatar-spacer" /> : (
                          <span className={`ac-avatar ${bubble.role === "ai" ? "is-ai" : "is-partner"}`} aria-hidden="true">
                            {bubble.role === "ai" ? <Sparkles size={15} /> : initialOf(bubble.name)}
                          </span>
                        )
                      )}
                      <div className="ac-bubble">
                        {!grouped && <strong className="ac-name">{bubble.name}</strong>}
                        <p>{bubble.text}</p>
                        {bubble.ts > 0 && <time>{timeLabel(bubble.ts)}</time>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
