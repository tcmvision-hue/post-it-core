import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import OpenAI from "openai";
import {
  detectLanguageFromText,
  languageInstruction,
  normalizeOutputLanguage,
} from "./languageUtils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

let openaiClient = null;

const SIMILARITY_THRESHOLD = 0.72;
const MAX_SIMILARITY_ATTEMPTS = 3;

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

function normalizeSimilarityText(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[#@][\p{L}\p{N}_-]+/gu, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getWordSet(text) {
  const normalized = normalizeSimilarityText(text);
  const words = normalized.split(" ").filter((token) => token.length >= 3);
  return new Set(words);
}

function jaccardSimilarity(a, b) {
  const setA = getWordSet(a);
  const setB = getWordSet(b);
  if (!setA.size || !setB.size) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function firstSentence(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  const split = raw.split(/(?<=[.!?])\s+/u);
  return normalizeSimilarityText(split[0] || raw);
}

function isTooSimilar(candidate, previousVariants) {
  const candidateOpening = firstSentence(candidate);
  for (const previous of previousVariants || []) {
    const score = jaccardSimilarity(candidate, previous);
    const sameOpening = candidateOpening && candidateOpening === firstSentence(previous);
    if (sameOpening || score >= SIMILARITY_THRESHOLD) {
      return true;
    }
  }
  return false;
}

async function generateCandidate({
  client,
  kladblok,
  doelgroep,
  intentie,
  context,
  keywords,
  postNumber,
  generationIndex,
  languageGuide,
  detectedInputLanguage,
  strictLanguageRule,
  effectiveOutputLanguage,
  priorVariants,
  attempt,
}) {
  const variantGuide = generationIndex === 1
    ? "Variant 1: helder, direct en compact."
    : generationIndex === 2
      ? "Variant 2: verhalend en persoonlijker, met andere zinsopbouw dan variant 1."
      : `Variant ${generationIndex}: nieuwe invalshoek, duidelijk ander ritme en nieuwe opening.`;

  const attemptInstruction = attempt > 1
    ? `Extra eis voor poging ${attempt}: maak de eerste zin en zinsstructuur nog duidelijker anders dan alle eerdere varianten.`
    : "";

  const priorVariantsBlock = Array.isArray(priorVariants) && priorVariants.length
    ? `Eerdere varianten (NIET herhalen, NIET parafraseren):\n${priorVariants
      .map((item, idx) => `${idx + 1}. ${String(item || "").trim()}`)
      .join("\n")}`
    : "";

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: attempt >= 3 ? 0.8 : 0.6,
    messages: [
      {
        role: "system",
        content:
          "Je genereert exact één zakelijke social media post. Houd de kernboodschap inhoudelijk gelijk aan de input, maar schrijf elke variant duidelijk anders in stijl, opening, ritme en formulering. De varianten mogen niet op elkaar lijken in zinsbegin, volgorde of toon. Volg strikt de taalinstructie uit de user prompt. Als de outputtaal expliciet is opgegeven, gebruik uitsluitend die taal voor de volledige output. Geen uitleg, geen vragen, geen emojis, geen hashtags, geen CTA.",
      },
      {
        role: "user",
        content: `
Post nummer vandaag: ${postNumber}
Generation index binnen cyclus: ${generationIndex}
Variant-richting: ${variantGuide}
Taalinstructie: ${languageGuide}
Auto detect inputtaal: ${detectedInputLanguage || "onbekend"}
${strictLanguageRule ? `Taalregel: ${strictLanguageRule}` : ""}
${attemptInstruction}
${priorVariantsBlock}
Kladblok: ${kladblok}
Doelgroep: ${doelgroep}
Intentie: ${intentie}
Context: ${context}
Richting: ${keywords || ""}

Eisen:
- Houd de boodschap hetzelfde als in het kladblok.
- Maak deze variant duidelijk onderscheidend van eerdere varianten.
- Gebruik een andere eerste zin dan in vorige varianten.
- Gebruik exact de gevraagde outputtaal voor de volledige tekst.
- Lever alleen de posttekst.
        `,
      },
    ],
  });

  let post = response.choices[0].message.content.trim();

  if (effectiveOutputLanguage !== "auto") {
    const retry = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.25,
      messages: [
        {
          role: "system",
          content:
            "Je corrigeert exact één zakelijke social media post naar de gevraagde taal. Behoud de betekenis. Geen uitleg, geen vragen, geen emojis, geen hashtags, geen CTA.",
        },
        {
          role: "user",
          content: `Corrigeer deze post nu strikt naar deze taal: ${languageInstruction(effectiveOutputLanguage)}\n\nHarde regel: geef alleen de posttekst terug in exact die taal, zonder gemixte taal.\n\nOutput:\n${post}`,
        },
      ],
    });
    post = retry.choices[0]?.message?.content?.trim() || post;
  }

  return post;
}

