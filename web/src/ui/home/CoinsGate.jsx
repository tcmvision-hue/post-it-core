import { useEffect, useState } from "react";
import { getUser } from "../../utils/user";

export default function CoinsGate({ onStart }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [action, setAction] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState("");

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadStatus() {
    setError("");
    try {
      const user = getUser();
      const res = await fetch("/api/phase4/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus(data);
      } else {
        setError(data?.error || "Status failed");
      }
    } catch {
      setError("Status failed");
    }
  }

  async function startCycle() {
    if (!status) return false;
    setLoading(true);
    setError("");
    setAction("");
    try {
      const user = getUser();
      const res = await fetch("/api/phase4/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (res.ok && data?.ok) {
        const costToStart = data.costToStart ?? 0;
        if (costToStart === 0) {
          setAction("Gratis post beschikbaar. Je kunt starten.");
        } else {
          setAction("Starten kost 1 coin. Extra generaties kosten ook 1 coin.");
        }
        return true;
      } else {
        setError(data?.error || "Start failed");
        await loadStatus();
      }
    } catch {
      setError("Start failed");
    } finally {
      setLoading(false);
    }
    return false;
  }

  async function startAndContinue() {
    const ok = await startCycle();
    if (ok) onStart();
  }

  const coins = status?.coins ?? 0;
  const postNumNext = status?.postNumNext ?? 1;
  const daySlotUsed = status?.daySlotUsed ?? false;
  const costToStart = status?.costToStart ?? 0;
  const insufficient = costToStart > coins;

  async function startCheckout(bundleKey) {
    setCheckoutError("");
    setCheckoutLoading(bundleKey);
    try {
      const user = getUser();
      const res = await fetch("/api/phase4/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          bundle: bundleKey,
          returnTo: "coins",
        }),
      });
      const data = await res.json();
      if (res.ok && data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setCheckoutError(data?.error || "Checkout failed");
      }
    } catch {
      setCheckoutError("Checkout failed");
    } finally {
      setCheckoutLoading("");
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h2>Coins</h2>

        {error && <p style={styles.error}>{error}</p>}
        {action && <p style={styles.success}>{action}</p>}

        <div style={styles.row}>
          <strong>Saldo:</strong>
          <span>{coins} coins</span>
        </div>

        <div style={styles.row}>
          <strong>Volgende post:</strong>
          <span>Post {postNumNext}</span>
        </div>

        <div style={styles.row}>
          <strong>Startkosten:</strong>
          <span>{costToStart} coin</span>
        </div>

        <div style={{ marginTop: 16 }}>
          {!daySlotUsed && (
            <p style={styles.note}>Eerste post vandaag is gratis.</p>
          )}
          {daySlotUsed && (
            <p style={styles.note}>
              Eerste generatie kost 1 coin. Extra generaties kosten 1 coin.
            </p>
          )}
          {insufficient && (
            <p style={styles.lock}>Onvoldoende coins om te starten.</p>
          )}
        </div>

        <div style={{ marginTop: 20 }}>
          <button onClick={startAndContinue} disabled={loading || insufficient}>
            Start post en ga verder
          </button>
        </div>

        <div style={styles.section}>
          <h3>Koop coins</h3>
          <div style={styles.optionRow}>
            <span>20 coins — EUR 10,00</span>
            <button
              onClick={() => startCheckout("20")}
              disabled={checkoutLoading === "20"}
            >
              Koop
            </button>
          </div>
          <div style={styles.optionRow}>
            <span>50 coins — EUR 22,50</span>
            <button
              onClick={() => startCheckout("50")}
              disabled={checkoutLoading === "50"}
            >
              Koop
            </button>
          </div>
          <div style={styles.optionRow}>
            <span>100 coins — EUR 40,00</span>
            <button
              onClick={() => startCheckout("100")}
              disabled={checkoutLoading === "100"}
            >
              Koop
            </button>
          </div>
          {checkoutError && <p style={styles.error}>{checkoutError}</p>}
        </div>
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
    backgroundColor: "#F6F3EE",
  },
  card: {
    width: 520,
    padding: 32,
    background: "#FFFFFF",
    borderRadius: 12,
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  },
  section: {
    marginTop: 24,
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
  note: {
    color: "#555",
  },
  lock: {
    color: "#A33",
  },
  success: {
    color: "#2f6a2f",
  },
  error: {
    color: "#A33",
  },
};
