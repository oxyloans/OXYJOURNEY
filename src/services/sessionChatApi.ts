import { STREAM_API_ROOT } from "./vibeCodeApi";
import { API_CONFIG } from "../config";
export type Participant = { userId: string; name: string; role: "USER" | "PARTNER" };
export type SharedSession = {
  sessionId: string;
  title: string;
  currentUserId: string;
  participants: Participant[];
};
export type SharedMessage = {
  id: string;
  clientMessageId: string;
  senderId: string;
  content: string;
  createdAt: string;
};
export class SessionChatError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
const ROOT = API_CONFIG.journeyChat.replace(/\/$/, "");
export function getChatToken() {
  return localStorage.getItem("accessToken") || localStorage.getItem("token") || "";
}
async function request<T>(path: string, signal?: AbortSignal, body?: unknown): Promise<T> {
  const token = getChatToken();
  if (!token) throw new SessionChatError("Please sign in to join this conversation.", 401);
  const response = await fetch(`${ROOT}${path}`, {
    method: body ? "POST" : "GET",
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
    credentials: "omit",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data: any;
  try { data = await response.json(); } catch { throw new SessionChatError("The chat service is unavailable. Please try again later.", response.status || 502); }
  if (!response.ok) throw new SessionChatError(data.message || "Unable to connect to this conversation.", response.status);
  return data as T;
}
// Shared chat runs on the ai-service backend, keyed only by sessionId:
//   GET  /ai-service/vibe-code/history/{sessionId}   -> every message of the session
//   POST /ai-service/agent/{sessionId}/message       -> { message, senderName, senderType }
// Any logged-in user holding the sessionId can read and post, so no per-user membership check.
const PARTNER_SENDER_ID = "session-partner";
// senderType decides who is who in the single window. The browser that ran the AI intake
// (it recorded the session as its own) is the USER; anyone else opening the link is the PARTNER.
// "?role=user|partner" on the link overrides this, e.g. for a user opening it on another device.
export const markSessionOwner = (sessionId: string) => { try { if (sessionId) localStorage.setItem(`oxyJourneySessionRole:${sessionId}`, "USER"); } catch { /* storage blocked */ } };
const myRole = (sessionId: string): "USER" | "PARTNER" => {
  const forced = (new URLSearchParams(window.location.search).get("role") || "").toUpperCase();
  if (forced === "USER" || forced === "PARTNER") return forced;
  return localStorage.getItem(`oxyJourneySessionRole:${sessionId}`) === "USER" ? "USER" : "PARTNER";
};
const myUserId = () => (localStorage.getItem("userId") || "me").trim();
const isUserSide = (sender?: string | null) => ["USER", "CUSTOMER"].includes((sender || "").toUpperCase());
// Messages we just sent keep their client id, so the poll that returns them replaces the optimistic copy.
const sentLog: { sessionId: string; clientMessageId: string; content: string }[] = [];

async function chatFetch(path: string, signal?: AbortSignal, body?: unknown) {
  const token = getChatToken();
  if (!token) throw new SessionChatError("Please sign in to join this conversation.", 401);
  const response = await fetch(`${STREAM_API_ROOT}${path}`, {
    method: body ? "POST" : "GET",
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
    credentials: "omit",
    cache: "no-store",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON body */ }
  if (!response.ok) throw new SessionChatError(data?.message || data?.error || "Unable to connect to this conversation.", response.status);
  return data;
}

async function loadHistory(id: string, signal?: AbortSignal) {
  const data = await chatFetch(`/ai-service/vibe-code/history/${encodeURIComponent(id)}`, signal);
  const items: any[] = Array.isArray(data) ? data : Array.isArray(data?.messages) ? data.messages : [];
  const claimed = new Set<number>();
  const mine = myRole(id);
  // The history also holds the earlier AI intake (sender "AI" and the user's answers to it).
  // The shared chat starts at the AI hand-off: keep only non-AI messages after it.
  const isAi = (item: any) => (item?.sender || "").toUpperCase() === "AI";
  const lastIndex = (test: (item: any) => boolean) => items.reduce((found, item, i) => (test(item) ? i : found), -1);
  const handoff = lastIndex(item => isAi(item) && /connected with/i.test(String(item.message)));
  const cutoff = handoff >= 0 ? handoff : lastIndex(isAi);
  const partnerName = handoff >= 0 ? /connected with ([^.\n]+?)\./i.exec(String(items[handoff].message))?.[1]?.trim() || "" : "";
  const messages: SharedMessage[] = items
    .filter((item, i) => i > cutoff && !isAi(item) && String(item?.message ?? "").trim())
    .map((item, index): SharedMessage => {
      const own = (isUserSide(item.sender) ? "USER" : "PARTNER") === mine;
      const content = String(item.message).trim();
      let clientMessageId = String(item.id ?? `${item.createdAt ?? "history"}-${index}`);
      if (own) {
        const sent = sentLog.findIndex((entry, i) => !claimed.has(i) && entry.sessionId === id && entry.content === content);
        if (sent >= 0) { claimed.add(sent); clientMessageId = sentLog[sent].clientMessageId; }
      }
      return { id: String(item.id ?? clientMessageId), clientMessageId, senderId: own ? myUserId() : PARTNER_SENDER_ID, content, createdAt: toIso(item.createdAt) };
    });
  return { messages, partnerName };
}

// The backend sends Java LocalDateTime as [y, m, d, h, mi, s, nanos]; strings pass through.
function toIso(value: unknown) {
  const date = Array.isArray(value)
    ? new Date(Number(value[0]), Number(value[1]) - 1, Number(value[2]), Number(value[3] || 0), Number(value[4] || 0), Number(value[5] || 0), Math.floor(Number(value[6] || 0) / 1e6))
    : new Date(String(value ?? ""));
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export async function getSharedSession(id: string, signal?: AbortSignal): Promise<SharedSession> {
  const { partnerName } = await loadHistory(id, signal); // surfaces 401/403/404 for the session
  const me = myRole(id);
  return {
    sessionId: id,
    title: "Journey conversation",
    currentUserId: myUserId(),
    participants: [
      { userId: myUserId(), name: me === "USER" ? "You" : partnerName || "You", role: me },
      { userId: PARTNER_SENDER_ID, name: me === "USER" ? partnerName || "Journey partner" : "Customer", role: me === "USER" ? "PARTNER" : "USER" },
    ],
  };
}
export async function getSharedMessages(id: string, _after: string, signal?: AbortSignal) {
  // The history endpoint is not paged: return everything each time (the page de-duplicates).
  return { messages: (await loadHistory(id, signal)).messages, nextCursor: "", hasMore: false };
}
export async function postSharedMessage(id: string, content: string, clientMessageId: string): Promise<SharedMessage> {
  sentLog.push({ sessionId: id, clientMessageId, content: content.trim() });
  try {
    await chatFetch(`/ai-service/agent/${encodeURIComponent(id)}/message`, undefined, { message: content, senderName: myRole(id) === "USER" ? "User" : "Partner", senderType: myRole(id) });
  } catch (error) {
    sentLog.pop();
    throw error;
  }
  return { id: clientMessageId, clientMessageId, senderId: myUserId(), content, createdAt: new Date().toISOString() };
}

export type SessionSummary = SharedSession & { createdAt: string; updatedAt: string; lastMessage: SharedMessage | null };
export const listSharedSessions = (query: string, offset = 0, signal?: AbortSignal) => request<{ sessions: SessionSummary[]; hasMore: boolean; nextOffset: number }>(`/sessions?q=${encodeURIComponent(query)}&offset=${offset}`, signal);
export const createConversationForSession = (id: string) => request<{ sessionId: string }>(`/sessions/${encodeURIComponent(id)}/conversations`, undefined, {});
