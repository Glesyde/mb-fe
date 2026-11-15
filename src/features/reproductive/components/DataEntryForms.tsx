import React, { useState } from "react";
import type { CycleRecord, HistoryItems, Observation, QuestionTopic, ReproductiveContext, SemenComponentKey, Sex } from "../engine/types";
import type { RedFlagLogEntry } from "../data/trajectoryMapper";
import { historyKeysFor } from "../engine/vectors";
import { historyFromConditions, makeObservation, makeSemenObservation } from "../data/records";
import type { Actor, ReproRecord, ReproRepository } from "../data/repository";
import { t } from "../i18n";
import { LAB_ENTRY_TYPES, SEMEN_ENTRY_FIELDS, validateAlcohol, validateCycle, validateDate, validateLab, validateSemen } from "../services/validation";
import { SYMPTOM_LABEL } from "./EmergencyPanel";
import { Button, FieldError, formatTimestamp, inputClass, Label, Modal } from "./ui";

type Tab = "cycles" | "labs" | "semen" | "lifestyle" | "history" | "plans" | "symptoms";
const TABS: { id: Tab; label: string }[] = [
  { id: "cycles", label: "Cycle records" },
  { id: "labs", label: "Lab results" },
  { id: "semen", label: "Semen analysis" },
  { id: "lifestyle", label: "Lifestyle" },
  { id: "history", label: "History" },
  { id: "plans", label: "Plans and questions" },
  { id: "symptoms", label: "Symptoms" },
];

const QUESTIONS: { id: QuestionTopic; label: string }[] = [
  { id: "CAFFEINE", label: "Asked about caffeine" },
  { id: "DNA_FRAGMENTATION", label: "Asked for a sperm DNA fragmentation test" },
  { id: "OVULATION_CHECK", label: "Wants an ovulation check" },
  { id: "EGG_FREEZING", label: "Asked about egg freezing" },
];

interface Props {
  repo: ReproRepository;
  record: ReproRecord;
  sex: Sex | null;
  asOf: string;
  actor: Actor;
  onSaved: (message: string) => void;
  onClose: () => void;
  /** What is already recorded (HIS and this browser), listed under each tab. */
  previous?: PreviousEntries;
}

export interface PreviousEntries {
  cycles: CycleRecord[];
  observations: Observation[];
  redFlags: RedFlagLogEntry[];
  /** When the HIS last saved each one-answer section. The form opens with those answers. */
  savedAt?: { lifestyle?: string | null; history?: string | null; plans?: string | null };
}

const SOURCE: Record<string, string> = { HIS: "HIS", ENTERED: "entered", WEARABLE: "wearable", DEMO: "demo" };
const RED_FLAG_LABEL: Record<string, string> = {
  R35: "Severe one-sided pelvic pain with a missed period, positive test or fainting",
  R36: "Bleeding after sex or between periods",
};
const RED_FLAG_STATUS: Record<RedFlagLogEntry["status"], string> = {
  OPEN: "Open",
  ACKNOWLEDGED_REFERRED: "Acknowledged and referred",
  DISMISSED: "Not present (dismissed)",
};
const day = (iso: string) => (iso ? formatTimestamp(iso.length > 10 ? iso : `${iso}T00:00:00`).split(",")[0] : "—");

/** "Previously recorded" list under a tab, newest first. */
const Previous: React.FC<{ title: string; empty: string; rows: { key: string; date: string; text: string; note?: string }[] }> = ({ title, empty, rows }) => (
  <section className="mt-5 border-t border-slate-100 pt-4">
    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">{title}</h3>
    {rows.length === 0 ? (
      <p className="text-xs text-slate-500">{empty}</p>
    ) : (
      <ul className="max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs">
        {rows.map((r) => (
          <li key={r.key} className="py-1.5 flex gap-3">
            <span className="font-mono text-slate-500 shrink-0 w-24">{r.date}</span>
            <span className="text-slate-700">
              {r.text}
              {r.note && <span className="text-slate-500"> · {r.note}</span>}
            </span>
          </li>
        ))}
      </ul>
    )}
  </section>
);

