import { useEffect, useMemo, useState } from "react";
import logoUrl from "../components/Reflection/logo.png";

function getPlatformInfo() {
  if (typeof window === "undefined") {
    return { isIos: false, isSafari: false, isStandalone: false };
  }

  const ua = window.navigator.userAgent || "";
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isSafari =
    /safari/i.test(ua) &&
    !/crios|fxios|edgios|chrome|android/i.test(ua);
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true;

  return { isIos, isSafari, isStandalone };
}

export default function Download() {
  const platform = useMemo(() => getPlatformInfo(), []);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isInstalled, setIsInstalled] = useState(platform.isStandalone);

  useEffect(() => {
    function handleBeforeInstall(event) {
      event.preventDefault();
      setInstallPrompt(event);
    }

    function handleInstalled() {
      setIsInstalled(true);
      setFeedback("POST THIS staat klaar op je startscherm.");
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function handleInstall() {
    setFeedback("");

    if (isInstalled) {
      setFeedback("POST THIS staat al op dit apparaat.");
      return;
    }

    if (platform.isIos && platform.isSafari) {
      setShowIosGuide(true);
      return;
    }

    if (installPrompt) {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setInstallPrompt(null);
      if (choice?.outcome === "accepted") {
        setFeedback("Installatie gestart.");
      } else {
        setFeedback("Installatie geannuleerd.");
      }
      return;
    }

    setFeedback("Kies 'Installeren' in het menu van je toestel.");
  }

  return (
    <div className="download-page">
      <div className="download-shell">
        <div className="download-card">
          <div className="download-badge">Download</div>
          <img
            className="download-logo"
            src={logoUrl}
            alt="POST THIS logo"
          />
          <h1 className="download-title">POST THIS</h1>
          <p className="download-subtitle">
            Installeer Post This als app op je telefoon of desktop.
          </p>

          <div className="download-actions">
            <button
              className="download-button"
              type="button"
              onClick={handleInstall}
            >
              Download POST THIS
            </button>
          </div>

          {showIosGuide && (
            <div className="download-help">
              Tik op Deel -&gt; Zet op beginscherm.
            </div>
          )}

          {feedback && <div className="download-feedback">{feedback}</div>}

          <div className="download-footnote">
            Altijd in eigen beheer, altijd jouw app.
          </div>
        </div>
      </div>
    </div>
  );
}
