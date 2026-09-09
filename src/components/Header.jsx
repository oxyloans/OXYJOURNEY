import { useEffect, useState } from "react";
import Icon from "./Icon";

const navItems = [
  { label: "Journeys", href: "#journeys" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Why OxyJourneys", href: "#benefits" },
  { label: "FAQ", href: "#faq" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-[72px] sm:px-6 lg:px-8">
        <a href="#top" className="group flex items-center gap-3" aria-label="OxyJourneys home">
          <div className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-2xl bg-slate-950 text-[13px] font-black text-white shadow-lg shadow-slate-950/15">
            <span className="relative z-10">OJ</span>
            <div className="absolute -right-3 -top-3 h-7 w-7 rounded-full bg-amber-400" />
            <div className="absolute -bottom-4 -left-3 h-8 w-8 rounded-full bg-violet-600" />
          </div>
          <div className="leading-none">
            <div className="text-[17px] font-black tracking-[-0.03em] text-slate-950">
              Oxy<span className="text-violet-700">Journeys</span>
            </div>
            <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">by ASKOXY.AI</div>
          </div>
        </a>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          {navItems.map((item) => (
            <a key={item.label} href={item.href} className="rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 sm:flex">
          <a href="https://www.askoxy.ai/" target="_blank" rel="noreferrer" className="hidden items-center gap-1.5 text-sm font-semibold text-slate-600 transition hover:text-violet-700 md:inline-flex">
            ASKOXY.AI <Icon name="external" size={15} />
          </a>
          <a href="#journeys" className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-violet-700">
            Explore journeys <Icon name="arrow" size={16} />
          </a>
        </div>

        <button type="button" onClick={() => setOpen((value) => !value)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 sm:hidden" aria-expanded={open} aria-label="Toggle menu">
          <Icon name={open ? "close" : "menu"} size={20} />
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-100 bg-white px-4 py-4 shadow-xl sm:hidden">
          <nav className="mx-auto grid max-w-7xl gap-1" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <a key={item.label} href={item.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                {item.label}
              </a>
            ))}
            <a href="#journeys" onClick={() => setOpen(false)} className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-3 text-sm font-bold text-white">
              Find my journey <Icon name="arrow" size={16} />
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
