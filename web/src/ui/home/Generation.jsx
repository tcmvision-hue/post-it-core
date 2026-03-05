import { useEffect, useState } from "react";
import { apiFetch } from "../../utils/api";
import { getUser } from "../../utils/user";
import VideoBackground from "../../components/VideoBackground";
import { VIDEO_BG } from "./VideoBackgrounds";
import { primaryHomeButtonStyle } from "./sharedStyles";
import { useI18n } from "../../i18n/I18nContext";

export default function Generation({
  cycleId,
  onCycleIdRecovered,
  outputLanguage,
  kladblok,
  doelgroep,
  intentie,
  waaromNu,
  generations,
  confirmError,
  onGenerate,
  onConfirm,
  _onReview,
  confirming,
  onServerGenerationSync,
}) {
  void _onReview;
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [keywords, setKeywords] = useState("");
  const [error, setError] = useState("");
  const [serverGenerationCount, setServerGenerationCount] = useState(
    Array.isArray(generations) ? generations.length : 0
  );

  function createActionId(prefix) {
    return `${prefix}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 10)}`;
  }

  const generationCount = generations.length;
  const currentPost = generations[generationCount - 1] ?? null;
  const currentText = currentPost?.text || "";
  const currentLabel = currentPost?.label || "";
  const effectiveGenerationCount = Math.max(serverGenerationCount, generationCount);

  useEffect(() => {
    setServerGenerationCount((previous) => Math.max(previous, generationCount));
  }, [generationCount]);

  // Auto-start eerste generatie
  useEffect(() => {
    if (generationCount === 0) runGeneration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function resolveCycleId(userId) {
    const currentCycleId = String(cycleId || "").trim();
    if (currentCycleId) return currentCycleId;

    try {
      const statusRes = await apiFetch("/api/phase4/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const statusData = await statusRes.json().catch(() => ({}));
      const recoveredCycleId = String(statusData?.cycleId || "").trim();
      if (statusRes.ok && statusData?.ok && recoveredCycleId) {
        onCycleIdRecovered?.(recoveredCycleId);
        return recoveredCycleId;
      }
    } catch {
      // no-op, handled by caller
    }

    return "";
  }

  async function runGeneration() {
    if (loading || confirming) return;
    const user = getUser();
    let statusGenerationCount = effectiveGenerationCount;
    let statusCycleId = "";
    try {
      const statusRes = await apiFetch("/api/phase4/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const statusData = await statusRes.json().catch(() => ({}));
      if (statusRes.ok && statusData?.ok) {
        const syncedCount = Number(statusData?.currentGenerationCount);
        if (Number.isFinite(syncedCount) && syncedCount >= 0) {
          statusGenerationCount = syncedCount;
          setServerGenerationCount(syncedCount);
          onServerGenerationSync?.(syncedCount);
        }
        statusCycleId = String(statusData?.cycleId || "").trim();
      }
    } catch {
      // fallback to local count
    }

    if (statusGenerationCount >= 3) {
      setError("Regenerate limit reached");
      return;
    }

    const activeCycleId = statusCycleId || (await resolveCycleId(user.id));
    if (!activeCycleId) {
      setError("Cycle niet gestart. Start opnieuw.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const actionId = createActionId("generate");
      const res = await apiFetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          cycleId: activeCycleId,
          outputLanguage,
          kladblok,
          doelgroep,
          intentie,
          context: waaromNu,
          keywords: keywords || undefined,
          actionId,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok && data?.post && data?.postId) {
        const nextServerCount = Number(
          data?.currentGenerationCount
          ?? data?.generationIndex
          ?? (statusGenerationCount + 1)
        );
        const normalizedNextCount = Number.isFinite(nextServerCount)
          ? Math.max(0, nextServerCount)
          : statusGenerationCount + 1;
        setServerGenerationCount(normalizedNextCount);
        onServerGenerationSync?.(normalizedNextCount);

        const generatedPost = {
          text: data.post,
          postId: data.postId,
          confirmed: Boolean(data.confirmed),
          coinsRemaining: data.coinsRemaining,
          label: keywords.trim(),
          accent: keywords.trim(),
          kind: statusGenerationCount === 0 ? "official" : "generation",
        };

        onGenerate(generatedPost);

        if (normalizedNextCount >= 3) {
          onConfirm(generatedPost);
        }
      } else {
        setError(data?.error || t("generation.error"));
      }
    } catch {
      setError(t("generation.error"));
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
              current: Math.max(1, effectiveGenerationCount),
              max: 3,
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
            {currentPost && effectiveGenerationCount < 3 && (
              <button
                style={styles.button(loading || confirming)}
                onClick={runGeneration}
                disabled={loading || confirming}
              >
                {t("generation.regenerate")}
              </button>
            )}

            {currentPost && effectiveGenerationCount > 0 && (
              <button
                style={styles.button(loading || confirming)}
                onClick={() => onConfirm(currentPost)}
                disabled={loading || confirming}
              >
                {t("common.confirm")}
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
