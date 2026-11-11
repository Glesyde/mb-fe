# Reproductive Health – rules, thresholds and assumptions

Decision support and education only. No score, no diagnosis, no prescribing, no booking.
The source of truth is the code: rules in `src/features/reproductive/engine/rules.ts`, thresholds in
`engine/config.ts` and `engine/amhReference.ts`, wording in `i18n/`. A test (`__tests__/docs.test.ts`)
fails if this document misses any rule ID or citation.

"**verify**" = the citation is taken from the brief but has not been checked against the source
document; in development builds the app shows "[verify]" next to it.

## Rules R01–R40

| ID | Trigger | Pathway | Urgency | Cards | Message (English) | Citation | Verified |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R01 | Any AMH, not in assisted conception: egg-number context only; no natural-pregnancy prediction | – | INFO | V1 | AMH gives context about the number of eggs remaining. It is not used to predict natural pregnancy (NICE NG257 1.18.3). In a study of women aged 30 to 44 without known fertility problems, AMH did not predict natural conception (Steiner, JAMA 2017). | NICE NG257; Steiner et al., JAMA 2017 (women 30–44) 1.18.3 | yes |
| R02 | AMH/AFC with assisted conception or egg freezing considered: informs response to stimulation | – | INFO | V1 | AMH and AFC can help predict how the ovaries may respond to stimulation in assisted conception (NICE NG257 1.18.4). A specialist discussion can be offered. | NICE NG257 1.18.4 | yes |
| R03 | Basal FSH result: do not use to predict ovarian response or IVF outcome | – | INFO | V1 | Basal FSH is not used to predict ovarian response or the outcome of IVF (NICE NG257 1.18.5). | NICE NG257 1.18.5 | yes |
| R04 | Age recorded: female and, to a lesser extent, male fertility declines with age | – | INFO | V1, V4 | Female fertility declines with age. Male fertility also declines with age, to a lesser extent (NICE NG257 1.4.3). | NICE NG257 1.4.3 | yes |
| R05 | Woman <40, regular intercourse, no contraception, concerned: population figure for couples in general | – | INFO | – | For couples in general, not a prediction for any one person: over 80% of couples where the woman is under 40, who have regular sex without contraception, conceive within 1 year. About half of the rest conceive in the second year (NICE NG257 1.4.1). | NICE NG257 1.4.1 | yes |
| R06 | Woman ≥36 trying ≥6 months: earlier assessment | P5 | ROUTINE | – | The woman is 36 or over and has been trying for 6 months or more. An earlier specialist assessment can be discussed (NICE NG257 1.16.8). | NICE NG257 1.16.8 | **verify** |
| R07 | Trying ≥12 months: assess both partners | P5 | ROUTINE | – | Trying for 12 months or more. Assessment of both partners can be discussed (NICE NG257 section 1.16). | NICE NG257 section 1.16 | **verify** |
| R08 | Woman with past pelvic infection, ectopic, endometriosis or pelvic surgery: earlier assessment | P5 | ROUTINE | V5 | A past pelvic infection, ectopic pregnancy, endometriosis or pelvic surgery is recorded. An earlier specialist assessment can be discussed (NICE NG257 section 1.16). | NICE NG257 section 1.16 | **verify** |
| R09 | Man with undescended testes, genital surgery/trauma, past chemo/radiotherapy: earlier assessment and semen analysis | P5 | ROUTINE | V4, V5 | Undescended testes, genital surgery or injury, or past chemotherapy or radiotherapy is recorded. An earlier assessment and a semen analysis can be discussed (NICE NG257 section 1.16). | NICE NG257 section 1.16 | **verify** |
| R10 | Cycles >35 days or absent: ovulation tests and specialist assessment | P2 + P5 | ROUTINE | V2 | Cycles longer than 35 days or absent periods are recorded. Tests to check ovulation and a specialist assessment can be discussed (NICE NG257 1.18.6, section 1.16). | NICE NG257 1.18.6 + section 1.16 | **verify** |
| R11 | Regular monthly cycles: reassure, likely ovulating | – | INFO | V2 | Regular monthly cycles usually mean ovulation is happening (NICE NG257 1.18.6). | NICE NG257 1.18.6 | yes |
| R12 | Irregular cycles, ovulation check wanted: mid-luteal progesterone | P2 | ROUTINE | V2 | Cycles are irregular and an ovulation check is wanted. A mid-luteal progesterone test can be discussed (NICE NG257 1.18.7). | NICE NG257 1.18.7 | **verify** |
| R13 | Woman BMI ≥30: likely longer to conceive; if not ovulating, weight loss likely helps | P1 | ROUTINE | V3 | With a BMI of 30 or over, it is likely to take longer to conceive. If ovulation is not happening, losing weight is likely to help (NICE NG257 1.9.1). | NICE NG257 1.9.1 | yes |
| R14 | BMI ≥30 and planning: group exercise and diet programme | P1 | ROUTINE | V3 | With a BMI of 30 or over and planning a pregnancy, a group programme with exercise and diet advice can help (NICE NG257 1.9.2). | NICE NG257 1.9.2 | yes |
| R15 | BMI <18.5 with irregular/absent periods: weight gain advice | P1 | ROUTINE | V3 | BMI is under 18.5 and periods are irregular or absent. Advice on gaining weight can help (NICE NG257 1.10.1). | NICE NG257 1.10.1 | **verify** |
| R16 | Woman smokes: smoking likely reduces fertility; cessation | P1 | ROUTINE | V3 | Smoking is likely to reduce fertility. Support to stop smoking can be offered (NICE NG257 1.7.1). | NICE NG257 1.7.1 | yes |
| R17 | Man smokes or passive smoke: cessation, smoke-free home | P1 | ROUTINE | V3, V4 | Smoking or second-hand smoke is recorded. Support to stop smoking and a smoke-free home can help (NICE NG257 section 1.7). | NICE NG257 section 1.7 | **verify** |
| R18 | Alcohol recorded: alcohol advice | P1 | ROUTINE | V3 | Alcohol use is recorded. Advice on alcohol can be offered (NICE NG257 section 1.6). | NICE NG257 section 1.6 | **verify** |
| R19 | Caffeine question: no consistent evidence of a link | – | INFO | – | There is no consistent evidence linking caffeine with fertility problems (NICE NG257 1.8.1). | NICE NG257 1.8.1 | yes |
| R20 | Man with heat exposure: raised scrotal temperature linked to lower semen quality | P1 | ROUTINE | V4 | Raised scrotal temperature is linked with lower semen quality. Whether loose underwear helps is uncertain (NICE NG257 1.11.1). | NICE NG257 1.11.1 | yes |
| R21 | Hazardous occupation: ask about occupation; occupational health advice | P1 | ROUTINE | V3, V4 | Some jobs can affect fertility. Ask about occupation and offer occupational health advice (NICE NG257 1.12.1). | NICE NG257 1.12.1 | yes |
| R22 | Semen analysis entered: compare with WHO reference values | – | INFO | V4 | Semen analysis results are compared with WHO reference values (NICE NG257 1.17.1). | NICE NG257 1.17.1 | yes |
| R23 | One abnormal semen analysis: repeat test, ideally 3 months later | P2 | ROUTINE | V4 | One semen analysis is below WHO reference values. A repeat test, ideally 3 months later, can be discussed (NICE NG257 1.17.3 to 1.17.4). | NICE NG257 1.17.3–1.17.4 | **verify** |
| R24 | Two or more abnormal analyses: examination; consider testosterone and gonadotrophins | P5 | ROUTINE | V4 | Two or more semen analyses are below WHO reference values. A physical examination can be discussed, and testosterone and gonadotrophin blood tests can be considered (NICE NG257 1.17.5). | NICE NG257 1.17.5 | yes |
| R25 | No sperm on repeat analysis: andrology referral | P5 | ROUTINE | V4 | No sperm were seen on repeat analysis. Referral to an andrology specialist can be discussed (NICE NG257 section 1.17). | NICE NG257 section 1.17 | **verify** |
| R26 | DNA fragmentation test asked for: not recommended | – | INFO | V4 | A sperm DNA fragmentation test is not recommended (NICE NG257 1.17.6). | NICE NG257 1.17.6 | yes |
| R27 | Symptoms of thyroid disease: offer thyroid test; no routine test without symptoms | P2 | ROUTINE | – | Symptoms of thyroid disease are recorded. A thyroid test can be offered. Routine thyroid testing without symptoms is not recommended (NICE NG257 1.18.12). | NICE NG257 1.18.12 | yes |
| R28 | Rubella status unknown (woman planning or trying): offer test; vaccinate if susceptible | P2 | ROUTINE | – | Rubella status is not known. A rubella test can be offered, with vaccination if not immune. Pregnancy should be avoided for 1 month after vaccination (NICE NG257 1.20.1, 1.20.2). | NICE NG257 1.20.1, 1.20.2 | yes |
| R29 | Planning pregnancy: folic acid advice | P3 | ROUTINE | – | When planning a pregnancy, folic acid advice can be given. The dose follows the NICE maternal and child nutrition guideline (NICE NG257 1.15.1). | NICE NG257 1.15.1 | yes |
| R30 | New cancer diagnosis before chemo/pelvic radiotherapy: URGENT fertility-preservation discussion | P4 | URGENT | V5 | A new cancer diagnosis is recorded before chemotherapy or pelvic radiotherapy. An urgent discussion about fertility preservation can be offered before treatment starts (ESHRE female fertility preservation guideline). | ESHRE female fertility preservation guideline | **verify** |
| R31 | Planned ovarian surgery: preservation discussion before surgery | P4 | ROUTINE | V5 | Ovarian surgery is planned. A fertility-preservation discussion can be offered before surgery (ESHRE female fertility preservation guideline). | ESHRE female fertility preservation guideline | **verify** |
| R32 | Family history of early menopause / genetic POI risk: earlier planning discussion | P4 | ROUTINE | V5 | A family history of early menopause or a genetic risk of premature ovarian insufficiency is recorded. An earlier planning discussion can be offered (ESHRE female fertility preservation guideline). | ESHRE female fertility preservation guideline | **verify** |
| R33 | Considering egg freezing for age reasons: education and specialist discussion | P4 | ROUTINE | V1 | Egg freezing for age reasons is being considered. Education and a specialist discussion can be offered (ESHRE female fertility preservation guideline). | ESHRE female fertility preservation guideline | **verify** |
| R34 | Low AMH for age, regular cycles, not trying: explain Steiner finding; offer planning discussion | – | INFO | V1 | AMH is below the range for this age, cycles are regular and there is no current attempt to conceive. In a study of women aged 30 to 44 without known fertility problems, AMH did not predict natural conception (Steiner, JAMA 2017; NICE NG257 1.18.3). A planning discussion can be offered. | Steiner et al., JAMA 2017; NICE NG257 1.18.3 | yes |
| R35 | Severe sudden one-sided pelvic pain + missed period / positive test / fainting: EMERGENCY, stop | P6 | EMERGENCY | – | These symptoms need urgent medical care. Call 998 for an ambulance or go to the nearest emergency department now. | ASSUMPTION: clinical lead sign-off | **verify** |
| R36 | Bleeding after sex or between periods: urgent gynaecology assessment | P6 | URGENT | – | Bleeding after sex or between periods needs an urgent gynaecology assessment. | ASSUMPTION: clinical lead sign-off | **verify** |
| R37 | HbA1c falling toward target across ≥2 readings: V3 IMPROVING | – | INFO | V3 | HbA1c is coming down across results at least 6 months apart. | ASSUMPTION | **verify** |
| R38 | HbA1c rising into prediabetes range: V3 NEEDS_ATTENTION, P1 + doctor review | P1 | ROUTINE | V3 | HbA1c has risen into the prediabetes range. Lifestyle support and a doctor review are suggested. | ASSUMPTION (thresholds in config) | **verify** |
| R39 | Only one reading for a vector: BASELINE_ONLY, no direction | – | INFO | V1, V2, V3, V4 | One result cannot show change over time. At least two results, at least 6 months apart, are needed to show a trend. | ASSUMPTION | **verify** |
| R40 | Consent withdrawn for a category: exclude data; card shows Data withdrawn | – | INFO | V1, V2, V3, V4 | Consent for this data was withdrawn. It is not used in any calculation. | DoH Responsible AI Standard 3.1.6.1.3 | yes |

