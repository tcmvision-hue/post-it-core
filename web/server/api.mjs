import fs from "fs";
import path from "path";
import OpenAI from "openai";
import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import { generatePost } from "./generatePost.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const app = express();
const PORT = 3001;

app.use(bodyParser.json());

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
        } catch (err) {
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
  } catch (err) {
    res.json({ ok: true });
  }
});

app.post("/api/generate", async (req, res) => {
  try {
    const { kladblok, doelgroep, intentie, context, keywords } = req.body;

    const result = await generatePost({
      kladblok,
      doelgroep,
      intentie,
      context,
      keywords,
    });

    res.json(result);
  } catch (err) {
    console.error("API error:", err);
    res.status(500).json({ error: "AI generation failed" });
  }
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
