import { LOGO } from "../data/journeyData";
import { MenuIcon } from "./JourneyIcons";

type MobileJourneyHeaderProps = {
  onOpenMenu: () => void;
  activeLabel: string;
  onNewChat?: () => void;
};

export default function MobileJourneyHeader({
  onOpenMenu,
  activeLabel,
  onNewChat,
}: MobileJourneyHeaderProps) {
  return (
    <header className="oxj-mobile-header">
      <div className="oxj-mobile-header-left">
        <button
          type="button"
          className="oxj-mobile-menu-btn"
          onClick={onOpenMenu}
          aria-label="Open journey menu"
          title="Open journey menu"
        >
          <MenuIcon />
        </button>

        <a href="/" className="oxj-mobile-logo-link" aria-label="OXY Journeys Home">
          <img src={LOGO} alt="OXY Journeys" />
        </a>
      </div>

      <div className="oxj-mobile-header-actions">
        {onNewChat && (
          <button
            type="button"
            className="oxj-mobile-action-btn oxj-mobile-new-chat-btn"
            onClick={onNewChat}
            aria-label="Start new journey"
            title="Start new journey"
          >
            <svg
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="oxj-mobile-btn-text">New</span>
          </button>
        )}

        {/* <a
          href="/oxy-journey/partner/chats"
          className="oxj-mobile-action-btn oxj-mobile-partner-btn"
          aria-label="Partner chats"
          title="Open Partner chats"
        >
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            aria-hidden="true"
          >
            <path d="M21 11a8 8 0 0 1-8 8H7l-4 3V7a5 5 0 0 1 5-5h5a8 8 0 0 1 8 9Z" />
          </svg>
          <span className="oxj-mobile-btn-text">Partners</span>
        </a> */}
      </div>
    </header>
  );
}

