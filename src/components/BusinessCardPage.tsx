import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import HomeHeader from "./HomeHeader";
import PageNavigation from "./PageNavigation";
import {
  connectBusinessCardCandidate,
  getBusinessCardUserHistory,
  getJourneyIdentity,
  uploadBusinessCard,
  type BusinessCardUserHistoryResponse,
  type BusinessCardResult,
} from "../services/vibeCodeApi";
import "./BusinessCardPage.css";

type BusinessCardPageProps = {
  onBack: () => void;
  onAssistant: () => void;
};

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_MATCHES = 5;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
const PROCESSING_STEPS = [
  { label: "Uploading your card securely", detail: "Your file is being prepared for analysis.", progress: 18 },
  { label: "Reading card details", detail: "We’re identifying your name, role, company and expertise.", progress: 43 },
  { label: "Understanding your journey", detail: "We’re matching your profile with relevant opportunities.", progress: 68 },
  { label: "Finding your best 5 matches", detail: "Almost there — we’re preparing meaningful connections for you.", progress: 90 },
];
const PROCESSING_SIGNALS = ["Profile", "Domain", "Growth goals"];
const WAITING_TIPS = [
  "Your profile stays private and is used only to find relevant connections.",
  "Great matches can be partners, customers, mentors or future collaborators.",
  "We look beyond titles to find people with genuine relevance to your journey.",
  "Your five matches are being selected for quality, not just similarity.",
];
const BUSINESS_CARD_USER_ID_KEY = "oxyBusinessCardUserId";

function getChatWindowHref(value?: string | null): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value, window.location.origin);
    if (!["http:", "https:"].includes(url.protocol) || !/^\/oxy-journey\/chat\/[^/]+(?:\/(?:user|partner))?\/?$/i.test(url.pathname)) return null;
    return url.href;
  } catch {
    return null;
  }
}

function resolveUserChatUrl(chatWindowUrl?: string | null, reply?: string | null): string | null {
  const directUrl = getChatWindowHref(chatWindowUrl);
  if (directUrl) return directUrl;

  const messageUrl = reply?.match(/https?:\/\/[^\s)\]]+\/oxy-journey\/chat\/[^\s)\]]+/i)?.[0];
  return getChatWindowHref(messageUrl);
}

function businessCardStatus(result: BusinessCardResult): string {
  const matchCount = result.candidates?.length ?? 0;
  if (matchCount > 0) return `We found ${matchCount} relevant ${matchCount === 1 ? "person" : "people"} in the network.`;
  if (result.sessionId) return "Your card was processed. No matching members were found right now.";
  return "We couldn't complete matching right now. Please try again shortly.";
}

function ProcessingPanel({ step }: { step: number }) {
  const currentStep = PROCESSING_STEPS[step];

  return (
    <div className="bcp-processing" role="status" aria-live="polite" aria-busy="true">
      <div className="bcp-match-scene" aria-hidden="true">
        <svg className="bcp-match-paths" viewBox="0 0 300 150" preserveAspectRatio="none">
          <path d="M105 75 C150 75 156 30 205 30" />
          <path d="M105 75 C150 75 156 75 205 75" />
          <path d="M105 75 C150 75 156 120 205 120" />
        </svg>
        <div className="bcp-scan-card">
          <span className="bcp-scan-card-icon">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 9h5M7 13h3M15 10h2M15 14h2" /></svg>
          </span>
          <span className="bcp-scan-lines"><i /><i /><i /></span>
          <span className="bcp-scan-beam" />
        </div>
        <span className="bcp-data-pulse bcp-data-pulse-one" />
        <span className="bcp-data-pulse bcp-data-pulse-two" />
        <span className="bcp-data-pulse bcp-data-pulse-three" />
        <span className="bcp-match-person bcp-match-person-one"><i>1</i><b>✓</b></span>
        <span className="bcp-match-person bcp-match-person-two"><i>2</i><b>✓</b></span>
        <span className="bcp-match-person bcp-match-person-three"><i>3</i><b>✓</b></span>
      </div>
      <h2>Your card is working for you</h2>
      <div key={step} className="bcp-processing-copy">
      <p className="bcp-processing-message">{currentStep.label}</p>
      <p className="bcp-processing-detail">{currentStep.detail}</p>
      </div>

      <div className="bcp-processing-signals" aria-label="Match signals being analysed">
        {PROCESSING_SIGNALS.map((signal, index) => (
          <span key={signal} className={index <= step ? "is-active" : ""}><i aria-hidden="true">✓</i>{signal}</span>
        ))}
      </div>

      <div className="bcp-processing-bar" aria-hidden="true">
        <span style={{ transform: `scaleX(${currentStep.progress / 100})` }} />
      </div>
      <div className="bcp-processing-steps" aria-label={`Step ${step + 1} of ${PROCESSING_STEPS.length}`}>
        {PROCESSING_STEPS.map((item, index) => (
          <span key={item.label} className={index <= step ? "is-complete" : ""} />
        ))}
      </div>
      <p className="bcp-processing-tip"><span key={step} className="bcp-processing-tip-copy"><strong>Did you know?</strong> {WAITING_TIPS[step]}</span></p>
      <p className="bcp-processing-trust"><span aria-hidden="true">✦</span> Smart matching in progress · Your information is protected</p>
    </div>
  );
}

