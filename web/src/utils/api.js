function normalizeBaseUrl(rawBase) {
  const base = String(rawBase || "").trim();
  if (!base) return "";
  return base.replace(/\/+$/, "");
}

export function apiUrl(path) {
  const normalizedPath = String(path || "");
  if (!normalizedPath.startsWith("/")) {
    return normalizedPath;
  }

  const base = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);
  if (!base) {
    return normalizedPath;
  }

  return `${base}${normalizedPath}`;
}

function shouldRetryWithRelative(response) {
  return [404, 408, 429, 500, 502, 503, 504].includes(response.status);
}

export async function apiFetch(path, init) {
  const relativePath = String(path || "");
  const primaryUrl = apiUrl(relativePath);
  const usesExternalBase = primaryUrl !== relativePath;

  try {
    const response = await fetch(primaryUrl, init);
    if (usesExternalBase && shouldRetryWithRelative(response)) {
      return fetch(relativePath, init);
    }
    return response;
  } catch (error) {
    if (!usesExternalBase) throw error;
    return fetch(relativePath, init);
  }
}
