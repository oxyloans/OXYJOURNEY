import { PhoneCall } from "lucide-react";
import "./FloatingTollFreeHelpline.css";

  const TOLL_FREE_NUMBER = "04041897778";
  const TOLL_FREE_DISPLAY = "040 4189 7778";
  const TOLL_FREE_TEL = `tel:${TOLL_FREE_NUMBER}`;

function FloatingTollFreeHelpline() {
  return (
    <aside
      aria-label="Quick Call Helpline"
      className="floating-helpline"
    >
      <a
        href={TOLL_FREE_TEL}
        className="helpline-button"
        aria-label={`Call Toll Free Helpline ${TOLL_FREE_DISPLAY} (24/7, 365 Days Available)`}
      >
        <span className="helpline-icon-wrapper">
          <PhoneCall className="helpline-phone-icon" />
          <span className="helpline-online-dot" />
        </span>

        <span className="helpline-content">
          <span className="helpline-label">
            <span>Toll Free Helpline</span>
            <span className="helpline-separator" />
            <span className="helpline-availability">
              24/7
            </span>
          </span>

          <span className="helpline-number">
            {TOLL_FREE_DISPLAY}
          </span>
        </span>
      </a>
    </aside>
  );
}

export default FloatingTollFreeHelpline;