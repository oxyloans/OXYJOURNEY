import { useState } from "react";
import EcosystemModal from "./EcosystemModal";
import "./LoanPromotionCard.css";

export default function LoanPromotionCard() {
  const [ecosystemOpen, setEcosystemOpen] = useState(false);

  return (
    <>
      <aside className="oxl-promo" aria-labelledby="oxl-promo-title">
        <div className="oxl-promo__surface">
          <span
            className="oxl-promo__glow oxl-promo__glow--left"
            aria-hidden="true"
          />
          <span
            className="oxl-promo__glow oxl-promo__glow--right"
            aria-hidden="true"
          />

          <div className="oxl-promo__content">
            <div className="oxl-promo__copy">
              <span className="oxl-promo__eyebrow">
                <i aria-hidden="true" />
                Our primary business
              </span>
              <p className="oxl-promo__intro">Loans from</p>
              <h2 id="oxl-promo-title" className="oxl-promo__amount">
                <span>₹5,000</span>
                <small>to</small>
                <span>₹5,000 Crore</span>
              </h2>
            </div>

            <div className="oxl-promo__actions">
              <button
                type="button"
                className="oxl-promo__action"
                onClick={() => {
                  window.location.href = "/br-loan-application?utm=OxyJourneys";
                }}
                aria-label="Apply for an OXYLoans loan"
              >
                Apply Now
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M7 17 17 7" />
                  <path d="M7 7h10v10" />
                </svg>
              </button>
              <button
                type="button"
                className="oxl-promo__ecosystem"
                onClick={() => setEcosystemOpen(true)}
                aria-haspopup="dialog"
              >
                Explore Ecosystem
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M8 12h8M12 8v8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </aside>

      <EcosystemModal
        isOpen={ecosystemOpen}
        onClose={() => setEcosystemOpen(false)}
      />
    </>
  );
}
