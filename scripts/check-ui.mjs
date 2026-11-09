// Fails when a component uses a text size, radius, weight or raw hex outside the PRD §9 scales.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SIZES = new Set(["12px", "13px", "15px", "16px", "20px", "24px", "30px"]);
const RADII = new Set(["4px", "6px", "8px", "10px", "12px", "14px", "16px", "20px", "inherit"]);
// Third-party brand marks and map canvas styling are allowed raw colours.
const HEX_ALLOW = ["src/lib/google-icon.tsx", "src/components/auth/SignInSheet.tsx", "src/components/map/PropertyMap.tsx", "src/components/ui/chart.tsx"];

const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? walk(p) : /\.tsx$/.test(p) ? [p] : [];
});

const problems = [];
for (const file of walk("src")) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    const at = `${file}:${i + 1}`;
    for (const m of line.matchAll(/\btext-\[([0-9.]+(?:px|rem))\]/g)) if (!SIZES.has(m[1])) problems.push(`${at} text size ${m[1]}`);
    for (const m of line.matchAll(/\brounded(?:-[a-z]+)?-\[([^\]]+)\]/g)) if (!RADII.has(m[1])) problems.push(`${at} radius ${m[1]}`);
    if (/\bfont-(thin|extralight|light)\b/.test(line)) problems.push(`${at} font weight`);
    // Statuses are a dot plus words (use Tag from src/ui/kit), never a filled pill.
    if (/<span className="[^"]*\brounded-full bg-(success|primary|destructive|warning|warn|orange)\/1[05]\b/.test(line)) problems.push(`${at} filled status pill`);
    if (/\buppercase\b/.test(line) && !file.includes("splash")) problems.push(`${at} small capitals`);
    if (!HEX_ALLOW.includes(file.replace(/\\/g, "/")) && /["'`\s(]#[0-9a-fA-F]{6}\b/.test(line)) problems.push(`${at} raw hex colour`);
  });
}

if (problems.length) {
  console.error(`check:ui found ${problems.length} problem(s):\n` + problems.join("\n"));
  process.exit(1);
}
console.log("check:ui OK");
