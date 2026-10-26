import { useState, useEffect } from "react";
import OxyJourneysLanding from "./components/OxyJourneysLanding";
import { sendVibeCodeMessage, VIBE_CODE_STORAGE } from "./services/vibeCodeApi";
import HomeLanding from "./components/HomeLanding";
import SessionChatPage from "./components/SessionChatPage";

import PartnerChatsDashboard from "./components/PartnerChatsDashboard";
import AdminDashboard from "./components/admin/AdminDashboard";
import PartnerUsersDashboard from "./components/PartnerUsersDashboard";


const PLATFORM_JOURNEYS = {
  oxyloans: [
     {
      id: "lender",
      title: "Lender",
      summary: "Explore the OXY lender journey.",
      suggestions: [
        "I'm interested in lending money through OXYLOANS to earn potential returns",
        "I'm looking for suitable borrowers to lend money to",
      ],
    },
    {
      id: "borrower",
      title: "Borrower",
      summary: "Start an OXY borrower journey.",
      suggestions: [
        "I would like to apply for a loan through OXYLOANS",
        "I'm looking for financial assistance to support my business",
      ],
    },
   
    {
      id: "recovery-agent",
      title: "Recovery Agent / Partner",
      summary: "Start a recovery-agent partner journey.",
      suggestions: [
        "I'm interested in becoming a loan recovery partner",
        "I'm looking for loan recovery assignments and partnership opportunities",
      ],
    },
    {
      id: "legal-partner",
      title: "Legal Partner / Advocate",
      summary: "Start an advocate or legal partner journey.",
      suggestions: [
        "I'm an advocate looking for legal assignments related to lending",
        "I would like to register as a legal partner with OXYLOANS",
      ],
    },
    {
      id: "financial-partner",
      title: "Financial Partner / NBFC / Bank",
      summary: "Explore a financial institution partnership journey.",
      suggestions: [
        "Our NBFC is interested in exploring lending partnership opportunities",
        "Our bank is looking to connect with eligible borrowers",
      ],
    },
    {
      id: "oxy-partner",
      title: "OXY Partner",
      summary: "Join the OXY partner network.",
      suggestions: [
        "I'm interested in joining the OXY partner network",
        "I would like to refer customers and explore commission opportunities",
      ],
    },
    {
      id: "gold-loan",
      title: "Gold Loan",
      summary: "Explore an OXY gold-loan journey.",
      suggestions: [
        "I would like to apply for a loan against my gold",
        "I need immediate financial assistance using my gold as collateral",
      ],
    },
  ],

  oxybricks: [
    {
      id: "property-owner",
      title: "Property Owner / Seller",
      summary: "Start a property owner or seller journey.",
      suggestions: [
        "I'm interested in listing my property for sale",
        "I'm looking to connect with verified buyers for my land",
      ],
    },
    {
      id: "investor-buyer",
      title: "Investor / Buyer",
      summary: "Explore a real-estate investor or buyer journey.",
      suggestions: [
        "I'm interested in exploring real estate investment opportunities",
        "I'm looking for a flat or plot that fits my budget",
      ],
    },
    {
      id: "builder-developer",
      title: "Builder / Developer",
      summary: "Start a builder or developer partnership journey.",
      suggestions: [
        "I'm a builder interested in listing my real estate projects",
        "I'm looking to connect with potential buyers for my projects",
      ],
    },
    {
      id: "asset-lender",
      title: "Asset-Based Lender",
      summary: "Explore an asset-backed finance journey.",
      suggestions: [
        "I'm interested in lending money against property as collateral",
        "I'm looking to explore secured lending opportunities backed by assets",
      ],
    },
    {
      id: "real-estate-agent",
      title: "Real Estate Agent / Broker",
      summary: "Start a real-estate agent partner journey.",
      suggestions: [
        "I'm a real estate agent looking for property listings",
        "I would like to register as a real estate broker",
      ],
    },
    {
      id: "financial-partner",
      title: "Financial Partner",
      summary: "Explore a property-finance partnership journey.",
      suggestions: [
        "Our NBFC is interested in providing financing for property buyers",
        "Our bank is looking for customers who need property loans",
      ],
    },
    {
      id: "legal-partner",
      title: "Legal Partner / Advocate",
      summary: "Explore legal support for property journeys.",
      suggestions: [
        "I'm an advocate looking for real estate legal assignments",
        "I'm interested in offering property verification and legal services",
      ],
    },
    {
      id: "recovery-partner",
      title: "Recovery Agent / Partner",
      summary: "Explore a recovery-support partnership journey.",
      suggestions: [
        "I'm interested in becoming a property recovery partner",
        "I'm looking for recovery assignments related to real estate assets",
      ],
    },
  ],
    oxygold: [
    {
      id: "gold-loan-value",
      title: "Gold Loan Value",
      summary: "Explore loan options against gold value.",
      suggestions: [
        "I would like to apply for a loan against my gold",
        "I need urgent financial assistance using my gold as collateral",
      ],
    },
    {
      id: "retailer",
      title: "Retailer Shop",
      summary: "Start a gold retailer or jewellery shop journey.",
      suggestions: [
        "I'm planning to start a gold and silver retail business",
        "I'm a jeweller looking for reliable gold suppliers",
      ],
    },
    {
      id: "buyer-investor",
      title: "Buyer / Investor",
      summary: "Explore gold buying and investment journeys.",
      suggestions: [
        "I'm interested in purchasing gold for investment purposes",
        "I would like to explore investment opportunities in silver",
      ],
    },
    {
      id: "end-customer",
      title: "End Customer",
      summary: "Explore gold products for personal purchase and gifting.",
      suggestions: [
        "I'm looking to purchase gold jewellery for a wedding",
        "I would like to explore gold and silver gifting options",
      ],
    },
    {
      id: "wholesaler",
      title: "Wholesaler",
      summary: "Start a gold wholesaler partnership journey.",
      suggestions: [
        "I'm interested in becoming a gold wholesale partner",
        "I'm looking to connect with retailers interested in purchasing gold",
      ],
    },
    {
      id: "mining-company",
      title: "Mining Company",
      summary: "Explore a mining-company partnership journey.",
      suggestions: [
        "Our mining company is looking for potential gold buyers",
        "We would like to establish partnerships for supplying precious metals",
      ],
    },
    {
      id: "refinery",
      title: "Refinery",
      summary: "Explore a refinery partnership journey.",
      suggestions: [
        "I operate a gold refinery and am exploring partnership opportunities",
        "I'm looking for reliable gold suppliers for my refinery",
      ],
    },
  ],

  "study-abroad": [
    {
      id: "student",
      title: "Student",
      summary: "Plan country, university, course, intake, visa and funding.",
      suggestions: [
        "I'm planning to pursue my higher education abroad",
        "I need guidance in selecting the right course and university abroad",
      ],
    },
    {
      id: "visa-partner",
      title: "Visa Partner",
      summary: "Start a visa-service partnership journey.",
      suggestions: [
        "I'm interested in starting visa consultancy services for students",
        "I'm looking to connect with students who need visa assistance",
      ],
    },
    {
      id: "university-college",
      title: "University / College Partnership",
      summary: "Explore an institution partnership journey.",
      suggestions: [
        "Our university is looking to attract more international students",
        "We're interested in partnering with study abroad consultants for student admissions",
      ],
    },
    {
      id: "scholarship-partner",
      title: "Scholarship Partner",
      summary: "Explore scholarship partnership opportunities.",
      suggestions: [
        "I'm interested in providing scholarships to eligible students",
        "I'm looking to support deserving students with financial assistance",
      ],
    },
    {
      id: "education-loan-partner",
      title: "Education Loan Partner",
      summary: "Partner as a bank, NBFC or education finance provider.",
      suggestions: [
        "Our bank is interested in providing education loans to students",
        "We're looking to connect with students who need education financing",
      ],
    },
    {
      id: "consultant",
      title: "Study Abroad Consultant",
      summary: "Start a consultant and student-counselling partnership journey.",
      suggestions: [
        "I'm a study abroad consultant looking for students who need guidance",
        "I'm interested in establishing partnerships with international universities",
      ],
    },
  ],


  "askoxy-ai": [
    {
      id: "sovereign-ai",
      title: "Sovereign AI",
      summary: "Explore the Sovereign AI journey and participation model.",
      suggestions: [
        "I would like to be part of the Sovereign AI journey",
        "I'm looking for an AI expert to support my Sovereign AI initiative",
      ],
    },
    {
      id: "bfsai-use-cases",
      title: "OXY BFSAI Use Cases Engine",
      summary: "AI use cases for banks, NBFCs, fintechs and BFSI teams.",
      suggestions: [
        "I run an NBFC and want to explore AI solutions for lending",
        "I'm looking for an AI solution to improve our loan collections",
      ],
    },
    {
      id: "ai-mentor",
      title: "AI Mentor",
      summary: "Start an AI mentoring journey for professionals and experts.",
      suggestions: [
        "I'm looking for an experienced AI mentor to guide me",
        "I would like to become an AI mentor and guide others",
      ],
    },
    {
      id: "ai-store",
      title: "AI Store",
      summary: "Discover AI services and solutions for companies and teams.",
      suggestions: [
        "I'm looking for suitable AI tools and solutions for my company",
        "I would like to list my AI product for business customers",
      ],
    },
    {
      id: "ai-researcher",
      title: "AI Researcher",
      summary: "Explore a structured AI research journey.",
      suggestions: [
        "I'm interested in participating in AI research projects",
        "I have an AI research idea and am looking for collaborators",
      ],
    },
    {
      id: "ai-learner",
      title: "AI Learner",
      summary: "Build a practical AI learning journey.",
      suggestions: [
        "I would like to start learning AI from the basics",
        "I'm looking for an AI trainer or a suitable training course",
      ],
    },
    {
      id: "ai-cofounder",
      title: "AI Co-Founder",
      summary: "Turn an idea into an AI-powered product or business journey.",
      suggestions: [
        "I have a startup idea and am looking for an AI co-founder",
        "I'm interested in joining an AI startup as a co-founder",
      ],
    },
    {
      id: "ai-agent",
      title: "AI Agent",
      summary: "Plan an AI agent workflow for a business process.",
      suggestions: [
        "I'm looking for an AI agent to automate my business tasks",
        "I need an experienced developer to build a custom AI agent",
      ],
    },
  ],



  "jobs-careers": [
    {
      id: "mentor",
      title: "Career Mentor",
      summary: "Start a career mentoring journey.",
      suggestions: [
        "I'm interested in becoming a career mentor",
        "I'm looking to connect with job seekers who need career guidance",
      ],
    },
    {
      id: "jobseeker",
      title: "Job Seeker",
      summary: "Explore jobs, resume guidance and interview preparation.",
      suggestions: [
        "I'm looking for job opportunities that match my skills and experience",
        "I need professional guidance to improve my resume",
      ],
    },
    {
      id: "freelancer",
      title: "Freelancer",
      summary: "Find freelance projects and client opportunities.",
      suggestions: [
        "I'm a freelancer looking for suitable project opportunities",
        "I'm looking to connect with clients who need my services",
      ],
    },
    {
      id: "employer",
      title: "Employer",
      summary: "Post job openings and hire qualified candidates.",
      suggestions: [
        "I'm looking to hire qualified professionals for my company",
        "I need suitable candidates to fill an open position",
      ],
    },
    {
      id: "recruiter",
      title: "Consulting Company / Recruiter",
      summary: "Partner as a recruitment consultancy or agency.",
      suggestions: [
        "I'm a recruiter looking for hiring requirements from companies",
        "I'm interested in partnering with companies as a recruitment agency",
      ],
    },
    {
      id: "training-institute",
      title: "Training Institute",
      summary: "Promote training courses and collaborate on placements.",
      suggestions: [
        "I run a training institute and am looking to attract more students",
        "I'm interested in promoting my training courses to potential learners",
      ],
    },
  ],
};


