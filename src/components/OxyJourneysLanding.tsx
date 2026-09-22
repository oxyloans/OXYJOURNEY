import { useRef, useState } from "react";
import type { FormEvent, SVGProps } from "react";

type LandingProps = {
  // Connect your search API through this prop later.
  onSearch?: (query: string) => Promise<string>;
};

const LOGO = "https://i.ibb.co/gbh10qKV/journeys-logo.png";

const EXAMPLE =
  "I am a salaried person looking for a home loan.";

const JOURNEYS = [
  "Education Loan",
  "Study Abroad Loan",
  "AI Skills Loan",
  "Marriage Loan",
  "School Fee Loan",
  "Home Renovation Loan",
  "Car Loan",
  "Medical Loan",
  "Business Loan",
  "Personal Loan",
  "Loan Against Gold",
  "Salary Advance Loan",
];

const COLORS = [
  "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100",
  "bg-sky-50 text-sky-600 group-hover:bg-sky-100",
  "bg-violet-50 text-violet-600 group-hover:bg-violet-100",
  "bg-rose-50 text-rose-600 group-hover:bg-rose-100",
  "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100",
  "bg-amber-50 text-amber-600 group-hover:bg-amber-100",
];

function ArrowIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M7 17 17 7M7 7h10v10" />
    </svg>
  );
}

function SparkleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M5.6 18.4 18.4 5.6" />
    </svg>
  );
}

