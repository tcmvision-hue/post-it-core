import { useEffect, useState } from "react";

export default function Generation({
  kladblok,
  doelgroep,
  intentie,
  waaromNu,
  generations,
  confirmError,
  onGenerate,
  onConfirm,
  onReview,
}) {
  const MAX_GENERATIONS = 3;
  const [loading, setLoading] = useState(false);
  const [keywords, setKeywords] = useState("");
  const [error, setError] = useState("");

  const generationCount = generations.length;
  const currentPost = generations[generationCount - 1] ?? null;
  const currentText = currentPost?.text || "";
  const currentLabel = currentPost?.label || "";
  const isLast = generationCount >= MAX_GENERATIONS;

  // Auto-start eerste generatie
  useEffect(() => {
    if (generationCount === 0) runGeneration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runGeneration() {
    if (loading || isLast) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kladblok,
          doelgroep,
          intentie,
          context: waaromNu,
          keywords: keywords || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data?.post) {
        onGenerate({
          text: data.post,
          label: keywords.trim(),
          accent: keywords.trim(),
          kind: generationCount === 0 ? "official" : "generation",
        });
      } else {
        setError(data?.error || "Genereren mislukt");
      }
    } finally {
      setLoading(false);
    }
  }

  // =======================
  // GENERATION
  // =======================
  function preventCopy(event) {
    event.preventDefault();
  }

  return (
    <div style={{ padding: 40, maxWidth: 620, margin: "0 auto" }}>
      <h2>
        Generatie {Math.max(1, generationCount)} van {MAX_GENERATIONS}
      </h2>

      {confirmError && (
        <p style={{ color: "#A33", marginTop: 8 }}>{confirmError}</p>
      )}
      {error && <p style={{ color: "#A33", marginTop: 8 }}>{error}</p>}

      <input
        value={keywords}
        onChange={(e) => setKeywords(e.target.value)}
        placeholder="toon / richting / accent"
        style={{ width: "100%", marginBottom: 16 }}
      />

      {currentLabel && (
        <p style={{ color: "#555", marginTop: 0 }}>
          Label: {currentLabel}
        </p>
      )}

      <p
        style={{
          whiteSpace: "pre-wrap",
          opacity: loading ? 0.4 : 1,
          userSelect: "none",
        }}
        onCopy={preventCopy}
      >
        {currentText || "Er wordt verwerkt. Even geduld…"}
      </p>

      {loading && currentPost && <p>Nieuwe versie wordt gegenereerd…</p>}

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        {currentPost && !isLast && (
          <button onClick={runGeneration} disabled={loading}>
            Genereer opnieuw
          </button>
        )}

        {currentPost && generationCount > 0 && (
          <button
            onClick={() => onConfirm(currentPost)}
            disabled={loading}
          >
            Bevestigen
          </button>
        )}

        {currentPost && isLast && (
          <button onClick={onReview} disabled={loading}>
            Selecteer je post
          </button>
        )}
      </div>
    </div>
  );
}
