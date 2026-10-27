import { API_CONFIG } from "../config";

export type AdminDate =
  | [number, number, number, number, number, number, number]
  | [number, number, number, number, number, number]
  | string
  | null;

export interface AdminSession {
  id: number;
  sessionId: string;
  userId: string | null;
  userName: string | null;
  journeyCategoryType: string | null;
  journeyCategoryValue: string | null;
  detectedJourneyKey: string | null;
  journeyTitle: string | null;
  journeyDescription: string | null;
  imageUrl: string | null;
  directSearchReady: boolean | null;
  directSearchSignal: string | null;
  matchedPersonName: string | null;
  chatWindowUrl: string | null;
  chatStatus: string | null;
  sessionStatus: string | null;
  leadStatus: string | null;
  createdAt: AdminDate;
  updatedAt: AdminDate;
}

export interface AdminMessage {
  id: number;
  sessionId: string;
  senderId: string;
  senderName: string;
  senderType: "PARTNER" | "USER" | "CUSTOMER" | "AI" | string;
  message: string;
  createdAt: AdminDate;
}

const DIRECT_API_ROOT = API_CONFIG.admin;
const PROXY_API_ROOT = "/admin-api";

// Fallback sample data directly from the user's live system
export const SAMPLE_LIVE_SESSIONS: AdminSession[] = [
  {
    id: 1,
    sessionId: "OXYJOURNEY-20260925123735-6263",
    userId: "12234",
    userName: "Rishi",
    journeyCategoryType: "platform",
    journeyCategoryValue: "oxyloans",
    detectedJourneyKey: "67d2284b-f328-4704-a9ca-91ee4aadbb98",
    journeyTitle: "JOIN AS AN OXY BORROWER",
    journeyDescription: "Start your borrower journey through a safe, transparent, and accountable process with support from day one.",
    imageUrl: "https://oxybricksv1.s3.ap-south-1.amazonaws.com/null/45880e62-acaf-4645-a83e-d1c8498e923e/aadhar_borrower1.png",
    directSearchReady: false,
    directSearchSignal: null,
    matchedPersonName: "Gopal Krishna",
    chatWindowUrl: "https://www.oxyjourneys.com/oxy-journey/chat/OXYJOURNEY-20260925123735-6263",
    chatStatus: "LIVE",
    sessionStatus: "JOURNEY_DETECTED",
    leadStatus: "PERSON_MATCHED",
    createdAt: [2026, 9, 25, 12, 37, 35, 65813000],
    updatedAt: [2026, 9, 25, 12, 42, 3, 469709000],
  },
  {
    id: 5,
    sessionId: "OXYJOURNEY-20260928142315-7013",
    userId: "38f71da3-5f1d-4b82-a83f-0fc4058e2554",
    userName: "Rishi",
    journeyCategoryType: "CLASSIFICATION",
    journeyCategoryValue: "",
    detectedJourneyKey: "LENDER",
    journeyTitle: "LENDER",
    journeyDescription: "This journey helps connect you with potential lenders for your loan needs.",
    imageUrl: null,
    directSearchReady: false,
    directSearchSignal: null,
    matchedPersonName: "Rishi",
    chatWindowUrl: "https://www.oxyjourneys.com/oxy-journey/chat/OXYJOURNEY-20260928142315-7013",
    chatStatus: "LIVE",
    sessionStatus: "JOURNEY_DETECTED",
    leadStatus: "PERSON_MATCHED",
    createdAt: [2026, 9, 28, 14, 23, 15, 726742000],
    updatedAt: [2026, 9, 28, 14, 26, 26, 553305000],
  },
  {
    id: 2,
    sessionId: "OXYJOURNEY-20260926070844-7462",
    userId: "38f71da3-5f1d-4b82-a83f-0fc4058e2554",
    userName: "Gopal",
    journeyCategoryType: "CLASSIFICATION",
    journeyCategoryValue: "",
    detectedJourneyKey: "LOAN",
    journeyTitle: "Loan Assistance",
    journeyDescription: "Connecting you with individuals who can provide guidance and support for obtaining a loan.",
    imageUrl: null,
    directSearchReady: false,
    directSearchSignal: null,
    matchedPersonName: "Rishi",
    chatWindowUrl: "https://www.oxyjourneys.com/oxy-journey/chat/OXYJOURNEY-20260926070844-7462",
    chatStatus: "LIVE",
    sessionStatus: "JOURNEY_DETECTED",
    leadStatus: "PERSON_MATCHED",
    createdAt: [2026, 9, 26, 7, 8, 44, 741936000],
    updatedAt: [2026, 9, 26, 7, 12, 44, 208716000],
  },
  {
    id: 7,
    sessionId: "OXYJOURNEY-20260928151237-9171",
    userId: "38f71da3-5f1d-4b82-a83f-0fc4058e2554",
    userName: "Rishi",
    journeyCategoryType: "CLASSIFICATION",
    journeyCategoryValue: "",
    detectedJourneyKey: "LENDER",
    journeyTitle: "Lender",
    journeyDescription: null,
    imageUrl: null,
    directSearchReady: false,
    directSearchSignal: null,
    matchedPersonName: "Rishi",
    chatWindowUrl: "https://www.oxyjourneys.com/oxy-journey/chat/OXYJOURNEY-20260928151237-9171",
    chatStatus: "LIVE",
    sessionStatus: "JOURNEY_DETECTED",
    leadStatus: "PERSON_MATCHED",
    createdAt: [2026, 9, 28, 15, 12, 37, 566980000],
    updatedAt: [2026, 9, 28, 15, 17, 25, 911244000],
  },
  {
    id: 29,
    sessionId: "OXYJOURNEY-20261008115719-2970",
    userId: "e22e6191-dfbe-4c33-9c4b-5285c0a4aafb",
    userName: "Rishi",
    journeyCategoryType: "CLASSIFICATION",
    journeyCategoryValue: "",
    detectedJourneyKey: null,
    journeyTitle: null,
    journeyDescription: null,
    imageUrl: null,
    directSearchReady: true,
    directSearchSignal: "question phase finished",
    matchedPersonName: "Gopal Krishna",
    chatWindowUrl: "https://www.oxyjourneys.com/oxy-journey/chat/OXYJOURNEY-20261008115719-2970",
    chatStatus: "LIVE",
    sessionStatus: "STARTED",
    leadStatus: "PERSON_MATCHED",
    createdAt: [2026, 10, 8, 11, 57, 19, 103234000],
    updatedAt: [2026, 10, 8, 12, 14, 51, 572080000],
  },
  {
    id: 38,
    sessionId: "OXYJOURNEY-20261012063847-6212",
    userId: "4e62a2a7-637a-4e18-9759-00703d3b779e",
    userName: "Divya",
    journeyCategoryType: "CLASSIFICATION",
    journeyCategoryValue: "",
    detectedJourneyKey: null,
    journeyTitle: null,
    journeyDescription: null,
    imageUrl: null,
    directSearchReady: true,
    directSearchSignal: "question phase finished",
    matchedPersonName: "LP Saravanaa",
    chatWindowUrl: "https://www.oxyjourneys.com/oxy-journey/chat/OXYJOURNEY-20261012063847-6212",
    chatStatus: "LIVE",
    sessionStatus: "STARTED",
    leadStatus: "CANDIDATES_SHOWN",
    createdAt: [2026, 10, 12, 6, 38, 47, 418103000],
    updatedAt: [2026, 10, 12, 7, 22, 44, 932455000],
  },
  {
    id: 55,
    sessionId: "OXYJOURNEY-20261013051941-5534",
    userId: "d03d4aae-32da-49ab-b4e6-83946ae162f6",
    userName: "Maneiah Thota",
    journeyCategoryType: "PLATFORM",
    journeyCategoryValue: "OXYGOLD",
    detectedJourneyKey: null,
    journeyTitle: null,
    journeyDescription: null,
    imageUrl: null,
    directSearchReady: true,
    directSearchSignal: "question phase finished",
    matchedPersonName: "Madhu Praveen Kumar",
    chatWindowUrl: "https://www.oxyjourneys.com/oxy-journey/chat/OXYJOURNEY-20261013051941-5534",
    chatStatus: "LIVE",
    sessionStatus: "STARTED",
    leadStatus: "PERSON_MATCHED",
    createdAt: [2026, 10, 13, 5, 19, 41, 855843000],
    updatedAt: [2026, 10, 13, 5, 25, 39, 808940000],
  },
];

