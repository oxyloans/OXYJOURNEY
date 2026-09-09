export default function SectionHeading({ eyebrow, title, description, align = "left" }) {
  const centered = align === "center";
  return (
    <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-2xl"}>
      <div className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-violet-700">
        {eyebrow}
      </div>
      <h2 className="mt-4 text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.08]">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
          {description}
        </p>
      )}
    </div>
  );
}
