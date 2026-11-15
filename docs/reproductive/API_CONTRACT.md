# Reproductive Health – API contract

## Connected today (`VITE_REPRO_BACKEND=true`)

The chart tab uses four HIS endpoints, all through `src/api/client.ts` (login cookie, session
refresh). Code: `services/trajectory.service.ts` (calls) and `data/trajectoryMapper.ts` (response
mapping). `/repro-demo` and demo scenarios never call them.

| Endpoint | When | Body / query |
| --- | --- | --- |
| `GET /clinical/trajectory?patient_id=<MRN>` | Every time the tab evaluates a real patient | – |
| `POST /clinical/trajectory-consent` | Consent step: "Confirm consent" | `{ patient_id, user_id, user_name, reason, consented_categories[] }` (PROFILE always included) |
| `POST /clinical/trajectory-consent` | Manage consent: one switch | `{ patient_id, user_id, user_name, category, granted, reason }` |
| `POST /clinical/trajectory-order-diagnostics` | Order tests: the clinician ticks tests and confirms | `{ patient_id, encounter_id, ordered_by, diagnostics: [{ test_name, loinc, source, reason }] }` |
| `POST /clinical/trajectory-referral` | Referral summary: "Send referral to the HIS" | `{ patient_id, doctor_name, target_specialty, clinical_reason }` |
| `POST /clinical/trajectory-lifestyle` | Add data → Lifestyle (creates or updates) | `{ patient_id, user_id, user_name, smoking_status, passive_smoke, alcohol_units_per_week, heat_exposure, occupation, hazardous_occupation, …fields the HIS already holds }` |
| `POST /clinical/trajectory-history` | Add data → History (creates or updates) | `{ patient_id, user_id, user_name, items: { …all items true/false } }` |
| `POST /clinical/trajectory-plans` | Add data → Plans and questions (creates or updates) | `{ patient_id, user_id, user_name, trying_since, rubella_status (IMMUNE / NON_IMMUNE / NOT_RECORDED), …answers and questions as true/false }` |
| `POST /clinical/trajectory-symptoms` | Add data → Symptoms | `{ patient_id, user_id, user_name, freeText, …six tick boxes }` (the HIS keeps red flags only; if it cannot be reached, the red flag is kept in this browser) |
| `POST /clinical/trajectory-red-flag-resolve` | Emergency panel, for a red flag from the HIS | `{ patient_id, red_flag_id, resolution (ACKNOWLEDGED_REFERRED / DISMISSED), user_id, user_name, note }` |
| `POST /clinical/trajectory-partner` | Link partner: send request / accept / decline or end | `{ patient_id, action (REQUEST / ACCEPT / CANCEL), user_id, user_name, partner_mrn?, shared_categories? }` |

`patient_id` is the MRN. `user_id`, `user_name`, `ordered_by` and `doctor_name` are the logged-in
user (`user_id`/`ordered_by` as a number when numeric). A request counts as failed on an HTTP error or
when the body has a `status` other than `"success"`; the HIS `message` is shown to the clinician.

**What the tab reads from `GET /clinical/trajectory`:**

- `consent_confirmed`, `consented_categories`, `consent_details.provision`, `consent_activity_log`.
  The HIS is the record of consent: without `consent_confirmed: true` the consent step is shown.
- `historical_trends`: released results only, dated by `timestamps.effective_at`. Semen parameters
  (LOINC 3155-9, 6800-1, 9781-6, 13942-8, 13943-6, 13944-4) are regrouped per `order_id`. Skipped,
  with the reason shown in the trace: percentages outside 0–100, negative values, unknown units
  (FSH only in IU/L or mIU/mL), results not released, and parameters this tool does not use.
