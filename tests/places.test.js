// Places and timezones: the timezone offset for a place on a given date, the online place search, and saved places.
// Run: node --test tests/*.test.js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// The module lives inside index.html as a UMD <script> block with no dependencies.
function loadPlaces() {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  const ctx = vm.createContext({ console, Date, Math, Intl, JSON, Promise, encodeURIComponent, setTimeout, clearTimeout, AbortController });
  blocks.filter(b => /^\/\* KP places/.test(b)).forEach(b => vm.runInContext(b, ctx, { filename: "places" }));
  return ctx.KPLACES;
}
const P = loadPlaces();
const local = (y, mo, d, h = 12, mi = 0, s = 0) => ({ y, mo, d, h, mi, s });
// The module runs in its own vm realm, so its arrays and objects have another prototype: compare plain copies.
const plain = x => JSON.parse(JSON.stringify(x));

// ---- timezone offset for a place on a date (the browser's own timezone database) ----
test("India in 1975 is +5:30", () => assert.equal(P.tzOffsetHours("Asia/Kolkata", local(1975, 2, 22, 16, 30)), 5.5));
test("India in the wartime summer of 1944 is +6:30, not +5:30", () =>
  assert.equal(P.tzOffsetHours("Asia/Kolkata", local(1944, 6, 1)), 6.5));
test("London is +1 in July and 0 in January", () => {
  assert.equal(P.tzOffsetHours("Europe/London", local(1990, 7, 1)), 1);
  assert.equal(P.tzOffsetHours("Europe/London", local(1990, 1, 1)), 0);
});
test("New York is -4 in July and -5 in January", () => {
  assert.equal(P.tzOffsetHours("America/New_York", local(1990, 7, 1)), -4);
  assert.equal(P.tzOffsetHours("America/New_York", local(1990, 1, 1)), -5);
});
test("Sydney is +11 in January (southern summer)", () =>
  assert.equal(P.tzOffsetHours("Australia/Sydney", local(1990, 1, 1)), 11));
test("on the day the clocks go forward, the wall time decides (London 25 Mar 1990)", () => {
  assert.equal(P.tzOffsetHours("Europe/London", local(1990, 3, 25, 0, 30)), 0);
  assert.equal(P.tzOffsetHours("Europe/London", local(1990, 3, 25, 3, 0)), 1);
});
test("on the day the clocks go back, the wall time decides (New York 28 Oct 1990)", () => {
  assert.equal(P.tzOffsetHours("America/New_York", local(1990, 10, 28, 0, 30)), -4);
  assert.equal(P.tzOffsetHours("America/New_York", local(1990, 10, 28, 12, 0)), -5);
});
test("east of Greenwich, a wall time just before the clocks go back is still summer time (Sydney 2 Apr 2023)", () => {
  assert.equal(P.tzOffsetHours("Australia/Sydney", local(2023, 4, 2, 1, 0)), 11);   // 01:00, before the 03:00 change
  assert.equal(P.tzOffsetHours("Australia/Sydney", local(2023, 4, 2, 12, 0)), 10);
});
test("an unknown timezone id gives null rather than throwing", () =>
  assert.equal(P.tzOffsetHours("Not/AZone", local(1990, 1, 1)), null));

test("offsets print as UTC offsets", () => {
  assert.deepEqual([5.5, -4, 5.75, 0, 6.5].map(P.formatOffset), ["+5:30", "-4:00", "+5:45", "+0:00", "+6:30"]);
});

test("a place's timezone id wins; its fixed offset is the fallback", () => {
  assert.equal(P.resolveTz({ tzId: "Europe/London", tz: 0 }, local(1990, 7, 1)), 1);
  assert.equal(P.resolveTz({ tz: 5.5 }, local(1990, 7, 1)), 5.5);
  assert.equal(P.resolveTz({ tzId: "Not/AZone", tz: 2 }, local(1990, 7, 1)), 2);
  assert.equal(P.resolveTz({}, local(1990, 7, 1)), null);
});

// ---- the online place search ----
// Shaped like Open-Meteo's documented geocoding response (https://open-meteo.com/en/docs/geocoding-api); not recorded live.
const NANJANGUD = { id: 1, name: "Nanjangud", latitude: 12.1178, longitude: 76.6839, country_code: "IN", country: "India",
  admin1: "Karnataka", admin2: "Mysuru", timezone: "Asia/Kolkata", population: 55000 };

test("a geocoder result becomes a place with a readable label, coordinates and timezone id", () => {
  const [p] = P.parseGeocode({ results: [NANJANGUD] });
  assert.deepEqual([p.label, p.lat, p.lon, p.tzId], ["Nanjangud, Mysuru, Karnataka, IN", 12.1178, 76.6839, "Asia/Kolkata"]);
});
test("a result without usable coordinates is dropped, and a reply without results is an empty list", () => {
  assert.equal(P.parseGeocode({ results: [{ name: "Nowhere" }, { name: "Bad", latitude: "x", longitude: 1 }] }).length, 0);
  assert.deepEqual(plain(P.parseGeocode({ generationtime_ms: 0.4 })), []);
  assert.deepEqual(plain(P.parseGeocode(null)), []);
});
test("a repeated region name is not printed twice in a label", () => {
  const [p] = P.parseGeocode({ results: [{ ...NANJANGUD, name: "Mumbai", admin1: "Maharashtra", admin2: "Maharashtra" }] });
  assert.equal(p.label, "Mumbai, Maharashtra, IN");
});
test("two results with the same label are told apart by their coordinates", () => {
  const twin = { ...NANJANGUD, latitude: 20.5, longitude: 78.1 };
  const labels = P.parseGeocode({ results: [NANJANGUD, twin] }).map(p => p.label);
  assert.equal(new Set(labels).size, 2);
  assert.ok(labels[1].includes("20.50"), labels[1]);
});

