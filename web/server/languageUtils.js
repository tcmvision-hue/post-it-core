const SUPPORTED_OUTPUT_LANGUAGES = new Set([
  "auto",
  "nl",
  "en",
  "pl",
  "es",
  "fr",
  "de",
  "pt",
  "it",
  "ar",
  "zh",
  "ja",
  "he",
  "af",
  "sw",
  "am",
  "ha",
  "yo",
  "zu",
  "srn-nl",
  "straat-nl",
]);

const LANGUAGE_INSTRUCTIONS = {
  auto: "Gebruik standaard dezelfde taal als het kladblok.",
  nl: "Schrijf in standaard Nederlands.",
  en: "Write in English.",
  pl: "Pisz po polsku.",
  es: "Escribe en español.",
  fr: "Écris en français.",
  de: "Schreibe auf Deutsch.",
  pt: "Escreve em português.",
  it: "Scrivi in italiano.",
  ar: "اكتب باللغة العربية.",
  zh: "请用中文写作。",
  ja: "日本語で書いてください。",
  he: "כתוב בעברית.",
  af: "Skryf in Afrikaans.",
  sw: "Andika kwa Kiswahili.",
  am: "በአማርኛ ጻፍ።",
  ha: "Rubuta da Hausa.",
  yo: "Kọ ní èdè Yorùbá.",
  zu: "Bhala ngesiZulu.",
  "srn-nl": "Schrijf in Surinaams-Nederlands (natuurlijk en begrijpelijk, niet karikaturaal).",
  "straat-nl": "Schrijf in Nederlandse straattaal (natuurlijk, leesbaar en respectvol).",
};

const LANGUAGE_ALIASES = {
  dutch: "nl",
  nederlands: "nl",
  "nederlands (standaard)": "nl",
  english: "en",
  engels: "en",
  polish: "pl",
  pools: "pl",
  polski: "pl",
  spanish: "es",
  spaans: "es",
  espanol: "es",
  español: "es",
  french: "fr",
  frans: "fr",
  francais: "fr",
  français: "fr",
  german: "de",
  duits: "de",
  deutsch: "de",
  portuguese: "pt",
  portugees: "pt",
  portugues: "pt",
  português: "pt",
  italian: "it",
  italiaans: "it",
  italiano: "it",
  arabic: "ar",
  arabisch: "ar",
  chinese: "zh",
  chinees: "zh",
  mandarin: "zh",
  japanese: "ja",
  japans: "ja",
  hebrew: "he",
  hebreeuws: "he",
  afrikaans: "af",
  swahili: "sw",
  amharic: "am",
  amhaars: "am",
  hausa: "ha",
  yoruba: "yo",
  zulu: "zu",
  zoeloe: "zu",
  surinamese: "srn-nl",
  surinaams: "srn-nl",
  "surinaams nederlands": "srn-nl",
  straattaal: "straat-nl",
  "street language": "straat-nl",
  "street dutch": "straat-nl",
  auto: "auto",
  automatisch: "auto",
  automatic: "auto",
};

const LATIN_STOPWORDS = {
  en: ["the", "and", "to", "for", "with", "of", "in", "is", "that", "on"],
  nl: ["de", "het", "een", "en", "van", "voor", "met", "dat", "op", "is"],
  fr: ["le", "la", "les", "de", "des", "et", "pour", "avec", "est", "dans"],
  de: ["der", "die", "das", "und", "für", "mit", "ist", "ein", "auf", "zu"],
  es: ["el", "la", "los", "las", "de", "y", "para", "con", "que", "en"],
  pt: ["o", "a", "os", "as", "de", "e", "para", "com", "que", "em"],
  it: ["il", "la", "gli", "le", "di", "e", "per", "con", "che", "in"],
  pl: ["i", "że", "na", "w", "z", "do", "to", "jest", "dla", "nie"],
};

const DISTINCT_MARKERS = {
  en: ["the", "and", "with", "for", "this", "that", "you", "your", "are", "not", "from"],
  nl: ["de", "het", "een", "van", "met", "voor", "dat", "op", "ik", "je", "jij", "niet", "dit", "deze"],
};

