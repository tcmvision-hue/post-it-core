export default function Direction({ onComplete }) {
  return (
    <div style={{ padding: 32 }}>
      <h2>Direction</h2>
      <p>Je bent nu in de richtingsfase.</p>

      <button
        style={{ marginTop: 16 }}
        onClick={onComplete}
      >
        Verder
      </button>
    </div>
  );
}
