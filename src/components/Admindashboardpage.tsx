import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../config";

const BASE_URL =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:9876/api"
    : API_BASE_URL;

interface BorrowerChatSession {
  bfSessionId: string;
  bfStage: string;
  bfBorrowerName?: string;
  bfPhoneNumber?: string; 
  bfRequestedLoanAmount?: number;
  bfApprovedLoanAmount?: number;
  bfLoanPurpose?: string;
  bfBorrowerType?: string;
  bfBorrowerId?: string;
  bfUtm?: string;
  bfRiskScore?: string;
  bfRiskBucket?: string;
  bfCreditScore?: number;
  bfMonthlySalary?: number;
  bfMonthlyIncomeFromBank?: number;
  bfMonthlyExpensesFromBank?: number;
  bfExpenseRatio?: number;
  bfOtpVerified?: boolean;
  bfAffordabilityConsent?: boolean;
  bfCreditRiskConsent?: boolean;
  bfOfferAccepted?: boolean;
  bfSocialShareUrl?: string;
  bfCreatedAt?: string;
  bfUpdatedAt?: string;
}

interface BorrowerChatMessage {
  bfMessageId?: number;
  bfSessionId: string;
  bfRole: "USER" | "ASSISTANT" | "SYSTEM";
  bfContent: string;
  bfCreatedAt?: string;
}

interface BorrowerLoanDocument {
  bfDocId?: number;
  bfSessionId: string;
  bfDocType: string;
  bfRawContent?: string;
  bfExtractedJson?: string;
  bfProcessingStatus?: string;
  bfS3Url?: string;
  bfExtractedName?: string;
  bfNameMatchStatus?: string;
  bfUploadedAt?: string;
}

interface BorrowerConversationHistoryDTO {
  bfSessionId: string;
  session: BorrowerChatSession;
  messages: BorrowerChatMessage[];
  documents: BorrowerLoanDocument[];
}

// ─── Helpers: Unified Modern Palette (No Garish Rainbows) ───────────────────
const riskColors: Record<string, string> = {
  LOW: "bg-emerald-50 text-emerald-700 border-emerald-200",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
  HIGH: "bg-rose-50 text-rose-700 border-rose-200",
};

const stageColors: Record<string, string> = {
  // Discovery & Identity
  LOAN_AMOUNT: "bg-slate-100 text-slate-700 border-slate-200",
  LOAN_PURPOSE: "bg-slate-100 text-slate-700 border-slate-200",
  LOGIN_MOBILE: "bg-slate-100 text-slate-700 border-slate-200",
  LOGIN_OTP: "bg-slate-100 text-slate-700 border-slate-200",
  BORROWER_NAME: "bg-slate-100 text-slate-700 border-slate-200",
  BORROWER_TYPE: "bg-slate-100 text-slate-700 border-slate-200",
  OCCUPATION_DETAILS: "bg-slate-100 text-slate-700 border-slate-200",

  // Verification & Document Uploads
  AWAITING_PAN: "bg-indigo-50 text-indigo-700 border-indigo-200",
  AWAITING_AADHAAR: "bg-indigo-50 text-indigo-700 border-indigo-200",
  AWAITING_INCOME_PROOF: "bg-indigo-50 text-indigo-700 border-indigo-200",
  AWAITING_BANK_STATEMENT: "bg-indigo-50 text-indigo-700 border-indigo-200",
  AWAITING_CREDIT_REPORT: "bg-indigo-50 text-indigo-700 border-indigo-200",

  // Reviews & Consents
  AFFORDABILITY_CONSENT: "bg-sky-50 text-sky-700 border-sky-200",
  CREDIT_RISK_CONSENT: "bg-sky-50 text-sky-700 border-sky-200",
  OFFER_CONSENT: "bg-sky-50 text-sky-700 border-sky-200",
  SOCIAL_MEDIA_CONSENT: "bg-sky-50 text-sky-700 border-sky-200",

  // Outcome
  SUBMITTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DECLINED: "bg-rose-50 text-rose-700 border-rose-200",
};

