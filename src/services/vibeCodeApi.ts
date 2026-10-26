import type { ChatContext, ChatMessage } from "../types/journey";
import { getPlatformById } from "../data/journeyData";
import { decodeVibeCodeStream } from "./vibeCodeStream";

import { API_CONFIG } from "../config";

/** Backend URLs come from src/config.ts. */
export const STREAM_API_ROOT = API_CONFIG.stream.replace(/\/$/, "");

export type VibeCodeMessageResponse = {
  chatWindowUrl?: string | null;
  loginRequired?: boolean;
  reply?: string | null;
  sessionId?: string | null;
  status?: boolean;
};

export type VibeCodeHistoryItem = {
  confidenceScore?: number | null;
  createdAt?: string | null;
  detectedJourneyKey?: string | null;
  id?: number | string | null;
  message?: string | null;
  sender?: string | null;
  sessionId?: string | null;
};

export type JourneyAuthResponse = {
  userId?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  mobileOtpSession?: string | null;
  whatsappOtpSession?: string | null;
  salt?: string | null;
  otpGeneratedTime?: string | null;
  message?: string | null;
  error?: string | null;
};

export type JourneyOtpMethod = "whatsapp" | "mobile";

function contextToCategory(context?: ChatContext | null) {
  // Direct, unselected chat is classification-based. The backend can use the
  // message itself to classify the user's intent, so categoryValue stays empty
  // until the frontend has an explicit classification value.
  if (!context) {
    return {
      categoryType: "CLASSIFICATION",
      categoryValue: "",
    };
  }

  if (context.type === "life-cycle") {
    return {
      categoryType: "LIFE_CYCLE",
      // IMPORTANT: send the visible stage name, not the frontend slug/id.
      // Example: "Youth & Career" instead of "youth-career".
      categoryValue: context.title.trim(),
    };
  }

  if (context.type === "platform") {
    return {
      categoryType: "PLATFORM",
      // Send the platform itself (e.g. "OXYLOANS", "OXYGOLD"), never the inner
      // journey under it (e.g. "Borrower"). context.subtitle holds the platform name.
      categoryValue: (getPlatformById(context.platformId || "")?.name || context.subtitle || "").trim(),
    };
  }

  return {
    categoryType: "CLASSIFICATION",
    categoryValue: (context.classificationValue || context.title || "").trim(),
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  let payload: any = null;

  try {
    payload = contentType.includes("application/json")
      ? await response.json()
      : await response.text();
  } catch {
    // Keep a useful fallback message if the backend returned an empty body.
  }

  if (!response.ok) {
    const backendMessage =
      typeof payload === "string"
        ? payload
        : payload?.message || payload?.error;

    throw new Error(
      backendMessage || `API request failed with status ${response.status}`
    );
  }

  return payload as T;
}

async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  root: string = API_ROOT
): Promise<T> {
  const response = await fetch(`${root}${path}`, {
    ...init,
    // The existing OXY login APIs return tokens in JSON and do not require
    // browser cookies. Omitting cross-origin credentials avoids unnecessary
    // credentialed-CORS restrictions.
    credentials: "omit",
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });

  return parseJson<T>(response);
}

export type JourneyIdentity = { userId: string; userMobile: string; accessToken?: string | null };
export type VibeCodeStreamOptions = {
  onChunk?: (chunk: string) => void;
  onReplace?: (text: string) => void;
  onMetadata?: (metadata: VibeCodeMessageResponse) => void;
  signal?: AbortSignal;
};
export function getJourneyIdentity(): JourneyIdentity | null {
  const userId = (localStorage.getItem("userId") || "").trim();
  const userMobile = (localStorage.getItem("userMobile") || localStorage.getItem("whatsappNumber") || localStorage.getItem("mobileNumber") || "").trim();
  if (!userId || !userMobile) return null;
  return { userId, userMobile, accessToken: localStorage.getItem("accessToken") || localStorage.getItem("token") };
}

export async function sendVibeCodeMessage(
  message: string,
  context?: ChatContext | null,
  sessionId?: string | null,
  options: VibeCodeStreamOptions = {}
): Promise<VibeCodeMessageResponse> {
  // Read fresh login data on every request, including the resumed fourth prompt.
  const identity = getJourneyIdentity();
  const response = await fetch(`${STREAM_API_ROOT}/ai-service/vibe-code/message/stream`, {
    method: "POST",
    credentials: "omit",
    cache: "no-store",
    signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(120000)]) : AbortSignal.timeout(120000),
    headers: {
      Accept: "text/event-stream, application/x-ndjson, application/json, text/plain",
      "Content-Type": "application/json",
      ...(identity?.accessToken ? { Authorization: `Bearer ${identity.accessToken}` } : {}),
    },
    body: JSON.stringify({
      ...contextToCategory(context),
      message: message.trim(),
      sessionId: sessionId || "",
      // Guest prompts omit both fields. Authenticated prompts include both.
      ...(identity ? { userId: identity.userId, userMobile: identity.userMobile } : {}),
    }),
  });
  if (!response.ok) {
    const payload = await response.text();
    let message = `Chat request failed (${response.status}).`;
    try { const value = JSON.parse(payload); message = value.message || value.error || message; } catch { /* use safe status fallback */ }
    throw new Error(message);
  }
  return decodeVibeCodeStream(response, options.onChunk, options.onMetadata, options.onReplace);
}

export async function getVibeCodeHistory(
  sessionId: string
): Promise<VibeCodeHistoryItem[]> {
  return apiFetch<VibeCodeHistoryItem[]>(
    `/ai-service/vibe-code/history/${encodeURIComponent(sessionId)}`,
    { method: "GET" },
    // Sessions are created by the stream endpoint, so read them from the same backend.
    STREAM_API_ROOT
  );
}

