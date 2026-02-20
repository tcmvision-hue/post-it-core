import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import dotenv from "dotenv";
import express from "express";
import { generatePost } from "./generatePost.js";
import {
  isSupportedOutputLanguage,
  languageInstruction,
  normalizeOutputLanguage,
} from "./languageUtils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

let openaiClient = null;

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing");
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}
const app = express();
const STORE_PATH = path.join(__dirname, "coinStore.json");
let storeLock = Promise.resolve();
const FALLBACK_STORE_KEY = "__post_this_coin_store";
const KV_REST_API_URL = process.env.KV_REST_API_URL;
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;
const KV_STORE_KEY = process.env.COIN_STORE_KV_KEY || "post-this:coin-store";
const COIN_BUNDLES = {
  "20": { coins: 20, amount: "10.00" },
  "50": { coins: 50, amount: "22.50" },
  "100": { coins: 100, amount: "40.00" },
};

function areCoinBlocksDisabled() {
  return false;
}

const MS_24H = 24 * 60 * 60 * 1000;

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, x-admin-secret"
  );

  // Debug logging
  if (process.env.VERCEL) {
    console.log("[DEBUG]", req.method, req.url, "baseUrl:", req.baseUrl, "path:", req.path);
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

function todayKey() {
  return new Date().toISOString().split("T")[0];
}

function inMemoryStore() {
  if (!globalThis[FALLBACK_STORE_KEY]) {
    globalThis[FALLBACK_STORE_KEY] = { users: {}, payments: {} };
  }
  return globalThis[FALLBACK_STORE_KEY];
}

function normalizeStoreShape(parsed) {
  const store = parsed && typeof parsed === "object" ? parsed : {};
  if (!store.users || typeof store.users !== "object") store.users = {};
  if (!store.payments || typeof store.payments !== "object") store.payments = {};
  if (!store.cycles || typeof store.cycles !== "object") store.cycles = {};
  return store;
}

function kvEnabled() {
  return Boolean(KV_REST_API_URL && KV_REST_API_TOKEN);
}

async function kvLoadStore() {
  const response = await fetch(
    `${KV_REST_API_URL.replace(/\/+$/, "")}/get/${encodeURIComponent(
      KV_STORE_KEY
    )}`,
    {
      headers: {
        Authorization: `Bearer ${KV_REST_API_TOKEN}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`KV get failed: ${response.status}`);
  }

  const data = await response.json();
  if (!data?.result) {
    return { users: {}, payments: {} };
  }

  try {
    return normalizeStoreShape(JSON.parse(data.result));
  } catch {
    return { users: {}, payments: {} };
  }
}

async function kvSaveStore(store) {
  const response = await fetch(
    `${KV_REST_API_URL.replace(/\/+$/, "")}/set/${encodeURIComponent(
      KV_STORE_KEY
    )}/${encodeURIComponent(JSON.stringify(store))}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KV_REST_API_TOKEN}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`KV set failed: ${response.status}`);
  }
}

function loadStoreFromFile() {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      return { users: {}, payments: {} };
    }
    const raw = fs.readFileSync(STORE_PATH, "utf-8");
    return normalizeStoreShape(JSON.parse(raw || "{}"));
  } catch {
    return inMemoryStore();
  }
}

function saveStoreToFile(store) {
  try {
    const tempPath = `${STORE_PATH}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(store, null, 2));
    fs.renameSync(tempPath, STORE_PATH);
  } catch {
    globalThis[FALLBACK_STORE_KEY] = store;
  }
}

async function loadStore() {
  if (kvEnabled()) {
    try {
      return await kvLoadStore();
    } catch (error) {
      console.error("KV load failed, falling back to file/in-memory:", error);
    }
  }
  return loadStoreFromFile();
}

async function saveStore(store) {
  if (kvEnabled()) {
    try {
      await kvSaveStore(store);
      return;
    } catch (error) {
      console.error("KV save failed, falling back to file/in-memory:", error);
    }
  }
  saveStoreToFile(store);
}

function withStore(handler) {
  storeLock = storeLock
    .catch(() => undefined)
    .then(async () => {
      const store = normalizeStoreShape(await loadStore());
      const result = await handler(store);
      await saveStore(store);
      return result;
    });
  return storeLock;
}

function ensureUser(store, userId, preferredLanguage) {
  const normalizedPreferredLanguage = normalizeOutputLanguage(preferredLanguage, "en");
  const initialPrimaryLanguage =
    normalizedPreferredLanguage === "auto" ? "en" : normalizedPreferredLanguage;

  if (!store.users[userId]) {
    store.users[userId] = {
      profile_id: userId,
      primary_language: initialPrimaryLanguage,
      coins: 0,
      last_free_post_date: null,
      last_free_post_timestamp: null,
      created_at: new Date().toISOString(),
      day: todayKey(),
      postCountToday: 0,
    };
  }

  const user = store.users[userId];
  if (!user.profile_id) user.profile_id = userId;
  if (!user.created_at) user.created_at = new Date().toISOString();
  if (!user.last_free_post_date) user.last_free_post_date = null;
  if (typeof user.last_free_post_timestamp === "undefined") {
    const migrated = Date.parse(String(user.last_free_post_date || ""));
    user.last_free_post_timestamp = Number.isFinite(migrated)
      ? new Date(migrated).toISOString()
      : null;
  }

  if (!user.primary_language) {
    user.primary_language = initialPrimaryLanguage;
  }
  user.primary_language = normalizeOutputLanguage(user.primary_language, "en");
  if (user.primary_language === "auto") {
    user.primary_language = "en";
  }

  const today = todayKey();
  if (user.day !== today) {
    user.day = today;
    user.postCountToday = 0;
    if (store.cycles && typeof store.cycles === "object") {
      delete store.cycles[userId];
    }
  }
  if (typeof user.postCountToday !== "number") {
    user.postCountToday = 0;
  }
  return user;
}

function getCycle(store, userId) {
  if (!store.cycles || typeof store.cycles !== "object") return null;
  const cycle = store.cycles[userId];
  if (!cycle || typeof cycle !== "object") return null;
  if (cycle.day !== todayKey()) {
    delete store.cycles[userId];
    return null;
  }
  return cycle;
}

async function reconcilePendingPaymentsForUser(store, userId) {
  if (!process.env.MOLLIE_API_KEY) return;
  if (!store.payments || typeof store.payments !== "object") return;

  const pendingEntries = Object.entries(store.payments)
    .filter(([paymentId, entry]) => {
      if (!paymentId || !entry || typeof entry !== "object") return false;
      return entry.userId === userId && !entry.credited;
    })
    .slice(-10);

  for (const [paymentId, entry] of pendingEntries) {
    try {
      const paymentRes = await fetch(
        `https://api.mollie.com/v2/payments/${paymentId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.MOLLIE_API_KEY}`,
          },
        }
      );
      if (!paymentRes.ok) continue;

      const payment = await paymentRes.json();
      entry.status = payment?.status || entry.status;

      const creditedCoins = Number(entry.coins ?? payment?.metadata?.coins ?? 0) || 0;
      entry.coins = creditedCoins;

      if (payment?.status === "paid" && !entry.credited && creditedCoins > 0) {
        const user = ensureUser(store, userId);
        user.coins = (Number(user.coins) || 0) + creditedCoins;
        entry.credited = true;
      }
    } catch (error) {
      console.error("Phase4 reconcile payment error:", error);
    }
  }
}

