import React, { useState, useRef, useEffect } from "react";
import { API_BASE_URL } from "../config";
import { LOGO as OXYJOURNEYS_LOGO } from "../data/journeyData";
import BorrowerLoginModal from "./BorrowerLoginModal";

const ASK_OXY_LOGO = new URL("../assets/askoxy-logo.png", import.meta.url).href;
const TV_RADHAKRISHNA_LOGO = new URL(
  "../assets/tvradhakrishna-logo.png",
  import.meta.url,
).href;

const BASE_URL =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:9876/api"
    : API_BASE_URL;

const BORROWER_PORTAL_URL = "https://oxyloans.com";

// Limits enforced by the backend (BorrowerFlowService) — checked here first so the borrower gets an instant, clear message.
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILES_PER_UPLOAD = 5;

// The chat is remembered in this browser so a refresh doesn't lose the application.
const STORAGE_KEY = "oxyloans_borrower_chat_v1";
const STORAGE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const LANGUAGE_KEY = "oxyloans_borrower_chat_lang";

interface ChatMessage {
  role: "USER" | "ASSISTANT";
  text: string;
}

interface ChatResponseDTO {
  bfSessionId: string;
  bfReply: string;
  bfStage: string;
  bfSuggestedReplies?: string[];
  bfSuggestions?: string[];
  bfInputPlaceholder?: string;
}

function getUtmParam(): string {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return params.get("utm") || params.get("utm_source") || "";
}

