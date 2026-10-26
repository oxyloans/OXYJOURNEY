import React from "react";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("OXY Journeys UI error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "24px",
            background: "#fff",
            color: "#0f172a",
            fontFamily: 'Inter, "DM Sans", Arial, sans-serif',
          }}
        >
          <div style={{ maxWidth: "520px", textAlign: "center" }}>
            <h1 style={{ margin: 0, fontSize: "28px" }}>
              OXY Journeys could not load.
            </h1>
            <p
              style={{
                marginTop: "12px",
                color: "#64748b",
                lineHeight: 1.7,
              }}
            >
              Refresh the page. If the issue continues, check the browser
              console for the first error message.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