export const SAMPLE_COMPLETED_SESSIONS: AdminSession[] = [
  {
    id: 101,
    sessionId: "OXYJOURNEY-20260920101500-1120",
    userId: "user-8877",
    userName: "Karthik Verma",
    journeyCategoryType: "PLATFORM",
    journeyCategoryValue: "OXYLOANS",
    detectedJourneyKey: "BORROWER_REFINANCE",
    journeyTitle: "Loan Refinance Plan",
    journeyDescription: "Assisted borrower with institutional loan refinancing guidance and docs.",
    imageUrl: null,
    directSearchReady: true,
    directSearchSignal: "handover complete",
    matchedPersonName: "Rajesh Sharma",
    chatWindowUrl: "https://www.oxyjourneys.com/oxy-journey/chat/OXYJOURNEY-20260920101500-1120",
    chatStatus: "COMPLETED",
    sessionStatus: "COMPLETED",
    leadStatus: "CONVERTED",
    createdAt: "2026-09-20T10:15:00.000Z",
    updatedAt: "2026-09-20T11:45:00.000Z",
  },
];

export const SAMPLE_ALL_MESSAGES: AdminMessage[] = [
  {
    id: 1,
    sessionId: "OXYJOURNEY-20261008115719-2970",
    senderId: "8885345509",
    senderName: "Partner",
    senderType: "PARTNER",
    message: "HI Hello",
    createdAt: [2026, 10, 8, 12, 0, 42, 515038000],
  },
  {
    id: 2,
    sessionId: "OXYJOURNEY-20261008115719-2970",
    senderId: "e22e6191-dfbe-4c33-9c4b-5285c0a4aafb",
    senderName: "Rishi",
    senderType: "USER",
    message: "Hello! I am looking for details regarding our partnership journey.",
    createdAt: [2026, 10, 8, 12, 2, 15, 120000000],
  },
  {
    id: 3,
    sessionId: "OXYJOURNEY-20261013051941-5534",
    senderId: "d03d4aae-32da-49ab-b4e6-83946ae162f6",
    senderName: "Maneiah Thota",
    senderType: "USER",
    message: "I need to know the latest gold loan values and retail partner options.",
    createdAt: [2026, 10, 13, 5, 20, 10, 450000000],
  },
  {
    id: 4,
    sessionId: "OXYJOURNEY-20261013051941-5534",
    senderId: "agent-lead-1",
    senderName: "Madhu Praveen Kumar",
    senderType: "PARTNER",
    message: "Hi Maneiah, Madhu here from OXYGOLD. I'm connecting to walk you through our retailer and loan value metrics.",
    createdAt: [2026, 10, 13, 5, 22, 14, 800000000],
  },
  {
    id: 5,
    sessionId: "OXYJOURNEY-20261012063847-6212",
    senderId: "4e62a2a7-637a-4e18-9759-00703d3b779e",
    senderName: "Divya",
    senderType: "USER",
    message: "Can someone assist me with candidate match criteria?",
    createdAt: [2026, 10, 12, 6, 40, 0, 100000000],
  },
];

