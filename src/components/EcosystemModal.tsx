import { useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Download, ExternalLink, Layers, X } from "lucide-react";
import "./EcosystemModal.css";

const ECOSYSTEM_IMAGE = new URL("../assets/ecosystem.png", import.meta.url).href;

interface EcosystemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EcosystemModal({ isOpen, onClose }: EcosystemModalProps) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (isOpen && event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    },
    [isOpen, onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown, isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="eco-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="eco-modal-title"
    >
      <button
        type="button"
        className="eco-modal__backdrop"
        onClick={onClose}
        aria-label="Close ecosystem viewer"
      />

      <section className="eco-modal__card">
        <header className="eco-modal__header">
          <div className="eco-modal__title-wrap">
            <span className="eco-modal__title-icon" aria-hidden="true">
              <Layers size={18} />
            </span>
            <div>
              <h2 id="eco-modal-title">OXY Global Ecosystem</h2>
              <span>Explore our connected ecosystem</span>
            </div>
          </div>

          <div className="eco-modal__actions">
            <a href={ECOSYSTEM_IMAGE} download="Oxy-Global-Ecosystem.png">
              <Download size={16} />
              <span>Download</span>
            </a>
            <a
              href={ECOSYSTEM_IMAGE}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open ecosystem image in a new tab"
              title="Open full-size image"
            >
              <ExternalLink size={16} />
            </a>
            <button type="button" onClick={onClose} aria-label="Close ecosystem viewer">
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="eco-modal__viewer">
          <img
            src={ECOSYSTEM_IMAGE}
            alt="OXY Global Ecosystem architecture"
          />
        </div>
      </section>
    </div>,
    document.body,
  );
}