export async function requestJourneyOtp(args: {
  phoneNumber: string;
  countryCode: string;
  method: JourneyOtpMethod;
  deviceId: string;
}): Promise<JourneyAuthResponse> {
  const phoneField =
    args.method === "whatsapp"
      ? { whatsappNumber: args.phoneNumber }
      : { mobileNumber: args.phoneNumber };

  return apiFetch<JourneyAuthResponse>(
    "/user-service/registerwithMobileAndWhatsappNumber",
    {
      method: "POST",
      body: JSON.stringify({
        registrationType: args.method,
        userType: "Login",
        countryCode: args.countryCode,
        primaryType: "CUSTOMER",
        deviceId: args.deviceId,
        ...phoneField,
      }),
    }
  );
}

export async function verifyJourneyOtp(args: {
  phoneNumber: string;
  countryCode: string;
  method: JourneyOtpMethod;
  deviceId: string;
  otp: string;
  otpSession: string;
  salt: string;
  expiryTime: string;
}): Promise<JourneyAuthResponse> {
  const otpFields =
    args.method === "whatsapp"
      ? {
          whatsappNumber: args.phoneNumber,
          whatsappOtpSession: args.otpSession,
          whatsappOtpValue: args.otp,
        }
      : {
          mobileNumber: args.phoneNumber,
          mobileOtpSession: args.otpSession,
          mobileOtpValue: args.otp,
        };

  return apiFetch<JourneyAuthResponse>(
    "/user-service/registerwithMobileAndWhatsappNumber",
    {
      method: "POST",
      body: JSON.stringify({
        registrationType: args.method,
        userType: "Login",
        countryCode: args.countryCode,
        primaryType: "CUSTOMER",
        deviceId: args.deviceId,
        ...otpFields,
        salt: args.salt,
        expiryTime: args.expiryTime,
      }),
    }
  );
}

export async function updateVibeCodeSessionUser(args: {
  sessionId: string;
  userId: string;
  userMobile: string;
  accessToken?: string | null;
}): Promise<VibeCodeMessageResponse> {
  const headers: Record<string, string> = {};

  if (args.accessToken) {
    headers.Authorization = `Bearer ${args.accessToken}`;
  }

  return apiFetch<VibeCodeMessageResponse>(
    `/ai-service/vibe-code/${encodeURIComponent(args.sessionId)}/user`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        userId: args.userId,
        userMobile: args.userMobile,
      }),
    }
  );
}

export function historyToChatMessages(
  history: VibeCodeHistoryItem[]
): ChatMessage[] {
  return [...history]
    .sort((a, b) => {
      const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
      return aTime - bTime;
    })
    .filter((item) => Boolean(item.message?.trim()))
    .map((item, index) => {
      const sender = (item.sender || "").toUpperCase();
      const role: ChatMessage["role"] =
        sender === "USER" || sender === "CUSTOMER" ? "user" : "assistant";

      return {
        id: String(item.id ?? `${item.createdAt ?? "history"}-${index}`),
        role,
        content: item.message!.trim(),
      };
    });
}

export const VIBE_CODE_STORAGE = {
  sessionId: "vibeCodeSessionId",
  context: "vibeCodeChatContext",
  lifeStageId: "oxyJourneySavedLifeStageId",
  guestPromptCount: "oxyJourneyGuestPromptCount",
} as const;

export type PartnerUserSummary = {
  sessionId: string | null;
  userId: string | null;
  userName: string | null;
  journeyCategoryValue: string | null;
  leadStatus: string | null;
  matchedAt: string | null;
};

export type DirectChatMessage = {
  id: number | null;
  sessionId: string | null;
  senderId: string | null;
  senderName: string | null;
  senderType: string | null;
  message: string | null;
  createdAt: string | null;
};

export async function getDirectChat(sessionId: string): Promise<DirectChatMessage[]> {
  return apiFetch<DirectChatMessage[]>(
    `/ai-service/vibe-code/${encodeURIComponent(sessionId)}`,
    { method: "GET" },
    STREAM_API_ROOT
  );
}

export async function getPartnerUsers(partnerId: string): Promise<PartnerUserSummary[]> {
  return apiFetch<PartnerUserSummary[]>(
    `/ai-service/vibe-code/partner/${encodeURIComponent(partnerId)}/users`,
    { method: "GET" },
    STREAM_API_ROOT
  );
}

export async function getPartnerChatHistory(
  partnerId: string,
  sessionId: string
): Promise<VibeCodeHistoryItem[]> {
  return apiFetch<VibeCodeHistoryItem[]>(
    `/ai-service/vibe-code/partner/${encodeURIComponent(partnerId)}/history/${encodeURIComponent(sessionId)}`,
    { method: "GET" },
    STREAM_API_ROOT
  );
}

export async function getPartnerUsersByMobile(mobile: string): Promise<PartnerUserSummary[]> {
  return apiFetch<PartnerUserSummary[]>(
    `/ai-service/vibe-code/partner/by-mobile/${encodeURIComponent(mobile)}/users`,
    { method: "GET" },
    STREAM_API_ROOT
  );
}

export async function getPartnerChatHistoryByMobile(
  mobile: string,
  sessionId: string
): Promise<VibeCodeHistoryItem[]> {
  return apiFetch<VibeCodeHistoryItem[]>(
    `/ai-service/vibe-code/partner/by-mobile/${encodeURIComponent(mobile)}/history/${encodeURIComponent(sessionId)}`,
    { method: "GET" },
    STREAM_API_ROOT
  );
}
