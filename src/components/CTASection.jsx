import Icon from "./Icon";

export default function CTASection() {
  return (
    <section className="bg-white px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8 lg:pb-24">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-700 via-violet-800 to-slate-950 px-6 py-10 text-white shadow-[0_28px_80px_-30px_rgba(76,29,149,.5)] sm:px-10 sm:py-12 lg:flex lg:items-center lg:justify-between lg:px-14 lg:py-14">
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full border-[36px] border-white/5" />
        <div className="relative max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-violet-100"><Icon name="spark" size={14} /> Ready when you are</div>
          <h2 className="mt-5 text-3xl font-black tracking-[-0.035em] sm:text-4xl">Your next step can start with one clear journey.</h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-violet-100 sm:text-base sm:leading-7">Choose the path that matches your goal and continue through the ASKOXY.AI ecosystem with more confidence.</p>
        </div>

        <div className="relative mt-8 lg:mt-0 lg:pl-10">
          <a href="#journeys" className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-extrabold text-violet-800 shadow-lg transition hover:-translate-y-0.5 sm:w-auto">Explore OxyJourneys <Icon name="arrow" size={18} /></a>
        </div>
      </div>
    </section>
  );
}
