import { useState, useEffect, useRef } from "react";
import { checkKladblok } from "../../ai/checkKladblok";
// import { checkKladblok } from "../ai/checkKladblok";
import AudioTranscriber from "../components/AudioTranscriber";

export default function Intake({ onComplete }) {
  const [step, setStep] = useState(0);

  const [kladblok, setKladblok] = useState("");
  const [kladblokOk, setKladblokOk] = useState(true);
  const [kladblokCheckLoading, setKladblokCheckLoading] = useState(false);
  const [invalidAttempts, setInvalidAttempts] = useState(0);
  const [resetNotice, setResetNotice] = useState("");
  const resetTimeout = useRef(null);
  const [doelgroep, setDoelgroep] = useState("");
  const [intentie, setIntentie] = useState("");
  const [context, setContext] = useState("");
  const [platformen, setPlatformen] = useState([]);

  const [error, setError] = useState("");

  const MIN_WORDS = 20;
  const MAX_WORDS = 220;

  function wordCount(text) {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  const wc = wordCount(kladblok);
  const isTooLong = wc > MAX_WORDS;

  useEffect(() => {
    if (!kladblok.trim()) {
      setKladblokOk(true);
      return;
    }
    setKladblokCheckLoading(true);
    checkKladblok(kladblok).then((result) => {
      setKladblokOk(result.ok);
      setKladblokCheckLoading(false);
      if (result.ok) {
        setInvalidAttempts(0);
      }
    });
  }, [kladblok]);

  function togglePlatform(p) {
    setPlatformen((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  function getInvalidInputMessage(attempt) {
    if (attempt <= 1) {
      // Poging 1 & 2 — zacht, uitnodigend
      return [
        "Dit voelt nog wat leeg. Neem gerust even de tijd om te beschrijven wat er vandaag speelt.",
        "Je kunt hier iets toevoegen over wat voor jou belangrijk is vandaag."
      ][attempt];
    }
    if (attempt === 2) {
      // Poging 3 — directer
      return "Om een goede post te maken, is wat meer context nodig.";
    }
    if (attempt === 3) {
      // Poging 4 — licht sarcastisch
      return "Ik kan veel, maar gedachten lezen hoort daar nog niet bij.";
    }
    if (attempt === 4) {
      // Poging 5 — laatste waarschuwing
      return "Zonder context kan ik geen post maken.";
    }
    return "";
  }

  function resetIntake() {
    setKladblok("");
    setDoelgroep("");
    setIntentie("");
    setContext("");
    setPlatformen([]);
    setInvalidAttempts(0);
    setResetNotice("We beginnen opnieuw.");
    resetTimeout.current = setTimeout(() => setResetNotice(""), 2000);
    setStep(0);
  }

  function validateStep(nextStep) {
    setError("");

    if (step === 0) {
      if (wc < MIN_WORDS || !kladblokOk) {
        if (invalidAttempts < 4) {
          setInvalidAttempts((prev) => prev + 1);
          setError(getInvalidInputMessage(invalidAttempts));
        } else {
          setError(getInvalidInputMessage(4));
          setTimeout(() => {
            resetIntake();
          }, 1500);
        }
        return;
      }
      if (wc > MAX_WORDS) {
        setError("Deze tekst is te lang voor één post.");
        return;
      }
    }

    if (step === 1 && !doelgroep) {
      setError("Kies een doelgroep.");
      return;
    }

    if (step === 2 && !intentie) {
      setError("Kies één intentie.");
      return;
    }

    if (step === 3 && !context) {
      setError("Kies een context.");
      return;
    }

    if (step === 4 && platformen.length === 0) {
      setError("Kies minimaal één platform.");
      return;
    }

    setStep(nextStep);
  }

  function Button({ active, children, onClick }) {
    return (
      <button
        onClick={onClick}
        style={{
          padding: "10px 14px",
          borderRadius: 6,
          border: "1px solid #ccc",
          background: active ? "#111" : "#f2f2f2",
          color: active ? "#fff" : "#000",
          cursor: "pointer",
        }}
      >
        {children}
      </button>
    );
  }

  function Nav({ onBack, onNext, nextLabel = "Verder" }) {
    return (
      <div style={{ display: "flex", gap: 16, marginTop: 32 }}>
        {onBack && <button onClick={onBack}>Terug</button>}
        {onNext && <button onClick={onNext}>{nextLabel}</button>}
      </div>
    );
  }

  function ConfirmBox({ label }) {
    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid #ddd",
          padding: 12,
          borderRadius: 6,
          marginTop: 16,
        }}
      >
        <strong>Gekozen:</strong>
        <div style={{ marginTop: 4 }}>{label || "—"}</div>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        {resetNotice && (
          <p style={{ color: "#8a6d3b", marginBottom: 16 }}>{resetNotice}</p>
        )}
        {!resetNotice && error && (
          <p style={{ color: "#8a6d3b", marginBottom: 16 }}>{error}</p>
        )}

        {/* STAP 0 — KLADBLOK */}
        {step === 0 && (
          <>
            <h2>Uw gedachten</h2>
            <p>Zeg of schrijf wat u wilt posten.</p>

            <textarea
              value={kladblok}
              onChange={(e) => setKladblok(e.target.value)}
              rows={6}
              placeholder="Wat speelt er vandaag?"
              style={{
                ...styles.textarea,
                borderColor: isTooLong ? "#d6b36a" : kladblokOk ? "#ccc" : "#d66a6a",
              }}
            />
            {!kladblokOk && (
              <p style={{ color: "#d66a6a", marginTop: 8 }}>
                Let op: deze tekst is niet geschikt voor Post This.
              </p>
            )}
            {kladblokCheckLoading && (
              <p style={{ color: "#888", marginTop: 8 }}>
                AI check bezig…
              </p>
            )}

            <AudioTranscriber
              onResult={(text) =>
                setKladblok((prev) => (prev ? prev + " " + text : text))
              }
            />

            <Nav onNext={() => validateStep(1)} />
          </>
        )}

        {/* STAP 1 — DOELGROEP */}
        {step === 1 && (
          <>
            <h2>Voor wie is deze post?</h2>
            <div style={styles.choices}>
              {["Klanten", "Volgers", "Collega’s", "Brede doelgroep"].map((o) => (
                <Button
                  key={o}
                  active={doelgroep === o}
                  onClick={() => setDoelgroep(o)}
                >
                  {o}
                </Button>
              ))}
            </div>
            <ConfirmBox label={doelgroep} />
            <Nav onBack={() => setStep(0)} onNext={() => validateStep(2)} />
          </>
        )}

        {/* STAP 2 — INTENTIE */}
        {step === 2 && (
          <>
            <h2>Wat wilt u met deze post?</h2>
            <div style={styles.choices}>
              {["Informeren", "Delen", "Positioneren", "Aankondigen"].map((o) => (
                <Button
                  key={o}
                  active={intentie === o}
                  onClick={() => setIntentie(o)}
                >
                  {o}
                </Button>
              ))}
            </div>
            <ConfirmBox label={intentie} />
            <Nav onBack={() => setStep(1)} onNext={() => validateStep(3)} />
          </>
        )}

        {/* STAP 3 — CONTEXT */}
        {step === 3 && (
          <>
            <h2>Wat speelt er nu?</h2>
            <div style={styles.choices}>
              {[
                "Actualiteit",
                "Persoonlijk moment",
                "Reactie op iets",
                "Geen specifieke aanleiding",
              ].map((o) => (
                <Button
                  key={o}
                  active={context === o}
                  onClick={() => setContext(o)}
                >
                  {o}
                </Button>
              ))}
            </div>
            <ConfirmBox label={context} />
            <Nav onBack={() => setStep(2)} onNext={() => validateStep(4)} />
          </>
        )}

        {/* STAP 4 — PLATFORMEN */}
        {step === 4 && (
          <>
            <h2>Waar plaatst u deze post?</h2>
            <div style={styles.choices}>
              {["Instagram", "LinkedIn", "Facebook", "X", "TikTok"].map((p) => (
                <Button
                  key={p}
                  active={platformen.includes(p)}
                  onClick={() => togglePlatform(p)}
                >
                  {p}
                </Button>
              ))}
            </div>
            <ConfirmBox label={platformen.join(", ")} />
            <Nav onBack={() => setStep(3)} onNext={() => validateStep(5)} />
          </>
        )}

        {/* STAP 5 — BEVESTIGEN */}
        {step === 5 && (
          <>
            <h2>Bevestigen</h2>
            <ConfirmBox label={kladblok} />
            <ConfirmBox label={doelgroep} />
            <ConfirmBox label={intentie} />
            <ConfirmBox label={context} />
            <ConfirmBox label={platformen.join(", ")} />

            <Nav
              onBack={() => setStep(4)}
              onNext={() =>
                onComplete({
                  kladblok,
                  doelgroep,
                  intentie,
                  context,
                  platformen,
                })
              }
              nextLabel="Bevestigen"
            />
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: 620,
    padding: 32,
    background: "#f6f3ee",
    borderRadius: 12,
  },
  textarea: {
    width: "100%",
    padding: 12,
    borderRadius: 6,
    border: "1px solid #ccc",
    fontFamily: "inherit",
  },
  choices: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
  },
};
