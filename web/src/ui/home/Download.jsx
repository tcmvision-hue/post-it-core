import { useEffect, useState } from "react";
import logoImage from "../components/Reflection/logo.png";

const BEACH_VIDEO_SRC = "/videos/beach.mp4";

export default function DownloadPage() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installAvailable, setInstallAvailable] = useState(false);
  const [buttonHover, setButtonHover] = useState(false);
  const [showManualSteps, setShowManualSteps] = useState(false);

  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setDeferredPrompt(event);
      setInstallAvailable(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  async function handleInstallClick() {
    if (!deferredPrompt) {
      setShowManualSteps(true);
      return;
    }
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setInstallAvailable(false);
    setShowManualSteps(false);
  }

  return (
    <div style={styles.page}>
      <video
        style={styles.video}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/images/beach.jpg"
      >
        <source src={BEACH_VIDEO_SRC} type="video/mp4" />
      </video>
      <div style={styles.overlay} />

      <div style={styles.card}>
        <div style={styles.fold} aria-hidden="true" />
        <img
          src={logoImage}
          alt="POST THIS logo"
          style={styles.logo}
        />
        <h1 style={styles.title}>POST THIS</h1>
        <p style={styles.subtitle}>
          Installeer POST THIS als app op je telefoon of desktop.
        </p>
        <button
          type="button"
          style={{
            ...styles.button,
            backgroundColor: buttonHover ? "#0D4A52" : "#145C63",
          }}
          onMouseEnter={() => setButtonHover(true)}
          onMouseLeave={() => setButtonHover(false)}
          onClick={handleInstallClick}
        >
          {installAvailable ? "Download als app" : "Installeer als app"}
        </button>
        {!installAvailable && !showManualSteps && (
          <p style={styles.hint}>
            Als de knop niet direct installeert: open browsermenu en kies "Toevoegen aan startscherm".
          </p>
        )}
        {showManualSteps && (
          <p style={styles.hint}>
            iPhone: Deel-knop → "Zet op beginscherm". Android: menu (⋮) → "App installeren" of "Toevoegen aan startscherm".
          </p>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    position: "relative",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(180deg, #0F4C5C 0%, #145C63 55%, #1B6C74 100%)",
    overflow: "hidden",
    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  },
  video: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    zIndex: 0,
  },
  overlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(5, 24, 28, 0.42)",
    zIndex: 1,
  },
  card: {
    position: "relative",
    zIndex: 2,
    maxWidth: 520,
    width: "calc(100% - 48px)",
    padding: "56px 48px",
    background: "#FFFFFF",
    borderRadius: 18,
    boxShadow: "0 18px 45px rgba(11, 58, 64, 0.18)",
    textAlign: "center",
    border: "1px solid rgba(20, 92, 99, 0.28)",
  },
  fold: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 48,
    height: 48,
    background: "#8FBFC5",
    borderTopRightRadius: 18,
    clipPath: "polygon(0 0, 100% 0, 100% 100%)",
  },
  logo: {
    width: 92,
    height: 92,
    objectFit: "contain",
    margin: "0 auto 18px",
    borderRadius: 20,
    background: "#FFFFFF",
    padding: 10,
    boxShadow: "0 8px 18px rgba(11, 58, 64, 0.22)",
  },
  title: {
    margin: "0 0 20px",
    fontSize: 34,
    fontWeight: 600,
    color: "#145C63",
    letterSpacing: "0.02em",
  },
  subtitle: {
    margin: "0 auto 32px",
    maxWidth: 480,
    fontSize: 18,
    lineHeight: 1.6,
    color: "#174F56",
  },
  button: {
    padding: "12px 26px",
    borderRadius: 12,
    border: "none",
    fontSize: 16,
    fontWeight: 600,
    color: "#F3F9F9",
    cursor: "pointer",
  },
  hint: {
    margin: "20px auto 0",
    maxWidth: 420,
    fontSize: 14,
    lineHeight: 1.6,
    color: "#174F56",
  },
};
