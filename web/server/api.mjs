import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import { generatePost } from "./generatePost.js";

const app = express();
const PORT = 3001;

app.use(bodyParser.json());

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
