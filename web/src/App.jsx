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
};

export default function App() {
  const [phase, setPhase] = useState(PHASES.WELCOME);

  const [intake, setIntake] = useState(null);
  const [generations, setGenerations] = useState([]);
  const [selectedPost, setSelectedPost] = useState("");

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
    return <Today onContinue={() => setPhase(PHASES.INTAKE)} />;
  }

  if (phase === PHASES.INTAKE) {
    return (
      <Intake
        onComplete={(data) => {
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
          setPhase(PHASES.FINAL);
        }}
      />
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