export default function OxyJourneysLanding({
  onSearch,
}: LandingProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);

  function focusSearch() {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    searchRef.current?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "center",
    });

    textareaRef.current?.focus({ preventScroll: true });
  }

  function usePrompt(value: string) {
    if (busyRef.current) return;

    setQuery(value);
    setResponse("");
    setError("");
    setNotice("");
    focusSearch();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = query.trim();
    if (!value || busyRef.current) return;

    setError("");
    setNotice("");
    setResponse("");

    if (!onSearch) {
      setNotice("Journey search is coming soon.");
      return;
    }

    busyRef.current = true;
    setLoading(true);

    try {
      const result = await onSearch(value);

      if (typeof result !== "string" || !result.trim()) {
        throw new Error("Empty response");
      }

      setResponse(result);
    } catch {
      setError("We couldn’t complete your search. Please try again.");
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  }

  return (
    <div
      className="flex min-h-screen flex-col bg-white text-slate-900 antialiased selection:bg-indigo-100"
      style={{ fontFamily: '"DM Sans", Arial, sans-serif' }}
    >
      <a
        href="#main"
        className="sr-only fixed left-4 top-4 z-50 rounded-lg bg-indigo-600 px-4 py-3 text-white focus:not-sr-only"
      >
        Skip to content
      </a>

      {/* Header */}
      <header className="border-b border-slate-100">
        <div className="mx-auto flex min-h-[76px] max-w-6xl items-center justify-between gap-4 px-4 sm:min-h-[88px] sm:px-8">
          <a
            href="#"
            aria-label="OXY Journeys home"
            className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-4"
          >
            <img
              src={LOGO}
              alt="OXY Journeys"
              decoding="async"
              className="block h-10 w-[150px] object-contain object-left sm:h-12 sm:w-[200px]"
            />
          </a>

          <nav aria-label="Main navigation" className="flex items-center gap-7">
            <a
              href="#journeys"
              className="hidden text-sm font-medium text-slate-600 transition hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:inline-flex"
            >
              Explore journeys
            </a>

            <button
              type="button"
              onClick={focusSearch}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold transition hover:border-indigo-200 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:px-5"
            >
              Let’s start
              <ArrowIcon className="h-4 w-4" />
            </button>
          </nav>
        </div>
      </header>

      <main id="main" className="flex-1">
        {/* Section 1: Hero and compact search */}
        <section
          aria-labelledby="hero-title"
          className="relative isolate px-4 pb-12 pt-12 sm:px-8 sm:pb-16 sm:pt-16 lg:pt-20"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[360px] bg-gradient-to-b from-indigo-50/60 via-white to-white"
          />

          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-xs font-medium text-indigo-600">
              <SparkleIcon className="h-4 w-4" />
              One conversation. A new beginning.
            </span>

            <h1
              id="hero-title"
              className="mt-6 text-[2.25rem] font-medium leading-[1.12] tracking-[-0.045em] sm:text-5xl lg:text-[64px]"
            >
              Let’s Start{" "}
              <span className="text-indigo-600">A Journey</span>
            </h1>

            <p className="mt-4 text-base leading-7 text-slate-500 sm:text-lg">
              What would you like to explore?
            </p>
          </div>

          <div
            ref={searchRef}
            className="mx-auto mt-7 w-full max-w-2xl scroll-mt-8 sm:mt-8"
          >
            <div className="rounded-[24px] bg-indigo-50/80 p-1.5">
              <form
                onSubmit={handleSubmit}
                aria-label="Find your journey"
                aria-busy={loading}
                className="rounded-[19px] border border-indigo-100 bg-white p-3 shadow-sm transition focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 sm:p-4"
              >
                <label htmlFor="journey-query" className="sr-only">
                  What journey are you looking for?
                </label>

                <textarea
                  ref={textareaRef}
                  id="journey-query"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setError("");
                    setNotice("");
                    setResponse("");
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder={EXAMPLE}
                  rows={2}
                  maxLength={2000}
                  required
                  readOnly={loading}
                  aria-describedby={
                    error
                      ? "search-error"
                      : notice
                        ? "search-notice"
                        : undefined
                  }
                  className="block h-16 min-h-[64px] w-full resize-none border-0 bg-transparent px-1 py-1 text-base leading-6 text-slate-800 outline-none placeholder:text-slate-400"
                />

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
                  <button
                    type="button"
                    onClick={() => usePrompt(EXAMPLE)}
                    disabled={loading}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50 focus-visible-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 sm:text-sm"
                  >
                    <SparkleIcon className="h-4 w-4" />
                    Try an example
                  </button>

                  <button
                    type="submit"
                    disabled={!query.trim() || loading}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 text-xs font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-indigo-100 disabled:text-indigo-400 sm:px-4 sm:text-sm"
                  >
                    {loading ? (
                      <>
                        <span
                          aria-hidden="true"
                          className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none"
                        />
                        Searching…
                      </>
                    ) : (
                      <>
                        Find my journey
                        <ArrowIcon className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {notice && (
              <p
                id="search-notice"
                role="status"
                className="mt-3 text-center text-sm text-slate-500"
              >
                {notice}
              </p>
            )}

            {error && (
              <p
                id="search-error"
                role="alert"
                className="mt-3 text-center text-sm text-rose-600"
              >
                {error}
              </p>
            )}

            {response && (
              <div
                role="status"
                className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 sm:p-5"
              >
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-indigo-700">
                  <SparkleIcon className="h-4 w-4" />
                  Your journey guide
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                  {response}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Section 2: Journey names */}
        <section
          id="journeys"
          aria-labelledby="journeys-title"
          className="mx-auto w-full max-w-6xl scroll-mt-8 px-4 pb-12 sm:px-8 sm:pb-16"
        >
          <div className="border-t border-slate-100 pt-8 sm:pt-10">
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2
                id="journeys-title"
                className="text-2xl font-medium tracking-tight sm:text-3xl"
              >
                Explore journeys
              </h2>

              <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                12 journeys
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {JOURNEYS.map((name, index) => (
                <button
                  key={name}
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    usePrompt(`I am looking for ${name.toLowerCase()}.`)
                  }
                  className="group flex min-h-[76px] items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 text-left transition duration-200 hover:border-indigo-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50 sm:min-h-[84px]"
                >
                  <span className="text-[15px] font-medium leading-6 text-slate-700 transition group-hover:text-slate-950 sm:text-base">
                    {name}
                  </span>

                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${COLORS[index % COLORS.length]}`}
                  >
                    <ArrowIcon className="h-[18px] w-[18px]" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100 bg-slate-50/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-center text-xs text-slate-500 sm:flex-row sm:px-8 sm:text-left">
          <p>© {new Date().getFullYear()} OXY JOURNEYS.</p>
          <p>Your next step starts here.</p>
        </div>
      </footer>
    </div>
  );
}