The engine returns message keys, never sentences; the English text above is `i18n/messages.en.ts`.
Patient-view wording for rules with a pathway is under `patient.rule.*`. Arabic wording is in
`i18n/messages.ar.ts` (pending native clinician review).

## Pathways

Checked in this order; P6 always wins and stops the chart view until a clinician resolves the red
flag; the others co-exist. No pathway prescribes medication or books an appointment.

| Order | Pathway | Name |
| --- | --- | --- |
| 1 | P6 | Urgent care |
| 2 | P4 | Fertility-preservation discussion |
| 3 | P5 | Specialist referral |
| 4 | P2 | Targeted testing |
| 5 | P3 | Preconception counselling |
| 6 | P1 | Health optimisation |

## Vectors and states

| Vector | Shown for | Inputs | Needs attention when | Not enough data when |
| --- | --- | --- | --- | --- |
| V1 Reserve in age context | Women | Age, AMH, AFC | Latest AMH (last 24 months) outside the age band | No AMH/AFC in 24 months; AFC only; no age; no band for the age |
| V2 Cycle and ovulation | Women | Cycle records (last 12 months), absent periods | Median cycle under 24 or over 35 days, variation over 7 days, or periods absent | Fewer than 3 complete cycles |
| V3 Metabolic and lifestyle | Everyone | BMI, HbA1c, fasting glucose, BP, smoking, alcohol | BMI 30 or over or under 18.5; HbA1c rising into, in or above the prediabetes range; current smoking | Fewer than 2 readings in 12 months (and nothing above applies) |
| V4 Male factor | Men; women only via a linked partner's shared data | Age, semen analysis, BMI, smoking, heat, occupation | Latest semen analysis below WHO reference values or no sperm; heat exposure; current smoking | No semen analysis (and nothing above applies) |
| V5 History-based risk | Everyone | History items | Any risk factor recorded | History not filled in |

