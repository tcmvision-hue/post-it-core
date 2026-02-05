import { useMemo } from "react";

function getDagdeel() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "ochtend";
  if (h >= 12 && h < 18) return "middag";
  return "avond";
}

export default function Output({
  post,
  onViewPackages,
  onFinishSession,
}) {
  const dagdeel = useMemo(getDagdeel, []);

  const dagdeelZin =
    dagdeel === "ochtend"
      ? "Dit is uw post van vanochtend."
      : dagdeel === "middag"
      ? "Dit is uw post van vanmiddag."
      : "Dit is uw post van vanavond.";

  const terugkomZin =
    dagdeel === "ochtend"
      ? "U kunt later vandaag terugkomen voor uw middagpost."
      : dagdeel === "middag"
      ? "U kunt later vandaag terugkomen voor uw avondpost."
      : "U kunt morgen weer terugkomen voor uw ochtendpost.";

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
        <p style={{ fontSize: 14, opacity: 0.6 }}>{dagdeelZin}</p>

        <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, marginTop: 24 }}>
          {post}
        </p>

        <p style={{ marginTop: 32 }}>
          Wij wensen u een prettige voortzetting van de dag.
        </p>

        <p>{terugkomZin}</p>

        <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
          <button onClick={downloadPost}>Bericht downloaden</button>
          <button onClick={onViewPackages}>Bekijk pakketten</button>
          <button onClick={onFinishSession}>Afsluiten</button>
        </div>
      </div>
    </div>
  );
}
