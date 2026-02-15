import { useEffect, useState } from "react";
import {
  clearPendingPaymentId,
  getPendingPaymentId,
  getUser,
  setPendingPaymentId,
} from "../../utils/user";
import { apiFetch } from "../../utils/api";
import VideoBackground from "../../components/VideoBackground";
import { VIDEO_BG } from "./VideoBackgrounds";
import { primaryHomeButtonStyle } from "./sharedStyles";
import { useI18n } from "../../i18n/I18nContext";

export default function CoinsGate({ onStart }) {
  const { t } = useI18n();
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
      const paymentId = getPendingPaymentId();
      const res = await apiFetch("/api/phase4/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, paymentId }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus(data);
        if (data?.paymentReconciled) {
          clearPendingPaymentId();
        }
      } else {
        setError(data?.error || t("coins.error.status"));
      }
    } catch {
      setError(t("coins.error.status"));
    }
  }

  async function startCycle() {
    if (!status) return false;
    setLoading(true);
    setError("");
    setAction("");
    try {
      const user = getUser();
      const res = await apiFetch("/api/phase4/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (res.ok && data?.ok) {
        const costToStart = data.costToStart ?? 0;
        if (costToStart === 0) {
          setAction(t("coins.action.free"));
        } else {
          setAction(t("coins.action.paid"));
        }
        return true;
      } else {
        setError(data?.error || t("coins.error.start"));
        await loadStatus();
      }
    } catch {
      setError(t("coins.error.start"));
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
      const res = await apiFetch("/api/phase4/checkout", {
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
        if (data?.id) {
          setPendingPaymentId(data.id);
        }
        window.location.href = data.checkoutUrl;
      } else {
        setCheckoutError(data?.error || t("coins.error.checkout"));
      }
    } catch {
      setCheckoutError(t("coins.error.checkout"));
    } finally {
      setCheckoutLoading("");
    }
  }

  return (
    <>
      <VideoBackground videoSrc={VIDEO_BG.coins.video} startAtSeconds={1} />
      <div style={styles.wrapper}>
        <div style={styles.scrollContent}>
        <div style={styles.logoWrap}>
          <img
            src="/video/logo.png"
            alt="POST THIS logo"
            style={styles.logo}
          />
        </div>
        <div style={styles.card}>
          <h2 style={{ marginTop: 0, marginBottom: 10 }}>{t("coins.title")}</h2>

          {error && <p style={styles.error}>{error}</p>}
          {action && <p style={styles.success}>{action}</p>}

          <div style={styles.row}>
            <strong>{t("coins.balance")}</strong>
            <span>{coins} coins</span>
          </div>

          <div style={styles.row}>
            <strong>{t("coins.nextPost")}</strong>
            <span>Post {postNumNext}</span>
          </div>

          <div style={styles.row}>
            <strong>{t("coins.startCost")}</strong>
            <span>{costToStart} coin</span>
          </div>

          <div style={{ marginTop: 12 }}>
            {!daySlotUsed && (
              <p style={styles.note}>{t("coins.note.free")}</p>
            )}
            {daySlotUsed && (
              <p style={styles.note}>
                {t("coins.note.paid")}
              </p>
            )}
            {insufficient && (
              <p style={styles.lock}>{t("coins.note.lock")}</p>
            )}
          </div>

          <button
            style={styles.button(loading || insufficient)}
            onClick={startAndContinue}
            disabled={loading || insufficient}
          >
            {t("coins.start")}
          </button>

          <div style={styles.section}>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>{t("coins.buy")}</h3>
            <div style={styles.optionRow}>
              <span>20 coins — EUR 10,00</span>
              <button
                style={styles.button(checkoutLoading === "20")}
                onClick={() => startCheckout("20")}
                disabled={checkoutLoading === "20"}
              >
                {t("coins.buyBtn")}
              </button>
            </div>
            <div style={styles.optionRow}>
              <span>50 coins — EUR 22,50</span>
              <button
                style={styles.button(checkoutLoading === "50")}
                onClick={() => startCheckout("50")}
                disabled={checkoutLoading === "50"}
              >
                {t("coins.buyBtn")}
              </button>
            </div>
            <div style={styles.optionRow}>
              <span>100 coins — EUR 40,00</span>
              <button
                style={styles.button(checkoutLoading === "100")}
                onClick={() => startCheckout("100")}
                disabled={checkoutLoading === "100"}
              >
                {t("coins.buyBtn")}
              </button>
            </div>
            {checkoutError && <p style={styles.error}>{checkoutError}</p>}
          </div>
        </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  logoWrap: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginTop: "max(12px, env(safe-area-inset-top))",
    marginBottom: 20,
    pointerEvents: "none",
  },
  logo: {
    maxWidth: "min(430px, 96vw)",
    width: "96vw",
    height: "auto",
    objectFit: "contain",
    display: "block",
    background: "none",
    boxShadow: "none",
    marginLeft: "auto",
    marginRight: "auto",
    marginTop: 0,
    marginBottom: 0,
  },
  wrapper: {
    width: "100vw",
    height: "100dvh",
    minHeight: "100dvh",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    position: "relative",
    overflowY: "auto",
    overflowX: "hidden",
    WebkitOverflowScrolling: "touch",
    zIndex: 1,
  },
  scrollContent: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 18,
    paddingBottom: "calc(24px + 1.5cm)",
    boxSizing: "border-box",
  },
  card: {
    width: "90vw",
    maxWidth: 340,
    padding: 32,
    border: "3px solid #145C63",
    borderRadius: 18,
    background: "rgba(250,250,248,0.50)",
    boxShadow: "0 2px 12px 0 rgba(60,60,40,0.04)",
    textAlign: "center",
    boxSizing: "border-box",
    position: "relative",
    marginTop: 8,
    maxHeight: "calc(100dvh - 240px)",
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
  },
  section: {
    marginTop: 16,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 12,
  },
  optionRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 12,
  },
  note: {
    color: "#2A2A2A",
    margin: 0,
  },
  lock: {
    color: "#A33",
    marginTop: 8,
    marginBottom: 0,
  },
  success: {
    color: "#2f6a2f",
    marginTop: 0,
  },
  error: {
    color: "#A33",
    marginTop: 0,
  },
  button: (disabled) => ({
    ...primaryHomeButtonStyle,
    marginTop: 12,
    opacity: disabled ? 0.55 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  }),
};
