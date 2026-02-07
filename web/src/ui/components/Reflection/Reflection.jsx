import { useEffect, useState } from "react";
import {
  REFLECTION_FRAMES,
  REFLECTION_LOGO,
} from "./reflectionAssets";

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
  const [frameIndex, setFrameIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [logoVisible, setLogoVisible] = useState(false);

  const frameCount = REFLECTION_FRAMES.length;
  const playDuration = MIN_STEPS * FRAME_DURATION;

  useEffect(() => {
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
        pointerEvents: "none",
        backgroundColor: fadingOut ? "rgba(255,255,255,0)" : "rgba(255,255,255,0.98)",
        opacity: visible ? (fadingOut ? 0 : 1) : 0,
        transition: `opacity ${fadingOut ? FADE_OUT_DURATION : FADE_IN_DURATION}ms cubic-bezier(0.7, 0.2, 0.2, 1)`,
        boxShadow: "0 0 80px 0 rgba(0,0,0,0.12)",
      }}
    >
      {/* Frames */}
      <img
        src={REFLECTION_FRAMES[frameIndex]}
        alt=""
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "50% 0%",
          filter: "blur(0.5px) brightness(1.04)",
          transition: "filter 600ms cubic-bezier(0.7,0.2,0.2,1)",
        }}
      />

      {/* Logo */}
      <img
        src={REFLECTION_LOGO}
        alt="Logo"
        style={{
          position: "absolute",
          left: "6%",
          top: "38%",
          width: "420px",
          opacity: logoVisible ? 1 : 0,
          transition: `opacity ${FADE_IN_DURATION}ms cubic-bezier(0.7,0.2,0.2,1)`,
          filter: logoVisible ? "drop-shadow(0 2px 16px rgba(0,0,0,0.10))" : "none",
        }}
      />
    </div>
  );
}
