import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const base = process.env.BUDGET_BASE_URL || 'http://127.0.0.1:3000';
const budgetKb = Number(process.env.BUDGET_FIRST_LOAD_KB || '350');
const root = process.cwd();

const response = await fetch(base + '/', { headers: { 'user-agent': 'web5-bundle-budget' } });
if (!response.ok) {
  console.error(`[budget] failed to fetch ${base}/: HTTP ${response.status}`);
  process.exit(1);
}
const html = await response.text();

const assets = new Set();
for (const match of html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+\.(?:js|css))"/g)) {
  assets.add(match[1].replace(/^\//, ''));
}

if (assets.size === 0) {
  console.error('[budget] no static assets found in HTML; cannot evaluate first-load budget');
  process.exit(1);
}

const rows = [];
let totalGzip = 0;

for (const asset of assets) {
  const file = join(root, '.next', asset.replace(/^_next\//, ''));
  const content = await readFile(file);
  const gzip = gzipSync(content).length;
  totalGzip += gzip;
  rows.push({ asset, rawKb: content.length / 1024, gzipKb: gzip / 1024 });
}

rows.sort((a, b) => b.gzipKb - a.gzipKb);
for (const row of rows) {
  console.log(
    `${row.gzipKb.toFixed(1).padStart(8)} KB gzip  ${row.rawKb.toFixed(1).padStart(9)} KB raw  ${row.asset}`
  );
}

const totalKb = totalGzip / 1024;
console.log(`\n[budget] first-load static: ${totalKb.toFixed(1)} KB gzip (budget ${budgetKb} KB)`);

if (totalKb > budgetKb) {
  console.error('[budget] FAILED: first-load static assets exceed budget');
  process.exit(1);
}
console.log('[budget] PASS');
