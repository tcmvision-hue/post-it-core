export default function Output({
  post,
  onViewPackages,
  onFinishSession,
}) {
  function preventCopy(event) {
    event.preventDefault();
  }

  function downloadPost() {
    const blob = new Blob([post], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "post.txt";
    a.click();
    URL.revokeObjectURL(url);
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

        <p>Wil je nog een nieuwe versie maken, dan kan dat opnieuw.</p>

        <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
          <button onClick={downloadPost}>Bericht downloaden</button>
          <button onClick={onViewPackages}>Meer opties</button>
          <button onClick={onFinishSession}>Afsluiten</button>
        </div>
      </div>
    </div>
  );
}