- Age and sex from the FHIR `Patient` in `fhir_bundle_preview` (else `patient_age`, `patient_gender`);
  BMI from the bundle only when it has a date (otherwise from the chart's vitals).
- `emergency_halt` (red warning), `encounter_id` (for orders), `pending_diagnostic_orders` (a test
  already open cannot be ordered again), `recommended_diagnostics`, `specialist_referrals`.
- Not used: `explanation` (the tab's own reviewed template wording is shown) and `engine_error`.

Lifestyle, history, plans, cycles (read only), open red flags and the partner link are also read
from the same GET (`lifestyle`, `history`, `plans_and_questions`, `cycle_records`, `red_flags`,
`partner_link`). A save starts from the HIS copy so fields the tab does not edit are not cleared.
When linked, the partner's own trajectory is loaded and only the categories they share (with their
PARTNER_SHARING consent on) are used; never their symptoms or red flags. The HIS's cycle predictions
are never used.

Still kept in this browser until the HIS has endpoints for them: saving cycles, lab results typed in
by hand, counselling, "mark referral completed", changing partner sharing after linking, and a
local copy of each referral (for the PDF/JSON summary and population measures).

## Proposed endpoints (not built yet)

The rest of this page describes endpoints the feature would need to move everything else off the
browser. A future `apiRepository` implements the same `ReproRepository` interface
(`src/features/reproductive/data/repository.ts`) against them.

## Conventions

- Base URL: the existing HIS API (`VITE_API_BASE_URL`), cookie auth through `src/api/client.ts`.
- All bodies are JSON. Dates are ISO 8601. Records are FHIR R4-shaped (`Observation`, `Condition`,
  `Consent`, `ServiceRequest`) with an internal `code.key` alongside LOINC/SNOMED `coding`.
- Every write records `{ at, by: { id, name } }` in the patient's activity log on the server.
- Errors: `400` validation, `403` permission or consent, `404` unknown patient, `409` conflict.

## Permissions (new; not yet issued by the HIS backend)

| Permission | Allows |
| --- | --- |
| `repro_read` | Read one patient's reproductive record, results and activity |
| `repro_write` | Add data, change consent on the patient's instruction, resolve red flags, create referral summaries |
| `repro_population` | Read population aggregates (no individual rows) |

Until these exist, the frontend shows the tab to anyone who can open the EMR chart
(`NAV_PERMISSION_RULES.emr`).

**No insurer, employer or payer access, ever.** There is no role, permission, endpoint or export
route for them. The server must refuse any caller whose role matches insurer, employer, HMO, payer
or underwriter, even if it also holds a clinical role (mirrors `guardrails/accessPolicy.ts`).

## Consent categories

`PROFILE` (age and sex; required), `HISTORY`, `LIFESTYLE`, `PLANS`, `CYCLES`, `METABOLIC`,
`HORMONES_SEMEN`, `WEARABLES`, `PARTNER_SHARING`, `CLINICIAN_SHARING`.

The server must apply consent **before** returning or computing anything: withdrawn data is never
sent to the client, used in an aggregate, or passed to the explain endpoint.

Symptom free text is not a consent category and is **never stored**. The server runs the red-flag
check when the text arrives, stores only the resulting red flag, and discards the text.

## Endpoints

### Reproductive profile

| | |
| --- | --- |
| `GET /repro/patients/{mrn}` | `repro_read` |
| Response | `ReproRecord` (consent-filtered): `{ patientId, isDemo, profile, observations[], cycles[], historyCompleted, conditions[], lifestyle, reproductive, consent, redFlags[], counselling[], serviceRequests[], partner? }` |
| `POST /repro/patients/{mrn}` | `repro_write` – create the record. Request `{ profile: { sex, language } }`. Response `201 ReproRecord` |

Age and sex come from the HIS patient record. They are not duplicated here.

### Observations (labs, BMI, BP, semen analysis)

| | |
| --- | --- |
| `POST /repro/patients/{mrn}/observations` | `repro_write` |
| Request | `{ observations: Observation[] }` – each `{ code: { key, coding[] }, valueQuantity: { value, unit }, component?[], effectiveDateTime, source, derivation? }` |
| Response | `ReproRecord` |
| Validation | Units must match the code (AMH ng/mL or pmol/L; HbA1c %; semen components as WHO units); no future dates |

### Cycle records

`POST /repro/patients/{mrn}/cycles` (`repro_write`) – `{ cycles: [{ startDate, lengthDays?, source }] }` → `ReproRecord`.

### History items

| | |
| --- | --- |
| `PUT /repro/patients/{mrn}/history` | `repro_write` |
| Request | `{ items: { newCancerDiagnosis?, pastChemoOrRadiotherapy?, pastOvarianSurgery?, plannedOvarianSurgery?, pastPelvicSurgery?, pastPelvicInfection?, pastEctopicPregnancy?, endometriosis?, familyEarlyMenopause?, geneticPoiRisk?, undescendedTestes?, genitalSurgeryOrTrauma?, pcos? } }` |
| Stored as | `Condition[]` (SNOMED for endometriosis 129103003, PCOS 19829001, POI 237788002 – verify) |
| Response | `ReproRecord` |

`PUT /repro/patients/{mrn}/lifestyle` and `PUT /repro/patients/{mrn}/plans` (`repro_write`) take the
`Lifestyle` and `ReproductiveContext` objects and return `ReproRecord`.

### Symptoms and red flags

| | |
| --- | --- |
| `POST /repro/patients/{mrn}/symptoms` | `repro_write` |
| Request | `{ freeText?, severeOneSidedPelvicPain?, missedPeriod?, positivePregnancyTest?, fainting?, bleedingAfterSex?, bleedingBetweenPeriods? }` |
| Response | `{ check: { redFlags: ("R35"\|"R36")[], blocked[], messageKeys[] }, record: ReproRecord }` |
| Rules | Runs whatever the consent settings. The text is discarded after the check |
| `POST /repro/patients/{mrn}/red-flags/{id}/resolve` | `repro_write` – `{ resolution: "ACKNOWLEDGED_REFERRED" \| "DISMISSED" }` → `ReproRecord`; logged with time and user. `409` if already resolved |

### Consent (per category, with audit)

| | |
| --- | --- |
| `GET /repro/patients/{mrn}/consent` | `repro_read` → FHIR `Consent` with one `provision` per category `{ category, type: "permit"\|"deny", updatedAt, updatedBy, reason }` |
| `PUT /repro/patients/{mrn}/consent/{category}` | `repro_write` – `{ granted: boolean, reason: string }` → `ReproRecord`. `400` if `reason` is empty or the category is `PROFILE` with `granted: false` |
| `GET /repro/patients/{mrn}/activity` | `repro_read` → `ActivityEntry[]` newest first: `{ id, at, by, action, detail, category? }` |

### Partner link

| | |
| --- | --- |
| `POST /repro/patients/{mrn}/partner` | `repro_write` – `{ partnerMrn, sharedCategories: ConsentCategory[] }`. Creates a pending link; this side has consented |
| `POST /repro/patients/{mrn}/partner/accept` | `repro_write` – called for the partner's record with that person's own `sharedCategories`. The link is active only when both sides have consented and both have `PARTNER_SHARING` permitted |
| `DELETE /repro/patients/{mrn}/partner` | `repro_write` – either side can end the link at any time |
| `GET /repro/patients/{mrn}/partner/shared` | `repro_read` → the partner's data limited to the categories that partner shared (never symptoms or red flags) |

### Referral summary

| | |
| --- | --- |
| `POST /repro/patients/{mrn}/referrals` | `repro_write` – `{ pathway, reasonRuleIds[] }` → FHIR `ServiceRequest` `{ id, status: "active", intent: "proposal", pathway, reasonRuleIds, authoredOn }` |
| `PATCH /repro/patients/{mrn}/referrals/{id}` | `repro_write` – `{ status: "completed" \| "revoked", completedOn? }` |
| `POST /repro/patients/{mrn}/counselling` | `repro_write` – `{ date }`; feeds "time to counselling" |

A referral summary never books an appointment and never names a medicine.

### Population aggregates

| | |
| --- | --- |
| `GET /repro/population?split=ageBand\|sex\|language\|clinic` | `repro_population` |
| Response | `{ minimumGroupSize: 50, groups: [{ key, n, suppressed: boolean, vectorStates?: { V1: { NEEDS_ATTENTION, ... } }, careGaps?, maleEngagement?, medianDaysToCounselling?, referralCompletion90d? }] }` |
| Rules | Groups under 50 people return `suppressed: true` and no figures. No individual rows. No export of individual data |

### Explain (optional AI wording)

| | |
| --- | --- |
| `POST /repro/explain` | `repro_read` |
| Request | The engine's structured result only (vector states, rule IDs, message keys, numbers). **No names, no MRN, no free text** |
| Response | `{ language: "en" \| "ar", text: string }` |
| Rules | The model key stays on the server. The client still applies the output check and falls back to the template text if the call fails, takes longer than 2.5 s, or fails the check |
