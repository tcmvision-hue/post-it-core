import { apiFetch } from "../utils/api";

// Check voor kladblok: stuurt tekst naar backend voor beoordeling
export async function checkKladblok(text) {
  try {
    const response = await apiFetch("/api/check-kladblok", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) return { ok: true };
    const data = await response.json();
    return data;
  } catch {
    return { ok: true };
  }
}
