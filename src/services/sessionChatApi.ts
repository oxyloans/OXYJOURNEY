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
// "?role=admin" (the Chat button in the admin dashboard) opens the chat read-only, with no user login.
export const isAdminView = () => (new URLSearchParams(window.location.search).get("role") || "").toLowerCase() === "admin";
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
//   GET  /ai-service/vibe-code/{sessionId}           -> every shared chat message of the session
//   POST /ai-service/vibe-code/{sessionId}/message      -> { message, senderName, senderType }
// Any logged-in user holding the sessionId can read and post, so no per-user membership check.
const PARTNER_SENDER_ID = "session-partner";
const USER_SENDER_ID = "session-user";
// senderType decides who is who in the single window. The browser that ran the AI intake
// (it recorded the session as its own) is the USER; anyone else opening the link is the PARTNER.
// "?role=user|partner" on the link overrides this, e.g. for a user opening it on another device.
export const markSessionOwner = (sessionId: string) => { try { if (sessionId) localStorage.setItem(`oxyJourneySessionRole:${sessionId}`, "USER"); } catch { /* storage blocked */ } };
// Role worked out from the backend when this browser has no marker (e.g. the user opens the link on
// another device): a logged-in user whose sessions include this one is the USER, anyone else the PARTNER.
const resolvedRole = new Map<string, "USER" | "PARTNER">();
// The link decides the side: /oxy-journey/chat/{id}/partner goes to the partner, /user to the user.
// "?role=user|partner" still works as an override. Links without either fall back to the checks below.
const linkRole = (): "USER" | "PARTNER" | "" => {
  const fromPath = /\/chat\/[^/]+\/(user|partner)\/?$/i.exec(window.location.pathname)?.[1];
  const value = (fromPath || new URLSearchParams(window.location.search).get("role") || "").toUpperCase();
  return value === "USER" || value === "PARTNER" ? value : "";
};
const myRole = (sessionId: string): "USER" | "PARTNER" => {
  const forced = linkRole();
  if (forced) return forced;
  if (localStorage.getItem(`oxyJourneySessionRole:${sessionId}`) === "USER") return "USER";
  return resolvedRole.get(sessionId) || "PARTNER";
};
const myUserId = () => (localStorage.getItem("userId") || "me").trim();
const isUserSide = (sender?: string | null) => ["USER", "CUSTOMER"].includes((sender || "").toUpperCase());
// Messages we just sent keep their client id, so the poll that returns them replaces the optimistic copy.
const sentLog: { sessionId: string; clientMessageId: string; content: string }[] = [];