const replyWith = body => async url => ({ ok: true, status: 200, json: async () => body, url });
test("the search asks for the place name only, even if the user typed 'town, state'", async () => {
  let asked;
  const r = await P.searchPlaces("Nanjangud, Karnataka", { fetch: async url => { asked = url; return replyWith({ results: [NANJANGUD] })(url); } });
  assert.ok(asked.includes("name=Nanjangud&"), asked);
  assert.ok(!asked.includes("Karnataka"), asked);
  assert.equal(r.ok, true);
  assert.equal(r.places[0].lat, 12.1178);
});
test("the place name is URL-encoded", async () => {
  let asked;
  await P.searchPlaces("Nanjangūḍ", { fetch: async url => { asked = url; return replyWith({})(url); } });
  assert.ok(asked.includes(encodeURIComponent("Nanjangūḍ")), asked);
});
test("a query that is too short makes no request", async () => {
  let calls = 0;
  const r = await P.searchPlaces("N", { fetch: async () => { calls++; return replyWith({})(); } });
  assert.deepEqual([calls, r.ok, r.places.length], [0, true, 0]);
});
test("a network failure or an HTTP error is reported, not thrown", async () => {
  const down = await P.searchPlaces("Nanjangud", { fetch: async () => { throw new TypeError("Failed to fetch"); } });
  assert.deepEqual([down.ok, down.places.length], [false, 0]);
  assert.match(down.error, /Failed to fetch/);
  const busy = await P.searchPlaces("Nanjangud", { fetch: async () => ({ ok: false, status: 429, json: async () => ({}) }) });
  assert.deepEqual([busy.ok, busy.places.length], [false, 0]);
  assert.match(busy.error, /429/);
});

test("a search that never answers is given up on, not left hanging", async () => {
  const hangs = (url, init) => new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(new Error("aborted"))));
  const r = await P.searchPlaces("Nanjangud", { fetch: hangs, timeoutMs: 20 });
  assert.deepEqual([r.ok, r.places.length], [false, 0]);
  assert.match(r.error, /timed out/);
});

// ---- saved places ----
const memory = () => { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, raw: m }; };
const KUSUMA_PLACE = { lat: 12 + 7 / 60 + 4 / 3600, lon: 76 + 41 / 60 + 2 / 3600, tzId: "Asia/Kolkata", tz: 5.5 };

test("a saved place comes back, and is still there for a new store on the same storage", () => {
  const st = memory(); const a = P.createStore(st);
  assert.equal(a.save("Nanjangud, Karnataka, IN", KUSUMA_PLACE), true);
  assert.deepEqual(P.createStore(st).list()["Nanjangud, Karnataka, IN"], KUSUMA_PLACE);
});
test("saving the same label again replaces it, and remove forgets it", () => {
  const s = P.createStore(memory());
  s.save("Home", KUSUMA_PLACE); s.save("Home", { ...KUSUMA_PLACE, lat: 13 });
  assert.equal(Object.keys(s.list()).length, 1);
  assert.equal(s.list().Home.lat, 13);
  s.remove("Home");
  assert.deepEqual(plain(s.list()), {});
});
test("a place with no label or no usable coordinates is refused", () => {
  const s = P.createStore(memory());
  assert.deepEqual([s.save("", KUSUMA_PLACE), s.save("X", { lat: "a", lon: 1 }), s.save("Y", { lat: 91, lon: 0 })], [false, false, false]);
  assert.deepEqual(plain(s.list()), {});
});
test("corrupt stored data, or storage that throws, leaves the app working", () => {
  const bad = memory(); bad.setItem("kp_places_v1", "{not json");
  assert.deepEqual(plain(P.createStore(bad).list()), {});
  const locked = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); } };
  const s = P.createStore(locked);
  assert.equal(s.save("Home", KUSUMA_PLACE), true);
  assert.equal(s.list().Home.lat, KUSUMA_PLACE.lat);
  assert.deepEqual(plain(P.createStore(null).list()), {});
});

test("the user's own saved place overrides a built-in one with the same label", () => {
  const merged = P.mergePlaces({ "Pune, IN": { lat: 18.5, lon: 73.8, tz: 5.5 }, "Delhi, IN": { lat: 28.6, lon: 77.2, tz: 5.5 } },
    { "Pune, IN": { lat: 18.6, lon: 73.9, tz: 5.5 } });
  assert.deepEqual([merged["Pune, IN"].lat, merged["Delhi, IN"].lat], [18.6, 28.6]);
});