States: Improving · Stable ("In line with age" for V1) · Needs attention · Not enough data
(shown as "Data withdrawn" when consent was withdrawn). V1 and V4 never show "Improving".

Density badge: **Baseline only** = one reading, or readings under 6 months apart (no direction);
**Trend** = 2+ readings at least 6 months apart; **Established** = 3+ readings over at least 6 months.

## Thresholds (all in `engine/config.ts` unless noted)

| Threshold | Value | Source |
| --- | --- | --- |
| Short / long cycle | under 24 / over 35 days (median) | Brief; NICE NG257 1.18.6 context |
| Cycle variation | over 7 days (longest minus shortest) | ASSUMPTION |
| Minimum cycles | 3 | Brief |
| BMI high / low | 30 or over / under 18.5 | NICE NG257 1.9.1, 1.9.2 / 1.10.1 (verify) |
| HbA1c normal / prediabetes | below 5.7 % / 5.7–6.4 % | ASSUMPTION (clinical lead to confirm local guidance) |
| HbA1c smallest direction change | 0.2 percentage points | ASSUMPTION |
| Alcohol "recorded" | more than 0 units a week | ASSUMPTION |
| Semen lower reference limits | volume 1.4 mL; concentration 16 ×10⁶/mL; total 39 ×10⁶; total motility 42 %; progressive 30 %; normal forms 4 % | WHO 2021 (6th ed.) via NICE NG257 1.17.1 (verify) |
| AMH reference bands | 20–24, 25–29, 30–34, 35–39, 40–44 – **placeholders** | `engine/amhReference.ts`; clinical lead to replace |
| AMH unit conversion | 1 ng/mL = 7.14 pmol/L | verify against the assay |
| R05 woman under | 40 | NICE NG257 1.4.1 |
| R06 woman / trying | 36 or over / 6 months or more | NICE NG257 1.16.8 (verify) |
| R07 trying | 12 months or more | NICE NG257 section 1.16 (verify) |
| R23 repeat semen test | ideally 3 months later | NICE NG257 1.17.3–1.17.4 (verify) |
| Reserve window | 24 months | Brief |
| Metabolic readings window / minimum | 12 months / 2 readings | Brief |
| Metabolic direction window | 24 months | ASSUMPTION |
| Cycle window | 12 months | ASSUMPTION |
| Density trend span | 6 months | Brief |
| AI wording timeout | 2.5 seconds | Brief |
| Population minimum group | 50 people | Brief (`services/population.service.ts`) |
| Referral completion window | 90 days | Brief (`services/population.service.ts`) |