async function chatFetch(path: string, signal?: AbortSignal, body?: unknown) {
  const token = getChatToken();
  // Partners open the shared link without signing in; the token is sent only when the browser has one.
  const response = await fetch(`${STREAM_API_ROOT}${path}`, {
    method: body ? "POST" : "GET",
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
    credentials: "omit",
    cache: "no-store",
    headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON body */ }
  if (!response.ok) throw new SessionChatError(data?.message || data?.error || "Unable to connect to this conversation.", response.status);
  return data;
}

// Shared chat messages live in OxyJourneyChatMessage and are served by GET /vibe-code/{sessionId}
// as [{ id, sessionId, senderId, senderName, senderType, message, createdAt }].
// (GET /vibe-code/history/{sessionId} only holds the earlier AI intake, so it is read just once
// per session to find the matched partner's name.)
const partnerNameCache = new Map<string, string>();
async function intakePartnerName(id: string, signal?: AbortSignal) {
  if (partnerNameCache.has(id)) return partnerNameCache.get(id) as string;
  let name = "";
  try {
    const data = await chatFetch(`/ai-service/vibe-code/history/${encodeURIComponent(id)}`, signal);
    const items: any[] = Array.isArray(data) ? data : Array.isArray(data?.messages) ? data.messages : [];
    const handoff = items.filter(item => (item?.sender || "").toUpperCase() === "AI" && /connected with/i.test(String(item.message))).pop();
    name = handoff ? /connected with ([^.\n]+?)\./i.exec(String(handoff.message))?.[1]?.replace(/[*_]+/g, "").trim() || "" : "";
    partnerNameCache.set(id, name);
  } catch { /* the name is optional; retry on a later sync */ }
  return name;
}

// The session check and the message fetch run back to back on every sync, so they share one request.
const chatCache = new Map<string, { at: number; promise: Promise<any> }>();
function fetchChat(id: string, signal?: AbortSignal) {
  const cached = chatCache.get(id);
  if (cached && Date.now() - cached.at < 2000) return cached.promise;
  const promise = chatFetch(`/ai-service/vibe-code/${encodeURIComponent(id)}`, signal);
  chatCache.set(id, { at: Date.now(), promise });
  promise.catch(() => { if (chatCache.get(id)?.promise === promise) chatCache.delete(id); });
  return promise;
}

// A server message keeps the client id of the optimistic copy we sent, so the poll or push that
// returns it replaces that copy instead of showing it twice. Each message is matched only once.
const clientIdByServerId = new Map<string, string>();
const claimedSent = new Set<number>();
function toShared(id: string, item: any, index = 0): SharedMessage | null {
  const content = String(item?.message ?? "").trim();
  if (!content) return null;
  const admin = isAdminView();
  const own = !admin && (isUserSide(item.senderType) ? "USER" : "PARTNER") === myRole(id);
  const serverId = item.id != null ? String(item.id) : "";
  let clientMessageId = serverId || `${item.createdAt ?? "chat"}-${index}`;
  if (own) {
    const known = serverId ? clientIdByServerId.get(serverId) : undefined;
    if (known) clientMessageId = known;
    else {
      const sent = sentLog.findIndex((entry, i) => !claimedSent.has(i) && entry.sessionId === id && entry.content === content);
      if (sent >= 0) { claimedSent.add(sent); clientMessageId = sentLog[sent].clientMessageId; if (serverId) clientIdByServerId.set(serverId, clientMessageId); }
    }
  }
  return { id: serverId || clientMessageId, clientMessageId, senderId: own ? myUserId() : admin && isUserSide(item.senderType) ? USER_SENDER_ID : PARTNER_SENDER_ID, content, createdAt: toIso(item.createdAt) };
}

/**
 * Live updates (Server-Sent Events): GET /vibe-code/{sessionId}/stream pushes every new message of
 * the chat the moment it is saved, so the user, partner and admin see it instantly like WhatsApp.
 * EventSource reconnects by itself; onOpen lets the caller re-sync anything missed while offline.
 */
export function subscribeSharedMessages(id: string, handlers: { onMessage: (message: SharedMessage) => void; onOpen?: () => void; onError?: () => void }) {
  if (typeof EventSource === "undefined") return () => {};
  const source = new EventSource(`${STREAM_API_ROOT}/ai-service/vibe-code/${encodeURIComponent(id)}/stream`);
  source.addEventListener("connected", () => handlers.onOpen?.());
  source.addEventListener("message", event => {
    try {
      const message = toShared(id, JSON.parse((event as MessageEvent).data));
      if (message) handlers.onMessage(message);
    } catch { /* ignore malformed event */ }
  });
  source.onerror = () => handlers.onError?.();
  return () => source.close();
}

async function ensureRole(id: string, signal?: AbortSignal) {
  if (linkRole() || resolvedRole.has(id) || localStorage.getItem(`oxyJourneySessionRole:${id}`) === "USER") return;
  const userId = (localStorage.getItem("userId") || "").trim();
  if (!userId) return;
  try {
    const sessions = await chatFetch(`/ai-service/vibe-code/user/${encodeURIComponent(userId)}/sessions`, signal);
    const isUser = Array.isArray(sessions) && sessions.some((item: any) => item?.sessionId === id);
    resolvedRole.set(id, isUser ? "USER" : "PARTNER");
    if (isUser) markSessionOwner(id);
  } catch { /* keep the default and retry on the next sync */ }
}

async function loadHistory(id: string, signal?: AbortSignal) {
  await ensureRole(id, signal);
  const data = await fetchChat(id, signal);
  const items: any[] = Array.isArray(data) ? data : Array.isArray(data?.messages) ? data.messages : [];
  const messages = items.map((item, index) => toShared(id, item, index)).filter((m): m is SharedMessage => Boolean(m));
  // Prefer the matched partner name from the AI intake; a message sender name is only a fallback.
  const partnerMessage = [...items].reverse().find(item => !isUserSide(item?.senderType) && !/^(partner|user)$/i.test(String(item?.senderName ?? "").trim()) && String(item?.senderName ?? "").trim());
  const partnerName = (await intakePartnerName(id, signal)) || (partnerMessage ? String(partnerMessage.senderName).trim() : "");
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
  if (isAdminView()) {
    return { sessionId: id, title: "Journey conversation", currentUserId: "admin", participants: [
      { userId: USER_SENDER_ID, name: "Customer", role: "USER" },
      { userId: PARTNER_SENDER_ID, name: partnerName || "Journey partner", role: "PARTNER" },
    ] };
  }
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
  chatCache.delete(id);
  try {
    const saved = await chatFetch(`/ai-service/vibe-code/${encodeURIComponent(id)}/message`, undefined, { message: content, senderName: (localStorage.getItem("userName") || "").trim() || (myRole(id) === "USER" ? "User" : "Partner"), senderType: myRole(id) });
    // Tie the server id to this optimistic copy so the pushed/polled echo does not duplicate it.
    if (saved?.id != null) { clientIdByServerId.set(String(saved.id), clientMessageId); claimedSent.add(sentLog.findIndex(entry => entry.clientMessageId === clientMessageId)); }
  } catch (error) {
    sentLog.pop();
    throw error;
  }
  return { id: clientMessageId, clientMessageId, senderId: myUserId(), content, createdAt: new Date().toISOString() };
}

export type SessionSummary = SharedSession & { createdAt: string; updatedAt: string; lastMessage: SharedMessage | null };
export const listSharedSessions = (query: string, offset = 0, signal?: AbortSignal) => request<{ sessions: SessionSummary[]; hasMore: boolean; nextOffset: number }>(`/sessions?q=${encodeURIComponent(query)}&offset=${offset}`, signal);
export const createConversationForSession = (id: string) => request<{ sessionId: string }>(`/sessions/${encodeURIComponent(id)}/conversations`, undefined, {});
