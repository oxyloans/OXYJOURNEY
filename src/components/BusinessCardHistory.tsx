import { useEffect, useState } from "react";
import { getBusinessCardUserHistory, type BusinessCardUserHistoryResponse } from "../services/vibeCodeApi";

export default function BusinessCardHistory() {
  const [history, setHistory] = useState<BusinessCardUserHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const userId = (localStorage.getItem("oxyBusinessCardUserId") || localStorage.getItem("userId") || "").trim();
    if (!userId) { setLoading(false); return; }
    let active = true;
    setLoading(true);
    setError("");
    getBusinessCardUserHistory(userId, localStorage.getItem("accessToken") || localStorage.getItem("token"))
      .then(data => { if (active) setHistory(data); })
      .catch(() => { if (active) setError("Could not load business card history."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);

  if (loading) return <div className="oxj-list-empty" role="status">Loading business cards...</div>;
  if (error) return <div className="oxj-list-empty" role="alert">{error} <button onClick={() => setRevision(value => value + 1)}>Retry</button></div>;
  const cards = history?.businessCards ?? [];
  if (!cards.length) return <div className="oxj-list-empty">No saved business cards yet.</div>;

  return (
    <section className="oxj-history-section" aria-label="Business card history">
      <div className="oxj-history-head"><span className="oxj-section-label">Business card history</span><span className="oxj-history-count">{cards.length}</span></div>
      <div className="oxj-history-list">
        {cards.map((card, index) => {
          const key = card.uploadId || `${card.uploadedAt || "card"}-${index}`;
          return (
            <a key={key} className="oxj-history-item oxj-session-history-item" href={`/business-card?card=${encodeURIComponent(key)}`}>
              <span className="oxj-history-bubble" aria-hidden="true">↗</span>
              <span className="oxj-session-history-copy"><strong>{card.personName || card.companyName || "Business card"}</strong><small>{card.companyName || "View saved card and matches"}</small></span>
            </a>
          );
        })}
      </div>
    </section>
  );
}
