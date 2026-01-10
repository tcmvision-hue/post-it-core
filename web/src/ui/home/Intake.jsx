import { useState } from "react";

export default function Intake({ onComplete }) {
  const STEPS = ["CONTEXT", "TONE", "BOUNDARIES", "DONE"];
  const [stepIndex, setStepIndex] = useState(0);

  function next() {
    const nextIndex = stepIndex + 1;
    if (STEPS[nextIndex] === "DONE") {
      onComplete();
    } else {
      setStepIndex(nextIndex);
    }
  }

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        backgroundColor: "#F6F3EE",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          backgroundColor: "#fff",
          padding: 32,
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
        }}
      >
        {STEPS[stepIndex] === "CONTEXT" && <p>Vertel iets over je situatie.</p>}
        {STEPS[stepIndex] === "TONE" && <p>Welke toon past bij jou?</p>}
        {STEPS[stepIndex] === "BOUNDARIES" && (
          <p>Zijn er dingen die we moeten vermijden?</p>
        )}

        <button onClick={next}>
          {STEPS[stepIndex] === "BOUNDARIES" ? "Afronden" : "Verder"}
        </button>
      </div>
    </div>
  );
}