function normalizePaymentId(value) {
  const raw = String(value || "").trim();
  return /^tr_[A-Za-z0-9]+$/.test(raw) ? raw : "";
}

async function reconcilePaymentByIdForUser(store, userId, paymentIdRaw) {
  const paymentId = normalizePaymentId(paymentIdRaw);
  if (!paymentId || !process.env.MOLLIE_API_KEY) {
    return false;
  }

  try {
    const paymentRes = await fetch(
      `https://api.mollie.com/v2/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MOLLIE_API_KEY}`,
        },
      }
    );

    if (!paymentRes.ok) {
      return false;
    }

    const payment = await paymentRes.json();
    const metadataUserId = String(payment?.metadata?.userId || "");
    const resolvedUserId = metadataUserId || userId;
    if (resolvedUserId !== userId) {
      return false;
    }

    const paidCoins = Number(payment?.metadata?.coins) || 0;

    if (!store.payments[paymentId]) {
      store.payments[paymentId] = {
        userId: resolvedUserId,
        coins: paidCoins,
        status: payment?.status || "unknown",
        credited: false,
      };
    }

    const entry = store.payments[paymentId];
    entry.userId = entry.userId || resolvedUserId;
    entry.coins = Number(entry.coins ?? paidCoins) || paidCoins;
    entry.status = payment?.status || entry.status;

    if (payment?.status === "paid" && !entry.credited) {
      const user = ensureUser(store, userId);
      user.coins = (Number(user.coins) || 0) + (Number(entry.coins) || 0);
      entry.credited = true;
      return true;
    }

    return false;
  } catch (error) {
    console.error("Phase4 reconcile by payment id error:", error);
    return false;
  }
}

app.post("/api/profile/bootstrap", async (req, res) => {
  try {
    const { profileId, language } = req.body || {};
    if (!profileId || typeof profileId !== "string") {
      return res.status(400).json({ error: "Missing profileId" });
    }

    const profile = await withStore((store) => {
      const user = ensureUser(store, profileId, language);
      return {
        profile_id: user.profile_id,
        primary_language: user.primary_language,
        coins: user.coins,
        last_free_post_date: user.last_free_post_date,
        created_at: user.created_at,
      };
    });

    setUserCookie(res, profileId);
    res.json({ ok: true, profile });
  } catch (err) {
    console.error("Profile bootstrap error:", err);
    res.status(500).json({ error: "Profile bootstrap failed" });
  }
});

app.post("/api/profile/primary-language", async (req, res) => {
  try {
    const { userId, targetLanguage } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }
    if (!targetLanguage || typeof targetLanguage !== "string") {
      return res.status(400).json({ error: "Missing targetLanguage" });
    }
    if (!isSupportedOutputLanguage(targetLanguage)) {
      return res.status(400).json({ error: "Invalid targetLanguage" });
    }

    const normalizedTargetLanguage = normalizeOutputLanguage(targetLanguage, "en");
    if (normalizedTargetLanguage === "auto") {
      return res.status(400).json({ error: "Invalid targetLanguage" });
    }

    const result = await withStore((store) => {
      const user = ensureUser(store, userId);
      const currentPrimaryLanguage = normalizeOutputLanguage(user.primary_language, "en");
      if (currentPrimaryLanguage === normalizedTargetLanguage) {
        return {
          ok: true,
          changed: false,
          cost: 0,
          coinsLeft: user.coins,
          primaryLanguage: currentPrimaryLanguage,
        };
      }

      const cost = 3;
      if (user.coins < cost) {
        return {
          ok: false,
          error: "Insufficient coins",
          coins: user.coins,
          cost,
        };
      }

      user.coins -= cost;
      user.primary_language = normalizedTargetLanguage;
      return {
        ok: true,
        changed: true,
        cost,
        coinsLeft: user.coins,
        primaryLanguage: user.primary_language,
      };
    });

    if (!result.ok) {
      return res.status(400).json(result);
    }

    setUserCookie(res, userId);
    return res.json(result);
  } catch (err) {
    console.error("Primary language update error:", err);
    return res.status(500).json({ error: "Primary language update failed" });
  }
});

function isDaySlotUsed(user) {
  const lastFreeTs = Date.parse(String(user?.last_free_post_timestamp || ""));
  if (!Number.isFinite(lastFreeTs)) return false;
  return Date.now() - lastFreeTs < MS_24H;
}

function costForOption(optionKey) {
  if (optionKey === "tone") return 2;
  if (optionKey === "hashtags") return 1;
  if (optionKey === "rephrase") return 1;
  if (optionKey === "regenerate") return 0;
  if (optionKey === "language") return 3;
  if (optionKey === "download") return 1;
  return null;
}

function normalizeActionId(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.length > 120) return "";
  if (!/^[A-Za-z0-9:_\-.]+$/.test(raw)) return "";
  return raw;
}

function ensureCycleActionResults(cycle) {
  if (!cycle || typeof cycle !== "object") return {};
  if (!cycle.actionResults || typeof cycle.actionResults !== "object") {
    cycle.actionResults = {};
  }
  return cycle.actionResults;
}

function setCycleActionResult(cycle, actionId, payload) {
  if (!actionId) return;
  const actionResults = ensureCycleActionResults(cycle);
  actionResults[actionId] = {
    ...(payload || {}),
    _ts: Date.now(),
  };
  const entries = Object.entries(actionResults)
    .sort((a, b) => (Number(a[1]?._ts) || 0) - (Number(b[1]?._ts) || 0));
  const overflow = entries.length - 50;
  if (overflow > 0) {
    for (let index = 0; index < overflow; index += 1) {
      delete actionResults[entries[index][0]];
    }
  }
}

function createCycle(userId, postNumber) {
  return {
    id: `${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2)}`,
    userId,
    postNumber,
    generationIndex: 0,
    variantCount: 0,
    optionVariantCount: 0,
    generatedPosts: [],
    generatedItems: [],
    regenerateCount: 0,
    day: todayKey(),
    startedAt: Date.now(),
    confirmed: false,
    confirmedPostId: null,
    confirmedWasFree: false,
    startCostCharged: 0,
    actionResults: {},
  };
}

