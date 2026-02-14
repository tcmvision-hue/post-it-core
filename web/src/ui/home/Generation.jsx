import { useEffect, useState } from "react";
import { apiFetch } from "../../utils/api";
import { getUser } from "../../utils/user";
import VideoBackground from "../../components/VideoBackground";
import { VIDEO_BG } from "./VideoBackgrounds";
import { primaryHomeButtonStyle } from "./sharedStyles";
import { useI18n } from "../../i18n/I18nContext";

export default function Generation({
  kladblok,
  doelgroep,
  intentie,
  waaromNu,
  generations,
  confirmError,
  onGenerate,
  onConfirm,
  onReview,
}) {
  const { t } = useI18n();
  const MAX_GENERATIONS = 3;
  const [loading, setLoading] = useState(false);
  const [keywords, setKeywords] = useState("");
  const [error, setError] = useState("");

  const generationCount = generations.length;
  const currentPost = generations[generationCount - 1] ?? null;
  const currentText = currentPost?.text || "";
  const currentLabel = currentPost?.label || "";
  const isLast = generationCount >= MAX_GENERATIONS;

  // Auto-start eerste generatie
  useEffect(() => {
    if (generationCount === 0) runGeneration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runGeneration() {
    if (loading || isLast) return;
    setLoading(true);
    setError("");

    try {
      const user = getUser();
      const res = await apiFetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          kladblok,
          doelgroep,
          intentie,
          context: waaromNu,
          keywords: keywords || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data?.post) {
        onGenerate({
          text: data.post,
          label: keywords.trim(),
          accent: keywords.trim(),
          kind: generationCount === 0 ? "official" : "generation",
        });
      } else {
        setError(data?.error || t("generation.error"));
      }
    } finally {
      setLoading(false);
    }
  }

  // =======================
  // GENERATION
  // =======================
  function preventCopy(event) {
    event.preventDefault();
  }

  return (
    <>
      <VideoBackground videoSrc={VIDEO_BG.generation.video} startAtSeconds={1} />
      <div style={styles.logoWrap}>
        <img src="/video/logo.png" alt="POST THIS logo" style={styles.logo} />
      </div>

      <div style={styles.wrapper}>
        <div style={styles.card}>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>
            {t("generation.title", {
              current: Math.max(1, generationCount),
              max: MAX_GENERATIONS,
            })}
          </h2>

          {confirmError && (
            <p style={{ color: "#A33", marginTop: 8 }}>{confirmError}</p>
          )}
          {error && <p style={{ color: "#A33", marginTop: 8 }}>{error}</p>}

          <input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder={t("generation.placeholder")}
            style={styles.input}
          />

          {currentLabel && (
            <p style={{ color: "#2A2A2A", marginTop: 0, marginBottom: 8 }}>
              {t("generation.label")} {currentLabel}
            </p>
          )}

          <div style={styles.postBox}>
            <p
              style={{
                whiteSpace: "pre-wrap",
                opacity: loading ? 0.4 : 1,
                userSelect: "none",
                margin: 0,
                lineHeight: 1.4,
              }}
              onCopy={preventCopy}
            >
              {currentText || t("intake.processing")}
            </p>
          </div>

          {loading && currentPost && <p style={{ marginTop: 10 }}>{t("generation.loading")}</p>}

          <div style={styles.actions}>
            {currentPost && !isLast && (
              <button style={styles.button(loading)} onClick={runGeneration} disabled={loading}>
                {t("generation.regenerate")}
              </button>
            )}

            {currentPost && generationCount > 0 && (
              <button
                style={styles.button(loading)}
                onClick={() => onConfirm(currentPost)}
                disabled={loading}
              >
                {t("common.confirm")}
              </button>
            )}

            {currentPost && isLast && (
              <button style={styles.button(loading)} onClick={onReview} disabled={loading}>
                {t("generation.select")}
              </button>
            )}
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
    position: "fixed",
    top: "-0.8cm",
    left: 0,
    zIndex: 10,
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
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    zIndex: 1,
    overflow: "hidden",
  },
  card: {
    width: "90vw",
    maxWidth: 340,
    padding: 24,
    border: "3px solid #145C63",
    borderRadius: 18,
    background: "rgba(250,250,248,0.50)",
    boxShadow: "0 2px 12px 0 rgba(60,60,40,0.04)",
    textAlign: "left",
    boxSizing: "border-box",
    position: "fixed",
    left: "50%",
    transform: "translateX(-50%)",
    bottom: "calc(24px + 1.5cm)",
    maxHeight: "calc(100dvh - 150px)",
    overflowY: "auto",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: 10,
    border: "1px solid #ccc",
    borderRadius: 8,
    marginBottom: 12,
    fontFamily: "inherit",
  },
  postBox: {
    background: "rgba(255,255,255,0.85)",
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: 10,
    maxHeight: 180,
    overflowY: "auto",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  button: (disabled) => ({
    ...primaryHomeButtonStyle,
    marginTop: 0,
    fontSize: 16,
    padding: "10px 18px",
    opacity: disabled ? 0.55 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  }),
};
