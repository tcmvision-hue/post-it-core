import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generatePost({
  kladblok,
  doelgroep,
  intentie,
  context,
  keywords,
  postNumber,
  generationIndex,
}) {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content:
          "Je genereert exact één social media post. De post is tijdloos en verwijst niet naar tijd, dagdelen of actualiteit. Geen uitleg. Geen vragen. Geen emojis, geen hashtags, geen CTA. Gebruik geen tijdstaal.",
      },
      {
        role: "user",
        content: `
Post nummer vandaag: ${postNumber}
Generation index binnen cyclus: ${generationIndex}
Kladblok: ${kladblok}
Doelgroep: ${doelgroep}
Intentie: ${intentie}
Context: ${context}
Richting: ${keywords || ""}
        `,
      },
    ],
  });

  return {
    post: response.choices[0].message.content.trim(),
  };
}
