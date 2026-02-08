import { useMemo } from "react";
import { getDaypart, getDaypartGreeting } from "../../utils/date";

export default function Output({
  post,
  onViewPackages,
  onFinishSession,
}) {
  const dagdeelGreeting = useMemo(getDaypartGreeting, []);
  const dagdeelLabel = useMemo(getDaypart, []);
  const dagdeelBevestiging =
    dagdeelLabel === "ochtend"
      ? "Dit is uw post voor de ochtend."
      : dagdeelLabel === "middag"
      ? "Dit is uw post voor de middag."
      : "Dit is uw post voor de avond.";

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
        <p style={{ fontSize: 14, opacity: 0.7 }}>{dagdeelGreeting}</p>

        <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, marginTop: 24 }}>
          {post}
        </p>

        <p style={{ marginTop: 32 }}>{dagdeelBevestiging}</p>

        <p>Wij wensen u een fijne dag.</p>

        <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
          <button onClick={downloadPost}>Bericht downloaden</button>
          <button onClick={onViewPackages}>Meer opties</button>
          <button onClick={onFinishSession}>Afsluiten</button>
        </div>
      </div>
    </div>
  );
}
