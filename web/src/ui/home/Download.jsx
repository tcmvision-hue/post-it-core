import { useEffect, useState } from "react";

const BEACH_VIDEO_SRC = "/videos/beach.mp4";

export default function DownloadPage() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installAvailable, setInstallAvailable] = useState(false);
  const [buttonHover, setButtonHover] = useState(false);

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
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setInstallAvailable(false);
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
        <h1 style={styles.title}>POST THIS</h1>
        <p style={styles.subtitle}>
          Installeer POST THIS als app op je telefoon of desktop.
        </p>
        <button
          type="button"
          style={{
            ...styles.button,
            backgroundColor: buttonHover ? "#0f4c5c" : "#145C63",
          }}
          onMouseEnter={() => setButtonHover(true)}
          onMouseLeave={() => setButtonHover(false)}
          onClick={handleInstallClick}
          disabled={!installAvailable}
        >
          Download als app
        </button>
        {!installAvailable && (
          <p style={styles.hint}>
            Open het browsermenu en kies "Toevoegen aan startscherm".
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
    background: "linear-gradient(180deg, #e8ecea 0%, #f7f7f5 100%)",
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
    background: "rgba(255, 255, 255, 0.65)",
    zIndex: 1,
  },
  card: {
    position: "relative",
    zIndex: 2,
    maxWidth: 520,
    width: "calc(100% - 48px)",
    padding: "56px 48px",
    background: "#F7F7F5",
    borderRadius: 18,
    boxShadow: "0 18px 45px rgba(26, 34, 36, 0.12)",
    textAlign: "center",
  },
  fold: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 48,
    height: 48,
    background: "#e6e3dc",
    borderTopRightRadius: 18,
    clipPath: "polygon(0 0, 100% 0, 100% 100%)",
  },
  title: {
    margin: "0 0 20px",
    fontSize: 34,
    fontWeight: 500,
    color: "#1E1E1E",
    letterSpacing: "0.02em",
  },
  subtitle: {
    margin: "0 auto 32px",
    maxWidth: 480,
    fontSize: 18,
    lineHeight: 1.6,
    color: "#8A8A8A",
  },
  button: {
    padding: "12px 26px",
    borderRadius: 12,
    border: "none",
    fontSize: 16,
    fontWeight: 500,
    color: "#F7F7F5",
    cursor: "pointer",
  },
  hint: {
    margin: "20px auto 0",
    maxWidth: 420,
    fontSize: 14,
    lineHeight: 1.6,
    color: "#8A8A8A",
  },
};