function resolveBrandName(utm: string): string {
  if (!utm || !utm.trim()) return "OxyJourneys";
  const clean = utm.trim();
  const lower = clean.toLowerCase();
  if (lower.includes("askoxy")) return "AskOxy.AI";
  if (lower.replace(/[\s_-]+/g, "").includes("tvradhakrishna")) return "TV Radhakrishna";
  if (lower.includes("oxyjourneys")) return "OxyJourneys";
  if (lower.includes("oxyloans")) return "OxyLoans";
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function resolveBrandLogo(utm: string): string | null {
  const lower = utm.trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (!lower || lower.includes("oxyjourneys")) return OXYJOURNEYS_LOGO;
  if (lower.includes("tvradhakrishna")) return TV_RADHAKRISHNA_LOGO;
  if (lower.includes("askoxy")) return ASK_OXY_LOGO;
  return null;
}

interface LoanTypeItem {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  badge: string;
  prompt: string;
}

const LOAN_TYPES: LoanTypeItem[] = [
  {
    id: "study_abroad",
    name: "Study Abroad Loans",
    subtitle: "Higher education & global admissions",
    icon: "🎓",
    badge: "Up to ₹1 Cr",
    prompt: "I want 25 lakhs loan for study abroad",
  },
  {
    id: "unstoppable",
    name: "Unstoppable Loans",
    subtitle: "Instant personal loan for salaried",
    icon: "⚡",
    badge: "Fast Track",
    prompt: "I want an unstoppable loan for salaried personal expenses",
  },
  {
    id: "gold",
    name: "Gold Loans",
    subtitle: "Instant liquidity against gold jewelry",
    icon: "🪙",
    badge: "Low Interest",
    prompt: "I want a gold loan against jewelry",
  },
  {
    id: "builder",
    name: "Builder Loans",
    subtitle: "Real estate & construction funding",
    icon: "🏗️",
    badge: "Up to ₹5 Cr",
    prompt: "I need a builder / construction project loan",
  },
  {
    id: "farmer",
    name: "Bridge / Farmer Loans",
    subtitle: "Agriculture & bridge working capital",
    icon: "🌾",
    badge: "Flexible Terms",
    prompt: "I need a bridge / farmer working capital loan",
  },
  {
    id: "creator",
    name: "Content Creator Loans",
    subtitle: "Equipment, studio & creator finance",
    icon: "🎥",
    badge: "Creators",
    prompt: "I am a content creator looking for a business loan",
  },
];

function getWelcomeMessage(lang: Language, brand: string): string {
  switch (lang) {
    case "HI":
      return `स्वागत है! मैं ${brand} का AI असिस्टेंट हूँ, आपसे मिलकर खुशी हुई। हम चाहते हैं कि हर कर्ज़दार केवल वास्तविक ज़रूरत के अनुसार ही कर्ज़ ले — कृपया वह लोन राशि दर्ज करें जो आप लेना चाहते हैं, बाकी प्रक्रिया में मैं आपकी मदद करूँगा।`;
    case "TE":
      return `స్వాగతం! నేను ${brand} AI అసిస్టెంట్‌ని, మీరు ఇక్కడికి రావడం సంతోషంగా ఉంది. నిజమైన అవసరానికి మాత్రమే రుణం తీసుకోవాలని మేము ప్రోత్సహిస్తాము — దయచేసి మీకు కావలసిన లోన్ మొత్తాన్ని నమోదు చేయండి, మిగతా దశల్లో నేను సహాయం చేస్తాను.`;
    default:
      return `Welcome! I'm ${brand}'s AI assistant, and I'm glad you're here. We encourage every borrower to borrow only based on genuine need — please enter the loan amount you'd like to borrow, and I'll help you through the rest.`;
  }
}

function getPlaceholderForStage(stage: string): string {
  switch (stage) {
    case "LOAN_PURPOSE":
      return "e.g., Study abroad, Unsecured salary loan, Business...";
    case "LOGIN_MOBILE":
      return "Enter 10-digit mobile number (e.g., 9849257032)";
    case "BORROWER_NAME":
      return "Enter full name exactly as on PAN card";
    case "BORROWER_TYPE":
      return "e.g., Salaried, Student, Business owner...";
    case "OCCUPATION_DETAILS":
      return "Type your response about your work and income...";
    case "AWAITING_PAN":
      return "Upload or attach PAN card photo/PDF...";
    case "AWAITING_AADHAAR":
      return "Upload or attach Aadhaar card photo/PDF...";
    case "AWAITING_INCOME_PROOF":
      return "Upload latest payslip (optional) or type here...";
    case "AWAITING_BANK_STATEMENT":
      return "Upload last 3-6 months bank statement PDF...";
    case "OFFER_CONSENT":
      return "Type your confirmation or questions...";
    case "SUBMITTED":
      return "Application submitted successfully";
    case "LOAN_AMOUNT":
    default:
      return "e.g., I want 5 lakhs loan for study abroad";
  }
}

interface SavedChat {
  sessionId: string;
  stage: string;
  messages: ChatMessage[];
  visited: string[];
  savedAt: number;
  utm?: string;
  suggestedReplies?: string[];
}

type Language = "EN" | "TE" | "HI";
const LANGUAGE_OPTIONS: { key: Language; label: string }[] = [
  { key: "EN", label: "EN" },
  { key: "TE", label: "తెలుగు" },
  { key: "HI", label: "हिन्दी" },
];

const STAGES = [
  {
    key: "LOAN_AMOUNT",
    label: "Loan Amount",
    note: "How much you need",
    labelTe: "లోన్ మొత్తం",
    noteTe: "మీకు ఎంత కావాలి",
    labelHi: "लोन राशि",
    noteHi: "आपको कितना चाहिए",
  },
  {
    key: "LOAN_PURPOSE",
    label: "Purpose",
    note: "What it's for",
    labelTe: "ఉద్దేశ్యం",
    noteTe: "దేనికి కావాలి",
    labelHi: "उद्देश्य",
    noteHi: "किसलिए चाहिए",
  },
  {
    key: "LOGIN_MOBILE",
    label: "Mobile Number",
    note: "Get logged in",
    labelTe: "మొబైల్ నంబర్",
    noteTe: "లాగిన్ కోసం",
    labelHi: "मोबाइल नंबर",
    noteHi: "लॉगिन के लिए",
  },
  {
    key: "BORROWER_NAME",
    label: "Your Name",
    note: "As on your PAN card",
    labelTe: "మీ పేరు",
    noteTe: "PAN కార్డ్ ప్రకారం",
    labelHi: "आपका नाम",
    noteHi: "PAN कार्ड के अनुसार",
  },
  {
    key: "BORROWER_TYPE",
    label: "Profile",
    note: "Salaried, student, business…",
    labelTe: "ప్రొఫైల్",
    noteTe: "ఉద్యోగి, విద్యార్థి, వ్యాపారం…",
    labelHi: "प्रोफ़ाइल",
    noteHi: "नौकरीपेशा, छात्र, व्यवसाय…",
  },
  {
    key: "OCCUPATION_DETAILS",
    label: "Work & Income",
    note: "About your work",
    labelTe: "పని & ఆదాయం",
    noteTe: "మీ పని వివరాలు",
    labelHi: "काम और आय",
    noteHi: "आपके काम की जानकारी",
  },
  {
    key: "AWAITING_PAN",
    label: "PAN Card",
    note: "Identity proof",
    labelTe: "PAN కార్డ్",
    noteTe: "గుర్తింపు రుజువు",
    labelHi: "PAN कार्ड",
    noteHi: "पहचान प्रमाण",
  },
  {
    key: "AWAITING_AADHAAR",
    label: "Aadhaar Card",
    note: "Identity proof",
    labelTe: "ఆధార్ కార్డ్",
    noteTe: "గుర్తింపు రుజువు",
    labelHi: "आधार कार्ड",
    noteHi: "पहचान प्रमाण",
  },
  {
    key: "AWAITING_INCOME_PROOF",
    label: "Payslip",
    note: "Salaried borrowers only",
    labelTe: "పేస్లిప్",
    noteTe: "జీతం పొందేవారికి మాత్రమే",
    labelHi: "पेस्लिप",
    noteHi: "केवल नौकरीपेशा के लिए",
  },
  {
    key: "AWAITING_BANK_STATEMENT",
    label: "Bank Statement",
    note: "Recent statement",
    labelTe: "బ్యాంక్ స్టేట్‌మెంట్",
    noteTe: "ఇటీవలి స్టేట్‌మెంట్",
    labelHi: "बैंक स्टेटमेंट",
    noteHi: "हाल का स्टेटमेंट",
  },
  {
    key: "OFFER_CONSENT",
    label: "Risk Review & Offer",
    note: "Review and accept",
    labelTe: "రిస్క్ రివ్యూ & ఆఫర్",
    noteTe: "సమీక్షించి అంగీకరించండి",
    labelHi: "रिस्क रिव्यू और ऑफ़र",
    noteHi: "देखें और स्वीकार करें",
  },
  {
    key: "SUBMITTED",
    label: "Login & Complete",
    note: "Check status on portal",
    labelTe: "లాగిన్ & పూర్తి",
    noteTe: "పోర్టల్‌లో స్థితి చూడండి",
    labelHi: "लॉगिन और पूरा करें",
    noteHi: "पोर्टल पर स्थिति देखें",
  },
] as const;

const CLOSED_STAGES = ["DECLINED"];

const SPEECH_LANG: Record<Language, string> = {
  EN: "en-IN",
  TE: "te-IN",
  HI: "hi-IN",
};

const UI_TEXT: Record<
  Language,
  {
    placeholder: string;
    closedPlaceholder: string;
    disclaimer: string;
    loginTitle: string;
    loginBody: string;
    loginButton: string;
    closedTitle: string;
    closedBody: string;
    newApplication: string;
    assistantNote: string;
    verifying: string;
    processing: string;
    caseRef: string;
    dismiss: string;
    notRequired: string;
    connectionIssue: string;
    newAppConfirm: string;
    newAppTitle: string;
    cancel: string;
    startNew: string;
    speechUnsupported: string;
    errNetwork: string;
    errSession: string;
    errNotFound: string;
    errTooLarge: string;
    errGeneric: string;
    errEmpty: string;
    errInvalid: string;
    fileTooBig: (names: string, many: boolean) => string;
    maxFiles: (n: number) => string;
  }
> = {
  EN: {
    placeholder: "Type your reply…",
    closedPlaceholder: "Changed your mind? You can still reply here.",
    disclaimer:
      "Responses may contain mistakes. Please verify important financial information.",
    loginTitle: "Application registered",
    loginBody:
      "Log in or register on the OxyLoans borrower portal with your registered mobile number, complete your profile and upload all the required documents — it helps us serve you better.",
    loginButton: "Login / Register on OxyLoans",
    closedTitle: "Application closed",
    closedBody:
      "This application isn't continuing. If you changed your mind, reply here — or start a new one anytime.",
    newApplication: "Start new application",
    assistantNote: "Assistant note",
    verifying: "Verifying documents…",
    processing: "Processing your input…",
    caseRef: "Case reference",
    dismiss: "Dismiss",
    notRequired: "Not required for your profile",
    connectionIssue: "Connection issue",
    newAppConfirm:
      "Start a new application? Your current chat will be cleared from this screen.",
    newAppTitle: "Start a new application?",
    cancel: "Cancel",
    startNew: "Start new",
    speechUnsupported: "Speech recognition is not supported in this browser.",
    errNetwork:
      "We are experiencing a temporary network issue. Please check your internet connection or try again shortly.",
    errSession:
      "Session validation failed. Please refresh the page to start a new chat.",
    errNotFound:
      "The requested chat service could not be found. Please try again later.",
    errTooLarge:
      "That file is too large. Please upload a file under 10 MB — a smaller PDF or a photo works.",
    errGeneric:
      "We are currently facing an issue processing your request. Please try again in a few moments.",
    errEmpty: "The server responded with an empty response.",
    errInvalid:
      "Received an invalid response from the server. Please try again shortly.",
    fileTooBig: (names, many) =>
      `${names} ${many ? "are" : "is"} over the 10 MB limit — please upload a smaller PDF or photo.`,
    maxFiles: (n) => `You can attach up to ${n} files at a time.`,
  },
  TE: {
    placeholder: "మీ సమాధానం టైప్ చేయండి…",
    closedPlaceholder: "మనసు మార్చుకున్నారా? మీరు ఇక్కడే సమాధానం ఇవ్వవచ్చు.",
    disclaimer:
      "ప్రతిస్పందనలలో పొరపాట్లు ఉండవచ్చు. ముఖ్యమైన ఆర్థిక సమాచారాన్ని దయచేసి ధృవీకరించండి.",
    loginTitle: "దరఖాస్తు నమోదైంది",
    loginBody:
      "మీ నమోదిత మొబైల్ నంబర్‌తో OxyLoans బారోవర్ పోర్టల్‌లో లాగిన్ అవ్వండి లేదా నమోదు చేసుకోండి, మీ ప్రొఫైల్ పూర్తి చేసి, అవసరమైన అన్ని పత్రాలను అప్‌లోడ్ చేయండి — ఇది మీకు మెరుగైన సేవ అందించడంలో మాకు సహాయపడుతుంది.",
    loginButton: "OxyLoans లో లాగిన్ / నమోదు",
    closedTitle: "దరఖాస్తు మూసివేయబడింది",
    closedBody:
      "ఈ దరఖాస్తు కొనసాగడం లేదు. మనసు మార్చుకుంటే ఇక్కడే సమాధానం ఇవ్వండి — లేదా కొత్త దరఖాస్తు ప్రారంభించండి.",
    newApplication: "కొత్త దరఖాస్తు ప్రారంభించండి",
    assistantNote: "అసిస్టెంట్ సందేశం",
    verifying: "పత్రాలను ధృవీకరిస్తున్నాము…",
    processing: "మీ సమాధానాన్ని పరిశీలిస్తున్నాము…",
    caseRef: "కేసు సూచిక",
    dismiss: "మూసివేయి",
    notRequired: "మీ ప్రొఫైల్‌కు అవసరం లేదు",
    connectionIssue: "కనెక్షన్ సమస్య",
    newAppConfirm:
      "కొత్త దరఖాస్తు ప్రారంభించాలా? ప్రస్తుత చాట్ ఈ స్క్రీన్ నుండి తొలగించబడుతుంది.",
    newAppTitle: "కొత్త దరఖాస్తు ప్రారంభించాలా?",
    cancel: "రద్దు చేయి",
    startNew: "కొత్తది ప్రారంభించు",
    speechUnsupported: "ఈ బ్రౌజర్‌లో వాయిస్ ఇన్‌పుట్‌కు మద్దతు లేదు.",
    errNetwork:
      "తాత్కాలిక నెట్‌వర్క్ సమస్య ఉంది. దయచేసి మీ ఇంటర్నెట్ కనెక్షన్ చూసుకుని మళ్లీ ప్రయత్నించండి.",
    errSession:
      "సెషన్ ధృవీకరణ విఫలమైంది. కొత్త చాట్ ప్రారంభించడానికి పేజీని రిఫ్రెష్ చేయండి.",
    errNotFound:
      "చాట్ సేవ కనుగొనబడలేదు. దయచేసి కొద్దిసేపటి తర్వాత ప్రయత్నించండి.",
    errTooLarge:
      "ఆ ఫైల్ చాలా పెద్దది. దయచేసి 10 MB కంటే తక్కువ ఫైల్ అప్‌లోడ్ చేయండి — చిన్న PDF లేదా ఫోటో సరిపోతుంది.",
    errGeneric:
      "మీ అభ్యర్థనను ప్రాసెస్ చేయడంలో సమస్య ఎదురైంది. దయచేసి కొద్దిసేపటి తర్వాత మళ్లీ ప్రయత్నించండి.",
    errEmpty: "సర్వర్ నుండి ఖాళీ స్పందన వచ్చింది.",
    errInvalid:
      "సర్వర్ నుండి చెల్లని స్పందన వచ్చింది. దయచేసి మళ్లీ ప్రయత్నించండి.",
    fileTooBig: (names, many) =>
      `${names} 10 MB పరిమితి దాటింది${many ? "ని" : ""} — దయచేసి చిన్న PDF లేదా ఫోటో అప్‌లోడ్ చేయండి.`,
    maxFiles: (n) => `ఒకేసారి గరిష్టంగా ${n} ఫైళ్లు జతచేయవచ్చు.`,
  },
  HI: {
    placeholder: "अपना जवाब लिखें…",
    closedPlaceholder: "मन बदल गया? आप यहीं जवाब दे सकते हैं।",
    disclaimer:
      "उत्तरों में गलतियाँ हो सकती हैं। कृपया महत्वपूर्ण वित्तीय जानकारी की पुष्टि कर लें।",
    loginTitle: "आवेदन दर्ज हो गया",
    loginBody:
      "अपने पंजीकृत मोबाइल नंबर से OxyLoans बॉरोअर पोर्टल पर लॉगिन करें या रजिस्टर करें, अपनी प्रोफ़ाइल पूरी करें और सभी आवश्यक दस्तावेज़ अपलोड करें — इससे हम आपकी बेहतर सेवा कर पाएँगे।",
    loginButton: "OxyLoans पर लॉगिन / रजिस्टर",
    closedTitle: "आवेदन बंद हो गया",
    closedBody:
      "यह आवेदन आगे नहीं बढ़ रहा है। मन बदला हो तो यहीं जवाब दें — या कभी भी नया आवेदन शुरू करें।",
    newApplication: "नया आवेदन शुरू करें",
    assistantNote: "असिस्टेंट संदेश",
    verifying: "दस्तावेज़ जाँचे जा रहे हैं…",
    processing: "आपका जवाब प्रोसेस हो रहा है…",
    caseRef: "केस संदर्भ",
    dismiss: "बंद करें",
    notRequired: "आपकी प्रोफ़ाइल के लिए ज़रूरी नहीं",
    connectionIssue: "कनेक्शन समस्या",
    newAppConfirm:
      "क्या नया आवेदन शुरू करें? आपकी मौजूदा चैट इस स्क्रीन से हट जाएगी।",
    newAppTitle: "नया आवेदन शुरू करें?",
    cancel: "रद्द करें",
    startNew: "नया शुरू करें",
    speechUnsupported: "इस ब्राउज़र में वॉइस इनपुट समर्थित नहीं है।",
    errNetwork:
      "अस्थायी नेटवर्क समस्या है। कृपया अपना इंटरनेट कनेक्शन जाँचें या थोड़ी देर बाद फिर कोशिश करें।",
    errSession:
      "सेशन सत्यापन विफल रहा। नई चैट शुरू करने के लिए पेज रीफ़्रेश करें।",
    errNotFound: "चैट सेवा नहीं मिली। कृपया बाद में कोशिश करें।",
    errTooLarge:
      "यह फ़ाइल बहुत बड़ी है। कृपया 10 MB से छोटी फ़ाइल अपलोड करें — छोटा PDF या फ़ोटो चलेगा।",
    errGeneric:
      "आपका अनुरोध प्रोसेस करने में समस्या आ रही है। कृपया कुछ देर बाद फिर कोशिश करें।",
    errEmpty: "सर्वर से खाली जवाब मिला।",
    errInvalid: "सर्वर से अमान्य जवाब मिला। कृपया फिर कोशिश करें।",
    fileTooBig: (names, many) =>
      `${names} 10 MB की सीमा से बड़ी ${many ? "हैं" : "है"} — कृपया छोटा PDF या फ़ोटो अपलोड करें।`,
    maxFiles: (n) => `एक बार में अधिकतम ${n} फ़ाइलें जोड़ सकते हैं।`,
  },
};

function stageIndex(stage: string): number {
  const i = STAGES.findIndex((s) => s.key === stage);
  return i === -1 ? STAGES.length : i; // unknown stage -> treat as "past the tracked list"
}

function loadSavedChat(currentUtm?: string): SavedChat | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedChat;
    if (
      !saved.sessionId ||
      !Array.isArray(saved.messages) ||
      Date.now() - saved.savedAt > STORAGE_MAX_AGE_MS
    ) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (
      saved.utm !== undefined &&
      currentUtm !== undefined &&
      saved.utm !== currentUtm
    ) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return saved;
  } catch {
    return null; // storage unavailable (private mode etc.) — just start fresh
  }
}

