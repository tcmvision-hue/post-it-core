import { useEffect } from "react";

export default function Today({ onContinue }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof onContinue === "function") {
        onContinue();
      }
    }, 2000); // 2 seconden canonisch

    return () => clearTimeout(timer);
  }, [onContinue]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        backgroundColor: "#F6F3EE",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 420,
          padding: 32,
          backgroundColor: "#FFFFFF",
          borderRadius: 12,
          textAlign: "center",
          boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Vandaag</h2>

        <p style={{ marginBottom: 0 }}>
          Sta kort stil bij vandaag voordat je begint.
        </p>
      </div>
    </div>
  );
}
