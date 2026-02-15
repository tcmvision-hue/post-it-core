import { useEffect, useState } from "react";
import { getUser, syncPendingPaymentFromUrl, syncUserFromUrl } from "./utils/user";
import { apiFetch } from "./utils/api";
import { useI18n } from "./i18n/I18nContext";

/* UI – HOME */
import Welcome from "./ui/home/Welcome";
import Explanation from "./ui/home/Explanation";
import Today from "./ui/home/Today";
import CoinsGate from "./ui/home/CoinsGate";
import { VIDEO_BG } from "./ui/home/VideoBackgrounds";

/* INTAKE */
import Intake from "./ui/home/Intake";

/* REFLECTION */
import Reflection from "./ui/components/Reflection/Reflection";

/* GENERATION */
import Generation from "./ui/home/Generation";
import SelectPost from "./ui/home/SelectPost";
import Output from "./ui/home/Output";
import Phase4Options from "./ui/home/Phase4Options";
import Finished from "./ui/home/Finished";
import Download from "./ui/download/Download";

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

const INTAKE_KEY = "post_it_intake";
const INTAKE_PERSIST_KEY = "post_it_intake_persist";

function loadStoredIntake() {
  if (typeof window === "undefined") return null;
  try {
    const sessionRaw = window.sessionStorage.getItem(INTAKE_KEY);
    if (sessionRaw) return JSON.parse(sessionRaw);

    const localRaw = window.localStorage.getItem(INTAKE_PERSIST_KEY);
    if (!localRaw) return null;

    const parsed = JSON.parse(localRaw);
    window.sessionStorage.setItem(INTAKE_KEY, localRaw);
    return parsed;
  } catch {
    return null;
  }
}

function storeIntake(data) {
  if (typeof window === "undefined") return;
  try {
    const payload = JSON.stringify(data);
    window.sessionStorage.setItem(INTAKE_KEY, payload);
    window.localStorage.setItem(INTAKE_PERSIST_KEY, payload);
  } catch {
    // Ignore storage errors (private mode or quota)
  }
}

function clearStoredIntake() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(INTAKE_KEY);
    window.localStorage.removeItem(INTAKE_PERSIST_KEY);
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

let todayVideoPrimePromise = null;

function primeTodayVideoStartFrame() {
  if (typeof document === "undefined") return Promise.resolve();
  if (todayVideoPrimePromise) return todayVideoPrimePromise;

  todayVideoPrimePromise = new Promise((resolve) => {
    const video = document.createElement("video");
    let settled = false;

    const cleanup = () => {
      video.onloadedmetadata = null;
      video.onseeked = null;
      video.oncanplay = null;
      video.onerror = null;
      clearTimeout(timeoutId);
    };

    const done = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };

    const timeoutId = setTimeout(done, 5000);

    video.src = VIDEO_BG.today.video;
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      try {
        video.currentTime = 1;
      } catch {
        done();
      }
    };

    video.onseeked = () => {
      if (video.currentTime >= 0.95 && video.readyState >= 2) {
        done();
      }
    };
    video.oncanplay = () => {
      if (video.currentTime >= 0.95 && video.readyState >= 2) {
        done();
      }
    };
    video.onerror = done;

    try {
      video.load();
    } catch {
      done();
    }
  });

  return todayVideoPrimePromise;
}