/** Tells the clinician the form shows the saved answers, and that unticking then saving updates them. */
const SavedNote: React.FC<{ at?: string | null }> = ({ at }) =>
  at ? (
    <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4">
      These are the answers saved on {day(at)}. Change or untick any of them, then save to update the record.
    </p>
  ) : null;

const Check: React.FC<{ checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }> = ({ checked, onChange, children }) => (
  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-brand-primary" />
    {children}
  </label>
);

export const DataEntryForms: React.FC<Props> = ({ repo, record, sex, asOf, actor, onSaved, onClose, previous }) => {
  const prev: PreviousEntries = previous ?? { cycles: record.cycles, observations: record.observations, redFlags: [] };
  const byDate = <T,>(items: T[], date: (x: T) => string) => [...items].sort((a, b) => date(b).localeCompare(date(a)));
  const labRows = byDate(
    prev.observations.filter((o) => LAB_ENTRY_TYPES.some((l) => l.key === o.code.key) && o.valueQuantity),
    (o) => o.effectiveDateTime,
  ).map((o) => ({
    key: o.id,
    date: day(o.effectiveDateTime),
    text: `${LAB_ENTRY_TYPES.find((l) => l.key === o.code.key)!.label}: ${o.valueQuantity!.value} ${o.valueQuantity!.unit}`,
    note: SOURCE[o.source],
  }));
  const semenRows = byDate(
    prev.observations.filter((o) => o.code.key === "SEMEN_ANALYSIS"),
    (o) => o.effectiveDateTime,
  ).map((o) => ({
    key: o.id,
    date: day(o.effectiveDateTime),
    text: (o.component ?? [])
      .map((c) => `${SEMEN_ENTRY_FIELDS.find((f) => f.key === c.code.key)?.label ?? c.code.key} ${c.valueQuantity.value} ${c.valueQuantity.unit}`)
      .join(", "),
    note: SOURCE[o.source],
  }));
  const cycleRows = byDate(prev.cycles, (c) => c.startDate).map((c, i) => ({
    key: `${c.startDate}-${i}`,
    date: day(c.startDate),
    text: c.lengthDays ? `Cycle started, ${c.lengthDays} days` : "Cycle started",
    note: SOURCE[c.source],
  }));
  const localFlags: RedFlagLogEntry[] = record.redFlags.map((f) => ({
    ruleId: f.ruleId,
    raisedAt: f.detectedAt,
    raisedBy: "",
    status: f.status,
    resolvedAt: f.resolvedAt ?? null,
    resolvedBy: f.resolvedBy?.name ?? null,
    note: "",
  }));
  const flagRows = byDate([...prev.redFlags, ...localFlags.filter((f) => !prev.redFlags.some((h) => h.raisedAt === f.raisedAt && h.ruleId === f.ruleId))], (f) => f.raisedAt).map(
    (f, i) => ({
      key: `${f.ruleId}-${f.raisedAt}-${i}`,
      date: day(f.raisedAt),
      text: `${f.ruleId}: ${RED_FLAG_LABEL[f.ruleId] ?? "Red flag"} — ${RED_FLAG_STATUS[f.status]}`,
      note: [f.resolvedBy && `by ${f.resolvedBy}`, f.note].filter(Boolean).join(" · ") || undefined,
    }),
  );
  const [tab, setTab] = useState<Tab>("cycles");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const id = record.patientId;

  const save = async (validation: Record<string, string>, action: () => Promise<unknown>, message: string) => {
    setErrors(validation);
    if (Object.keys(validation).length) return;
    setBusy(true);
    try {
      await action();
      onSaved(message);
    } catch (e) {
      setErrors({ form: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  // --- form state ----------------------------------------------------------------------------
  const [cycle, setCycle] = useState({ startDate: "", lengthDays: "" });
  const [lab, setLab] = useState({ key: LAB_ENTRY_TYPES[0].key, unit: LAB_ENTRY_TYPES[0].units[0].unit, value: "", date: asOf, pill: false });
  const [semen, setSemen] = useState<{ date: string; values: Partial<Record<SemenComponentKey, string>> }>({ date: asOf, values: {} });
  const [life, setLife] = useState({
    smoking: record.lifestyle?.smoking ?? "never",
    passiveSmoke: record.lifestyle?.passiveSmoke ?? false,
    alcohol: record.lifestyle?.alcoholUnitsPerWeek !== undefined ? String(record.lifestyle.alcoholUnitsPerWeek) : "",
    heatExposure: record.lifestyle?.heatExposure ?? false,
    occupation: record.lifestyle?.occupation ?? "",
    hazardousOccupation: record.lifestyle?.hazardousOccupation ?? false,
  });
  const [history, setHistory] = useState<HistoryItems>(historyFromConditions(record.conditions));
  const [plans, setPlans] = useState<ReproductiveContext>(record.reproductive);
  // Boxes ticked on a symptom check that raised a red flag still open; the text is never kept.
  const ticked = new Set(record.redFlags.filter((f) => f.status === "OPEN").flatMap((f) => f.indicators ?? []));
  const [symptoms, setSymptoms] = useState({
    text: "",
    pain: ticked.has("severeOneSidedPelvicPain"),
    missed: ticked.has("missedPeriod"),
    positive: ticked.has("positivePregnancyTest"),
    faint: ticked.has("fainting"),
    postcoital: ticked.has("bleedingAfterSex"),
    intermenstrual: ticked.has("bleedingBetweenPeriods"),
  });

  const labType = LAB_ENTRY_TYPES.find((l) => l.key === lab.key)!;
  const historyKeys = historyKeysFor(sex);

  return (
    <Modal title="Add data" onClose={onClose} wide>
      <div role="tablist" aria-label="Data type" className="flex flex-wrap gap-1 mb-5">
        {TABS.map((x) => (
          <button
            key={x.id}
            role="tab"
            type="button"
            aria-selected={tab === x.id}
            onClick={() => {
              setTab(x.id);
              setErrors({});
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
              tab === x.id ? "bg-brand-primary text-white border-brand-primary" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>
      <FieldError message={errors.form} />

      {tab === "cycles" && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="cy-start">Cycle start date</Label>
            <input id="cy-start" type="date" max={asOf} className={inputClass} value={cycle.startDate} onChange={(e) => setCycle({ ...cycle, startDate: e.target.value })} />
            <FieldError message={errors.startDate} />
          </div>
          <div>
            <Label htmlFor="cy-len">Length in days (optional)</Label>
            <input id="cy-len" inputMode="numeric" className={inputClass} value={cycle.lengthDays} onChange={(e) => setCycle({ ...cycle, lengthDays: e.target.value })} />
            <FieldError message={errors.lengthDays} />
          </div>
          <p className="text-[11px] text-slate-500 sm:col-span-2">Without a length, it is worked out from the next start date. At least 3 cycles are needed to describe the pattern.</p>
          <div className="sm:col-span-2">
            <Button
              variant="primary"
              disabled={busy}
              onClick={() =>
                save(
                  validateCycle(cycle.startDate, cycle.lengthDays, asOf),
                  () => repo.addCycles(id, [{ startDate: cycle.startDate, ...(cycle.lengthDays.trim() ? { lengthDays: Number(cycle.lengthDays) } : {}), source: "ENTERED" }], actor),
                  "Cycle record saved",
                )
              }
            >
              Save cycle
            </Button>
          </div>
          <div className="sm:col-span-2">
            <Previous title="Cycles recorded" empty="No cycles recorded yet." rows={cycleRows} />
          </div>
        </div>
      )}

      {tab === "labs" && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="lab-type">Test</Label>
            <select
              id="lab-type"
              className={inputClass}
              value={lab.key}
              onChange={(e) => {
                const next = LAB_ENTRY_TYPES.find((l) => l.key === e.target.value)!;
                setLab({ ...lab, key: next.key, unit: next.units[0].unit });
              }}
            >
              {LAB_ENTRY_TYPES.map((l) => (
                <option key={l.key} value={l.key}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="lab-unit">Unit</Label>
            <select id="lab-unit" className={inputClass} value={lab.unit} onChange={(e) => setLab({ ...lab, unit: e.target.value })}>
              {labType.units.map((u) => (
                <option key={u.unit} value={u.unit}>
                  {u.unit}
                </option>
              ))}
            </select>
            <FieldError message={errors.unit} />
          </div>
          <div>
            <Label htmlFor="lab-value">Value</Label>
            <input id="lab-value" inputMode="decimal" className={inputClass} value={lab.value} onChange={(e) => setLab({ ...lab, value: e.target.value })} />
            <FieldError message={errors.value} />
          </div>
          <div>
            <Label htmlFor="lab-date">Sample date</Label>
            <input id="lab-date" type="date" max={asOf} className={inputClass} value={lab.date} onChange={(e) => setLab({ ...lab, date: e.target.value })} />
            <FieldError message={errors.date} />
          </div>
          {lab.key === "AMH" && (
            <div className="sm:col-span-2">
              <Check checked={lab.pill} onChange={(v) => setLab({ ...lab, pill: v })}>
                Taken while using hormonal contraception
              </Check>
            </div>
          )}
          <div className="sm:col-span-2">
            <Button
              variant="primary"
              disabled={busy}
              onClick={() =>
                save(
                  validateLab(lab.key, lab.value, lab.unit, lab.date, asOf),
                  () =>
                    repo.addObservations(
                      id,
                      [makeObservation("new", lab.key, Number(lab.value), lab.unit, lab.date, "ENTERED", lab.pill ? { context: { hormonalContraception: true } } : {})],
                      actor,
                    ),
                  `${labType.label} saved`,
                )
              }
            >
              Save result
            </Button>
          </div>
          <div className="sm:col-span-2">
            <Previous title="Lab results recorded" empty="No lab results recorded yet." rows={labRows} />
          </div>
        </div>
      )}

      {tab === "semen" && (
        <div className="grid sm:grid-cols-3 gap-4">
          {SEMEN_ENTRY_FIELDS.map((f) => (
            <div key={f.key}>
              <Label htmlFor={`se-${f.key}`}>
                {f.label} ({f.unit.replace("10*6", "10⁶")})
              </Label>
              <input
                id={`se-${f.key}`}
                inputMode="decimal"
                className={inputClass}
                value={semen.values[f.key] ?? ""}
                onChange={(e) => setSemen({ ...semen, values: { ...semen.values, [f.key]: e.target.value } })}
              />
              <FieldError message={errors[f.key]} />
            </div>
          ))}
          <div>
            <Label htmlFor="se-date">Sample date</Label>
            <input id="se-date" type="date" max={asOf} className={inputClass} value={semen.date} onChange={(e) => setSemen({ ...semen, date: e.target.value })} />
            <FieldError message={errors.date} />
          </div>
          <div className="sm:col-span-3">
            <Button
              variant="primary"
              disabled={busy}
              onClick={() => {
                const values = Object.fromEntries(
                  Object.entries(semen.values).filter(([, v]) => v?.trim()).map(([k, v]) => [k, Number(v)]),
                ) as Partial<Record<SemenComponentKey, number>>;
                return save(validateSemen(semen.values, semen.date, asOf), () => repo.addObservations(id, [makeSemenObservation("new", semen.date, values, "ENTERED")], actor), "Semen analysis saved");
              }}
            >
              Save semen analysis
            </Button>
          </div>
          <div className="sm:col-span-3">
            <Previous title="Semen analyses recorded" empty="No semen analysis recorded yet." rows={semenRows} />
          </div>
        </div>
      )}

      {tab === "lifestyle" && (
        <>
          <SavedNote at={prev.savedAt?.lifestyle} />
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="li-smoke">Smoking</Label>
            <select id="li-smoke" className={inputClass} value={life.smoking} onChange={(e) => setLife({ ...life, smoking: e.target.value as "never" | "former" | "current" })}>
              <option value="never">Never</option>
              <option value="former">Former</option>
              <option value="current">Current</option>
            </select>
          </div>
          <div>
            <Label htmlFor="li-alc">Alcohol (units per week)</Label>
            <input id="li-alc" inputMode="decimal" className={inputClass} value={life.alcohol} onChange={(e) => setLife({ ...life, alcohol: e.target.value })} />
            <FieldError message={errors.alcohol} />
          </div>
          <div>
            <Label htmlFor="li-occ">Occupation</Label>
            <input id="li-occ" className={inputClass} value={life.occupation} onChange={(e) => setLife({ ...life, occupation: e.target.value })} />
          </div>
          <div className="space-y-2 pt-5">
            <Check checked={life.passiveSmoke} onChange={(v) => setLife({ ...life, passiveSmoke: v })}>Second-hand smoke at home or work</Check>
            <Check checked={life.heatExposure} onChange={(v) => setLife({ ...life, heatExposure: v })}>Regular heat exposure (e.g. at work)</Check>
            <Check checked={life.hazardousOccupation} onChange={(v) => setLife({ ...life, hazardousOccupation: v })}>Occupation may involve hazards</Check>
          </div>
          <div className="sm:col-span-2">
            <Button
              variant="primary"
              disabled={busy}
              onClick={() => {
                const alcoholError = validateAlcohol(life.alcohol);
                return save(
                  alcoholError ? { alcohol: alcoholError } : {},
                  () =>
                    repo.setLifestyle(
                      id,
                      {
                        smoking: life.smoking,
                        passiveSmoke: life.passiveSmoke,
                        ...(life.alcohol.trim() ? { alcoholUnitsPerWeek: Number(life.alcohol) } : {}),
                        heatExposure: life.heatExposure,
                        ...(life.occupation.trim() ? { occupation: life.occupation.trim() } : {}),
                        hazardousOccupation: life.hazardousOccupation,
                      },
                      actor,
                    ),
                  "Lifestyle saved",
                );
              }}
            >
              Save lifestyle
            </Button>
          </div>
        </div>
        </>
      )}

      {tab === "history" && (
        <>
          <SavedNote at={prev.savedAt?.history} />
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-2">
            {historyKeys.map((k) => (
              <Check key={k} checked={history[k] === true} onChange={(v) => setHistory({ ...history, [k]: v })}>
                {t("en", `history.${k}`)}
              </Check>
            ))}
          </div>
          <p className="text-[11px] text-slate-500">Saving with nothing ticked records that the history was asked and nothing applies.</p>
          <Button variant="primary" disabled={busy} onClick={() => save({}, () => repo.setHistory(id, history, actor), "History saved")}>
            Save history
          </Button>
        </div>
        </>
      )}

      {tab === "plans" && (
        <>
          <SavedNote at={prev.savedAt?.plans} />
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="pl-since">Trying to conceive since (optional)</Label>
            <input
              id="pl-since"
              type="date"
              max={asOf}
              className={inputClass}
              value={plans.tryingSince ?? ""}
              onChange={(e) => setPlans({ ...plans, tryingSince: e.target.value || undefined })}
            />
            <FieldError message={errors.tryingSince} />
          </div>
          <div>
            <Label htmlFor="pl-rub">Rubella status</Label>
            <select
              id="pl-rub"
              className={inputClass}
              value={plans.rubellaStatus ?? ""}
              onChange={(e) => setPlans({ ...plans, rubellaStatus: (e.target.value || undefined) as ReproductiveContext["rubellaStatus"] })}
            >
              <option value="">Not recorded</option>
              <option value="immune">Immune</option>
              <option value="susceptible">Not immune</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
          <div className="space-y-2">
            <Check checked={plans.planningPregnancy === true} onChange={(v) => setPlans({ ...plans, planningPregnancy: v })}>Planning a pregnancy</Check>
            <Check checked={plans.concerned === true} onChange={(v) => setPlans({ ...plans, concerned: v })}>Concerned about fertility</Check>
            <Check checked={plans.regularIntercourse === true} onChange={(v) => setPlans({ ...plans, regularIntercourse: v })}>Regular intercourse</Check>
            <Check checked={plans.usingContraception === true} onChange={(v) => setPlans({ ...plans, usingContraception: v })}>Using contraception</Check>
            <Check checked={plans.assistedConception === true} onChange={(v) => setPlans({ ...plans, assistedConception: v })}>In assisted conception</Check>
          </div>
          <div className="space-y-2">
            <Check checked={plans.eggFreezingConsidered === true} onChange={(v) => setPlans({ ...plans, eggFreezingConsidered: v })}>Considering egg freezing</Check>
            <Check checked={plans.eggFreezingForAge === true} onChange={(v) => setPlans({ ...plans, eggFreezingForAge: v })}>…for age reasons</Check>
            <Check checked={plans.periodsAbsent === true} onChange={(v) => setPlans({ ...plans, periodsAbsent: v })}>Periods absent</Check>
            <Check checked={plans.thyroidSymptoms === true} onChange={(v) => setPlans({ ...plans, thyroidSymptoms: v })}>Symptoms of thyroid disease</Check>
          </div>
          <fieldset className="sm:col-span-2 space-y-2">
            <legend className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 mb-1">Questions raised</legend>
            {QUESTIONS.map((q) => (
              <Check
                key={q.id}
                checked={plans.questions?.includes(q.id) === true}
                onChange={(v) => setPlans({ ...plans, questions: v ? [...(plans.questions ?? []), q.id] : (plans.questions ?? []).filter((x) => x !== q.id) })}
              >
                {q.label}
              </Check>
            ))}
          </fieldset>
          <div className="sm:col-span-2">
            <Button
              variant="primary"
              disabled={busy}
              onClick={() => {
                const e = plans.tryingSince ? validateDate(plans.tryingSince, asOf) : null;
                return save(e ? { tryingSince: e } : {}, () => repo.setReproductiveContext(id, plans, actor), "Plans and questions saved");
              }}
            >
              Save plans
            </Button>
          </div>
        </div>
        </>
      )}

      {tab === "symptoms" && (
        <div className="space-y-4">
          <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3">
            Symptoms are checked for red flags straight away, whatever the consent settings. The text is <strong>not stored</strong>; only a red flag, if
            found, is kept until a clinician resolves it.
          </p>
          {ticked.size > 0 && (
            <p className="text-xs text-red-800 bg-red-50 border border-red-200 rounded-xl p-3">
              The ticked boxes raised a red flag that is still open. Unticking them and checking again does not close it: use "Acknowledge and refer" or
              "Not present (dismiss)" on the red panel, so your decision is recorded.
            </p>
          )}
          <div>
            <Label htmlFor="sy-text">Symptoms in the patient's words (optional)</Label>
            <textarea id="sy-text" rows={3} className={inputClass} value={symptoms.text} onChange={(e) => setSymptoms({ ...symptoms, text: e.target.value })} />
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            <Check checked={symptoms.pain} onChange={(v) => setSymptoms({ ...symptoms, pain: v })}>Severe, sudden one-sided pelvic pain</Check>
            <Check checked={symptoms.missed} onChange={(v) => setSymptoms({ ...symptoms, missed: v })}>Missed period</Check>
            <Check checked={symptoms.positive} onChange={(v) => setSymptoms({ ...symptoms, positive: v })}>Positive pregnancy test</Check>
            <Check checked={symptoms.faint} onChange={(v) => setSymptoms({ ...symptoms, faint: v })}>Fainting</Check>
            <Check checked={symptoms.postcoital} onChange={(v) => setSymptoms({ ...symptoms, postcoital: v })}>Bleeding after sex</Check>
            <Check checked={symptoms.intermenstrual} onChange={(v) => setSymptoms({ ...symptoms, intermenstrual: v })}>Bleeding between periods</Check>
          </div>
          <Button
            variant="primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const { check, warning } = await repo.submitSymptoms(
                  id,
                  {
                    freeText: symptoms.text,
                    severeOneSidedPelvicPain: symptoms.pain,
                    missedPeriod: symptoms.missed,
                    positivePregnancyTest: symptoms.positive,
                    fainting: symptoms.faint,
                    bleedingAfterSex: symptoms.postcoital,
                    bleedingBetweenPeriods: symptoms.intermenstrual,
                  },
                  actor,
                );
                const blocked = check.blocked.map((b) => t("en", `guardrail.blocked.${b}`)).join(" ");
                setSymptoms({ text: "", pain: false, missed: false, positive: false, faint: false, postcoital: false, intermenstrual: false });
                onSaved(warning ?? (blocked ? `Symptoms checked. ${blocked}` : "Symptoms checked; the text was not stored"));
              } catch (e) {
                setErrors({ form: e instanceof Error ? e.message : String(e) });
              } finally {
                setBusy(false);
              }
            }}
          >
            Check symptoms
          </Button>
          <Previous title="Red flags recorded (symptom text is never stored)" empty="No red flags recorded." rows={flagRows} />
        </div>
      )}
    </Modal>
  );
};