## Codes (verify in LOINC/SNOMED browser)

LOINC: AMH 38476-8, FSH 15067-2, estradiol 2243-4, progesterone 2839-9, TSH 3016-3, HbA1c 4548-4,
BMI 39156-5, sperm concentration 6800-1, sperm motility 13942-8. SNOMED: PCOS 19829001,
endometriosis 129103003, POI 237788002.

## For native review

Arabic items that need a native-speaking clinician before clinical use:

| Item | Detail | Where |
| --- | --- | --- |
| All Arabic catalogue text | Every string is marked `// ARABIC: pending native clinician review` | `i18n/messages.ar.ts` |
| Arabic PDF: parentheses at line wraps | On the Arabic pages of the discussion brief, a citation in parentheses that wraps onto the next line, e.g. "(NICE NG257 1.18.3)", can show a mirrored or misplaced bracket. This is a limit of jsPDF's bidi engine; the words themselves read correctly | `services/pdf.ts` |
| Arabic red-flag patterns | Wording patients and clinicians actually use for R35/R36 symptoms | `guardrails/inputCheck.ts` |
| Arabic forbidden phrases | Equivalents of "fertility score", "infertile", "biological clock", "critical", "alarming", egg-quality claims, "chance of pregnancy" | `guardrails/forbiddenPhrases.ts` |
| Arabic glossary terms | Term matching and definitions | `i18n/glossary.ts`, `i18n/messages.ar.ts` |

