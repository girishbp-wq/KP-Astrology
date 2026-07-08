# KP-Astrology
KP Astrology Tool 
# KP Astrology Tool — Krishnamurti Paddhati

A working KP astrology engine built from the KSK / Rajiv Nath lessons supplied in
the knowledge base. It computes complete KP charts and applies the documented
prediction rules. Two front-ends share one set of logic:

- **`KP_Astrology.html`** — a single, self-contained web app. Double-click to open
  in any browser; no install, works offline. All astronomy and KP logic are
  embedded.
- **`kp_engine/` + `kp_cli.py`** — a Python package and command-line tool, backed
  by Swiss Ephemeris, with a validation test suite.

The Python engine (Swiss Ephemeris) and the browser engine (astronomy-engine)
were cross-checked: for a full sample chart they produce **identical** signs,
houses, star-lords, sub-lords and all twelve cuspal sub-lords; longitudes agree
to ~10 arc-seconds.

## Chart diagrams

The **Diagram** tab renders the rasi chart in both traditional styles as crisp
SVG: **South Indian** (fixed-sign 4x4 square with the Ascendant marked "La") and
**North Indian** (diamond, house 1 = Lagna at top-centre, each house showing its
sign number). Planets are placed by sign; retrograde planets are marked `*`.
Works for natal and horary charts alike.

## What it computes

- Planetary positions in the KP-New (Krishnamurti) ayanamsa, with retrograde flags.
- Nakshatra / **star-lord / sub-lord / sub-sub-lord** for every planet and cusp
  (the 249-sub *Sub Lord Theory*).
- Placidus house cusps and the **Cuspal Sub Lord (CSL)** for each house.
- The 4-level **Table of Significators** (A = star of occupant, B = occupant,
  C = star of owner, D = owner) and the strongest-significator fallback rule.
- **Vimshottari Dasha** — Mahadasha / Antardasha / Pratyantar with correct birth
  balance from the Moon.
- **Ruling Planets** (Asc star-lord, Asc rasi-lord, Moon star-lord, Moon
  rasi-lord, day-lord, plus nodes), with the retrograde-star rejection rule.
- **KP Horary (1–249)** — casts a chart from the querent's number with the
  ascendant fixed to that sub, cusps solved for the place of judgement. You pick
  the **question** from a dropdown of 37 questions drawn from the KP chapters —
  grouped as Longevity; Marriage & married life (marriage, engagement, love
  marriage, second marriage, divorce/separation); Progeny (child birth,
  pregnancy, second/third child); Profession & education (new job, change of
  job, transfer, foreign job, promotion, job loss, retirement, business, higher
  education); Health & disease (illness, recovery, hospitalization, surgery,
  accident, deaths of father/mother/spouse); Property & 4th house (purchase,
  sale, vehicle, loan); and other day-to-day questions (foreign travel, passport,
  litigation, lost article, winning in love). The tool maps the question to its
  primary cusp and fructification houses, then answers Yes / Delayed / No from
  the number-chart. Adverse questions are phrased "indicated / not indicated",
  and **Longevity** is judged by the dedicated longevity method (life-giving vs
  maraka/badhak houses) returning short / middle / full-life.
- **Birth Time Rectification (BTR)** — Ruling Planets method (see below).
- **Transit event timing** — pins the date and time of an event from the
  Ruling Planets (see below).
- **Rule-based readings** encoded from the write-ups: Marriage, Progeny,
  Profession, Health & Disease, Longevity, Property, Education, Horary judgement,
  plus 110 documented **house-grouping events** (from the supplied spreadsheet).

## Validation against the documents

`tests/test_validation.py` checks the engine against the concrete examples printed
in the lessons:

| Check | Source in the docs | Result |
|---|---|---|
| Ashwini 9-sub boundaries (0:00→0:46:40 Ketu … 11:26:40→13:20 Mercury) | "THE SUB LORD THEORY" | exact |
| Ketu sub span = 13°20′/120 × 7 = 0°46′40″ | same | exact |
| 249 subs total | same | 249 |
| Rahu at 5° Aries → Ketu star / **Mars** sub | same | matches |
| Cusp at 12° Aries → Ketu star / **Mercury** sub | same | matches |
| Venus MD → Moon AD = 1y 8m; Venus → Sun = 1y | "HOW TO CALCULATE ANTARDASA" | exact |
| Venus / Moon / Moon Pratyantar = 1m 20d | same | exact |
| Significator A→B→C→D fallback | "Golden Rules of KP" | matches |
| Vimshottari years total 120 | Lesson 1 | matches |

**Full worked horoscopes** — the lesson images include complete solved charts,
now used as end-to-end tests against published KP-software output:

