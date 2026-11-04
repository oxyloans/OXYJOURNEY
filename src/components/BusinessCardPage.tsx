import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import HomeHeader from "./HomeHeader";
import JourneyLoginModal from "./JourneyLoginModal";
import {
  connectBusinessCardCandidate,
  getJourneyIdentity,
  submitStudentDetails,
  uploadBusinessCard,
  type BusinessCardResult,
} from "../services/vibeCodeApi";
import "./BusinessCardPage.css";

type BusinessCardPageProps = {
  onBack: () => void;
  onAssistant: () => void;
};

type Mode = "card" | "student";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "application/pdf"];


export default function BusinessCardPage({ onBack, onAssistant }: BusinessCardPageProps) {
  const [mode, setMode] = useState<Mode>("card");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [authTick, setAuthTick] = useState(0); // remounts the header so it shows the signed-in account
  const [result, setResult] = useState<BusinessCardResult | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [chatLinks, setChatLinks] = useState<Record<string, string>>({});
  const [student, setStudent] = useState({ name: "", email: "", role: "", responsibilities: "" });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

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

  async function upload(userId: string, accessToken?: string | null) {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      setResult(await uploadBusinessCard({ userId, file, accessToken }));
      setChatLinks({});
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  /** Uploading needs a signed-in user: ask for login first, then upload. */
  function submitCard() {
    if (!file || uploading) return;
    const identity = getJourneyIdentity();
    if (!identity) {
      setLoginOpen(true);
      return;
    }
    void upload(identity.userId, identity.accessToken);
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setDone(false);
    setResult(null);
  }

  function uploadAnother() {
    setResult(null);
    setDone(false);
    setFile(null);
    setStudent({ name: "", email: "", role: "", responsibilities: "" });
    setError("");
  }

  /** Asks the server to connect with a matched member, then opens the chat URL it returns. */
  async function connect(candidateId: string) {
    const sessionId = result?.sessionId;
    if (!sessionId || connectingId) return;
    const existing = chatLinks[candidateId];
    if (existing) {
      window.open(existing, "_blank", "noopener,noreferrer");
      return;
    }
    setError("");
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
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect. Please try again.");
    } finally {
      setConnectingId(null);
    }
  }

  async function sendStudent(userId: string, accessToken?: string | null) {
    setError("");
    setUploading(true);
    try {
      setResult(
        await submitStudentDetails({
          userId,
          fullName: student.name.trim(),
          email: student.email.trim(),
          role: student.role.trim(),
          responsibilities: student.responsibilities.trim(),
          accessToken,
        })
      );
      setChatLinks({});
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your details. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function submitStudent(event: FormEvent) {
    event.preventDefault();
    if (uploading) return;
    if (!/^\S+@\S+\.\S+$/.test(student.email.trim())) return setError("Please enter a valid email address.");
    const identity = getJourneyIdentity();
    if (!identity) {
      setLoginOpen(true);
      return;
    }
    void sendStudent(identity.userId, identity.accessToken);
  }

  const setField = (key: keyof typeof student) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setStudent(current => ({ ...current, [key]: event.target.value }));

  return (
    <div className="hl-page bcp-page">
      <HomeHeader key={authTick} onAssistant={onAssistant} onHome={onBack} />

      <JourneyLoginModal
        open={loginOpen}
        sessionId=""
        onClose={() => setLoginOpen(false)}
        onSuccess={auth => {
          setLoginOpen(false);
          setAuthTick(tick => tick + 1);
          return mode === "card" ? upload(auth.userId, auth.accessToken) : sendStudent(auth.userId, auth.accessToken);
        }}
      />

      <main className="bcp-main">
        <h1>
          Your business card is your <span>money-making machine.</span>
        </h1>
        <p className="bcp-sub">One card. Endless opportunities. Put it to work today.</p>

        <section className="bcp-box" aria-label="Share your details">
          <div className="bcp-tabs" role="tablist" aria-label="I am">
            <button type="button" role="tab" aria-selected={mode === "card"} className={mode === "card" ? "is-on" : ""} onClick={() => switchMode("card")}>I have a business card</button>
            <button type="button" role="tab" aria-selected={mode === "student"} className={mode === "student" ? "is-on" : ""} onClick={() => switchMode("student")}>I&rsquo;m a student</button>
          </div>

          {done && result ? (
            <div className="bcp-result">
              <p className="bcp-done" role="status">{result.message || "Card processed."}</p>

              {result.extractedText && (
                <details className="bcp-extract">
                  <summary>{mode === "card" ? "What we read from your card" : "What we understood from your details"}</summary>
                  <pre>{result.extractedText}</pre>
                </details>
              )}

              {result.candidates && result.candidates.length > 0 && (
                <ul className="bcp-matches" aria-label="Your matches">
                  {result.candidates.map(c => (
                    <li key={c.candidateId}>
                      <span className="bcp-avatar" aria-hidden="true">{c.displayName.trim().charAt(0).toUpperCase()}</span>
                      <span className="bcp-match-info">
                        <strong>{c.displayName}</strong>
                        {c.classification && <small>{c.classification}</small>}
                      </span>
                      <button type="button" className="bcp-connect" disabled={connectingId !== null} onClick={() => void connect(c.candidateId)}>
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
          ) : mode === "card" ? (
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
                  <img src={preview} alt="Business card preview" />
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4m-5 5 5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg>
                    <strong>{file ? file.name : "Click or drag your business card here"}</strong>
                    <small>PNG, JPG, WebP or PDF · up to 5 MB</small>
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
                <p className="bcp-file">
                  {file.name} · <button type="button" onClick={() => setFile(null)}>Remove</button>
                </p>
              )}
              {error && <p className="bcp-error" role="alert">{error}</p>}
              <button type="button" className="bcp-submit" disabled={!file || uploading} onClick={submitCard}>
                {uploading ? "Uploading…" : "Submit my business card"}
              </button>
            </>
          ) : (
            <form className="bcp-form" onSubmit={submitStudent}>
              <label>Full name<input required value={student.name} onChange={setField("name")} placeholder="Your name" autoComplete="name" /></label>
              <label>Email<input required type="email" value={student.email} onChange={setField("email")} placeholder="you@example.com" autoComplete="email" /></label>
              <label>Role<input required value={student.role} onChange={setField("role")} placeholder="e.g. Final-year B.Tech student, Intern" /></label>
              <label>Responsibilities<textarea required rows={3} value={student.responsibilities} onChange={setField("responsibilities")} placeholder="What do you work on or want to grow into?" /></label>
              {error && <p className="bcp-error" role="alert">{error}</p>}
              <button type="submit" className="bcp-submit" disabled={uploading}>
                {uploading ? "Sending…" : "Submit my details"}
              </button>
            </form>
          )}
        </section>

        <section className="bcp-offer" aria-label="Our promise">
          <div className="bcp-offer-from"><b>1</b><span>card from you</span></div>
          <div className="bcp-offer-arrow" aria-hidden="true">→</div>
          <div className="bcp-offer-to"><b>5</b><span>matches from us</span></div>
        </section>
        <p className="bcp-offer-text">
          Give <strong>1 business card</strong>, get <strong>5 from your own domain</strong>: people to partner with, hire, sell to or learn from.
        </p>

        <aside className="bcp-why">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
          <p>
            <strong>Why we ask:</strong> your business card helps us predict your journey and serve you better.
            Students can share name, email, role and responsibilities instead.
          </p>
        </aside>
      </main>
    </div>
  );
}
