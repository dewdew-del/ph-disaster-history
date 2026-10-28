// Resizes the archive pictures in public/images/archive to small JPEGs for the contact sheet.
// Uses sharp (installed with Next.js). Originals and credits come from Wikimedia Commons, see credits.json.
// Run: node scripts/optimize-images.mjs
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const dir = path.join(process.cwd(), "public", "images", "archive");
const credits = JSON.parse(fs.readFileSync(path.join(dir, "credits.json"), "utf8"));

for (const file of fs.readdirSync(dir)) {
  if (!/\.(png|jpe?g)$/i.test(file) || file.endsWith(".min.jpg")) continue;
  const src = path.join(dir, file);
  const out = path.join(dir, file.replace(/\.(png|jpe?g)$/i, ".min.jpg"));
  const info = await sharp(src)
    .resize({ height: 480, width: 720, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#000000" })
    .jpeg({ quality: 74, mozjpeg: true })
    .toFile(out);
  fs.rmSync(src);
  // Keep credits.json pointing at the file that ships.
  for (const c of Array.isArray(credits) ? credits : Object.values(credits)) {
    for (const key of ["file", "path", "local"]) {
      if (typeof c[key] === "string" && c[key].endsWith(file)) c[key] = c[key].replace(file, path.basename(out));
    }
  }
  console.log(`${file} -> ${path.basename(out)} ${info.width}x${info.height} ${Math.round(info.size / 1024)} KB`);
}
fs.writeFileSync(path.join(dir, "credits.json"), JSON.stringify(credits, null, 2));
