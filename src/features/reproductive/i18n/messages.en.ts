// English message catalogue. The engine returns these keys; it never builds sentences.
// Wording rules: calm, short sentences; what can be changed first; evidence and its limit
// together. Explanation blocks end with "common.doctorDecides" (added once per block, not per line).
// Placeholders such as {value} are filled by the template explainer.

export const messagesEn = {
  // --- Labels --------------------------------------------------------------------------------
  "safety.layerName": "Safety Guardrail Layer",
  "vector.V1.title": "Reserve in age context",
  "vector.V2.title": "Cycle and ovulation",
  "vector.V3.title": "Metabolic and lifestyle",
  "vector.V4.title": "Male factor",
  "vector.V5.title": "History-based factors",
  "state.IMPROVING": "Improving",
  "state.STABLE": "Stable",
  "state.V1.STABLE": "In line with age",
  "state.NEEDS_ATTENTION": "Needs attention",
  "state.NOT_ENOUGH_DATA": "Not enough data",
  "state.DATA_WITHDRAWN": "Data withdrawn",
  "density.NONE": "No readings",
  "density.BASELINE_ONLY": "Baseline only",
  "density.TREND": "Trend",
  "density.ESTABLISHED": "Established trend",
  "pathway.P1": "Health optimisation",
  "pathway.P2": "Targeted testing",
  "pathway.P3": "Preconception counselling",
  "pathway.P4": "Fertility-preservation discussion",
  "pathway.P5": "Specialist referral",
  "pathway.P6": "Urgent care",
  "urgency.INFO": "For information",
  "urgency.ROUTINE": "Routine",
  "urgency.URGENT": "Urgent",
  "urgency.EMERGENCY": "Emergency",
  "consent.category.PROFILE": "Age and sex",
  "consent.category.HISTORY": "Medical history",
  "consent.category.LIFESTYLE": "Lifestyle",
  "consent.category.PLANS": "Pregnancy plans and questions",
  "consent.category.CYCLES": "Cycle records",
  "consent.category.METABOLIC": "Metabolic tests",
  "consent.category.HORMONES_SEMEN": "Hormones and semen",
  "consent.category.WEARABLES": "Wearables",
  "consent.category.PARTNER_SHARING": "Partner sharing",
  "consent.category.CLINICIAN_SHARING": "Clinician sharing",
  "input.AGE": "Age",
  "input.AMH": "AMH",
  "input.AFC": "AFC",
  "input.CYCLES": "Cycle records",
  "input.PERIODS_ABSENT": "Absent periods",
  "input.BMI": "BMI",
  "input.HBA1C": "HbA1c",
  "input.FASTING_GLUCOSE": "Fasting glucose",
  "input.BP": "Blood pressure",
  "input.SMOKING": "Smoking",
  "input.ALCOHOL": "Alcohol",
  "input.SEMEN_ANALYSIS": "Semen analysis",
  "input.HEAT_EXPOSURE": "Heat exposure",
  "input.OCCUPATION": "Occupation",
  "input.HISTORY": "History",

  // --- Common --------------------------------------------------------------------------------
  "common.doctorDecides": "Your doctor decides.",
  "common.decisionSupport": "Decision support and education only. This is not a diagnosis.",
  "common.noSingleNumber": "This view shows separate trends. It does not turn fertility into a single number.",
  "common.trendNeedsTwo":
    "One result cannot show change over time. At least two results, at least 6 months apart, are needed to show a trend.",
  "common.dataWithdrawn": "Consent for this data was withdrawn. It is not used in any calculation.",
  "common.referencePending": "Reference ranges pending clinical sign-off",
  "common.emergency":
    "These symptoms need urgent medical care. Call 998 for an ambulance or go to the nearest emergency department now.",
  "explain.templateLabel": "Standard template wording",
  "nextSteps.partnerGroup": "For your partner",
  "nextSteps.partnerNote": "From data your partner chose to share with you.",
  "brief.title": "Reproductive health discussion brief",
  "brief.synthetic": "Demo – synthetic data. Not a real patient.",
  "brief.date": "Date: {date}",
  "brief.person": "{sex}, {age}",
  "brief.summary": "Summary",
  "brief.trends": "Trends",
  "brief.discussion": "Points to discuss",
  "brief.missing": "Missing tests and information",
  "brief.citations": "Sources",
  "brief.latest": "Latest: {value} {unit} ({date}).",
  "brief.noneMissing": "Nothing missing for the cards shown.",
  "brief.noDiscussion": "No referral, test or discussion is suggested by the rules today.",
  "brief.footer": "Confidential health summary for the patient and their doctor. Not for employment or insurance decisions.",
  "sex.female": "Female",
  "sex.male": "Male",
  "sex.unknown": "Sex not recorded",
  "age.years": "{age} years",
  "age.unknown": "Age not recorded",
  "referral.title": "Referral summary",
  "referral.notBooking": "This summary does not book an appointment and does not prescribe medication.",
  "referral.pathway": "Pathway: {pathway}",
  "referral.created": "Created: {time}",
  "referral.reasons": "Reasons",
  "referral.context": "Current trajectory states",
  "explain.standardWording": "Standard wording shown",

  // --- V1 Reserve ----------------------------------------------------------------------------
  "v1.inLine":
    "AMH is in line with expected levels for this age. AMH reflects the number of eggs remaining. It does not measure egg quality and does not predict natural pregnancy (NICE NG257 1.18.3).",
  "v1.belowBand":
    "AMH is below the reference range for this age. AMH reflects the number of eggs remaining. It does not measure egg quality and does not predict natural pregnancy (NICE NG257 1.18.3).",
  "v1.aboveBand":
    "AMH is above the reference range for this age. AMH reflects the number of eggs remaining. It does not predict natural pregnancy (NICE NG257 1.18.3).",
  "v1.noRecentData": "No AMH or AFC result in the last 24 months.",
  "v1.afcOnly": "Only an AFC result is available. This tool has no AFC reference range, so it is shown without a comparison.",
  "v1.noBandForAge": "No AMH reference range is set for this age.",
  "v1.noAge": "Age is not recorded, so AMH cannot be compared with an age range.",
  "v1.confounder.hormonalContraception":
    "This AMH was measured while using hormonal contraception, which can lower AMH. The doctor may take this into account.",

  // --- V2 Cycles -----------------------------------------------------------------------------
  "v2.regular": "Cycles are regular, between 24 and 35 days.",
  "v2.short": "Cycles are usually shorter than 24 days.",
  "v2.long": "Cycles are usually longer than 35 days.",
  "v2.variable": "Cycle length changes a lot from one cycle to the next.",
  "v2.absent": "Periods are recorded as absent.",
  "v2.fewCycles": "Fewer than 3 cycles are recorded. At least 3 are needed to describe the pattern.",

  // --- V3 Metabolic and lifestyle ------------------------------------------------------------
  "v3.bmiHigh": "BMI is 30 or over. Weight is one of the things that can be changed.",
  "v3.bmiLow": "BMI is under 18.5. Weight is one of the things that can be changed.",
  "v3.hba1cImproving": "HbA1c has come down across results at least 6 months apart.",
  "v3.hba1cRising": "HbA1c has gone up into the prediabetes range.",
  "v3.hba1cPrediabetes": "The latest HbA1c is in the prediabetes range. One result cannot show a direction.",
  "v3.hba1cAbove": "The latest HbA1c is above the prediabetes range. A doctor review is suggested.",
  "v3.smoking": "Smoking is recorded. Stopping smoking is one of the things that can be changed.",
  "v3.fewReadings": "Fewer than 2 metabolic readings in the last 12 months.",
  "v3.stable": "Recorded metabolic readings show no change that needs attention.",

  // --- V4 Male factor ------------------------------------------------------------------------
  "v4.withinReference": "The latest semen analysis is within WHO reference values.",
  "v4.belowReference": "The latest semen analysis has one or more values below WHO reference values.",
  "v4.noSperm": "No sperm were seen in the latest analysis.",
  "v4.heat": "Regular heat exposure is recorded. This is one of the things that can be changed.",
  "v4.smoking": "Smoking is recorded. Stopping smoking is one of the things that can be changed.",
  "v4.noSemen": "No semen analysis is recorded yet.",
  "v4.fromPartner": "Shown from the linked partner's shared data only.",
  "v4.partnerNotShared": "The linked partner has not shared the data this card needs.",

  // --- V5 History ----------------------------------------------------------------------------
  "v5.riskPresent": "History includes factors that can affect reproductive health.",
  "v5.none": "No history risk factors are recorded.",
  "v5.notFilled": "History has not been filled in.",
  "history.newCancerDiagnosis": "New cancer diagnosis",
  "history.pastChemoOrRadiotherapy": "Past chemotherapy or radiotherapy",
  "history.pastOvarianSurgery": "Past ovarian surgery",
  "history.plannedOvarianSurgery": "Planned ovarian surgery",
  "history.pastPelvicSurgery": "Past pelvic surgery",
  "history.pastPelvicInfection": "Past pelvic infection",
  "history.pastEctopicPregnancy": "Past ectopic pregnancy",
  "history.endometriosis": "Endometriosis",
  "history.familyEarlyMenopause": "Family history of early menopause",
  "history.geneticPoiRisk": "Genetic risk of premature ovarian insufficiency",
  "history.undescendedTestes": "Undescended testes",
  "history.genitalSurgeryOrTrauma": "Genital surgery or injury",

  // --- Gaps ----------------------------------------------------------------------------------
  "gap.noHormones": "No hormone tests shared.",
  "gap.noCycles": "No cycle records shared.",
  "gap.noMetabolic": "No metabolic tests shared.",
  "gap.noSemen": "No semen analysis shared.",
  "gap.noHistory": "No history shared.",
  "gap.noAge": "Age not recorded.",
  "gap.noSex": "Sex not recorded, so some cards are not shown.",
  "gap.withdrawn.CYCLES": "Consent for cycle records was withdrawn.",
  "gap.withdrawn.METABOLIC": "Consent for metabolic tests was withdrawn.",
  "gap.withdrawn.HORMONES_SEMEN": "Consent for hormones and semen data was withdrawn.",
  "gap.withdrawn.WEARABLES": "Consent for wearable data was withdrawn.",
  "gap.withdrawn.HISTORY": "Consent for medical history was withdrawn.",
  "gap.withdrawn.LIFESTYLE": "Consent for lifestyle data was withdrawn.",
  "gap.withdrawn.PLANS": "Consent for pregnancy plans and questions was withdrawn.",
  "gap.partnerNotShared.HORMONES_SEMEN": "The partner has not shared hormones and semen data.",
  "gap.partnerNotShared.LIFESTYLE": "The partner has not shared lifestyle data.",

  // --- Rules ---------------------------------------------------------------------------------
  "rule.R01":
    "AMH gives context about the number of eggs remaining. It is not used to predict natural pregnancy (NICE NG257 1.18.3). In a study of women aged 30 to 44 without known fertility problems, AMH did not predict natural conception (Steiner, JAMA 2017).",
  "rule.R02":
    "AMH and AFC can help predict how the ovaries may respond to stimulation in assisted conception (NICE NG257 1.18.4). A specialist discussion can be offered.",
  "rule.R03": "Basal FSH is not used to predict ovarian response or the outcome of IVF (NICE NG257 1.18.5).",
  "rule.R04": "Female fertility declines with age. Male fertility also declines with age, to a lesser extent (NICE NG257 1.4.3).",
  // The only message allowed a percentage: a NICE population figure, never a personal prediction.
  "rule.R05":
    "For couples in general, not a prediction for any one person: over 80% of couples where the woman is under 40, who have regular sex without contraception, conceive within 1 year. About half of the rest conceive in the second year (NICE NG257 1.4.1).",
  "rule.R06":
    "The woman is 36 or over and has been trying for 6 months or more. An earlier specialist assessment can be discussed (NICE NG257 1.16.8).",
  "rule.R07": "Trying for 12 months or more. Assessment of both partners can be discussed (NICE NG257 section 1.16).",
  "rule.R08":
    "A past pelvic infection, ectopic pregnancy, endometriosis or pelvic surgery is recorded. An earlier specialist assessment can be discussed (NICE NG257 section 1.16).",
  "rule.R09":
    "Undescended testes, genital surgery or injury, or past chemotherapy or radiotherapy is recorded. An earlier assessment and a semen analysis can be discussed (NICE NG257 section 1.16).",
  "rule.R10":
    "Cycles longer than 35 days or absent periods are recorded. Tests to check ovulation and a specialist assessment can be discussed (NICE NG257 1.18.6, section 1.16).",
  "rule.R11": "Regular monthly cycles usually mean ovulation is happening (NICE NG257 1.18.6).",
  "rule.R12":
    "Cycles are irregular and an ovulation check is wanted. A mid-luteal progesterone test can be discussed (NICE NG257 1.18.7).",
  "rule.R13":
    "With a BMI of 30 or over, it is likely to take longer to conceive. If ovulation is not happening, losing weight is likely to help (NICE NG257 1.9.1).",
  "rule.R14":
    "With a BMI of 30 or over and planning a pregnancy, a group programme with exercise and diet advice can help (NICE NG257 1.9.2).",
  "rule.R15": "BMI is under 18.5 and periods are irregular or absent. Advice on gaining weight can help (NICE NG257 1.10.1).",
  "rule.R16": "Smoking is likely to reduce fertility. Support to stop smoking can be offered (NICE NG257 1.7.1).",
  "rule.R17":
    "Smoking or second-hand smoke is recorded. Support to stop smoking and a smoke-free home can help (NICE NG257 section 1.7).",
  "rule.R18": "Alcohol use is recorded. Advice on alcohol can be offered (NICE NG257 section 1.6).",
  "rule.R19": "There is no consistent evidence linking caffeine with fertility problems (NICE NG257 1.8.1).",
  "rule.R20":
    "Raised scrotal temperature is linked with lower semen quality. Whether loose underwear helps is uncertain (NICE NG257 1.11.1).",
  "rule.R21": "Some jobs can affect fertility. Ask about occupation and offer occupational health advice (NICE NG257 1.12.1).",
  "rule.R22": "Semen analysis results are compared with WHO reference values (NICE NG257 1.17.1).",
  "rule.R23":
    "One semen analysis is below WHO reference values. A repeat test, ideally 3 months later, can be discussed (NICE NG257 1.17.3 to 1.17.4).",
  "rule.R24":
    "Two or more semen analyses are below WHO reference values. A physical examination can be discussed, and testosterone and gonadotrophin blood tests can be considered (NICE NG257 1.17.5).",
  "rule.R25": "No sperm were seen on repeat analysis. Referral to an andrology specialist can be discussed (NICE NG257 section 1.17).",
  "rule.R26": "A sperm DNA fragmentation test is not recommended (NICE NG257 1.17.6).",
  "rule.R27":
    "Symptoms of thyroid disease are recorded. A thyroid test can be offered. Routine thyroid testing without symptoms is not recommended (NICE NG257 1.18.12).",
  "rule.R28":
    "Rubella status is not known. A rubella test can be offered, with vaccination if not immune. Pregnancy should be avoided for 1 month after vaccination (NICE NG257 1.20.1, 1.20.2).",
  "rule.R29":
    "When planning a pregnancy, folic acid advice can be given. The dose follows the NICE maternal and child nutrition guideline (NICE NG257 1.15.1).",
  "rule.R30":
    "A new cancer diagnosis is recorded before chemotherapy or pelvic radiotherapy. An urgent discussion about fertility preservation can be offered before treatment starts (ESHRE female fertility preservation guideline).",
  "rule.R31":
    "Ovarian surgery is planned. A fertility-preservation discussion can be offered before surgery (ESHRE female fertility preservation guideline).",
  "rule.R32":
    "A family history of early menopause or a genetic risk of premature ovarian insufficiency is recorded. An earlier planning discussion can be offered (ESHRE female fertility preservation guideline).",
  "rule.R33":
    "Egg freezing for age reasons is being considered. Education and a specialist discussion can be offered (ESHRE female fertility preservation guideline).",
  "rule.R34":
    "AMH is below the range for this age, cycles are regular and there is no current attempt to conceive. In a study of women aged 30 to 44 without known fertility problems, AMH did not predict natural conception (Steiner, JAMA 2017; NICE NG257 1.18.3). A planning discussion can be offered.",
  "rule.R36": "Bleeding after sex or between periods needs an urgent gynaecology assessment.",
  "rule.R37": "HbA1c is coming down across results at least 6 months apart.",
  "rule.R38": "HbA1c has risen into the prediabetes range. Lifestyle support and a doctor review are suggested.",

  // --- Safety Guardrail Layer ----------------------------------------------------------------
  "guardrail.blocked.FERTILITY_SCORE":
    "This tool does not turn fertility into a single number. It shows separate trends to discuss with your doctor.",
  "guardrail.blocked.DIAGNOSIS": "This tool cannot make a diagnosis. It supports the conversation with your doctor.",
  "guardrail.blocked.PRESCRIBING": "This tool does not recommend or prescribe medicines. Your doctor decides about any treatment.",

  // --- Glossary (hover/tap definitions) ------------------------------------------------------
  "glossary.AMH": "Anti-Müllerian hormone: made by small follicles in the ovaries. It reflects the number of eggs remaining. It does not measure egg quality and does not predict natural pregnancy.",
  "glossary.AFC": "Antral follicle count: the number of small follicles seen on an ultrasound scan of the ovaries.",
  "glossary.FSH": "Follicle-stimulating hormone: helps eggs develop. A basal FSH result is not used to predict response to IVF.",
  "glossary.SEMEN_ANALYSIS": "A laboratory test of a semen sample: volume, sperm number, movement and shape, compared with WHO reference values.",
  "glossary.OVARIAN_RESERVE": "The number of eggs remaining in the ovaries. It does not measure egg quality.",
  "glossary.PCOS": "Polycystic ovary syndrome: a common hormone condition that can cause irregular periods. Only a doctor can confirm it.",
  "glossary.HBA1C": "A blood test that shows average blood sugar over the last 2 to 3 months.",
  "glossary.BMI": "Body mass index: weight in kilograms divided by height in metres squared.",
  "glossary.ENDOMETRIOSIS": "A condition where tissue similar to the lining of the womb grows outside the womb.",
  "glossary.OVULATION": "The release of an egg from an ovary, usually once in each menstrual cycle.",
  "glossary.MID_LUTEAL_PROGESTERONE": "A blood test about 7 days before the next expected period, used to check whether ovulation happened.",
  "glossary.WHO_REFERENCE": "Lower limits for semen test results from the World Health Organization laboratory manual. A result below them is a reason to look further, not a diagnosis.",
  "glossary.FERTILITY_PRESERVATION": "Freezing eggs, embryos or sperm, or protecting the ovaries, before a treatment that may affect fertility.",
  "glossary.POI": "Premature ovarian insufficiency: the ovaries stop working normally before the age of 40.",
  "glossary.PREDIABETES": "Blood sugar higher than normal but below the diabetes range. Lifestyle changes can often bring it down.",

  // --- Patient view (read-only, simpler wording, no rule IDs) ---------------------------------
  "patient.title": "Your reproductive health",
  "patient.intro": "This page shows how your results are changing over time. It does not give a score or a diagnosis.",
  "patient.whatYouCanDo": "What you can do",
  "patient.doctorMaySuggest": "What your doctor may suggest",
  "patient.yourResults": "Your results",
  "patient.nothingToChange": "Nothing specific to change right now. Keep up your usual check-ups.",
  "patient.nothingToSuggest": "No extra tests or appointments are suggested right now.",
  "patient.oneResult": "Only one result so far, so no change over time can be shown yet.",
  "patient.readOnly": "This page is for reading only. Talk to your care team about any questions.",
  "patient.tellTeam": "Tell your care team about these symptoms straight away.",
  "patient.why": "Why?",
  "patient.sources": "Sources",
  "patient.vector.V1": "Egg supply for your age",
  "patient.vector.V2": "Your cycle",
  "patient.vector.V3": "Weight, blood sugar and lifestyle",
  "patient.vector.V4": "Sperm health",
  "patient.vector.V5": "Health history",
  "patient.rule.R06": "Because you are 36 or over and have been trying for 6 months, your doctor may suggest seeing a specialist sooner.",
  "patient.rule.R07": "You have been trying for a year or more. Your doctor may suggest checks for both partners.",
  "patient.rule.R08": "Because of your past pelvic infection, ectopic pregnancy, endometriosis or pelvic surgery, your doctor may suggest seeing a specialist sooner.",
  "patient.rule.R09": "Because of your health history, your doctor may suggest an earlier check and a semen test.",
  "patient.rule.R10": "Your cycles are long or your periods have stopped. Your doctor may suggest tests to check ovulation and a specialist visit.",
  "patient.rule.R12": "Your doctor may suggest a blood test about a week before your next period to check ovulation.",
  "patient.rule.R13": "Losing some weight can help. With a BMI of 30 or more, it can take longer to get pregnant.",
  "patient.rule.R14": "A group programme with exercise and healthy eating can help.",
  "patient.rule.R15": "Gaining some weight can help your periods become regular.",
  "patient.rule.R16": "Stopping smoking is one of the best things you can do. Support is available.",
  "patient.rule.R17": "Stopping smoking, and keeping your home smoke-free, can help.",
  "patient.rule.R18": "Cutting down on alcohol can help. Ask for advice if you would like it.",
  "patient.rule.R20": "Keeping the scrotum cool may help, so avoid regular heat where you can. It is not certain that loose underwear helps.",
  "patient.rule.R21": "Some jobs can affect fertility. Ask about advice for your workplace.",
  "patient.rule.R23": "One semen test was below the usual values. A repeat test, ideally in about 3 months, is usually suggested.",
  "patient.rule.R24": "Two semen tests were below the usual values. Your doctor may suggest an examination and blood tests.",
  "patient.rule.R25": "No sperm were seen in two tests. Your doctor may suggest seeing a specialist in male reproductive health.",
  "patient.rule.R27": "You mentioned symptoms that can come from the thyroid. Your doctor may offer a thyroid blood test.",
  "patient.rule.R28": "Your protection against rubella (German measles) is not known. A blood test can check it, with a vaccine if needed. Avoid pregnancy for 1 month after the vaccine.",
  "patient.rule.R29": "If you are planning a pregnancy, ask your doctor about folic acid.",
  "patient.rule.R30": "Before your cancer treatment starts, ask your care team about ways to protect your fertility. Please do this soon.",
  "patient.rule.R31": "Before your planned ovarian surgery, ask about ways to protect your future fertility.",
  "patient.rule.R32": "Because of your family history, you may want to plan earlier. Your doctor can talk this through with you.",
  "patient.rule.R33": "If you are thinking about freezing eggs, your doctor can explain the options and refer you to a specialist.",
  "patient.rule.R36": "Bleeding after sex or between periods needs an urgent check by a gynaecologist.",
  "patient.rule.R38": "Your blood sugar test (HbA1c) has gone up. Healthy eating and activity can help, and your doctor will review it.",

  // --- Card labels ---
  "card.partnerData": "Partner's shared data",
  "card.someWithdrawn": "Some data withdrawn",
  "card.bmiCalculated": "BMI calculated",
  "card.noReadings": "No readings to plot",
  "card.shaded": "shaded: reference range",
  "card.dashed": "dashed: single baseline, no direction",
  "card.underSixMonths": "under 6 months of readings, no direction",
} as const;

export type MessageKey = keyof typeof messagesEn;

/** Keys allowed to contain a percentage (population figures with their citation). */
export const PERCENT_ALLOWED_KEYS: MessageKey[] = ["rule.R05"];
