import Icon from "./Icon";

const quickJourneys = [
  ["Lender", "Grow through P2P lending", "coins"],
  ["Borrower", "Explore borrowing options", "borrower"],
  ["Advocate", "Contribute legal expertise", "scale"],
  ["Recovery Agent", "Work on field assignments", "briefcase"],
  ["Partner", "Build with the Oxy ecosystem", "handshake"],
];

export default function HeroSection() {
  return (
    <section id="top" className="relative overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-violet-100/80 blur-3xl" />
        <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-amber-100/70 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-300 to-transparent" />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:grid-cols-[1.03fr_.97fr] lg:items-center lg:gap-16 lg:px-8 lg:pb-24 lg:pt-20">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/90 px-3 py-1.5 text-xs font-bold text-violet-700 shadow-sm">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-violet-100"><Icon name="spark" size={13} /></span>
            One ecosystem. Multiple guided paths.
          </div>

          <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-[-0.045em] text-slate-950 sm:text-5xl sm:leading-[1.05] lg:text-[4rem] lg:leading-[1.02]">
            Find the right path.<br />
            <span className="bg-gradient-to-r from-violet-700 via-fuchsia-600 to-amber-500 bg-clip-text text-transparent">Move forward with clarity.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            OxyJourneys helps people quickly discover the right opportunity inside the Oxy ecosystem—whether they want to lend, borrow, work, collaborate, or contribute professional expertise.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#journeys" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-violet-700">
              Find my journey <Icon name="arrow" size={18} />
            </a>
            <a href="#how-it-works" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-extrabold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
              See how it works
            </a>
          </div>

          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-semibold text-slate-600">
            {["Simple discovery", "Clear next steps", "Responsive experience"].map((item) => (
              <span key={item} className="inline-flex items-center gap-2"><span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Icon name="check" size={13} /></span>{item}</span>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
          <div className="absolute -inset-5 -z-10 rounded-[2.5rem] bg-gradient-to-br from-violet-200/70 via-white to-amber-100/70 blur-2xl" />
          <div className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white p-4 shadow-[0_28px_80px_-30px_rgba(15,23,42,.28)] sm:p-5">
            <div className="flex items-center justify-between rounded-[1.45rem] bg-slate-950 px-5 py-5 text-white">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">Journey finder</p>
                <h2 className="mt-2 text-xl font-black tracking-tight">What would you like to do?</h2>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-amber-300"><Icon name="compass" size={22} /></div>
            </div>

            <div className="mt-4 space-y-2.5">
              {quickJourneys.map(([title, text, icon], index) => (
                <a key={title} href="#journeys" className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 transition hover:-translate-y-0.5 hover:border-violet-200 hover:bg-violet-50/40 hover:shadow-md">
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${index === 0 ? "bg-violet-100 text-violet-700" : index === 1 ? "bg-blue-100 text-blue-700" : index === 2 ? "bg-amber-100 text-amber-700" : index === 3 ? "bg-emerald-100 text-emerald-700" : "bg-fuchsia-100 text-fuchsia-700"}`}>
                    <Icon name={icon} size={19} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-extrabold text-slate-900">{title}</div>
                    <div className="mt-0.5 truncate text-xs text-slate-500 sm:text-sm">{text}</div>
                  </div>
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-50 text-slate-400 transition group-hover:bg-white group-hover:text-violet-700"><Icon name="arrow" size={15} /></div>
                </a>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">
              <span>5 guided journeys</span>
              <span className="text-violet-700">Choose one to begin →</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
