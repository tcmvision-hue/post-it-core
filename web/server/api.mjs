import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import dotenv from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import { generatePost } from "./generatePost.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const app = express();
const PORT = 3001;
const STORE_PATH = path.join(__dirname, "coinStore.json");
let storeLock = Promise.resolve();
const cycles = new Map();
const COIN_BUNDLES = {
  "20": { coins: 20, amount: "10.00" },
  "50": { coins: 50, amount: "22.50" },
  "100": { coins: 100, amount: "40.00" },
};

app.use(bodyParser.json());

function todayKey() {
  return new Date().toISOString().split("T")[0];
}

function loadStore() {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      fs.writeFileSync(STORE_PATH, JSON.stringify({ users: {} }, null, 2));
    }
    const raw = fs.readFileSync(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw || "{}");
    if (!parsed.users) parsed.users = {};
    if (!parsed.payments) parsed.payments = {};
    return parsed;
  } catch {
    return { users: {}, payments: {} };
  }
}

function saveStore(store) {
  const tempPath = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(store, null, 2));
  fs.renameSync(tempPath, STORE_PATH);
}

function withStore(handler) {
  storeLock = storeLock.then(() => {
    const store = loadStore();
    const result = handler(store);
    saveStore(store);
    return result;
  });
  return storeLock;
}

function ensureUser(store, userId) {
  if (!store.users[userId]) {
    store.users[userId] = {
      coins: 0,
      day: todayKey(),
      postCountToday: 0,
    };
  }
  const user = store.users[userId];
  const today = todayKey();
  if (user.day !== today) {
    user.day = today;
    user.postCountToday = 0;
  }
  if (typeof user.postCountToday !== "number") {
    user.postCountToday = 0;
  }
  return user;
}

function isDaySlotUsed(user) {
  return user.postCountToday > 0;
}

function costForOption(optionKey) {
  if (optionKey === "tone") return 2;
  if (optionKey === "hashtags") return 1;
  if (optionKey === "rephrase") return 1;
  if (optionKey === "download") return 2;
  return null;
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
    day: todayKey(),
    startedAt: Date.now(),
    confirmed: false,
  };
}

async function rewritePost({ post, tone, mode }) {
  const instruction =
    mode === "tone"
      ? `Herschrijf de post in deze toon: ${tone}.`
      : "Herschrijf de post licht, met dezelfde betekenis.";

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content:
          "Je herschrijft exact een korte zakelijke social post. Geen uitleg. Geen vragen. Geen emojis. Geen hashtags. Geen CTA.",
      },
      {
        role: "user",
        content: `${instruction}\n\nPost:\n${post}`,
      },
    ],
    max_tokens: 400,
  });

  return response.choices[0]?.message?.content?.trim() || post;
}

async function generateHashtags(post) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content:
          "Je genereert alleen hashtags. Geen uitleg. Geen emojis. Antwoord met een lijst hashtags, gescheiden door komma's.",
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
  const cookieHeader = req.headers.cookie || "";
  const parts = cookieHeader.split(";").map((p) => p.trim());
  for (const part of parts) {
    if (part.startsWith("post_it_uid=")) {
      return decodeURIComponent(part.split("=")[1]);
    }
  }
  return null;
}

function setUserCookie(res, userId) {
  res.setHeader(
    "Set-Cookie",
    `post_it_uid=${encodeURIComponent(userId)}; Path=/; SameSite=Lax; HttpOnly`
  );
}

function getOrigin(req) {
  return req.headers.origin || process.env.APP_ORIGIN || "http://localhost:5173";
}

function buildRedirectUrl(baseUrl, returnTo) {
  if (!returnTo) return baseUrl;
  try {
    const url = new URL(baseUrl);
    url.searchParams.set("return", returnTo);
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
    // OpenAI Whisper transcriptie
    try {
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
        language: "nl"
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
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.json({ ok: true });
    }
    const systemPrompt = `Je bent een zakelijke tekstmoderator. Keur alleen teksten goed die geschikt zijn voor een zakelijke post. Weiger ALTIJD:\n- brabbel, betekenisloze of lege input\n- expliciet, grof, seksueel, racistisch, discriminerend, kwetsend of ongepast taalgebruik (zoals: klit, lul, neuken, tering, tyfus, flikker, kanker, kut, godver, etc.)\n- spam, random tekens, AI-prompts, herhaling zonder nieuwe inhoud, off-topic, niet-beschrijvend.\n\nGeef GEEN uitleg, GEEN regels, GEEN technische taal. Geef ALLEEN letterlijk 'ok' als de tekst geschikt is, of 'afgekeurd' als de tekst niet geschikt is. Geen andere output.`;
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
    const { userId } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const status = await withStore((store) => {
      const user = ensureUser(store, userId);
      const postNumNext = user.postCountToday + 1;
      const daySlotUsed = isDaySlotUsed(user);
      const costToStart = daySlotUsed ? 1 : 0;
      return {
        coins: user.coins,
        postNumNext,
        daySlotUsed,
        costToStart,
        extraGenerationCost: 1,
      };
    });

    setUserCookie(res, userId);
    res.json(status);
  } catch (err) {
    console.error("Phase4 status error:", err);
    res.status(500).json({ error: "Status failed" });
  }
});