function ProcessingStyles() {
  return (
    <style>{`
      .bcp-processing{min-height:360px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:18px 12px;text-align:center}
      .bcp-processing-orbit{position:relative;display:grid;place-items:center;width:94px;height:94px;margin-bottom:18px;border:1px solid #dce7ff;border-radius:50%;background:conic-gradient(from 180deg,#eef4ff,#ede9fe,#dbeafe,#eef4ff);animation:bcp-spin 5s linear infinite}
      .bcp-processing-orbit:before{content:"";position:absolute;inset:8px;border-radius:50%;background:#fff}
      .bcp-processing-node{position:absolute;z-index:2;width:8px;height:8px;border:2px solid #fff;border-radius:50%;background:#7c3aed;box-shadow:0 2px 7px rgba(91,91,240,.4)}.bcp-processing-node-one{top:7px;right:15px}.bcp-processing-node-two{bottom:14px;left:4px;background:#2563eb}.bcp-processing-node-three{right:2px;bottom:18px;background:#9d45e8}
      .bcp-processing-card{position:relative;z-index:1;display:grid;place-items:center;width:54px;height:54px;border-radius:17px;color:#fff;background:linear-gradient(135deg,#155eef,#7c3aed);box-shadow:0 10px 22px rgba(69,78,220,.28);animation:bcp-float 2s ease-in-out infinite}
      .bcp-processing h2{margin:0;color:#141a2b;font-size:22px;letter-spacing:-.02em}.bcp-processing-message{margin:10px 0 3px;color:#155eef;font-weight:800;font-size:16px}.bcp-processing-detail{max-width:390px;margin:0;color:#6b7387;font-size:14px;line-height:1.5}
      .bcp-processing-signals{display:flex;flex-wrap:wrap;justify-content:center;gap:7px;margin:17px 0 0}.bcp-processing-signals span{display:flex;align-items:center;gap:4px;padding:5px 9px;border:1px solid #e2e8f5;border-radius:999px;color:#99a2b4;background:#fafcff;font-size:11px;font-weight:700;transition:.35s}.bcp-processing-signals span i{display:grid;place-items:center;width:13px;height:13px;border-radius:50%;background:#e2e8f5;color:#fff;font-size:9px;font-style:normal}.bcp-processing-signals span.is-active{border-color:#d6d5ff;color:#4f46b8;background:#f6f5ff}.bcp-processing-signals span.is-active i{background:#6259d8}
      .bcp-processing-bar{overflow:hidden;width:min(400px,100%);height:9px;margin:22px 0 10px;border-radius:999px;background:#e8edf8}.bcp-processing-bar span{position:relative;display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#2563eb,#7c3aed);transition:width .65s ease}.bcp-processing-bar span:after{content:"";position:absolute;inset:0;background:linear-gradient(105deg,transparent 25%,rgba(255,255,255,.62) 48%,transparent 70%);animation:bcp-shimmer 1.6s linear infinite}
      .bcp-processing-steps{display:flex;gap:7px}.bcp-processing-steps span{width:7px;height:7px;border-radius:50%;background:#d9e1f0;transition:background .3s,transform .3s}.bcp-processing-steps span.is-complete{background:#4f46e5;transform:scale(1.15)}
      .bcp-processing-tip{max-width:440px;margin:22px 0 0;padding:10px 14px;border-radius:12px;background:#f5f7ff;color:#65708a;font-size:12px;line-height:1.5}.bcp-processing-tip strong{color:#38476b}.bcp-processing-trust{margin:10px 0 0;color:#8a94a7;font-size:11px;font-weight:600}.bcp-processing-trust span{color:#7468e8;font-size:14px;vertical-align:-1px}
      @keyframes bcp-spin{to{transform:rotate(360deg)}}@keyframes bcp-float{50%{transform:translateY(-4px)}}@keyframes bcp-shimmer{from{transform:translateX(-100%)}to{transform:translateX(100%)}}@media (prefers-reduced-motion:reduce){.bcp-processing-orbit,.bcp-processing-card,.bcp-processing-bar span:after{animation:none}.bcp-processing-bar span,.bcp-processing-steps span,.bcp-processing-signals span{transition:none}}
      .bcp-processing{animation:bcp-reveal .8s cubic-bezier(.16,1,.3,1) both}
      .bcp-processing-orbit{width:120px;height:120px;margin:8px 0 26px;background:transparent;border:0;animation:none;isolation:isolate}
      .bcp-processing-orbit:before{inset:-14px;background:radial-gradient(circle,#e9e5ff 0%,#edf3ff8c 45%,transparent 72%);animation:bcp-breathe 4.6s cubic-bezier(.45,0,.55,1) infinite;z-index:-1;will-change:transform,opacity}
      .bcp-processing-orbit:after{content:"";position:absolute;inset:13px;border:1px dashed #c7d2f2;border-radius:50%;animation:bcp-spin 26s linear infinite reverse;z-index:-1;will-change:transform}
      .bcp-processing-ring{position:absolute;inset:0;border:1px solid #e3e7fc;border-radius:50%;animation:bcp-spin 14s linear infinite;will-change:transform}
      .bcp-processing-ring:before{content:"";position:absolute;inset:-1px;border:3px solid transparent;border-top-color:#8fa5ff;border-right-color:#c4a7ff;border-radius:50%;opacity:.72}
      .bcp-processing-ring:after{content:"";position:absolute;inset:20px;border:1px solid #e6ebff;border-radius:50%;box-shadow:inset 0 0 18px #9b8cff14}
      .bcp-processing-node{animation:bcp-node-pulse 2.8s cubic-bezier(.45,0,.55,1) infinite;will-change:transform,opacity}
      .bcp-processing-node-two{animation-delay:-.9s}.bcp-processing-node-three{animation-delay:-1.8s}
      .bcp-processing-card{width:60px;height:60px;border-radius:19px;overflow:hidden;animation:bcp-card-drift 4.8s cubic-bezier(.45,0,.55,1) infinite;box-shadow:0 12px 26px #6655d52b,inset 0 1px 1px #ffffff60;will-change:transform}
      .bcp-processing-card:after{content:"";position:absolute;inset:-40%;background:linear-gradient(110deg,transparent 38%,#ffffff25 50%,transparent 62%);animation:bcp-card-light 6s ease-in-out infinite;pointer-events:none}
      .bcp-processing h2{animation:bcp-heading-in .9s .15s cubic-bezier(.16,1,.3,1) both}
      .bcp-processing-copy{min-height:76px;display:flex;flex-direction:column;align-items:center;animation:bcp-copy-in .7s cubic-bezier(.16,1,.3,1) both}
      .bcp-processing-bar span{width:100%;transform-origin:left;transition:transform 2.35s cubic-bezier(.16,1,.3,1);will-change:transform}
      .bcp-processing-bar span:after{animation-duration:3s;opacity:.55}
      .bcp-processing-tip{min-height:60px;display:grid;place-items:center;box-sizing:border-box}
      .bcp-processing-tip-copy{display:block;animation:bcp-copy-in .75s cubic-bezier(.16,1,.3,1) both}
      .bcp-processing-signals span{transform:translateY(0);transition:background .65s ease,color .65s ease,border-color .65s ease,transform .65s cubic-bezier(.16,1,.3,1),box-shadow .65s ease}
      .bcp-processing-signals span.is-active{transform:translateY(-1px);box-shadow:0 5px 14px #6259d814}
      .bcp-processing-signals span i{transition:background .65s ease,transform .65s cubic-bezier(.16,1,.3,1)}
      .bcp-processing-signals span.is-active i{transform:scale(1.08)}
      .bcp-processing-steps span{transition:background .55s ease,transform .55s cubic-bezier(.16,1,.3,1),box-shadow .55s ease}
      .bcp-processing-steps span.is-complete{box-shadow:0 0 0 4px #4f46e510}
      .bcp-match-scene{position:relative;width:min(320px,100%);height:158px;margin:0 0 22px;isolation:isolate}
      .bcp-match-scene:before{content:"";position:absolute;inset:13px 35px;border-radius:50%;background:radial-gradient(ellipse,#eaf0ff 0%,#f4f6ff99 48%,transparent 72%);animation:bcp-scene-breathe 4.5s ease-in-out infinite;z-index:-1}
      .bcp-match-paths{position:absolute;inset:4px 10px;width:calc(100% - 20px);height:150px;overflow:visible}
      .bcp-match-paths path{fill:none;stroke:#cbd8fb;stroke-width:1.5;stroke-linecap:round;stroke-dasharray:5 7;animation:bcp-path-flow 4s linear infinite}
      .bcp-match-paths path:nth-child(2){animation-delay:-1.3s}.bcp-match-paths path:nth-child(3){animation-delay:-2.6s}
      .bcp-scan-card{position:absolute;left:24px;top:43px;width:104px;height:72px;display:flex;align-items:center;gap:10px;padding:13px;border:1px solid #cddaff;border-radius:15px;background:linear-gradient(145deg,#fff,#f5f7ff);box-shadow:0 14px 30px #3a5ec21c;animation:bcp-scan-card-float 4.8s ease-in-out infinite;overflow:hidden;will-change:transform}
      .bcp-scan-card-icon{display:grid;place-items:center;flex:none;width:38px;height:38px;border-radius:11px;color:#fff;background:linear-gradient(145deg,#1f6df2,#6847ef);box-shadow:0 8px 18px #315fdb32}
      .bcp-scan-lines{display:grid;flex:1;gap:6px}.bcp-scan-lines i{display:block;height:4px;border-radius:99px;background:#d9e2f7}.bcp-scan-lines i:nth-child(2){width:76%}.bcp-scan-lines i:nth-child(3){width:52%}
      .bcp-scan-beam{position:absolute;top:-10%;bottom:-10%;width:26px;background:linear-gradient(90deg,transparent,#2f70ff2d,transparent);filter:drop-shadow(0 0 5px #5a73ff66);animation:bcp-scan-beam 2.8s cubic-bezier(.45,0,.55,1) infinite}
      .bcp-match-person{position:absolute;right:30px;display:grid;place-items:center;width:44px;height:44px;border:3px solid #fff;border-radius:50%;color:#536179;background:linear-gradient(145deg,#e9efff,#f9faff);box-shadow:0 8px 20px #3959a822;animation:bcp-person-in 3.6s cubic-bezier(.16,1,.3,1) infinite;will-change:transform,opacity}
      .bcp-match-person i{font-size:12px;font-style:normal;font-weight:800}.bcp-match-person b{position:absolute;right:-4px;bottom:-2px;display:grid;place-items:center;width:18px;height:18px;border:2px solid #fff;border-radius:50%;color:#fff;background:#24b47e;font-size:10px}
      .bcp-match-person-one{top:7px;animation-delay:0s}.bcp-match-person-two{top:57px;right:10px;animation-delay:-1.2s}.bcp-match-person-three{top:107px;animation-delay:-2.4s}
      .bcp-data-pulse{position:absolute;left:125px;width:7px;height:7px;border-radius:50%;background:#2563eb;box-shadow:0 0 0 4px #2563eb14;animation:bcp-data-travel 3.6s linear infinite;opacity:0}
      .bcp-data-pulse-one{top:72px;--pulse-y:-45px}.bcp-data-pulse-two{top:75px;--pulse-y:0px;animation-delay:-1.2s}.bcp-data-pulse-three{top:78px;--pulse-y:45px;animation-delay:-2.4s}
      @keyframes bcp-reveal{from{opacity:0;transform:translateY(10px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
      @keyframes bcp-heading-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      @keyframes bcp-copy-in{from{opacity:0;transform:translateY(8px);filter:blur(2px)}to{opacity:1;transform:translateY(0);filter:blur(0)}}
      @keyframes bcp-card-drift{0%,100%{transform:translate3d(0,2px,0) rotate(-2deg)}50%{transform:translate3d(0,-5px,0) rotate(2deg)}}
      @keyframes bcp-breathe{0%,100%{opacity:.58;transform:scale(.96)}50%{opacity:1;transform:scale(1.07)}}
      @keyframes bcp-node-pulse{0%,100%{opacity:.72;transform:scale(.88)}50%{opacity:1;transform:scale(1.22)}}
      @keyframes bcp-card-light{0%,25%{transform:translateX(-100%)}65%,100%{transform:translateX(100%)}}
      @keyframes bcp-scene-breathe{0%,100%{opacity:.65;transform:scale(.96)}50%{opacity:1;transform:scale(1.04)}}
      @keyframes bcp-path-flow{to{stroke-dashoffset:-24}}
      @keyframes bcp-scan-card-float{0%,100%{transform:translateY(2px) rotate(-1deg)}50%{transform:translateY(-4px) rotate(1deg)}}
      @keyframes bcp-scan-beam{0%{left:-30%;opacity:0}18%{opacity:1}82%{opacity:1}100%{left:110%;opacity:0}}
      @keyframes bcp-person-in{0%,100%{opacity:.72;transform:scale(.92)}20%,72%{opacity:1;transform:scale(1)}35%{transform:scale(1.08)}}
      @keyframes bcp-data-travel{0%{opacity:0;transform:translate(0,0) scale(.7)}12%{opacity:1}82%{opacity:1}100%{opacity:0;transform:translate(103px,var(--pulse-y)) scale(1)}}
      @media(max-width:480px){.bcp-processing{padding:16px 0}.bcp-processing h2{font-size:20px}.bcp-processing-copy{min-height:92px}.bcp-processing-tip{min-height:78px}.bcp-processing-detail{font-size:13px}}
      @media(prefers-reduced-motion:reduce){.bcp-processing,.bcp-processing h2,.bcp-match-scene:before,.bcp-match-paths path,.bcp-scan-card,.bcp-scan-beam,.bcp-match-person,.bcp-data-pulse,.bcp-processing-copy,.bcp-processing-tip-copy{animation:none}.bcp-data-pulse{display:none}.bcp-processing-bar span,.bcp-processing-signals span,.bcp-processing-signals span i,.bcp-processing-steps span{transition:none}}
    `}</style>
  );
}


