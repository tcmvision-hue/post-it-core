import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/I18nContext";

const HOLD_MS = 5000;
const FADE_MS = 900;

export default function Finished({ onDone }) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [backgroundVideoOk, setBackgroundVideoOk] = useState(true);

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 20);
    const fadeTimer = setTimeout(() => setFadingOut(true), HOLD_MS);
    const doneTimer = setTimeout(() => {
      if (typeof onDone === "function") onDone();
    }, HOLD_MS + FADE_MS);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        opacity: visible ? (fadingOut ? 0 : 1) : 0,
        transition: `opacity ${FADE_MS}ms ease`,
      }}
    >
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
      {backgroundVideoOk && (
        <video
          src="/video/bedankt-beach.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          onError={() => setBackgroundVideoOk(false)}
          style={{
            position: "fixed",
            top: "-6vh",
            left: 0,
            width: "100vw",
            height: "112vh",
            objectFit: "cover",
            objectPosition: "center top",
            zIndex: 0,
            pointerEvents: "none",
          }}
        />
      )}

      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          position: "fixed",
          top: "-0.8cm",
          left: 0,
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
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
          padding: 28,
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
        <p style={{ marginTop: 0, marginBottom: 10, lineHeight: 1.45 }}>
          {t("finished.thanks")}
        </p>
        <p style={{ marginTop: 8, marginBottom: 0, lineHeight: 1.45 }}>
          {t("finished.line")}
        </p>
      </div>
    </div>
  );
}
