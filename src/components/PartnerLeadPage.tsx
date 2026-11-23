import { useEffect, useState } from "react";
import { LOGO } from "../data/journeyData";
import { getPartnerLeadDetailsByMobile, type PartnerLeadDetails } from "../services/vibeCodeApi";
import "./PartnerLeadPage.css";

const ROTARY_HUB_URL = "https://www.askoxy.ai/services/myrotary";

function isRotary(source: string | null): boolean {
  return (source || "").trim().toLowerCase().includes("rotary");
}

function partnerGreeting(lead: PartnerLeadDetails): string {
  const name = (lead.partnerName || "").trim();
  const profession = conciseProfession(lead.partnerClassification);
  if (!name) return "Partner";
  if (!profession || name.toLowerCase().includes(profession.toLowerCase())) return name;
  return `${profession.charAt(0).toUpperCase()}${profession.slice(1)} ${name}`;
}

function conciseProfession(value: string | null): string {
  const profession = (value || "").trim();
  const lower = profession.toLowerCase();
  if (lower.includes("advocate") || lower.includes("lawyer")) return "Advocate";
  if (lower.includes("doctor") || lower.includes("physician")) return "Doctor";
  if (lower.includes("chief executive") || /\bceo\b/.test(lower)) return "CEO";
  if (lower.includes("builder")) return "Builder";
  if (lower.includes("architect")) return "Architect";
  if (lower.includes("chartered accountant") || /\bca\b/.test(lower)) return "Chartered Accountant";
  if (lower.includes("engineer")) return "Engineer";
  if (lower.includes("consultant")) return "Consultant";
  if (lower.includes("director")) return "Director";
  return profession;
}

export default function PartnerLeadPage() {
  const params = new URLSearchParams(window.location.search);
  const mobile = params.get("mobile") || "";
  const sessionId = params.get("sessionId") || "";
  const [lead, setLead] = useState<PartnerLeadDetails | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!mobile || !sessionId) { setError("This lead link is incomplete."); return; }
    let active = true;
    getPartnerLeadDetailsByMobile(mobile, sessionId)
      .then(value => { if (active) setLead(value); })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : "We could not load this lead."); });
    return () => { active = false; };
  }, [mobile, sessionId]);

  if (error) return <main className="plp-root"><section className="plp-card plp-error"><h1>Lead unavailable</h1><p>{error}</p></section></main>;
  if (!lead) return <main className="plp-root"><section className="plp-card"><p>Loading your matched lead…</p></section></main>;

  const memberGreeting = isRotary(lead.membershipSource) ? "Respected Fellow Rotarian," : "Respected Fellow FTCCI Member,";
  const requester = (lead.userName || "A member").trim();

  return (
    <main className="plp-root">
      <section className="plp-shell">
        <header className="plp-header"><a href="/oxy-journey" className="plp-brand"><img src={LOGO} width={340} height={63} decoding="async" alt="OXY Journeys" /><small>Every journey, one partner</small></a><a className="plp-home" href="/oxy-journey">Explore journeys <span aria-hidden="true">↗</span></a></header>
        <div className="plp-heading"><span className="plp-eyebrow">YOUR CONNECTIONS</span><h1>Your next connection starts here.</h1><p>A matched lead from your network. Review the request and start a conversation.</p></div>
        <article className="plp-card">
        <div className="plp-intro"><span className="plp-eyebrow">A PERSONAL INTRODUCTION</span>
        <p className="plp-member-greeting">{memberGreeting}</p>
        <p><strong>Greetings from Rtn. RadhaKrishna Thatavarti.</strong></p>
        <p>Rotary AI Hub helps Rotarians grow their businesses through leads from oxyjourneys.com. In return, we request a small donation to The Rotary Foundation.</p>
        <p className="plp-dear">Dear {partnerGreeting(lead)},</p></div>
        <div className="plp-lead"><span>NEW LEAD</span><h1>{requester} needs your help</h1><p>{lead.requirementSummary || "Please open the chat to understand this member’s requirement."}</p></div>
        <div className="plp-actions">
          {lead.chatUrl && <a className="plp-primary" href={`${lead.chatUrl.replace(/\/+$/, "")}/partner`}>Discuss this request with {requester} <span>→</span></a>}
          {lead.dashboardUrl && <a className="plp-secondary" href={lead.dashboardUrl}>View all your matched leads <span>→</span></a>}
          <a className="plp-secondary" href={ROTARY_HUB_URL} target="_blank" rel="noreferrer">Learn about Rotary AI Hub <span>↗</span></a>
        </div>
        <p className="plp-signoff">Warm regards,<br /><strong>OXY Journey Team</strong></p>
        </article>
      </section>
    </main>
  );
}
