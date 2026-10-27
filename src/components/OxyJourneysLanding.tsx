import { useEffect, useMemo, useRef, useState } from "react";
import {
  getLifeStageById,
  getPlatformById,
  classificationLabel,
  classificationOpeningMessage,
  LIFE_STAGE_EXAMPLES,
  LIFE_STAGES,
  PLATFORMS,
  TOP_CLASSIFICATIONS,
} from "../data/journeyData";
import type {
  ChatContext,
  ChatMessage,
  JourneyMode,
  JourneyOption,
  LandingProps,
  LifeStage,
  Platform,
} from "../types/journey";
import ChatBox, { type ChatBoxAdapter, type ChatBoxConversation, type ChatBoxMessage } from "./ChatBox";
import JourneySidebar from "./JourneySidebar";
import MobileJourneyHeader from "./MobileJourneyHeader";
import JourneyLoginModal from "./JourneyLoginModal";
import { markSessionOwner } from "../services/sessionChatApi";
import {
  getVibeCodeHistory,
  getUserSessions,
  historyToChatMessages,
  getJourneyIdentity,
  STREAM_API_ROOT,
  VIBE_CODE_STORAGE,
} from "../services/vibeCodeApi";
import "./OxyJourneys.css";

function createMessage(
  role: ChatMessage["role"],
  content: string
): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
  };
}

