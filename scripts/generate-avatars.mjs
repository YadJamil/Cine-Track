// Generates the preset profile avatars into public/avatars/*.svg.
// Run: node scripts/generate-avatars.mjs
// Cats are parametric; the movie-themed ones are hand-drawn. All original art —
// no copyrighted characters.
import { mkdir, writeFile } from "node:fs/promises";

const svg = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">${inner}</svg>`;

function cat({ bg, fur, inner, eye, nose, line }) {
  return svg(
    `<rect width="100" height="100" fill="${bg}"/>` +
      // ears
      `<path d="M28 46 L33 18 L53 40 Z" fill="${fur}"/>` +
      `<path d="M72 46 L67 18 L47 40 Z" fill="${fur}"/>` +
      `<path d="M34 42 L37 26 L47 38 Z" fill="${inner}"/>` +
      `<path d="M66 42 L63 26 L53 38 Z" fill="${inner}"/>` +
      // head
      `<circle cx="50" cy="57" r="30" fill="${fur}"/>` +
      // eyes (slit pupils)
      `<ellipse cx="40" cy="53" rx="4.5" ry="6.5" fill="${eye}"/>` +
      `<ellipse cx="60" cy="53" rx="4.5" ry="6.5" fill="${eye}"/>` +
      `<ellipse cx="40" cy="53" rx="1.6" ry="5.5" fill="#18181b"/>` +
      `<ellipse cx="60" cy="53" rx="1.6" ry="5.5" fill="#18181b"/>` +
      // nose + mouth
      `<path d="M46 63 L54 63 L50 68 Z" fill="${nose}"/>` +
      `<path d="M50 68 Q46 72 42 69 M50 68 Q54 72 58 69" stroke="${line}" stroke-width="1.6" fill="none" stroke-linecap="round"/>` +
      // whiskers
      `<g stroke="${line}" stroke-width="1.3" stroke-linecap="round">` +
      `<path d="M18 59 L36 61"/><path d="M18 67 L36 65"/>` +
      `<path d="M82 59 L64 61"/><path d="M82 67 L64 65"/></g>`,
  );
}

const cats = {
  "cat-black": cat({ bg: "#3f3f46", fur: "#1c1c20", inner: "#f5a3b7", eye: "#fbd737", nose: "#fb7185", line: "#52525b" }),
  "cat-orange": cat({ bg: "#7c2d12", fur: "#ea7317", inner: "#9a3412", eye: "#22c55e", nose: "#fb7185", line: "#7c2d12" }),
  "cat-gray": cat({ bg: "#52525b", fur: "#a1a1aa", inner: "#f9a8d4", eye: "#38bdf8", nose: "#fb7185", line: "#71717a" }),
  "cat-white": cat({ bg: "#d4d4d8", fur: "#fafafa", inner: "#f9a8d4", eye: "#a78bfa", nose: "#fb7185", line: "#a1a1aa" }),
  "cat-brown": cat({ bg: "#451a03", fur: "#92400e", inner: "#fed7aa", eye: "#fbd737", nose: "#fb7185", line: "#78350f" }),
  "cat-cream": cat({ bg: "#fbd737", fur: "#3f3f46", inner: "#fbd737", eye: "#fbd737", nose: "#fb7185", line: "#a1a1aa" }),
  "cat-calico": cat({ bg: "#1e293b", fur: "#fdba74", inner: "#ea580c", eye: "#a855f7", nose: "#fb7185", line: "#7c2d12" }),
  "cat-siamese": cat({ bg: "#a21caf", fur: "#e5e5e5", inner: "#1c1c20", eye: "#06b6d4", nose: "#fb7185", line: "#1c1c20" }),
  "cat-pink": cat({ bg: "#020617", fur: "#ec4899", inner: "#fbcfe8", eye: "#00f5ff", nose: "#ffffff", line: "#310015" }),
  "cat-cosmic": cat({ bg: "#0c4a6e", fur: "#38bdf8", inner: "#0284c7", eye: "#f59e0b", nose: "#fb7185", line: "#0369a1" }),
  "cat-zombie": cat({ bg: "#78716c", fur: "#84cc16", inner: "#4d7c0f", eye: "#dc2626", nose: "#fb7185", line: "#3f6212" }),
  "cat-gold": cat({ bg: "#451a03", fur: "#fbbf24", inner: "#b45309", eye: "#ec4899", nose: "#fb7185", line: "#78350f" }),
};

