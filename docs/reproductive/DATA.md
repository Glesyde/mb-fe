# Reproductive Health – where the data comes from

This feature has no backend of its own yet. It uses three kinds of data: **synthetic patients**,
**named demo scenarios**, and **real EMR data** already held by the HIS. This page says where each
comes from, where it is kept, and what its limits are.

## 1. Synthetic population (1,000 patients)

| | |
| --- | --- |
| Code | `src/features/reproductive/data/synthetic/generator.ts` |
| Seed | `20261101`, combined with each patient's index (FNV-1a hash → mulberry32). No `Math.random` (tested) |
| Size | 1,000 patients, `SYN-0001` … `SYN-1000` |
| Deterministic | Same seed and generation date → identical patients (tested) |
| Dates | 1–4 reading dates per patient, spread over the 24 months before the generation date |

**Patterns (archetypes)** at the current seed: normal ageing 503, PCOS-like pattern 94,
history-based risk 128 (women); male normal 180, male factor 95 (men). Women about 72 %, men about 28 %.

**Other spread:** ages 20–44; four clinics — A (321), B (305), C (335) and a deliberately small
**Clinic D (39)**, which shows the "Group too small to show" rule (groups under 50 are hidden);
two languages (English about 56 %, Arabic about 44 %); about 15 % of people in a linked couple;
counselling and referral events with completion dates, for the population measures.

**Consent:** everyone gets the simulated "Demo consent". Anyone whose cycle data comes from a
wearable (181 people) has wearables consent on, as if they opted in when connecting the device.
Every 10th patient (100 in total) has withdrawn one data category, rotating through cycles,
metabolic tests, hormones and semen, lifestyle, history and plans, so consent is visible in the
population view without wiping out any one card.

**Resulting "needs attention" shares** (at the generation date): V1 13 % of women, V2 10 % of women,
V3 26 % of everyone, V4 38 % of men, V5 13 %.

> **These proportions are illustrative, not epidemiological.** Value ranges and pattern weights
> were tuned so the population view looks plausible (tests keep V3 between 20 and 30 %, V1 between
> 10 and 20 % and V4 between 20 and 40 %). They are not estimates of prevalence in any real
> population, clinic or country, and must not be quoted as such.

## 2. Named demo scenarios (8)

`data/synthetic/scenarios.ts`. Hand-built, with dates relative to the demo date so they always look
current. All values are invented for the demo.

| ID | Name | How it is built |
| --- | --- | --- |
| DEMO-1 | Main demo: improving metabolic health | Woman, 33. AMH 2.6 ng/mL; HbA1c 5.9 → 5.7 → 5.4 % over 14 months; BMI 27.1 → 25.6; 6 regular cycles; planning a pregnancy; linked to DEMO-2 |
| DEMO-2 | Linked partner: heat exposure at work | Man, 35. Commercial kitchen chef with regular heat exposure; no semen analysis yet; shares profile, hormones/semen and lifestyle with DEMO-1 |
| DEMO-3 | PCOS-like pattern | Woman, 26. AMH 10.8 ng/mL (above the band); cycles 45–60 days; BMI about 31 |
| DEMO-4 | Low AMH, not trying | Woman, 31. AMH 0.6 ng/mL (below the band); regular cycles; not trying (R34, no alarm) |
| DEMO-5 | New cancer diagnosis | Woman, 30. New breast cancer diagnosis before treatment (urgent P4) |
| DEMO-6 | Trying 6 months at 38 | Woman, 38. Trying since 6 months ago; concerned (R06, P5) |
| DEMO-7 | Red-flag symptoms | Woman, 29. An open R35 red flag (the symptom text itself is never stored) |
| DEMO-8 | One result only | Woman, 29. A single AMH result (baseline only) |

A scenario can also be copied onto a real MRN from the empty state in the chart. It is then
labelled "Demo – synthetic data" and is never mixed with that patient's real HIS data.

## 3. Real EMR data (inside the patient chart)

Read from what the chart already loads (`patientData`, `vitalsList`, `historyEncounters`) by
`data/mappers.ts`. Nothing is evaluated until a clinician has confirmed consent in the consent step.

| Data | Where it comes from | Rule |
| --- | --- | --- |
| Sex, age | `demographics.gender`, `date_of_birth` (else `display_age`) | Not recorded → named as a gap |
| BMI, blood pressure | Vitals rows (current encounter and history) | Recorded BMI; otherwise calculated from weight and height **on the same reading only**, labelled "calculated" |
| Labs | `historyEncounters[].labs[].results[]` | Matched by parameter name (AMH, FSH, estradiol, progesterone, TSH, HbA1c, fasting glucose; semen analysis parameters); date = `ordered_at`; non-numbers, unknown units and unfinished labs are skipped and listed |
| A linked partner's labs | The partner's own HIS history, loaded by MRN | Only categories the partner shared; every load is written to both patients' activity log |

Values are **never invented or estimated**. Anything missing is shown as a gap. Blood glucose from
vitals is not used because the vitals form records no unit.

## 4. Where it is kept

- Everything entered in the feature (consent, cycles, results, history, plans, partner links,
  referrals, counselling, red flags) and all demo data live in **this browser's localStorage** under
  one versioned key, `medbookie.repro.demo`. If storage is unavailable, data is kept in memory for
  the session only.
- **Demo data and partner links do not carry across browsers or devices.** Another browser, another
  computer, a private window or clearing site data starts again from scratch. A real backend would
  store all of this centrally; the endpoints it would need are in `API_CONTRACT.md`.
- The 1,000 synthetic patients are **not stored**: they are regenerated on load from the seed, the
  generation date and the dates of any "Advance 6 months" presses. Only scenarios, real records and
  synthetic records that were changed are stored, which keeps storage well under browser limits.
- Symptom free text is **never stored**: it is checked for red flags when entered, then dropped.
- "Reset demo data" regenerates all demo data and brings the demo date back to today. Real records
  are kept.

## 5. Why synthetic data

- There is no backend or database for this feature yet, and no real fertility data could be used.
- Judges and reviewers can try every pathway (including emergencies) without HIS credentials and
  without any patient data leaving the HIS (`/repro-demo` makes no API calls; tested).
- A fixed seed makes every demo, test and report reproducible.

## 6. Limits

- Synthetic values and proportions are illustrative, not epidemiological (see section 1).
- Time patterns are simplified: 1–4 readings, steady drifts, no seasonality or missed visits.
- The AMH reference bands are **placeholders** until the clinical lead replaces them; several
  thresholds are marked ASSUMPTION or "verify" in `RULES.md`.
- No clinical validation has been done; the engine has only been tested against the synthetic
  fixtures in `TEST_REPORT.md`.
- Arabic wording is pending native clinician review (`RULES.md`, "For native review").
- Browser storage is per browser and can be cleared at any time; it is not a medical record.