function appendOptionVariant(cycle, { postText, sourcePostId, optionKey }) {
  if (!cycle || typeof cycle !== "object") return "";
  if (!Array.isArray(cycle.generatedPosts)) {
    cycle.generatedPosts = [];
  }
  if (!Array.isArray(cycle.generatedItems)) {
    cycle.generatedItems = [];
  }
  if (typeof cycle.optionVariantCount !== "number") {
    cycle.optionVariantCount = 0;
  }

  cycle.optionVariantCount += 1;
  const variantPostId = `${cycle.id}-o${cycle.optionVariantCount}`;
  const normalizedText = String(postText || "").trim();

  if (normalizedText) {
    cycle.generatedPosts.push(normalizedText);
  }

  cycle.generatedItems.push({
    id: variantPostId,
    text: normalizedText,
    optionKey: String(optionKey || ""),
    sourcePostId: String(sourcePostId || ""),
    createdAt: Date.now(),
  });

  return variantPostId;
}

async function rewritePost({ post, tone, mode, targetLanguage }) {
  const openai = getOpenAIClient();
  const normalizedTargetLanguage = normalizeOutputLanguage(targetLanguage, "en");
  const instruction =
    mode === "tone"
      ? `Herschrijf de post in deze toon: ${tone}.`
      : mode === "language"
        ? `Herschrijf en vertaal deze post naar de gevraagde outputtaal. ${languageInstruction(normalizedTargetLanguage)}`
        : mode === "regenerate"
          ? "Genereer een duidelijke nieuwe variant met dezelfde kernboodschap, maar met een andere opening, zinsritme en formulering."
        : "Herschrijf de post licht, met dezelfde betekenis.";

  const timeoutMs = 8000;
  const withTimeout = (promise, label) =>
    Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
      }),
    ]);

  const fallbackRewrite = () => {
    const base = String(post || "").trim();
    if (!base) return "";
    if (mode === "regenerate") {
      return `${base}\n\nAndere invalshoek: begin met één concrete stap die je team morgen uitvoert.`;
    }
    if (mode === "rephrase") {
      return `${base}\n\nKort herformuleerd met dezelfde kernboodschap.`;
    }
    if (mode === "tone") {
      return `${base}\n\nToon aangepast: ${String(tone || "zakelijk").trim() || "zakelijk"}.`;
    }
    if (mode === "language") {
      return base;
    }
    return base;
  };

  try {
    const response = await withTimeout(
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "Je herschrijft exact een korte zakelijke social post. Behoud altijd de oorspronkelijke kernboodschap en behoud dezelfde taal als de aangeleverde post, behalve als er expliciet om een andere taal wordt gevraagd in de opdracht. Geen uitleg. Geen vragen. Geen emojis. Geen hashtags. Geen CTA.",
          },
          {
            role: "user",
            content: `${instruction}\n\nPost:\n${post}`,
          },
        ],
        max_tokens: 400,
      }),
      "rewritePost"
    );

    let rewritten = response.choices[0]?.message?.content?.trim() || post;

    if (mode === "language") {
      const retry = await withTimeout(
        openai.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.25,
          messages: [
            {
              role: "system",
              content:
                "Je corrigeert exact één zakelijke social media post naar de gevraagde taal. Behoud de kernboodschap. Geen uitleg. Geen vragen. Geen emojis. Geen hashtags. Geen CTA.",
            },
            {
              role: "user",
              content: `Corrigeer deze post nu strikt naar deze taal: ${languageInstruction(normalizedTargetLanguage)}\n\nHarde regel: geef alleen de posttekst terug in exact die taal, zonder gemixte taal.\n\nOutput:\n${rewritten}`,
            },
          ],
          max_tokens: 400,
        }),
        "rewriteLanguagePost"
      );

      rewritten = retry.choices[0]?.message?.content?.trim() || rewritten;
    }

    return rewritten;
  } catch (err) {
    console.warn("rewritePost fallback used:", err?.message || err);
    return fallbackRewrite();
  }
}

