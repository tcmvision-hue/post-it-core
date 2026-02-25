import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, "..");
const sourceLogo = path.resolve(webRoot, "public/icons/Post this icoon.png");
const outputDir = path.resolve(webRoot, "public/icons");
const sizes = [192, 512, 1024];
const brandBackground = "#145C63";
const logoScale = 0.88;
const cornerRadiusRatio = 0.22;

async function ensureOutputDir() {
  await fs.mkdir(outputDir, { recursive: true });
}

async function generateIcon(size) {
  const target = path.join(outputDir, `post-this-${size}.png`);
  const trimmedLogoBuffer = await sharp(sourceLogo)
    .trim({ threshold: 12 })
    .png()
    .toBuffer();

  const logoSize = Math.round(size * logoScale);
  const cornerRadius = Math.round(logoSize * cornerRadiusRatio);
  const roundedMask = Buffer.from(
    `<svg width="${logoSize}" height="${logoSize}"><rect x="0" y="0" width="${logoSize}" height="${logoSize}" rx="${cornerRadius}" ry="${cornerRadius}" fill="white"/></svg>`
  );

  const logoBuffer = await sharp(trimmedLogoBuffer)
    .resize(logoSize, logoSize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .composite([{ input: roundedMask, blend: "dest-in" }])
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: brandBackground,
    },
  })
    .composite([{ input: logoBuffer, gravity: "center" }])
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
