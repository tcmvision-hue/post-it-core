import { useEffect } from "react";
import { primaryHomeButtonStyle } from "./sharedStyles";
import { useI18n } from "../../i18n/I18nContext";
import VideoBackground from "../../components/VideoBackground";
import { VIDEO_BG } from "./VideoBackgrounds";

export default function Explanation({ onContinue }) {
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

  // Zelfde layout als Welcome, strandfoto als achtergrond
  const styles = {
    card: {
      padding: 32,
      borderRadius: 18,
      border: "3px solid #145C63",
      background: "rgba(250,250,248,0.50)",
      textAlign: "center",
      boxSizing: "border-box",
      boxShadow: "0 2px 12px 0 rgba(60,60,40,0.04)",
      maxWidth: 340,
      width: "90vw",
      margin: 0,
      position: "fixed",
      left: "50%",
      transform: "translateX(-50%)",
      bottom: "calc(24px + 1.5cm)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    }
  ,
    button: primaryHomeButtonStyle
  };
  return (
    <>
      <VideoBackground
        fallbackSrc={VIDEO_BG.intro.fallback}
        alt="Strand, daglicht"
        overlayOpacity={0.34}
        showFallback={true}
      />
      {/* Logo bovenaan op vaste positie, exact als Welcome */}
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
        overflow: "clip",
        margin: 0,
        padding: 0,
        position: "relative"
      }}>
        {/* Kaart met onderzijde op dezelfde vaste positie als Welcome */}
        <div style={styles.card}>
          <h1 style={{ marginTop: 0, marginBottom: 10, textAlign: "center" }}>{t("explanation.title")}</h1>
          <div style={{ marginTop: 12, marginBottom: 14, lineHeight: 1.45, textAlign: "center" }}>
            <div>{t("explanation.line1")}</div>
            <div>{t("explanation.line2")}</div>
            <div>{t("explanation.line3")}</div>
            <div>{t("explanation.line4")}</div>
          </div>
          <button style={styles.button} onClick={onContinue}>{t("common.next")}</button>
        </div>
      </div>
    </>
  );
}
