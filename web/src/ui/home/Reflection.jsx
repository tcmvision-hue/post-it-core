export default function Reflection({ onComplete }) {
  return (
    <div style={{ padding: 32, maxWidth: 420, margin: "0 auto" }}>
      <h2>Reflectie</h2>
      <p>Sta even stil bij wat je net hebt opgeschreven.</p>

      <textarea
        placeholder="Wat valt je op?"
        style={{
          width: "100%",
          minHeight: 120,
          marginTop: 16,
          padding: 8,
        }}
      />

      <button
        style={{ marginTop: 16 }}
        onClick={onComplete}
      >
        Verder
      </button>
    </div>
  );
}
