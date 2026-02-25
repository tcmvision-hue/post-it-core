import { useEffect, useState } from "react";
import { getUser } from "../../utils/user";
import { apiFetch } from "../../utils/api";
import { primaryHomeButtonStyle } from "./sharedStyles";
import { useI18n } from "../../i18n/I18nContext";
import VideoBackground from "../../components/VideoBackground";
import { VIDEO_BG } from "./VideoBackgrounds";

export default function Output({
  variants,
  selectedVariantId,
  onSelectVariant,
  hashtags,
  onToggleHashtag,
  cycleMeta,
  onViewPackages,
  activePostId,
  onFinishSession,
}) {
  const { t } = useI18n();
  const [downloadError, setDownloadError] = useState("");
  const [downloadLoading, setDownloadLoading] = useState("");
  const [confirmedPostId, setConfirmedPostId] = useState("");
  const [statusActivePostId, setStatusActivePostId] = useState("");

  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isMobile = /android|iphone|ipad|ipod/i.test(userAgent);

  useEffect(() => {
    let cancelled = false;

    async function loadConfirmedPostId() {
      try {
        const user = getUser();
        const res = await apiFetch("/api/phase4/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && data?.ok) {
          const confirmedId = String(data?.confirmedPostId || "");
          const activeId = String(data?.activePostId || confirmedId || "");
          if (confirmedId) {
            setConfirmedPostId(confirmedId);
          }
          if (activeId) {
            setStatusActivePostId(activeId);
          }
        }
      } catch {
        // ignore status refresh failure here
      }
    }

    loadConfirmedPostId();
    return () => {
      cancelled = true;
    };
  }, []);

  function createActionId(prefix) {
    return `${prefix}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 10)}`;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function slugifyFilenamePart(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
  }

  function createDownloadFilename({ date, label, variant }) {
    const safeDate = slugifyFilenamePart(date) || "undated";
    const safeLabel = slugifyFilenamePart(label) || "post";
    const safeVariant = slugifyFilenamePart(variant?.id) || Date.now().toString(36);
    return `post-this-${safeDate}-${safeLabel}-${safeVariant}.html`;
  }

  function createDownloadHtml({
    date,
    daypart,
    label,
    text,
    logoDataUrl,
    directLogoUrl,
    hashtagsLine,
    titleLabel,
    dateLabel,
    daypartLabel,
    metaLabelLabel,
    defaultLabel,
    hashtagsLabel,
    copyButtonLabel,
    copyTipLabel,
    copySuccessLabel,
    copyFallbackLabel,
  }) {
    const safeDate = escapeHtml(date || "");
    const safeDaypart = escapeHtml(daypart || "");
    const safeLabel = escapeHtml(label || "");
    const safeText = escapeHtml(text || "").replaceAll("\n", "<br />");
    const safeTags = escapeHtml(hashtagsLine || "");
    const safeLogo = escapeHtml(logoDataUrl || "");
    const safeDirectLogo = escapeHtml(directLogoUrl || "");

    return `<!doctype html>
<html lang="und">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(titleLabel)}</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      background: linear-gradient(160deg, #145C63 0%, #48B7B4 52%, #FAFAF8 100%);
      color: #1f1f1f;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 28px 16px;
    }
    .frame {
      width: min(760px, 100%);
      border: 4px solid #48B7B4;
      border-radius: 18px;
      background: rgba(250,250,248,0.50);
      box-shadow: 0 2px 12px rgba(60,60,40,0.04);
      padding: 20px;
    }
    .brand-wrap {
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 0 0 14px;
    }
    .brand-logo {
      width: min(360px, 92%);
      height: auto;
      object-fit: contain;
      display: block;
    }
    .brand {
      color: #145C63;
      font-weight: 800;
      letter-spacing: 0.04em;
      font-size: clamp(24px, 6vw, 34px);
      text-align: center;
      margin: 0;
    }
    .meta {
      display: grid;
      grid-template-columns: repeat(3, minmax(0,1fr));
      gap: 8px;
      margin-bottom: 12px;
      font-size: 13px;
    }
    .meta > div {
      background: rgba(255,255,255,0.82);
      border: 1px solid #d8d8d8;
      border-radius: 8px;
      padding: 8px 10px;
    }
    .post {
      background: rgba(255,255,255,0.88);
      border: 1px solid #d8d8d8;
      border-radius: 10px;
      padding: 14px;
      font-size: clamp(16px, 2.9vw, 20px);
      line-height: 1.55;
      white-space: normal;
      word-break: break-word;
      user-select: text;
      -webkit-user-select: text;
    }
    .tags {
      margin-top: 10px;
      background: rgba(255,255,255,0.82);
      border: 1px solid #d8d8d8;
      border-radius: 8px;
      padding: 10px;
      font-size: 14px;
      user-select: text;
      -webkit-user-select: text;
    }
    .copy-wrap {
      margin: 0 0 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .copy-btn {
      border: 1px solid #145C63;
      border-radius: 10px;
      background: #145C63;
      color: #fff;
      padding: 10px 12px;
      font-size: 14px;
      cursor: pointer;
      width: 100%;
    }
    .copy-note {
      font-size: 12px;
      color: #2a2a2a;
      margin: 0;
    }
  </style>
</head>
<body>
  <main class="frame">
    <header class="brand-wrap">
      ${safeLogo
        ? `<img src="${safeLogo}" alt="POST THIS logo" class="brand-logo" />`
        : safeDirectLogo
          ? `<img src="${safeDirectLogo}" alt="POST THIS logo" class="brand-logo" />`
          : `<h1 class="brand">POST THIS</h1>`}
    </header>
    <section class="meta">
      <div><strong>${escapeHtml(dateLabel)}</strong><br />${safeDate}</div>
      <div><strong>${escapeHtml(daypartLabel)}</strong><br />${safeDaypart || "-"}</div>
      <div><strong>${escapeHtml(metaLabelLabel)}</strong><br />${safeLabel || escapeHtml(defaultLabel)}</div>
    </section>
    <section class="copy-wrap">
      <button type="button" class="copy-btn" id="copyPostBtn">${escapeHtml(copyButtonLabel)}</button>
      <p class="copy-note" id="copyPostNote">${escapeHtml(copyTipLabel)}</p>
    </section>
    <section class="post" id="postText">${safeText}</section>
    ${safeTags ? `<section class="tags" id="postTags"><strong>${escapeHtml(hashtagsLabel)}</strong><br />${safeTags}</section>` : ""}
  </main>
  <script>
    (function () {
      var button = document.getElementById("copyPostBtn");
      var note = document.getElementById("copyPostNote");
      var post = document.getElementById("postText");
      var tags = document.getElementById("postTags");
      if (!button || !post) return;

      function buildCopyText() {
        var postText = (post.textContent || post.innerText || "").trim();
        var tagsText = tags ? "\\n\\n" + ((tags.textContent || tags.innerText || "").trim()) : "";
        return (postText + tagsText).trim();
      }

      function legacyCopy(text) {
        var textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        textarea.style.pointerEvents = "none";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
        var copied = false;
        try {
          copied = document.execCommand("copy");
        } catch (_execError) {
          copied = false;
        }
        textarea.remove();
        return copied;
      }

      function updateNote(message) {
        if (note) note.textContent = message;
      }

      button.addEventListener("click", async function () {
        var textToCopy = buildCopyText();
        if (!textToCopy) return;

        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(textToCopy);
          } else {
            var copied = legacyCopy(textToCopy);
            if (!copied) throw new Error("copy-failed");
          }
          updateNote("${escapeHtml(copySuccessLabel)}");
        } catch (_error) {
          var fallbackCopied = legacyCopy(textToCopy);
          if (fallbackCopied) {
            updateNote("${escapeHtml(copySuccessLabel)}");
            return;
          }
          try {
            window.prompt("${escapeHtml(copyButtonLabel)}", textToCopy);
          } catch (_promptError) {
            // no-op
          }
          updateNote("${escapeHtml(copyFallbackLabel)}");
        }
      });
    })();
  </script>
</body>
</html>`;
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result || "");
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function loadLogoDataUrl() {
    const candidates = [
      "/video/logo.png",
      "/icons/post-this-512.png",
      "/icons/post-this-192.png",
    ];

    for (const path of candidates) {
      try {
        const response = await fetch(path);
        if (!response.ok) continue;
        const blob = await response.blob();
        const dataUrl = await blobToDataUrl(blob);
        if (dataUrl) return dataUrl;
      } catch {
        // try next candidate
      }
    }

    return "";
  }

  function resolveDirectLogoUrl() {
    if (typeof window === "undefined") return "";
    try {
      return new URL("/video/logo.png", window.location.origin).toString();
    } catch {
      try {
        return new URL("/icons/post-this-512.png", window.location.origin).toString();
      } catch {
        return "";
      }
    }
  }

  async function downloadPost(variant) {
    if (downloadLoading) return;
    setDownloadError("");
    setDownloadLoading(variant?.id || "");
    try {
      const user = getUser();
      const actionId = createActionId("download");
      const requestedPostId = String(
        variant?.postId
        || statusActivePostId
        || activePostId
        || confirmedPostId
        || ""
      );
      let res = await apiFetch("/api/phase4/download-variant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          postId: requestedPostId,
          isOfficial: variant?.kind === "official",
          actionId,
        }),
      });
      let data = await res.json().catch(() => ({}));

      if (!res.ok && (data?.error === "Unknown postId" || data?.error === "Missing postId")) {
        const statusRes = await apiFetch("/api/phase4/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id }),
        });
        const statusData = await statusRes.json().catch(() => ({}));
        const retryPostId = String(statusData?.activePostId || statusData?.confirmedPostId || "");

        if (statusRes.ok && statusData?.ok && retryPostId) {
          setConfirmedPostId(retryPostId);
          setStatusActivePostId(retryPostId);
          res = await apiFetch("/api/phase4/download-variant", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.id,
              postId: retryPostId,
              isOfficial: true,
              actionId: createActionId("download-retry"),
            }),
          });
          data = await res.json().catch(() => ({}));
        }
      }

      if (!res.ok || !data?.ok) {
        setDownloadError(data?.error || t("output.download.error"));
        return;
      }

      const responseActivePostId = String(data?.activePostId || data?.postId || "");
      if (responseActivePostId) {
        setStatusActivePostId(responseActivePostId);
      }

    const date = cycleMeta?.date || new Date().toISOString().split("T")[0];
    const daypart = cycleMeta?.daypart || "";
    const label = variant?.label || t("output.file.defaultLabel");
    const selectedHashtags = Array.isArray(hashtags)
      ? hashtags.filter((tag) => tag.selected).map((tag) => tag.tag)
      : [];
    const hashtagsLine = selectedHashtags.length > 0
      ? selectedHashtags.join(" ")
      : null;
      const logoDataUrl = await loadLogoDataUrl();
      const directLogoUrl = resolveDirectLogoUrl();
      const html = createDownloadHtml({
        date,
        daypart,
        label,
        text: variant?.text || "",
        logoDataUrl,
        directLogoUrl,
        hashtagsLine,
        titleLabel: t("output.file.title"),
        dateLabel: t("output.file.date"),
        daypartLabel: t("output.file.daypart"),
        metaLabelLabel: t("output.file.label"),
        defaultLabel: t("output.file.defaultLabel"),
        hashtagsLabel: t("output.file.hashTags"),
        copyButtonLabel: t("output.file.copyButton"),
        copyTipLabel: t("output.file.copyTip"),
        copySuccessLabel: t("output.file.copySuccess"),
        copyFallbackLabel: t("output.file.copyFallback"),
      });
      const filename = createDownloadFilename({
        date,
        label,
        variant,
      });

      const htmlBlob = new Blob([html], {
        type: "text/html;charset=utf-8",
      });
      const preferredBlob = isMobile
        ? new Blob([html], { type: "application/octet-stream" })
        : htmlBlob;

      const url = URL.createObjectURL(preferredBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch {
      setDownloadError(t("output.download.error"));
    } finally {
      setDownloadLoading("");
    }
  }

  return (
    <>
      <VideoBackground
        videoSrc={VIDEO_BG.output.video}
        fallbackSrc={VIDEO_BG.output.fallback}
        alt="Strand, daglicht"
        overlayOpacity={0.34}
        startAtSeconds={1}
      />

      <div style={styles.wrapper}>
        <div style={styles.scrollContent}>
          <div style={styles.logoWrap}>
            <img src="/video/logo.png" alt="POST THIS logo" style={styles.logo} />
          </div>

          <div style={styles.cardsColumn}>
          {Array.isArray(variants) && variants.length > 0 && (
            <div style={styles.card}>
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>{t("output.finalChoice")}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {variants.map((variant) => (
                  <label
                    key={variant.id}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      padding: 10,
                      border: "1px solid #ddd",
                      borderRadius: 8,
                      background:
                        variant.id === selectedVariantId ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.75)",
                    }}
                  >
                    <input
                      type="radio"
                      name="variant"
                      checked={variant.id === selectedVariantId}
                      onChange={() => onSelectVariant(variant.id)}
                    />
                    <div style={{ width: "100%" }}>
                      <div style={{ color: "#145C63", fontSize: 12, fontWeight: 600 }}>
                        {variant.label || t("output.variantFallback")}
                      </div>
                      <div
                        style={{
                          whiteSpace: "pre-wrap",
                          userSelect: "none",
                          marginTop: 4,
                          wordBreak: "break-word",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {variant.text}
                      </div>
                      <button
                        onClick={() => downloadPost(variant)}
                        disabled={downloadLoading === variant.id}
                        style={{
                          ...primaryHomeButtonStyle,
                          marginTop: 10,
                          fontSize: 15,
                          padding: "9px 14px",
                          opacity: downloadLoading === variant.id ? 0.55 : 1,
                        }}
                      >
                        {String(variant?.postId || "")
                          === String(statusActivePostId || activePostId || confirmedPostId || "")
                          ? t("output.download.free")
                          : t("output.download.paid")}
                      </button>
                    </div>
                  </label>
                ))}
              </div>
              {downloadError && (
                <p style={{ color: "#A33", marginTop: 10, marginBottom: 0 }}>{downloadError}</p>
              )}
            </div>
          )}

          {Array.isArray(hashtags) && hashtags.length > 0 && (
            <div style={styles.card}>
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>{t("output.hashtags")}</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {hashtags.map((tag, index) => (
                  <button
                    key={`${tag.tag}-${index}`}
                    onClick={() => onToggleHashtag(tag.tag)}
                    style={{
                      border: "1px solid #145C63",
                      borderRadius: 999,
                      padding: "6px 10px",
                      background: tag.selected ? "#145C63" : "#fff",
                      color: tag.selected ? "#fff" : "#145C63",
                      cursor: "pointer",
                    }}
                  >
                    {tag.tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={styles.card}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button style={styles.actionButton} onClick={onViewPackages}>{t("output.options")}</button>
              <button style={styles.actionButton} onClick={onFinishSession}>{t("output.finish")}</button>
            </div>
          </div>
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  logoWrap: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginTop: "-0.8cm",
    marginBottom: "calc(10px + 0.9cm)",
    pointerEvents: "none",
  },
  logo: {
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
  },
  wrapper: {
    width: "100vw",
    height: "100dvh",
    minHeight: "100dvh",
    overflowY: "auto",
    overflowX: "hidden",
    position: "relative",
    zIndex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    boxSizing: "border-box",
  },
  scrollContent: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: "calc(24px + 1.5cm)",
    boxSizing: "border-box",
  },
  cardsColumn: {
    width: "90vw",
    maxWidth: 340,
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    margin: "0 auto",
  },
  card: {
    border: "3px solid #145C63",
    borderRadius: 18,
    background: "rgba(250,250,248,0.50)",
    boxShadow: "0 2px 12px 0 rgba(60,60,40,0.04)",
    padding: 12,
    boxSizing: "border-box",
  },
  actionButton: {
    ...primaryHomeButtonStyle,
    marginTop: 0,
    fontSize: 16,
    padding: "10px 18px",
  },
};
