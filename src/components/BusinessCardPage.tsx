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

function formatHistoryDate(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString();
}

function ProcessingPanel({ step }: { step: number }) {
  const currentStep = PROCESSING_STEPS[step];

  return (
    <div className="bcp-processing" role="status" aria-live="polite" aria-busy="true">
      <div className="bcp-processing-orbit" aria-hidden="true">
        <div className="bcp-processing-ring">
        <i className="bcp-processing-node bcp-processing-node-one" />
        <i className="bcp-processing-node bcp-processing-node-two" />
        <i className="bcp-processing-node bcp-processing-node-three" />
        </div>
        <div className="bcp-processing-card">
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 9h5M7 13h3M15 10h2M15 14h2" /></svg>
        </div>
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
      .bcp-processing{animation:bcp-reveal .65s cubic-bezier(.22,1,.36,1) both}
      .bcp-processing-orbit{width:120px;height:120px;margin:8px 0 26px;background:transparent;border:0;animation:none;isolation:isolate}
      .bcp-processing-orbit:before{inset:-12px;background:radial-gradient(circle,#e9e5ff 0%,#edf3ff80 48%,transparent 72%);animation:bcp-breathe 4.8s ease-in-out infinite;z-index:-1}
      .bcp-processing-orbit:after{content:"";position:absolute;inset:12px;border:1px dashed #c7d2f2;border-radius:50%;animation:bcp-spin 24s linear infinite reverse;z-index:-1}
      .bcp-processing-ring{position:absolute;inset:0;border:1px solid #e3e7fc;border-radius:50%;animation:bcp-spin 12s linear infinite}
      .bcp-processing-ring:before{content:"";position:absolute;inset:-1px;border:3px solid transparent;border-top-color:#a3acfa;border-right-color:#cbb8fa;border-radius:50%;opacity:.65}
      .bcp-processing-card{width:60px;height:60px;border-radius:19px;overflow:hidden;animation:bcp-card-drift 5s ease-in-out infinite;box-shadow:0 12px 26px #6655d52b,inset 0 1px 1px #ffffff60}
      .bcp-processing-card:after{content:"";position:absolute;inset:-40%;background:linear-gradient(110deg,transparent 38%,#ffffff25 50%,transparent 62%);animation:bcp-card-light 6s ease-in-out infinite;pointer-events:none}
      .bcp-processing-copy{min-height:76px;display:flex;flex-direction:column;align-items:center;animation:bcp-reveal .65s cubic-bezier(.22,1,.36,1) both}
      .bcp-processing-bar span{width:100%;transform-origin:left;transition:transform 2.2s cubic-bezier(.22,1,.36,1)}
      .bcp-processing-bar span:after{animation-duration:3s;opacity:.55}
      .bcp-processing-tip{min-height:60px;display:grid;place-items:center;box-sizing:border-box}
      .bcp-processing-tip-copy{display:block;animation:bcp-reveal .75s ease both}
      .bcp-processing-signals span{transition:background .6s ease,color .6s ease,border-color .6s ease}
      @keyframes bcp-reveal{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      @keyframes bcp-card-drift{0%,100%{transform:translateY(2px) rotate(-3deg)}50%{transform:translateY(-4px) rotate(3deg)}}
      @keyframes bcp-breathe{0%,100%{opacity:.6;transform:scale(.96)}50%{opacity:1;transform:scale(1.08)}}
      @keyframes bcp-card-light{0%,25%{transform:translateX(-100%)}65%,100%{transform:translateX(100%)}}
      @media(max-width:480px){.bcp-processing{padding:16px 0}.bcp-processing h2{font-size:20px}.bcp-processing-copy{min-height:92px}.bcp-processing-tip{min-height:78px}.bcp-processing-detail{font-size:13px}}
      @media(prefers-reduced-motion:reduce){.bcp-processing,.bcp-processing-orbit:before,.bcp-processing-orbit:after,.bcp-processing-ring,.bcp-processing-card,.bcp-processing-card:after,.bcp-processing-copy,.bcp-processing-tip-copy{animation:none}.bcp-processing-bar span,.bcp-processing-signals span{transition:none}}
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
  const [selectedCardKey, setSelectedCardKey] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
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
    }, 2600);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
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

  function selectHistoryCard(key: string) {
    setSelectedCardKey(key);
    setHistoryActionError("");
    setHistoryOpen(false);
  }

  /** Asks the server to connect with a matched member, then opens the chat URL it returns. */
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
      const url = reply.chatWindowUrl?.trim();
      if (!url) throw new Error(reply.reply?.trim() || "Connected, but no chat link was returned.");
      setChatLinks(current => ({ ...current, [candidateId]: url }));
      setHistoryRevision(current => current + 1);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not connect. Please try again.";
      if (result?.sessionId === sessionId && selectedCardKey === null) setError(message);
      else setHistoryActionError(message);
    } finally {
      setConnectingId(null);
    }
  }

  const businessCards = (history?.businessCards ?? []).map(card => ({ ...card, sessionId: card.matchSessionId || card.sessionId }));
  const visibleBusinessCards = historyExpanded ? businessCards : businessCards.slice(0, 5);
  const memberConnections = history?.memberConnections ?? [];
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
        rightSlot={!historyOpen ? (
          <button
            type="button"
            className="bcp-history-toggle"
            aria-controls="bcp-history-sidebar"
            onClick={() => setHistoryOpen(true)}
          >
            <span className="bcp-history-toggle-icon" aria-hidden="true">◷</span>
            <span>History</span>
            {!!history?.businessCardUploadCount && <b>{history.businessCardUploadCount > 9 ? "9+" : history.businessCardUploadCount}</b>}
          </button>
        ) : null}
      />

      <div className="bcp-layout">
        {historyOpen && <button type="button" className="bcp-sidebar-backdrop" aria-label="Close history" onClick={() => setHistoryOpen(false)} />}
        <aside id="bcp-history-sidebar" className={`bcp-history-sidebar${historyOpen ? " is-open" : ""}`} aria-labelledby="bcp-history-title">
          <div className="bcp-history-heading">
            <div>
              <h2 id="bcp-history-title">Your history</h2>
              {history && <p>{history.businessCardUploadCount} cards · {history.connectedMemberCount} connections</p>}
            </div>
            <button type="button" className="bcp-sidebar-close" aria-label="Close history" onClick={() => setHistoryOpen(false)}>×</button>
          </div>
          {historyLoading ? (
            <p className="bcp-history-status" role="status">Loading your history…</p>
          ) : historyError ? (
            <p className="bcp-history-error" role="alert">
              {historyError}
              <button type="button" onClick={() => setHistoryRevision(current => current + 1)}>Retry</button>
            </p>
          ) : !history ? null : businessCards.length === 0 && memberConnections.length === 0 ? (
            <p className="bcp-history-empty">No saved business cards or partner conversations yet.</p>
          ) : (
            <>
              {businessCards.length > 0 && (
                <div className="bcp-history-group">
                  <h3>Uploaded cards</h3>
                  <ul className="bcp-history-list">
                    {visibleBusinessCards.map((card, index) => {
                      const key = cardKey(card, index);
                      return (
                        <li key={key}>
                          <button
                            type="button"
                            className={`bcp-history-card${selectedCardKey === key ? " is-selected" : ""}`}
                            aria-pressed={selectedCardKey === key}
                            onClick={() => selectHistoryCard(key)}
                          >
                            <span>
                              <strong>{card.personName || card.companyName || "Business card"}</strong>
                              <small>{[card.companyName, formatHistoryDate(card.uploadedAt)].filter(Boolean).join(" · ")}</small>
                            </span>
                            <span className="bcp-history-select">{selectedCardKey === key ? "Selected" : "View results"}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {businessCards.length > 5 && (
                    <button type="button" className="bcp-history-more" onClick={() => setHistoryExpanded(expanded => !expanded)}>
                      {historyExpanded ? "Show less" : `View ${businessCards.length - 5} more cards`}
                    </button>
                  )}
                </div>
              )}
              {memberConnections.length > 0 && (
                <div className="bcp-history-group">
                  <h3>Partner conversations</h3>
                  <ul className="bcp-history-list">
                    {memberConnections.map((connection, index) => {
                      const chatUrl = getChatWindowHref(connection.chatWindowUrl);
                      return (
                        <li key={connection.connectionSessionId || `${connection.memberName || "member"}-${index}`}>
                          <span>
                            <strong>{connection.memberName || "Journey partner"}</strong>
                            <small>{connection.memberClassification || connection.chatStatus || "Connected through your business card"}</small>
                          </span>
                          {chatUrl
                            ? <a className="bcp-history-chat" href={chatUrl} target="_blank" rel="noopener noreferrer">Continue chat <span aria-hidden="true">↗</span></a>
                            : <small className="bcp-history-unavailable">Chat link unavailable</small>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </>
          )}
        </aside>

        <main className="bcp-main">
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
                      return (
                        <li key={member.candidateId}>
                          <span className="bcp-history-avatar" aria-hidden="true">{displayName.charAt(0).toUpperCase()}</span>
                          <span className="bcp-match-info">
                            <strong>{displayName}</strong>
                            {member.classification && <span className="bcp-profession-badge">{member.classification}</span>}
                          </span>
                          {selectedCard.sessionId && (
                            <button
                              type="button"
                              className="bcp-connect"
                              disabled={connectingId !== null}
                              onClick={() => void connect(selectedCard.sessionId, member.candidateId, member.connected)}
                            >
                              {connectingId === member.candidateId ? "Connecting…" : member.connected ? "Connect again" : "Connect"}
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
              <p className="bcp-done" role="status">{result.message || "Card processed."}</p>

              {result.extractedText && (
                <details className="bcp-extract">
                  <summary>What we read from your card</summary>
                  <pre>{result.extractedText}</pre>
                </details>
              )}

              {result.candidates && result.candidates.length > 0 && (
                <ul className="bcp-matches" aria-label="Your matches">
                  {result.candidates.slice(0, MAX_MATCHES).map(c => (
                    <li key={c.candidateId}>
                      <span className="bcp-match-info">
                        <strong>{c.displayName}</strong>
                      </span>
                      <button type="button" className="bcp-connect" disabled={connectingId !== null || !result.sessionId} onClick={() => result.sessionId && void connect(result.sessionId, c.candidateId)}>
                        {connectingId === c.candidateId ? "Connecting…" : chatLinks[c.candidateId] ? "Open chat" : "Connect"}
                      </button>
                    </li>
                  ))}
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