app.post("/api/phase4/start", async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const result = await withStore((store) => {
      const user = ensureUser(store, userId);
      const daySlotUsed = isDaySlotUsed(user);
      const costToStart = daySlotUsed ? 1 : 0;

      if (costToStart > 0 && user.coins < costToStart) {
        return {
          ok: false,
          error: "Insufficient coins",
          coins: user.coins,
          postNumber: user.postCountToday + 1,
          costToStart,
        };
      }

      const postNumber = user.postCountToday + 1;
      cycles.set(userId, createCycle(userId, postNumber));

      return {
        ok: true,
        postNumber,
        costToStart,
        daySlotUsed,
        coinsLeft: user.coins,
      };
    });

    if (!result.ok) {
      return res.status(400).json(result);
    }

    setUserCookie(res, userId);
    res.json(result);
  } catch (err) {
    console.error("Phase4 start error:", err);
    res.status(500).json({ error: "Start failed" });
  }
});

app.post("/api/phase4/option", async (req, res) => {
  try {
    const { userId, optionKey, post, tone } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }
    if (optionKey === "download") {
      return res.status(400).json({ error: "Use download endpoint" });
    }

    const cost = costForOption(optionKey);
    if (cost === null) {
      return res.status(400).json({ error: "Unknown option" });
    }

    const cycle = cycles.get(userId);
    if (!cycle || !cycle.confirmed) {
      return res.status(400).json({ error: "No confirmed post" });
    }

    if (optionKey === "tone" || optionKey === "rephrase") {
      if (cycle.variantCount >= 3) {
        return res.status(400).json({ error: "Variant limit reached" });
      }
    }

    if (!post || typeof post !== "string") {
      return res.status(400).json({ error: "Missing post" });
    }

    if (optionKey === "tone" && (!tone || typeof tone !== "string")) {
      return res.status(400).json({ error: "Missing tone" });
    }

    const result = await withStore((store) => {
      const user = ensureUser(store, userId);
      if (user.coins < cost) {
        return {
          error: "Insufficient coins",
          coins: user.coins,
          cost,
        };
      }

      user.coins -= cost;

      return {
        ok: true,
        optionKey,
        cost,
        debitedFor: optionKey,
        coinsLeft: user.coins,
      };
    });

    if (!result.ok) {
      return res.status(400).json(result);
    }

    if (optionKey === "tone") {
      const rewritten = await rewritePost({ post, tone, mode: "tone" });
      cycle.variantCount += 1;
      setUserCookie(res, userId);
      return res.json({ ...result, post: rewritten });
    }

    if (optionKey === "rephrase") {
      const rewritten = await rewritePost({ post, mode: "rephrase" });
      cycle.variantCount += 1;
      setUserCookie(res, userId);
      return res.json({ ...result, post: rewritten });
    }

    if (optionKey === "hashtags") {
      const tags = await generateHashtags(post || "");
      setUserCookie(res, userId);
      return res.json({ ...result, hashtags: tags });
    }

    setUserCookie(res, userId);
    res.json(result);
  } catch (err) {
    console.error("Phase4 option error:", err);
    res.status(500).json({ error: "Option failed" });
  }
});


