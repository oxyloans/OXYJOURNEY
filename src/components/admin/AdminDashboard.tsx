import { useEffect, useState, useMemo, useRef } from "react";
import {
  fetchLiveSessions,
  fetchCompletedSessions,
  fetchAllSessions,
  fetchAllAdminMessages,
  formatAdminDate,
  formatAdminTimeAgo,
  getAdminSession,
  adminLogout,
  type AdminSession,
  type AdminMessage,
} from "../../services/adminApi";
import { LOGO } from "../../data/journeyData";
import AdminConversations from "./AdminConversations";
import AdminLogin from "./AdminLogin";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  Layers,
  LogOut,
  MessageSquare,
  Search,
  Sparkles,
  User,
  X,
  LayoutGrid,
  Table as TableIcon,
  Flame,
  UserCheck,
  SlidersHorizontal,
  Radio,
  RotateCcw,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import "./AdminDashboard.css";

type TabView = "live" | "all" | "completed" | "messages";

export default function AdminDashboard() {
  const [session, setSession] = useState(() => getAdminSession());

  if (!session) {
    return <AdminLogin onLoginSuccess={() => setSession(getAdminSession())} />;
  }

  return <AdminDashboardMain onLogout={() => setSession(null)} />;
}

function AdminDashboardMain({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<TabView>("live");
  const [liveSessions, setLiveSessions] = useState<AdminSession[]>([]);
  const [completedSessions, setCompletedSessions] = useState<AdminSession[]>([]);
  const [allSessions, setAllSessions] = useState<AdminSession[]>([]);
  const [messages, setMessages] = useState<AdminMessage[]>([]);

  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [leadStatusFilter, setLeadStatusFilter] = useState("ALL");
  const [senderFilter, setSenderFilter] = useState("ALL");
  const [filterSessionId, setFilterSessionId] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const abortControllerRef = useRef<AbortController | null>(null);

  // Load all 4 APIs
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const [liveRes, compRes, allRes, msgRes] = await Promise.all([
        fetchLiveSessions(controller.signal),
        fetchCompletedSessions(controller.signal),
        fetchAllSessions(controller.signal),
        fetchAllAdminMessages(controller.signal),
      ]);

      setLiveSessions(liveRes.data);
      setCompletedSessions(compRes.data);
      setAllSessions(allRes.data);
      setMessages(msgRes.data);
      setLastUpdated(new Date());
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Error loading admin data:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // Background refresh every 30 seconds
    const interval = setInterval(() => {
      void loadData(true);
    }, 30000);

    return () => {
      clearInterval(interval);
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleOpenMessagesForSession = (sessionId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFilterSessionId(sessionId);
    setActiveTab("messages");
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setCategoryFilter("ALL");
    setLeadStatusFilter("ALL");
    setSenderFilter("ALL");
    setFilterSessionId("");
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = allSessions.length;
    const live = liveSessions.length;
    const completed = completedSessions.length;
    const matchedLeads = allSessions.filter(
      (s) => s.leadStatus === "PERSON_MATCHED" || Boolean(s.matchedPersonName)
    ).length;
    const totalMessages = messages.length;

    return { total, live, completed, matchedLeads, totalMessages };
  }, [allSessions, liveSessions, completedSessions, messages]);

  // Current list of sessions based on active tab
  const currentSessions = useMemo(() => {
    let list: AdminSession[] = [];
    if (activeTab === "live") list = liveSessions;
    else if (activeTab === "completed") list = completedSessions;
    else if (activeTab === "all") list = allSessions;
    else return [];

    return list.filter((s) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesUser = (s.userName || "").toLowerCase().includes(q);
        const matchesMatched = (s.matchedPersonName || "").toLowerCase().includes(q);
        const matchesTitle = (s.journeyTitle || "").toLowerCase().includes(q);
        const categoryCombined = (s.journeyCategoryValue || s.journeyCategoryType || "").toLowerCase();
        const matchesCategory = categoryCombined.includes(q);
        const matchesKey = (s.detectedJourneyKey || "").toLowerCase().includes(q);
        const matchesSessionStatus = (s.sessionStatus || "").toLowerCase().includes(q);
        const matchesLeadStatus = (s.leadStatus || "").toLowerCase().includes(q);
        if (
          !matchesUser &&
          !matchesMatched &&
          !matchesTitle &&
          !matchesCategory &&
          !matchesKey &&
          !matchesSessionStatus &&
          !matchesLeadStatus
        ) {
          return false;
        }
      }

      // Category filter
      if (categoryFilter !== "ALL") {
        const cat = (s.journeyCategoryValue || s.journeyCategoryType || "").toUpperCase();
        if (!cat.includes(categoryFilter.toUpperCase())) return false;
      }

      // Lead status filter
      if (leadStatusFilter !== "ALL") {
        if (s.leadStatus !== leadStatusFilter) return false;
      }

      return true;
    });
  }, [activeTab, liveSessions, completedSessions, allSessions, searchQuery, categoryFilter, leadStatusFilter]);

  // Filtered messages
  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      if (filterSessionId && m.sessionId !== filterSessionId) {
        return false;
      }
      if (senderFilter !== "ALL" && m.senderType?.toUpperCase() !== senderFilter.toUpperCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesMsg = m.message.toLowerCase().includes(q);
        const matchesSender = m.senderName.toLowerCase().includes(q);
        if (!matchesMsg && !matchesSender) {
          return false;
        }
      }
      return true;
    });
  }, [messages, filterSessionId, senderFilter, searchQuery]);

  const conversationCount = useMemo(
    () => new Set(messages.map((m) => m.sessionId).filter(Boolean)).size,
    [messages]
  );

  // Check if any filter is active
  const isFilterActive = Boolean(
    searchQuery.trim() ||
    (activeTab !== "messages" && (categoryFilter !== "ALL" || leadStatusFilter !== "ALL")) ||
    (activeTab === "messages" && (senderFilter !== "ALL" || filterSessionId))
  );

  return (
    <div className="ad-root">
      {/* Top Navbar */}
      <header className="ad-navbar">
        <div className="ad-navbar-container max-w-7xl mx-auto w-full">
          <div className="ad-navbar-left">
            <div className="ad-brand">
              <img
                src={LOGO}
                alt="OXY Journeys"
                className="ad-brand-logo"
                onError={(e) => {
                  e.currentTarget.src = "https://i.ibb.co/XxJJRXx5/jun-logo.png";
                }}
              />
            </div>
            <span className="ad-brand-tag ad-hide-mobile">Every journey, one partner</span>
            <span className="ad-brand-badge ad-hide-mobile">Admin Console</span>
          </div>

          <div className="ad-navbar-right">
            <div className="ad-user-chip">
              <div className="ad-avatar">
                <User size={15} />
              </div>
              <div className="ad-user-info ad-hide-mobile">
                <strong>Admin</strong>
              </div>
            </div>

            <button
              type="button"
              className="ad-logout-btn"
              onClick={() => {
                adminLogout();
                onLogout();
              }}
              title="Log out of Admin"
            >
              <LogOut size={15} />
              <span className="ad-hide-mobile">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Body Section (gray-50) */}
      <div className="ad-body-section bg-gray-50">
        <main className="ad-main max-w-7xl mx-auto w-full">
        {/* Top KPI Metrics Cards */}
        <section className="ad-kpi-grid" aria-label="Key Performance Indicators">
          <div
            className={`ad-kpi-card ${activeTab === "live" && leadStatusFilter === "ALL" ? "is-highlight" : ""}`}
            onClick={() => {
              setActiveTab("live");
              setLeadStatusFilter("ALL");
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setActiveTab("live");
                setLeadStatusFilter("ALL");
              }
            }}
            title="View Live Sessions"
          >
            <div className="ad-kpi-icon-wrap is-live">
              <Flame size={22} />
            </div>
            <div className="ad-kpi-info">
              <span className="ad-kpi-label">Live Sessions</span>
              <strong className="ad-kpi-val is-live-val">{stats.live}</strong>
            </div>
          </div>

          <div
            className={`ad-kpi-card ${activeTab === "all" && leadStatusFilter === "ALL" ? "is-highlight" : ""}`}
            onClick={() => {
              setActiveTab("all");
              setLeadStatusFilter("ALL");
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setActiveTab("all");
                setLeadStatusFilter("ALL");
              }
            }}
            title="View All Sessions"
          >
            <div className="ad-kpi-icon-wrap is-total">
              <Layers size={22} />
            </div>
            <div className="ad-kpi-info">
              <span className="ad-kpi-label">Total Sessions</span>
              <strong className="ad-kpi-val">{stats.total}</strong>
            </div>
          </div>

          <div
            className={`ad-kpi-card ${activeTab === "completed" ? "is-highlight" : ""}`}
            onClick={() => {
              setActiveTab("completed");
              setLeadStatusFilter("ALL");
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setActiveTab("completed");
                setLeadStatusFilter("ALL");
              }
            }}
            title="View Completed Sessions"
          >
            <div className="ad-kpi-icon-wrap is-completed">
              <CheckCircle2 size={22} />
            </div>
            <div className="ad-kpi-info">
              <span className="ad-kpi-label">Completed Sessions</span>
              <strong className="ad-kpi-val">{stats.completed}</strong>
            </div>
          </div>

          <div
            className={`ad-kpi-card ${activeTab === "messages" ? "is-highlight" : ""}`}
            onClick={() => {
              setFilterSessionId("");
              setActiveTab("messages");
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setFilterSessionId("");
                setActiveTab("messages");
              }
            }}
            title="View Chat Conversations"
          >
            <div className="ad-kpi-icon-wrap is-messages">
              <MessageSquare size={22} />
            </div>
            <div className="ad-kpi-info">
              <span className="ad-kpi-label">Chat Conversations</span>
              <strong className="ad-kpi-val">{stats.totalMessages}</strong>
            </div>
          </div>

          <div
            className={`ad-kpi-card ${activeTab === "all" && leadStatusFilter === "PERSON_MATCHED" ? "is-highlight" : ""}`}
            onClick={() => {
              setActiveTab("all");
              setLeadStatusFilter("PERSON_MATCHED");
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setActiveTab("all");
                setLeadStatusFilter("PERSON_MATCHED");
              }
            }}
            title="Click to filter Person Matched Leads"
          >
            <div className="ad-kpi-icon-wrap is-matched">
              <UserCheck size={22} />
            </div>
            <div className="ad-kpi-info">
              <span className="ad-kpi-label">Matched Leads</span>
              <strong className="ad-kpi-val">{stats.matchedLeads}</strong>
            </div>
          </div>
        </section>

        {/* Tab Navigation & Toolbar */}
        <div className="ad-toolbar-wrap">
          <div className="ad-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "live"}
              className={`ad-tab ${activeTab === "live" ? "is-active" : ""}`}
              onClick={() => setActiveTab("live")}
            >
              <Radio size={15} className={activeTab === "live" ? "ad-pulse" : ""} />
              <span>Live Sessions</span>
              <span className="ad-tab-count is-live">{stats.live}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "all"}
              className={`ad-tab ${activeTab === "all" ? "is-active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              <Layers size={15} />
              <span>All Sessions</span>
              <span className="ad-tab-count">{stats.total}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "completed"}
              className={`ad-tab ${activeTab === "completed" ? "is-active" : ""}`}
              onClick={() => setActiveTab("completed")}
            >
              <CheckCircle2 size={15} />
              <span>Completed</span>
              <span className="ad-tab-count">{stats.completed}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "messages"}
              className={`ad-tab ${activeTab === "messages" ? "is-active" : ""}`}
              onClick={() => {
                setFilterSessionId("");
                setActiveTab("messages");
              }}
            >
              <MessageSquare size={15} />
              <span>All Messages</span>
              <span className="ad-tab-count">{stats.totalMessages}</span>
            </button>
          </div>

          {/* Right Tools: View switch and updated indicator */}
          <div className="ad-toolbar-actions">
            {activeTab !== "messages" && (
              <div className="ad-view-toggle" role="group" aria-label="View layout switcher">
                <button
                  type="button"
                  className={`ad-view-btn ${viewMode === "grid" ? "is-active" : ""}`}
                  onClick={() => setViewMode("grid")}
                  title="Card Grid view"
                  aria-label="Switch to Card Grid view"
                >
                  <LayoutGrid size={15} />
                  <span className="ad-view-label">Grid</span>
                </button>
                <button
                  type="button"
                  className={`ad-view-btn ${viewMode === "table" ? "is-active" : ""}`}
                  onClick={() => setViewMode("table")}
                  title="Data Table view"
                  aria-label="Switch to Data Table view"
                >
                  <TableIcon size={15} />
                  <span className="ad-view-label">Table</span>
                </button>
              </div>
            )}

            <div className="ad-last-updated" title={`Last synced at ${lastUpdated.toLocaleTimeString()}`}>
              <Clock size={12} />
              <span>Updated {formatAdminTimeAgo(lastUpdated.toISOString())}</span>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="ad-filter-bar">
          <div className="ad-search-box">
            <Search size={16} className="ad-search-icon" aria-hidden="true" />
            <input
              type="text"
              placeholder={
                activeTab === "messages"
                  ? "Search conversations…"
                  : "Search sessions by user, matched person, category, journey…"
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ad-search-input"
              aria-label="Search items"
            />
            {searchQuery && (
              <button
                type="button"
                className="ad-clear-btn"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="ad-filter-pills">
            {activeTab !== "messages" ? (
              <>
                <div className="ad-filter-item">
                  <Filter size={13} className="ad-filter-icon" aria-hidden="true" />
                  <select
                    className="ad-filter-select"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    aria-label="Filter by category"
                  >
                    <option value="ALL">All Categories</option>
                    <option value="OXYLOANS">OXYLOANS</option>
                    <option value="OXYGOLD">OXYGOLD</option>
                    <option value="CLASSIFICATION">Classification</option>
                  </select>
                </div>

                <div className="ad-filter-item">
                  <SlidersHorizontal size={13} className="ad-filter-icon" aria-hidden="true" />
                  <select
                    className="ad-filter-select"
                    value={leadStatusFilter}
                    onChange={(e) => setLeadStatusFilter(e.target.value)}
                    aria-label="Filter by lead status"
                  >
                    <option value="ALL">All Lead Statuses</option>
                    <option value="PERSON_MATCHED">Person Matched</option>
                    <option value="CANDIDATES_SHOWN">Candidates Shown</option>
                    <option value="CONVERTED">Converted</option>
                  </select>
                </div>
              </>
            ) : null}

            {isFilterActive && (
              <button
                type="button"
                className="ad-reset-filter-btn"
                onClick={handleResetFilters}
                title="Reset all active filters and search"
              >
                <RotateCcw size={12} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Contents */}
        {loading ? (
          <div className="ad-loading-box">
            <div className="ad-spinner" />
            <h3>Loading session records…</h3>
            <p>Fetching real-time journey information</p>
          </div>
        ) : activeTab === "messages" ? (
          /* MESSAGES TAB: conversations read as chats */
          <div className="ad-messages-section">
            <div className="ad-section-header ac-heading">
              <span className="ac-heading-icon" aria-hidden="true"><MessageSquare size={20} /></span>
              <h2>Chat Conversations</h2>
              <span className="ac-heading-count">
                {conversationCount} {conversationCount === 1 ? "conversation" : "conversations"}
              </span>
            </div>
            <AdminConversations
              messages={messages}
              sessions={allSessions}
              searchQuery={searchQuery}
              focusSessionId={filterSessionId}
            />
          </div>
        ) : (
          /* SESSIONS (LIVE, ALL, COMPLETED) */
          <div className="ad-sessions-section">
            <div className="ad-section-header">
              <div>
                <h2>
                  {activeTab === "live"
                    ? "Live Journey Sessions"
                    : activeTab === "completed"
                    ? "Completed Journey Sessions"
                    : "All Journey Sessions"}
                </h2>
                <p>
                  Showing {currentSessions.length} {currentSessions.length === 1 ? "session" : "sessions"}
                  {isFilterActive ? " (filtered)" : ""}
                </p>
              </div>
            </div>

            {currentSessions.length === 0 ? (
              <div className="ad-empty-state">
                <div className="ad-empty-icon-wrap">
                  <Layers size={32} />
                </div>
                <h3>No sessions found</h3>
                <p>No matching sessions found for current tab and filter criteria.</p>
                {isFilterActive && (
                  <button type="button" className="ad-empty-btn" onClick={handleResetFilters}>
                    <RotateCcw size={14} />
                    <span>Clear Search & Filters</span>
                  </button>
                )}
              </div>
            ) : viewMode === "grid" ? (
              /* CARD GRID VIEW */
              <div className="ad-grid">
                {currentSessions.map((s, index) => (
                  <div key={s.sessionId || index} className="ad-card">
                    <div className="ad-card-top">
                      <div className="ad-card-badges">
                        {s.chatStatus && (
                          <span
                            className={`ad-chat-status ${
                              s.chatStatus === "LIVE" ? "is-live" : "is-completed"
                            }`}
                          >
                            {s.chatStatus === "LIVE" && <span className="ad-live-pulse-dot" />}
                            {s.chatStatus}
                          </span>
                        )}

                        {(s.journeyCategoryValue || s.journeyCategoryType) && (
                          <span className="ad-category-pill">
                            {(s.journeyCategoryValue || s.journeyCategoryType)!.toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="ad-card-top-right">
                        {s.leadStatus && (
                          <span className="ad-status-tag" title="Lead Status">
                            {s.leadStatus.replace(/_/g, " ")}
                          </span>
                        )}
                        {s.sessionStatus && (
                          <span className="ad-session-status-tag" title="Session Status">
                            {s.sessionStatus.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="ad-card-body">
                      <div className="ad-card-title-row">
                        <h4 className="ad-card-title">
                          {s.journeyTitle || s.detectedJourneyKey || "AI Journey"}
                        </h4>
                        {s.detectedJourneyKey &&
                          s.detectedJourneyKey !== s.journeyTitle &&
                          !s.detectedJourneyKey.includes("-") && (
                            <span className="ad-journey-key-badge" title="Detected Journey Key">
                              {s.detectedJourneyKey}
                            </span>
                          )}
                      </div>

                      {s.journeyDescription && (
                        <p className="ad-card-desc">{s.journeyDescription}</p>
                      )}

                      <div className="ad-card-meta-list">
                        <div className="ad-meta-row">
                          <span className="ad-meta-label">
                            <User size={13} className="ad-meta-icon" />
                            <span>User:</span>
                          </span>
                          <strong className="ad-meta-value">{s.userName || "Guest"}</strong>
                        </div>

                        <div className="ad-meta-row">
                          <span className="ad-meta-label">
                            <UserCheck size={13} className="ad-meta-icon" />
                            <span>Matched Person:</span>
                          </span>
                          <strong className="ad-meta-value is-matched">
                            {s.matchedPersonName ? `✓ ${s.matchedPersonName}` : "—"}
                          </strong>
                        </div>

                        {s.sessionStatus && (
                          <div className="ad-meta-row">
                            <span className="ad-meta-label">
                              <span>Session Status:</span>
                            </span>
                            <span className="ad-meta-status-val">
                              {s.sessionStatus.replace(/_/g, " ")}
                            </span>
                          </div>
                        )}

                        {s.leadStatus && (
                          <div className="ad-meta-row">
                            <span className="ad-meta-label">
                              <span>Lead Status:</span>
                            </span>
                            <span className="ad-meta-status-val">
                              {s.leadStatus.replace(/_/g, " ")}
                            </span>
                          </div>
                        )}

                        {s.directSearchReady && (
                          <div className="ad-meta-row is-signal">
                            <Sparkles size={13} className="ad-color-ready" />
                            <span>Direct Search Ready</span>
                            {s.directSearchSignal && <small>({s.directSearchSignal})</small>}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="ad-card-footer">
                      <div className="ad-card-times">
                        <Clock size={12} className="ad-card-time-icon" />
                        <span>Updated: {formatAdminTimeAgo(s.updatedAt || s.createdAt)}</span>
                      </div>

                      <div className="ad-card-actions">
                        {s.chatWindowUrl ? (
                          <a
                            href={s.chatWindowUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ad-action-btn is-primary"
                            title="Open Chat in new window"
                          >
                            <ExternalLink size={13} />
                            <span>Chat</span>
                          </a>
                        ) : (
                          <a
                            href={`https://www.oxyjourneys.com/oxy-journey/chat/${encodeURIComponent(s.sessionId)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ad-action-btn is-primary"
                            title="Open Chat in new window"
                          >
                            <ExternalLink size={13} />
                            <span>Chat</span>
                          </a>
                        )}

                        <button
                          type="button"
                          className="ad-action-btn is-secondary"
                          onClick={(e) => handleOpenMessagesForSession(s.sessionId, e)}
                          title="View chat messages for this session"
                        >
                          <MessageSquare size={13} />
                          <span>Logs</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* TABLE VIEW */
              <div className="ad-table-card">
                <div className="ad-table-wrapper">
                  <table className="ad-table">
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>User</th>
                        <th>Journey Title</th>
                        <th>Category</th>
                        <th>Matched Person</th>
                        <th>Session Status</th>
                        <th>Lead Status</th>
                        <th>Last Updated</th>
                        <th className="ad-th-actions">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentSessions.map((s, index) => (
                        <tr key={s.sessionId || index} className="ad-tr">
                          <td>
                            <span
                              className={`ad-chat-status ${
                                s.chatStatus === "LIVE" ? "is-live" : "is-completed"
                              }`}
                            >
                              {s.chatStatus === "LIVE" && <span className="ad-live-pulse-dot" />}
                              {s.chatStatus || "ACTIVE"}
                            </span>
                          </td>

                          <td>
                            <strong className="ad-table-user">{s.userName || "Guest"}</strong>
                          </td>

                          <td>
                            <div className="ad-table-journey-cell">
                              <strong>
                                {s.journeyTitle || s.detectedJourneyKey || "AI Journey"}
                              </strong>
                              {s.journeyDescription && (
                                <small>{s.journeyDescription.slice(0, 60)}…</small>
                              )}
                            </div>
                          </td>

                          <td>
                            <span className="ad-category-pill">
                              {(s.journeyCategoryValue || s.journeyCategoryType || "—").toUpperCase()}
                            </span>
                          </td>

                          <td>
                            <strong className="ad-meta-value is-matched">
                              {s.matchedPersonName ? `✓ ${s.matchedPersonName}` : "—"}
                            </strong>
                          </td>

                          <td>
                            <span className="ad-session-status-tag">
                              {s.sessionStatus ? s.sessionStatus.replace(/_/g, " ") : "—"}
                            </span>
                          </td>

                          <td>
                            <span className="ad-status-tag">
                              {s.leadStatus ? s.leadStatus.replace(/_/g, " ") : "—"}
                            </span>
                          </td>

                          <td>
                            <time className="ad-time-cell">
                              {formatAdminTimeAgo(s.updatedAt || s.createdAt)}
                            </time>
                          </td>

                          <td className="ad-td-actions">
                            <div className="ad-table-actions-row">
                              {s.chatWindowUrl ? (
                                <a
                                  href={s.chatWindowUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ad-action-btn is-primary"
                                  title="Open Chat"
                                >
                                  <ExternalLink size={12} />
                                  <span>Chat</span>
                                </a>
                              ) : (
                                <a
                                  href={`https://www.oxyjourneys.com/oxy-journey/chat/${encodeURIComponent(s.sessionId)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ad-action-btn is-primary"
                                  title="Open Chat"
                                >
                                  <ExternalLink size={12} />
                                  <span>Chat</span>
                                </a>
                              )}
                              <button
                                type="button"
                                className="ad-action-btn is-secondary"
                                onClick={(e) => handleOpenMessagesForSession(s.sessionId, e)}
                                title="Messages for this session"
                              >
                                <MessageSquare size={12} />
                                <span>Logs</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
      </div>
    </div>
  );
}
