// Generates the PWA icon set from the app logo (yellow tile + lucide clapperboard
// with a cat paw print stamped on the slate).
// Run: node scripts/generate-icons.mjs   (sharp ships with Next.js)
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const CLAPPERBOARD_PATHS = [
  "m12.296 3.464 3.02 3.956",
  "M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3z",
  "M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  "m6.18 5.276 3.1 3.899",
];

// A cat paw print (filled), sized to sit inside the clapperboard's slate: a big
// metacarpal pad with four toe beans arced above it. Same 24-unit space as the
// clapperboard glyph so it rides along with the translate/scale below.
const PAW = [
  `<ellipse cx="12" cy="18" rx="2.7" ry="2.05"/>`,
  `<ellipse cx="8.5" cy="15.2" rx="1.05" ry="1.35"/>`,
  `<ellipse cx="10.8" cy="13.9" rx="1.1" ry="1.5"/>`,
  `<ellipse cx="13.2" cy="13.9" rx="1.1" ry="1.5"/>`,
  `<ellipse cx="15.5" cy="15.2" rx="1.05" ry="1.35"/>`,
].join("");

function svg(size, cornerRadius, glyphScale) {
  const glyph = 24 * glyphScale;
  const offset = (size - glyph) / 2;
  const paths = CLAPPERBOARD_PATHS.map((d) => `<path d="${d}"/>`).join("");
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      `<rect width="${size}" height="${size}" rx="${cornerRadius}" fill="#fbd737"/>` +
      `<g transform="translate(${offset},${offset}) scale(${glyphScale})">` +
      `<g fill="none" stroke="#1c1c1f" stroke-width="2" stroke-linecap="round" ` +
      `stroke-linejoin="round">${paths}</g>` +
      `<g fill="#1c1c1f">${PAW}</g>` +
      `</g>` +
      `</svg>`,
  );
}

await mkdir("public/icons", { recursive: true });

const jobs = [
  // Regular icons: rounded tile baked in.
  ["public/icons/icon-192.png", svg(192, 43, 4.5)],
  ["public/icons/icon-512.png", svg(512, 115, 12)],
  // Maskable: full-bleed background, glyph inside the 80% safe zone.
  ["public/icons/icon-maskable-512.png", svg(512, 0, 8.5)],
  // Apple touch icon: full-bleed square; iOS applies its own corner mask.
  ["src/app/apple-icon.png", svg(180, 0, 4.2)],
  // Favicon / browser-tab icon (Next serves src/app/icon.png).
  ["src/app/icon.png", svg(192, 43, 4.5)],
];

for (const [file, buffer] of jobs) {
  await sharp(buffer).png().toFile(file);
  console.log("wrote", file);
}
