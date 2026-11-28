import { lazy, Suspense, useState, useEffect } from "react";
import { VIBE_CODE_STORAGE } from "./services/vibeCodeApi";
import HomeLanding from "./components/HomeLanding";
const BusinessCardPage = lazy(() => import("./components/BusinessCardPage"));
const SessionChatPage = lazy(() => import("./components/SessionChatPage"));

const PartnerChatsDashboard = lazy(() => import("./components/PartnerChatsDashboard"));
const AdminDashboard = lazy(() => import("./components/admin/AdminDashboard"));
const PartnerUsersDashboard = lazy(() => import("./components/PartnerUsersDashboard"));
const PartnerLeadPage = lazy(() => import("./components/PartnerLeadPage"));
const SalariedBorrowerChatPage = lazy(() => import("./components/SalariedBorrowerChatPage"));
const AdminDashboardPage = lazy(() => import("./components/Admindashboardpage"));


// Direct WhatsApp links must open this page without first visiting the home page.
// No new router dependency is needed in this existing application.
const JourneyHome = lazy(() => import("./components/JourneyHome"));

function AppRoutes() {
  const [path, setPath] = useState(window.location.pathname);
  const [chatStart, setChatStart] = useState(null);
  usePathListener(setPath);

  // Home page -> chat. A new intent (profession, typed request or life stage) begins a fresh
  // conversation; the plain "AI Assistant" button resumes the current one.
  function openChat(start) {
    if (start && (start.prompt || start.classification || start.stageId || start.view)) {
      try {
        sessionStorage.removeItem(VIBE_CODE_STORAGE.sessionId);
        sessionStorage.removeItem(VIBE_CODE_STORAGE.context);
      } catch { /* storage unavailable */ }
    }
    setChatStart(start || null);
    window.history.pushState({}, "", "/oxy-journey");
    setPath("/oxy-journey");
    window.scrollTo({ top: 0 });
  }
  if (/^\/(?:oxy-journey\/)?admin(?:\/.*)?$/.test(path)) return <AdminDashboard />;
  if (/^\/oxy-journey\/partner\/chats\/?$/.test(path)) return <PartnerChatsDashboard />;
  if (/^\/oxy-journey\/partner\/lead\/?$/.test(path)) return <PartnerLeadPage />;
  if (/^\/oxy-journey\/partner\/users\/?$/.test(path)) return <PartnerUsersDashboard />;
  if (/^\/br-loan-application(?:\/.*)?$/.test(path)) return <SalariedBorrowerChatPage />;
  if (/^\/br-application-status(?:\/.*)?$/.test(path)) return <AdminDashboardPage />;
  const match = /^\/oxy-journey\/chat\/([^/]+?)(?:\/(?:user|partner))?\/?$/.exec(path);
  if (match) {
    let sessionId = "";
    try { sessionId = decodeURIComponent(match[1]); } catch { /* invalid URL */ }
    return <SessionChatPage key={sessionId} sessionId={sessionId} />;
  }
  if (path.startsWith("/oxy-journey/chat")) return <SessionChatPage sessionId="" />;
  function goTo(to) {
    window.history.pushState({}, "", to);
    setPath(to);
    window.scrollTo({ top: 0 });
  }
  if (/^\/business-card\/?$/.test(path)) return <BusinessCardPage onBack={() => goTo("/")} onAssistant={() => openChat()} />;
  if (path === "/" || path === "") return <HomeLanding onStart={openChat} onBusinessCard={() => goTo("/business-card")} />;
  return <JourneyHome start={chatStart} />;
}

function usePathListener(setPath) {
  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [setPath]);
}

export default function App() {
  return (
    <Suspense fallback={<main className="route-loading" role="status" aria-live="polite">Loading OXY Journeys…</main>}>
      <AppRoutes />
    </Suspense>
  );
}
