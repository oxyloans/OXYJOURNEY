import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type DragEvent } from "react";
import HomeHeader from "./HomeHeader";
import PageNavigation from "./PageNavigation";
import ChatWindowLink from "./ChatWindowLink";
import { userChatUrl } from "../services/connectionChat";
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
const BUSINESS_CARD_USER_ID_KEY = "oxyBusinessCardUserId";

function getChatWindowHref(value?: string | null): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value, window.location.origin);
    if (!["http:", "https:"].includes(url.protocol) || !/^\/oxy-journey\/chat\/[^/]+(?:\/(?:user|partner))?\/?$/i.test(url.pathname)) return null;
    return userChatUrl(url.href);
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
    <div className="bcp-discovery" role="status" aria-live="polite" aria-busy="true">
      <div className="bcp-discovery-art" aria-hidden="true">
        <div className="bcp-discovery-halo" />
        <div className="bcp-discovery-grid" />
        <div className="bcp-discovery-stack">
          <div className="bcp-discovery-sheet is-back" />
          <div className="bcp-discovery-sheet is-middle" />
          <div className="bcp-discovery-sheet is-front">
            <div className="bcp-discovery-brand"><span>OXY</span> CONNECTIONS <i /></div>
            <div className="bcp-discovery-profile">
              <span className="bcp-discovery-avatar">
                <svg viewBox="0 0 32 32" fill="none"><circle cx="16" cy="11" r="5" /><path d="M6 28v-3a10 10 0 0 1 20 0v3" /></svg>
              </span>
              <span className="bcp-discovery-lines"><i /><i /><i /></span>
            </div>
            <div className="bcp-discovery-card-footer"><span>YOUR NEXT OPPORTUNITY</span><span>✦</span></div>
            <div className="bcp-discovery-light" />
          </div>
        </div>
        <div className="bcp-discovery-matches">
          {Array.from({ length: MAX_MATCHES }, (_, index) => (
            <span key={index} className="bcp-discovery-match" style={{ "--match-index": index } as CSSProperties}>
              <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.5" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></svg>
              <i>✓</i>
            </span>
          ))}
        </div>
      </div>
      <span className="bcp-discovery-eyebrow"><i /> MAKING CONNECTIONS</span>
      <h2>One card. New possibilities.</h2>
      <div key={step} className="bcp-discovery-copy">
        <p className="bcp-discovery-label">{currentStep.label}</p>
        <p className="bcp-discovery-detail">{currentStep.detail}</p>
      </div>
      <ol className="bcp-discovery-stages" aria-label="Matching progress">
        {PROCESSING_STEPS.map((item, index) => (
          <li key={item.label} className={index === step ? "is-current" : index < step ? "is-done" : ""} aria-current={index === step ? "step" : undefined}>
            <span>{index < step ? "✓" : index + 1}</span>
            <small>{["Upload", "Read card", "Understand", "Find matches"][index]}</small>
          </li>
        ))}
      </ol>
      <p className="bcp-discovery-note">Finding up to five people relevant to your work.<br />Your connections will appear here when ready.</p>
    </div>
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
  const connectionInFlight = useRef(false);

  const connectionKey = (sessionId: string, candidateId: string) => `${sessionId}:${candidateId}`;

  useEffect(() => {
    const confirmed: Record<string, string> = {};
    for (const card of history?.businessCards ?? []) {
      const sessionId = card.matchSessionId || card.sessionId;
      if (!sessionId) continue;
      for (const member of card.relatedMembers ?? []) {
        const url = member.connected === true ? getChatWindowHref(member.chatWindowUrl) : null;
        if (url) confirmed[connectionKey(sessionId, member.candidateId)] = url;
      }
      for (const member of card.members ?? []) {
        const url = member.connected === true ? getChatWindowHref(member.chatWindowUrl) : null;
        if (url) confirmed[connectionKey(sessionId, member.candidateId)] = url;
      }
    }
    setChatLinks(current => ({ ...current, ...confirmed }));
  }, [history]);

  useEffect(() => {
    const refresh = () => { if (!document.hidden) setHistoryRevision(current => current + 1); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

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


  /** Creates one confirmed connection and reveals its chat button. */
  async function connect(sessionId: string, candidateId: string) {
    if (!sessionId || connectionInFlight.current || historyLoading) return;
    const key = connectionKey(sessionId, candidateId);
    if (chatLinks[key]) return;
    const card = history?.businessCards.find(item => (item.matchSessionId || item.sessionId) === sessionId);
    if (card?.relatedMembers?.some(member => member.candidateId === candidateId && member.connected)
        || card?.members?.some(member => member.candidateId === candidateId && member.connected)) return;
    connectionInFlight.current = true;
    setError("");
    setHistoryActionError("");
    setConnectingId(candidateId);
    try {
      const reply = await connectBusinessCardCandidate({
        sessionId,
        candidateId,
        accessToken: getJourneyIdentity()?.accessToken,
      });
      if (reply.partnerNotified !== true || reply.status === false
          || /couldn't send the WhatsApp introduction/i.test(reply.reply || "")) {
        const message = "The WhatsApp introduction couldn't be sent. Please try Connect again shortly.";
        if (result?.sessionId === sessionId && selectedCardKey === null) setError(message);
        else setHistoryActionError(message);
        return;
      }
      const url = resolveUserChatUrl(reply.chatWindowUrl, reply.reply);
      if (!url) throw new Error("Connected, but the chat window is not ready yet. Please try again.");
      setChatLinks(current => ({ ...current, [key]: url }));
    } catch {
      const message = "We couldn't connect right now. Please try again.";
      if (result?.sessionId === sessionId && selectedCardKey === null) setError(message);
      else setHistoryActionError(message);
    } finally {
      connectionInFlight.current = false;
      setConnectingId(null);
      setHistoryRevision(current => current + 1);
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
                      const chatUrl = chatLinks[connectionKey(selectedCard.sessionId || "", member.candidateId)]
                        || (member.connected ? getChatWindowHref(member.chatWindowUrl) : null);
                      const connected = member.connected || Boolean(chatUrl);
                      return (
                        <li key={member.candidateId} className="bcp-member-entry">
                          <div className={`bcp-match-row${connected ? " is-connected" : ""}`}>
                          <span className="bcp-history-avatar" aria-hidden="true">{displayName.charAt(0).toUpperCase()}</span>
                          <span className="bcp-match-info">
                            <strong>{displayName}</strong>
                            {member.classification && <span className="bcp-profession-badge">{member.classification}</span>}
                          </span>
                          {(selectedCard.sessionId || chatUrl) && (
                            <button
                              type="button"
                              className={`bcp-connect${connected ? " is-connected" : ""}`}
                              disabled={historyLoading || connectingId !== null || connected}
                              onClick={() => !connected && selectedCard.sessionId && void connect(selectedCard.sessionId, member.candidateId)}
                            >
                              {connectingId === member.candidateId ? "Connecting…" : connected ? "Connected" : "Connect"}
                            </button>
                          )}
                          </div>
                          {chatUrl && <ChatWindowLink href={chatUrl} partnerName={displayName} />}
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
                    const chatUrl = chatLinks[connectionKey(result.sessionId || "", c.candidateId)];
                    return <li key={c.candidateId} className="bcp-member-entry">
                      <div className={`bcp-match-row${chatUrl ? " is-connected" : ""}`}>
                      <span className="bcp-history-avatar" aria-hidden="true">{c.displayName.trim().charAt(0).toUpperCase()}</span>
                      <span className="bcp-match-info">
                        <strong>{c.displayName}</strong>
                        {c.classification && <span className="bcp-profession-badge">{c.classification}</span>}
                      </span>
                      <button type="button" className={`bcp-connect${chatUrl ? " is-connected" : ""}`} disabled={historyLoading || connectingId !== null || Boolean(chatUrl) || !result.sessionId} onClick={() => !chatUrl && result.sessionId && void connect(result.sessionId, c.candidateId)}>
                        {connectingId === c.candidateId ? "Connecting…" : chatUrl ? "Connected" : "Connect"}
                      </button>
                      </div>
                      {chatUrl && <ChatWindowLink href={chatUrl} partnerName={c.displayName} />}
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
    </div>
  );
}
