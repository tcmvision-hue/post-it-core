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

export default function Phase4Options({
  post,
  activePostId,
  hashtags,
  onVariantAdd,
  onHashtagsUpdate,
  onBack,
}) {
  const { t } = useI18n();
  const [error, setError] = useState("");
  const [action, setAction] = useState("");
  const [loadingKey, setLoadingKey] = useState("");
  const [tone, setTone] = useState("");
  const [coins, setCoins] = useState(null);
  const [statusConfirmedPostId, setStatusConfirmedPostId] = useState("");
  const [outputLanguage, setOutputLanguage] = useState("en");
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState("");

  function createActionId(prefix) {
    return `${prefix}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 10)}`;
  }

  function savePackagesReturnContext() {
    if (typeof window === "undefined") return;
    if (!post || typeof post !== "string") return;
    const selectedHashtags = Array.isArray(hashtags)
      ? hashtags.filter((entry) => entry?.selected && entry?.tag).map((entry) => entry.tag)
      : [];
    try {
      window.sessionStorage.setItem(
        "post_it_packages_return_context",
        JSON.stringify({
          post,
          hashtags: selectedHashtags,
          createdAt: Date.now(),
        })
      );
    } catch {
      // ignore storage errors
    }
  }

  const outputLanguageOptions = [
    { value: "nl", label: t("generation.lang.nl") },
    { value: "en", label: t("generation.lang.en") },
    { value: "pl", label: t("generation.lang.pl") },
    { value: "es", label: t("generation.lang.es") },
    { value: "fr", label: t("generation.lang.fr") },
    { value: "de", label: t("generation.lang.de") },
    { value: "pt", label: t("generation.lang.pt") },
    { value: "it", label: t("generation.lang.it") },
    { value: "ar", label: t("generation.lang.ar") },
    { value: "zh", label: t("generation.lang.zh") },
    { value: "ja", label: t("generation.lang.ja") },
    { value: "he", label: t("generation.lang.he") },
    { value: "af", label: t("generation.lang.af") },
    { value: "sw", label: t("generation.lang.sw") },
    { value: "am", label: t("generation.lang.am") },
    { value: "ha", label: t("generation.lang.ha") },
    { value: "yo", label: t("generation.lang.yo") },
    { value: "zu", label: t("generation.lang.zu") },
    { value: "srn-nl", label: t("generation.lang.srn") },
    { value: "straat-nl", label: t("generation.lang.straat") },
  ];

  useEffect(() => {
    loadStatus();
    const intervalId = setInterval(() => {
      loadStatus();
    }, 4000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  async function loadStatus() {
    try {
      const user = getUser();
      const paymentId = getPendingPaymentId();
      const res = await apiFetch("/api/phase4/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, paymentId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        setCoins(data?.coins ?? data?.coinsLeft ?? data?.coinsRemaining ?? 0);
        setStatusConfirmedPostId(String(data?.confirmedPostId || ""));
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

  async function applyOption(optionKey) {
    if (loadingKey) return;
    setError("");
    setAction("");
    setLoadingKey(optionKey);
    try {
      if (!post) {
        setError(t("phase4.error.missingPost"));
        return;
      }

      const effectiveActivePostId = String(activePostId || statusConfirmedPostId || "");
      if (!effectiveActivePostId) {
        setError(t("phase4.error.missingPost"));
        return;
      }

      if (optionKey === "tone" && !tone.trim()) {
        setError(t("phase4.error.tone"));
        return;
      }

      if (optionKey === "language" && !outputLanguage) {
        setError(t("phase4.error.language"));
        return;
      }

      const user = getUser();
      const actionId = createActionId(`option-${optionKey}`);
      const res = await apiFetch("/api/phase4/option", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          postId: effectiveActivePostId,
          optionKey,
          post,
          tone: optionKey === "tone" ? tone : undefined,
          targetLanguage: optionKey === "language" ? outputLanguage : undefined,
          actionId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        const reason = t(formatReason(data.debitedFor));
        const cost = data.cost ?? 0;
        const coinsLeft = data.coinsLeft ?? 0;
        setAction(`${t("phase4.action.success", { cost, reason, coinsLeft })} ${t("phase4.action.backHint")}`);
        setCoins(coinsLeft);
        if (data.post) {
          const selectedLangLabel =
            outputLanguageOptions.find((entry) => entry.value === outputLanguage)?.label || outputLanguage;
          const label = optionKey === "tone"
            ? `${t("phase4.variant.tonePrefix")}: ${tone.trim()}`
            : optionKey === "language"
              ? `${t("phase4.variant.languagePrefix")}: ${selectedLangLabel}`
              : t("phase4.variant.rephrased");
          onVariantAdd({
            text: data.post,
            postId: String(data?.postId || ""),
            label,
            accent: optionKey === "tone" ? tone.trim() : undefined,
            type: optionKey === "tone" ? "tone" : optionKey === "language" ? "language" : "rephrase",
            kind: optionKey === "tone" ? "tone" : optionKey === "language" ? "language" : "rephrase",
          });
        }
        if (Array.isArray(data.hashtags)) {
          onHashtagsUpdate(
            data.hashtags.map((tag) => ({ tag, selected: true }))
          );
        }
      } else {
        if (data?.error === "Insufficient coins") {
          setError(t("coins.note.lock"));
        } else if (
          data?.error === "No confirmed post"
          || data?.error === "Post not confirmed"
          || data?.error === "Post not active"
        ) {
          setError(t("phase4.error.missingPost"));
        } else {
          setError(data?.error || t("phase4.error.action"));
        }
      }
    } catch {
      setError(t("phase4.error.action"));
    } finally {
      setLoadingKey("");
    }
  }

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
          returnTo: "packages",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.checkoutUrl) {
        if (data?.id) {
          setPendingPaymentId(data.id);
        }
        savePackagesReturnContext();
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
      <VideoBackground
        videoSrc={VIDEO_BG.packages.video}
        startAtSeconds={1}
        showFallback={false}
      />

      <div style={styles.wrapper}>
        <div style={styles.scrollContent}>
          <div style={styles.logoWrap}>
            <img src="/video/logo.png" alt="POST THIS logo" style={styles.logo} />
          </div>

          <div style={styles.cardsColumn}>
            <div style={styles.card}>
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>{t("phase4.title")}</h3>
              <div style={styles.row}>
                <strong>{t("phase4.balance")}</strong>
                <span>{coins ?? 0} coins</span>
              </div>
              {action && <p style={styles.success}>{action}</p>}
              {error && <p style={styles.error}>{error}</p>}
            </div>

            <div style={styles.card}>
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>{t("phase4.extra")}</h3>
              <div style={styles.optionRow}>
                <span>{t("phase4.option.tone")}</span>
                <button
                  style={styles.button(loadingKey === "tone" || Number(coins || 0) < 2)}
                  onClick={() => applyOption("tone")}
                  disabled={loadingKey === "tone" || Number(coins || 0) < 2}
                >
                  {t("phase4.use")}
                </button>
              </div>
              <input
                value={tone}
                onChange={(event) => setTone(event.target.value)}
                placeholder={t("phase4.tonePlaceholder")}
                style={styles.input}
              />
              <div style={styles.optionRow}>
                <span>{t("phase4.option.hashtags")}</span>
                <button
                  style={styles.button(loadingKey === "hashtags" || Number(coins || 0) < 1)}
                  onClick={() => applyOption("hashtags")}
                  disabled={loadingKey === "hashtags" || Number(coins || 0) < 1}
                >
                  {t("phase4.use")}
                </button>
              </div>
              <div style={styles.optionRow}>
                <span>{t("phase4.option.rephrase")}</span>
                <button
                  style={styles.button(loadingKey === "rephrase" || Number(coins || 0) < 1)}
                  onClick={() => applyOption("rephrase")}
                  disabled={loadingKey === "rephrase" || Number(coins || 0) < 1}
                >
                  {t("phase4.use")}
                </button>
              </div>

              <div style={styles.optionRow}>
                <span>{t("phase4.option.language")}</span>
                <button
                  style={styles.button(loadingKey === "language" || Number(coins || 0) < 3)}
                  onClick={() => applyOption("language")}
                  disabled={loadingKey === "language" || Number(coins || 0) < 3}
                >
                  {t("phase4.use")}
                </button>
              </div>
              <select
                value={outputLanguage}
                onChange={(event) => setOutputLanguage(event.target.value)}
                style={styles.input}
              >
                {outputLanguageOptions.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </select>

              <p style={styles.note}>{t("phase4.note")}</p>

              {Array.isArray(hashtags) && hashtags.length > 0 && (
                <p style={styles.note}>
                  {t("phase4.note.hashtags")}
                </p>
              )}
            </div>

            <div style={styles.card}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button style={styles.button(false)} onClick={onBack}>{t("phase4.back")}</button>
              </div>
            </div>

            <div style={styles.card}>
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

function formatReason(key) {
  if (key === "tone") return "phase4.reason.tone";
  if (key === "hashtags") return "phase4.reason.hashtags";
  if (key === "rephrase") return "phase4.reason.rephrase";
  if (key === "language") return "phase4.reason.language";
  return "phase4.reason.default";
}

const styles = {
  logoWrap: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginTop: "-0.8cm",
    marginBottom: "calc(10px + 0.9cm)",
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
    zIndex: 1,
  },
  scrollContent: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: "calc(24px + 1.5cm)",
    boxSizing: "border-box",
  },
  cardsColumn: {
    width: "90vw",
    maxWidth: 340,
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    margin: "0 auto",
  },
  card: {
    border: "3px solid #145C63",
    borderRadius: 18,
    background: "rgba(250,250,248,0.50)",
    boxShadow: "0 2px 12px 0 rgba(60,60,40,0.04)",
    padding: 12,
    boxSizing: "border-box",
  },
  section: {
    marginTop: 10,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 6,
  },
  optionRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 10,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    marginTop: 8,
    padding: "10px",
    borderRadius: 8,
    border: "1px solid #ccc",
  },
  note: {
    marginTop: 8,
    color: "#2A2A2A",
  },
  success: {
    marginTop: 8,
    color: "#2f6a2f",
  },
  error: {
    marginTop: 8,
    marginBottom: 0,
    color: "#A33",
  },
  button: (disabled) => ({
    ...primaryHomeButtonStyle,
    marginTop: 0,
    fontSize: 15,
    padding: "9px 14px",
    opacity: disabled ? 0.55 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  }),
};