async function generateHashtags(post) {
  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content:
          "Je genereert alleen hashtags. Gebruik dezelfde taal als de aangeleverde post. Geen uitleg. Geen emojis. Antwoord met een lijst hashtags, gescheiden door komma's.",
      },
      {
        role: "user",
        content: `Post:\n${post}`,
      },
    ],
    max_tokens: 120,
  });

  const raw = response.choices[0]?.message?.content || "";
  return raw
    .split(/[,\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
    .filter((tag) => tag.length > 1)
    .slice(0, 12);
}

function getUserIdFromRequest(req) {
  const cookies = parseCookieHeader(req.headers.cookie || "");
  return cookies.post_it_uid || null;
}

function parseCookieHeader(cookieHeader) {
  const out = {};
  const raw = String(cookieHeader || "");
  const parts = raw.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

function resolveUserId(req, fallbackUserId) {
  if (fallbackUserId && typeof fallbackUserId === "string") {
    const normalizedFallback = fallbackUserId.trim();
    if (normalizedFallback) return normalizedFallback;
  }
  const cookieUserId = getUserIdFromRequest(req);
  if (cookieUserId) return cookieUserId;
  return "";
}

const STATE_COOKIE_KEY = "post_it_state";

function appendSetCookie(res, cookieValue) {
  const existing = res.getHeader("Set-Cookie");
  if (!existing) {
    res.setHeader("Set-Cookie", cookieValue);
    return;
  }
  if (Array.isArray(existing)) {
    res.setHeader("Set-Cookie", [...existing, cookieValue]);
    return;
  }
  res.setHeader("Set-Cookie", [String(existing), cookieValue]);
}

function readStateCookie(req, userId) {
  const cookies = parseCookieHeader(req.headers.cookie || "");
  const raw = cookies[STATE_COOKIE_KEY];
  if (!raw) return null;
  try {
    const decoded = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded);
    if (!parsed || typeof parsed !== "object") return null;
    if (String(parsed.userId || "") !== String(userId || "")) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStateCookie(res, userId, user, cycle) {
  if (!userId || !user) return;
  const payload = {
    userId,
    day: user.day || todayKey(),
    postCountToday: Number(user.postCountToday) || 0,
    coins: Number(user.coins) || 0,
    lastFreePostTimestamp: user.last_free_post_timestamp || null,
    cycle: cycle || null,
    ts: Date.now(),
  };
  try {
    const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    appendSetCookie(
      res,
      `${STATE_COOKIE_KEY}=${encoded}; Path=/; Max-Age=259200; SameSite=Lax; HttpOnly`
    );
  } catch {
    // ignore serialization errors
  }
}

function hydrateFromStateCookie(req, store, userId) {
  const user = ensureUser(store, userId);
  const state = readStateCookie(req, userId);
  if (!state) return { user, cycle: getCycle(store, userId) };

  const today = todayKey();
  if (state.day === today) {
    const count = Number(state.postCountToday);
    if (Number.isFinite(count) && count > (Number(user.postCountToday) || 0)) {
      user.postCountToday = count;
    }
  }

  const coins = Number(state.coins);
  if (Number.isFinite(coins) && coins > (Number(user.coins) || 0)) {
    user.coins = coins;
  }

  const cookieFreeTs = Date.parse(String(state.lastFreePostTimestamp || ""));
  const userFreeTs = Date.parse(String(user.last_free_post_timestamp || ""));
  if (Number.isFinite(cookieFreeTs)) {
    if (!Number.isFinite(userFreeTs) || cookieFreeTs > userFreeTs) {
      user.last_free_post_timestamp = new Date(cookieFreeTs).toISOString();
      user.last_free_post_date = user.last_free_post_timestamp.split("T")[0] || user.last_free_post_date;
    }
  }

  if (
    state.cycle &&
    typeof state.cycle === "object" &&
    state.cycle.day === today
  ) {
    const existing = getCycle(store, userId);
    if (!existing || (Number(state.cycle.startedAt) || 0) >= (Number(existing.startedAt) || 0)) {
      store.cycles[userId] = state.cycle;
    }
  }

  return { user, cycle: getCycle(store, userId) };
}

function setUserCookie(res, userId) {
  appendSetCookie(
    res,
    `post_it_uid=${encodeURIComponent(userId)}; Path=/; SameSite=Lax; HttpOnly`
  );
}

function normalizeHttpUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }
    url.hash = "";
    return url.toString().replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function getRequestOrigin(req) {
  const appOrigin = normalizeHttpUrl(process.env.APP_ORIGIN);
  if (appOrigin) return appOrigin;

  const forwardedHost = String(
    req.headers["x-forwarded-host"] || req.headers.host || ""
  )
    .split(",")[0]
    .trim();
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "https")
    .split(",")[0]
    .trim()
    .toLowerCase();

  if (forwardedHost) {
    const proto = forwardedProto === "http" || forwardedProto === "https"
      ? forwardedProto
      : "https";
    return `${proto}://${forwardedHost}`;
  }

  const originHeader = normalizeHttpUrl(req.headers.origin);
  if (originHeader) return originHeader;

  return "http://localhost:5173";
}

function getConfiguredPublicUrl(envValue, fallbackUrl) {
  const normalized = normalizeHttpUrl(envValue);
  if (normalized && !/^https?:\/\/localhost(?::\d+)?$/i.test(normalized)) {
    return normalized;
  }
  return fallbackUrl;
}

function buildRedirectUrl(baseUrl, returnTo, userId) {
  try {
    const url = new URL(baseUrl);
    if (returnTo) {
      url.searchParams.set("return", returnTo);
    }
    if (userId) {
      url.searchParams.set("uid", userId);
    }
    return url.toString();
  } catch {
    return baseUrl;
  }
}

// Spraaktranscriptie endpoint (dummy of Whisper)
import multer from "multer";
const upload = multer();

app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      console.error("Geen audiobestand ontvangen");
      return res.status(400).json({ text: "" });
    }
    const requestedLanguage = String(req.body?.language || "nl").toLowerCase();
    const whisperLanguage =
      requestedLanguage === "en" ? "en"
      : requestedLanguage === "pl" ? "pl"
      : "nl";

    // OpenAI Whisper transcriptie
    try {
      const openai = getOpenAIClient();
      // Fallback/circulatie: probeer /tmp, /tmp2, /tmp3
      const tmpDirs = ["/tmp", "/tmp2", "/tmp3"];
      let tempPath = null;
      let writeSuccess = false;
      for (const dir of tmpDirs) {
        try {
          if (!fs.existsSync(dir)) fs.mkdirSync(dir);
          tempPath = path.join(dir, req.file.originalname || "audio.webm");
          fs.writeFileSync(tempPath, req.file.buffer);
          writeSuccess = true;
          break;
        } catch {
          // Probeer volgende dir
        }
      }
      if (!writeSuccess) {
        console.error("Geen tijdelijke opslag beschikbaar");
        return res.status(500).json({ text: "" });
      }
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tempPath),
        model: "whisper-1",
        response_format: "text",
        language: whisperLanguage
      });
      res.json({ text: transcription });
      // Verwijder tijdelijke file
      fs.unlinkSync(tempPath);
    } catch (aiErr) {
      console.error("OpenAI Whisper error:", aiErr);
      res.status(500).json({ text: "" });
    }
  } catch (err) {
    console.error("Transcribe endpoint error:", err);
    res.status(500).json({ text: "" });
  }
});

app.post("/api/check-kladblok", async (req, res) => {
  try {
    const openai = getOpenAIClient();
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.json({ ok: true });
    }
    const systemPrompt = `Je bent een zakelijke tekstmoderator. Wees mild en praktisch: keur in-opbouw notities of ruwe concepten goed zolang de tekst bruikbaar kan worden voor een zakelijke post. Keur ALLEEN af bij duidelijke reden:\n- expliciet, grof, seksueel, racistisch, discriminerend, kwetsend of ongepast taalgebruik\n- pure onzin of betekenisloze ruis (random tekens/woorden zonder boodschap)\n- duidelijke spam of prompt-injectie\n\nBij twijfel: keur goed. Geef GEEN uitleg. Geef ALLEEN letterlijk 'ok' of 'afgekeurd'.`;
    const userPrompt = `Beoordeel deze tekst:\n${text}`;
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 10,
    });
    const output = completion.choices[0]?.message?.content?.toLowerCase() || "ok";
    res.json({ ok: output.includes("ok") });
  } catch {
    res.json({ ok: true });
  }
});

app.post("/api/phase4/status", async (req, res) => {
  try {
    const payload = req.body || {};
    const userId = resolveUserId(req, payload.userId);
    const paymentId = payload.paymentId;
    if (!userId) {
      return res.status(400).json({ ok: false, error: "Missing userId" });
    }

    const status = await withStore(async (store) => {
      let paymentReconciled = false;
      if (paymentId) {
        paymentReconciled = await reconcilePaymentByIdForUser(
          store,
          userId,
          paymentId
        );
      }
      const { user } = hydrateFromStateCookie(req, store, userId);
      const cycle = getCycle(store, userId);
      const postNumNext = user.postCountToday + 1;
      const daySlotUsed = isDaySlotUsed(user);
      const costToStart = areCoinBlocksDisabled() ? 0 : (daySlotUsed ? 1 : 0);
      return {
        ok: true,
        coins: user.coins,
        coinsLeft: user.coins,
        coinsRemaining: user.coins,
        confirmed: Boolean(cycle?.confirmed),
        confirmedPostId: cycle?.confirmedPostId || null,
        postNumNext,
        daySlotUsed,
        costToStart,
        extraGenerationCost: areCoinBlocksDisabled() ? 0 : 1,
        paymentReconciled,
        __cookieState: { user, cycle },
      };
    });

    setUserCookie(res, userId);
    writeStateCookie(res, userId, status.__cookieState?.user, status.__cookieState?.cycle);
    delete status.__cookieState;
    res.json(status);
  } catch (err) {
    console.error("Phase4 status error:", err);
    res.status(500).json({ ok: false, error: "Status failed" });
  }
});

