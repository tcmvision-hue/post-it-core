import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import OpenAI from "openai";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

let openaiClient = null;

const SIMILARITY_THRESHOLD = 0.72;
const MAX_SIMILARITY_ATTEMPTS = 3;
const MAX_LANGUAGE_CORRECTION_ATTEMPTS = 2;

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

  // Gebruik alleen backend primary_language, veilige mapping, harde system prompt
  const languageMap = {
    nl: "Dutch",
    en: "English",
    de: "German",
    fr: "French",
    es: "Spanish"
  };
  const languageName = languageMap[primary_language] || "English";
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: attempt >= 3 ? 0.8 : 0.6,
    messages: [
      {
        role: "system",
        content: `
CRITICAL RULE:
The entire output MUST be written ONLY in ${languageName}.
Any use of another language is strictly forbidden and invalid.

Think and write as a native ${languageName} writer.
Do not translate. Do not mix languages.

---

TASK:

Generate exactly ONE professional social media post.

Keep the core message identical to the input.
Rewrite the post so that it is clearly different in:

* opening sentence
* structure
* rhythm
* wording

Each version must be distinctly different from previous ones.

---

STRICT RULES:

* Output ONLY the post text
* No explanations
* No questions
* No emojis
* No hashtags
* No call-to-action
`
      },
      {
        role: "user",
        content: `
Post nummer vandaag: ${postNumber}
Generation index binnen cyclus: ${generationIndex}
Variant-richting: ${variantGuide}
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

  return response.choices[0].message.content.trim();
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
  const languageMap = {
    nl: "Dutch",
    en: "English",
    de: "German",
    fr: "French",
    es: "Spanish"
  };
  const safeLanguage = languageMap[primary_language] || "English";
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
      primary_language,
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