- `tests/test_casestudy_patna1956.py` — *DOB 25.8.1956, 11:55, Patna* (the "no
  marriage / no job / no education" case). The engine reproduces **all 9 planets'
  sign + star-lord + sub-lord and all 12 Placidus cusps' sign + star-lord +
  cuspal-sub-lord exactly**, degrees within a few arc-minutes.
- `tests/test_casestudy_btr_1952.py` — the BTR **rectified horoscope** *17.12.1952,
  9:34:03, New Delhi* (True Astrology Pro). The rectified Lagna's rasi/star/sub
  (**Capricorn / Sun / Ketu** — the BTR-critical values) and every planet's sign
  and degree match. A ~5 arc-minute ascendant-degree residual vs that older
  program shifts only the 4th-level sub-sub and is within cross-software tolerance.

Run: `pip install -r requirements.txt && python -m pytest tests/ -v` → 39 passed
(sub-lords, dashas, significators, the Patna and BTR case studies, DMS parsing,
BTR, BTR event-matching, event-timing, horary-by-question).

## Astrologer location & Ruling Planets

Ruling Planets are, per KP, taken for the moment **and place of judgement** —
i.e. where the astrologer sits. A single **Astrologer's location & moment of
judgement** panel is now shown and editable in **every tab** (Natal, Horary,
BTR, Timing), defaulting to **Sunbury-on-Thames, UK** (51:24:24 N / 0:25:02 W,
tz 0 / +1 in BST) and "now". Change it and the ascendant — and therefore the
Ruling Planets — recompute from that place and moment. Every time input accepts
**seconds** (HH:MM:SS).

**Natal birth-time check.** Because the Ruling Planets also verify a given birth
time, the natal **Ruling Planets** tab now shows a *Birth-time check*: it takes
the RPs at the astrologer's place and moment and tests whether the birth chart's
Lagna lords (rasi / star / **sub** / sub-sub) and the Moon's lords appear among
them. A correct time should have the Lagna sub-lord and star-lord among the RPs;
if they don't, the tool flags the time as questionable and points to the BTR tab.

## Learning from feedback (self-improvement)

The **Learn** tab turns the tool into something that improves with use. After you
analyse a chart, a *"Record what actually happened"* panel appears under the
Predictions and Horary answers: pick the event, mark whether it happened (and
when), and save. Everything is stored **in your own browser** (with JSON
export/import so it is portable and backed up — nothing is sent anywhere).

From that feedback the Learn dashboard shows:

- **Accuracy by topic** — how often each event's prediction was right, and an
  overall hit-rate.
- **Calibrated confidence** — future predictions for a topic are annotated with
  your recorded accuracy for it (e.g. "your recorded accuracy: 78% / 9").
- **Learned supporting houses** — from your *happened* vs *did-not* cases the
  tool derives which houses actually predicted each event for you, shown next to
  the documented KP house-group. The documented rules are never overwritten;
  these are transparent, evidence-based refinements that grow with your data.

## Input formats

- **Time** accepts seconds: `HH:MM` or `HH:MM:SS`.
- **Latitude** accepts `D:M:S N/S` (e.g. `51:24:15 N`) or a decimal (`51.4042`).
- **Longitude** accepts `D:M:S E/W` (e.g. `0:25:5 W`) or a decimal (`-0.4181`).
  West and South are negative. The web app fills these automatically from the
  city picker.

## Using the Python CLI

```bash
# Full natal report (DMS coords + seconds)
python kp_cli.py --date 1985-08-20 --time 14:30:25 --tz 5.5 \
                 --lat "19:04:34 N" --lon "72:52:40 E" --place "Mumbai"

# One house-grouping event
python kp_cli.py --date 1985-08-20 --time 14:30 --tz 5.5 \
                 --lat 19.08 --lon 72.88 --event "Child Birth"

# Horary from a number 1..249 (judged now, at the given place)
# pick the question and it maps to the right cusp + houses:
python kp_cli.py horary --number 128 --tz 5.5 --lat "28:36:50 N" \
                 --lon "77:12:32 E" --question "Marriage"
# (or judge a raw cusp: --primary-cusp 7 --event-houses 2,5,7,11)

# Birth Time Rectification (Ruling Planets method)
python kp_cli.py btr --date 1985-08-20 --approx-time 14:30 --tz 5.5 \
                 --lat "19:04:34 N" --lon "72:52:40 E" --scenario minutes \
                 --judge-date 2026-07-07 --judge-time 10:00

# Print the 249-sub table for a sign
python kp_cli.py subs --sign Aries
```

## Birth Time Rectification (BTR)

The BTR module implements the KSK Ruling Planets method from the "WRITE UP ON
BTR" and "BTR TECHNIQUES FOR DIFFERENT CIRCUMSTANCES" write-ups:

1. Ruling Planets are taken for the moment and place of **judgement** (in
   strength order: Asc star-lord, Asc rasi-lord, Moon star-lord, Moon rasi-lord,
   day-lord, plus nodes; RPs sitting in the star of a retrograde planet are
   rejected).
2. The tool scans the plausible time window around the approximate birth time
   and ranks each candidate by how well the **Lagna chain**
   (rasi-lord / star-lord / sub-lord / sub-sub-lord) matches the Ruling Planets,
   weighting the finer levels (sub, sub-sub) more heavily since they change every
   few minutes.
3. Scenario presets set the scan window: off-by-minutes (±15m), ~1 hour (±45m),
   a few hours (±150m), AM/PM confusion (±360m). For **only-date-known**, it also
   lists the Moon's nakshatra spans across the day so you first fix the span whose
   star-lord is a Ruling Planet, then rectify the Lagna within it.

Available in the web app (the **BTR** tab) and via `kp_cli.py btr`. As the KSK
write-up stresses, corroborate the chosen time with real life events; BTR is not
for casually testing the method.

### Rectifying against known life events

The BTR tab also lets you add known events from a dropdown — Marriage, Child
birth, New job, Father's/Mother's death, Hospitalization, Accident, Surgery,
Property/Vehicle purchase, Education milestone, Foreign travel, Retirement and
more — each with its date. Every candidate birth time is then scored not only by
the Ruling-Planet Lagna chain but by how well **that chart's running Dasa
(Maha/Antar/Pratyantar) signifies each event's houses on its actual date**. The
suggested time is the one whose chart best explains your events. Death of a
relative is judged from the maraka houses counted from that person's house (2nd
and 7th from the 9th for the father, from the 4th for the mother, etc.).

