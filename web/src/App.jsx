import { useState } from "react";

/* UI – HOME */
import Welcome from "./ui/home/Welcome";
import Explanation from "./ui/home/Explanation";
import Today from "./ui/home/Today";

/* INTAKE */
import Intake from "./ui/home/Intake";

/* REFLECTION */
import Reflection from "./ui/components/Reflection/Reflection";

/* GENERATION */
import Generation from "./ui/home/Generation";
import SelectPost from "./ui/home/SelectPost";
import Output from "./ui/home/Output";
import { getDaypartKey } from "./utils/date";

const PHASES = {
  WELCOME: "WELCOME",
  EXPLANATION: "EXPLANATION",
  TODAY: "TODAY",
  INTAKE: "INTAKE",
  GENERATION: "GENERATION",
  SELECT: "SELECT",
  FINAL: "FINAL",
  PACKAGES: "PACKAGES",
  FINISHED: "FINISHED",
  LOCKED: "LOCKED",
};

const DAYPART_LOCK_KEY = "post-this:last-daypart-key";

export default function App() {
  const [phase, setPhase] = useState(PHASES.WELCOME);

  const [intake, setIntake] = useState(null);
  const [generations, setGenerations] = useState([]);
  const [selectedPost, setSelectedPost] = useState("");

  function isDaypartLocked() {
    if (typeof window === "undefined") return false;
    const currentKey = getDaypartKey();
    const storedKey = localStorage.getItem(DAYPART_LOCK_KEY);
    return storedKey === currentKey;
  }

  function lockCurrentDaypart() {
    if (typeof window === "undefined") return;
    localStorage.setItem(DAYPART_LOCK_KEY, getDaypartKey());
  }


  // ⬇️ Alleen visuele timing
  const [showGeneration, setShowGeneration] = useState(false);

  /* HOME */
  if (phase === PHASES.WELCOME) {
    return <Welcome onContinue={() => setPhase(PHASES.EXPLANATION)} />;
  }

  if (phase === PHASES.EXPLANATION) {
    return <Explanation onContinue={() => setPhase(PHASES.TODAY)} />;
  }

  if (phase === PHASES.TODAY) {
    return (
      <Today
        onContinue={() =>
          setPhase(isDaypartLocked() ? PHASES.LOCKED : PHASES.INTAKE)
        }
      />
    );
  }

  if (phase === PHASES.INTAKE) {
    return (
      <Intake
        onComplete={(data) => {
          if (isDaypartLocked()) {
            setPhase(PHASES.LOCKED);
            return;
          }
          setIntake(data);
          setGenerations([]);
          setShowGeneration(false);
          setPhase(PHASES.GENERATION);
        }}
      />
    );
  }

  /* GENERATION */
  if (phase === PHASES.GENERATION) {
    return (
      <>
        {/* Generation staat klaar, maar is eerst onzichtbaar */}
        <div
          style={{
            opacity: showGeneration ? 1 : 0,
            transition: "opacity 1200ms ease",
          }}
        >
          <Generation
            kladblok={intake?.kladblok}
            doelgroep={intake?.doelgroep}
            intentie={intake?.intentie}
            waaromNu={intake?.context}
            generations={generations}
            onGenerate={(post) =>
              setGenerations((prev) => [...prev, post])
            }
            onStop={() => {
              const finalPost =
                generations[generations.length - 1] || "";
              setSelectedPost(finalPost);
              lockCurrentDaypart();
              setPhase(PHASES.FINAL);
            }}
          />
        </div>

        {/* Reflection bovenop */}
        <Reflection
          onFadeOutStart={() => {
            // ⬅️ BELANGRIJK: generatie zichtbaar TIJDENS fade
            setShowGeneration(true);
          }}
        />
      </>
    );
  }

  /* SELECT */
  if (phase === PHASES.SELECT) {
    return (
      <SelectPost
        posts={generations}
        onSelect={(post) => {
          setSelectedPost(post || "");
          lockCurrentDaypart();
          setPhase(PHASES.FINAL);
        }}
      />
    );
  }

  if (phase === PHASES.LOCKED) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F6F3EE",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 520,
            padding: 32,
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            textAlign: "center",
            boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
          }}
        >
          <h2 style={{ marginTop: 0 }}>U heeft al een post voor dit dagdeel</h2>
          <p>Kom terug in het volgende dagdeel om opnieuw te genereren.</p>
          <button onClick={() => setPhase(PHASES.FINISHED)}>
            Afsluiten
          </button>
        </div>
      </div>
    );
  }

  /* FINAL */
  if (phase === PHASES.FINAL) {
    return (
      <Output
        post={selectedPost}
        onViewPackages={() => setPhase(PHASES.PACKAGES)}
        onFinishSession={() => setPhase(PHASES.FINISHED)}
      />
    );
  }

  /* PACKAGES */
  if (phase === PHASES.PACKAGES) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 32,
          fontWeight: "bold",
        }}
      >
        PAKKETTEN
      </div>
    );
  }

  /* EINDSCHERM */
  if (phase === PHASES.FINISHED) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F6F3EE",
        }}
      >
        <h1 style={{ marginBottom: 24 }}>POST THIS</h1>
        <p>Bedankt voor het gebruiken van POST THIS.</p>
      </div>
    );
  }

  return null;
}
