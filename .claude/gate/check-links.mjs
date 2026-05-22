#!/usr/bin/env node
// Internal link/asset checker for the Rung 0 gate. No dependencies.
// Walks every .html file in the repo and verifies that relative
// href/src targets resolve. Exits 1 on any genuine miss.
//
// Deliberately tolerant of legitimate static-host conventions:
//   - directory links (e.g. "/", "calculators/") resolve if the dir exists
//   - extensionless clean URLs (e.g. "/components") resolve if "<path>.html" exists
// Script and style blocks are stripped before scanning, so dynamic
// JS path concatenation is never mistaken for an HTML attribute.

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve, relative, extname } from "node:path";

const REPO_ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..", "..");
const SKIP_DIRS = new Set([".git", "node_modules", ".claude", "scratch"]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(full, out);
    } else if (entry.name.endsWith(".html")) {
      out.push(full);
    }
  }
  return out;
}

const isExternal = (u) =>
  /^(https?:|mailto:|tel:|data:|javascript:|#)/i.test(u) || u.trim() === "";

const exists = (p) => existsSync(p);
const isDir = (p) => existsSync(p) && statSync(p).isDirectory();
const isFile = (p) => existsSync(p) && statSync(p).isFile();

let broken = 0;
let checked = 0;

for (const file of walk(REPO_ROOT)) {
  const html = readFileSync(file, "utf8")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  const attrs = [...html.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi)];
  for (const [, raw] of attrs) {
    if (isExternal(raw)) continue;
    const url = raw.split("#")[0].split("?")[0];
    if (url === "") continue;
    const base = url.startsWith("/") ? REPO_ROOT : dirname(file);
    const target = resolve(base, url.replace(/^\//, ""));
    checked++;
    const ok =
      isFile(target) ||
      isDir(target) ||
      (extname(target) === "" && isFile(target + ".html"));
    if (!ok) {
      broken++;
      console.error(`  BROKEN  ${relative(REPO_ROOT, file)}  ->  ${raw}`);
    }
  }
}

if (broken > 0) {
  console.error(`links: ${broken} broken of ${checked} checked`);
  process.exit(1);
}
console.log(`links: ${checked} internal link(s) OK`);
