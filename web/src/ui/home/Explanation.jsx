export default function Explanation({ onContinue }) {
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
          maxWidth: 520,
          padding: 32,
          backgroundColor: "#FFFFFF",
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
          borderRadius: 12,
          textAlign: "left",
        }}
      >
        <h2
          style={{
            marginTop: 0,
            marginBottom: 16,
            fontSize: 22,
            color: "#1A1A1A",
            fontWeight: 600,
          }}
        >
          Wat is POST IT?
        </h2>

        <p style={{ color: "#1A1A1A", lineHeight: 1.6 }}>
          POST IT helpt je om een post te maken
          die past bij wat er nu speelt.
        </p>

        <p style={{ color: "#5A5A5A", lineHeight: 1.6 }}>
          Je hoeft niets te bedenken of te formuleren.
          Je beantwoordt een paar gerichte vragen.
        </p>

        <p style={{ color: "#5A5A5A", lineHeight: 1.6 }}>
          Op basis daarvan genereert POST IT meerdere voorstellen.
          Jij kiest één post als jouw post.
        </p>

        <p style={{ color: "#5A5A5A", lineHeight: 1.6 }}>
          POST IT neemt het schrijfwerk uit handen.
          Jij houdt de regie.
        </p>

        <div
          style={{
            marginTop: 32,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <button
            onClick={onContinue}
            style={{
              backgroundColor: "#111111",
              color: "#FFFFFF",
              border: "none",
              padding: "10px 18px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Verder
          </button>
        </div>
      </div>
    </div>
  );
}
