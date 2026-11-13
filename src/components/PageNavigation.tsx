import "./PageNavigation.css";

export default function PageNavigation({ page }: { page: "business-card" | "dashboard" | "chat" }) {
  return <div className="page-navigation" role="group" aria-label="Page navigation">
    <a href={page === "dashboard" ? "/" : "/oxy-journey"}>
      <span aria-hidden="true">←</span> {page === "dashboard" ? "Back to home" : "Back to dashboard"}
    </a>
    {page !== "business-card" && <a href="/business-card">Business card</a>}
    {page === "business-card" && <a href="/">Home</a>}
  </div>;
}
