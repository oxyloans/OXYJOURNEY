import "./LoanPromotionCard.css";

const LOAN_APPLICATION_URL = "https://www.askoxy.ai/br-loan-application";

export default function LoanPromotionCard() {
  return (
    <aside className="oxl-promo" aria-labelledby="oxl-promo-title">
      <div className="oxl-promo__surface">
        <span className="oxl-promo__glow oxl-promo__glow--left" aria-hidden="true" />
        <span className="oxl-promo__glow oxl-promo__glow--right" aria-hidden="true" />

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

          <a
            className="oxl-promo__action"
            href={LOAN_APPLICATION_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Apply for an OXYLoans loan (opens in a new tab)"
          >
            Apply Now
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7 17 17 7" />
              <path d="M7 7h10v10" />
            </svg>
          </a>
        </div>
      </div>
    </aside>
  );
}
