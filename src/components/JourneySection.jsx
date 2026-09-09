import { useEffect, useMemo, useState } from "react";
import Icon from "./Icon";
import JourneyCard from "./JourneyCard";
import SectionHeading from "./SectionHeading";

const journeys = [
  {
    id: "lender", title: "Lender Journey", eyebrow: "Put your capital to work", icon: "coins",
    description: "Explore the lending path with clear information, practical steps, and a simple route into the OxyLoans ecosystem.",
    accent: "from-violet-600 to-indigo-500", tint: "bg-violet-100 text-violet-700", tags: ["Lending", "P2P", "Finance"],
    keywords: ["lend", "lender", "money", "p2p", "finance"],
    steps: ["Understand the opportunity", "Review the lending flow", "Continue to the relevant platform journey"],
  },
  {
    id: "borrower", title: "Borrower Journey", eyebrow: "Access the right borrowing path", icon: "borrower",
    description: "See the borrowing journey in a simpler format with clearer expectations, requirements, and next actions.",
    accent: "from-blue-600 to-cyan-500", tint: "bg-blue-100 text-blue-700", tags: ["Loans", "Borrowing", "Eligibility"],
    keywords: ["borrow", "borrower", "loan", "salary", "finance"],
    steps: ["Explore the borrower path", "Review requirements", "Proceed to the next eligible step"],
  },
  {
    id: "advocate", title: "Advocate Journey", eyebrow: "Contribute legal expertise", icon: "scale",
    description: "Discover a structured way for advocates to understand opportunities, responsibilities, and engagement within the ecosystem.",
    accent: "from-amber-500 to-orange-500", tint: "bg-amber-100 text-amber-700", tags: ["Legal", "Professional", "Freelance"],
    keywords: ["advocate", "legal", "law", "professional"],
    steps: ["Understand the advocate role", "Review the engagement process", "Connect through ASKOXY.AI"],
  },
  {
    id: "recovery", title: "Recovery Agent Journey", eyebrow: "Work locally. Create impact.", icon: "briefcase",
    description: "Understand field assignments, role expectations, and the onboarding path for recovery professionals and freelancers.",
    accent: "from-emerald-600 to-teal-500", tint: "bg-emerald-100 text-emerald-700", tags: ["Field work", "Recovery", "Freelance"],
    keywords: ["recovery", "agent", "field", "freelance"],
    steps: ["Explore the role", "Understand assignment flow", "Start your onboarding path"],
  },
  {
    id: "partner", title: "Partner Journey", eyebrow: "Build together", icon: "handshake",
    description: "Explore collaboration opportunities for businesses and professionals who want to connect with the Oxy ecosystem.",
    accent: "from-fuchsia-600 to-violet-600", tint: "bg-fuchsia-100 text-fuchsia-700", tags: ["Partnership", "Business", "Network"],
    keywords: ["partner", "business", "collaboration", "network"],
    steps: ["Choose your partnership path", "Review collaboration opportunities", "Start a conversation"],
  },
];

function JourneyModal({ journey, onClose }) {
  useEffect(() => {
    if (!journey) return;
    const handleKey = (event) => event.key === "Escape" && onClose();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [journey, onClose]);

  if (!journey) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="journey-title" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] bg-white p-6 shadow-2xl sm:rounded-[2rem] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className={`grid h-12 w-12 place-items-center rounded-2xl ${journey.tint}`}><Icon name={journey.icon} size={23} /></div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200" aria-label="Close journey details"><Icon name="close" size={18} /></button>
        </div>

        <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.14em] text-violet-700">{journey.eyebrow}</p>
        <h3 id="journey-title" className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{journey.title}</h3>
        <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">{journey.description}</p>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 sm:p-5">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Your next steps</p>
          <div className="mt-4 space-y-3">
            {journey.steps.map((step, index) => (
              <div key={step} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-100 text-xs font-black text-violet-700">{index + 1}</span>
                <span className="text-sm font-semibold text-slate-700">{step}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a href="https://www.askoxy.ai/" target="_blank" rel="noreferrer" className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-violet-700 px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-violet-800">
            Start this journey <Icon name="arrow" size={17} />
          </a>
          <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 px-5 py-3.5 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50">Maybe later</button>
        </div>
      </div>
    </div>
  );
}

export default function JourneySection() {
  const [query, setQuery] = useState("");
  const [selectedJourney, setSelectedJourney] = useState(null);

  const filteredJourneys = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return journeys;
    return journeys.filter((journey) => [journey.title, journey.eyebrow, journey.description, ...journey.tags, ...journey.keywords].join(" ").toLowerCase().includes(value));
  }, [query]);

  return (
    <section id="journeys" className="border-y border-slate-100 bg-slate-50/70 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading eyebrow="Explore OxyJourneys" title="Choose the path that matches your goal" description="Start with what you want to achieve. Each journey gives you a clearer explanation and an obvious next step." />

          <label className="relative block w-full lg:max-w-sm">
            <span className="sr-only">Search journeys</span>
            <Icon name="search" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Search lender, partner, advocate..." className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold text-slate-800 shadow-sm outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100" />
          </label>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredJourneys.map((journey) => <JourneyCard key={journey.id} journey={journey} onOpen={setSelectedJourney} />)}
        </div>

        {filteredJourneys.length === 0 && (
          <div className="mt-10 rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-10 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500"><Icon name="search" size={21} /></div>
            <p className="mt-4 font-extrabold text-slate-900">No journey found</p>
            <p className="mt-2 text-sm text-slate-500">Try lender, borrower, advocate, recovery, or partner.</p>
            <button onClick={() => setQuery("")} className="mt-4 text-sm font-bold text-violet-700">Clear search</button>
          </div>
        )}
      </div>

      <JourneyModal journey={selectedJourney} onClose={() => setSelectedJourney(null)} />
    </section>
  );
}
