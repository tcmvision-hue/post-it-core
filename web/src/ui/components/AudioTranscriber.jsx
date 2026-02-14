import { useEffect, useRef, useState } from "react";
import { transcribeAudio } from "../../stt/transcribeAudio";
import { useI18n } from "../../i18n/I18nContext";

export default function AudioTranscriber({ onResult, onRecordingChange }) {
  const { t, lang } = useI18n();
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [status, setStatus] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [showWave, setShowWave] = useState(false);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    if (typeof onRecordingChange === "function") {
      onRecordingChange(recording);
    }
  }, [recording, onRecordingChange]);

  async function start() {
    setStatus("");
    audioChunksRef.current = [];

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Audio analyser setup
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;
    setShowWave(true);

    function animateWave() {
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteTimeDomainData(dataArray);
      // Bereken gemiddelde amplitude
      const avg = dataArray.reduce((a, b) => a + Math.abs(b - 128), 0) / dataArray.length;
      setAudioLevel(avg);
      animationRef.current = requestAnimationFrame(animateWave);
    }
    animateWave();

    const options = { mimeType: "audio/webm;codecs=opus" };
    const mediaRecorder = new MediaRecorder(stream, options);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunksRef.current.push(e.data);
      }
    };

    mediaRecorder.start();
    setRecording(true);
  }

  async function stop() {
    setRecording(false);
    setShowWave(false);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (analyserRef.current && analyserRef.current.context) analyserRef.current.context.close();
    mediaRecorderRef.current.stop();

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, {
        type: "audio/webm",
      });
      setStatus(t("audio.received"));
      setTranscribing(true);
      try {
        const text = await transcribeAudio(audioBlob, lang);
        if (typeof text === "string" && text.trim()) {
          onResult(text);
        }
        // Bij falen of lege string: niets toevoegen, geen foutmelding
      } catch {
        // Stilte bij falen
      } finally {
        setTranscribing(false);
      }
    };
  }

  return (
    <div>
      {status && <p>{status}</p>}
      {transcribing && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 10px",
            borderRadius: 20,
            background: "#f6f3ee",
            border: "1px solid #e2ddd4",
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 16 }}>⏳</span>
          <span style={{ fontSize: 13, color: "#6b5f4c" }}>
            {t("intake.processing")}
          </span>
        </div>
      )}
      <button onClick={recording ? stop : start}>🎤</button>
      {showWave && (
        <div style={{ margin: "16px 0", height: 32, width: 220, background: "#f6f3ee", borderRadius: 8, overflow: "hidden", display: "flex", alignItems: "center" }}>
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center" }}>
            {[...Array(32)].map((_, i) => (
              <div
                key={i}
                style={{
                  width: 6,
                  height: Math.max(8, audioLevel + Math.sin(i + Date.now() / 200) * 8),
                  background: "#d66a6a",
                  marginRight: 2,
                  borderRadius: 4,
                  transition: "height 0.1s",
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