From the CLI:

```bash
python kp_cli.py btr --date 1985-08-20 --approx-time 14:30 --tz 5.5 \
   --lat "19:04:34 N" --lon "72:52:40 E" --judge-date 2026-07-07 \
   --judge-time 10:00 \
   --events "Marriage:2012-02-15;Child birth:2014-11-20;New job / employment:2008-07-01"
```

The RP Lagna chain stays primary; the events confirm and refine it, and become
decisive over wider (hour / AM-PM) windows where the Dasa shifts more.

## Transit event timing

Implements "RULES FOR PREDICTING DAY TO DAY EVENTS". Only the Ruling Planets
obtaining at the moment of judgement are used, and the tool tracks two transits:

- **Date of the event** — the Moon's transit. A date qualifies when the Moon is
  simultaneously in a rasi, nakshatra and sub (optionally sub-sub) whose lords
  are all Ruling Planets. (The Moon itself need not be an RP; only its transit is
  tracked.)
- **Time of the event** — the Ascendant's transit. A moment qualifies when the
  Lagna's rasi-lord is a Ruling Planet and the Lagna is passing through a sub and
  sub-sub owned by Ruling Planets. This narrows the time to a few-minute window.

If birth details are supplied, each candidate is additionally gated by the
running **Dasa** (the Maha/Antar/Pratyantar lords must signify the event
houses). Available in the web app (the **Timing** tab) and via
`kp_cli.py timing`:

```bash
python kp_cli.py timing --start 2026-07-10 --end 2026-07-25 --tz 5.5 \
                 --lat "28:36:50 N" --lon "77:12:32 E" --event-houses 2,7,11 \
                 --judge-date 2026-07-07 --judge-time 10:00
# add --birth-date/--birth-time/--birth-lat/--birth-lon for Dasa gating
```

## Project layout

```
KP_Astrology.html          self-contained web app  (the main deliverable)
kp_cli.py                  command-line interface
kp_engine/
  constants.py             Vimshottari, nakshatras, sign lords, karakas
  subs.py                  249-sub Sub Lord Theory + longitude resolver
  ephemeris.py             Swiss Ephemeris wrapper (KP ayanamsa, Placidus)
  chart.py                 full chart assembly (planets, cusps, occupancy)
  significators.py         A/B/C/D Table of Significators
  dasha.py                 Vimshottari MD/AD/PD
  ruling_planets.py        Ruling Planets
  horary.py                KP 1–249 horary chart
  btr.py                   Birth Time Rectification (Ruling Planets method)
  timing.py                transit-based event timing (Moon date + Lagna time)
  geo.py                   DMS coordinate + time parsing
  predictions.py           encoded rule write-ups + 110 event groupings
  report.py                text report
  data/house_groupings.json   extracted from the supplied spreadsheet
tests/test_validation.py   document-example validation suite
tests/test_btr_geo.py      DMS parsing + BTR checks
webapp/                    web-app source parts (kp_web.js, kp_predict.js,
                           kp_btr.js, kp_timing.js, kp_learn.js, kp_charts.js,
                           kp_app.js) + build template
```

## Notes & honest limitations

- Ayanamsa is KP-New (Krishnamurti), as the horary/BTR write-ups instruct. It is
  a configurable single line in `ephemeris.py`.
- Rahu uses the **mean node** (KP convention).
- The browser build uses the MIT-licensed *astronomy-engine* for positions; the
  Python build uses Swiss Ephemeris in Moshier mode (no data files needed). Both
  are accurate to a few arc-seconds — for professional casework you may plug in
  the full Swiss Ephemeris data files.
- The readings reproduce the documented KP logic as decision support. As the
  longevity write-up itself stresses, sensitive judgements need an accurate birth
  time and an astrologer's discretion.
```