// ── Movie-themed (generic, original) ─────────────────────────────────────────
const movie = {
  "clapperboard": svg(
    `<rect width="100" height="100" fill="#fbd737"/>` +
      `<g fill="none" stroke="#1c1c1f" stroke-width="4.5" stroke-linejoin="round">` +
      `<path d="M28 46 L72 46 L72 74 L28 74 Z" fill="#1c1c1f"/>` +
      `<path d="M28 46 L34 32 L78 40 L72 46" fill="#1c1c1f"/></g>` +
      `<g stroke="#fbd737" stroke-width="3"><path d="M38 40 L44 47"/><path d="M50 38 L56 45"/><path d="M62 37 L68 44"/></g>`,
  ),
  "popcorn": svg(
    `<rect width="100" height="100" fill="#b91c1c"/>` +
      `<g fill="#fef3c7"><circle cx="40" cy="34" r="8"/><circle cx="52" cy="30" r="9"/><circle cx="63" cy="35" r="7"/><circle cx="47" cy="40" r="7"/><circle cx="58" cy="41" r="7"/></g>` +
      `<path d="M35 44 L65 44 L61 78 L39 78 Z" fill="#fafafa"/>` +
      `<g fill="#dc2626"><path d="M40 44 L44 78 L48 78 L44 44 Z"/><path d="M54 44 L58 78 L62 78 L58 44 Z"/></g>`,
  ),
  "ghost": svg(
    `<rect width="100" height="100" fill="#6d28d9"/>` +
      `<path d="M30 74 L30 50 a20 20 0 0 1 40 0 L70 74 L62 68 L54 74 L46 68 L38 74 Z" fill="#fafafa"/>` +
      `<circle cx="43" cy="50" r="4" fill="#1c1c1f"/><circle cx="57" cy="50" r="4" fill="#1c1c1f"/>` +
      `<circle cx="38" cy="58" r="3" fill="#f9a8d4"/><circle cx="62" cy="58" r="3" fill="#f9a8d4"/>`,
  ),
  "robot": svg(
    `<rect width="100" height="100" fill="#0d9488"/>` +
      `<line x1="50" y1="24" x2="50" y2="32" stroke="#fafafa" stroke-width="3"/><circle cx="50" cy="22" r="4" fill="#fbd737"/>` +
      `<rect x="30" y="32" width="40" height="36" rx="8" fill="#e5e7eb"/>` +
      `<circle cx="41" cy="48" r="5" fill="#0d9488"/><circle cx="59" cy="48" r="5" fill="#0d9488"/>` +
      `<rect x="40" y="58" width="20" height="4" rx="2" fill="#0d9488"/>`,
  ),
  "alien": svg(
    `<rect width="100" height="100" fill="#15803d"/>` +
      `<ellipse cx="50" cy="54" rx="24" ry="28" fill="#86efac"/>` +
      `<ellipse cx="41" cy="52" rx="6" ry="9" fill="#1c1c1f" transform="rotate(-15 41 52)"/>` +
      `<ellipse cx="59" cy="52" rx="6" ry="9" fill="#1c1c1f" transform="rotate(15 59 52)"/>` +
      `<path d="M44 70 Q50 74 56 70" stroke="#166534" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  ),
  "reel": svg(
    `<rect width="100" height="100" fill="#27272a"/>` +
      `<circle cx="50" cy="50" r="28" fill="none" stroke="#fbd737" stroke-width="5"/>` +
      `<circle cx="50" cy="50" r="6" fill="#fbd737"/>` +
      `<g fill="#fbd737"><circle cx="50" cy="32" r="4.5"/><circle cx="50" cy="68" r="4.5"/><circle cx="32" cy="50" r="4.5"/><circle cx="68" cy="50" r="4.5"/></g>`,
  ),
};

await mkdir("public/avatars", { recursive: true });
const all = { ...cats, ...movie };
for (const [id, markup] of Object.entries(all)) {
  await writeFile(`public/avatars/${id}.svg`, markup);
  console.log("wrote", `public/avatars/${id}.svg`);
}