## Assumptions

Everything below is **not** taken from a guideline. Each item needs review by the clinical lead.
The "Where" column points at the code that holds the value, so a change is one edit.

### Reference values marked "verify"

| Item | Value used | Where |
| --- | --- | --- |
| AMH reference bands by age | **Placeholders** (20–24, 25–29, 30–34, 35–39, 40–44). Banner "Reference ranges pending clinical sign-off" shows while any placeholder is in use | `engine/amhReference.ts` |
| AMH unit conversion | 1 ng/mL = 7.14 pmol/L | `engine/amhReference.ts` |
| Semen lower reference limits (WHO laboratory manual, 6th edition, 2021, as referred to by NICE NG257 1.17.1) | Volume 1.4 mL; concentration 16 ×10⁶/mL; total number 39 ×10⁶; total motility 42 %; progressive motility 30 %; normal forms 4 % | `engine/config.ts` `SEMEN_REFERENCE` |
| LOINC / SNOMED codes | As listed in the brief | `engine/config.ts` `LOINC`, `SNOMED` |

### Thresholds and windows

| Assumption | Value | Where |
| --- | --- | --- |
| HbA1c bands (clinical lead to confirm local guidance) | Normal below 5.7 %; prediabetes 5.7–6.4 %; above 6.4 % = "above the prediabetes range" (doctor review) | `config.ts` `HBA1C` |
| Smallest HbA1c change that counts as a direction | 0.2 percentage points between first and latest result | `config.ts` `HBA1C.minChange` |
| HbA1c units accepted | "%" only; mmol/mol results are not converted and are left out | `engine/facts.ts` |
| Window for HbA1c/BMI direction and "latest value" | Last 24 months | `config.ts` `WINDOWS.metabolicTrendMonths` |
| Window for cycle pattern | Cycles that started in the last 12 months | `config.ts` `WINDOWS.cycleMonths` |
| Cycle "high variation" | Longest minus shortest cycle above 7 days | `config.ts` `CYCLE.maxVariationDays` |
| Cycle pattern measure | Median cycle length is compared with 24 and 35 days | `engine/facts.ts` |
| Counting V3 readings | Each BMI, HbA1c and fasting-glucose result counts once; a BP pair on one day counts once | `engine/facts.ts` |
| Two readings less than 6 months apart | Badge stays "Baseline only"; no direction is shown | `engine/facts.ts` `densityOf` |
| "Alcohol recorded" (R18) | More than 0 units per week | `config.ts` `ALCOHOL_UNITS_PER_WEEK_RECORDED` |

### How states are decided

