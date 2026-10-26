import {
  LIFE_STAGES,
  LOGO,
  PLATFORMS,
} from "../data/journeyData";
import type { JourneyMode } from "../types/journey";
import {
  ArrowIcon,
  PlatformIcon,
  SparkleIcon,
} from "./JourneyIcons";
import "./JourneyGuideLanding.css";

type JourneyGuideLandingProps = {
  onOpenAssistant: (
    mode: JourneyMode,
    platformId?: string,
    stageId?: string
  ) => void;
};

const STAGE_ICONS: Record<string, string> = {
  "birth-early-life": "👶",
  "childhood-education": "🎓",
  "youth-career": "🚀",
  "work-family": "💼",
  "health-wellness": "🏥",
  "wealth-security": "💰",
  "ageing-retirement": "👴",
  "legacy-continuity": "🕊️",
};

export default function JourneyGuideLanding({
  onOpenAssistant,
}: JourneyGuideLandingProps) {
  return (
    <div className="jg-page">
      <header className="jg-header">
        <div className="jg-shell jg-header-inner">
          <img className="jg-logo" src={LOGO} alt="OXY Journeys" />

          <button
            className="jg-header-cta jg-shimmer"
            type="button"
            onClick={() => onOpenAssistant("life-cycle")}
          >
            <span>Start Journey</span>
            <ArrowIcon className="jg-icon" />
          </button>
        </div>
      </header>

      <main>
        <section className="jg-hero">
          <div className="jg-shell jg-hero-inner">
            <div className="jg-hero-copy">
              <div className="jg-hero-badge">
                <SparkleIcon className="jg-icon" />
                <span>AI-Guided Journeys</span>
              </div>

              <h1 className="jg-hero-title">
                <span className="jg-hero-title-line">One journey for</span>
                <span className="jg-hero-title-line jg-hero-title-gradient">
                  every stage of life.
                </span>
              </h1>

              <p className="jg-hero-text">
                Choose your current life stage or open a platform journey and
                continue with focused AI guidance.
              </p>

              <div className="jg-actions">
                <button
                  type="button"
                  className="jg-primary jg-shimmer"
                  onClick={() => onOpenAssistant("life-cycle")}
                >
                  <span>Start Life Journey</span>
                  <ArrowIcon className="jg-icon" />
                </button>

                <button
                  type="button"
                  className="jg-secondary jg-shimmer"
                  onClick={() =>
                    onOpenAssistant("platform", PLATFORMS[0]?.id)
                  }
                >
                  <span>Explore Platforms</span>
                  <PlatformIcon className="jg-icon" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="jg-section" id="life-cycle">
          <div className="jg-shell">
            <header className="jg-section-head">
              <p className="jg-eyebrow">Life Journey</p>
              <h2>Choose your current stage</h2>
              <p>Tap a stage to start the matching journey directly.</p>
            </header>

            <div className="jg-stage-grid">
              {LIFE_STAGES.map((stage) => (
                <button
                  type="button"
                  className="jg-stage-card jg-card-shimmer"
                  key={stage.id}
                  onClick={() =>
                    onOpenAssistant("life-cycle", undefined, stage.id)
                  }
                >
                  <span className="jg-stage-icon" aria-hidden="true">
                    {STAGE_ICONS[stage.id]}
                  </span>

                  <span className="jg-stage-copy">
                    <strong>{stage.title}</strong>
                    <span>{stage.description}</span>
                  </span>

                  <ArrowIcon className="jg-stage-arrow" />
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="jg-section jg-platform-section" id="platforms">
          <div className="jg-shell">
            <header className="jg-section-head">
              <p className="jg-eyebrow jg-eyebrow-violet">Platform Journeys</p>
              <h2>Explore by platform</h2>
              <p>Open the platform you need and choose a journey inside it.</p>
            </header>

            <div className="jg-platform-grid">
              {PLATFORMS.map((platform, index) => (
                <button
                  type="button"
                  className={`jg-platform-card jg-card-shimmer jg-platform-card-${index + 1}`}
                  key={platform.id}
                  onClick={() => onOpenAssistant("platform", platform.id)}
                >
                  <span className="jg-platform-icon">
                    <PlatformIcon className="jg-icon" />
                  </span>

                  <span className="jg-platform-copy">
                    <strong>{platform.shortName}</strong>
                    <span>{platform.description}</span>
                  </span>

                  <ArrowIcon className="jg-platform-arrow" />
                </button>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
