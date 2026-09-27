#!/usr/bin/env node
/**
 * GitHub stats cards in the developer.living style, rendered as SVG and
 * committed to assets/stats/ by .github/workflows/stats.yml every day.
 *
 * The public github-readme-stats instances are rate-limited or down more
 * often than not, so the profile draws its own:
 *   assets/stats/overview.svg — the numbers
 *   assets/stats/activity.svg — contributions per week over the last year
 *
 * Local run: GITHUB_TOKEN=$(gh auth token) node scripts/stats.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const LOGIN = process.env.GITHUB_LOGIN ?? "nahkar";
/** The first year of the résumé — "building web products since 2013". */
const SINCE = 2013;
const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) throw new Error("GITHUB_TOKEN is required");

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "stats");

const C = {
  void: "#05010f",
  voidSoft: "#140a2b",
  neon: "#b377ff",
  lilac: "#ceb7ff",
  violet: "#9361ff",
};

async function gql(query, variables) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

const { user } = await gql(
  `query($login: String!) {
    user(login: $login) {
      followers { totalCount }
      pullRequests { totalCount }
      repositories(first: 100, ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC) {
        totalCount
        nodes { stargazerCount }
      }
      contributionsCollection {
        totalCommitContributions
        restrictedContributionsCount
        contributionCalendar {
          totalContributions
          weeks { contributionDays { contributionCount date } }
        }
      }
    }
  }`,
  { login: LOGIN },
);

const repos = user.repositories.nodes;
const stars = repos.reduce((sum, r) => sum + r.stargazerCount, 0);
const cal = user.contributionsCollection.contributionCalendar;

/** Bebas Neue (OFL) embedded, because an SVG shown through <img> cannot
 *  load web fonts. */
async function bebas() {
  const css = await (
    await fetch("https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap", {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/120 Safari/537.36" },
    })
  ).text();
  // The last block is the basic "latin" subset; the first is latin-ext.
  const url = [...css.matchAll(/url\((https:[^)]+\.woff2)\)/g)].at(-1)?.[1];
  if (!url) return "";
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  return `@font-face{font-family:"Bebas Neue";src:url(data:font/woff2;base64,${buf.toString("base64")}) format("woff2")}`;
}
const fontFace = await bebas();

const defs = `
<defs>
  <style>${fontFace}
    .h{font-family:"Bebas Neue",Impact,"Arial Narrow",sans-serif;letter-spacing:.06em;text-transform:uppercase}
    .b{font-family:"Montserrat","Segoe UI",Helvetica,Arial,sans-serif}
  </style>
  <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${C.voidSoft}"/><stop offset="1" stop-color="${C.void}"/>
  </linearGradient>
  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="bloom" x="-5%" y="-30%" width="110%" height="160%"><feGaussianBlur stdDeviation="2"/></filter>
</defs>`;

/** The site's InfoPanel: dark fill, lilac hairline, soft neon halo. */
const panel = (w, h) => `
<rect x="6" y="6" width="${w - 12}" height="${h - 12}" rx="18" fill="url(#panel)"/>
<rect x="6" y="6" width="${w - 12}" height="${h - 12}" rx="18" fill="none" stroke="${C.neon}" stroke-opacity=".55" stroke-width="3" filter="url(#bloom)"/>
<rect x="6.5" y="6.5" width="${w - 13}" height="${h - 13}" rx="18" fill="none" stroke="${C.lilac}" stroke-opacity=".8"/>`;

const title = (x, y, text) =>
  `<text x="${x}" y="${y}" class="h" font-size="26" fill="#fff" filter="url(#glow)">${text}</text>`;

const fmt = (n) => n.toLocaleString("en-US");

function overview() {
  const W = 840;
  const H = 250;
  const numbers = [
    ["contributions / year", cal.totalContributions],
    ["commits / year", user.contributionsCollection.totalCommitContributions],
    ["pull requests", user.pullRequests.totalCount],
    ["public repos", user.repositories.totalCount],
    ["stars earned", stars],
    ["years shipping", new Date().getUTCFullYear() - SINCE],
  ];
  const cells = numbers
    .map(([label, value], i) => {
      const x = 40 + (i % 3) * 270;
      const y = 120 + Math.floor(i / 3) * 80;
      return `<text x="${x}" y="${y}" class="h" font-size="46" fill="${C.lilac}" filter="url(#glow)">${fmt(value)}</text>
<text x="${x}" y="${y + 24}" class="h" font-size="17" fill="#fff" fill-opacity=".7">${label}</text>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="GitHub stats for ${LOGIN}">
${defs}${panel(W, H)}
${title(40, 58, "mission stats")}
${cells}
</svg>`;
}

function activity() {
  const W = 840;
  const H = 250;
  const weeks = cal.weeks.map((w) => ({
    count: w.contributionDays.reduce((s, d) => s + d.contributionCount, 0),
    date: w.contributionDays[0].date,
  }));
  const max = Math.max(1, ...weeks.map((w) => w.count));
  const left = 48;
  const right = W - 40;
  const top = 78;
  const bottom = H - 48;
  const step = (right - left) / Math.max(1, weeks.length - 1);
  const pts = weeks.map((w, i) => [left + i * step, bottom - (w.count / max) * (bottom - top)]);

  // Catmull-Rom → cubic Bézier, so the line reads as a glow trail
  // rather than a zigzag.
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [p0, p1, p2, p3] = [pts[i - 1] ?? pts[i], pts[i], pts[i + 1], pts[i + 2] ?? pts[i + 1]];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, Math.min(bottom, p1[1] + (p2[1] - p0[1]) / 6)];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, Math.min(bottom, p2[1] - (p3[1] - p1[1]) / 6)];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  const area = `${d} L${right},${bottom} L${left},${bottom} Z`;

  const months = [];
  let last = "";
  weeks.forEach((w, i) => {
    const m = new Date(w.date).toLocaleString("en-US", { month: "short", timeZone: "UTC" });
    if (m !== last && i > 0) months.push(`<text x="${left + i * step}" y="${bottom + 26}" class="h" font-size="15" fill="#fff" fill-opacity=".55" text-anchor="middle">${m}</text>`);
    last = m;
  });
  const grid = [0.25, 0.5, 0.75, 1]
    .map((f) => `<line x1="${left}" x2="${right}" y1="${bottom - f * (bottom - top)}" y2="${bottom - f * (bottom - top)}" stroke="${C.lilac}" stroke-opacity=".08"/>`)
    .join("");
  const peak = weeks.reduce((a, b) => (b.count > a.count ? b : a));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Contributions per week, last year">
${defs}
<linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="${C.neon}" stop-opacity=".45"/><stop offset="1" stop-color="${C.neon}" stop-opacity="0"/>
</linearGradient>
${panel(W, H)}
${title(40, 52, "contributions per week")}
<text x="${W - 40}" y="52" class="h" font-size="18" fill="${C.lilac}" text-anchor="end">${fmt(cal.totalContributions)} in the last year · peak ${peak.count} a week</text>
${grid}
<path d="${area}" fill="url(#fill)"/>
<path d="${d}" fill="none" stroke="${C.neon}" stroke-width="6" stroke-opacity=".35" filter="url(#bloom)"/>
<path d="${d}" fill="none" stroke="${C.lilac}" stroke-width="2.2" stroke-linecap="round"/>
${months.join("")}
</svg>`;
}

mkdirSync(out, { recursive: true });
writeFileSync(join(out, "overview.svg"), overview());
writeFileSync(join(out, "activity.svg"), activity());
console.log(`✓ stats for ${LOGIN}: ${cal.totalContributions} contributions, ${stars} stars`);
