function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return (
    "u-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36)
  );
}

const USER_STORAGE_KEY = "post-this:user";
const PENDING_PAYMENT_KEY = "post-this:pending-payment-id";

function normalizePaymentId(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return /^tr_[A-Za-z0-9]+$/.test(raw) ? raw : "";
}

function getUidFromQuery() {
  if (typeof window === "undefined") return "";
  try {
    const params = new URLSearchParams(window.location.search || "");
    const uid = String(params.get("uid") || "").trim();
    return uid;
  } catch {
    return "";
  }
}

function getPaymentIdFromQuery() {
  if (typeof window === "undefined") return "";
  try {
    const params = new URLSearchParams(window.location.search || "");
    return normalizePaymentId(params.get("id") || params.get("payment_id"));
  } catch {
    return "";
  }
}

export function setPendingPaymentId(paymentId) {
  if (typeof window === "undefined") return;
  const normalized = normalizePaymentId(paymentId);
  if (!normalized) return;
  try {
    localStorage.setItem(PENDING_PAYMENT_KEY, normalized);
  } catch {
    // ignore storage errors
  }
}

export function getPendingPaymentId() {
  if (typeof window === "undefined") return "";
  try {
    return normalizePaymentId(localStorage.getItem(PENDING_PAYMENT_KEY));
  } catch {
    return "";
  }
}

export function clearPendingPaymentId() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PENDING_PAYMENT_KEY);
  } catch {
    // ignore storage errors
  }
}

export function syncPendingPaymentFromUrl() {
  const paymentId = getPaymentIdFromQuery();
  if (!paymentId) return "";
  setPendingPaymentId(paymentId);
  return paymentId;
}

export function syncUserFromUrl() {
  if (typeof window === "undefined") return;

  const uid = getUidFromQuery();
  if (!uid) return;

  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(
        USER_STORAGE_KEY,
        JSON.stringify({ id: uid, username: null, createdAt: Date.now() })
      );
      return;
    }

    const parsed = JSON.parse(raw);
    if (parsed && parsed.id === uid) return;

    localStorage.setItem(
      USER_STORAGE_KEY,
      JSON.stringify({
        ...parsed,
        id: uid,
        username: parsed?.username ?? null,
        createdAt: parsed?.createdAt ?? Date.now(),
      })
    );
  } catch {
    // ignore storage/parse errors
  }
}

export function getUser() {
  syncUserFromUrl();
  syncPendingPaymentFromUrl();

  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);

    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed.id === "string" && parsed.id.trim()) {
        return parsed;
      }
    }
  } catch {
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  }

  const user = {
    id: generateId(),
    username: null,
    createdAt: Date.now(),
  };

  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // ignore storage errors
  }
  return user;
}