const docStatusColors: Record<string, string> = {
  ACCEPTED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 border border-rose-200",
  CLAIMED: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  SUPERSEDED: "bg-slate-100 text-slate-600 border border-slate-200",
};

function formatDate(dt?: string) {
  if (!dt) return "—";
  try {
    return new Date(dt).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dt;
  }
}

function formatAmount(amt?: number) {
  if (amt == null) return "—";
  return "₹" + amt.toLocaleString("en-IN");
}

function fmtDocType(t: string) {
  return t.replaceAll("_", " ");
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const [sessions, setSessions] = useState<BorrowerChatSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSessionDetail, setSelectedSessionDetail] = useState<BorrowerChatSession | null>(null);
  const [messages, setMessages] = useState<BorrowerChatMessage[]>([]);
  const [documents, setDocuments] = useState<BorrowerLoanDocument[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [borrowerTypeFilter, setBorrowerTypeFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  // mobile: track whether the detail pane is shown (true) or list (false)
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  // ── API: GET /sessions ───────────────────────────────────────────────
  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch(`${BASE_URL}/vibecode-service/borrower/sessions`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: BorrowerChatSession[] = await res.json();
      const meaningfulSessions = (data || []).filter((s) => {
        if (s.bfRequestedLoanAmount != null && s.bfRequestedLoanAmount > 0) return true;
        if (s.bfLoanPurpose && s.bfLoanPurpose.trim().length > 0) return true;
        if (s.bfBorrowerName && s.bfBorrowerName.trim().length > 0) return true;
        if (s.bfStage && s.bfStage !== "LOAN_AMOUNT") return true;
        return false;
      });
      meaningfulSessions.sort(
        (a, b) =>
          new Date(b.bfCreatedAt ?? 0).getTime() -
          new Date(a.bfCreatedAt ?? 0).getTime()
      );
      setSessions(meaningfulSessions);
    } catch (err) {
      console.error("Failed to load sessions:", err);
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  };

  // ── API: GET /history/{id} ───────────────────
  const loadSessionDetail = async (id: string) => {
    setSelectedId(id);
    setShowDetail(true); // mobile: switch to detail view
    setLoadingDetail(true);
    try {
      const res = await fetch(
        `${BASE_URL}/vibecode-service/borrower/history/${encodeURIComponent(id)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: BorrowerConversationHistoryDTO = await res.json();
      setSelectedSessionDetail(data.session ?? null);
      setMessages((data.messages ?? []).filter((m) => m.bfRole !== "SYSTEM"));
      setDocuments(data.documents ?? []);
    } catch (err) {
      console.error("Failed to load session history:", err);
      setMessages([]);
      setDocuments([]);
    } finally {
      setLoadingDetail(false);
    }
  };

  // ── Filtering (name, phone, stage, borrowerType) ────────────────────────────
  const filteredSessions = sessions.filter((s) => {
    if (borrowerTypeFilter !== "ALL" && (s.bfBorrowerType ?? "").toUpperCase() !== borrowerTypeFilter) {
      return false;
    }
    const q = search.toLowerCase();
    return (
      s.bfSessionId.toLowerCase().includes(q) ||
      (s.bfBorrowerName ?? "").toLowerCase().includes(q) ||
      (s.bfPhoneNumber ?? "").includes(q) ||
      (s.bfBorrowerId ?? "").toLowerCase().includes(q) ||
      (s.bfStage ?? "").toLowerCase().includes(q) ||
      (s.bfBorrowerType ?? "").toLowerCase().includes(q) ||
      (s.bfUtm ?? "").toLowerCase().includes(q)
    );
  });

  const selectedSession = selectedSessionDetail || sessions.find((s) => s.bfSessionId === selectedId);

  // ── Quick stats ────────────────────────────────────────────────────────────
  const total = sessions.length;
  const submitted = sessions.filter((s) => s.bfStage === "SUBMITTED").length;
  const active = sessions.filter(
    (s) => s.bfStage !== "SUBMITTED" && s.bfStage !== "DECLINED"
  ).length;
  const highRisk = sessions.filter((s) => s.bfRiskScore === "HIGH").length;

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 font-sans text-slate-800">

      {/* ── Top bar in Royal Blue / Indigo (Matching User Side) ── */}
      <div className="flex items-center justify-between px-4 md:px-6 py-2.5 md:py-3 bg-[#4338ca] border-b border-[#3730a3] shadow-sm shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-white text-[16px] md:text-[17px] font-extrabold tracking-tight">OXY</span>
          <span className="text-indigo-100 text-[16px] md:text-[17px] font-extrabold tracking-tight">LOANS</span>
          <span className="ml-2 text-white text-[11px] md:text-[11.5px] font-semibold bg-white/20 border border-white/25 px-2.5 py-0.5 rounded-full shadow-2xs">
            Admin Portal
          </span>
        </div>
        {/* Stats — hidden on mobile, shown inline on desktop */}
        <div className="hidden md:flex gap-6">
          {[
            { label: "Total Sessions", value: total, color: "text-white" },
            { label: "In Progress", value: active, color: "text-indigo-100" },
            { label: "Submitted", value: submitted, color: "text-emerald-300" },
            { label: "High Risk", value: highRisk, color: "text-rose-300" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className={`text-[17px] font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-[10px] text-indigo-200 uppercase tracking-wide font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
        <button
          onClick={() => loadSessions()}
          className="text-[12px] bg-white/15 hover:bg-white/25 text-white border border-white/25 px-3 py-1.5 rounded-xl transition-all font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <span>↻</span>
          <span>Refresh</span>
        </button>
      </div>

      {/* Mobile stats strip */}
      <div className="md:hidden flex items-center justify-around bg-[#3730a3] border-b border-indigo-900/40 px-4 py-2 shrink-0">
        {[
          { label: "Total", value: total, color: "text-white" },
          { label: "Active", value: active, color: "text-indigo-100" },
          { label: "Done", value: submitted, color: "text-emerald-300" },
          { label: "High Risk", value: highRisk, color: "text-rose-300" },
        ].map((stat) => (
          <div key={stat.label} className="text-center">
            <div className={`text-[15px] font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-[9px] text-indigo-200 uppercase tracking-wide font-medium">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-1 min-h-0 w-full overflow-hidden">

        {/* ── Session list: full width on mobile (hidden when detail shown), fixed 340px on desktop ── */}
        <div className={`${
          showDetail ? "hidden md:flex" : "flex"
        } w-full md:w-[340px] md:min-w-[340px] md:max-w-[340px] shrink-0 flex-col bg-white border-r border-slate-200/80`}>
          <div className="px-4 pt-3.5 pb-2 shrink-0">
            {/* Borrower Type Filter Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-2.5 overflow-x-auto">
              {[
                { key: "ALL", label: "All" },
                { key: "SALARIED", label: "Salaried" },
                { key: "STUDENT", label: "Student" },
                { key: "SELF_EMPLOYED", label: "Business" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setBorrowerTypeFilter(tab.key)}
                  className={`flex-1 text-[11.5px] font-semibold py-1 px-2 rounded-lg transition-all text-center whitespace-nowrap cursor-pointer ${
                    borrowerTypeFilter === tab.key
                      ? "bg-[#4338ca] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-slate-400 text-xs pointer-events-none">🔍</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, stage, ID…"
                className="w-full text-[12.5px] border border-slate-200 rounded-full pl-8 pr-3 py-1.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 placeholder-slate-400 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-4 pt-1">
            {loadingSessions ? (
              <div className="px-4 py-8 text-center text-[12.5px] text-slate-400">Loading sessions…</div>
            ) : filteredSessions.length === 0 ? (
              <div className="px-4 py-8 text-center text-[12.5px] text-slate-400">No sessions found.</div>
            ) : (
              filteredSessions.map((s) => {
                const risk = s.bfRiskScore || s.bfRiskBucket;
                const isSelected = selectedId === s.bfSessionId;
                return (
                  <div
                    key={s.bfSessionId}
                    onClick={() => loadSessionDetail(s.bfSessionId)}
                    className={`mx-1 mb-2 px-3 py-2.5 rounded-xl cursor-pointer border transition-all ${
                      isSelected
                        ? "bg-[#eef2ff] border-indigo-200 shadow-2xs"
                        : "bg-white hover:bg-slate-50 border-slate-200/70 hover:border-slate-300 shadow-2xs"
                    }`}
                  >
                    {/* Name + Risk */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {isSelected ? (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-indigo-200 shrink-0" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                        )}
                        <span className={`text-[13px] truncate ${isSelected ? "font-bold text-slate-900" : "font-semibold text-slate-800"}`}>
                          {s.bfBorrowerName || (s.bfBorrowerId ? `Borrower ${s.bfBorrowerId.slice(0, 8)}` : "Unnamed session")}
                        </span>
                      </div>
                      {risk && (
                        <span
                          className={`shrink-0 text-[9.5px] font-bold px-1.5 py-0.5 rounded-full border ${
                            riskColors[risk] ?? "bg-slate-100 text-slate-500 border-slate-200"
                          }`}
                        >
                          {risk}
                        </span>
                      )}
                    </div>
                    {/* Phone + Loan Amount */}
                    <div className="flex items-center justify-between mt-1 pl-4">
                      <span className="text-[11px] text-slate-500">
                        {s.bfPhoneNumber ? `📞 ${s.bfPhoneNumber}` : (s.bfLoanPurpose ? `🎯 ${s.bfLoanPurpose}` : "No phone yet")}
                      </span>
                      <span className="text-[11.5px] text-indigo-700 font-bold">
                        {s.bfRequestedLoanAmount != null ? formatAmount(s.bfRequestedLoanAmount) : ""}
                      </span>
                    </div>
                    {/* Stage + Borrower Type chips */}
                    <div className="flex items-center gap-1.5 mt-1.5 pl-4 flex-wrap">
                      <span
                        className={`text-[9.5px] font-medium px-2 py-0.5 rounded-full border ${
                          stageColors[s.bfStage] ?? "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {(s.bfStage ?? "").replaceAll("_", " ")}
                      </span>
                      {s.bfBorrowerType && (
                        <span className="text-[9.5px] bg-indigo-50 text-indigo-700 border border-indigo-200/60 px-2 py-0.5 rounded-full font-medium">
                          {s.bfBorrowerType.replaceAll("_", " ")}
                        </span>
                      )}
                      {s.bfUtm && (
                        <span className="text-[9.5px] bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-2 py-0.5 rounded-full font-semibold">
                          🌐 {s.bfUtm}
                        </span>
                      )}
                      {s.bfBorrowerId && (
                        <span className="text-[9.5px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full font-mono font-medium">
                          UID: {s.bfBorrowerId.slice(0, 8)}…
                        </span>
                      )}
                    </div>
                    {/* Date */}
                    <div className="text-[10px] text-slate-400 mt-1 pl-4">
                      {formatDate(s.bfCreatedAt)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Detail pane: full width on mobile, flex-1 on desktop ── */}
        <div className={`${
          showDetail ? "flex" : "hidden md:flex"
        } flex-1 flex-col min-w-0 bg-white`}>
          {!selectedId ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400">
              <div className="text-[36px]">🏦</div>
              <div className="text-[13.5px] font-medium">Select a session to view transcript and documents</div>
            </div>
          ) : (
            <>
              {/* Session header */}
              <div className="shrink-0 px-4 md:px-6 py-3 border-b border-slate-200/80 bg-white">
                {/* Mobile back button */}
                <button
                  onClick={() => setShowDetail(false)}
                  className="md:hidden flex items-center gap-1 text-[12px] text-indigo-600 font-semibold mb-2"
                >
                  ← Back to sessions
                </button>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[16px] font-extrabold text-slate-900 flex items-center gap-2">
                      <span>{selectedSession?.bfBorrowerName || "Unnamed borrower"}</span>
                      {selectedSession?.bfBorrowerId && (
                        <span className="text-[11px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md font-mono font-normal">
                          {selectedSession.bfBorrowerId}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-1.5 text-[12px] text-slate-600">
                      {selectedSession?.bfPhoneNumber && (
                        <span>📞 {selectedSession.bfPhoneNumber}</span>
                      )}
                      {selectedSession?.bfRequestedLoanAmount != null && (
                        <span>💰 Requested: <strong className="text-slate-800">{formatAmount(selectedSession.bfRequestedLoanAmount)}</strong></span>
                      )}
                      {selectedSession?.bfApprovedLoanAmount != null && (
                        <span className="text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          ✓ Offer: {formatAmount(selectedSession.bfApprovedLoanAmount)}
                        </span>
                      )}
                      {selectedSession?.bfLoanPurpose && (
                        <span>🎯 Purpose: {selectedSession.bfLoanPurpose}</span>
                      )}
                      {selectedSession?.bfUtm && (
                        <span className="text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                          🌐 Source / UTM: <strong>{selectedSession.bfUtm}</strong>
                        </span>
                      )}
                      {selectedSession?.bfBorrowerType && (
                        <span>💼 Type: {selectedSession.bfBorrowerType.replaceAll("_", " ")}</span>
                      )}
                      {selectedSession?.bfMonthlySalary != null && (
                        <span>💵 Salary: {formatAmount(selectedSession.bfMonthlySalary)}/mo</span>
                      )}
                      {selectedSession?.bfMonthlyIncomeFromBank != null && (
                        <span>🏦 Bank Income: {formatAmount(selectedSession.bfMonthlyIncomeFromBank)}/mo</span>
                      )}
                      {selectedSession?.bfMonthlyExpensesFromBank != null && (
                        <span>📉 Expenses: {formatAmount(selectedSession.bfMonthlyExpensesFromBank)}/mo</span>
                      )}
                      {selectedSession?.bfCreditScore != null && (
                        <span>⭐ Credit Score: {selectedSession.bfCreditScore}</span>
                      )}
                      {selectedSession?.bfSocialShareUrl && (
                        <a
                          href={selectedSession.bfSocialShareUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline font-semibold"
                        >
                          📱 Social Post Link
                        </a>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">{selectedId}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(selectedSession?.bfRiskScore || selectedSession?.bfRiskBucket) && (
                      <span
                        className={`text-[10.5px] font-bold px-2.5 py-1 rounded-full border ${
                          riskColors[selectedSession?.bfRiskScore || selectedSession?.bfRiskBucket || ""] ?? "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {selectedSession?.bfRiskScore || selectedSession?.bfRiskBucket} RISK
                      </span>
                    )}
                    <span
                      className={`text-[10.5px] font-semibold px-2.5 py-1 rounded-full border ${
                        stageColors[selectedSession?.bfStage ?? ""] ?? "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {selectedSession?.bfStage?.replaceAll("_", " ")}
                    </span>
                  </div>
                </div>
                <div className="flex gap-4 mt-1 text-[10.5px] text-slate-400">
                  <span>Created: {formatDate(selectedSession?.bfCreatedAt)}</span>
                  <span>Updated: {formatDate(selectedSession?.bfUpdatedAt)}</span>
                </div>
              </div>


              {loadingDetail ? (
                <div className="flex-1 flex items-center justify-center text-slate-400 text-[13px]">
                  Loading session details…
                </div>
              ) : (
                <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3">

                  {/* Chat transcript: full width on mobile, 2/3 on desktop */}
                  <div className="md:col-span-2 border-b md:border-b-0 md:border-r border-slate-200/80 flex flex-col min-h-0" style={{ minHeight: showDetail ? '50vh' : undefined }}>
                    <div className="shrink-0 px-5 pt-3 pb-2 border-b border-slate-100 bg-slate-50/70">
                      <span className="text-[10.5px] font-bold tracking-wider uppercase text-slate-400">
                        Chat Transcript
                      </span>
                      <span className="ml-2 text-[10.5px] text-slate-400 font-medium">({messages.length} messages)</span>
                    </div>
                    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-white">
                      {messages.length === 0 ? (
                        <div className="text-[13px] text-slate-400">No messages recorded.</div>
                      ) : (
                        messages.map((m, i) => (
                          <div
                            key={i}
                            className={`flex gap-2.5 ${m.bfRole === "USER" ? "flex-row-reverse" : ""}`}
                          >
                            <div
                              className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${
                                m.bfRole === "USER"
                                  ? "bg-slate-700"
                                  : "bg-[#4338ca]"
                              }`}
                            >
                              {m.bfRole === "USER" ? "B" : "AI"}
                            </div>
                            <div
                              className={`px-4 py-3 rounded-2xl text-[13px] leading-relaxed max-w-[72%] whitespace-pre-wrap break-words ${
                                m.bfRole === "USER"
                                  ? "bg-[#0f172a] text-white rounded-tr-xs"
                                  : "bg-slate-100 text-slate-800 border border-slate-200/70 rounded-tl-xs"
                              }`}
                            >
                              {m.bfContent}
                              {m.bfCreatedAt && (
                                <div className={`text-[9.5px] mt-1 ${m.bfRole === "USER" ? "text-slate-400" : "text-slate-400"}`}>
                                  {formatDate(m.bfCreatedAt)}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Documents: full width on mobile, 1/3 on desktop */}
                  <div className="md:col-span-1 flex flex-col min-h-0 bg-slate-50/50">
                    <div className="shrink-0 px-4 pt-3 pb-2 border-b border-slate-100 bg-slate-50/80">
                      <span className="text-[10.5px] font-bold tracking-wider uppercase text-slate-400">
                        Uploaded Documents
                      </span>
                      <span className="ml-2 text-[10.5px] text-slate-400 font-medium">({documents.length})</span>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                      {documents.length === 0 ? (
                        <div className="text-[13px] text-slate-400">No documents uploaded.</div>
                      ) : (
                        documents.map((d, i) => (
                          <div
                            key={i}
                            className="bg-white border border-slate-200 rounded-xl px-3.5 py-3 shadow-2xs"
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="text-[12.5px] font-bold text-slate-800">
                                📄 {fmtDocType(d.bfDocType)}
                              </span>
                              {d.bfProcessingStatus && (
                                <span
                                  className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${
                                    docStatusColors[d.bfProcessingStatus] ?? "bg-slate-100 text-slate-500 border border-slate-200"
                                  }`}
                                >
                                  {d.bfProcessingStatus}
                                </span>
                              )}
                            </div>
                            {d.bfUploadedAt && (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {formatDate(d.bfUploadedAt)}
                              </div>
                            )}
                            {d.bfExtractedName && (
                              <div className="text-[11px] text-slate-600 mt-1">
                                <span className="font-medium">Name on doc:</span> {d.bfExtractedName}
                                {d.bfNameMatchStatus && (
                                  <span className={`ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                    d.bfNameMatchStatus === "MATCH" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                    d.bfNameMatchStatus === "MISMATCH" ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-slate-100 text-slate-600 border border-slate-200"
                                  }`}>
                                    {d.bfNameMatchStatus}
                                  </span>
                                )}
                              </div>
                            )}
                            {d.bfS3Url && (
                              <div className="mt-2 text-[12px]">
                                <a
                                  href={d.bfS3Url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                                >
                                  🔗 View / Download from S3
                                </a>
                              </div>
                            )}
                            {d.bfExtractedJson && (
                              <pre className="text-[10.5px] text-slate-200 mt-2 whitespace-pre-wrap break-words font-mono bg-slate-900 rounded-xl p-2.5 max-h-44 overflow-y-auto border border-slate-800">
                                {(() => {
                                  try {
                                    return JSON.stringify(JSON.parse(d.bfExtractedJson), null, 2);
                                  } catch {
                                    return d.bfExtractedJson;
                                  }
                                })()}
                              </pre>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