app.post("/api/phase4/start", async (req, res) => {
  try {
    const payload = req.body || {};
    const userId = resolveUserId(req, payload.userId);
    if (!userId) {
      return res.status(400).json({ ok: false, error: "Missing userId" });
    }

    const result = await withStore((store) => {
      const { user } = hydrateFromStateCookie(req, store, userId);
      const daySlotUsed = isDaySlotUsed(user);
      const costToStart = areCoinBlocksDisabled() ? 0 : (daySlotUsed ? 1 : 0);

      if (costToStart > 0 && user.coins < costToStart) {
        return {
          ok: false,
          error: "Insufficient coins",
          coins: user.coins,
          coinsRemaining: user.coins,
          coinsLeft: user.coins,
          postNumber: user.postCountToday + 1,
          costToStart,
        };
      }

      const postNumber = user.postCountToday + 1;
      store.cycles[userId] = createCycle(userId, postNumber);
      const cycle = getCycle(store, userId);
      if (!cycle) {
        return {
          ok: false,
          error: "Cycle create failed",
          coinsRemaining: user.coins,
          coinsLeft: user.coins,
        };
      }

      if (costToStart > 0) {
        user.coins -= costToStart;
      }
      cycle.startCostCharged = costToStart;

      return {
        ok: true,
        postNumber,
        costToStart,
        daySlotUsed,
        coinsLeft: user.coins,
        coinsRemaining: user.coins,
        confirmed: false,
        __cookieState: { user, cycle },
      };
    });

    if (!result.ok) {
      return res.status(400).json(result);
    }

    const cookieState = result.__cookieState || {};
    const activeUser = cookieState.user || null;
    const activeCycle = cookieState.cycle || null;
    delete result.__cookieState;

    function sendOptionResponse(payload) {
      setUserCookie(res, userId);
      writeStateCookie(res, userId, activeUser, activeCycle);
      return res.json(payload);
    }
    return sendOptionResponse(result);
  } catch (err) {
    console.error("Phase4 start error:", err);
    res.status(500).json({ ok: false, error: "Start failed" });
  }
});

app.post("/api/phase4/option", async (req, res) => {
  try {
    const payload = req.body || {};
    const userId = resolveUserId(req, payload.userId);
    const optionKey = payload.optionKey;
    const post = payload.post;
    const postId = String(payload.postId || "").trim();
    const actionId = normalizeActionId(payload.actionId);
    const tone = payload.tone;
    const targetLanguageRaw =
      payload.targetLanguage ?? payload.outputLanguage ?? payload.language;
    if (!userId) {
      return res.status(400).json({ ok: false, error: "Missing userId" });
    }
    if (optionKey === "download") {
      return res.status(400).json({ ok: false, error: "Use download endpoint" });
    }

    const cost = costForOption(optionKey);
    if (cost === null) {
      return res.status(400).json({ ok: false, error: "Unknown option" });
    }

    if (!post || typeof post !== "string") {
      return res.status(400).json({ ok: false, error: "Missing post" });
    }

    if (!postId) {
      return res.status(400).json({ ok: false, error: "Missing postId" });
    }

    if (optionKey === "tone" && (!tone || typeof tone !== "string")) {
      return res.status(400).json({ ok: false, error: "Missing tone" });
    }

    if (optionKey === "language" && (!targetLanguageRaw || typeof targetLanguageRaw !== "string")) {
      return res.status(400).json({ ok: false, error: "Missing targetLanguage" });
    }
    if (optionKey === "language" && !isSupportedOutputLanguage(targetLanguageRaw)) {
      return res.status(400).json({ ok: false, error: "Invalid targetLanguage" });
    }

    const result = await withStore((store) => {
      const { user } = hydrateFromStateCookie(req, store, userId);
      const cycle = getCycle(store, userId);

      if (!cycle || !cycle.confirmed) {
        return {
          ok: false,
          error: "No confirmed post",
          confirmed: false,
          coinsRemaining: user.coins,
          coinsLeft: user.coins,
        };
      }

      if (actionId) {
        const cached = ensureCycleActionResults(cycle)[actionId];
        if (cached && cached.ok) {
          const cachedPayload = { ...cached };
          delete cachedPayload._ts;
          return {
            ...cachedPayload,
            idempotentReplay: true,
            __cookieState: { user, cycle },
          };
        }
      }

      if (!cycle.confirmedPostId || cycle.confirmedPostId !== postId) {
        return {
          ok: false,
          error: "Post not confirmed",
          confirmed: true,
          postId: cycle.confirmedPostId || postId,
          coinsRemaining: user.coins,
          coinsLeft: user.coins,
        };
      }

      if (typeof cycle.optionVariantCount !== "number") {
        cycle.optionVariantCount = 0;
      }

      if (typeof cycle.regenerateCount !== "number") {
        cycle.regenerateCount = 0;
      }

      if (optionKey === "regenerate" && cycle.regenerateCount >= 2) {
        return {
          ok: false,
          error: "Regenerate limit reached",
          postId,
          confirmed: true,
          regenerateCount: cycle.regenerateCount,
          regeneratesRemaining: 0,
          coinsRemaining: user.coins,
          coinsLeft: user.coins,
        };
      }

      const effectiveCost = areCoinBlocksDisabled() ? 0 : cost;
      if (user.coins < effectiveCost) {
        return {
          ok: false,
          error: "Insufficient coins",
          coins: user.coins,
          coinsRemaining: user.coins,
          cost: effectiveCost,
          confirmed: true,
          postId,
        };
      }

      user.coins -= effectiveCost;

      return {
        ok: true,
        optionKey,
        postId,
        sourcePostId: postId,
        cost: effectiveCost,
        debitedFor: optionKey,
        coinsLeft: user.coins,
        coinsRemaining: user.coins,
        confirmed: true,
        __cookieState: { user, cycle },
      };
    });

    if (!result.ok) {
      return res.status(400).json(result);
    }

    const cookieState = result.__cookieState || {};
    const activeUser = cookieState.user || null;
    const activeCycle = cookieState.cycle || null;
    delete result.__cookieState;

    function sendOptionResponse(payload) {
      setUserCookie(res, userId);
      writeStateCookie(res, userId, activeUser, activeCycle);
      return res.json(payload);
    }

    if (optionKey === "tone") {
      const rewritten = await rewritePost({ post, tone, mode: "tone" });
      const variantPostId = appendOptionVariant(activeCycle, {
        postText: rewritten,
        sourcePostId: result.sourcePostId,
        optionKey,
      }) || `${result.sourcePostId || userId}-o${Date.now().toString(36)}`;
      if (activeCycle) {
        setCycleActionResult(activeCycle, actionId, {
          ...result,
          postId: variantPostId,
          post: rewritten,
        });
      }
      return sendOptionResponse({ ...result, postId: variantPostId, post: rewritten });
    }

    if (optionKey === "rephrase") {
      const rewritten = await rewritePost({ post, mode: "rephrase" });
      const variantPostId = appendOptionVariant(activeCycle, {
        postText: rewritten,
        sourcePostId: result.sourcePostId,
        optionKey,
      }) || `${result.sourcePostId || userId}-o${Date.now().toString(36)}`;
      if (activeCycle) {
        setCycleActionResult(activeCycle, actionId, {
          ...result,
          postId: variantPostId,
          post: rewritten,
        });
      }
      return sendOptionResponse({ ...result, postId: variantPostId, post: rewritten });
    }

    if (optionKey === "regenerate") {
      const rewritten = await rewritePost({ post, mode: "regenerate" });
      if (activeCycle) {
        if (typeof activeCycle.regenerateCount !== "number") {
          activeCycle.regenerateCount = 0;
        }
        activeCycle.regenerateCount += 1;
      }
      const variantPostId = appendOptionVariant(activeCycle, {
        postText: rewritten,
        sourcePostId: result.sourcePostId,
        optionKey,
      }) || `${result.sourcePostId || userId}-o${Date.now().toString(36)}`;
      const regenerateCount = Number(activeCycle?.regenerateCount || 1);
      if (activeCycle) {
        setCycleActionResult(activeCycle, actionId, {
          ...result,
          postId: variantPostId,
          regenerateCount,
          regeneratesRemaining: Math.max(0, 2 - regenerateCount),
          post: rewritten,
        });
      }
      return sendOptionResponse({
        ...result,
        postId: variantPostId,
        regenerateCount,
        regeneratesRemaining: Math.max(0, 2 - regenerateCount),
        post: rewritten,
      });
    }

    if (optionKey === "language") {
      const rewritten = await rewritePost({
        post,
        mode: "language",
        targetLanguage: normalizeOutputLanguage(targetLanguageRaw, "en"),
      });
      const variantPostId = appendOptionVariant(activeCycle, {
        postText: rewritten,
        sourcePostId: result.sourcePostId,
        optionKey,
      }) || `${result.sourcePostId || userId}-o${Date.now().toString(36)}`;
      if (activeCycle) {
        setCycleActionResult(activeCycle, actionId, {
          ...result,
          postId: variantPostId,
          post: rewritten,
        });
      }
      return sendOptionResponse({ ...result, postId: variantPostId, post: rewritten });
    }

    if (optionKey === "hashtags") {
      const tags = await generateHashtags(post || "");
      if (activeCycle) {
        setCycleActionResult(activeCycle, actionId, { ...result, hashtags: tags });
      }
      return sendOptionResponse({ ...result, hashtags: tags });
    }

    if (activeCycle) {
      setCycleActionResult(activeCycle, actionId, result);
    }
    sendOptionResponse(result);
  } catch (err) {
    console.error("Phase4 option error:", err);
    res.status(500).json({ ok: false, error: "Option failed" });
  }
});


