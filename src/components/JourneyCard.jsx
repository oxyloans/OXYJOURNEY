import Icon from "./Icon";

export default function JourneyCard({ journey, onOpen }) {
  return (
    <article className="group relative flex min-h-[360px] flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_-30px_rgba(15,23,42,.28)] transition duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_24px_60px_-30px_rgba(91,33,182,.24)] sm:p-6">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${journey.accent}`} />
      <div className="flex items-start justify-between gap-4">
        <div className={`grid h-12 w-12 place-items-center rounded-2xl ${journey.tint}`}><Icon name={journey.icon} size={23} /></div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">Guided path</span>
      </div>

      <div className="mt-7">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">{journey.eyebrow}</p>
        <h3 className="mt-2 text-2xl font-black tracking-[-0.025em] text-slate-950">{journey.title}</h3>
        <p className="mt-3 text-sm leading-6 text-slate-600">{journey.description}</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {journey.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">{tag}</span>
        ))}
      </div>

      <div className="mt-auto pt-7">
        <button type="button" onClick={() => onOpen(journey)} className="inline-flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-extrabold text-slate-800 transition group-hover:border-slate-950 group-hover:bg-slate-950 group-hover:text-white">
          Explore this journey <Icon name="arrow" size={17} className="transition group-hover:translate-x-1" />
        </button>
      </div>
    </article>
  );
}
