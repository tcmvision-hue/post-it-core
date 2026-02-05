import { useEffect, useState } from "react";

const MAX_GENERATIONS = 3;

export default function Generation({
  kladblok,
  doelgroep,
  intentie,
  waaromNu,
  generations,
  onGenerate,
  onStop,
}) {
  const [loading, setLoading] = useState(false);
  const [keywords, setKeywords] = useState("");
  const [view, setView] = useState("generation");
  const [selectedPost, setSelectedPost] = useState(null);

  const generationCount = generations.length;
  const currentPost = generations[generationCount - 1] ?? null;
  const isLast = generationCount === MAX_GENERATIONS;

  // Auto-start eerste generatie
  useEffect(() => {
    if (generationCount === 0) runGeneration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runGeneration() {
    if (loading || generationCount >= MAX_GENERATIONS) return;
    setLoading(true);

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
      if (data?.post) onGenerate(data.post);
    } finally {
      setLoading(false);
    }
  }

  // =======================
  // SELECTIE
  // =======================
  if (view === "selection") {
    return (
      <div style={{ padding: 40, maxWidth: 800, margin: "0 auto" }}>
        <h2 style={{ marginBottom: 24 }}>Kies uw post</h2>

        {generations.map((post, i) => (
          <div
            key={i}
            onClick={() => {
              setSelectedPost(post);   // andere verdwijnen
              onStop(post);            // door naar Output
            }}
            style={{
              padding: 24,
              marginBottom: 16,
              cursor: "pointer",
              border: "1px solid #ddd",
              backgroundColor: "#fff",
            }}
          >
            <p style={{ whiteSpace: "pre-wrap" }}>{post}</p>
          </div>
        ))}
      </div>
    );
  }

  // =======================
  // GENERATION
  // =======================
  return (
    <div style={{ padding: 40, maxWidth: 620, margin: "0 auto" }}>
      <h2>
        Generatie {Math.max(1, generationCount)} van {MAX_GENERATIONS}
      </h2>

      <input
        value={keywords}
        onChange={(e) => setKeywords(e.target.value)}
        placeholder="toon / richting / accent"
        style={{ width: "100%", marginBottom: 16 }}
      />

      <p style={{ whiteSpace: "pre-wrap", opacity: loading ? 0.4 : 1 }}>
        {currentPost ||
          "Er wordt een generatie voor je gegenereerd. Even geduld…"}
      </p>

      {loading && currentPost && <p>Nieuwe versie wordt gegenereerd…</p>}

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        {currentPost && !isLast && (
          <button onClick={runGeneration} disabled={loading}>
            Genereer opnieuw
          </button>
        )}

        {currentPost && (
          <button
            onClick={() => {
              if (isLast) onStop(currentPost);
              else onStop(currentPost);
            }}
            disabled={loading}
          >
            Bevestigen
          </button>
        )}

        {isLast && (
          <button
            onClick={() => setView("selection")}
            disabled={loading}
          >
            Ga naar selectie
          </button>
        )}
      </div>
    </div>
  );
}