/** Turns URLs and "oxyloans.com" in assistant replies into clickable links. */
function renderWithLinks(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+|oxyloans\.com)/gi);
  return parts.map((part, i) => {
    if (/^https?:\/\//i.test(part) || /^oxyloans\.com$/i.test(part)) {
      const href = /^https?:\/\//i.test(part) ? part : BORROWER_PORTAL_URL;
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-medium"
          style={{ color: "#a9824f" }}
        >
          {part}
        </a>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

async function callApi<T>(
  url: string,
  options: RequestInit = {},
  lang: Language = "EN",
): Promise<T> {
  const t = UI_TEXT[lang];
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: { Accept: "application/json", ...(options.headers || {}) },
    });
  } catch (err) {
    console.error("Network/CORS error calling", url, err);
    throw new Error(t.errNetwork);
  }

  const raw = await res.text();

  if (!res.ok) {
    console.error(`API ${url} returned ${res.status}:`, raw);
    if (res.status === 401 || res.status === 403) {
      throw new Error(t.errSession);
    } else if (res.status === 404) {
      throw new Error(t.errNotFound);
    } else if (res.status === 413) {
      throw new Error(t.errTooLarge);
    } else {
      throw new Error(t.errGeneric);
    }
  }
  if (!raw) throw new Error(t.errEmpty);

  try {
    return JSON.parse(raw) as T;
  } catch {
    console.error(`API ${url} returned non-JSON body:`, raw);
    throw new Error(t.errInvalid);
  }
}

function FilePreviewThumbnail({ file }: { file: File }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  if (previewUrl) {
    return (
      <img
        src={previewUrl}
        alt={file.name}
        className="w-10 h-10 object-cover rounded border border-[#ddd2b8] shrink-0"
      />
    );
  }

  const isPdf =
    file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
  const isDoc =
    file.name.toLowerCase().endsWith(".doc") ||
    file.name.toLowerCase().endsWith(".docx");

  return (
    <div
      className="w-10 h-10 rounded flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-wider shrink-0"
      style={{ background: isPdf ? "#e1523f" : isDoc ? "#4682b4" : "#a9824f" }}
    >
      {isPdf ? "PDF" : isDoc ? "DOC" : "FILE"}
    </div>
  );
}

