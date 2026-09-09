import Icon from "./Icon";

const benefits = [
  { icon: "user", title: "Built around user intent", text: "The page begins with what the user wants to achieve instead of exposing a complex service catalogue." },
  { icon: "route", title: "Clear information architecture", text: "Sections, cards, actions, and labels follow a predictable hierarchy that is easier to understand." },
  { icon: "phone", title: "Mobile-first responsive", text: "Touch targets, spacing, grids, modals, and navigation adapt cleanly across phones, tablets, and desktops." },
  { icon: "grid", title: "Scalable component system", text: "New journeys can be added using the same reusable card and modal structure without redesigning the page." },
];

export default function BenefitsSection() {
  return (
    <section id="benefits" className="relative overflow-hidden bg-slate-950 py-16 text-white sm:py-20 lg:py-24">
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-violet-700/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-0 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[.82fr_1.18fr] lg:items-center lg:gap-16 lg:px-8">
        <div>
          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-violet-300">Why OxyJourneys</div>
          <h2 className="mt-4 text-3xl font-black tracking-[-0.035em] sm:text-4xl lg:text-[2.75rem] lg:leading-[1.08]">A cleaner experience creates more confident users.</h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">The new landing page focuses on clarity, trust, and action. It avoids overcrowding while still giving users enough context to choose the right path.</p>

          <div className="mt-8 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-400 text-slate-950"><Icon name="spark" size={18} /></span>
            <div><div className="text-sm font-extrabold">Designed for engagement</div><div className="text-xs text-slate-400">Search · guided cards · modal details · strong CTA</div></div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {benefits.map((item) => (
            <article key={item.title} className="rounded-[1.6rem] border border-white/10 bg-white/[0.055] p-5 backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/[0.08] sm:p-6">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-amber-300"><Icon name={item.icon} size={21} /></div>
              <h3 className="mt-5 text-lg font-extrabold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
