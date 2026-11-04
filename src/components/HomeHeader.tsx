import { useState } from "react";
import { LOGO } from "../data/journeyData";
import { getJourneyIdentity } from "../services/vibeCodeApi";
import JourneyLoginModal from "./JourneyLoginModal";
import "./HomeLanding.css";

export const TAGLINE = "Every journey, one partner";

type HomeHeaderProps = {
  /** Opens the AI dashboard / chat. */
  onAssistant: () => void;
  /** Navigates to the home page; when omitted the brand is a plain link to "/". */
  onHome?: () => void;
};

/** Site header shared by the home page and the business card page. */
export default function HomeHeader({ onAssistant, onHome }: HomeHeaderProps) {
  const [loginOpen, setLoginOpen] = useState(false);
  const [identity, setIdentity] = useState(() => getJourneyIdentity());
  const accountName = (localStorage.getItem("userName") || "").trim() || "My account";

  return (
    <>
      <header className="hl-header">
        <div className="hl-shell hl-header-inner">
          <a
            className="hl-brand"
            href="/"
            aria-label="OXY Journeys home"
            onClick={onHome ? event => { event.preventDefault(); onHome(); } : undefined}
          >
            <img src={LOGO} alt="OXY Journeys" />
            <span className="hl-brand-tagline">{TAGLINE}</span>
          </a>

          <nav className="hl-nav" aria-label="Primary">
            <button type="button" className="hl-assistant" onClick={onAssistant}>
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" /></svg>
              AI Dashboard
            </button>
            <button
              type="button"
              className={`hl-account ${identity ? "is-signed-in" : ""}`}
              onClick={() => { if (!identity) setLoginOpen(true); }}
              aria-label={identity ? `Signed in as ${accountName}` : "Account"}
              title={identity ? accountName : "Account"}
            >
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="8" r="3.6" /><path d="M5 20c.8-3.6 3.7-5.4 7-5.4s6.2 1.8 7 5.4" /></svg>
              {identity && <span>{accountName}</span>}
            </button>
          </nav>
        </div>
      </header>

      <JourneyLoginModal
        open={loginOpen}
        sessionId=""
        onClose={() => setLoginOpen(false)}
        onSuccess={() => { setIdentity(getJourneyIdentity()); setLoginOpen(false); }}
      />
    </>
  );
}
