#!/usr/bin/env node
/**
 * Renders the README banners in the developer.living style: the site's
 * scene backgrounds, its astronauts and planet, and the hollow neon
 * Death Star titles with hairline bars.
 *
 * Needs Google Chrome (headless) and ImageMagick:
 *   node banners/render.mjs            # every banner
 *   node banners/render.mjs hero       # just one
 *
 * Output: assets/banners/<id>.jpg
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const out = join(root, "assets", "banners");
const tmp = join(here, ".tmp");

const CHROME =
  process.env.CHROME ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SCALE = 1.5;

const art = (name) => `file://${join(here, "art", name)}`;

const baseCss = `
@import url("https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:wght@400;500;600&display=block");
@font-face { font-family: "Death Star"; src: url("file://${join(here, "fonts", "death-star.woff2")}") format("woff2"); }
:root { --void:#05010f; --void-soft:#140a2b; --neon:#b377ff; --lilac:#ceb7ff; --violet:#9361ff; }
* { box-sizing: border-box; margin: 0; }
html, body { width: var(--w); height: var(--h); overflow: hidden; background: var(--void); }
body { position: relative; font-family: Montserrat, sans-serif; color: #fff; }
.bg { position: absolute; inset: 0; background-size: cover; background-position: var(--pos, center); }
.shade { position: absolute; inset: 0; }
.neon {
  font-family: "Death Star", sans-serif; text-transform: uppercase; letter-spacing: .07em;
  color: transparent; -webkit-text-stroke: 1.4px var(--lilac); line-height: 1.05; white-space: nowrap;
  text-shadow: 0 0 5px var(--neon), 0 0 13px color-mix(in oklab, var(--neon) 50%, transparent), 0 0 30px color-mix(in oklab, var(--neon) 35%, transparent);
}
.bar { display: block; height: 15px; border: 1px solid var(--lilac);
  box-shadow: 0 0 4px var(--lilac), 0 0 12px color-mix(in oklab, var(--neon) 55%, transparent),
    inset 0 0 4px color-mix(in oklab, var(--lilac) 60%, transparent); }
.tag { font-family: "Death Star", sans-serif; text-transform: uppercase; letter-spacing: .2em; color: var(--lilac); }
.sub { font-family: "Bebas Neue", sans-serif; letter-spacing: .05em; text-transform: uppercase; color: #fff;
  text-shadow: 0 0 4px var(--neon), 0 0 12px color-mix(in oklab, var(--neon) 70%, transparent); }
.chips { font-family: "Bebas Neue", sans-serif; letter-spacing: .12em; color: var(--lilac); }
.astro { position: absolute; filter: drop-shadow(0 0 18px color-mix(in oklab, var(--neon) 45%, transparent)); }
.stars i { position: absolute; width: 2px; height: 2px; border-radius: 50%; background: #fff; }
`;

/** Deterministic star field so re-renders don't reshuffle the sky. */
function stars(n, w, h, seed = 7) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  let html = "";
  for (let i = 0; i < n; i++) {
    const size = rnd() < 0.15 ? 3 : 1.5;
    html += `<i style="left:${(rnd() * w).toFixed(0)}px;top:${(rnd() * h).toFixed(0)}px;width:${size}px;height:${size}px;opacity:${(0.25 + rnd() * 0.7).toFixed(2)}"></i>`;
  }
  return `<div class="stars">${html}</div>`;
}

/** A section title strip: scene backdrop, bars, hollow neon title. */
function section({ title, bg, pos, astro, astroSide = "right", sub }) {
  const w = 1280;
  const h = 240;
  const astroCss =
    astroSide === "right" ? "right:120px" : "left:120px";
  return {
    w,
    h,
    html: `
<div class="bg" style="background-image:url(${art(bg)});--pos:${pos}"></div>
<div class="shade" style="background:
  radial-gradient(ellipse 55% 75% at 50% 50%, rgba(5,1,15,.62), rgba(5,1,15,.2) 70%, transparent),
  linear-gradient(180deg, rgba(5,1,15,.55), rgba(5,1,15,.15) 45%, rgba(5,1,15,.7))"></div>
${stars(40, w, h, title.length * 31)}
<img class="astro" src="${art(astro)}" style="${astroCss};top:34px;height:172px">
<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px">
  <span class="bar" style="width:340px"></span>
  <div class="neon" style="font-size:58px">${title}</div>
  <span class="bar" style="width:340px"></span>
  ${sub ? `<div class="sub" style="font-size:24px;margin-top:2px">${sub}</div>` : ""}
</div>`,
  };
}