| Assumption | Detail |
| --- | --- |
| A crossed threshold outranks "not enough data" | e.g. a single BMI of 36, current smoking or heat exposure gives "Needs attention" with a "Baseline only" badge, and the missing data is named as a gap (scenario 2: heat exposure, no semen analysis yet) |
| V1 never shows "Improving" | AMH is shown as in line with age, outside the range, or not enough data |
| AFC without AMH | "Not enough data", because this tool has no AFC reference range |
| AMH on hormonal contraception | A confounder note: "can lower AMH, the doctor may take this into account" (no rule, no state change) |
| Single HbA1c in or above the prediabetes range | "Needs attention" (no direction shown) |
| V4 never shows "Improving" | Not defined in the brief |
| V5 history factors for men | Undescended testes, genital surgery or injury, past chemotherapy or radiotherapy, new cancer diagnosis |
| R28 scope | Rubella status unknown **and** the woman is planning or trying |
| R05 for people already trying | Trying to conceive is treated as regular intercourse without contraception |
| R30 (new cancer) | Women only, as the cited guideline is the ESHRE *female* guideline |

### Consent

| Assumption | Detail |
| --- | --- |
| PROFILE | Age and sex only; required, cannot be withdrawn |
| HISTORY | Cancer treatment, surgery, endometriosis, family history; **also thyroid symptoms and rubella status** |
| LIFESTYLE | Smoking, second-hand smoke, alcohol, heat exposure, occupation |
| PLANS (new category) | Trying since, planning, egg freezing, assisted conception, consultation questions (caffeine, DNA fragmentation, ovulation check) |
| Absent periods | Cycle data (CYCLES) |
| Symptoms | Not a consent category. Free text is never stored or carried into an evaluation; the red-flag check runs on it at entry time whatever the consent settings, and only the resulting red flag is kept until a clinician resolves it |
| PARTNER_SHARING and CLINICIAN_SHARING | Control who may see results; they do not remove data from the person's own evaluation |
| A partner's view | Only the categories that partner shared; a partner's red flags are never shown to anyone else |

### Safety Guardrail Layer

| Assumption | Detail |
| --- | --- |
| Red-flag patterns (R35, R36), English and Arabic | Deliberately err towards false alarms: negated phrases ("no bleeding after sex") still trigger. The clinician resolves each one with "Acknowledge and refer" or "Not present (dismiss)" (Phase 3), recorded with time and user |
| R35 is sex-agnostic | Fires whatever sex is recorded |
| Medicine blocklist for AI wording | Starter list (metformin, clomifene, letrozole, …) to be extended |
| Percentages in AI wording | Only allowed straight after a number recorded in the input with unit "%" (e.g. HbA1c 5.4 %) |
| Access | Any role name matching insurer, employer, HMO, payer or underwriter is denied, even alongside other roles |
| Emergency number | 998 (as given in the brief) |

### Data layer (Phase 2)

| Assumption | Detail | Where |
| --- | --- | --- |
| Consent step for real patients | Before anything is evaluated, the clinician confirms "I have explained this tool to the patient and they agree to use:". Pre-ticked: cycles, metabolic, hormones and semen, history, lifestyle, plans **and clinician sharing**; unticked: wearables and partner sharing. Logged with user id, name, date and categories. Synthetic records show "Demo consent" | `data/records.ts` `DEFAULT_PERMITTED`, `CONSENT_STEP_CATEGORIES` |
| Synthetic consent | Anyone whose cycle data comes from a wearable has WEARABLES on; every 10th synthetic patient withdraws one category, rotating through cycles, metabolic, hormones and semen, lifestyle, history and plans | `data/synthetic/generator.ts` |
| Data-entry ranges | Plausible-value ranges on the forms only catch typing mistakes (e.g. HbA1c 3–20 %, AMH 0–30 ng/mL, cycle 10–120 days); they are not clinical thresholds | `services/validation.ts` |
| Lab effective date | `lab.ordered_at` (the history payload has no per-result date) | `data/mappers.ts` |
| Labs that are not final | Status matching PENDING, CANCEL, TECH_REVIEW, IN_PROGRESS or REJECT is skipped | `data/mappers.ts` |
| Lab values | Only plain numbers with a unit are read; "<0.03" and similar are skipped and listed | `data/mappers.ts` |
| Calculated BMI | Only from weight and height on the same vitals reading; height above 3 is read as cm, otherwise metres; results outside 10–80 are skipped | `data/mappers.ts` `mapVitals` |
| Blood glucose from vitals | Not used: the vitals form records no unit | `data/mappers.ts` |
| Demo data on a real MRN | When a scenario is loaded onto a real patient, the evaluation uses only the demo data and the demo age/sex, never a mix with real EMR values | `data/mappers.ts` `toEngineInput` |
| Demo date | Always today unless "Advance 6 months" was pressed (today + 6 months each time); "Reset demo data" returns it to today. Real patients are always evaluated at today | `data/demoRepository.ts` |
| Synthetic population | 1,000 patients. Archetype mix, value ranges, care-event rates and couple pairing (about 15 % linked) are illustrative only, tuned so the population view looks plausible (needs attention: V3 about 20–30 %, V1 about 10–20 %, V4 about a third of men; tested). **Not epidemiological** | `data/synthetic/generator.ts` |

