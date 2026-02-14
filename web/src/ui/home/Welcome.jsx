import { useEffect } from "react";
import VideoBackground from "../../components/VideoBackground";
import { VIDEO_BG } from "./VideoBackgrounds";
import { primaryHomeButtonStyle } from "./sharedStyles";
import { useI18n } from "../../i18n/I18nContext";

export default function Welcome({ onContinue }) {
  const { t } = useI18n();
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  return (
    <>
      <VideoBackground
        fallbackSrc={VIDEO_BG.welcome.fallback}
        alt="Groep mensen in ochtendlicht"
        overlayOpacity={0.18}
        mediaFilter="contrast(1.08) saturate(1.08)"
      />
      {/* Logo bovenaan, opnieuw vast gepositioneerd */}
      <div style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "fixed",
        top: "-0.8cm",
        left: 0,
        zIndex: 10,
        pointerEvents: "none"
      }}>
        <img
          src="/video/logo.png"
          alt="POST THIS logo"
          style={{
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
          }}
        />
      </div>
      <div style={{
        width: "100vw",
        height: "100dvh",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        overflow: "clip",
        margin: 0,
        padding: 0,
        position: "relative"
      }}>
        <div
          style={{
            ...styles.card,
            position: "fixed",
            bottom: "calc(24px + 1.5cm)",
            left: "50%",
            transform: "translateX(-50%)",
            marginBottom: 0,
            marginTop: 0,
            maxWidth: 340,
            width: "90vw",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center"
          }}>
          <h1 style={{ marginTop: 0, textAlign: "center" }}>{t("welcome.title")}</h1>
            <div style={{ marginTop: 24, marginBottom: 24, lineHeight: 1.6, textAlign: "center" }}>
              <div>{t("welcome.line1")}</div>
              <div>{t("welcome.line2")}</div>
              <div>{t("welcome.line3")}</div>
            </div>
            <button onClick={onContinue} style={styles.button}>
              {t("common.next")}
            </button>
        </div>
      </div>
    </>
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
    border: "3px solid #145C63",
    borderRadius: 18,
    background: "rgba(250,250,248,0.50)",
    textAlign: "center",
    boxSizing: "border-box",
    boxShadow: "0 2px 12px 0 rgba(60,60,40,0.04)",
  },
  button: primaryHomeButtonStyle,
};