const BANNERS = {
  hero: () => {
    const w = 1280;
    const h = 560;
    return {
      w,
      h,
      html: `
<div class="bg" style="background-image:url(${art("bg-hero.svg")});--pos:center 40%"></div>
<div class="shade" style="background:linear-gradient(180deg, rgba(5,1,15,.5), rgba(5,1,15,.05) 55%, rgba(5,1,15,.35))"></div>
${stars(90, w, h, 11)}
<img src="${art("planet-body.svg")}" style="position:absolute;left:50%;top:388px;width:820px;transform:translateX(-50%);
  filter:drop-shadow(0 0 36px rgba(84,170,255,.55)) drop-shadow(0 0 90px rgba(147,97,255,.35))">
<img class="astro" src="${art("astro-sit.svg")}" style="left:50%;top:268px;height:132px;transform:translateX(-50%)">
<div style="position:absolute;left:0;right:0;top:48px;display:flex;flex-direction:column;align-items:center;gap:14px">
  <div style="display:flex;align-items:center;gap:26px">
    <span class="bar" style="width:230px;height:14px"></span>
    <div class="tag" style="font-size:22px">a message from earth</div>
    <span class="bar" style="width:230px;height:14px"></span>
  </div>
  <div class="neon" style="font-size:56px">hello fellow galaxy member</div>
  <div class="neon" style="font-size:40px;margin-top:6px">i build software</div>
</div>
<div style="position:absolute;left:64px;bottom:62px">
  <div class="sub" style="font-size:40px;line-height:1">Dmytro Bielienov</div>
  <div class="chips" style="font-size:22px;margin-top:6px">Senior Full-Stack Engineer</div>
  <div class="chips" style="font-size:22px;margin-top:2px">Ukraine · since 2013</div>
</div>
<div style="position:absolute;right:64px;bottom:62px;text-align:right">
  <div class="chips" style="font-size:22px">React · Next.js · TypeScript</div>
  <div class="chips" style="font-size:22px;margin-top:4px">Node.js · NestJS · React Native</div>
  <div class="sub" style="font-size:26px;margin-top:8px;letter-spacing:.14em">developer.living</div>
</div>`,
    };
  },
  projects: () =>
    section({ title: "my projects", bg: "bg-projects.svg", pos: "center 45%", astro: "astro-coin.svg" }),
  "open-source": () =>
    section({ title: "open source", bg: "bg-projects.svg", pos: "center 80%", astro: "astro-wave.svg", astroSide: "left" }),
  skills: () =>
    section({ title: "my skills", bg: "bg-skills.svg", pos: "center 55%", astro: "astro-wave.svg" }),
  experience: () =>
    section({ title: "my work experience", bg: "bg-experience.svg", pos: "center 60%", astro: "astro-dab.svg", astroSide: "left" }),
  learning: () =>
    section({ title: "self taught", bg: "bg-experience.svg", pos: "center 20%", astro: "astro-sit.svg" }),
  writing: () =>
    section({ title: "my writing", bg: "bg-contact.svg", pos: "center 30%", astro: "astro-sit.svg", astroSide: "left", sub: "Notes on building software" }),
  stats: () =>
    section({ title: "flight log", bg: "bg-hero.svg", pos: "center 20%", astro: "astro-coin.svg", sub: "GitHub activity, updated daily" }),
  /** The site's portrait badge: the photo in a lilac ring with a neon halo. */
  avatar: () => ({
    w: 320,
    h: 320,
    png: true,
    html: `
<style>html,body{background:transparent}</style>
<div style="position:absolute;inset:30px;border-radius:50%;border:3px solid var(--lilac);
  background:url(${art("avatar.webp")}) center/cover;
  box-shadow:0 0 6px var(--lilac),0 0 22px var(--neon),0 0 44px color-mix(in oklab,var(--violet) 60%,transparent)"></div>`,
  }),
  contact: () => {
    const w = 1280;
    const h = 360;
    return {
      w,
      h,
      html: `
<div class="bg" style="background-image:url(${art("bg-contact.svg")});--pos:center 45%"></div>
<div class="shade" style="background:radial-gradient(ellipse 60% 80% at 50% 50%, rgba(5,1,15,.6), rgba(5,1,15,.15) 75%)"></div>
${stars(60, w, h, 5)}
<img class="astro" src="${art("astro-dab.svg")}" style="right:150px;top:70px;height:220px">
<img class="astro" src="${art("astro-wave.svg")}" style="left:150px;top:80px;height:200px">
<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px">
  <span class="bar" style="width:340px"></span>
  <div class="neon" style="font-size:60px">contact me</div>
  <span class="bar" style="width:340px"></span>
  <div class="sub" style="font-size:28px;margin-top:6px">Say hello — the form lives on</div>
  <div class="chips" style="font-size:24px;letter-spacing:.16em">developer.living</div>
</div>`,
    };
  },
};

const pick = process.argv.slice(2);
const ids = pick.length ? pick : Object.keys(BANNERS);
mkdirSync(out, { recursive: true });
mkdirSync(tmp, { recursive: true });

for (const id of ids) {
  const { w, h, html, png: transparent } = BANNERS[id]();
  const file = join(tmp, `${id}.html`);
  writeFileSync(
    file,
    `<!doctype html><html style="--w:${w}px;--h:${h}px"><head><meta charset="utf-8"><style>${baseCss}</style></head><body>${html}</body></html>`,
  );
  const png = join(tmp, `${id}.png`);
  execFileSync(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--allow-file-access-from-files",
    `--force-device-scale-factor=${SCALE}`,
    `--window-size=${w},${h}`,
    "--virtual-time-budget=4000",
    ...(transparent ? ["--default-background-color=00000000"] : []),
    `--screenshot=${png}`,
    `file://${file}`,
  ], { stdio: "ignore" });
  execFileSync("magick", [png, "-strip", "-quality", "90", join(out, `${id}.${transparent ? "png" : "jpg"}`)]);
  console.log(`✓ ${id}`);
}

rmSync(tmp, { recursive: true, force: true });
