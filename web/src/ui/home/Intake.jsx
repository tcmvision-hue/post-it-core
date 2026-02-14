import { useState, useEffect, useRef } from "react";
import { checkKladblok } from "../../ai/checkKladblok";
import AudioTranscriber from "../components/AudioTranscriber";
import VideoBackground from "../../components/VideoBackground";
import { VIDEO_BG } from "./VideoBackgrounds";
import { useI18n } from "../../i18n/I18nContext";

export default function Intake({ onComplete }) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);

  const doelgroepOptions = [
    "intake.opt.doelgroep.klanten",
    "intake.opt.doelgroep.volgers",
    "intake.opt.doelgroep.collegas",
    "intake.opt.doelgroep.breed",
  ].map((key) => ({ key, label: t(key) }));

  const intentieOptions = [
    "intake.opt.intentie.informeren",
    "intake.opt.intentie.delen",
    "intake.opt.intentie.positioneren",
    "intake.opt.intentie.aankondigen",
  ].map((key) => ({ key, label: t(key) }));

  const contextOptions = [
    "intake.opt.context.actualiteit",
    "intake.opt.context.persoonlijk",
    "intake.opt.context.reactie",
    "intake.opt.context.geen",
  ].map((key) => ({ key, label: t(key) }));

  const platformOptions = [
    "intake.opt.platform.instagram",
    "intake.opt.platform.linkedin",
    "intake.opt.platform.facebook",
    "intake.opt.platform.x",
    "intake.opt.platform.tiktok",
  ].map((key) => ({ key, label: t(key) }));

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
  const MODERATION_CHECK_WORDS = 30;

  function wordCount(text) {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  const wc = wordCount(kladblok);
  const isTooLong = wc > MAX_WORDS;

  useEffect(() => {
    const trimmed = kladblok.trim();
    if (!trimmed) {
      setKladblokOk(true);
      setKladblokCheckLoading(false);
      return;
    }

    const count = wordCount(trimmed);
    if (count < MODERATION_CHECK_WORDS) {
      setKladblokOk(true);
      setKladblokCheckLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      setKladblokCheckLoading(true);
      checkKladblok(trimmed).then((result) => {
        setKladblokOk(result.ok);
        setKladblokCheckLoading(false);
        if (result.ok) {
          setInvalidAttempts(0);
        }
      });
    }, 900);

    return () => clearTimeout(timer);
  }, [kladblok]);

  function togglePlatform(p) {
    setPlatformen((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  function getInvalidInputMessage(attempt) {
    if (attempt <= 1) {
      return [
        t("intake.warning.empty1"),
        t("intake.warning.empty2")
      ][attempt];
    }
    if (attempt === 2) {
      return t("intake.warning.empty3");
    }
    if (attempt === 3) {
      return t("intake.warning.empty4");
    }
    if (attempt === 4) {
      return t("intake.warning.empty5");
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
    setResetNotice(t("intake.reset"));
    resetTimeout.current = setTimeout(() => setResetNotice(""), 2000);
    setStep(0);
  }

  function validateStep(nextStep) {
    setError("");

    if (step === 0) {
      if (wc < MIN_WORDS || (wc >= MODERATION_CHECK_WORDS && !kladblokOk)) {
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
        setError(t("intake.warning.tooLong"));
        return;
      }
    }

    if (step === 1 && !doelgroep) {
      setError(t("intake.error.doelgroep"));
      return;
    }

    if (step === 2 && !intentie) {
      setError(t("intake.error.intentie"));
      return;
    }

    if (step === 3 && !context) {
      setError(t("intake.error.context"));
      return;
    }

    if (step === 4 && platformen.length === 0) {
      setError(t("intake.error.platform"));
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

  function Nav({ onBack, onNext, nextLabel = t("common.next") }) {
    const isCompact = step === 5;
    return (
      <div style={{ display: "flex", gap: 12, marginTop: isCompact ? 14 : 32 }}>
        {onBack && <button onClick={onBack}>{t("common.back")}</button>}
        {onNext && <button onClick={onNext}>{nextLabel}</button>}
      </div>
    );
  }

  function ConfirmBox({ label }) {
    const isCompact = step === 5;
    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid #ddd",
          padding: isCompact ? 8 : 12,
          borderRadius: 6,
          marginTop: isCompact ? 8 : 16,
          boxSizing: "border-box",
          width: "100%",
          maxWidth: "100%",
          overflow: "hidden",
          wordBreak: "break-word",
          overflowWrap: "anywhere",
          fontSize: isCompact ? 13 : 14,
          lineHeight: isCompact ? 1.25 : 1.4,
        }}
      >
        <strong>{t("intake.chosen")}</strong>
        <div
          style={{
            marginTop: 4,
            maxHeight: isCompact ? 86 : "none",
            overflowY: isCompact ? "auto" : "visible",
            overflowX: "hidden",
            whiteSpace: "pre-wrap",
          }}
        >
          {label || "—"}
        </div>
      </div>
    );
  }

  return (
    <>
      <VideoBackground
        fallbackSrc={VIDEO_BG.intake.fallback}
        alt="Bos en waterval"
        showFallback={true}
        overlayOpacity={0}
      />
      <div style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "fixed",
        top: "-0.8cm",
        left: 0,
        zIndex: 10,
        pointerEvents: "none"
      }}>
        <img
          src="/video/logo.png"
          alt="POST THIS logo"
          style={{
            maxWidth: "min(430px, 96vw)",
            width: "96vw",
            height: "auto",
            objectFit: "contain",
            display: "block",
            background: "none",
            boxShadow: "none",
            marginLeft: "auto",
            marginRight: "auto",
            marginTop: 0,
            marginBottom: 0,
          }}
        />
      </div>
      <div style={styles.wrapper}>
      <div style={step === 5 ? { ...styles.card, ...styles.cardCompact } : styles.card}>
        {resetNotice && (
          <p style={{ color: "#8a6d3b", marginBottom: 16 }}>{resetNotice}</p>
        )}
        {!resetNotice && error && (
          <p style={styles.warningText}>{error}</p>
        )}

        {/* STAP 0 — KLADBLOK */}
        {step === 0 && (
          <>
            <h2>{t("intake.title")}</h2>
            <p>{t("intake.subtitle")}</p>
            <p style={styles.inputInfoText}>
              {t("intake.info")}
            </p>

            <textarea
              value={kladblok}
              onChange={(e) => setKladblok(e.target.value)}
              rows={6}
              placeholder={t("intake.placeholder")}
              style={{
                ...styles.textarea,
                borderColor: isTooLong ? "#d6b36a" : kladblokOk ? "#ccc" : "#c40000",
                borderWidth: kladblokOk ? 1 : 2,
              }}
            />
            {!kladblokOk && (
              <p
                style={{
                  color: "#c40000",
                  marginTop: 8,
                  fontWeight: 700,
                  textShadow:
                    "-0.6px 0 #000, 0 0.6px #000, 0.6px 0 #000, 0 -0.6px #000",
                  letterSpacing: "0.01em",
                }}
              >
                {t("intake.warning.invalid")}
              </p>
            )}
            {kladblokCheckLoading && (
              <p style={{ color: "#888", marginTop: 8 }}>
                {t("intake.processing")}
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
            <h2>{t("intake.step1")}</h2>
            <div style={styles.choices}>
              {doelgroepOptions.map((o) => (
                <Button
                  key={o.key}
                  active={doelgroep === o.label}
                  onClick={() => setDoelgroep(o.label)}
                >
                  {o.label}
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
            <h2>{t("intake.step2")}</h2>
            <div style={styles.choices}>
              {intentieOptions.map((o) => (
                <Button
                  key={o.key}
                  active={intentie === o.label}
                  onClick={() => setIntentie(o.label)}
                >
                  {o.label}
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
            <h2>{t("intake.step3")}</h2>
            <div style={styles.choices}>
              {contextOptions.map((o) => (
                <Button
                  key={o.key}
                  active={context === o.label}
                  onClick={() => setContext(o.label)}
                >
                  {o.label}
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
            <h2>{t("intake.step4")}</h2>
            <p style={styles.platformHint}>{t("intake.multi")}</p>
            <div style={styles.choices}>
              {platformOptions.map((p) => (
                <Button
                  key={p.key}
                  active={platformen.includes(p.label)}
                  onClick={() => togglePlatform(p.label)}
                >
                  {p.label}
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
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>{t("intake.step5")}</h2>
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
              nextLabel={t("common.confirm")}
            />
          </>
        )}
      </div>
    </div>
    </>
  );
}

const styles = {
  wrapper: {
    width: "100vw",
    height: "100dvh",
    minHeight: "100dvh",
    maxHeight: "100dvh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    zIndex: 1,
    overflow: "hidden",
  },
  card: {
    width: "90vw",
    maxWidth: 340,
    padding: 32,
    border: "3px solid #145C63",
    borderRadius: 18,
    background: "rgba(250,250,248,0.50)",
    boxShadow: "0 2px 12px 0 rgba(60,60,40,0.04)",
    textAlign: "center",
    boxSizing: "border-box",
    position: "fixed",
    left: "50%",
    transform: "translateX(-50%)",
    bottom: "calc(24px + 1.5cm)",
    overflow: "hidden",
  },
  cardCompact: {
    padding: 20,
    maxHeight: "calc(100dvh - 76px)",
    overflowY: "auto",
  },
  textarea: {
    width: "100%",
    maxWidth: "100%",
    padding: 12,
    borderRadius: 6,
    border: "1px solid #ccc",
    fontFamily: "inherit",
    boxSizing: "border-box",
    resize: "none",
    overflowY: "auto",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
  },
  warningText: {
    color: "#c40000",
    marginBottom: 16,
    fontWeight: 700,
    textShadow:
      "-0.6px 0 #000, 0 0.6px #000, 0.6px 0 #000, 0 -0.6px #000",
    letterSpacing: "0.01em",
  },
  inputInfoText: {
    fontSize: 12,
    color: "#1f1f1f",
    opacity: 0.92,
    marginTop: 2,
    marginBottom: 10,
    lineHeight: 1.35,
  },
  platformHint: {
    marginTop: -2,
    marginBottom: 8,
    fontSize: 12,
    color: "#1f1f1f",
    opacity: 0.92,
  },
  choices: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
  },
};
