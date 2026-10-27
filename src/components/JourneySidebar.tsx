import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  classificationLabel,
  LIFE_STAGES,
  LOGO,
  PLATFORMS,
  SIDEBAR_ICON,
  TOP_CLASSIFICATIONS,
} from "../data/journeyData";
import type {
  JourneyMode,
  JourneyOption,
  LifeStage,
  Platform,
  ProfileInfo,
  ChatMessage,
} from "../types/journey";
import {
  ChevronIcon,
  LifeCycleIcon,
  NewChatIcon,
  PlatformIcon,
  SearchIcon,
  UserIcon,
} from "./JourneyIcons";

// Platform journeys are switched off for now: their code is all still here. Set this to true to
// bring the PLATFORM JOURNEY tab back (it then sits next to PROFESSIONS).
const SHOW_PLATFORM_JOURNEYS = false;

type JourneySidebarProps = {
  expanded: boolean;
  mobile?: boolean;
  mode: JourneyMode;
  stageId: string;
  activePlatformId: string;
  activeJourneyId: string;
  search: string;
  platformJourneys: Record<string, JourneyOption[]>;
  platformLoading: Record<string, boolean>;
  historyMessages?: ChatMessage[];
  sessionId?: string;
  savedSessions?: { id: string; title: string }[];
  /** Chats the user has with journey partners; each opens the shared live chat. */
  partnerChats?: { id: string; title: string; partnerName: string }[];
  onSelectSession?: (sessionId: string) => void;
  /** The profession (classification) the current chat is about, if any. */
  activeProfession?: string;
  onProfessionSelect?: (name: string) => void;
  profile?: ProfileInfo;
  onToggleExpanded: () => void;
  onCloseMobile?: () => void;
  onModeChange: (mode: JourneyMode) => void;
  onStageSelect: (stage: LifeStage) => void;
  onPlatformOpen: (platformId: string) => void;
  onSearchChange: (value: string) => void;
  onPlatformJourneySelect: (
    platform: Platform,
    journey: JourneyOption
  ) => void;
  onNewJourney: () => void;
  onProfileClick?: () => void;
  loggedIn?: boolean;
  onLogout?: () => void;
};

