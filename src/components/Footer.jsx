import Icon from "./Icon";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-950 text-xs font-black text-white">OJ</div>
            <div><div className="font-black tracking-tight text-slate-950">OxyJourneys</div><div className="mt-0.5 text-xs font-semibold text-slate-400">A guided experience by ASKOXY.AI</div></div>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold text-slate-500">
            <a href="#journeys" className="transition hover:text-violet-700">Journeys</a>
            <a href="#how-it-works" className="transition hover:text-violet-700">How it works</a>
            <a href="#faq" className="transition hover:text-violet-700">FAQ</a>
            <a href="https://www.askoxy.ai/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 transition hover:text-violet-700">ASKOXY.AI <Icon name="external" size={14} /></a>
          </div>
        </div>
        <div className="mt-7 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-400">OxyJourneys helps users discover the most relevant path within the Oxy ecosystem. Journey availability and eligibility may vary by service.</div>
      </div>
    </footer>
  );
}
