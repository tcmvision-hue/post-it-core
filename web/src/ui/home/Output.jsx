import { useState } from "react";
import { getUser } from "../../utils/user";

export default function Output({
  post,
  variants,
  selectedVariantId,
  onSelectVariant,
  hashtags,
  onToggleHashtag,
  cycleMeta,
  onViewPackages,
  onFinishSession,
}) {
  const [downloadError, setDownloadError] = useState("");
  const [downloadLoading, setDownloadLoading] = useState("");
  function preventCopy(event) {
    event.preventDefault();
  }

  async function downloadPost(variant) {
    setDownloadError("");
    setDownloadLoading(variant?.id || "");
    try {
      const user = getUser();
      const res = await fetch("/api/phase4/download-variant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          isOfficial: variant?.kind === "official",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setDownloadError(data?.error || "Download mislukt");
        return;
      }

    const date = cycleMeta?.date || new Date().toISOString().split("T")[0];
    const daypart = cycleMeta?.daypart || "";
    const label = variant?.label || "Origineel";
    const selectedHashtags = Array.isArray(hashtags)
      ? hashtags.filter((tag) => tag.selected).map((tag) => tag.tag)
      : [];
    const hashtagsLine =
      selectedHashtags.length > 0
        ? `Hashtags: ${selectedHashtags.join(" ")}`
        : null;
    const lines = [
      "POST IT",
      `Datum: ${date}`,
      daypart ? `Dagdeel: ${daypart}` : null,
      label ? `Label: ${label}` : null,
      "---",
      variant?.text || post,
      "",
      hashtagsLine,
      "",
      "POST IT",
    ].filter(Boolean);
    const blob = new Blob([lines.join("\n")], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "post.txt";
    a.click();
    URL.revokeObjectURL(url);
    } finally {
      setDownloadLoading("");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F6F3EE",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 620, width: "100%", padding: 40 }}>
        <p
          style={{
            whiteSpace: "pre-wrap",
            lineHeight: 1.6,
            marginTop: 24,
            userSelect: "none",
          }}
          onCopy={preventCopy}
        >
          {post}
        </p>

        <p style={{ marginTop: 32 }}>Dit is je gekozen post.</p>

        {Array.isArray(variants) && variants.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <p style={{ marginBottom: 8 }}>Kies je definitieve post:</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {variants.map((variant) => (
                <label
                  key={variant.id}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    padding: 12,
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    background:
                      variant.id === selectedVariantId ? "#f7f7f7" : "#fff",
                  }}
                >
                  <input
                    type="radio"
                    name="variant"
                    checked={variant.id === selectedVariantId}
                    onChange={() => onSelectVariant(variant.id)}
                  />
                  <div>
                    <div style={{ color: "#666", fontSize: 12 }}>
                      {variant.label || "Variant"}
                    </div>
                    <div style={{ whiteSpace: "pre-wrap", userSelect: "none" }}>
                      {variant.text}
                    </div>
                    <button
                      onClick={() => downloadPost(variant)}
                      disabled={downloadLoading === variant.id}
                      style={{ marginTop: 10 }}
                    >
                      {variant.kind === "official"
                        ? "Download deze post (gratis)"
                        : "Download deze post (1 coin)"}
                    </button>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {downloadError && (
          <p style={{ color: "#A33", marginTop: 12 }}>{downloadError}</p>
        )}

        {Array.isArray(hashtags) && hashtags.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <strong>Hashtags</strong>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {hashtags.map((tag, index) => (
                <button
                  key={`${tag.tag}-${index}`}
                  onClick={() => onToggleHashtag(tag.tag)}
                  style={{
                    border: "1px solid #111",
                    borderRadius: 999,
                    padding: "6px 10px",
                    background: tag.selected ? "#111" : "#fff",
                    color: tag.selected ? "#fff" : "#111",
                    cursor: "pointer",
                  }}
                >
                  {tag.tag}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
          <button onClick={onViewPackages}>Meer opties</button>
          <button onClick={onFinishSession}>Afsluiten</button>
        </div>
      </div>
    </div>
  );
}
