import { useState } from "react";
import Icon from "./Icon";
import SectionHeading from "./SectionHeading";

const faqs = [
  { question: "What is OxyJourneys?", answer: "OxyJourneys is a guided discovery experience that helps users understand the different paths available across the Oxy ecosystem and move to the right next action." },
  { question: "Which journeys are available now?", answer: "The current landing page includes Lender, Borrower, Advocate, Recovery Agent, and Partner journeys. The component structure is ready for more journeys later." },
  { question: "Is this page responsive on mobile and tablet?", answer: "Yes. The layout uses mobile-first Tailwind breakpoints, larger touch targets, responsive cards, an adaptive header, and a mobile bottom-sheet style journey modal." },
  { question: "Can I connect the cards to my existing routes or APIs?", answer: "Yes. Replace the placeholder ASKOXY.AI link in the journey modal with your React Router path, API-driven URL, or existing journey route for each card." },
  { question: "Does this version require an icon package?", answer: "No. This updated version uses a small local SVG Icon component, so you do not need lucide-react or another icon dependency." },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="bg-white py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <SectionHeading align="center" eyebrow="FAQ" title="Questions users may have before they start" description="Keep the answers easy to scan so users can resolve uncertainty without leaving the page." />

        <div className="mt-10 space-y-3">
          {faqs.map((faq, index) => {
            const open = index === openIndex;
            return (
              <div key={faq.question} className={`overflow-hidden rounded-2xl border bg-white transition ${open ? "border-violet-200 shadow-lg shadow-violet-950/5" : "border-slate-200 shadow-sm"}`}>
                <button type="button" onClick={() => setOpenIndex(open ? -1 : index)} className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left sm:px-6" aria-expanded={open}>
                  <span className="text-sm font-extrabold text-slate-900 sm:text-base">{faq.question}</span>
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition ${open ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"}`}><Icon name="chevron" size={17} className={`transition ${open ? "rotate-180" : ""}`} /></span>
                </button>
                {open && <div className="border-t border-slate-100 px-5 py-5 text-sm leading-6 text-slate-600 sm:px-6 sm:text-base sm:leading-7">{faq.answer}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
