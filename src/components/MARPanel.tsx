"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  X, Loader2, Clock, CheckCircle2, AlertTriangle, Pill,
  ClipboardList, History, ChevronDown, ChevronUp, Plus, LayoutGrid, ChevronLeft, ChevronRight
} from "lucide-react";
import { nursingService } from "../services/nursing.service";
import { useNotification } from "../context/NotificationContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DueMedication {
  prescription_id: number;
  drug_name: string;
  drug_id?: number;
  dosage: string;
  frequency: string;
  route: string;
  instructions: string | null;
  dispense_status: string;
  prescription_status?: string;
  prescribed_by: string;
  prescribed_at: string | null;
  last_admin_id: number | null;
  last_admin_status: string | null;
  last_administered_at: string | null;
  last_administered_by: string | null;
  last_administered_by_name: string | null;
  due_status: string;
  duration?: number;
  duration_unit?: string;
  is_patient_own_medication?: number | boolean;
}

interface AdminHistory {
  id: number;
  prescription_id: number;
  drug_id: number;
  drug_name: string;
  dosage: string;
  dose: string;
  route: string;
  frequency: string;
  diluent: string | null;
  rate_ml_hr: number | null;
  access_site: string | null;
  batch_number: string | null;
  administered_at: string;
  administered_by_name: string;
  status: string;
  remarks: string | null;
}

interface MarGridHeader {
  date: string;
  display: string;
  day_name: string;
}

interface MarGridSlot {
  status: string;
  scheduled_label: string;
  actual_label: string | null;
  admin_id: number | null;
  remarks: string | null;
  is_overdue: boolean;
}

interface MarGridRow {
  prescription_id: number;
  drug_id?: number;
  drug_name: string;
  dosage: string;
  frequency: string;
  route: string;
  instructions: string | null;
  dispense_status: string;
  prescribed_by: string;
  prescribed_at: string | null;
  duration?: number;
  duration_unit?: string;
  dosage_info: string;
  start_date: string;
  prescription_status: string;
  due_status: string;
  days: Record<string, MarGridSlot[]>;
}

interface MARPanelProps {
  encounterNumber: string;
  onClose?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getLocalTimestamp = (date: Date = new Date()): string => {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const getTodayDateString = (): string => {
  const date = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const toInputDatetime = (dt: string): string => {
  if (!dt) return "";
  return dt.replace(" ", "T").slice(0, 16);
};

const fromInputDatetime = (val: string): string => {
  if (!val) return "";
  return val.replace("T", " ") + ":00";
};

const fmtDt = (dt: string) => {
  if (!dt) return "—";
  try {
    return new Date(dt.replace(" ", "T")).toLocaleString("en-GB", {
      day: "2-digit", month: "2-digit", year: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return dt; }
};

const parseDosageInfo = (info: string): { dosage: string; frequency: string; route: string } => {
  const routeMatch = info.match(/\(([^)]+)\)\s*\$/);
  const route = routeMatch ? routeMatch[1] : "";
  const withoutRoute = info.replace(/\([^)]+\)\s*\$/, "").trim();
  const [dosage = "", frequency = ""] = withoutRoute.split(" - ").map(s => s.trim());
  return { dosage, frequency, route };
};

const routeConfig = (route: string): {
  showVolume: boolean; showDiluent: boolean; showRate: boolean;
  showFlush: boolean; showAccessSite: boolean; showBatch: boolean;
  label: string; color: string; bg: string;
} => {
  const r = (route || "").toUpperCase();
  if (r === "IV")      return { showVolume: true,  showDiluent: true,  showRate: true,  showFlush: true,  showAccessSite: true,  showBatch: false, label: "IV Infusion",     color: "#1d4ed8", bg: "#eff6ff" };
  if (r === "SC" || r === "IM") return { showVolume: true,  showDiluent: false, showRate: false, showFlush: false, showAccessSite: true,  showBatch: false, label: r + " Injection",  color: "#7c3aed", bg: "#f5f3ff" };
  if (r === "PO" || r === "SL") return { showVolume: false, showDiluent: false, showRate: false, showFlush: false, showAccessSite: false, showBatch: false, label: "Oral",             color: "#0f766e", bg: "#f0fdfa" };
  if (r === "BLOOD")   return { showVolume: true,  showDiluent: false, showRate: false, showFlush: false, showAccessSite: true,  showBatch: true,  label: "Blood Product",   color: "#b91c1c", bg: "#fef2f2" };
  if (r === "NG" || r === "PEG") return { showVolume: true, showDiluent: false, showRate: false, showFlush: false, showAccessSite: false, showBatch: false, label: "NG/PEG Feed",    color: "#b45309", bg: "#fefce8" };
  return { showVolume: true, showDiluent: true, showRate: false, showFlush: false, showAccessSite: false, showBatch: false, label: route, color: "#1c3d7a", bg: "#f8f9fc" };
};

// ─── Shared Styles ────────────────────────────────────────────────────────────

const lbl: React.CSSProperties = {
  display: "block", fontSize: "13px", fontWeight: 700, color: "#6b7a9a",
  textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "5px",
};
const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid #d0d6e6",
  borderRadius: "9px", fontSize: "16px", fontWeight: 500, color: "#1c2b4a",
  background: "#f8f9fc", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};
const inpSm = (borderColor: string): React.CSSProperties => ({
  ...inp, background: "#fff", border: `1px solid ${borderColor}`,
  padding: "8px 10px", fontSize: "15px", borderRadius: "8px",
});
const secBtn: React.CSSProperties = {
  flex: "0 0 auto", padding: "8px 16px", border: "1px solid #d0d6e6",
  borderRadius: "9px", fontSize: "15px", fontWeight: 700, color: "#4a5568",
  background: "#fff", cursor: "pointer", whiteSpace: "nowrap",
};
const primBtn = (bg: string): React.CSSProperties => ({
  flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center",
  gap: "6px", padding: "8px 18px", border: "none", borderRadius: "9px",
  fontSize: "15px", fontWeight: 700, color: "#fff", background: bg, cursor: "pointer",
  whiteSpace: "nowrap",
});

// ─── Status badge ─────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: string; size?: "sm" | "xs" }> = ({ status, size = "sm" }) => {
  const s = (status || "").toUpperCase();
  const map: Record<string, { bg: string; color: string; dot: string }> = {
    GIVEN:      { bg: "#dcfce7", color: "#166534", dot: "#16a34a" },
    HELD:       { bg: "#fef9c3", color: "#854d0e", dot: "#ca8a04" },
    REFUSED:    { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626" },
    WASTED:     { bg: "#fee2e2", color: "#991b1b", dot: "#9333ea" },
    MISSED:     { bg: "#fee2e2", color: "#991b1b", dot: "#ea580c" },
    OMITTED:    { bg: "#f3f4f6", color: "#374151", dot: "#9ca3af" },
    DISPENSED:  { bg: "#dcfce7", color: "#166534", dot: "#16a34a" },
    PENDING:    { bg: "#fef9c3", color: "#854d0e", dot: "#ca8a04" },
    DUE:        { bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
    OVERDUE:    { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626" },
    STOPPED:    { bg: "#f1f5f9", color: "#64748b", dot: "#94a3b8" },
    CANCELLED:  { bg: "#f1f5f9", color: "#64748b", dot: "#94a3b8" },
    PATIENT_OWN:{ bg: "#e0e7ff", color: "#3730a3", dot: "#4f46e5" },
  };
  const cfg = map[s] || { bg: "#f3f4f6", color: "#374151", dot: "#9ca3af" };
  const fs = size === "xs" ? "12px" : "13px";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: cfg.bg, color: cfg.color, fontSize: fs, fontWeight: 800, textTransform: "uppercase", padding: "3px 8px", borderRadius: "20px", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>
      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: cfg.dot, display: "inline-block", flexShrink: 0 }} />
      {status}
    </span>
  );
};

const RouteBadge: React.FC<{ route: string }> = ({ route }) => (
  <span style={{ display: "inline-block", background: "#ccfbf1", color: "#0f766e", fontSize: "12px", fontWeight: 800, textTransform: "uppercase", padding: "3px 8px", borderRadius: "20px", letterSpacing: "0.5px" }}>
    {route}
  </span>
);

const slotColors = (slot: MarGridSlot, isInactive: boolean): { bg: string; color: string; border: string } => {
  if (isInactive) return { bg: "#f8fafc", color: "#94a3b8", border: "#e2e8f0" };
  const s = (slot.status || "").toLowerCase();
  
  if (s === "given" || s === "administered") return { bg: "#dcfce7", color: "#166534", border: "#86efac" };
  if (s === "refused" || slot.is_overdue) return { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" };
  if (s === "missed") return { bg: "#ffedd5", color: "#9a3412", border: "#fdba74" };
  if (s === "wasted") return { bg: "#f3e8ff", color: "#6b21a8", border: "#d8b4fe" };
  if (s === "omitted") return { bg: "#f3f4f6", color: "#374151", border: "#d1d5db" };
  if (s === "held") return { bg: "#fef9c3", color: "#854d0e", border: "#fde047" };
  
  return { bg: "#ffffff", color: "#475569", border: "#cbd5e1" };
};

const SlotChip: React.FC<{ slot: MarGridSlot; isInactive: boolean; clickable: boolean; onAdminister: () => void; onViewDetail: () => void }> = ({ slot, isInactive, clickable, onAdminister, onViewDetail }) => {
  const c = slotColors(slot, isInactive);
  const isPending = (slot.status || "").toLowerCase() === "pending";
  const hasDetail = !isPending && (slot.admin_id != null || !!slot.actual_label || !!slot.remarks);
  const isActionable = (isPending && clickable) || hasDetail;
  
  let displayLabel = slot.actual_label ? slot.actual_label.replace("A - ", "") : slot.scheduled_label;
  if (!slot.actual_label && isPending && slot.is_overdue) displayLabel = "Overdue";
  else if (["missed", "refused", "wasted"].includes((slot.status || "").toLowerCase())) displayLabel = slot.status.charAt(0).toUpperCase() + slot.status.slice(1);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (isActionable) {
          isPending ? onAdminister() : onViewDetail();
        }
      }}
      title={slot.remarks || undefined}
      style={{
        display: "block", width: "100%", textAlign: "left", marginBottom: "4px",
        padding: "4px 7px", borderRadius: "6px", border: `1px solid ${c.border}`,
        background: c.bg, color: c.color, fontSize: "13px", fontWeight: 800,
        cursor: isActionable ? "pointer" : "default", whiteSpace: "nowrap",
      }}
    >
      {displayLabel}
    </button>
  );
};

const CompactSlotChip: React.FC<{ slot: MarGridSlot; isInactive: boolean; clickable: boolean; onAction: () => void; }> = ({ slot, isInactive, clickable, onAction }) => {
  const c = slotColors(slot, isInactive);
  const isPending = (slot.status || "").toLowerCase() === "pending";
  const hasDetail = !isPending && (slot.admin_id != null || !!slot.actual_label || !!slot.remarks);
  const isActionable = (isPending && clickable) || hasDetail;
  
  let text = slot.actual_label || slot.scheduled_label || "PRN";
  text = text.replace("S - ", "").replace("A - ", "");

  if (slot.status.toLowerCase() === "missed") text = "Missed";
  if (slot.status.toLowerCase() === "refused") text = "Refused";
  if (slot.status.toLowerCase() === "wasted") text = "Wasted";
  if (isPending && slot.is_overdue) text = "Overdue";

  return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (isActionable) onAction();
        }}
        title={slot.remarks || (isPending ? `Scheduled: ${slot.scheduled_label}` : `Given: ${slot.actual_label}`)}
        style={{
          display: "block", width: "100%", textAlign: "center", marginBottom: "3px",
          padding: "3px 0", borderRadius: "3px", border: `1px solid ${c.border}`,
          background: c.bg, color: c.color, fontSize: "10px", fontWeight: 800,
          cursor: isActionable ? "pointer" : "default", overflow: "hidden",
        }}
      >
        {text}
      </button>
    );
};

// ─── Inline Administration Form ───────────────────────────────────────────────

const AdminForm: React.FC<{
  med: DueMedication;
  encounterNumber: string;
  defaultAdminTime?: string;
  onCancel: () => void;
  onSave: () => void;
}> = ({ med, encounterNumber, defaultAdminTime, onCancel, onSave }) => {
  const rc = routeConfig(med.route);
  const { notify } = useNotification();
  const [submitting, setSubmitting] = useState(false);
  const [actionType, setActionType] = useState<"given" | "missed" | "refused" | "wasted">("given");

  const [dose, setDose] = useState(med.dosage || "");
  const [administeredAt, setAdministeredAt] = useState(toInputDatetime(defaultAdminTime || getLocalTimestamp()));
  const [volumeMl, setVolumeMl] = useState("");
  const [diluent, setDiluent] = useState("");
  const [rateMlHr, setRateMlHr] = useState("");
  const [flushMl, setFlushMl] = useState("");
  const [accessSite, setAccessSite] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [witnessId, setWitnessId] = useState("");
  const [remarks, setRemarks] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dose.trim()) { notify("Dose is required", "warning"); return; }
    if (!administeredAt) { notify("Administered at time is required", "warning"); return; }
    
    if (actionType !== "given" && !remarks.trim()) {
      notify("Remarks/Reason is required for missed, refused, or wasted medications.", "warning");
      return;
    }
    if (actionType === "wasted" && !witnessId.trim()) {
      notify("Witness Name/ID is required for wasted medications.", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        encounter_number: encounterNumber,
        prescription_id: med.prescription_id,
        drug_id: med.drug_id,
        dose,
        route: med.route,
        administered_at: fromInputDatetime(administeredAt),
        status: actionType,
      };

      if (actionType === "given") {
        if (volumeMl) payload.volume_ml = Number(volumeMl);
        if (rc.showDiluent && diluent)   payload.diluent = diluent;
        if (rc.showRate && rateMlHr)     payload.rate_ml_hr = Number(rateMlHr);
        if (rc.showFlush && flushMl)     payload.flush_ml = Number(flushMl);
        if (rc.showAccessSite && accessSite) payload.access_site = accessSite;
        if (rc.showBatch && batchNumber) payload.batch_number = batchNumber;
      } else if (actionType === "wasted") {
        payload.witness_staff_id = witnessId.trim();
      }

      if (remarks.trim()) payload.remarks = remarks.trim();

      if (actionType === "given") {
        await nursingService.administerMedication(payload);
      } else if (actionType === "missed") {
        await nursingService.missedMedication(payload);
      } else if (actionType === "refused") {
        await nursingService.refusedMedication(payload);
      } else if (actionType === "wasted") {
        await nursingService.wastedMedication(payload);
      }

      notify(`${med.drug_name} recorded as ${actionType} successfully`, "success");
      onSave();
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to record administration", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const isGiven = actionType === "given";

  return (
    <div style={{ margin: "0 0 0", background: isGiven ? rc.bg : "#fef2f2", border: `1px solid ${isGiven ? rc.color : "#ef4444"}30`, borderRadius: "10px", padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "14px", color: isGiven ? rc.color : "#dc2626", fontWeight: 800, fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        <Plus size={13} /> Record Administration — <span style={{ opacity: 0.85 }}>{rc.label}</span>
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {(["given", "missed", "refused", "wasted"] as const).map(act => (
          <button
            key={act}
            type="button"
            onClick={() => setActionType(act)}
            style={{
              padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 800, textTransform: "uppercase", cursor: "pointer",
              background: actionType === act ? (act === "given" ? rc.color : "#dc2626") : "#fff",
              color: actionType === act ? "#fff" : "#64748b",
              border: `1px solid ${actionType === act ? "transparent" : "#cbd5e1"}`
            }}
          >
            {act}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
          <div>
            <label style={lbl}>Dose <span style={{ color: "#e11d48" }}>*</span></label>
            <input type="text" value={dose} onChange={e => setDose(e.target.value)} style={inpSm(isGiven ? `${rc.color}60` : `#fca5a5`)} placeholder="e.g. 500mg" autoFocus />
          </div>
          <div>
            <label style={lbl}>Event Time <span style={{ color: "#e11d48" }}>*</span></label>
            <input type="datetime-local" value={administeredAt} onChange={e => setAdministeredAt(e.target.value)} style={inpSm(isGiven ? `${rc.color}60` : `#fca5a5`)} />
          </div>
        </div>

        {isGiven && (rc.showVolume || rc.showDiluent) && (
          <div style={{ display: "grid", gridTemplateColumns: rc.showVolume && rc.showDiluent ? "1fr 1fr" : "1fr", gap: "10px", marginBottom: "10px" }}>
            {rc.showVolume && (
              <div>
                <label style={lbl}>Volume (ml)</label>
                <input type="number" step="any" min="0" value={volumeMl} onChange={e => setVolumeMl(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 100" />
              </div>
            )}
            {rc.showDiluent && (
              <div>
                <label style={lbl}>Diluent</label>
                <input type="text" value={diluent} onChange={e => setDiluent(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. Normal Saline" />
              </div>
            )}
          </div>
        )}

        {isGiven && (rc.showRate || rc.showFlush) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
            {rc.showRate && (
              <div>
                <label style={lbl}>Rate (ml/hr)</label>
                <input type="number" min="1" value={rateMlHr} onChange={e => setRateMlHr(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 50" />
              </div>
            )}
            {rc.showFlush && (
              <div>
                <label style={lbl}>Flush (ml)</label>
                <input type="number" min="0" value={flushMl} onChange={e => setFlushMl(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 10" />
              </div>
            )}
          </div>
        )}

        {isGiven && (rc.showAccessSite || rc.showBatch) && (
          <div style={{ display: "grid", gridTemplateColumns: rc.showAccessSite && rc.showBatch ? "1fr 1fr" : "1fr", gap: "10px", marginBottom: "10px" }}>
            {rc.showAccessSite && (
              <div>
                <label style={lbl}>Access Site</label>
                <input type="text" value={accessSite} onChange={e => setAccessSite(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. Right forearm" />
              </div>
            )}
            {rc.showBatch && (
              <div>
                <label style={lbl}>Batch / Unit Number</label>
                <input type="text" value={batchNumber} onChange={e => setBatchNumber(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. PRBC-20240524" />
              </div>
            )}
          </div>
        )}

        {actionType === "wasted" && (
           <div style={{ marginBottom: "10px" }}>
             <label style={lbl}>Witness Staff ID <span style={{ color: "#e11d48" }}>*</span></label>
             <input type="text" value={witnessId} onChange={e => setWitnessId(e.target.value)} style={inpSm(`#fca5a5`)} placeholder="Enter Witness ID" />
           </div>
        )}

        <div style={{ marginBottom: "12px" }}>
          <label style={lbl}>Remarks <span style={{ fontWeight: !isGiven ? 800 : 400, color: !isGiven ? "#e11d48" : "#aaa", textTransform: "none", letterSpacing: 0 }}>{!isGiven ? "* (Required)" : "(optional)"}</span></label>
          <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} style={inpSm(isGiven ? `${rc.color}40` : `#fca5a5`)} placeholder={!isGiven ? "Enter reason..." : "e.g. Given slowly over 20 minutes"} />
        </div>

        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button type="button" style={secBtn} onClick={onCancel}>Cancel</button>
          <button type="submit" disabled={submitting} style={primBtn(isGiven ? rc.color : "#dc2626")}>
            {submitting ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle2 size={13} />}
            Confirm {actionType.charAt(0).toUpperCase() + actionType.slice(1)}
          </button>
        </div>
      </form>
    </div>
  );
};

// ─── Due Medication Card ──────────────────────────────────────────────────────

const DueMedCard: React.FC<{
  med: DueMedication;
  encounterNumber: string;
  onSave: () => void;
}> = ({ med, encounterNumber, onSave }) => {
  const [showForm, setShowForm] = useState(false);
  const isDispensed = ["DISPENSED", "PARTIALLY_DISPENSED"].includes((med.dispense_status || "").toUpperCase());
  const rc = routeConfig(med.route);
  const isPatientOwn = Number(med.is_patient_own_medication) === 1;

  return (
    <div style={{
      background: "#fff",
      borderRadius: "12px",
      border: "1px solid #e0e4ef",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      borderLeft: `4px solid ${isDispensed || isPatientOwn ? rc.color : "#d1d5db"}`,
      opacity: isDispensed || isPatientOwn ? 1 : 0.75,
      marginBottom: "12px",
    }}>
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `${isDispensed || isPatientOwn ? rc.color : "#6b7280"}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Pill size={18} color={isDispensed || isPatientOwn ? rc.color : "#6b7280"} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
            <span style={{ fontWeight: 800, fontSize: "18px", color: "#1c2b4a" }}>{med.drug_name}</span>
            <RouteBadge route={med.route} />
            
            {isPatientOwn ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#e0e7ff", color: "#3730a3", fontSize: "11px", fontWeight: 800, padding: "3px 8px", borderRadius: "20px", border: "1px solid #c7d2fe" }}>
                📦 Patient's Own Stock (Home Med)
              </span>
            ) : (
              <>
                <StatusBadge status={med.due_status} size="xs" />
                {!isDispensed && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#fef9c3", color: "#854d0e", fontSize: "12px", fontWeight: 800, padding: "3px 8px", borderRadius: "20px", border: "1px solid #fde047" }}>
                    <AlertTriangle size={9} /> Not Yet Dispensed
                  </span>
                )}
              </>
            )}

            {/* 🚨 BLINKING / PULSING ALERT WRAPPER */}
            <div style={{ 
              marginLeft: "auto", 
              display: "inline-flex", 
              alignItems: "center", 
              gap: "4px",
              animation: "pulseAlert 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
              padding: "2px 6px",
              borderRadius: "6px",
              background: isPatientOwn ? "transparent" : "#fef2f2",
              border: isPatientOwn ? "none" : "1px solid #fecaca"
            }}>
              <span style={{ fontSize: "12px", color: "#991b1b", fontWeight: 800 }}>Dispense Status:</span>
              <StatusBadge status={isPatientOwn ? "PATIENT_OWN" : med.dispense_status} size="xs" />
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "4px" }}>
            {([
              ["Dose", med.dosage],
              ["Frequency", med.frequency],
              med.duration ? ["Duration", `${med.duration} ${med.duration_unit || 'Days'}`] : null,
              ["Prescribed by", med.prescribed_by],
            ].filter(Boolean) as [string, string][]).map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{v || "—"}</div>
              </div>
            ))}
            {med.prescribed_at && (
              <div>
                <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Prescribed On</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{fmtDt(med.prescribed_at)}</div>
              </div>
            )}
            {med.last_administered_at && (
              <div>
                <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Last Given</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{fmtDt(med.last_administered_at)}</div>
              </div>
            )}
          </div>

          {med.instructions && (
            <div style={{ marginTop: "6px", fontSize: "14px", color: "#6b7a9a", fontStyle: "italic" }}>
              ℹ {med.instructions}
            </div>
          )}
        </div>

        <button
          onClick={() => setShowForm(f => !f)}
          style={{
            display: "flex", alignItems: "center", gap: "4px",
            padding: "7px 14px", border: `1.5px solid ${rc.color}`,
            borderRadius: "8px", background: showForm ? rc.color : "#fff",
            color: showForm ? "#fff" : rc.color,
            fontSize: "14px", fontWeight: 800, cursor: "pointer",
            whiteSpace: "nowrap", transition: "all 0.15s", flexShrink: 0,
          }}
        >
          <CheckCircle2 size={12} />
          {showForm ? "Cancel" : "Document"}
        </button>
      </div>

      <style>{`
        @keyframes pulseAlert {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.98); }
        }
      `}</style>

      {showForm && (
        <div style={{ padding: "0 14px 14px" }}>
          <AdminForm
            med={med}
            encounterNumber={encounterNumber}
            onCancel={() => setShowForm(false)}
            onSave={() => { setShowForm(false); onSave(); }}
          />
        </div>
      )}
    </div>
  );
};

// ─── History Card ─────────────────────────────────────────────────────────────

const HistoryCard: React.FC<{ record: AdminHistory }> = ({ record }) => {
  const [expanded, setExpanded] = useState(false);
  const rc = routeConfig(record.route);

  return (
    <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e0e4ef", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", borderLeft: `3px solid ${rc.color}`, marginBottom: "10px" }}>
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: `${rc.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Pill size={14} color={rc.color} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "2px" }}>
            <span style={{ fontWeight: 800, fontSize: "16px", color: "#1c2b4a" }}>{record.drug_name}</span>
            <RouteBadge route={record.route} />
            <StatusBadge status={record.status} size="xs" />
          </div>
          <div style={{ fontSize: "14px", color: "#6b7a9a" }}>
            <span style={{ fontWeight: 600, color: "#1c2b4a" }}>{record.dose}</span>
            {" · "}
            <Clock size={9} style={{ display: "inline", verticalAlign: "middle", marginRight: "2px" }} />
            {fmtDt(record.administered_at)}
            {" · by "}<span style={{ fontWeight: 600, color: "#1c2b4a" }}>{record.administered_by_name}</span>
          </div>
        </div>

        <button
          onClick={() => setExpanded(e => !e)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#8a94ad", padding: "4px", borderRadius: "6px", lineHeight: 1, flexShrink: 0 }}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div style={{ padding: "0 14px 12px", background: "#f8f9fc", borderTop: "1px dashed #e0e4ef" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", paddingTop: "10px" }}>
            {([
              ["Prescribed Dose", record.dosage],
              ["Frequency", record.frequency],
              rc.showDiluent && ["Diluent", record.diluent],
              rc.showRate && ["Rate", record.rate_ml_hr ? `${record.rate_ml_hr} ml/hr` : null],
              rc.showAccessSite && ["Access Site", record.access_site],
              rc.showBatch && ["Batch No.", record.batch_number],
            ].filter(Boolean) as [string, string | null][]).map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{v || "—"}</div>
              </div>
            ))}
          </div>
          {record.remarks && (
            <div style={{ marginTop: "8px", fontSize: "14px", color: "#6b7a9a", fontStyle: "italic" }}>
              "{record.remarks}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main MARPanel ────────────────────────────────────────────────────────────

const MARPanel: React.FC<MARPanelProps> = ({ encounterNumber, onClose }) => {
  const [activeTab, setActiveTab] = useState<"paperGrid" | "grid" | "due" | "history">("paperGrid");
  
  // Data States
  const [dueMeds, setDueMeds] = useState<DueMedication[]>([]);
  const [history, setHistory] = useState<AdminHistory[]>([]);
  
  // Separate states for Weekly vs Monthly grids
  const [weeklyHeaders, setWeeklyHeaders] = useState<MarGridHeader[]>([]);
  const [weeklyRows, setWeeklyRows] = useState<MarGridRow[]>([]);
  
  const [monthlyHeaders, setMonthlyHeaders] = useState<MarGridHeader[]>([]);
  const [monthlyRows, setMonthlyRows] = useState<MarGridRow[]>([]);
  
  // Loading States
  const [loadingDue, setLoadingDue] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingWeeklyGrid, setLoadingWeeklyGrid] = useState(true);
  const [loadingMonthlyGrid, setLoadingMonthlyGrid] = useState(true);
  
  // Calendar State for Monthly Grid
  const today = new Date();
  const todayStr = getTodayDateString(); 
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // Shared Modal States
  const [activeSlot, setActiveSlot] = useState<{ row: MarGridRow; date: string; slot: MarGridSlot; defaultTime?: string } | null>(null);
  const [viewSlotDetail, setViewSlotDetail] = useState<{ row: MarGridRow; date: string; slot: MarGridSlot } | null>(null);

  const handlePrevMonth = () => {
    if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(y => y - 1); }
    else { setCurrentMonth(m => m - 1); }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(y => y + 1); }
    else { setCurrentMonth(m => m + 1); }
  };

  const fetchDue = useCallback(async () => {
    setLoadingDue(true);
    try {
      const res = await nursingService.getMARDue(encounterNumber);
      setDueMeds(res.data || []);
    } catch {
      setDueMeds([]);
    } finally { setLoadingDue(false); }
  }, [encounterNumber]);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await nursingService.getMARHistory(encounterNumber);
      setHistory(res.data || []);
    } catch {
      setHistory([]);
    } finally { setLoadingHistory(false); }
  }, [encounterNumber]);

  const fetchWeeklyGrid = useCallback(async () => {
    setLoadingWeeklyGrid(true);
    try {
      const res = await nursingService.getMARDueHistory(encounterNumber);
      setWeeklyHeaders(res.data?.headers || []);
      setWeeklyRows(res.data?.rows || []);
    } catch {
      setWeeklyHeaders([]);
      setWeeklyRows([]);
    } finally { setLoadingWeeklyGrid(false); }
  }, [encounterNumber]);

  const fetchMonthlyGrid = useCallback(async () => {
    setLoadingMonthlyGrid(true);
    try {
      const fetchFn = (nursingService as any).getMARMonth; 
      let res;
      if (fetchFn) {
         res = await fetchFn(encounterNumber, currentMonth, currentYear);
      } else {
         console.warn("nursingService.getMARMonth not found! Falling back to getMARDueHistory");
         res = await nursingService.getMARDueHistory(encounterNumber);
      }
      setMonthlyHeaders(res?.data?.headers || []);
      setMonthlyRows(res?.data?.rows || []);
    } catch {
      setMonthlyHeaders([]);
      setMonthlyRows([]);
    } finally { setLoadingMonthlyGrid(false); }
  }, [encounterNumber, currentMonth, currentYear]);

  useEffect(() => {
    fetchDue();
    fetchHistory();
    fetchWeeklyGrid();
  }, [fetchDue, fetchHistory, fetchWeeklyGrid]);

  useEffect(() => {
    fetchMonthlyGrid();
  }, [fetchMonthlyGrid]);

  const handleAdminSave = () => {
    fetchDue();
    fetchHistory();
  };

  const handleGridAdminSave = () => {
    setActiveSlot(null);
    fetchDue();
    fetchHistory();
    fetchWeeklyGrid();
    fetchMonthlyGrid();
  };

  const openNewDoseModal = (row: MarGridRow, dateString: string) => {
    const genericSlot: MarGridSlot = {
      status: "pending",
      scheduled_label: "Unscheduled",
      actual_label: null,
      admin_id: null,
      remarks: null,
      is_overdue: false
    };
    const defaultTime = dateString === todayStr ? getLocalTimestamp() : `${dateString} 09:00:00`;
    setActiveSlot({ row, date: dateString, slot: genericSlot, defaultTime });
  };

  const TEAL = "#0d9488";
  const TEAL_DARK = "#0f766e";
  const ACTIVE_COL_BG = "#dcfce7"; 

  const tabBtn = (tab: "due" | "history" | "grid" | "paperGrid"): React.CSSProperties => ({
    flex: 1, padding: "9px 12px", border: "none", cursor: "pointer",
    fontSize: "15px", fontWeight: 800, display: "flex", alignItems: "center",
    justifyContent: "center", gap: "6px", transition: "all 0.15s",
    borderBottom: activeTab === tab ? `2px solid ${TEAL}` : "2px solid transparent",
    background: activeTab === tab ? "#f0fdfa" : "#f8f9fc",
    color: activeTab === tab ? TEAL_DARK : "#6b7a9a",
  });

  return (
    <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #d8dce8", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>

      {/* ── Panel header ── */}
      <div style={{ background: `linear-gradient(135deg, ${TEAL_DARK} 0%, ${TEAL} 100%)`, padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ClipboardList size={16} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: "16px", color: "#fff", letterSpacing: "0.3px" }}>Medication Administration Record</div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", marginTop: "1px" }}>MAR · {encounterNumber}</div>
          </div>
          {dueMeds.length > 0 && (
            <span style={{ background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: "13px", fontWeight: 800, padding: "3px 10px", borderRadius: "20px", marginLeft: "4px" }}>
              {dueMeds.length} scheduled
            </span>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "7px", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer" }}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", borderBottom: "1px solid #e0e4ef", flexShrink: 0 }}>
        <button style={tabBtn("due")} onClick={() => setActiveTab("due")}>
          <Pill size={13} /> Scheduled Medications
          {!loadingDue && dueMeds.length > 0 && (
            <span style={{ background: TEAL, color: "#fff", borderRadius: "20px", fontSize: "12px", fontWeight: 900, padding: "1px 6px", marginLeft: "2px" }}>
              {dueMeds.length}
            </span>
          )}
        </button>
        
        <button style={tabBtn("history")} onClick={() => setActiveTab("history")}>
          <History size={13} /> Administration History
          {!loadingHistory && history.length > 0 && (
            <span style={{ background: "#6b7a9a", color: "#fff", borderRadius: "20px", fontSize: "12px", fontWeight: 900, padding: "1px 6px", marginLeft: "2px" }}>
              {history.length}
            </span>
          )}
        </button>
        
        <button style={tabBtn("paperGrid")} onClick={() => setActiveTab("paperGrid")}>
          <LayoutGrid size={13} /> Monthly MAR 
        </button>
        <button style={tabBtn("grid")} onClick={() => setActiveTab("grid")}>
          <LayoutGrid size={13} /> Weekly Chart
        </button>
      </div>

      {/* ── Tab Body ── */}
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px", flex: 1, overflowY: "auto" }}>

        {/* DUE TAB */}
        {activeTab === "due" && (
          <>
            {loadingDue ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a", fontSize: "16px" }}>
                <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
                Loading scheduled medications…
              </div>
            ) : dueMeds.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a" }}>
                <CheckCircle2 size={32} color="#a7f3d0" />
                <span style={{ fontSize: "16px", fontWeight: 700, color: "#0f766e" }}>No scheduled medications</span>
                <span style={{ fontSize: "14px", color: "#8a94ad" }}>All scheduled medications have been administered or have expired.</span>
              </div>
            ) : (
              dueMeds.map(med => (
                <DueMedCard
                  key={med.prescription_id}
                  med={med}
                  encounterNumber={encounterNumber}
                  onSave={handleAdminSave}
                />
              ))
            )}
          </>
        )}

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          <>
            {loadingHistory ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a", fontSize: "16px" }}>
                <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
                Loading history…
              </div>
            ) : history.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a" }}>
                <History size={32} color="#d1d5db" />
                <span style={{ fontSize: "16px", fontWeight: 700 }}>No administration history</span>
                <span style={{ fontSize: "14px", color: "#8a94ad" }}>Administered medications will appear here</span>
              </div>
            ) : (
              <>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#8a94ad", textTransform: "uppercase", letterSpacing: "0.6px", padding: "0 2px 4px" }}>
                  {history.length} record{history.length !== 1 ? "s" : ""} found
                </div>
                {[...history]
                  .sort((a, b) => new Date(b.administered_at.replace(" ", "T")).getTime() - new Date(a.administered_at.replace(" ", "T")).getTime())
                  .map(record => (
                    <HistoryCard key={record.id} record={record} />
                  ))
                }
              </>
            )}
          </>
        )}

        {/* WEEKLY GRID TAB */}
        {activeTab === "grid" && (
          <>
            {loadingWeeklyGrid ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a", fontSize: "16px" }}>
                <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
                Loading weekly chart…
              </div>
            ) : weeklyRows.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a" }}>
                <LayoutGrid size={32} color="#d1d5db" />
                <span style={{ fontSize: "16px", fontWeight: 700 }}>No medications scheduled this week</span>
              </div>
            ) : (
              <div style={{ overflowX: "auto", border: "1px solid #e0e4ef", borderRadius: "10px" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: `${300 + weeklyHeaders.length * 120}px` }}>
                  <thead>
                    <tr>
                      <th style={{
                        position: "sticky", left: 0, zIndex: 2, background: "#f8f9fc",
                        textAlign: "left", padding: "10px 14px", fontSize: "13px", fontWeight: 800,
                        color: "#6b7a9a", textTransform: "uppercase", letterSpacing: "0.5px",
                        borderBottom: "1px solid #e0e4ef", borderRight: "1px solid #e0e4ef",
                        minWidth: "300px", width: "300px"
                      }}>
                        Medication Details
                      </th>
                      {weeklyHeaders.map(h => (
                        <th key={h.date} style={{
                          padding: "10px 12px", fontSize: "13px", fontWeight: 800, color: "#6b7a9a",
                          textTransform: "uppercase", letterSpacing: "0.5px", background: h.date === todayStr ? ACTIVE_COL_BG : "#f8f9fc",
                          borderBottom: "1px solid #e0e4ef", borderLeft: "1px solid #eef1f7", minWidth: "120px",
                        }}>
                          <div style={{ color: h.date === todayStr ? "#166534" : "inherit" }}>{h.day_name}</div>
                          <div style={{ fontWeight: 600, color: h.date === todayStr ? "#16a34a" : "#8a94ad", marginTop: "2px" }}>{h.display}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyRows.map(row => {
                      const isInactive = row.prescription_status === "STOPPED" || row.prescription_status === "CANCELLED";
                      return (
                        <tr key={row.prescription_id} style={{ opacity: isInactive ? 0.65 : 1, background: isInactive ? "#f8fafc" : "#fff" }}>
                          
                          <td style={{ position: "sticky", left: 0, zIndex: 1, background: isInactive ? "#f8fafc" : "#fff", borderRight: "2px solid #e0e4ef", borderBottom: "1px solid #eef1f7", padding: "12px", verticalAlign: "top" }}>
                            <div style={{ fontWeight: 900, fontSize: "14px", color: "#0f172a", marginBottom: "4px" }}>
                                {row.drug_name}
                            </div>
                            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "8px" }}>
                                <RouteBadge route={row.route} />
                                <StatusBadge status={row.prescription_status} size="xs" />
                            </div>
                            <div style={{ fontSize: "11px", color: "#475569", lineHeight: "1.6" }}>
                                <div style={{display: "grid", gridTemplateColumns: "50px 1fr", gap: "2px"}}>
                                  <strong style={{color: "#1e293b"}}>Dose:</strong> <span>{row.dosage}</span>
                                  <strong style={{color: "#1e293b"}}>Freq:</strong> <span>{row.frequency}</span>
                                  {row.duration && <><strong style={{color: "#1e293b"}}>Dur:</strong> <span>{row.duration} {row.duration_unit || "Days"}</span></>}
                                  <strong style={{color: "#1e293b"}}>By:</strong> <span style={{whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{row.prescribed_by}</span>
                                  <strong style={{color: "#1e293b"}}>Date:</strong> <span>{fmtDt(row.start_date || "")}</span>
                                </div>

                                <b>Dispense status: </b>
                                <StatusBadge status={row.dispense_status} size="xs" />
                            </div>
                            {row.instructions && (
                                <div style={{ marginTop: "8px", fontSize: "10px", color: "#64748b", fontStyle: "italic", background: "#f1f5f9", padding: "6px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                                  <span style={{fontWeight: 800, color: "#475569"}}>Sig:</span> {row.instructions}
                                </div>
                            )}
                          </td>

                          {weeklyHeaders.map(h => {
                            const slots = row.days[h.date] || [];
                            return (
                              <td 
                                key={h.date} 
                                style={{
                                  padding: "8px", verticalAlign: "top",
                                  borderBottom: "1px solid #eef1f7", borderLeft: "1px solid #eef1f7",
                                  background: h.date === todayStr ? ACTIVE_COL_BG : "transparent",
                                  cursor: "pointer"
                                }}
                                onClick={() => openNewDoseModal(row, h.date)}
                                title="Click to document a new administration for this day"
                              >
                                {slots.length > 0 && slots.map((slot, i) => (
                                  <SlotChip
                                    key={i}
                                    slot={slot}
                                    isInactive={isInactive}
                                    clickable={true}
                                    onAdminister={() => setActiveSlot({ row, date: h.date, slot, defaultTime: h.date === todayStr ? getLocalTimestamp() : `${h.date} 09:00:00` })}
                                    onViewDetail={() => setViewSlotDetail({ row, date: h.date, slot })}
                                  />
                                ))}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* MONTHLY MAR GRID TAB */}
        {activeTab === "paperGrid" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            
            {/* Header controls for Monthly View */}
            <div style={{ marginBottom: "16px", border: "2px solid #1e293b", borderRadius: "8px", overflow: "hidden", flexShrink: 0 }}>
              <div style={{ background: "#f8fafc", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #1e293b" }}>
                <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px" }}>
                  Personal Medication Administration Record (MAR)
                </h2>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <button onClick={handlePrevMonth} style={{ background: "none", border: "none", cursor: "pointer" }}><ChevronLeft size={20} /></button>
                  <span style={{ fontSize: "16px", fontWeight: 800, minWidth: "140px", textAlign: "center" }}>
                    {monthNames[currentMonth - 1]} {currentYear}
                  </span>
                  <button onClick={handleNextMonth} style={{ background: "none", border: "none", cursor: "pointer" }}><ChevronRight size={20} /></button>
                </div>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", fontSize: "12px", background: "#fff" }}>
                <div style={{ padding: "8px", borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1" }}>
                  <strong>PATIENT NAME:</strong> {encounterNumber}
                </div>
                <div style={{ padding: "8px", borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1" }}>
                  <strong>D.O.B.:</strong> —
                </div>
                <div style={{ padding: "8px", borderBottom: "1px solid #cbd5e1" }}>
                  <strong>ADDRESS:</strong> —
                </div>
                <div style={{ padding: "8px", borderRight: "1px solid #cbd5e1", gridColumn: "span 1" }}>
                  <strong>GP NAME:</strong> —
                </div>
                <div style={{ padding: "8px", gridColumn: "span 2" }}>
                  <strong>KNOWN ALLERGIES:</strong> <span style={{ color: "#ef4444", fontWeight: 800 }}>None Recorded</span>
                </div>
              </div>
            </div>

            {loadingMonthlyGrid ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px", color: "#6b7a9a" }}>
                <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
              </div>
            ) : monthlyRows.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px", color: "#6b7a9a", fontWeight: 700 }}>No medications scheduled this month</div>
            ) : (
              <div style={{ overflowX: "auto", border: "2px solid #1e293b", flex: 1, borderRadius: "6px" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed", minWidth: `${280 + (monthlyHeaders.length * 40)}px` }}>
                  <thead>
                    <tr>
                      <th style={{ width: "280px", position: "sticky", left: 0, zIndex: 2, background: "#f8fafc", borderRight: "2px solid #1e293b", borderBottom: "2px solid #1e293b", padding: "12px", textAlign: "left", fontSize: "11px", textTransform: "uppercase" }}>
                        Medication Details<br/>
                        <span style={{ fontWeight: 400, color: "#64748b", textTransform: "none" }}>(Name, strength, route, frequency)</span>
                      </th>
                      {monthlyHeaders.map(h => (
                        <th key={h.date} style={{ 
                          borderBottom: "2px solid #1e293b", borderRight: "1px solid #cbd5e1", 
                          background: h.date === todayStr ? ACTIVE_COL_BG : "#f8fafc", 
                          color: h.date === todayStr ? "#166534" : "inherit",
                          padding: "6px 0", width: "40px", textAlign: "center" 
                        }}>
                          <div style={{ fontSize: "10px", color: h.date === todayStr ? "#166534" : "#64748b", fontWeight: 800, marginBottom: "2px" }}>{h.day_name}</div>
                          <div style={{ fontSize: "15px", fontWeight: 900 }}>{h.display}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyRows.map(row => {
                      const isInactive = row.prescription_status === "STOPPED" || row.prescription_status === "CANCELLED";
                      return (
                        <tr key={row.prescription_id} style={{ opacity: isInactive ? 0.65 : 1, background: isInactive ? "#f1f5f9" : "#fff" }}>
                          
                          <td style={{ position: "sticky", left: 0, zIndex: 1, background: isInactive ? "#f1f5f9" : "#fff", borderRight: "2px solid #1e293b", borderBottom: "1px solid #cbd5e1", padding: "12px", verticalAlign: "top" }}>
                            <div style={{ fontWeight: 900, fontSize: "14px", color: "#0f172a", marginBottom: "4px" }}>
                                {row.drug_name}
                            </div>
                            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "8px" }}>
                                <RouteBadge route={row.route} />
                                <StatusBadge status={row.prescription_status} size="xs" />
                            </div>
                            <div style={{ fontSize: "11px", color: "#475569", lineHeight: "1.6" }}>
                                <div style={{display: "grid", gridTemplateColumns: "50px 1fr", gap: "2px"}}>
                                  <strong style={{color: "#1e293b"}}>Dose:</strong> <span>{row.dosage}</span>
                                  <strong style={{color: "#1e293b"}}>Freq:</strong> <span>{row.frequency}</span>
                                  {row.duration && <><strong style={{color: "#1e293b"}}>Dur:</strong> <span>{row.duration} {row.duration_unit || "Days"}</span></>}
                                  <strong style={{color: "#1e293b"}}>By:</strong> <span style={{whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{row.prescribed_by}</span>
                                  <strong style={{color: "#1e293b"}}>Date:</strong> <span>{fmtDt(row.start_date || "")}</span>
                                </div>
                                <b>Dispense status: </b>
                                <StatusBadge status={row.dispense_status} size="xs" />
                            </div>
                            {row.instructions && (
                                <div style={{ marginTop: "8px", fontSize: "10px", color: "#64748b", fontStyle: "italic", background: "#f8fafc", padding: "6px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                                  <span style={{fontWeight: 800, color: "#475569"}}>Sig:</span> {row.instructions}
                                </div>
                            )}
                          </td>

                          {monthlyHeaders.map(h => {
                            const slots = row.days[h.date] || [];
                            const colBackground = h.date === todayStr ? ACTIVE_COL_BG : "transparent";
                            
                            return (
                              <td 
                                key={h.date} 
                                style={{ 
                                  borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1", 
                                  padding: "3px", verticalAlign: "top", background: colBackground,
                                  cursor: "pointer"
                                }}
                                onClick={() => openNewDoseModal(row, h.date)}
                                title="Click to document a new administration for this day"
                              >
                                {slots.length > 0 && slots.map((slot, i) => (
                                  <CompactSlotChip
                                    key={i}
                                    slot={slot}
                                    isInactive={isInactive}
                                    clickable={true}
                                    onAction={() => {
                                      const isPending = (slot.status || "").toLowerCase() === "pending";
                                      if (isPending) setActiveSlot({ row, date: h.date, slot, defaultTime: h.date === todayStr ? getLocalTimestamp() : `${h.date} 09:00:00` });
                                      else setViewSlotDetail({ row, date: h.date, slot });
                                    }}
                                  />
                                ))}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Shared Grid Slot Administer Modal ── */}
      {activeSlot && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "16px" }}
          onClick={() => setActiveSlot(null)}
        >
          <div style={{ width: "100%", maxWidth: "460px" }} onClick={e => e.stopPropagation()}>
            <AdminForm
              med={{
                prescription_id: activeSlot.row.prescription_id,
                drug_name: activeSlot.row.drug_name,
                drug_id: activeSlot.row.drug_id, 
                dosage: activeSlot.row.dosage,
                frequency: activeSlot.row.frequency,
                route: activeSlot.row.route,
                instructions: activeSlot.row.instructions,
                dispense_status: activeSlot.row.dispense_status,
                prescription_status: activeSlot.row.prescription_status,
                prescribed_by: activeSlot.row.prescribed_by,
                prescribed_at: activeSlot.row.prescribed_at,
                last_admin_id: null,
                last_admin_status: null,
                last_administered_at: null,
                last_administered_by: null,
                last_administered_by_name: null,
                due_status: activeSlot.row.due_status,
                duration: activeSlot.row.duration,
                duration_unit: activeSlot.row.duration_unit,
              }}
              encounterNumber={encounterNumber}
              defaultAdminTime={activeSlot.defaultTime}
              onCancel={() => setActiveSlot(null)}
              onSave={handleGridAdminSave}
            />
          </div>
        </div>
      )}

      {/* ── Shared Grid Slot Detail (View) Modal ── */}
      {viewSlotDetail && (() => {
        const fullRecord = history.find(h => h.id === viewSlotDetail.slot.admin_id);
        const rc = routeConfig(fullRecord?.route || parseDosageInfo(viewSlotDetail.row.dosage_info).route);
        return (
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "16px" }}
            onClick={() => setViewSlotDetail(null)}
          >
            <div style={{ width: "100%", maxWidth: "460px", background: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
              <div style={{ background: rc.color, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", color: "#fff" }}>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 800 }}>{viewSlotDetail.row.drug_name}</div>
                  <div style={{ fontSize: "13px", opacity: 0.85, marginTop: "2px" }}>
                    Scheduled {viewSlotDetail.slot.scheduled_label} · {fmtDt(viewSlotDetail.date)}
                  </div>
                </div>
                <button onClick={() => setViewSlotDetail(null)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "6px", width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer" }}>
                  <X size={16} />
                </button>
              </div>
              <div style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <StatusBadge status={viewSlotDetail.slot.status} />
                  {fullRecord && <RouteBadge route={fullRecord.route} />}
                </div>

                {fullRecord ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
                    {([
                      [`Dose ${fullRecord.status ? fullRecord.status.charAt(0).toUpperCase() + fullRecord.status.slice(1).toLowerCase() : 'Given'}`, fullRecord.dose],
                      ["Administered At", fmtDt(fullRecord.administered_at)],
                      ["Given By", fullRecord.administered_by_name],
                      rc.showDiluent && ["Diluent", fullRecord.diluent],
                      rc.showRate && ["Rate", fullRecord.rate_ml_hr ? `${fullRecord.rate_ml_hr} ml/hr` : null],
                      rc.showAccessSite && ["Access Site", fullRecord.access_site],
                      rc.showBatch && ["Batch No.", fullRecord.batch_number],
                    ].filter(Boolean) as [string, string | null][]).map(([k, v]) => (
                      <div key={k}>
                        <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
                        <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{v || "—"}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: "14px", color: "#6b7a9a" }}>
                    Recorded as <strong>{viewSlotDetail.slot.actual_label || viewSlotDetail.slot.status}</strong>.
                    {" "}Full administration details aren't available for this entry.
                  </div>
                )}

                {viewSlotDetail.slot.remarks && (
                  <div style={{ fontSize: "14px", color: "#6b7a9a", fontStyle: "italic" }}>
                    "{viewSlotDetail.slot.remarks}"
                  </div>
                )}
              </div>
              <div style={{ padding: "14px 18px", borderTop: "1px solid #eef1f7", display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => setViewSlotDetail(null)} style={secBtn}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default MARPanel;

// "use client";
// import React, { useState, useEffect, useCallback } from "react";
// import {
//   X, Loader2, Clock, CheckCircle2, AlertTriangle, Pill,
//   ClipboardList, History, ChevronDown, ChevronUp, Plus, LayoutGrid, ChevronLeft, ChevronRight
// } from "lucide-react";
// import { nursingService } from "../services/nursing.service";
// import { useNotification } from "../context/NotificationContext";

// // ─── Types ────────────────────────────────────────────────────────────────────

// interface DueMedication {
//   prescription_id: number;
//   drug_name: string;
//   drug_id?: number;
//   dosage: string;
//   frequency: string;
//   route: string;
//   instructions: string | null;
//   dispense_status: string;
//   prescription_status?: string;
//   prescribed_by: string;
//   prescribed_at: string | null;
//   last_admin_id: number | null;
//   last_admin_status: string | null;
//   last_administered_at: string | null;
//   last_administered_by: string | null;
//   last_administered_by_name: string | null;
//   due_status: string;
//   duration?: number;
//   duration_unit?: string;
// }

// interface AdminHistory {
//   id: number;
//   prescription_id: number;
//   drug_id: number;
//   drug_name: string;
//   dosage: string;
//   dose: string;
//   route: string;
//   frequency: string;
//   diluent: string | null;
//   rate_ml_hr: number | null;
//   access_site: string | null;
//   batch_number: string | null;
//   administered_at: string;
//   administered_by_name: string;
//   status: string;
//   remarks: string | null;
// }

// interface MarGridHeader {
//   date: string;
//   display: string;
//   day_name: string;
// }

// interface MarGridSlot {
//   status: string;
//   scheduled_label: string;
//   actual_label: string | null;
//   admin_id: number | null;
//   remarks: string | null;
//   is_overdue: boolean;
// }

// interface MarGridRow {
//   prescription_id: number;
//   drug_id?: number;
//   drug_name: string;
//   dosage: string;
//   frequency: string;
//   route: string;
//   instructions: string | null;
//   dispense_status: string;
//   prescribed_by: string;
//   prescribed_at: string | null;
//   duration?: number;
//   duration_unit?: string;
//   dosage_info: string;
//   start_date: string;
//   prescription_status: string;
//   due_status: string;
//   days: Record<string, MarGridSlot[]>;
// }

// interface MARPanelProps {
//   encounterNumber: string;
//   onClose?: () => void;
// }

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// const getLocalTimestamp = (date: Date = new Date()): string => {
//   const pad = (n: number) => n.toString().padStart(2, "0");
//   return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
// };

// const getTodayDateString = (): string => {
//   const date = new Date();
//   const pad = (n: number) => n.toString().padStart(2, "0");
//   return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
// };

// const toInputDatetime = (dt: string): string => {
//   if (!dt) return "";
//   return dt.replace(" ", "T").slice(0, 16);
// };

// const fromInputDatetime = (val: string): string => {
//   if (!val) return "";
//   return val.replace("T", " ") + ":00";
// };

// const fmtDt = (dt: string) => {
//   if (!dt) return "—";
//   try {
//     return new Date(dt.replace(" ", "T")).toLocaleString("en-GB", {
//       day: "2-digit", month: "2-digit", year: "2-digit",
//       hour: "2-digit", minute: "2-digit",
//     });
//   } catch { return dt; }
// };

// const parseDosageInfo = (info: string): { dosage: string; frequency: string; route: string } => {
//   const routeMatch = info.match(/\(([^)]+)\)\s*\$/);
//   const route = routeMatch ? routeMatch[1] : "";
//   const withoutRoute = info.replace(/\([^)]+\)\s*\$/, "").trim();
//   const [dosage = "", frequency = ""] = withoutRoute.split(" - ").map(s => s.trim());
//   return { dosage, frequency, route };
// };

// const routeConfig = (route: string): {
//   showVolume: boolean; showDiluent: boolean; showRate: boolean;
//   showFlush: boolean; showAccessSite: boolean; showBatch: boolean;
//   label: string; color: string; bg: string;
// } => {
//   const r = (route || "").toUpperCase();
//   if (r === "IV")      return { showVolume: true,  showDiluent: true,  showRate: true,  showFlush: true,  showAccessSite: true,  showBatch: false, label: "IV Infusion",     color: "#1d4ed8", bg: "#eff6ff" };
//   if (r === "SC" || r === "IM") return { showVolume: true,  showDiluent: false, showRate: false, showFlush: false, showAccessSite: true,  showBatch: false, label: r + " Injection",  color: "#7c3aed", bg: "#f5f3ff" };
//   if (r === "PO" || r === "SL") return { showVolume: false, showDiluent: false, showRate: false, showFlush: false, showAccessSite: false, showBatch: false, label: "Oral",            color: "#0f766e", bg: "#f0fdfa" };
//   if (r === "BLOOD")  return { showVolume: true,  showDiluent: false, showRate: false, showFlush: false, showAccessSite: true,  showBatch: true,  label: "Blood Product",   color: "#b91c1c", bg: "#fef2f2" };
//   if (r === "NG" || r === "PEG") return { showVolume: true, showDiluent: false, showRate: false, showFlush: false, showAccessSite: false, showBatch: false, label: "NG/PEG Feed",    color: "#b45309", bg: "#fefce8" };
//   return { showVolume: true, showDiluent: true, showRate: false, showFlush: false, showAccessSite: false, showBatch: false, label: route, color: "#1c3d7a", bg: "#f8f9fc" };
// };

// // ─── Shared Styles ────────────────────────────────────────────────────────────

// const lbl: React.CSSProperties = {
//   display: "block", fontSize: "13px", fontWeight: 700, color: "#6b7a9a",
//   textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "5px",
// };
// const inp: React.CSSProperties = {
//   width: "100%", padding: "9px 12px", border: "1px solid #d0d6e6",
//   borderRadius: "9px", fontSize: "16px", fontWeight: 500, color: "#1c2b4a",
//   background: "#f8f9fc", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
// };
// const inpSm = (borderColor: string): React.CSSProperties => ({
//   ...inp, background: "#fff", border: `1px solid ${borderColor}`,
//   padding: "8px 10px", fontSize: "15px", borderRadius: "8px",
// });
// const secBtn: React.CSSProperties = {
//   flex: "0 0 auto", padding: "8px 16px", border: "1px solid #d0d6e6",
//   borderRadius: "9px", fontSize: "15px", fontWeight: 700, color: "#4a5568",
//   background: "#fff", cursor: "pointer", whiteSpace: "nowrap",
// };
// const primBtn = (bg: string): React.CSSProperties => ({
//   flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center",
//   gap: "6px", padding: "8px 18px", border: "none", borderRadius: "9px",
//   fontSize: "15px", fontWeight: 700, color: "#fff", background: bg, cursor: "pointer",
//   whiteSpace: "nowrap",
// });

// // ─── Status badge ─────────────────────────────────────────────────────────────

// const StatusBadge: React.FC<{ status: string; size?: "sm" | "xs" }> = ({ status, size = "sm" }) => {
//   const s = (status || "").toUpperCase();
//   const map: Record<string, { bg: string; color: string; dot: string }> = {
//     GIVEN:      { bg: "#dcfce7", color: "#166534", dot: "#16a34a" },
//     HELD:       { bg: "#fef9c3", color: "#854d0e", dot: "#ca8a04" },
//     REFUSED:    { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626" },
//     WASTED:     { bg: "#fee2e2", color: "#991b1b", dot: "#9333ea" },
//     MISSED:     { bg: "#fee2e2", color: "#991b1b", dot: "#ea580c" },
//     OMITTED:    { bg: "#f3f4f6", color: "#374151", dot: "#9ca3af" },
//     DISPENSED:  { bg: "#dcfce7", color: "#166534", dot: "#16a34a" },
//     PENDING:    { bg: "#fef9c3", color: "#854d0e", dot: "#ca8a04" },
//     DUE:        { bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
//     OVERDUE:    { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626" },
//     STOPPED:    { bg: "#f1f5f9", color: "#64748b", dot: "#94a3b8" },
//     CANCELLED:  { bg: "#f1f5f9", color: "#64748b", dot: "#94a3b8" },
//   };
//   const cfg = map[s] || { bg: "#f3f4f6", color: "#374151", dot: "#9ca3af" };
//   const fs = size === "xs" ? "12px" : "13px";
//   return (
//     <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: cfg.bg, color: cfg.color, fontSize: fs, fontWeight: 800, textTransform: "uppercase", padding: "3px 8px", borderRadius: "20px", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>
//       <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: cfg.dot, display: "inline-block", flexShrink: 0 }} />
//       {status}
//     </span>
//   );
// };

// const RouteBadge: React.FC<{ route: string }> = ({ route }) => (
//   <span style={{ display: "inline-block", background: "#ccfbf1", color: "#0f766e", fontSize: "12px", fontWeight: 800, textTransform: "uppercase", padding: "3px 8px", borderRadius: "20px", letterSpacing: "0.5px" }}>
//     {route}
//   </span>
// );



// const slotColors = (slot: MarGridSlot, isInactive: boolean): { bg: string; color: string; border: string } => {
//   if (isInactive) return { bg: "#f8fafc", color: "#94a3b8", border: "#e2e8f0" };
//   const s = (slot.status || "").toLowerCase();
  
//   if (s === "given" || s === "administered") return { bg: "#dcfce7", color: "#166534", border: "#86efac" };
//   if (s === "refused" || slot.is_overdue) return { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" }; // RED
//   if (s === "missed") return { bg: "#ffedd5", color: "#9a3412", border: "#fdba74" }; // ORANGE
//   if (s === "wasted") return { bg: "#f3e8ff", color: "#6b21a8", border: "#d8b4fe" }; // PURPLE
  
//   if (s === "omitted") return { bg: "#f3f4f6", color: "#374151", border: "#d1d5db" };
//   if (s === "held") return { bg: "#fef9c3", color: "#854d0e", border: "#fde047" };
  
//   return { bg: "#ffffff", color: "#475569", border: "#cbd5e1" }; // Pending default
// };

// // ─── Grid slot colors ────────────────────────────────────────────────────────

// // const slotColors = (slot: MarGridSlot, isInactive: boolean): { bg: string; color: string; border: string } => {
// //   if (isInactive) return { bg: "#f8fafc", color: "#94a3b8", border: "#e2e8f0" };
// //   const s = (slot.status || "").toLowerCase();
  
// //   if (s === "given" || s === "administered") return { bg: "#dcfce7", color: "#166534", border: "#86efac" };
// //   if (s === "missed" || s === "refused" || s === "omitted" || s === "wasted" || slot.is_overdue) return { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" };
// //   if (s === "held") return { bg: "#fef9c3", color: "#854d0e", border: "#fde047" };
  
// //   return { bg: "#ffffff", color: "#475569", border: "#cbd5e1" };
// // };

// // ─── Weekly Grid Chip (Wider) ────────────────────────────────────────────────
// const SlotChip: React.FC<{ slot: MarGridSlot; isInactive: boolean; clickable: boolean; onAdminister: () => void; onViewDetail: () => void }> = ({ slot, isInactive, clickable, onAdminister, onViewDetail }) => {
//   const c = slotColors(slot, isInactive);
//   const isPending = (slot.status || "").toLowerCase() === "pending";
//   const hasDetail = !isPending && (slot.admin_id != null || !!slot.actual_label || !!slot.remarks);
//   const isActionable = (isPending && clickable) || hasDetail;
  
//   let displayLabel = slot.actual_label ? slot.actual_label.replace("A - ", "") : slot.scheduled_label;
//   if (!slot.actual_label && isPending && slot.is_overdue) displayLabel = "Overdue";
//   else if (["missed", "refused", "wasted"].includes((slot.status || "").toLowerCase())) displayLabel = slot.status.charAt(0).toUpperCase() + slot.status.slice(1);

//   return (
//     <button
//       type="button"
//       onClick={(e) => {
//         e.stopPropagation();
//         if (isActionable) {
//           isPending ? onAdminister() : onViewDetail();
//         }
//       }}
//       title={slot.remarks || undefined}
//       style={{
//         display: "block", width: "100%", textAlign: "left", marginBottom: "4px",
//         padding: "4px 7px", borderRadius: "6px", border: `1px solid ${c.border}`,
//         background: c.bg, color: c.color, fontSize: "13px", fontWeight: 800,
//         cursor: isActionable ? "pointer" : "default", whiteSpace: "nowrap",
//       }}
//     >
//       {displayLabel}
//     </button>
//   );
// };

// // ─── Monthly Grid Chip (Extra Compact 1-31 Days) ──────────────────────────────
// const CompactSlotChip: React.FC<{ slot: MarGridSlot; isInactive: boolean; clickable: boolean; onAction: () => void; }> = ({ slot, isInactive, clickable, onAction }) => {
//   const c = slotColors(slot, isInactive);
//   const isPending = (slot.status || "").toLowerCase() === "pending";
//   const hasDetail = !isPending && (slot.admin_id != null || !!slot.actual_label || !!slot.remarks);
//   const isActionable = (isPending && clickable) || hasDetail;
  
//   let text = slot.actual_label || slot.scheduled_label || "PRN";
//   text = text.replace("S - ", "").replace("A - ", "");

//   if (slot.status.toLowerCase() === "missed") text = "Missed";
//   if (slot.status.toLowerCase() === "refused") text = "Refused";
//   if (slot.status.toLowerCase() === "wasted") text = "Wasted";
//   if (isPending && slot.is_overdue) text = "Overdue";

//   return (
//       <button
//         type="button"
//         onClick={(e) => {
//           e.stopPropagation();
//           if (isActionable) onAction();
//         }}
//         title={slot.remarks || (isPending ? `Scheduled: ${slot.scheduled_label}` : `Given: ${slot.actual_label}`)}
//         style={{
//           display: "block", width: "100%", textAlign: "center", marginBottom: "3px",
//           padding: "3px 0", borderRadius: "3px", border: `1px solid ${c.border}`,
//           background: c.bg, color: c.color, fontSize: "10px", fontWeight: 800,
//           cursor: isActionable ? "pointer" : "default", overflow: "hidden",
//         }}
//       >
//         {text}
//       </button>
//     );
// };

// // ─── Inline Administration Form ───────────────────────────────────────────────

// const AdminForm: React.FC<{
//   med: DueMedication;
//   encounterNumber: string;
//   defaultAdminTime?: string;
//   onCancel: () => void;
//   onSave: () => void;
// }> = ({ med, encounterNumber, defaultAdminTime, onCancel, onSave }) => {
//   const rc = routeConfig(med.route);
//   const { notify } = useNotification();
//   const [submitting, setSubmitting] = useState(false);
//   const [actionType, setActionType] = useState<"given" | "missed" | "refused" | "wasted">("given");

//   const [dose, setDose] = useState(med.dosage || "");
//   const [administeredAt, setAdministeredAt] = useState(toInputDatetime(defaultAdminTime || getLocalTimestamp()));
//   const [volumeMl, setVolumeMl] = useState("");
//   const [diluent, setDiluent] = useState("");
//   const [rateMlHr, setRateMlHr] = useState("");
//   const [flushMl, setFlushMl] = useState("");
//   const [accessSite, setAccessSite] = useState("");
//   const [batchNumber, setBatchNumber] = useState("");
//   const [witnessId, setWitnessId] = useState("");
//   const [remarks, setRemarks] = useState("");


//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!dose.trim()) { notify("Dose is required", "warning"); return; }
//     if (!administeredAt) { notify("Administered at time is required", "warning"); return; }
    
//     if (actionType !== "given" && !remarks.trim()) {
//       notify("Remarks/Reason is required for missed, refused, or wasted medications.", "warning");
//       return;
//     }
//     if (actionType === "wasted" && !witnessId.trim()) {
//       notify("Witness Name/ID is required for wasted medications.", "warning");
//       return;
//     }

//     setSubmitting(true);
//     try {
//       const payload: any = {
//         encounter_number: encounterNumber,
//         prescription_id: med.prescription_id,
//         drug_id: med.drug_id,
//         dose,
//         route: med.route,
//         administered_at: fromInputDatetime(administeredAt),
//         status: actionType,
//       };

//       if (actionType === "given") {
//         if (volumeMl) payload.volume_ml = Number(volumeMl);
//         if (rc.showDiluent && diluent)   payload.diluent = diluent;
//         if (rc.showRate && rateMlHr)     payload.rate_ml_hr = Number(rateMlHr);
//         if (rc.showFlush && flushMl)     payload.flush_ml = Number(flushMl);
//         if (rc.showAccessSite && accessSite) payload.access_site = accessSite;
//         if (rc.showBatch && batchNumber) payload.batch_number = batchNumber;
//       } else if (actionType === "wasted") {
//         // PASS AS A STRING TO PREVENT NaN -> NULL ERRORS
//         payload.witness_staff_id = witnessId.trim();
//       }

//       if (remarks.trim()) payload.remarks = remarks.trim();

//       // Hit the proper endpoints using our updated service object
//       if (actionType === "given") {
//         await nursingService.administerMedication(payload);
//       } else if (actionType === "missed") {
//         await nursingService.missedMedication(payload);
//       } else if (actionType === "refused") {
//         await nursingService.refusedMedication(payload);
//       } else if (actionType === "wasted") {
//         await nursingService.wastedMedication(payload);
//       }

//       notify(`${med.drug_name} recorded as ${actionType} successfully`, "success");
//       onSave();
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Failed to record administration", "error");
//     } finally {
//       setSubmitting(false);
//     }
//   };

  
//   // const handleSubmit = async (e: React.FormEvent) => {
//   //   e.preventDefault();
//   //   if (!dose.trim()) { notify("Dose is required", "warning"); return; }
//   //   if (!administeredAt) { notify("Administered at time is required", "warning"); return; }
    
//   //   if (actionType !== "given" && !remarks.trim()) {
//   //     notify("Remarks/Reason is required for missed, refused, or wasted medications.", "warning");
//   //     return;
//   //   }
//   //   if (actionType === "wasted" && !witnessId.trim()) {
//   //     notify("Witness Staff ID is required for wasted medications.", "warning");
//   //     return;
//   //   }

//   //   setSubmitting(true);
//   //   try {
//   //     const payload: any = {
//   //       encounter_number: encounterNumber,
//   //       prescription_id: med.prescription_id,
//   //       drug_id: med.drug_id,
//   //       dose,
//   //       route: med.route,
//   //       administered_at: fromInputDatetime(administeredAt),
//   //       status: actionType,
//   //     };

//   //     if (actionType === "given") {
//   //       if (volumeMl) payload.volume_ml = Number(volumeMl);
//   //       if (rc.showDiluent && diluent)   payload.diluent = diluent;
//   //       if (rc.showRate && rateMlHr)     payload.rate_ml_hr = Number(rateMlHr);
//   //       if (rc.showFlush && flushMl)     payload.flush_ml = Number(flushMl);
//   //       if (rc.showAccessSite && accessSite) payload.access_site = accessSite;
//   //       if (rc.showBatch && batchNumber) payload.batch_number = batchNumber;
//   //     } else if (actionType === "wasted") {
//   //       payload.witness_staff_id = Number(witnessId);
//   //     }

//   //     if (remarks.trim()) payload.remarks = remarks.trim();

//   //     if (actionType === "given") {
//   //       await nursingService.administerMedication(payload);
//   //     } else if (actionType === "missed") {
//   //       await (nursingService as any).missedMedication(payload);
//   //     } else if (actionType === "refused") {
//   //       await (nursingService as any).refusedMedication(payload);
//   //     } else if (actionType === "wasted") {
//   //       await (nursingService as any).wastedMedication(payload);
//   //     }

//   //     notify(`${med.drug_name} recorded as ${actionType} successfully`, "success");
//   //     onSave();
//   //   } catch (err: any) {
//   //     notify(err.response?.data?.message || "Failed to record administration", "error");
//   //   } finally {
//   //     setSubmitting(false);
//   //   }
//   // };

//   const isGiven = actionType === "given";

//   return (
//     <div style={{ margin: "0 0 0", background: isGiven ? rc.bg : "#fef2f2", border: `1px solid ${isGiven ? rc.color : "#ef4444"}30`, borderRadius: "10px", padding: "14px 16px" }}>
//       <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "14px", color: isGiven ? rc.color : "#dc2626", fontWeight: 800, fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
//         <Plus size={13} /> Record Administration — <span style={{ opacity: 0.85 }}>{rc.label}</span>
//       </div>

//       <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
//         {(["given", "missed", "refused", "wasted"] as const).map(act => (
//           <button
//             key={act}
//             type="button"
//             onClick={() => setActionType(act)}
//             style={{
//               padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 800, textTransform: "uppercase", cursor: "pointer",
//               background: actionType === act ? (act === "given" ? rc.color : "#dc2626") : "#fff",
//               color: actionType === act ? "#fff" : "#64748b",
//               border: `1px solid ${actionType === act ? "transparent" : "#cbd5e1"}`
//             }}
//           >
//             {act}
//           </button>
//         ))}
//       </div>

//       <form onSubmit={handleSubmit}>
//         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
//           <div>
//             <label style={lbl}>Dose <span style={{ color: "#e11d48" }}>*</span></label>
//             <input type="text" value={dose} onChange={e => setDose(e.target.value)} style={inpSm(isGiven ? `${rc.color}60` : `#fca5a5`)} placeholder="e.g. 500mg" autoFocus />
//           </div>
//           <div>
//             <label style={lbl}>Event Time <span style={{ color: "#e11d48" }}>*</span></label>
//             <input type="datetime-local" value={administeredAt} onChange={e => setAdministeredAt(e.target.value)} style={inpSm(isGiven ? `${rc.color}60` : `#fca5a5`)} />
//           </div>
//         </div>

//         {isGiven && (rc.showVolume || rc.showDiluent) && (
//           <div style={{ display: "grid", gridTemplateColumns: rc.showVolume && rc.showDiluent ? "1fr 1fr" : "1fr", gap: "10px", marginBottom: "10px" }}>
//             {rc.showVolume && (
//               <div>
//                 <label style={lbl}>Volume (ml)</label>
//                 <input type="number" step="any" min="0" value={volumeMl} onChange={e => setVolumeMl(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 100" />
//               </div>
//             )}
//             {rc.showDiluent && (
//               <div>
//                 <label style={lbl}>Diluent</label>
//                 <input type="text" value={diluent} onChange={e => setDiluent(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. Normal Saline" />
//               </div>
//             )}
//           </div>
//         )}

//         {isGiven && (rc.showRate || rc.showFlush) && (
//           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
//             {rc.showRate && (
//               <div>
//                 <label style={lbl}>Rate (ml/hr)</label>
//                 <input type="number" min="1" value={rateMlHr} onChange={e => setRateMlHr(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 50" />
//               </div>
//             )}
//             {rc.showFlush && (
//               <div>
//                 <label style={lbl}>Flush (ml)</label>
//                 <input type="number" min="0" value={flushMl} onChange={e => setFlushMl(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 10" />
//               </div>
//             )}
//           </div>
//         )}

//         {isGiven && (rc.showAccessSite || rc.showBatch) && (
//           <div style={{ display: "grid", gridTemplateColumns: rc.showAccessSite && rc.showBatch ? "1fr 1fr" : "1fr", gap: "10px", marginBottom: "10px" }}>
//             {rc.showAccessSite && (
//               <div>
//                 <label style={lbl}>Access Site</label>
//                 <input type="text" value={accessSite} onChange={e => setAccessSite(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. Right forearm" />
//               </div>
//             )}
//             {rc.showBatch && (
//               <div>
//                 <label style={lbl}>Batch / Unit Number</label>
//                 <input type="text" value={batchNumber} onChange={e => setBatchNumber(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. PRBC-20240524" />
//               </div>
//             )}
//           </div>
//         )}

//         {actionType === "wasted" && (
//            <div style={{ marginBottom: "10px" }}>
//              <label style={lbl}>Witness Staff ID <span style={{ color: "#e11d48" }}>*</span></label>
//              <input type="text" value={witnessId} onChange={e => setWitnessId(e.target.value)} style={inpSm(`#fca5a5`)} placeholder="Enter Witness ID" />
//            </div>
//         )}

//         <div style={{ marginBottom: "12px" }}>
//           <label style={lbl}>Remarks <span style={{ fontWeight: !isGiven ? 800 : 400, color: !isGiven ? "#e11d48" : "#aaa", textTransform: "none", letterSpacing: 0 }}>{!isGiven ? "* (Required)" : "(optional)"}</span></label>
//           <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} style={inpSm(isGiven ? `${rc.color}40` : `#fca5a5`)} placeholder={!isGiven ? "Enter reason..." : "e.g. Given slowly over 20 minutes"} />
//         </div>

//         <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
//           <button type="button" style={secBtn} onClick={onCancel}>Cancel</button>
//           <button type="submit" disabled={submitting} style={primBtn(isGiven ? rc.color : "#dc2626")}>
//             {submitting ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle2 size={13} />}
//             Confirm {actionType.charAt(0).toUpperCase() + actionType.slice(1)}
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// };

// // ─── Due Medication Card ──────────────────────────────────────────────────────

// const DueMedCard: React.FC<{
//   med: DueMedication;
//   encounterNumber: string;
//   onSave: () => void;
// }> = ({ med, encounterNumber, onSave }) => {
//   const [showForm, setShowForm] = useState(false);
//   const isDispensed = ["DISPENSED", "PARTIALLY_DISPENSED"].includes((med.dispense_status || "").toUpperCase());
//   const rc = routeConfig(med.route);

//   return (
//     <div style={{
//       background: "#fff",
//       borderRadius: "12px",
//       border: "1px solid #e0e4ef",
//       boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
//       borderLeft: `4px solid ${isDispensed ? rc.color : "#d1d5db"}`,
//       opacity: isDispensed ? 1 : 0.75,
//       marginBottom: "12px",
//     }}>
//       <div style={{ padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
//         <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `${isDispensed ? rc.color : "#6b7280"}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
//           <Pill size={18} color={isDispensed ? rc.color : "#6b7280"} />
//         </div>

//         <div style={{ flex: 1, minWidth: 0 }}>
//           <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
//             <span style={{ fontWeight: 800, fontSize: "18px", color: "#1c2b4a" }}>{med.drug_name}</span>
//             <RouteBadge route={med.route} />
//             <StatusBadge status={med.due_status} size="xs" />
//             {!isDispensed && (
//               <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#fef9c3", color: "#854d0e", fontSize: "12px", fontWeight: 800, padding: "3px 8px", borderRadius: "20px", border: "1px solid #fde047" }}>
//                 <AlertTriangle size={9} /> Not Yet Dispensed
//               </span>
//             )}        
//           </div>

//           <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "4px" }}>
//             {([
//               ["Dose", med.dosage],
//               ["Frequency", med.frequency],
//               med.duration ? ["Duration", `${med.duration} ${med.duration_unit || 'Days'}`] : null,
//               ["Prescribed by", med.prescribed_by],
//             ].filter(Boolean) as [string, string][]).map(([k, v]) => (
//               <div key={k}>
//                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
//                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{v || "—"}</div>
//               </div>
//             ))}
//             {med.prescribed_at && (
//               <div>
//                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Prescribed On</div>
//                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{fmtDt(med.prescribed_at)}</div>
//               </div>
//             )}
//             {med.last_administered_at && (
//               <div>
//                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Last Given</div>
//                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{fmtDt(med.last_administered_at)}</div>
//               </div>
//             )}
//           </div>

//           {med.instructions && (
//             <div style={{ marginTop: "6px", fontSize: "14px", color: "#6b7a9a", fontStyle: "italic" }}>
//               ℹ {med.instructions}
//             </div>
//           )}
//         </div>


        
        
        
//         <button
//           onClick={() => setShowForm(f => !f)}
//           style={{
//             display: "flex", alignItems: "center", gap: "4px",
//             padding: "7px 14px", border: `1.5px solid ${rc.color}`,
//             borderRadius: "8px", background: showForm ? rc.color : "#fff",
//             color: showForm ? "#fff" : rc.color,
//             fontSize: "14px", fontWeight: 800, cursor: "pointer",
//             whiteSpace: "nowrap", transition: "all 0.15s", flexShrink: 0,
//           }}
//         >
//           <CheckCircle2 size={12} />
//           {showForm ? "Cancel" : "Document"}
//         </button>
//       </div>

//       {showForm && (
//         <div style={{ padding: "0 14px 14px" }}>
//           <AdminForm
//             med={med}
//             encounterNumber={encounterNumber}
//             onCancel={() => setShowForm(false)}
//             onSave={() => { setShowForm(false); onSave(); }}
//           />
//         </div>
//       )}
//     </div>
//   );
// };

// // ─── History Card ─────────────────────────────────────────────────────────────

// const HistoryCard: React.FC<{ record: AdminHistory }> = ({ record }) => {
//   const [expanded, setExpanded] = useState(false);
//   const rc = routeConfig(record.route);

//   return (
//     <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e0e4ef", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", borderLeft: `3px solid ${rc.color}`, marginBottom: "10px" }}>
//       <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
//         <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: `${rc.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
//           <Pill size={14} color={rc.color} />
//         </div>

//         <div style={{ flex: 1, minWidth: 0 }}>
//           <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "2px" }}>
//             <span style={{ fontWeight: 800, fontSize: "16px", color: "#1c2b4a" }}>{record.drug_name}</span>
//             <RouteBadge route={record.route} />
//             <StatusBadge status={record.status} size="xs" />
//           </div>
//           <div style={{ fontSize: "14px", color: "#6b7a9a" }}>
//             <span style={{ fontWeight: 600, color: "#1c2b4a" }}>{record.dose}</span>
//             {" · "}
//             <Clock size={9} style={{ display: "inline", verticalAlign: "middle", marginRight: "2px" }} />
//             {fmtDt(record.administered_at)}
//             {" · by "}<span style={{ fontWeight: 600, color: "#1c2b4a" }}>{record.administered_by_name}</span>
//           </div>
//         </div>

//         <button
//           onClick={() => setExpanded(e => !e)}
//           style={{ background: "none", border: "none", cursor: "pointer", color: "#8a94ad", padding: "4px", borderRadius: "6px", lineHeight: 1, flexShrink: 0 }}
//         >
//           {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
//         </button>
//       </div>

//       {expanded && (
//         <div style={{ padding: "0 14px 12px", background: "#f8f9fc", borderTop: "1px dashed #e0e4ef" }}>
//           <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", paddingTop: "10px" }}>
//             {([
//               ["Prescribed Dose", record.dosage],
//               ["Frequency", record.frequency],
//               rc.showDiluent && ["Diluent", record.diluent],
//               rc.showRate && ["Rate", record.rate_ml_hr ? `${record.rate_ml_hr} ml/hr` : null],
//               rc.showAccessSite && ["Access Site", record.access_site],
//               rc.showBatch && ["Batch No.", record.batch_number],
//             ].filter(Boolean) as [string, string | null][]).map(([k, v]) => (
//               <div key={k}>
//                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
//                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{v || "—"}</div>
//               </div>
//             ))}
//           </div>
//           {record.remarks && (
//             <div style={{ marginTop: "8px", fontSize: "14px", color: "#6b7a9a", fontStyle: "italic" }}>
//               "{record.remarks}"
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };

// // ─── Main MARPanel ────────────────────────────────────────────────────────────

// const MARPanel: React.FC<MARPanelProps> = ({ encounterNumber, onClose }) => {
//   const [activeTab, setActiveTab] = useState<"paperGrid" | "grid" | "due" | "history">("paperGrid");
  
//   // Data States
//   const [dueMeds, setDueMeds] = useState<DueMedication[]>([]);
//   const [history, setHistory] = useState<AdminHistory[]>([]);
  
//   // Separate states for Weekly vs Monthly grids
//   const [weeklyHeaders, setWeeklyHeaders] = useState<MarGridHeader[]>([]);
//   const [weeklyRows, setWeeklyRows] = useState<MarGridRow[]>([]);
  
//   const [monthlyHeaders, setMonthlyHeaders] = useState<MarGridHeader[]>([]);
//   const [monthlyRows, setMonthlyRows] = useState<MarGridRow[]>([]);
  
//   // Loading States
//   const [loadingDue, setLoadingDue] = useState(true);
//   const [loadingHistory, setLoadingHistory] = useState(true);
//   const [loadingWeeklyGrid, setLoadingWeeklyGrid] = useState(true);
//   const [loadingMonthlyGrid, setLoadingMonthlyGrid] = useState(true);
  
//   // Calendar State for Monthly Grid
//   const today = new Date();
//   const todayStr = getTodayDateString(); 
//   const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
//   const [currentYear, setCurrentYear] = useState(today.getFullYear());
//   const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

//   // Shared Modal States
//   const [activeSlot, setActiveSlot] = useState<{ row: MarGridRow; date: string; slot: MarGridSlot; defaultTime?: string } | null>(null);
//   const [viewSlotDetail, setViewSlotDetail] = useState<{ row: MarGridRow; date: string; slot: MarGridSlot } | null>(null);

//   const handlePrevMonth = () => {
//     if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(y => y - 1); }
//     else { setCurrentMonth(m => m - 1); }
//   };

//   const handleNextMonth = () => {
//     if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(y => y + 1); }
//     else { setCurrentMonth(m => m + 1); }
//   };

//   const fetchDue = useCallback(async () => {
//     setLoadingDue(true);
//     try {
//       const res = await nursingService.getMARDue(encounterNumber);
//       setDueMeds(res.data || []);
//     } catch {
//       setDueMeds([]);
//     } finally { setLoadingDue(false); }
//   }, [encounterNumber]);

//   const fetchHistory = useCallback(async () => {
//     setLoadingHistory(true);
//     try {
//       const res = await nursingService.getMARHistory(encounterNumber);
//       setHistory(res.data || []);
//     } catch {
//       setHistory([]);
//     } finally { setLoadingHistory(false); }
//   }, [encounterNumber]);

//   const fetchWeeklyGrid = useCallback(async () => {
//     setLoadingWeeklyGrid(true);
//     try {
//       const res = await nursingService.getMARDueHistory(encounterNumber);
//       setWeeklyHeaders(res.data?.headers || []);
//       setWeeklyRows(res.data?.rows || []);
//     } catch {
//       setWeeklyHeaders([]);
//       setWeeklyRows([]);
//     } finally { setLoadingWeeklyGrid(false); }
//   }, [encounterNumber]);

//   const fetchMonthlyGrid = useCallback(async () => {
//     setLoadingMonthlyGrid(true);
//     try {
//       const fetchFn = (nursingService as any).getMARMonth; 
//       let res;
//       if (fetchFn) {
//          res = await fetchFn(encounterNumber, currentMonth, currentYear);
//       } else {
//          console.warn("nursingService.getMARMonth not found! Falling back to getMARDueHistory");
//          res = await nursingService.getMARDueHistory(encounterNumber);
//       }
//       setMonthlyHeaders(res?.data?.headers || []);
//       setMonthlyRows(res?.data?.rows || []);
//     } catch {
//       setMonthlyHeaders([]);
//       setMonthlyRows([]);
//     } finally { setLoadingMonthlyGrid(false); }
//   }, [encounterNumber, currentMonth, currentYear]);

//   useEffect(() => {
//     fetchDue();
//     fetchHistory();
//     fetchWeeklyGrid();
//   }, [fetchDue, fetchHistory, fetchWeeklyGrid]);

//   useEffect(() => {
//     fetchMonthlyGrid();
//   }, [fetchMonthlyGrid]);

//   const handleAdminSave = () => {
//     fetchDue();
//     fetchHistory();
//   };

//   const handleGridAdminSave = () => {
//     setActiveSlot(null);
//     fetchDue();
//     fetchHistory();
//     fetchWeeklyGrid();
//     fetchMonthlyGrid();
//   };

//   const openNewDoseModal = (row: MarGridRow, dateString: string) => {
//     const genericSlot: MarGridSlot = {
//       status: "pending",
//       scheduled_label: "Unscheduled",
//       actual_label: null,
//       admin_id: null,
//       remarks: null,
//       is_overdue: false
//     };
//     const defaultTime = dateString === todayStr ? getLocalTimestamp() : `${dateString} 09:00:00`;
//     setActiveSlot({ row, date: dateString, slot: genericSlot, defaultTime });
//   };

//   const TEAL = "#0d9488";
//   const TEAL_DARK = "#0f766e";
//   const ACTIVE_COL_BG = "#dcfce7"; 

//   const tabBtn = (tab: "due" | "history" | "grid" | "paperGrid"): React.CSSProperties => ({
//     flex: 1, padding: "9px 12px", border: "none", cursor: "pointer",
//     fontSize: "15px", fontWeight: 800, display: "flex", alignItems: "center",
//     justifyContent: "center", gap: "6px", transition: "all 0.15s",
//     borderBottom: activeTab === tab ? `2px solid ${TEAL}` : "2px solid transparent",
//     background: activeTab === tab ? "#f0fdfa" : "#f8f9fc",
//     color: activeTab === tab ? TEAL_DARK : "#6b7a9a",
//   });

//   return (
//     <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #d8dce8", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>

//       {/* ── Panel header ── */}
//       <div style={{ background: `linear-gradient(135deg, ${TEAL_DARK} 0%, ${TEAL} 100%)`, padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
//         <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//           <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
//             <ClipboardList size={16} color="#fff" />
//           </div>
//           <div>
//             <div style={{ fontWeight: 900, fontSize: "16px", color: "#fff", letterSpacing: "0.3px" }}>Medication Administration Record</div>
//             <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", marginTop: "1px" }}>MAR · {encounterNumber}</div>
//           </div>
//           {dueMeds.length > 0 && (
//             <span style={{ background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: "13px", fontWeight: 800, padding: "3px 10px", borderRadius: "20px", marginLeft: "4px" }}>
//               {dueMeds.length} scheduled
//             </span>
//           )}
//         </div>
//         {onClose && (
//           <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "7px", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer" }}>
//             <X size={16} />
//           </button>
//         )}
//       </div>

//       {/* ── Tabs ── */}
//       <div style={{ display: "flex", borderBottom: "1px solid #e0e4ef", flexShrink: 0 }}>
//         <button style={tabBtn("due")} onClick={() => setActiveTab("due")}>
//           <Pill size={13} /> Scheduled Medications
//           {!loadingDue && dueMeds.length > 0 && (
//             <span style={{ background: TEAL, color: "#fff", borderRadius: "20px", fontSize: "12px", fontWeight: 900, padding: "1px 6px", marginLeft: "2px" }}>
//               {dueMeds.length}
//             </span>
//           )}
//         </button>
        
//         <button style={tabBtn("history")} onClick={() => setActiveTab("history")}>
//           <History size={13} /> Administration History
//           {!loadingHistory && history.length > 0 && (
//             <span style={{ background: "#6b7a9a", color: "#fff", borderRadius: "20px", fontSize: "12px", fontWeight: 900, padding: "1px 6px", marginLeft: "2px" }}>
//               {history.length}
//             </span>
//           )}
//         </button>
        
//         <button style={tabBtn("paperGrid")} onClick={() => setActiveTab("paperGrid")}>
//           <LayoutGrid size={13} /> Monthly MAR 
//         </button>
//         <button style={tabBtn("grid")} onClick={() => setActiveTab("grid")}>
//           <LayoutGrid size={13} /> Weekly Chart
//         </button>
//       </div>

//       {/* ── Tab Body ── */}
//       <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px", flex: 1, overflowY: "auto" }}>

//         {/* DUE TAB */}
//         {activeTab === "due" && (
//           <>
//             {loadingDue ? (
//               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a", fontSize: "16px" }}>
//                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
//                 Loading scheduled medications…
//               </div>
//             ) : dueMeds.length === 0 ? (
//               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a" }}>
//                 <CheckCircle2 size={32} color="#a7f3d0" />
//                 <span style={{ fontSize: "16px", fontWeight: 700, color: "#0f766e" }}>No scheduled medications</span>
//                 <span style={{ fontSize: "14px", color: "#8a94ad" }}>All scheduled medications have been administered or have expired.</span>
//               </div>
//             ) : (
//               dueMeds.map(med => (
//                 <DueMedCard
//                   key={med.prescription_id}
//                   med={med}
//                   encounterNumber={encounterNumber}
//                   onSave={handleAdminSave}
//                 />
//               ))
//             )}
//           </>
//         )}

//         {/* HISTORY TAB */}
//         {activeTab === "history" && (
//           <>
//             {loadingHistory ? (
//               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a", fontSize: "16px" }}>
//                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
//                 Loading history…
//               </div>
//             ) : history.length === 0 ? (
//               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a" }}>
//                 <History size={32} color="#d1d5db" />
//                 <span style={{ fontSize: "16px", fontWeight: 700 }}>No administration history</span>
//                 <span style={{ fontSize: "14px", color: "#8a94ad" }}>Administered medications will appear here</span>
//               </div>
//             ) : (
//               <>
//                 <div style={{ fontSize: "13px", fontWeight: 700, color: "#8a94ad", textTransform: "uppercase", letterSpacing: "0.6px", padding: "0 2px 4px" }}>
//                   {history.length} record{history.length !== 1 ? "s" : ""} found
//                 </div>
//                 {[...history]
//                   .sort((a, b) => new Date(b.administered_at.replace(" ", "T")).getTime() - new Date(a.administered_at.replace(" ", "T")).getTime())
//                   .map(record => (
//                     <HistoryCard key={record.id} record={record} />
//                   ))
//                 }
//               </>
//             )}
//           </>
//         )}

//         {/* WEEKLY GRID TAB */}
//         {activeTab === "grid" && (
//           <>
//             {loadingWeeklyGrid ? (
//               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a", fontSize: "16px" }}>
//                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
//                 Loading weekly chart…
//               </div>
//             ) : weeklyRows.length === 0 ? (
//               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a" }}>
//                 <LayoutGrid size={32} color="#d1d5db" />
//                 <span style={{ fontSize: "16px", fontWeight: 700 }}>No medications scheduled this week</span>
//               </div>
//             ) : (
//               <div style={{ overflowX: "auto", border: "1px solid #e0e4ef", borderRadius: "10px" }}>
//                 <table style={{ borderCollapse: "collapse", width: "100%", minWidth: `${300 + weeklyHeaders.length * 120}px` }}>
//                   <thead>
//                     <tr>
//                       <th style={{
//                         position: "sticky", left: 0, zIndex: 2, background: "#f8f9fc",
//                         textAlign: "left", padding: "10px 14px", fontSize: "13px", fontWeight: 800,
//                         color: "#6b7a9a", textTransform: "uppercase", letterSpacing: "0.5px",
//                         borderBottom: "1px solid #e0e4ef", borderRight: "1px solid #e0e4ef",
//                         minWidth: "300px", width: "300px"
//                       }}>
//                         Medication Details
//                       </th>
//                       {weeklyHeaders.map(h => (
//                         <th key={h.date} style={{
//                           padding: "10px 12px", fontSize: "13px", fontWeight: 800, color: "#6b7a9a",
//                           textTransform: "uppercase", letterSpacing: "0.5px", background: h.date === todayStr ? ACTIVE_COL_BG : "#f8f9fc",
//                           borderBottom: "1px solid #e0e4ef", borderLeft: "1px solid #eef1f7", minWidth: "120px",
//                         }}>
//                           <div style={{ color: h.date === todayStr ? "#166534" : "inherit" }}>{h.day_name}</div>
//                           <div style={{ fontWeight: 600, color: h.date === todayStr ? "#16a34a" : "#8a94ad", marginTop: "2px" }}>{h.display}</div>
//                         </th>
//                       ))}
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {weeklyRows.map(row => {
//                       const isInactive = row.prescription_status === "STOPPED" || row.prescription_status === "CANCELLED";
//                       return (
//                         <tr key={row.prescription_id} style={{ opacity: isInactive ? 0.65 : 1, background: isInactive ? "#f8fafc" : "#fff" }}>
                          
//                           <td style={{ position: "sticky", left: 0, zIndex: 1, background: isInactive ? "#f8fafc" : "#fff", borderRight: "2px solid #e0e4ef", borderBottom: "1px solid #eef1f7", padding: "12px", verticalAlign: "top" }}>
//                             <div style={{ fontWeight: 900, fontSize: "14px", color: "#0f172a", marginBottom: "4px" }}>
//                                 {row.drug_name}
//                             </div>
//                             <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "8px" }}>
//                                 <RouteBadge route={row.route} />
//                                 <StatusBadge status={row.prescription_status} size="xs" />
//                             </div>
//                             <div style={{ fontSize: "11px", color: "#475569", lineHeight: "1.6" }}>
//                                 <div style={{display: "grid", gridTemplateColumns: "50px 1fr", gap: "2px"}}>
//                                   <strong style={{color: "#1e293b"}}>Dose:</strong> <span>{row.dosage}</span>
//                                   <strong style={{color: "#1e293b"}}>Freq:</strong> <span>{row.frequency}</span>
//                                   {row.duration && <><strong style={{color: "#1e293b"}}>Dur:</strong> <span>{row.duration} {row.duration_unit || "Days"}</span></>}
//                                   <strong style={{color: "#1e293b"}}>By:</strong> <span style={{whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{row.prescribed_by}</span>
//                                   <strong style={{color: "#1e293b"}}>Date:</strong> <span>{fmtDt(row.start_date || "")}</span>
//                                 </div>

//                                          <b>Dispense status: </b>
//                                 <StatusBadge status={row.dispense_status} size="xs" />
//                             </div>
//                             {row.instructions && (
//                                 <div style={{ marginTop: "8px", fontSize: "10px", color: "#64748b", fontStyle: "italic", background: "#f1f5f9", padding: "6px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
//                                   <span style={{fontWeight: 800, color: "#475569"}}>Sig:</span> {row.instructions}
//                                 </div>
//                             )}
//                           </td>

//                           {weeklyHeaders.map(h => {
//                             const slots = row.days[h.date] || [];
//                             return (
//                               <td 
//                                 key={h.date} 
//                                 style={{
//                                   padding: "8px", verticalAlign: "top",
//                                   borderBottom: "1px solid #eef1f7", borderLeft: "1px solid #eef1f7",
//                                   background: h.date === todayStr ? ACTIVE_COL_BG : "transparent",
//                                   cursor: "pointer"
//                                 }}
//                                 onClick={() => openNewDoseModal(row, h.date)}
//                                 title="Click to document a new administration for this day"
//                               >
//                                 {slots.length > 0 && slots.map((slot, i) => (
//                                   <SlotChip
//                                     key={i}
//                                     slot={slot}
//                                     isInactive={isInactive}
//                                     clickable={true}
//                                     onAdminister={() => setActiveSlot({ row, date: h.date, slot, defaultTime: h.date === todayStr ? getLocalTimestamp() : `${h.date} 09:00:00` })}
//                                     onViewDetail={() => setViewSlotDetail({ row, date: h.date, slot })}
//                                   />
//                                 ))}
//                               </td>
//                             );
//                           })}
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                 </table>
//               </div>
//             )}
//           </>
//         )}

//         {/* MONTHLY MAR GRID TAB */}
//         {activeTab === "paperGrid" && (
//           <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            
//             {/* Header controls for Monthly View */}
//             <div style={{ marginBottom: "16px", border: "2px solid #1e293b", borderRadius: "8px", overflow: "hidden", flexShrink: 0 }}>
//               <div style={{ background: "#f8fafc", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #1e293b" }}>
//                 <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px" }}>
//                   Personal Medication Administration Record (MAR)
//                 </h2>
//                 <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
//                   <button onClick={handlePrevMonth} style={{ background: "none", border: "none", cursor: "pointer" }}><ChevronLeft size={20} /></button>
//                   <span style={{ fontSize: "16px", fontWeight: 800, minWidth: "140px", textAlign: "center" }}>
//                     {monthNames[currentMonth - 1]} {currentYear}
//                   </span>
//                   <button onClick={handleNextMonth} style={{ background: "none", border: "none", cursor: "pointer" }}><ChevronRight size={20} /></button>
//                 </div>
//               </div>
              
//               <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", fontSize: "12px", background: "#fff" }}>
//                 <div style={{ padding: "8px", borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1" }}>
//                   <strong>PATIENT NAME:</strong> {encounterNumber}
//                 </div>
//                 <div style={{ padding: "8px", borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1" }}>
//                   <strong>D.O.B.:</strong> —
//                 </div>
//                 <div style={{ padding: "8px", borderBottom: "1px solid #cbd5e1" }}>
//                   <strong>ADDRESS:</strong> —
//                 </div>
//                 <div style={{ padding: "8px", borderRight: "1px solid #cbd5e1", gridColumn: "span 1" }}>
//                   <strong>GP NAME:</strong> —
//                 </div>
//                 <div style={{ padding: "8px", gridColumn: "span 2" }}>
//                   <strong>KNOWN ALLERGIES:</strong> <span style={{ color: "#ef4444", fontWeight: 800 }}>None Recorded</span>
//                 </div>
//               </div>
//             </div>

//             {loadingMonthlyGrid ? (
//               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px", color: "#6b7a9a" }}>
//                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
//               </div>
//             ) : monthlyRows.length === 0 ? (
//               <div style={{ textAlign: "center", padding: "48px", color: "#6b7a9a", fontWeight: 700 }}>No medications scheduled this month</div>
//             ) : (
//               <div style={{ overflowX: "auto", border: "2px solid #1e293b", flex: 1, borderRadius: "6px" }}>
//                 <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed", minWidth: `${280 + (monthlyHeaders.length * 40)}px` }}>
//                   <thead>
//                     <tr>
//                       <th style={{ width: "280px", position: "sticky", left: 0, zIndex: 2, background: "#f8fafc", borderRight: "2px solid #1e293b", borderBottom: "2px solid #1e293b", padding: "12px", textAlign: "left", fontSize: "11px", textTransform: "uppercase" }}>
//                         Medication Details<br/>
//                         <span style={{ fontWeight: 400, color: "#64748b", textTransform: "none" }}>(Name, strength, route, frequency)</span>
//                       </th>
//                       {monthlyHeaders.map(h => (
//                         <th key={h.date} style={{ 
//                           borderBottom: "2px solid #1e293b", borderRight: "1px solid #cbd5e1", 
//                           background: h.date === todayStr ? ACTIVE_COL_BG : "#f8fafc", 
//                           color: h.date === todayStr ? "#166534" : "inherit",
//                           padding: "6px 0", width: "40px", textAlign: "center" 
//                         }}>
//                           <div style={{ fontSize: "10px", color: h.date === todayStr ? "#166534" : "#64748b", fontWeight: 800, marginBottom: "2px" }}>{h.day_name}</div>
//                           <div style={{ fontSize: "15px", fontWeight: 900 }}>{h.display}</div>
//                         </th>
//                       ))}
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {monthlyRows.map(row => {
//                       const isInactive = row.prescription_status === "STOPPED" || row.prescription_status === "CANCELLED";
//                       return (
//                         <tr key={row.prescription_id} style={{ opacity: isInactive ? 0.65 : 1, background: isInactive ? "#f1f5f9" : "#fff" }}>
                          
//                           <td style={{ position: "sticky", left: 0, zIndex: 1, background: isInactive ? "#f1f5f9" : "#fff", borderRight: "2px solid #1e293b", borderBottom: "1px solid #cbd5e1", padding: "12px", verticalAlign: "top" }}>
//                             <div style={{ fontWeight: 900, fontSize: "14px", color: "#0f172a", marginBottom: "4px" }}>
//                                 {row.drug_name}
//                             </div>
//                             <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "8px" }}>
//                                 <RouteBadge route={row.route} />
//                                 <StatusBadge status={row.prescription_status} size="xs" />
//                             </div>
//                             <div style={{ fontSize: "11px", color: "#475569", lineHeight: "1.6" }}>
//                                 <div style={{display: "grid", gridTemplateColumns: "50px 1fr", gap: "2px"}}>
//                                   <strong style={{color: "#1e293b"}}>Dose:</strong> <span>{row.dosage}</span>
//                                   <strong style={{color: "#1e293b"}}>Freq:</strong> <span>{row.frequency}</span>
//                                   {row.duration && <><strong style={{color: "#1e293b"}}>Dur:</strong> <span>{row.duration} {row.duration_unit || "Days"}</span></>}
//                                   <strong style={{color: "#1e293b"}}>By:</strong> <span style={{whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{row.prescribed_by}</span>
//                                   <strong style={{color: "#1e293b"}}>Date:</strong> <span>{fmtDt(row.start_date || "")}</span>
//                                 </div>
//                                 <b>Dispense status: </b>
//                                 <StatusBadge status={row.dispense_status} size="xs" />
//                             </div>
//                             {row.instructions && (
//                                 <div style={{ marginTop: "8px", fontSize: "10px", color: "#64748b", fontStyle: "italic", background: "#f8fafc", padding: "6px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
//                                   <span style={{fontWeight: 800, color: "#475569"}}>Sig:</span> {row.instructions}
//                                 </div>
//                             )}
//                           </td>

//                           {monthlyHeaders.map(h => {
//                             const slots = row.days[h.date] || [];
//                             const colBackground = h.date === todayStr ? ACTIVE_COL_BG : "transparent";
                            
//                             return (
//                               <td 
//                                 key={h.date} 
//                                 style={{ 
//                                   borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1", 
//                                   padding: "3px", verticalAlign: "top", background: colBackground,
//                                   cursor: "pointer"
//                                 }}
//                                 onClick={() => openNewDoseModal(row, h.date)}
//                                 title="Click to document a new administration for this day"
//                               >
//                                 {slots.length > 0 && slots.map((slot, i) => (
//                                   <CompactSlotChip
//                                     key={i}
//                                     slot={slot}
//                                     isInactive={isInactive}
//                                     clickable={true}
//                                     onAction={() => {
//                                       const isPending = (slot.status || "").toLowerCase() === "pending";
//                                       if (isPending) setActiveSlot({ row, date: h.date, slot, defaultTime: h.date === todayStr ? getLocalTimestamp() : `${h.date} 09:00:00` });
//                                       else setViewSlotDetail({ row, date: h.date, slot });
//                                     }}
//                                   />
//                                 ))}
//                               </td>
//                             );
//                           })}
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                 </table>
//               </div>
//             )}
//           </div>
//         )}
//       </div>

//       {/* ── Shared Grid Slot Administer Modal ── */}
//       {activeSlot && (
//         <div
//           style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "16px" }}
//           onClick={() => setActiveSlot(null)}
//         >
//           <div style={{ width: "100%", maxWidth: "460px" }} onClick={e => e.stopPropagation()}>
//             <AdminForm
//               med={{
//                 prescription_id: activeSlot.row.prescription_id,
//                 drug_name: activeSlot.row.drug_name,
//                 drug_id: activeSlot.row.drug_id, 
//                 dosage: activeSlot.row.dosage,
//                 frequency: activeSlot.row.frequency,
//                 route: activeSlot.row.route,
//                 instructions: activeSlot.row.instructions,
//                 dispense_status: activeSlot.row.dispense_status,
//                 prescription_status: activeSlot.row.prescription_status,
//                 prescribed_by: activeSlot.row.prescribed_by,
//                 prescribed_at: activeSlot.row.prescribed_at,
//                 last_admin_id: null,
//                 last_admin_status: null,
//                 last_administered_at: null,
//                 last_administered_by: null,
//                 last_administered_by_name: null,
//                 due_status: activeSlot.row.due_status,
//                 duration: activeSlot.row.duration,
//                 duration_unit: activeSlot.row.duration_unit,
//               }}
//               encounterNumber={encounterNumber}
//               defaultAdminTime={activeSlot.defaultTime}
//               onCancel={() => setActiveSlot(null)}
//               onSave={handleGridAdminSave}
//             />
//           </div>
//         </div>
//       )}

//       {/* ── Shared Grid Slot Detail (View) Modal ── */}
//       {viewSlotDetail && (() => {
//         const fullRecord = history.find(h => h.id === viewSlotDetail.slot.admin_id);
//         const rc = routeConfig(fullRecord?.route || parseDosageInfo(viewSlotDetail.row.dosage_info).route);
//         return (
//           <div
//             style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "16px" }}
//             onClick={() => setViewSlotDetail(null)}
//           >
//             <div style={{ width: "100%", maxWidth: "460px", background: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
//               <div style={{ background: rc.color, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", color: "#fff" }}>
//                 <div>
//                   <div style={{ fontSize: "16px", fontWeight: 800 }}>{viewSlotDetail.row.drug_name}</div>
//                   <div style={{ fontSize: "13px", opacity: 0.85, marginTop: "2px" }}>
//                     Scheduled {viewSlotDetail.slot.scheduled_label} · {fmtDt(viewSlotDetail.date)}
//                   </div>
//                 </div>
//                 <button onClick={() => setViewSlotDetail(null)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "6px", width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer" }}>
//                   <X size={16} />
//                 </button>
//               </div>
//               <div style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
//                 <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
//                   <StatusBadge status={viewSlotDetail.slot.status} />
//                   {fullRecord && <RouteBadge route={fullRecord.route} />}
//                 </div>

//                 {fullRecord ? (
//                   <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
//                     {([
//                       [`Dose ${fullRecord.status ? fullRecord.status.charAt(0).toUpperCase() + fullRecord.status.slice(1).toLowerCase() : 'Given'}`, fullRecord.dose],
//                       // ["Dose Given", fullRecord.dose],
//                       ["Administered At", fmtDt(fullRecord.administered_at)],
//                       ["Given By", fullRecord.administered_by_name],
//                       rc.showDiluent && ["Diluent", fullRecord.diluent],
//                       rc.showRate && ["Rate", fullRecord.rate_ml_hr ? `${fullRecord.rate_ml_hr} ml/hr` : null],
//                       rc.showAccessSite && ["Access Site", fullRecord.access_site],
//                       rc.showBatch && ["Batch No.", fullRecord.batch_number],
//                     ].filter(Boolean) as [string, string | null][]).map(([k, v]) => (
//                       <div key={k}>
//                         <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
//                         <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{v || "—"}</div>
//                       </div>
//                     ))}
//                   </div>
//                 ) : (
//                   <div style={{ fontSize: "14px", color: "#6b7a9a" }}>
//                     Recorded as <strong>{viewSlotDetail.slot.actual_label || viewSlotDetail.slot.status}</strong>.
//                     {" "}Full administration details aren't available for this entry.
//                   </div>
//                 )}

//                 {viewSlotDetail.slot.remarks && (
//                   <div style={{ fontSize: "14px", color: "#6b7a9a", fontStyle: "italic" }}>
//                     "{viewSlotDetail.slot.remarks}"
//                   </div>
//                 )}
//               </div>
//               <div style={{ padding: "14px 18px", borderTop: "1px solid #eef1f7", display: "flex", justifyContent: "flex-end" }}>
//                 <button onClick={() => setViewSlotDetail(null)} style={secBtn}>Close</button>
//               </div>
//             </div>
//           </div>
//         );
//       })()}
//     </div>
//   );
// };

// export default MARPanel;





































































































// "use client";
// import React, { useState, useEffect, useCallback } from "react";
// import {
//   X, Loader2, Clock, CheckCircle2, AlertTriangle, Pill,
//   ClipboardList, History, ChevronDown, ChevronUp, Plus, LayoutGrid, ChevronLeft, ChevronRight
// } from "lucide-react";
// import { nursingService } from "../services/nursing.service";
// import { useNotification } from "../context/NotificationContext";

// // ─── Types ────────────────────────────────────────────────────────────────────

// interface DueMedication {
//   prescription_id: number;
//   drug_name: string;
//   drug_id?: number;
//   dosage: string;
//   frequency: string;
//   route: string;
//   instructions: string | null;
//   dispense_status: string;
//   prescription_status?: string;
//   prescribed_by: string;
//   prescribed_at: string | null;
//   last_admin_id: number | null;
//   last_admin_status: string | null;
//   last_administered_at: string | null;
//   last_administered_by: string | null;
//   last_administered_by_name: string | null;
//   due_status: string;
//   duration?: number;
//   duration_unit?: string;
// }

// interface AdminHistory {
//   id: number;
//   prescription_id: number;
//   drug_id: number;
//   drug_name: string;
//   dosage: string;
//   dose: string;
//   route: string;
//   frequency: string;
//   diluent: string | null;
//   rate_ml_hr: number | null;
//   access_site: string | null;
//   batch_number: string | null;
//   administered_at: string;
//   administered_by_name: string;
//   status: string;
//   remarks: string | null;
// }

// interface MarGridHeader {
//   date: string;
//   display: string;
//   day_name: string;
// }

// interface MarGridSlot {
//   status: string;
//   scheduled_label: string;
//   actual_label: string | null;
//   admin_id: number | null;
//   remarks: string | null;
//   is_overdue: boolean;
// }

// interface MarGridRow {
//   prescription_id: number;
//   drug_id?: number;
//   drug_name: string;
//   dosage: string;
//   frequency: string;
//   route: string;
//   instructions: string | null;
//   dispense_status: string;
//   prescribed_by: string;
//   prescribed_at: string | null;
//   duration?: number;
//   duration_unit?: string;
//   dosage_info: string;
//   start_date: string;
//   prescription_status: string;
//   due_status: string;
//   days: Record<string, MarGridSlot[]>;
// }

// interface MARPanelProps {
//   encounterNumber: string;
//   onClose?: () => void;
// }

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// const getLocalTimestamp = (date: Date = new Date()): string => {
//   const pad = (n: number) => n.toString().padStart(2, "0");
//   return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
// };

// const getTodayDateString = (): string => {
//   const date = new Date();
//   const pad = (n: number) => n.toString().padStart(2, "0");
//   return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
// };

// const toInputDatetime = (dt: string): string => {
//   if (!dt) return "";
//   return dt.replace(" ", "T").slice(0, 16);
// };

// const fromInputDatetime = (val: string): string => {
//   if (!val) return "";
//   return val.replace("T", " ") + ":00";
// };

// const fmtDt = (dt: string) => {
//   if (!dt) return "—";
//   try {
//     return new Date(dt.replace(" ", "T")).toLocaleString("en-GB", {
//       day: "2-digit", month: "2-digit", year: "2-digit",
//       hour: "2-digit", minute: "2-digit",
//     });
//   } catch { return dt; }
// };

// const parseDosageInfo = (info: string): { dosage: string; frequency: string; route: string } => {
//   const routeMatch = info.match(/\(([^)]+)\)\s*\$/);
//   const route = routeMatch ? routeMatch[1] : "";
//   const withoutRoute = info.replace(/\([^)]+\)\s*\$/, "").trim();
//   const [dosage = "", frequency = ""] = withoutRoute.split(" - ").map(s => s.trim());
//   return { dosage, frequency, route };
// };

// const routeConfig = (route: string): {
//   showVolume: boolean; showDiluent: boolean; showRate: boolean;
//   showFlush: boolean; showAccessSite: boolean; showBatch: boolean;
//   label: string; color: string; bg: string;
// } => {
//   const r = (route || "").toUpperCase();
//   if (r === "IV")      return { showVolume: true,  showDiluent: true,  showRate: true,  showFlush: true,  showAccessSite: true,  showBatch: false, label: "IV Infusion",     color: "#1d4ed8", bg: "#eff6ff" };
//   if (r === "SC" || r === "IM") return { showVolume: true,  showDiluent: false, showRate: false, showFlush: false, showAccessSite: true,  showBatch: false, label: r + " Injection",  color: "#7c3aed", bg: "#f5f3ff" };
//   if (r === "PO" || r === "SL") return { showVolume: false, showDiluent: false, showRate: false, showFlush: false, showAccessSite: false, showBatch: false, label: "Oral",            color: "#0f766e", bg: "#f0fdfa" };
//   if (r === "BLOOD")  return { showVolume: true,  showDiluent: false, showRate: false, showFlush: false, showAccessSite: true,  showBatch: true,  label: "Blood Product",   color: "#b91c1c", bg: "#fef2f2" };
//   if (r === "NG" || r === "PEG") return { showVolume: true, showDiluent: false, showRate: false, showFlush: false, showAccessSite: false, showBatch: false, label: "NG/PEG Feed",    color: "#b45309", bg: "#fefce8" };
//   return { showVolume: true, showDiluent: true, showRate: false, showFlush: false, showAccessSite: false, showBatch: false, label: route, color: "#1c3d7a", bg: "#f8f9fc" };
// };

// // ─── Shared Styles ────────────────────────────────────────────────────────────

// const lbl: React.CSSProperties = {
//   display: "block", fontSize: "13px", fontWeight: 700, color: "#6b7a9a",
//   textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "5px",
// };
// const inp: React.CSSProperties = {
//   width: "100%", padding: "9px 12px", border: "1px solid #d0d6e6",
//   borderRadius: "9px", fontSize: "16px", fontWeight: 500, color: "#1c2b4a",
//   background: "#f8f9fc", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
// };
// const inpSm = (borderColor: string): React.CSSProperties => ({
//   ...inp, background: "#fff", border: `1px solid ${borderColor}`,
//   padding: "8px 10px", fontSize: "15px", borderRadius: "8px",
// });
// const secBtn: React.CSSProperties = {
//   flex: "0 0 auto", padding: "8px 16px", border: "1px solid #d0d6e6",
//   borderRadius: "9px", fontSize: "15px", fontWeight: 700, color: "#4a5568",
//   background: "#fff", cursor: "pointer", whiteSpace: "nowrap",
// };
// const primBtn = (bg: string): React.CSSProperties => ({
//   flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center",
//   gap: "6px", padding: "8px 18px", border: "none", borderRadius: "9px",
//   fontSize: "15px", fontWeight: 700, color: "#fff", background: bg, cursor: "pointer",
//   whiteSpace: "nowrap",
// });

// // ─── Status badge ─────────────────────────────────────────────────────────────

// const StatusBadge: React.FC<{ status: string; size?: "sm" | "xs" }> = ({ status, size = "sm" }) => {
//   const s = (status || "").toUpperCase();
//   const map: Record<string, { bg: string; color: string; dot: string }> = {
//     GIVEN:      { bg: "#dcfce7", color: "#166534", dot: "#16a34a" },
//     HELD:       { bg: "#fef9c3", color: "#854d0e", dot: "#ca8a04" },
//     REFUSED:    { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626" },
//     WASTED:     { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626" },
//     MISSED:     { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626" },
//     OMITTED:    { bg: "#f3f4f6", color: "#374151", dot: "#9ca3af" },
//     DISPENSED:  { bg: "#dcfce7", color: "#166534", dot: "#16a34a" },
//     PENDING:    { bg: "#fef9c3", color: "#854d0e", dot: "#ca8a04" },
//     DUE:        { bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
//     OVERDUE:    { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626" },
//     STOPPED:    { bg: "#f1f5f9", color: "#64748b", dot: "#94a3b8" },
//     CANCELLED:  { bg: "#f1f5f9", color: "#64748b", dot: "#94a3b8" },
//   };
//   const cfg = map[s] || { bg: "#f3f4f6", color: "#374151", dot: "#9ca3af" };
//   const fs = size === "xs" ? "12px" : "13px";
//   return (
//     <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: cfg.bg, color: cfg.color, fontSize: fs, fontWeight: 800, textTransform: "uppercase", padding: "3px 8px", borderRadius: "20px", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>
//       <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: cfg.dot, display: "inline-block", flexShrink: 0 }} />
//       {status}
//     </span>
//   );
// };

// const RouteBadge: React.FC<{ route: string }> = ({ route }) => (
//   <span style={{ display: "inline-block", background: "#ccfbf1", color: "#0f766e", fontSize: "12px", fontWeight: 800, textTransform: "uppercase", padding: "3px 8px", borderRadius: "20px", letterSpacing: "0.5px" }}>
//     {route}
//   </span>
// );

// // ─── Grid slot colors ────────────────────────────────────────────────────────

// const slotColors = (slot: MarGridSlot, isInactive: boolean): { bg: string; color: string; border: string } => {
//   if (isInactive) return { bg: "#f8fafc", color: "#94a3b8", border: "#e2e8f0" };
//   const s = (slot.status || "").toLowerCase();
  
//   if (s === "given" || s === "administered") return { bg: "#dcfce7", color: "#166534", border: "#86efac" };
//   if (s === "missed" || s === "refused" || s === "omitted" || s === "wasted" || slot.is_overdue) return { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" };
//   if (s === "held") return { bg: "#fef9c3", color: "#854d0e", border: "#fde047" };
  
//   return { bg: "#ffffff", color: "#475569", border: "#cbd5e1" };
// };

// // ─── Weekly Grid Chip (Wider) ────────────────────────────────────────────────
// const SlotChip: React.FC<{ slot: MarGridSlot; isInactive: boolean; clickable: boolean; onAdminister: () => void; onViewDetail: () => void }> = ({ slot, isInactive, clickable, onAdminister, onViewDetail }) => {
//   const c = slotColors(slot, isInactive);
//   const isPending = (slot.status || "").toLowerCase() === "pending";
//   const hasDetail = !isPending && (slot.admin_id != null || !!slot.actual_label || !!slot.remarks);
//   const isActionable = (isPending && clickable) || hasDetail;
  
//   let displayLabel = slot.actual_label ? slot.actual_label.replace("A - ", "") : slot.scheduled_label;
//   if (!slot.actual_label && isPending && slot.is_overdue) displayLabel = "Overdue";
//   else if (["missed", "refused", "wasted"].includes((slot.status || "").toLowerCase())) displayLabel = slot.status.charAt(0).toUpperCase() + slot.status.slice(1);

//   return (
//     <button
//       type="button"
//       onClick={(e) => {
//         e.stopPropagation();
//         if (isActionable) {
//           isPending ? onAdminister() : onViewDetail();
//         }
//       }}
//       title={slot.remarks || undefined}
//       style={{
//         display: "block", width: "100%", textAlign: "left", marginBottom: "4px",
//         padding: "4px 7px", borderRadius: "6px", border: `1px solid ${c.border}`,
//         background: c.bg, color: c.color, fontSize: "13px", fontWeight: 800,
//         cursor: isActionable ? "pointer" : "default", whiteSpace: "nowrap",
//       }}
//     >
//       {displayLabel}
//     </button>
//   );
// };

// // ─── Monthly Grid Chip (Extra Compact 1-31 Days) ──────────────────────────────
// const CompactSlotChip: React.FC<{ slot: MarGridSlot; isInactive: boolean; clickable: boolean; onAction: () => void; }> = ({ slot, isInactive, clickable, onAction }) => {
//   const c = slotColors(slot, isInactive);
//   const isPending = (slot.status || "").toLowerCase() === "pending";
//   const hasDetail = !isPending && (slot.admin_id != null || !!slot.actual_label || !!slot.remarks);
//   const isActionable = (isPending && clickable) || hasDetail;
  
//   let text = slot.actual_label || slot.scheduled_label || "PRN";
//   text = text.replace("S - ", "").replace("A - ", "");

//   if (slot.status.toLowerCase() === "missed") text = "Missed";
//   if (slot.status.toLowerCase() === "refused") text = "Refused";
//   if (slot.status.toLowerCase() === "wasted") text = "Wasted";
//   if (isPending && slot.is_overdue) text = "Overdue";

//   return (
//       <button
//         type="button"
//         onClick={(e) => {
//           e.stopPropagation();
//           if (isActionable) onAction();
//         }}
//         title={slot.remarks || (isPending ? `Scheduled: ${slot.scheduled_label}` : `Given: ${slot.actual_label}`)}
//         style={{
//           display: "block", width: "100%", textAlign: "center", marginBottom: "3px",
//           padding: "3px 0", borderRadius: "3px", border: `1px solid ${c.border}`,
//           background: c.bg, color: c.color, fontSize: "10px", fontWeight: 800,
//           cursor: isActionable ? "pointer" : "default", overflow: "hidden",
//         }}
//       >
//         {text}
//       </button>
//     );
// };

// // ─── Inline Administration Form ───────────────────────────────────────────────

// const AdminForm: React.FC<{
//   med: DueMedication;
//   encounterNumber: string;
//   defaultAdminTime?: string;
//   onCancel: () => void;
//   onSave: () => void;
// }> = ({ med, encounterNumber, defaultAdminTime, onCancel, onSave }) => {
//   const rc = routeConfig(med.route);
//   const { notify } = useNotification();
//   const [submitting, setSubmitting] = useState(false);
//   const [actionType, setActionType] = useState<"given" | "missed" | "refused" | "wasted">("given");

//   const [dose, setDose] = useState(med.dosage || "");
//   const [administeredAt, setAdministeredAt] = useState(toInputDatetime(defaultAdminTime || getLocalTimestamp()));
//   const [volumeMl, setVolumeMl] = useState("");
//   const [diluent, setDiluent] = useState("");
//   const [rateMlHr, setRateMlHr] = useState("");
//   const [flushMl, setFlushMl] = useState("");
//   const [accessSite, setAccessSite] = useState("");
//   const [batchNumber, setBatchNumber] = useState("");
//   const [witnessId, setWitnessId] = useState("");
//   const [remarks, setRemarks] = useState("");

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!dose.trim()) { notify("Dose is required", "warning"); return; }
//     if (!administeredAt) { notify("Administered at time is required", "warning"); return; }
    
//     if (actionType !== "given" && !remarks.trim()) {
//       notify("Remarks/Reason is required for missed, refused, or wasted medications.", "warning");
//       return;
//     }
//     if (actionType === "wasted" && !witnessId.trim()) {
//       notify("Witness Staff ID is required for wasted medications.", "warning");
//       return;
//     }

//     setSubmitting(true);
//     try {
//       const payload: any = {
//         encounter_number: encounterNumber,
//         prescription_id: med.prescription_id,
//         drug_id: med.drug_id,
//         dose,
//         route: med.route,
//         administered_at: fromInputDatetime(administeredAt),
//         status: actionType,
//       };

//       if (actionType === "given") {
//         if (volumeMl) payload.volume_ml = Number(volumeMl);
//         if (rc.showDiluent && diluent)   payload.diluent = diluent;
//         if (rc.showRate && rateMlHr)     payload.rate_ml_hr = Number(rateMlHr);
//         if (rc.showFlush && flushMl)     payload.flush_ml = Number(flushMl);
//         if (rc.showAccessSite && accessSite) payload.access_site = accessSite;
//         if (rc.showBatch && batchNumber) payload.batch_number = batchNumber;
//       } else if (actionType === "wasted") {
//         payload.witness_staff_id = Number(witnessId);
//       }

//       if (remarks.trim()) payload.remarks = remarks.trim();

//       // IMPORTANT: Ensure your frontend nursingService has these functions mapped to your PHP endpoints
//       if (actionType === "given") {
//         await nursingService.administerMedication(payload);
//       } else if (actionType === "missed") {
//         await (nursingService as any).missedMedication(payload);
//       } else if (actionType === "refused") {
//         await (nursingService as any).refusedMedication(payload);
//       } else if (actionType === "wasted") {
//         await (nursingService as any).wastedMedication(payload);
//       }

//       notify(`${med.drug_name} recorded as ${actionType} successfully`, "success");
//       onSave();
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Failed to record administration", "error");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   const isGiven = actionType === "given";

//   return (
//     <div style={{ margin: "0 0 0", background: isGiven ? rc.bg : "#fef2f2", border: `1px solid ${isGiven ? rc.color : "#ef4444"}30`, borderRadius: "10px", padding: "14px 16px" }}>
//       <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "14px", color: isGiven ? rc.color : "#dc2626", fontWeight: 800, fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
//         <Plus size={13} /> Record Administration — <span style={{ opacity: 0.85 }}>{rc.label}</span>
//       </div>

//       <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
//         {(["given", "missed", "refused", "wasted"] as const).map(act => (
//           <button
//             key={act}
//             type="button"
//             onClick={() => setActionType(act)}
//             style={{
//               padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 800, textTransform: "uppercase", cursor: "pointer",
//               background: actionType === act ? (act === "given" ? rc.color : "#dc2626") : "#fff",
//               color: actionType === act ? "#fff" : "#64748b",
//               border: `1px solid ${actionType === act ? "transparent" : "#cbd5e1"}`
//             }}
//           >
//             {act}
//           </button>
//         ))}
//       </div>

//       <form onSubmit={handleSubmit}>
//         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
//           <div>
//             <label style={lbl}>Dose <span style={{ color: "#e11d48" }}>*</span></label>
//             <input type="text" value={dose} onChange={e => setDose(e.target.value)} style={inpSm(isGiven ? `${rc.color}60` : `#fca5a5`)} placeholder="e.g. 500mg" autoFocus />
//           </div>
//           <div>
//             <label style={lbl}>Event Time <span style={{ color: "#e11d48" }}>*</span></label>
//             <input type="datetime-local" value={administeredAt} onChange={e => setAdministeredAt(e.target.value)} style={inpSm(isGiven ? `${rc.color}60` : `#fca5a5`)} />
//           </div>
//         </div>

//         {isGiven && (rc.showVolume || rc.showDiluent) && (
//           <div style={{ display: "grid", gridTemplateColumns: rc.showVolume && rc.showDiluent ? "1fr 1fr" : "1fr", gap: "10px", marginBottom: "10px" }}>
//             {rc.showVolume && (
//               <div>
//                 <label style={lbl}>Volume (ml)</label>
//                 <input type="number" step="any" min="0" value={volumeMl} onChange={e => setVolumeMl(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 100" />
//               </div>
//             )}
//             {rc.showDiluent && (
//               <div>
//                 <label style={lbl}>Diluent</label>
//                 <input type="text" value={diluent} onChange={e => setDiluent(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. Normal Saline" />
//               </div>
//             )}
//           </div>
//         )}

//         {isGiven && (rc.showRate || rc.showFlush) && (
//           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
//             {rc.showRate && (
//               <div>
//                 <label style={lbl}>Rate (ml/hr)</label>
//                 <input type="number" min="1" value={rateMlHr} onChange={e => setRateMlHr(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 50" />
//               </div>
//             )}
//             {rc.showFlush && (
//               <div>
//                 <label style={lbl}>Flush (ml)</label>
//                 <input type="number" min="0" value={flushMl} onChange={e => setFlushMl(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 10" />
//               </div>
//             )}
//           </div>
//         )}

//         {isGiven && (rc.showAccessSite || rc.showBatch) && (
//           <div style={{ display: "grid", gridTemplateColumns: rc.showAccessSite && rc.showBatch ? "1fr 1fr" : "1fr", gap: "10px", marginBottom: "10px" }}>
//             {rc.showAccessSite && (
//               <div>
//                 <label style={lbl}>Access Site</label>
//                 <input type="text" value={accessSite} onChange={e => setAccessSite(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. Right forearm" />
//               </div>
//             )}
//             {rc.showBatch && (
//               <div>
//                 <label style={lbl}>Batch / Unit Number</label>
//                 <input type="text" value={batchNumber} onChange={e => setBatchNumber(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. PRBC-20240524" />
//               </div>
//             )}
//           </div>
//         )}

//         {actionType === "wasted" && (
//            <div style={{ marginBottom: "10px" }}>
//              <label style={lbl}>Witness Staff ID <span style={{ color: "#e11d48" }}>*</span></label>
//              <input type="text" value={witnessId} onChange={e => setWitnessId(e.target.value)} style={inpSm(`#fca5a5`)} placeholder="Enter Witness ID" />
//            </div>
//         )}

//         <div style={{ marginBottom: "12px" }}>
//           <label style={lbl}>Remarks <span style={{ fontWeight: !isGiven ? 800 : 400, color: !isGiven ? "#e11d48" : "#aaa", textTransform: "none", letterSpacing: 0 }}>{!isGiven ? "* (Required)" : "(optional)"}</span></label>
//           <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} style={inpSm(isGiven ? `${rc.color}40` : `#fca5a5`)} placeholder={!isGiven ? "Enter reason..." : "e.g. Given slowly over 20 minutes"} />
//         </div>

//         <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
//           <button type="button" style={secBtn} onClick={onCancel}>Cancel</button>
//           <button type="submit" disabled={submitting} style={primBtn(isGiven ? rc.color : "#dc2626")}>
//             {submitting ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle2 size={13} />}
//             Confirm {actionType.charAt(0).toUpperCase() + actionType.slice(1)}
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// };

// // ─── Due Medication Card ──────────────────────────────────────────────────────

// const DueMedCard: React.FC<{
//   med: DueMedication;
//   encounterNumber: string;
//   onSave: () => void;
// }> = ({ med, encounterNumber, onSave }) => {
//   const [showForm, setShowForm] = useState(false);
//   const isDispensed = ["DISPENSED", "PARTIALLY_DISPENSED"].includes((med.dispense_status || "").toUpperCase());
//   const rc = routeConfig(med.route);

//   return (
//     <div style={{
//       background: "#fff",
//       borderRadius: "12px",
//       border: "1px solid #e0e4ef",
//       boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
//       borderLeft: `4px solid ${isDispensed ? rc.color : "#d1d5db"}`,
//       opacity: isDispensed ? 1 : 0.75,
//       marginBottom: "12px",
//     }}>
//       <div style={{ padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
//         <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `${isDispensed ? rc.color : "#6b7280"}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
//           <Pill size={18} color={isDispensed ? rc.color : "#6b7280"} />
//         </div>

//         <div style={{ flex: 1, minWidth: 0 }}>
//           <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
//             <span style={{ fontWeight: 800, fontSize: "18px", color: "#1c2b4a" }}>{med.drug_name}</span>
//             <RouteBadge route={med.route} />
//             <StatusBadge status={med.due_status} size="xs" />
//             {!isDispensed && (
//               <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#fef9c3", color: "#854d0e", fontSize: "12px", fontWeight: 800, padding: "3px 8px", borderRadius: "20px", border: "1px solid #fde047" }}>
//                 <AlertTriangle size={9} /> Not Yet Dispensed
//               </span>
//             )}
//           </div>

//           <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "4px" }}>
//             {([
//               ["Dose", med.dosage],
//               ["Frequency", med.frequency],
//               med.duration ? ["Duration", `${med.duration} ${med.duration_unit || 'Days'}`] : null,
//               ["Prescribed by", med.prescribed_by],
//             ].filter(Boolean) as [string, string][]).map(([k, v]) => (
//               <div key={k}>
//                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
//                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{v || "—"}</div>
//               </div>
//             ))}
//             {med.prescribed_at && (
//               <div>
//                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Prescribed On</div>
//                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{fmtDt(med.prescribed_at)}</div>
//               </div>
//             )}
//             {med.last_administered_at && (
//               <div>
//                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Last Given</div>
//                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{fmtDt(med.last_administered_at)}</div>
//               </div>
//             )}
//           </div>

//           {med.instructions && (
//             <div style={{ marginTop: "6px", fontSize: "14px", color: "#6b7a9a", fontStyle: "italic" }}>
//               ℹ {med.instructions}
//             </div>
//           )}
//         </div>

//         <button
//           onClick={() => setShowForm(f => !f)}
//           style={{
//             display: "flex", alignItems: "center", gap: "4px",
//             padding: "7px 14px", border: `1.5px solid ${rc.color}`,
//             borderRadius: "8px", background: showForm ? rc.color : "#fff",
//             color: showForm ? "#fff" : rc.color,
//             fontSize: "14px", fontWeight: 800, cursor: "pointer",
//             whiteSpace: "nowrap", transition: "all 0.15s", flexShrink: 0,
//           }}
//         >
//           <CheckCircle2 size={12} />
//           {showForm ? "Cancel" : "Document"}
//         </button>
//       </div>

//       {showForm && (
//         <div style={{ padding: "0 14px 14px" }}>
//           <AdminForm
//             med={med}
//             encounterNumber={encounterNumber}
//             onCancel={() => setShowForm(false)}
//             onSave={() => { setShowForm(false); onSave(); }}
//           />
//         </div>
//       )}
//     </div>
//   );
// };

// // ─── History Card ─────────────────────────────────────────────────────────────

// const HistoryCard: React.FC<{ record: AdminHistory }> = ({ record }) => {
//   const [expanded, setExpanded] = useState(false);
//   const rc = routeConfig(record.route);

//   return (
//     <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e0e4ef", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", borderLeft: `3px solid ${rc.color}`, marginBottom: "10px" }}>
//       <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
//         <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: `${rc.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
//           <Pill size={14} color={rc.color} />
//         </div>

//         <div style={{ flex: 1, minWidth: 0 }}>
//           <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "2px" }}>
//             <span style={{ fontWeight: 800, fontSize: "16px", color: "#1c2b4a" }}>{record.drug_name}</span>
//             <RouteBadge route={record.route} />
//             <StatusBadge status={record.status} size="xs" />
//           </div>
//           <div style={{ fontSize: "14px", color: "#6b7a9a" }}>
//             <span style={{ fontWeight: 600, color: "#1c2b4a" }}>{record.dose}</span>
//             {" · "}
//             <Clock size={9} style={{ display: "inline", verticalAlign: "middle", marginRight: "2px" }} />
//             {fmtDt(record.administered_at)}
//             {" · by "}<span style={{ fontWeight: 600, color: "#1c2b4a" }}>{record.administered_by_name}</span>
//           </div>
//         </div>

//         <button
//           onClick={() => setExpanded(e => !e)}
//           style={{ background: "none", border: "none", cursor: "pointer", color: "#8a94ad", padding: "4px", borderRadius: "6px", lineHeight: 1, flexShrink: 0 }}
//         >
//           {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
//         </button>
//       </div>

//       {expanded && (
//         <div style={{ padding: "0 14px 12px", background: "#f8f9fc", borderTop: "1px dashed #e0e4ef" }}>
//           <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", paddingTop: "10px" }}>
//             {([
//               ["Prescribed Dose", record.dosage],
//               ["Frequency", record.frequency],
//               rc.showDiluent && ["Diluent", record.diluent],
//               rc.showRate && ["Rate", record.rate_ml_hr ? `${record.rate_ml_hr} ml/hr` : null],
//               rc.showAccessSite && ["Access Site", record.access_site],
//               rc.showBatch && ["Batch No.", record.batch_number],
//             ].filter(Boolean) as [string, string | null][]).map(([k, v]) => (
//               <div key={k}>
//                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
//                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{v || "—"}</div>
//               </div>
//             ))}
//           </div>
//           {record.remarks && (
//             <div style={{ marginTop: "8px", fontSize: "14px", color: "#6b7a9a", fontStyle: "italic" }}>
//               "{record.remarks}"
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };

// // ─── Main MARPanel ────────────────────────────────────────────────────────────

// const MARPanel: React.FC<MARPanelProps> = ({ encounterNumber, onClose }) => {
//   const [activeTab, setActiveTab] = useState<"paperGrid" | "grid" | "due" | "history">("paperGrid");
  
//   // Data States
//   const [dueMeds, setDueMeds] = useState<DueMedication[]>([]);
//   const [history, setHistory] = useState<AdminHistory[]>([]);
  
//   // Separate states for Weekly vs Monthly grids
//   const [weeklyHeaders, setWeeklyHeaders] = useState<MarGridHeader[]>([]);
//   const [weeklyRows, setWeeklyRows] = useState<MarGridRow[]>([]);
  
//   const [monthlyHeaders, setMonthlyHeaders] = useState<MarGridHeader[]>([]);
//   const [monthlyRows, setMonthlyRows] = useState<MarGridRow[]>([]);
  
//   // Loading States
//   const [loadingDue, setLoadingDue] = useState(true);
//   const [loadingHistory, setLoadingHistory] = useState(true);
//   const [loadingWeeklyGrid, setLoadingWeeklyGrid] = useState(true);
//   const [loadingMonthlyGrid, setLoadingMonthlyGrid] = useState(true);
  
//   // Calendar State for Monthly Grid
//   const today = new Date();
//   const todayStr = getTodayDateString(); 
//   const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
//   const [currentYear, setCurrentYear] = useState(today.getFullYear());
//   const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

//   // Shared Modal States
//   const [activeSlot, setActiveSlot] = useState<{ row: MarGridRow; date: string; slot: MarGridSlot; defaultTime?: string } | null>(null);
//   const [viewSlotDetail, setViewSlotDetail] = useState<{ row: MarGridRow; date: string; slot: MarGridSlot } | null>(null);

//   const handlePrevMonth = () => {
//     if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(y => y - 1); }
//     else { setCurrentMonth(m => m - 1); }
//   };

//   const handleNextMonth = () => {
//     if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(y => y + 1); }
//     else { setCurrentMonth(m => m + 1); }
//   };

//   const fetchDue = useCallback(async () => {
//     setLoadingDue(true);
//     try {
//       const res = await nursingService.getMARDue(encounterNumber);
//       setDueMeds(res.data || []);
//     } catch {
//       setDueMeds([]);
//     } finally { setLoadingDue(false); }
//   }, [encounterNumber]);

//   const fetchHistory = useCallback(async () => {
//     setLoadingHistory(true);
//     try {
//       const res = await nursingService.getMARHistory(encounterNumber);
//       setHistory(res.data || []);
//     } catch {
//       setHistory([]);
//     } finally { setLoadingHistory(false); }
//   }, [encounterNumber]);

//   const fetchWeeklyGrid = useCallback(async () => {
//     setLoadingWeeklyGrid(true);
//     try {
//       const res = await nursingService.getMARDueHistory(encounterNumber);
//       setWeeklyHeaders(res.data?.headers || []);
//       setWeeklyRows(res.data?.rows || []);
//     } catch {
//       setWeeklyHeaders([]);
//       setWeeklyRows([]);
//     } finally { setLoadingWeeklyGrid(false); }
//   }, [encounterNumber]);

//   const fetchMonthlyGrid = useCallback(async () => {
//     setLoadingMonthlyGrid(true);
//     try {
//       const fetchFn = (nursingService as any).getMARMonth; 
//       let res;
//       if (fetchFn) {
//          res = await fetchFn(encounterNumber, currentMonth, currentYear);
//       } else {
//          console.warn("nursingService.getMARMonth not found! Falling back to getMARDueHistory");
//          res = await nursingService.getMARDueHistory(encounterNumber);
//       }
//       setMonthlyHeaders(res?.data?.headers || []);
//       setMonthlyRows(res?.data?.rows || []);
//     } catch {
//       setMonthlyHeaders([]);
//       setMonthlyRows([]);
//     } finally { setLoadingMonthlyGrid(false); }
//   }, [encounterNumber, currentMonth, currentYear]);

//   useEffect(() => {
//     fetchDue();
//     fetchHistory();
//     fetchWeeklyGrid();
//   }, [fetchDue, fetchHistory, fetchWeeklyGrid]);

//   useEffect(() => {
//     fetchMonthlyGrid();
//   }, [fetchMonthlyGrid]);

//   const handleAdminSave = () => {
//     fetchDue();
//     fetchHistory();
//   };

//   const handleGridAdminSave = () => {
//     setActiveSlot(null);
//     fetchDue();
//     fetchHistory();
//     fetchWeeklyGrid();
//     fetchMonthlyGrid();
//   };

//   const openNewDoseModal = (row: MarGridRow, dateString: string) => {
//     const genericSlot: MarGridSlot = {
//       status: "pending",
//       scheduled_label: "Unscheduled",
//       actual_label: null,
//       admin_id: null,
//       remarks: null,
//       is_overdue: false
//     };
//     const defaultTime = dateString === todayStr ? getLocalTimestamp() : `${dateString} 09:00:00`;
//     setActiveSlot({ row, date: dateString, slot: genericSlot, defaultTime });
//   };

//   const TEAL = "#0d9488";
//   const TEAL_DARK = "#0f766e";
//   const ACTIVE_COL_BG = "#dcfce7"; 

//   const tabBtn = (tab: "due" | "history" | "grid" | "paperGrid"): React.CSSProperties => ({
//     flex: 1, padding: "9px 12px", border: "none", cursor: "pointer",
//     fontSize: "15px", fontWeight: 800, display: "flex", alignItems: "center",
//     justifyContent: "center", gap: "6px", transition: "all 0.15s",
//     borderBottom: activeTab === tab ? `2px solid ${TEAL}` : "2px solid transparent",
//     background: activeTab === tab ? "#f0fdfa" : "#f8f9fc",
//     color: activeTab === tab ? TEAL_DARK : "#6b7a9a",
//   });

//   return (
//     <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #d8dce8", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>

//       {/* ── Panel header ── */}
//       <div style={{ background: `linear-gradient(135deg, ${TEAL_DARK} 0%, ${TEAL} 100%)`, padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
//         <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//           <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
//             <ClipboardList size={16} color="#fff" />
//           </div>
//           <div>
//             <div style={{ fontWeight: 900, fontSize: "16px", color: "#fff", letterSpacing: "0.3px" }}>Medication Administration Record</div>
//             <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", marginTop: "1px" }}>MAR · {encounterNumber}</div>
//           </div>
//           {dueMeds.length > 0 && (
//             <span style={{ background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: "13px", fontWeight: 800, padding: "3px 10px", borderRadius: "20px", marginLeft: "4px" }}>
//               {dueMeds.length} scheduled
//             </span>
//           )}
//         </div>
//         {onClose && (
//           <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "7px", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer" }}>
//             <X size={16} />
//           </button>
//         )}
//       </div>

//       {/* ── Tabs ── */}
//       <div style={{ display: "flex", borderBottom: "1px solid #e0e4ef", flexShrink: 0 }}>
//         <button style={tabBtn("due")} onClick={() => setActiveTab("due")}>
//           <Pill size={13} /> Scheduled Medications
//           {!loadingDue && dueMeds.length > 0 && (
//             <span style={{ background: TEAL, color: "#fff", borderRadius: "20px", fontSize: "12px", fontWeight: 900, padding: "1px 6px", marginLeft: "2px" }}>
//               {dueMeds.length}
//             </span>
//           )}
//         </button>
        
//         <button style={tabBtn("history")} onClick={() => setActiveTab("history")}>
//           <History size={13} /> Administration History
//           {!loadingHistory && history.length > 0 && (
//             <span style={{ background: "#6b7a9a", color: "#fff", borderRadius: "20px", fontSize: "12px", fontWeight: 900, padding: "1px 6px", marginLeft: "2px" }}>
//               {history.length}
//             </span>
//           )}
//         </button>
        
//         <button style={tabBtn("paperGrid")} onClick={() => setActiveTab("paperGrid")}>
//           <LayoutGrid size={13} /> Monthly MAR 
//         </button>
//         <button style={tabBtn("grid")} onClick={() => setActiveTab("grid")}>
//           <LayoutGrid size={13} /> Weekly Chart
//         </button>
//       </div>

//       {/* ── Tab Body ── */}
//       <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px", flex: 1, overflowY: "auto" }}>

//         {/* DUE TAB */}
//         {activeTab === "due" && (
//           <>
//             {loadingDue ? (
//               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a", fontSize: "16px" }}>
//                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
//                 Loading scheduled medications…
//               </div>
//             ) : dueMeds.length === 0 ? (
//               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a" }}>
//                 <CheckCircle2 size={32} color="#a7f3d0" />
//                 <span style={{ fontSize: "16px", fontWeight: 700, color: "#0f766e" }}>No scheduled medications</span>
//                 <span style={{ fontSize: "14px", color: "#8a94ad" }}>All scheduled medications have been administered or have expired.</span>
//               </div>
//             ) : (
//               dueMeds.map(med => (
//                 <DueMedCard
//                   key={med.prescription_id}
//                   med={med}
//                   encounterNumber={encounterNumber}
//                   onSave={handleAdminSave}
//                 />
//               ))
//             )}
//           </>
//         )}

//         {/* HISTORY TAB */}
//         {activeTab === "history" && (
//           <>
//             {loadingHistory ? (
//               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a", fontSize: "16px" }}>
//                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
//                 Loading history…
//               </div>
//             ) : history.length === 0 ? (
//               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a" }}>
//                 <History size={32} color="#d1d5db" />
//                 <span style={{ fontSize: "16px", fontWeight: 700 }}>No administration history</span>
//                 <span style={{ fontSize: "14px", color: "#8a94ad" }}>Administered medications will appear here</span>
//               </div>
//             ) : (
//               <>
//                 <div style={{ fontSize: "13px", fontWeight: 700, color: "#8a94ad", textTransform: "uppercase", letterSpacing: "0.6px", padding: "0 2px 4px" }}>
//                   {history.length} record{history.length !== 1 ? "s" : ""} found
//                 </div>
//                 {[...history]
//                   .sort((a, b) => new Date(b.administered_at.replace(" ", "T")).getTime() - new Date(a.administered_at.replace(" ", "T")).getTime())
//                   .map(record => (
//                     <HistoryCard key={record.id} record={record} />
//                   ))
//                 }
//               </>
//             )}
//           </>
//         )}

//         {/* WEEKLY GRID TAB */}
//         {activeTab === "grid" && (
//           <>
//             {loadingWeeklyGrid ? (
//               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a", fontSize: "16px" }}>
//                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
//                 Loading weekly chart…
//               </div>
//             ) : weeklyRows.length === 0 ? (
//               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a" }}>
//                 <LayoutGrid size={32} color="#d1d5db" />
//                 <span style={{ fontSize: "16px", fontWeight: 700 }}>No medications scheduled this week</span>
//               </div>
//             ) : (
//               <div style={{ overflowX: "auto", border: "1px solid #e0e4ef", borderRadius: "10px" }}>
//                 <table style={{ borderCollapse: "collapse", width: "100%", minWidth: `${300 + weeklyHeaders.length * 120}px` }}>
//                   <thead>
//                     <tr>
//                       <th style={{
//                         position: "sticky", left: 0, zIndex: 2, background: "#f8f9fc",
//                         textAlign: "left", padding: "10px 14px", fontSize: "13px", fontWeight: 800,
//                         color: "#6b7a9a", textTransform: "uppercase", letterSpacing: "0.5px",
//                         borderBottom: "1px solid #e0e4ef", borderRight: "1px solid #e0e4ef",
//                         minWidth: "300px", width: "300px"
//                       }}>
//                         Medication Details
//                       </th>
//                       {weeklyHeaders.map(h => (
//                         <th key={h.date} style={{
//                           padding: "10px 12px", fontSize: "13px", fontWeight: 800, color: "#6b7a9a",
//                           textTransform: "uppercase", letterSpacing: "0.5px", background: h.date === todayStr ? ACTIVE_COL_BG : "#f8f9fc",
//                           borderBottom: "1px solid #e0e4ef", borderLeft: "1px solid #eef1f7", minWidth: "120px",
//                         }}>
//                           <div style={{ color: h.date === todayStr ? "#166534" : "inherit" }}>{h.day_name}</div>
//                           <div style={{ fontWeight: 600, color: h.date === todayStr ? "#16a34a" : "#8a94ad", marginTop: "2px" }}>{h.display}</div>
//                         </th>
//                       ))}
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {weeklyRows.map(row => {
//                       const isInactive = row.prescription_status === "STOPPED" || row.prescription_status === "CANCELLED";
//                       return (
//                         <tr key={row.prescription_id} style={{ opacity: isInactive ? 0.65 : 1, background: isInactive ? "#f8fafc" : "#fff" }}>
                          
//                           <td style={{ position: "sticky", left: 0, zIndex: 1, background: isInactive ? "#f8fafc" : "#fff", borderRight: "2px solid #e0e4ef", borderBottom: "1px solid #eef1f7", padding: "12px", verticalAlign: "top" }}>
//                             <div style={{ fontWeight: 900, fontSize: "14px", color: "#0f172a", marginBottom: "4px" }}>
//                                 {row.drug_name}
//                             </div>
//                             <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "8px" }}>
//                                 <RouteBadge route={row.route} />
//                                 <StatusBadge status={row.prescription_status} size="xs" />
//                             </div>
//                             <div style={{ fontSize: "11px", color: "#475569", lineHeight: "1.6" }}>
//                                 <div style={{display: "grid", gridTemplateColumns: "50px 1fr", gap: "x-2"}}>
//                                   <strong style={{color: "#1e293b"}}>Dose:</strong> <span>{row.dosage}</span>
//                                   <strong style={{color: "#1e293b"}}>Freq:</strong> <span>{row.frequency}</span>
//                                   {row.duration && <><strong style={{color: "#1e293b"}}>Dur:</strong> <span>{row.duration} {row.duration_unit || "Days"}</span></>}
//                                   <strong style={{color: "#1e293b"}}>By:</strong> <span style={{whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{row.prescribed_by}</span>
//                                   <strong style={{color: "#1e293b"}}>Date:</strong> <span>{fmtDt(row.prescribed_at || "")}</span>
//                                 </div>
//                             </div>
//                             {row.instructions && (
//                                 <div style={{ marginTop: "8px", fontSize: "10px", color: "#64748b", fontStyle: "italic", background: "#f1f5f9", padding: "6px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
//                                   <span style={{fontWeight: 800, color: "#475569"}}>Sig:</span> {row.instructions}
//                                 </div>
//                             )}
//                           </td>

//                           {weeklyHeaders.map(h => {
//                             const slots = row.days[h.date] || [];
//                             return (
//                               <td 
//                                 key={h.date} 
//                                 style={{
//                                   padding: "8px", verticalAlign: "top",
//                                   borderBottom: "1px solid #eef1f7", borderLeft: "1px solid #eef1f7",
//                                   background: h.date === todayStr ? ACTIVE_COL_BG : "transparent",
//                                   cursor: "pointer"
//                                 }}
//                                 onClick={() => openNewDoseModal(row, h.date)}
//                                 title="Click to document a new administration for this day"
//                               >
//                                 {slots.length > 0 && slots.map((slot, i) => (
//                                   <SlotChip
//                                     key={i}
//                                     slot={slot}
//                                     isInactive={isInactive}
//                                     clickable={true}
//                                     onAdminister={() => setActiveSlot({ row, date: h.date, slot, defaultTime: h.date === todayStr ? getLocalTimestamp() : `${h.date} 09:00:00` })}
//                                     onViewDetail={() => setViewSlotDetail({ row, date: h.date, slot })}
//                                   />
//                                 ))}
//                               </td>
//                             );
//                           })}
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                 </table>
//               </div>
//             )}
//           </>
//         )}

//         {/* MONTHLY MAR GRID TAB */}
//         {activeTab === "paperGrid" && (
//           <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            
//             {/* Header controls for Monthly View */}
//             <div style={{ marginBottom: "16px", border: "2px solid #1e293b", borderRadius: "8px", overflow: "hidden", flexShrink: 0 }}>
//               <div style={{ background: "#f8fafc", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #1e293b" }}>
//                 <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px" }}>
//                   Personal Medication Administration Record (MAR)
//                 </h2>
//                 <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
//                   <button onClick={handlePrevMonth} style={{ background: "none", border: "none", cursor: "pointer" }}><ChevronLeft size={20} /></button>
//                   <span style={{ fontSize: "16px", fontWeight: 800, minWidth: "140px", textAlign: "center" }}>
//                     {monthNames[currentMonth - 1]} {currentYear}
//                   </span>
//                   <button onClick={handleNextMonth} style={{ background: "none", border: "none", cursor: "pointer" }}><ChevronRight size={20} /></button>
//                 </div>
//               </div>
              
//               <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", fontSize: "12px", background: "#fff" }}>
//                 <div style={{ padding: "8px", borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1" }}>
//                   <strong>PATIENT NAME:</strong> {encounterNumber}
//                 </div>
//                 <div style={{ padding: "8px", borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1" }}>
//                   <strong>D.O.B.:</strong> —
//                 </div>
//                 <div style={{ padding: "8px", borderBottom: "1px solid #cbd5e1" }}>
//                   <strong>ADDRESS:</strong> —
//                 </div>
//                 <div style={{ padding: "8px", borderRight: "1px solid #cbd5e1", gridColumn: "span 1" }}>
//                   <strong>GP NAME:</strong> —
//                 </div>
//                 <div style={{ padding: "8px", gridColumn: "span 2" }}>
//                   <strong>KNOWN ALLERGIES:</strong> <span style={{ color: "#ef4444", fontWeight: 800 }}>None Recorded</span>
//                 </div>
//               </div>
//             </div>

//             {loadingMonthlyGrid ? (
//               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px", color: "#6b7a9a" }}>
//                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
//               </div>
//             ) : monthlyRows.length === 0 ? (
//               <div style={{ textAlign: "center", padding: "48px", color: "#6b7a9a", fontWeight: 700 }}>No medications scheduled this month</div>
//             ) : (
//               <div style={{ overflowX: "auto", border: "2px solid #1e293b", flex: 1, borderRadius: "6px" }}>
//                 <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed", minWidth: `${280 + (monthlyHeaders.length * 40)}px` }}>
//                   <thead>
//                     <tr>
//                       <th style={{ width: "280px", position: "sticky", left: 0, zIndex: 2, background: "#f8fafc", borderRight: "2px solid #1e293b", borderBottom: "2px solid #1e293b", padding: "12px", textAlign: "left", fontSize: "11px", textTransform: "uppercase" }}>
//                         Medication Details<br/>
//                         <span style={{ fontWeight: 400, color: "#64748b", textTransform: "none" }}>(Name, strength, route, frequency)</span>
//                       </th>
//                       {monthlyHeaders.map(h => (
//                         <th key={h.date} style={{ 
//                           borderBottom: "2px solid #1e293b", borderRight: "1px solid #cbd5e1", 
//                           background: h.date === todayStr ? ACTIVE_COL_BG : "#f8fafc", 
//                           color: h.date === todayStr ? "#166534" : "inherit",
//                           padding: "6px 0", width: "40px", textAlign: "center" 
//                         }}>
//                           <div style={{ fontSize: "10px", color: h.date === todayStr ? "#166534" : "#64748b", fontWeight: 800, marginBottom: "2px" }}>{h.day_name}</div>
//                           <div style={{ fontSize: "15px", fontWeight: 900 }}>{h.display}</div>
//                         </th>
//                       ))}
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {monthlyRows.map(row => {
//                       const isInactive = row.prescription_status === "STOPPED" || row.prescription_status === "CANCELLED";
//                       return (
//                         <tr key={row.prescription_id} style={{ opacity: isInactive ? 0.65 : 1, background: isInactive ? "#f1f5f9" : "#fff" }}>
                          
//                           <td style={{ position: "sticky", left: 0, zIndex: 1, background: isInactive ? "#f1f5f9" : "#fff", borderRight: "2px solid #1e293b", borderBottom: "1px solid #cbd5e1", padding: "12px", verticalAlign: "top" }}>
//                             <div style={{ fontWeight: 900, fontSize: "14px", color: "#0f172a", marginBottom: "4px" }}>
//                                 {row.drug_name}
//                             </div>
//                             <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "8px" }}>
//                                 <RouteBadge route={row.route} />
//                                 <StatusBadge status={row.prescription_status} size="xs" />
//                             </div>
//                             <div style={{ fontSize: "11px", color: "#475569", lineHeight: "1.6" }}>
//                                 <div style={{display: "grid", gridTemplateColumns: "50px 1fr", gap: "x-2"}}>
//                                   <strong style={{color: "#1e293b"}}>Dose:</strong> <span>{row.dosage}</span>
//                                   <strong style={{color: "#1e293b"}}>Freq:</strong> <span>{row.frequency}</span>
//                                   {row.duration && <><strong style={{color: "#1e293b"}}>Dur:</strong> <span>{row.duration} {row.duration_unit || "Days"}</span></>}
//                                   <strong style={{color: "#1e293b"}}>By:</strong> <span style={{whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{row.prescribed_by}</span>
//                                   <strong style={{color: "#1e293b"}}>Date:</strong> <span>{fmtDt(row.prescribed_at || "")}</span>
//                                 </div>
//                             </div>
//                             {row.instructions && (
//                                 <div style={{ marginTop: "8px", fontSize: "10px", color: "#64748b", fontStyle: "italic", background: "#f8fafc", padding: "6px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
//                                   <span style={{fontWeight: 800, color: "#475569"}}>Sig:</span> {row.instructions}
//                                 </div>
//                             )}
//                           </td>

//                           {monthlyHeaders.map(h => {
//                             const slots = row.days[h.date] || [];
//                             const colBackground = h.date === todayStr ? ACTIVE_COL_BG : "transparent";
                            
//                             return (
//                               <td 
//                                 key={h.date} 
//                                 style={{ 
//                                   borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1", 
//                                   padding: "3px", verticalAlign: "top", background: colBackground,
//                                   cursor: "pointer"
//                                 }}
//                                 onClick={() => openNewDoseModal(row, h.date)}
//                                 title="Click to document a new administration for this day"
//                               >
//                                 {slots.length > 0 && slots.map((slot, i) => (
//                                   <CompactSlotChip
//                                     key={i}
//                                     slot={slot}
//                                     isInactive={isInactive}
//                                     clickable={true}
//                                     onAction={() => {
//                                       const isPending = (slot.status || "").toLowerCase() === "pending";
//                                       if (isPending) setActiveSlot({ row, date: h.date, slot, defaultTime: h.date === todayStr ? getLocalTimestamp() : `${h.date} 09:00:00` });
//                                       else setViewSlotDetail({ row, date: h.date, slot });
//                                     }}
//                                   />
//                                 ))}
//                               </td>
//                             );
//                           })}
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                 </table>
//               </div>
//             )}
//           </div>
//         )}
//       </div>

//       {/* ── Shared Grid Slot Administer Modal ── */}
//       {activeSlot && (
//         <div
//           style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "16px" }}
//           onClick={() => setActiveSlot(null)}
//         >
//           <div style={{ width: "100%", maxWidth: "460px" }} onClick={e => e.stopPropagation()}>
//             <AdminForm
//               med={{
//                 prescription_id: activeSlot.row.prescription_id,
//                 drug_name: activeSlot.row.drug_name,
//                 drug_id: activeSlot.row.drug_id, 
//                 dosage: activeSlot.row.dosage,
//                 frequency: activeSlot.row.frequency,
//                 route: activeSlot.row.route,
//                 instructions: activeSlot.row.instructions,
//                 dispense_status: activeSlot.row.dispense_status,
//                 prescription_status: activeSlot.row.prescription_status,
//                 prescribed_by: activeSlot.row.prescribed_by,
//                 prescribed_at: activeSlot.row.prescribed_at,
//                 last_admin_id: null,
//                 last_admin_status: null,
//                 last_administered_at: null,
//                 last_administered_by: null,
//                 last_administered_by_name: null,
//                 due_status: activeSlot.row.due_status,
//                 duration: activeSlot.row.duration,
//                 duration_unit: activeSlot.row.duration_unit,
//               }}
//               encounterNumber={encounterNumber}
//               defaultAdminTime={activeSlot.defaultTime}
//               onCancel={() => setActiveSlot(null)}
//               onSave={handleGridAdminSave}
//             />
//           </div>
//         </div>
//       )}

//       {/* ── Shared Grid Slot Detail (View) Modal ── */}
//       {viewSlotDetail && (() => {
//         const fullRecord = history.find(h => h.id === viewSlotDetail.slot.admin_id);
//         const rc = routeConfig(fullRecord?.route || parseDosageInfo(viewSlotDetail.row.dosage_info).route);
//         return (
//           <div
//             style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "16px" }}
//             onClick={() => setViewSlotDetail(null)}
//           >
//             <div style={{ width: "100%", maxWidth: "460px", background: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
//               <div style={{ background: rc.color, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", color: "#fff" }}>
//                 <div>
//                   <div style={{ fontSize: "16px", fontWeight: 800 }}>{viewSlotDetail.row.drug_name}</div>
//                   <div style={{ fontSize: "13px", opacity: 0.85, marginTop: "2px" }}>
//                     Scheduled {viewSlotDetail.slot.scheduled_label} · {fmtDt(viewSlotDetail.date)}
//                   </div>
//                 </div>
//                 <button onClick={() => setViewSlotDetail(null)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "6px", width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer" }}>
//                   <X size={16} />
//                 </button>
//               </div>
//               <div style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
//                 <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
//                   <StatusBadge status={viewSlotDetail.slot.status} />
//                   {fullRecord && <RouteBadge route={fullRecord.route} />}
//                 </div>

//                 {fullRecord ? (
//                   <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
//                     {([
//                       ["Dose Given", fullRecord.dose],
//                       ["Administered At", fmtDt(fullRecord.administered_at)],
//                       ["Given By", fullRecord.administered_by_name],
//                       rc.showDiluent && ["Diluent", fullRecord.diluent],
//                       rc.showRate && ["Rate", fullRecord.rate_ml_hr ? `${fullRecord.rate_ml_hr} ml/hr` : null],
//                       rc.showAccessSite && ["Access Site", fullRecord.access_site],
//                       rc.showBatch && ["Batch No.", fullRecord.batch_number],
//                     ].filter(Boolean) as [string, string | null][]).map(([k, v]) => (
//                       <div key={k}>
//                         <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
//                         <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{v || "—"}</div>
//                       </div>
//                     ))}
//                   </div>
//                 ) : (
//                   <div style={{ fontSize: "14px", color: "#6b7a9a" }}>
//                     Recorded as <strong>{viewSlotDetail.slot.actual_label || viewSlotDetail.slot.status}</strong>.
//                     {" "}Full administration details aren't available for this entry.
//                   </div>
//                 )}

//                 {viewSlotDetail.slot.remarks && (
//                   <div style={{ fontSize: "14px", color: "#6b7a9a", fontStyle: "italic" }}>
//                     "{viewSlotDetail.slot.remarks}"
//                   </div>
//                 )}
//               </div>
//               <div style={{ padding: "14px 18px", borderTop: "1px solid #eef1f7", display: "flex", justifyContent: "flex-end" }}>
//                 <button onClick={() => setViewSlotDetail(null)} style={secBtn}>Close</button>
//               </div>
//             </div>
//           </div>
//         );
//       })()}
//     </div>
//   );
// };

// export default MARPanel;


























// "use client";
// import React, { useState, useEffect, useCallback } from "react";
// import {
//   X, Loader2, Clock, CheckCircle2, AlertTriangle, Pill,
//   ClipboardList, History, ChevronDown, ChevronUp, Plus, LayoutGrid, ChevronLeft, ChevronRight
// } from "lucide-react";
// import { nursingService } from "../services/nursing.service";
// import { useNotification } from "../context/NotificationContext";

// // ─── Types ────────────────────────────────────────────────────────────────────

// interface DueMedication {
//   prescription_id: number;
//   drug_name: string;
//   drug_id?: number;
//   dosage: string;
//   frequency: string;
//   route: string;
//   instructions: string | null;
//   dispense_status: string;
//   prescription_status?: string;
//   prescribed_by: string;
//   prescribed_at: string | null;
//   last_admin_id: number | null;
//   last_admin_status: string | null;
//   last_administered_at: string | null;
//   last_administered_by: string | null;
//   last_administered_by_name: string | null;
//   due_status: string;
//   duration?: number;
//   duration_unit?: string;
// }

// interface AdminHistory {
//   id: number;
//   prescription_id: number;
//   drug_id: number;
//   drug_name: string;
//   dosage: string;
//   dose: string;
//   route: string;
//   frequency: string;
//   diluent: string | null;
//   rate_ml_hr: number | null;
//   access_site: string | null;
//   batch_number: string | null;
//   administered_at: string;
//   administered_by_name: string;
//   status: string;
//   remarks: string | null;
// }

// interface MarGridHeader {
//   date: string;
//   display: string;
//   day_name: string;
// }

// interface MarGridSlot {
//   status: string;
//   scheduled_label: string;
//   actual_label: string | null;
//   admin_id: number | null;
//   remarks: string | null;
//   is_overdue: boolean;
// }

// interface MarGridRow {
//   prescription_id: number;
//   drug_id?: number;
//   drug_name: string;
//   dosage: string;
//   frequency: string;
//   route: string;
//   instructions: string | null;
//   dispense_status: string;
//   prescribed_by: string;
//   prescribed_at: string | null;
//   duration?: number;
//   duration_unit?: string;
//   dosage_info: string;
//   start_date: string;
//   prescription_status: string;
//   due_status: string;
//   days: Record<string, MarGridSlot[]>;
// }

// interface MARPanelProps {
//   encounterNumber: string;
//   onClose?: () => void;
// }

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// const getLocalTimestamp = (date: Date = new Date()): string => {
//   const pad = (n: number) => n.toString().padStart(2, "0");
//   return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
// };

// const getTodayDateString = (): string => {
//   const date = new Date();
//   const pad = (n: number) => n.toString().padStart(2, "0");
//   return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
// };

// const toInputDatetime = (dt: string): string => {
//   if (!dt) return "";
//   return dt.replace(" ", "T").slice(0, 16);
// };

// const fromInputDatetime = (val: string): string => {
//   if (!val) return "";
//   return val.replace("T", " ") + ":00";
// };

// const fmtDt = (dt: string) => {
//   if (!dt) return "—";
//   try {
//     return new Date(dt.replace(" ", "T")).toLocaleString("en-GB", {
//       day: "2-digit", month: "2-digit", year: "2-digit",
//       hour: "2-digit", minute: "2-digit",
//     });
//   } catch { return dt; }
// };

// const parseDosageInfo = (info: string): { dosage: string; frequency: string; route: string } => {
//   const routeMatch = info.match(/\(([^)]+)\)\s*\$/);
//   const route = routeMatch ? routeMatch[1] : "";
//   const withoutRoute = info.replace(/\([^)]+\)\s*\$/, "").trim();
//   const [dosage = "", frequency = ""] = withoutRoute.split(" - ").map(s => s.trim());
//   return { dosage, frequency, route };
// };

// const routeConfig = (route: string): {
//   showVolume: boolean; showDiluent: boolean; showRate: boolean;
//   showFlush: boolean; showAccessSite: boolean; showBatch: boolean;
//   label: string; color: string; bg: string;
// } => {
//   const r = (route || "").toUpperCase();
//   if (r === "IV")      return { showVolume: true,  showDiluent: true,  showRate: true,  showFlush: true,  showAccessSite: true,  showBatch: false, label: "IV Infusion",     color: "#1d4ed8", bg: "#eff6ff" };
//   if (r === "SC" || r === "IM") return { showVolume: true,  showDiluent: false, showRate: false, showFlush: false, showAccessSite: true,  showBatch: false, label: r + " Injection",  color: "#7c3aed", bg: "#f5f3ff" };
//   if (r === "PO" || r === "SL") return { showVolume: false, showDiluent: false, showRate: false, showFlush: false, showAccessSite: false, showBatch: false, label: "Oral",            color: "#0f766e", bg: "#f0fdfa" };
//   if (r === "BLOOD")  return { showVolume: true,  showDiluent: false, showRate: false, showFlush: false, showAccessSite: true,  showBatch: true,  label: "Blood Product",   color: "#b91c1c", bg: "#fef2f2" };
//   if (r === "NG" || r === "PEG") return { showVolume: true, showDiluent: false, showRate: false, showFlush: false, showAccessSite: false, showBatch: false, label: "NG/PEG Feed",    color: "#b45309", bg: "#fefce8" };
//   return { showVolume: true, showDiluent: true, showRate: false, showFlush: false, showAccessSite: false, showBatch: false, label: route, color: "#1c3d7a", bg: "#f8f9fc" };
// };

// // ─── Shared Styles ────────────────────────────────────────────────────────────

// const lbl: React.CSSProperties = {
//   display: "block", fontSize: "13px", fontWeight: 700, color: "#6b7a9a",
//   textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "5px",
// };
// const inp: React.CSSProperties = {
//   width: "100%", padding: "9px 12px", border: "1px solid #d0d6e6",
//   borderRadius: "9px", fontSize: "16px", fontWeight: 500, color: "#1c2b4a",
//   background: "#f8f9fc", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
// };
// const inpSm = (borderColor: string): React.CSSProperties => ({
//   ...inp, background: "#fff", border: `1px solid ${borderColor}`,
//   padding: "8px 10px", fontSize: "15px", borderRadius: "8px",
// });
// const secBtn: React.CSSProperties = {
//   flex: "0 0 auto", padding: "8px 16px", border: "1px solid #d0d6e6",
//   borderRadius: "9px", fontSize: "15px", fontWeight: 700, color: "#4a5568",
//   background: "#fff", cursor: "pointer", whiteSpace: "nowrap",
// };
// const primBtn = (bg: string): React.CSSProperties => ({
//   flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center",
//   gap: "6px", padding: "8px 18px", border: "none", borderRadius: "9px",
//   fontSize: "15px", fontWeight: 700, color: "#fff", background: bg, cursor: "pointer",
//   whiteSpace: "nowrap",
// });

// // ─── Status badge ─────────────────────────────────────────────────────────────

// const StatusBadge: React.FC<{ status: string; size?: "sm" | "xs" }> = ({ status, size = "sm" }) => {
//   const s = (status || "").toUpperCase();
//   const map: Record<string, { bg: string; color: string; dot: string }> = {
//     GIVEN:      { bg: "#dcfce7", color: "#166534", dot: "#16a34a" },
//     HELD:       { bg: "#fef9c3", color: "#854d0e", dot: "#ca8a04" },
//     REFUSED:    { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626" },
//     OMITTED:    { bg: "#f3f4f6", color: "#374151", dot: "#9ca3af" },
//     DISPENSED:  { bg: "#dcfce7", color: "#166534", dot: "#16a34a" },
//     PENDING:    { bg: "#fef9c3", color: "#854d0e", dot: "#ca8a04" },
//     DUE:        { bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
//     OVERDUE:    { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626" },
//     STOPPED:    { bg: "#f1f5f9", color: "#64748b", dot: "#94a3b8" },
//     CANCELLED:  { bg: "#f1f5f9", color: "#64748b", dot: "#94a3b8" },
//   };
//   const cfg = map[s] || { bg: "#f3f4f6", color: "#374151", dot: "#9ca3af" };
//   const fs = size === "xs" ? "12px" : "13px";
//   return (
//     <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: cfg.bg, color: cfg.color, fontSize: fs, fontWeight: 800, textTransform: "uppercase", padding: "3px 8px", borderRadius: "20px", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>
//       <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: cfg.dot, display: "inline-block", flexShrink: 0 }} />
//       {status}
//     </span>
//   );
// };

// const RouteBadge: React.FC<{ route: string }> = ({ route }) => (
//   <span style={{ display: "inline-block", background: "#ccfbf1", color: "#0f766e", fontSize: "12px", fontWeight: 800, textTransform: "uppercase", padding: "3px 8px", borderRadius: "20px", letterSpacing: "0.5px" }}>
//     {route}
//   </span>
// );

// // ─── Grid slot colors ────────────────────────────────────────────────────────

// const slotColors = (slot: MarGridSlot, isInactive: boolean): { bg: string; color: string; border: string } => {
//   if (isInactive) return { bg: "#f8fafc", color: "#94a3b8", border: "#e2e8f0" };
//   const s = (slot.status || "").toLowerCase();
  
//   if (s === "given" || s === "administered") return { bg: "#dcfce7", color: "#166534", border: "#86efac" };
//   if (s === "missed" || s === "refused" || s === "omitted" || slot.is_overdue) return { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" };
//   if (s === "held") return { bg: "#fef9c3", color: "#854d0e", border: "#fde047" };
  
//   return { bg: "#ffffff", color: "#475569", border: "#cbd5e1" };
// };

// // ─── Weekly Grid Chip (Wider) ────────────────────────────────────────────────
// const SlotChip: React.FC<{ slot: MarGridSlot; isInactive: boolean; clickable: boolean; onAdminister: () => void; onViewDetail: () => void }> = ({ slot, isInactive, clickable, onAdminister, onViewDetail }) => {
//   const c = slotColors(slot, isInactive);
//   const isPending = (slot.status || "").toLowerCase() === "pending";
//   const hasDetail = !isPending && (slot.admin_id != null || !!slot.actual_label || !!slot.remarks);
//   const isActionable = (isPending && clickable) || hasDetail;
//   return (
//     <button
//       type="button"
//       onClick={(e) => {
//         e.stopPropagation();
//         if (isActionable) {
//           isPending ? onAdminister() : onViewDetail();
//         }
//       }}
//       title={slot.remarks || undefined}
//       style={{
//         display: "block", width: "100%", textAlign: "left", marginBottom: "4px",
//         padding: "4px 7px", borderRadius: "6px", border: `1px solid ${c.border}`,
//         background: c.bg, color: c.color, fontSize: "13px", fontWeight: 800,
//         cursor: isActionable ? "pointer" : "default", whiteSpace: "nowrap",
//       }}
//     >
//       {slot.actual_label ? slot.actual_label.replace("A - ", "") : slot.scheduled_label}
//     </button>
//   );
// };

// // ─── Monthly Grid Chip (Extra Compact 1-31 Days) ──────────────────────────────
// const CompactSlotChip: React.FC<{ slot: MarGridSlot; isInactive: boolean; clickable: boolean; onAction: () => void; }> = ({ slot, isInactive, clickable, onAction }) => {
//   const c = slotColors(slot, isInactive);
//   const isPending = (slot.status || "").toLowerCase() === "pending";
//   const hasDetail = !isPending && (slot.admin_id != null || !!slot.actual_label || !!slot.remarks);
//   const isActionable = (isPending && clickable) || hasDetail;
  
//   // Format the label neatly for the tiny box to clearly show the exact time
//   let text = slot.actual_label || slot.scheduled_label || "PRN";
//   text = text.replace("S - ", "").replace("A - ", "");

//   return (
//       <button
//         type="button"
//         onClick={(e) => {
//           e.stopPropagation();
//           if (isActionable) onAction();
//         }}
//         title={slot.remarks || (isPending ? `Scheduled: ${slot.scheduled_label}` : `Given: ${slot.actual_label}`)}
//         style={{
//           display: "block", width: "100%", textAlign: "center", marginBottom: "3px",
//           padding: "3px 0", borderRadius: "3px", border: `1px solid ${c.border}`,
//           background: c.bg, color: c.color, fontSize: "10px", fontWeight: 800,
//           cursor: isActionable ? "pointer" : "default", overflow: "hidden",
//         }}
//       >
//         {text}
//       </button>
//     );
// };

// // ─── Inline Administration Form ───────────────────────────────────────────────

// const AdminForm: React.FC<{
//   med: DueMedication;
//   encounterNumber: string;
//   defaultAdminTime?: string;
//   onCancel: () => void;
//   onSave: () => void;
// }> = ({ med, encounterNumber, defaultAdminTime, onCancel, onSave }) => {
//   const rc = routeConfig(med.route);
//   const { notify } = useNotification();
//   const [submitting, setSubmitting] = useState(false);

//   const [dose, setDose] = useState(med.dosage || "");
//   const [administeredAt, setAdministeredAt] = useState(toInputDatetime(defaultAdminTime || getLocalTimestamp()));
//   const [volumeMl, setVolumeMl] = useState("");
//   const [diluent, setDiluent] = useState("");
//   const [rateMlHr, setRateMlHr] = useState("");
//   const [flushMl, setFlushMl] = useState("");
//   const [accessSite, setAccessSite] = useState("");
//   const [batchNumber, setBatchNumber] = useState("");
//   const [remarks, setRemarks] = useState("");

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!dose.trim()) { notify("Dose is required", "warning"); return; }
//     if (!administeredAt) { notify("Administered at time is required", "warning"); return; }

//     setSubmitting(true);
//     try {
//       const payload: any = {
//         encounter_number: encounterNumber,
//         prescription_id: med.prescription_id,
//         drug_id: med.drug_id,
//         dose,
//         route: med.route,
//         administered_at: fromInputDatetime(administeredAt),
//         status: "given",
//       };
//       if (rc.showVolume && volumeMl)   payload.volume_ml = Number(volumeMl);
//       if (rc.showDiluent && diluent)   payload.diluent = diluent;
//       if (rc.showRate && rateMlHr)     payload.rate_ml_hr = Number(rateMlHr);
//       if (rc.showFlush && flushMl)     payload.flush_ml = Number(flushMl);
//       if (rc.showAccessSite && accessSite) payload.access_site = accessSite;
//       if (rc.showBatch && batchNumber) payload.batch_number = batchNumber;
//       if (remarks.trim())              payload.remarks = remarks.trim();

//       await nursingService.administerMedication(payload);
//       notify(`${med.drug_name} administered successfully`, "success");
//       onSave();
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Failed to record administration", "error");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   return (
//     <div style={{ margin: "0 0 0", background: rc.bg, border: `1px solid ${rc.color}30`, borderRadius: "10px", padding: "14px 16px" }}>
//       <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "14px", color: rc.color, fontWeight: 800, fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
//         <Plus size={13} /> Record Administration — <span style={{ opacity: 0.85 }}>{rc.label}</span>
//       </div>

//       <form onSubmit={handleSubmit}>
//         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
//           <div>
//             <label style={lbl}>Dose <span style={{ color: "#e11d48" }}>*</span></label>
//             <input type="text" value={dose} onChange={e => setDose(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 500mg" autoFocus />
//           </div>
//           <div>
//             <label style={lbl}>Administered At <span style={{ color: "#e11d48" }}>*</span></label>
//             <input type="datetime-local" value={administeredAt} onChange={e => setAdministeredAt(e.target.value)} style={inpSm(`${rc.color}60`)} />
//           </div>
//         </div>

//         {(rc.showVolume || rc.showDiluent) && (
//           <div style={{ display: "grid", gridTemplateColumns: rc.showVolume && rc.showDiluent ? "1fr 1fr" : "1fr", gap: "10px", marginBottom: "10px" }}>
//             {rc.showVolume && (
//               <div>
//                 <label style={lbl}>Volume (ml)</label>
//                 <input type="number" step="any" min="0" value={volumeMl} onChange={e => setVolumeMl(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 100" />
//               </div>
//             )}
//             {rc.showDiluent && (
//               <div>
//                 <label style={lbl}>Diluent</label>
//                 <input type="text" value={diluent} onChange={e => setDiluent(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. Normal Saline" />
//               </div>
//             )}
//           </div>
//         )}

//         {(rc.showRate || rc.showFlush) && (
//           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
//             {rc.showRate && (
//               <div>
//                 <label style={lbl}>Rate (ml/hr)</label>
//                 <input type="number" min="1" value={rateMlHr} onChange={e => setRateMlHr(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 50" />
//               </div>
//             )}
//             {rc.showFlush && (
//               <div>
//                 <label style={lbl}>Flush (ml)</label>
//                 <input type="number" min="0" value={flushMl} onChange={e => setFlushMl(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 10" />
//               </div>
//             )}
//           </div>
//         )}

//         {(rc.showAccessSite || rc.showBatch) && (
//           <div style={{ display: "grid", gridTemplateColumns: rc.showAccessSite && rc.showBatch ? "1fr 1fr" : "1fr", gap: "10px", marginBottom: "10px" }}>
//             {rc.showAccessSite && (
//               <div>
//                 <label style={lbl}>Access Site</label>
//                 <input type="text" value={accessSite} onChange={e => setAccessSite(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. Right forearm" />
//               </div>
//             )}
//             {rc.showBatch && (
//               <div>
//                 <label style={lbl}>Batch / Unit Number</label>
//                 <input type="text" value={batchNumber} onChange={e => setBatchNumber(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. PRBC-20240524" />
//               </div>
//             )}
//           </div>
//         )}

//         <div style={{ marginBottom: "12px" }}>
//           <label style={lbl}>Remarks <span style={{ fontWeight: 400, color: "#aaa", textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
//           <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} style={inpSm(`${rc.color}40`)} placeholder="e.g. Given slowly over 20 minutes" />
//         </div>

//         <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
//           <button type="button" style={secBtn} onClick={onCancel}>Cancel</button>
//           <button type="submit" disabled={submitting} style={primBtn(rc.color)}>
//             {submitting ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle2 size={13} />}
//             Mark as Given
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// };

// // ─── Due Medication Card ──────────────────────────────────────────────────────

// const DueMedCard: React.FC<{
//   med: DueMedication;
//   encounterNumber: string;
//   onSave: () => void;
// }> = ({ med, encounterNumber, onSave }) => {
//   const [showForm, setShowForm] = useState(false);
//   const isDispensed = ["DISPENSED", "PARTIALLY_DISPENSED"].includes((med.dispense_status || "").toUpperCase());
//   const rc = routeConfig(med.route);

//   return (
//     <div style={{
//       background: "#fff",
//       borderRadius: "12px",
//       border: "1px solid #e0e4ef",
//       boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
//       borderLeft: `4px solid ${isDispensed ? rc.color : "#d1d5db"}`,
//       opacity: isDispensed ? 1 : 0.75,
//       marginBottom: "12px",
//     }}>
//       <div style={{ padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
//         <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `${isDispensed ? rc.color : "#6b7280"}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
//           <Pill size={18} color={isDispensed ? rc.color : "#6b7280"} />
//         </div>

//         <div style={{ flex: 1, minWidth: 0 }}>
//           <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
//             <span style={{ fontWeight: 800, fontSize: "18px", color: "#1c2b4a" }}>{med.drug_name}</span>
//             <RouteBadge route={med.route} />
//             <StatusBadge status={med.due_status} size="xs" />
//             {!isDispensed && (
//               <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#fef9c3", color: "#854d0e", fontSize: "12px", fontWeight: 800, padding: "3px 8px", borderRadius: "20px", border: "1px solid #fde047" }}>
//                 <AlertTriangle size={9} /> Not Yet Dispensed
//               </span>
//             )}
//           </div>

//           <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "4px" }}>
//             {([
//               ["Dose", med.dosage],
//               ["Frequency", med.frequency],
//               med.duration ? ["Duration", `${med.duration} ${med.duration_unit || 'Days'}`] : null,
//               ["Prescribed by", med.prescribed_by],
//             ].filter(Boolean) as [string, string][]).map(([k, v]) => (
//               <div key={k}>
//                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
//                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{v || "—"}</div>
//               </div>
//             ))}
//             {med.prescribed_at && (
//               <div>
//                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Prescribed On</div>
//                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{fmtDt(med.prescribed_at)}</div>
//               </div>
//             )}
//             {med.last_administered_at && (
//               <div>
//                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Last Given</div>
//                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{fmtDt(med.last_administered_at)}</div>
//               </div>
//             )}
//           </div>

//           {med.instructions && (
//             <div style={{ marginTop: "6px", fontSize: "14px", color: "#6b7a9a", fontStyle: "italic" }}>
//               ℹ {med.instructions}
//             </div>
//           )}
//         </div>

//         <button
//           onClick={() => setShowForm(f => !f)}
//           style={{
//             display: "flex", alignItems: "center", gap: "4px",
//             padding: "7px 14px", border: `1.5px solid ${rc.color}`,
//             borderRadius: "8px", background: showForm ? rc.color : "#fff",
//             color: showForm ? "#fff" : rc.color,
//             fontSize: "14px", fontWeight: 800, cursor: "pointer",
//             whiteSpace: "nowrap", transition: "all 0.15s", flexShrink: 0,
//           }}
//         >
//           <CheckCircle2 size={12} />
//           {showForm ? "Cancel" : "Give"}
//         </button>
//       </div>

//       {showForm && (
//         <div style={{ padding: "0 14px 14px" }}>
//           <AdminForm
//             med={med}
//             encounterNumber={encounterNumber}
//             onCancel={() => setShowForm(false)}
//             onSave={() => { setShowForm(false); onSave(); }}
//           />
//         </div>
//       )}
//     </div>
//   );
// };

// // ─── History Card ─────────────────────────────────────────────────────────────

// const HistoryCard: React.FC<{ record: AdminHistory }> = ({ record }) => {
//   const [expanded, setExpanded] = useState(false);
//   const rc = routeConfig(record.route);

//   return (
//     <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e0e4ef", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", borderLeft: `3px solid ${rc.color}`, marginBottom: "10px" }}>
//       <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
//         <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: `${rc.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
//           <Pill size={14} color={rc.color} />
//         </div>

//         <div style={{ flex: 1, minWidth: 0 }}>
//           <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "2px" }}>
//             <span style={{ fontWeight: 800, fontSize: "16px", color: "#1c2b4a" }}>{record.drug_name}</span>
//             <RouteBadge route={record.route} />
//             <StatusBadge status={record.status} size="xs" />
//           </div>
//           <div style={{ fontSize: "14px", color: "#6b7a9a" }}>
//             <span style={{ fontWeight: 600, color: "#1c2b4a" }}>{record.dose}</span>
//             {" · "}
//             <Clock size={9} style={{ display: "inline", verticalAlign: "middle", marginRight: "2px" }} />
//             {fmtDt(record.administered_at)}
//             {" · by "}<span style={{ fontWeight: 600, color: "#1c2b4a" }}>{record.administered_by_name}</span>
//           </div>
//         </div>

//         <button
//           onClick={() => setExpanded(e => !e)}
//           style={{ background: "none", border: "none", cursor: "pointer", color: "#8a94ad", padding: "4px", borderRadius: "6px", lineHeight: 1, flexShrink: 0 }}
//         >
//           {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
//         </button>
//       </div>

//       {expanded && (
//         <div style={{ padding: "0 14px 12px", background: "#f8f9fc", borderTop: "1px dashed #e0e4ef" }}>
//           <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", paddingTop: "10px" }}>
//             {([
//               ["Prescribed Dose", record.dosage],
//               ["Frequency", record.frequency],
//               rc.showDiluent && ["Diluent", record.diluent],
//               rc.showRate && ["Rate", record.rate_ml_hr ? `${record.rate_ml_hr} ml/hr` : null],
//               rc.showAccessSite && ["Access Site", record.access_site],
//               rc.showBatch && ["Batch No.", record.batch_number],
//             ].filter(Boolean) as [string, string | null][]).map(([k, v]) => (
//               <div key={k}>
//                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
//                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{v || "—"}</div>
//               </div>
//             ))}
//           </div>
//           {record.remarks && (
//             <div style={{ marginTop: "8px", fontSize: "14px", color: "#6b7a9a", fontStyle: "italic" }}>
//               "{record.remarks}"
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };

// // ─── Main MARPanel ────────────────────────────────────────────────────────────

// const MARPanel: React.FC<MARPanelProps> = ({ encounterNumber, onClose }) => {
//   const [activeTab, setActiveTab] = useState<"paperGrid" | "grid" | "due" | "history">("paperGrid");
  
//   // Data States
//   const [dueMeds, setDueMeds] = useState<DueMedication[]>([]);
//   const [history, setHistory] = useState<AdminHistory[]>([]);
  
//   // Separate states for Weekly vs Monthly grids
//   const [weeklyHeaders, setWeeklyHeaders] = useState<MarGridHeader[]>([]);
//   const [weeklyRows, setWeeklyRows] = useState<MarGridRow[]>([]);
  
//   const [monthlyHeaders, setMonthlyHeaders] = useState<MarGridHeader[]>([]);
//   const [monthlyRows, setMonthlyRows] = useState<MarGridRow[]>([]);
  
//   // Loading States
//   const [loadingDue, setLoadingDue] = useState(true);
//   const [loadingHistory, setLoadingHistory] = useState(true);
//   const [loadingWeeklyGrid, setLoadingWeeklyGrid] = useState(true);
//   const [loadingMonthlyGrid, setLoadingMonthlyGrid] = useState(true);
  
//   // Calendar State for Monthly Grid
//   const today = new Date();
//   const todayStr = getTodayDateString(); 
//   const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
//   const [currentYear, setCurrentYear] = useState(today.getFullYear());
//   const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

//   // Shared Modal States
//   const [activeSlot, setActiveSlot] = useState<{ row: MarGridRow; date: string; slot: MarGridSlot; defaultTime?: string } | null>(null);
//   const [viewSlotDetail, setViewSlotDetail] = useState<{ row: MarGridRow; date: string; slot: MarGridSlot } | null>(null);

//   const handlePrevMonth = () => {
//     if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(y => y - 1); }
//     else { setCurrentMonth(m => m - 1); }
//   };

//   const handleNextMonth = () => {
//     if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(y => y + 1); }
//     else { setCurrentMonth(m => m + 1); }
//   };

//   const fetchDue = useCallback(async () => {
//     setLoadingDue(true);
//     try {
//       const res = await nursingService.getMARDue(encounterNumber);
//       setDueMeds(res.data || []);
//     } catch {
//       setDueMeds([]);
//     } finally { setLoadingDue(false); }
//   }, [encounterNumber]);

//   const fetchHistory = useCallback(async () => {
//     setLoadingHistory(true);
//     try {
//       const res = await nursingService.getMARHistory(encounterNumber);
//       setHistory(res.data || []);
//     } catch {
//       setHistory([]);
//     } finally { setLoadingHistory(false); }
//   }, [encounterNumber]);

//   const fetchWeeklyGrid = useCallback(async () => {
//     setLoadingWeeklyGrid(true);
//     try {
//       const res = await nursingService.getMARDueHistory(encounterNumber);
//       setWeeklyHeaders(res.data?.headers || []);
//       setWeeklyRows(res.data?.rows || []);
//     } catch {
//       setWeeklyHeaders([]);
//       setWeeklyRows([]);
//     } finally { setLoadingWeeklyGrid(false); }
//   }, [encounterNumber]);

//   const fetchMonthlyGrid = useCallback(async () => {
//     setLoadingMonthlyGrid(true);
//     try {
//       const fetchFn = (nursingService as any).getMARMonth; 
//       let res;
//       if (fetchFn) {
//          res = await fetchFn(encounterNumber, currentMonth, currentYear);
//       } else {
//          console.warn("nursingService.getMARMonth not found! Falling back to getMARDueHistory");
//          res = await nursingService.getMARDueHistory(encounterNumber);
//       }
//       setMonthlyHeaders(res?.data?.headers || []);
//       setMonthlyRows(res?.data?.rows || []);
//     } catch {
//       setMonthlyHeaders([]);
//       setMonthlyRows([]);
//     } finally { setLoadingMonthlyGrid(false); }
//   }, [encounterNumber, currentMonth, currentYear]);

//   useEffect(() => {
//     fetchDue();
//     fetchHistory();
//     fetchWeeklyGrid();
//   }, [fetchDue, fetchHistory, fetchWeeklyGrid]);

//   useEffect(() => {
//     fetchMonthlyGrid();
//   }, [fetchMonthlyGrid]);

//   const handleAdminSave = () => {
//     fetchDue();
//     fetchHistory();
//   };

//   const handleGridAdminSave = () => {
//     setActiveSlot(null);
//     fetchDue();
//     fetchHistory();
//     fetchWeeklyGrid();
//     fetchMonthlyGrid();
//   };

//   const openNewDoseModal = (row: MarGridRow, dateString: string) => {
//     const genericSlot: MarGridSlot = {
//       status: "pending",
//       scheduled_label: "Unscheduled",
//       actual_label: null,
//       admin_id: null,
//       remarks: null,
//       is_overdue: false
//     };
//     // Default time to current time if today, else 09:00 AM on that date
//     const defaultTime = dateString === todayStr ? getLocalTimestamp() : `${dateString} 09:00:00`;
//     setActiveSlot({ row, date: dateString, slot: genericSlot, defaultTime });
//   };

//   const TEAL = "#0d9488";
//   const TEAL_DARK = "#0f766e";
//   const ACTIVE_COL_BG = "#dcfce7"; 

//   const tabBtn = (tab: "due" | "history" | "grid" | "paperGrid"): React.CSSProperties => ({
//     flex: 1, padding: "9px 12px", border: "none", cursor: "pointer",
//     fontSize: "15px", fontWeight: 800, display: "flex", alignItems: "center",
//     justifyContent: "center", gap: "6px", transition: "all 0.15s",
//     borderBottom: activeTab === tab ? `2px solid ${TEAL}` : "2px solid transparent",
//     background: activeTab === tab ? "#f0fdfa" : "#f8f9fc",
//     color: activeTab === tab ? TEAL_DARK : "#6b7a9a",
//   });

//   return (
//     <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #d8dce8", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>

//       {/* ── Panel header ── */}
//       <div style={{ background: `linear-gradient(135deg, ${TEAL_DARK} 0%, ${TEAL} 100%)`, padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
//         <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//           <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
//             <ClipboardList size={16} color="#fff" />
//           </div>
//           <div>
//             <div style={{ fontWeight: 900, fontSize: "16px", color: "#fff", letterSpacing: "0.3px" }}>Medication Administration Record</div>
//             <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", marginTop: "1px" }}>MAR · {encounterNumber}</div>
//           </div>
//           {dueMeds.length > 0 && (
//             <span style={{ background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: "13px", fontWeight: 800, padding: "3px 10px", borderRadius: "20px", marginLeft: "4px" }}>
//               {dueMeds.length} scheduled
//             </span>
//           )}
//         </div>
//         {onClose && (
//           <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "7px", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer" }}>
//             <X size={16} />
//           </button>
//         )}
//       </div>

//       {/* ── Tabs ── */}
//       <div style={{ display: "flex", borderBottom: "1px solid #e0e4ef", flexShrink: 0 }}>
//         <button style={tabBtn("due")} onClick={() => setActiveTab("due")}>
//           <Pill size={13} /> Scheduled Medications
//           {!loadingDue && dueMeds.length > 0 && (
//             <span style={{ background: TEAL, color: "#fff", borderRadius: "20px", fontSize: "12px", fontWeight: 900, padding: "1px 6px", marginLeft: "2px" }}>
//               {dueMeds.length}
//             </span>
//           )}
//         </button>
        
//         <button style={tabBtn("history")} onClick={() => setActiveTab("history")}>
//           <History size={13} /> Administration History
//           {!loadingHistory && history.length > 0 && (
//             <span style={{ background: "#6b7a9a", color: "#fff", borderRadius: "20px", fontSize: "12px", fontWeight: 900, padding: "1px 6px", marginLeft: "2px" }}>
//               {history.length}
//             </span>
//           )}
//         </button>
        
//         <button style={tabBtn("paperGrid")} onClick={() => setActiveTab("paperGrid")}>
//           <LayoutGrid size={13} /> Monthly MAR 
//         </button>
//         <button style={tabBtn("grid")} onClick={() => setActiveTab("grid")}>
//           <LayoutGrid size={13} /> Weekly Chart
//         </button>
//       </div>

//       {/* ── Tab Body ── */}
//       <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px", flex: 1, overflowY: "auto" }}>

//         {/* DUE TAB */}
//         {activeTab === "due" && (
//           <>
//             {loadingDue ? (
//               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a", fontSize: "16px" }}>
//                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
//                 Loading scheduled medications…
//               </div>
//             ) : dueMeds.length === 0 ? (
//               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a" }}>
//                 <CheckCircle2 size={32} color="#a7f3d0" />
//                 <span style={{ fontSize: "16px", fontWeight: 700, color: "#0f766e" }}>No scheduled medications</span>
//                 <span style={{ fontSize: "14px", color: "#8a94ad" }}>All scheduled medications have been administered or have expired.</span>
//               </div>
//             ) : (
//               dueMeds.map(med => (
//                 <DueMedCard
//                   key={med.prescription_id}
//                   med={med}
//                   encounterNumber={encounterNumber}
//                   onSave={handleAdminSave}
//                 />
//               ))
//             )}
//           </>
//         )}

//         {/* HISTORY TAB */}
//         {activeTab === "history" && (
//           <>
//             {loadingHistory ? (
//               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a", fontSize: "16px" }}>
//                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
//                 Loading history…
//               </div>
//             ) : history.length === 0 ? (
//               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a" }}>
//                 <History size={32} color="#d1d5db" />
//                 <span style={{ fontSize: "16px", fontWeight: 700 }}>No administration history</span>
//                 <span style={{ fontSize: "14px", color: "#8a94ad" }}>Administered medications will appear here</span>
//               </div>
//             ) : (
//               <>
//                 <div style={{ fontSize: "13px", fontWeight: 700, color: "#8a94ad", textTransform: "uppercase", letterSpacing: "0.6px", padding: "0 2px 4px" }}>
//                   {history.length} record{history.length !== 1 ? "s" : ""} found
//                 </div>
//                 {[...history]
//                   .sort((a, b) => new Date(b.administered_at.replace(" ", "T")).getTime() - new Date(a.administered_at.replace(" ", "T")).getTime())
//                   .map(record => (
//                     <HistoryCard key={record.id} record={record} />
//                   ))
//                 }
//               </>
//             )}
//           </>
//         )}

//         {/* WEEKLY GRID TAB */}
//         {activeTab === "grid" && (
//           <>
//             {loadingWeeklyGrid ? (
//               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a", fontSize: "16px" }}>
//                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
//                 Loading weekly chart…
//               </div>
//             ) : weeklyRows.length === 0 ? (
//               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a" }}>
//                 <LayoutGrid size={32} color="#d1d5db" />
//                 <span style={{ fontSize: "16px", fontWeight: 700 }}>No medications scheduled this week</span>
//               </div>
//             ) : (
//               <div style={{ overflowX: "auto", border: "1px solid #e0e4ef", borderRadius: "10px" }}>
//                 <table style={{ borderCollapse: "collapse", width: "100%", minWidth: `${300 + weeklyHeaders.length * 120}px` }}>
//                   <thead>
//                     <tr>
//                       <th style={{
//                         position: "sticky", left: 0, zIndex: 2, background: "#f8f9fc",
//                         textAlign: "left", padding: "10px 14px", fontSize: "13px", fontWeight: 800,
//                         color: "#6b7a9a", textTransform: "uppercase", letterSpacing: "0.5px",
//                         borderBottom: "1px solid #e0e4ef", borderRight: "1px solid #e0e4ef",
//                         minWidth: "300px", width: "300px"
//                       }}>
//                         Medication Details
//                       </th>
//                       {weeklyHeaders.map(h => (
//                         <th key={h.date} style={{
//                           padding: "10px 12px", fontSize: "13px", fontWeight: 800, color: "#6b7a9a",
//                           textTransform: "uppercase", letterSpacing: "0.5px", background: h.date === todayStr ? ACTIVE_COL_BG : "#f8f9fc",
//                           borderBottom: "1px solid #e0e4ef", borderLeft: "1px solid #eef1f7", minWidth: "120px",
//                         }}>
//                           <div style={{ color: h.date === todayStr ? "#166534" : "inherit" }}>{h.day_name}</div>
//                           <div style={{ fontWeight: 600, color: h.date === todayStr ? "#16a34a" : "#8a94ad", marginTop: "2px" }}>{h.display}</div>
//                         </th>
//                       ))}
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {weeklyRows.map(row => {
//                       const isInactive = row.prescription_status === "STOPPED" || row.prescription_status === "CANCELLED";
//                       return (
//                         <tr key={row.prescription_id} style={{ opacity: isInactive ? 0.65 : 1, background: isInactive ? "#f8fafc" : "#fff" }}>
                          
//                           <td style={{ position: "sticky", left: 0, zIndex: 1, background: isInactive ? "#f8fafc" : "#fff", borderRight: "2px solid #e0e4ef", borderBottom: "1px solid #eef1f7", padding: "12px", verticalAlign: "top" }}>
//                             <div style={{ fontWeight: 900, fontSize: "14px", color: "#0f172a", marginBottom: "4px" }}>
//                                 {row.drug_name}
//                             </div>
//                             <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "8px" }}>
//                                 <RouteBadge route={row.route} />
//                                 <StatusBadge status={row.prescription_status} size="xs" />
//                             </div>
//                             <div style={{ fontSize: "11px", color: "#475569", lineHeight: "1.6" }}>
//                                 <div style={{display: "grid", gridTemplateColumns: "50px 1fr", gap: "x-2"}}>
//                                   <strong style={{color: "#1e293b"}}>Dose:</strong> <span>{row.dosage}</span>
//                                   <strong style={{color: "#1e293b"}}>Freq:</strong> <span>{row.frequency}</span>
//                                   {row.duration && <><strong style={{color: "#1e293b"}}>Dur:</strong> <span>{row.duration} {row.duration_unit || "Days"}</span></>}
//                                   <strong style={{color: "#1e293b"}}>By:</strong> <span style={{whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{row.prescribed_by}</span>
//                                   <strong style={{color: "#1e293b"}}>Date:</strong> <span>{fmtDt(row.prescribed_at || "")}</span>
//                                 </div>
//                             </div>
//                             {row.instructions && (
//                                 <div style={{ marginTop: "8px", fontSize: "10px", color: "#64748b", fontStyle: "italic", background: "#f1f5f9", padding: "6px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
//                                   <span style={{fontWeight: 800, color: "#475569"}}>Sig:</span> {row.instructions}
//                                 </div>
//                             )}
//                           </td>

//                           {weeklyHeaders.map(h => {
//                             const slots = row.days[h.date] || [];
//                             return (
//                               <td 
//                                 key={h.date} 
//                                 style={{
//                                   padding: "8px", verticalAlign: "top",
//                                   borderBottom: "1px solid #eef1f7", borderLeft: "1px solid #eef1f7",
//                                   background: h.date === todayStr ? ACTIVE_COL_BG : "transparent",
//                                   cursor: "pointer"
//                                 }}
//                                 onClick={() => openNewDoseModal(row, h.date)}
//                                 title="Click to document a new administration for this day"
//                               >
//                                 {slots.length > 0 && slots.map((slot, i) => (
//                                   <SlotChip
//                                     key={i}
//                                     slot={slot}
//                                     isInactive={isInactive}
//                                     clickable={true}
//                                     onAdminister={() => setActiveSlot({ row, date: h.date, slot, defaultTime: h.date === todayStr ? getLocalTimestamp() : `${h.date} 09:00:00` })}
//                                     onViewDetail={() => setViewSlotDetail({ row, date: h.date, slot })}
//                                   />
//                                 ))}
//                               </td>
//                             );
//                           })}
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                 </table>
//               </div>
//             )}
//           </>
//         )}

//         {/* MONTHLY MAR GRID TAB */}
//         {activeTab === "paperGrid" && (
//           <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            
//             {/* Header controls for Monthly View */}
//             <div style={{ marginBottom: "16px", border: "2px solid #1e293b", borderRadius: "8px", overflow: "hidden", flexShrink: 0 }}>
//               <div style={{ background: "#f8fafc", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #1e293b" }}>
//                 <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px" }}>
//                   Personal Medication Administration Record (MAR)
//                 </h2>
//                 <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
//                   <button onClick={handlePrevMonth} style={{ background: "none", border: "none", cursor: "pointer" }}><ChevronLeft size={20} /></button>
//                   <span style={{ fontSize: "16px", fontWeight: 800, minWidth: "140px", textAlign: "center" }}>
//                     {monthNames[currentMonth - 1]} {currentYear}
//                   </span>
//                   <button onClick={handleNextMonth} style={{ background: "none", border: "none", cursor: "pointer" }}><ChevronRight size={20} /></button>
//                 </div>
//               </div>
              
//               <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", fontSize: "12px", background: "#fff" }}>
//                 <div style={{ padding: "8px", borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1" }}>
//                   <strong>PATIENT NAME:</strong> {encounterNumber}
//                 </div>
//                 <div style={{ padding: "8px", borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1" }}>
//                   <strong>D.O.B.:</strong> —
//                 </div>
//                 <div style={{ padding: "8px", borderBottom: "1px solid #cbd5e1" }}>
//                   <strong>ADDRESS:</strong> —
//                 </div>
//                 <div style={{ padding: "8px", borderRight: "1px solid #cbd5e1", gridColumn: "span 1" }}>
//                   <strong>GP NAME:</strong> —
//                 </div>
//                 <div style={{ padding: "8px", gridColumn: "span 2" }}>
//                   <strong>KNOWN ALLERGIES:</strong> <span style={{ color: "#ef4444", fontWeight: 800 }}>None Recorded</span>
//                 </div>
//               </div>
//             </div>

//             {loadingMonthlyGrid ? (
//               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px", color: "#6b7a9a" }}>
//                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
//               </div>
//             ) : monthlyRows.length === 0 ? (
//               <div style={{ textAlign: "center", padding: "48px", color: "#6b7a9a", fontWeight: 700 }}>No medications scheduled this month</div>
//             ) : (
//               <div style={{ overflowX: "auto", border: "2px solid #1e293b", flex: 1, borderRadius: "6px" }}>
//                 <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed", minWidth: `${280 + (monthlyHeaders.length * 40)}px` }}>
//                   <thead>
//                     <tr>
//                       <th style={{ width: "280px", position: "sticky", left: 0, zIndex: 2, background: "#f8fafc", borderRight: "2px solid #1e293b", borderBottom: "2px solid #1e293b", padding: "12px", textAlign: "left", fontSize: "11px", textTransform: "uppercase" }}>
//                         Medication Details<br/>
//                         <span style={{ fontWeight: 400, color: "#64748b", textTransform: "none" }}>(Name, strength, route, frequency)</span>
//                       </th>
//                       {monthlyHeaders.map(h => (
//                         <th key={h.date} style={{ 
//                           borderBottom: "2px solid #1e293b", borderRight: "1px solid #cbd5e1", 
//                           background: h.date === todayStr ? ACTIVE_COL_BG : "#f8fafc", 
//                           color: h.date === todayStr ? "#166534" : "inherit",
//                           padding: "6px 0", width: "40px", textAlign: "center" 
//                         }}>
//                           <div style={{ fontSize: "10px", color: h.date === todayStr ? "#166534" : "#64748b", fontWeight: 800, marginBottom: "2px" }}>{h.day_name}</div>
//                           <div style={{ fontSize: "15px", fontWeight: 900 }}>{h.display}</div>
//                         </th>
//                       ))}
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {monthlyRows.map(row => {
//                       const isInactive = row.prescription_status === "STOPPED" || row.prescription_status === "CANCELLED";
//                       return (
//                         <tr key={row.prescription_id} style={{ opacity: isInactive ? 0.65 : 1, background: isInactive ? "#f1f5f9" : "#fff" }}>
                          
//                           <td style={{ position: "sticky", left: 0, zIndex: 1, background: isInactive ? "#f1f5f9" : "#fff", borderRight: "2px solid #1e293b", borderBottom: "1px solid #cbd5e1", padding: "12px", verticalAlign: "top" }}>
//                             <div style={{ fontWeight: 900, fontSize: "14px", color: "#0f172a", marginBottom: "4px" }}>
//                                 {row.drug_name}
//                             </div>
//                             <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "8px" }}>
//                                 <RouteBadge route={row.route} />
//                                 <StatusBadge status={row.prescription_status} size="xs" />
//                             </div>
//                             <div style={{ fontSize: "11px", color: "#475569", lineHeight: "1.6" }}>
//                                 <div style={{display: "grid", gridTemplateColumns: "50px 1fr", gap: "x-2"}}>
//                                   <strong style={{color: "#1e293b"}}>Dose:</strong> <span>{row.dosage}</span>
//                                   <strong style={{color: "#1e293b"}}>Freq:</strong> <span>{row.frequency}</span>
//                                   {row.duration && <><strong style={{color: "#1e293b"}}>Dur:</strong> <span>{row.duration} {row.duration_unit || "Days"}</span></>}
//                                   <strong style={{color: "#1e293b"}}>By:</strong> <span style={{whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{row.prescribed_by}</span>
//                                   <strong style={{color: "#1e293b"}}>Date:</strong> <span>{fmtDt(row.prescribed_at || "")}</span>
//                                 </div>
//                             </div>
//                             {row.instructions && (
//                                 <div style={{ marginTop: "8px", fontSize: "10px", color: "#64748b", fontStyle: "italic", background: "#f8fafc", padding: "6px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
//                                   <span style={{fontWeight: 800, color: "#475569"}}>Sig:</span> {row.instructions}
//                                 </div>
//                             )}
//                           </td>

//                           {monthlyHeaders.map(h => {
//                             const slots = row.days[h.date] || [];
//                             const colBackground = h.date === todayStr ? ACTIVE_COL_BG : "transparent";
                            
//                             return (
//                               <td 
//                                 key={h.date} 
//                                 style={{ 
//                                   borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1", 
//                                   padding: "3px", verticalAlign: "top", background: colBackground,
//                                   cursor: "pointer"
//                                 }}
//                                 onClick={() => openNewDoseModal(row, h.date)}
//                                 title="Click to document a new administration for this day"
//                               >
//                                 {slots.length > 0 && slots.map((slot, i) => (
//                                   <CompactSlotChip
//                                     key={i}
//                                     slot={slot}
//                                     isInactive={isInactive}
//                                     clickable={true}
//                                     onAction={() => {
//                                       const isPending = (slot.status || "").toLowerCase() === "pending";
//                                       if (isPending) setActiveSlot({ row, date: h.date, slot, defaultTime: h.date === todayStr ? getLocalTimestamp() : `${h.date} 09:00:00` });
//                                       else setViewSlotDetail({ row, date: h.date, slot });
//                                     }}
//                                   />
//                                 ))}
//                               </td>
//                             );
//                           })}
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                 </table>
//               </div>
//             )}
//           </div>
//         )}
//       </div>

//       {/* ── Shared Grid Slot Administer Modal ── */}
//       {activeSlot && (
//         <div
//           style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "16px" }}
//           onClick={() => setActiveSlot(null)}
//         >
//           <div style={{ width: "100%", maxWidth: "460px" }} onClick={e => e.stopPropagation()}>
//             <AdminForm
//               med={{
//                 prescription_id: activeSlot.row.prescription_id,
//                 drug_name: activeSlot.row.drug_name,
//                 drug_id: activeSlot.row.drug_id, 
//                 dosage: activeSlot.row.dosage,
//                 frequency: activeSlot.row.frequency,
//                 route: activeSlot.row.route,
//                 instructions: activeSlot.row.instructions,
//                 dispense_status: activeSlot.row.dispense_status,
//                 prescription_status: activeSlot.row.prescription_status,
//                 prescribed_by: activeSlot.row.prescribed_by,
//                 prescribed_at: activeSlot.row.prescribed_at,
//                 last_admin_id: null,
//                 last_admin_status: null,
//                 last_administered_at: null,
//                 last_administered_by: null,
//                 last_administered_by_name: null,
//                 due_status: activeSlot.row.due_status,
//                 duration: activeSlot.row.duration,
//                 duration_unit: activeSlot.row.duration_unit,
//               }}
//               encounterNumber={encounterNumber}
//               defaultAdminTime={activeSlot.defaultTime}
//               onCancel={() => setActiveSlot(null)}
//               onSave={handleGridAdminSave}
//             />
//           </div>
//         </div>
//       )}

//       {/* ── Shared Grid Slot Detail (View) Modal ── */}
//       {viewSlotDetail && (() => {
//         const fullRecord = history.find(h => h.id === viewSlotDetail.slot.admin_id);
//         const rc = routeConfig(fullRecord?.route || parseDosageInfo(viewSlotDetail.row.dosage_info).route);
//         return (
//           <div
//             style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "16px" }}
//             onClick={() => setViewSlotDetail(null)}
//           >
//             <div style={{ width: "100%", maxWidth: "460px", background: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
//               <div style={{ background: rc.color, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", color: "#fff" }}>
//                 <div>
//                   <div style={{ fontSize: "16px", fontWeight: 800 }}>{viewSlotDetail.row.drug_name}</div>
//                   <div style={{ fontSize: "13px", opacity: 0.85, marginTop: "2px" }}>
//                     Scheduled {viewSlotDetail.slot.scheduled_label} · {fmtDt(viewSlotDetail.date)}
//                   </div>
//                 </div>
//                 <button onClick={() => setViewSlotDetail(null)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "6px", width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer" }}>
//                   <X size={16} />
//                 </button>
//               </div>
//               <div style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
//                 <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
//                   <StatusBadge status={viewSlotDetail.slot.status} />
//                   {fullRecord && <RouteBadge route={fullRecord.route} />}
//                 </div>

//                 {fullRecord ? (
//                   <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
//                     {([
//                       ["Dose Given", fullRecord.dose],
//                       ["Administered At", fmtDt(fullRecord.administered_at)],
//                       ["Given By", fullRecord.administered_by_name],
//                       rc.showDiluent && ["Diluent", fullRecord.diluent],
//                       rc.showRate && ["Rate", fullRecord.rate_ml_hr ? `${fullRecord.rate_ml_hr} ml/hr` : null],
//                       rc.showAccessSite && ["Access Site", fullRecord.access_site],
//                       rc.showBatch && ["Batch No.", fullRecord.batch_number],
//                     ].filter(Boolean) as [string, string | null][]).map(([k, v]) => (
//                       <div key={k}>
//                         <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
//                         <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{v || "—"}</div>
//                       </div>
//                     ))}
//                   </div>
//                 ) : (
//                   <div style={{ fontSize: "14px", color: "#6b7a9a" }}>
//                     Recorded as <strong>{viewSlotDetail.slot.actual_label || viewSlotDetail.slot.status}</strong>.
//                     {" "}Full administration details aren't available for this entry.
//                   </div>
//                 )}

//                 {viewSlotDetail.slot.remarks && (
//                   <div style={{ fontSize: "14px", color: "#6b7a9a", fontStyle: "italic" }}>
//                     "{viewSlotDetail.slot.remarks}"
//                   </div>
//                 )}
//               </div>
//               <div style={{ padding: "14px 18px", borderTop: "1px solid #eef1f7", display: "flex", justifyContent: "flex-end" }}>
//                 <button onClick={() => setViewSlotDetail(null)} style={secBtn}>Close</button>
//               </div>
//             </div>
//           </div>
//         );
//       })()}
//     </div>
//   );
// };

// export default MARPanel;











































































































































// import React, { useState, useEffect, useCallback } from "react";
// import {
//   X, Loader2, Clock, CheckCircle2, AlertTriangle, Pill,
//   ClipboardList, History, ChevronDown, ChevronUp, Plus, LayoutGrid, ChevronLeft, ChevronRight
// } from "lucide-react";
// import { nursingService } from "../services/nursing.service";
// import { useNotification } from "../context/NotificationContext";

// // ─── Types ────────────────────────────────────────────────────────────────────

// interface DueMedication {
//   prescription_id: number;
//   drug_name: string;
//   drug_id?: number;
//   dosage: string;
//   frequency: string;
//   route: string;
//   instructions: string | null;
//   dispense_status: string;
//   prescription_status?: string;
//   prescribed_by: string;
//   prescribed_at: string | null;
//   last_admin_id: number | null;
//   last_admin_status: string | null;
//   last_administered_at: string | null;
//   last_administered_by: string | null;
//   last_administered_by_name: string | null;
//   due_status: string;
//   duration?: number;
//   duration_unit?: string;
// }

// interface AdminHistory {
//   id: number;
//   prescription_id: number;
//   drug_id: number;
//   drug_name: string;
//   dosage: string;
//   dose: string;
//   route: string;
//   frequency: string;
//   diluent: string | null;
//   rate_ml_hr: number | null;
//   access_site: string | null;
//   batch_number: string | null;
//   administered_at: string;
//   administered_by_name: string;
//   status: string;
//   remarks: string | null;
// }

// interface MarGridHeader {
//   date: string;
//   display: string;
//   day_name: string;
// }

// interface MarGridSlot {
//   status: string;
//   scheduled_label: string;
//   actual_label: string | null;
//   admin_id: number | null;
//   remarks: string | null;
//   is_overdue: boolean;
// }

// interface MarGridRow {
//   prescription_id: number;
//   drug_id?: number;
//   drug_name: string;
//   dosage: string;
//   frequency: string;
//   route: string;
//   instructions: string | null;
//   dispense_status: string;
//   prescribed_by: string;
//   prescribed_at: string | null;
//   duration?: number;
//   duration_unit?: string;
//   dosage_info: string;
//   start_date: string;
//   prescription_status: string;
//   due_status: string;
//   days: Record<string, MarGridSlot[]>;
// }

// interface MARPanelProps {
//   encounterNumber: string;
//   onClose?: () => void;
// }

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// const getLocalTimestamp = (date: Date = new Date()): string => {
//   const pad = (n: number) => n.toString().padStart(2, "0");
//   return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
// };

// const getTodayDateString = (): string => {
//   const date = new Date();
//   const pad = (n: number) => n.toString().padStart(2, "0");
//   return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
// };

// const toInputDatetime = (dt: string): string => {
//   if (!dt) return "";
//   return dt.replace(" ", "T").slice(0, 16);
// };

// const fromInputDatetime = (val: string): string => {
//   if (!val) return "";
//   return val.replace("T", " ") + ":00";
// };

// const fmtDt = (dt: string) => {
//   if (!dt) return "—";
//   try {
//     return new Date(dt.replace(" ", "T")).toLocaleString("en-GB", {
//       day: "2-digit", month: "2-digit", year: "2-digit",
//       hour: "2-digit", minute: "2-digit",
//     });
//   } catch { return dt; }
// };

// const parseDosageInfo = (info: string): { dosage: string; frequency: string; route: string } => {
//   const routeMatch = info.match(/\(([^)]+)\)\s*\$/);
//   const route = routeMatch ? routeMatch[1] : "";
//   const withoutRoute = info.replace(/\([^)]+\)\s*\$/, "").trim();
//   const [dosage = "", frequency = ""] = withoutRoute.split(" - ").map(s => s.trim());
//   return { dosage, frequency, route };
// };

// const routeConfig = (route: string): {
//   showVolume: boolean; showDiluent: boolean; showRate: boolean;
//   showFlush: boolean; showAccessSite: boolean; showBatch: boolean;
//   label: string; color: string; bg: string;
// } => {
//   const r = (route || "").toUpperCase();
//   if (r === "IV")      return { showVolume: true,  showDiluent: true,  showRate: true,  showFlush: true,  showAccessSite: true,  showBatch: false, label: "IV Infusion",     color: "#1d4ed8", bg: "#eff6ff" };
//   if (r === "SC" || r === "IM") return { showVolume: true,  showDiluent: false, showRate: false, showFlush: false, showAccessSite: true,  showBatch: false, label: r + " Injection",  color: "#7c3aed", bg: "#f5f3ff" };
//   if (r === "PO" || r === "SL") return { showVolume: false, showDiluent: false, showRate: false, showFlush: false, showAccessSite: false, showBatch: false, label: "Oral",            color: "#0f766e", bg: "#f0fdfa" };
//   if (r === "BLOOD")  return { showVolume: true,  showDiluent: false, showRate: false, showFlush: false, showAccessSite: true,  showBatch: true,  label: "Blood Product",   color: "#b91c1c", bg: "#fef2f2" };
//   if (r === "NG" || r === "PEG") return { showVolume: true, showDiluent: false, showRate: false, showFlush: false, showAccessSite: false, showBatch: false, label: "NG/PEG Feed",    color: "#b45309", bg: "#fefce8" };
//   return { showVolume: true, showDiluent: true, showRate: false, showFlush: false, showAccessSite: false, showBatch: false, label: route, color: "#1c3d7a", bg: "#f8f9fc" };
// };

// // ─── Shared Styles ────────────────────────────────────────────────────────────

// const lbl: React.CSSProperties = {
//   display: "block", fontSize: "13px", fontWeight: 700, color: "#6b7a9a",
//   textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "5px",
// };
// const inp: React.CSSProperties = {
//   width: "100%", padding: "9px 12px", border: "1px solid #d0d6e6",
//   borderRadius: "9px", fontSize: "16px", fontWeight: 500, color: "#1c2b4a",
//   background: "#f8f9fc", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
// };
// const inpSm = (borderColor: string): React.CSSProperties => ({
//   ...inp, background: "#fff", border: `1px solid ${borderColor}`,
//   padding: "8px 10px", fontSize: "15px", borderRadius: "8px",
// });
// const secBtn: React.CSSProperties = {
//   flex: "0 0 auto", padding: "8px 16px", border: "1px solid #d0d6e6",
//   borderRadius: "9px", fontSize: "15px", fontWeight: 700, color: "#4a5568",
//   background: "#fff", cursor: "pointer", whiteSpace: "nowrap",
// };
// const primBtn = (bg: string): React.CSSProperties => ({
//   flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center",
//   gap: "6px", padding: "8px 18px", border: "none", borderRadius: "9px",
//   fontSize: "15px", fontWeight: 700, color: "#fff", background: bg, cursor: "pointer",
//   whiteSpace: "nowrap",
// });

// // ─── Status badge ─────────────────────────────────────────────────────────────

// const StatusBadge: React.FC<{ status: string; size?: "sm" | "xs" }> = ({ status, size = "sm" }) => {
//   const s = (status || "").toUpperCase();
//   const map: Record<string, { bg: string; color: string; dot: string }> = {
//     GIVEN:      { bg: "#dcfce7", color: "#166534", dot: "#16a34a" },
//     HELD:       { bg: "#fef9c3", color: "#854d0e", dot: "#ca8a04" },
//     REFUSED:    { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626" },
//     OMITTED:    { bg: "#f3f4f6", color: "#374151", dot: "#9ca3af" },
//     DISPENSED:  { bg: "#dcfce7", color: "#166534", dot: "#16a34a" },
//     PENDING:    { bg: "#fef9c3", color: "#854d0e", dot: "#ca8a04" },
//     DUE:        { bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
//     OVERDUE:    { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626" },
//     STOPPED:    { bg: "#f1f5f9", color: "#64748b", dot: "#94a3b8" },
//     CANCELLED:  { bg: "#f1f5f9", color: "#64748b", dot: "#94a3b8" },
//   };
//   const cfg = map[s] || { bg: "#f3f4f6", color: "#374151", dot: "#9ca3af" };
//   const fs = size === "xs" ? "12px" : "13px";
//   return (
//     <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: cfg.bg, color: cfg.color, fontSize: fs, fontWeight: 800, textTransform: "uppercase", padding: "3px 8px", borderRadius: "20px", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>
//       <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: cfg.dot, display: "inline-block", flexShrink: 0 }} />
//       {status}
//     </span>
//   );
// };

// const RouteBadge: React.FC<{ route: string }> = ({ route }) => (
//   <span style={{ display: "inline-block", background: "#ccfbf1", color: "#0f766e", fontSize: "12px", fontWeight: 800, textTransform: "uppercase", padding: "3px 8px", borderRadius: "20px", letterSpacing: "0.5px" }}>
//     {route}
//   </span>
// );

// // ─── Grid slot colors ────────────────────────────────────────────────────────

// const slotColors = (slot: MarGridSlot, isInactive: boolean): { bg: string; color: string; border: string } => {
//   if (isInactive) return { bg: "#f8fafc", color: "#94a3b8", border: "#e2e8f0" };
//   const s = (slot.status || "").toLowerCase();
  
//   if (s === "given" || s === "administered") return { bg: "#dcfce7", color: "#166534", border: "#86efac" };
//   if (s === "missed" || s === "refused" || s === "omitted" || slot.is_overdue) return { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" };
//   if (s === "held") return { bg: "#fef9c3", color: "#854d0e", border: "#fde047" };
  
//   return { bg: "#ffffff", color: "#475569", border: "#cbd5e1" };
// };

// // ─── Weekly Grid Chip (Wider) ────────────────────────────────────────────────
// const SlotChip: React.FC<{ slot: MarGridSlot; isInactive: boolean; clickable: boolean; onAdminister: () => void; onViewDetail: () => void }> = ({ slot, isInactive, clickable, onAdminister, onViewDetail }) => {
//   const c = slotColors(slot, isInactive);
//   const isPending = (slot.status || "").toLowerCase() === "pending";
//   const hasDetail = !isPending && (slot.admin_id != null || !!slot.actual_label || !!slot.remarks);
//   const isActionable = (isPending && clickable) || hasDetail;
//   return (
//     <button
//       type="button"
//       onClick={isActionable ? (isPending ? onAdminister : onViewDetail) : undefined}
//       title={slot.remarks || undefined}
//       style={{
//         display: "block", width: "100%", textAlign: "left", marginBottom: "4px",
//         padding: "4px 7px", borderRadius: "6px", border: `1px solid ${c.border}`,
//         background: c.bg, color: c.color, fontSize: "13px", fontWeight: 800,
//         cursor: isActionable ? "pointer" : "default", whiteSpace: "nowrap",
//       }}
//     >
//       {slot.actual_label || slot.scheduled_label}
//     </button>
//   );
// };

// // ─── Monthly Grid Chip (Extra Compact 1-31 Days) ──────────────────────────────
// const CompactSlotChip: React.FC<{ slot: MarGridSlot; isInactive: boolean; clickable: boolean; onAction: () => void; }> = ({ slot, isInactive, clickable, onAction }) => {
//   const c = slotColors(slot, isInactive);
//   const isPending = (slot.status || "").toLowerCase() === "pending";
//   const hasDetail = !isPending && (slot.admin_id != null || !!slot.actual_label || !!slot.remarks);
//   const isActionable = (isPending && clickable) || hasDetail;
  
//   let text = slot.actual_label || slot.scheduled_label || "PRN";
//   text = text.replace("S - ", "").replace("A - ", "").replace(" AM","").replace(" PM","");

//   return (
//       <button
//         type="button"
//         onClick={isActionable ? onAction : undefined}
//         title={slot.remarks || (isPending ? `Scheduled: ${slot.scheduled_label}` : `Given: ${slot.actual_label}`)}
//         style={{
//           display: "block", width: "100%", textAlign: "center", marginBottom: "3px",
//           padding: "3px 0", borderRadius: "3px", border: `1px solid ${c.border}`,
//           background: c.bg, color: c.color, fontSize: "9px", fontWeight: 800,
//           cursor: isActionable ? "pointer" : "default", overflow: "hidden",
//         }}
//       >
//         {text}
//       </button>
//     );
// };

// // ─── Inline Administration Form ───────────────────────────────────────────────

// const AdminForm: React.FC<{
//   med: DueMedication;
//   encounterNumber: string;
//   onCancel: () => void;
//   onSave: () => void;
// }> = ({ med, encounterNumber, onCancel, onSave }) => {
//   const rc = routeConfig(med.route);
//   const { notify } = useNotification();
//   const [submitting, setSubmitting] = useState(false);

//   const [dose, setDose] = useState(med.dosage || "");
//   const [administeredAt, setAdministeredAt] = useState(toInputDatetime(getLocalTimestamp()));
//   const [volumeMl, setVolumeMl] = useState("");
//   const [diluent, setDiluent] = useState("");
//   const [rateMlHr, setRateMlHr] = useState("");
//   const [flushMl, setFlushMl] = useState("");
//   const [accessSite, setAccessSite] = useState("");
//   const [batchNumber, setBatchNumber] = useState("");
//   const [remarks, setRemarks] = useState("");

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!dose.trim()) { notify("Dose is required", "warning"); return; }
//     if (!administeredAt) { notify("Administered at time is required", "warning"); return; }
//     if (rc.showVolume && !volumeMl) { notify("Volume (ml) is required for this route", "warning"); return; }

//     setSubmitting(true);
//     try {
//       const payload: any = {
//         encounter_number: encounterNumber,
//         prescription_id: med.prescription_id,
//         drug_id: med.drug_id,
//         dose,
//         route: med.route,
//         administered_at: fromInputDatetime(administeredAt),
//         status: "given",
//       };
//       if (rc.showVolume && volumeMl)   payload.volume_ml = Number(volumeMl);
//       if (rc.showDiluent && diluent)   payload.diluent = diluent;
//       if (rc.showRate && rateMlHr)     payload.rate_ml_hr = Number(rateMlHr);
//       if (rc.showFlush && flushMl)     payload.flush_ml = Number(flushMl);
//       if (rc.showAccessSite && accessSite) payload.access_site = accessSite;
//       if (rc.showBatch && batchNumber) payload.batch_number = batchNumber;
//       if (remarks.trim())              payload.remarks = remarks.trim();

//       await nursingService.administerMedication(payload);
//       notify(`${med.drug_name} administered successfully`, "success");
//       onSave();
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Failed to record administration", "error");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   return (
//     <div style={{ margin: "0 0 0", background: rc.bg, border: `1px solid ${rc.color}30`, borderRadius: "10px", padding: "14px 16px" }}>
//       <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "14px", color: rc.color, fontWeight: 800, fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
//         <Plus size={13} /> Record Administration — <span style={{ opacity: 0.85 }}>{rc.label}</span>
//       </div>

//       <form onSubmit={handleSubmit}>
//         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
//           <div>
//             <label style={lbl}>Dose <span style={{ color: "#e11d48" }}>*</span></label>
//             <input type="text" value={dose} onChange={e => setDose(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 500mg" autoFocus />
//           </div>
//           <div>
//             <label style={lbl}>Administered At <span style={{ color: "#e11d48" }}>*</span></label>
//             <input type="datetime-local" value={administeredAt} onChange={e => setAdministeredAt(e.target.value)} style={inpSm(`${rc.color}60`)} />
//           </div>
//         </div>

//         {(rc.showVolume || rc.showDiluent) && (
//           <div style={{ display: "grid", gridTemplateColumns: rc.showVolume && rc.showDiluent ? "1fr 1fr" : "1fr", gap: "10px", marginBottom: "10px" }}>
//             {rc.showVolume && (
//               <div>
//                 <label style={lbl}>Volume (ml) <span style={{ color: "#e11d48" }}>*</span></label>
//                 <input type="number" step="any" min="0" value={volumeMl} onChange={e => setVolumeMl(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 100" />
//               </div>
//             )}
//             {rc.showDiluent && (
//               <div>
//                 <label style={lbl}>Diluent</label>
//                 <input type="text" value={diluent} onChange={e => setDiluent(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. Normal Saline" />
//               </div>
//             )}
//           </div>
//         )}

//         {(rc.showRate || rc.showFlush) && (
//           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
//             {rc.showRate && (
//               <div>
//                 <label style={lbl}>Rate (ml/hr)</label>
//                 <input type="number" min="1" value={rateMlHr} onChange={e => setRateMlHr(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 50" />
//               </div>
//             )}
//             {rc.showFlush && (
//               <div>
//                 <label style={lbl}>Flush (ml)</label>
//                 <input type="number" min="0" value={flushMl} onChange={e => setFlushMl(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 10" />
//               </div>
//             )}
//           </div>
//         )}

//         {(rc.showAccessSite || rc.showBatch) && (
//           <div style={{ display: "grid", gridTemplateColumns: rc.showAccessSite && rc.showBatch ? "1fr 1fr" : "1fr", gap: "10px", marginBottom: "10px" }}>
//             {rc.showAccessSite && (
//               <div>
//                 <label style={lbl}>Access Site</label>
//                 <input type="text" value={accessSite} onChange={e => setAccessSite(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. Right forearm" />
//               </div>
//             )}
//             {rc.showBatch && (
//               <div>
//                 <label style={lbl}>Batch / Unit Number</label>
//                 <input type="text" value={batchNumber} onChange={e => setBatchNumber(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. PRBC-20240524" />
//               </div>
//             )}
//           </div>
//         )}

//         <div style={{ marginBottom: "12px" }}>
//           <label style={lbl}>Remarks <span style={{ fontWeight: 400, color: "#aaa", textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
//           <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} style={inpSm(`${rc.color}40`)} placeholder="e.g. Given slowly over 20 minutes" />
//         </div>

//         <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
//           <button type="button" style={secBtn} onClick={onCancel}>Cancel</button>
//           <button type="submit" disabled={submitting} style={primBtn(rc.color)}>
//             {submitting ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle2 size={13} />}
//             Mark as Given
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// };

// // ─── Due Medication Card ──────────────────────────────────────────────────────

// const DueMedCard: React.FC<{
//   med: DueMedication;
//   encounterNumber: string;
//   onSave: () => void;
// }> = ({ med, encounterNumber, onSave }) => {
//   const [showForm, setShowForm] = useState(false);
//   const isDispensed = ["DISPENSED", "PARTIALLY_DISPENSED"].includes((med.dispense_status || "").toUpperCase());
//   const rc = routeConfig(med.route);

//   return (
//     <div style={{
//       background: "#fff",
//       borderRadius: "12px",
//       border: "1px solid #e0e4ef",
//       boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
//       borderLeft: `4px solid ${isDispensed ? rc.color : "#d1d5db"}`,
//       opacity: isDispensed ? 1 : 0.75,
//       marginBottom: "12px",
//     }}>
//       <div style={{ padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
//         <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `${isDispensed ? rc.color : "#6b7280"}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
//           <Pill size={18} color={isDispensed ? rc.color : "#6b7280"} />
//         </div>

//         <div style={{ flex: 1, minWidth: 0 }}>
//           <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
//             <span style={{ fontWeight: 800, fontSize: "18px", color: "#1c2b4a" }}>{med.drug_name}</span>
//             <RouteBadge route={med.route} />
//             <StatusBadge status={med.due_status} size="xs" />
//             {!isDispensed && (
//               <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#fef9c3", color: "#854d0e", fontSize: "12px", fontWeight: 800, padding: "3px 8px", borderRadius: "20px", border: "1px solid #fde047" }}>
//                 <AlertTriangle size={9} /> Not Yet Dispensed
//               </span>
//             )}
//           </div>

//           <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "4px" }}>
//             {([
//               ["Dose", med.dosage],
//               ["Frequency", med.frequency],
//               med.duration ? ["Duration", `${med.duration} ${med.duration_unit || 'Days'}`] : null,
//               ["Prescribed by", med.prescribed_by],
//             ].filter(Boolean) as [string, string][]).map(([k, v]) => (
//               <div key={k}>
//                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
//                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{v || "—"}</div>
//               </div>
//             ))}
//             {med.prescribed_at && (
//               <div>
//                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Prescribed On</div>
//                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{fmtDt(med.prescribed_at)}</div>
//               </div>
//             )}
//             {med.last_administered_at && (
//               <div>
//                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Last Given</div>
//                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{fmtDt(med.last_administered_at)}</div>
//               </div>
//             )}
//           </div>

//           {med.instructions && (
//             <div style={{ marginTop: "6px", fontSize: "14px", color: "#6b7a9a", fontStyle: "italic" }}>
//               ℹ {med.instructions}
//             </div>
//           )}
//         </div>

//         <button
//           onClick={() => setShowForm(f => !f)}
//           style={{
//             display: "flex", alignItems: "center", gap: "4px",
//             padding: "7px 14px", border: `1.5px solid ${rc.color}`,
//             borderRadius: "8px", background: showForm ? rc.color : "#fff",
//             color: showForm ? "#fff" : rc.color,
//             fontSize: "14px", fontWeight: 800, cursor: "pointer",
//             whiteSpace: "nowrap", transition: "all 0.15s", flexShrink: 0,
//           }}
//         >
//           <CheckCircle2 size={12} />
//           {showForm ? "Cancel" : "Give"}
//         </button>
//       </div>

//       {showForm && (
//         <div style={{ padding: "0 14px 14px" }}>
//           <AdminForm
//             med={med}
//             encounterNumber={encounterNumber}
//             onCancel={() => setShowForm(false)}
//             onSave={() => { setShowForm(false); onSave(); }}
//           />
//         </div>
//       )}
//     </div>
//   );
// };

// // ─── History Card ─────────────────────────────────────────────────────────────

// const HistoryCard: React.FC<{ record: AdminHistory }> = ({ record }) => {
//   const [expanded, setExpanded] = useState(false);
//   const rc = routeConfig(record.route);

//   return (
//     <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e0e4ef", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", borderLeft: `3px solid ${rc.color}`, marginBottom: "10px" }}>
//       <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
//         <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: `${rc.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
//           <Pill size={14} color={rc.color} />
//         </div>

//         <div style={{ flex: 1, minWidth: 0 }}>
//           <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "2px" }}>
//             <span style={{ fontWeight: 800, fontSize: "16px", color: "#1c2b4a" }}>{record.drug_name}</span>
//             <RouteBadge route={record.route} />
//             <StatusBadge status={record.status} size="xs" />
//           </div>
//           <div style={{ fontSize: "14px", color: "#6b7a9a" }}>
//             <span style={{ fontWeight: 600, color: "#1c2b4a" }}>{record.dose}</span>
//             {" · "}
//             <Clock size={9} style={{ display: "inline", verticalAlign: "middle", marginRight: "2px" }} />
//             {fmtDt(record.administered_at)}
//             {" · by "}<span style={{ fontWeight: 600, color: "#1c2b4a" }}>{record.administered_by_name}</span>
//           </div>
//         </div>

//         <button
//           onClick={() => setExpanded(e => !e)}
//           style={{ background: "none", border: "none", cursor: "pointer", color: "#8a94ad", padding: "4px", borderRadius: "6px", lineHeight: 1, flexShrink: 0 }}
//         >
//           {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
//         </button>
//       </div>

//       {expanded && (
//         <div style={{ padding: "0 14px 12px", background: "#f8f9fc", borderTop: "1px dashed #e0e4ef" }}>
//           <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", paddingTop: "10px" }}>
//             {([
//               ["Prescribed Dose", record.dosage],
//               ["Frequency", record.frequency],
//               rc.showDiluent && ["Diluent", record.diluent],
//               rc.showRate && ["Rate", record.rate_ml_hr ? `${record.rate_ml_hr} ml/hr` : null],
//               rc.showAccessSite && ["Access Site", record.access_site],
//               rc.showBatch && ["Batch No.", record.batch_number],
//             ].filter(Boolean) as [string, string | null][]).map(([k, v]) => (
//               <div key={k}>
//                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
//                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{v || "—"}</div>
//               </div>
//             ))}
//           </div>
//           {record.remarks && (
//             <div style={{ marginTop: "8px", fontSize: "14px", color: "#6b7a9a", fontStyle: "italic" }}>
//               "{record.remarks}"
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };

// // ─── Main MARPanel ────────────────────────────────────────────────────────────

// const MARPanel: React.FC<MARPanelProps> = ({ encounterNumber, onClose }) => {
//   const [activeTab, setActiveTab] = useState<"paperGrid" | "grid" | "due" | "history">("paperGrid");
  
//   // Data States
//   const [dueMeds, setDueMeds] = useState<DueMedication[]>([]);
//   const [history, setHistory] = useState<AdminHistory[]>([]);
  
//   // Separate states for Weekly vs Monthly grids
//   const [weeklyHeaders, setWeeklyHeaders] = useState<MarGridHeader[]>([]);
//   const [weeklyRows, setWeeklyRows] = useState<MarGridRow[]>([]);
  
//   const [monthlyHeaders, setMonthlyHeaders] = useState<MarGridHeader[]>([]);
//   const [monthlyRows, setMonthlyRows] = useState<MarGridRow[]>([]);
  
//   // Loading States
//   const [loadingDue, setLoadingDue] = useState(true);
//   const [loadingHistory, setLoadingHistory] = useState(true);
//   const [loadingWeeklyGrid, setLoadingWeeklyGrid] = useState(true);
//   const [loadingMonthlyGrid, setLoadingMonthlyGrid] = useState(true);
  
//   // Calendar State for Monthly Grid
//   const today = new Date();
//   const todayStr = getTodayDateString(); 
//   const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
//   const [currentYear, setCurrentYear] = useState(today.getFullYear());
//   const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

//   // Shared Modal States
//   const [activeSlot, setActiveSlot] = useState<{ row: MarGridRow; date: string; slot: MarGridSlot } | null>(null);
//   const [viewSlotDetail, setViewSlotDetail] = useState<{ row: MarGridRow; date: string; slot: MarGridSlot } | null>(null);

//   const handlePrevMonth = () => {
//     if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(y => y - 1); }
//     else { setCurrentMonth(m => m - 1); }
//   };

//   const handleNextMonth = () => {
//     if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(y => y + 1); }
//     else { setCurrentMonth(m => m + 1); }
//   };

//   const fetchDue = useCallback(async () => {
//     setLoadingDue(true);
//     try {
//       const res = await nursingService.getMARDue(encounterNumber);
//       setDueMeds(res.data || []);
//     } catch {
//       setDueMeds([]);
//     } finally { setLoadingDue(false); }
//   }, [encounterNumber]);

//   const fetchHistory = useCallback(async () => {
//     setLoadingHistory(true);
//     try {
//       const res = await nursingService.getMARHistory(encounterNumber);
//       setHistory(res.data || []);
//     } catch {
//       setHistory([]);
//     } finally { setLoadingHistory(false); }
//   }, [encounterNumber]);

//   const fetchWeeklyGrid = useCallback(async () => {
//     setLoadingWeeklyGrid(true);
//     try {
//       const res = await nursingService.getMARDueHistory(encounterNumber);
//       setWeeklyHeaders(res.data?.headers || []);
//       setWeeklyRows(res.data?.rows || []);
//     } catch {
//       setWeeklyHeaders([]);
//       setWeeklyRows([]);
//     } finally { setLoadingWeeklyGrid(false); }
//   }, [encounterNumber]);

//   const fetchMonthlyGrid = useCallback(async () => {
//     setLoadingMonthlyGrid(true);
//     try {
//       const fetchFn = (nursingService as any).getMARMonth; 
//       let res;
//       if (fetchFn) {
//          res = await fetchFn(encounterNumber, currentMonth, currentYear);
//       } else {
//          console.warn("nursingService.getMARMonth not found! Falling back to getMARDueHistory");
//          res = await nursingService.getMARDueHistory(encounterNumber);
//       }
//       setMonthlyHeaders(res?.data?.headers || []);
//       setMonthlyRows(res?.data?.rows || []);
//     } catch {
//       setMonthlyHeaders([]);
//       setMonthlyRows([]);
//     } finally { setLoadingMonthlyGrid(false); }
//   }, [encounterNumber, currentMonth, currentYear]);

//   useEffect(() => {
//     fetchDue();
//     fetchHistory();
//     fetchWeeklyGrid();
//   }, [fetchDue, fetchHistory, fetchWeeklyGrid]);

//   useEffect(() => {
//     fetchMonthlyGrid();
//   }, [fetchMonthlyGrid]);

//   const handleAdminSave = () => {
//     fetchDue();
//     fetchHistory();
//   };

//   const handleGridAdminSave = () => {
//     setActiveSlot(null);
//     fetchDue();
//     fetchHistory();
//     fetchWeeklyGrid();
//     fetchMonthlyGrid();
//   };

//   const TEAL = "#0d9488";
//   const TEAL_DARK = "#0f766e";
//   const ACTIVE_COL_BG = "#dcfce7"; 

//   const tabBtn = (tab: "due" | "history" | "grid" | "paperGrid"): React.CSSProperties => ({
//     flex: 1, padding: "9px 12px", border: "none", cursor: "pointer",
//     fontSize: "15px", fontWeight: 800, display: "flex", alignItems: "center",
//     justifyContent: "center", gap: "6px", transition: "all 0.15s",
//     borderBottom: activeTab === tab ? `2px solid ${TEAL}` : "2px solid transparent",
//     background: activeTab === tab ? "#f0fdfa" : "#f8f9fc",
//     color: activeTab === tab ? TEAL_DARK : "#6b7a9a",
//   });

//   return (
//     <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #d8dce8", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>

//       {/* ── Panel header ── */}
//       <div style={{ background: `linear-gradient(135deg, ${TEAL_DARK} 0%, ${TEAL} 100%)`, padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
//         <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//           <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
//             <ClipboardList size={16} color="#fff" />
//           </div>
//           <div>
//             <div style={{ fontWeight: 900, fontSize: "16px", color: "#fff", letterSpacing: "0.3px" }}>Medication Administration Record</div>
//             <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", marginTop: "1px" }}>MAR · {encounterNumber}</div>
//           </div>
//           {dueMeds.length > 0 && (
//             <span style={{ background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: "13px", fontWeight: 800, padding: "3px 10px", borderRadius: "20px", marginLeft: "4px" }}>
//               {dueMeds.length} scheduled
//             </span>
//           )}
//         </div>
//         {onClose && (
//           <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "7px", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer" }}>
//             <X size={16} />
//           </button>
//         )}
//       </div>

//       {/* ── Tabs ── */}
//       <div style={{ display: "flex", borderBottom: "1px solid #e0e4ef", flexShrink: 0 }}>
//         <button style={tabBtn("due")} onClick={() => setActiveTab("due")}>
//           <Pill size={13} /> Scheduled Medications
//           {!loadingDue && dueMeds.length > 0 && (
//             <span style={{ background: TEAL, color: "#fff", borderRadius: "20px", fontSize: "12px", fontWeight: 900, padding: "1px 6px", marginLeft: "2px" }}>
//               {dueMeds.length}
//             </span>
//           )}
//         </button>
        
//         <button style={tabBtn("history")} onClick={() => setActiveTab("history")}>
//           <History size={13} /> Administration History
//           {!loadingHistory && history.length > 0 && (
//             <span style={{ background: "#6b7a9a", color: "#fff", borderRadius: "20px", fontSize: "12px", fontWeight: 900, padding: "1px 6px", marginLeft: "2px" }}>
//               {history.length}
//             </span>
//           )}
//         </button>
        
//         <button style={tabBtn("paperGrid")} onClick={() => setActiveTab("paperGrid")}>
//           <LayoutGrid size={13} /> Monthly MAR 
//         </button>
//         <button style={tabBtn("grid")} onClick={() => setActiveTab("grid")}>
//           <LayoutGrid size={13} /> Weekly Chart
//         </button>
//       </div>

//       {/* ── Tab Body ── */}
//       <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px", flex: 1, overflowY: "auto" }}>

//         {/* DUE TAB */}
//         {activeTab === "due" && (
//           <>
//             {loadingDue ? (
//               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a", fontSize: "16px" }}>
//                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
//                 Loading scheduled medications…
//               </div>
//             ) : dueMeds.length === 0 ? (
//               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a" }}>
//                 <CheckCircle2 size={32} color="#a7f3d0" />
//                 <span style={{ fontSize: "16px", fontWeight: 700, color: "#0f766e" }}>No scheduled medications</span>
//                 <span style={{ fontSize: "14px", color: "#8a94ad" }}>All scheduled medications have been administered or have expired.</span>
//               </div>
//             ) : (
//               dueMeds.map(med => (
//                 <DueMedCard
//                   key={med.prescription_id}
//                   med={med}
//                   encounterNumber={encounterNumber}
//                   onSave={handleAdminSave}
//                 />
//               ))
//             )}
//           </>
//         )}

//         {/* HISTORY TAB */}
//         {activeTab === "history" && (
//           <>
//             {loadingHistory ? (
//               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a", fontSize: "16px" }}>
//                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
//                 Loading history…
//               </div>
//             ) : history.length === 0 ? (
//               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a" }}>
//                 <History size={32} color="#d1d5db" />
//                 <span style={{ fontSize: "16px", fontWeight: 700 }}>No administration history</span>
//                 <span style={{ fontSize: "14px", color: "#8a94ad" }}>Administered medications will appear here</span>
//               </div>
//             ) : (
//               <>
//                 <div style={{ fontSize: "13px", fontWeight: 700, color: "#8a94ad", textTransform: "uppercase", letterSpacing: "0.6px", padding: "0 2px 4px" }}>
//                   {history.length} record{history.length !== 1 ? "s" : ""} found
//                 </div>
//                 {[...history]
//                   .sort((a, b) => new Date(b.administered_at.replace(" ", "T")).getTime() - new Date(a.administered_at.replace(" ", "T")).getTime())
//                   .map(record => (
//                     <HistoryCard key={record.id} record={record} />
//                   ))
//                 }
//               </>
//             )}
//           </>
//         )}

//         {/* WEEKLY GRID TAB */}
//         {activeTab === "grid" && (
//           <>
//             {loadingWeeklyGrid ? (
//               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a", fontSize: "16px" }}>
//                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
//                 Loading weekly chart…
//               </div>
//             ) : weeklyRows.length === 0 ? (
//               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a" }}>
//                 <LayoutGrid size={32} color="#d1d5db" />
//                 <span style={{ fontSize: "16px", fontWeight: 700 }}>No medications scheduled this week</span>
//               </div>
//             ) : (
//               <div style={{ overflowX: "auto", border: "1px solid #e0e4ef", borderRadius: "10px" }}>
//                 <table style={{ borderCollapse: "collapse", width: "100%", minWidth: `${200 + weeklyHeaders.length * 120}px` }}>
//                   <thead>
//                     <tr>
//                       <th style={{
//                         position: "sticky", left: 0, zIndex: 1, background: "#f8f9fc",
//                         textAlign: "left", padding: "10px 14px", fontSize: "13px", fontWeight: 800,
//                         color: "#6b7a9a", textTransform: "uppercase", letterSpacing: "0.5px",
//                         borderBottom: "1px solid #e0e4ef", borderRight: "1px solid #e0e4ef",
//                         minWidth: "200px",
//                       }}>
//                         Medication
//                       </th>
//                       {weeklyHeaders.map(h => (
//                         <th key={h.date} style={{
//                           padding: "10px 12px", fontSize: "13px", fontWeight: 800, color: "#6b7a9a",
//                           textTransform: "uppercase", letterSpacing: "0.5px", background: h.date === todayStr ? ACTIVE_COL_BG : "#f8f9fc",
//                           borderBottom: "1px solid #e0e4ef", borderLeft: "1px solid #eef1f7", minWidth: "120px",
//                         }}>
//                           <div style={{ color: h.date === todayStr ? "#166534" : "inherit" }}>{h.day_name}</div>
//                           <div style={{ fontWeight: 600, color: h.date === todayStr ? "#16a34a" : "#8a94ad", marginTop: "2px" }}>{h.display}</div>
//                         </th>
//                       ))}
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {weeklyRows.map(row => {
//                       const isInactive = row.prescription_status === "STOPPED" || row.prescription_status === "CANCELLED";
//                       return (
//                         <tr key={row.prescription_id} style={{ opacity: isInactive ? 0.55 : 1 }}>
//                           <td style={{
//                             position: "sticky", left: 0, zIndex: 1, background: "#fff",
//                             padding: "10px 14px", borderBottom: "1px solid #eef1f7", borderRight: "1px solid #e0e4ef",
//                             verticalAlign: "top",
//                           }}>
//                             <div style={{ fontWeight: 800, fontSize: "15px", color: "#1c2b4a" }}>{row.drug_name}</div>
//                             <div style={{ fontSize: "13px", color: "#6b7a9a", marginTop: "2px" }}>{row.dosage_info}</div>
//                             <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
//                               <span style={{ fontSize: "12px", color: "#8a94ad" }}>Start: {row.start_date}</span>
//                               <StatusBadge status={row.prescription_status} size="xs" />
//                             </div>
//                           </td>
//                           {weeklyHeaders.map(h => {
//                             const slots = row.days[h.date] || [];
//                             return (
//                               <td key={h.date} style={{
//                                 padding: "8px", verticalAlign: "top",
//                                 borderBottom: "1px solid #eef1f7", borderLeft: "1px solid #eef1f7",
//                                 background: h.date === todayStr ? ACTIVE_COL_BG : "#fff",
//                               }}>
//                                 {slots.length === 0 ? (
//                                   <span style={{ fontSize: "14px", color: "#cbd5e1" }}>—</span>
//                                 ) : (
//                                   slots.map((slot, i) => (
//                                     <SlotChip
//                                       key={i}
//                                       slot={slot}
//                                       isInactive={isInactive}
//                                       clickable={true} // Allow clicking irrespective of status
//                                       onAdminister={() => setActiveSlot({ row, date: h.date, slot })}
//                                       onViewDetail={() => setViewSlotDetail({ row, date: h.date, slot })}
//                                     />
//                                   ))
//                                 )}
//                               </td>
//                             );
//                           })}
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                 </table>
//               </div>
//             )}
//           </>
//         )}

//         {/* MONTHLY MAR GRID TAB */}
//         {activeTab === "paperGrid" && (
//           <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            
//             {/* Header controls for Monthly View */}
//             <div style={{ marginBottom: "16px", border: "2px solid #1e293b", borderRadius: "8px", overflow: "hidden", flexShrink: 0 }}>
//               <div style={{ background: "#f8fafc", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #1e293b" }}>
//                 <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px" }}>
//                   Personal Medication Administration Record (MAR)
//                 </h2>
//                 <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
//                   <button onClick={handlePrevMonth} style={{ background: "none", border: "none", cursor: "pointer" }}><ChevronLeft size={20} /></button>
//                   <span style={{ fontSize: "16px", fontWeight: 800, minWidth: "140px", textAlign: "center" }}>
//                     {monthNames[currentMonth - 1]} {currentYear}
//                   </span>
//                   <button onClick={handleNextMonth} style={{ background: "none", border: "none", cursor: "pointer" }}><ChevronRight size={20} /></button>
//                 </div>
//               </div>
              
//               <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", fontSize: "12px", background: "#fff" }}>
//                 <div style={{ padding: "8px", borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1" }}>
//                   <strong>PATIENT NAME:</strong> {encounterNumber}
//                 </div>
//                 <div style={{ padding: "8px", borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1" }}>
//                   <strong>D.O.B.:</strong> —
//                 </div>
//                 <div style={{ padding: "8px", borderBottom: "1px solid #cbd5e1" }}>
//                   <strong>ADDRESS:</strong> —
//                 </div>
//                 <div style={{ padding: "8px", borderRight: "1px solid #cbd5e1", gridColumn: "span 1" }}>
//                   <strong>GP NAME:</strong> —
//                 </div>
//                 <div style={{ padding: "8px", gridColumn: "span 2" }}>
//                   <strong>KNOWN ALLERGIES:</strong> <span style={{ color: "#ef4444", fontWeight: 800 }}>None Recorded</span>
//                 </div>
//               </div>
//             </div>

//             {loadingMonthlyGrid ? (
//               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px", color: "#6b7a9a" }}>
//                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
//               </div>
//             ) : monthlyRows.length === 0 ? (
//               <div style={{ textAlign: "center", padding: "48px", color: "#6b7a9a", fontWeight: 700 }}>No medications scheduled this month</div>
//             ) : (
//               <div style={{ overflowX: "auto", border: "2px solid #1e293b", flex: 1 }}>
//                 <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed", minWidth: `${250 + (monthlyHeaders.length * 38)}px` }}>
//                   <thead>
//                     <tr>
//                       <th style={{ width: "250px", position: "sticky", left: 0, zIndex: 2, background: "#f8fafc", borderRight: "2px solid #1e293b", borderBottom: "2px solid #1e293b", padding: "8px", textAlign: "left", fontSize: "11px", textTransform: "uppercase" }}>
//                         Medication<br/>
//                         <span style={{ fontWeight: 400, color: "#64748b" }}>(Name, strength, dose, frequency, route)</span>
//                       </th>
//                       {monthlyHeaders.map(h => (
//                         <th key={h.date} style={{ 
//                           borderBottom: "2px solid #1e293b", borderRight: "1px solid #cbd5e1", 
//                           background: h.date === todayStr ? ACTIVE_COL_BG : "#f8fafc", 
//                           color: h.date === todayStr ? "#166534" : "inherit",
//                           padding: "4px 0", width: "38px", textAlign: "center" 
//                         }}>
//                           <div style={{ fontSize: "9px", color: h.date === todayStr ? "#166534" : "#64748b" }}>{h.day_name}</div>
//                           <div style={{ fontSize: "14px", fontWeight: 800 }}>{h.display}</div>
//                         </th>
//                       ))}
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {monthlyRows.map(row => {
//                       const isInactive = row.prescription_status === "STOPPED" || row.prescription_status === "CANCELLED";
//                       return (
//                         <tr key={row.prescription_id} style={{ opacity: isInactive ? 0.6 : 1, background: isInactive ? "#f1f5f9" : "#fff" }}>
                          
//                           <td style={{ position: "sticky", left: 0, zIndex: 1, background: isInactive ? "#f1f5f9" : "#fff", borderRight: "2px solid #1e293b", borderBottom: "1px solid #cbd5e1", padding: "8px", verticalAlign: "top" }}>
//                             <div style={{ fontWeight: 900, fontSize: "13px", color: "#0f172a" }}>{row.drug_name}</div>
//                             <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px", fontWeight: 600 }}>{row.dosage_info}</div>
//                             <div style={{ marginTop: "4px" }}>
//                               <StatusBadge status={row.prescription_status} size="xs" />
//                             </div>
//                           </td>

//                           {monthlyHeaders.map(h => {
//                             const slots = row.days[h.date] || [];
//                             const colBackground = h.date === todayStr ? ACTIVE_COL_BG : (isInactive ? "#f8fafc" : "#fff");
                            
//                             return (
//                               <td key={h.date} style={{ borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1", padding: "2px", verticalAlign: "top", background: colBackground }}>
//                                 {slots.length === 0 ? null : (
//                                   slots.map((slot, i) => (
//                                     <CompactSlotChip
//                                       key={i}
//                                       slot={slot}
//                                       isInactive={isInactive}
//                                       clickable={true} // Allow clicking irrespective of status
//                                       onAction={() => {
//                                         const isPending = (slot.status || "").toLowerCase() === "pending";
//                                         if (isPending) setActiveSlot({ row, date: h.date, slot });
//                                         else setViewSlotDetail({ row, date: h.date, slot });
//                                       }}
//                                     />
//                                   ))
//                                 )}
//                               </td>
//                             );
//                           })}
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                 </table>
//               </div>
//             )}
//           </div>
//         )}
//       </div>

//       {/* ── Shared Grid Slot Administer Modal ── */}
//       {activeSlot && (
//         <div
//           style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "16px" }}
//           onClick={() => setActiveSlot(null)}
//         >
//           <div style={{ width: "100%", maxWidth: "460px" }} onClick={e => e.stopPropagation()}>
//             <AdminForm
//               med={{
//                 prescription_id: activeSlot.row.prescription_id,
//                 drug_name: activeSlot.row.drug_name,
//                 drug_id: activeSlot.row.drug_id, 
//                 dosage: activeSlot.row.dosage,
//                 frequency: activeSlot.row.frequency,
//                 route: activeSlot.row.route,
//                 instructions: activeSlot.row.instructions,
//                 dispense_status: activeSlot.row.dispense_status,
//                 prescription_status: activeSlot.row.prescription_status,
//                 prescribed_by: activeSlot.row.prescribed_by,
//                 prescribed_at: activeSlot.row.prescribed_at,
//                 last_admin_id: null,
//                 last_admin_status: null,
//                 last_administered_at: null,
//                 last_administered_by: null,
//                 last_administered_by_name: null,
//                 due_status: activeSlot.row.due_status,
//                 duration: activeSlot.row.duration,
//                 duration_unit: activeSlot.row.duration_unit,
//               }}
//               encounterNumber={encounterNumber}
//               onCancel={() => setActiveSlot(null)}
//               onSave={handleGridAdminSave}
//             />
//           </div>
//         </div>
//       )}

//       {/* ── Shared Grid Slot Detail (View) Modal ── */}
//       {viewSlotDetail && (() => {
//         const fullRecord = history.find(h => h.id === viewSlotDetail.slot.admin_id);
//         const rc = routeConfig(fullRecord?.route || parseDosageInfo(viewSlotDetail.row.dosage_info).route);
//         return (
//           <div
//             style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "16px" }}
//             onClick={() => setViewSlotDetail(null)}
//           >
//             <div style={{ width: "100%", maxWidth: "460px", background: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
//               <div style={{ background: rc.color, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", color: "#fff" }}>
//                 <div>
//                   <div style={{ fontSize: "16px", fontWeight: 800 }}>{viewSlotDetail.row.drug_name}</div>
//                   <div style={{ fontSize: "13px", opacity: 0.85, marginTop: "2px" }}>
//                     Scheduled {viewSlotDetail.slot.scheduled_label} · {fmtDt(viewSlotDetail.date)}
//                   </div>
//                 </div>
//                 <button onClick={() => setViewSlotDetail(null)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "6px", width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer" }}>
//                   <X size={16} />
//                 </button>
//               </div>
//               <div style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
//                 <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
//                   <StatusBadge status={viewSlotDetail.slot.status} />
//                   {fullRecord && <RouteBadge route={fullRecord.route} />}
//                 </div>

//                 {fullRecord ? (
//                   <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
//                     {([
//                       ["Dose Given", fullRecord.dose],
//                       ["Administered At", fmtDt(fullRecord.administered_at)],
//                       ["Given By", fullRecord.administered_by_name],
//                       rc.showDiluent && ["Diluent", fullRecord.diluent],
//                       rc.showRate && ["Rate", fullRecord.rate_ml_hr ? `${fullRecord.rate_ml_hr} ml/hr` : null],
//                       rc.showAccessSite && ["Access Site", fullRecord.access_site],
//                       rc.showBatch && ["Batch No.", fullRecord.batch_number],
//                     ].filter(Boolean) as [string, string | null][]).map(([k, v]) => (
//                       <div key={k}>
//                         <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
//                         <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{v || "—"}</div>
//                       </div>
//                     ))}
//                   </div>
//                 ) : (
//                   <div style={{ fontSize: "14px", color: "#6b7a9a" }}>
//                     Recorded as <strong>{viewSlotDetail.slot.actual_label || viewSlotDetail.slot.status}</strong>.
//                     {" "}Full administration details aren't available for this entry.
//                   </div>
//                 )}

//                 {viewSlotDetail.slot.remarks && (
//                   <div style={{ fontSize: "14px", color: "#6b7a9a", fontStyle: "italic" }}>
//                     "{viewSlotDetail.slot.remarks}"
//                   </div>
//                 )}
//               </div>
//               <div style={{ padding: "14px 18px", borderTop: "1px solid #eef1f7", display: "flex", justifyContent: "flex-end" }}>
//                 <button onClick={() => setViewSlotDetail(null)} style={secBtn}>Close</button>
//               </div>
//             </div>
//           </div>
//         );
//       })()}
//     </div>
//   );
// };

// export default MARPanel;




// // import React, { useState, useEffect, useCallback } from "react";
// // import {
// //   X, Loader2, Clock, CheckCircle2, AlertTriangle, Pill,
// //   ClipboardList, History, ChevronDown, ChevronUp, Plus, LayoutGrid, ChevronLeft, ChevronRight
// // } from "lucide-react";
// // import { nursingService } from "../services/nursing.service";
// // import { useNotification } from "../context/NotificationContext";

// // // ─── Types ────────────────────────────────────────────────────────────────────

// // interface DueMedication {
// //   prescription_id: number;
// //   drug_name: string;
// //   drug_id?: number;
// //   dosage: string;
// //   frequency: string;
// //   route: string;
// //   instructions: string | null;
// //   dispense_status: string;
// //   prescribed_by: string;
// //   prescribed_at: string | null;
// //   last_admin_id: number | null;
// //   last_admin_status: string | null;
// //   last_administered_at: string | null;
// //   last_administered_by: string | null;
// //   last_administered_by_name: string | null;
// //   due_status: string;
// // }

// // interface AdminHistory {
// //   id: number;
// //   prescription_id: number;
// //   drug_id: number;
// //   drug_name: string;
// //   dosage: string;
// //   dose: string;
// //   route: string;
// //   frequency: string;
// //   diluent: string | null;
// //   rate_ml_hr: number | null;
// //   access_site: string | null;
// //   batch_number: string | null;
// //   administered_at: string;
// //   administered_by_name: string;
// //   status: string;
// //   remarks: string | null;
// // }

// // interface MarGridHeader {
// //   date: string;
// //   display: string;
// //   day_name: string;
// // }

// // interface MarGridSlot {
// //   status: string;
// //   scheduled_label: string;
// //   actual_label: string | null;
// //   admin_id: number | null;
// //   remarks: string | null;
// //   is_overdue: boolean;
// // }


// // interface MarGridRow {
// //   prescription_id: number;
// //   drug_id?: number;
// //   drug_name: string;
// //   dosage: string;
// //   frequency: string;
// //   route: string;
// //   instructions: string | null;
// //   dispense_status: string;
// //   prescribed_by: string;
// //   prescribed_at: string | null;
// //   duration?: number;
// //   duration_unit?: string;
// //   dosage_info: string;
// //   start_date: string;
// //   prescription_status: string;
// //   due_status: string;
// //   days: Record<string, MarGridSlot[]>;
// // }


// // // interface MarGridRow {
// // //   prescription_id: number;
// // //   drug_name: string;
// // //   dosage_info: string;
// // //   start_date: string;
// // //   prescription_status: string;
// // //   due_status: string;
// // //   days: Record<string, MarGridSlot[]>;
// // // }

// // interface MARPanelProps {
// //   encounterNumber: string;
// //   onClose?: () => void;
// // }

// // // ─── Helpers ──────────────────────────────────────────────────────────────────

// // const getLocalTimestamp = (date: Date = new Date()): string => {
// //   const pad = (n: number) => n.toString().padStart(2, "0");
// //   return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
// // };

// // const getTodayDateString = (): string => {
// //   const date = new Date();
// //   const pad = (n: number) => n.toString().padStart(2, "0");
// //   return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
// // };

// // const toInputDatetime = (dt: string): string => {
// //   if (!dt) return "";
// //   return dt.replace(" ", "T").slice(0, 16);
// // };

// // const fromInputDatetime = (val: string): string => {
// //   if (!val) return "";
// //   return val.replace("T", " ") + ":00";
// // };

// // const fmtDt = (dt: string) => {
// //   if (!dt) return "—";
// //   try {
// //     return new Date(dt.replace(" ", "T")).toLocaleString("en-GB", {
// //       day: "2-digit", month: "2-digit", year: "2-digit",
// //       hour: "2-digit", minute: "2-digit",
// //     });
// //   } catch { return dt; }
// // };

// // const parseDosageInfo = (info: string): { dosage: string; frequency: string; route: string } => {
// //   const routeMatch = info.match(/\(([^)]+)\)\s*\$/);
// //   const route = routeMatch ? routeMatch[1] : "";
// //   const withoutRoute = info.replace(/\([^)]+\)\s*\$/, "").trim();
// //   const [dosage = "", frequency = ""] = withoutRoute.split(" - ").map(s => s.trim());
// //   return { dosage, frequency, route };
// // };

// // const routeConfig = (route: string): {
// //   showVolume: boolean; showDiluent: boolean; showRate: boolean;
// //   showFlush: boolean; showAccessSite: boolean; showBatch: boolean;
// //   label: string; color: string; bg: string;
// // } => {
// //   const r = (route || "").toUpperCase();
// //   if (r === "IV")      return { showVolume: true,  showDiluent: true,  showRate: true,  showFlush: true,  showAccessSite: true,  showBatch: false, label: "IV Infusion",     color: "#1d4ed8", bg: "#eff6ff" };
// //   if (r === "SC" || r === "IM") return { showVolume: true,  showDiluent: false, showRate: false, showFlush: false, showAccessSite: true,  showBatch: false, label: r + " Injection",  color: "#7c3aed", bg: "#f5f3ff" };
// //   if (r === "PO" || r === "SL") return { showVolume: false, showDiluent: false, showRate: false, showFlush: false, showAccessSite: false, showBatch: false, label: "Oral",            color: "#0f766e", bg: "#f0fdfa" };
// //   if (r === "BLOOD")  return { showVolume: true,  showDiluent: false, showRate: false, showFlush: false, showAccessSite: true,  showBatch: true,  label: "Blood Product",   color: "#b91c1c", bg: "#fef2f2" };
// //   if (r === "NG" || r === "PEG") return { showVolume: true, showDiluent: false, showRate: false, showFlush: false, showAccessSite: false, showBatch: false, label: "NG/PEG Feed",    color: "#b45309", bg: "#fefce8" };
// //   return { showVolume: true, showDiluent: true, showRate: false, showFlush: false, showAccessSite: false, showBatch: false, label: route, color: "#1c3d7a", bg: "#f8f9fc" };
// // };

// // // ─── Shared Styles ────────────────────────────────────────────────────────────

// // const lbl: React.CSSProperties = {
// //   display: "block", fontSize: "13px", fontWeight: 700, color: "#6b7a9a",
// //   textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "5px",
// // };
// // const inp: React.CSSProperties = {
// //   width: "100%", padding: "9px 12px", border: "1px solid #d0d6e6",
// //   borderRadius: "9px", fontSize: "16px", fontWeight: 500, color: "#1c2b4a",
// //   background: "#f8f9fc", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
// // };
// // const inpSm = (borderColor: string): React.CSSProperties => ({
// //   ...inp, background: "#fff", border: `1px solid ${borderColor}`,
// //   padding: "8px 10px", fontSize: "15px", borderRadius: "8px",
// // });
// // const secBtn: React.CSSProperties = {
// //   flex: "0 0 auto", padding: "8px 16px", border: "1px solid #d0d6e6",
// //   borderRadius: "9px", fontSize: "15px", fontWeight: 700, color: "#4a5568",
// //   background: "#fff", cursor: "pointer", whiteSpace: "nowrap",
// // };
// // const primBtn = (bg: string): React.CSSProperties => ({
// //   flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center",
// //   gap: "6px", padding: "8px 18px", border: "none", borderRadius: "9px",
// //   fontSize: "15px", fontWeight: 700, color: "#fff", background: bg, cursor: "pointer",
// //   whiteSpace: "nowrap",
// // });

// // // ─── Status badge ─────────────────────────────────────────────────────────────

// // const StatusBadge: React.FC<{ status: string; size?: "sm" | "xs" }> = ({ status, size = "sm" }) => {
// //   const s = (status || "").toUpperCase();
// //   const map: Record<string, { bg: string; color: string; dot: string }> = {
// //     GIVEN:      { bg: "#dcfce7", color: "#166534", dot: "#16a34a" },
// //     HELD:       { bg: "#fef9c3", color: "#854d0e", dot: "#ca8a04" },
// //     REFUSED:    { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626" },
// //     OMITTED:    { bg: "#f3f4f6", color: "#374151", dot: "#9ca3af" },
// //     DISPENSED:  { bg: "#dcfce7", color: "#166534", dot: "#16a34a" },
// //     PENDING:    { bg: "#fef9c3", color: "#854d0e", dot: "#ca8a04" },
// //     DUE:        { bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
// //     OVERDUE:    { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626" },
// //     STOPPED:    { bg: "#f1f5f9", color: "#64748b", dot: "#94a3b8" },
// //     CANCELLED:  { bg: "#f1f5f9", color: "#64748b", dot: "#94a3b8" },
// //   };
// //   const cfg = map[s] || { bg: "#f3f4f6", color: "#374151", dot: "#9ca3af" };
// //   const fs = size === "xs" ? "12px" : "13px";
// //   return (
// //     <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: cfg.bg, color: cfg.color, fontSize: fs, fontWeight: 800, textTransform: "uppercase", padding: "3px 8px", borderRadius: "20px", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>
// //       <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: cfg.dot, display: "inline-block", flexShrink: 0 }} />
// //       {status}
// //     </span>
// //   );
// // };

// // const RouteBadge: React.FC<{ route: string }> = ({ route }) => (
// //   <span style={{ display: "inline-block", background: "#ccfbf1", color: "#0f766e", fontSize: "12px", fontWeight: 800, textTransform: "uppercase", padding: "3px 8px", borderRadius: "20px", letterSpacing: "0.5px" }}>
// //     {route}
// //   </span>
// // );

// // // ─── Grid slot colors ────────────────────────────────────────────────────────

// // const slotColors = (slot: MarGridSlot, isInactive: boolean): { bg: string; color: string; border: string } => {
// //   if (isInactive) return { bg: "#f8fafc", color: "#94a3b8", border: "#e2e8f0" };
// //   const s = (slot.status || "").toLowerCase();
  
// //   if (s === "given" || s === "administered") return { bg: "#dcfce7", color: "#166534", border: "#86efac" };
// //   if (s === "missed" || s === "refused" || s === "omitted" || slot.is_overdue) return { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" };
// //   if (s === "held") return { bg: "#fef9c3", color: "#854d0e", border: "#fde047" };
  
// //   return { bg: "#ffffff", color: "#475569", border: "#cbd5e1" };
// // };

// // // ─── Weekly Grid Chip (Wider) ────────────────────────────────────────────────
// // const SlotChip: React.FC<{ slot: MarGridSlot; isInactive: boolean; clickable: boolean; onAdminister: () => void; onViewDetail: () => void }> = ({ slot, isInactive, clickable, onAdminister, onViewDetail }) => {
// //   const c = slotColors(slot, isInactive);
// //   const isPending = (slot.status || "").toLowerCase() === "pending";
// //   const hasDetail = !isPending && (slot.admin_id != null || !!slot.actual_label || !!slot.remarks);
// //   const isActionable = (isPending && clickable) || hasDetail;
// //   return (
// //     <button
// //       type="button"
// //       onClick={isActionable ? (isPending ? onAdminister : onViewDetail) : undefined}
// //       title={slot.remarks || undefined}
// //       style={{
// //         display: "block", width: "100%", textAlign: "left", marginBottom: "4px",
// //         padding: "4px 7px", borderRadius: "6px", border: `1px solid ${c.border}`,
// //         background: c.bg, color: c.color, fontSize: "13px", fontWeight: 800,
// //         cursor: isActionable ? "pointer" : "default", whiteSpace: "nowrap",
// //       }}
// //     >
// //       {slot.actual_label || slot.scheduled_label}
// //     </button>
// //   );
// // };

// // // ─── Monthly Grid Chip (Extra Compact 1-31 Days) ──────────────────────────────
// // const CompactSlotChip: React.FC<{ slot: MarGridSlot; isInactive: boolean; clickable: boolean; onAction: () => void; }> = ({ slot, isInactive, clickable, onAction }) => {
// //   const c = slotColors(slot, isInactive);
// //   const isPending = (slot.status || "").toLowerCase() === "pending";
// //   const hasDetail = !isPending && (slot.admin_id != null || !!slot.actual_label || !!slot.remarks);
// //   const isActionable = (isPending && clickable) || hasDetail;
  
// //   let text = slot.actual_label || slot.scheduled_label || "PRN";
// //   text = text.replace("S - ", "").replace("A - ", "").replace(" AM","").replace(" PM","");

// //   return (
// //       <button
// //         type="button"
// //         onClick={isActionable ? onAction : undefined}
// //         title={slot.remarks || (isPending ? `Scheduled: ${slot.scheduled_label}` : `Given: ${slot.actual_label}`)}
// //         style={{
// //           display: "block", width: "100%", textAlign: "center", marginBottom: "3px",
// //           padding: "3px 0", borderRadius: "3px", border: `1px solid ${c.border}`,
// //           background: c.bg, color: c.color, fontSize: "9px", fontWeight: 800,
// //           cursor: isActionable ? "pointer" : "default", overflow: "hidden",
// //         }}
// //       >
// //         {text}
// //       </button>
// //     );
// // };

// // // ─── Inline Administration Form ───────────────────────────────────────────────

// // const AdminForm: React.FC<{
// //   med: DueMedication;
// //   encounterNumber: string;
// //   onCancel: () => void;
// //   onSave: () => void;
// // }> = ({ med, encounterNumber, onCancel, onSave }) => {
// //   const rc = routeConfig(med.route);
// //   const { notify } = useNotification();
// //   const [submitting, setSubmitting] = useState(false);

// //   const [dose, setDose] = useState(med.dosage || "");
// //   const [administeredAt, setAdministeredAt] = useState(toInputDatetime(getLocalTimestamp()));
// //   const [volumeMl, setVolumeMl] = useState("");
// //   const [diluent, setDiluent] = useState("");
// //   const [rateMlHr, setRateMlHr] = useState("");
// //   const [flushMl, setFlushMl] = useState("");
// //   const [accessSite, setAccessSite] = useState("");
// //   const [batchNumber, setBatchNumber] = useState("");
// //   const [remarks, setRemarks] = useState("");

// //   const handleSubmit = async (e: React.FormEvent) => {
// //     e.preventDefault();
// //     if (!dose.trim()) { notify("Dose is required", "warning"); return; }
// //     if (!administeredAt) { notify("Administered at time is required", "warning"); return; }
// //     if (rc.showVolume && !volumeMl) { notify("Volume (ml) is required for this route", "warning"); return; }

// //     setSubmitting(true);
// //     try {
// //       const payload: any = {
// //         encounter_number: encounterNumber,
// //         prescription_id: med.prescription_id,
// //         drug_id: med.drug_id,
// //         dose,
// //         route: med.route,
// //         administered_at: fromInputDatetime(administeredAt),
// //         status: "given",
// //       };
// //       if (rc.showVolume && volumeMl)   payload.volume_ml = Number(volumeMl);
// //       if (rc.showDiluent && diluent)   payload.diluent = diluent;
// //       if (rc.showRate && rateMlHr)     payload.rate_ml_hr = Number(rateMlHr);
// //       if (rc.showFlush && flushMl)     payload.flush_ml = Number(flushMl);
// //       if (rc.showAccessSite && accessSite) payload.access_site = accessSite;
// //       if (rc.showBatch && batchNumber) payload.batch_number = batchNumber;
// //       if (remarks.trim())              payload.remarks = remarks.trim();

// //       await nursingService.administerMedication(payload);
// //       notify(`${med.drug_name} administered successfully`, "success");
// //       onSave();
// //     } catch (err: any) {
// //       notify(err.response?.data?.message || "Failed to record administration", "error");
// //     } finally {
// //       setSubmitting(false);
// //     }
// //   };

// //   return (
// //     <div style={{ margin: "0 0 0", background: rc.bg, border: `1px solid ${rc.color}30`, borderRadius: "10px", padding: "14px 16px" }}>
// //       <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "14px", color: rc.color, fontWeight: 800, fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
// //         <Plus size={13} /> Record Administration — <span style={{ opacity: 0.85 }}>{rc.label}</span>
// //       </div>

// //       <form onSubmit={handleSubmit}>
// //         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
// //           <div>
// //             <label style={lbl}>Dose <span style={{ color: "#e11d48" }}>*</span></label>
// //             <input type="text" value={dose} onChange={e => setDose(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 500mg" autoFocus />
// //           </div>
// //           <div>
// //             <label style={lbl}>Administered At <span style={{ color: "#e11d48" }}>*</span></label>
// //             <input type="datetime-local" value={administeredAt} onChange={e => setAdministeredAt(e.target.value)} style={inpSm(`${rc.color}60`)} />
// //           </div>
// //         </div>

// //         {(rc.showVolume || rc.showDiluent) && (
// //           <div style={{ display: "grid", gridTemplateColumns: rc.showVolume && rc.showDiluent ? "1fr 1fr" : "1fr", gap: "10px", marginBottom: "10px" }}>
// //             {rc.showVolume && (
// //               <div>
// //                 <label style={lbl}>Volume (ml) <span style={{ color: "#e11d48" }}>*</span></label>
// //                 <input type="number" step="any" min="0" value={volumeMl} onChange={e => setVolumeMl(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 100" />
// //               </div>
// //             )}
// //             {rc.showDiluent && (
// //               <div>
// //                 <label style={lbl}>Diluent</label>
// //                 <input type="text" value={diluent} onChange={e => setDiluent(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. Normal Saline" />
// //               </div>
// //             )}
// //           </div>
// //         )}

// //         {(rc.showRate || rc.showFlush) && (
// //           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
// //             {rc.showRate && (
// //               <div>
// //                 <label style={lbl}>Rate (ml/hr)</label>
// //                 <input type="number" min="1" value={rateMlHr} onChange={e => setRateMlHr(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 50" />
// //               </div>
// //             )}
// //             {rc.showFlush && (
// //               <div>
// //                 <label style={lbl}>Flush (ml)</label>
// //                 <input type="number" min="0" value={flushMl} onChange={e => setFlushMl(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 10" />
// //               </div>
// //             )}
// //           </div>
// //         )}

// //         {(rc.showAccessSite || rc.showBatch) && (
// //           <div style={{ display: "grid", gridTemplateColumns: rc.showAccessSite && rc.showBatch ? "1fr 1fr" : "1fr", gap: "10px", marginBottom: "10px" }}>
// //             {rc.showAccessSite && (
// //               <div>
// //                 <label style={lbl}>Access Site</label>
// //                 <input type="text" value={accessSite} onChange={e => setAccessSite(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. Right forearm" />
// //               </div>
// //             )}
// //             {rc.showBatch && (
// //               <div>
// //                 <label style={lbl}>Batch / Unit Number</label>
// //                 <input type="text" value={batchNumber} onChange={e => setBatchNumber(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. PRBC-20240524" />
// //               </div>
// //             )}
// //           </div>
// //         )}

// //         <div style={{ marginBottom: "12px" }}>
// //           <label style={lbl}>Remarks <span style={{ fontWeight: 400, color: "#aaa", textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
// //           <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} style={inpSm(`${rc.color}40`)} placeholder="e.g. Given slowly over 20 minutes" />
// //         </div>

// //         <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
// //           <button type="button" style={secBtn} onClick={onCancel}>Cancel</button>
// //           <button type="submit" disabled={submitting} style={primBtn(rc.color)}>
// //             {submitting ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle2 size={13} />}
// //             Mark as Given
// //           </button>
// //         </div>
// //       </form>
// //     </div>
// //   );
// // };

// // // ─── Due Medication Card ──────────────────────────────────────────────────────

// // const DueMedCard: React.FC<{
// //   med: DueMedication;
// //   encounterNumber: string;
// //   onSave: () => void;
// // }> = ({ med, encounterNumber, onSave }) => {
// //   const [showForm, setShowForm] = useState(false);
// //   const isDispensed = ["DISPENSED", "PARTIALLY_DISPENSED"].includes((med.dispense_status || "").toUpperCase());
// //   const rc = routeConfig(med.route);

// //   return (
// //     <div style={{
// //       background: "#fff",
// //       borderRadius: "12px",
// //       border: "1px solid #e0e4ef",
// //       boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
// //       borderLeft: `4px solid ${isDispensed ? rc.color : "#d1d5db"}`,
// //       opacity: isDispensed ? 1 : 0.75,
// //       marginBottom: "12px",
// //     }}>
// //       <div style={{ padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
// //         <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `${isDispensed ? rc.color : "#6b7280"}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
// //           <Pill size={18} color={isDispensed ? rc.color : "#6b7280"} />
// //         </div>

// //         <div style={{ flex: 1, minWidth: 0 }}>
// //           <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
// //             <span style={{ fontWeight: 800, fontSize: "18px", color: "#1c2b4a" }}>{med.drug_name}</span>
// //             <RouteBadge route={med.route} />
// //             <StatusBadge status={med.due_status} size="xs" />
// //             {!isDispensed && (
// //               <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#fef9c3", color: "#854d0e", fontSize: "12px", fontWeight: 800, padding: "3px 8px", borderRadius: "20px", border: "1px solid #fde047" }}>
// //                 <AlertTriangle size={9} /> Not Yet Dispensed
// //               </span>
// //             )}
// //           </div>

// //           <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "4px" }}>
// //             {[
// //               ["Dose", med.dosage],
// //               ["Frequency", med.frequency],
// //               ["Prescribed by", med.prescribed_by],
// //             ].map(([k, v]) => (
// //               <div key={k}>
// //                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
// //                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{v || "—"}</div>
// //               </div>
// //             ))}
// //             {med.prescribed_at && (
// //               <div>
// //                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Prescribed On</div>
// //                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{fmtDt(med.prescribed_at)}</div>
// //               </div>
// //             )}
// //             {med.last_administered_at && (
// //               <div>
// //                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Last Given</div>
// //                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{fmtDt(med.last_administered_at)}</div>
// //               </div>
// //             )}
// //           </div>

// //           {med.instructions && (
// //             <div style={{ marginTop: "6px", fontSize: "14px", color: "#6b7a9a", fontStyle: "italic" }}>
// //               ℹ {med.instructions}
// //             </div>
// //           )}
// //         </div>

// //         <button
// //           onClick={() => setShowForm(f => !f)}
// //           style={{
// //             display: "flex", alignItems: "center", gap: "4px",
// //             padding: "7px 14px", border: `1.5px solid ${rc.color}`,
// //             borderRadius: "8px", background: showForm ? rc.color : "#fff",
// //             color: showForm ? "#fff" : rc.color,
// //             fontSize: "14px", fontWeight: 800, cursor: "pointer",
// //             whiteSpace: "nowrap", transition: "all 0.15s", flexShrink: 0,
// //           }}
// //         >
// //           <CheckCircle2 size={12} />
// //           {showForm ? "Cancel" : "Give"}
// //         </button>
// //       </div>

// //       {showForm && (
// //         <div style={{ padding: "0 14px 14px" }}>
// //           <AdminForm
// //             med={med}
// //             encounterNumber={encounterNumber}
// //             onCancel={() => setShowForm(false)}
// //             onSave={() => { setShowForm(false); onSave(); }}
// //           />
// //         </div>
// //       )}
// //     </div>
// //   );
// // };

// // // ─── History Card ─────────────────────────────────────────────────────────────

// // const HistoryCard: React.FC<{ record: AdminHistory }> = ({ record }) => {
// //   const [expanded, setExpanded] = useState(false);
// //   const rc = routeConfig(record.route);

// //   return (
// //     <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e0e4ef", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", borderLeft: `3px solid ${rc.color}`, marginBottom: "10px" }}>
// //       <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
// //         <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: `${rc.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
// //           <Pill size={14} color={rc.color} />
// //         </div>

// //         <div style={{ flex: 1, minWidth: 0 }}>
// //           <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "2px" }}>
// //             <span style={{ fontWeight: 800, fontSize: "16px", color: "#1c2b4a" }}>{record.drug_name}</span>
// //             <RouteBadge route={record.route} />
// //             <StatusBadge status={record.status} size="xs" />
// //           </div>
// //           <div style={{ fontSize: "14px", color: "#6b7a9a" }}>
// //             <span style={{ fontWeight: 600, color: "#1c2b4a" }}>{record.dose}</span>
// //             {" · "}
// //             <Clock size={9} style={{ display: "inline", verticalAlign: "middle", marginRight: "2px" }} />
// //             {fmtDt(record.administered_at)}
// //             {" · by "}<span style={{ fontWeight: 600, color: "#1c2b4a" }}>{record.administered_by_name}</span>
// //           </div>
// //         </div>

// //         <button
// //           onClick={() => setExpanded(e => !e)}
// //           style={{ background: "none", border: "none", cursor: "pointer", color: "#8a94ad", padding: "4px", borderRadius: "6px", lineHeight: 1, flexShrink: 0 }}
// //         >
// //           {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
// //         </button>
// //       </div>

// //       {expanded && (
// //         <div style={{ padding: "0 14px 12px", background: "#f8f9fc", borderTop: "1px dashed #e0e4ef" }}>
// //           <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", paddingTop: "10px" }}>
// //             {([
// //               ["Prescribed Dose", record.dosage],
// //               ["Frequency", record.frequency],
// //               rc.showDiluent && ["Diluent", record.diluent],
// //               rc.showRate && ["Rate", record.rate_ml_hr ? `${record.rate_ml_hr} ml/hr` : null],
// //               rc.showAccessSite && ["Access Site", record.access_site],
// //               rc.showBatch && ["Batch No.", record.batch_number],
// //             ].filter(Boolean) as [string, string | null][]).map(([k, v]) => (
// //               <div key={k}>
// //                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
// //                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{v || "—"}</div>
// //               </div>
// //             ))}
// //           </div>
// //           {record.remarks && (
// //             <div style={{ marginTop: "8px", fontSize: "14px", color: "#6b7a9a", fontStyle: "italic" }}>
// //               "{record.remarks}"
// //             </div>
// //           )}
// //         </div>
// //       )}
// //     </div>
// //   );
// // };

// // // ─── Main MARPanel ────────────────────────────────────────────────────────────

// // const MARPanel: React.FC<MARPanelProps> = ({ encounterNumber, onClose }) => {
// //   const [activeTab, setActiveTab] = useState<"paperGrid" | "grid" | "due" | "history">("paperGrid");
  
// //   // Data States
// //   const [dueMeds, setDueMeds] = useState<DueMedication[]>([]);
// //   const [history, setHistory] = useState<AdminHistory[]>([]);
  
// //   // Separate states for Weekly vs Monthly grids
// //   const [weeklyHeaders, setWeeklyHeaders] = useState<MarGridHeader[]>([]);
// //   const [weeklyRows, setWeeklyRows] = useState<MarGridRow[]>([]);
  
// //   const [monthlyHeaders, setMonthlyHeaders] = useState<MarGridHeader[]>([]);
// //   const [monthlyRows, setMonthlyRows] = useState<MarGridRow[]>([]);
  
// //   // Loading States
// //   const [loadingDue, setLoadingDue] = useState(true);
// //   const [loadingHistory, setLoadingHistory] = useState(true);
// //   const [loadingWeeklyGrid, setLoadingWeeklyGrid] = useState(true);
// //   const [loadingMonthlyGrid, setLoadingMonthlyGrid] = useState(true);
  
// //   // Calendar State for Monthly Grid
// //   const today = new Date();
// //   const todayStr = getTodayDateString(); 
// //   const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
// //   const [currentYear, setCurrentYear] = useState(today.getFullYear());
// //   const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// //   // Shared Modal States
// //   const [activeSlot, setActiveSlot] = useState<{ row: MarGridRow; date: string; slot: MarGridSlot } | null>(null);
// //   const [viewSlotDetail, setViewSlotDetail] = useState<{ row: MarGridRow; date: string; slot: MarGridSlot } | null>(null);

// //   const handlePrevMonth = () => {
// //     if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(y => y - 1); }
// //     else { setCurrentMonth(m => m - 1); }
// //   };

// //   const handleNextMonth = () => {
// //     if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(y => y + 1); }
// //     else { setCurrentMonth(m => m + 1); }
// //   };

// //   const fetchDue = useCallback(async () => {
// //     setLoadingDue(true);
// //     try {
// //       const res = await nursingService.getMARDue(encounterNumber);
// //       setDueMeds(res.data || []);
// //     } catch {
// //       setDueMeds([]);
// //     } finally { setLoadingDue(false); }
// //   }, [encounterNumber]);

// //   const fetchHistory = useCallback(async () => {
// //     setLoadingHistory(true);
// //     try {
// //       const res = await nursingService.getMARHistory(encounterNumber);
// //       setHistory(res.data || []);
// //     } catch {
// //       setHistory([]);
// //     } finally { setLoadingHistory(false); }
// //   }, [encounterNumber]);

// //   const fetchWeeklyGrid = useCallback(async () => {
// //     setLoadingWeeklyGrid(true);
// //     try {
// //       const res = await nursingService.getMARDueHistory(encounterNumber);
// //       setWeeklyHeaders(res.data?.headers || []);
// //       setWeeklyRows(res.data?.rows || []);
// //     } catch {
// //       setWeeklyHeaders([]);
// //       setWeeklyRows([]);
// //     } finally { setLoadingWeeklyGrid(false); }
// //   }, [encounterNumber]);

// //   const fetchMonthlyGrid = useCallback(async () => {
// //     setLoadingMonthlyGrid(true);
// //     try {
// //       const fetchFn = (nursingService as any).getMARMonth; 
// //       let res;
// //       if (fetchFn) {
// //          res = await fetchFn(encounterNumber, currentMonth, currentYear);
// //       } else {
// //          console.warn("nursingService.getMARMonth not found! Falling back to getMARDueHistory");
// //          res = await nursingService.getMARDueHistory(encounterNumber);
// //       }
// //       setMonthlyHeaders(res?.data?.headers || []);
// //       setMonthlyRows(res?.data?.rows || []);
// //     } catch {
// //       setMonthlyHeaders([]);
// //       setMonthlyRows([]);
// //     } finally { setLoadingMonthlyGrid(false); }
// //   }, [encounterNumber, currentMonth, currentYear]);

// //   useEffect(() => {
// //     fetchDue();
// //     fetchHistory();
// //     fetchWeeklyGrid();
// //   }, [fetchDue, fetchHistory, fetchWeeklyGrid]);

// //   useEffect(() => {
// //     fetchMonthlyGrid();
// //   }, [fetchMonthlyGrid]);

// //   const handleAdminSave = () => {
// //     fetchDue();
// //     fetchHistory();
// //   };

// //   const handleGridAdminSave = () => {
// //     setActiveSlot(null);
// //     fetchDue();
// //     fetchHistory();
// //     fetchWeeklyGrid();
// //     fetchMonthlyGrid();
// //   };

// //   const TEAL = "#0d9488";
// //   const TEAL_DARK = "#0f766e";
// //   const ACTIVE_COL_BG = "#dcfce7"; 

// //   const tabBtn = (tab: "due" | "history" | "grid" | "paperGrid"): React.CSSProperties => ({
// //     flex: 1, padding: "9px 12px", border: "none", cursor: "pointer",
// //     fontSize: "15px", fontWeight: 800, display: "flex", alignItems: "center",
// //     justifyContent: "center", gap: "6px", transition: "all 0.15s",
// //     borderBottom: activeTab === tab ? `2px solid ${TEAL}` : "2px solid transparent",
// //     background: activeTab === tab ? "#f0fdfa" : "#f8f9fc",
// //     color: activeTab === tab ? TEAL_DARK : "#6b7a9a",
// //   });

// //   return (
// //     <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #d8dce8", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>

// //       {/* ── Panel header ── */}
// //       <div style={{ background: `linear-gradient(135deg, ${TEAL_DARK} 0%, ${TEAL} 100%)`, padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
// //         <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
// //           <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
// //             <ClipboardList size={16} color="#fff" />
// //           </div>
// //           <div>
// //             <div style={{ fontWeight: 900, fontSize: "16px", color: "#fff", letterSpacing: "0.3px" }}>Medication Administration Record</div>
// //             <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", marginTop: "1px" }}>MAR · {encounterNumber}</div>
// //           </div>
// //           {dueMeds.length > 0 && (
// //             <span style={{ background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: "13px", fontWeight: 800, padding: "3px 10px", borderRadius: "20px", marginLeft: "4px" }}>
// //               {dueMeds.length} scheduled
// //             </span>
// //           )}
// //         </div>
// //         {onClose && (
// //           <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "7px", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer" }}>
// //             <X size={16} />
// //           </button>
// //         )}
// //       </div>

// //       {/* ── Tabs ── */}
// //       <div style={{ display: "flex", borderBottom: "1px solid #e0e4ef", flexShrink: 0 }}>
// //         <button style={tabBtn("due")} onClick={() => setActiveTab("due")}>
// //           <Pill size={13} /> Scheduled Medications
// //           {!loadingDue && dueMeds.length > 0 && (
// //             <span style={{ background: TEAL, color: "#fff", borderRadius: "20px", fontSize: "12px", fontWeight: 900, padding: "1px 6px", marginLeft: "2px" }}>
// //               {dueMeds.length}
// //             </span>
// //           )}
// //         </button>
        
// //         <button style={tabBtn("history")} onClick={() => setActiveTab("history")}>
// //           <History size={13} /> Administration History
// //           {!loadingHistory && history.length > 0 && (
// //             <span style={{ background: "#6b7a9a", color: "#fff", borderRadius: "20px", fontSize: "12px", fontWeight: 900, padding: "1px 6px", marginLeft: "2px" }}>
// //               {history.length}
// //             </span>
// //           )}
// //         </button>
        
// //         <button style={tabBtn("paperGrid")} onClick={() => setActiveTab("paperGrid")}>
// //           <LayoutGrid size={13} /> Monthly MAR 
// //         </button>
// //         <button style={tabBtn("grid")} onClick={() => setActiveTab("grid")}>
// //           <LayoutGrid size={13} /> Weekly Chart
// //         </button>
// //       </div>

// //       {/* ── Tab Body ── */}
// //       <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px", flex: 1, overflowY: "auto" }}>

// //         {/* DUE TAB */}
// //         {activeTab === "due" && (
// //           <>
// //             {loadingDue ? (
// //               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a", fontSize: "16px" }}>
// //                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
// //                 Loading scheduled medications…
// //               </div>
// //             ) : dueMeds.length === 0 ? (
// //               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a" }}>
// //                 <CheckCircle2 size={32} color="#a7f3d0" />
// //                 <span style={{ fontSize: "16px", fontWeight: 700, color: "#0f766e" }}>No scheduled medications</span>
// //                 <span style={{ fontSize: "14px", color: "#8a94ad" }}>All scheduled medications have been administered or have expired.</span>
// //               </div>
// //             ) : (
// //               dueMeds.map(med => (
// //                 <DueMedCard
// //                   key={med.prescription_id}
// //                   med={med}
// //                   encounterNumber={encounterNumber}
// //                   onSave={handleAdminSave}
// //                 />
// //               ))
// //             )}
// //           </>
// //         )}

// //         {/* HISTORY TAB */}
// //         {activeTab === "history" && (
// //           <>
// //             {loadingHistory ? (
// //               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a", fontSize: "16px" }}>
// //                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
// //                 Loading history…
// //               </div>
// //             ) : history.length === 0 ? (
// //               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a" }}>
// //                 <History size={32} color="#d1d5db" />
// //                 <span style={{ fontSize: "16px", fontWeight: 700 }}>No administration history</span>
// //                 <span style={{ fontSize: "14px", color: "#8a94ad" }}>Administered medications will appear here</span>
// //               </div>
// //             ) : (
// //               <>
// //                 <div style={{ fontSize: "13px", fontWeight: 700, color: "#8a94ad", textTransform: "uppercase", letterSpacing: "0.6px", padding: "0 2px 4px" }}>
// //                   {history.length} record{history.length !== 1 ? "s" : ""} found
// //                 </div>
// //                 {[...history]
// //                   .sort((a, b) => new Date(b.administered_at.replace(" ", "T")).getTime() - new Date(a.administered_at.replace(" ", "T")).getTime())
// //                   .map(record => (
// //                     <HistoryCard key={record.id} record={record} />
// //                   ))
// //                 }
// //               </>
// //             )}
// //           </>
// //         )}

// //         {/* WEEKLY GRID TAB */}
// //         {activeTab === "grid" && (
// //           <>
// //             {loadingWeeklyGrid ? (
// //               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a", fontSize: "16px" }}>
// //                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
// //                 Loading weekly chart…
// //               </div>
// //             ) : weeklyRows.length === 0 ? (
// //               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a" }}>
// //                 <LayoutGrid size={32} color="#d1d5db" />
// //                 <span style={{ fontSize: "16px", fontWeight: 700 }}>No medications scheduled this week</span>
// //               </div>
// //             ) : (
// //               <div style={{ overflowX: "auto", border: "1px solid #e0e4ef", borderRadius: "10px" }}>
// //                 <table style={{ borderCollapse: "collapse", width: "100%", minWidth: `${200 + weeklyHeaders.length * 120}px` }}>
// //                   <thead>
// //                     <tr>
// //                       <th style={{
// //                         position: "sticky", left: 0, zIndex: 1, background: "#f8f9fc",
// //                         textAlign: "left", padding: "10px 14px", fontSize: "13px", fontWeight: 800,
// //                         color: "#6b7a9a", textTransform: "uppercase", letterSpacing: "0.5px",
// //                         borderBottom: "1px solid #e0e4ef", borderRight: "1px solid #e0e4ef",
// //                         minWidth: "200px",
// //                       }}>
// //                         Medication
// //                       </th>
// //                       {weeklyHeaders.map(h => (
// //                         <th key={h.date} style={{
// //                           padding: "10px 12px", fontSize: "13px", fontWeight: 800, color: "#6b7a9a",
// //                           textTransform: "uppercase", letterSpacing: "0.5px", background: h.date === todayStr ? ACTIVE_COL_BG : "#f8f9fc",
// //                           borderBottom: "1px solid #e0e4ef", borderLeft: "1px solid #eef1f7", minWidth: "120px",
// //                         }}>
// //                           <div style={{ color: h.date === todayStr ? "#166534" : "inherit" }}>{h.day_name}</div>
// //                           <div style={{ fontWeight: 600, color: h.date === todayStr ? "#16a34a" : "#8a94ad", marginTop: "2px" }}>{h.display}</div>
// //                         </th>
// //                       ))}
// //                     </tr>
// //                   </thead>
// //                   <tbody>
// //                     {weeklyRows.map(row => {
// //                       const isInactive = row.prescription_status === "STOPPED" || row.prescription_status === "CANCELLED";
// //                       return (
// //                         <tr key={row.prescription_id} style={{ opacity: isInactive ? 0.55 : 1 }}>
// //                           <td style={{
// //                             position: "sticky", left: 0, zIndex: 1, background: "#fff",
// //                             padding: "10px 14px", borderBottom: "1px solid #eef1f7", borderRight: "1px solid #e0e4ef",
// //                             verticalAlign: "top",
// //                           }}>
// //                             <div style={{ fontWeight: 800, fontSize: "15px", color: "#1c2b4a" }}>{row.drug_name}</div>
// //                             <div style={{ fontSize: "13px", color: "#6b7a9a", marginTop: "2px" }}>{row.dosage_info}</div>
// //                             <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
// //                               <span style={{ fontSize: "12px", color: "#8a94ad" }}>Start: {row.start_date}</span>
// //                               <StatusBadge status={row.prescription_status} size="xs" />
// //                             </div>
// //                           </td>
// //                           {weeklyHeaders.map(h => {
// //                             const slots = row.days[h.date] || [];
// //                             return (
// //                               <td key={h.date} style={{
// //                                 padding: "8px", verticalAlign: "top",
// //                                 borderBottom: "1px solid #eef1f7", borderLeft: "1px solid #eef1f7",
// //                                 background: h.date === todayStr ? ACTIVE_COL_BG : "#fff",
// //                               }}>
// //                                 {slots.length === 0 ? (
// //                                   <span style={{ fontSize: "14px", color: "#cbd5e1" }}>—</span>
// //                                 ) : (
// //                                   slots.map((slot, i) => (
// //                                     <SlotChip
// //                                       key={i}
// //                                       slot={slot}
// //                                       isInactive={isInactive}
// //                                       clickable={!isInactive}
// //                                       onAdminister={() => setActiveSlot({ row, date: h.date, slot })}
// //                                       onViewDetail={() => setViewSlotDetail({ row, date: h.date, slot })}
// //                                     />
// //                                   ))
// //                                 )}
// //                               </td>
// //                             );
// //                           })}
// //                         </tr>
// //                       );
// //                     })}
// //                   </tbody>
// //                 </table>
// //               </div>
// //             )}
// //           </>
// //         )}

// //         {/* MONTHLY MAR GRID TAB */}
// //         {activeTab === "paperGrid" && (
// //           <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            
// //             {/* Header controls for Monthly View */}
// //             <div style={{ marginBottom: "16px", border: "2px solid #1e293b", borderRadius: "8px", overflow: "hidden", flexShrink: 0 }}>
// //               <div style={{ background: "#f8fafc", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #1e293b" }}>
// //                 <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px" }}>
// //                   Personal Medication Administration Record (MAR)
// //                 </h2>
// //                 <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
// //                   <button onClick={handlePrevMonth} style={{ background: "none", border: "none", cursor: "pointer" }}><ChevronLeft size={20} /></button>
// //                   <span style={{ fontSize: "16px", fontWeight: 800, minWidth: "140px", textAlign: "center" }}>
// //                     {monthNames[currentMonth - 1]} {currentYear}
// //                   </span>
// //                   <button onClick={handleNextMonth} style={{ background: "none", border: "none", cursor: "pointer" }}><ChevronRight size={20} /></button>
// //                 </div>
// //               </div>
              
// //               <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", fontSize: "12px", background: "#fff" }}>
// //                 <div style={{ padding: "8px", borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1" }}>
// //                   <strong>PATIENT NAME:</strong> {encounterNumber}
// //                 </div>
// //                 <div style={{ padding: "8px", borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1" }}>
// //                   <strong>D.O.B.:</strong> —
// //                 </div>
// //                 <div style={{ padding: "8px", borderBottom: "1px solid #cbd5e1" }}>
// //                   <strong>ADDRESS:</strong> —
// //                 </div>
// //                 <div style={{ padding: "8px", borderRight: "1px solid #cbd5e1", gridColumn: "span 1" }}>
// //                   <strong>GP NAME:</strong> —
// //                 </div>
// //                 <div style={{ padding: "8px", gridColumn: "span 2" }}>
// //                   <strong>KNOWN ALLERGIES:</strong> <span style={{ color: "#ef4444", fontWeight: 800 }}>None Recorded</span>
// //                 </div>
// //               </div>
// //             </div>

// //             {loadingMonthlyGrid ? (
// //               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px", color: "#6b7a9a" }}>
// //                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
// //               </div>
// //             ) : monthlyRows.length === 0 ? (
// //               <div style={{ textAlign: "center", padding: "48px", color: "#6b7a9a", fontWeight: 700 }}>No medications scheduled this month</div>
// //             ) : (
// //               <div style={{ overflowX: "auto", border: "2px solid #1e293b", flex: 1 }}>
// //                 <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed", minWidth: `${250 + (monthlyHeaders.length * 38)}px` }}>
// //                   <thead>
// //                     <tr>
// //                       <th style={{ width: "250px", position: "sticky", left: 0, zIndex: 2, background: "#f8fafc", borderRight: "2px solid #1e293b", borderBottom: "2px solid #1e293b", padding: "8px", textAlign: "left", fontSize: "11px", textTransform: "uppercase" }}>
// //                         Medication<br/>
// //                         <span style={{ fontWeight: 400, color: "#64748b" }}>(Name, strength, dose, frequency, route)</span>
// //                       </th>
// //                       {monthlyHeaders.map(h => (
// //                         <th key={h.date} style={{ 
// //                           borderBottom: "2px solid #1e293b", borderRight: "1px solid #cbd5e1", 
// //                           background: h.date === todayStr ? ACTIVE_COL_BG : "#f8fafc", 
// //                           color: h.date === todayStr ? "#166534" : "inherit",
// //                           padding: "4px 0", width: "38px", textAlign: "center" 
// //                         }}>
// //                           <div style={{ fontSize: "9px", color: h.date === todayStr ? "#166534" : "#64748b" }}>{h.day_name}</div>
// //                           <div style={{ fontSize: "14px", fontWeight: 800 }}>{h.display}</div>
// //                         </th>
// //                       ))}
// //                     </tr>
// //                   </thead>
// //                   <tbody>
// //                     {monthlyRows.map(row => {
// //                       const isInactive = row.prescription_status === "STOPPED" || row.prescription_status === "CANCELLED";
// //                       return (
// //                         <tr key={row.prescription_id} style={{ opacity: isInactive ? 0.6 : 1, background: isInactive ? "#f1f5f9" : "#fff" }}>
                          
// //                           <td style={{ position: "sticky", left: 0, zIndex: 1, background: isInactive ? "#f1f5f9" : "#fff", borderRight: "2px solid #1e293b", borderBottom: "1px solid #cbd5e1", padding: "8px", verticalAlign: "top" }}>
// //                             <div style={{ fontWeight: 900, fontSize: "13px", color: "#0f172a" }}>{row.drug_name}</div>
// //                             <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px", fontWeight: 600 }}>{row.dosage_info}</div>
// //                             <div style={{ marginTop: "4px" }}>
// //                               <StatusBadge status={row.prescription_status} size="xs" />
// //                             </div>
// //                           </td>

// //                           {monthlyHeaders.map(h => {
// //                             const slots = row.days[h.date] || [];
// //                             const colBackground = h.date === todayStr ? ACTIVE_COL_BG : (isInactive ? "#f8fafc" : "#fff");
                            
// //                             return (
// //                               <td key={h.date} style={{ borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1", padding: "2px", verticalAlign: "top", background: colBackground }}>
// //                                 {slots.length === 0 ? null : (
// //                                   slots.map((slot, i) => (
// //                                     <CompactSlotChip
// //                                       key={i}
// //                                       slot={slot}
// //                                       isInactive={isInactive}
// //                                       clickable={!isInactive}
// //                                       onAction={() => {
// //                                         const isPending = (slot.status || "").toLowerCase() === "pending";
// //                                         if (isPending) setActiveSlot({ row, date: h.date, slot });
// //                                         else setViewSlotDetail({ row, date: h.date, slot });
// //                                       }}
// //                                     />
// //                                   ))
// //                                 )}
// //                               </td>
// //                             );
// //                           })}
// //                         </tr>
// //                       );
// //                     })}
// //                   </tbody>
// //                 </table>
// //               </div>
// //             )}
// //           </div>
// //         )}
// //       </div>


// //       {/* ── Shared Grid Slot Administer Modal ── */}
// //       {activeSlot && (
// //         <div
// //           style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "16px" }}
// //           onClick={() => setActiveSlot(null)}
// //         >
// //           <div style={{ width: "100%", maxWidth: "460px" }} onClick={e => e.stopPropagation()}>
// //             <AdminForm
// //               med={{
// //                 prescription_id: activeSlot.row.prescription_id,
// //                 drug_name: activeSlot.row.drug_name,
// //                 drug_id: activeSlot.row.drug_id, // Now coming direct from API
// //                 dosage: activeSlot.row.dosage,
// //                 frequency: activeSlot.row.frequency,
// //                 route: activeSlot.row.route,
// //                 instructions: activeSlot.row.instructions,
// //                 dispense_status: activeSlot.row.dispense_status,
// //                 prescribed_by: activeSlot.row.prescribed_by,
// //                 prescribed_at: activeSlot.row.prescribed_at,
// //                 last_admin_id: null,
// //                 last_admin_status: null,
// //                 last_administered_at: null,
// //                 last_administered_by: null,
// //                 last_administered_by_name: null,
// //                 due_status: activeSlot.row.due_status,
// //               }}
// //               encounterNumber={encounterNumber}
// //               onCancel={() => setActiveSlot(null)}
// //               onSave={handleGridAdminSave}
// //             />
// //           </div>
// //         </div>
// //       )}

// //       {/* ── Shared Grid Slot Administer Modal ── */}
// //       {/* {activeSlot && (
// //         <div
// //           style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "16px" }}
// //           onClick={() => setActiveSlot(null)}
// //         >
// //           <div style={{ width: "100%", maxWidth: "460px" }} onClick={e => e.stopPropagation()}>
// //             <AdminForm
// //               med={{
// //                 prescription_id: activeSlot.row.prescription_id,
// //                 drug_name: activeSlot.row.drug_name,
// //                 drug_id: dueMeds.find(d => d.prescription_id === activeSlot.row.prescription_id)?.drug_id,
// //                 ...parseDosageInfo(activeSlot.row.dosage_info),
// //                 instructions: null,
// //                 dispense_status: "DISPENSED",
// //                 prescribed_by: "",
// //                 prescribed_at: null,
// //                 last_admin_id: null,
// //                 last_admin_status: null,
// //                 last_administered_at: null,
// //                 last_administered_by: null,
// //                 last_administered_by_name: null,
// //                 due_status: activeSlot.row.due_status,
// //               }}
// //               encounterNumber={encounterNumber}
// //               onCancel={() => setActiveSlot(null)}
// //               onSave={handleGridAdminSave}
// //             />
// //           </div>
// //         </div>
// //       )} */}

// //       {/* ── Shared Grid Slot Detail (View) Modal ── */}
// //       {viewSlotDetail && (() => {
// //         const fullRecord = history.find(h => h.id === viewSlotDetail.slot.admin_id);
// //         const rc = routeConfig(fullRecord?.route || parseDosageInfo(viewSlotDetail.row.dosage_info).route);
// //         return (
// //           <div
// //             style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "16px" }}
// //             onClick={() => setViewSlotDetail(null)}
// //           >
// //             <div style={{ width: "100%", maxWidth: "460px", background: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
// //               <div style={{ background: rc.color, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", color: "#fff" }}>
// //                 <div>
// //                   <div style={{ fontSize: "16px", fontWeight: 800 }}>{viewSlotDetail.row.drug_name}</div>
// //                   <div style={{ fontSize: "13px", opacity: 0.85, marginTop: "2px" }}>
// //                     Scheduled {viewSlotDetail.slot.scheduled_label} · {fmtDt(viewSlotDetail.date)}
// //                   </div>
// //                 </div>
// //                 <button onClick={() => setViewSlotDetail(null)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "6px", width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer" }}>
// //                   <X size={16} />
// //                 </button>
// //               </div>
// //               <div style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
// //                 <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
// //                   <StatusBadge status={viewSlotDetail.slot.status} />
// //                   {fullRecord && <RouteBadge route={fullRecord.route} />}
// //                 </div>

// //                 {fullRecord ? (
// //                   <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
// //                     {([
// //                       ["Dose Given", fullRecord.dose],
// //                       ["Administered At", fmtDt(fullRecord.administered_at)],
// //                       ["Given By", fullRecord.administered_by_name],
// //                       rc.showDiluent && ["Diluent", fullRecord.diluent],
// //                       rc.showRate && ["Rate", fullRecord.rate_ml_hr ? `${fullRecord.rate_ml_hr} ml/hr` : null],
// //                       rc.showAccessSite && ["Access Site", fullRecord.access_site],
// //                       rc.showBatch && ["Batch No.", fullRecord.batch_number],
// //                     ].filter(Boolean) as [string, string | null][]).map(([k, v]) => (
// //                       <div key={k}>
// //                         <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
// //                         <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{v || "—"}</div>
// //                       </div>
// //                     ))}
// //                   </div>
// //                 ) : (
// //                   <div style={{ fontSize: "14px", color: "#6b7a9a" }}>
// //                     Recorded as <strong>{viewSlotDetail.slot.actual_label || viewSlotDetail.slot.status}</strong>.
// //                     {" "}Full administration details aren't available for this entry.
// //                   </div>
// //                 )}

// //                 {viewSlotDetail.slot.remarks && (
// //                   <div style={{ fontSize: "14px", color: "#6b7a9a", fontStyle: "italic" }}>
// //                     "{viewSlotDetail.slot.remarks}"
// //                   </div>
// //                 )}
// //               </div>
// //               <div style={{ padding: "14px 18px", borderTop: "1px solid #eef1f7", display: "flex", justifyContent: "flex-end" }}>
// //                 <button onClick={() => setViewSlotDetail(null)} style={secBtn}>Close</button>
// //               </div>
// //             </div>
// //           </div>
// //         );
// //       })()}
// //     </div>
// //   );
// // };

// // export default MARPanel;


// // import React, { useState, useEffect, useCallback } from "react";
// // import {
// //   X, Loader2, Clock, CheckCircle2, AlertTriangle, Pill,
// //   ClipboardList, History, ChevronDown, ChevronUp, Plus, LayoutGrid, ChevronLeft, ChevronRight
// // } from "lucide-react";
// // import { nursingService } from "../services/nursing.service";
// // import { useNotification } from "../context/NotificationContext";

// // // ─── Types ────────────────────────────────────────────────────────────────────

// // interface DueMedication {
// //   prescription_id: number;
// //   drug_name: string;
// //   drug_id?: number;
// //   dosage: string;
// //   frequency: string;
// //   route: string;
// //   instructions: string | null;
// //   dispense_status: string;
// //   prescribed_by: string;
// //   prescribed_at: string | null;
// //   last_admin_id: number | null;
// //   last_admin_status: string | null;
// //   last_administered_at: string | null;
// //   last_administered_by: string | null;
// //   last_administered_by_name: string | null;
// //   due_status: string;
// // }

// // interface AdminHistory {
// //   id: number;
// //   prescription_id: number;
// //   drug_id: number;
// //   drug_name: string;
// //   dosage: string;
// //   dose: string;
// //   route: string;
// //   frequency: string;
// //   diluent: string | null;
// //   rate_ml_hr: number | null;
// //   access_site: string | null;
// //   batch_number: string | null;
// //   administered_at: string;
// //   administered_by_name: string;
// //   status: string;
// //   remarks: string | null;
// // }

// // interface MarGridHeader {
// //   date: string;
// //   display: string;
// //   day_name: string;
// // }

// // interface MarGridSlot {
// //   status: string;
// //   scheduled_label: string;
// //   actual_label: string | null;
// //   admin_id: number | null;
// //   remarks: string | null;
// //   is_overdue: boolean;
// // }

// // interface MarGridRow {
// //   prescription_id: number;
// //   drug_name: string;
// //   dosage_info: string;
// //   start_date: string;
// //   prescription_status: string;
// //   due_status: string;
// //   days: Record<string, MarGridSlot[]>;
// // }

// // interface MARPanelProps {
// //   encounterNumber: string;
// //   onClose?: () => void;
// // }

// // // ─── Helpers ──────────────────────────────────────────────────────────────────

// // const getLocalTimestamp = (date: Date = new Date()): string => {
// //   const pad = (n: number) => n.toString().padStart(2, "0");
// //   return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
// // };

// // const getTodayDateString = (): string => {
// //   const date = new Date();
// //   const pad = (n: number) => n.toString().padStart(2, "0");
// //   return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
// // };

// // const toInputDatetime = (dt: string): string => {
// //   if (!dt) return "";
// //   return dt.replace(" ", "T").slice(0, 16);
// // };

// // const fromInputDatetime = (val: string): string => {
// //   if (!val) return "";
// //   return val.replace("T", " ") + ":00";
// // };

// // const fmtDt = (dt: string) => {
// //   if (!dt) return "—";
// //   try {
// //     return new Date(dt.replace(" ", "T")).toLocaleString("en-GB", {
// //       day: "2-digit", month: "2-digit", year: "2-digit",
// //       hour: "2-digit", minute: "2-digit",
// //     });
// //   } catch { return dt; }
// // };

// // const parseDosageInfo = (info: string): { dosage: string; frequency: string; route: string } => {
// //   const routeMatch = info.match(/\(([^)]+)\)\s*$/);
// //   const route = routeMatch ? routeMatch[1] : "";
// //   const withoutRoute = info.replace(/\([^)]+\)\s*$/, "").trim();
// //   const [dosage = "", frequency = ""] = withoutRoute.split(" - ").map(s => s.trim());
// //   return { dosage, frequency, route };
// // };

// // const routeConfig = (route: string): {
// //   showVolume: boolean; showDiluent: boolean; showRate: boolean;
// //   showFlush: boolean; showAccessSite: boolean; showBatch: boolean;
// //   label: string; color: string; bg: string;
// // } => {
// //   const r = (route || "").toUpperCase();
// //   if (r === "IV")      return { showVolume: true,  showDiluent: true,  showRate: true,  showFlush: true,  showAccessSite: true,  showBatch: false, label: "IV Infusion",     color: "#1d4ed8", bg: "#eff6ff" };
// //   if (r === "SC" || r === "IM") return { showVolume: true,  showDiluent: false, showRate: false, showFlush: false, showAccessSite: true,  showBatch: false, label: r + " Injection",  color: "#7c3aed", bg: "#f5f3ff" };
// //   if (r === "PO" || r === "SL") return { showVolume: false, showDiluent: false, showRate: false, showFlush: false, showAccessSite: false, showBatch: false, label: "Oral",            color: "#0f766e", bg: "#f0fdfa" };
// //   if (r === "BLOOD")  return { showVolume: true,  showDiluent: false, showRate: false, showFlush: false, showAccessSite: true,  showBatch: true,  label: "Blood Product",   color: "#b91c1c", bg: "#fef2f2" };
// //   if (r === "NG" || r === "PEG") return { showVolume: true, showDiluent: false, showRate: false, showFlush: false, showAccessSite: false, showBatch: false, label: "NG/PEG Feed",    color: "#b45309", bg: "#fefce8" };
// //   return { showVolume: true, showDiluent: true, showRate: false, showFlush: false, showAccessSite: false, showBatch: false, label: route, color: "#1c3d7a", bg: "#f8f9fc" };
// // };

// // // ─── Shared Styles ────────────────────────────────────────────────────────────

// // const lbl: React.CSSProperties = {
// //   display: "block", fontSize: "13px", fontWeight: 700, color: "#6b7a9a",
// //   textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "5px",
// // };
// // const inp: React.CSSProperties = {
// //   width: "100%", padding: "9px 12px", border: "1px solid #d0d6e6",
// //   borderRadius: "9px", fontSize: "16px", fontWeight: 500, color: "#1c2b4a",
// //   background: "#f8f9fc", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
// // };
// // const inpSm = (borderColor: string): React.CSSProperties => ({
// //   ...inp, background: "#fff", border: `1px solid ${borderColor}`,
// //   padding: "8px 10px", fontSize: "15px", borderRadius: "8px",
// // });
// // const secBtn: React.CSSProperties = {
// //   flex: "0 0 auto", padding: "8px 16px", border: "1px solid #d0d6e6",
// //   borderRadius: "9px", fontSize: "15px", fontWeight: 700, color: "#4a5568",
// //   background: "#fff", cursor: "pointer", whiteSpace: "nowrap",
// // };
// // const primBtn = (bg: string): React.CSSProperties => ({
// //   flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center",
// //   gap: "6px", padding: "8px 18px", border: "none", borderRadius: "9px",
// //   fontSize: "15px", fontWeight: 700, color: "#fff", background: bg, cursor: "pointer",
// //   whiteSpace: "nowrap",
// // });

// // // ─── Status badge ─────────────────────────────────────────────────────────────

// // const StatusBadge: React.FC<{ status: string; size?: "sm" | "xs" }> = ({ status, size = "sm" }) => {
// //   const s = (status || "").toUpperCase();
// //   const map: Record<string, { bg: string; color: string; dot: string }> = {
// //     GIVEN:      { bg: "#dcfce7", color: "#166534", dot: "#16a34a" },
// //     HELD:       { bg: "#fef9c3", color: "#854d0e", dot: "#ca8a04" },
// //     REFUSED:    { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626" },
// //     OMITTED:    { bg: "#f3f4f6", color: "#374151", dot: "#9ca3af" },
// //     DISPENSED:  { bg: "#dcfce7", color: "#166534", dot: "#16a34a" },
// //     PENDING:    { bg: "#fef9c3", color: "#854d0e", dot: "#ca8a04" },
// //     DUE:        { bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
// //     OVERDUE:    { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626" },
// //     STOPPED:    { bg: "#f1f5f9", color: "#64748b", dot: "#94a3b8" },
// //     CANCELLED:  { bg: "#f1f5f9", color: "#64748b", dot: "#94a3b8" },
// //   };
// //   const cfg = map[s] || { bg: "#f3f4f6", color: "#374151", dot: "#9ca3af" };
// //   const fs = size === "xs" ? "12px" : "13px";
// //   return (
// //     <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: cfg.bg, color: cfg.color, fontSize: fs, fontWeight: 800, textTransform: "uppercase", padding: "3px 8px", borderRadius: "20px", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>
// //       <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: cfg.dot, display: "inline-block", flexShrink: 0 }} />
// //       {status}
// //     </span>
// //   );
// // };

// // const RouteBadge: React.FC<{ route: string }> = ({ route }) => (
// //   <span style={{ display: "inline-block", background: "#ccfbf1", color: "#0f766e", fontSize: "12px", fontWeight: 800, textTransform: "uppercase", padding: "3px 8px", borderRadius: "20px", letterSpacing: "0.5px" }}>
// //     {route}
// //   </span>
// // );

// // // ─── Grid slot colors ────────────────────────────────────────────────────────

// // const slotColors = (slot: MarGridSlot, isInactive: boolean): { bg: string; color: string; border: string } => {
// //   if (isInactive) return { bg: "#f8fafc", color: "#94a3b8", border: "#e2e8f0" };
// //   const s = (slot.status || "").toLowerCase();
  
// //   if (s === "given" || s === "administered") return { bg: "#dcfce7", color: "#166534", border: "#86efac" };
// //   if (s === "missed" || s === "refused" || s === "omitted" || slot.is_overdue) return { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" };
// //   if (s === "held") return { bg: "#fef9c3", color: "#854d0e", border: "#fde047" };
  
// //   return { bg: "#ffffff", color: "#475569", border: "#cbd5e1" };
// // };

// // // ─── Weekly Grid Chip (Wider) ────────────────────────────────────────────────
// // const SlotChip: React.FC<{ slot: MarGridSlot; isInactive: boolean; clickable: boolean; onAdminister: () => void; onViewDetail: () => void }> = ({ slot, isInactive, clickable, onAdminister, onViewDetail }) => {
// //   const c = slotColors(slot, isInactive);
// //   const isPending = (slot.status || "").toLowerCase() === "pending";
// //   const hasDetail = !isPending && (slot.admin_id != null || !!slot.actual_label || !!slot.remarks);
// //   const isActionable = (isPending && clickable) || hasDetail;
// //   return (
// //     <button
// //       type="button"
// //       onClick={isActionable ? (isPending ? onAdminister : onViewDetail) : undefined}
// //       title={slot.remarks || undefined}
// //       style={{
// //         display: "block", width: "100%", textAlign: "left", marginBottom: "4px",
// //         padding: "4px 7px", borderRadius: "6px", border: `1px solid ${c.border}`,
// //         background: c.bg, color: c.color, fontSize: "13px", fontWeight: 800,
// //         cursor: isActionable ? "pointer" : "default", whiteSpace: "nowrap",
// //       }}
// //     >
// //       {slot.actual_label || slot.scheduled_label}
// //     </button>
// //   );
// // };

// // // ─── Monthly Grid Chip (Extra Compact 1-31 Days) ──────────────────────────────
// // const CompactSlotChip: React.FC<{ slot: MarGridSlot; isInactive: boolean; clickable: boolean; onAction: () => void; }> = ({ slot, isInactive, clickable, onAction }) => {
// //   const c = slotColors(slot, isInactive);
// //   const isPending = (slot.status || "").toLowerCase() === "pending";
// //   const hasDetail = !isPending && (slot.admin_id != null || !!slot.actual_label || !!slot.remarks);
// //   const isActionable = (isPending && clickable) || hasDetail;
  
// //   // Format the label neatly for the tiny box
// //   let text = slot.actual_label || slot.scheduled_label || "PRN";
// //   text = text.replace("S - ", "").replace("A - ", "").replace(" AM","").replace(" PM","");

// //   return (
// //       <button
// //         type="button"
// //         onClick={isActionable ? onAction : undefined}
// //         title={slot.remarks || (isPending ? `Scheduled: ${slot.scheduled_label}` : `Given: ${slot.actual_label}`)}
// //         style={{
// //           display: "block", width: "100%", textAlign: "center", marginBottom: "3px",
// //           padding: "3px 0", borderRadius: "3px", border: `1px solid ${c.border}`,
// //           background: c.bg, color: c.color, fontSize: "9px", fontWeight: 800,
// //           cursor: isActionable ? "pointer" : "default", overflow: "hidden",
// //         }}
// //       >
// //         {text}
// //       </button>
// //     );
// // };

// // // ─── Inline Administration Form ───────────────────────────────────────────────

// // const AdminForm: React.FC<{
// //   med: DueMedication;
// //   encounterNumber: string;
// //   onCancel: () => void;
// //   onSave: () => void;
// // }> = ({ med, encounterNumber, onCancel, onSave }) => {
// //   const rc = routeConfig(med.route);
// //   const { notify } = useNotification();
// //   const [submitting, setSubmitting] = useState(false);

// //   const [dose, setDose] = useState(med.dosage || "");
// //   const [administeredAt, setAdministeredAt] = useState(toInputDatetime(getLocalTimestamp()));
// //   const [volumeMl, setVolumeMl] = useState("");
// //   const [diluent, setDiluent] = useState("");
// //   const [rateMlHr, setRateMlHr] = useState("");
// //   const [flushMl, setFlushMl] = useState("");
// //   const [accessSite, setAccessSite] = useState("");
// //   const [batchNumber, setBatchNumber] = useState("");
// //   const [remarks, setRemarks] = useState("");

// //   const handleSubmit = async (e: React.FormEvent) => {
// //     e.preventDefault();
// //     if (!dose.trim()) { notify("Dose is required", "warning"); return; }
// //     if (!administeredAt) { notify("Administered at time is required", "warning"); return; }
// //     if (rc.showVolume && !volumeMl) { notify("Volume (ml) is required for this route", "warning"); return; }

// //     setSubmitting(true);
// //     try {
// //       const payload: any = {
// //         encounter_number: encounterNumber,
// //         prescription_id: med.prescription_id,
// //         drug_id: med.drug_id,
// //         dose,
// //         route: med.route,
// //         administered_at: fromInputDatetime(administeredAt),
// //         status: "given",
// //       };
// //       if (rc.showVolume && volumeMl)   payload.volume_ml = Number(volumeMl);
// //       if (rc.showDiluent && diluent)   payload.diluent = diluent;
// //       if (rc.showRate && rateMlHr)     payload.rate_ml_hr = Number(rateMlHr);
// //       if (rc.showFlush && flushMl)     payload.flush_ml = Number(flushMl);
// //       if (rc.showAccessSite && accessSite) payload.access_site = accessSite;
// //       if (rc.showBatch && batchNumber) payload.batch_number = batchNumber;
// //       if (remarks.trim())              payload.remarks = remarks.trim();

// //       await nursingService.administerMedication(payload);
// //       notify(`${med.drug_name} administered successfully`, "success");
// //       onSave();
// //     } catch (err: any) {
// //       notify(err.response?.data?.message || "Failed to record administration", "error");
// //     } finally {
// //       setSubmitting(false);
// //     }
// //   };

// //   return (
// //     <div style={{ margin: "0 0 0", background: rc.bg, border: `1px solid ${rc.color}30`, borderRadius: "10px", padding: "14px 16px" }}>
// //       <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "14px", color: rc.color, fontWeight: 800, fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
// //         <Plus size={13} /> Record Administration — <span style={{ opacity: 0.85 }}>{rc.label}</span>
// //       </div>

// //       <form onSubmit={handleSubmit}>
// //         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
// //           <div>
// //             <label style={lbl}>Dose <span style={{ color: "#e11d48" }}>*</span></label>
// //             <input type="text" value={dose} onChange={e => setDose(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 500mg" autoFocus />
// //           </div>
// //           <div>
// //             <label style={lbl}>Administered At <span style={{ color: "#e11d48" }}>*</span></label>
// //             <input type="datetime-local" value={administeredAt} onChange={e => setAdministeredAt(e.target.value)} style={inpSm(`${rc.color}60`)} />
// //           </div>
// //         </div>

// //         {(rc.showVolume || rc.showDiluent) && (
// //           <div style={{ display: "grid", gridTemplateColumns: rc.showVolume && rc.showDiluent ? "1fr 1fr" : "1fr", gap: "10px", marginBottom: "10px" }}>
// //             {rc.showVolume && (
// //               <div>
// //                 <label style={lbl}>Volume (ml) <span style={{ color: "#e11d48" }}>*</span></label>
// //                 <input type="number" step="any" min="0" value={volumeMl} onChange={e => setVolumeMl(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 100" />
// //               </div>
// //             )}
// //             {rc.showDiluent && (
// //               <div>
// //                 <label style={lbl}>Diluent</label>
// //                 <input type="text" value={diluent} onChange={e => setDiluent(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. Normal Saline" />
// //               </div>
// //             )}
// //           </div>
// //         )}

// //         {(rc.showRate || rc.showFlush) && (
// //           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
// //             {rc.showRate && (
// //               <div>
// //                 <label style={lbl}>Rate (ml/hr)</label>
// //                 <input type="number" min="1" value={rateMlHr} onChange={e => setRateMlHr(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 50" />
// //               </div>
// //             )}
// //             {rc.showFlush && (
// //               <div>
// //                 <label style={lbl}>Flush (ml)</label>
// //                 <input type="number" min="0" value={flushMl} onChange={e => setFlushMl(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 10" />
// //               </div>
// //             )}
// //           </div>
// //         )}

// //         {(rc.showAccessSite || rc.showBatch) && (
// //           <div style={{ display: "grid", gridTemplateColumns: rc.showAccessSite && rc.showBatch ? "1fr 1fr" : "1fr", gap: "10px", marginBottom: "10px" }}>
// //             {rc.showAccessSite && (
// //               <div>
// //                 <label style={lbl}>Access Site</label>
// //                 <input type="text" value={accessSite} onChange={e => setAccessSite(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. Right forearm" />
// //               </div>
// //             )}
// //             {rc.showBatch && (
// //               <div>
// //                 <label style={lbl}>Batch / Unit Number</label>
// //                 <input type="text" value={batchNumber} onChange={e => setBatchNumber(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. PRBC-20240524" />
// //               </div>
// //             )}
// //           </div>
// //         )}

// //         <div style={{ marginBottom: "12px" }}>
// //           <label style={lbl}>Remarks <span style={{ fontWeight: 400, color: "#aaa", textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
// //           <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} style={inpSm(`${rc.color}40`)} placeholder="e.g. Given slowly over 20 minutes" />
// //         </div>

// //         <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
// //           <button type="button" style={secBtn} onClick={onCancel}>Cancel</button>
// //           <button type="submit" disabled={submitting} style={primBtn(rc.color)}>
// //             {submitting ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle2 size={13} />}
// //             Mark as Given
// //           </button>
// //         </div>
// //       </form>
// //     </div>
// //   );
// // };

// // // ─── Due Medication Card ──────────────────────────────────────────────────────

// // const DueMedCard: React.FC<{
// //   med: DueMedication;
// //   encounterNumber: string;
// //   onSave: () => void;
// // }> = ({ med, encounterNumber, onSave }) => {
// //   const [showForm, setShowForm] = useState(false);
// //   const isDispensed = (med.dispense_status || "").toUpperCase() === "DISPENSED";
// //   const rc = routeConfig(med.route);

// //   return (
// //     <div style={{
// //       background: "#fff",
// //       borderRadius: "12px",
// //       border: "1px solid #e0e4ef",
// //       boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
// //       borderLeft: `4px solid ${isDispensed ? rc.color : "#d1d5db"}`,
// //       opacity: isDispensed ? 1 : 0.75,
// //       marginBottom: "12px",
// //     }}>
// //       <div style={{ padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
// //         <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `${isDispensed ? rc.color : "#6b7280"}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
// //           <Pill size={18} color={isDispensed ? rc.color : "#6b7280"} />
// //         </div>

// //         <div style={{ flex: 1, minWidth: 0 }}>
// //           <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
// //             <span style={{ fontWeight: 800, fontSize: "18px", color: "#1c2b4a" }}>{med.drug_name}</span>
// //             <RouteBadge route={med.route} />
// //             <StatusBadge status={med.due_status} size="xs" />
// //             {!isDispensed && (
// //               <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#fef9c3", color: "#854d0e", fontSize: "12px", fontWeight: 800, padding: "3px 8px", borderRadius: "20px", border: "1px solid #fde047" }}>
// //                 <AlertTriangle size={9} /> Not Yet Dispensed
// //               </span>
// //             )}
// //           </div>

// //           <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "4px" }}>
// //             {[
// //               ["Dose", med.dosage],
// //               ["Frequency", med.frequency],
// //               ["Prescribed by", med.prescribed_by],
// //             ].map(([k, v]) => (
// //               <div key={k}>
// //                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
// //                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{v || "—"}</div>
// //               </div>
// //             ))}
// //             {med.prescribed_at && (
// //               <div>
// //                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Prescribed On</div>
// //                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{fmtDt(med.prescribed_at)}</div>
// //               </div>
// //             )}
// //             {med.last_administered_at && (
// //               <div>
// //                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Last Given</div>
// //                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{fmtDt(med.last_administered_at)}</div>
// //               </div>
// //             )}
// //           </div>

// //           {med.instructions && (
// //             <div style={{ marginTop: "6px", fontSize: "14px", color: "#6b7a9a", fontStyle: "italic" }}>
// //               ℹ {med.instructions}
// //             </div>
// //           )}
// //         </div>

// //         {isDispensed && (
// //           <button
// //             onClick={() => setShowForm(f => !f)}
// //             style={{
// //               display: "flex", alignItems: "center", gap: "4px",
// //               padding: "7px 14px", border: `1.5px solid ${rc.color}`,
// //               borderRadius: "8px", background: showForm ? rc.color : "#fff",
// //               color: showForm ? "#fff" : rc.color,
// //               fontSize: "14px", fontWeight: 800, cursor: "pointer",
// //               whiteSpace: "nowrap", transition: "all 0.15s", flexShrink: 0,
// //             }}
// //           >
// //             <CheckCircle2 size={12} />
// //             {showForm ? "Cancel" : "Give"}
// //           </button>
// //         )}
// //       </div>

// //       {showForm && isDispensed && (
// //         <div style={{ padding: "0 14px 14px" }}>
// //           <AdminForm
// //             med={med}
// //             encounterNumber={encounterNumber}
// //             onCancel={() => setShowForm(false)}
// //             onSave={() => { setShowForm(false); onSave(); }}
// //           />
// //         </div>
// //       )}
// //     </div>
// //   );
// // };

// // // ─── History Card ─────────────────────────────────────────────────────────────

// // const HistoryCard: React.FC<{ record: AdminHistory }> = ({ record }) => {
// //   const [expanded, setExpanded] = useState(false);
// //   const rc = routeConfig(record.route);

// //   return (
// //     <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e0e4ef", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", borderLeft: `3px solid ${rc.color}`, marginBottom: "10px" }}>
// //       <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
// //         <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: `${rc.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
// //           <Pill size={14} color={rc.color} />
// //         </div>

// //         <div style={{ flex: 1, minWidth: 0 }}>
// //           <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "2px" }}>
// //             <span style={{ fontWeight: 800, fontSize: "16px", color: "#1c2b4a" }}>{record.drug_name}</span>
// //             <RouteBadge route={record.route} />
// //             <StatusBadge status={record.status} size="xs" />
// //           </div>
// //           <div style={{ fontSize: "14px", color: "#6b7a9a" }}>
// //             <span style={{ fontWeight: 600, color: "#1c2b4a" }}>{record.dose}</span>
// //             {" · "}
// //             <Clock size={9} style={{ display: "inline", verticalAlign: "middle", marginRight: "2px" }} />
// //             {fmtDt(record.administered_at)}
// //             {" · by "}<span style={{ fontWeight: 600, color: "#1c2b4a" }}>{record.administered_by_name}</span>
// //           </div>
// //         </div>

// //         <button
// //           onClick={() => setExpanded(e => !e)}
// //           style={{ background: "none", border: "none", cursor: "pointer", color: "#8a94ad", padding: "4px", borderRadius: "6px", lineHeight: 1, flexShrink: 0 }}
// //         >
// //           {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
// //         </button>
// //       </div>

// //       {expanded && (
// //         <div style={{ padding: "0 14px 12px", background: "#f8f9fc", borderTop: "1px dashed #e0e4ef" }}>
// //           <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", paddingTop: "10px" }}>
// //             {([
// //               ["Prescribed Dose", record.dosage],
// //               ["Frequency", record.frequency],
// //               rc.showDiluent && ["Diluent", record.diluent],
// //               rc.showRate && ["Rate", record.rate_ml_hr ? `${record.rate_ml_hr} ml/hr` : null],
// //               rc.showAccessSite && ["Access Site", record.access_site],
// //               rc.showBatch && ["Batch No.", record.batch_number],
// //             ].filter(Boolean) as [string, string | null][]).map(([k, v]) => (
// //               <div key={k}>
// //                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
// //                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{v || "—"}</div>
// //               </div>
// //             ))}
// //           </div>
// //           {record.remarks && (
// //             <div style={{ marginTop: "8px", fontSize: "14px", color: "#6b7a9a", fontStyle: "italic" }}>
// //               "{record.remarks}"
// //             </div>
// //           )}
// //         </div>
// //       )}
// //     </div>
// //   );
// // };

// // // ─── Main MARPanel ────────────────────────────────────────────────────────────

// // const MARPanel: React.FC<MARPanelProps> = ({ encounterNumber, onClose }) => {
// //   const [activeTab, setActiveTab] = useState<"paperGrid" | "grid" | "due" | "history">("paperGrid");
  
// //   // Data States
// //   const [dueMeds, setDueMeds] = useState<DueMedication[]>([]);
// //   const [history, setHistory] = useState<AdminHistory[]>([]);
  
// //   // Separate states for Weekly vs Monthly grids
// //   const [weeklyHeaders, setWeeklyHeaders] = useState<MarGridHeader[]>([]);
// //   const [weeklyRows, setWeeklyRows] = useState<MarGridRow[]>([]);
  
// //   const [monthlyHeaders, setMonthlyHeaders] = useState<MarGridHeader[]>([]);
// //   const [monthlyRows, setMonthlyRows] = useState<MarGridRow[]>([]);
  
// //   // Loading States
// //   const [loadingDue, setLoadingDue] = useState(true);
// //   const [loadingHistory, setLoadingHistory] = useState(true);
// //   const [loadingWeeklyGrid, setLoadingWeeklyGrid] = useState(true);
// //   const [loadingMonthlyGrid, setLoadingMonthlyGrid] = useState(true);
  
// //   // Calendar State for Monthly Grid
// //   const today = new Date();
// //   const todayStr = getTodayDateString(); 
// //   const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
// //   const [currentYear, setCurrentYear] = useState(today.getFullYear());
// //   const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// //   // Shared Modal States
// //   const [activeSlot, setActiveSlot] = useState<{ row: MarGridRow; date: string; slot: MarGridSlot } | null>(null);
// //   const [viewSlotDetail, setViewSlotDetail] = useState<{ row: MarGridRow; date: string; slot: MarGridSlot } | null>(null);

// //   const handlePrevMonth = () => {
// //     if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(y => y - 1); }
// //     else { setCurrentMonth(m => m - 1); }
// //   };

// //   const handleNextMonth = () => {
// //     if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(y => y + 1); }
// //     else { setCurrentMonth(m => m + 1); }
// //   };

// //   const fetchDue = useCallback(async () => {
// //     setLoadingDue(true);
// //     try {
// //       const res = await nursingService.getMARDue(encounterNumber);
// //       setDueMeds(res.data || []);
// //     } catch {
// //       setDueMeds([]);
// //     } finally { setLoadingDue(false); }
// //   }, [encounterNumber]);

// //   const fetchHistory = useCallback(async () => {
// //     setLoadingHistory(true);
// //     try {
// //       const res = await nursingService.getMARHistory(encounterNumber);
// //       setHistory(res.data || []);
// //     } catch {
// //       setHistory([]);
// //     } finally { setLoadingHistory(false); }
// //   }, [encounterNumber]);

// //   const fetchWeeklyGrid = useCallback(async () => {
// //     setLoadingWeeklyGrid(true);
// //     try {
// //       const res = await nursingService.getMARDueHistory(encounterNumber);
// //       setWeeklyHeaders(res.data?.headers || []);
// //       setWeeklyRows(res.data?.rows || []);
// //     } catch {
// //       setWeeklyHeaders([]);
// //       setWeeklyRows([]);
// //     } finally { setLoadingWeeklyGrid(false); }
// //   }, [encounterNumber]);

// //   const fetchMonthlyGrid = useCallback(async () => {
// //     setLoadingMonthlyGrid(true);
// //     try {
// //       // Expected method added to nursingService
// //       const fetchFn = (nursingService as any).getMARMonth; 
// //       let res;
// //       if (fetchFn) {
// //          res = await fetchFn(encounterNumber, currentMonth, currentYear);
// //       } else {
// //          console.warn("nursingService.getMARMonth not found! Falling back to getMARDueHistory");
// //          res = await nursingService.getMARDueHistory(encounterNumber);
// //       }
// //       setMonthlyHeaders(res?.data?.headers || []);
// //       setMonthlyRows(res?.data?.rows || []);
// //     } catch {
// //       setMonthlyHeaders([]);
// //       setMonthlyRows([]);
// //     } finally { setLoadingMonthlyGrid(false); }
// //   }, [encounterNumber, currentMonth, currentYear]);

// //   useEffect(() => {
// //     fetchDue();
// //     fetchHistory();
// //     fetchWeeklyGrid();
// //   }, [fetchDue, fetchHistory, fetchWeeklyGrid]);

// //   useEffect(() => {
// //     fetchMonthlyGrid();
// //   }, [fetchMonthlyGrid]);

// //   const handleAdminSave = () => {
// //     fetchDue();
// //     fetchHistory();
// //   };

// //   const handleGridAdminSave = () => {
// //     setActiveSlot(null);
// //     fetchDue();
// //     fetchHistory();
// //     fetchWeeklyGrid();
// //     fetchMonthlyGrid();
// //   };

// //   const TEAL = "#0d9488";
// //   const TEAL_DARK = "#0f766e";
// //   const ACTIVE_COL_BG = "#dcfce7"; // Soft green highlight for current day

// //   const tabBtn = (tab: "due" | "history" | "grid" | "paperGrid"): React.CSSProperties => ({
// //     flex: 1, padding: "9px 12px", border: "none", cursor: "pointer",
// //     fontSize: "15px", fontWeight: 800, display: "flex", alignItems: "center",
// //     justifyContent: "center", gap: "6px", transition: "all 0.15s",
// //     borderBottom: activeTab === tab ? `2px solid ${TEAL}` : "2px solid transparent",
// //     background: activeTab === tab ? "#f0fdfa" : "#f8f9fc",
// //     color: activeTab === tab ? TEAL_DARK : "#6b7a9a",
// //   });

// //   return (
// //     <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #d8dce8", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>

// //       {/* ── Panel header ── */}
// //       <div style={{ background: `linear-gradient(135deg, ${TEAL_DARK} 0%, ${TEAL} 100%)`, padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
// //         <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
// //           <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
// //             <ClipboardList size={16} color="#fff" />
// //           </div>
// //           <div>
// //             <div style={{ fontWeight: 900, fontSize: "16px", color: "#fff", letterSpacing: "0.3px" }}>Medication Administration Record</div>
// //             <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", marginTop: "1px" }}>MAR · {encounterNumber}</div>
// //           </div>
// //           {dueMeds.length > 0 && (
// //             <span style={{ background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: "13px", fontWeight: 800, padding: "3px 10px", borderRadius: "20px", marginLeft: "4px" }}>
// //               {dueMeds.filter(m => (m.dispense_status || "").toUpperCase() === "DISPENSED").length} due
// //             </span>
// //           )}
// //         </div>
// //         {onClose && (
// //           <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "7px", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer" }}>
// //             <X size={16} />
// //           </button>
// //         )}
// //       </div>

// //       {/* ── Tabs ── */}
// //       <div style={{ display: "flex", borderBottom: "1px solid #e0e4ef", flexShrink: 0 }}>
// //         <button style={tabBtn("due")} onClick={() => setActiveTab("due")}>
// //           <Pill size={13} /> Due Medications
// //           {!loadingDue && dueMeds.length > 0 && (
// //             <span style={{ background: TEAL, color: "#fff", borderRadius: "20px", fontSize: "12px", fontWeight: 900, padding: "1px 6px", marginLeft: "2px" }}>
// //               {dueMeds.length}
// //             </span>
// //           )}
// //         </button>
        
// //         <button style={tabBtn("history")} onClick={() => setActiveTab("history")}>
// //           <History size={13} /> Administration History
// //           {!loadingHistory && history.length > 0 && (
// //             <span style={{ background: "#6b7a9a", color: "#fff", borderRadius: "20px", fontSize: "12px", fontWeight: 900, padding: "1px 6px", marginLeft: "2px" }}>
// //               {history.length}
// //             </span>
// //           )}
// //         </button>
        
// //         <button style={tabBtn("paperGrid")} onClick={() => setActiveTab("paperGrid")}>
// //           <LayoutGrid size={13} /> Monthly MAR 
// //         </button>
// //         <button style={tabBtn("grid")} onClick={() => setActiveTab("grid")}>
// //           <LayoutGrid size={13} /> Weekly Chart
// //         </button>
// //       </div>

// //       {/* ── Tab Body ── */}
// //       <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px", flex: 1, overflowY: "auto" }}>

// //         {/* DUE TAB */}
// //         {activeTab === "due" && (
// //           <>
// //             {loadingDue ? (
// //               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a", fontSize: "16px" }}>
// //                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
// //                 Loading due medications…
// //               </div>
// //             ) : dueMeds.length === 0 ? (
// //               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a" }}>
// //                 <CheckCircle2 size={32} color="#a7f3d0" />
// //                 <span style={{ fontSize: "16px", fontWeight: 700, color: "#0f766e" }}>No due medications</span>
// //                 <span style={{ fontSize: "14px", color: "#8a94ad" }}>All scheduled medications have been administered</span>
// //               </div>
// //             ) : (
// //               dueMeds.map(med => (
// //                 <DueMedCard
// //                   key={med.prescription_id}
// //                   med={med}
// //                   encounterNumber={encounterNumber}
// //                   onSave={handleAdminSave}
// //                 />
// //               ))
// //             )}
// //           </>
// //         )}

// //         {/* HISTORY TAB */}
// //         {activeTab === "history" && (
// //           <>
// //             {loadingHistory ? (
// //               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a", fontSize: "16px" }}>
// //                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
// //                 Loading history…
// //               </div>
// //             ) : history.length === 0 ? (
// //               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a" }}>
// //                 <History size={32} color="#d1d5db" />
// //                 <span style={{ fontSize: "16px", fontWeight: 700 }}>No administration history</span>
// //                 <span style={{ fontSize: "14px", color: "#8a94ad" }}>Administered medications will appear here</span>
// //               </div>
// //             ) : (
// //               <>
// //                 <div style={{ fontSize: "13px", fontWeight: 700, color: "#8a94ad", textTransform: "uppercase", letterSpacing: "0.6px", padding: "0 2px 4px" }}>
// //                   {history.length} record{history.length !== 1 ? "s" : ""} found
// //                 </div>
// //                 {[...history]
// //                   .sort((a, b) => new Date(b.administered_at.replace(" ", "T")).getTime() - new Date(a.administered_at.replace(" ", "T")).getTime())
// //                   .map(record => (
// //                     <HistoryCard key={record.id} record={record} />
// //                   ))
// //                 }
// //               </>
// //             )}
// //           </>
// //         )}

// //         {/* WEEKLY GRID TAB */}
// //         {activeTab === "grid" && (
// //           <>
// //             {loadingWeeklyGrid ? (
// //               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a", fontSize: "16px" }}>
// //                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
// //                 Loading weekly chart…
// //               </div>
// //             ) : weeklyRows.length === 0 ? (
// //               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a" }}>
// //                 <LayoutGrid size={32} color="#d1d5db" />
// //                 <span style={{ fontSize: "16px", fontWeight: 700 }}>No medications scheduled this week</span>
// //               </div>
// //             ) : (
// //               <div style={{ overflowX: "auto", border: "1px solid #e0e4ef", borderRadius: "10px" }}>
// //                 <table style={{ borderCollapse: "collapse", width: "100%", minWidth: `${200 + weeklyHeaders.length * 120}px` }}>
// //                   <thead>
// //                     <tr>
// //                       <th style={{
// //                         position: "sticky", left: 0, zIndex: 1, background: "#f8f9fc",
// //                         textAlign: "left", padding: "10px 14px", fontSize: "13px", fontWeight: 800,
// //                         color: "#6b7a9a", textTransform: "uppercase", letterSpacing: "0.5px",
// //                         borderBottom: "1px solid #e0e4ef", borderRight: "1px solid #e0e4ef",
// //                         minWidth: "200px",
// //                       }}>
// //                         Medication
// //                       </th>
// //                       {weeklyHeaders.map(h => (
// //                         <th key={h.date} style={{
// //                           padding: "10px 12px", fontSize: "13px", fontWeight: 800, color: "#6b7a9a",
// //                           textTransform: "uppercase", letterSpacing: "0.5px", background: h.date === todayStr ? ACTIVE_COL_BG : "#f8f9fc",
// //                           borderBottom: "1px solid #e0e4ef", borderLeft: "1px solid #eef1f7", minWidth: "120px",
// //                         }}>
// //                           <div style={{ color: h.date === todayStr ? "#166534" : "inherit" }}>{h.day_name}</div>
// //                           <div style={{ fontWeight: 600, color: h.date === todayStr ? "#16a34a" : "#8a94ad", marginTop: "2px" }}>{h.display}</div>
// //                         </th>
// //                       ))}
// //                     </tr>
// //                   </thead>
// //                   <tbody>
// //                     {weeklyRows.map(row => {
// //                       const isInactive = row.prescription_status === "STOPPED" || row.prescription_status === "CANCELLED";
// //                       return (
// //                         <tr key={row.prescription_id} style={{ opacity: isInactive ? 0.55 : 1 }}>
// //                           <td style={{
// //                             position: "sticky", left: 0, zIndex: 1, background: "#fff",
// //                             padding: "10px 14px", borderBottom: "1px solid #eef1f7", borderRight: "1px solid #e0e4ef",
// //                             verticalAlign: "top",
// //                           }}>
// //                             <div style={{ fontWeight: 800, fontSize: "15px", color: "#1c2b4a" }}>{row.drug_name}</div>
// //                             <div style={{ fontSize: "13px", color: "#6b7a9a", marginTop: "2px" }}>{row.dosage_info}</div>
// //                             <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
// //                               <span style={{ fontSize: "12px", color: "#8a94ad" }}>Start: {row.start_date}</span>
// //                               <StatusBadge status={row.prescription_status} size="xs" />
// //                             </div>
// //                           </td>
// //                           {weeklyHeaders.map(h => {
// //                             const slots = row.days[h.date] || [];
// //                             return (
// //                               <td key={h.date} style={{
// //                                 padding: "8px", verticalAlign: "top",
// //                                 borderBottom: "1px solid #eef1f7", borderLeft: "1px solid #eef1f7",
// //                                 background: h.date === todayStr ? ACTIVE_COL_BG : "#fff",
// //                               }}>
// //                                 {slots.length === 0 ? (
// //                                   <span style={{ fontSize: "14px", color: "#cbd5e1" }}>—</span>
// //                                 ) : (
// //                                   slots.map((slot, i) => (
// //                                     <SlotChip
// //                                       key={i}
// //                                       slot={slot}
// //                                       isInactive={isInactive}
// //                                       clickable={!isInactive}
// //                                       onAdminister={() => setActiveSlot({ row, date: h.date, slot })}
// //                                       onViewDetail={() => setViewSlotDetail({ row, date: h.date, slot })}
// //                                     />
// //                                   ))
// //                                 )}
// //                               </td>
// //                             );
// //                           })}
// //                         </tr>
// //                       );
// //                     })}
// //                   </tbody>
// //                 </table>
// //               </div>
// //             )}
// //           </>
// //         )}

// //         {/* MONTHLY MAR GRID TAB */}
// //         {activeTab === "paperGrid" && (
// //           <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            
// //             {/* Header controls for Monthly View */}
// //             <div style={{ marginBottom: "16px", border: "2px solid #1e293b", borderRadius: "8px", overflow: "hidden", flexShrink: 0 }}>
// //               <div style={{ background: "#f8fafc", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #1e293b" }}>
// //                 <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px" }}>
// //                   Personal Medication Administration Record (MAR)
// //                 </h2>
// //                 <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
// //                   <button onClick={handlePrevMonth} style={{ background: "none", border: "none", cursor: "pointer" }}><ChevronLeft size={20} /></button>
// //                   <span style={{ fontSize: "16px", fontWeight: 800, minWidth: "140px", textAlign: "center" }}>
// //                     {monthNames[currentMonth - 1]} {currentYear}
// //                   </span>
// //                   <button onClick={handleNextMonth} style={{ background: "none", border: "none", cursor: "pointer" }}><ChevronRight size={20} /></button>
// //                 </div>
// //               </div>
              
// //               <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", fontSize: "12px", background: "#fff" }}>
// //                 <div style={{ padding: "8px", borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1" }}>
// //                   <strong>PATIENT NAME:</strong> {encounterNumber}
// //                 </div>
// //                 <div style={{ padding: "8px", borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1" }}>
// //                   <strong>D.O.B.:</strong> —
// //                 </div>
// //                 <div style={{ padding: "8px", borderBottom: "1px solid #cbd5e1" }}>
// //                   <strong>ADDRESS:</strong> —
// //                 </div>
// //                 <div style={{ padding: "8px", borderRight: "1px solid #cbd5e1", gridColumn: "span 1" }}>
// //                   <strong>GP NAME:</strong> —
// //                 </div>
// //                 <div style={{ padding: "8px", gridColumn: "span 2" }}>
// //                   <strong>KNOWN ALLERGIES:</strong> <span style={{ color: "#ef4444", fontWeight: 800 }}>None Recorded</span>
// //                 </div>
// //               </div>
// //             </div>

// //             {loadingMonthlyGrid ? (
// //               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px", color: "#6b7a9a" }}>
// //                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
// //               </div>
// //             ) : monthlyRows.length === 0 ? (
// //               <div style={{ textAlign: "center", padding: "48px", color: "#6b7a9a", fontWeight: 700 }}>No medications scheduled this month</div>
// //             ) : (
// //               <div style={{ overflowX: "auto", border: "2px solid #1e293b", flex: 1 }}>
// //                 <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed", minWidth: `${250 + (monthlyHeaders.length * 38)}px` }}>
// //                   <thead>
// //                     <tr>
// //                       <th style={{ width: "250px", position: "sticky", left: 0, zIndex: 2, background: "#f8fafc", borderRight: "2px solid #1e293b", borderBottom: "2px solid #1e293b", padding: "8px", textAlign: "left", fontSize: "11px", textTransform: "uppercase" }}>
// //                         Medication<br/>
// //                         <span style={{ fontWeight: 400, color: "#64748b" }}>(Name, strength, dose, frequency, route)</span>
// //                       </th>
// //                       {monthlyHeaders.map(h => (
// //                         <th key={h.date} style={{ 
// //                           borderBottom: "2px solid #1e293b", borderRight: "1px solid #cbd5e1", 
// //                           background: h.date === todayStr ? ACTIVE_COL_BG : "#f8fafc", 
// //                           color: h.date === todayStr ? "#166534" : "inherit",
// //                           padding: "4px 0", width: "38px", textAlign: "center" 
// //                         }}>
// //                           <div style={{ fontSize: "9px", color: h.date === todayStr ? "#166534" : "#64748b" }}>{h.day_name}</div>
// //                           <div style={{ fontSize: "14px", fontWeight: 800 }}>{h.display}</div>
// //                         </th>
// //                       ))}
// //                     </tr>
// //                   </thead>
// //                   <tbody>
// //                     {monthlyRows.map(row => {
// //                       const isInactive = row.prescription_status === "STOPPED" || row.prescription_status === "CANCELLED";
// //                       return (
// //                         <tr key={row.prescription_id} style={{ opacity: isInactive ? 0.6 : 1, background: isInactive ? "#f1f5f9" : "#fff" }}>
                          
// //                           <td style={{ position: "sticky", left: 0, zIndex: 1, background: isInactive ? "#f1f5f9" : "#fff", borderRight: "2px solid #1e293b", borderBottom: "1px solid #cbd5e1", padding: "8px", verticalAlign: "top" }}>
// //                             <div style={{ fontWeight: 900, fontSize: "13px", color: "#0f172a" }}>{row.drug_name}</div>
// //                             <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px", fontWeight: 600 }}>{row.dosage_info}</div>
// //                             <div style={{ marginTop: "4px" }}>
// //                               <StatusBadge status={row.prescription_status} size="xs" />
// //                             </div>
// //                           </td>

// //                           {monthlyHeaders.map(h => {
// //                             const slots = row.days[h.date] || [];
// //                             const colBackground = h.date === todayStr ? ACTIVE_COL_BG : (isInactive ? "#f8fafc" : "#fff");
                            
// //                             return (
// //                               <td key={h.date} style={{ borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1", padding: "2px", verticalAlign: "top", background: colBackground }}>
// //                                 {slots.length === 0 ? null : (
// //                                   slots.map((slot, i) => (
// //                                     <CompactSlotChip
// //                                       key={i}
// //                                       slot={slot}
// //                                       isInactive={isInactive}
// //                                       clickable={!isInactive}
// //                                       onAction={() => {
// //                                         const isPending = (slot.status || "").toLowerCase() === "pending";
// //                                         if (isPending) setActiveSlot({ row, date: h.date, slot });
// //                                         else setViewSlotDetail({ row, date: h.date, slot });
// //                                       }}
// //                                     />
// //                                   ))
// //                                 )}
// //                               </td>
// //                             );
// //                           })}
// //                         </tr>
// //                       );
// //                     })}
// //                   </tbody>
// //                 </table>
// //               </div>
// //             )}
// //           </div>
// //         )}
// //       </div>

// //       {/* ── Shared Grid Slot Administer Modal ── */}
// //       {activeSlot && (
// //         <div
// //           style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "16px" }}
// //           onClick={() => setActiveSlot(null)}
// //         >
// //           <div style={{ width: "100%", maxWidth: "460px" }} onClick={e => e.stopPropagation()}>
// //             <AdminForm
// //               med={{
// //                 prescription_id: activeSlot.row.prescription_id,
// //                 drug_name: activeSlot.row.drug_name,
// //                 drug_id: dueMeds.find(d => d.prescription_id === activeSlot.row.prescription_id)?.drug_id,
// //                 ...parseDosageInfo(activeSlot.row.dosage_info),
// //                 instructions: null,
// //                 dispense_status: "DISPENSED",
// //                 prescribed_by: "",
// //                 prescribed_at: null,
// //                 last_admin_id: null,
// //                 last_admin_status: null,
// //                 last_administered_at: null,
// //                 last_administered_by: null,
// //                 last_administered_by_name: null,
// //                 due_status: activeSlot.row.due_status,
// //               }}
// //               encounterNumber={encounterNumber}
// //               onCancel={() => setActiveSlot(null)}
// //               onSave={handleGridAdminSave}
// //             />
// //           </div>
// //         </div>
// //       )}

// //       {/* ── Shared Grid Slot Detail (View) Modal ── */}
// //       {viewSlotDetail && (() => {
// //         const fullRecord = history.find(h => h.id === viewSlotDetail.slot.admin_id);
// //         const rc = routeConfig(fullRecord?.route || parseDosageInfo(viewSlotDetail.row.dosage_info).route);
// //         return (
// //           <div
// //             style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "16px" }}
// //             onClick={() => setViewSlotDetail(null)}
// //           >
// //             <div style={{ width: "100%", maxWidth: "460px", background: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
// //               <div style={{ background: rc.color, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", color: "#fff" }}>
// //                 <div>
// //                   <div style={{ fontSize: "16px", fontWeight: 800 }}>{viewSlotDetail.row.drug_name}</div>
// //                   <div style={{ fontSize: "13px", opacity: 0.85, marginTop: "2px" }}>
// //                     Scheduled {viewSlotDetail.slot.scheduled_label} · {fmtDt(viewSlotDetail.date)}
// //                   </div>
// //                 </div>
// //                 <button onClick={() => setViewSlotDetail(null)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "6px", width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer" }}>
// //                   <X size={16} />
// //                 </button>
// //               </div>
// //               <div style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
// //                 <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
// //                   <StatusBadge status={viewSlotDetail.slot.status} />
// //                   {fullRecord && <RouteBadge route={fullRecord.route} />}
// //                 </div>

// //                 {fullRecord ? (
// //                   <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
// //                     {([
// //                       ["Dose Given", fullRecord.dose],
// //                       ["Administered At", fmtDt(fullRecord.administered_at)],
// //                       ["Given By", fullRecord.administered_by_name],
// //                       rc.showDiluent && ["Diluent", fullRecord.diluent],
// //                       rc.showRate && ["Rate", fullRecord.rate_ml_hr ? `${fullRecord.rate_ml_hr} ml/hr` : null],
// //                       rc.showAccessSite && ["Access Site", fullRecord.access_site],
// //                       rc.showBatch && ["Batch No.", fullRecord.batch_number],
// //                     ].filter(Boolean) as [string, string | null][]).map(([k, v]) => (
// //                       <div key={k}>
// //                         <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
// //                         <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{v || "—"}</div>
// //                       </div>
// //                     ))}
// //                   </div>
// //                 ) : (
// //                   <div style={{ fontSize: "14px", color: "#6b7a9a" }}>
// //                     Recorded as <strong>{viewSlotDetail.slot.actual_label || viewSlotDetail.slot.status}</strong>.
// //                     {" "}Full administration details aren't available for this entry.
// //                   </div>
// //                 )}

// //                 {viewSlotDetail.slot.remarks && (
// //                   <div style={{ fontSize: "14px", color: "#6b7a9a", fontStyle: "italic" }}>
// //                     "{viewSlotDetail.slot.remarks}"
// //                   </div>
// //                 )}
// //               </div>
// //               <div style={{ padding: "14px 18px", borderTop: "1px solid #eef1f7", display: "flex", justifyContent: "flex-end" }}>
// //                 <button onClick={() => setViewSlotDetail(null)} style={secBtn}>Close</button>
// //               </div>
// //             </div>
// //           </div>
// //         );
// //       })()}
// //     </div>
// //   );
// // };

// // export default MARPanel;













































































































































































































// // import React, { useState, useEffect, useCallback } from "react";
// // import {
// //   X, Loader2, Clock, CheckCircle2, AlertTriangle, Pill,
// //   ClipboardList, History, ChevronDown, ChevronUp, Plus, LayoutGrid, ChevronLeft, ChevronRight
// // } from "lucide-react";
// // import { nursingService } from "../services/nursing.service";
// // import { useNotification } from "../context/NotificationContext";

// // // ─── Types ────────────────────────────────────────────────────────────────────

// // interface DueMedication {
// //   prescription_id: number;
// //   drug_name: string;
// //   drug_id?: number;
// //   dosage: string;
// //   frequency: string;
// //   route: string;
// //   instructions: string | null;
// //   dispense_status: string;
// //   prescribed_by: string;
// //   prescribed_at: string | null;
// //   last_admin_id: number | null;
// //   last_admin_status: string | null;
// //   last_administered_at: string | null;
// //   last_administered_by: string | null;
// //   last_administered_by_name: string | null;
// //   due_status: string;
// // }

// // interface AdminHistory {
// //   id: number;
// //   prescription_id: number;
// //   drug_id: number;
// //   drug_name: string;
// //   dosage: string;
// //   dose: string;
// //   route: string;
// //   frequency: string;
// //   diluent: string | null;
// //   rate_ml_hr: number | null;
// //   access_site: string | null;
// //   batch_number: string | null;
// //   administered_at: string;
// //   administered_by_name: string;
// //   status: string;
// //   remarks: string | null;
// // }

// // interface MarGridHeader {
// //   date: string;
// //   display: string;
// //   day_name: string;
// // }

// // interface MarGridSlot {
// //   status: string;
// //   scheduled_label: string;
// //   actual_label: string | null;
// //   admin_id: number | null;
// //   remarks: string | null;
// //   is_overdue: boolean;
// // }

// // interface MarGridRow {
// //   prescription_id: number;
// //   drug_name: string;
// //   dosage_info: string;
// //   start_date: string;
// //   prescription_status: string;
// //   due_status: string;
// //   days: Record<string, MarGridSlot[]>;
// // }

// // interface MARPanelProps {
// //   encounterNumber: string;
// //   onClose?: () => void;
// // }

// // // ─── Helpers ──────────────────────────────────────────────────────────────────

// // const getLocalTimestamp = (date: Date = new Date()): string => {
// //   const pad = (n: number) => n.toString().padStart(2, "0");
// //   return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
// // };

// // const getTodayDateString = (): string => {
// //   const date = new Date();
// //   const pad = (n: number) => n.toString().padStart(2, "0");
// //   return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
// // };

// // const toInputDatetime = (dt: string): string => {
// //   if (!dt) return "";
// //   return dt.replace(" ", "T").slice(0, 16);
// // };

// // const fromInputDatetime = (val: string): string => {
// //   if (!val) return "";
// //   return val.replace("T", " ") + ":00";
// // };

// // const fmtDt = (dt: string) => {
// //   if (!dt) return "—";
// //   try {
// //     return new Date(dt.replace(" ", "T")).toLocaleString("en-GB", {
// //       day: "2-digit", month: "2-digit", year: "2-digit",
// //       hour: "2-digit", minute: "2-digit",
// //     });
// //   } catch { return dt; }
// // };

// // const parseDosageInfo = (info: string): { dosage: string; frequency: string; route: string } => {
// //   const routeMatch = info.match(/\(([^)]+)\)\s*$/);
// //   const route = routeMatch ? routeMatch[1] : "";
// //   const withoutRoute = info.replace(/\([^)]+\)\s*$/, "").trim();
// //   const [dosage = "", frequency = ""] = withoutRoute.split(" - ").map(s => s.trim());
// //   return { dosage, frequency, route };
// // };

// // const routeConfig = (route: string): {
// //   showVolume: boolean;
// //   showDiluent: boolean;
// //   showRate: boolean;
// //   showFlush: boolean;
// //   showAccessSite: boolean;
// //   showBatch: boolean;
// //   label: string;
// //   color: string;
// //   bg: string;
// // } => {
// //   const r = (route || "").toUpperCase();
// //   if (r === "IV")      return { showVolume: true,  showDiluent: true,  showRate: true,  showFlush: true,  showAccessSite: true,  showBatch: false, label: "IV Infusion",     color: "#1d4ed8", bg: "#eff6ff" };
// //   if (r === "SC" || r === "IM") return { showVolume: true,  showDiluent: false, showRate: false, showFlush: false, showAccessSite: true,  showBatch: false, label: r + " Injection",  color: "#7c3aed", bg: "#f5f3ff" };
// //   if (r === "PO" || r === "SL") return { showVolume: false, showDiluent: false, showRate: false, showFlush: false, showAccessSite: false, showBatch: false, label: "Oral",            color: "#0f766e", bg: "#f0fdfa" };
// //   if (r === "BLOOD")  return { showVolume: true,  showDiluent: false, showRate: false, showFlush: false, showAccessSite: true,  showBatch: true,  label: "Blood Product",   color: "#b91c1c", bg: "#fef2f2" };
// //   if (r === "NG" || r === "PEG") return { showVolume: true, showDiluent: false, showRate: false, showFlush: false, showAccessSite: false, showBatch: false, label: "NG/PEG Feed",    color: "#b45309", bg: "#fefce8" };
// //   return { showVolume: true, showDiluent: true, showRate: false, showFlush: false, showAccessSite: false, showBatch: false, label: route, color: "#1c3d7a", bg: "#f8f9fc" };
// // };

// // // ─── Shared Styles ────────────────────────────────────────────────────────────

// // const lbl: React.CSSProperties = {
// //   display: "block", fontSize: "13px", fontWeight: 700, color: "#6b7a9a",
// //   textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "5px",
// // };
// // const inp: React.CSSProperties = {
// //   width: "100%", padding: "9px 12px", border: "1px solid #d0d6e6",
// //   borderRadius: "9px", fontSize: "16px", fontWeight: 500, color: "#1c2b4a",
// //   background: "#f8f9fc", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
// // };
// // const inpSm = (borderColor: string): React.CSSProperties => ({
// //   ...inp, background: "#fff", border: `1px solid ${borderColor}`,
// //   padding: "8px 10px", fontSize: "15px", borderRadius: "8px",
// // });
// // const secBtn: React.CSSProperties = {
// //   flex: "0 0 auto", padding: "8px 16px", border: "1px solid #d0d6e6",
// //   borderRadius: "9px", fontSize: "15px", fontWeight: 700, color: "#4a5568",
// //   background: "#fff", cursor: "pointer", whiteSpace: "nowrap",
// // };
// // const primBtn = (bg: string): React.CSSProperties => ({
// //   flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center",
// //   gap: "6px", padding: "8px 18px", border: "none", borderRadius: "9px",
// //   fontSize: "15px", fontWeight: 700, color: "#fff", background: bg, cursor: "pointer",
// //   whiteSpace: "nowrap",
// // });

// // // ─── Status badge ─────────────────────────────────────────────────────────────

// // const StatusBadge: React.FC<{ status: string; size?: "sm" | "xs" }> = ({ status, size = "sm" }) => {
// //   const s = (status || "").toUpperCase();
// //   const map: Record<string, { bg: string; color: string; dot: string }> = {
// //     GIVEN:      { bg: "#dcfce7", color: "#166534", dot: "#16a34a" },
// //     HELD:       { bg: "#fef9c3", color: "#854d0e", dot: "#ca8a04" },
// //     REFUSED:    { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626" },
// //     OMITTED:    { bg: "#f3f4f6", color: "#374151", dot: "#9ca3af" },
// //     DISPENSED:  { bg: "#dcfce7", color: "#166534", dot: "#16a34a" },
// //     PENDING:    { bg: "#fef9c3", color: "#854d0e", dot: "#ca8a04" },
// //     DUE:        { bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
// //     OVERDUE:    { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626" },
// //     STOPPED:    { bg: "#f1f5f9", color: "#64748b", dot: "#94a3b8" },
// //     CANCELLED:  { bg: "#f1f5f9", color: "#64748b", dot: "#94a3b8" },
// //   };
// //   const cfg = map[s] || { bg: "#f3f4f6", color: "#374151", dot: "#9ca3af" };
// //   const fs = size === "xs" ? "12px" : "13px";
// //   return (
// //     <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: cfg.bg, color: cfg.color, fontSize: fs, fontWeight: 800, textTransform: "uppercase", padding: "3px 8px", borderRadius: "20px", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>
// //       <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: cfg.dot, display: "inline-block", flexShrink: 0 }} />
// //       {status}
// //     </span>
// //   );
// // };

// // const RouteBadge: React.FC<{ route: string }> = ({ route }) => (
// //   <span style={{ display: "inline-block", background: "#ccfbf1", color: "#0f766e", fontSize: "12px", fontWeight: 800, textTransform: "uppercase", padding: "3px 8px", borderRadius: "20px", letterSpacing: "0.5px" }}>
// //     {route}
// //   </span>
// // );

// // // ─── MAR Grid slot chip ────────────────────────────────────────────────────────

// // // Handles the color overrides based on the rules
// // const slotColors = (slot: MarGridSlot, isInactive: boolean): { bg: string; color: string; border: string } => {
// //   // Rule 1: If medication is STOPPED or CANCELLED, everything is grayed out
// //   if (isInactive) return { bg: "#f8fafc", color: "#94a3b8", border: "#e2e8f0" };

// //   const s = (slot.status || "").toLowerCase();
  
// //   // Rule 2: Green for Given
// //   if (s === "given" || s === "administered") return { bg: "#dcfce7", color: "#166534", border: "#86efac" };
  
// //   // Rule 3: Red for Missed, Refused, Omitted, or Overdue
// //   if (s === "missed" || s === "refused" || s === "omitted" || slot.is_overdue) {
// //     return { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" };
// //   }
  
// //   if (s === "held") return { bg: "#fef9c3", color: "#854d0e", border: "#fde047" };
  
// //   // Rule 4: Default Pending (White/Gray)
// //   return { bg: "#ffffff", color: "#475569", border: "#cbd5e1" };
// // };

// // // Component for Weekly Grid (Larger Chip)
// // const SlotChip: React.FC<{ slot: MarGridSlot; isInactive: boolean; clickable: boolean; onAdminister: () => void; onViewDetail: () => void }> = ({ slot, isInactive, clickable, onAdminister, onViewDetail }) => {
// //   const c = slotColors(slot, isInactive);
// //   const isPending = (slot.status || "").toLowerCase() === "pending";
// //   const hasDetail = !isPending && (slot.admin_id != null || !!slot.actual_label || !!slot.remarks);
// //   const isActionable = (isPending && clickable) || hasDetail;
// //   return (
// //     <button
// //       type="button"
// //       onClick={isActionable ? (isPending ? onAdminister : onViewDetail) : undefined}
// //       title={slot.remarks || undefined}
// //       style={{
// //         display: "block", width: "100%", textAlign: "left", marginBottom: "4px",
// //         padding: "4px 7px", borderRadius: "6px", border: `1px solid ${c.border}`,
// //         background: c.bg, color: c.color, fontSize: "13px", fontWeight: 800,
// //         cursor: isActionable ? "pointer" : "default",
// //         whiteSpace: "nowrap",
// //       }}
// //     >
// //       {slot.actual_label || slot.scheduled_label}
// //     </button>
// //   );
// // };

// // // Component for Monthly Grid (Compact Chip)
// // const CompactSlotChip: React.FC<{ slot: MarGridSlot; isInactive: boolean; clickable: boolean; onAction: () => void; }> = ({ slot, isInactive, clickable, onAction }) => {
// //   const c = slotColors(slot, isInactive);
// //   const isPending = (slot.status || "").toLowerCase() === "pending";
// //   const hasDetail = !isPending && (slot.admin_id != null || !!slot.actual_label || !!slot.remarks);
// //   const isActionable = (isPending && clickable) || hasDetail;
// //   return (
// //       <button
// //         type="button"
// //         onClick={isActionable ? onAction : undefined}
// //         title={slot.remarks || (isPending ? `Scheduled: ${slot.scheduled_label}` : `Given: ${slot.actual_label}`)}
// //         style={{
// //           display: "block", width: "100%", textAlign: "center", marginBottom: "3px",
// //           padding: "3px 2px", borderRadius: "4px", border: `1px solid ${c.border}`,
// //           background: c.bg, color: c.color, fontSize: "10px", fontWeight: 800,
// //           cursor: isActionable ? "pointer" : "default", whiteSpace: "nowrap",
// //         }}
// //       >
// //         {slot.actual_label || slot.scheduled_label}
// //       </button>
// //     );
// // };

// // // ─── Inline Administration Form ───────────────────────────────────────────────

// // const AdminForm: React.FC<{
// //   med: DueMedication;
// //   encounterNumber: string;
// //   onCancel: () => void;
// //   onSave: () => void;
// // }> = ({ med, encounterNumber, onCancel, onSave }) => {
// //   const rc = routeConfig(med.route);
// //   const { notify } = useNotification();
// //   const [submitting, setSubmitting] = useState(false);

// //   const [dose, setDose] = useState(med.dosage || "");
// //   const [administeredAt, setAdministeredAt] = useState(toInputDatetime(getLocalTimestamp()));
// //   const [volumeMl, setVolumeMl] = useState("");
// //   const [diluent, setDiluent] = useState("");
// //   const [rateMlHr, setRateMlHr] = useState("");
// //   const [flushMl, setFlushMl] = useState("");
// //   const [accessSite, setAccessSite] = useState("");
// //   const [batchNumber, setBatchNumber] = useState("");
// //   const [remarks, setRemarks] = useState("");

// //   const handleSubmit = async (e: React.FormEvent) => {
// //     e.preventDefault();
// //     if (!dose.trim()) { notify("Dose is required", "warning"); return; }
// //     if (!administeredAt) { notify("Administered at time is required", "warning"); return; }
// //     if (rc.showVolume && !volumeMl) { notify("Volume (ml) is required for this route", "warning"); return; }

// //     setSubmitting(true);
// //     try {
// //       const payload: any = {
// //         encounter_number: encounterNumber,
// //         prescription_id: med.prescription_id,
// //         drug_id: med.drug_id,
// //         dose,
// //         route: med.route,
// //         administered_at: fromInputDatetime(administeredAt),
// //         status: "given",
// //       };
// //       if (rc.showVolume && volumeMl)   payload.volume_ml = Number(volumeMl);
// //       if (rc.showDiluent && diluent)   payload.diluent = diluent;
// //       if (rc.showRate && rateMlHr)     payload.rate_ml_hr = Number(rateMlHr);
// //       if (rc.showFlush && flushMl)     payload.flush_ml = Number(flushMl);
// //       if (rc.showAccessSite && accessSite) payload.access_site = accessSite;
// //       if (rc.showBatch && batchNumber) payload.batch_number = batchNumber;
// //       if (remarks.trim())              payload.remarks = remarks.trim();

// //       await nursingService.administerMedication(payload);
// //       notify(`${med.drug_name} administered successfully`, "success");
// //       onSave();
// //     } catch (err: any) {
// //       notify(err.response?.data?.message || "Failed to record administration", "error");
// //     } finally {
// //       setSubmitting(false);
// //     }
// //   };

// //   return (
// //     <div style={{ margin: "0 0 0", background: rc.bg, border: `1px solid ${rc.color}30`, borderRadius: "10px", padding: "14px 16px" }}>
// //       <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "14px", color: rc.color, fontWeight: 800, fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
// //         <Plus size={13} /> Record Administration — <span style={{ opacity: 0.85 }}>{rc.label}</span>
// //       </div>

// //       <form onSubmit={handleSubmit}>
// //         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
// //           <div>
// //             <label style={lbl}>Dose <span style={{ color: "#e11d48" }}>*</span></label>
// //             <input type="text" value={dose} onChange={e => setDose(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 500mg" autoFocus />
// //           </div>
// //           <div>
// //             <label style={lbl}>Administered At <span style={{ color: "#e11d48" }}>*</span></label>
// //             <input type="datetime-local" value={administeredAt} onChange={e => setAdministeredAt(e.target.value)} style={inpSm(`${rc.color}60`)} />
// //           </div>
// //         </div>

// //         {(rc.showVolume || rc.showDiluent) && (
// //           <div style={{ display: "grid", gridTemplateColumns: rc.showVolume && rc.showDiluent ? "1fr 1fr" : "1fr", gap: "10px", marginBottom: "10px" }}>
// //             {rc.showVolume && (
// //               <div>
// //                 <label style={lbl}>Volume (ml) <span style={{ color: "#e11d48" }}>*</span></label>
// //                 <input type="number" min="1" value={volumeMl} onChange={e => setVolumeMl(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 100" />
// //               </div>
// //             )}
// //             {rc.showDiluent && (
// //               <div>
// //                 <label style={lbl}>Diluent</label>
// //                 <input type="text" value={diluent} onChange={e => setDiluent(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. Normal Saline" />
// //               </div>
// //             )}
// //           </div>
// //         )}

// //         {(rc.showRate || rc.showFlush) && (
// //           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
// //             {rc.showRate && (
// //               <div>
// //                 <label style={lbl}>Rate (ml/hr)</label>
// //                 <input type="number" min="1" value={rateMlHr} onChange={e => setRateMlHr(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 50" />
// //               </div>
// //             )}
// //             {rc.showFlush && (
// //               <div>
// //                 <label style={lbl}>Flush (ml)</label>
// //                 <input type="number" min="0" value={flushMl} onChange={e => setFlushMl(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 10" />
// //               </div>
// //             )}
// //           </div>
// //         )}

// //         {(rc.showAccessSite || rc.showBatch) && (
// //           <div style={{ display: "grid", gridTemplateColumns: rc.showAccessSite && rc.showBatch ? "1fr 1fr" : "1fr", gap: "10px", marginBottom: "10px" }}>
// //             {rc.showAccessSite && (
// //               <div>
// //                 <label style={lbl}>Access Site</label>
// //                 <input type="text" value={accessSite} onChange={e => setAccessSite(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. Right forearm" />
// //               </div>
// //             )}
// //             {rc.showBatch && (
// //               <div>
// //                 <label style={lbl}>Batch / Unit Number</label>
// //                 <input type="text" value={batchNumber} onChange={e => setBatchNumber(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. PRBC-20240524" />
// //               </div>
// //             )}
// //           </div>
// //         )}

// //         <div style={{ marginBottom: "12px" }}>
// //           <label style={lbl}>Remarks <span style={{ fontWeight: 400, color: "#aaa", textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
// //           <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} style={inpSm(`${rc.color}40`)} placeholder="e.g. Given slowly over 20 minutes" />
// //         </div>

// //         <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
// //           <button type="button" style={secBtn} onClick={onCancel}>Cancel</button>
// //           <button type="submit" disabled={submitting} style={primBtn(rc.color)}>
// //             {submitting ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle2 size={13} />}
// //             Mark as Given
// //           </button>
// //         </div>
// //       </form>
// //     </div>
// //   );
// // };

// // // ─── Due Medication Card ──────────────────────────────────────────────────────

// // const DueMedCard: React.FC<{
// //   med: DueMedication;
// //   encounterNumber: string;
// //   onSave: () => void;
// // }> = ({ med, encounterNumber, onSave }) => {
// //   const [showForm, setShowForm] = useState(false);
// //   const isDispensed = (med.dispense_status || "").toUpperCase() === "DISPENSED";
// //   const rc = routeConfig(med.route);

// //   return (
// //     <div style={{
// //       background: "#fff",
// //       borderRadius: "12px",
// //       border: "1px solid #e0e4ef",
// //       boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
// //       borderLeft: `4px solid ${isDispensed ? rc.color : "#d1d5db"}`,
// //       opacity: isDispensed ? 1 : 0.75,
// //       marginBottom: "12px",
// //     }}>
// //       <div style={{ padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
// //         <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `${isDispensed ? rc.color : "#6b7280"}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
// //           <Pill size={18} color={isDispensed ? rc.color : "#6b7280"} />
// //         </div>

// //         <div style={{ flex: 1, minWidth: 0 }}>
// //           <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
// //             <span style={{ fontWeight: 800, fontSize: "18px", color: "#1c2b4a" }}>{med.drug_name}</span>
// //             <RouteBadge route={med.route} />
// //             <StatusBadge status={med.due_status} size="xs" />
// //             {!isDispensed && (
// //               <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#fef9c3", color: "#854d0e", fontSize: "12px", fontWeight: 800, padding: "3px 8px", borderRadius: "20px", border: "1px solid #fde047" }}>
// //                 <AlertTriangle size={9} /> Not Yet Dispensed
// //               </span>
// //             )}
// //           </div>

// //           <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "4px" }}>
// //             {[
// //               ["Dose", med.dosage],
// //               ["Frequency", med.frequency],
// //               ["Prescribed by", med.prescribed_by],
// //             ].map(([k, v]) => (
// //               <div key={k}>
// //                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
// //                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{v || "—"}</div>
// //               </div>
// //             ))}
// //             {med.prescribed_at && (
// //               <div>
// //                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Prescribed On</div>
// //                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{fmtDt(med.prescribed_at)}</div>
// //               </div>
// //             )}
// //             {med.last_administered_at && (
// //               <div>
// //                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Last Given</div>
// //                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{fmtDt(med.last_administered_at)}</div>
// //               </div>
// //             )}
// //           </div>

// //           {med.instructions && (
// //             <div style={{ marginTop: "6px", fontSize: "14px", color: "#6b7a9a", fontStyle: "italic" }}>
// //               ℹ {med.instructions}
// //             </div>
// //           )}
// //         </div>

// //         {isDispensed && (
// //           <button
// //             onClick={() => setShowForm(f => !f)}
// //             style={{
// //               display: "flex", alignItems: "center", gap: "4px",
// //               padding: "7px 14px", border: `1.5px solid ${rc.color}`,
// //               borderRadius: "8px", background: showForm ? rc.color : "#fff",
// //               color: showForm ? "#fff" : rc.color,
// //               fontSize: "14px", fontWeight: 800, cursor: "pointer",
// //               whiteSpace: "nowrap", transition: "all 0.15s", flexShrink: 0,
// //             }}
// //           >
// //             <CheckCircle2 size={12} />
// //             {showForm ? "Cancel" : "Give"}
// //           </button>
// //         )}
// //       </div>

// //       {showForm && isDispensed && (
// //         <div style={{ padding: "0 14px 14px" }}>
// //           <AdminForm
// //             med={med}
// //             encounterNumber={encounterNumber}
// //             onCancel={() => setShowForm(false)}
// //             onSave={() => { setShowForm(false); onSave(); }}
// //           />
// //         </div>
// //       )}
// //     </div>
// //   );
// // };

// // // ─── History Card ─────────────────────────────────────────────────────────────

// // const HistoryCard: React.FC<{ record: AdminHistory }> = ({ record }) => {
// //   const [expanded, setExpanded] = useState(false);
// //   const rc = routeConfig(record.route);

// //   return (
// //     <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e0e4ef", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", borderLeft: `3px solid ${rc.color}`, marginBottom: "10px" }}>
// //       <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
// //         <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: `${rc.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
// //           <Pill size={14} color={rc.color} />
// //         </div>

// //         <div style={{ flex: 1, minWidth: 0 }}>
// //           <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "2px" }}>
// //             <span style={{ fontWeight: 800, fontSize: "16px", color: "#1c2b4a" }}>{record.drug_name}</span>
// //             <RouteBadge route={record.route} />
// //             <StatusBadge status={record.status} size="xs" />
// //           </div>
// //           <div style={{ fontSize: "14px", color: "#6b7a9a" }}>
// //             <span style={{ fontWeight: 600, color: "#1c2b4a" }}>{record.dose}</span>
// //             {" · "}
// //             <Clock size={9} style={{ display: "inline", verticalAlign: "middle", marginRight: "2px" }} />
// //             {fmtDt(record.administered_at)}
// //             {" · by "}<span style={{ fontWeight: 600, color: "#1c2b4a" }}>{record.administered_by_name}</span>
// //           </div>
// //         </div>

// //         <button
// //           onClick={() => setExpanded(e => !e)}
// //           style={{ background: "none", border: "none", cursor: "pointer", color: "#8a94ad", padding: "4px", borderRadius: "6px", lineHeight: 1, flexShrink: 0 }}
// //         >
// //           {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
// //         </button>
// //       </div>

// //       {expanded && (
// //         <div style={{ padding: "0 14px 12px", background: "#f8f9fc", borderTop: "1px dashed #e0e4ef" }}>
// //           <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", paddingTop: "10px" }}>
// //             {([
// //               ["Prescribed Dose", record.dosage],
// //               ["Frequency", record.frequency],
// //               rc.showDiluent && ["Diluent", record.diluent],
// //               rc.showRate && ["Rate", record.rate_ml_hr ? `${record.rate_ml_hr} ml/hr` : null],
// //               rc.showAccessSite && ["Access Site", record.access_site],
// //               rc.showBatch && ["Batch No.", record.batch_number],
// //             ].filter(Boolean) as [string, string | null][]).map(([k, v]) => (
// //               <div key={k}>
// //                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
// //                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{v || "—"}</div>
// //               </div>
// //             ))}
// //           </div>
// //           {record.remarks && (
// //             <div style={{ marginTop: "8px", fontSize: "14px", color: "#6b7a9a", fontStyle: "italic" }}>
// //               "{record.remarks}"
// //             </div>
// //           )}
// //         </div>
// //       )}
// //     </div>
// //   );
// // };

// // // ─── Main MARPanel ────────────────────────────────────────────────────────────

// // const MARPanel: React.FC<MARPanelProps> = ({ encounterNumber, onClose }) => {
// //   const [activeTab, setActiveTab] = useState<"paperGrid" | "grid" | "due" | "history">("paperGrid");
  
// //   // Data States
// //   const [dueMeds, setDueMeds] = useState<DueMedication[]>([]);
// //   const [history, setHistory] = useState<AdminHistory[]>([]);
  
// //   // Separate states for Weekly vs Monthly grids to prevent UI overlapping
// //   const [weeklyHeaders, setWeeklyHeaders] = useState<MarGridHeader[]>([]);
// //   const [weeklyRows, setWeeklyRows] = useState<MarGridRow[]>([]);
  
// //   const [monthlyHeaders, setMonthlyHeaders] = useState<MarGridHeader[]>([]);
// //   const [monthlyRows, setMonthlyRows] = useState<MarGridRow[]>([]);
  
// //   // Loading States
// //   const [loadingDue, setLoadingDue] = useState(true);
// //   const [loadingHistory, setLoadingHistory] = useState(true);
// //   const [loadingWeeklyGrid, setLoadingWeeklyGrid] = useState(true);
// //   const [loadingMonthlyGrid, setLoadingMonthlyGrid] = useState(true);
  
// //   // Calendar State for Monthly Grid
// //   const today = new Date();
// //   const todayStr = getTodayDateString(); 
// //   const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
// //   const [currentYear, setCurrentYear] = useState(today.getFullYear());
// //   const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// //   // Shared Modal States
// //   const [activeSlot, setActiveSlot] = useState<{ row: MarGridRow; date: string; slot: MarGridSlot } | null>(null);
// //   const [viewSlotDetail, setViewSlotDetail] = useState<{ row: MarGridRow; date: string; slot: MarGridSlot } | null>(null);

// //   const handlePrevMonth = () => {
// //     if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(y => y - 1); }
// //     else { setCurrentMonth(m => m - 1); }
// //   };

// //   const handleNextMonth = () => {
// //     if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(y => y + 1); }
// //     else { setCurrentMonth(m => m + 1); }
// //   };

// //   // Base Data Fetchers
// //   const fetchDue = useCallback(async () => {
// //     setLoadingDue(true);
// //     try {
// //       const res = await nursingService.getMARDue(encounterNumber);
// //       setDueMeds(res.data || []);
// //     } catch {
// //       setDueMeds([]);
// //     } finally { setLoadingDue(false); }
// //   }, [encounterNumber]);

// //   const fetchHistory = useCallback(async () => {
// //     setLoadingHistory(true);
// //     try {
// //       const res = await nursingService.getMARHistory(encounterNumber);
// //       setHistory(res.data || []);
// //     } catch {
// //       setHistory([]);
// //     } finally { setLoadingHistory(false); }
// //   }, [encounterNumber]);

// //   // Weekly Grid Fetcher
// //   const fetchWeeklyGrid = useCallback(async () => {
// //     setLoadingWeeklyGrid(true);
// //     try {
// //       const res = await nursingService.getMARDueHistory(encounterNumber);
// //       setWeeklyHeaders(res.data?.headers || []);
// //       setWeeklyRows(res.data?.rows || []);
// //     } catch {
// //       setWeeklyHeaders([]);
// //       setWeeklyRows([]);
// //     } finally { setLoadingWeeklyGrid(false); }
// //   }, [encounterNumber]);

// //   // Monthly Grid Fetcher
// //   const fetchMonthlyGrid = useCallback(async () => {
// //     setLoadingMonthlyGrid(true);
// //     try {
// //       // Assuming getMARMonth triggers 'nursing/mar/dueMonth' in nursingService
// //       const fetchFn = (nursingService as any).getMARMonth || nursingService.getMARDueHistory;
// //       const res = await fetchFn(encounterNumber, currentMonth, currentYear);
// //       setMonthlyHeaders(res.data?.headers || []);
// //       setMonthlyRows(res.data?.rows || []);
// //     } catch {
// //       setMonthlyHeaders([]);
// //       setMonthlyRows([]);
// //     } finally { setLoadingMonthlyGrid(false); }
// //   }, [encounterNumber, currentMonth, currentYear]);

// //   // Initial Triggers
// //   useEffect(() => {
// //     fetchDue();
// //     fetchHistory();
// //     fetchWeeklyGrid();
// //   }, [fetchDue, fetchHistory, fetchWeeklyGrid]);

// //   useEffect(() => {
// //     fetchMonthlyGrid();
// //   }, [fetchMonthlyGrid]);

// //   const handleAdminSave = () => {
// //     fetchDue();
// //     fetchHistory();
// //   };

// //   const handleGridAdminSave = () => {
// //     setActiveSlot(null);
// //     fetchDue();
// //     fetchHistory();
// //     fetchWeeklyGrid();
// //     fetchMonthlyGrid();
// //   };

// //   const TEAL = "#0d9488";
// //   const TEAL_DARK = "#0f766e";
// //   const ACTIVE_COL_BG = "#dcfce7"; // Very soft green highlight for current day

// //   const tabBtn = (tab: "due" | "history" | "grid" | "paperGrid"): React.CSSProperties => ({
// //     flex: 1, padding: "9px 12px", border: "none", cursor: "pointer",
// //     fontSize: "15px", fontWeight: 800, display: "flex", alignItems: "center",
// //     justifyContent: "center", gap: "6px", transition: "all 0.15s",
// //     borderBottom: activeTab === tab ? `2px solid ${TEAL}` : "2px solid transparent",
// //     background: activeTab === tab ? "#f0fdfa" : "#f8f9fc",
// //     color: activeTab === tab ? TEAL_DARK : "#6b7a9a",
// //   });

// //   return (
// //     <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #d8dce8", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>

// //       {/* ── Panel header ── */}
// //       <div style={{ background: `linear-gradient(135deg, ${TEAL_DARK} 0%, ${TEAL} 100%)`, padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
// //         <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
// //           <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
// //             <ClipboardList size={16} color="#fff" />
// //           </div>
// //           <div>
// //             <div style={{ fontWeight: 900, fontSize: "16px", color: "#fff", letterSpacing: "0.3px" }}>Medication Administration Record</div>
// //             <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", marginTop: "1px" }}>MAR · {encounterNumber}</div>
// //           </div>
// //           {dueMeds.length > 0 && (
// //             <span style={{ background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: "13px", fontWeight: 800, padding: "3px 10px", borderRadius: "20px", marginLeft: "4px" }}>
// //               {dueMeds.filter(m => (m.dispense_status || "").toUpperCase() === "DISPENSED").length} due
// //             </span>
// //           )}
// //         </div>
// //         {onClose && (
// //           <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "7px", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer" }}>
// //             <X size={16} />
// //           </button>
// //         )}
// //       </div>

// //       {/* ── Tabs ── */}
// //       <div style={{ display: "flex", borderBottom: "1px solid #e0e4ef", flexShrink: 0 }}>
// //         <button style={tabBtn("paperGrid")} onClick={() => setActiveTab("paperGrid")}>
// //           <LayoutGrid size={13} /> Monthly MAR 
// //         </button>
// //         <button style={tabBtn("grid")} onClick={() => setActiveTab("grid")}>
// //           <LayoutGrid size={13} /> Weekly Chart
// //         </button>
// //         <button style={tabBtn("due")} onClick={() => setActiveTab("due")}>
// //           <Pill size={13} /> Due Medications
// //           {!loadingDue && dueMeds.length > 0 && (
// //             <span style={{ background: TEAL, color: "#fff", borderRadius: "20px", fontSize: "12px", fontWeight: 900, padding: "1px 6px", marginLeft: "2px" }}>
// //               {dueMeds.length}
// //             </span>
// //           )}
// //         </button>
// //         <button style={tabBtn("history")} onClick={() => setActiveTab("history")}>
// //           <History size={13} /> Administration History
// //           {!loadingHistory && history.length > 0 && (
// //             <span style={{ background: "#6b7a9a", color: "#fff", borderRadius: "20px", fontSize: "12px", fontWeight: 900, padding: "1px 6px", marginLeft: "2px" }}>
// //               {history.length}
// //             </span>
// //           )}
// //         </button>
// //       </div>

// //       {/* ── Tab Body ── */}
// //       <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px", flex: 1, overflowY: "auto" }}>

// //         {/* DUE TAB */}
// //         {activeTab === "due" && (
// //           <>
// //             {loadingDue ? (
// //               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a", fontSize: "16px" }}>
// //                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
// //                 Loading due medications…
// //               </div>
// //             ) : dueMeds.length === 0 ? (
// //               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a" }}>
// //                 <CheckCircle2 size={32} color="#a7f3d0" />
// //                 <span style={{ fontSize: "16px", fontWeight: 700, color: "#0f766e" }}>No due medications</span>
// //                 <span style={{ fontSize: "14px", color: "#8a94ad" }}>All scheduled medications have been administered</span>
// //               </div>
// //             ) : (
// //               dueMeds.map(med => (
// //                 <DueMedCard
// //                   key={med.prescription_id}
// //                   med={med}
// //                   encounterNumber={encounterNumber}
// //                   onSave={handleAdminSave}
// //                 />
// //               ))
// //             )}
// //           </>
// //         )}

// //         {/* HISTORY TAB */}
// //         {activeTab === "history" && (
// //           <>
// //             {loadingHistory ? (
// //               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a", fontSize: "16px" }}>
// //                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
// //                 Loading history…
// //               </div>
// //             ) : history.length === 0 ? (
// //               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a" }}>
// //                 <History size={32} color="#d1d5db" />
// //                 <span style={{ fontSize: "16px", fontWeight: 700 }}>No administration history</span>
// //                 <span style={{ fontSize: "14px", color: "#8a94ad" }}>Administered medications will appear here</span>
// //               </div>
// //             ) : (
// //               <>
// //                 <div style={{ fontSize: "13px", fontWeight: 700, color: "#8a94ad", textTransform: "uppercase", letterSpacing: "0.6px", padding: "0 2px 4px" }}>
// //                   {history.length} record{history.length !== 1 ? "s" : ""} found
// //                 </div>
// //                 {[...history]
// //                   .sort((a, b) => new Date(b.administered_at.replace(" ", "T")).getTime() - new Date(a.administered_at.replace(" ", "T")).getTime())
// //                   .map(record => (
// //                     <HistoryCard key={record.id} record={record} />
// //                   ))
// //                 }
// //               </>
// //             )}
// //           </>
// //         )}

// //         {/* WEEKLY GRID TAB */}
// //         {activeTab === "grid" && (
// //           <>
// //             {loadingWeeklyGrid ? (
// //               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a", fontSize: "16px" }}>
// //                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
// //                 Loading weekly chart…
// //               </div>
// //             ) : weeklyRows.length === 0 ? (
// //               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a" }}>
// //                 <LayoutGrid size={32} color="#d1d5db" />
// //                 <span style={{ fontSize: "16px", fontWeight: 700 }}>No medications scheduled this week</span>
// //               </div>
// //             ) : (
// //               <div style={{ overflowX: "auto", border: "1px solid #e0e4ef", borderRadius: "10px" }}>
// //                 <table style={{ borderCollapse: "collapse", width: "100%", minWidth: `${200 + weeklyHeaders.length * 120}px` }}>
// //                   <thead>
// //                     <tr>
// //                       <th style={{
// //                         position: "sticky", left: 0, zIndex: 1, background: "#f8f9fc",
// //                         textAlign: "left", padding: "10px 14px", fontSize: "13px", fontWeight: 800,
// //                         color: "#6b7a9a", textTransform: "uppercase", letterSpacing: "0.5px",
// //                         borderBottom: "1px solid #e0e4ef", borderRight: "1px solid #e0e4ef",
// //                         minWidth: "200px",
// //                       }}>
// //                         Medication
// //                       </th>
// //                       {weeklyHeaders.map(h => (
// //                         <th key={h.date} style={{
// //                           padding: "10px 12px", fontSize: "13px", fontWeight: 800, color: "#6b7a9a",
// //                           textTransform: "uppercase", letterSpacing: "0.5px", background: h.date === todayStr ? ACTIVE_COL_BG : "#f8f9fc",
// //                           borderBottom: "1px solid #e0e4ef", borderLeft: "1px solid #eef1f7", minWidth: "120px",
// //                         }}>
// //                           <div style={{ color: h.date === todayStr ? "#166534" : "inherit" }}>{h.day_name}</div>
// //                           <div style={{ fontWeight: 600, color: h.date === todayStr ? "#16a34a" : "#8a94ad", marginTop: "2px" }}>{h.display}</div>
// //                         </th>
// //                       ))}
// //                     </tr>
// //                   </thead>
// //                   <tbody>
// //                     {weeklyRows.map(row => {
// //                       const isInactive = row.prescription_status === "STOPPED" || row.prescription_status === "CANCELLED";
// //                       return (
// //                         <tr key={row.prescription_id} style={{ opacity: isInactive ? 0.55 : 1 }}>
// //                           <td style={{
// //                             position: "sticky", left: 0, zIndex: 1, background: "#fff",
// //                             padding: "10px 14px", borderBottom: "1px solid #eef1f7", borderRight: "1px solid #e0e4ef",
// //                             verticalAlign: "top",
// //                           }}>
// //                             <div style={{ fontWeight: 800, fontSize: "15px", color: "#1c2b4a" }}>{row.drug_name}</div>
// //                             <div style={{ fontSize: "13px", color: "#6b7a9a", marginTop: "2px" }}>{row.dosage_info}</div>
// //                             <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
// //                               <span style={{ fontSize: "12px", color: "#8a94ad" }}>Start: {row.start_date}</span>
// //                               <StatusBadge status={row.prescription_status} size="xs" />
// //                             </div>
// //                           </td>
// //                           {weeklyHeaders.map(h => {
// //                             const slots = row.days[h.date] || [];
// //                             return (
// //                               <td key={h.date} style={{
// //                                 padding: "8px", verticalAlign: "top",
// //                                 borderBottom: "1px solid #eef1f7", borderLeft: "1px solid #eef1f7",
// //                                 background: h.date === todayStr ? ACTIVE_COL_BG : "#fff",
// //                               }}>
// //                                 {slots.length === 0 ? (
// //                                   <span style={{ fontSize: "14px", color: "#cbd5e1" }}>—</span>
// //                                 ) : (
// //                                   slots.map((slot, i) => (
// //                                     <SlotChip
// //                                       key={i}
// //                                       slot={slot}
// //                                       isInactive={isInactive}
// //                                       clickable={!isInactive}
// //                                       onAdminister={() => setActiveSlot({ row, date: h.date, slot })}
// //                                       onViewDetail={() => setViewSlotDetail({ row, date: h.date, slot })}
// //                                     />
// //                                   ))
// //                                 )}
// //                               </td>
// //                             );
// //                           })}
// //                         </tr>
// //                       );
// //                     })}
// //                   </tbody>
// //                 </table>
// //               </div>
// //             )}
// //           </>
// //         )}

// //         {/* MONTHLY MAR GRID TAB */}
// //         {activeTab === "paperGrid" && (
// //           <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            
// //             {/* Header controls for Monthly View */}
// //             <div style={{ marginBottom: "16px", border: "2px solid #1e293b", borderRadius: "8px", overflow: "hidden" }}>
// //               <div style={{ background: "#f8fafc", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #1e293b" }}>
// //                 <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px" }}>
// //                   Personal Medication Administration Record (MAR)
// //                 </h2>
// //                 <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
// //                   <button onClick={handlePrevMonth} style={{ background: "none", border: "none", cursor: "pointer" }}><ChevronLeft size={20} /></button>
// //                   <span style={{ fontSize: "16px", fontWeight: 800, minWidth: "140px", textAlign: "center" }}>
// //                     {monthNames[currentMonth - 1]} {currentYear}
// //                   </span>
// //                   <button onClick={handleNextMonth} style={{ background: "none", border: "none", cursor: "pointer" }}><ChevronRight size={20} /></button>
// //                 </div>
// //               </div>
              
// //               <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", fontSize: "12px", background: "#fff" }}>
// //                 <div style={{ padding: "8px", borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1" }}>
// //                   <strong>PATIENT NAME:</strong> {encounterNumber}
// //                 </div>
// //                 <div style={{ padding: "8px", borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1" }}>
// //                   <strong>D.O.B.:</strong> —
// //                 </div>
// //                 <div style={{ padding: "8px", borderBottom: "1px solid #cbd5e1" }}>
// //                   <strong>ADDRESS:</strong> —
// //                 </div>
// //                 <div style={{ padding: "8px", borderRight: "1px solid #cbd5e1", gridColumn: "span 1" }}>
// //                   <strong>GP NAME:</strong> —
// //                 </div>
// //                 <div style={{ padding: "8px", gridColumn: "span 2" }}>
// //                   <strong>KNOWN ALLERGIES:</strong> <span style={{ color: "#ef4444", fontWeight: 800 }}>None Recorded</span>
// //                 </div>
// //               </div>
// //             </div>

// //             {loadingMonthlyGrid ? (
// //               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px", color: "#6b7a9a" }}>
// //                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
// //               </div>
// //             ) : monthlyRows.length === 0 ? (
// //               <div style={{ textAlign: "center", padding: "48px", color: "#6b7a9a", fontWeight: 700 }}>No medications scheduled this month</div>
// //             ) : (
// //               <div style={{ overflowX: "auto", border: "2px solid #1e293b", flex: 1 }}>
// //                 <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed", minWidth: "1200px" }}>
// //                   <thead>
// //                     <tr>
// //                       <th style={{ width: "250px", position: "sticky", left: 0, zIndex: 2, background: "#f8fafc", borderRight: "2px solid #1e293b", borderBottom: "2px solid #1e293b", padding: "8px", textAlign: "left", fontSize: "11px", textTransform: "uppercase" }}>
// //                         Medication<br/>
// //                         <span style={{ fontWeight: 400, color: "#64748b" }}>(Name, strength, dose, frequency, route)</span>
// //                       </th>
// //                       {monthlyHeaders.map(h => (
// //                         <th key={h.date} style={{ 
// //                           borderBottom: "2px solid #1e293b", borderRight: "1px solid #cbd5e1", 
// //                           background: h.date === todayStr ? ACTIVE_COL_BG : "#f8fafc", 
// //                           color: h.date === todayStr ? "#166534" : "inherit",
// //                           padding: "4px 0", width: "32px", textAlign: "center", fontSize: "12px" 
// //                         }}>
// //                           {h.display}
// //                         </th>
// //                       ))}
// //                     </tr>
// //                   </thead>
// //                   <tbody>
// //                     {monthlyRows.map(row => {
// //                       const isInactive = row.prescription_status === "STOPPED" || row.prescription_status === "CANCELLED";
// //                       return (
// //                         <tr key={row.prescription_id} style={{ opacity: isInactive ? 0.6 : 1, background: isInactive ? "#f1f5f9" : "#fff" }}>
                          
// //                           <td style={{ position: "sticky", left: 0, zIndex: 1, background: isInactive ? "#f1f5f9" : "#fff", borderRight: "2px solid #1e293b", borderBottom: "1px solid #cbd5e1", padding: "8px", verticalAlign: "top" }}>
// //                             <div style={{ fontWeight: 900, fontSize: "13px", color: "#0f172a" }}>{row.drug_name}</div>
// //                             <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px", fontWeight: 600 }}>{row.dosage_info}</div>
// //                             <div style={{ marginTop: "4px" }}>
// //                               <StatusBadge status={row.prescription_status} size="xs" />
// //                             </div>
// //                           </td>

// //                           {monthlyHeaders.map(h => {
// //                             const slots = row.days[h.date] || [];
// //                             const colBackground = h.date === todayStr ? ACTIVE_COL_BG : (isInactive ? "#f8fafc" : "#fff");
                            
// //                             return (
// //                               <td key={h.date} style={{ borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1", padding: "2px", verticalAlign: "top", background: colBackground }}>
// //                                 {slots.length === 0 ? null : (
// //                                   slots.map((slot, i) => (
// //                                     <CompactSlotChip
// //                                       key={i}
// //                                       slot={slot}
// //                                       isInactive={isInactive}
// //                                       clickable={!isInactive}
// //                                       onAction={() => {
// //                                         const isPending = (slot.status || "").toLowerCase() === "pending";
// //                                         if (isPending) setActiveSlot({ row, date: h.date, slot });
// //                                         else setViewSlotDetail({ row, date: h.date, slot });
// //                                       }}
// //                                     />
// //                                   ))
// //                                 )}
// //                               </td>
// //                             );
// //                           })}
// //                         </tr>
// //                       );
// //                     })}
// //                   </tbody>
// //                 </table>
// //               </div>
// //             )}
// //           </div>
// //         )}
// //       </div>

// //       {/* ── Shared Grid Slot Administer Modal ── */}
// //       {activeSlot && (
// //         <div
// //           style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "16px" }}
// //           onClick={() => setActiveSlot(null)}
// //         >
// //           <div style={{ width: "100%", maxWidth: "460px" }} onClick={e => e.stopPropagation()}>
// //             <AdminForm
// //               med={{
// //                 prescription_id: activeSlot.row.prescription_id,
// //                 drug_name: activeSlot.row.drug_name,
// //                 drug_id: dueMeds.find(d => d.prescription_id === activeSlot.row.prescription_id)?.drug_id,
// //                 ...parseDosageInfo(activeSlot.row.dosage_info),
// //                 instructions: null,
// //                 dispense_status: "DISPENSED",
// //                 prescribed_by: "",
// //                 prescribed_at: null,
// //                 last_admin_id: null,
// //                 last_admin_status: null,
// //                 last_administered_at: null,
// //                 last_administered_by: null,
// //                 last_administered_by_name: null,
// //                 due_status: activeSlot.row.due_status,
// //               }}
// //               encounterNumber={encounterNumber}
// //               onCancel={() => setActiveSlot(null)}
// //               onSave={handleGridAdminSave}
// //             />
// //           </div>
// //         </div>
// //       )}

// //       {/* ── Shared Grid Slot Detail (View) Modal ── */}
// //       {viewSlotDetail && (() => {
// //         const fullRecord = history.find(h => h.id === viewSlotDetail.slot.admin_id);
// //         const rc = routeConfig(fullRecord?.route || parseDosageInfo(viewSlotDetail.row.dosage_info).route);
// //         return (
// //           <div
// //             style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "16px" }}
// //             onClick={() => setViewSlotDetail(null)}
// //           >
// //             <div style={{ width: "100%", maxWidth: "460px", background: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
// //               <div style={{ background: rc.color, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", color: "#fff" }}>
// //                 <div>
// //                   <div style={{ fontSize: "16px", fontWeight: 800 }}>{viewSlotDetail.row.drug_name}</div>
// //                   <div style={{ fontSize: "13px", opacity: 0.85, marginTop: "2px" }}>
// //                     Scheduled {viewSlotDetail.slot.scheduled_label} · {fmtDt(viewSlotDetail.date)}
// //                   </div>
// //                 </div>
// //                 <button onClick={() => setViewSlotDetail(null)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "6px", width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer" }}>
// //                   <X size={16} />
// //                 </button>
// //               </div>
// //               <div style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
// //                 <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
// //                   <StatusBadge status={viewSlotDetail.slot.status} />
// //                   {fullRecord && <RouteBadge route={fullRecord.route} />}
// //                 </div>

// //                 {fullRecord ? (
// //                   <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
// //                     {([
// //                       ["Dose Given", fullRecord.dose],
// //                       ["Administered At", fmtDt(fullRecord.administered_at)],
// //                       ["Given By", fullRecord.administered_by_name],
// //                       rc.showDiluent && ["Diluent", fullRecord.diluent],
// //                       rc.showRate && ["Rate", fullRecord.rate_ml_hr ? `${fullRecord.rate_ml_hr} ml/hr` : null],
// //                       rc.showAccessSite && ["Access Site", fullRecord.access_site],
// //                       rc.showBatch && ["Batch No.", fullRecord.batch_number],
// //                     ].filter(Boolean) as [string, string | null][]).map(([k, v]) => (
// //                       <div key={k}>
// //                         <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
// //                         <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{v || "—"}</div>
// //                       </div>
// //                     ))}
// //                   </div>
// //                 ) : (
// //                   <div style={{ fontSize: "14px", color: "#6b7a9a" }}>
// //                     Recorded as <strong>{viewSlotDetail.slot.actual_label || viewSlotDetail.slot.status}</strong>.
// //                     {" "}Full administration details aren't available for this entry.
// //                   </div>
// //                 )}

// //                 {viewSlotDetail.slot.remarks && (
// //                   <div style={{ fontSize: "14px", color: "#6b7a9a", fontStyle: "italic" }}>
// //                     "{viewSlotDetail.slot.remarks}"
// //                   </div>
// //                 )}
// //               </div>
// //               <div style={{ padding: "14px 18px", borderTop: "1px solid #eef1f7", display: "flex", justifyContent: "flex-end" }}>
// //                 <button onClick={() => setViewSlotDetail(null)} style={secBtn}>Close</button>
// //               </div>
// //             </div>
// //           </div>
// //         );
// //       })()}
// //     </div>
// //   );
// // };

// // export default MARPanel;



// // import React, { useState, useEffect, useCallback } from "react";
// // import {
// //   X, Loader2, Clock, CheckCircle2, AlertTriangle, Pill,
// //   ClipboardList, History, ChevronDown, ChevronUp, Plus, LayoutGrid, ChevronLeft, ChevronRight
// // } from "lucide-react";
// // import { nursingService } from "../services/nursing.service";
// // import { useNotification } from "../context/NotificationContext";

// // // ─── Types ────────────────────────────────────────────────────────────────────

// // interface DueMedication {
// //   prescription_id: number;
// //   drug_name: string;
// //   drug_id?: number;
// //   dosage: string;
// //   frequency: string;
// //   route: string;
// //   instructions: string | null;
// //   dispense_status: string;
// //   prescribed_by: string;
// //   prescribed_at: string | null;
// //   last_admin_id: number | null;
// //   last_admin_status: string | null;
// //   last_administered_at: string | null;
// //   last_administered_by: string | null;
// //   last_administered_by_name: string | null;
// //   due_status: string;
// // }

// // interface AdminHistory {
// //   id: number;
// //   prescription_id: number;
// //   drug_id: number;
// //   drug_name: string;
// //   dosage: string;
// //   dose: string;
// //   route: string;
// //   frequency: string;
// //   diluent: string | null;
// //   rate_ml_hr: number | null;
// //   access_site: string | null;
// //   batch_number: string | null;
// //   administered_at: string;
// //   administered_by_name: string;
// //   status: string;
// //   remarks: string | null;
// // }

// // interface MarGridHeader {
// //   date: string;
// //   display: string;
// //   day_name: string;
// // }

// // interface MarGridSlot {
// //   status: string;
// //   scheduled_label: string;
// //   actual_label: string | null;
// //   admin_id: number | null;
// //   remarks: string | null;
// //   is_overdue: boolean;
// // }

// // interface MarGridRow {
// //   prescription_id: number;
// //   drug_name: string;
// //   dosage_info: string;
// //   start_date: string;
// //   prescription_status: string;
// //   due_status: string;
// //   days: Record<string, MarGridSlot[]>;
// // }

// // interface MARPanelProps {
// //   encounterNumber: string;
// //   onClose?: () => void;
// // }

// // // ─── Helpers ──────────────────────────────────────────────────────────────────

// // const getLocalTimestamp = (date: Date = new Date()): string => {
// //   const pad = (n: number) => n.toString().padStart(2, "0");
// //   return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
// // };

// // const getTodayDateString = (): string => {
// //   const date = new Date();
// //   const pad = (n: number) => n.toString().padStart(2, "0");
// //   return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
// // };

// // const toInputDatetime = (dt: string): string => {
// //   if (!dt) return "";
// //   return dt.replace(" ", "T").slice(0, 16);
// // };

// // const fromInputDatetime = (val: string): string => {
// //   if (!val) return "";
// //   return val.replace("T", " ") + ":00";
// // };

// // const fmtDt = (dt: string) => {
// //   if (!dt) return "—";
// //   try {
// //     return new Date(dt.replace(" ", "T")).toLocaleString("en-GB", {
// //       day: "2-digit", month: "2-digit", year: "2-digit",
// //       hour: "2-digit", minute: "2-digit",
// //     });
// //   } catch { return dt; }
// // };

// // const parseDosageInfo = (info: string): { dosage: string; frequency: string; route: string } => {
// //   const routeMatch = info.match(/\(([^)]+)\)\s*$/);
// //   const route = routeMatch ? routeMatch[1] : "";
// //   const withoutRoute = info.replace(/\([^)]+\)\s*$/, "").trim();
// //   const [dosage = "", frequency = ""] = withoutRoute.split(" - ").map(s => s.trim());
// //   return { dosage, frequency, route };
// // };

// // const routeConfig = (route: string): {
// //   showVolume: boolean;
// //   showDiluent: boolean;
// //   showRate: boolean;
// //   showFlush: boolean;
// //   showAccessSite: boolean;
// //   showBatch: boolean;
// //   label: string;
// //   color: string;
// //   bg: string;
// // } => {
// //   const r = (route || "").toUpperCase();
// //   if (r === "IV")      return { showVolume: true,  showDiluent: true,  showRate: true,  showFlush: true,  showAccessSite: true,  showBatch: false, label: "IV Infusion",     color: "#1d4ed8", bg: "#eff6ff" };
// //   if (r === "SC" || r === "IM") return { showVolume: true,  showDiluent: false, showRate: false, showFlush: false, showAccessSite: true,  showBatch: false, label: r + " Injection",  color: "#7c3aed", bg: "#f5f3ff" };
// //   if (r === "PO" || r === "SL") return { showVolume: false, showDiluent: false, showRate: false, showFlush: false, showAccessSite: false, showBatch: false, label: "Oral",            color: "#0f766e", bg: "#f0fdfa" };
// //   if (r === "BLOOD")  return { showVolume: true,  showDiluent: false, showRate: false, showFlush: false, showAccessSite: true,  showBatch: true,  label: "Blood Product",   color: "#b91c1c", bg: "#fef2f2" };
// //   if (r === "NG" || r === "PEG") return { showVolume: true, showDiluent: false, showRate: false, showFlush: false, showAccessSite: false, showBatch: false, label: "NG/PEG Feed",    color: "#b45309", bg: "#fefce8" };
// //   return { showVolume: true, showDiluent: true, showRate: false, showFlush: false, showAccessSite: false, showBatch: false, label: route, color: "#1c3d7a", bg: "#f8f9fc" };
// // };

// // // ─── Shared Styles ────────────────────────────────────────────────────────────

// // const lbl: React.CSSProperties = {
// //   display: "block", fontSize: "13px", fontWeight: 700, color: "#6b7a9a",
// //   textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "5px",
// // };
// // const inp: React.CSSProperties = {
// //   width: "100%", padding: "9px 12px", border: "1px solid #d0d6e6",
// //   borderRadius: "9px", fontSize: "16px", fontWeight: 500, color: "#1c2b4a",
// //   background: "#f8f9fc", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
// // };
// // const inpSm = (borderColor: string): React.CSSProperties => ({
// //   ...inp, background: "#fff", border: `1px solid ${borderColor}`,
// //   padding: "8px 10px", fontSize: "15px", borderRadius: "8px",
// // });
// // const secBtn: React.CSSProperties = {
// //   flex: "0 0 auto", padding: "8px 16px", border: "1px solid #d0d6e6",
// //   borderRadius: "9px", fontSize: "15px", fontWeight: 700, color: "#4a5568",
// //   background: "#fff", cursor: "pointer", whiteSpace: "nowrap",
// // };
// // const primBtn = (bg: string): React.CSSProperties => ({
// //   flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center",
// //   gap: "6px", padding: "8px 18px", border: "none", borderRadius: "9px",
// //   fontSize: "15px", fontWeight: 700, color: "#fff", background: bg, cursor: "pointer",
// //   whiteSpace: "nowrap",
// // });

// // // ─── Status badge ─────────────────────────────────────────────────────────────

// // const StatusBadge: React.FC<{ status: string; size?: "sm" | "xs" }> = ({ status, size = "sm" }) => {
// //   const s = (status || "").toUpperCase();
// //   const map: Record<string, { bg: string; color: string; dot: string }> = {
// //     GIVEN:      { bg: "#dcfce7", color: "#166534", dot: "#16a34a" },
// //     HELD:       { bg: "#fef9c3", color: "#854d0e", dot: "#ca8a04" },
// //     REFUSED:    { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626" },
// //     OMITTED:    { bg: "#f3f4f6", color: "#374151", dot: "#9ca3af" },
// //     DISPENSED:  { bg: "#dcfce7", color: "#166534", dot: "#16a34a" },
// //     PENDING:    { bg: "#fef9c3", color: "#854d0e", dot: "#ca8a04" },
// //     DUE:        { bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
// //     OVERDUE:    { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626" },
// //   };
// //   const cfg = map[s] || { bg: "#f3f4f6", color: "#374151", dot: "#9ca3af" };
// //   const fs = size === "xs" ? "12px" : "13px";
// //   return (
// //     <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: cfg.bg, color: cfg.color, fontSize: fs, fontWeight: 800, textTransform: "uppercase", padding: "3px 8px", borderRadius: "20px", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>
// //       <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: cfg.dot, display: "inline-block", flexShrink: 0 }} />
// //       {status}
// //     </span>
// //   );
// // };

// // const RouteBadge: React.FC<{ route: string }> = ({ route }) => (
// //   <span style={{ display: "inline-block", background: "#ccfbf1", color: "#0f766e", fontSize: "12px", fontWeight: 800, textTransform: "uppercase", padding: "3px 8px", borderRadius: "20px", letterSpacing: "0.5px" }}>
// //     {route}
// //   </span>
// // );

// // // ─── MAR Grid slot chip ────────────────────────────────────────────────────────

// // // Modified to handle "STOPPED" status by forcing gray colors
// // const slotColors = (slot: MarGridSlot, isInactive: boolean): { bg: string; color: string; border: string } => {
// //   const s = (slot.status || "").toLowerCase();
  
// //   if (s === "given" || s === "administered") return { bg: "#dcfce7", color: "#166534", border: "#86efac" };
  
// //   // If medication is STOPPED, ignore overdue/missed color coding
// //   if (isInactive) return { bg: "#f1f5f9", color: "#94a3b8", border: "#e2e8f0" };
  
// //   if (s === "missed" || s === "refused" || s === "omitted") return { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" };
// //   if (slot.is_overdue) return { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" };
// //   if (s === "held") return { bg: "#fef9c3", color: "#854d0e", border: "#fde047" };
  
// //   return { bg: "#f1f5f9", color: "#475569", border: "#e2e8f0" };
// // };

// // const SlotChip: React.FC<{ slot: MarGridSlot; isInactive: boolean; clickable: boolean; onAdminister: () => void; onViewDetail: () => void }> = ({ slot, isInactive, clickable, onAdminister, onViewDetail }) => {
// //   const c = slotColors(slot, isInactive);
// //   const isPending = (slot.status || "").toLowerCase() === "pending";
// //   const hasDetail = !isPending && (slot.admin_id != null || !!slot.actual_label || !!slot.remarks);
// //   const isActionable = (isPending && clickable) || hasDetail;
// //   return (
// //     <button
// //       type="button"
// //       onClick={isActionable ? (isPending ? onAdminister : onViewDetail) : undefined}
// //       title={slot.remarks || undefined}
// //       style={{
// //         display: "block", width: "100%", textAlign: "left", marginBottom: "4px",
// //         padding: "4px 7px", borderRadius: "6px", border: `1px solid ${c.border}`,
// //         background: c.bg, color: c.color, fontSize: "13px", fontWeight: 800,
// //         cursor: isActionable ? "pointer" : "default",
// //         whiteSpace: "nowrap",
// //       }}
// //     >
// //       {slot.actual_label || slot.scheduled_label}
// //     </button>
// //   );
// // };

// // // ─── Compact Slot Chip for Monthly Grid ───────────────────────────────────────

// // const CompactSlotChip: React.FC<{ slot: MarGridSlot; isInactive: boolean; clickable: boolean; onAction: () => void; }> = ({ slot, isInactive, clickable, onAction }) => {
// //   const c = slotColors(slot, isInactive);
// //   const isPending = (slot.status || "").toLowerCase() === "pending";
// //   const hasDetail = !isPending && (slot.admin_id != null || !!slot.actual_label || !!slot.remarks);
// //   const isActionable = (isPending && clickable) || hasDetail;
// //   return (
// //       <button
// //         type="button"
// //         onClick={isActionable ? onAction : undefined}
// //         title={slot.remarks || (isPending ? `Scheduled: ${slot.scheduled_label}` : `Given: ${slot.actual_label}`)}
// //         style={{
// //           display: "block", width: "100%", textAlign: "center", marginBottom: "2px",
// //           padding: "2px", borderRadius: "4px", border: `1px solid ${c.border}`,
// //           background: c.bg, color: c.color, fontSize: "10px", fontWeight: 700,
// //           cursor: isActionable ? "pointer" : "default", whiteSpace: "nowrap",
// //         }}
// //       >
// //         {slot.actual_label || slot.scheduled_label}
// //       </button>
// //     );
// // };

// // // ─── Inline Administration Form ───────────────────────────────────────────────

// // const AdminForm: React.FC<{
// //   med: DueMedication;
// //   encounterNumber: string;
// //   onCancel: () => void;
// //   onSave: () => void;
// // }> = ({ med, encounterNumber, onCancel, onSave }) => {
// //   const rc = routeConfig(med.route);
// //   const { notify } = useNotification();
// //   const [submitting, setSubmitting] = useState(false);

// //   const [dose, setDose] = useState(med.dosage || "");
// //   const [administeredAt, setAdministeredAt] = useState(toInputDatetime(getLocalTimestamp()));
// //   const [volumeMl, setVolumeMl] = useState("");
// //   const [diluent, setDiluent] = useState("");
// //   const [rateMlHr, setRateMlHr] = useState("");
// //   const [flushMl, setFlushMl] = useState("");
// //   const [accessSite, setAccessSite] = useState("");
// //   const [batchNumber, setBatchNumber] = useState("");
// //   const [remarks, setRemarks] = useState("");

// //   const handleSubmit = async (e: React.FormEvent) => {
// //     e.preventDefault();
// //     if (!dose.trim()) { notify("Dose is required", "warning"); return; }
// //     if (!administeredAt) { notify("Administered at time is required", "warning"); return; }
// //     if (rc.showVolume && !volumeMl) { notify("Volume (ml) is required for this route", "warning"); return; }

// //     setSubmitting(true);
// //     try {
// //       const payload: any = {
// //         encounter_number: encounterNumber,
// //         prescription_id: med.prescription_id,
// //         drug_id: med.drug_id,
// //         dose,
// //         route: med.route,
// //         administered_at: fromInputDatetime(administeredAt),
// //         status: "given",
// //       };
// //       if (rc.showVolume && volumeMl)   payload.volume_ml = Number(volumeMl);
// //       if (rc.showDiluent && diluent)   payload.diluent = diluent;
// //       if (rc.showRate && rateMlHr)     payload.rate_ml_hr = Number(rateMlHr);
// //       if (rc.showFlush && flushMl)     payload.flush_ml = Number(flushMl);
// //       if (rc.showAccessSite && accessSite) payload.access_site = accessSite;
// //       if (rc.showBatch && batchNumber) payload.batch_number = batchNumber;
// //       if (remarks.trim())              payload.remarks = remarks.trim();

// //       await nursingService.administerMedication(payload);
// //       notify(`${med.drug_name} administered successfully`, "success");
// //       onSave();
// //     } catch (err: any) {
// //       notify(err.response?.data?.message || "Failed to record administration", "error");
// //     } finally {
// //       setSubmitting(false);
// //     }
// //   };

// //   return (
// //     <div style={{ margin: "0 0 0", background: rc.bg, border: `1px solid ${rc.color}30`, borderRadius: "10px", padding: "14px 16px" }}>
// //       <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "14px", color: rc.color, fontWeight: 800, fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
// //         <Plus size={13} /> Record Administration — <span style={{ opacity: 0.85 }}>{rc.label}</span>
// //       </div>

// //       <form onSubmit={handleSubmit}>
// //         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
// //           <div>
// //             <label style={lbl}>Dose <span style={{ color: "#e11d48" }}>*</span></label>
// //             <input type="text" value={dose} onChange={e => setDose(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 500mg" autoFocus />
// //           </div>
// //           <div>
// //             <label style={lbl}>Administered At <span style={{ color: "#e11d48" }}>*</span></label>
// //             <input type="datetime-local" value={administeredAt} onChange={e => setAdministeredAt(e.target.value)} style={inpSm(`${rc.color}60`)} />
// //           </div>
// //         </div>

// //         {(rc.showVolume || rc.showDiluent) && (
// //           <div style={{ display: "grid", gridTemplateColumns: rc.showVolume && rc.showDiluent ? "1fr 1fr" : "1fr", gap: "10px", marginBottom: "10px" }}>
// //             {rc.showVolume && (
// //               <div>
// //                 <label style={lbl}>Volume (ml) <span style={{ color: "#e11d48" }}>*</span></label>
// //                 <input type="number" min="1" value={volumeMl} onChange={e => setVolumeMl(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 100" />
// //               </div>
// //             )}
// //             {rc.showDiluent && (
// //               <div>
// //                 <label style={lbl}>Diluent</label>
// //                 <input type="text" value={diluent} onChange={e => setDiluent(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. Normal Saline" />
// //               </div>
// //             )}
// //           </div>
// //         )}

// //         {(rc.showRate || rc.showFlush) && (
// //           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
// //             {rc.showRate && (
// //               <div>
// //                 <label style={lbl}>Rate (ml/hr)</label>
// //                 <input type="number" min="1" value={rateMlHr} onChange={e => setRateMlHr(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 50" />
// //               </div>
// //             )}
// //             {rc.showFlush && (
// //               <div>
// //                 <label style={lbl}>Flush (ml)</label>
// //                 <input type="number" min="0" value={flushMl} onChange={e => setFlushMl(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 10" />
// //               </div>
// //             )}
// //           </div>
// //         )}

// //         {(rc.showAccessSite || rc.showBatch) && (
// //           <div style={{ display: "grid", gridTemplateColumns: rc.showAccessSite && rc.showBatch ? "1fr 1fr" : "1fr", gap: "10px", marginBottom: "10px" }}>
// //             {rc.showAccessSite && (
// //               <div>
// //                 <label style={lbl}>Access Site</label>
// //                 <input type="text" value={accessSite} onChange={e => setAccessSite(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. Right forearm" />
// //               </div>
// //             )}
// //             {rc.showBatch && (
// //               <div>
// //                 <label style={lbl}>Batch / Unit Number</label>
// //                 <input type="text" value={batchNumber} onChange={e => setBatchNumber(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. PRBC-20240524" />
// //               </div>
// //             )}
// //           </div>
// //         )}

// //         <div style={{ marginBottom: "12px" }}>
// //           <label style={lbl}>Remarks <span style={{ fontWeight: 400, color: "#aaa", textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
// //           <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} style={inpSm(`${rc.color}40`)} placeholder="e.g. Given slowly over 20 minutes" />
// //         </div>

// //         <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
// //           <button type="button" style={secBtn} onClick={onCancel}>Cancel</button>
// //           <button type="submit" disabled={submitting} style={primBtn(rc.color)}>
// //             {submitting ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle2 size={13} />}
// //             Mark as Given
// //           </button>
// //         </div>
// //       </form>
// //     </div>
// //   );
// // };

// // // ─── Due Medication Card ──────────────────────────────────────────────────────

// // const DueMedCard: React.FC<{
// //   med: DueMedication;
// //   encounterNumber: string;
// //   onSave: () => void;
// // }> = ({ med, encounterNumber, onSave }) => {
// //   const [showForm, setShowForm] = useState(false);
// //   const isDispensed = (med.dispense_status || "").toUpperCase() === "DISPENSED";
// //   const rc = routeConfig(med.route);

// //   return (
// //     <div style={{
// //       background: "#fff",
// //       borderRadius: "12px",
// //       border: "1px solid #e0e4ef",
// //       boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
// //       borderLeft: `4px solid ${isDispensed ? rc.color : "#d1d5db"}`,
// //       opacity: isDispensed ? 1 : 0.75,
// //       marginBottom: "12px",
// //     }}>
// //       <div style={{ padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
// //         <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `${isDispensed ? rc.color : "#6b7280"}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
// //           <Pill size={18} color={isDispensed ? rc.color : "#6b7280"} />
// //         </div>

// //         <div style={{ flex: 1, minWidth: 0 }}>
// //           <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
// //             <span style={{ fontWeight: 800, fontSize: "18px", color: "#1c2b4a" }}>{med.drug_name}</span>
// //             <RouteBadge route={med.route} />
// //             <StatusBadge status={med.due_status} size="xs" />
// //             {!isDispensed && (
// //               <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#fef9c3", color: "#854d0e", fontSize: "12px", fontWeight: 800, padding: "3px 8px", borderRadius: "20px", border: "1px solid #fde047" }}>
// //                 <AlertTriangle size={9} /> Not Yet Dispensed
// //               </span>
// //             )}
// //           </div>

// //           <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "4px" }}>
// //             {[
// //               ["Dose", med.dosage],
// //               ["Frequency", med.frequency],
// //               ["Prescribed by", med.prescribed_by],
// //             ].map(([k, v]) => (
// //               <div key={k}>
// //                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
// //                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{v || "—"}</div>
// //               </div>
// //             ))}
// //             {med.prescribed_at && (
// //               <div>
// //                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Prescribed On</div>
// //                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{fmtDt(med.prescribed_at)}</div>
// //               </div>
// //             )}
// //             {med.last_administered_at && (
// //               <div>
// //                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Last Given</div>
// //                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{fmtDt(med.last_administered_at)}</div>
// //               </div>
// //             )}
// //           </div>

// //           {med.instructions && (
// //             <div style={{ marginTop: "6px", fontSize: "14px", color: "#6b7a9a", fontStyle: "italic" }}>
// //               ℹ {med.instructions}
// //             </div>
// //           )}
// //         </div>

// //         {isDispensed && (
// //           <button
// //             onClick={() => setShowForm(f => !f)}
// //             style={{
// //               display: "flex", alignItems: "center", gap: "4px",
// //               padding: "7px 14px", border: `1.5px solid ${rc.color}`,
// //               borderRadius: "8px", background: showForm ? rc.color : "#fff",
// //               color: showForm ? "#fff" : rc.color,
// //               fontSize: "14px", fontWeight: 800, cursor: "pointer",
// //               whiteSpace: "nowrap", transition: "all 0.15s", flexShrink: 0,
// //             }}
// //           >
// //             <CheckCircle2 size={12} />
// //             {showForm ? "Cancel" : "Give"}
// //           </button>
// //         )}
// //       </div>

// //       {showForm && isDispensed && (
// //         <div style={{ padding: "0 14px 14px" }}>
// //           <AdminForm
// //             med={med}
// //             encounterNumber={encounterNumber}
// //             onCancel={() => setShowForm(false)}
// //             onSave={() => { setShowForm(false); onSave(); }}
// //           />
// //         </div>
// //       )}
// //     </div>
// //   );
// // };

// // // ─── History Card ─────────────────────────────────────────────────────────────

// // const HistoryCard: React.FC<{ record: AdminHistory }> = ({ record }) => {
// //   const [expanded, setExpanded] = useState(false);
// //   const rc = routeConfig(record.route);

// //   return (
// //     <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e0e4ef", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", borderLeft: `3px solid ${rc.color}`, marginBottom: "10px" }}>
// //       <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
// //         <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: `${rc.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
// //           <Pill size={14} color={rc.color} />
// //         </div>

// //         <div style={{ flex: 1, minWidth: 0 }}>
// //           <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "2px" }}>
// //             <span style={{ fontWeight: 800, fontSize: "16px", color: "#1c2b4a" }}>{record.drug_name}</span>
// //             <RouteBadge route={record.route} />
// //             <StatusBadge status={record.status} size="xs" />
// //           </div>
// //           <div style={{ fontSize: "14px", color: "#6b7a9a" }}>
// //             <span style={{ fontWeight: 600, color: "#1c2b4a" }}>{record.dose}</span>
// //             {" · "}
// //             <Clock size={9} style={{ display: "inline", verticalAlign: "middle", marginRight: "2px" }} />
// //             {fmtDt(record.administered_at)}
// //             {" · by "}<span style={{ fontWeight: 600, color: "#1c2b4a" }}>{record.administered_by_name}</span>
// //           </div>
// //         </div>

// //         <button
// //           onClick={() => setExpanded(e => !e)}
// //           style={{ background: "none", border: "none", cursor: "pointer", color: "#8a94ad", padding: "4px", borderRadius: "6px", lineHeight: 1, flexShrink: 0 }}
// //         >
// //           {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
// //         </button>
// //       </div>

// //       {expanded && (
// //         <div style={{ padding: "0 14px 12px", background: "#f8f9fc", borderTop: "1px dashed #e0e4ef" }}>
// //           <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", paddingTop: "10px" }}>
// //             {([
// //               ["Prescribed Dose", record.dosage],
// //               ["Frequency", record.frequency],
// //               rc.showDiluent && ["Diluent", record.diluent],
// //               rc.showRate && ["Rate", record.rate_ml_hr ? `${record.rate_ml_hr} ml/hr` : null],
// //               rc.showAccessSite && ["Access Site", record.access_site],
// //               rc.showBatch && ["Batch No.", record.batch_number],
// //             ].filter(Boolean) as [string, string | null][]).map(([k, v]) => (
// //               <div key={k}>
// //                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
// //                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{v || "—"}</div>
// //               </div>
// //             ))}
// //           </div>
// //           {record.remarks && (
// //             <div style={{ marginTop: "8px", fontSize: "14px", color: "#6b7a9a", fontStyle: "italic" }}>
// //               "{record.remarks}"
// //             </div>
// //           )}
// //         </div>
// //       )}
// //     </div>
// //   );
// // };

// // // ─── Main MARPanel ────────────────────────────────────────────────────────────

// // const MARPanel: React.FC<MARPanelProps> = ({ encounterNumber, onClose }) => {
// //   const [activeTab, setActiveTab] = useState<"paperGrid" | "grid" | "due" | "history">("paperGrid");
// //   const [dueMeds, setDueMeds] = useState<DueMedication[]>([]);
// //   const [history, setHistory] = useState<AdminHistory[]>([]);
// //   const [loadingDue, setLoadingDue] = useState(true);
// //   const [loadingHistory, setLoadingHistory] = useState(true);
  
// //   // Calendar Grid State
// //   const today = new Date();
// //   const todayStr = getTodayDateString(); // Used to highlight the current active column
  
// //   const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
// //   const [currentYear, setCurrentYear] = useState(today.getFullYear());
// //   const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// //   const [gridHeaders, setGridHeaders] = useState<MarGridHeader[]>([]);
// //   const [gridRows, setGridRows] = useState<MarGridRow[]>([]);
// //   const [loadingGrid, setLoadingGrid] = useState(true);
// //   const [activeSlot, setActiveSlot] = useState<{ row: MarGridRow; date: string; slot: MarGridSlot } | null>(null);
// //   const [viewSlotDetail, setViewSlotDetail] = useState<{ row: MarGridRow; date: string; slot: MarGridSlot } | null>(null);

// //   const handlePrevMonth = () => {
// //     if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(y => y - 1); }
// //     else { setCurrentMonth(m => m - 1); }
// //   };

// //   const handleNextMonth = () => {
// //     if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(y => y + 1); }
// //     else { setCurrentMonth(m => m + 1); }
// //   };

// //   const fetchDue = useCallback(async () => {
// //     setLoadingDue(true);
// //     try {
// //       const res = await nursingService.getMARDue(encounterNumber);
// //       setDueMeds(res.data || []);
// //     } catch {
// //       setDueMeds([]);
// //     } finally {
// //       setLoadingDue(false);
// //     }
// //   }, [encounterNumber]);

// //   const fetchHistory = useCallback(async () => {
// //     setLoadingHistory(true);
// //     try {
// //       const res = await nursingService.getMARHistory(encounterNumber);
// //       setHistory(res.data || []);
// //     } catch {
// //       setHistory([]);
// //     } finally {
// //       setLoadingHistory(false);
// //     }
// //   }, [encounterNumber]);

// //   const fetchGrid = useCallback(async () => {
// //     setLoadingGrid(true);
// //     try {
// //       // API call to the new monthly endpoint
// //       // You must add this method in your frontend nursingService matching the new PHP endpoint
// //       const res = await nursingService.getMARDueHistory(encounterNumber, currentMonth, currentYear);
// //       setGridHeaders(res.data?.headers || []);
// //       setGridRows(res.data?.rows || []);
// //     } catch {
// //       setGridHeaders([]);
// //       setGridRows([]);
// //     } finally {
// //       setLoadingGrid(false);
// //     }
// //   }, [encounterNumber, currentMonth, currentYear]);

// //   useEffect(() => {
// //     fetchDue();
// //     fetchHistory();
// //   }, [fetchDue, fetchHistory]);

// //   useEffect(() => {
// //     fetchGrid();
// //   }, [fetchGrid]);

// //   const handleAdminSave = () => {
// //     fetchDue();
// //     fetchHistory();
// //   };

// //   const handleGridAdminSave = () => {
// //     setActiveSlot(null);
// //     fetchDue();
// //     fetchHistory();
// //     fetchGrid();
// //   };

// //   const TEAL = "#0d9488";
// //   const TEAL_DARK = "#0f766e";
// //   const ACTIVE_COL_BG = "#dcfce7"; // Light green background for today

// //   const tabBtn = (tab: "due" | "history" | "grid" | "paperGrid"): React.CSSProperties => ({
// //     flex: 1, padding: "9px 12px", border: "none", cursor: "pointer",
// //     fontSize: "15px", fontWeight: 800, display: "flex", alignItems: "center",
// //     justifyContent: "center", gap: "6px", transition: "all 0.15s",
// //     borderBottom: activeTab === tab ? `2px solid ${TEAL}` : "2px solid transparent",
// //     background: activeTab === tab ? "#f0fdfa" : "#f8f9fc",
// //     color: activeTab === tab ? TEAL_DARK : "#6b7a9a",
// //   });

// //   return (
// //     <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #d8dce8", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>

// //       {/* ── Panel header ── */}
// //       <div style={{ background: `linear-gradient(135deg, ${TEAL_DARK} 0%, ${TEAL} 100%)`, padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
// //         <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
// //           <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
// //             <ClipboardList size={16} color="#fff" />
// //           </div>
// //           <div>
// //             <div style={{ fontWeight: 900, fontSize: "16px", color: "#fff", letterSpacing: "0.3px" }}>Medication Administration Record</div>
// //             <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", marginTop: "1px" }}>MAR · {encounterNumber}</div>
// //           </div>
// //           {dueMeds.length > 0 && (
// //             <span style={{ background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: "13px", fontWeight: 800, padding: "3px 10px", borderRadius: "20px", marginLeft: "4px" }}>
// //               {dueMeds.filter(m => (m.dispense_status || "").toUpperCase() === "DISPENSED").length} due
// //             </span>
// //           )}
// //         </div>
// //         {onClose && (
// //           <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "7px", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer" }}>
// //             <X size={16} />
// //           </button>
// //         )}
// //       </div>

// //       {/* ── Tabs ── */}
// //       <div style={{ display: "flex", borderBottom: "1px solid #e0e4ef", flexShrink: 0 }}>
// //         <button style={tabBtn("paperGrid")} onClick={() => setActiveTab("paperGrid")}>
// //           <LayoutGrid size={13} /> Monthly MAR 
// //         </button>
// //         <button style={tabBtn("grid")} onClick={() => setActiveTab("grid")}>
// //           <LayoutGrid size={13} /> Weekly Chart
// //         </button>
// //         <button style={tabBtn("due")} onClick={() => setActiveTab("due")}>
// //           <Pill size={13} /> Due Medications
// //           {!loadingDue && dueMeds.length > 0 && (
// //             <span style={{ background: TEAL, color: "#fff", borderRadius: "20px", fontSize: "12px", fontWeight: 900, padding: "1px 6px", marginLeft: "2px" }}>
// //               {dueMeds.length}
// //             </span>
// //           )}
// //         </button>
// //         <button style={tabBtn("history")} onClick={() => setActiveTab("history")}>
// //           <History size={13} /> Administration History
// //           {!loadingHistory && history.length > 0 && (
// //             <span style={{ background: "#6b7a9a", color: "#fff", borderRadius: "20px", fontSize: "12px", fontWeight: 900, padding: "1px 6px", marginLeft: "2px" }}>
// //               {history.length}
// //             </span>
// //           )}
// //         </button>
// //       </div>

// //       {/* ── Tab Body ── */}
// //       <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px", flex: 1, overflowY: "auto" }}>

// //         {/* DUE TAB */}
// //         {activeTab === "due" && (
// //           <>
// //             {loadingDue ? (
// //               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a", fontSize: "16px" }}>
// //                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
// //                 Loading due medications…
// //               </div>
// //             ) : dueMeds.length === 0 ? (
// //               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a" }}>
// //                 <CheckCircle2 size={32} color="#a7f3d0" />
// //                 <span style={{ fontSize: "16px", fontWeight: 700, color: "#0f766e" }}>No due medications</span>
// //                 <span style={{ fontSize: "14px", color: "#8a94ad" }}>All scheduled medications have been administered</span>
// //               </div>
// //             ) : (
// //               dueMeds.map(med => (
// //                 <DueMedCard
// //                   key={med.prescription_id}
// //                   med={med}
// //                   encounterNumber={encounterNumber}
// //                   onSave={handleAdminSave}
// //                 />
// //               ))
// //             )}
// //           </>
// //         )}

// //         {/* HISTORY TAB */}
// //         {activeTab === "history" && (
// //           <>
// //             {loadingHistory ? (
// //               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a", fontSize: "16px" }}>
// //                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
// //                 Loading history…
// //               </div>
// //             ) : history.length === 0 ? (
// //               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a" }}>
// //                 <History size={32} color="#d1d5db" />
// //                 <span style={{ fontSize: "16px", fontWeight: 700 }}>No administration history</span>
// //                 <span style={{ fontSize: "14px", color: "#8a94ad" }}>Administered medications will appear here</span>
// //               </div>
// //             ) : (
// //               <>
// //                 <div style={{ fontSize: "13px", fontWeight: 700, color: "#8a94ad", textTransform: "uppercase", letterSpacing: "0.6px", padding: "0 2px 4px" }}>
// //                   {history.length} record{history.length !== 1 ? "s" : ""} found
// //                 </div>
// //                 {[...history]
// //                   .sort((a, b) => new Date(b.administered_at.replace(" ", "T")).getTime() - new Date(a.administered_at.replace(" ", "T")).getTime())
// //                   .map(record => (
// //                     <HistoryCard key={record.id} record={record} />
// //                   ))
// //                 }
// //               </>
// //             )}
// //           </>
// //         )}

// //         {/* WEEKLY GRID TAB */}
// //         {activeTab === "grid" && (
// //           <>
// //             {loadingGrid ? (
// //               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a", fontSize: "16px" }}>
// //                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
// //                 Loading MAR chart…
// //               </div>
// //             ) : gridRows.length === 0 ? (
// //               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a" }}>
// //                 <LayoutGrid size={32} color="#d1d5db" />
// //                 <span style={{ fontSize: "16px", fontWeight: 700 }}>No medications scheduled this week</span>
// //               </div>
// //             ) : (
// //               <div style={{ overflowX: "auto", border: "1px solid #e0e4ef", borderRadius: "10px" }}>
// //                 <table style={{ borderCollapse: "collapse", width: "100%", minWidth: `${200 + gridHeaders.length * 120}px` }}>
// //                   <thead>
// //                     <tr>
// //                       <th style={{
// //                         position: "sticky", left: 0, zIndex: 1, background: "#f8f9fc",
// //                         textAlign: "left", padding: "10px 14px", fontSize: "13px", fontWeight: 800,
// //                         color: "#6b7a9a", textTransform: "uppercase", letterSpacing: "0.5px",
// //                         borderBottom: "1px solid #e0e4ef", borderRight: "1px solid #e0e4ef",
// //                         minWidth: "200px",
// //                       }}>
// //                         Medication
// //                       </th>
// //                       {gridHeaders.map(h => (
// //                         <th key={h.date} style={{
// //                           padding: "10px 12px", fontSize: "13px", fontWeight: 800, color: "#6b7a9a",
// //                           textTransform: "uppercase", letterSpacing: "0.5px", background: h.date === todayStr ? ACTIVE_COL_BG : "#f8f9fc",
// //                           borderBottom: "1px solid #e0e4ef", borderLeft: "1px solid #eef1f7", minWidth: "120px",
// //                         }}>
// //                           <div style={{ color: h.date === todayStr ? "#166534" : "inherit" }}>{h.day_name}</div>
// //                           <div style={{ fontWeight: 600, color: h.date === todayStr ? "#16a34a" : "#8a94ad", marginTop: "2px" }}>{h.display}</div>
// //                         </th>
// //                       ))}
// //                     </tr>
// //                   </thead>
// //                   <tbody>
// //                     {gridRows.map(row => {
// //                       const isInactive = row.prescription_status === "STOPPED" || row.prescription_status === "CANCELLED";
// //                       return (
// //                         <tr key={row.prescription_id} style={{ opacity: isInactive ? 0.55 : 1 }}>
// //                           <td style={{
// //                             position: "sticky", left: 0, zIndex: 1, background: "#fff",
// //                             padding: "10px 14px", borderBottom: "1px solid #eef1f7", borderRight: "1px solid #e0e4ef",
// //                             verticalAlign: "top",
// //                           }}>
// //                             <div style={{ fontWeight: 800, fontSize: "15px", color: "#1c2b4a" }}>{row.drug_name}</div>
// //                             <div style={{ fontSize: "13px", color: "#6b7a9a", marginTop: "2px" }}>{row.dosage_info}</div>
// //                             <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
// //                               <span style={{ fontSize: "12px", color: "#8a94ad" }}>Start: {row.start_date}</span>
// //                               <StatusBadge status={row.prescription_status} size="xs" />
// //                             </div>
// //                           </td>
// //                           {gridHeaders.map(h => {
// //                             const slots = row.days[h.date] || [];
// //                             return (
// //                               <td key={h.date} style={{
// //                                 padding: "8px", verticalAlign: "top",
// //                                 borderBottom: "1px solid #eef1f7", borderLeft: "1px solid #eef1f7",
// //                                 background: h.date === todayStr ? ACTIVE_COL_BG : "#fff",
// //                               }}>
// //                                 {slots.length === 0 ? (
// //                                   <span style={{ fontSize: "14px", color: "#cbd5e1" }}>—</span>
// //                                 ) : (
// //                                   slots.map((slot, i) => (
// //                                     <SlotChip
// //                                       key={i}
// //                                       slot={slot}
// //                                       isInactive={isInactive}
// //                                       clickable={!isInactive}
// //                                       onAdminister={() => setActiveSlot({ row, date: h.date, slot })}
// //                                       onViewDetail={() => setViewSlotDetail({ row, date: h.date, slot })}
// //                                     />
// //                                   ))
// //                                 )}
// //                               </td>
// //                             );
// //                           })}
// //                         </tr>
// //                       );
// //                     })}
// //                   </tbody>
// //                 </table>
// //               </div>
// //             )}
// //           </>
// //         )}

// //         {/* MONTHLY MAR GRID TAB */}
// //         {activeTab === "paperGrid" && (
// //           <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            
// //             <div style={{ marginBottom: "16px", border: "2px solid #1e293b", borderRadius: "8px", overflow: "hidden" }}>
// //               <div style={{ background: "#f8fafc", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #1e293b" }}>
// //                 <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px" }}>
// //                   Personal Medication Administration Record (MAR)
// //                 </h2>
// //                 <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
// //                   <button onClick={handlePrevMonth} style={{ background: "none", border: "none", cursor: "pointer" }}><ChevronLeft size={20} /></button>
// //                   <span style={{ fontSize: "16px", fontWeight: 800, minWidth: "140px", textAlign: "center" }}>
// //                     {monthNames[currentMonth - 1]} {currentYear}
// //                   </span>
// //                   <button onClick={handleNextMonth} style={{ background: "none", border: "none", cursor: "pointer" }}><ChevronRight size={20} /></button>
// //                 </div>
// //               </div>
              
// //               <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", fontSize: "12px", background: "#fff" }}>
// //                 <div style={{ padding: "8px", borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1" }}>
// //                   <strong>PATIENT NAME:</strong> {encounterNumber}
// //                 </div>
// //                 <div style={{ padding: "8px", borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1" }}>
// //                   <strong>D.O.B.:</strong> —
// //                 </div>
// //                 <div style={{ padding: "8px", borderBottom: "1px solid #cbd5e1" }}>
// //                   <strong>ADDRESS:</strong> —
// //                 </div>
// //                 <div style={{ padding: "8px", borderRight: "1px solid #cbd5e1", gridColumn: "span 1" }}>
// //                   <strong>GP NAME:</strong> —
// //                 </div>
// //                 <div style={{ padding: "8px", gridColumn: "span 2" }}>
// //                   <strong>KNOWN ALLERGIES:</strong> <span style={{ color: "#ef4444", fontWeight: 800 }}>None Recorded</span>
// //                 </div>
// //               </div>
// //             </div>

// //             {loadingGrid ? (
// //               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px", color: "#6b7a9a" }}>
// //                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
// //               </div>
// //             ) : gridRows.length === 0 ? (
// //               <div style={{ textAlign: "center", padding: "48px", color: "#6b7a9a", fontWeight: 700 }}>No medications scheduled this month</div>
// //             ) : (
// //               <div style={{ overflowX: "auto", border: "2px solid #1e293b", flex: 1 }}>
// //                 <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed", minWidth: "1200px" }}>
// //                   <thead>
// //                     <tr>
// //                       <th style={{ width: "250px", position: "sticky", left: 0, zIndex: 2, background: "#f8fafc", borderRight: "2px solid #1e293b", borderBottom: "2px solid #1e293b", padding: "8px", textAlign: "left", fontSize: "11px", textTransform: "uppercase" }}>
// //                         Medication<br/>
// //                         <span style={{ fontWeight: 400, color: "#64748b" }}>(Name, strength, dose, frequency, route)</span>
// //                       </th>
// //                       {gridHeaders.map(h => (
// //                         <th key={h.date} style={{ 
// //                           borderBottom: "2px solid #1e293b", borderRight: "1px solid #cbd5e1", 
// //                           background: h.date === todayStr ? ACTIVE_COL_BG : "#f8fafc", 
// //                           color: h.date === todayStr ? "#166534" : "inherit",
// //                           padding: "4px 0", width: "32px", textAlign: "center", fontSize: "12px" 
// //                         }}>
// //                           {h.display}
// //                         </th>
// //                       ))}
// //                     </tr>
// //                   </thead>
// //                   <tbody>
// //                     {gridRows.map(row => {
// //                       const isInactive = row.prescription_status === "STOPPED" || row.prescription_status === "CANCELLED";
// //                       return (
// //                         <tr key={row.prescription_id} style={{ opacity: isInactive ? 0.6 : 1, background: isInactive ? "#f1f5f9" : "#fff" }}>
                          
// //                           <td style={{ position: "sticky", left: 0, zIndex: 1, background: isInactive ? "#f1f5f9" : "#fff", borderRight: "2px solid #1e293b", borderBottom: "1px solid #cbd5e1", padding: "8px", verticalAlign: "top" }}>
// //                             <div style={{ fontWeight: 900, fontSize: "13px", color: "#0f172a" }}>{row.drug_name}</div>
// //                             <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px", fontWeight: 600 }}>{row.dosage_info}</div>
// //                             <div style={{ marginTop: "4px" }}>
// //                               <StatusBadge status={row.prescription_status} size="xs" />
// //                             </div>
// //                           </td>

// //                           {gridHeaders.map(h => {
// //                             const slots = row.days[h.date] || [];
// //                             const colBackground = h.date === todayStr ? ACTIVE_COL_BG : (isInactive ? "#f8fafc" : "#fff");
                            
// //                             return (
// //                               <td key={h.date} style={{ borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1", padding: "2px", verticalAlign: "top", background: colBackground }}>
// //                                 {slots.length === 0 ? null : (
// //                                   slots.map((slot, i) => (
// //                                     <CompactSlotChip
// //                                       key={i}
// //                                       slot={slot}
// //                                       isInactive={isInactive}
// //                                       clickable={!isInactive}
// //                                       onAction={() => {
// //                                         const isPending = (slot.status || "").toLowerCase() === "pending";
// //                                         if (isPending) setActiveSlot({ row, date: h.date, slot });
// //                                         else setViewSlotDetail({ row, date: h.date, slot });
// //                                       }}
// //                                     />
// //                                   ))
// //                                 )}
// //                               </td>
// //                             );
// //                           })}
// //                         </tr>
// //                       );
// //                     })}
// //                   </tbody>
// //                 </table>
// //               </div>
// //             )}
// //           </div>
// //         )}
// //       </div>

// //       {/* ── Grid slot administer modal ── */}
// //       {activeSlot && (
// //         <div
// //           style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "16px" }}
// //           onClick={() => setActiveSlot(null)}
// //         >
// //           <div style={{ width: "100%", maxWidth: "460px" }} onClick={e => e.stopPropagation()}>
// //             <AdminForm
// //               med={{
// //                 prescription_id: activeSlot.row.prescription_id,
// //                 drug_name: activeSlot.row.drug_name,
// //                 drug_id: dueMeds.find(d => d.prescription_id === activeSlot.row.prescription_id)?.drug_id,
// //                 ...parseDosageInfo(activeSlot.row.dosage_info),
// //                 instructions: null,
// //                 dispense_status: "DISPENSED",
// //                 prescribed_by: "",
// //                 prescribed_at: null,
// //                 last_admin_id: null,
// //                 last_admin_status: null,
// //                 last_administered_at: null,
// //                 last_administered_by: null,
// //                 last_administered_by_name: null,
// //                 due_status: activeSlot.row.due_status,
// //               }}
// //               encounterNumber={encounterNumber}
// //               onCancel={() => setActiveSlot(null)}
// //               onSave={handleGridAdminSave}
// //             />
// //           </div>
// //         </div>
// //       )}

// //       {/* ── Grid slot detail (view) modal ── */}
// //       {viewSlotDetail && (() => {
// //         const fullRecord = history.find(h => h.id === viewSlotDetail.slot.admin_id);
// //         const rc = routeConfig(fullRecord?.route || parseDosageInfo(viewSlotDetail.row.dosage_info).route);
// //         return (
// //           <div
// //             style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "16px" }}
// //             onClick={() => setViewSlotDetail(null)}
// //           >
// //             <div style={{ width: "100%", maxWidth: "460px", background: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
// //               <div style={{ background: rc.color, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", color: "#fff" }}>
// //                 <div>
// //                   <div style={{ fontSize: "16px", fontWeight: 800 }}>{viewSlotDetail.row.drug_name}</div>
// //                   <div style={{ fontSize: "13px", opacity: 0.85, marginTop: "2px" }}>
// //                     Scheduled {viewSlotDetail.slot.scheduled_label} · {viewSlotDetail.date}
// //                   </div>
// //                 </div>
// //                 <button onClick={() => setViewSlotDetail(null)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "6px", width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer" }}>
// //                   <X size={16} />
// //                 </button>
// //               </div>
// //               <div style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
// //                 <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
// //                   <StatusBadge status={viewSlotDetail.slot.status} />
// //                   {fullRecord && <RouteBadge route={fullRecord.route} />}
// //                 </div>

// //                 {fullRecord ? (
// //                   <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
// //                     {([
// //                       ["Dose Given", fullRecord.dose],
// //                       ["Administered At", fmtDt(fullRecord.administered_at)],
// //                       ["Given By", fullRecord.administered_by_name],
// //                       rc.showDiluent && ["Diluent", fullRecord.diluent],
// //                       rc.showRate && ["Rate", fullRecord.rate_ml_hr ? `${fullRecord.rate_ml_hr} ml/hr` : null],
// //                       rc.showAccessSite && ["Access Site", fullRecord.access_site],
// //                       rc.showBatch && ["Batch No.", fullRecord.batch_number],
// //                     ].filter(Boolean) as [string, string | null][]).map(([k, v]) => (
// //                       <div key={k}>
// //                         <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
// //                         <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{v || "—"}</div>
// //                       </div>
// //                     ))}
// //                   </div>
// //                 ) : (
// //                   <div style={{ fontSize: "14px", color: "#6b7a9a" }}>
// //                     Recorded as <strong>{viewSlotDetail.slot.actual_label || viewSlotDetail.slot.status}</strong>.
// //                     {" "}Full administration details aren't available for this entry.
// //                   </div>
// //                 )}

// //                 {viewSlotDetail.slot.remarks && (
// //                   <div style={{ fontSize: "14px", color: "#6b7a9a", fontStyle: "italic" }}>
// //                     "{viewSlotDetail.slot.remarks}"
// //                   </div>
// //                 )}
// //               </div>
// //               <div style={{ padding: "14px 18px", borderTop: "1px solid #eef1f7", display: "flex", justifyContent: "flex-end" }}>
// //                 <button onClick={() => setViewSlotDetail(null)} style={secBtn}>Close</button>
// //               </div>
// //             </div>
// //           </div>
// //         );
// //       })()}
// //     </div>
// //   );
// // };

// // export default MARPanel;




// // import React, { useState, useEffect, useCallback } from "react";
// // import {
// //   X, Loader2, Clock, CheckCircle2, AlertTriangle, Pill,
// //   ClipboardList, History, ChevronDown, ChevronUp, Plus, LayoutGrid, ChevronLeft, ChevronRight
// // } from "lucide-react";
// // import { nursingService } from "../services/nursing.service";
// // import { useNotification } from "../context/NotificationContext";

// // // ─── Types ────────────────────────────────────────────────────────────────────

// // interface DueMedication {
// //   prescription_id: number;
// //   drug_name: string;
// //   drug_id?: number;
// //   dosage: string;
// //   frequency: string;
// //   route: string;
// //   instructions: string | null;
// //   dispense_status: string;
// //   prescribed_by: string;
// //   prescribed_at: string | null;
// //   last_admin_id: number | null;
// //   last_admin_status: string | null;
// //   last_administered_at: string | null;
// //   last_administered_by: string | null;
// //   last_administered_by_name: string | null;
// //   due_status: string;
// // }

// // interface AdminHistory {
// //   id: number;
// //   prescription_id: number;
// //   drug_id: number;
// //   drug_name: string;
// //   dosage: string;
// //   dose: string;
// //   route: string;
// //   frequency: string;
// //   diluent: string | null;
// //   rate_ml_hr: number | null;
// //   access_site: string | null;
// //   batch_number: string | null;
// //   administered_at: string;
// //   administered_by_name: string;
// //   status: string;
// //   remarks: string | null;
// // }

// // interface MarGridHeader {
// //   date: string;
// //   display: string;
// //   day_name: string;
// // }

// // interface MarGridSlot {
// //   status: string;
// //   scheduled_label: string;
// //   actual_label: string | null;
// //   admin_id: number | null;
// //   remarks: string | null;
// //   is_overdue: boolean;
// // }

// // interface MarGridRow {
// //   prescription_id: number;
// //   drug_name: string;
// //   dosage_info: string;
// //   start_date: string;
// //   prescription_status: string;
// //   due_status: string;
// //   days: Record<string, MarGridSlot[]>;
// // }

// // interface MARPanelProps {
// //   encounterNumber: string;
// //   onClose?: () => void;
// // }

// // // ─── Helpers ──────────────────────────────────────────────────────────────────

// // const getLocalTimestamp = (date: Date = new Date()): string => {
// //   const pad = (n: number) => n.toString().padStart(2, "0");
// //   return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
// // };

// // const toInputDatetime = (dt: string): string => {
// //   if (!dt) return "";
// //   return dt.replace(" ", "T").slice(0, 16);
// // };

// // const fromInputDatetime = (val: string): string => {
// //   if (!val) return "";
// //   return val.replace("T", " ") + ":00";
// // };

// // const fmtDt = (dt: string) => {
// //   if (!dt) return "—";
// //   try {
// //     return new Date(dt.replace(" ", "T")).toLocaleString("en-GB", {
// //       day: "2-digit", month: "2-digit", year: "2-digit",
// //       hour: "2-digit", minute: "2-digit",
// //     });
// //   } catch { return dt; }
// // };

// // const parseDosageInfo = (info: string): { dosage: string; frequency: string; route: string } => {
// //   const routeMatch = info.match(/\(([^)]+)\)\s*$/);
// //   const route = routeMatch ? routeMatch[1] : "";
// //   const withoutRoute = info.replace(/\([^)]+\)\s*$/, "").trim();
// //   const [dosage = "", frequency = ""] = withoutRoute.split(" - ").map(s => s.trim());
// //   return { dosage, frequency, route };
// // };

// // const routeConfig = (route: string): {
// //   showVolume: boolean;
// //   showDiluent: boolean;
// //   showRate: boolean;
// //   showFlush: boolean;
// //   showAccessSite: boolean;
// //   showBatch: boolean;
// //   label: string;
// //   color: string;
// //   bg: string;
// // } => {
// //   const r = (route || "").toUpperCase();
// //   if (r === "IV")      return { showVolume: true,  showDiluent: true,  showRate: true,  showFlush: true,  showAccessSite: true,  showBatch: false, label: "IV Infusion",     color: "#1d4ed8", bg: "#eff6ff" };
// //   if (r === "SC" || r === "IM") return { showVolume: true,  showDiluent: false, showRate: false, showFlush: false, showAccessSite: true,  showBatch: false, label: r + " Injection",  color: "#7c3aed", bg: "#f5f3ff" };
// //   if (r === "PO" || r === "SL") return { showVolume: false, showDiluent: false, showRate: false, showFlush: false, showAccessSite: false, showBatch: false, label: "Oral",            color: "#0f766e", bg: "#f0fdfa" };
// //   if (r === "BLOOD")  return { showVolume: true,  showDiluent: false, showRate: false, showFlush: false, showAccessSite: true,  showBatch: true,  label: "Blood Product",   color: "#b91c1c", bg: "#fef2f2" };
// //   if (r === "NG" || r === "PEG") return { showVolume: true, showDiluent: false, showRate: false, showFlush: false, showAccessSite: false, showBatch: false, label: "NG/PEG Feed",    color: "#b45309", bg: "#fefce8" };
// //   return { showVolume: true, showDiluent: true, showRate: false, showFlush: false, showAccessSite: false, showBatch: false, label: route, color: "#1c3d7a", bg: "#f8f9fc" };
// // };

// // // ─── Shared Styles ────────────────────────────────────────────────────────────

// // const lbl: React.CSSProperties = {
// //   display: "block", fontSize: "13px", fontWeight: 700, color: "#6b7a9a",
// //   textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "5px",
// // };
// // const inp: React.CSSProperties = {
// //   width: "100%", padding: "9px 12px", border: "1px solid #d0d6e6",
// //   borderRadius: "9px", fontSize: "16px", fontWeight: 500, color: "#1c2b4a",
// //   background: "#f8f9fc", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
// // };
// // const inpSm = (borderColor: string): React.CSSProperties => ({
// //   ...inp, background: "#fff", border: `1px solid ${borderColor}`,
// //   padding: "8px 10px", fontSize: "15px", borderRadius: "8px",
// // });
// // const secBtn: React.CSSProperties = {
// //   flex: "0 0 auto", padding: "8px 16px", border: "1px solid #d0d6e6",
// //   borderRadius: "9px", fontSize: "15px", fontWeight: 700, color: "#4a5568",
// //   background: "#fff", cursor: "pointer", whiteSpace: "nowrap",
// // };
// // const primBtn = (bg: string): React.CSSProperties => ({
// //   flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center",
// //   gap: "6px", padding: "8px 18px", border: "none", borderRadius: "9px",
// //   fontSize: "15px", fontWeight: 700, color: "#fff", background: bg, cursor: "pointer",
// //   whiteSpace: "nowrap",
// // });

// // // ─── Status badge ─────────────────────────────────────────────────────────────

// // const StatusBadge: React.FC<{ status: string; size?: "sm" | "xs" }> = ({ status, size = "sm" }) => {
// //   const s = (status || "").toUpperCase();
// //   const map: Record<string, { bg: string; color: string; dot: string }> = {
// //     GIVEN:      { bg: "#dcfce7", color: "#166534", dot: "#16a34a" },
// //     HELD:       { bg: "#fef9c3", color: "#854d0e", dot: "#ca8a04" },
// //     REFUSED:    { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626" },
// //     OMITTED:    { bg: "#f3f4f6", color: "#374151", dot: "#9ca3af" },
// //     DISPENSED:  { bg: "#dcfce7", color: "#166534", dot: "#16a34a" },
// //     PENDING:    { bg: "#fef9c3", color: "#854d0e", dot: "#ca8a04" },
// //     DUE:        { bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
// //     OVERDUE:    { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626" },
// //   };
// //   const cfg = map[s] || { bg: "#f3f4f6", color: "#374151", dot: "#9ca3af" };
// //   const fs = size === "xs" ? "12px" : "13px";
// //   return (
// //     <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: cfg.bg, color: cfg.color, fontSize: fs, fontWeight: 800, textTransform: "uppercase", padding: "3px 8px", borderRadius: "20px", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>
// //       <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: cfg.dot, display: "inline-block", flexShrink: 0 }} />
// //       {status}
// //     </span>
// //   );
// // };

// // // ─── Route badge ──────────────────────────────────────────────────────────────

// // const RouteBadge: React.FC<{ route: string }> = ({ route }) => (
// //   <span style={{ display: "inline-block", background: "#ccfbf1", color: "#0f766e", fontSize: "12px", fontWeight: 800, textTransform: "uppercase", padding: "3px 8px", borderRadius: "20px", letterSpacing: "0.5px" }}>
// //     {route}
// //   </span>
// // );

// // // ─── MAR Grid slot chip ────────────────────────────────────────────────────────

// // const slotColors = (slot: MarGridSlot): { bg: string; color: string; border: string } => {
// //   const s = (slot.status || "").toLowerCase();
// //   if (s === "given" || s === "administered") return { bg: "#dcfce7", color: "#166534", border: "#86efac" };
// //   if (s === "missed" || s === "refused" || s === "omitted") return { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" };
// //   if (slot.is_overdue) return { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" };
// //   if (s === "held") return { bg: "#fef9c3", color: "#854d0e", border: "#fde047" };
// //   return { bg: "#f1f5f9", color: "#475569", border: "#e2e8f0" };
// // };

// // const SlotChip: React.FC<{ slot: MarGridSlot; clickable: boolean; onAdminister: () => void; onViewDetail: () => void }> = ({ slot, clickable, onAdminister, onViewDetail }) => {
// //   const c = slotColors(slot);
// //   const isPending = (slot.status || "").toLowerCase() === "pending";
// //   const hasDetail = !isPending && (slot.admin_id != null || !!slot.actual_label || !!slot.remarks);
// //   const isActionable = (isPending && clickable) || hasDetail;
// //   return (
// //     <button
// //       type="button"
// //       onClick={isActionable ? (isPending ? onAdminister : onViewDetail) : undefined}
// //       title={slot.remarks || undefined}
// //       style={{
// //         display: "block", width: "100%", textAlign: "left", marginBottom: "4px",
// //         padding: "4px 7px", borderRadius: "6px", border: `1px solid ${c.border}`,
// //         background: c.bg, color: c.color, fontSize: "13px", fontWeight: 800,
// //         cursor: isActionable ? "pointer" : "default",
// //         whiteSpace: "nowrap",
// //       }}
// //     >
// //       {slot.actual_label || slot.scheduled_label}
// //     </button>
// //   );
// // };

// // // ─── Compact Slot Chip for Monthly Grid ───────────────────────────────────────

// // const CompactSlotChip: React.FC<{ slot: MarGridSlot; clickable: boolean; onAction: () => void; }> = ({ slot, clickable, onAction }) => {
// //   const c = slotColors(slot);
// //   const isPending = (slot.status || "").toLowerCase() === "pending";
// //   const hasDetail = !isPending && (slot.admin_id != null || !!slot.actual_label || !!slot.remarks);
// //   const isActionable = (isPending && clickable) || hasDetail;
// //   return (
// //       <button
// //         type="button"
// //         onClick={isActionable ? onAction : undefined}
// //         title={slot.remarks || (isPending ? `Scheduled: ${slot.scheduled_label}` : `Given: ${slot.actual_label}`)}
// //         style={{
// //           display: "block", width: "100%", textAlign: "center", marginBottom: "2px",
// //           padding: "2px", borderRadius: "4px", border: `1px solid ${c.border}`,
// //           background: c.bg, color: c.color, fontSize: "10px", fontWeight: 700,
// //           cursor: isActionable ? "pointer" : "default", whiteSpace: "nowrap",
// //         }}
// //       >
// //         {slot.actual_label || slot.scheduled_label}
// //       </button>
// //     );
// // };

// // // ─── Inline Administration Form ───────────────────────────────────────────────

// // const AdminForm: React.FC<{
// //   med: DueMedication;
// //   encounterNumber: string;
// //   onCancel: () => void;
// //   onSave: () => void;
// // }> = ({ med, encounterNumber, onCancel, onSave }) => {
// //   const rc = routeConfig(med.route);
// //   const { notify } = useNotification();
// //   const [submitting, setSubmitting] = useState(false);

// //   const [dose, setDose] = useState(med.dosage || "");
// //   const [administeredAt, setAdministeredAt] = useState(toInputDatetime(getLocalTimestamp()));
// //   const [volumeMl, setVolumeMl] = useState("");
// //   const [diluent, setDiluent] = useState("");
// //   const [rateMlHr, setRateMlHr] = useState("");
// //   const [flushMl, setFlushMl] = useState("");
// //   const [accessSite, setAccessSite] = useState("");
// //   const [batchNumber, setBatchNumber] = useState("");
// //   const [remarks, setRemarks] = useState("");

// //   const handleSubmit = async (e: React.FormEvent) => {
// //     e.preventDefault();
// //     if (!dose.trim()) { notify("Dose is required", "warning"); return; }
// //     if (!administeredAt) { notify("Administered at time is required", "warning"); return; }
// //     if (rc.showVolume && !volumeMl) { notify("Volume (ml) is required for this route", "warning"); return; }

// //     setSubmitting(true);
// //     try {
// //       const payload: any = {
// //         encounter_number: encounterNumber,
// //         prescription_id: med.prescription_id,
// //         drug_id: med.drug_id,
// //         dose,
// //         route: med.route,
// //         administered_at: fromInputDatetime(administeredAt),
// //         status: "given",
// //       };
// //       if (rc.showVolume && volumeMl)   payload.volume_ml = Number(volumeMl);
// //       if (rc.showDiluent && diluent)   payload.diluent = diluent;
// //       if (rc.showRate && rateMlHr)     payload.rate_ml_hr = Number(rateMlHr);
// //       if (rc.showFlush && flushMl)     payload.flush_ml = Number(flushMl);
// //       if (rc.showAccessSite && accessSite) payload.access_site = accessSite;
// //       if (rc.showBatch && batchNumber) payload.batch_number = batchNumber;
// //       if (remarks.trim())              payload.remarks = remarks.trim();

// //       await nursingService.administerMedication(payload);
// //       notify(`${med.drug_name} administered successfully`, "success");
// //       onSave();
// //     } catch (err: any) {
// //       notify(err.response?.data?.message || "Failed to record administration", "error");
// //     } finally {
// //       setSubmitting(false);
// //     }
// //   };

// //   return (
// //     <div style={{ margin: "0 0 0", background: rc.bg, border: `1px solid ${rc.color}30`, borderRadius: "10px", padding: "14px 16px" }}>
// //       <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "14px", color: rc.color, fontWeight: 800, fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
// //         <Plus size={13} /> Record Administration — <span style={{ opacity: 0.85 }}>{rc.label}</span>
// //       </div>

// //       <form onSubmit={handleSubmit}>
// //         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
// //           <div>
// //             <label style={lbl}>Dose <span style={{ color: "#e11d48" }}>*</span></label>
// //             <input type="text" value={dose} onChange={e => setDose(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 500mg" autoFocus />
// //           </div>
// //           <div>
// //             <label style={lbl}>Administered At <span style={{ color: "#e11d48" }}>*</span></label>
// //             <input type="datetime-local" value={administeredAt} onChange={e => setAdministeredAt(e.target.value)} style={inpSm(`${rc.color}60`)} />
// //           </div>
// //         </div>

// //         {(rc.showVolume || rc.showDiluent) && (
// //           <div style={{ display: "grid", gridTemplateColumns: rc.showVolume && rc.showDiluent ? "1fr 1fr" : "1fr", gap: "10px", marginBottom: "10px" }}>
// //             {rc.showVolume && (
// //               <div>
// //                 <label style={lbl}>Volume (ml) <span style={{ color: "#e11d48" }}>*</span></label>
// //                 <input type="number" min="1" value={volumeMl} onChange={e => setVolumeMl(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 100" />
// //               </div>
// //             )}
// //             {rc.showDiluent && (
// //               <div>
// //                 <label style={lbl}>Diluent</label>
// //                 <input type="text" value={diluent} onChange={e => setDiluent(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. Normal Saline" />
// //               </div>
// //             )}
// //           </div>
// //         )}

// //         {(rc.showRate || rc.showFlush) && (
// //           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
// //             {rc.showRate && (
// //               <div>
// //                 <label style={lbl}>Rate (ml/hr)</label>
// //                 <input type="number" min="1" value={rateMlHr} onChange={e => setRateMlHr(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 50" />
// //               </div>
// //             )}
// //             {rc.showFlush && (
// //               <div>
// //                 <label style={lbl}>Flush (ml)</label>
// //                 <input type="number" min="0" value={flushMl} onChange={e => setFlushMl(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 10" />
// //               </div>
// //             )}
// //           </div>
// //         )}

// //         {(rc.showAccessSite || rc.showBatch) && (
// //           <div style={{ display: "grid", gridTemplateColumns: rc.showAccessSite && rc.showBatch ? "1fr 1fr" : "1fr", gap: "10px", marginBottom: "10px" }}>
// //             {rc.showAccessSite && (
// //               <div>
// //                 <label style={lbl}>Access Site</label>
// //                 <input type="text" value={accessSite} onChange={e => setAccessSite(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. Right forearm" />
// //               </div>
// //             )}
// //             {rc.showBatch && (
// //               <div>
// //                 <label style={lbl}>Batch / Unit Number</label>
// //                 <input type="text" value={batchNumber} onChange={e => setBatchNumber(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. PRBC-20240524" />
// //               </div>
// //             )}
// //           </div>
// //         )}

// //         <div style={{ marginBottom: "12px" }}>
// //           <label style={lbl}>Remarks <span style={{ fontWeight: 400, color: "#aaa", textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
// //           <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} style={inpSm(`${rc.color}40`)} placeholder="e.g. Given slowly over 20 minutes" />
// //         </div>

// //         <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
// //           <button type="button" style={secBtn} onClick={onCancel}>Cancel</button>
// //           <button type="submit" disabled={submitting} style={primBtn(rc.color)}>
// //             {submitting ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle2 size={13} />}
// //             Mark as Given
// //           </button>
// //         </div>
// //       </form>
// //     </div>
// //   );
// // };

// // // ─── Due Medication Card ──────────────────────────────────────────────────────

// // const DueMedCard: React.FC<{
// //   med: DueMedication;
// //   encounterNumber: string;
// //   onSave: () => void;
// // }> = ({ med, encounterNumber, onSave }) => {
// //   const [showForm, setShowForm] = useState(false);
// //   const isDispensed = (med.dispense_status || "").toUpperCase() === "DISPENSED";
// //   const rc = routeConfig(med.route);

// //   return (
// //     <div style={{
// //       background: "#fff",
// //       borderRadius: "12px",
// //       border: "1px solid #e0e4ef",
// //       boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
// //       borderLeft: `4px solid ${isDispensed ? rc.color : "#d1d5db"}`,
// //       opacity: isDispensed ? 1 : 0.75,
// //       marginBottom: "12px",
// //     }}>
// //       <div style={{ padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
// //         <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `${isDispensed ? rc.color : "#6b7280"}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
// //           <Pill size={18} color={isDispensed ? rc.color : "#6b7280"} />
// //         </div>

// //         <div style={{ flex: 1, minWidth: 0 }}>
// //           <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
// //             <span style={{ fontWeight: 800, fontSize: "18px", color: "#1c2b4a" }}>{med.drug_name}</span>
// //             <RouteBadge route={med.route} />
// //             <StatusBadge status={med.due_status} size="xs" />
// //             {!isDispensed && (
// //               <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#fef9c3", color: "#854d0e", fontSize: "12px", fontWeight: 800, padding: "3px 8px", borderRadius: "20px", border: "1px solid #fde047" }}>
// //                 <AlertTriangle size={9} /> Not Yet Dispensed
// //               </span>
// //             )}
// //           </div>

// //           <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "4px" }}>
// //             {[
// //               ["Dose", med.dosage],
// //               ["Frequency", med.frequency],
// //               ["Prescribed by", med.prescribed_by],
// //             ].map(([k, v]) => (
// //               <div key={k}>
// //                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
// //                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{v || "—"}</div>
// //               </div>
// //             ))}
// //             {med.prescribed_at && (
// //               <div>
// //                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Prescribed On</div>
// //                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{fmtDt(med.prescribed_at)}</div>
// //               </div>
// //             )}
// //             {med.last_administered_at && (
// //               <div>
// //                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Last Given</div>
// //                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{fmtDt(med.last_administered_at)}</div>
// //               </div>
// //             )}
// //           </div>

// //           {med.instructions && (
// //             <div style={{ marginTop: "6px", fontSize: "14px", color: "#6b7a9a", fontStyle: "italic" }}>
// //               ℹ {med.instructions}
// //             </div>
// //           )}
// //         </div>

// //         {isDispensed && (
// //           <button
// //             onClick={() => setShowForm(f => !f)}
// //             style={{
// //               display: "flex", alignItems: "center", gap: "4px",
// //               padding: "7px 14px", border: `1.5px solid ${rc.color}`,
// //               borderRadius: "8px", background: showForm ? rc.color : "#fff",
// //               color: showForm ? "#fff" : rc.color,
// //               fontSize: "14px", fontWeight: 800, cursor: "pointer",
// //               whiteSpace: "nowrap", transition: "all 0.15s", flexShrink: 0,
// //             }}
// //           >
// //             <CheckCircle2 size={12} />
// //             {showForm ? "Cancel" : "Give"}
// //           </button>
// //         )}
// //       </div>

// //       {showForm && isDispensed && (
// //         <div style={{ padding: "0 14px 14px" }}>
// //           <AdminForm
// //             med={med}
// //             encounterNumber={encounterNumber}
// //             onCancel={() => setShowForm(false)}
// //             onSave={() => { setShowForm(false); onSave(); }}
// //           />
// //         </div>
// //       )}
// //     </div>
// //   );
// // };

// // // ─── History Card ─────────────────────────────────────────────────────────────

// // const HistoryCard: React.FC<{ record: AdminHistory }> = ({ record }) => {
// //   const [expanded, setExpanded] = useState(false);
// //   const rc = routeConfig(record.route);

// //   return (
// //     <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e0e4ef", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", borderLeft: `3px solid ${rc.color}`, marginBottom: "10px" }}>
// //       <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
// //         <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: `${rc.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
// //           <Pill size={14} color={rc.color} />
// //         </div>

// //         <div style={{ flex: 1, minWidth: 0 }}>
// //           <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "2px" }}>
// //             <span style={{ fontWeight: 800, fontSize: "16px", color: "#1c2b4a" }}>{record.drug_name}</span>
// //             <RouteBadge route={record.route} />
// //             <StatusBadge status={record.status} size="xs" />
// //           </div>
// //           <div style={{ fontSize: "14px", color: "#6b7a9a" }}>
// //             <span style={{ fontWeight: 600, color: "#1c2b4a" }}>{record.dose}</span>
// //             {" · "}
// //             <Clock size={9} style={{ display: "inline", verticalAlign: "middle", marginRight: "2px" }} />
// //             {fmtDt(record.administered_at)}
// //             {" · by "}<span style={{ fontWeight: 600, color: "#1c2b4a" }}>{record.administered_by_name}</span>
// //           </div>
// //         </div>

// //         <button
// //           onClick={() => setExpanded(e => !e)}
// //           style={{ background: "none", border: "none", cursor: "pointer", color: "#8a94ad", padding: "4px", borderRadius: "6px", lineHeight: 1, flexShrink: 0 }}
// //         >
// //           {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
// //         </button>
// //       </div>

// //       {expanded && (
// //         <div style={{ padding: "0 14px 12px", background: "#f8f9fc", borderTop: "1px dashed #e0e4ef" }}>
// //           <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", paddingTop: "10px" }}>
// //             {([
// //               ["Prescribed Dose", record.dosage],
// //               ["Frequency", record.frequency],
// //               rc.showDiluent && ["Diluent", record.diluent],
// //               rc.showRate && ["Rate", record.rate_ml_hr ? `${record.rate_ml_hr} ml/hr` : null],
// //               rc.showAccessSite && ["Access Site", record.access_site],
// //               rc.showBatch && ["Batch No.", record.batch_number],
// //             ].filter(Boolean) as [string, string | null][]).map(([k, v]) => (
// //               <div key={k}>
// //                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
// //                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{v || "—"}</div>
// //               </div>
// //             ))}
// //           </div>
// //           {record.remarks && (
// //             <div style={{ marginTop: "8px", fontSize: "14px", color: "#6b7a9a", fontStyle: "italic" }}>
// //               "{record.remarks}"
// //             </div>
// //           )}
// //         </div>
// //       )}
// //     </div>
// //   );
// // };

// // // ─── Main MARPanel ────────────────────────────────────────────────────────────

// // const MARPanel: React.FC<MARPanelProps> = ({ encounterNumber, onClose }) => {
// //   const [activeTab, setActiveTab] = useState<"due" | "history" | "grid" | "paperGrid">("due");
// //   const [dueMeds, setDueMeds] = useState<DueMedication[]>([]);
// //   const [history, setHistory] = useState<AdminHistory[]>([]);
// //   const [loadingDue, setLoadingDue] = useState(true);
// //   const [loadingHistory, setLoadingHistory] = useState(true);
  
// //   // Calendar Grid State
// //   const today = new Date();
// //   const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
// //   const [currentYear, setCurrentYear] = useState(today.getFullYear());
// //   const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// //   const [gridHeaders, setGridHeaders] = useState<MarGridHeader[]>([]);
// //   const [gridRows, setGridRows] = useState<MarGridRow[]>([]);
// //   const [loadingGrid, setLoadingGrid] = useState(true);
// //   const [activeSlot, setActiveSlot] = useState<{ row: MarGridRow; date: string; slot: MarGridSlot } | null>(null);
// //   const [viewSlotDetail, setViewSlotDetail] = useState<{ row: MarGridRow; date: string; slot: MarGridSlot } | null>(null);

// //   const handlePrevMonth = () => {
// //     if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(y => y - 1); }
// //     else { setCurrentMonth(m => m - 1); }
// //   };

// //   const handleNextMonth = () => {
// //     if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(y => y + 1); }
// //     else { setCurrentMonth(m => m + 1); }
// //   };

// //   const fetchDue = useCallback(async () => {
// //     setLoadingDue(true);
// //     try {
// //       const res = await nursingService.getMARDue(encounterNumber);
// //       setDueMeds(res.data || []);
// //     } catch {
// //       setDueMeds([]);
// //     } finally {
// //       setLoadingDue(false);
// //     }
// //   }, [encounterNumber]);

// //   const fetchHistory = useCallback(async () => {
// //     setLoadingHistory(true);
// //     try {
// //       const res = await nursingService.getMARHistory(encounterNumber);
// //       setHistory(res.data || []);
// //     } catch {
// //       setHistory([]);
// //     } finally {
// //       setLoadingHistory(false);
// //     }
// //   }, [encounterNumber]);

// //   const fetchGrid = useCallback(async () => {
// //     setLoadingGrid(true);
// //     try {
// //       // Depending on your API setup, you might need to pass month and year as query params. 
// //       // i.e., nursingService.getMARDueHistory(encounterNumber, currentMonth, currentYear)
// //       const res = await nursingService.getMARDueHistory(encounterNumber, currentMonth, currentYear);
// //       setGridHeaders(res.data?.headers || []);
// //       setGridRows(res.data?.rows || []);
// //     } catch {
// //       setGridHeaders([]);
// //       setGridRows([]);
// //     } finally {
// //       setLoadingGrid(false);
// //     }
// //   }, [encounterNumber, currentMonth, currentYear]);

// //   useEffect(() => {
// //     fetchDue();
// //     fetchHistory();
// //     fetchGrid();
// //   }, [fetchDue, fetchHistory, fetchGrid]);

// //   const handleAdminSave = () => {
// //     fetchDue();
// //     fetchHistory();
// //   };

// //   const handleGridAdminSave = () => {
// //     setActiveSlot(null);
// //     fetchDue();
// //     fetchHistory();
// //     fetchGrid();
// //   };

// //   const TEAL = "#0d9488";
// //   const TEAL_DARK = "#0f766e";

// //   const tabBtn = (tab: "due" | "history" | "grid" | "paperGrid"): React.CSSProperties => ({
// //     flex: 1, padding: "9px 12px", border: "none", cursor: "pointer",
// //     fontSize: "15px", fontWeight: 800, display: "flex", alignItems: "center",
// //     justifyContent: "center", gap: "6px", transition: "all 0.15s",
// //     borderBottom: activeTab === tab ? `2px solid ${TEAL}` : "2px solid transparent",
// //     background: activeTab === tab ? "#f0fdfa" : "#f8f9fc",
// //     color: activeTab === tab ? TEAL_DARK : "#6b7a9a",
// //   });

// //   return (
// //     <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #d8dce8", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>

// //       {/* ── Panel header ── */}
// //       <div style={{ background: `linear-gradient(135deg, ${TEAL_DARK} 0%, ${TEAL} 100%)`, padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
// //         <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
// //           <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
// //             <ClipboardList size={16} color="#fff" />
// //           </div>
// //           <div>
// //             <div style={{ fontWeight: 900, fontSize: "16px", color: "#fff", letterSpacing: "0.3px" }}>Medication Administration Record</div>
// //             <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", marginTop: "1px" }}>MAR · {encounterNumber}</div>
// //           </div>
// //           {dueMeds.length > 0 && (
// //             <span style={{ background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: "13px", fontWeight: 800, padding: "3px 10px", borderRadius: "20px", marginLeft: "4px" }}>
// //               {dueMeds.filter(m => (m.dispense_status || "").toUpperCase() === "DISPENSED").length} due
// //             </span>
// //           )}
// //         </div>
// //         {onClose && (
// //           <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "7px", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer" }}>
// //             <X size={16} />
// //           </button>
// //         )}
// //       </div>

// //       {/* ── Tabs ── */}
// //       <div style={{ display: "flex", borderBottom: "1px solid #e0e4ef", flexShrink: 0 }}>
// //         <button style={tabBtn("due")} onClick={() => setActiveTab("due")}>
// //           <Pill size={13} /> Due Medications
// //           {!loadingDue && dueMeds.length > 0 && (
// //             <span style={{ background: TEAL, color: "#fff", borderRadius: "20px", fontSize: "12px", fontWeight: 900, padding: "1px 6px", marginLeft: "2px" }}>
// //               {dueMeds.length}
// //             </span>
// //           )}
// //         </button>
// //         <button style={tabBtn("history")} onClick={() => setActiveTab("history")}>
// //           <History size={13} /> Administration History
// //           {!loadingHistory && history.length > 0 && (
// //             <span style={{ background: "#6b7a9a", color: "#fff", borderRadius: "20px", fontSize: "12px", fontWeight: 900, padding: "1px 6px", marginLeft: "2px" }}>
// //               {history.length}
// //             </span>
// //           )}
// //         </button>
// //         <button style={tabBtn("grid")} onClick={() => setActiveTab("grid")}>
// //           <LayoutGrid size={13} /> Weekly Chart
// //         </button>
// //         <button style={tabBtn("paperGrid")} onClick={() => setActiveTab("paperGrid")}>
// //           <LayoutGrid size={13} /> Monthly MAR 
// //         </button>
// //       </div>

// //       {/* ── Tab Body ── */}
// //       <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px", flex: 1, overflowY: "auto" }}>

// //         {/* DUE TAB */}
// //         {activeTab === "due" && (
// //           <>
// //             {loadingDue ? (
// //               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a", fontSize: "16px" }}>
// //                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
// //                 Loading due medications…
// //               </div>
// //             ) : dueMeds.length === 0 ? (
// //               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a" }}>
// //                 <CheckCircle2 size={32} color="#a7f3d0" />
// //                 <span style={{ fontSize: "16px", fontWeight: 700, color: "#0f766e" }}>No due medications</span>
// //                 <span style={{ fontSize: "14px", color: "#8a94ad" }}>All scheduled medications have been administered</span>
// //               </div>
// //             ) : (
// //               dueMeds.map(med => (
// //                 <DueMedCard
// //                   key={med.prescription_id}
// //                   med={med}
// //                   encounterNumber={encounterNumber}
// //                   onSave={handleAdminSave}
// //                 />
// //               ))
// //             )}
// //           </>
// //         )}

// //         {/* HISTORY TAB */}
// //         {activeTab === "history" && (
// //           <>
// //             {loadingHistory ? (
// //               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a", fontSize: "16px" }}>
// //                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
// //                 Loading history…
// //               </div>
// //             ) : history.length === 0 ? (
// //               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a" }}>
// //                 <History size={32} color="#d1d5db" />
// //                 <span style={{ fontSize: "16px", fontWeight: 700 }}>No administration history</span>
// //                 <span style={{ fontSize: "14px", color: "#8a94ad" }}>Administered medications will appear here</span>
// //               </div>
// //             ) : (
// //               <>
// //                 <div style={{ fontSize: "13px", fontWeight: 700, color: "#8a94ad", textTransform: "uppercase", letterSpacing: "0.6px", padding: "0 2px 4px" }}>
// //                   {history.length} record{history.length !== 1 ? "s" : ""} found
// //                 </div>
// //                 {[...history]
// //                   .sort((a, b) => new Date(b.administered_at.replace(" ", "T")).getTime() - new Date(a.administered_at.replace(" ", "T")).getTime())
// //                   .map(record => (
// //                     <HistoryCard key={record.id} record={record} />
// //                   ))
// //                 }
// //               </>
// //             )}
// //           </>
// //         )}

// //         {/* WEEKLY GRID TAB */}
// //         {activeTab === "grid" && (
// //           <>
// //             {loadingGrid ? (
// //               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a", fontSize: "16px" }}>
// //                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
// //                 Loading MAR chart…
// //               </div>
// //             ) : gridRows.length === 0 ? (
// //               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a" }}>
// //                 <LayoutGrid size={32} color="#d1d5db" />
// //                 <span style={{ fontSize: "16px", fontWeight: 700 }}>No medications scheduled this week</span>
// //               </div>
// //             ) : (
// //               <div style={{ overflowX: "auto", border: "1px solid #e0e4ef", borderRadius: "10px" }}>
// //                 <table style={{ borderCollapse: "collapse", width: "100%", minWidth: `${200 + gridHeaders.length * 120}px` }}>
// //                   <thead>
// //                     <tr>
// //                       <th style={{
// //                         position: "sticky", left: 0, zIndex: 1, background: "#f8f9fc",
// //                         textAlign: "left", padding: "10px 14px", fontSize: "13px", fontWeight: 800,
// //                         color: "#6b7a9a", textTransform: "uppercase", letterSpacing: "0.5px",
// //                         borderBottom: "1px solid #e0e4ef", borderRight: "1px solid #e0e4ef",
// //                         minWidth: "200px",
// //                       }}>
// //                         Medication
// //                       </th>
// //                       {gridHeaders.map(h => (
// //                         <th key={h.date} style={{
// //                           padding: "10px 12px", fontSize: "13px", fontWeight: 800, color: "#6b7a9a",
// //                           textTransform: "uppercase", letterSpacing: "0.5px", background: "#f8f9fc",
// //                           borderBottom: "1px solid #e0e4ef", borderLeft: "1px solid #eef1f7", minWidth: "120px",
// //                         }}>
// //                           <div>{h.day_name}</div>
// //                           <div style={{ fontWeight: 600, color: "#8a94ad", marginTop: "2px" }}>{h.display}</div>
// //                         </th>
// //                       ))}
// //                     </tr>
// //                   </thead>
// //                   <tbody>
// //                     {gridRows.map(row => {
// //                       const isInactive = row.prescription_status === "STOPPED" || row.prescription_status === "CANCELLED";
// //                       return (
// //                         <tr key={row.prescription_id} style={{ opacity: isInactive ? 0.55 : 1 }}>
// //                           <td style={{
// //                             position: "sticky", left: 0, zIndex: 1, background: "#fff",
// //                             padding: "10px 14px", borderBottom: "1px solid #eef1f7", borderRight: "1px solid #e0e4ef",
// //                             verticalAlign: "top",
// //                           }}>
// //                             <div style={{ fontWeight: 800, fontSize: "15px", color: "#1c2b4a" }}>{row.drug_name}</div>
// //                             <div style={{ fontSize: "13px", color: "#6b7a9a", marginTop: "2px" }}>{row.dosage_info}</div>
// //                             <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
// //                               <span style={{ fontSize: "12px", color: "#8a94ad" }}>Start: {row.start_date}</span>
// //                               <StatusBadge status={row.prescription_status} size="xs" />
// //                             </div>
// //                           </td>
// //                           {gridHeaders.map(h => {
// //                             const slots = row.days[h.date] || [];
// //                             return (
// //                               <td key={h.date} style={{
// //                                 padding: "8px", verticalAlign: "top",
// //                                 borderBottom: "1px solid #eef1f7", borderLeft: "1px solid #eef1f7",
// //                               }}>
// //                                 {slots.length === 0 ? (
// //                                   <span style={{ fontSize: "14px", color: "#cbd5e1" }}>—</span>
// //                                 ) : (
// //                                   slots.map((slot, i) => (
// //                                     <SlotChip
// //                                       key={i}
// //                                       slot={slot}
// //                                       clickable={!isInactive}
// //                                       onAdminister={() => setActiveSlot({ row, date: h.date, slot })}
// //                                       onViewDetail={() => setViewSlotDetail({ row, date: h.date, slot })}
// //                                     />
// //                                   ))
// //                                 )}
// //                               </td>
// //                             );
// //                           })}
// //                         </tr>
// //                       );
// //                     })}
// //                   </tbody>
// //                 </table>
// //               </div>
// //             )}
// //           </>
// //         )}

// //         {/* MONTHLY MAR GRID TAB */}
// //         {activeTab === "paperGrid" && (
// //           <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            
// //             <div style={{ marginBottom: "16px", border: "2px solid #1e293b", borderRadius: "8px", overflow: "hidden" }}>
// //               <div style={{ background: "#f8fafc", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #1e293b" }}>
// //                 <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px" }}>
// //                   Personal Medication Administration Record (MAR)
// //                 </h2>
// //                 <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
// //                   <button onClick={handlePrevMonth} style={{ background: "none", border: "none", cursor: "pointer" }}><ChevronLeft size={20} /></button>
// //                   <span style={{ fontSize: "16px", fontWeight: 800, minWidth: "140px", textAlign: "center" }}>
// //                     {monthNames[currentMonth - 1]} {currentYear}
// //                   </span>
// //                   <button onClick={handleNextMonth} style={{ background: "none", border: "none", cursor: "pointer" }}><ChevronRight size={20} /></button>
// //                 </div>
// //               </div>
              
// //               <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", fontSize: "12px", background: "#fff" }}>
// //                 <div style={{ padding: "8px", borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1" }}>
// //                   <strong>PATIENT NAME:</strong> {encounterNumber}
// //                 </div>
// //                 <div style={{ padding: "8px", borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1" }}>
// //                   <strong>D.O.B.:</strong> —
// //                 </div>
// //                 <div style={{ padding: "8px", borderBottom: "1px solid #cbd5e1" }}>
// //                   <strong>ADDRESS:</strong> —
// //                 </div>
// //                 <div style={{ padding: "8px", borderRight: "1px solid #cbd5e1", gridColumn: "span 1" }}>
// //                   <strong>GP NAME:</strong> —
// //                 </div>
// //                 <div style={{ padding: "8px", gridColumn: "span 2" }}>
// //                   <strong>KNOWN ALLERGIES:</strong> <span style={{ color: "#ef4444", fontWeight: 800 }}>None Recorded</span>
// //                 </div>
// //               </div>
// //             </div>

// //             {loadingGrid ? (
// //               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px", color: "#6b7a9a" }}>
// //                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
// //               </div>
// //             ) : gridRows.length === 0 ? (
// //               <div style={{ textAlign: "center", padding: "48px", color: "#6b7a9a", fontWeight: 700 }}>No medications scheduled this month</div>
// //             ) : (
// //               <div style={{ overflowX: "auto", border: "2px solid #1e293b", flex: 1 }}>
// //                 <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed", minWidth: "1200px" }}>
// //                   <thead>
// //                     <tr>
// //                       <th style={{ width: "250px", position: "sticky", left: 0, zIndex: 2, background: "#f8fafc", borderRight: "2px solid #1e293b", borderBottom: "2px solid #1e293b", padding: "8px", textAlign: "left", fontSize: "11px", textTransform: "uppercase" }}>
// //                         Medication<br/>
// //                         <span style={{ fontWeight: 400, color: "#64748b" }}>(Name, strength, dose, frequency, route)</span>
// //                       </th>
// //                       {gridHeaders.map(h => (
// //                         <th key={h.date} style={{ borderBottom: "2px solid #1e293b", borderRight: "1px solid #cbd5e1", background: "#f8fafc", padding: "4px 0", width: "32px", textAlign: "center", fontSize: "12px" }}>
// //                           {h.display}
// //                         </th>
// //                       ))}
// //                     </tr>
// //                   </thead>
// //                   <tbody>
// //                     {gridRows.map(row => {
// //                       const isInactive = row.prescription_status === "STOPPED" || row.prescription_status === "CANCELLED";
// //                       return (
// //                         <tr key={row.prescription_id} style={{ opacity: isInactive ? 0.6 : 1, background: isInactive ? "#f1f5f9" : "#fff" }}>
                          
// //                           <td style={{ position: "sticky", left: 0, zIndex: 1, background: isInactive ? "#f1f5f9" : "#fff", borderRight: "2px solid #1e293b", borderBottom: "1px solid #cbd5e1", padding: "8px", verticalAlign: "top" }}>
// //                             <div style={{ fontWeight: 900, fontSize: "13px", color: "#0f172a" }}>{row.drug_name}</div>
// //                             <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px", fontWeight: 600 }}>{row.dosage_info}</div>
// //                             <div style={{ marginTop: "4px" }}>
// //                               <StatusBadge status={row.prescription_status} size="xs" />
// //                             </div>
// //                           </td>

// //                           {gridHeaders.map(h => {
// //                             const slots = row.days[h.date] || [];
// //                             return (
// //                               <td key={h.date} style={{ borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1", padding: "2px", verticalAlign: "top", background: isInactive ? "#f8fafc" : "#fff" }}>
// //                                 {slots.length === 0 ? null : (
// //                                   slots.map((slot, i) => (
// //                                     <CompactSlotChip
// //                                       key={i}
// //                                       slot={slot}
// //                                       clickable={!isInactive}
// //                                       onAction={() => {
// //                                         const isPending = (slot.status || "").toLowerCase() === "pending";
// //                                         if (isPending) setActiveSlot({ row, date: h.date, slot });
// //                                         else setViewSlotDetail({ row, date: h.date, slot });
// //                                       }}
// //                                     />
// //                                   ))
// //                                 )}
// //                               </td>
// //                             );
// //                           })}
// //                         </tr>
// //                       );
// //                     })}
// //                   </tbody>
// //                 </table>
// //               </div>
// //             )}
// //           </div>
// //         )}
// //       </div>

// //       {/* ── Grid slot administer modal ── */}
// //       {activeSlot && (
// //         <div
// //           style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "16px" }}
// //           onClick={() => setActiveSlot(null)}
// //         >
// //           <div style={{ width: "100%", maxWidth: "460px" }} onClick={e => e.stopPropagation()}>
// //             <AdminForm
// //               med={{
// //                 prescription_id: activeSlot.row.prescription_id,
// //                 drug_name: activeSlot.row.drug_name,
// //                 drug_id: dueMeds.find(d => d.prescription_id === activeSlot.row.prescription_id)?.drug_id,
// //                 ...parseDosageInfo(activeSlot.row.dosage_info),
// //                 instructions: null,
// //                 dispense_status: "DISPENSED",
// //                 prescribed_by: "",
// //                 prescribed_at: null,
// //                 last_admin_id: null,
// //                 last_admin_status: null,
// //                 last_administered_at: null,
// //                 last_administered_by: null,
// //                 last_administered_by_name: null,
// //                 due_status: activeSlot.row.due_status,
// //               }}
// //               encounterNumber={encounterNumber}
// //               onCancel={() => setActiveSlot(null)}
// //               onSave={handleGridAdminSave}
// //             />
// //           </div>
// //         </div>
// //       )}

// //       {/* ── Grid slot detail (view) modal ── */}
// //       {viewSlotDetail && (() => {
// //         const fullRecord = history.find(h => h.id === viewSlotDetail.slot.admin_id);
// //         const rc = routeConfig(fullRecord?.route || parseDosageInfo(viewSlotDetail.row.dosage_info).route);
// //         return (
// //           <div
// //             style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "16px" }}
// //             onClick={() => setViewSlotDetail(null)}
// //           >
// //             <div style={{ width: "100%", maxWidth: "460px", background: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
// //               <div style={{ background: rc.color, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", color: "#fff" }}>
// //                 <div>
// //                   <div style={{ fontSize: "16px", fontWeight: 800 }}>{viewSlotDetail.row.drug_name}</div>
// //                   <div style={{ fontSize: "13px", opacity: 0.85, marginTop: "2px" }}>
// //                     Scheduled {viewSlotDetail.slot.scheduled_label} · {viewSlotDetail.date}
// //                   </div>
// //                 </div>
// //                 <button onClick={() => setViewSlotDetail(null)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "6px", width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer" }}>
// //                   <X size={16} />
// //                 </button>
// //               </div>
// //               <div style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
// //                 <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
// //                   <StatusBadge status={viewSlotDetail.slot.status} />
// //                   {fullRecord && <RouteBadge route={fullRecord.route} />}
// //                 </div>

// //                 {fullRecord ? (
// //                   <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
// //                     {([
// //                       ["Dose Given", fullRecord.dose],
// //                       ["Administered At", fmtDt(fullRecord.administered_at)],
// //                       ["Given By", fullRecord.administered_by_name],
// //                       rc.showDiluent && ["Diluent", fullRecord.diluent],
// //                       rc.showRate && ["Rate", fullRecord.rate_ml_hr ? `${fullRecord.rate_ml_hr} ml/hr` : null],
// //                       rc.showAccessSite && ["Access Site", fullRecord.access_site],
// //                       rc.showBatch && ["Batch No.", fullRecord.batch_number],
// //                     ].filter(Boolean) as [string, string | null][]).map(([k, v]) => (
// //                       <div key={k}>
// //                         <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
// //                         <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{v || "—"}</div>
// //                       </div>
// //                     ))}
// //                   </div>
// //                 ) : (
// //                   <div style={{ fontSize: "14px", color: "#6b7a9a" }}>
// //                     Recorded as <strong>{viewSlotDetail.slot.actual_label || viewSlotDetail.slot.status}</strong>.
// //                     {" "}Full administration details aren't available for this entry.
// //                   </div>
// //                 )}

// //                 {viewSlotDetail.slot.remarks && (
// //                   <div style={{ fontSize: "14px", color: "#6b7a9a", fontStyle: "italic" }}>
// //                     "{viewSlotDetail.slot.remarks}"
// //                   </div>
// //                 )}
// //               </div>
// //               <div style={{ padding: "14px 18px", borderTop: "1px solid #eef1f7", display: "flex", justifyContent: "flex-end" }}>
// //                 <button onClick={() => setViewSlotDetail(null)} style={secBtn}>Close</button>
// //               </div>
// //             </div>
// //           </div>
// //         );
// //       })()}
// //     </div>
// //   );
// // };

// // export default MARPanel;


// // import React, { useState, useEffect, useCallback } from "react";
// // import {
// //   X, Loader2, Clock, CheckCircle2, AlertTriangle, Pill,
// //   ClipboardList, History, ChevronDown, ChevronUp, Plus, LayoutGrid, ChevronLeft, ChevronRight
// // } from "lucide-react";
// // import { nursingService } from "../services/nursing.service";
// // import { useNotification } from "../context/NotificationContext";

// // // ─── Types ────────────────────────────────────────────────────────────────────

// // interface DueMedication {
// //   prescription_id: number;
// //   drug_name: string;
// //   drug_id?: number;
// //   dosage: string;
// //   frequency: string;
// //   route: string;
// //   instructions: string | null;
// //   dispense_status: string;
// //   prescribed_by: string;
// //   prescribed_at: string | null;
// //   last_admin_id: number | null;
// //   last_admin_status: string | null;
// //   last_administered_at: string | null;
// //   last_administered_by: string | null;
// //   last_administered_by_name: string | null;
// //   due_status: string;
// // }

// // interface AdminHistory {
// //   id: number;
// //   prescription_id: number;
// //   drug_id: number;
// //   drug_name: string;
// //   dosage: string;
// //   dose: string;
// //   route: string;
// //   frequency: string;
// //   diluent: string | null;
// //   rate_ml_hr: number | null;
// //   access_site: string | null;
// //   batch_number: string | null;
// //   administered_at: string;
// //   administered_by_name: string;
// //   status: string;
// //   remarks: string | null;
// // }

// // interface MarGridHeader {
// //   date: string;
// //   display: string;
// //   day_name: string;
// // }

// // interface MarGridSlot {
// //   status: string;
// //   scheduled_label: string;
// //   actual_label: string | null;
// //   admin_id: number | null;
// //   remarks: string | null;
// //   is_overdue: boolean;
// // }

// // interface MarGridRow {
// //   prescription_id: number;
// //   drug_name: string;
// //   dosage_info: string;
// //   start_date: string;
// //   prescription_status: string;
// //   due_status: string;
// //   days: Record<string, MarGridSlot[]>;
// // }

// // interface MARPanelProps {
// //   encounterNumber: string;
// //   onClose?: () => void;
// // }

// // // ─── Helpers ──────────────────────────────────────────────────────────────────

// // const getLocalTimestamp = (date: Date = new Date()): string => {
// //   const pad = (n: number) => n.toString().padStart(2, "0");
// //   return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
// // };

// // const toInputDatetime = (dt: string): string => {
// //   // "2026-05-24 09:30:00" → "2026-05-24T09:30"
// //   if (!dt) return "";
// //   return dt.replace(" ", "T").slice(0, 16);
// // };

// // const fromInputDatetime = (val: string): string => {
// //   // "2026-05-24T09:30" → "2026-05-24 09:30:00"
// //   if (!val) return "";
// //   return val.replace("T", " ") + ":00";
// // };

// // const fmtDt = (dt: string) => {
// //   if (!dt) return "—";
// //   try {
// //     return new Date(dt.replace(" ", "T")).toLocaleString("en-GB", {
// //       day: "2-digit", month: "2-digit", year: "2-digit",
// //       hour: "2-digit", minute: "2-digit",
// //     });
// //   } catch { return dt; }
// // };

// // /** Parse "100 - OD - for 1 DAYS (PO)" into its parts. */
// // const parseDosageInfo = (info: string): { dosage: string; frequency: string; route: string } => {
// //   const routeMatch = info.match(/\(([^)]+)\)\s*$/);
// //   const route = routeMatch ? routeMatch[1] : "";
// //   const withoutRoute = info.replace(/\([^)]+\)\s*$/, "").trim();
// //   const [dosage = "", frequency = ""] = withoutRoute.split(" - ").map(s => s.trim());
// //   return { dosage, frequency, route };
// // };

// // /** Determine which fields to show based on the prescription's route. */
// // const routeConfig = (route: string): {
// //   showVolume: boolean;
// //   showDiluent: boolean;
// //   showRate: boolean;
// //   showFlush: boolean;
// //   showAccessSite: boolean;
// //   showBatch: boolean;
// //   label: string;
// //   color: string;
// //   bg: string;
// // } => {
// //   const r = (route || "").toUpperCase();
// //   if (r === "IV")      return { showVolume: true,  showDiluent: true,  showRate: true,  showFlush: true,  showAccessSite: true,  showBatch: false, label: "IV Infusion",     color: "#1d4ed8", bg: "#eff6ff" };
// //   if (r === "SC" || r === "IM") return { showVolume: true,  showDiluent: false, showRate: false, showFlush: false, showAccessSite: true,  showBatch: false, label: r + " Injection",  color: "#7c3aed", bg: "#f5f3ff" };
// //   if (r === "PO" || r === "SL") return { showVolume: false, showDiluent: false, showRate: false, showFlush: false, showAccessSite: false, showBatch: false, label: "Oral",            color: "#0f766e", bg: "#f0fdfa" };
// //   if (r === "BLOOD")  return { showVolume: true,  showDiluent: false, showRate: false, showFlush: false, showAccessSite: true,  showBatch: true,  label: "Blood Product",   color: "#b91c1c", bg: "#fef2f2" };
// //   if (r === "NG" || r === "PEG") return { showVolume: true, showDiluent: false, showRate: false, showFlush: false, showAccessSite: false, showBatch: false, label: "NG/PEG Feed",    color: "#b45309", bg: "#fefce8" };
// //   // Default fallback — show all
// //   return { showVolume: true, showDiluent: true, showRate: false, showFlush: false, showAccessSite: false, showBatch: false, label: route, color: "#1c3d7a", bg: "#f8f9fc" };
// // };

// // // ─── Shared Styles ────────────────────────────────────────────────────────────

// // const lbl: React.CSSProperties = {
// //   display: "block", fontSize: "13px", fontWeight: 700, color: "#6b7a9a",
// //   textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "5px",
// // };
// // const inp: React.CSSProperties = {
// //   width: "100%", padding: "9px 12px", border: "1px solid #d0d6e6",
// //   borderRadius: "9px", fontSize: "16px", fontWeight: 500, color: "#1c2b4a",
// //   background: "#f8f9fc", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
// // };
// // const inpSm = (borderColor: string): React.CSSProperties => ({
// //   ...inp, background: "#fff", border: `1px solid ${borderColor}`,
// //   padding: "8px 10px", fontSize: "15px", borderRadius: "8px",
// // });
// // const secBtn: React.CSSProperties = {
// //   flex: "0 0 auto", padding: "8px 16px", border: "1px solid #d0d6e6",
// //   borderRadius: "9px", fontSize: "15px", fontWeight: 700, color: "#4a5568",
// //   background: "#fff", cursor: "pointer", whiteSpace: "nowrap",
// // };
// // const primBtn = (bg: string): React.CSSProperties => ({
// //   flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center",
// //   gap: "6px", padding: "8px 18px", border: "none", borderRadius: "9px",
// //   fontSize: "15px", fontWeight: 700, color: "#fff", background: bg, cursor: "pointer",
// //   whiteSpace: "nowrap",
// // });

// // // ─── Status badge ─────────────────────────────────────────────────────────────

// // const StatusBadge: React.FC<{ status: string; size?: "sm" | "xs" }> = ({ status, size = "sm" }) => {
// //   const s = (status || "").toUpperCase();
// //   const map: Record<string, { bg: string; color: string; dot: string }> = {
// //     GIVEN:      { bg: "#dcfce7", color: "#166534", dot: "#16a34a" },
// //     HELD:       { bg: "#fef9c3", color: "#854d0e", dot: "#ca8a04" },
// //     REFUSED:    { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626" },
// //     OMITTED:    { bg: "#f3f4f6", color: "#374151", dot: "#9ca3af" },
// //     DISPENSED:  { bg: "#dcfce7", color: "#166534", dot: "#16a34a" },
// //     PENDING:    { bg: "#fef9c3", color: "#854d0e", dot: "#ca8a04" },
// //     DUE:        { bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
// //     OVERDUE:    { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626" },
// //   };
// //   const cfg = map[s] || { bg: "#f3f4f6", color: "#374151", dot: "#9ca3af" };
// //   const fs = size === "xs" ? "12px" : "13px";
// //   return (
// //     <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: cfg.bg, color: cfg.color, fontSize: fs, fontWeight: 800, textTransform: "uppercase", padding: "3px 8px", borderRadius: "20px", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>
// //       <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: cfg.dot, display: "inline-block", flexShrink: 0 }} />
// //       {status}
// //     </span>
// //   );
// // };

// // // ─── Route badge ──────────────────────────────────────────────────────────────

// // const RouteBadge: React.FC<{ route: string }> = ({ route }) => (
// //   <span style={{ display: "inline-block", background: "#ccfbf1", color: "#0f766e", fontSize: "12px", fontWeight: 800, textTransform: "uppercase", padding: "3px 8px", borderRadius: "20px", letterSpacing: "0.5px" }}>
// //     {route}
// //   </span>
// // );

// // // ─── MAR Grid slot chip ────────────────────────────────────────────────────────

// // const slotColors = (slot: MarGridSlot): { bg: string; color: string; border: string } => {
// //   const s = (slot.status || "").toLowerCase();
// //   if (s === "given" || s === "administered") return { bg: "#dcfce7", color: "#166534", border: "#86efac" };
// //   if (s === "missed" || s === "refused" || s === "omitted") return { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" };
// //   if (slot.is_overdue) return { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" };
// //   if (s === "held") return { bg: "#fef9c3", color: "#854d0e", border: "#fde047" };
// //   return { bg: "#f1f5f9", color: "#475569", border: "#e2e8f0" }; // pending
// // };

// // const SlotChip: React.FC<{ slot: MarGridSlot; clickable: boolean; onAdminister: () => void; onViewDetail: () => void }> = ({ slot, clickable, onAdminister, onViewDetail }) => {
// //   const c = slotColors(slot);
// //   const isPending = (slot.status || "").toLowerCase() === "pending";
// //   const hasDetail = !isPending && (slot.admin_id != null || !!slot.actual_label || !!slot.remarks);
// //   const isActionable = (isPending && clickable) || hasDetail;
// //   return (
// //     <button
// //       type="button"
// //       onClick={isActionable ? (isPending ? onAdminister : onViewDetail) : undefined}
// //       title={slot.remarks || undefined}
// //       style={{
// //         display: "block", width: "100%", textAlign: "left", marginBottom: "4px",
// //         padding: "4px 7px", borderRadius: "6px", border: `1px solid ${c.border}`,
// //         background: c.bg, color: c.color, fontSize: "13px", fontWeight: 800,
// //         cursor: isActionable ? "pointer" : "default",
// //         whiteSpace: "nowrap",
// //       }}
// //     >
// //       {slot.actual_label || slot.scheduled_label}
// //     </button>
// //   );
// // };


// // // ─── Compact Slot Chip for Monthly Grid ───────────────────────────────────────
// // const CompactSlotChip: React.FC<{ slot: MarGridSlot; clickable: boolean; onAction: () => void; }> = ({ slot, clickable, onAction }) => {
// //   const c = slotColors(slot);
// //   const isPending = (slot.status || "").toLowerCase() === "pending";
// //   const hasDetail = !isPending && (slot.admin_id != null || !!slot.actual_label || !!slot.remarks);
// //   const isActionable = (isPending && clickable) || hasDetail;
// //   return (
// //       <button
// //         type="button"
// //         onClick={isActionable ? onAction : undefined}
// //         title={slot.remarks || (isPending ? `Scheduled: ${slot.scheduled_label}` : `Given: ${slot.actual_label}`)}
// //         style={{
// //           display: "block", width: "100%", textAlign: "center", marginBottom: "2px",
// //           padding: "2px", borderRadius: "4px", border: `1px solid ${c.border}`,
// //           background: c.bg, color: c.color, fontSize: "10px", fontWeight: 700,
// //           cursor: isActionable ? "pointer" : "default", whiteSpace: "nowrap",
// //         }}
// //       >
// //         {slot.actual_label || slot.scheduled_label}
// //       </button>
// //     );
// // };

// // // ─── Inline Administration Form ───────────────────────────────────────────────

// // const AdminForm: React.FC<{
// //   med: DueMedication;
// //   encounterNumber: string;
// //   onCancel: () => void;
// //   onSave: () => void;
// // }> = ({ med, encounterNumber, onCancel, onSave }) => {
// //   const rc = routeConfig(med.route);
// //   const { notify } = useNotification();
// //   const [submitting, setSubmitting] = useState(false);

// //   const [dose, setDose] = useState(med.dosage || "");
// //   const [administeredAt, setAdministeredAt] = useState(toInputDatetime(getLocalTimestamp()));
// //   const [volumeMl, setVolumeMl] = useState("");
// //   const [diluent, setDiluent] = useState("");
// //   const [rateMlHr, setRateMlHr] = useState("");
// //   const [flushMl, setFlushMl] = useState("");
// //   const [accessSite, setAccessSite] = useState("");
// //   const [batchNumber, setBatchNumber] = useState("");
// //   const [remarks, setRemarks] = useState("");

// //   const handleSubmit = async (e: React.FormEvent) => {
// //     e.preventDefault();
// //     if (!dose.trim()) { notify("Dose is required", "warning"); return; }
// //     if (!administeredAt) { notify("Administered at time is required", "warning"); return; }
// //     if (rc.showVolume && !volumeMl) { notify("Volume (ml) is required for this route", "warning"); return; }

// //     setSubmitting(true);
// //     try {
// //       const payload: any = {
// //         encounter_number: encounterNumber,
// //         prescription_id: med.prescription_id,
// //         drug_id: med.drug_id,
// //         dose,
// //         route: med.route,
// //         administered_at: fromInputDatetime(administeredAt),
// //         status: "given",
// //       };
// //       if (rc.showVolume && volumeMl)   payload.volume_ml = Number(volumeMl);
// //       if (rc.showDiluent && diluent)   payload.diluent = diluent;
// //       if (rc.showRate && rateMlHr)     payload.rate_ml_hr = Number(rateMlHr);
// //       if (rc.showFlush && flushMl)     payload.flush_ml = Number(flushMl);
// //       if (rc.showAccessSite && accessSite) payload.access_site = accessSite;
// //       if (rc.showBatch && batchNumber) payload.batch_number = batchNumber;
// //       if (remarks.trim())              payload.remarks = remarks.trim();

// //       await nursingService.administerMedication(payload);
// //       notify(`${med.drug_name} administered successfully`, "success");
// //       onSave();
// //     } catch (err: any) {
// //       notify(err.response?.data?.message || "Failed to record administration", "error");
// //     } finally {
// //       setSubmitting(false);
// //     }
// //   };


// //   return (
// //     <div style={{ margin: "0 0 0", background: rc.bg, border: `1px solid ${rc.color}30`, borderRadius: "10px", padding: "14px 16px" }}>
// //       {/* Form header */}
// //       <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "14px", color: rc.color, fontWeight: 800, fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
// //         <Plus size={13} /> Record Administration — <span style={{ opacity: 0.85 }}>{rc.label}</span>
// //       </div>

// //       <form onSubmit={handleSubmit}>
// //         {/* Row 1: Dose + Administered At */}
// //         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
// //           <div>
// //             <label style={lbl}>Dose <span style={{ color: "#e11d48" }}>*</span></label>
// //             <input type="text" value={dose} onChange={e => setDose(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 500mg" autoFocus />
// //           </div>
// //           <div>
// //             <label style={lbl}>Administered At <span style={{ color: "#e11d48" }}>*</span></label>
// //             <input type="datetime-local" value={administeredAt} onChange={e => setAdministeredAt(e.target.value)} style={inpSm(`${rc.color}60`)} />
// //           </div>
// //         </div>

// //         {/* Row 2: Volume + Diluent (if applicable) */}
// //         {(rc.showVolume || rc.showDiluent) && (
// //           <div style={{ display: "grid", gridTemplateColumns: rc.showVolume && rc.showDiluent ? "1fr 1fr" : "1fr", gap: "10px", marginBottom: "10px" }}>
// //             {rc.showVolume && (
// //               <div>
// //                 <label style={lbl}>Volume (ml) <span style={{ color: "#e11d48" }}>*</span></label>
// //                 <input type="number" min="1" value={volumeMl} onChange={e => setVolumeMl(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 100" />
// //               </div>
// //             )}
// //             {rc.showDiluent && (
// //               <div>
// //                 <label style={lbl}>Diluent</label>
// //                 <input type="text" value={diluent} onChange={e => setDiluent(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. Normal Saline" />
// //               </div>
// //             )}
// //           </div>
// //         )}

// //         {/* Row 3: Rate + Flush (IV only) */}
// //         {(rc.showRate || rc.showFlush) && (
// //           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
// //             {rc.showRate && (
// //               <div>
// //                 <label style={lbl}>Rate (ml/hr)</label>
// //                 <input type="number" min="1" value={rateMlHr} onChange={e => setRateMlHr(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 50" />
// //               </div>
// //             )}
// //             {rc.showFlush && (
// //               <div>
// //                 <label style={lbl}>Flush (ml)</label>
// //                 <input type="number" min="0" value={flushMl} onChange={e => setFlushMl(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. 10" />
// //               </div>
// //             )}
// //           </div>
// //         )}

// //         {/* Row 4: Access Site + Batch Number (if applicable) */}
// //         {(rc.showAccessSite || rc.showBatch) && (
// //           <div style={{ display: "grid", gridTemplateColumns: rc.showAccessSite && rc.showBatch ? "1fr 1fr" : "1fr", gap: "10px", marginBottom: "10px" }}>
// //             {rc.showAccessSite && (
// //               <div>
// //                 <label style={lbl}>Access Site</label>
// //                 <input type="text" value={accessSite} onChange={e => setAccessSite(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. Right forearm" />
// //               </div>
// //             )}
// //             {rc.showBatch && (
// //               <div>
// //                 <label style={lbl}>Batch / Unit Number</label>
// //                 <input type="text" value={batchNumber} onChange={e => setBatchNumber(e.target.value)} style={inpSm(`${rc.color}60`)} placeholder="e.g. PRBC-20240524" />
// //               </div>
// //             )}
// //           </div>
// //         )}

// //         {/* Remarks */}
// //         <div style={{ marginBottom: "12px" }}>
// //           <label style={lbl}>Remarks <span style={{ fontWeight: 400, color: "#aaa", textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
// //           <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} style={inpSm(`${rc.color}40`)} placeholder="e.g. Given slowly over 20 minutes" />
// //         </div>

// //         {/* Actions */}
// //         <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
// //           <button type="button" style={secBtn} onClick={onCancel}>Cancel</button>
// //           <button type="submit" disabled={submitting} style={primBtn(rc.color)}>
// //             {submitting
// //               ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
// //               : <CheckCircle2 size={13} />}
// //             Mark as Given
// //           </button>
// //         </div>
// //       </form>
// //     </div>
// //   );
// // };

// // // ─── Due Medication Card ──────────────────────────────────────────────────────

// // const DueMedCard: React.FC<{
// //   med: DueMedication;
// //   encounterNumber: string;
// //   onSave: () => void;
// // }> = ({ med, encounterNumber, onSave }) => {
// //   const [showForm, setShowForm] = useState(false);
// //   const isDispensed = (med.dispense_status || "").toUpperCase() === "DISPENSED";
// //   const rc = routeConfig(med.route);

// //   return (
// //     <div style={{
// //       background: "#fff",
// //       borderRadius: "12px",
// //       border: "1px solid #e0e4ef",
// //       boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
// //       borderLeft: `4px solid ${isDispensed ? rc.color : "#d1d5db"}`,
// //       opacity: isDispensed ? 1 : 0.75,
// //       marginBottom: "12px",
// //     }}>
// //       {/* Card header */}
// //       <div style={{ padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
// //         {/* Icon */}
// //         <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `${isDispensed ? rc.color : "#6b7280"}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
// //           <Pill size={18} color={isDispensed ? rc.color : "#6b7280"} />
// //         </div>

// //         {/* Main info */}
// //         <div style={{ flex: 1, minWidth: 0 }}>
// //           <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
// //             <span style={{ fontWeight: 800, fontSize: "18px", color: "#1c2b4a" }}>{med.drug_name}</span>
// //             <RouteBadge route={med.route} />
// //             <StatusBadge status={med.due_status} size="xs" />
// //             {!isDispensed && (
// //               <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#fef9c3", color: "#854d0e", fontSize: "12px", fontWeight: 800, padding: "3px 8px", borderRadius: "20px", border: "1px solid #fde047" }}>
// //                 <AlertTriangle size={9} /> Not Yet Dispensed
// //               </span>
// //             )}
// //           </div>

// //           <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "4px" }}>
// //             {[
// //               ["Dose", med.dosage],
// //               ["Frequency", med.frequency],
// //               ["Prescribed by", med.prescribed_by],
// //             ].map(([k, v]) => (
// //               <div key={k}>
// //                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
// //                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{v || "—"}</div>
// //               </div>
// //             ))}
// //             {med.prescribed_at && (
// //               <div>
// //                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Prescribed On</div>
// //                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{fmtDt(med.prescribed_at)}</div>
// //               </div>
// //             )}
// //             {med.last_administered_at && (
// //               <div>
// //                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Last Given</div>
// //                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{fmtDt(med.last_administered_at)}</div>
// //               </div>
// //             )}
// //           </div>

// //           {med.instructions && (
// //             <div style={{ marginTop: "6px", fontSize: "14px", color: "#6b7a9a", fontStyle: "italic" }}>
// //               ℹ {med.instructions}
// //             </div>
// //           )}
// //         </div>

// //         {/* Give button */}
// //         {isDispensed && (
// //           <button
// //             onClick={() => setShowForm(f => !f)}
// //             style={{
// //               display: "flex", alignItems: "center", gap: "4px",
// //               padding: "7px 14px", border: `1.5px solid ${rc.color}`,
// //               borderRadius: "8px", background: showForm ? rc.color : "#fff",
// //               color: showForm ? "#fff" : rc.color,
// //               fontSize: "14px", fontWeight: 800, cursor: "pointer",
// //               whiteSpace: "nowrap", transition: "all 0.15s", flexShrink: 0,
// //             }}
// //           >
// //             <CheckCircle2 size={12} />
// //             {showForm ? "Cancel" : "Give"}
// //           </button>
// //         )}
// //       </div>

// //       {/* Inline admin form */}
// //       {showForm && isDispensed && (
// //         <div style={{ padding: "0 14px 14px" }}>
// //           <AdminForm
// //             med={med}
// //             encounterNumber={encounterNumber}
// //             onCancel={() => setShowForm(false)}
// //             onSave={() => { setShowForm(false); onSave(); }}
// //           />
// //         </div>
// //       )}
// //     </div>
// //   );
// // };

// // // ─── History Card ─────────────────────────────────────────────────────────────

// // const HistoryCard: React.FC<{ record: AdminHistory }> = ({ record }) => {
// //   const [expanded, setExpanded] = useState(false);
// //   const rc = routeConfig(record.route);

// //   return (
// //     <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e0e4ef", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", borderLeft: `3px solid ${rc.color}`, marginBottom: "10px" }}>
// //       {/* Summary row */}
// //       <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
// //         <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: `${rc.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
// //           <Pill size={14} color={rc.color} />
// //         </div>

// //         <div style={{ flex: 1, minWidth: 0 }}>
// //           <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "2px" }}>
// //             <span style={{ fontWeight: 800, fontSize: "16px", color: "#1c2b4a" }}>{record.drug_name}</span>
// //             <RouteBadge route={record.route} />
// //             <StatusBadge status={record.status} size="xs" />
// //           </div>
// //           <div style={{ fontSize: "14px", color: "#6b7a9a" }}>
// //             <span style={{ fontWeight: 600, color: "#1c2b4a" }}>{record.dose}</span>
// //             {" · "}
// //             <Clock size={9} style={{ display: "inline", verticalAlign: "middle", marginRight: "2px" }} />
// //             {fmtDt(record.administered_at)}
// //             {" · by "}<span style={{ fontWeight: 600, color: "#1c2b4a" }}>{record.administered_by_name}</span>
// //           </div>
// //         </div>

// //         <button
// //           onClick={() => setExpanded(e => !e)}
// //           style={{ background: "none", border: "none", cursor: "pointer", color: "#8a94ad", padding: "4px", borderRadius: "6px", lineHeight: 1, flexShrink: 0 }}
// //         >
// //           {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
// //         </button>
// //       </div>

// //       {/* Expanded detail */}
// //       {expanded && (
// //         <div style={{ padding: "0 14px 12px", background: "#f8f9fc", borderTop: "1px dashed #e0e4ef" }}>
// //           <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", paddingTop: "10px" }}>
// //             {([
// //               ["Prescribed Dose", record.dosage],
// //               ["Frequency", record.frequency],
// //               rc.showDiluent && ["Diluent", record.diluent],
// //               rc.showRate && ["Rate", record.rate_ml_hr ? `${record.rate_ml_hr} ml/hr` : null],
// //               rc.showAccessSite && ["Access Site", record.access_site],
// //               rc.showBatch && ["Batch No.", record.batch_number],
// //             ].filter(Boolean) as [string, string | null][]).map(([k, v]) => (
// //               <div key={k}>
// //                 <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
// //                 <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{v || "—"}</div>
// //               </div>
// //             ))}
// //           </div>
// //           {record.remarks && (
// //             <div style={{ marginTop: "8px", fontSize: "14px", color: "#6b7a9a", fontStyle: "italic" }}>
// //               "{record.remarks}"
// //             </div>
// //           )}
// //         </div>
// //       )}
// //     </div>
// //   );
// // };



// // // ─── Main MARPanel ────────────────────────────────────────────────────────────

// // const MARPanel: React.FC<MARPanelProps> = ({ encounterNumber, onClose }) => {
// //   const [activeTab, setActiveTab] = useState<"due" | "history" | "grid">("due");
// //   const [dueMeds, setDueMeds] = useState<DueMedication[]>([]);
// //   const [history, setHistory] = useState<AdminHistory[]>([]);
// //   const [loadingDue, setLoadingDue] = useState(true);
// //   const [loadingHistory, setLoadingHistory] = useState(true);
// //   const [gridHeaders, setGridHeaders] = useState<MarGridHeader[]>([]);
// //   const [gridRows, setGridRows] = useState<MarGridRow[]>([]);
// //   const [loadingGrid, setLoadingGrid] = useState(true);
// //   const [activeSlot, setActiveSlot] = useState<{ row: MarGridRow; date: string; slot: MarGridSlot } | null>(null);
// //   const [viewSlotDetail, setViewSlotDetail] = useState<{ row: MarGridRow; date: string; slot: MarGridSlot } | null>(null);

// //   const fetchDue = useCallback(async () => {
// //     setLoadingDue(true);
// //     try {
// //       const res = await nursingService.getMARDue(encounterNumber);
// //       setDueMeds(res.data || []);
// //     } catch {
// //       setDueMeds([]);
// //     } finally {
// //       setLoadingDue(false);
// //     }
// //   }, [encounterNumber]);

// //   const fetchHistory = useCallback(async () => {
// //     setLoadingHistory(true);
// //     try {
// //       const res = await nursingService.getMARHistory(encounterNumber);
// //       setHistory(res.data || []);
// //     } catch {
// //       setHistory([]);
// //     } finally {
// //       setLoadingHistory(false);
// //     }
// //   }, [encounterNumber]);

// //   const fetchGrid = useCallback(async () => {
// //     setLoadingGrid(true);
// //     try {
// //       const res = await nursingService.getMARDueHistory(encounterNumber);
// //       setGridHeaders(res.data?.headers || []);
// //       setGridRows(res.data?.rows || []);
// //     } catch {
// //       setGridHeaders([]);
// //       setGridRows([]);
// //     } finally {
// //       setLoadingGrid(false);
// //     }
// //   }, [encounterNumber]);

// //   useEffect(() => {
// //     fetchDue();
// //     fetchHistory();
// //     fetchGrid();
// //   }, [fetchDue, fetchHistory, fetchGrid]);

// //   const handleAdminSave = () => {
// //     fetchDue();
// //     fetchHistory();
// //   };

// //   const handleGridAdminSave = () => {
// //     setActiveSlot(null);
// //     fetchDue();
// //     fetchHistory();
// //     fetchGrid();
// //   };

// //   const TEAL = "#0d9488";
// //   const TEAL_DARK = "#0f766e";

// //   const tabBtn = (tab: "due" | "history" | "grid"): React.CSSProperties => ({
// //     flex: 1, padding: "9px 12px", border: "none", cursor: "pointer",
// //     fontSize: "15px", fontWeight: 800, display: "flex", alignItems: "center",
// //     justifyContent: "center", gap: "6px", transition: "all 0.15s",
// //     borderBottom: activeTab === tab ? `2px solid ${TEAL}` : "2px solid transparent",
// //     background: activeTab === tab ? "#f0fdfa" : "#f8f9fc",
// //     color: activeTab === tab ? TEAL_DARK : "#6b7a9a",
// //   });

// //   return (
// //     <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #d8dce8", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>

// //       {/* ── Panel header ── */}
// //       <div style={{ background: `linear-gradient(135deg, ${TEAL_DARK} 0%, ${TEAL} 100%)`, padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
// //         <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
// //           <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
// //             <ClipboardList size={16} color="#fff" />
// //           </div>
// //           <div>
// //             <div style={{ fontWeight: 900, fontSize: "16px", color: "#fff", letterSpacing: "0.3px" }}>Medication Administration Record</div>
// //             <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", marginTop: "1px" }}>MAR · {encounterNumber}</div>
// //           </div>
// //           {dueMeds.length > 0 && (
// //             <span style={{ background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: "13px", fontWeight: 800, padding: "3px 10px", borderRadius: "20px", marginLeft: "4px" }}>
// //               {dueMeds.filter(m => (m.dispense_status || "").toUpperCase() === "DISPENSED").length} due
// //             </span>
// //           )}
// //         </div>
// //         {onClose && (
// //           <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "7px", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer" }}>
// //             <X size={16} />
// //           </button>
// //         )}
// //       </div>

// //       {/* ── Tabs ── */}
// //       <div style={{ display: "flex", borderBottom: "1px solid #e0e4ef", flexShrink: 0 }}>
// //         <button style={tabBtn("due")} onClick={() => setActiveTab("due")}>
// //           <Pill size={13} /> Due Medications
// //           {!loadingDue && dueMeds.length > 0 && (
// //             <span style={{ background: TEAL, color: "#fff", borderRadius: "20px", fontSize: "12px", fontWeight: 900, padding: "1px 6px", marginLeft: "2px" }}>
// //               {dueMeds.length}
// //             </span>
// //           )}
// //         </button>
// //         <button style={tabBtn("history")} onClick={() => setActiveTab("history")}>
// //           <History size={13} /> Administration History
// //           {!loadingHistory && history.length > 0 && (
// //             <span style={{ background: "#6b7a9a", color: "#fff", borderRadius: "20px", fontSize: "12px", fontWeight: 900, padding: "1px 6px", marginLeft: "2px" }}>
// //               {history.length}
// //             </span>
// //           )}
// //         </button>
// //         <button style={tabBtn("grid")} onClick={() => setActiveTab("grid")}>
// //           <LayoutGrid size={13} /> MAR Chart
// //         </button>

// //         <button style={tabBtn("grid")} onClick={()=> setActiveTab("grid")}>
// //             <LayoutGrid size={13} /> MAR Chart I

// //         </button>
// //       </div>

// //       {/* ── Tab Body ── */}
// //       <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px", flex: 1, overflowY: "auto" }}>

// //         {/* DUE TAB */}
// //         {activeTab === "due" && (
// //           <>
// //             {loadingDue ? (
// //               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a", fontSize: "16px" }}>
// //                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
// //                 Loading due medications…
// //               </div>
// //             ) : dueMeds.length === 0 ? (
// //               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a" }}>
// //                 <CheckCircle2 size={32} color="#a7f3d0" />
// //                 <span style={{ fontSize: "16px", fontWeight: 700, color: "#0f766e" }}>No due medications</span>
// //                 <span style={{ fontSize: "14px", color: "#8a94ad" }}>All scheduled medications have been administered</span>
// //               </div>
// //             ) : (
// //               dueMeds.map(med => (
// //                 <DueMedCard
// //                   key={med.prescription_id}
// //                   med={med}
// //                   encounterNumber={encounterNumber}
// //                   onSave={handleAdminSave}
// //                 />
// //               ))
// //             )}
// //           </>
// //         )}

// //         {/* HISTORY TAB */}
// //         {activeTab === "history" && (
// //           <>
// //             {loadingHistory ? (
// //               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a", fontSize: "16px" }}>
// //                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
// //                 Loading history…
// //               </div>
// //             ) : history.length === 0 ? (
// //               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a" }}>
// //                 <History size={32} color="#d1d5db" />
// //                 <span style={{ fontSize: "16px", fontWeight: 700 }}>No administration history</span>
// //                 <span style={{ fontSize: "14px", color: "#8a94ad" }}>Administered medications will appear here</span>
// //               </div>
// //             ) : (
// //               <>
// //                 <div style={{ fontSize: "13px", fontWeight: 700, color: "#8a94ad", textTransform: "uppercase", letterSpacing: "0.6px", padding: "0 2px 4px" }}>
// //                   {history.length} record{history.length !== 1 ? "s" : ""} found
// //                 </div>
// //                 {[...history]
// //                   .sort((a, b) => new Date(b.administered_at.replace(" ", "T")).getTime() - new Date(a.administered_at.replace(" ", "T")).getTime())
// //                   .map(record => (
// //                     <HistoryCard key={record.id} record={record} />
// //                   ))
// //                 }
// //               </>
// //             )}
// //           </>
// //         )}

// //         {/* GRID TAB */}
// //         {activeTab === "grid" && (
// //           <>
// //             {loadingGrid ? (
// //               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a", fontSize: "16px" }}>
// //                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
// //                 Loading MAR chart…
// //               </div>
// //             ) : gridRows.length === 0 ? (
// //               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: "8px", color: "#6b7a9a" }}>
// //                 <LayoutGrid size={32} color="#d1d5db" />
// //                 <span style={{ fontSize: "16px", fontWeight: 700 }}>No medications scheduled this week</span>
// //               </div>
// //             ) : (
// //               <div style={{ overflowX: "auto", border: "1px solid #e0e4ef", borderRadius: "10px" }}>
// //                 <table style={{ borderCollapse: "collapse", width: "100%", minWidth: `${200 + gridHeaders.length * 120}px` }}>
// //                   <thead>
// //                     <tr>
// //                       <th style={{
// //                         position: "sticky", left: 0, zIndex: 1, background: "#f8f9fc",
// //                         textAlign: "left", padding: "10px 14px", fontSize: "13px", fontWeight: 800,
// //                         color: "#6b7a9a", textTransform: "uppercase", letterSpacing: "0.5px",
// //                         borderBottom: "1px solid #e0e4ef", borderRight: "1px solid #e0e4ef",
// //                         minWidth: "200px",
// //                       }}>
// //                         Medication
// //                       </th>
// //                       {gridHeaders.map(h => (
// //                         <th key={h.date} style={{
// //                           padding: "10px 12px", fontSize: "13px", fontWeight: 800, color: "#6b7a9a",
// //                           textTransform: "uppercase", letterSpacing: "0.5px", background: "#f8f9fc",
// //                           borderBottom: "1px solid #e0e4ef", borderLeft: "1px solid #eef1f7", minWidth: "120px",
// //                         }}>
// //                           <div>{h.day_name}</div>
// //                           <div style={{ fontWeight: 600, color: "#8a94ad", marginTop: "2px" }}>{h.display}</div>
// //                         </th>
// //                       ))}
// //                     </tr>
// //                   </thead>
// //                   <tbody>
// //                     {gridRows.map(row => {
// //                       const isInactive = row.prescription_status === "STOPPED" || row.prescription_status === "CANCELLED";
// //                       return (
// //                         <tr key={row.prescription_id} style={{ opacity: isInactive ? 0.55 : 1 }}>
// //                           <td style={{
// //                             position: "sticky", left: 0, zIndex: 1, background: "#fff",
// //                             padding: "10px 14px", borderBottom: "1px solid #eef1f7", borderRight: "1px solid #e0e4ef",
// //                             verticalAlign: "top",
// //                           }}>
// //                             <div style={{ fontWeight: 800, fontSize: "15px", color: "#1c2b4a" }}>{row.drug_name}</div>
// //                             <div style={{ fontSize: "13px", color: "#6b7a9a", marginTop: "2px" }}>{row.dosage_info}</div>
// //                             <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
// //                               <span style={{ fontSize: "12px", color: "#8a94ad" }}>Start: {row.start_date}</span>
// //                               <StatusBadge status={row.prescription_status} size="xs" />
// //                             </div>
// //                           </td>
// //                           {gridHeaders.map(h => {
// //                             const slots = row.days[h.date] || [];
// //                             return (
// //                               <td key={h.date} style={{
// //                                 padding: "8px", verticalAlign: "top",
// //                                 borderBottom: "1px solid #eef1f7", borderLeft: "1px solid #eef1f7",
// //                               }}>
// //                                 {slots.length === 0 ? (
// //                                   <span style={{ fontSize: "14px", color: "#cbd5e1" }}>—</span>
// //                                 ) : (
// //                                   slots.map((slot, i) => (
// //                                     <SlotChip
// //                                       key={i}
// //                                       slot={slot}
// //                                       clickable={!isInactive}
// //                                       onAdminister={() => setActiveSlot({ row, date: h.date, slot })}
// //                                       onViewDetail={() => setViewSlotDetail({ row, date: h.date, slot })}
// //                                     />
// //                                   ))
// //                                 )}
// //                               </td>
// //                             );
// //                           })}
// //                         </tr>
// //                       );
// //                     })}
// //                   </tbody>
// //                 </table>
// //               </div>
// //             )}
// //           </>
// //         )}


// //         {/* GRID TAB (MONTHLY CALENDAR) */}
// //         {activeTab === "paperGrid" && (
// //           <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            
// //             {/* Calendar Controls & Patient Header matching paper-mar-chart-example.png */}
// //             <div style={{ marginBottom: "16px", border: "2px solid #1e293b", borderRadius: "8px", overflow: "hidden" }}>
// //               <div style={{ background: "#f8fafc", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #1e293b" }}>
// //                 <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px" }}>
// //                   Personal Medication Administration Record (MAR)
// //                 </h2>
// //                 <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
// //                   <button onClick={handlePrevMonth} style={{ background: "none", border: "none", cursor: "pointer" }}><ChevronLeft size={20} /></button>
// //                   <span style={{ fontSize: "16px", fontWeight: 800, minWidth: "140px", textAlign: "center" }}>
// //                     {monthNames[currentMonth - 1]} {currentYear}
// //                   </span>
// //                   <button onClick={handleNextMonth} style={{ background: "none", border: "none", cursor: "pointer" }}><ChevronRight size={20} /></button>
// //                 </div>
// //               </div>
              
// //               <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", fontSize: "12px", background: "#fff" }}>
// //                 <div style={{ padding: "8px", borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1" }}>
// //                   <strong>PATIENT NAME:</strong> {encounterNumber} {/* Ideally map to actual patient name */}
// //                 </div>
// //                 <div style={{ padding: "8px", borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1" }}>
// //                   <strong>D.O.B.:</strong> —
// //                 </div>
// //                 <div style={{ padding: "8px", borderBottom: "1px solid #cbd5e1" }}>
// //                   <strong>ADDRESS:</strong> —
// //                 </div>
// //                 <div style={{ padding: "8px", borderRight: "1px solid #cbd5e1", gridColumn: "span 1" }}>
// //                   <strong>GP NAME:</strong> —
// //                 </div>
// //                 <div style={{ padding: "8px", gridColumn: "span 2" }}>
// //                   <strong>KNOWN ALLERGIES:</strong> <span style={{ color: "#ef4444", fontWeight: 800 }}>None Recorded</span>
// //                 </div>
// //               </div>
// //             </div>

// //             {loadingGrid ? (
// //               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px", color: "#6b7a9a" }}>
// //                 <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: TEAL }} />
// //               </div>
// //             ) : gridRows.length === 0 ? (
// //               <div style={{ textAlign: "center", padding: "48px", color: "#6b7a9a", fontWeight: 700 }}>No medications scheduled this month</div>
// //             ) : (
// //               <div style={{ overflowX: "auto", border: "2px solid #1e293b", flex: 1 }}>
// //                 <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed", minWidth: "1200px" }}>
// //                   <thead>
// //                     <tr>
// //                       <th style={{ width: "250px", position: "sticky", left: 0, zIndex: 2, background: "#f8fafc", borderRight: "2px solid #1e293b", borderBottom: "2px solid #1e293b", padding: "8px", textAlign: "left", fontSize: "11px", textTransform: "uppercase" }}>
// //                         Medication<br/>
// //                         <span style={{ fontWeight: 400, color: "#64748b" }}>(Name, strength, dose, frequency, route)</span>
// //                       </th>
// //                       {gridHeaders.map(h => (
// //                         <th key={h.date} style={{ borderBottom: "2px solid #1e293b", borderRight: "1px solid #cbd5e1", background: "#f8fafc", padding: "4px 0", width: "32px", textAlign: "center", fontSize: "12px" }}>
// //                           {h.display}
// //                         </th>
// //                       ))}
// //                     </tr>
// //                   </thead>
// //                   <tbody>
// //                     {gridRows.map(row => {
// //                       const isInactive = row.prescription_status === "STOPPED" || row.prescription_status === "CANCELLED";
// //                       return (
// //                         <tr key={row.prescription_id} style={{ opacity: isInactive ? 0.6 : 1, background: isInactive ? "#f1f5f9" : "#fff" }}>
                          
// //                           {/* Medication Detail Column */}
// //                           <td style={{ position: "sticky", left: 0, zIndex: 1, background: isInactive ? "#f1f5f9" : "#fff", borderRight: "2px solid #1e293b", borderBottom: "1px solid #cbd5e1", padding: "8px", verticalAlign: "top" }}>
// //                             <div style={{ fontWeight: 900, fontSize: "13px", color: "#0f172a" }}>{row.drug_name}</div>
// //                             <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px", fontWeight: 600 }}>{row.dosage_info}</div>
// //                             {row.instructions && <div style={{ fontSize: "10px", color: "#64748b", fontStyle: "italic", marginTop: "2px" }}>Inst: {row.instructions}</div>}
// //                             <div style={{ marginTop: "4px" }}>
// //                               <StatusBadge status={row.prescription_status} size="xs" />
// //                             </div>
// //                           </td>

// //                           {/* 1-31 Day Columns */}
// //                           {gridHeaders.map(h => {
// //                             const slots = row.days[h.date] || [];
// //                             return (
// //                               <td key={h.date} style={{ borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1", padding: "2px", verticalAlign: "top", background: isInactive ? "#f8fafc" : "#fff" }}>
// //                                 {slots.length === 0 ? null : (
// //                                   slots.map((slot, i) => (
// //                                     <CompactSlotChip
// //                                       key={i}
// //                                       slot={slot}
// //                                       clickable={!isInactive}
// //                                       onAction={() => {
// //                                         const isPending = (slot.status || "").toLowerCase() === "pending";
// //                                         if (isPending) setActiveSlot({ row, date: h.date, slot });
// //                                         else setViewSlotDetail({ row, date: h.date, slot });
// //                                       }}
// //                                     />
// //                                   ))
// //                                 )}
// //                               </td>
// //                             );
// //                           })}
// //                         </tr>
// //                       );
// //                     })}
// //                   </tbody>
// //                 </table>
// //               </div>
// //             )}
// //           </div>
// //         )}
// //       </div>

// //       </div>

// //       {/* ── Grid slot administer modal ── */}
// //       {activeSlot && (
// //         <div
// //           style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "16px" }}
// //           onClick={() => setActiveSlot(null)}
// //         >
// //           <div style={{ width: "100%", maxWidth: "460px" }} onClick={e => e.stopPropagation()}>
// //             <AdminForm
// //               med={{
// //                 prescription_id: activeSlot.row.prescription_id,
// //                 drug_name: activeSlot.row.drug_name,
// //                 drug_id: dueMeds.find(d => d.prescription_id === activeSlot.row.prescription_id)?.drug_id,
// //                 ...parseDosageInfo(activeSlot.row.dosage_info),
// //                 instructions: null,
// //                 dispense_status: "DISPENSED",
// //                 prescribed_by: "",
// //                 prescribed_at: null,
// //                 last_admin_id: null,
// //                 last_admin_status: null,
// //                 last_administered_at: null,
// //                 last_administered_by: null,
// //                 last_administered_by_name: null,
// //                 due_status: activeSlot.row.due_status,
// //               }}
// //               encounterNumber={encounterNumber}
// //               onCancel={() => setActiveSlot(null)}
// //               onSave={handleGridAdminSave}
// //             />
// //           </div>
// //         </div>
// //       )}

// //       {/* ── Grid slot detail (view) modal ── */}
// //       {viewSlotDetail && (() => {
// //         const fullRecord = history.find(h => h.id === viewSlotDetail.slot.admin_id);
// //         const rc = routeConfig(fullRecord?.route || parseDosageInfo(viewSlotDetail.row.dosage_info).route);
// //         return (
// //           <div
// //             style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "16px" }}
// //             onClick={() => setViewSlotDetail(null)}
// //           >
// //             <div style={{ width: "100%", maxWidth: "460px", background: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
// //               <div style={{ background: rc.color, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", color: "#fff" }}>
// //                 <div>
// //                   <div style={{ fontSize: "16px", fontWeight: 800 }}>{viewSlotDetail.row.drug_name}</div>
// //                   <div style={{ fontSize: "13px", opacity: 0.85, marginTop: "2px" }}>
// //                     Scheduled {viewSlotDetail.slot.scheduled_label} · {viewSlotDetail.date}
// //                   </div>
// //                 </div>
// //                 <button onClick={() => setViewSlotDetail(null)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "6px", width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer" }}>
// //                   <X size={16} />
// //                 </button>
// //               </div>
// //               <div style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
// //                 <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
// //                   <StatusBadge status={viewSlotDetail.slot.status} />
// //                   {fullRecord && <RouteBadge route={fullRecord.route} />}
// //                 </div>

// //                 {fullRecord ? (
// //                   <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
// //                     {([
// //                       ["Dose Given", fullRecord.dose],
// //                       ["Administered At", fmtDt(fullRecord.administered_at)],
// //                       ["Given By", fullRecord.administered_by_name],
// //                       rc.showDiluent && ["Diluent", fullRecord.diluent],
// //                       rc.showRate && ["Rate", fullRecord.rate_ml_hr ? `${fullRecord.rate_ml_hr} ml/hr` : null],
// //                       rc.showAccessSite && ["Access Site", fullRecord.access_site],
// //                       rc.showBatch && ["Batch No.", fullRecord.batch_number],
// //                     ].filter(Boolean) as [string, string | null][]).map(([k, v]) => (
// //                       <div key={k}>
// //                         <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
// //                         <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{v || "—"}</div>
// //                       </div>
// //                     ))}
// //                   </div>
// //                 ) : (
// //                   <div style={{ fontSize: "14px", color: "#6b7a9a" }}>
// //                     Recorded as <strong>{viewSlotDetail.slot.actual_label || viewSlotDetail.slot.status}</strong>.
// //                     {" "}Full administration details aren't available for this entry.
// //                   </div>
// //                 )}

// //                 {viewSlotDetail.slot.remarks && (
// //                   <div style={{ fontSize: "14px", color: "#6b7a9a", fontStyle: "italic" }}>
// //                     "{viewSlotDetail.slot.remarks}"
// //                   </div>
// //                 )}
// //               </div>
// //               <div style={{ padding: "14px 18px", borderTop: "1px solid #eef1f7", display: "flex", justifyContent: "flex-end" }}>
// //                 <button onClick={() => setViewSlotDetail(null)} style={secBtn}>Close</button>
// //               </div>
// //             </div>
// //           </div>
// //         );
// //       })()}
// //     </div>
// //   );
// // };

// // export default MARPanel;
