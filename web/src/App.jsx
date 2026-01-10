import { useEffect, useState } from "react";

import Frontpage from "./ui/home/Frontpage";
import Today from "./ui/home/Today";
import Intake from "./ui/home/Intake";
import Reflection from "./ui/home/Reflection";
import Direction from "./ui/home/Direction";
import Output from "./ui/home/Output";

const PHASES = {
  FRONT: "FRONT",
  TODAY: "TODAY",
  INTAKE: "INTAKE",
  REFLECTION: "REFLECTION",
  DIRECTION: "DIRECTION",
  OUTPUT: "OUTPUT",
};

export default function App() {
  const [phase, setPhase] = useState(PHASES.FRONT);

  // ============================
  // CANONISCHE AUTOMATISCHE FLOW
  // ============================
  useEffect(() => {
    let timer;

    if (phase === PHASES.FRONT) {
      timer = setTimeout(() => setPhase(PHASES.TODAY), 1500);
    }

    if (phase === PHASES.TODAY) {
      timer = setTimeout(() => setPhase(PHASES.INTAKE), 1500);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [phase]);

  // ============================
  // RENDER PER FASE (CANON)
  // ============================
  if (phase === PHASES.FRONT) return <Frontpage />;

  if (phase === PHASES.TODAY) return <Today />;

  if (phase === PHASES.INTAKE) {
    return <Intake onComplete={() => setPhase(PHASES.REFLECTION)} />;
  }

  if (phase === PHASES.REFLECTION) {
    return <Reflection onComplete={() => setPhase(PHASES.DIRECTION)} />;
  }

  if (phase === PHASES.DIRECTION) {
    return <Direction onComplete={() => setPhase(PHASES.OUTPUT)} />;
  }

  if (phase === PHASES.OUTPUT) return <Output />;

  return <div>Onbekende fase</div>;
}