app.post("/api/phase4/checkout", async (req, res) => {
  try {
    const { userId, bundle, returnTo } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }
    const selected = COIN_BUNDLES[String(bundle || "")];
    if (!selected) {
      return res.status(400).json({ error: "Unknown bundle" });
    }
    if (!process.env.MOLLIE_API_KEY) {
      return res.status(500).json({ error: "Missing Mollie API key" });
    }

    const origin = getOrigin(req);
    const baseRedirectUrl = process.env.MOLLIE_REDIRECT_URL || origin;
    const allowedReturnTo = new Set(["coins", "packages"]);
    const safeReturnTo = allowedReturnTo.has(returnTo) ? returnTo : "";
    const redirectUrl = buildRedirectUrl(baseRedirectUrl, safeReturnTo);
    const webhookUrl =
      process.env.MOLLIE_WEBHOOK_URL || `${origin}/api/phase4/webhook`;

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
        coins: selected.coins,
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

app.post(
  "/api/phase4/webhook",
  bodyParser.urlencoded({ extended: false }),
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
            coins: payment?.metadata?.coins || 0,
            status: payment?.status || "unknown",
            credited: false,
          };
        }

        const entry = store.payments[paymentId];
        entry.status = payment?.status || entry.status;

        if (payment?.status === "paid" && !entry.credited) {
          const user = ensureUser(store, entry.userId);
          user.coins += entry.coins;
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
    const { kladblok, doelgroep, intentie, context, keywords } = req.body;

    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(403).json({ error: "Cycle not started" });
    }

    const cycle = cycles.get(userId);
    if (!cycle || cycle.generationIndex >= 3) {
      return res.status(403).json({ error: "Cycle not started" });
    }

    if (cycle.variantCount >= 3) {
      return res.status(400).json({ error: "Variant limit reached" });
    }

    if (cycle.confirmed) {
      return res.status(403).json({ error: "Post already confirmed" });
    }

    const billing = await withStore((store) => {
      const user = ensureUser(store, userId);
      const daySlotUsed = isDaySlotUsed(user);
      const cost = cycle.generationIndex === 0 ? (daySlotUsed ? 1 : 0) : 1;

      if (cost > 0 && user.coins < cost) {
        return {
          ok: false,
          error: "Insufficient coins",
          coins: user.coins,
          cost,
        };
      }

      user.coins -= cost;
      return {
        ok: true,
        cost,
        coinsLeft: user.coins,
      };
    });

    if (!billing.ok) {
      return res.status(400).json(billing);
    }

    cycle.generationIndex += 1;
    cycle.variantCount += 1;

    const result = await generatePost({
      kladblok,
      doelgroep,
      intentie,
      context,
      keywords,
      postNumber: cycle.postNumber,
      generationIndex: cycle.generationIndex,
    });

    res.json({ ...result, cost: billing.cost, coinsLeft: billing.coinsLeft });
  } catch (err) {
    console.error("API error:", err);
    res.status(500).json({ error: "AI generation failed" });
  }
});

app.post("/api/phase4/confirm", async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const cycle = cycles.get(userId);
    if (!cycle) {
      return res.status(400).json({ error: "No active cycle" });
    }

    if (cycle.confirmed) {
      return res.json({ ok: true, alreadyConfirmed: true });
    }

    const result = await withStore((store) => {
      const user = ensureUser(store, userId);
      if (user.postCountToday === 0) {
        user.postCountToday = 1;
      } else {
        user.postCountToday += 1;
      }

      return {
        ok: true,
        postCountToday: user.postCountToday,
        coinsLeft: user.coins,
      };
    });

    cycle.confirmed = true;
    setUserCookie(res, userId);
    res.json(result);
  } catch (err) {
    console.error("Phase4 confirm error:", err);
    res.status(500).json({ error: "Confirm failed" });
  }
});

app.post("/api/phase4/download-variant", async (req, res) => {
  try {
    const { userId, isOfficial } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const cycle = cycles.get(userId);
    if (!cycle || !cycle.confirmed) {
      return res.status(400).json({ error: "No confirmed post" });
    }

    const cost = isOfficial ? 0 : 1;
    if (cost === 0) {
      setUserCookie(res, userId);
      return res.json({ ok: true, cost: 0 });
    }

    const result = await withStore((store) => {
      const user = ensureUser(store, userId);
      if (user.coins < cost) {
        return {
          ok: false,
          error: "Insufficient coins",
          coins: user.coins,
        };
      }

      user.coins -= cost;
      return { ok: true, cost, coinsLeft: user.coins };
    });

    if (!result.ok) {
      return res.status(400).json(result);
    }

    setUserCookie(res, userId);
    res.json(result);
  } catch (err) {
    console.error("Phase4 download variant error:", err);
    res.status(500).json({ error: "Download failed" });
  }
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