export function normalizeOutputLanguage(value, fallback = "auto") {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return fallback;

  const aliasResolved = LANGUAGE_ALIASES[raw] || raw;
  const normalized = aliasResolved.replace(/_/g, "-");

  const compact = normalized.replace(/\s+/g, " ").trim();
  if (SUPPORTED_OUTPUT_LANGUAGES.has(compact)) {
    return compact;
  }

  const base = compact.split(/[\s(/]/)[0];
  if (SUPPORTED_OUTPUT_LANGUAGES.has(base)) {
    return base;
  }

  if (base.length === 2 && SUPPORTED_OUTPUT_LANGUAGES.has(base)) {
    return base;
  }

  if (SUPPORTED_OUTPUT_LANGUAGES.has(normalized)) {
    return normalized;
  }
  return fallback;
}

export function isSupportedOutputLanguage(value) {
  return normalizeOutputLanguage(value, "__invalid__") !== "__invalid__";
}

export function languageInstruction(targetLanguage) {
  return LANGUAGE_INSTRUCTIONS[targetLanguage] || "Write in English.";
}

function countMatches(text, regex) {
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

function wordsFromText(text) {
  const lowered = String(text || "").toLowerCase();
  const words = lowered.match(/[\p{L}']+/gu);
  return words || [];
}

function scoreLatinLanguage(words, languageCode) {
  const stopwords = LATIN_STOPWORDS[languageCode] || [];
  if (!stopwords.length || !words.length) return 0;
  const set = new Set(stopwords);
  let score = 0;
  for (const word of words) {
    if (set.has(word)) {
      score += 1;
    }
  }
  return score;
}

function scoreDistinctMarkers(words, languageCode) {
  const markers = DISTINCT_MARKERS[languageCode] || [];
  if (!markers.length || !words.length) return 0;
  const set = new Set(markers);
  let score = 0;
  for (const word of words) {
    if (set.has(word)) {
      score += 1;
    }
  }
  return score;
}

export function detectLanguageFromText(text) {
  const source = String(text || "");
  if (!source.trim()) return null;

  if (/[\u0600-\u06FF]/u.test(source)) return "ar";
  if (/[\u0590-\u05FF]/u.test(source)) return "he";

  const jaCount = countMatches(source, /[\u3040-\u30FF]/gu);
  if (jaCount >= 2) return "ja";

  const zhCount = countMatches(source, /[\u4E00-\u9FFF]/gu);
  if (zhCount >= 2) return "zh";

  const words = wordsFromText(source);

  const enDistinct = scoreDistinctMarkers(words, "en");
  const nlDistinct = scoreDistinctMarkers(words, "nl");
  if ((enDistinct >= 2 || nlDistinct >= 2) && enDistinct !== nlDistinct) {
    return enDistinct > nlDistinct ? "en" : "nl";
  }

  const candidates = ["en", "nl", "fr", "de", "es", "pt", "it", "pl"];
  let best = { code: null, score: 0 };
  for (const code of candidates) {
    const score = scoreLatinLanguage(words, code);
    if (score > best.score) {
      best = { code, score };
    }
  }

  if (best.code && best.score >= 2) {
    return best.code;
  }
  return null;
}

export function isLikelyLanguage(text, targetLanguage) {
  const target = normalizeOutputLanguage(targetLanguage, "auto");
  const source = String(text || "").trim();
  if (!source) return true;
  if (target === "auto") return true;

  if (target === "ar") return /[\u0600-\u06FF]/u.test(source);
  if (target === "he") return /[\u0590-\u05FF]/u.test(source);
  if (target === "ja") return /[\u3040-\u30FF]/u.test(source);
  if (target === "zh") return /[\u4E00-\u9FFF]/u.test(source);

  const normalizedTarget = target === "srn-nl" || target === "straat-nl" ? "nl" : target;
  const detected = detectLanguageFromText(source);
  if (!detected) return false;
  if (normalizedTarget === "af") {
    return detected === "nl" || detected === "en";
  }
  return detected === normalizedTarget;
}