export async function generatePost({
  kladblok,
  doelgroep,
  intentie,
  context,
  keywords,
  outputLanguage,
  postNumber,
  generationIndex,
  priorVariants = [],
}) {
  const client = getOpenAIClient();

  const requestedOutputLanguage = normalizeOutputLanguage(outputLanguage, "auto");
  const detectedInputLanguage = detectLanguageFromText(kladblok);
  const effectiveOutputLanguage = requestedOutputLanguage === "auto"
    ? (detectedInputLanguage || "auto")
    : requestedOutputLanguage;

  const languageGuide = requestedOutputLanguage === "auto" && detectedInputLanguage
    ? `${languageInstruction(detectedInputLanguage)} (auto bepaald op basis van kladblok)`
    : languageInstruction(effectiveOutputLanguage);

  const strictLanguageRule = {
    auto: "",
    nl: "Harde eis: de complete output MOET in Nederlands zijn.",
    en: "Hard requirement: output MUST be fully in English.",
    pl: "Wymóg twardy: cały wynik MUSI być po polsku.",
    es: "Requisito estricto: toda la salida DEBE estar en español.",
    fr: "Exigence stricte : toute la sortie DOIT être en français.",
    de: "Strikte Vorgabe: Die gesamte Ausgabe MUSS auf Deutsch sein.",
    pt: "Exigência rígida: toda a saída DEVE estar em português.",
    it: "Requisito rigido: l'output DEVE essere interamente in italiano.",
    ar: "شرط صارم: يجب أن يكون الناتج كله باللغة العربية.",
    zh: "硬性要求：输出内容必须全部为中文。",
    ja: "厳格要件：出力は必ず全文日本語にすること。",
    he: "דרישה קשיחה: כל הפלט חייב להיות בעברית.",
    af: "Harde vereiste: die hele uitset MOET in Afrikaans wees.",
    sw: "Sharti kali: matokeo yote LAZIMA yawe kwa Kiswahili.",
    am: "ጠንካራ መስፈርት፡ ውጤቱ ሙሉ በሙሉ በአማርኛ መሆን አለበት።",
    ha: "Sharadi mai tsauri: duk sakamakon dole ya kasance cikin Hausa.",
    yo: "Ìlànà líle: gbogbo ìdáhùn gbọ́dọ̀ jẹ́ ní èdè Yorùbá.",
    zu: "Imfuneko eqinile: konke okukhiphayo KUMELE kube ngesiZulu.",
    "srn-nl": "Harde eis: output in Surinaams-Nederlands (natuurlijk en respectvol).",
    "straat-nl": "Harde eis: output in Nederlandse straattaal (natuurlijk en respectvol).",
  }[effectiveOutputLanguage] || "";

  const previous = Array.isArray(priorVariants)
    ? priorVariants
      .filter((item) => typeof item === "string" && item.trim().length > 0)
      .slice(-8)
    : [];

  let post = "";
  for (let attempt = 1; attempt <= MAX_SIMILARITY_ATTEMPTS; attempt += 1) {
    post = await generateCandidate({
      client,
      kladblok,
      doelgroep,
      intentie,
      context,
      keywords,
      postNumber,
      generationIndex,
      languageGuide,
      detectedInputLanguage,
      strictLanguageRule,
      effectiveOutputLanguage,
      priorVariants: previous,
      attempt,
    });

    if (!isTooSimilar(post, previous)) {
      break;
    }
  }

  return {
    post,
  };
}