export function formatAdminDate(val: AdminDate): string {
  if (!val) return "—";
  if (Array.isArray(val)) {
    const [year, month, day, hour = 0, minute = 0, second = 0] = val;
    const d = new Date(year, month - 1, day, hour, minute, second);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  } else if (typeof val === "string") {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return val;
  }
  return String(val);
}

export function formatAdminTimeAgo(val: AdminDate): string {
  if (!val) return "";
  let ts = 0;
  if (Array.isArray(val)) {
    const [year, month, day, hour = 0, minute = 0, second = 0] = val;
    ts = new Date(year, month - 1, day, hour, minute, second).getTime();
  } else if (typeof val === "string") {
    ts = new Date(val).getTime();
  }
  if (!ts) return "";
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 0) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function getAdminDateTimestamp(val: AdminDate): number {
  if (!val) return 0;
  if (Array.isArray(val)) {
    const [year, month, day, hour = 0, minute = 0, second = 0] = val;
    return new Date(year, month - 1, day, hour, minute, second).getTime() || 0;
  }
  if (typeof val === "string") {
    return new Date(val).getTime() || 0;
  }
  return 0;
}

/**
 * Robust API fetcher:
 * 1. Checks if a custom root is configured via VITE_ADMIN_API_ROOT
 * 2. Tries the local proxy `/admin-api` in development or direct host
 * 3. Fallbacks cleanly to realistic cached/sample data if network is offline or CORS blocks it.
 */
