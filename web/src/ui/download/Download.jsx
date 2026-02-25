import { useEffect, useMemo, useState } from "react";
import VideoBackground from "../../components/VideoBackground";
import { VIDEO_BG } from "../home/VideoBackgrounds";

function getPlatformInfo() {
  if (typeof window === "undefined") {
    return {
      isIos: false,
      isAndroid: false,
      isMobile: false,
      isSafari: false,
      isStandalone: false,
    };
  }

  const ua = window.navigator.userAgent || "";
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isAndroid = /android/i.test(ua);
  const isMobile = isIos || isAndroid;
  const isSafari =
    /safari/i.test(ua) &&
    !/crios|fxios|edgios|chrome|android/i.test(ua);
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true;

  return { isIos, isAndroid, isMobile, isSafari, isStandalone };
}

export default function Download() {
  const platform = useMemo(() => getPlatformInfo(), []);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [instruction, setInstruction] = useState("");
  const [isInstalled, setIsInstalled] = useState(platform.isStandalone);

  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    function handleBeforeInstall(event) {
      event.preventDefault();
      setInstallPrompt(event);
    }

    function handleInstalled() {
      setIsInstalled(true);
      setInstruction("POST THIS staat klaar op je startscherm.");
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function handleInstall() {
    setInstruction("");

    if (isInstalled) {
      setInstruction("POST THIS staat al op dit apparaat.");
      return;
    }

    if (platform.isIos && platform.isSafari) {
      setInstruction("Tik op Deel en kies ‘Zet op beginscherm’.");
      return;
    }

    if (installPrompt) {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setInstallPrompt(null);
      if (choice?.outcome === "accepted") {
        setInstruction("Installatie gestart.");
      } else {
        setInstruction("Open het browsermenu en kies ‘Installeren’ of ‘Toevoegen aan startscherm’.");
      }
      return;
    }

    setInstruction("Open het browsermenu en kies ‘Installeren’ of ‘Toevoegen aan startscherm’.");
  }

  return (
    <div className="download-page">
      <VideoBackground
        videoSrc={VIDEO_BG.download.video}
        fallbackSrc={VIDEO_BG.download.fallback}
        alt="Strand, daglicht"
        overlayOpacity={0.2}
        startAtSeconds={1}
      />

      <div className="download-content" role="region" aria-label="Installatie">
        <button
          type="button"
          onClick={handleInstall}
          className="download-logo-button"
          aria-label="Installeer POST THIS"
        >
          <div className="download-logo-wrap" aria-hidden="true">
            <img src="/video/logo.png" alt="POST THIS logo" className="download-logo" />
          </div>
        </button>

        <button
          type="button"
          onClick={handleInstall}
          className="download-install-button"
        >
          Installeer de app
        </button>

        <div className="download-copy">
          <h1 className="download-title">Download POST THIS</h1>
          <p className="download-subtitle">Klaar om je dag helder te beginnen.</p>
        </div>

        {instruction && <div className="download-feedback">{instruction}</div>}
      </div>
    </div>
  );
}
