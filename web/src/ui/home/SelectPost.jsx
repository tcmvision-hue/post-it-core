export default function SelectPost({ posts, onSelect }) {
  if (!Array.isArray(posts) || posts.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#F6F3EE",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          width: 640,
          padding: 32,
          background: "#FFFFFF",
          borderRadius: 12,
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Kies jouw post</h2>

        <p style={{ color: "#555", marginBottom: 24 }}>
          Je ziet hieronder maximaal drie voorstellen.  
          Kies er één. De andere verdwijnen.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {posts.map((post, index) => (
            <div
              key={index}
              style={{
                border: "1px solid #DDD",
                borderRadius: 8,
                padding: 16,
                background: "#FAFAFA",
              }}
            >
              <p
                style={{
                  whiteSpace: "pre-wrap",
                  marginTop: 0,
                  marginBottom: 16,
                  lineHeight: 1.5,
                }}
              >
                {post}
              </p>

              <button
                onClick={() => onSelect(post)}
                style={{
                  backgroundColor: "#111111",
                  color: "#FFFFFF",
                  border: "none",
                  padding: "10px 18px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                Kies deze post
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