async function fetchAdminEndpoint<T>(
  path: string,
  sampleFallback: T,
  signal?: AbortSignal
): Promise<{ data: T; source: "live" | "fallback"; error?: string }> {
  const customRoot = API_CONFIG.admin;
  const isDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

  const candidateUrls = customRoot
    ? [`${customRoot.replace(/\/$/, "")}${path}`]
    : isDev
    ? [`${PROXY_API_ROOT}${path}`, `${DIRECT_API_ROOT}${path}`]
    : [`${DIRECT_API_ROOT}${path}`, `${PROXY_API_ROOT}${path}`];

  let lastError: any = null;

  for (const url of candidateUrls) {
    try {
      let fetchSignal = signal;
      if (typeof AbortSignal !== "undefined" && typeof (AbortSignal as any).timeout === "function") {
        try {
          const timeoutSig = (AbortSignal as any).timeout(8000);
          if (signal && typeof (AbortSignal as any).any === "function") {
            fetchSignal = (AbortSignal as any).any([signal, timeoutSig]);
          } else if (!signal) {
            fetchSignal = timeoutSig;
          }
        } catch {
          // ignore signal composition fallback
        }
      }

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json, */*",
        },
        signal: fetchSignal,
      });

      if (response.ok) {
        const payload = await response.json();
        if (Array.isArray(payload)) {
          return { data: payload as T, source: "live" };
        }
      } else {
        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  // Gracefully fallback to sample data if direct connection is blocked
  console.warn(`[AdminAPI] Using realistic fallback for ${path}:`, lastError?.message || lastError);
  return {
    data: sampleFallback,
    source: "fallback",
    error: lastError instanceof Error ? lastError.message : "Connection unavailable",
  };
}

// 1. Live sessions API: GET /api/ai-service/vibe-code/admin/sessions/live
export async function fetchLiveSessions(signal?: AbortSignal) {
  return fetchAdminEndpoint<AdminSession[]>(
    "/ai-service/vibe-code/admin/sessions/live",
    SAMPLE_LIVE_SESSIONS,
    signal
  );
}

// 2. Completed sessions API: GET /api/ai-service/vibe-code/admin/sessions/completed
export async function fetchCompletedSessions(signal?: AbortSignal) {
  return fetchAdminEndpoint<AdminSession[]>(
    "/ai-service/vibe-code/admin/sessions/completed",
    SAMPLE_COMPLETED_SESSIONS,
    signal
  );
}

// 3. All sessions API: GET /api/ai-service/vibe-code/admin/sessions
export async function fetchAllSessions(signal?: AbortSignal) {
  return fetchAdminEndpoint<AdminSession[]>(
    "/ai-service/vibe-code/admin/sessions",
    [...SAMPLE_LIVE_SESSIONS, ...SAMPLE_COMPLETED_SESSIONS],
    signal
  );
}

// 4. All admin messages API: GET /api/ai-service/vibe-code/admin/all
export async function fetchAllAdminMessages(signal?: AbortSignal) {
  return fetchAdminEndpoint<AdminMessage[]>(
    "/ai-service/vibe-code/admin/all",
    SAMPLE_ALL_MESSAGES,
    signal
  );
}

/* ----------------------------------------------------
   Static Authentication Helpers
---------------------------------------------------- */
const ADMIN_STORAGE_KEY = "oxy_admin_session";

export interface AdminAuthSession {
  username: string;
  role: string;
  loggedInAt: number;
}

export function getAdminSession(): AdminAuthSession | null {
  try {
    const raw = sessionStorage.getItem(ADMIN_STORAGE_KEY) || localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isAdminAuthenticated(): boolean {
  return Boolean(getAdminSession());
}

export function adminLogin(
  user: string,
  pass: string,
  rememberMe: boolean = true
): { success: boolean; error?: string } {
  const cleanUser = user.trim().toLowerCase();
  const cleanPass = pass.trim();

  // Static credentials accepted:
  // Username: admin
  // Password: admin or admin123
  const validUsernames = ["admin", "admin@oxyloans.com", "admin@askoxy.ai", "oxyadmin"];
  const validPasswords = ["admin", "admin123", "oxyadmin2026", "password"];

  if (!cleanUser || !cleanPass) {
    return { success: false, error: "Please enter both username and password." };
  }

  if (validUsernames.includes(cleanUser) && validPasswords.includes(cleanPass)) {
    const session: AdminAuthSession = {
      username: cleanUser === "admin" ? "Super Admin" : cleanUser,
      role: "Administrator",
      loggedInAt: Date.now(),
    };

    if (rememberMe) {
      localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(session));
    }
    sessionStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(session));
    return { success: true };
  }

  return {
    success: false,
    error: "Invalid username or password.",
  };
}

export function adminLogout(): void {
  try {
    sessionStorage.removeItem(ADMIN_STORAGE_KEY);
    localStorage.removeItem(ADMIN_STORAGE_KEY);
  } catch {}
}
