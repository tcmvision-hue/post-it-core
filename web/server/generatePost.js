import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generatePost({
  kladblok,
  doelgroep,
  intentie,
  context,
  keywords,
}) {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content:
          "Je genereert exact één social media post. Geen uitleg. Geen vragen.",
      },
      {
        role: "user",
        content: `
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
