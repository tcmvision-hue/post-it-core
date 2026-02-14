export async function transcribeAudio(audioBlob, language = "nl") {
  // Stuurt audioBlob direct naar backend voor transcriptie
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.webm');
    formData.append('language', language);
    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) return "";
    const data = await response.json();
    return typeof data.text === "string" ? data.text : "";
  } catch {
    return "";
  }
}
