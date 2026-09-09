import Icon from "./Icon";
import SectionHeading from "./SectionHeading";

const steps = [
  { number: "01", icon: "compass", title: "Choose your intent", text: "Start with what you want to do—not with a complicated product menu." },
  { number: "02", icon: "route", title: "Understand the journey", text: "See the role, value, expectations, and key steps in a simple guided format." },
  { number: "03", icon: "arrow", title: "Take the next action", text: "Continue to the relevant ASKOXY.AI or Oxy platform flow when you are ready." },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading align="center" eyebrow="How it works" title="Three simple steps from interest to action" description="OxyJourneys is designed to remove guesswork. Users should always know where they are and what they can do next." />

        <div className="relative mt-12 grid gap-5 lg:grid-cols-3">
          <div className="pointer-events-none absolute left-[16%] right-[16%] top-12 hidden h-px bg-gradient-to-r from-violet-200 via-amber-200 to-violet-200 lg:block" />
          {steps.map((step) => (
            <article key={step.number} className="relative rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex items-center justify-between">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 text-white"><Icon name={step.icon} size={21} /></div>
                <span className="text-sm font-black tracking-[0.16em] text-slate-300">{step.number}</span>
              </div>
              <h3 className="mt-7 text-xl font-black tracking-tight text-slate-950">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">{step.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
