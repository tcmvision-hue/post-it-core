import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const sourceLogo = path.resolve(
  "src/ui/components/Reflection/logo.png"
);
const outputDir = path.resolve("public/icons");
const sizes = [192, 512];

async function ensureOutputDir() {
  await fs.mkdir(outputDir, { recursive: true });
}

async function generateIcon(size) {
  const target = path.join(outputDir, `post-this-${size}.png`);
  await sharp(sourceLogo)
    .resize(size, size, { fit: "contain", background: { r: 246, g: 243, b: 238, alpha: 1 } })
    .png()
    .toFile(target);
}

async function run() {
  await ensureOutputDir();
  await Promise.all(sizes.map((size) => generateIcon(size)));
  console.log("Icons generated:", sizes.map((size) => `post-this-${size}.png`).join(", "));
}

run().catch((error) => {
  console.error("Icon generation failed:", error);
  process.exit(1);
});