app.post("/api/phase4/checkout", async (req, res) => {
  try {
    const payload = req.body || {};
    const userId = resolveUserId(req, payload.userId);
    const { bundle, returnTo } = payload;
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }
    const selected = COIN_BUNDLES[String(bundle || "")];
    if (!selected) {
      return res.status(400).json({ error: "Unknown bundle" });
    }

    const requestOrigin = getRequestOrigin(req);
    const baseRedirectUrl = getConfiguredPublicUrl(
      process.env.MOLLIE_REDIRECT_URL,
      requestOrigin
    );
    const allowedReturnTo = new Set(["coins", "packages"]);
    const safeReturnTo = allowedReturnTo.has(returnTo) ? returnTo : "";
    const redirectUrl = buildRedirectUrl(baseRedirectUrl, safeReturnTo, userId);

    if (!process.env.MOLLIE_API_KEY) {
      return res.status(500).json({ error: "Missing Mollie API key" });
    }

    const webhookUrl = getConfiguredPublicUrl(
      process.env.MOLLIE_WEBHOOK_URL,
      `${requestOrigin}/api/phase4/webhook`
    );

    const paymentRes = await fetch("https://api.mollie.com/v2/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MOLLIE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: { currency: "EUR", value: selected.amount },
        description: `Post-it coins ${selected.coins}`,
        redirectUrl,
        webhookUrl,
        metadata: { userId, coins: selected.coins },
      }),
    });

    const payment = await paymentRes.json();
    if (!paymentRes.ok) {
      return res
        .status(500)
        .json({ error: payment?.detail || "Payment create failed" });
    }

    await withStore((store) => {
      store.payments[payment.id] = {
        userId,
        coins: Number(selected.coins) || 0,
        status: payment.status,
        credited: false,
      };
    });

    setUserCookie(res, userId);
    res.json({ checkoutUrl: payment?._links?.checkout?.href, id: payment.id });
  } catch (err) {
    console.error("Phase4 checkout error:", err);
    res.status(500).json({ error: "Checkout failed" });
  }
});

app.post("/api/phase4/admin/grant-coins", async (req, res) => {
  try {
    const adminSecret = String(process.env.ADMIN_SECRET || "").trim();
    const providedSecret = String(req.headers["x-admin-secret"] || "").trim();
    if (!adminSecret || providedSecret !== adminSecret) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const payload = req.body || {};
    const userId = String(payload.userId || "").trim();
    const amount = Number(payload.amount);
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const result = await withStore((store) => {
      const user = ensureUser(store, userId);
      user.coins = (Number(user.coins) || 0) + Math.floor(amount);
      return {
        ok: true,
        userId,
        granted: Math.floor(amount),
        coinsLeft: user.coins,
      };
    });

    setUserCookie(res, userId);
    return res.json(result);
  } catch (err) {
    console.error("Phase4 admin grant-coins error:", err);
    return res.status(500).json({ error: "Grant failed" });
  }
});

app.post(
  "/api/phase4/webhook",
  express.urlencoded({ extended: false }),
  async (req, res) => {
    try {
      const paymentId = req.body?.id || req.query?.id;
      if (!paymentId || !process.env.MOLLIE_API_KEY) {
        return res.status(200).send("ok");
      }

      const paymentRes = await fetch(
        `https://api.mollie.com/v2/payments/${paymentId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.MOLLIE_API_KEY}`,
          },
        }
      );
      const payment = await paymentRes.json();

      await withStore((store) => {
        if (!store.payments[paymentId]) {
          store.payments[paymentId] = {
            userId: payment?.metadata?.userId || "",
            coins: Number(payment?.metadata?.coins) || 0,
            status: payment?.status || "unknown",
            credited: false,
          };
        }

        const entry = store.payments[paymentId];
        entry.status = payment?.status || entry.status;

        if (payment?.status === "paid" && !entry.credited) {
          const user = ensureUser(store, entry.userId);
          const coins = Number(entry.coins) || 0;
          entry.coins = coins;
          user.coins = (Number(user.coins) || 0) + coins;
          entry.credited = true;
        }
      });

      res.status(200).send("ok");
    } catch (err) {
      console.error("Phase4 webhook error:", err);
      res.status(200).send("ok");
    }
  }
);

app.get("/api/phase4/webhook", (req, res) => {
  res.status(200).send("ok");
});

