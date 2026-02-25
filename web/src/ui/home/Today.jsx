import { useEffect } from "react";
import VideoBackground from "../../components/VideoBackground";
import { VIDEO_BG } from "./VideoBackgrounds";
import { useI18n } from "../../i18n/I18nContext";

export default function Today({ onContinue }) {
  const { t } = useI18n();
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const timer = setTimeout(() => {
      if (typeof onContinue === "function") {
        onContinue();
      }
    }, 4000);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [onContinue]);

  return (
    <>
      <VideoBackground
        videoSrc={VIDEO_BG.today.video}
        startAtSeconds={1}
        showFallback={false}
      />
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
      <div
        style={{
          width: "90vw",
          maxWidth: 340,
          padding: 32,
          border: "3px solid #145C63",
          borderRadius: 18,
          background: "rgba(250,250,248,0.50)",
          textAlign: "center",
          boxSizing: "border-box",
          boxShadow: "0 2px 12px 0 rgba(60,60,40,0.04)",
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: "calc(24px + 1.5cm)",
          zIndex: 2,
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 10 }}>{t("today.title")}</h2>
        <p style={{ marginTop: 12, marginBottom: 0, lineHeight: 1.45 }}>
          {t("today.line")}
        </p>
      </div>
    </>
  );
}
