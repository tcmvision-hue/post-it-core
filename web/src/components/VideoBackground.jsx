import React from "react";

/**
 * VideoBackground component
 * - Toont een full-screen achtergrondvideo met overlay en fallback image.
 * - Video wordt alleen geladen als het bestand bestaat (anders alleen fallback).
 * - Overlay is altijd aanwezig (wit, 65% opacity).
 * - Video: autoplay, muted, loop, object-fit: cover, geen controls.
 * - Fallback image als poster en als <img> bij video error.
 *
 * Props:
 *   videoSrc: string (optioneel, pad naar video)
 *   fallbackSrc: string (pad naar fallback image, verplicht)
 *   alt: string (alt-tekst voor fallback image)
 *   className: string (optioneel, extra CSS classes)
 */
export default function VideoBackground({
  videoSrc,
  fallbackSrc,
  alt = "Achtergrond",
  className = "",
  overlayOpacity,
  mediaFilter = "none",
  mediaPosition,
  cutBottom,
  showFallback,
  startAtSeconds = 0,
  baseBackgroundColor = "#145C63",
  fadeDurationMs = 360,
  zoomIn = false,
  zoomFrom = 1,
  zoomDurationMs = 0,
  videoOpacity = 1,
  videoOpacityTransitionMs = 0,
  mediaCrop,
}) {
  const [videoError, setVideoError] = React.useState(false);
  const [videoReady, setVideoReady] = React.useState(false);
  const [fallbackError, setFallbackError] = React.useState(false);
  const didInitialSeekRef = React.useRef(false);
  const shouldShowFallback = showFallback ?? (!videoSrc && Boolean(fallbackSrc));
  const shouldGateVideoVisibility = shouldShowFallback;
  const effectiveFadeDurationMs = shouldShowFallback ? fadeDurationMs : 0;
  const effectiveOverlayOpacity =
    overlayOpacity ?? (videoSrc && !fallbackSrc ? 0.35 : 0.42);
  const effectiveMediaPosition =
    mediaPosition ?? "center center";
  const effectiveCutBottom = cutBottom ?? "0px";
  const effectiveMediaCrop = mediaCrop ?? {
    top: "0%",
    right: "0%",
    bottom: "0%",
    left: "0%",
  };

  const derivedFallbackSrc = React.useMemo(() => {
    if (fallbackSrc) return fallbackSrc;
    if (!videoSrc) return "";
    return videoSrc.replace(/\.[^./]+$/, ".jpg");
  }, [fallbackSrc, videoSrc]);

  React.useEffect(() => {
    setVideoError(false);
    setVideoReady(false);
    setFallbackError(false);
    didInitialSeekRef.current = false;
  }, [videoSrc, fallbackSrc]);

  return (
    <div
      className={`video-bg-canon ${className}`}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100dvh",
        backgroundColor: baseBackgroundColor,
        backgroundImage: "linear-gradient(160deg, #145C63 0%, #48B7B4 100%)",
        zIndex: -1,
        overflow: "hidden",
        minWidth: "100vw",
        minHeight: "100dvh",
        maxWidth: "100vw",
        maxHeight: "100dvh",
        clipPath: `inset(0 0 ${effectiveCutBottom} 0)`,
      }}
      aria-hidden="true"
    >
      {shouldShowFallback && derivedFallbackSrc && !fallbackError && (
        <img
          className="video-bg-canon__fallback"
          src={derivedFallbackSrc}
          alt={alt}
          loading="eager"
          fetchPriority="high"
          onError={() => setFallbackError(true)}
          style={{
            position: "absolute",
            top: `-${effectiveMediaCrop.top}`,
            left: `-${effectiveMediaCrop.left}`,
            width: `calc(100vw + ${effectiveMediaCrop.left} + ${effectiveMediaCrop.right})`,
            height: `calc(100dvh + ${effectiveMediaCrop.top} + ${effectiveMediaCrop.bottom})`,
            minWidth: `calc(100vw + ${effectiveMediaCrop.left} + ${effectiveMediaCrop.right})`,
            minHeight: `calc(100dvh + ${effectiveMediaCrop.top} + ${effectiveMediaCrop.bottom})`,
            maxWidth: `calc(100vw + ${effectiveMediaCrop.left} + ${effectiveMediaCrop.right})`,
            maxHeight: `calc(100dvh + ${effectiveMediaCrop.top} + ${effectiveMediaCrop.bottom})`,
            objectFit: "cover",
            objectPosition: effectiveMediaPosition,
            filter: mediaFilter,
            opacity: videoSrc && !videoError && videoReady ? 0 : 1,
            transition: `opacity ${effectiveFadeDurationMs}ms ease-out`,
          }}
        />
      )}

      {videoSrc && !videoError && (
        <video
          className="video-bg-canon__video"
          src={videoSrc}
          poster={shouldShowFallback ? (derivedFallbackSrc || undefined) : undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onLoadedMetadata={(event) => {
            const nextStart = Number(startAtSeconds) || 0;
            if (nextStart <= 0 || didInitialSeekRef.current) return;

            const videoEl = event.currentTarget;
            didInitialSeekRef.current = true;
            try {
              videoEl.currentTime = nextStart;
            } catch {
              setVideoReady(true);
            }
          }}
          onLoadedData={() => {
            const nextStart = Number(startAtSeconds) || 0;
            if (nextStart > 0) {
              return;
            }
            setVideoReady(true);
          }}
          onSeeked={() => {
            if ((Number(startAtSeconds) || 0) > 0) {
              setVideoReady(true);
            }
          }}
          onCanPlay={() => {
            if ((Number(startAtSeconds) || 0) > 0 && didInitialSeekRef.current) {
              setVideoReady(true);
            }
            if ((Number(startAtSeconds) || 0) <= 0) {
              setVideoReady(true);
            }
          }}
          onError={() => setVideoError(true)}
          style={{
            position: "absolute",
            top: `-${effectiveMediaCrop.top}`,
            left: `-${effectiveMediaCrop.left}`,
            width: `calc(100vw + ${effectiveMediaCrop.left} + ${effectiveMediaCrop.right})`,
            height: `calc(100dvh + ${effectiveMediaCrop.top} + ${effectiveMediaCrop.bottom})`,
            minWidth: `calc(100vw + ${effectiveMediaCrop.left} + ${effectiveMediaCrop.right})`,
            minHeight: `calc(100dvh + ${effectiveMediaCrop.top} + ${effectiveMediaCrop.bottom})`,
            maxWidth: `calc(100vw + ${effectiveMediaCrop.left} + ${effectiveMediaCrop.right})`,
            maxHeight: `calc(100dvh + ${effectiveMediaCrop.top} + ${effectiveMediaCrop.bottom})`,
            objectFit: "cover",
            objectPosition: effectiveMediaPosition,
            filter: mediaFilter,
            opacity: (shouldGateVideoVisibility ? (videoReady ? 1 : 0) : 1) * videoOpacity,
            transition: `opacity ${Math.max(effectiveFadeDurationMs, videoOpacityTransitionMs)}ms ease-out`,
          }}
        />
      )}
      {/* Overlay */}
      <div
        className="video-bg-canon__overlay"
        style={{
          position: "absolute",
          inset: 0,
          width: "100vw",
          height: "100dvh",
          background: `rgba(255,255,255,${effectiveOverlayOpacity})`,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
