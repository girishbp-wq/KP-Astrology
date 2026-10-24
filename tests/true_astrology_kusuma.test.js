// Kusuma — 22 Feb 1975, 16:30:00 IST, Nanjangud (12°7'4" N, 76°41'2" E) — against True Astrology Pro 5.8.7.1.
// The expected values are read from that program's KP chart (Planetary Position and Cuspal Position-Placidus tables).
// Run: node --test tests/
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// The engine lives inside index.html as UMD <script> blocks; load the ones that have no DOM dependency.
function loadEngine() {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  const ctx = vm.createContext({ console, Date, Math });
  blocks.forEach((b, i) => {
    if (i === 0 || /^\/\* KP (Astrology - browser|geo parsing)/.test(b)) vm.runInContext(b, ctx, { filename: "block" + i });
  });
  return ctx;
}
const { KP, KBTR, Astronomy } = loadEngine();

const SITE = { lat: 12 + 7 / 60 + 4 / 3600, lon: 76 + 41 / 60 + 2 / 3600, tz: 5.5 };
const BIRTH = { year: 1975, month: 2, day: 22, hour: 16, minute: 30, second: 0, place: "Nanjangud", ...SITE };

const SIGN = { Ari: "Aries", Tau: "Taurus", Gem: "Gemini", Can: "Cancer", Leo: "Leo", Vir: "Virgo", Lib: "Libra",
  Sco: "Scorpio", Sag: "Sagittarius", Cap: "Capricorn", Aqu: "Aquarius", Pis: "Pisces" };
const LORD = { Su: "Sun", Mo: "Moon", Ma: "Mars", Me: "Mercury", Ju: "Jupiter", Ve: "Venus", Sa: "Saturn", Ra: "Rahu", Ke: "Ketu" };
const secs = dms => { const [d, m, s] = dms.split("-").map(Number); return d * 3600 + m * 60 + s; };

// planet: [sign, D-M-S, rasi lord, star lord, sub lord, sub-sub lord, house, tolerance in arc-seconds]
// The tolerance is 2" (True Astrology prints whole seconds) except where astronomy-engine, the planetary theory the
// page embeds, is itself off the Swiss/VSOP87 positions on this date: Moon ~3", Jupiter ~4", Saturn ~11".
const PLANETS = {
  Sun:     ["Aqu", "09-46-25", "Sa", "Ra", "Ju", "Ve", 8, 2],
  Moon:    ["Gem", "19-21-48", "Me", "Ra", "Ma", "Ra", 12, 4],
  Mars:    ["Sag", "29-59-51", "Ju", "Su", "Ra", "Sa", 6, 2],
  Mercury: ["Cap", "16-41-13", "Sa", "Mo", "Sa", "Ve", 7, 2],
  Jupiter: ["Pis", "00-46-17", "Ju", "Ju", "Ma", "Ju", 8, 5],
  Venus:   ["Pis", "05-23-53", "Ju", "Sa", "Sa", "Ju", 8, 2],
  Saturn:  ["Gem", "18-53-02", "Me", "Ra", "Mo", "Me", 12, 12],
  Rahu:    ["Sco", "12-23-39", "Ma", "Sa", "Ma", "Sa", 4, 2],
  Ketu:    ["Tau", "12-23-39", "Ve", "Mo", "Ra", "Ju", 10, 2],
};
// cusp: [sign, D-M-S, rasi lord, star lord, sub lord, sub-sub lord]
const CUSPS = [
  ["Can", "11-50-20", "Mo", "Sa", "Mo", "Ke"], ["Leo", "09-32-48", "Su", "Ke", "Sa", "Sa"],
  ["Vir", "10-11-27", "Me", "Mo", "Mo", "Ra"], ["Lib", "12-18-03", "Ve", "Ra", "Sa", "Ju"],
  ["Sco", "13-26-06", "Ma", "Sa", "Ra", "Ju"], ["Sag", "12-56-25", "Ju", "Ke", "Me", "Ju"],
  ["Cap", "11-50-20", "Sa", "Mo", "Ma", "Mo"], ["Aqu", "09-32-48", "Sa", "Ra", "Ju", "Ve"],
  ["Pis", "10-11-27", "Ju", "Sa", "Ve", "Me"], ["Ari", "12-18-03", "Ma", "Ke", "Me", "Mo"],
  ["Tau", "13-26-06", "Ve", "Mo", "Ra", "Ve"], ["Gem", "12-56-25", "Me", "Ra", "Me", "Ve"],
];
const CUSP_TOLERANCE = 2;   // arc-seconds

const chart = KP.buildChart(BIRTH);
const sidereal = (sign, dms) => (Object.keys(SIGN).indexOf(sign) * 30) * 3600 + secs(dms);
const off = (got, wantSecs) => ((((got * 3600 - wantSecs) % 1296000) + 1944000) % 1296000) - 648000;   // signed arc-seconds

for (const [name, [sign, dms, rl, stl, sl, ssl, house, tol]] of Object.entries(PLANETS)) {
  test(`${name}: sign, lords, house and longitude as True Astrology Pro`, () => {
    const p = chart.planets[name];
    assert.deepEqual([p.sign, p.sign_lord, p.star_lord, p.sub_lord, p.sub_sub_lord, p.house],
      [SIGN[sign], LORD[rl], LORD[stl], LORD[sl], LORD[ssl], house]);
    assert.ok(Math.abs(off(p.longitude, sidereal(sign, dms))) <= tol,
      `${name} is ${off(p.longitude, sidereal(sign, dms)).toFixed(1)}" from True Astrology Pro (allowed ${tol}")`);
  });
}

CUSPS.forEach(([sign, dms, rl, stl, sl, ssl], i) => {
  test(`Cusp ${i + 1}: sign, lords and longitude as True Astrology Pro`, () => {
    const c = chart.cusps[i];
    assert.deepEqual([c.sign, c.sign_lord, c.star_lord, c.sub_lord, c.sub_sub_lord],
      [SIGN[sign], LORD[rl], LORD[stl], LORD[sl], LORD[ssl]]);
    assert.ok(Math.abs(off(c.longitude, sidereal(sign, dms))) <= CUSP_TOLERANCE,
      `cusp ${i + 1} is ${off(c.longitude, sidereal(sign, dms)).toFixed(1)}" from True Astrology Pro (allowed ${CUSP_TOLERANCE}")`);
  });
});

test("BTR's fast Lagna chain is the natal chart's Lagna", () => {
  const ch = KBTR.ascendantChain({ y: 1975, mo: 2, d: 22, h: 16, mi: 30, s: 0, ...SITE });
  const c = chart.cusps[0];
  assert.deepEqual([ch.sign, ch.sign_lord, ch.star_lord, ch.sub_lord, ch.sub_sub_lord],
    [c.sign, c.sign_lord, c.star_lord, c.sub_lord, c.sub_sub_lord]);
  // the lords can agree by luck (a sub-sub span is only minutes wide); the longitude cannot
  assert.ok(Math.abs(off(ch.longitude, c.longitude * 3600)) < 0.5,
    `BTR's Lagna is ${off(ch.longitude, c.longitude * 3600).toFixed(1)}" from the natal chart's`);
});

test("the Moon that BTR and Timing step through is the natal chart's Moon", () => {
  const time = Astronomy.MakeTime(new Date(Date.UTC(1975, 1, 22, 16, 30, 0) - SITE.tz * 3600000));
  assert.ok(Math.abs(off(KP.moonSidereal(time, chart.jd), chart.planets.Moon.longitude * 3600)) < 0.01);
});