export default function SalariedBorrowerChatPage() {
  const utm = getUtmParam();
  const brandName = resolveBrandName(utm);
  const brandLogo = resolveBrandLogo(utm);
  const normalizedUtm = utm.trim().toLowerCase().replace(/[\s_-]+/g, "");
  const isTvRadhakrishnaBrand = normalizedUtm.includes("tvradhakrishna");
  const isAskOxyBrand = normalizedUtm.includes("askoxy");

  // Restore the previous chat from this browser, if there is one matching the current brand / utm.
  const [saved] = useState<SavedChat | null>(() => loadSavedChat(utm));

  const [sessionId, setSessionId] = useState<string | null>(
    saved?.sessionId ?? null,
  );
  const [stage, setStage] = useState<string>(saved?.stage ?? "LOAN_AMOUNT");
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const v = window.localStorage.getItem(LANGUAGE_KEY);
      return v === "TE" || v === "HI" ? v : "EN";
    } catch {
      return "EN";
    }
  });
  const languageRef = useRef<Language>(language);

  const [suggestedReplies, setSuggestedReplies] = useState<string[]>(
    () => saved?.suggestedReplies ?? [],
  );
  const [inputPlaceholder, setInputPlaceholder] = useState<string>(() =>
    getPlaceholderForStage(saved?.stage ?? "LOAN_AMOUNT"),
  );

  // Initial welcome message customized with current brand name
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (saved && saved.messages.length > 0) {
      if (
        saved.messages.length === 1 &&
        saved.messages[0].role === "ASSISTANT"
      ) {
        return [
          { role: "ASSISTANT", text: getWelcomeMessage(language, brandName) },
        ];
      }
      return saved.messages;
    }
    return [
      { role: "ASSISTANT", text: getWelcomeMessage(language, brandName) },
    ];
  });
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  // Every stage the application has been in. The payslip step is "skipped" if the application moved past it without ever
  // stopping there (non-salaried borrowers, or documents the backend already had) — this stays correct even when the
  // backend jumps several steps at once or goes back a step (e.g. after the borrower corrects their name).
  const visitedRef = useRef<Set<string>>(
    new Set(saved?.visited ?? ["LOAN_AMOUNT"]),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const ui = UI_TEXT[language];
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Authentication & Session History
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("userId");
    }
    return null;
  });
  const [userMobile, setUserMobile] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("userMobile") || localStorage.getItem("mobileNumber");
    }
    return null;
  });
  const [userHistory, setUserHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [sidebarView, setSidebarView] = useState<"loans" | "history">("loans");
  const [sidebarSearch, setSidebarSearch] = useState<string>("");
  const [selectedLoanId, setSelectedLoanId] = useState<string>("study_abroad");
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  const validHistory = userHistory.filter(
    (item: any) =>
      item.bfRequestedLoanAmount != null ||
      (item.bfLoanPurpose && item.bfLoanPurpose.trim().length > 0) ||
      (item.bfBorrowerName && item.bfBorrowerName.trim().length > 0) ||
      (item.bfPhoneNumber && item.bfPhoneNumber.trim().length > 0) ||
      (item.bfStage && item.bfStage !== "LOAN_AMOUNT")
  );

  const fetchUserHistory = async (uid: string) => {
    if (!uid) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(`${BASE_URL}/vibecode-service/borrower/user-sessions/${encodeURIComponent(uid)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setUserHistory(data);
        }
      }
    } catch (err) {
      console.error("Failed to load user history", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleLoginSuccess = async (auth: {
    userId: string;
    userMobile: string;
    accessToken?: string | null;
  }) => {
    setUserId(auth.userId);
    setUserMobile(auth.userMobile);
    setShowLoginModal(false);

    if (sessionIdRef.current) {
      try {
        await fetch(`${BASE_URL}/vibecode-service/borrower/link-user`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            sessionId: sessionIdRef.current,
            userId: auth.userId,
            mobileNumber: auth.userMobile || "",
          }),
        });
      } catch (e) {
        console.warn("Failed to link user to current session", e);
      }
    }

    await fetchUserHistory(auth.userId);
    await ensureSession();
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("userId");
      localStorage.removeItem("userMobile");
      localStorage.removeItem("mobileNumber");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
    } catch {}
    setUserId(null);
    setUserMobile(null);
    setUserHistory([]);
    setShowLoginModal(true);
  };

  const loadPastSession = async (pastSessionId: string) => {
    try {
      const res = await fetch(`${BASE_URL}/vibecode-service/borrower/history/${pastSessionId}`);
      if (res.ok) {
        const data = await res.json();
        sessionIdRef.current = pastSessionId;
        setSessionId(pastSessionId);
        if (data.session) {
          updateStage(data.session.bfStage || "LOAN_AMOUNT");
        }
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages(
            data.messages.map((m: any) => ({
              role: m.bfRole === "ASSISTANT" ? "ASSISTANT" : "USER",
              text: m.bfContent || "",
            }))
          );
        }
        const pastSuggestions = data.bfSuggestedReplies || data.bfSuggestions || [];
        setSuggestedReplies(pastSuggestions);
        setShowHistoryModal(false);
        setMobileSidebarOpen(false);
      }
    } catch (e) {
      console.error("Failed to load past session", e);
    }
  };

  useEffect(() => {
    const storedUserId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    const storedMobile = typeof window !== "undefined" ? (localStorage.getItem("userMobile") || localStorage.getItem("mobileNumber")) : null;
    if (storedMobile) {
      setUserMobile(storedMobile);
    }
    if (!storedUserId) {
      setShowLoginModal(true);
    } else {
      setUserId(storedUserId);
      fetchUserHistory(storedUserId);
      // Fetch session & prefilled suggestion messages directly from the API
      ensureSession();
    }
  }, []);

  const sessionIdRef = useRef<string | null>(saved?.sessionId ?? null);
  const startPromiseRef = useRef<Promise<string> | null>(null);

  const ensureSession = async (): Promise<string> => {
    if (sessionIdRef.current && messages.length > 1 && suggestedReplies.length > 0) {
      return sessionIdRef.current;
    }

    if (!startPromiseRef.current) {
      const utmVal = getUtmParam();
      const utmQuery = utmVal ? `&utm=${encodeURIComponent(utmVal)}` : "";
      const storedUid = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      const userQuery = storedUid ? `&userId=${encodeURIComponent(storedUid)}` : "";
      const storedMobile = typeof window !== "undefined" ? (localStorage.getItem("userMobile") || localStorage.getItem("mobileNumber")) : null;
      const mobileQuery = storedMobile ? `&mobileNumber=${encodeURIComponent(storedMobile)}` : "";
      startPromiseRef.current = callApi<ChatResponseDTO>(
        `${BASE_URL}/vibecode-service/borrower/start?bfLanguage=${languageRef.current}${utmQuery}${userQuery}${mobileQuery}`,
        { method: "POST" },
        languageRef.current,
      )
        .then((data) => {
          sessionIdRef.current = data.bfSessionId;
          setSessionId(data.bfSessionId);
          updateStage(data.bfStage);
          const replies = data.bfSuggestedReplies || data.bfSuggestions || [];
          setSuggestedReplies(replies);
          if (data.bfReply) {
            setMessages([{ role: "ASSISTANT", text: data.bfReply }]);
          }
          if (data.bfInputPlaceholder) {
            setInputPlaceholder(data.bfInputPlaceholder);
          } else {
            setInputPlaceholder(getPlaceholderForStage(data.bfStage));
          }
          return data.bfSessionId;
        })
        .catch((err) => {
          startPromiseRef.current = null; // allow retry on next send
          throw err;
        });
    }
    return startPromiseRef.current;
  };

  const updateStage = (next: string) => {
    visitedRef.current.add(next);
    setStage(next);
  };

  const resetChat = () => {
    sessionIdRef.current = null;
    startPromiseRef.current = null;
    visitedRef.current = new Set(["LOAN_AMOUNT"]);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setSessionId(null);
    setStage("LOAN_AMOUNT");
    setMessages([
      {
        role: "ASSISTANT",
        text: getWelcomeMessage(languageRef.current, brandName),
      },
    ]);
    setSuggestedReplies([]);
    setInputPlaceholder(getPlaceholderForStage("LOAN_AMOUNT"));
    setInputValue("");
    setPendingFiles([]);
    setConnectionError(null);
    setFileError(null);
    setSidebarView("loans");
    // Automatically re-initialize fresh session from API with suggestion chips
    setTimeout(() => {
      ensureSession();
    }, 0);
  };

  // Esc closes the new-application dialog.
  useEffect(() => {
    if (!showNewChatDialog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowNewChatDialog(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showNewChatDialog]);

  // Keep the chosen language for the next visit, and use it for the welcome message while the chat has not started yet.
  useEffect(() => {
    languageRef.current = language;
    try {
      window.localStorage.setItem(LANGUAGE_KEY, language);
    } catch {
      /* ignore */
    }
    setMessages((prev) =>
      prev.length === 1 && prev[0].role === "ASSISTANT"
        ? [{ role: "ASSISTANT", text: getWelcomeMessage(language, brandName) }]
        : prev,
    );
    if (recognitionRef.current)
      recognitionRef.current.lang = SPEECH_LANG[language];
  }, [language]);

  // Remember the conversation in this browser.
  useEffect(() => {
    if (!sessionId) return;
    try {
      const payload: SavedChat = {
        sessionId,
        stage,
        messages,
        visited: Array.from(visitedRef.current),
        savedAt: Date.now(),
        utm,
        suggestedReplies,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* storage full or unavailable — the chat still works, it just won't survive a refresh */
    }
  }, [sessionId, stage, messages, utm, suggestedReplies]);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = SPEECH_LANG[languageRef.current];

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue((prev) => (prev ? prev + " " + transcript : transcript));
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert(UI_TEXT[languageRef.current].speechUnsupported);
      return;
    }
    if (isListening) recognitionRef.current.stop();
    else recognitionRef.current.start();
  };

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, stage]);

  // DECLINED shows the "closed" card, but the borrower can still reply (the backend takes them back to the offer if they
  // say they accept after all), so the input stays enabled.
  const isClosed = CLOSED_STAGES.includes(stage);
  const isSubmitted = stage === "SUBMITTED";

  const handleSend = async () => {
    const text = inputValue.trim();
    if ((!text && pendingFiles.length === 0) || sending || uploading) return;

    const storedUid = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    if (!storedUid) {
      setShowLoginModal(true);
      return;
    }

    const filesToSend = [...pendingFiles];

    setMessages((prev) => [
      ...prev,
      ...filesToSend.map((file) => ({
        role: "USER" as const,
        text: `Attached: ${file.name}`,
      })),
      ...(text ? [{ role: "USER" as const, text }] : []),
    ]);

    setInputValue("");
    setPendingFiles([]);
    resetTextareaHeight();
    setConnectionError(null);
    setFileError(null);

    const isUpload = filesToSend.length > 0;
    isUpload ? setUploading(true) : setSending(true);

    try {
      const sid = await ensureSession();

      const formData = new FormData();
      if (text) formData.append("bfMessage", text);
      formData.append("bfLanguage", languageRef.current);
      const activeMobile = userMobile || (typeof window !== "undefined" ? (localStorage.getItem("userMobile") || localStorage.getItem("mobileNumber")) : null);
      if (activeMobile) formData.append("mobileNumber", activeMobile);
      filesToSend.forEach((file) => formData.append("files", file));

      const data = await callApi<ChatResponseDTO>(
        `${BASE_URL}/vibecode-service/borrower/chat?bfSessionId=${encodeURIComponent(sid)}`,
        { method: "POST", body: formData },
        languageRef.current,
      );

      updateStage(data.bfStage);
      setMessages((prev) => [
        ...prev,
        { role: "ASSISTANT", text: data.bfReply },
      ]);
      const replies = data.bfSuggestedReplies || data.bfSuggestions || [];
      setSuggestedReplies(replies);
      if (data.bfInputPlaceholder) {
        setInputPlaceholder(data.bfInputPlaceholder);
      } else {
        setInputPlaceholder(getPlaceholderForStage(data.bfStage));
      }
    } catch (err) {
      const errMsg =
        (err as Error).message || UI_TEXT[languageRef.current].errGeneric;
      setConnectionError(errMsg);
      setMessages((prev) => [...prev, { role: "ASSISTANT", text: errMsg }]);
      // Nothing reached the assistant, so give the borrower their message and files back to resend.
      if (filesToSend.length > 0) setPendingFiles(filesToSend);
      if (text) setInputValue(text);
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const handlePillClick = (pill: string) => {
    if (sending || uploading || isSubmitted) return;
    setInputValue(pill);
    if (textareaRef.current) {
      textareaRef.current.focus();
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
          textareaRef.current.style.height =
            Math.min(textareaRef.current.scrollHeight, 160) + "px";
        }
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;
    const filesArray = Array.from(selectedFiles);
    if (fileInputRef.current) fileInputRef.current.value = "";

    // Same limits as the backend, with a specific message instead of a generic upload failure
    const tooBig = filesArray.filter((f) => f.size > MAX_FILE_BYTES);
    let accepted = filesArray.filter((f) => f.size <= MAX_FILE_BYTES);
    const problems: string[] = [];
    if (tooBig.length > 0) {
      problems.push(
        ui.fileTooBig(
          tooBig.map((f) => `"${f.name}"`).join(", "),
          tooBig.length !== 1,
        ),
      );
    }
    const room = MAX_FILES_PER_UPLOAD - pendingFiles.length;
    if (accepted.length > room) {
      problems.push(ui.maxFiles(MAX_FILES_PER_UPLOAD));
      accepted = accepted.slice(0, Math.max(room, 0));
    }
    setFileError(problems.length > 0 ? problems.join(" ") : null);
    if (accepted.length > 0) setPendingFiles((prev) => [...prev, ...accepted]);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const resetTextareaHeight = () => {
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const currentStageIndex = stageIndex(stage);
  const knownStage = STAGES.find((s) => s.key === stage);
  const inputDisabled = sending || uploading;
  const payslipIndex = stageIndex("AWAITING_INCOME_PROOF");
  const payslipSkipped =
    !visitedRef.current.has("AWAITING_INCOME_PROOF") &&
    currentStageIndex > payslipIndex;
  const bannerText = connectionError || fileError;

  // Per-step display state: done / active / skipped / pending
  const stepState = (key: string, i: number) => {
    if (key === "AWAITING_INCOME_PROOF" && payslipSkipped) return "skipped";
    if (key === "SUBMITTED" && isSubmitted) return "done";
    if (i < currentStageIndex) return "done";
    if (i === currentStageIndex) return "active";
    return "pending";
  };

  const stageLabel = (s: (typeof STAGES)[number]) =>
    language === "TE" ? s.labelTe : language === "HI" ? s.labelHi : s.label;
  const stageNote = (s: (typeof STAGES)[number]) =>
    language === "TE" ? s.noteTe : language === "HI" ? s.noteHi : s.note;
  const headerLabel = connectionError
    ? ui.connectionIssue
    : isClosed
      ? ui.closedTitle
      : knownStage
        ? stageLabel(knownStage)
        : stage;

  return (
    <div
      className="flex h-screen h-[100dvh] w-full overflow-hidden"
      style={{
        background: "#f4f5f7",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        .bf-serif { font-family: 'Fraunces', serif; }
        .bf-label { font-family: 'Inter', sans-serif; letter-spacing: 0.05em; text-transform: uppercase; }
        .bf-mono { font-family: 'JetBrains Mono', monospace; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

      {mobileSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[1px] md:hidden"
          aria-label="Close sidebar"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Clean, Modern Sidebar matching reference design */}
      <div
        id="borrower-sidebar"
        className={`${mobileSidebarOpen ? "flex" : "hidden"} fixed inset-y-0 left-0 z-50 w-[min(88vw,325px)] flex-col md:relative md:inset-auto md:z-auto md:flex ${
          sidebarCollapsed ? "md:w-[68px]" : "md:w-[300px] lg:w-[325px]"
        } shrink-0 p-3.5 bg-white border-r border-[#e5e7eb] justify-between overflow-hidden shadow-[2px_0_12px_rgba(0,0,0,0.08)] md:shadow-[2px_0_12px_rgba(0,0,0,0.02)] transition-all duration-200`}
      >
        {sidebarCollapsed ? (
          <div className="flex flex-col items-center gap-3 w-full">
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              title="Expand Sidebar"
            >
              <span className="text-sm font-bold">›</span>
            </button>
            <button
              type="button"
              onClick={() => setShowNewChatDialog(true)}
              className="w-9 h-9 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
              title="New Application"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => {
                setSidebarCollapsed(false);
                setSidebarView("loans");
              }}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                sidebarView === "loans"
                  ? "bg-[#4338ca] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              title="Loan Products"
            >
              💳
            </button>
            <button
              type="button"
              onClick={() => {
                setSidebarCollapsed(false);
                const storedUid =
                  typeof window !== "undefined"
                    ? localStorage.getItem("userId")
                    : null;
                if (!storedUid) {
                  setShowLoginModal(true);
                  return;
                }
                fetchUserHistory(storedUid);
                setSidebarView("history");
              }}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                sidebarView === "history"
                  ? "bg-[#4338ca] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              title="Application History"
            >
              📋
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 min-h-0 flex-1 overflow-hidden">
            {/* Brand Header & Collapse Icon */}
            <div className="flex items-center justify-between pb-2 shrink-0">
              <div className="flex min-w-0 items-center gap-1.5">
                {brandLogo ? (
                  <img
                    src={brandLogo}
                    alt={brandName}
                    className={`block w-auto object-contain object-left ${
                      isTvRadhakrishnaBrand
                        ? "h-12 max-w-[235px]"
                        : isAskOxyBrand
                          ? "h-12 max-w-[235px]"
                          : "h-9 max-w-[210px]"
                    }`}
                  />
                ) : (
                  <span className="truncate text-[18px] font-extrabold tracking-tight text-[#0f172a]">
                    {brandName}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSidebarCollapsed(true)}
                className="hidden md:flex w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 items-center justify-center transition-colors cursor-pointer"
                title="Collapse sidebar"
              >
                <span className="text-xs font-bold leading-none">‹</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl leading-none text-slate-600 hover:bg-slate-200 md:hidden"
                aria-label="Close sidebar"
              >
                ×
              </button>
            </div>

            {/* Pill Search Bar */}
            <div className="relative flex items-center w-full mb-1 shrink-0">
              <span className="absolute left-3.5 text-slate-400 text-xs pointer-events-none">
                🔍
              </span>
              <input
                type="text"
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                placeholder={
                  sidebarView === "loans"
                    ? "Search loan products..."
                    : "Search applications..."
                }
                className="w-full pl-9 pr-7 py-2 bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-slate-800 placeholder-slate-400 text-[13px] rounded-full border border-transparent focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              />
              {sidebarSearch && (
                <button
                  type="button"
                  onClick={() => setSidebarSearch("")}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 text-[11px] cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Segmented Pill Tabs: Loans & History */}
            <div className="flex items-center gap-2 mb-1 shrink-0">
              <button
                type="button"
                onClick={() => setSidebarView("loans")}
                className={`flex-1 py-2 px-3 rounded-full text-[13px] font-semibold transition-all cursor-pointer text-center ${
                  sidebarView === "loans"
                    ? "bg-[#4338ca] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                }`}
              >
                Loans
              </button>
              <button
                type="button"
                onClick={() => {
                  const storedUid =
                    typeof window !== "undefined"
                      ? localStorage.getItem("userId")
                      : null;
                  if (!storedUid) {
                    setShowLoginModal(true);
                    return;
                  }
                  fetchUserHistory(storedUid);
                  setSidebarView("history");
                }}
                className={`flex-1 py-2 px-3 rounded-full text-[13px] font-semibold transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                  sidebarView === "history"
                    ? "bg-[#4338ca] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                }`}
              >
                <span>History</span>
                {validHistory.length > 0 && (
                  <span
                    className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                      sidebarView === "history"
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {validHistory.length}
                  </span>
                )}
              </button>
            </div>

            {/* New Application Button */}
            <button
              type="button"
              onClick={() => setShowNewChatDialog(true)}
              className="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-full text-[12px] font-semibold text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-200/50 transition-all cursor-pointer mb-2 shadow-2xs shrink-0"
            >
              <span className="text-[14px] leading-none font-bold">+</span>
              <span>New Application</span>
            </button>

            {/* Dynamic Content: Loan Products OR History */}
            {sidebarView === "history" ? (
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="text-[11px] font-bold tracking-wider uppercase text-slate-400 px-1 mb-2 shrink-0 flex items-center justify-between">
                  <span>APPLICATION HISTORY</span>
                  <button
                    type="button"
                    onClick={() => setSidebarView("loans")}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                  >
                    ← Loans
                  </button>
                </div>

                {/* History Items List */}
                <div className="flex flex-col gap-2 overflow-y-auto pr-1 flex-1 min-h-0">
                  {loadingHistory ? (
                    <div className="py-8 text-center text-slate-400 text-[12px]">
                      <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent mb-2"></div>
                      <div>Loading applications…</div>
                    </div>
                  ) : validHistory.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-[12px] px-2">
                      <div className="text-2xl mb-1.5">📂</div>
                      <div className="font-semibold text-slate-600">
                        No past applications
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Start your application by typing in the chat.
                      </div>
                    </div>
                  ) : (
                    (() => {
                      const filteredHistory = validHistory.filter(
                        (item: any) => {
                          if (!sidebarSearch.trim()) return true;
                          const q = sidebarSearch.toLowerCase();
                          const purpose = (
                            item.bfLoanPurpose || "Loan Application"
                          ).toLowerCase();
                          const amount = item.bfRequestedLoanAmount
                            ? String(item.bfRequestedLoanAmount)
                            : "";
                          const st = (item.bfStage || "").toLowerCase();
                          return (
                            purpose.includes(q) ||
                            amount.includes(q) ||
                            st.includes(q)
                          );
                        }
                      );

                      if (filteredHistory.length === 0) {
                        return (
                          <div className="py-6 text-center text-slate-400 text-xs">
                            No applications match &quot;{sidebarSearch}&quot;
                          </div>
                        );
                      }

                      return filteredHistory.map((item: any) => {
                        const isCurrent = item.bfSessionId === sessionId;
                        return (
                          <button
                            key={item.bfSessionId}
                            type="button"
                            onClick={() => loadPastSession(item.bfSessionId)}
                            className={`text-left p-3 rounded-2xl border transition-all cursor-pointer shrink-0 flex flex-col gap-1.5 ${
                              isCurrent
                                ? "bg-[#eef2ff] border-indigo-200 shadow-2xs"
                                : "bg-white hover:bg-slate-50/80 border-slate-200/70 hover:border-indigo-200 shadow-2xs"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-2 min-w-0">
                                {isCurrent ? (
                                  <span className="w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-indigo-200 shrink-0" />
                                ) : (
                                  <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                                )}
                                <span
                                  className={`text-[12.5px] truncate ${
                                    isCurrent
                                      ? "font-bold text-slate-900"
                                      : "font-semibold text-slate-700"
                                  }`}
                                >
                                  {item.bfLoanPurpose || "Loan Application"}
                                </span>
                              </div>
                              <div className="shrink-0 flex items-center gap-1">
                                <span className="text-[11.5px] font-bold text-indigo-700">
                                  {item.bfRequestedLoanAmount != null
                                    ? `₹${Number(
                                        item.bfRequestedLoanAmount
                                      ).toLocaleString("en-IN")}`
                                    : ""}
                                </span>
                                {isCurrent && (
                                  <span className="text-indigo-600 text-xs font-bold">
                                    ✓
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-1 text-[10px] text-slate-500 pl-4">
                              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                                {(item.bfStage || "IN PROGRESS").replaceAll(
                                  "_",
                                  " "
                                )}
                              </span>
                              <span className="text-slate-400">
                                {item.bfCreatedAt
                                  ? new Date(
                                      item.bfCreatedAt
                                    ).toLocaleDateString("en-IN", {
                                      day: "numeric",
                                      month: "short",
                                    })
                                  : ""}
                              </span>
                            </div>
                          </button>
                        );
                      });
                    })()
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="text-[11px] font-bold tracking-wider uppercase text-slate-400 px-1 mb-2 shrink-0 flex items-center justify-between">
                  <span>LOAN PRODUCTS</span>
                  <span className="text-[9.5px] font-semibold text-slate-400">
                    Core Offers
                  </span>
                </div>

                {/* Clean, Unified Loan Types List (No Rainbow Clutter) */}
                <div className="flex flex-col gap-1.5 overflow-y-auto pr-1 flex-1 min-h-0">
                  {(() => {
                    const filteredLoans = LOAN_TYPES.filter((loan) => {
                      if (!sidebarSearch.trim()) return true;
                      const q = sidebarSearch.toLowerCase();
                      return (
                        loan.name.toLowerCase().includes(q) ||
                        loan.subtitle.toLowerCase().includes(q) ||
                        loan.badge.toLowerCase().includes(q)
                      );
                    });

                    if (filteredLoans.length === 0) {
                      return (
                        <div className="py-6 text-center text-slate-400 text-xs">
                          No loan products match &quot;{sidebarSearch}&quot;
                        </div>
                      );
                    }

                    return filteredLoans.map((loan) => {
                      const isSelected = selectedLoanId === loan.id;
                      return (
                        <button
                          key={loan.id}
                          type="button"
                          onClick={() => {
                            setSelectedLoanId(loan.id);
                            setInputValue(loan.prompt);
                            setMobileSidebarOpen(false);
                            if (textareaRef.current) {
                              textareaRef.current.focus();
                              setTimeout(() => {
                                if (textareaRef.current) {
                                  textareaRef.current.style.height = "auto";
                                  textareaRef.current.style.height =
                                    Math.min(
                                      textareaRef.current.scrollHeight,
                                      160
                                    ) + "px";
                                }
                              }, 0);
                            }
                          }}
                          className={`group text-left px-3.5 py-2.5 rounded-2xl transition-all cursor-pointer shrink-0 flex items-center justify-between ${
                            isSelected
                              ? "bg-[#eef2ff] border border-indigo-100/90 shadow-2xs"
                              : "hover:bg-slate-50 border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            {isSelected ? (
                              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-indigo-100 shrink-0" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-slate-400 shrink-0" />
                            )}
                            <div className="flex flex-col min-w-0">
                              <span
                                className={`text-[13px] tracking-tight truncate ${
                                  isSelected
                                    ? "font-semibold text-slate-900"
                                    : "font-medium text-slate-700 group-hover:text-slate-900"
                                }`}
                              >
                                {loan.name}
                              </span>
                              <span className="text-[11px] text-slate-400 truncate leading-tight">
                                {loan.subtitle}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-1.5">
                            {isSelected ? (
                              <span className="text-indigo-600 font-bold text-sm">
                                ✓
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-slate-400 group-hover:text-slate-600 bg-slate-100/80 px-2 py-0.5 rounded-full">
                                {loan.badge}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dual Lending Architecture: Clean & Refined */}
        {!sidebarCollapsed && (
          <div className="pt-2 border-t border-slate-100 shrink-0">
            <div className="rounded-xl px-3 py-2 bg-slate-50/80 border border-slate-200/70 shadow-2xs">
              <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                <span className="text-amber-500 text-[12px]">⚡</span>
                <span>Lending Architecture</span>
              </div>

              <div className="space-y-1 text-[10px] leading-snug">
                <div className="flex items-center gap-1.5">
                  <span className="text-indigo-600 font-bold">✓</span>
                  <span>
                    <strong className="text-slate-800">≤ ₹10L:</strong>
                    <span className="text-slate-700 font-medium"> OxyLoans</span>
                    <span className="text-slate-500"> (P2P NBFC)</span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>
                    <strong className="text-slate-800">&gt; ₹10L:</strong>
                    <span className="text-slate-700 font-medium">
                      {" "}
                      Oxy Finserve
                    </span>
                    <span className="text-slate-500"> (Banks / NBFCs)</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-col flex-1 min-w-0">
        {/* Letterhead bar */}
        <div
          className="h-[56px] md:h-[64px] min-h-[56px] md:min-h-[64px] flex items-center justify-between px-4 md:px-7"
          style={{ background: "#ffffff", borderBottom: "1px solid #e4e7eb" }}
        >
          <div className="flex min-w-0 items-center gap-2 md:gap-3">
            <button
              type="button"
              onClick={() => {
                setSidebarCollapsed(false);
                setMobileSidebarOpen(true);
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-xs md:hidden"
              aria-label="Open sidebar"
              aria-controls="borrower-sidebar"
              aria-expanded={mobileSidebarOpen}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              </svg>
            </button>
            <div className="flex min-w-0 items-center md:hidden">
              {brandLogo ? (
                <img
                  src={brandLogo}
                  alt={brandName}
                  className={`block w-auto object-contain object-left ${
                    isTvRadhakrishnaBrand
                      ? "h-9 max-w-[180px] sm:h-10 sm:max-w-[220px]"
                      : isAskOxyBrand
                        ? "h-9 max-w-[180px] sm:h-10 sm:max-w-[220px]"
                        : "h-7 max-w-[145px] sm:max-w-[180px]"
                  }`}
                />
              ) : (
                <span className="truncate text-[14px] font-bold text-slate-800">
                  {brandName}
                </span>
              )}
            </div>
            <div className="hidden min-w-0 items-center gap-1.5 md:flex">
              <span
                className="inline-block w-[6px] h-[6px] rounded-full"
                style={{
                  background:
                    connectionError || isClosed ? "#a3452f" : "#3f7a5c",
                }}
              />
              <span className="truncate text-[12px]" style={{ color: "#6b6455" }}>
                {headerLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSubmitted && (
              <a
                href={BORROWER_PORTAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex px-3 py-1 rounded-lg text-[12px] font-semibold text-white"
                style={{ background: "#a9824f" }}
              >
                {ui.loginButton}
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                window.location.href = "/";
              }}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-[12px] font-semibold text-slate-700 shadow-xs transition-colors hover:bg-slate-50 hover:text-slate-900 sm:px-3"
              title="Go to OxyJourneys Home Landing Page"
            >
              <span>←</span>
              <span className="hidden sm:inline">Back to Home</span>
            </button>
          </div>
        </div>

        {bannerText && (
          <div
            className="px-4 md:px-7 py-3 text-[13px] flex items-center justify-between"
            style={{
              background: "#f6e4de",
              borderBottom: "1px solid #e3bfae",
              color: "#a3452f",
            }}
          >
            <span>{bannerText}</span>
            <button
              onClick={() => {
                setConnectionError(null);
                setFileError(null);
              }}
              className="ml-4 flex-none text-[12px] font-semibold underline hover:no-underline"
            >
              {ui.dismiss}
            </button>
          </div>
        )}

        {/* Transcript */}
        <div className="min-h-0 flex-1 overflow-y-auto py-4 overscroll-contain md:py-8" ref={scrollRef}>
          {messages.map((m, i) => (
            <div
              key={i}
              className="w-full max-w-[700px] mx-auto mb-4 md:mb-5 px-4 md:px-7"
            >
              {m.role === "ASSISTANT" ? (
                <div
                  className="pl-3 md:pl-4 pr-3 md:pr-4 py-3 rounded-r-lg"
                  style={{
                    borderLeft: "3px solid #a9824f",
                    background: "#fafafa",
                  }}
                >
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <div
                      className="bf-label text-[10px] font-semibold"
                      style={{ color: "#a9824f" }}
                    >
                      {ui.assistantNote}
                    </div>
                    {i === 0 && (
                      <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-[#ddd2b8] shadow-xs">
                        <span className="text-[11px] text-[#6b6455] font-medium mr-0.5">
                          🌐
                        </span>
                        {LANGUAGE_OPTIONS.map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => setLanguage(opt.key)}
                            className="px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                            style={{
                              background:
                                language === opt.key
                                  ? "#1b2a41"
                                  : "transparent",
                              color:
                                language === opt.key ? "#ffffff" : "#6b6455",
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div
                    className="text-[14px] md:text-[14.5px] leading-relaxed whitespace-pre-wrap"
                    style={{ color: "#1f2430" }}
                  >
                    {renderWithLinks(m.text)}
                  </div>
                </div>
              ) : (
                <div className="flex justify-end">
                  <div
                    className="px-3.5 py-2.5 text-[14px] md:text-[14.5px] leading-relaxed max-w-[85%] md:max-w-[480px] whitespace-pre-wrap text-white"
                    style={{
                      background: "#1b2a41",
                      borderRadius: "8px 8px 2px 8px",
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              )}
            </div>
          ))}

          {(sending || uploading) && (
            <div className="w-full max-w-[700px] mx-auto mb-5 px-4 md:px-7">
              <div
                className="pl-3 md:pl-4"
                style={{ borderLeft: "2.5px solid #ddd2b8" }}
              >
                <div
                  className="bf-label text-[9.5px] mb-1"
                  style={{ color: "#a39a86" }}
                >
                  {ui.assistantNote}
                </div>
                <div className="text-[14px]" style={{ color: "#8c8474" }}>
                  {uploading ? ui.verifying : ui.processing}
                </div>
              </div>
            </div>
          )}

          {/* Final step: login to borrower portal */}
          {isSubmitted && !sending && !uploading && (
            <div className="w-full max-w-[700px] mx-auto mb-5 px-4 md:px-7">
              <div
                className="p-4 md:p-5 rounded-xl flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5"
                style={{ background: "#1b2a41", color: "#ffffff" }}
              >
                <div className="flex-1">
                  <div className="bf-serif text-[16px] font-medium text-[#e7d3ae]">
                    {ui.loginTitle}
                  </div>
                  <div
                    className="text-[13px] mt-1 leading-relaxed"
                    style={{ color: "#c9cfdb" }}
                  >
                    {ui.loginBody}
                  </div>
                </div>
                <a
                  href={BORROWER_PORTAL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-center px-4 py-2 rounded-lg text-[13px] font-semibold"
                  style={{ background: "#a9824f", color: "#ffffff" }}
                >
                  {ui.loginButton}
                </a>
              </div>
            </div>
          )}

          {/* Declined / closed */}
          {isClosed && !sending && !uploading && (
            <div className="w-full max-w-[700px] mx-auto mb-5 px-4 md:px-7">
              <div
                className="p-4 md:p-5 rounded-xl flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5"
                style={{ background: "#f6e4de", border: "1px solid #e3bfae" }}
              >
                <div className="flex-1">
                  <div
                    className="bf-serif text-[16px] font-medium"
                    style={{ color: "#a3452f" }}
                  >
                    {ui.closedTitle}
                  </div>
                  <div
                    className="text-[13px] mt-1"
                    style={{ color: "#6b6455" }}
                  >
                    {ui.closedBody}
                  </div>
                </div>
                <button
                  onClick={resetChat}
                  className="shrink-0 px-4 py-2 rounded-lg text-[13px] font-semibold text-white"
                  style={{ background: "#1b2a41" }}
                >
                  {ui.newApplication}
                </button>
              </div>
            </div>
          )}
        </div>

        <div
          className="shrink-0 px-3 pb-2 pt-2.5 sm:px-4 md:px-7 md:pb-6 md:pt-4"
          style={{ background: "#ffffff", borderTop: "1px solid #e4e7eb", paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          <div className="w-full max-w-[700px] mx-auto">
            {pendingFiles.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {pendingFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12.5px]"
                    style={{
                      background: "#fafafa",
                      border: "1px solid #ddd2b8",
                      color: "#1b2a41",
                    }}
                  >
                    <FilePreviewThumbnail file={file} />
                    <span className="max-w-[160px] truncate font-medium">
                      {file.name}
                    </span>
                    <button
                      onClick={() => removePendingFile(index)}
                      className="flex-none w-4 h-4 rounded-full flex items-center justify-center hover:bg-[#f0ece0]"
                      style={{ color: "#a3452f" }}
                      title="Remove"
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <path
                          d="M18 6 6 18M6 6l12 12"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Suggested quick replies (4 complete sentence suggestions) */}
            {suggestedReplies &&
              suggestedReplies.length > 0 &&
              !inputDisabled &&
              !isClosed && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none px-0.5">
                  {suggestedReplies.slice(0, 4).map((pill, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handlePillClick(pill)}
                      title="Click to select this response"
                      className="px-3 py-1.5 text-[12px] md:text-[12.5px] font-medium rounded-full bg-white border border-[#d9c9a8] text-[#1b2a41] hover:bg-[#1b2a41] hover:text-white hover:border-[#1b2a41] transition-all whitespace-nowrap shadow-sm shrink-0 flex items-center gap-1.5 active:scale-95 cursor-pointer"
                    >
                      <span className="text-[11px] opacity-70">💬</span>
                      <span>{pill}</span>
                    </button>
                  ))}
                </div>
              )}

            <div
              className="flex items-end gap-2.5 px-3 py-2 rounded-xl transition-shadow"
              style={{
                border: "1.5px solid #d9c9a8",
                background: "#fafafa",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <button
                onClick={handleFileClick}
                disabled={inputDisabled || isSubmitted}
                title="Attach a document"
                className="flex-none w-8 h-8 rounded flex items-center justify-center bg-white transition-colors disabled:opacity-50"
                style={{ border: "1px solid #ddd2b8", color: "#6b6455" }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*,application/pdf,.doc,.docx"
                multiple
                onChange={handleFileChange}
              />

              <textarea
                ref={textareaRef}
                rows={1}
                placeholder={
                  isClosed
                    ? ui.closedPlaceholder
                    : inputPlaceholder || ui.placeholder
                }
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  const el = e.target;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 160) + "px";
                }}
                onKeyDown={handleKeyDown}
                className="flex-1 resize-none border-none outline-none py-1 text-[14.5px] bg-transparent placeholder:text-[#a3a9b3] disabled:text-[#c2c6cc] overflow-y-auto"
                style={{ maxHeight: "160px", minHeight: "24px" }}
              />

              <button
                onClick={toggleListening}
                disabled={inputDisabled}
                title={isListening ? "Stop listening" : "Voice input"}
                className={`flex-none w-8 h-8 rounded flex items-center justify-center transition-all ${isListening ? "animate-pulse" : "bg-white"} disabled:opacity-50`}
                style={{
                  border: isListening
                    ? "1px solid #ef4444"
                    : "1px solid #ddd2b8",
                  background: isListening ? "#ef4444" : "#ffffff",
                  color: isListening ? "#ffffff" : "#6b6455",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M19 10v2a7 7 0 0 1-14 0v-2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <line
                    x1="12"
                    y1="19"
                    x2="12"
                    y2="23"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <line
                    x1="8"
                    y1="23"
                    x2="16"
                    y2="23"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <button
                onClick={handleSend}
                disabled={
                  (!inputValue.trim() && pendingFiles.length === 0) ||
                  inputDisabled
                }
                className="flex-none w-8 h-8 rounded flex items-center justify-center text-white transition-colors disabled:opacity-30"
                style={{ background: "#1b2a41" }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line
                    x1="22"
                    y1="2"
                    x2="11"
                    y2="13"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <polygon
                    points="22 2 15 22 11 13 2 9 22 2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            <div
              className="hidden text-center text-[11px] mt-4 leading-relaxed sm:block"
              style={{ color: "#9aa0aa" }}
            >
              {ui.disclaimer}
            </div>
          </div>
        </div>
      </div>

      {/* New application confirmation */}
      {showNewChatDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(27, 42, 65, 0.55)" }}
          onClick={() => setShowNewChatDialog(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bf-new-chat-title"
            className="w-full max-w-[400px] rounded-xl p-5 md:p-6"
            style={{
              background: "#ffffff",
              borderTop: "4px solid #a9824f",
              boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              id="bf-new-chat-title"
              className="bf-serif text-[18px] font-medium"
              style={{ color: "#1b2a41" }}
            >
              {ui.newAppTitle}
            </div>
            <div
              className="text-[13.5px] mt-2 leading-relaxed"
              style={{ color: "#6b6455" }}
            >
              {ui.newAppConfirm}
            </div>
            <div className="flex justify-end gap-2.5 mt-5">
              <button
                onClick={() => setShowNewChatDialog(false)}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold"
                style={{
                  border: "1px solid #ddd2b8",
                  color: "#6b6455",
                  background: "#ffffff",
                }}
              >
                {ui.cancel}
              </button>
              <button
                autoFocus
                onClick={() => {
                  setShowNewChatDialog(false);
                  resetChat();
                }}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white"
                style={{ background: "#1b2a41" }}
              >
                {ui.startNew}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Borrower Login Modal */}
      <BorrowerLoginModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
      />

      {/* User Application History Modal */}
      {showHistoryModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => setShowHistoryModal(false)}
        >
          <div
            className="w-full max-w-[560px] max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="text-xl">📋</span>
                <div>
                  <h3 className="text-[15px] font-bold text-slate-900">Your Loan Applications</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {userMobile ? `Linked to +91 ${userMobile}` : "Application History"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 text-lg font-bold transition-colors cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingHistory ? (
                <div className="py-12 text-center text-slate-500 text-[13px]">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mb-2"></div>
                  <div>Loading your applications…</div>
                </div>
              ) : validHistory.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-[13px]">
                  <div className="text-3xl mb-2">📂</div>
                  <div className="font-semibold text-slate-700">No applications found</div>
                  <p className="text-[12px] text-slate-400 mt-1 max-w-xs mx-auto">
                    You have not submitted any loan applications yet with this number.
                  </p>
                </div>
              ) : (
                validHistory.map((item: any) => {
                  const isCurrent = item.bfSessionId === sessionId;
                  return (
                    <div
                      key={item.bfSessionId}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isCurrent
                          ? "border-blue-500 bg-blue-50/40 shadow-xs ring-1 ring-blue-400"
                          : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[14px] font-bold text-slate-800">
                          {item.bfLoanPurpose || "Loan Application"}
                        </span>
                        <span className="text-[14px] font-bold text-blue-700">
                          {item.bfRequestedLoanAmount != null
                            ? `₹${Number(item.bfRequestedLoanAmount).toLocaleString("en-IN")}`
                            : "Amount not set"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {(item.bfStage || "IN PROGRESS").replaceAll("_", " ")}
                        </span>
                        {item.bfCreatedAt && (
                          <span className="text-[11px] text-slate-400">
                            🕒 {new Date(item.bfCreatedAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </span>
                        )}
                        {item.bfUtm && (
                          <span className="text-[9.5px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">
                            {item.bfUtm}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
                        <span className="text-[10px] text-slate-400 font-mono">
                          ID: {item.bfSessionId.slice(0, 8)}…
                        </span>
                        {isCurrent ? (
                          <span className="text-[11px] font-semibold text-blue-600 bg-blue-100 px-2.5 py-1 rounded-md">
                            Current Active Chat
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => loadPastSession(item.bfSessionId)}
                            className="px-3 py-1 rounded-md text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
                          >
                            Open Application →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setShowHistoryModal(false);
                  resetChat();
                }}
                className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-slate-700 border border-slate-300 hover:bg-white transition-colors cursor-pointer"
              >
                + New Application
              </button>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-1.5 rounded-lg text-[12px] font-semibold text-white bg-slate-800 hover:bg-slate-900 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
