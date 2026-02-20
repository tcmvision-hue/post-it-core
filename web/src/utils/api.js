function normalizeBaseUrl(rawBase) {
  const base = String(rawBase || "").trim();
  if (!base) return "";
  return base.replace(/\/+$/, "");
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || ""));
}

function normalizeApiPath(path) {
  const raw = String(path || "").trim();
  if (!raw) return "/";
  if (isHttpUrl(raw)) return raw;
  if (raw.startsWith("/")) return raw;
  if (raw.startsWith("api/")) return `/${raw}`;
  return `/${raw.replace(/^\/+/, "")}`;
}

function isBlockedByContextError(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    error?.name === "DOMException" ||
    message.includes("not allowed by the user agent") ||
    message.includes("current context") ||
    message.includes("failed to fetch")
  );
}

function reportFetchFailure(kind, details) {
  try {
    console.error(`[apiFetch] ${kind}`, details);
  } catch {
    // ignore logging errors
  }
}

export function apiUrl(path) {
  const normalizedPath = normalizeApiPath(path);

  if (isHttpUrl(normalizedPath)) {
    return normalizedPath;
  }

  const base = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);
  if (!base) {
    return normalizedPath;
  }

  if (typeof window !== "undefined") {
    try {
      const baseUrl = new URL(base, window.location.origin);
      if (window.location.protocol === "https:" && baseUrl.protocol === "http:") {
        return normalizedPath;
      }

      const baseOrigin = baseUrl.origin;
      if (baseOrigin !== window.location.origin) {
        return normalizedPath;
      }
    } catch {
      return normalizedPath;
    }
  }

  return `${base}${normalizedPath}`;
}

function shouldRetryWithRelative(response) {
  return [404, 408, 429, 500, 502, 503, 504].includes(response.status);
}

export async function apiFetch(path, init) {
  const relativePath = normalizeApiPath(path);
  const primaryUrl = apiUrl(relativePath);
  const usesExternalBase = primaryUrl !== relativePath;
  const method = String(init?.method || "GET").toUpperCase();
  const requestInit = {
    ...(init || {}),
    credentials: "include",
  };

  try {
    const response = await fetch(primaryUrl, requestInit);
    if (usesExternalBase && shouldRetryWithRelative(response)) {
      return fetch(relativePath, requestInit);
    }
    return response;
  } catch (error) {
    reportFetchFailure("primary-failed", {
      method,
      url: primaryUrl,
      name: error?.name,
      message: error?.message,
      blockedByContext: isBlockedByContextError(error),
      reachedNetwork: false,
    });

    try {
      const fallbackUrl =
        typeof window !== "undefined"
          ? new URL(relativePath, window.location.origin).toString()
          : relativePath;

      return await fetch(fallbackUrl, {
        ...requestInit,
        credentials: "same-origin",
      });
    } catch (fallbackError) {
      reportFetchFailure("fallback-failed", {
        method,
        url: relativePath,
        name: fallbackError?.name,
        message: fallbackError?.message,
        blockedByContext: isBlockedByContextError(fallbackError),
        reachedNetwork: false,
      });
      throw fallbackError;
    }
  }
}
