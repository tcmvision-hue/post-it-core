import { useEffect, useMemo, useState } from "react";
import { getUser } from "../../utils/user";
import { apiFetch } from "../../utils/api";
import { primaryHomeButtonStyle } from "./sharedStyles";
import { useI18n } from "../../i18n/I18nContext";

export default function SelectPost({ posts, onSelect, confirmError, onRegenerate }) {
  const { t } = useI18n();

  const [coins, setCoins] = useState(0);
  const [daySlotUsed, setDaySlotUsed] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [backgroundImageOk, setBackgroundImageOk] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      setStatusError("");
      try {
        const user = getUser();
        const res = await apiFetch("/api/phase4/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (!cancelled) setStatusError(data?.error || t("select.error.status"));
          return;
        }
        if (cancelled) return;
        setCoins(Number(data?.coins) || 0);
        setDaySlotUsed(Boolean(data?.daySlotUsed));
      } catch {
        if (!cancelled) setStatusError(t("select.error.status"));
      }
    }

    loadStatus();
    return () => {
      cancelled = true;
    };
  }, [t]);

  function preventCopy(event) {
    event.preventDefault();
  }

  const cardPosts = useMemo(
    () => (Array.isArray(posts) ? posts : []).slice(0, 3),
    [posts]
  );

  if (cardPosts.length === 0) {
    return null;
  }

  function getCardCost(post, index) {
    if (!daySlotUsed && (post?.kind === "official" || index === 0)) {
      return 0;
    }
    return 1;
  }

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "#145C63",
          backgroundImage:
            "linear-gradient(160deg, #145C63 0%, #48B7B4 52%, #FAFAF8 100%)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      {backgroundImageOk && (
        <img
          src="/video/intro-beach.jpg"
          alt="Strand, daglicht"
          onError={() => setBackgroundImageOk(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            objectFit: "cover",
            zIndex: 0,
            pointerEvents: "none",
          }}
        />
      )}

      <div style={styles.wrapper}>
        <div style={styles.scrollContent}>
          <div style={styles.logoWrap}>
            <img src="/video/logo.png" alt="POST THIS logo" style={styles.logo} />
          </div>

          <div style={styles.cardsColumn}>
          {(confirmError || statusError) && (
            <div style={styles.statusCard}>
              <p style={{ margin: 0, color: "#A33" }}>{confirmError || statusError}</p>
            </div>
          )}

          {cardPosts.map((post, index) => {
            const cost = getCardCost(post, index);
            const insufficient = cost > 0 && coins < cost;

            return (
              <div key={index} style={styles.card}>
                {insufficient && (
                  <p style={styles.lockText}>{t("select.lock")}</p>
                )}

                <div style={styles.textBox}>
                  <p
                    style={{
                      whiteSpace: "pre-wrap",
                      marginTop: 0,
                      marginBottom: 0,
                      lineHeight: 1.45,
                      userSelect: "none",
                      wordBreak: "break-word",
                      overflowWrap: "anywhere",
                    }}
                    onCopy={preventCopy}
                  >
                    {post?.text || ""}
                  </p>
                </div>

                <button
                  onClick={() => onSelect(post)}
                  disabled={insufficient}
                  style={{
                    ...primaryHomeButtonStyle,
                    marginTop: 12,
                    opacity: insufficient ? 0.55 : 1,
                    cursor: insufficient ? "not-allowed" : "pointer",
                  }}
                >
                  {t("select.choose")}
                </button>
              </div>
            );
          })}

          <div style={styles.statusCard}>
            <button
              onClick={onRegenerate}
              style={{
                ...primaryHomeButtonStyle,
                width: "100%",
                marginTop: 0,
              }}
            >
              {t("generation.regenerate")}
            </button>
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
    overflowY: "auto",
    overflowX: "hidden",
    position: "relative",
    zIndex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    boxSizing: "border-box",
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
  statusCard: {
    border: "3px solid #145C63",
    borderRadius: 18,
    background: "rgba(250,250,248,0.50)",
    padding: 12,
    boxSizing: "border-box",
  },
  card: {
    border: "3px solid #145C63",
    borderRadius: 18,
    background: "rgba(250,250,248,0.50)",
    boxShadow: "0 2px 12px 0 rgba(60,60,40,0.04)",
    padding: 12,
    boxSizing: "border-box",
  },
  textBox: {
    background: "rgba(255,255,255,0.82)",
    border: "1px solid #d8d8d8",
    borderRadius: 8,
    padding: 10,
    maxHeight: 170,
    overflowY: "auto",
    overflowX: "hidden",
    boxSizing: "border-box",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
  },
  lockText: {
    marginTop: 0,
    marginBottom: 6,
    color: "#A33",
  },
};