app.post("/api/generate", async (req, res) => {
  try {
    const payload = req.body || {};
    const kladblok = payload.kladblok;
    const doelgroep = payload.doelgroep;
    const intentie = payload.intentie;
    const context = payload.context;
    const keywords = payload.keywords;
    const outputLanguageRaw =
      payload.outputLanguage ?? payload.language ?? payload.targetLanguage;
    const actionId = normalizeActionId(payload.actionId);

    const userId = resolveUserId(req, payload.userId);
    if (!userId) {
      return res.status(403).json({ ok: false, error: "Cycle not started" });
    }

    const generationAccess = await withStore((store) => {
      const { user } = hydrateFromStateCookie(req, store, userId);
      let cycle = getCycle(store, userId);

      if (!cycle) {
        const daySlotUsed = isDaySlotUsed(user);
        const costToStart = areCoinBlocksDisabled() ? 0 : (daySlotUsed ? 1 : 0);
        if (costToStart > 0 && user.coins < costToStart) {
          return {
            ok: false,
            error: "Insufficient coins",
            coins: user.coins,
            coinsRemaining: user.coins,
            coinsLeft: user.coins,
            cost: costToStart,
            confirmed: false,
          };
        }
        if (costToStart > 0) {
          user.coins -= costToStart;
        }

        const postNumber = user.postCountToday + 1;
        store.cycles[userId] = createCycle(userId, postNumber);
        cycle = getCycle(store, userId);
        if (cycle) {
          cycle.startCostCharged = costToStart;
        }
      }

      if (!cycle) {
        return {
          ok: false,
          statusCode: 403,
          error: "Cycle not started",
          confirmed: false,
          coinsRemaining: user.coins,
        };
      }

      if (actionId) {
        const cached = ensureCycleActionResults(cycle)[actionId];
        if (cached && cached.ok) {
          const cachedPayload = { ...cached };
          delete cachedPayload._ts;
          return {
            ok: true,
            replayResponse: cachedPayload,
            __cookieState: { user, cycle },
          };
        }
      }

      const primaryLanguage = normalizeOutputLanguage(user.primary_language, "en");
      const requestedLanguage = normalizeOutputLanguage(outputLanguageRaw, primaryLanguage);
      const resolvedOutputLanguage =
        requestedLanguage === "auto" ? primaryLanguage : requestedLanguage;

      if (typeof cycle.regenerateCount !== "number") {
        cycle.regenerateCount = 0;
      }

      const isRegenerateAttempt = cycle.generationIndex >= 1;
      if (isRegenerateAttempt && cycle.regenerateCount >= 2) {
        return {
          ok: false,
          error: "Regenerate limit reached",
          confirmed: Boolean(cycle.confirmed),
          postId: cycle.confirmedPostId || null,
          regenerateCount: cycle.regenerateCount,
          regeneratesRemaining: 0,
          coinsRemaining: user.coins,
          coinsLeft: user.coins,
        };
      }

      const generationCost = 0;
      const languageCost = resolvedOutputLanguage === primaryLanguage ? 0 : 3;
      const totalCost = generationCost + languageCost;
      if (totalCost > 0 && user.coins < totalCost) {
        return {
          ok: false,
          error: "Insufficient coins",
          coins: user.coins,
          coinsRemaining: user.coins,
          cost: totalCost,
          primaryLanguage,
          requestedLanguage: resolvedOutputLanguage,
          confirmed: Boolean(cycle.confirmed),
        };
      }

      if (totalCost > 0) {
        user.coins -= totalCost;
      }

      if (!Array.isArray(cycle.generatedPosts)) {
        cycle.generatedPosts = [];
      }

      if (!Array.isArray(cycle.generatedItems)) {
        cycle.generatedItems = [];
      }

      const priorVariants = cycle.generatedPosts
        .filter((item) => typeof item === "string" && item.trim().length > 0)
        .slice(-8);

      cycle.generationIndex += 1;
      cycle.variantCount += 1;
      if (isRegenerateAttempt) {
        cycle.regenerateCount += 1;
      }

      return {
        ok: true,
        cost: totalCost,
        generationCost,
        languageCost,
        coinsLeft: user.coins,
        primaryLanguage,
        resolvedOutputLanguage,
        generationIndex: cycle.generationIndex,
        regenerateCount: cycle.regenerateCount,
        regeneratesRemaining: Math.max(0, 2 - cycle.regenerateCount),
        priorVariants,
        postNumber: cycle.postNumber,
        confirmed: Boolean(cycle.confirmed),
        __cookieState: { user, cycle },
      };
    });

    if (!generationAccess.ok) {
      return res
        .status(generationAccess.statusCode || 400)
        .json(generationAccess);
    }

    if (generationAccess.replayResponse) {
      const replay = generationAccess.replayResponse;
      setUserCookie(res, userId);
      writeStateCookie(
        res,
        userId,
        generationAccess.__cookieState?.user,
        generationAccess.__cookieState?.cycle
      );
      return res.json({ ...replay, idempotentReplay: true });
    }

    const result = await generatePost({
      kladblok,
      doelgroep,
      intentie,
      context,
      keywords,
      outputLanguage: generationAccess.resolvedOutputLanguage,
      postNumber: generationAccess.postNumber,
      generationIndex: generationAccess.generationIndex,
      priorVariants: generationAccess.priorVariants,
    });

    const activeCycle = generationAccess.__cookieState?.cycle;
    const postId = `${activeCycle?.id || userId}-p${generationAccess.generationIndex}`;
    if (activeCycle && Array.isArray(activeCycle.generatedPosts)) {
      activeCycle.generatedPosts.push(result.post);
    }
    if (activeCycle && Array.isArray(activeCycle.generatedItems)) {
      activeCycle.generatedItems.push({
        id: postId,
        text: result.post,
        generationIndex: generationAccess.generationIndex,
        createdAt: Date.now(),
      });
    }

    const responsePayload = {
      ok: true,
      ...result,
      postId,
      confirmed: generationAccess.confirmed,
      cost: generationAccess.cost,
      coinsLeft: generationAccess.coinsLeft,
      coinsRemaining: generationAccess.coinsLeft,
      primaryLanguage: generationAccess.primaryLanguage,
      outputLanguage: generationAccess.resolvedOutputLanguage,
      regenerateCount: generationAccess.regenerateCount,
      regeneratesRemaining: generationAccess.regeneratesRemaining,
    };

    if (activeCycle && actionId) {
      setCycleActionResult(activeCycle, actionId, responsePayload);
    }

    setUserCookie(res, userId);
    writeStateCookie(
      res,
      userId,
      generationAccess.__cookieState?.user,
      generationAccess.__cookieState?.cycle
    );
    res.json(responsePayload);
  } catch (err) {
    console.error("API error:", err);
    res.status(500).json({ ok: false, error: "Generatie mislukt" });
  }
});

