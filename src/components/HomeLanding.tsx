import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import Icon3D from "./Icon3D";
import HomeHeader, { TAGLINE } from "./HomeHeader";
import "./HomeLanding.css";

export type ChatStart = {
  /** First message to send automatically when the chat opens. */
  prompt?: string;
  /** Opens the chat under this classification (e.g. "Doctor"). */
  classification?: string;
  /** Opens the chat on a life stage. */
  stageId?: string;
  /** Opens the chat with this sidebar view selected. */
  view?: "life-cycle" | "profession";
};

type HomeLandingProps = {
  onStart: (start?: ChatStart) => void;
  onBusinessCard: () => void;
};

export { TAGLINE };

type Prefill = { text: string; kind: "life" | "profession"; stageId?: string; classification?: string };

/** Ready-made messages; each opens its matching life journey or profession and sends the message there. */
const PREFILLS: Prefill[] = [
  { text: "I want to study abroad", kind: "life", stageId: "youth-career" },
  { text: "I am looking for a Doctor", kind: "profession", classification: "Doctor" },
  { text: "I am looking for a home loan", kind: "life", stageId: "work-family" },
  { text: "I need a CA to file my income tax returns", kind: "profession", classification: "Chartered Accountant" },
];

/** Card that tilts toward the pointer. */
function TiltCard({ className, onClick, children }: { className: string; onClick: () => void; children: ReactNode }) {
  function move(event: MouseEvent<HTMLButtonElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - 0.5;
    const y = (event.clientY - box.top) / box.height - 0.5;
    event.currentTarget.style.setProperty("--ry", `${(x * 14).toFixed(2)}deg`);
    event.currentTarget.style.setProperty("--rx", `${(-y * 12).toFixed(2)}deg`);
  }
  function leave(event: MouseEvent<HTMLButtonElement>) {
    event.currentTarget.style.setProperty("--ry", "0deg");
    event.currentTarget.style.setProperty("--rx", "0deg");
  }
  return (
    <button type="button" className={className} onClick={onClick} onMouseMove={move} onMouseLeave={leave}>
      {children}
    </button>
  );
}

export default function HomeLanding({ onStart, onBusinessCard }: HomeLandingProps) {
  const [prompt, setPrompt] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [prompt]);

  function submit(event?: FormEvent) {
    event?.preventDefault();
    const text = prompt.trim();
    if (text) onStart({ prompt: text });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div className="hl-page">
      <HomeHeader onAssistant={() => onStart()} />

      <main className="hl-main">
        <section className="hl-hero hl-shell">
          <p className="hl-kicker">{TAGLINE}</p>
          <h1>How can we help you today?</h1>
          <p className="hl-sub">Tell us what you need. We&rsquo;ll map it to the right people, services and opportunities across OXY Journeys.</p>

          <form className="hl-prompt" onSubmit={submit}>
            <span className="hl-prompt-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" /></svg>
            </span>
            <textarea
              ref={inputRef}
              value={prompt}
              onChange={event => setPrompt(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder="Tell us what you need help with…"
              aria-label="Tell us what you need"
            />
            <button type="submit" className="hl-send" disabled={!prompt.trim()} aria-label="Start my journey">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6" /></svg>
            </button>
          </form>

          <div className="hl-quick" aria-label="Suggested messages">
            {PREFILLS.map(item => (
              <button
                key={item.text}
                type="button"
                className={item.kind === "life" ? "is-life" : "is-pro"}
                title={item.kind === "life" ? "Opens the matching Life Journey" : "Opens the matching Profession"}
                onClick={() =>
                  onStart(
                    item.kind === "life"
                      ? { stageId: item.stageId, prompt: item.text }
                      : { view: "profession", classification: item.classification, prompt: item.text }
                  )
                }
              >
                <i aria-hidden="true" />
                {item.text}
              </button>
            ))}
          </div>
        </section>

        <section className="hl-section hl-shell" aria-labelledby="hl-explore-title">
          <h2 id="hl-explore-title">Explore OXY Journeys</h2>
          <div className="hl-cards">
            <TiltCard className="hl-card hl-card-life" onClick={() => onStart({ view: "life-cycle" })}>
              <span className="hl-card-icon">
                <Icon3D palette="violet">
                  <circle cx="6" cy="18" r="2.4" stroke="currentColor" />
                  <circle cx="18" cy="6" r="2.4" stroke="currentColor" />
                  <path d="M8 16.5 16 7.5" stroke="currentColor" />
                </Icon3D>
              </span>
              <strong>Life Journeys</strong>
              <span>Navigate life&rsquo;s stages</span>
            </TiltCard>

            <TiltCard className="hl-card hl-card-pro" onClick={() => onStart({ view: "profession" })}>
              <span className="hl-card-icon">
                <Icon3D palette="green">
                  <rect x="3" y="7" width="18" height="13" rx="2.5" stroke="currentColor" />
                  <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 13h18" stroke="currentColor" />
                </Icon3D>
              </span>
              <strong>Professions</strong>
              <span>Find the right people</span>
            </TiltCard>

            <TiltCard className="hl-card hl-card-bc" onClick={onBusinessCard}>
              <span className="hl-card-icon">
                <Icon3D palette="blue">
                  <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" />
                  <circle cx="9" cy="11" r="1.8" stroke="currentColor" />
                  <path d="M6.5 16c.4-1.4 1.4-2.1 2.5-2.1s2.1.7 2.5 2.1M14 10h4M14 13.5h3" stroke="currentColor" />
                </Icon3D>
              </span>
              <strong>Business Card</strong>
              <span>Upload &amp; get connected</span>
            </TiltCard>
          </div>
        </section>
      </main>

      <footer className="hl-footer">
        <p>{TAGLINE}.</p>
      </footer>
    </div>
  );
}