function uniqueByTitle(journeys: JourneyOption[]) {
  const seen = new Set<string>();

  return journeys.filter((journey) => {
    const key = journey.title.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const NAME_STOP_WORDS = new Set([
  "yes", "no", "ok", "okay", "hi", "hello", "hey", "i", "my", "me", "need", "want", "looking", "loan", "home",
  "car", "personal", "business", "gold", "study", "abroad", "lakhs", "lakh", "crore", "month", "months", "year",
  "years", "please", "thanks", "thank", "sure", "none", "na", "and", "for", "the", "a", "an",
]);

// Pulls a first name out of an answer to "May I know your name?", e.g.
// "Rishi and looking for cse" -> "Rishi", "my name is rishi kumar" -> "Rishi Kumar".
function extractName(text: string): string {
  let t = text.trim().replace(/^(hi|hello|hey)[,!\s]+/i, "");
  const intro = /(?:my name is|name is|i am|i'm|im|this is|it's|call me)\s+(.+)/i.exec(t);
  if (intro) t = intro[1];
  const lead = t.split(/\s+(?:and|&|looking|need|want|from|in|for)\b|[,.\-–—:;!?\n]/i)[0].trim();
  const words = lead.split(/\s+/).filter(Boolean);
  if (words.length < 1 || words.length > 3) return "";
  if (!words.every(word => /^[A-Za-z][A-Za-z.'-]{1,19}$/.test(word) && !NAME_STOP_WORDS.has(word.toLowerCase()))) return "";
  return words.map(word => word[0].toUpperCase() + word.slice(1).toLowerCase()).join(" ");
}

const PENDING_NAME_KEY = "oxyJourneyPendingName";

type SavedSession = { id: string; title: string; updatedAt: number; context?: ChatContext | null };

// Sessions live on one backend, so the list is kept per backend. It is keyed by the user's mobile
// number, which stays the same every time they log in, so logging out and back in brings the
// same chats back. (The userId is only the fallback: it can differ between logins.)
function savedSessionsKey() {
  const mobile = (localStorage.getItem("userMobile") || localStorage.getItem("whatsappNumber") || localStorage.getItem("mobileNumber") || "")
    .replace(/\D/g, "").slice(-10);
  const userId = (localStorage.getItem("userId") || "").trim();
  const id = mobile || userId;
  return id ? `oxyJourneySessions:${STREAM_API_ROOT}:${id}` : "";
}

function parseSessions(raw: string | null): SavedSession[] {
  try {
    const value = JSON.parse(raw || "[]");
    return Array.isArray(value) ? value.filter(item => item?.id && item?.title) : [];
  } catch {
    return [];
  }
}

function readSavedSessions(): SavedSession[] {
  const key = savedSessionsKey();
  if (!key) return [];
  const merged = parseSessions(localStorage.getItem(key));
  // Fold in lists saved earlier under the userId key, then drop that key.
  const userId = (localStorage.getItem("userId") || "").trim();
  const legacyKey = userId ? `oxyJourneySessions:${STREAM_API_ROOT}:${userId}` : "";
  if (legacyKey && legacyKey !== key) {
    const legacy = parseSessions(localStorage.getItem(legacyKey));
    if (legacy.length) {
      for (const item of legacy) if (!merged.some(existing => existing.id === item.id)) merged.push(item);
      merged.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      try {
        localStorage.setItem(key, JSON.stringify(merged));
        localStorage.removeItem(legacyKey);
      } catch { /* storage blocked */ }
    }
  }
  return merged;
}

export default function OxyJourneysLanding({
  onSearch,
  onLoadJourneys,
  profile,
  onProfileClick,
  initialMode = "life-cycle",
  initialPlatformId = "oxyloans",
  initialStageId = "birth-early-life",
  initialClassification,
  initialPrompt,
  initialSidebarExpanded = true,
}: LandingProps) {
  const [mode, setMode] = useState<JourneyMode>(initialMode);
  const [stageId, setStageId] = useState(() => {
    const savedStageId = initialStageId || localStorage.getItem(VIBE_CODE_STORAGE.lifeStageId) || "";
    return getLifeStageById(savedStageId) ? savedStageId : LIFE_STAGES[0].id;
  });
  const [activePlatformId, setActivePlatformId] = useState(
    initialPlatformId || "oxyloans"
  );
  const [activeJourneyId, setActiveJourneyId] = useState("");
  const [search, setSearch] = useState("");
  const [platformJourneys, setPlatformJourneys] = useState<
    Record<string, JourneyOption[]>
  >({});
  const [platformLoading, setPlatformLoading] = useState<
    Record<string, boolean>
  >({});
  const [chatContext, setChatContext] = useState<ChatContext | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>(() =>
    sessionStorage.getItem(VIBE_CODE_STORAGE.sessionId) || ""
  );
  const [desktopSidebarExpanded, setDesktopSidebarExpanded] = useState(
    initialSidebarExpanded
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  // Past chats for the logged-in user, remembered per userId in this browser.
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>(() => readSavedSessions());
  const [loggedIn, setLoggedIn] = useState(() => Boolean(getJourneyIdentity()));
  const [displayName, setDisplayName] = useState(() => (localStorage.getItem("userName") || "").trim());
  const nameCheckedFor = useRef("");
  const guestPromptCount = useRef(Math.max(0, Number(sessionStorage.getItem(VIBE_CODE_STORAGE.guestPromptCount)) || 0));
  const pendingPrompt = useRef("");
  const pendingReplace = useRef(false);
  const arrivedWithIntent = useRef(Boolean(initialClassification || initialPrompt));
  const streamController = useRef<AbortController | null>(null);
  const [resumeMessage, setResumeMessage] = useState<{ id: string; text: string; replaceLast?: boolean } | null>(null);
  useEffect(() => () => streamController.current?.abort(), []);
  const [activeConversationId, setActiveConversationId] = useState("current-journey");

  const stage = useMemo(() => getLifeStageById(stageId), [stageId]);
  const platform = useMemo(
    () => getPlatformById(activePlatformId),
    [activePlatformId]
  );

  const activeProfession =
    chatContext?.type === "classification" && chatContext.subtitle === "Profession"
      ? chatContext.classificationValue || ""
      : "";

  const activeLabel =
    chatContext?.title ||
    (mode === "life-cycle" ? stage?.shortLabel : mode === "profession" ? "Professions" : platform?.shortName) ||
    "Let’s Start A Journey";

  useEffect(() => {
    const storedSessionId = sessionStorage.getItem(VIBE_CODE_STORAGE.sessionId);
    const storedContext = sessionStorage.getItem(VIBE_CODE_STORAGE.context);

    if (!storedSessionId) return;
    const restoredSessionId = storedSessionId;

    let cancelled = false;

    async function restoreConversation() {
      try {
        let parsedContext: ChatContext | null = null;
        if (storedContext) {
          try {
            parsedContext = JSON.parse(storedContext) as ChatContext;
          } catch {
            sessionStorage.removeItem(VIBE_CODE_STORAGE.context);
          }
        }

        if (cancelled) return;

        if (parsedContext) {
          parsedContext.assistantIntro = "";
          setChatContext(parsedContext);
          if (parsedContext.type !== "classification") setMode(parsedContext.type);
          else if (parsedContext.subtitle === "Profession") setMode("profession");
          setStageId(parsedContext.stageId || "");
          setActivePlatformId(parsedContext.platformId || "askoxy-ai");
          setActiveJourneyId(parsedContext.journeyId || "");
        }

        setSessionId(restoredSessionId);
        setLoading(true);

        const history = await getVibeCodeHistory(restoredSessionId);
        if (cancelled) return;

        const restored = historyToChatMessages(history);
        if (restored.length === 0) {
          // A saved session the backend has no messages for (e.g. created on another server)
          // would make every new message fail, so forget it and start fresh.
          sessionStorage.removeItem(VIBE_CODE_STORAGE.sessionId);
          setSessionId("");
        }
        if (!getJourneyIdentity()) {
          guestPromptCount.current = Math.max(guestPromptCount.current, restored.filter(message => message.role === "user").length);
          sessionStorage.setItem(VIBE_CODE_STORAGE.guestPromptCount, String(guestPromptCount.current));
        }
        setMessages(
          restored.length > 0
            ? restored.filter(
                (message) =>
                  !message.content.startsWith("You selected ") &&
                  !message.content.includes("Tell me what you want to do next") &&
                  !message.content.includes("Tell me what you need at this stage")
              )
            : []
        );
      } catch (error) {
        console.error("Unable to restore vibe-code chat history", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void restoreConversation();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (initialMode !== "life-cycle" || !initialStageId) return;

    const selectedStage = getLifeStageById(initialStageId);
    if (selectedStage) {
      handleStageSelect(selectedStage);
      // Arriving with a message to send: keep the default-stage fallback out of the way.
      if (initialPrompt) arrivedWithIntent.current = true;
    }
    // Initial route hydration only. Subsequent stage changes are user-driven.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Arriving from the home page: open under the chosen classification and/or send the first
  // message automatically, so the user does not have to retype what they just asked for.
  useEffect(() => {
    if (!initialClassification && !initialPrompt) return;
    if (initialClassification) {
      // A known profession opens as one: the sidebar shows it selected under PROFESSIONS.
      const profession = TOP_CLASSIFICATIONS.find(item => item.name === initialClassification);
      if (profession) setMode("profession");
      const context: ChatContext = {
        type: "classification",
        title: profession ? classificationLabel(profession) : initialClassification,
        subtitle: profession ? "Profession" : "Classification",
        assistantIntro: "",
        suggestions: [],
        classificationValue: initialClassification,
      };
      setChatContext(context);
      sessionStorage.setItem(VIBE_CODE_STORAGE.context, JSON.stringify(context));
    }
    if (initialPrompt) setResumeMessage({ id: crypto.randomUUID(), text: initialPrompt });
    // Runs once on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!onLoadJourneys) return;
    const loadJourneys = onLoadJourneys;

    let cancelled = false;

    async function loadPlatform(platformId: string) {
      setPlatformLoading((current) => ({
        ...current,
        [platformId]: true,
      }));

      try {
        const result = await loadJourneys({
          mode: "platform",
          platformId,
        });

        if (!cancelled) {
          setPlatformJourneys((current) => ({
            ...current,
            [platformId]: uniqueByTitle(result || []),
          }));
        }
      } catch {
        if (!cancelled) {
          setPlatformJourneys((current) => ({
            ...current,
            [platformId]: [],
          }));
        }
      } finally {
        if (!cancelled) {
          setPlatformLoading((current) => ({
            ...current,
            [platformId]: false,
          }));
        }
      }
    }

    PLATFORMS.forEach((item) => {
      void loadPlatform(item.id);
    });

    return () => {
      cancelled = true;
    };
  }, [onLoadJourneys]);

  function resetConversation() {
    arrivedWithIntent.current = false;
    pendingPrompt.current = "";
    pendingReplace.current = false;
    setResumeMessage(null);
    setChatContext(null);
    setMessages([]);
    setActiveJourneyId("");
    setSessionId("");
    setLoginOpen(false);
    sessionStorage.removeItem(VIBE_CODE_STORAGE.sessionId);
    sessionStorage.removeItem(VIBE_CODE_STORAGE.context);
    setLoading(false);
  }

  // When the user answers the agent's "May I know your name?", remember that name for the profile.
  // Guests keep it until they log in; logged-in users save it straight away.
  useEffect(() => {
    let index = -1;
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === "user") { index = i; break; }
    if (index < 1) return;
    const answer = messages[index], question = messages[index - 1];
    if (question.role !== "assistant" || !/your name/i.test(question.content)) return;
    if (nameCheckedFor.current === answer.id) return;
    nameCheckedFor.current = answer.id;
    const name = extractName(answer.content);
    if (!name) return;
    if (loggedIn) {
      localStorage.setItem("userName", name);
      setDisplayName(name);
    } else {
      sessionStorage.setItem(PENDING_NAME_KEY, name);
    }
  }, [messages, loggedIn]);

  const sidebarProfile = { ...profile, name: loggedIn ? displayName || undefined : undefined };

  const firstUserTitle = messages.find(message => message.role === "user")?.content.trim().slice(0, 80) || "";

  useEffect(() => setSavedSessions(readSavedSessions()), [loggedIn]);

  // The user's chats with journey partners (sessions that have a matched partner), newest first.
  const [partnerChats, setPartnerChats] = useState<{ id: string; title: string; partnerName: string }[]>([]);
  useEffect(() => {
    const userId = (localStorage.getItem("userId") || "").trim();
    if (!loggedIn || !userId) { setPartnerChats([]); return; }
    let cancelled = false;
    const load = () => getUserSessions(userId)
      .then(list => {
        if (cancelled) return;
        setPartnerChats(list.filter(item => item.sessionId && item.matchedPersonName?.trim()).map(item => ({
          id: item.sessionId,
          title: item.journeyCategoryValue?.trim() || "Journey chat",
          partnerName: item.matchedPersonName!.trim(),
        })));
      })
      .catch(() => { /* keep the last list */ });
    void load();
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; window.removeEventListener("focus", onFocus); };
  }, [loggedIn, sessionId]);

  // Remember each chat of the logged-in user once it has a session and a first prompt.
  useEffect(() => {
    const key = savedSessionsKey();
    if (!loggedIn || !key || !sessionId || !firstUserTitle) return;
    const list = readSavedSessions();
    if (list.some(item => item.id === sessionId)) return;
    const next = [{ id: sessionId, title: firstUserTitle, updatedAt: Date.now(), context: chatContext }, ...list].slice(0, 50);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* storage full or blocked */ }
    setSavedSessions(next);
  }, [loggedIn, sessionId, firstUserTitle, chatContext]);

  async function selectSession(targetId: string) {
    if (!targetId || targetId === sessionId || loading) return;
    streamController.current?.abort();
    const saved = readSavedSessions().find(item => item.id === targetId);
    setLoading(true);
    try {
      const history = await getVibeCodeHistory(targetId);
      const restored = historyToChatMessages(history);
      if (restored.length === 0) {
        // The server has nothing for this chat: drop the dead entry instead of showing a blank chat.
        const key = savedSessionsKey();
        const remaining = readSavedSessions().filter(item => item.id !== targetId);
        if (key) { try { localStorage.setItem(key, JSON.stringify(remaining)); } catch { /* storage blocked */ } }
        setSavedSessions(remaining);
        return;
      }
      pendingPrompt.current = "";
      pendingReplace.current = false;
      setResumeMessage(null);
      const context = saved?.context || null;
      setChatContext(context);
      if (context) {
        if (context.type !== "classification") setMode(context.type);
        else if (context.subtitle === "Profession") setMode("profession");
        setStageId(context.stageId || "");
        setActivePlatformId(context.platformId || "askoxy-ai");
        setActiveJourneyId(context.journeyId || "");
        sessionStorage.setItem(VIBE_CODE_STORAGE.context, JSON.stringify(context));
      } else {
        setActiveJourneyId("");
        sessionStorage.removeItem(VIBE_CODE_STORAGE.context);
      }
      setSessionId(targetId);
      sessionStorage.setItem(VIBE_CODE_STORAGE.sessionId, targetId);
      markSessionOwner(targetId);
      setMessages(
        restored.filter(
          (message) =>
            !message.content.startsWith("You selected ") &&
            !message.content.includes("Tell me what you want to do next") &&
            !message.content.includes("Tell me what you need at this stage")
        )
      );
    } catch (error) {
      console.error("Unable to load chat history", error);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    streamController.current?.abort();
    for (const key of ["accessToken", "token", "refreshToken", "userId", "userMobile", "whatsappNumber", "mobileNumber", "primaryType", "userName"]) {
      localStorage.removeItem(key);
    }
    // Start a fresh anonymous journey so the next login re-links a clean session.
    guestPromptCount.current = 0;
    sessionStorage.setItem(VIBE_CODE_STORAGE.guestPromptCount, "0");
    resetConversation();
    sessionStorage.removeItem(PENDING_NAME_KEY);
    setDisplayName("");
    setLoggedIn(false);
    setLogoutConfirmOpen(false);
  }

  async function handleModeChange(nextMode: JourneyMode) {
    setMode(nextMode);
    setSearch("");

    if (nextMode === "life-cycle") {
      const savedStageId = stageId || localStorage.getItem(VIBE_CODE_STORAGE.lifeStageId) || "";
      const defaultStage = getLifeStageById(savedStageId) || LIFE_STAGES[0];
      if (defaultStage) {
        handleStageSelect(defaultStage);
      }
    }

    if (nextMode === "profession") {
      // Like picking a life stage, nothing starts until a profession is chosen.
      resetConversation();
    }

    if (nextMode === "platform") {
      const targetPlatformId = activePlatformId || "oxyloans";
      await handlePlatformOpen(targetPlatformId);
    }
  }

  // Choosing a profession opens a fresh chat under that classification, like choosing a life stage.
  function handleProfessionSelect(name: string) {
    const item = TOP_CLASSIFICATIONS.find(entry => entry.name === name);
    if (!item) return;
    arrivedWithIntent.current = false;
    streamController.current?.abort();
    pendingPrompt.current = "";
    pendingReplace.current = false;
    setResumeMessage(null);
    setSessionId("");
    sessionStorage.removeItem(VIBE_CODE_STORAGE.sessionId);
    setMode("profession");
    setSearch("");
    setActiveJourneyId("");
    const nextContext: ChatContext = {
      type: "classification",
      title: classificationLabel(item),
      subtitle: "Profession",
      assistantIntro: "",
      suggestions: [classificationOpeningMessage(item)],
      classificationValue: item.name,
    };
    setChatContext(nextContext);
    sessionStorage.setItem(VIBE_CODE_STORAGE.context, JSON.stringify(nextContext));
    setMessages([]);
    setMobileNavOpen(false);
  }

  function handleStageSelect(selectedStage: LifeStage) {
    arrivedWithIntent.current = false;
    streamController.current?.abort();
    pendingPrompt.current = "";
    pendingReplace.current = false;
    setResumeMessage(null);
    setSessionId("");
    sessionStorage.removeItem(VIBE_CODE_STORAGE.sessionId);

    // Life journeys show all 4 suggested questions in the 2x2 grid.
    const suggestions = (LIFE_STAGE_EXAMPLES[selectedStage.id] || []).slice(0, 2);
    const assistantIntro = "";

    setMode("life-cycle");
    setStageId(selectedStage.id);
    localStorage.setItem(VIBE_CODE_STORAGE.lifeStageId, selectedStage.id);
    setSearch("");
    setActiveJourneyId("");
    const nextContext: ChatContext = {
      type: "life-cycle",
      title: selectedStage.title,
      subtitle: "Life Journey",
      assistantIntro,
      suggestions,
      stageId: selectedStage.id,
    };
    setChatContext(nextContext);
    sessionStorage.setItem(
      VIBE_CODE_STORAGE.context,
      JSON.stringify(nextContext)
    );
    setMessages([]);
    setMobileNavOpen(false);
  }

  async function handlePlatformOpen(platformId: string) {
    setMode("platform");
    setStageId("");
    setSearch("");
    setActivePlatformId(platformId);
    streamController.current?.abort();

    const selectedPlatform = getPlatformById(platformId) || PLATFORMS.find(p => p.id === platformId);
    let journeys = platformJourneys[platformId] || [];

    if ((!journeys || journeys.length === 0) && onLoadJourneys) {
      try {
        const loaded = await onLoadJourneys({ mode: "platform", platformId });
        if (loaded && loaded.length > 0) {
          journeys = uniqueByTitle(loaded);
          setPlatformJourneys(prev => ({ ...prev, [platformId]: journeys }));
        }
      } catch {
        // ignore
      }
    }

    const firstJourney = journeys[0];
    if (selectedPlatform && firstJourney) {
      startPlatformJourney(selectedPlatform, firstJourney);
    } else {
      setActiveJourneyId("");
      resetConversation();
      setActivePlatformId(platformId);
    }
  }

  useEffect(() => {
    // Opened from the home page with a profession or a typed request: keep that, don't fall back
    // to the default life stage. A user action (new chat, picking a stage) turns this off.
    if (arrivedWithIntent.current) return;
    if (mode === "life-cycle" && !chatContext && !sessionId && !loading) {
      const savedStageId = stageId || localStorage.getItem(VIBE_CODE_STORAGE.lifeStageId) || "";
      const defaultStage = getLifeStageById(savedStageId) || LIFE_STAGES[0];
      if (defaultStage) {
        handleStageSelect(defaultStage);
      }
    }
  }, [mode, chatContext, sessionId, loading, stageId]);

  useEffect(() => {
    if (mode === "platform" && !activeJourneyId && !sessionId && !loading) {
      const targetPlatformId = activePlatformId || "oxyloans";
      const selectedPlatform = getPlatformById(targetPlatformId) || PLATFORMS[0];
      const journeys = platformJourneys[selectedPlatform.id];
      if (selectedPlatform && journeys && journeys.length > 0) {
        startPlatformJourney(selectedPlatform, journeys[0]);
      }
    }
  }, [mode, activePlatformId, activeJourneyId, sessionId, loading, platformJourneys]);

  function startPlatformJourney(
    selectedPlatform: Platform,
    journey: JourneyOption
  ) {
    streamController.current?.abort();
    pendingPrompt.current = "";
    pendingReplace.current = false;
    setResumeMessage(null);
    setSessionId("");
    sessionStorage.removeItem(VIBE_CODE_STORAGE.sessionId);

    const assistantIntro = "";

    setMode("platform");
    setStageId("");
    setActivePlatformId(selectedPlatform.id);
    setActiveJourneyId(journey.id);
    const nextContext: ChatContext = {
      type: "platform",
      title: journey.title,
      subtitle: selectedPlatform.name,
      assistantIntro,
      suggestions: Array.from(new Set(journey.suggestions || [])).slice(0, 2),
      platformId: selectedPlatform.id,
      journeyId: journey.id,
    };
    setChatContext(nextContext);
    sessionStorage.setItem(
      VIBE_CODE_STORAGE.context,
      JSON.stringify(nextContext)
    );
    setMessages([]);
    setMobileNavOpen(false);
  }

  function newJourney() {
    resetConversation();

    if (window.innerWidth < 1024) {
      setMobileNavOpen(true);
    } else {
      setDesktopSidebarExpanded(true);
    }
  }

  function changeJourney() {
    if (window.innerWidth < 1024) {
      setMobileNavOpen(true);
    } else {
      setDesktopSidebarExpanded(true);
    }
  }

  function beforeSend(message: string) {
    if (getJourneyIdentity() || guestPromptCount.current < 3) return true;
    pendingPrompt.current = message;
    setLoginOpen(true);
    return false;
  }

  async function sendChatMessageStreaming(value: string, onChunk: (chunk: string) => void, onReplace?: (text: string) => void) {
    const query = value.trim();
    if (!query || loading) return;
    setLoading(true);
    const guest = !getJourneyIdentity();
    const controller = new AbortController();
    streamController.current = controller;
    let streamed = false;
    const saveSession = (nextSessionId?: string | null) => {
      if (nextSessionId) {
        setSessionId(nextSessionId);
        sessionStorage.setItem(VIBE_CODE_STORAGE.sessionId, nextSessionId);
        markSessionOwner(nextSessionId); // this browser is the USER side of the shared chat
      }
    };
    try {
      if (!onSearch) throw new Error("Chat API is not configured");
      const result = await onSearch(query, chatContext || undefined, sessionId || null, {
        signal: controller.signal,
        onChunk: chunk => { streamed = true; onChunk(chunk); },
        onMetadata: metadata => saveSession(metadata.sessionId),
        onReplace,
      });
      if (!result) throw new Error("Empty response");
      saveSession(result.sessionId);
      if (chatContext) sessionStorage.setItem(VIBE_CODE_STORAGE.context, JSON.stringify(chatContext));
      else sessionStorage.removeItem(VIBE_CODE_STORAGE.context);
      // Support an existing nonstreaming adapter without replaying streamed text.
      if (!streamed && result.reply?.trim()) onChunk(result.reply);
      if (result.loginRequired) {
        onChunk(streamed || result.reply ? "" : "Please sign in to continue this conversation.");
        // Remember the unanswered prompt so it is re-sent automatically after login.
        pendingPrompt.current = query;
        pendingReplace.current = true;
        setLoginOpen(true);
        return;
      }
      if (!streamed && !result.reply?.trim()) throw new Error("Empty reply");
      if (guest) {
        guestPromptCount.current += 1;
        sessionStorage.setItem(VIBE_CODE_STORAGE.guestPromptCount, String(guestPromptCount.current));
      }
    } finally {
      if (streamController.current === controller) streamController.current = null;
      setLoading(false);
    }
  }

  const chatBoxMessages: ChatBoxMessage[] = messages
    .filter(
      (message) =>
        !message.content.startsWith("You selected ") &&
        !message.content.includes("Tell me what you want to do next") &&
        !message.content.includes("Tell me what you need at this stage")
    )
    .map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
    }));

  const conversations: ChatBoxConversation[] = [
    {
      id: "current-journey",
      title: chatContext?.title || "OXY Journeys",
      subtitle:
        chatContext?.subtitle ||
        (sessionId ? "Current AI journey" : "Start a new AI journey"),
      messages: chatBoxMessages,
    },
  ];

  const currentUser = {
    id: localStorage.getItem("userId") || "guest",
    name: profile?.name || "You",
    avatarUrl: profile?.avatarUrl,
  };

  const members = [
    currentUser,
    { id: "oxy-ai", name: "OXY AI" },
  ];

  
const sampleSuggestions =
  chatContext?.suggestions?.length
    ? chatContext.suggestions
    : mode === "life-cycle"
      ? (LIFE_STAGE_EXAMPLES[stageId] || LIFE_STAGE_EXAMPLES["birth-early-life"] || []).slice(0, 2)
      : mode === "profession"
        ? ["I'm looking for a Doctor", "I'm looking for an Advocate"]
      : [
          "I need guidance on available loan options",
          "I want to explore study abroad opportunities",
        ];

const adapter: ChatBoxAdapter = {
  sendMessage: async ({ message, onChunk, onReplace }) => {
    await sendChatMessageStreaming(message, onChunk, onReplace);
  },
};


  function syncChatBoxMessages(
    _conversationId: string,
    nextMessages: ChatBoxMessage[]
  ) {
    setMessages(
      nextMessages
        .filter(
          (message) =>
            (!message.streaming || Boolean(message.content)) &&
            !message.content.startsWith("You selected ") &&
            !message.content.includes("Tell me what you want to do next") &&
            !message.content.includes("Tell me what you need at this stage")
        )
        .map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
        }))
    );
  }


  async function handleJourneyLoginSuccess(auth: { userId: string; userMobile: string; accessToken?: string | null }) {
    if (!auth.userId || !auth.userMobile) throw new Error("Login is missing your account or mobile number.");
    localStorage.setItem("userId", auth.userId);
    localStorage.setItem("userMobile", auth.userMobile);
    if (auth.accessToken) localStorage.setItem("accessToken", auth.accessToken);
    // Keep the name the user gave the agent before logging in (e.g. "Rishi") on their account profile.
    const pendingName = sessionStorage.getItem(PENDING_NAME_KEY);
    if (pendingName) {
      localStorage.setItem("userName", pendingName);
      sessionStorage.removeItem(PENDING_NAME_KEY);
      setDisplayName(pendingName);
    } else {
      setDisplayName((localStorage.getItem("userName") || "").trim());
    }
    setLoggedIn(true);
    setLoginOpen(false);
    // The same stream endpoint now associates the account with the existing session.
    // No separate /user call or history overwrite is needed for this login step.
    if (pendingPrompt.current) {
      const text = pendingPrompt.current;
      const replaceLast = pendingReplace.current;
      pendingPrompt.current = "";
      pendingReplace.current = false;
      setResumeMessage({ id: crypto.randomUUID(), text, replaceLast });
    }
  }

  return (
    <div className="oxj-app">
      <aside
        className={`oxj-desktop-sidebar ${
          desktopSidebarExpanded ? "expanded" : "collapsed"
        }`}
      >
        <JourneySidebar
          expanded={desktopSidebarExpanded}
          mode={mode}
          stageId={stageId}
          activePlatformId={activePlatformId}
          activeJourneyId={activeJourneyId}
          search={search}
          platformJourneys={platformJourneys}
          platformLoading={platformLoading}
          historyMessages={messages}
          sessionId={sessionId}
          savedSessions={savedSessions}

          partnerChats={partnerChats}
          onSelectSession={selectSession}
          profile={sidebarProfile}
          loggedIn={loggedIn}
          onLogout={() => setLogoutConfirmOpen(true)}
          onToggleExpanded={() =>
            setDesktopSidebarExpanded((current) => !current)
          }
          onModeChange={handleModeChange}
          onStageSelect={handleStageSelect}
          activeProfession={activeProfession}
          onProfessionSelect={handleProfessionSelect}
          onPlatformOpen={handlePlatformOpen}
          onSearchChange={setSearch}
          onPlatformJourneySelect={startPlatformJourney}
          onNewJourney={newJourney}
          onProfileClick={onProfileClick || (() => setLoginOpen(true))}
        />
      </aside>

      {mobileNavOpen && (
        <div className="oxj-mobile-drawer">
          <button
            type="button"
            className="oxj-mobile-backdrop"
            aria-label="Close journey menu"
            onClick={() => setMobileNavOpen(false)}
          />

          <aside className="oxj-mobile-panel">
            <JourneySidebar
              mobile
              expanded
              mode={mode}
              stageId={stageId}
              activePlatformId={activePlatformId}
              activeJourneyId={activeJourneyId}
              search={search}
              platformJourneys={platformJourneys}
              platformLoading={platformLoading}
              historyMessages={messages}
              sessionId={sessionId}
              savedSessions={savedSessions}

              partnerChats={partnerChats}
              onSelectSession={selectSession}
              profile={sidebarProfile}
              loggedIn={loggedIn}
              onLogout={() => {
                setMobileNavOpen(false);
                setLogoutConfirmOpen(true);
              }}
              onToggleExpanded={() => setMobileNavOpen(false)}
              onCloseMobile={() => setMobileNavOpen(false)}
              onModeChange={handleModeChange}
              onStageSelect={handleStageSelect}
              activeProfession={activeProfession}
              onProfessionSelect={handleProfessionSelect}
              onPlatformOpen={handlePlatformOpen}
              onSearchChange={setSearch}
              onPlatformJourneySelect={startPlatformJourney}
              onNewJourney={newJourney}
              onProfileClick={() => {
                setMobileNavOpen(false);
                if (onProfileClick) onProfileClick();
                else setLoginOpen(true);
              }}
            />
          </aside>
        </div>
      )}

      <div
        className={`oxj-workspace ${
          desktopSidebarExpanded ? "sidebar-expanded" : "sidebar-collapsed"
        }`}
      >
        <MobileJourneyHeader
          onOpenMenu={() => setMobileNavOpen(true)}
          activeLabel={activeLabel}
          onNewChat={newJourney}
        />

        <ChatBox
          key={`${mode}-${activePlatformId}-${activeJourneyId}-${stageId}`}
          adapter={adapter}
          onBeforeSend={beforeSend}
          resumeMessage={resumeMessage}
          currentUser={currentUser}
          members={members}
          initialConversations={conversations}
          activeConversationId={activeConversationId}
          onActiveConversationChange={setActiveConversationId}
          variant="default"
          density="standard"
          layoutMode="standard"
          suggestions={sampleSuggestions}
          suggestionsAutoSubmit={false}
          features={{
            conversationList: false,
            conversationHeader: true,
            scrollToBottom: true,
            attachments: false,
            helperText: true,
            autoScroll: true,
            suggestions: true,
          }}
          sx={{ height: "100%" }}
          headerAction={<><a className="oxj-home-partner-button" href="/oxy-journey/partner/chats"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M21 11a8 8 0 0 1-8 8H7l-4 3V7a5 5 0 0 1 5-5h5a8 8 0 0 1 8 9Z" /></svg>Partner chats<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" /></svg></a><button type="button" className="oxj-home-partner-button" style={{ marginLeft: 8, cursor: "pointer" }} onClick={resetConversation} disabled={loading} aria-label="Start a new chat"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>New chat</button></>}
          headerTitle={chatContext?.title || (mode === "life-cycle" ? (stage?.title || "Birth & Early Life") : mode === "profession" ? "Professions" : "OXY Journeys AI")}
          headerSubtitle={
            chatContext?.subtitle ||
            (mode === "life-cycle" ? "Life Journey" : mode === "profession" ? "Choose a profession to meet the right people" : "Ask directly or choose a Life Journey or Platform Journey")
          }
          inputPlaceholder={
            chatContext
              ? `Ask about ${chatContext.title.toLowerCase()}...`
              : "Ask anything to start your OXY Journey..."
          }
          helperText="OXY AI can make mistakes. Verify important financial or career information."
          busy={loading}
          onMessagesChange={syncChatBoxMessages}
          emptyState={
            <div>
              <h1>
                Let’s <span>Start A Journey</span>
              </h1>
              <p>
                Ask your first question directly, or use the Journey menu to add
                Life Journey or Platform Journey context.
              </p>
            </div>
          }
        />
      </div>

      {logoutConfirmOpen && (
        <div className="oxj-login-layer" role="presentation" onKeyDown={event => { if (event.key === "Escape") setLogoutConfirmOpen(false); }}>
          <button className="oxj-login-backdrop" type="button" aria-label="Cancel logout" onClick={() => setLogoutConfirmOpen(false)} />
          <section className="oxj-login-card oxj-logout-card" role="alertdialog" aria-modal="true" aria-labelledby="oxj-logout-title" aria-describedby="oxj-logout-desc">
            <div className="oxj-logout-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9" /></svg>
            </div>
            <span className="oxj-login-kicker">OXY JOURNEYS</span>
            <h2 id="oxj-logout-title">Log out of your account?</h2>
            <p id="oxj-logout-desc">Are you sure you want to log out? You can log in again anytime to continue your journey.</p>
            <div className="oxj-logout-actions">
              <button type="button" className="oxj-logout-cancel" autoFocus onClick={() => setLogoutConfirmOpen(false)}>Stay logged in</button>
              <button type="button" className="oxj-login-primary oxj-logout-confirm" onClick={handleLogout}>Yes, log out</button>
            </div>
          </section>
        </div>
      )}

      <JourneyLoginModal
        open={loginOpen}
        sessionId={sessionId}
        onClose={() => setLoginOpen(false)}
        onSuccess={handleJourneyLoginSuccess}
      />
    </div>
  );
}