### Partner, brief and referral (Phase 4)

| Assumption | Detail | Where |
| --- | --- | --- |
| "For your partner" steps | Rules that fire on the linked partner's **shared** categories, excluding age context (R04), red flags (R35, R36), density (R39) and consent notes (R40). A step that also fired for the person is shown once, in her own steps | `engine/index.ts` `partnerView` |
| A real partner's EMR data | In the chart, the linked partner's HIS lab history is loaded by MRN and then limited to what the partner shared. Not loaded when the partner shares no data category, and never in demo mode | `services/reproductive.service.ts`, `components/ReproductiveTab.tsx` |
| What can be shared with a partner | Only categories the person has consented to; never symptoms, red flags, clinician or partner-sharing settings | `data/demoRepository.ts` `shareable` |
| Referral summary | Needs clinician-sharing consent; one ServiceRequest per pathway chosen from Next Steps, with the created time recorded; never books an appointment | `data/demoRepository.ts`, `components/ReferralSummary.tsx` |
| Arabic in PDFs | Amiri font (SIL OFL). jsPDF bidi options `isInputVisual: false, isOutputVisual: true, isInputRtl: true, isOutputRtl: false` (checked visually; other combinations reverse letters or words). Dates on Arabic pages are written with month names. Parentheses at a line wrap can still look mirrored: native review needed | `services/pdf.ts` |

### Population view, public demo and patient view (Phase 5)

| Assumption | Detail | Where |
| --- | --- | --- |
| Who is counted | The 1,000 synthetic patients only (not demo scenarios, not real records in this browser). Each person's own consent is applied before counting | `data/demoRepository.ts` `getPopulationAggregates` |
| Minimum group size | Any group under 50 people shows "Group too small to show" and no figures at all | `services/population.service.ts` `MIN_GROUP_SIZE` |
| Age bands | 20–29, 30–34, 35–39, 40–44 | `population.service.ts` `ageBandOf` |
| Small-group demonstration | Synthetic "Clinic D" is deliberately small (about 4 % of patients, under 50 people) so the "Group too small to show" rule is visible | `data/synthetic/generator.ts` |
| Care gap | Any card needing attention and no counselling recorded | `population.service.ts` |
| Male engagement | Men with at least one semen analysis recorded | `population.service.ts` |
| Days to counselling | From the first date a card needed attention (re-evaluating the person at each of their own reading dates; from record creation when attention comes from history or lifestyle alone) to the first counselling on or after it; median across people with both | `population.service.ts` |
| Referral completion | Referrals created at least 90 days before the evaluation date; completed = completed within 90 days of creation | `population.service.ts` |
| Partner data audit | Every load of a linked partner's EMR history is logged on both records (time, user, chart, partner MRN, shared categories read, outcome) and shown in both consent activity lists | `services/reproductive.service.ts` |
| Patient view | Same engine result and consent, read-only. "What you can do" = P1 and P3 steps; "What your doctor may suggest" = P6, P4, P5, P2. Patient wording (`patient.*` keys) needs clinical review like the rest of the catalogue; citations only under "Why?" | `components/PatientView.tsx`, `i18n/` |
| Public demo | `/repro-demo` renders outside the login only when `VITE_REPRO_PUBLIC_DEMO=true`; synthetic data only; no API calls (tested) | `publicDemo.ts`, `components/DemoPage.tsx` |
