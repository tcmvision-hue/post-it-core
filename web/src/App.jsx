import { useEffect, useState } from "react";
import { getUser } from "./utils/user";

/* UI – HOME */
import Welcome from "./ui/home/Welcome";
import Explanation from "./ui/home/Explanation";
import Today from "./ui/home/Today";
import CoinsGate from "./ui/home/CoinsGate";

/* INTAKE */
import Intake from "./ui/home/Intake";

/* REFLECTION */
import Reflection from "./ui/components/Reflection/Reflection";

/* GENERATION */
import Generation from "./ui/home/Generation";
import SelectPost from "./ui/home/SelectPost";
import Output from "./ui/home/Output";
import Phase4Options from "./ui/home/Phase4Options";

const PHASES = {
  WELCOME: "WELCOME",
  EXPLANATION: "EXPLANATION",
  TODAY: "TODAY",
  INTAKE: "INTAKE",
  COINS: "COINS",
  GENERATION: "GENERATION",
  SELECT: "SELECT",
  FINAL: "FINAL",
  PACKAGES: "PACKAGES",
  FINISHED: "FINISHED",
};

function loadStoredIntake() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem("post_it_intake");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeIntake(data) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem("post_it_intake", JSON.stringify(data));
  } catch {
    // Ignore storage errors (private mode or quota)
  }
}

function clearStoredIntake() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem("post_it_intake");
  } catch {
    // Ignore storage errors
  }
}

function getReturnPhase() {
  if (typeof window === "undefined") return PHASES.WELCOME;
  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get("return");
  if (returnTo === "coins") return PHASES.COINS;
  if (returnTo === "packages") return PHASES.PACKAGES;
  return PHASES.WELCOME;
}

export default function App() {
  const [phase, setPhase] = useState(getReturnPhase);

  const [intake, setIntake] = useState(() => loadStoredIntake());
  const [generations, setGenerations] = useState([]);
  const [variants, setVariants] = useState([]);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [hashtags, setHashtags] = useState([]);
  const [cycleMeta, setCycleMeta] = useState(null);
  const [confirmError, setConfirmError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("return")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // ⬇️ Alleen visuele timing
  const [showGeneration, setShowGeneration] = useState(false);

  function ensureCycleMeta() {
    if (cycleMeta) return cycleMeta;
    const now = new Date();
    const hours = now.getHours();
    let daypart = "ochtend";
    if (hours >= 12 && hours < 18) daypart = "middag";
    if (hours >= 18 && hours < 23) daypart = "avond";
    if (hours >= 23 || hours < 6) daypart = "nacht";

    const meta = {
      date: now.toISOString().split("T")[0],
      daypart,
    };
    setCycleMeta(meta);
    return meta;
  }

  function normalizePostPayload(postPayload) {
    if (!postPayload) return { text: "", label: "", accent: "" };
    if (typeof postPayload === "string") {
      return { text: postPayload, label: "", accent: "" };
    }
    return {
      text: postPayload.text || "",
      label: postPayload.label || "",
      accent: postPayload.accent || postPayload.label || "",
    };
  }

  function createVariant(base, type) {
    return {
      id: `${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2)}`,
      type,
      kind: base.kind || type,
      text: base.text || "",
      label: base.label || "",
      accent: base.accent || base.label || "",
    };
  }

  async function confirmSelection(postPayload) {
    setConfirmError("");
    try {
      const user = getUser();
      const res = await fetch("/api/phase4/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setConfirmError(data?.error || "Bevestigen mislukt");
        return;
      }
      const normalized = normalizePostPayload(postPayload);
      const generationVariants = (generations || []).map((entry, index) => {
        const normalizedEntry = normalizePostPayload(entry);
        const isOfficial = entry?.kind === "official";
        const label = normalizedEntry.label || (isOfficial
          ? "Origineel"
          : `Variant ${index + 1}`);
        return createVariant(
          {
            ...normalizedEntry,
            label,
            accent: normalizedEntry.accent || label,
            kind: entry?.kind || "generation",
          },
          "generation"
        );
      });

      const chosen = generationVariants.find(
        (variant) => variant.text === normalized.text
      );
      const fallback = createVariant(
        {
          ...normalized,
          label: "Origineel",
          accent: normalized.label,
          kind: "official",
        },
        "original"
      );
      const nextVariants = generationVariants.length > 0
        ? generationVariants
        : [fallback];

      const selectedId = chosen ? chosen.id : nextVariants[0].id;
      setVariants(nextVariants);
      setSelectedVariantId(selectedId);
      setHashtags([]);
      setPhase(PHASES.FINAL);
    } catch {
      setConfirmError("Bevestigen mislukt");
    }
  }

  /* HOME */
  if (phase === PHASES.WELCOME) {
    return <Welcome onContinue={() => setPhase(PHASES.EXPLANATION)} />;
  }

  if (phase === PHASES.EXPLANATION) {
    return <Explanation onContinue={() => setPhase(PHASES.TODAY)} />;
  }

  if (phase === PHASES.TODAY) {
    return (
      <Today onContinue={() => setPhase(PHASES.INTAKE)} />
    );
  }

  if (phase === PHASES.INTAKE) {
    return (
      <Intake
        onComplete={(data) => {
          storeIntake(data);
          setIntake(data);
          setGenerations([]);
          setHashtags([]);
          setVariants([]);
          setSelectedVariantId("");
          setCycleMeta(null);
          setShowGeneration(false);
          setPhase(PHASES.COINS);
        }}
      />
    );
  }

  /* COINS GATE */
  if (phase === PHASES.COINS) {
    return (
      <CoinsGate
        onStart={() => {
          ensureCycleMeta();
          setConfirmError("");
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
            confirmError={confirmError}
            onGenerate={(post) =>
              setGenerations((prev) => [...prev, post])
            }
            onConfirm={(post) => confirmSelection(post)}
            onReview={() => setPhase(PHASES.SELECT)}
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
        confirmError={confirmError}
        onSelect={(post) => confirmSelection(post)}
      />
    );
  }

  /* FINAL */
  if (phase === PHASES.FINAL) {
    const activeVariant = variants.find(
      (variant) => variant.id === selectedVariantId
    );
    return (
      <Output
        post={activeVariant?.text || ""}
        variants={variants}
        selectedVariantId={selectedVariantId}
        onSelectVariant={(id) => setSelectedVariantId(id)}
        hashtags={hashtags}
        onToggleHashtag={(tag) =>
          setHashtags((prev) =>
            prev.map((entry) =>
              entry.tag === tag
                ? { ...entry, selected: !entry.selected }
                : entry
            )
          )
        }
        cycleMeta={cycleMeta}
        onViewPackages={() => setPhase(PHASES.PACKAGES)}
        onFinishSession={() => {
          clearStoredIntake();
          setCycleMeta(null);
          setVariants([]);
          setSelectedVariantId("");
          setPhase(PHASES.FINISHED);
        }}
      />
    );
  }

  /* PACKAGES */
  if (phase === PHASES.PACKAGES) {
    return (
      <Phase4Options
        post={
          variants.find((variant) => variant.id === selectedVariantId)
            ?.text || ""
        }
        variants={variants}
        hashtags={hashtags}
        onVariantAdd={(variant) => {
          setVariants((prev) => [...prev, variant]);
          setSelectedVariantId(variant.id);
          setHashtags([]);
        }}
        onHashtagsUpdate={(next) => setHashtags(next || [])}
        onBack={() => setPhase(PHASES.FINAL)}
      />
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