export default function BusinessCardPage({ onBack, onAssistant }: BusinessCardPageProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<BusinessCardResult | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [chatLinks, setChatLinks] = useState<Record<string, string>>({});
  const [processingStep, setProcessingStep] = useState(0);
  const [history, setHistory] = useState<BusinessCardUserHistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyActionError, setHistoryActionError] = useState("");
  const [historyRevision, setHistoryRevision] = useState(0);
  const [selectedCardKey, setSelectedCardKey] = useState<string | null>(() => new URLSearchParams(window.location.search).get("card"));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // A resolved card-holder ID is more specific than the currently logged-in
    // browser account. This keeps card history tied to the uploaded card number.
    const userId = (localStorage.getItem(BUSINESS_CARD_USER_ID_KEY) || localStorage.getItem("userId") || "").trim();
    if (!userId) {
      setHistory(null);
      setHistoryLoading(false);
      return;
    }

    let active = true;
    const accessToken = localStorage.getItem("accessToken") || localStorage.getItem("token");
    setHistoryLoading(true);
    setHistoryError("");
    void getBusinessCardUserHistory(userId, accessToken)
      .then(data => { if (active) setHistory(data); })
      .catch(err => {
        if (active) setHistoryError(err instanceof Error ? err.message : "Could not load business card history.");
      })
      .finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, [historyRevision]);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!uploading) {
      setProcessingStep(0);
      return;
    }
    const timer = window.setInterval(() => {
      setProcessingStep(current => Math.min(current + 1, PROCESSING_STEPS.length - 1));
    }, 3000);
    return () => window.clearInterval(timer);
  }, [uploading]);

  function pick(next: File | undefined) {
    if (!next) return;
    if (!ACCEPTED.includes(next.type)) return setError("Please upload a PNG, JPG, WebP or PDF.");
    if (next.size > MAX_BYTES) return setError("File is too large. Maximum size is 5 MB.");
    setError("");
    setDone(false);
    setFile(next);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    pick(event.dataTransfer.files[0]);
  }

  async function upload() {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const userId = (localStorage.getItem("userId") || "").trim() || undefined;
      const accessToken = localStorage.getItem("accessToken") || localStorage.getItem("token");
      const nextResult = await uploadBusinessCard({ file, userId, accessToken });
      if (!userId && nextResult.resolvedUserId) {
        localStorage.setItem(BUSINESS_CARD_USER_ID_KEY, nextResult.resolvedUserId);
      }
      setResult(nextResult);
      setChatLinks({});
      setDone(true);
      setHistoryRevision(current => current + 1);
    } catch {
      setError("We couldn't process your card right now. Please try again shortly.");
    } finally {
      setUploading(false);
    }
  }

  function submitCard() {
    if (!file || uploading) return;
    void upload();
  }

  function uploadAnother() {
    setSelectedCardKey(null);
    setResult(null);
    setDone(false);
    setFile(null);
    setError("");
  }


  /** Connects with a matched member and reveals the user's chat button. */
  async function connect(sessionId: string, candidateId: string, reconnect = false) {
    if (!sessionId || connectingId) return;
    const existing = chatLinks[candidateId];
    if (existing && !reconnect) {
      window.open(existing, "_blank", "noopener,noreferrer");
      return;
    }
    setError("");
    setHistoryActionError("");
    setConnectingId(candidateId);
    try {
      const reply = await connectBusinessCardCandidate({
        sessionId,
        candidateId,
        accessToken: getJourneyIdentity()?.accessToken,
      });
      const url = resolveUserChatUrl(reply.chatWindowUrl, reply.reply);
      if (!url) throw new Error("Connected, but the chat window is not ready yet. Please try again.");
      setChatLinks(current => ({ ...current, [candidateId]: url }));
      setHistoryRevision(current => current + 1);
    } catch {
      const message = "We couldn't connect right now. Please try again.";
      if (result?.sessionId === sessionId && selectedCardKey === null) setError(message);
      else setHistoryActionError(message);
    } finally {
      setConnectingId(null);
    }
  }

  const businessCards = (history?.businessCards ?? []).map(card => ({ ...card, sessionId: card.matchSessionId || card.sessionId }));
  const cardKey = (card: BusinessCardUserHistoryResponse["businessCards"][number], index: number) =>
    card.uploadId || `${card.uploadedAt || "card"}-${index}`;
  const selectedCard = businessCards.find((card, index) => cardKey(card, index) === selectedCardKey);
  const selectedMembers = selectedCard?.relatedMembers?.length
    ? selectedCard.relatedMembers.map(member => ({
        candidateId: member.candidateId,
        displayName: member.memberName,
        classification: member.classification,
        source: member.source,
        matchReason: member.matchReason,
        connected: member.connected === true,
        chatWindowUrl: member.chatWindowUrl || null,
      }))
    : (selectedCard?.members ?? []).map(member => ({ ...member, source: null, matchReason: null }));

  return (
    <div className="hl-page bcp-page">
      <HomeHeader
        onAssistant={onAssistant}
        onHome={onBack}
        navigation={<PageNavigation page="business-card" />}
        onLoginSuccess={() => setHistoryRevision(current => current + 1)}
      />

      <div className="bcp-layout">

        <main className="bcp-main">
        {selectedCardKey && historyLoading && <p role="status">Loading saved card...</p>}
        {selectedCardKey && !historyLoading && history && !selectedCard && <p role="status">This saved card is no longer available.</p>}
        <h1>
          Meet people who move <span>your work forward.</span>
        </h1>
        <p className="bcp-sub">{selectedCard ? "Your saved card and the people selected for it." : "Upload your card or student ID. We’ll introduce up to 5 relevant people."}</p>

        <section className="bcp-box" aria-label="Share your details">
          <div className="bcp-intro">
            <h2>{selectedCard ? "Your saved matches" : "Start with your card"}</h2>
            {!selectedCard && <p>We’ll use your role and domain to find the right people.</p>}
          </div>

          {selectedCard ? (
            <div className="bcp-result">
              <p className="bcp-done" role="status">
                {selectedCard.personName || selectedCard.companyName || "Business card"}
                {selectedCard.companyName && selectedCard.personName ? ` · ${selectedCard.companyName}` : ""}
              </p>
              {selectedCard.businessCardUrl && (
                <div className="bcp-history-card-display">
                  {/\.(pdf)(?:$|[?#])/i.test(selectedCard.businessCardUrl)
                    ? <iframe className="bcp-history-card-preview" title="Uploaded business card PDF" src={selectedCard.businessCardUrl} />
                    : <img className="bcp-history-card-preview" src={selectedCard.businessCardUrl} alt="Uploaded business card" />}
                </div>
              )}
              {historyActionError && <p className="bcp-error" role="alert">{historyActionError}</p>}
              {selectedMembers.length === 0 ? (
                <p className="bcp-history-empty">No matched members were saved for this card.</p>
              ) : (
                <>
                  <h3 className="bcp-result-heading">People matched from this card</h3>
                  <ul className="bcp-matches bcp-history-matches" aria-label="Members matched from this card">
                    {selectedMembers.slice(0, MAX_MATCHES).map(member => {
                      const displayName = member.displayName?.trim() || "Network member";
                      const chatUrl = chatLinks[member.candidateId] || getChatWindowHref(member.chatWindowUrl);
                      return (
                        <li key={member.candidateId}>
                          <span className="bcp-history-avatar" aria-hidden="true">{displayName.charAt(0).toUpperCase()}</span>
                          <span className="bcp-match-info">
                            <strong>{displayName}</strong>
                            {member.classification && <span className="bcp-profession-badge">{member.classification}</span>}
                          </span>
                          {(selectedCard.sessionId || chatUrl) && (
                            <button
                              type="button"
                              className={`bcp-connect${chatUrl ? " is-chat-ready" : ""}`}
                              disabled={connectingId !== null}
                              onClick={() => chatUrl
                                ? window.open(chatUrl, "_blank", "noopener,noreferrer")
                                : selectedCard.sessionId && void connect(selectedCard.sessionId, member.candidateId, member.connected)}
                            >
                              {connectingId === member.candidateId ? "Connecting…" : chatUrl ? "Open chat window" : member.connected ? "Connect again" : "Connect"}
                              <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-5-5 5 5-5 5" /></svg>
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
              <button type="button" className="bcp-again" onClick={uploadAnother}>Back to upload</button>
            </div>
          ) : uploading ? (
            <ProcessingPanel step={processingStep} />
          ) : done && result ? (
            <div className="bcp-result">
              <p className="bcp-done" role="status">{businessCardStatus(result)}</p>

              {result.extractedText && (
                <details className="bcp-extract">
                  <summary>What we read from your card</summary>
                  <pre>{result.extractedText}</pre>
                </details>
              )}

              {result.candidates && result.candidates.length > 0 && (
                <ul className="bcp-matches" aria-label="Your matches">
                  {result.candidates.slice(0, MAX_MATCHES).map(c => {
                    const chatUrl = chatLinks[c.candidateId];
                    return <li key={c.candidateId}>
                      <span className="bcp-match-info">
                        <strong>{c.displayName}</strong>
                      </span>
                      <button type="button" className={`bcp-connect${chatUrl ? " is-chat-ready" : ""}`} disabled={connectingId !== null || (!result.sessionId && !chatUrl)} onClick={() => chatUrl ? window.open(chatUrl, "_blank", "noopener,noreferrer") : result.sessionId && void connect(result.sessionId, c.candidateId)}>
                        {connectingId === c.candidateId ? "Connecting…" : chatUrl ? "Open chat window" : "Connect"}
                      </button>
                    </li>;
                  })}
                </ul>
              )}

              {error && <p className="bcp-error" role="alert">{error}</p>}
              <button type="button" className="bcp-again" onClick={uploadAnother}>Upload another card</button>
            </div>
          ) : done ? (
            <p className="bcp-done" role="status">Thank you! We’ve got your details and will send your 5 matches soon.</p>
          ) : (
            <>
              <div
                className={`bcp-drop ${dragging ? "is-drag" : ""}`}
                onClick={() => inputRef.current?.click()}
                onDragOver={event => { event.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                role="button"
                tabIndex={0}
                onKeyDown={event => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); }}
              >
                {preview ? (
                  <img src={preview} alt="Uploaded card preview" />
                ) : (
                  <>
                    <span className="bcp-upload-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4m-5 5 5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg></span>
                    <strong>Drop your card here</strong>
                    <small>or click to browse · PNG, JPG, WebP or PDF · Max 5 MB</small>
                  </>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPTED.join(",")}
                  hidden
                  onChange={(event: ChangeEvent<HTMLInputElement>) => pick(event.target.files?.[0])}
                />
              </div>
              {file && (
                <div className="bcp-file"><span><b>Ready to match</b>{file.name}</span><button type="button" onClick={() => setFile(null)}>Remove</button></div>
              )}
              {error && <p className="bcp-error" role="alert">{error}</p>}
              <button type="button" className="bcp-submit" disabled={!file || uploading} onClick={submitCard}>
                {uploading ? "Finding your matches…" : "Find my matches"}
              </button>
              <p className="bcp-student-note">Student? Your student ID works too.</p>
            </>
          )}
        </section>

        {!selectedCard && !done && !uploading && (
          <section className="bcp-how" aria-labelledby="bcp-how-title">
            <header className="bcp-how-heading">
              <span className="bcp-how-eyebrow">HOW IT WORKS</span>
              <h2 id="bcp-how-title">One card. Five possibilities.</h2>
              <p>Discover people relevant to your profession and business.</p>
            </header>
            <div className="bcp-match-equation" aria-label="One business card gives you up to five relevant matches">
              <div className="bcp-equation-card">
                <span className="bcp-equation-caption">YOU SHARE</span>
                <div className="bcp-equation-art" aria-hidden="true"><div className="bcp-card-illustration"><span className="bcp-card-portrait"/><span className="bcp-card-lines"><i/><i/><i/></span></div></div>
                <strong className="bcp-equation-number">1</strong>
                <h3>Business card</h3>
                <p>A clear photo or PDF.<br/>Your details do the introduction.</p>
              </div>
              <div className="bcp-equation-connector" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 12h16m-6-6 6 6-6 6"/></svg></div>
              <div className="bcp-equation-card bcp-equation-result">
                <span className="bcp-equation-caption">WE FIND</span>
                <div className="bcp-equation-art" aria-hidden="true"><div className="bcp-match-illustration">{Array.from({length: MAX_MATCHES}, (_, index) => <span key={index}><i/></span>)}</div></div>
                <div className="bcp-equation-total"><span>up to</span><strong className="bcp-equation-number">5</strong></div>
                <h3>Relevant matches</h3>
                <p>People selected for your profile.<br/>You choose whom to connect with.</p>
              </div>
            </div>
            <p className="bcp-equation-next">Select <strong>Connect</strong> to chat. Revisit matches in <strong>History</strong>.</p>
            <p className="bcp-how-note">Up to 5 matches, subject to availability.</p>
          </section>
        )}
        </main>
      </div>
      <ProcessingStyles />
    </div>
  );
}
