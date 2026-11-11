You are working in `mb-fe`, the frontend of Medbookie HIS (Hospital Information System). We are adding a new feature to its EMR for the Future Health Digital Innovation Challenge (Abu Dhabi), track "[Fertility] Reproductive Potential". Submission is due around 20 November 2026.

Work in phases. At the end of each phase, stop, summarise what you changed, run the checks listed, and wait for me to say "continue". Do not start the next phase on your own.

## 1. What the project is (verify this yourself before changing anything)

- React 19 + TypeScript + Vite 6. Routing with react-router-dom v6 (`src/App.tsx`). Icons from `lucide-react`. Charts with `recharts`. PDFs with `jspdf` + `jspdf-autotable` (already installed).
- Tailwind is loaded from the CDN in `index.html` (no tailwind build step). Brand colours: `brand-primary` (#F28C0F), `brand-hover`, `brand-active`, `brand-dark`. Use Tailwind classes and these brand colours; match the look of existing EMR screens.
- All HTTP goes through `src/api/client.ts` (axios, cookie auth, `VITE_API_BASE_URL`). Each domain has a service in `src/services/*.service.ts` (see `emr.service.ts`). The backend is a separate repo that is not here.
- Auth and permissions: `src/context/AuthContext.tsx` (`hasPermission`, `hasAnyPermission`, `user.role`), `ProtectedRoute` in `App.tsx`, and `NAV_PERMISSION_RULES` in `src/services/constants.tsx`.
- EMR module: `EMRLayout.tsx` renders sub-tabs into a header portal (`module-tabs-portal`) for `/emr/worklist`, `/emr/chart`, `/emr/orders`.
- `EMRChart.tsx` is about 11,800 lines. It gets the patient from `location.state.patientMRN` and `location.state.encounterNumber`, keeps `patientData`, `encounterNumber`, `historyEncounters`, `vitalsList`, and has an internal tab list (`activeTab` union type, and a tab array near the bottom of the file: history, notes, diagnosis, vitals, io_chart, …) rendered through `renderTabContent()`'s `switch (activeTab)`.
- `emrService.getComprehensivePatientHistory(mrn)` returns the patient plus past encounters, including lab orders with `order.lab.results` and vitals including BMI.
- `EMRChart22.tsx` and `EMRChart222.tsx` are unused copies. Ignore them.
- `ts_errors.log` lists existing syntax errors in `Header.tsx`, `PatientDemographics.tsx` and `UserManagementModule.tsx`. Check whether they still exist (`npx tsc --noEmit`). Do not fix unrelated files; just tell me what you found so we know which errors are not yours.
- There is no test runner yet.

Before Phase 1, read `App.tsx`, `EMRLayout.tsx`, `emr.service.ts`, `AuthContext.tsx`, `services/constants.tsx`, and the parts of `EMRChart.tsx` that load the patient and render tabs. Confirm the real field names for sex/gender, date of birth/age, MRN, and how lab results and BMI appear in the history payload. Report them to me before writing code.

## 2. What we are building

A "Reproductive Health" feature inside the EMR that gives clinicians an earlier, clearer view of how a patient's reproductive potential is changing over time, and turns it into evidence-based next steps. Hard rules from the challenge:

- **No fertility score.** Never compute or display a single number, percentage, probability or "chance of pregnancy". Show separate trajectories instead.
- **No diagnosis and no prescribing.** The tool is decision support and education. The clinician decides.
- **AMH, AFC and FSH are never used to predict natural conception** (NICE NG257 1.18.3, 1.18.5). AMH/AFC may only be described as informing response to assisted conception (1.18.4).
- **Consent is per data category and revocable.** Withdrawn data leaves every calculation immediately.
- **No insurer or employer access**, ever. No export route, no role, no endpoint for them.
- Men are included: male factor is a first-class trajectory, and partners can be linked.

### 2.1 Trajectory vectors

Five separate vectors. Each has a state: `IMPROVING | STABLE | NEEDS_ATTENTION | NOT_ENOUGH_DATA` (use "In line with age" wording for V1 instead of "stable"). Each result carries: state, inputs used, data-density badge, reasons, rule IDs fired, and citations.

| Vector | Inputs | Needs attention when | Not enough data when |
| --- | --- | --- | --- |
| V1 Reserve in age context | age, AMH, AFC | AMH outside the age reference band | no AMH/AFC in last 24 months |
| V2 Cycle and ovulation | cycle start dates / lengths | cycles <24 or >35 days, or high variation | fewer than 3 cycles |
| V3 Metabolic and lifestyle | BMI, HbA1c or fasting glucose, BP, smoking, alcohol | BMI ≥30, BMI <18.5, HbA1c rising into prediabetes range, smoking | fewer than 2 readings in 12 months |
| V4 Male factor | age, semen analysis, BMI, smoking, heat exposure, occupation | semen below WHO reference values, heat exposure, smoking | no semen analysis |
| V5 History-based risk | cancer treatment, ovarian/pelvic surgery, endometriosis, family history of early menopause | any risk factor present | history not filled in |

Data-density badge: `BASELINE_ONLY` (1 reading, no direction shown), `TREND` (2+ readings ≥6 months apart), `ESTABLISHED` (3+ readings over ≥6 months). Never fill missing data with averages or estimates; name the gap instead ("This card uses cycle records only. No metabolic tests shared.").

**AMH reference bands:** do NOT hardcode a single cut-off (e.g. 0.7 ng/mL). Put age-banded reference ranges in a config file `amhReference.ts` with fields `{ ageMin, ageMax, low, high, unit, assay, source }`. Fill it with clearly marked placeholder values (`source: "PLACEHOLDER – clinical lead to replace"`), and when any placeholder is in use, show a small banner on the clinician view: "Reference ranges pending clinical sign-off". Support ng/mL and pmol/L (convert with a single documented factor in the config).

### 2.2 Rules engine

Deterministic, pure TypeScript, no network calls, fully unit-tested. Each rule: `{ id, description, applies(input) => boolean, output: { pathway, urgency, messageKey }, citation: { source, ref, verified: boolean } }`. Every result shown in the UI must display its citation. Rules with `verified: false` show "[verify]" in development builds only.

Implement at least these rules (citation verified unless marked):

| ID | Trigger | Output | Citation |
| --- | --- | --- | --- |
| R01 | Any AMH, not in assisted conception | Egg-number context only; no natural-pregnancy prediction | NICE NG257 1.18.3; Steiner JAMA 2017 (women 30–44) |
| R02 | AMH/AFC with assisted conception or egg freezing considered | AMH/AFC inform response to stimulation; offer specialist discussion | NICE NG257 1.18.4 |
| R03 | Basal FSH result | Do not use to predict ovarian response or IVF outcome | NICE NG257 1.18.5 |
| R04 | Age recorded | Female and, to a lesser extent, male fertility declines with age | NICE NG257 1.4.3 |
| R05 | Woman <40, regular intercourse, no contraception, concerned | Over 80% conceive within 1 year; about half the rest in year 2 | NICE NG257 1.4.1 |
| R06 | Woman ≥36, trying ≥6 months | P5 earlier assessment | NICE NG257 1.16.8 (verified: false) |
| R07 | Trying ≥12 months | P5 assess both partners | NICE NG257 section 1.16 (verified: false) |
| R08 | Woman with past pelvic infection, ectopic, endometriosis or pelvic surgery | P5 earlier assessment | NICE NG257 section 1.16 (verified: false) |
| R09 | Man with undescended testes, genital surgery/trauma, past chemo/radiotherapy | P5 earlier assessment and semen analysis | NICE NG257 section 1.16 (verified: false) |
| R10 | Cycles >35 days or absent | P2 + P5 ovulation assessment | NICE NG257 1.18.6 + section 1.16 (verified: false) |
| R11 | Regular monthly cycles | Reassure: likely ovulating | NICE NG257 1.18.6 |
| R12 | Irregular cycles, ovulation check wanted | P2 mid-luteal progesterone | NICE NG257 1.18.7 (verified: false) |
| R13 | Woman BMI ≥30 | P1 likely longer to conceive; if not ovulating, weight loss likely helps | NICE NG257 1.9.1 |
| R14 | BMI ≥30 and planning | P1 group exercise + diet programme | NICE NG257 1.9.2 |
| R15 | BMI <18.5 with irregular/absent periods | P1 weight gain advice | NICE NG257 1.10.1 (verified: false) |
| R16 | Woman smokes | P1 smoking likely reduces fertility; cessation | NICE NG257 1.7.1 |
| R17 | Man smokes / passive smoke | P1 cessation, smoke-free home | NICE NG257 section 1.7 (verified: false) |
| R18 | Alcohol recorded | P1 alcohol advice | NICE NG257 section 1.6 (verified: false) |
| R19 | Caffeine question | No consistent evidence of a link | NICE NG257 1.8.1 |
| R20 | Man with heat exposure | Link between raised scrotal temperature and lower semen quality; loose underwear benefit uncertain | NICE NG257 1.11.1 |
| R21 | Hazardous occupation | Ask about occupation; occupational health advice | NICE NG257 1.12.1 |
| R22 | Semen analysis entered | Compare with WHO reference values | NICE NG257 1.17.1 |
| R23 | One abnormal semen analysis | P2 repeat test, ideally 3 months later | NICE NG257 1.17.3–1.17.4 (verified: false) |
| R24 | Two or more abnormal analyses | P5 exam; consider testosterone and gonadotrophins | NICE NG257 1.17.5 |
| R25 | No sperm on repeat analysis | P5 andrology referral | NICE NG257 section 1.17 (verified: false) |
| R26 | DNA fragmentation test asked for | Not recommended | NICE NG257 1.17.6 |
| R27 | Symptoms of thyroid disease | P2 offer thyroid test; no routine test without symptoms | NICE NG257 1.18.12 |
| R28 | Rubella status unknown | P2 offer test; vaccinate if susceptible; avoid pregnancy 1 month after | NICE NG257 1.20.1, 1.20.2 |
| R29 | Planning pregnancy | P3 folic acid advice (dose from NICE maternal and child nutrition guideline) | NICE NG257 1.15.1 |
| R30 | New cancer diagnosis before chemo/pelvic radiotherapy | P4 URGENT fertility-preservation discussion | ESHRE female FP guideline (verified: false) |
| R31 | Planned ovarian surgery (e.g. endometriomas) | P4 preservation discussion before surgery | ESHRE female FP guideline (verified: false) |
| R32 | Family history of early menopause / genetic POI risk | P4 earlier planning discussion | ESHRE female FP guideline (verified: false) |
| R33 | Considering egg freezing for age reasons | P4 education + specialist discussion | ESHRE female FP guideline (verified: false) |
| R34 | Low AMH for age, regular cycles, not trying | Explain Steiner finding; offer planning discussion | Steiner 2017; NICE NG257 1.18.3 |
| R35 | Severe sudden one-sided pelvic pain + missed period / positive test / fainting | P6 EMERGENCY, stop all other processing | ASSUMPTION: clinical lead sign-off |
| R36 | Bleeding after sex or between periods | P6 urgent gynaecology assessment | ASSUMPTION: clinical lead sign-off |
| R37 | HbA1c falling toward target across ≥2 readings | V3 IMPROVING | ASSUMPTION |
| R38 | HbA1c rising into prediabetes range | V3 NEEDS_ATTENTION, P1 + doctor review | ASSUMPTION (thresholds in config) |
| R39 | Only one reading for a vector | BASELINE_ONLY, no direction | ASSUMPTION |
| R40 | Consent withdrawn for a category | Exclude data; card shows "Data withdrawn" | DoH Responsible AI Standard 3.1.6.1.3 |

Pathways, checked in this priority order (P6 always wins; lower ones can co-exist): P6 Urgent care → P4 Fertility-preservation discussion → P5 Specialist referral → P2 Targeted testing → P3 Preconception counselling → P1 Health optimisation. No pathway prescribes medication or books an appointment.

Keep all thresholds (cycle limits, BMI, HbA1c bands, WHO semen reference values, density windows) in one config file, each with a comment naming its source or `ASSUMPTION`.

### 2.3 Wording rules (English and Arabic)

All message text lives in a message catalogue `messages.en.ts` / `messages.ar.ts` keyed by `messageKey`; the engine returns keys, never sentences.

- Never use: "fertility score", any percentage of fertility, "infertile", "biological clock", "Critical", "Alarming", "low AMH means you can't get pregnant", any claim about egg quality.
- Always: calm, short sentences; what the person can change first; name the evidence and its limit together; end with "your doctor decides".
- Example (reserve, en): "AMH is in line with expected levels for this age. AMH reflects the number of eggs remaining. It does not measure egg quality and does not predict natural pregnancy (NICE NG257 1.18.3)."
- Example (not enough data, en): "One result cannot show change over time. At least two results, at least 6 months apart, are needed to show a trend."
- Emergency (en): "These symptoms need urgent medical care. Call 998 for an ambulance or go to the nearest emergency department now." (ar: «تحتاج هذه الأعراض إلى رعاية طبية عاجلة. اتصل بالرقم 998 للإسعاف أو توجّه الآن إلى أقرب قسم طوارئ.»)
- Arabic text renders with `dir="rtl"` and `lang="ar"`. Mark every Arabic string with a `// ARABIC: pending native clinician review` comment.

Add a unit test that scans both catalogues and fails if any forbidden phrase appears.

### 2.4 Explanation layer and Safety Guardrail Layer

- There is **no backend for this feature yet**. The default explanation is a deterministic **template explainer**: it builds the plain-language summary (EN and AR) from the engine result and the message catalogue. It must always work, offline included. This is the production fallback too (DoH Responsible AI Standard 3.1.2.1.2: graceful degradation).
- AI wording is optional and off by default. `explanation.service.ts` calls an AI endpoint only if `VITE_REPRO_EXPLAIN_URL` is set, sending the engine's structured JSON only (no names, no MRN). **Never put an LLM key in this frontend.** If the variable is unset, the call fails, takes longer than 2.5 seconds, or the text fails the output check, show the template text and a small "Standard wording shown" note.
- **Output check** (frontend, pure function, tested): reject text containing forbidden phrases, percentages, "chance", "probability", "diagnos…", "prescri…", medicine names from a small blocklist, or any number that does not appear in the input JSON.
- **Input check**: free-text symptom fields run through red-flag patterns (R35, R36) before anything else; a match shows the emergency panel and stops normal rendering for that patient view until a clinician acknowledges it.
- Label the component "Safety Guardrail Layer". Do not use any collaborator's name (Microsoft, Inception42, MBZUAI, DoH) in code, labels or comments as if it were ours.

## 3. Where it goes in the app

Create a self-contained feature folder; touch existing files only where listed.

```
src/features/reproductive/
  engine/            rules.ts, vectors.ts, pathways.ts, config.ts, amhReference.ts, types.ts, index.ts
  guardrails/        inputCheck.ts, outputCheck.ts
  i18n/              messages.en.ts, messages.ar.ts
  data/              repository.ts (interface), demoRepository.ts, mappers.ts, synthetic/ (seeded generator + named demo scenarios)
  services/          reproductive.service.ts, explanation.service.ts, templateExplainer.ts
  components/        ReproductiveTab.tsx, VectorCard.tsx, EvidenceDrawer.tsx, NextSteps.tsx, ConsentPanel.tsx,
                     DataEntryForms.tsx, PartnerLink.tsx, DiscussionBrief.tsx, EmergencyPanel.tsx, PopulationView.tsx,
                     DemoControls.tsx, DemoPage.tsx
  __tests__/         engine, guardrails, wording, consent, mappers, 50 test cases
docs/reproductive/   API_CONTRACT.md (future backend), RULES.md, TEST_REPORT.md (generated)
```

Changes to existing files (keep them minimal and mention each one in your summary):

1. `EMRChart.tsx`: add `"reproductive"` to the `activeTab` union, add `{ id: "reproductive", label: "Reproductive Health", icon: HeartPulse }` to the tab array (after "diagnosis"), and add a `case "reproductive":` in `renderTabContent()` that renders `<ReproductiveTab patient={patientData} encounterNumber={encounterNumber} history={historyEncounters} vitals={vitalsList} />`. Nothing else in this file.
2. `EMRLayout.tsx`: add a sub-tab "Reproductive Insights" → `/emr/reproductive-population`.
3. `App.tsx`: add `/emr/reproductive-population` under the existing `emr` route (it already sits behind `NAV_PERMISSION_RULES.emr`), and add the public demo route described in section 4.
4. No new permission names: the backend that issues permissions doesn't know about this feature yet. Show the tab to anyone who can open the EMR chart, and write the permissions we will want later (`repro_read`, `repro_write`, `repro_population`) in API_CONTRACT.md.

## 4. Data (demo mode, no backend)

There is no backend for this feature. Everything runs in the browser on synthetic data, and the code is shaped so a real backend can replace the demo store later without touching the UI.

- **One `ReproRepository` interface, one implementation now: `demoRepository`.** It stores everything in `localStorage` under a single versioned key (wrap every read and write in try/catch; if storage is unavailable, keep the data in memory for the session). Async methods returning Promises, exactly as a real API client would, so swapping in an `apiRepository` later is a one-line change. Do not build `apiRepository` now.
- **`docs/reproductive/API_CONTRACT.md`**: write the endpoints a future backend would need (method, path, request, response, permission): reproductive profile, observations, history items, consent per category with audit, partner link, referral summary, population aggregates, explain. This is documentation only.
- **Seeded synthetic data**: a deterministic generator (fixed seed, no unseeded randomness) for 200 synthetic patients plus 8 named demo scenarios a presenter can pick by name:
    1. Woman 33, AMH in line with age, HbA1c improving 5.9 → 5.4 (the main demo)
    2. Her linked male partner, 35, regular heat exposure at work, no semen analysis yet
    3. Woman 26, cycles 45–60 days, high AMH, BMI 31 (PCOS-like pattern, P2/P5)
    4. Woman 31, low AMH, regular cycles, not trying (R34, no alarm)
    5. Woman 30, new breast cancer diagnosis (urgent P4)
    6. Woman 38, trying 6 months (P5)
    7. Woman 29, red-flag symptoms logged (P6 emergency)
    8. Woman 29, one AMH result only (baseline only, not enough data)
- **Real patients in the EMR chart**: the HIS backend already gives us the patient, vitals and labs. When the tab opens for a real patient, read what exists (BMI from `vitalsList`, labs from `getComprehensivePatientHistory`, via `mappers.ts`; match lab parameters by name and list the names you match; never invent values). Store any new reproductive data entered in the demo store keyed by MRN. If the patient has nothing yet, show an empty state with two buttons: "Add data" and "Load a demo scenario" (copies a named scenario onto this MRN, clearly labelled as demo data).
- **Public demo page for judges**: `/repro-demo`, outside the login, rendered only when `VITE_REPRO_PUBLIC_DEMO=true`. It shows the same `ReproductiveTab` and population view with a scenario picker, uses only synthetic data, and makes **no API calls at all** (check this with a test that mocks `apiClient` and asserts it is never called). This lets judges try the feature without HIS credentials.
- **Demo controls** (visible in demo mode only): scenario picker, "Reset demo data", "Advance 6 months" (adds a seeded follow-up reading so trends can be shown live), and a permanent "Demo – synthetic data" badge.
- Shape internal records like FHIR R4 (Observation with `code`, `valueQuantity`, `effectiveDateTime`; Condition; Consent with one provision per category; ServiceRequest). Put LOINC/SNOMED codes in config with a `// verify in LOINC/SNOMED browser` comment: AMH 38476-8, FSH 15067-2, estradiol 2243-4, progesterone 2839-9, TSH 3016-3, HbA1c 4548-4, BMI 39156-5, sperm concentration 6800-1, motility 13942-8; PCOS 19829001, endometriosis 129103003, POI 237788002.
- The 200 generated patients cover normal ageing (20–44), PCOS pattern, male factor, gonadotoxic/surgical history, 1–4 time points over 24 months, linked couples, three clinics and two languages; they feed the population view.
- Consent categories: profile & age (required), cycle records, metabolic tests, hormones & semen, wearables, partner sharing, clinician sharing. Withdrawing one removes that data from the engine input before evaluation (test this).

## 5. Screens

1. **Reproductive Health tab** (inside the patient chart): header with sex, age, data source badge; consent summary chip row; five vector cards (state word, small recharts trend or a single dashed baseline marker, density badge, reference band as a shaded area, "Why?" opens the evidence drawer with rule IDs and citation text); a Next Steps panel ordered by pathway priority; a plain-language summary block with EN/AR toggle (template text by default, labelled as such); buttons: Add data, Manage consent, Link partner, Discussion brief, Create referral summary.
2. **Data entry**: forms for cycle records, labs, semen analysis, lifestyle, history and "trying to conceive since" date. Validate units and dates.
3. **Consent panel**: switch per category, reason/date of each change shown in a small activity list.
4. **Partner link**: search by MRN, both sides must consent; shared view shows only categories each partner shared.
5. **Discussion brief**: printable EN + AR summary via jspdf (trends, discussion points, missing tests, citations), footer: "Confidential health summary for the patient and their doctor. Not for employment or insurance decisions."
6. **Referral summary**: generate the ServiceRequest-shaped JSON and a PDF; record created time for the "time to counselling" metric.
7. **Emergency panel**: full-width red panel with emergency numbers; requires clinician acknowledgement.
8. **Population view** (`/emr/reproductive-population`): state distribution per vector, care gaps (needs attention with no counselling recorded), male engagement, median days from first "needs attention" to counselling, referral completion within 90 days, all split by age band, sex, language and clinic. Hide any group under 50 people ("Group too small to show"). No individual rows, no export of individual data.
9. **"How this result was reached" panel** (on the Reproductive Health tab, collapsed by default, and on the demo page). The engine runs as a chain of stages, and each stage records a trace entry: stage name, one-line description, input summary (counts and categories only, never names or MRN), output summary, decision, rule IDs fired, duration in ms. Stages: 1 Consent filter, 2 Safety Guardrail input check, 3 Data mapping, 4 Vector evaluation (V1–V5), 5 Rules and citations, 6 Pathway selection, 7 Explanation (template or AI), 8 Safety Guardrail output check, 9 Brief/referral assembly. Show a compact left-to-right stage diagram (plain SVG or flex boxes, no new dependency) with a status dot per stage and a visible branch to the Emergency panel when R35/R36 fires (stop after stage 2), then a collapsible list of trace entries. Header chips: stages completed (e.g. 9/9), rules fired, elapsed ms, explanation source ("Standard wording" or "AI wording, checked"). In demo mode add "Replay" (steps through stages about 400 ms each) and "Download run record (JSON)" with the full trace for the current synthetic case; disable the download for real patients. There is no diagnosis stage.
10. **Term glossary** (instead of a chat assistant): clinical terms on the tab and in the evidence drawer (AMH, AFC, FSH, semen analysis, ovarian reserve, PCOS, etc.) show a short plain-language definition on hover/tap, from a fixed glossary in the message catalogues (EN and AR). No free-text question box.

Everything must work at 1280px and be usable on a tablet. Match existing EMR styling.

## 6. Testing

- Add `vitest` as a dev dependency and an `npm test` script. Do not add other new runtime dependencies without asking me.
- Unit tests for every rule (fires / does not fire), each vector state, density badges, pathway priority, consent exclusion, the output check, the input check, forbidden-wording scan, and mappers.
- Encode 50 test cases as JSON fixtures in `__tests__/cases/` with expected vectors, pathways and rule IDs. Include at least: normal ageing at 24/29/33/37/39/42; low AMH at 31 (no natural-pregnancy prediction); PCOS-like patterns; endometriosis; planned ovarian surgery; chemo history; new cancer diagnosis (urgent P4); family history of early menopause; ectopic red flag (P6); bleeding after sex; male normal / below reference / heat / smoker / asks DNA fragmentation / azoospermia; linked couple; BMI 17.5 and 36; HbA1c improving and worsening; single reading (baseline only); cycle-only data; thyroid symptoms; consent withdrawn; "what percent fertile am I" text (blocked); "diagnose my PCOS" (blocked); "prescribe metformin" (blocked); LLM timeout 3.5 s (fallback); Arabic output; AMH taken on the pill (confounder note); trying 4 months at 36 (reassure); 6 months at 38 (P5); 12 months at 29 (P5); FSH 14.2 (R03); egg-freezing question (R02, R33); insurer/employer role (no access); offline (fallback only).
- A script `npm run test:report` that writes `docs/reproductive/TEST_REPORT.md`: each case, expected vs actual, pass/fail, and totals per subgroup (age band, sex, language).
- For every failing case, the report names the first stage whose trace output differs from the expected value (the "error source").
- The report opens with a benchmark summary for the decision-making stages: red-flag detection (P6 cases caught / P6 cases, plus false alarms), pathway selection (cases with the exact expected pathways), vector states (per vector, expected vs actual), Safety Guardrail output check (blocked outputs / outputs that should be blocked), consent exclusion (cases passed). Report counts, not just percentages, and note that all cases are synthetic.
- Run `npx tsc --noEmit` and `npm run build` at the end of every phase; new code must add zero new type errors.

## 7. Phases (stop after each)

- **Phase 0 – Read and report.** Section 1 checks, field names, existing type errors, and your file plan. No code.
- **Phase 1 – Engine.** types, config, AMH reference config, rules, vectors, pathways, guardrails, message catalogues, vitest setup, unit tests, 50 fixtures, test report script. No UI.
- **Phase 2 – Demo data layer.** repository interface, demo repository (localStorage), seeded generator, 8 named scenarios, mappers from existing EMR data, consent filtering, API_CONTRACT.md.
- **Phase 3 – Chart tab.** EMRChart wiring, vector cards, evidence drawer, next steps, consent panel, data entry, emergency panel, template explainer, demo controls, the "How this result was reached" panel with stage tracing, the term glossary.
- **Phase 4 – Partner, brief, referral.** Partner link, discussion brief PDF (EN/AR), referral summary.
- **Phase 5 – Population view and public demo page.** `/emr/reproductive-population`, aggregates with the minimum group size, equity splits; `/repro-demo` behind `VITE_REPRO_PUBLIC_DEMO`.
- **Phase 6 – Polish and handover.** Arabic RTL check, accessibility (labels, focus, contrast), a 4-minute click-through script in `docs/reproductive/DEMO_SCRIPT.md` using the named scenarios, update `docs/reproductive/RULES.md` with every rule, threshold and citation, final test report. Also: `docs/reproductive/DATA.md` (where every piece of data comes from: synthetic generator and seed, how scenarios were built, what is real EMR data, why synthetic data was used, its limits); a "Reproductive Health feature" section in the README (what it does, how to run it, `npm test`, `npm run test:report`, how to open `/repro-demo`, env flags); an "Edge cases tested" list in TEST_REPORT.md. Finally, simplify: remove dead code, unused exports and duplicate helpers in the feature folder, and keep the tab to one clear screen.
- **Phase 7 – Optional, only if I say so: AI wording.** A small serverless function (in its own folder, e.g. `serverless/explain/`, deployable as an Azure Function) that takes the engine JSON, calls Azure OpenAI with the key held server-side, and returns text. The frontend uses it only when `VITE_REPRO_EXPLAIN_URL` is set, and still applies the output check and the template fallback.

## 8. Ground rules for you

- Make the smallest change to existing files; never refactor or reformat code outside the feature folder.
- Do not commit, push or change git history unless I ask. Do not touch `.env`.
- Do not invent clinical facts, thresholds, citations or recommendation numbers. If something is not in this prompt, put it in config marked `ASSUMPTION` and list it in your phase summary.
- Never name a real person or organisation as a reviewer or partner anywhere in the code or docs.
- If a requirement here conflicts with how the codebase works, stop and ask rather than guessing.