function uniqueByTitle(journeys: JourneyOption[]) {
  const seen = new Set<string>();
  return journeys.filter((journey) => {
    const key = journey.title.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function initials(name?: string) {
  if (!name) return "P";
  const trimmed = name.trim();
  if (/^[+\d\s-]+$/.test(trimmed)) {
    return "U";
  }
  const parts = trimmed.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join("") || "U";
}

function ProfileAvatar({ profile }: { profile?: ProfileInfo }) {
  if (profile?.avatarUrl) {
    return <img className="oxj-avatar" src={profile.avatarUrl} alt="" />;
  }
  return <span className="oxj-avatar oxj-avatar-fallback">{initials(profile?.name)}</span>;
}

function Rail({
  mode,
  profile,
  activeName,
  activeSubtitle,
  isLoggedIn,
  onLogout,
  onToggleExpanded,
  onModeChange,
  onNewJourney,
  onProfileClick,
}: Pick<
  JourneySidebarProps,
  | "mode"
  | "profile"
  | "onToggleExpanded"
  | "onModeChange"
  | "onNewJourney"
  | "onProfileClick"
  | "onLogout"
> & {
  activeName: string;
  activeSubtitle: string;
  isLoggedIn: boolean;
}) {
  const [railMenuOpen, setRailMenuOpen] = useState(false);
  const railWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        railWrapperRef.current &&
        !railWrapperRef.current.contains(event.target as Node)
      ) {
        setRailMenuOpen(false);
      }
    }
    if (railMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [railMenuOpen]);

  return (
    <div className="oxj-rail">
      <button
        type="button"
        className="oxj-rail-button oxj-brand-button"
        onClick={onToggleExpanded}
        aria-label="Open journey sidebar"
      >
        <img src={SIDEBAR_ICON} alt="" />
      </button>

      <div className="oxj-rail-stack">
        <button
          type="button"
          className="oxj-rail-button"
          onClick={onNewJourney}
          aria-label="New journey"
        >
          <NewChatIcon />
        </button>

        <button
          type="button"
          className="oxj-rail-button"
          onClick={onToggleExpanded}
          aria-label="Search journeys"
        >
          <SearchIcon />
        </button>

        <button
          type="button"
          className={`oxj-rail-button ${mode === "life-cycle" ? "is-life-active" : ""}`}
          onClick={() => {
            onModeChange("life-cycle");
            onToggleExpanded();
          }}
          aria-label="Life Journey"
        >
          <LifeCycleIcon />
        </button>

        {SHOW_PLATFORM_JOURNEYS && (
          <button
            type="button"
            className={`oxj-rail-button ${mode === "platform" ? "is-platform-active" : ""}`}
            onClick={() => {
              onModeChange("platform");
              onToggleExpanded();
            }}
            aria-label="Platform Journey"
          >
            <PlatformIcon />
          </button>
        )}

        <button
          type="button"
          className={`oxj-rail-button ${mode === "profession" ? "is-platform-active" : ""}`}
          onClick={() => {
            onModeChange("profession");
            onToggleExpanded();
          }}
          aria-label="Professions"
        >
          <UserIcon />
        </button>
      </div>

      <div
        ref={railWrapperRef}
        className="oxj-profile-wrapper oxj-rail-profile-wrapper"
      >
        {railMenuOpen && (
          <div className="oxj-profile-popover" role="menu" aria-label="Account options">
            <div className="oxj-popover-user">
              <div className="oxj-popover-avatar">
                <ProfileAvatar profile={{ ...profile, name: activeName, avatarUrl: profile?.avatarUrl }} />
              </div>
              <div className="oxj-popover-meta">
                <span className="oxj-popover-name" title={activeName}>{activeName}</span>
                <span className="oxj-popover-sub">{activeSubtitle}</span>
              </div>
            </div>

            <div className="oxj-popover-divider" />

            {isLoggedIn && onLogout ? (
              <button
                type="button"
                className="oxj-popover-btn oxj-popover-logout"
                onClick={() => {
                  setRailMenuOpen(false);
                  onLogout();
                }}
                role="menuitem"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9" />
                </svg>
                <span>Log out</span>
              </button>
            ) : null}
          </div>
        )}

        <button
          type="button"
          className="oxj-rail-button oxj-profile-rail"
          onClick={() => { if (isLoggedIn && onLogout) setRailMenuOpen((open) => !open); }}
          aria-expanded={isLoggedIn ? railMenuOpen : undefined}
          aria-haspopup={isLoggedIn && onLogout ? "menu" : undefined}
          aria-label={`Profile: ${activeName}`}
          title={activeName}
        >
          <ProfileAvatar profile={{ ...profile, name: activeName, avatarUrl: profile?.avatarUrl }} />
        </button>
      </div>
    </div>
  );
}

export default function JourneySidebar({
  expanded,
  mobile = false,
  mode,
  stageId,
  activePlatformId,
  activeJourneyId,
  search,
  platformJourneys,
  platformLoading,
  historyMessages = [],
  sessionId = "",
  savedSessions = [],

  partnerChats = [],
  onSelectSession,
  activeProfession = "",
  onProfessionSelect,
  profile,
  onToggleExpanded,
  onCloseMobile,
  onModeChange,
  onStageSelect,
  onPlatformOpen,
  onSearchChange,
  onPlatformJourneySelect,
  onNewJourney,
  onProfileClick,
  loggedIn = false,
  onLogout,
}: JourneySidebarProps) {
  const query = search.trim().toLowerCase();
  const controlsId = useId();
  const [draftStageId, setDraftStageId] = useState(stageId);
  const [stageDropdownOpen, setStageDropdownOpen] = useState(mode === "life-cycle");
  const [professionDropdownOpen, setProfessionDropdownOpen] = useState(mode === "profession");
  const [expandedPlatformId, setExpandedPlatformId] = useState(activePlatformId);
  const [morePlatformId, setMorePlatformId] = useState("");
  const draftStage = LIFE_STAGES.find(stage => stage.id === draftStageId);
  const firstPrompt = historyMessages.find(message => message.role === "user");
  const hasSessionHistory = Boolean(sessionId && firstPrompt);

  const userMobile = useMemo(() => {
    return (
      localStorage.getItem("userMobile") ||
      localStorage.getItem("whatsappNumber") ||
      localStorage.getItem("mobileNumber") ||
      ""
    ).trim();
  }, [loggedIn]);

  const userName = useMemo(() => {
    return (
      localStorage.getItem("userName") ||
      localStorage.getItem("name") ||
      localStorage.getItem("customerName") ||
      ""
    ).trim();
  }, [loggedIn]);

  const userId = useMemo(() => {
    return (localStorage.getItem("userId") || "").trim();
  }, [loggedIn]);

  const isUserLoggedIn = Boolean(loggedIn || (userMobile && userId));

  const formattedMobile = useMemo(() => {
    const clean = userMobile.replace(/[^\d+]/g, "");
    if (clean.startsWith("+91") && clean.length === 13) return `+91 ${clean.slice(3, 8)} ${clean.slice(8)}`;
    if (clean.length === 10) return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
    return clean;
  }, [userMobile]);

  // Guests are simply "User"; after login the card shows the account's name and number.
  const activeName = (isUserLoggedIn && (profile?.name || userName)) || "User";

  const activeSubtitle = isUserLoggedIn
    ? formattedMobile || "Signed in"
    : "Not signed in";

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileWrapperRef.current &&
        !profileWrapperRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
      }
    }

    if (profileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [profileMenuOpen]);

  useEffect(() => setDraftStageId(stageId), [stageId]);
  useEffect(() => {
    setExpandedPlatformId(activePlatformId);
    setMorePlatformId("");
  }, [activePlatformId]);
  useEffect(() => {
    setMorePlatformId("");
    setStageDropdownOpen(mode === "life-cycle");
    setProfessionDropdownOpen(mode === "profession");
    if (mode === "platform") {
      setExpandedPlatformId(activePlatformId || "oxyloans");
    }
  }, [mode, activePlatformId]);

  const filteredStages = useMemo(() => {
    if (!query) return LIFE_STAGES;
    return LIFE_STAGES.filter((stage) =>
      `${stage.title} ${stage.shortLabel} ${stage.description}`
        .toLowerCase()
        .includes(query)
    );
  }, [query]);

  const filteredProfessions = useMemo(() => {
    if (!query) return TOP_CLASSIFICATIONS;
    return TOP_CLASSIFICATIONS.filter(item => classificationLabel(item).toLowerCase().includes(query));
  }, [query]);

  const visiblePlatforms = useMemo(() => {
    if (!query) return PLATFORMS;

    return PLATFORMS.filter((platform) => {
      const platformMatch = `${platform.name} ${platform.description}`
        .toLowerCase()
        .includes(query);

      const journeyMatch = uniqueByTitle(
        platformJourneys[platform.id] || []
      ).some((journey) =>
        `${journey.title} ${journey.summary || ""}`
          .toLowerCase()
          .includes(query)
      );

      return platformMatch || journeyMatch;
    });
  }, [query, platformJourneys]);


  if (!expanded && !mobile) {
    return (
      <Rail
        mode={mode}
        profile={profile}
        activeName={activeName}
        activeSubtitle={activeSubtitle}
        isLoggedIn={isUserLoggedIn}
        onLogout={onLogout}
        onToggleExpanded={onToggleExpanded}
        onModeChange={onModeChange}
        onNewJourney={onNewJourney}
        onProfileClick={onProfileClick}
      />
    );
  }

  return (
    <div className="oxj-sidebar">
      <div className="oxj-sidebar-head">
        <img src={LOGO} alt="OXY Journeys" />
        <button
          type="button"
          className="oxj-collapse-button"
          onClick={mobile ? onCloseMobile : onToggleExpanded}
          aria-label={mobile ? "Close menu" : "Collapse sidebar"}
        >
          {mobile ? "×" : "‹"}
        </button>
      </div>

      <div className="oxj-sidebar-scroll">
        <div className="oxj-mode-tabs">
          <button
            type="button"
            className={mode === "life-cycle" ? "active life" : ""}
            onClick={() => onModeChange("life-cycle")}
          >
            LIFE JOURNEY
          </button>
          {SHOW_PLATFORM_JOURNEYS && (
            <button
              type="button"
              className={mode === "platform" ? "active platform" : ""}
              onClick={() => onModeChange("platform")}
            >
              PLATFORM JOURNEY
            </button>
          )}
          <button
            type="button"
            className={mode === "profession" ? "active platform" : ""}
            onClick={() => onModeChange("profession")}
          >
            PROFESSIONS
          </button>
        </div>

        <div className="oxj-search">
          <SearchIcon />
          <input
            type="text"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={
              mode === "life-cycle"
                ? "Search life stages"
                : mode === "profession"
                  ? "Search professions"
                  : "Search platforms or journeys"
            }
            aria-label={
              mode === "life-cycle"
                ? "Search life stages"
                : mode === "profession"
                  ? "Search professions"
                  : "Search platforms or journeys"
            }
          />
          {search && (
            <button
              type="button"
              className="oxj-search-clear"
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {mode === "life-cycle" ? (
          <section className="oxj-sidebar-section">
            <div className="oxj-section-label">What stage are you at now?</div>

            <div className={`oxj-platform-list oxj-life-dropdown ${stageDropdownOpen ? "is-open" : ""}`}>
              <button
                type="button"
                className="oxj-platform-trigger oxj-life-trigger"
                onClick={() => setStageDropdownOpen(open => !open)}
                aria-expanded={stageDropdownOpen}
                aria-controls={`${controlsId}-life-stages`}
              >
                <LifeCycleIcon />
                <strong>{draftStage?.title || "Select your life stage"}</strong>
                <ChevronIcon className={stageDropdownOpen ? "rotate" : ""} />
              </button>
              {stageDropdownOpen && (
                <div id={`${controlsId}-life-stages`} className="oxj-journey-list oxj-stage-options" role="group" aria-label="Choose a life stage">
                  {filteredStages.length ? filteredStages.map(stage => (
                    <button
                      type="button"
                      key={stage.id}
                      className={`oxj-journey-row ${draftStageId === stage.id ? "selected" : ""}`}
                      aria-pressed={draftStageId === stage.id}
                      onClick={() => { setDraftStageId(stage.id); onStageSelect(stage); setStageDropdownOpen(false); }}
                    >
                      <span className="oxj-journey-dot" />
                      <span><strong>{stage.title}</strong></span>
                      {draftStageId === stage.id && <span className="oxj-stage-check" aria-hidden="true">✓</span>}
                    </button>
                  )) : <div className="oxj-list-empty">No matching life stages.</div>}
                </div>
              )}
            </div>
            {draftStage && <p className="oxj-stage-description">{draftStage.description}</p>}
            <div className="oxj-stage-save-row">
              <span className="oxj-stage-save-hint" role="status">{draftStageId && stageId === draftStageId ? "Saved life stage" : "Select a stage, then save."}</span>
              {/* Already-saved stage needs no Save; it returns when another stage is picked. */}
              {!(draftStageId && stageId === draftStageId) && (
                <button
                  type="button"
                  className="oxj-stage-save-button"
                  disabled={!draftStage}
                  onClick={() => { if (draftStage) { onStageSelect(draftStage); setStageDropdownOpen(false); } }}
                >Save</button>
              )}
            </div>

          </section>
        ) : mode === "profession" ? (
          <section className="oxj-sidebar-section">
            <div className="oxj-section-label">Who are you looking for?</div>

            <div className={`oxj-platform-list oxj-life-dropdown ${professionDropdownOpen ? "is-open" : ""}`}>
              <button
                type="button"
                className="oxj-platform-trigger oxj-life-trigger"
                onClick={() => setProfessionDropdownOpen(open => !open)}
                aria-expanded={professionDropdownOpen}
                aria-controls={`${controlsId}-professions`}
              >
                <UserIcon />
                <strong>{(() => { const current = TOP_CLASSIFICATIONS.find(item => item.name === activeProfession); return current ? classificationLabel(current) : "Select a profession"; })()}</strong>
                <ChevronIcon className={professionDropdownOpen ? "rotate" : ""} />
              </button>
              {professionDropdownOpen && (
                <div id={`${controlsId}-professions`} className="oxj-journey-list oxj-stage-options" role="group" aria-label="Choose a profession">
                  {filteredProfessions.length ? filteredProfessions.map(item => {
                    const selected = item.name === activeProfession;
                    return (
                      <button
                        type="button"
                        key={item.name}
                        className={`oxj-journey-row ${selected ? "selected" : ""}`}
                        aria-pressed={selected}
                        onClick={() => { onProfessionSelect?.(item.name); setProfessionDropdownOpen(false); }}
                      >
                        <span className="oxj-journey-dot" />
                        <span><strong>{classificationLabel(item)}</strong></span>
                        {selected && <span className="oxj-stage-check" aria-hidden="true">✓</span>}
                      </button>
                    );
                  }) : <div className="oxj-list-empty">No matching professions.</div>}
                </div>
              )}
            </div>
            <p className="oxj-stage-description">Pick a profession and we&rsquo;ll help you meet the right people.</p>
          </section>
        ) : (
          <section className="oxj-sidebar-section">
            <div className="oxj-section-label">Platforms</div>

            <div className="oxj-platform-list">
              {visiblePlatforms.map((platform) => {
                const active = expandedPlatformId === platform.id;
                const allJourneys = uniqueByTitle(
                  platformJourneys[platform.id] || []
                );

                const platformNameMatches = `${platform.name} ${platform.shortName}`.toLowerCase().includes(query);
                const visibleJourneys = query && !platformNameMatches
                  ? allJourneys.filter((journey) =>
                      `${journey.title} ${journey.summary || ""}`
                        .toLowerCase()
                        .includes(query)
                    )
                  : allJourneys;

                const showMore = morePlatformId === platform.id;
                const displayedJourneys = showMore ? visibleJourneys : visibleJourneys.slice(0, 3);
                const journeyListId = `${controlsId}-${platform.id}-journeys`;

                return (
                  <div
                    className={`oxj-platform-item ${active ? "active" : ""}`}
                    key={platform.id}
                  >
                    <button
                      type="button"
                      className="oxj-platform-trigger"
                      onClick={() => {
                        const willExpand = !active;
                        setExpandedPlatformId(willExpand ? platform.id : "");
                        setMorePlatformId("");
                        if (willExpand) onPlatformOpen(platform.id);
                      }}
                      aria-expanded={active}
                      aria-controls={journeyListId}
                    >
                      <span className="oxj-platform-dot" />
                      <strong>{platform.shortName}</strong>
                      <span className="oxj-count">
                        {platformLoading[platform.id] ? "…" : allJourneys.length}
                      </span>
                      <ChevronIcon className={active ? "rotate" : ""} />
                    </button>

                    {active && (
                      <div id={journeyListId} className="oxj-journey-list">
                        {platformLoading[platform.id] ? (
                          <div className="oxj-list-empty">Loading journeys…</div>
                        ) : visibleJourneys.length > 0 ? (
                          displayedJourneys.map((journey) => (
                            <button
                              type="button"
                              key={journey.id}
                              className={`oxj-journey-row ${
                                activeJourneyId === journey.id ? "selected" : ""
                              }`}
                              aria-pressed={activeJourneyId === journey.id && activePlatformId === platform.id}
                              onClick={() => onPlatformJourneySelect(platform, journey)}
                            >
                              <span className="oxj-journey-dot" />
                              <span>
                                <strong>{journey.title}</strong>
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className="oxj-list-empty">No matching journeys.</div>
                        )}
                        {!platformLoading[platform.id] && visibleJourneys.length > 3 && (
                          <button
                            type="button"
                            className="oxj-journey-more"
                            onClick={() => setMorePlatformId(showMore ? "" : platform.id)}
                            aria-expanded={showMore}
                            aria-controls={journeyListId}
                          >
                            <span>{showMore ? "Show less" : `More journeys (${visibleJourneys.length - 3})`}</span>
                            <ChevronIcon className={showMore ? "rotate" : ""} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {savedSessions.length > 0 && (
          <section className="oxj-history-section" aria-label="Chat History">
            <div className="oxj-history-head">
              <div>
                <span className="oxj-section-label">Chat History</span>
                <small>Your conversations</small>
              </div>
              <span className="oxj-history-count">{savedSessions.length}</span>
            </div>
            <div className="oxj-history-list">
              {savedSessions.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className="oxj-history-item oxj-session-history-item"
                  title={item.title}
                  aria-label={`Open chat: ${item.title}`}
                  aria-current={item.id === sessionId ? "true" : undefined}
                  onClick={() => {
                    if (mobile) onCloseMobile?.();
                    if (item.id !== sessionId) onSelectSession?.(item.id);
                  }}
                >
                  <span className="oxj-history-bubble">↗</span>
                  <span className="oxj-session-history-copy">
                    <strong>{item.title}</strong>
                    <small>{item.id === sessionId ? "Current chat" : "Open conversation"}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {partnerChats.length > 0 && (
          <section className="oxj-history-section" aria-label="Partner Chats">
            <div className="oxj-history-head">
              <div>
                <span className="oxj-section-label">Partner Chats</span>
                <small>Your chats with journey partners</small>
              </div>
              <span className="oxj-history-count">{partnerChats.length}</span>
            </div>
            <div className="oxj-history-list">
              {partnerChats.map(item => (
                <a
                  key={item.id}
                  href={`/oxy-journey/chat/${encodeURIComponent(item.id)}/user`}
                  className="oxj-history-item oxj-session-history-item"
                  title={`${item.title} with ${item.partnerName}`}
                  aria-label={`Open chat with ${item.partnerName}`}
                >
                  <span className="oxj-history-bubble">💬</span>
                  <span className="oxj-session-history-copy">
                    <strong>{item.partnerName}</strong>
                    <small>{item.title}</small>
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}

        {savedSessions.length === 0 && hasSessionHistory && (
          <section className="oxj-history-section" aria-label="Chat History">
            <div className="oxj-history-head">
              <div>
                <span className="oxj-section-label">Chat History</span>
                <small>Current session</small>
              </div>
              <span className="oxj-history-count">1</span>
            </div>
            <div className="oxj-history-list">
              <button
                key={sessionId}
                type="button"
                className="oxj-history-item oxj-session-history-item"
                title={firstPrompt?.content}
                aria-label={`Open current chat session: ${firstPrompt?.content}`}
                aria-current="true"
                onClick={() => {
                  if (mobile) onCloseMobile?.();
                  // All messages already belong to the current visible thread.
                  document.querySelector(".cb-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <span className="oxj-history-bubble">↗</span>
                <span className="oxj-session-history-copy">
                  <strong>{firstPrompt?.content}</strong>
                  <small>{historyMessages.length} messages · One conversation</small>
                </span>
              </button>
            </div>
          </section>
        )}
      </div>

      <div className="oxj-sidebar-footer">
        <a href="/oxy-journey/partner/chats" className="oxj-partner-chats-link">
          <span>Partner chats</span>
          <span aria-hidden="true">↗</span>
        </a>

        <div
          ref={profileWrapperRef}
          className="oxj-profile-wrapper"
        >
          {profileMenuOpen && (
            <div className="oxj-profile-popover" role="menu" aria-label="Account options">
              <div className="oxj-popover-user">
                <div className="oxj-popover-avatar">
                  <ProfileAvatar profile={{ ...profile, name: activeName, avatarUrl: profile?.avatarUrl }} />
                </div>
                <div className="oxj-popover-meta">
                  <span className="oxj-popover-name" title={activeName}>{activeName}</span>
                  <span className="oxj-popover-sub">{activeSubtitle}</span>
                </div>
              </div>

              <div className="oxj-popover-divider" />

              {isUserLoggedIn && onLogout ? (
                <button
                  type="button"
                  className="oxj-popover-btn oxj-popover-logout"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    if (mobile) onCloseMobile?.();
                    onLogout();
                  }}
                  role="menuitem"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9" />
                  </svg>
                  <span>Log out</span>
                </button>
              ) : null}
            </div>
          )}

          <button
            type="button"
            className={`oxj-profile ${profileMenuOpen && isUserLoggedIn ? "is-menu-open" : ""}`}
            onClick={() => { if (isUserLoggedIn && onLogout) setProfileMenuOpen(open => !open); }}
            aria-expanded={isUserLoggedIn ? profileMenuOpen : undefined}
            aria-haspopup={isUserLoggedIn && onLogout ? "menu" : undefined}
            style={isUserLoggedIn && onLogout ? undefined : { cursor: "default" }}
            title={activeName}
          >
            <ProfileAvatar profile={{ ...profile, name: activeName, avatarUrl: profile?.avatarUrl }} />
            <span className="oxj-profile-text">
              <strong>{activeName}</strong>
              <small>{activeSubtitle}</small>
            </span>
            {isUserLoggedIn && onLogout && (
              <span className={`oxj-profile-chevron ${profileMenuOpen ? "is-rotated" : ""}`} aria-hidden="true">
                <ChevronIcon />
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
