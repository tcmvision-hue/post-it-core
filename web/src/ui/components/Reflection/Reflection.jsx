import { useEffect, useState } from "react";
import {
  REFLECTION_FRAMES,
  REFLECTION_LOGO,
} from "./reflectionAssets";
import { useI18n } from "../../../i18n/I18nContext";

/*
  CANON REFLECTION
  - Overlay boven Generation
  - Fade-in direct
  - Fade-out start = signaal aan App
  - Unmount NA fade-out
*/

const FRAME_DURATION = 320;
const MIN_STEPS = 7;
const FADE_IN_DURATION = 1200;
const FADE_OUT_DURATION = 1500;
const LOGO_DELAY = FRAME_DURATION * 2;

export default function Reflection({ onFadeOutStart, onDone }) {
  const { t } = useI18n();
  const [frameIndex, setFrameIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [logoVisible, setLogoVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const frameCount = REFLECTION_FRAMES.length;
  const playDuration = MIN_STEPS * FRAME_DURATION;

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const updateIsMobile = () => setIsMobile(media.matches);
    updateIsMobile();
    if (media.addEventListener) {
      media.addEventListener("change", updateIsMobile);
    } else {
      media.addListener(updateIsMobile);
    }

    // Fade-in
    const fadeInTimer = setTimeout(() => {
      setVisible(true);
    }, 40);

    // Logo later
    const logoTimer = setTimeout(() => {
      setLogoVisible(true);
    }, LOGO_DELAY);

    // Frames
    let steps = 0;
    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % frameCount);
      steps++;
      if (steps >= MIN_STEPS) clearInterval(interval);
    }, FRAME_DURATION);

    // Fade-out start
    const fadeOutTimer = setTimeout(() => {
      setFadingOut(true);
      onFadeOutStart && onFadeOutStart(); // ⬅️ CRUCIAAL
    }, playDuration);

    // Einde (na fade-out)
    const doneTimer = setTimeout(() => {
      onDone && onDone();
    }, playDuration + FADE_OUT_DURATION);

    return () => {
      if (media.removeEventListener) {
        media.removeEventListener("change", updateIsMobile);
      } else {
        media.removeListener(updateIsMobile);
      }
      clearTimeout(fadeInTimer);
      clearTimeout(logoTimer);
      clearTimeout(fadeOutTimer);
      clearTimeout(doneTimer);
      clearInterval(interval);
    };
  }, [onFadeOutStart, onDone, frameCount, playDuration]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        isolation: "isolate",
        pointerEvents: "none",
        backgroundColor: "transparent",
        opacity: visible ? (fadingOut ? 0 : 1) : 0,
        transition: `opacity ${fadingOut ? FADE_OUT_DURATION : FADE_IN_DURATION}ms cubic-bezier(0.7, 0.2, 0.2, 1)`,
        boxShadow: "none",
      }}
    >
      <div
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <img
          src={REFLECTION_FRAMES[frameIndex]}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: isMobile ? "50% 10%" : "50% 4%",
            filter: "brightness(1.02)",
            transition: "filter 600ms cubic-bezier(0.7,0.2,0.2,1)",
          }}
        />
      </div>

      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          position: "fixed",
          top: "-1.5cm",
          left: 0,
          zIndex: 10,
          pointerEvents: "none",
          opacity: logoVisible ? 1 : 0,
          transition: `opacity ${FADE_IN_DURATION}ms cubic-bezier(0.7,0.2,0.2,1)`,
        }}
      >
        <img
          src={REFLECTION_LOGO}
          alt="POST THIS logo"
          style={{
            maxWidth: "min(390px, 90vw)",
            width: "90vw",
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
          zIndex: 12,
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 10 }}>{t("reflection.title")}</h2>
        <p style={{ marginTop: 10, marginBottom: 0, lineHeight: 1.45 }}>
          {t("reflection.text")}
        </p>
      </div>
    </div>
  );
}
