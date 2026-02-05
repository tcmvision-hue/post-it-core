export default function Welcome({ onContinue }) {
  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h1>Welkom bij POST THIS</h1>

        <p>
          POST THIS maakt elke dag één post die past bij vandaag.
          U hoeft niets te bedenken.
        </p>

        <button onClick={onContinue} style={styles.button}>
          Verder
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: 520,
    padding: 32,
    background: "#f6f3ee",
    borderRadius: 12,
    textAlign: "center",
  },
  button: {
    marginTop: 24,
    padding: "10px 20px",
    fontSize: 16,
    cursor: "pointer",
  },
};
