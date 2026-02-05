import { useRef, useState, useEffect } from "react";

export default function AudioTranscriber({ onResult }) {
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState("");

  async function start() {
    setStatus("");
    audioChunksRef.current = [];

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunksRef.current.push(e.data);
      }
    };

    mediaRecorder.start();
    setRecording(true);
  }

  function stop() {
    setRecording(false);
    mediaRecorderRef.current.stop();

    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, {
        type: "audio/webm",
      });
      console.log("Audio blob:", audioBlob);
      setStatus("Spraak ontvangen. Audio is vastgelegd.");
    };
  }

  return (
    <div>
      {status && <p>{status}</p>}
      <button onClick={recording ? stop : start}>🎤</button>
    </div>
  );
}