function JourneyHome({ start }) {
  const assistantMode = start?.view === "profession" ? "profession" : "life-cycle";
  const assistantPlatformId = "oxyloans";
  // Coming from the home page with a profession or a typed request, the chat starts from that
  // instead of the default life stage.
  const hasIntent = Boolean(start?.prompt || start?.classification);
  const assistantStageId = start?.stageId ?? (hasIntent || assistantMode === "profession" ? "" : "birth-early-life");

  async function handleJourneySearch(query, context, sessionId, streamOptions) {
    return sendVibeCodeMessage(query, context, sessionId, streamOptions);
  }

  async function loadJourneys({ mode, platformId }) {
    if (mode !== "platform" || !platformId) return [];
    return PLATFORM_JOURNEYS[platformId] || [];
  }

  return (
    <OxyJourneysLanding
      key={`${assistantMode}-${assistantPlatformId}-${assistantStageId}-${start?.view || ""}-${start?.classification || ""}-${start?.prompt || ""}`}
      initialMode={assistantMode}
      initialPlatformId={assistantPlatformId}
      initialStageId={assistantStageId}
      initialClassification={start?.classification}
      initialPrompt={start?.prompt}
      initialSidebarExpanded
      onSearch={handleJourneySearch}
      onLoadJourneys={loadJourneys}
      profile={{
        name: "My Profile",
        subtitle: "OXY Journeys",
      }}
      onProfileClick={() => console.log("Open profile")}
    />
  );
}

// Direct WhatsApp links must open this page without first visiting the home page.
// No new router dependency is needed in this existing application.
function App() {
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
  if (/^\/oxy-journey\/partner\/users\/?$/.test(path)) return <PartnerUsersDashboard />;
  const match = /^\/oxy-journey\/chat\/([^/]+)\/?$/.exec(path);
  if (match) {
    let sessionId = "";
    try { sessionId = decodeURIComponent(match[1]); } catch { /* invalid URL */ }
    return <SessionChatPage key={sessionId} sessionId={sessionId} />;
  }
  if (path.startsWith("/oxy-journey/chat")) return <SessionChatPage sessionId="" />;
  if (path === "/" || path === "") return <HomeLanding onStart={openChat} />;
  return <JourneyHome start={chatStart} />;
}

function usePathListener(setPath) {
  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [setPath]);
}

export default App;