export default function App() {
  const {
    lang,
    shouldPromptLanguage,
    detectedLocalLang,
    confirmLanguageChoice,
    getLanguageName,
    t,
  } = useI18n();
  const isDownloadRoute =
    typeof window !== "undefined" &&
    window.location.pathname.replace(/\/+$/, "") === "/download";
  const [phase, setPhase] = useState(getReturnPhase);

  const [intake, setIntake] = useState(() => loadStoredIntake());
  const [generations, setGenerations] = useState([]);
  const [variants, setVariants] = useState([]);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [hashtags, setHashtags] = useState([]);
  const [cycleMeta, setCycleMeta] = useState(null);
  const [confirmError, setConfirmError] = useState("");

  useEffect(() => {
    syncUserFromUrl();
    syncPendingPaymentFromUrl();

    const params = new URLSearchParams(window.location.search);
    if (
      params.has("return") ||
      params.has("uid") ||
      params.has("id") ||
      params.has("payment_id")
    ) {
      params.delete("return");
      params.delete("uid");
      params.delete("id");
      params.delete("payment_id");
      const nextSearch = params.toString();
      const nextUrl = nextSearch
        ? `${window.location.pathname}?${nextSearch}`
        : window.location.pathname;
      window.history.replaceState({}, "", nextUrl);
    }
  }, []);

  useEffect(() => {
    if (shouldPromptLanguage) return;

    const user = getUser();
    apiFetch("/api/profile/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId: user.id,
        language: lang,
      }),
    }).catch(() => {
      // profiel bootstrap probeert opnieuw op volgende call
    });
  }, [lang, shouldPromptLanguage]);

  useEffect(() => {
    if (phase === PHASES.EXPLANATION) {
      primeTodayVideoStartFrame();
    }
  }, [phase]);

  // ⬇️ Alleen visuele timing
  const [showGeneration, setShowGeneration] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get("return");
    if (returnTo !== "packages") return;

    try {
      const raw = window.sessionStorage.getItem("post_it_packages_return_context");
      if (!raw) {
        setPhase(PHASES.COINS);
        return;
      }

      const parsed = JSON.parse(raw);
      const restoredPost = typeof parsed?.post === "string" ? parsed.post.trim() : "";
      if (!restoredPost) {
        setPhase(PHASES.COINS);
        return;
      }

      const restoredVariant = createVariant(
        {
          text: restoredPost,
          label: "Origineel",
          accent: "Origineel",
          kind: "official",
        },
        "original"
      );

      const restoredHashtags = Array.isArray(parsed?.hashtags)
        ? parsed.hashtags
          .filter((entry) => typeof entry === "string" && entry.trim())
          .map((entry) => ({ tag: entry.trim(), selected: true }))
        : [];

      setVariants([restoredVariant]);
      setSelectedVariantId(restoredVariant.id);
      setHashtags(restoredHashtags);
      setPhase(PHASES.PACKAGES);
    } catch {
      setPhase(PHASES.COINS);
    }
  }, []);

  useEffect(() => {
    const noScrollPhases = [
      PHASES.WELCOME,
      PHASES.EXPLANATION,
      PHASES.TODAY,
      PHASES.INTAKE,
    ];

    const shouldLock = noScrollPhases.includes(phase);
    const scrollY = window.scrollY;

    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyOverflowX = document.body.style.overflowX;
    const prevBodyOverflowY = document.body.style.overflowY;
    const prevBodyPosition = document.body.style.position;
    const prevBodyTop = document.body.style.top;
    const prevBodyLeft = document.body.style.left;
    const prevBodyRight = document.body.style.right;
    const prevBodyWidth = document.body.style.width;
    const prevBodyTouchAction = document.body.style.touchAction;
    const prevBodyOverscroll = document.body.style.overscrollBehavior;

    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevHtmlOverflowX = document.documentElement.style.overflowX;
    const prevHtmlOverflowY = document.documentElement.style.overflowY;
    const prevHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    if (shouldLock) {
      document.body.style.overflow = "hidden";
      document.body.style.overflowX = "hidden";
      document.body.style.overflowY = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
      document.body.style.touchAction = "none";
      document.body.style.overscrollBehavior = "none";

      document.documentElement.style.overflow = "hidden";
      document.documentElement.style.overflowX = "hidden";
      document.documentElement.style.overflowY = "hidden";
      document.documentElement.style.overscrollBehavior = "none";
    }

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.overflowX = prevBodyOverflowX;
      document.body.style.overflowY = prevBodyOverflowY;
      document.body.style.position = prevBodyPosition;
      document.body.style.top = prevBodyTop;
      document.body.style.left = prevBodyLeft;
      document.body.style.right = prevBodyRight;
      document.body.style.width = prevBodyWidth;
      document.body.style.touchAction = prevBodyTouchAction;
      document.body.style.overscrollBehavior = prevBodyOverscroll;

      document.documentElement.style.overflow = prevHtmlOverflow;
      document.documentElement.style.overflowX = prevHtmlOverflowX;
      document.documentElement.style.overflowY = prevHtmlOverflowY;

      document.documentElement.style.overscrollBehavior = prevHtmlOverscroll;

      if (shouldLock) {
        window.scrollTo(0, scrollY);
      }
    };
  }, [phase]);

  if (isDownloadRoute) {
    return <Download />;
  }

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

  function restartGenerationFlow() {
    setConfirmError("");
    setGenerations([]);
    setVariants([]);
    setSelectedVariantId("");
    setHashtags([]);
    setShowGeneration(false);
    setPhase(PHASES.COINS);
  }

  async function playShutterSound() {
    if (typeof window === "undefined") return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    try {
      await context.resume();
      const now = context.currentTime;

      const click = context.createOscillator();
      const clickGain = context.createGain();
      click.type = "square";
      click.frequency.setValueAtTime(1700, now);
      clickGain.gain.setValueAtTime(0.001, now);
      clickGain.gain.exponentialRampToValueAtTime(0.16, now + 0.003);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
      click.connect(clickGain);
      clickGain.connect(context.destination);
      click.start(now);
      click.stop(now + 0.05);

      const bufferSize = context.sampleRate * 0.1;
      const noiseBuffer = context.createBuffer(1, bufferSize, context.sampleRate);
      const channel = noiseBuffer.getChannelData(0);
      for (let index = 0; index < bufferSize; index += 1) {
        channel[index] = Math.random() * 2 - 1;
      }
      const noise = context.createBufferSource();
      noise.buffer = noiseBuffer;
      const noiseFilter = context.createBiquadFilter();
      noiseFilter.type = "highpass";
      noiseFilter.frequency.setValueAtTime(600, now);
      const noiseGain = context.createGain();
      noiseGain.gain.setValueAtTime(0.0001, now + 0.016);
      noiseGain.gain.exponentialRampToValueAtTime(0.11, now + 0.03);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(context.destination);
      noise.start(now + 0.016);
      noise.stop(now + 0.12);

      await new Promise((resolve) => setTimeout(resolve, 160));
    } catch {
      // no-op when audio cannot play
    } finally {
      context.close().catch(() => {});
    }
  }

  async function handleTodayContinue() {
    await playShutterSound();
    setPhase(PHASES.INTAKE);
  }

  async function continueToToday() {
    await primeTodayVideoStartFrame();
    setPhase(PHASES.TODAY);
  }

  async function confirmSelection(postPayload) {
    setConfirmError("");
    try {
      const user = getUser();
      const normalizedInput = normalizePostPayload(postPayload);
      const isOfficialSelection = postPayload?.kind === "official"
        || normalizedInput.label === "Origineel";
      const res = await apiFetch("/api/phase4/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, isOfficial: isOfficialSelection }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setConfirmError(data?.error || "Bevestigen mislukt");
        return;
      }
      const normalized = normalizedInput;
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
    return (
      <>
        <Welcome onContinue={() => setPhase(PHASES.EXPLANATION)} />
        {shouldPromptLanguage && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.35)",
              zIndex: 50,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: 18,
            }}
          >
            <div
              style={{
                width: "90vw",
                maxWidth: 360,
                border: "3px solid #145C63",
                borderRadius: 18,
                background: "rgba(250,250,248,0.96)",
                boxShadow: "0 2px 12px 0 rgba(60,60,40,0.04)",
                padding: 18,
                boxSizing: "border-box",
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: 10 }}>{t("lang.modal.title")}</h3>
              <p style={{ marginTop: 0, marginBottom: 14, lineHeight: 1.4 }}>
                {t("lang.modal.text")}
              </p>
              <button
                style={{
                  width: "100%",
                  marginBottom: 8,
                  border: "1px solid #145C63",
                  borderRadius: 10,
                  padding: "10px 12px",
                  background: "#145C63",
                  color: "#fff",
                  cursor: "pointer",
                }}
                onClick={() => confirmLanguageChoice(detectedLocalLang)}
              >
                {t("lang.modal.local")}: {getLanguageName(detectedLocalLang)}
              </button>
              <button
                style={{
                  width: "100%",
                  border: "1px solid #145C63",
                  borderRadius: 10,
                  padding: "10px 12px",
                  background: "#fff",
                  color: "#145C63",
                  cursor: "pointer",
                }}
                onClick={() => confirmLanguageChoice("en")}
              >
                {t("lang.modal.english")}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  if (phase === PHASES.EXPLANATION) {
    return <Explanation onContinue={continueToToday} />;
  }

  if (phase === PHASES.TODAY) {
    return (
      <Today onContinue={handleTodayContinue} />
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
        onRegenerate={restartGenerationFlow}
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
        onRegenerate={() => {
          restartGenerationFlow();
        }}
        onFinishSession={() => {
          clearStoredIntake();
          if (typeof window !== "undefined") {
            try {
              window.sessionStorage.removeItem("post_it_packages_return_context");
            } catch {
              // ignore storage errors
            }
          }
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
        hashtags={hashtags}
        onVariantAdd={(variant) => {
          const normalized = normalizePostPayload(variant);
          const preparedVariant = createVariant(
            {
              ...normalized,
              label: variant?.label || normalized.label || "Variant",
              accent: variant?.accent || normalized.accent || variant?.label || "",
              kind: variant?.kind || variant?.type || "rephrase",
            },
            "generation"
          );
          setVariants((prev) => [...prev, preparedVariant]);
          setSelectedVariantId(preparedVariant.id);
          setHashtags([]);
        }}
        onHashtagsUpdate={(next) => setHashtags(next || [])}
        onRegenerate={restartGenerationFlow}
        onBack={() => setPhase(PHASES.FINAL)}
      />
    );
  }

  /* EINDSCHERM */
  if (phase === PHASES.FINISHED) {
    return <Finished onDone={() => setPhase(PHASES.WELCOME)} />;
  }

  return null;
}
