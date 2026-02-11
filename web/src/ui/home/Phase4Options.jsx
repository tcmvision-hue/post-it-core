import { useEffect, useState } from "react";
import { getUser } from "../../utils/user";

export default function Phase4Options({
  post,
  variants,
  hashtags,
  onVariantAdd,
  onHashtagsUpdate,
  onBack,
}) {
  const [error, setError] = useState("");
  const [action, setAction] = useState("");
  const [loadingKey, setLoadingKey] = useState("");
  const [tone, setTone] = useState("");
  const [coins, setCoins] = useState(null);

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadStatus() {
    try {
      const user = getUser();
      const res = await fetch("/api/phase4/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setCoins(data?.coins ?? 0);
      }
    } catch {
      // ignore status errors here
    }
  }

  async function applyOption(optionKey) {
    setError("");
    setAction("");
    setLoadingKey(optionKey);
    try {
      if (!post) {
        setError("Geen post gevonden om aan te passen.");
        return;
      }

      if (
        (optionKey === "tone" || optionKey === "rephrase") &&
        Array.isArray(variants) &&
        variants.length >= 3
      ) {
        setError("Maximaal 3 varianten per sessie.");
        return;
      }

      if (optionKey === "tone" && !tone.trim()) {
        setError("Vul een toon of accent in.");
        return;
      }

      const user = getUser();
      const res = await fetch("/api/phase4/option", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          optionKey,
          post,
          tone: optionKey === "tone" ? tone : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.ok) {
        const reason = formatReason(data.debitedFor);
        const cost = data.cost ?? 0;
        const coinsLeft = data.coinsLeft ?? 0;
        setAction(
          `Afschrijving gelukt: ${cost} coin(s) voor ${reason}. Nieuw saldo: ${coinsLeft}.`
        );
        setCoins(coinsLeft);
        if (data.post) {
          const label =
            optionKey === "tone" ? `Toon: ${tone.trim()}` : "Herformuleerd";
          onVariantAdd({
            text: data.post,
            label,
            accent: optionKey === "tone" ? tone.trim() : undefined,
            type: optionKey === "tone" ? "tone" : "rephrase",
            kind: optionKey === "tone" ? "tone" : "rephrase",
          });
        }
        if (Array.isArray(data.hashtags)) {
          onHashtagsUpdate(
            data.hashtags.map((tag) => ({ tag, selected: true }))
          );
        }
      } else {
        setError(data?.error || "Actie mislukt");
      }
    } catch {
      setError("Actie mislukt");
    } finally {
      setLoadingKey("");
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h2>Meer opties</h2>

        <div style={styles.section}>
          <h3>Coinsaldo</h3>
          <div style={styles.row}>
            <strong>Saldo:</strong>
            <span>{coins ?? 0} coins</span>
          </div>
          {action && <p style={styles.success}>{action}</p>}
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.section}>
          <h3>Extra opties (per gebruik)</h3>
          <div style={styles.optionRow}>
            <span>Toonkeuze — 2 coins</span>
            <button
              onClick={() => applyOption("tone")}
              disabled={loadingKey === "tone"}
            >
              Gebruik
            </button>
          </div>
          <input
            value={tone}
            onChange={(event) => setTone(event.target.value)}
            placeholder="Welke toon of accent?"
            style={styles.input}
          />
          <div style={styles.optionRow}>
            <span>Hashtag-suggesties — 1 coin</span>
            <button
              onClick={() => applyOption("hashtags")}
              disabled={loadingKey === "hashtags"}
            >
              Gebruik
            </button>
          </div>
          <div style={styles.optionRow}>
            <span>Herformuleren — 1 coin</span>
            <button
              onClick={() => applyOption("rephrase")}
              disabled={loadingKey === "rephrase"}
            >
              Gebruik
            </button>
          </div>
          <p style={styles.note}>Extra opties starten geen nieuwe generatie.</p>
          {!action && (
            <p style={styles.note}>
              Extra opties starten geen nieuwe generatie.
            </p>
          )}
        </div>

        {Array.isArray(hashtags) && hashtags.length > 0 && (
          <p style={styles.note}>
            Hashtags beheer je onder de post op het output-scherm.
          </p>
        )}

        <div style={{ marginTop: 20 }}>
          <button onClick={onBack}>Terug naar post</button>
        </div>
      </div>
    </div>
  );
}

function formatReason(key) {
  if (key === "tone") return "toonkeuze";
  if (key === "hashtags") return "hashtag-suggesties";
  if (key === "rephrase") return "herformulering";
  return "actie";
}

const styles = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6F3EE",
  },
  card: {
    width: 600,
    padding: 32,
    background: "#FFFFFF",
    borderRadius: 12,
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  },
  section: {
    marginTop: 20,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 8,
  },
  optionRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginTop: 10,
  },
  input: {
    width: "100%",
    marginTop: 8,
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid #ccc",
  },
  note: {
    marginTop: 8,
    color: "#555",
  },
  success: {
    marginTop: 8,
    color: "#2f6a2f",
  },
  error: {
    color: "#A33",
  },
};