app.post("/api/phase4/confirm", async (req, res) => {
  try {
    const payload = req.body || {};
    const userId = resolveUserId(req, payload.userId);
    const postId = String(payload.postId || "").trim();
    if (!userId) {
      return res.status(400).json({ ok: false, error: "Missing userId" });
    }
    if (!postId) {
      return res.status(400).json({ ok: false, error: "Missing postId" });
    }

    const result = await withStore((store) => {
      const { user } = hydrateFromStateCookie(req, store, userId);
      let cycle = getCycle(store, userId);
      if (!cycle) {
        const postNumber = user.postCountToday + 1;
        store.cycles[userId] = createCycle(userId, postNumber);
        cycle = getCycle(store, userId);
      }
      if (!cycle) {
        return {
          ok: false,
          statusCode: 400,
          error: "No active cycle",
        };
      }

      if (cycle.confirmed) {
        if (cycle.confirmedPostId && cycle.confirmedPostId !== postId) {
          return {
            ok: false,
            statusCode: 409,
            error: "Post already confirmed",
            confirmed: true,
            postId: cycle.confirmedPostId,
            confirmedPostId: cycle.confirmedPostId,
            coinsRemaining: user.coins,
            coinsLeft: user.coins,
          };
        }
        return {
          ok: true,
          alreadyConfirmed: true,
          postId: cycle.confirmedPostId || postId,
          confirmedPostId: cycle.confirmedPostId || postId,
          confirmed: true,
          coinsRemaining: user.coins,
          coinsLeft: user.coins,
        };
      }

      const generatedItems = Array.isArray(cycle.generatedItems)
        ? cycle.generatedItems
        : [];
      const requestedPost = generatedItems.find((entry) => entry?.id === postId);
      if (!requestedPost) {
        return {
          ok: false,
          statusCode: 400,
          error: "Unknown postId",
          confirmed: false,
          coinsRemaining: user.coins,
          coinsLeft: user.coins,
        };
      }

      const daySlotUsed = isDaySlotUsed(user);
      const startCostCharged = Number(cycle.startCostCharged) || 0;
      const cost = startCostCharged > 0 ? 0 : (daySlotUsed ? 1 : 0);

      if (cost > 0 && user.coins < cost) {
        return {
          ok: false,
          statusCode: 400,
          error: "Insufficient coins",
          coins: user.coins,
          coinsRemaining: user.coins,
          coinsLeft: user.coins,
          cost,
          daySlotUsed,
          confirmed: false,
        };
      }

      if (cost > 0) {
        user.coins -= cost;
      }

      if (cost === 0) {
        user.last_free_post_timestamp = new Date().toISOString();
        user.last_free_post_date = todayKey();
      }

      if (user.postCountToday === 0) {
        user.postCountToday = 1;
      } else {
        user.postCountToday += 1;
      }

      cycle.confirmed = true;
      cycle.confirmedAt = Date.now();
      cycle.confirmedPostId = postId;
      cycle.confirmedWasFree = cost === 0;

      return {
        ok: true,
        postId,
        confirmedPostId: postId,
        confirmed: true,
        postCountToday: user.postCountToday,
        coinsLeft: user.coins,
        coinsRemaining: user.coins,
        cost,
        daySlotUsed,
        __cookieState: { user, cycle },
      };
    });

    if (!result.ok) {
      return res.status(result.statusCode || 400).json(result);
    }

    setUserCookie(res, userId);
    writeStateCookie(res, userId, result.__cookieState?.user, result.__cookieState?.cycle);
    delete result.__cookieState;
    res.json(result);
  } catch (err) {
    console.error("Phase4 confirm error:", err);
    res.status(500).json({ ok: false, error: "Confirm failed" });
  }
});

app.post("/api/phase4/download-variant", async (req, res) => {
  try {
    const payload = req.body || {};
    const userId = resolveUserId(req, payload.userId);
    const requestedPostId = String(payload.postId || "").trim();
    const actionId = normalizeActionId(payload.actionId);
    if (!userId) {
      return res.status(400).json({ ok: false, error: "Missing userId" });
    }

    const cycleCheck = await withStore((store) => {
      const { user } = hydrateFromStateCookie(req, store, userId);
      const cycle = getCycle(store, userId);
      if (!cycle || !cycle.confirmed) {
        return {
          ok: false,
          error: "No confirmed post",
          confirmed: false,
          coinsRemaining: user.coins,
          coinsLeft: user.coins,
        };
      }

      if (actionId) {
        const cached = ensureCycleActionResults(cycle)[actionId];
        if (cached && cached.ok) {
          const cachedPayload = { ...cached };
          delete cachedPayload._ts;
          return {
            ...cachedPayload,
            idempotentReplay: true,
            __cookieState: { user, cycle },
          };
        }
      }

      const generatedItems = Array.isArray(cycle.generatedItems)
        ? cycle.generatedItems
        : [];
      const postId = requestedPostId || String(cycle.confirmedPostId || "");
      if (!postId) {
        return {
          ok: false,
          error: "Missing postId",
          confirmed: true,
          coinsRemaining: user.coins,
          coinsLeft: user.coins,
        };
      }

      const knownPost =
        postId === String(cycle.confirmedPostId || "")
        || generatedItems.some((entry) => String(entry?.id || "") === postId);
      if (!knownPost) {
        return {
          ok: false,
          error: "Unknown postId",
          confirmed: true,
          postId,
          coinsRemaining: user.coins,
          coinsLeft: user.coins,
        };
      }

      const isOfficial = cycle.confirmedPostId === postId;
      const freeWindowActive = Boolean(cycle.confirmedWasFree && isDaySlotUsed(user));
      const cost = isOfficial && freeWindowActive ? 0 : 1;

      if (cost > 0 && user.coins < cost) {
        return {
          ok: false,
          error: "Insufficient coins",
          confirmed: true,
          postId,
          coins: user.coins,
          coinsRemaining: user.coins,
          coinsLeft: user.coins,
          cost,
        };
      }

      if (cost > 0) {
        user.coins -= cost;
      }

      const responsePayload = {
        ok: true,
        postId,
        confirmed: true,
        cost,
        freeWindowActive,
        isOfficial,
        coinsLeft: user.coins,
        coinsRemaining: user.coins,
      };

      setCycleActionResult(cycle, actionId, responsePayload);
      return {
        ...responsePayload,
        __cookieState: { user, cycle },
      };
    });

    if (!cycleCheck.ok) {
      return res.status(400).json(cycleCheck);
    }

    setUserCookie(res, userId);
    writeStateCookie(res, userId, cycleCheck.__cookieState?.user, cycleCheck.__cookieState?.cycle);
    delete cycleCheck.__cookieState;
    res.json(cycleCheck);
  } catch (err) {
    console.error("Phase4 download variant error:", err);
    res.status(500).json({ ok: false, error: "Download failed" });
  }
});

// Debug catch-all - moet als laatste
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    debug: {
      method: req.method,
      url: req.url,
      baseUrl: req.baseUrl,
      originalUrl: req.originalUrl,
      path: req.path
    }
  });
});

export default app;
