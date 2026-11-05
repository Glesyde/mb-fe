import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { X, Save, AlertCircle, Loader2, MoreVertical, Edit3, XCircle } from "lucide-react";
import { nursingService } from "../services/nursing.service";
import { useNotification } from "../context/NotificationContext";
import InfusionPanel from "./InfusionPanel";
import MARPanel from "./MARPanel";
import TransfusionPanel from "./TransfusionPanel";


// ─── Constants ────────────────────────────────────────────────────────────────

// Replace the existing CHART_HOURS with this 07:00-07:00 configuration
const CHART_HOURS = [
  { label: "07:00-08:00", hour: 7 },
  { label: "08:00-09:00", hour: 8 },
  { label: "09:00-10:00", hour: 9 },
  { label: "10:00-11:00", hour: 10 },
  { label: "11:00-12:00", hour: 11 },
  { label: "12:00-13:00", hour: 12 },
  { label: "13:00-14:00", hour: 13 },
  { label: "14:00-15:00", hour: 14 },
  { label: "15:00-16:00", hour: 15 },
  { label: "16:00-17:00", hour: 16 },
  { label: "17:00-18:00", hour: 17 },
  { label: "18:00-19:00", hour: 18 },
  { label: "19:00-20:00", hour: 19 },
  { label: "20:00-21:00", hour: 20 },
  { label: "21:00-22:00", hour: 21 },
  { label: "22:00-23:00", hour: 22 },
  { label: "23:00-00:00", hour: 23 },
  { label: "00:00-01:00", hour: 0 },
  { label: "01:00-02:00", hour: 1 },
  { label: "02:00-03:00", hour: 2 },
  { label: "03:00-04:00", hour: 3 },
  { label: "04:00-05:00", hour: 4 },
  { label: "05:00-06:00", hour: 5 },
  { label: "06:00-07:00", hour: 6 },
];

// Update the local window boundaries to anchor at 07:00 AM
const localWindowStart = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 7, 0, 0, 0); 
};

const getTodayWindowStart = (): Date => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 0, 0, 0);
  // If the current time is before 7:00 AM, the active clinical shift is still "yesterday"
  if (now.getHours() < 7) {
    d.setDate(d.getDate() - 1);
  }
  return d;
};


// const CHART_HOURS = [
//   { label: "00:00-01:00", hour: 0 },
//   { label: "01:00-02:00", hour: 1 },
//   { label: "02:00-03:00", hour: 2 },
//   { label: "03:00-04:00", hour: 3 },
//   { label: "04:00-05:00", hour: 4 },
//   { label: "05:00-06:00", hour: 5 },
//   { label: "06:00-07:00", hour: 6 },
//   { label: "07:00-08:00", hour: 7 },
//   { label: "08:00-09:00", hour: 8 },
//   { label: "09:00-10:00", hour: 9 },
//   { label: "10:00-11:00", hour: 10 },
//   { label: "11:00-12:00", hour: 11 },
//   { label: "12:00-13:00", hour: 12 },
//   { label: "13:00-14:00", hour: 13 },
//   { label: "14:00-15:00", hour: 14 },
//   { label: "15:00-16:00", hour: 15 },
//   { label: "16:00-17:00", hour: 16 },
//   { label: "17:00-18:00", hour: 17 },
//   { label: "18:00-19:00", hour: 18 },
//   { label: "19:00-20:00", hour: 19 },
//   { label: "20:00-21:00", hour: 20 },
//   { label: "21:00-22:00", hour: 21 },
//   { label: "22:00-23:00", hour: 22 },
//   { label: "23:00-00:00", hour: 23 },
// ];

const INPUT_COLS: string[] = [
  "Oral", "IV Fluids", "IV Drugs", "Blood Products", "NG/PEG Feed", "Flushes", "TPN", "Other Input"
];
const OUTPUT_COLS: string[] = [
  "Urine", "Drain 1", "Drain 2", "Vomit", "NG Aspirate", "Stool/Diarrhoea", "Blood Loss", "Dialysis Output", "Other Output"
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChartEntry {
  id: number | null; // null for historical read-only entries
  type: "INTAKE" | "OUTPUT";
  source_type?: string;
  category: string;
  volume: number;
  hourly_rate?: number | null;
  recorded_at: string;
  remarks?: string;
  reference_id?: number | null;
  chart_hour: number;
  recorded_by_name?: string;
}

interface EntryLookup {
  [key: string]: ChartEntry;
}

type HourState = "past" | "current" | "future";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const catKey = (hour: number, category: string) =>
  `${hour}__${category.trim().toLowerCase()}`;

const getLocalTimestamp = (date: Date = new Date()) => {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const YYYY = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const DD = pad(date.getDate());
  const HH = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}`;
};

// const localWindowStart = (dateStr: string): Date => {
//   const [y, m, d] = dateStr.split("-").map(Number);
//   return new Date(y, m - 1, d, 0, 0, 0, 0);
// };

// const getTodayWindowStart = (): Date => {
//   const now = new Date();
//   return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
// };

const getHourState = (chartHour: number, isHistorical: boolean): HourState => {
  if (isHistorical) return "past";

  const nowH = new Date().getHours();
  if (chartHour === nowH) return "current";

  const windowOrder = CHART_HOURS.map((h) => h.hour);
  const nowIdx = windowOrder.indexOf(nowH);
  const hIdx = windowOrder.indexOf(chartHour);
  return hIdx < nowIdx ? "past" : "future";
};

const buildEntryLookup = (entries: ChartEntry[]): EntryLookup => {
  const map: EntryLookup = {};
  
  const sorted = [...entries].sort((a, b) => {
    const tA = a.recorded_at ? new Date(a.recorded_at.replace(" ", "T")).getTime() : 0;
    const tB = b.recorded_at ? new Date(b.recorded_at.replace(" ", "T")).getTime() : 0;
    return tA - tB;
  });

  sorted.forEach((e) => {
    const k = catKey(e.chart_hour, e.category);
    map[k] = e;
  });
  return map;
};

const colTotal = (lookup: EntryLookup, col: string, type: "INTAKE" | "OUTPUT") => {
  let total = 0;
  CHART_HOURS.forEach(({ hour }) => {
    const k = catKey(hour, col);
    const entry = lookup[k];
    if (entry && entry.type === type) {
      total += Number(entry.volume) || 0;
    }
  });
  return total;
};

const fmt = (dt: string) => {
  if (!dt) return "—";
  try {
    return new Date(dt.replace(" ", "T")).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dt;
  }
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface IOModalProps { isOpen: boolean; onClose: () => void; type: "INTAKE" | "OUTPUT"; category: string; encounterNumber: string; onSave: () => void; hour?: number; windowStart?: Date; }
const IOModal: React.FC<IOModalProps> = ({ isOpen, onClose, type, category, encounterNumber, onSave, hour, windowStart }) => {
  const [volume, setVolume] = useState("");
  const [remarks, setRemarks] = useState("");
  const [recordedAt, setRecordedAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { notify } = useNotification();


  useEffect(() => { 
    if (isOpen) { 
      setVolume(""); 
      setRemarks(""); 
      const pad = (n: number) => n.toString().padStart(2, "0");
      if (hour !== undefined && windowStart) {
        const d = new Date(windowStart);
        // Hours 0-6 belong to the next calendar day in a 07:00 shift
        if (hour < 7) d.setDate(d.getDate() + 1); 
        
        d.setHours(hour, 0, 0, 0);
        setRecordedAt(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
      } else {
        const d = new Date();
        setRecordedAt(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
      }
    } 
  }, [isOpen, category, hour, windowStart]);
   if (!isOpen) return null;

  // useEffect(() => { 
  //   if (isOpen) { 
  //     setVolume(""); 
  //     setRemarks(""); 
  //     const pad = (n: number) => n.toString().padStart(2, "0");
  //     if (hour !== undefined && windowStart) {
  //       const d = new Date(windowStart);
  //       d.setHours(hour, 0, 0, 0);
  //       setRecordedAt(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
  //     } else {
  //       const d = new Date();
  //       setRecordedAt(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
  //     }
  //   } 
  // }, [isOpen, category, hour, windowStart]);
  // if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!volume || isNaN(Number(volume)) || Number(volume) <= 0) { notify("Please enter a valid volume in ml", "warning"); return; }
    
    const isCurrentHour = hour !== undefined && hour === new Date().getHours();

    let finalRecordedAt = getLocalTimestamp();
    if (!isCurrentHour && recordedAt) {
      finalRecordedAt = recordedAt.replace("T", " ") + ":00";
    }

    if (!isCurrentHour && hour !== undefined) {
      const selectedDate = new Date(recordedAt);
      if (selectedDate.getHours() !== hour) {
        notify(`Please select a time between ${hour.toString().padStart(2, "0")}:00 and ${hour.toString().padStart(2, "0")}:59`, "warning");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: any = { encounter_number: encounterNumber, type, category, volume: parseFloat(volume), volume_ml: parseFloat(volume), remarks, recorded_at: finalRecordedAt };
      if (!isCurrentHour) {
        payload.event_at = finalRecordedAt;
      }
      await nursingService.logIO(payload);
      notify(`${category} logged successfully`, "success"); onSave(); onClose();
    } catch (err: any) { notify(err.response?.data?.message || "Failed to log I/O", "error"); } finally { setIsSubmitting(false); }
  };

  let minTime, maxTime;
  if (hour !== undefined && windowStart) {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const d = new Date(windowStart);
    // Roll forward to next calendar day for early morning entries
    if (hour < 7) d.setDate(d.getDate() + 1); 
    
    const base = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(hour)}`;
    minTime = `${base}:00`;
    maxTime = `${base}:59`;
  }
  
  // let minTime, maxTime;
  // if (hour !== undefined && windowStart) {
  //   const pad = (n: number) => n.toString().padStart(2, "0");
  //   const d = new Date(windowStart);
  //   const base = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(hour)}`;
  //   minTime = `${base}:00`;
  //   maxTime = `${base}:59`;
  // }

  const isCurrentHour = hour !== undefined && hour === new Date().getHours();

  return (
    <div style={modalOverlay}><div style={modalCard}><div style={modalHeader}>
      <div><h3 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#1c2b4a" }}>Add {type === "INTAKE" ? "Input" : "Output"}</h3><p style={{ margin: "3px 0 0", fontSize: "10px", fontWeight: 700, color: "#8a94ad", textTransform: "uppercase", letterSpacing: "0.8px" }}>{category}</p></div>
      <button type="button" onClick={onClose} style={iconBtn}><X size={18} color="#6b7a9a" /></button>
    </div>
    <form onSubmit={handleSubmit} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
      {!isCurrentHour && (
        <div><label style={fieldLabel}>Recorded At</label><input type="datetime-local" required min={minTime} max={maxTime} value={recordedAt} onChange={(e) => setRecordedAt(e.target.value)} style={fieldInput} /></div>
      )}
    
    <div>
  <label style={fieldLabel}>Volume (ml)</label>
  <input 
    type="number" 
    required 
    min="0" 
    step="any" 
    autoFocus 
    value={volume} 
    onChange={(e) => setVolume(e.target.value)} 
    style={fieldInput} 
    placeholder="e.g. 250" 
  />
</div>
      {/* <div><label style={fieldLabel}>Volume (ml)</label><input type="number" required min="0.1" autoFocus value={volume} onChange={(e) => setVolume(e.target.value)} style={fieldInput} placeholder="e.g. 250" /></div> */}
      <div><label style={fieldLabel}>Remarks <span style={{ color: "#aaa", fontWeight: 400 }}>(optional)</span></label><input type="text" value={remarks} onChange={(e) => setRemarks(e.target.value)} style={fieldInput} placeholder="e.g. Tea, Post-op drain" /></div>
      <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}><button type="button" onClick={onClose} style={cancelBtn}>Cancel</button><button type="submit" disabled={isSubmitting} style={primaryBtn}>{isSubmitting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={14} />}Save Entry</button></div>
    </form></div></div>
  );
};

interface CorrectModalProps { isOpen: boolean; onClose: () => void; entry: ChartEntry | null; onSave: () => void; }
const CorrectModal: React.FC<CorrectModalProps> = ({ isOpen, onClose, entry, onSave }) => {
  const [volume, setVolume] = useState("");
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { notify } = useNotification();

  useEffect(() => { if (isOpen && entry) { setVolume(String(entry.volume)); setRemarks(entry.remarks || ""); setReason(""); } }, [isOpen, entry]);
  if (!isOpen || !entry) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!volume || isNaN(Number(volume)) || Number(volume) <= 0) { 
      notify("Please enter a valid volume", "warning"); 
      return; 
    }
    if (!reason.trim()) { 
      notify("A correction reason is required", "warning"); 
      return; 
    }
    if (entry.id == null) return;
    
    setIsSubmitting(true);
    try {
      // Changed parseInt(volume) to parseFloat(volume) here 👇
      await nursingService.correctIO({ 
        entry_id: entry.id, 
        volume_ml: parseFloat(volume), 
        category: entry.category, 
        correction_reason: reason, 
        remarks 
      });
      notify("Entry corrected successfully", "success"); 
      onSave(); 
      onClose();
    } catch (err: any) { 
      notify(err.response?.data?.message || "Failed to correct entry", "error"); 
    } finally { 
      setIsSubmitting(false); 
    }
  };
  
  // const handleSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (!volume || isNaN(Number(volume)) || Number(volume) <= 0) { notify("Please enter a valid volume", "warning"); return; }
  //   if (!reason.trim()) { notify("A correction reason is required", "warning"); return; }
  //   if (entry.id == null) return;
  //   setIsSubmitting(true);
  //   try {
  //     await nursingService.correctIO({ entry_id: entry.id, volume_ml: parseInt(volume), category: entry.category, correction_reason: reason, remarks });
  //     notify("Entry corrected successfully", "success"); onSave(); onClose();
  //   } catch (err: any) { notify(err.response?.data?.message || "Failed to correct entry", "error"); } finally { setIsSubmitting(false); }
  // };
  return (
    <div style={modalOverlay}><div style={modalCard}><div style={{ ...modalHeader, background: "#fff8e1" }}>
      <div><h3 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#7a5a00" }}>Correct Entry</h3><p style={{ margin: "3px 0 0", fontSize: "10px", fontWeight: 700, color: "#a07a20", textTransform: "uppercase", letterSpacing: "0.8px" }}>{entry.category} · Entry #{entry.id}</p></div>
      <button onClick={onClose} style={iconBtn}><X size={18} color="#7a5a00" /></button>
    </div>
    <form onSubmit={handleSubmit} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
      <div><label style={fieldLabel}>Corrected Volume (ml)</label><input type="number" required min="0" step="any" value={volume} autoFocus onChange={(e) => setVolume(e.target.value)} style={fieldInput} /></div>
      <div><label style={fieldLabel}>Correction Reason <span style={{ color: "#e67e22" }}>*</span></label><input type="text" required value={reason} onChange={(e) => setReason(e.target.value)} style={fieldInput} placeholder="e.g. Entry Mistake" /></div>
      <div><label style={fieldLabel}>Remarks <span style={{ color: "#aaa", fontWeight: 400 }}>(optional)</span></label><input type="text" value={remarks} onChange={(e) => setRemarks(e.target.value)} style={fieldInput} placeholder="Additional notes" /></div>
      <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}><button type="button" onClick={onClose} style={cancelBtn}>Cancel</button><button type="submit" disabled={isSubmitting} style={{ ...primaryBtn, background: "#d97706" }}>{isSubmitting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Edit3 size={14} />}Save Correction</button></div>
    </form></div></div>
  );
};

interface CancelModalProps { isOpen: boolean; onClose: () => void; entry: ChartEntry | null; onSave: () => void; }
const CancelModal: React.FC<CancelModalProps> = ({ isOpen, onClose, entry, onSave }) => {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { notify } = useNotification();

  useEffect(() => { if (isOpen) setReason(""); }, [isOpen]);
  if (!isOpen || !entry) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) { notify("A cancellation reason is required", "warning"); return; }
    if (entry.id == null) return;
    setIsSubmitting(true);
    try {
      await nursingService.cancelIO({ entry_id: entry.id, reason });
      notify("Entry cancelled successfully", "success"); onSave(); onClose();
    } catch (err: any) { notify(err.response?.data?.message || "Failed to cancel entry", "error"); } finally { setIsSubmitting(false); }
  };
  return (
    <div style={modalOverlay}><div style={{ ...modalCard, maxWidth: "400px" }}><div style={{ ...modalHeader, background: "#fef2f2" }}>
      <div><h3 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#991b1b" }}>Cancel Entry</h3><p style={{ margin: "3px 0 0", fontSize: "10px", fontWeight: 700, color: "#b91c1c", textTransform: "uppercase", letterSpacing: "0.8px" }}>{entry.category} — {entry.volume} ml · Entry #{entry.id}</p></div>
      <button onClick={onClose} style={iconBtn}><X size={18} color="#991b1b" /></button>
    </div>
    <form onSubmit={handleSubmit} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
      <div><label style={fieldLabel}>Reason for Cancellation <span style={{ color: "#e11d48" }}>*</span></label><input type="text" required autoFocus value={reason} onChange={(e) => setReason(e.target.value)} style={fieldInput} placeholder="e.g. Entry Mistake" /></div>
      <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}><button type="button" onClick={onClose} style={cancelBtn}>Back</button><button type="submit" disabled={isSubmitting} style={{ ...primaryBtn, background: "#dc2626" }}>{isSubmitting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <XCircle size={14} />}Confirm Cancel</button></div>
    </form></div></div>
  );
};

interface EntryCellProps {
  entry: ChartEntry | undefined;
  hourState: HourState;
  onActionClick: () => void;
  onCorrect: (entry: ChartEntry) => void;
  onCancel: (entry: ChartEntry) => void;
  isReadOnly: boolean;
  colColor: string;
}

const EntryCell: React.FC<EntryCellProps> = ({
  entry, hourState, onActionClick, onCorrect, onCancel, isReadOnly, colColor,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  if (!entry) {
    return (
      <td style={{ ...tdBase, background: hourState === "current" ? "#f0f7ff" : "transparent", padding: 0 }}>
        <button type="button" onClick={() => !isReadOnly && onActionClick()} disabled={isReadOnly} style={addCellBtn} title="Click to add entry">
          <span style={{ color: hourState === "current" ? "#c0cfe8" : "#e0e4ef", fontSize: "11px" }}>ml</span>
        </button>
      </td>
    );
  }

  const hasRemarks = !!(entry.remarks && entry.remarks.trim());
  const sourceLabel = entry.source_type ? entry.source_type.replace(/_/g, " ") : null;
  const tooltipColor = colColor === "#1c6dd6" ? "#93c5fd" : "#6ee7b7";

  return (
    <td style={{ ...tdBase, padding: 0, verticalAlign: "middle" }}>
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "2px", padding: "3px 4px", position: "relative", height: "100%", width: "100%", boxSizing: "border-box" }}
        onMouseEnter={() => { tooltipTimeout.current = setTimeout(() => setTooltipVisible(true), 260); }}
        onMouseLeave={() => { if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current); setTooltipVisible(false); }}
      >
        {/* ── Hover tooltip ── */}
        {tooltipVisible && (
          <div style={{
            position: "absolute", bottom: "calc(100% + 8px)", right: 0, zIndex: 300,
            background: "#1c2b4a", color: "#fff", borderRadius: "10px",
            boxShadow: "0 8px 28px rgba(0,0,0,0.28)", minWidth: "190px", maxWidth: "250px",
            padding: "11px 13px", fontSize: "11px", lineHeight: 1.55, pointerEvents: "none",
          }}>
            {/* arrow */}
            <div style={{ position: "absolute", bottom: "-6px", right: "16px", width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "6px solid #1c2b4a" }} />
            <div style={{ fontWeight: 800, fontSize: "12px", marginBottom: "7px", color: tooltipColor }}>{entry.category}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                <span style={{ color: "#8fa3c8" }}>Volume</span>
                <span style={{ fontWeight: 700 }}>{entry.volume} ml</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                <span style={{ color: "#8fa3c8" }}>Time</span>
                <span style={{ fontWeight: 700 }}>{fmt(entry.recorded_at) || "—"}</span>
              </div>
              {sourceLabel && (
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                  <span style={{ color: "#8fa3c8" }}>Source</span>
                  <span style={{ fontWeight: 600, textTransform: "capitalize", fontSize: "10px" }}>{sourceLabel}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                <span style={{ color: "#8fa3c8" }}>Recorded by</span>
                <span style={{ fontWeight: 600, fontSize: "10px", textAlign: "right", maxWidth: "120px", wordBreak: "break-word" }}>{entry.recorded_by_name || "—"}</span>
              </div>
              {hasRemarks && (
                <div style={{ marginTop: "6px", paddingTop: "7px", borderTop: "1px solid rgba(255,255,255,0.12)" }}>
                  <div style={{ color: "#8fa3c8", fontSize: "9px", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Remarks</div>
                  <div style={{ fontWeight: 600, fontSize: "11px", color: "#fde68a", wordBreak: "break-word" }}>{entry.remarks}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Cell content ── */}
        <div
          style={{ textAlign: "right", flex: 1, minWidth: 0, cursor: (isReadOnly || entry.id == null) ? "default" : "pointer" }}
          onClick={() => (!isReadOnly && entry.id != null) && onActionClick()}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "3px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: colColor }}>{entry.volume}</div>
            {hasRemarks && (
              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#f59e0b", flexShrink: 0 }} />
            )}
          </div>
          <div style={{ fontSize: "9px", color: "#8a94ad", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fmt(entry.recorded_at)}</div>
        </div>

        {!isReadOnly && entry.id != null && (
          <div ref={menuOpen ? menuRef : undefined} style={{ position: "relative" }}>
            <button onClick={() => setMenuOpen(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", padding: "1px", borderRadius: "3px", color: "#8a94ad", lineHeight: 1 }} title="Options"><MoreVertical size={11} /></button>
            {menuOpen && (
              <div style={{ position: "absolute", right: 0, top: "100%", zIndex: 100, background: "#fff", border: "1px solid #e0e4ef", borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", minWidth: "170px", overflow: "hidden" }}>
                <div style={{ padding: "8px 12px", borderBottom: "1px solid #f0f2f8", background: "#f8f9fc" }}>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#1c2b4a" }}>{entry.category}</div>
                  <div style={{ fontSize: "9px", color: "#8a94ad" }}>{entry.volume} ml · {fmt(entry.recorded_at)}<br />by {entry.recorded_by_name || "—"}</div>
                  {hasRemarks && (
                    <div style={{ fontSize: "9px", color: "#d97706", marginTop: "4px", fontStyle: "italic", wordBreak: "break-word" }}>"{entry.remarks}"</div>
                  )}
                </div>
                <button onClick={() => { setMenuOpen(false); onCorrect(entry); }} style={menuItemBtn("#d97706")}><Edit3 size={11} /> Correct Entry</button>
                <button onClick={() => { setMenuOpen(false); onCancel(entry); }} style={menuItemBtn("#dc2626")}><XCircle size={11} /> Cancel Entry</button>
              </div>
            )}
          </div>
        )}
      </div>
    </td>
  );
};

// ─── Shared styles ────────────────────────────────────────────────────────────

const modalOverlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "16px" };
const modalCard: React.CSSProperties = { background: "#fff", borderRadius: "16px", boxShadow: "0 20px 60px rgba(0,0,0,0.18)", width: "100%", maxWidth: "440px", overflow: "hidden" };
const modalHeader: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "#f8f9fc", borderBottom: "1px solid #e8eaf2" };
const iconBtn: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", padding: "4px", borderRadius: "6px", lineHeight: 1 };
const fieldLabel: React.CSSProperties = { display: "block", fontSize: "10px", fontWeight: 700, color: "#6b7a9a", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "6px" };
const fieldInput: React.CSSProperties = { width: "100%", padding: "10px 14px", border: "1px solid #d0d6e6", borderRadius: "10px", fontSize: "13px", fontWeight: 500, color: "#1c2b4a", background: "#f8f9fc", outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const cancelBtn: React.CSSProperties = { flex: 1, padding: "10px 16px", border: "1px solid #d0d6e6", borderRadius: "10px", fontSize: "13px", fontWeight: 700, color: "#4a5568", background: "#fff", cursor: "pointer" };
const primaryBtn: React.CSSProperties = { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "10px 16px", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: 700, color: "#fff", background: "#1c3d7a", cursor: "pointer" };
const tdBase: React.CSSProperties = { border: "1px solid #e0e4ef", textAlign: "right" as const, padding: "4px 6px", minWidth: "62px", verticalAlign: "middle" };
const addCellBtn: React.CSSProperties = { width: "100%", height: "100%", background: "transparent", border: "none", cursor: "pointer", padding: "2px 4px", textAlign: "right" as const, display: "block", minHeight: "34px" };
const menuItemBtn = (color: string): React.CSSProperties => ({ display: "flex", alignItems: "center", gap: "6px", width: "100%", padding: "8px 12px", background: "none", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: 600, color, textAlign: "left" as const, borderBottom: "1px solid #f0f2f8" });
const navBtn: React.CSSProperties = { border: "1px solid #d0d6e6", background: "#f8f9fc", color: "#1c2b4a", padding: "4px 10px", fontSize: "14px", fontWeight: 700, cursor: "pointer", lineHeight: 1.4 };

// ─── Main component ───────────────────────────────────────────────────────────

export default function FluidBalanceChart({
  encounterNumber = "ENC-2024-001",
  weightKg = 80,
  isReadOnly = false,
}: {
  encounterNumber?: string;
  weightKg?: number;
  isReadOnly?: boolean;
}) {
  const [chartApiData, setChartApiData] = useState<any>(null);
  const [infusionData, setInfusionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ivPlan, setIvPlan] = useState("Loading...");
  const [showInfusionModal, setShowInfusionModal] = useState(false);
  const [showTransfusionModal, setShowTransfusionModal] = useState(false);
  const [showMARModal, setShowMARModal] = useState(false);

  // Selected date for chart navigation (defaults to today)
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });

  const windowStart = useMemo(() => localWindowStart(selectedDateStr), [selectedDateStr]);
  const windowEnd   = useMemo(() => new Date(windowStart.getTime() + 24 * 60 * 60 * 1000), [windowStart]);
  const todayWindowStart = useMemo(() => getTodayWindowStart(), []);

  // Determine if viewing a historical day
  const windowStartMs = windowStart.getTime();
  const todayWindowStartMs = todayWindowStart.getTime();
  const isHistorical = windowStartMs < todayWindowStartMs;

  const goToPrevDay = () => {
    const d = new Date(windowStartMs - 24 * 60 * 60 * 1000);
    const pad = (n: number) => n.toString().padStart(2, "0");
    setSelectedDateStr(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  };
  const goToNextDay = () => {
    const d = new Date(windowStartMs + 24 * 60 * 60 * 1000);
    const pad = (n: number) => n.toString().padStart(2, "0");
    setSelectedDateStr(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  };

  // Re-fetch whenever the selected date or encounter changes
  const fetchChart = useCallback(async () => {
    setLoading(true);
    try {
      const [ioRes, infRes, planRes] = await Promise.all([
        nursingService.getIOReport(encounterNumber, selectedDateStr).catch(() => ({ data: null })),
        nursingService.getInfusionChart(encounterNumber).catch(() => ({ data: null })),
        nursingService.getActiveInfusions(encounterNumber).catch(() => ({ data: [] }))
      ]);

      if (ioRes.data) setChartApiData(ioRes.data);
      if (infRes.data) setInfusionData(infRes.data);

      const activeInfusions = planRes.data || [];
      setIvPlan(activeInfusions.length > 0 ? activeInfusions.map((i: any) => i.drug_name).join(" + ") : "No active infusions");
    } catch {
      setChartApiData(null);
      setInfusionData(null);
      setIvPlan("—");
    } finally {
      setLoading(false);
    }
  }, [encounterNumber, selectedDateStr]);

  useEffect(() => { fetchChart(); }, [fetchChart]);

  // chartData is now returned directly from the API for the selected date — no local derivation needed
  const chartData = chartApiData;

  const entryLookup = useMemo(() => {
    // New API returns entries[] with event_at (not recorded_at) — normalise before building lookup
    const rawEntries: any[] = chartData?.entries || [];
    const entries: ChartEntry[] = rawEntries.map((e: any) => ({
      ...e,
      recorded_at: e.recorded_at || e.event_at || "",
    }));
    return buildEntryLookup(entries);
  }, [chartData]);

  // Modals state
  const [ioModal, setIoModal] = useState<{ isOpen: boolean; type: "INTAKE" | "OUTPUT"; category: string; hour?: number }>({ isOpen: false, type: "INTAKE", category: "" });
  const [correctModal, setCorrectModal] = useState<{ isOpen: boolean; entry: ChartEntry | null }>({ isOpen: false, entry: null });
  const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; entry: ChartEntry | null }>({ isOpen: false, entry: null });

  // ── Derived totals ───────────────────────────────────────────────────────────
  // 24 Hour Totals (calculated dynamically from table cells)
  const totalIntake24h = INPUT_COLS.reduce((sum, col) => sum + colTotal(entryLookup, col, "INTAKE"), 0);
  const totalOutput24h = OUTPUT_COLS.reduce((sum, col) => sum + colTotal(entryLookup, col, "OUTPUT"), 0);
  const netBalance24h = totalIntake24h - totalOutput24h;

  // All Time Totals — now served directly from the IO report (all_time_totals)
  const allTimeIntake = Number(chartData?.all_time_totals?.intake_ml) || 0;
  const allTimeOutput = Number(chartData?.all_time_totals?.output_ml) || 0;
  const allTimeBalance = Number(chartData?.all_time_totals?.balance_ml) || 0;


  // Urine & Restrictions — dynamically calculated
  const urineAnalysis = chartData?.urine_analysis || {};
  const totalUrine = Number(urineAnalysis.urine_total_ml) || 0;

  // 1. Dynamically find the actual patient weight (prioritizing API data over the default prop)
  const actualWeight = Number(urineAnalysis.weight_kg) || Number(chartData?.clinical?.weight) || Number(weightKg) || 80;

  // Urine & Restrictions — new API uses urine_analysis
  // const urineAnalysis = chartData?.urine_analysis || {};
  // const totalUrine = Number(urineAnalysis.urine_total_ml) || 0;

  // 2. Calculate hours elapsed since the shift started for an accurate rate
  const now = new Date();
  let hrsSinceStart = 24; // Default to 24 hours for historical (past) charts
  if (!isHistorical) {
    const msElapsed = Math.max(0, now.getTime() - windowStart.getTime());
    hrsSinceStart = msElapsed / (1000 * 60 * 60);
    if (hrsSinceStart === 0) hrsSinceStart = 1; // Prevent division by zero on exact shift start
  }

  // 3. Apply the full clinical formula: Volume / Weight / Time
  const calculatedUrineRate = (totalUrine / actualWeight) / hrsSinceStart;

  const urineRate = urineAnalysis.urine_rate_ml_kg_hr != null 
    ? Number(urineAnalysis.urine_rate_ml_kg_hr) 
    : calculatedUrineRate;

  const targetUrineRate = 0.5;
  const isTargetMet = urineRate >= targetUrineRate;


  // const urineRate = urineAnalysis.urine_rate_ml_kg_hr != null ? Number(urineAnalysis.urine_rate_ml_kg_hr) : (totalUrine / (weightKg || 80));
  // const targetUrineRate = 0.5;
  // const isTargetMet = urineRate >= targetUrineRate;
  // const hrsSinceStart: number = 1; // kept for display formula

  // Fluid restriction — new API: limit_ml, consumed_ml, remaining_ml (no 'active' flag)
  const fluidRestrictionLimit = Number(chartData?.fluid_restriction?.limit_ml) || 0;
  const isFluidRestricted = fluidRestrictionLimit > 0;
  const remaining = chartData?.fluid_restriction?.remaining_ml != null ? Number(chartData.fluid_restriction.remaining_ml) : (isFluidRestricted ? Math.max(0, fluidRestrictionLimit - totalIntake24h) : null);
  const consumedMl = Number(chartData?.fluid_restriction?.consumed_ml) || totalIntake24h;
  const usedPct = isFluidRestricted ? Math.min(100, Math.round((consumedMl / fluidRestrictionLimit) * 100) || 0) : 0;

  const apiWindowStart = chartData?.chart_window?.start ? new Date(chartData.chart_window.start.replace(" ", "T")) : windowStart;
  const displayChartDate = apiWindowStart.toLocaleDateString("en-GB");
  const displayChartTime = apiWindowStart.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "400px", color: "#6b7a9a", fontSize: "14px", gap: "8px" }}>
        <Loader2 size={20} style={{ animation: "spin 1s linear infinite", color: "#1c3d7a" }} />
        Loading fluid balance chart…
      </div>
    );
  }

  const p = chartData?.patient || {};
  const e = chartData?.encounter || {};
  const c = chartData?.clinical || {};
  
  const isViewOnly = isReadOnly || isHistorical;

  const handleActionClick = (type: "INTAKE" | "OUTPUT", category: string, hour?: number) => {
    if (isViewOnly) return;
    const h = hour !== undefined ? hour : new Date().getHours();
    const k = catKey(h, category);
    const existingEntry = entryLookup[k];

    if (existingEntry && existingEntry.id != null) {
        setCorrectModal({ isOpen: true, entry: existingEntry });
    } else {
        setIoModal({ isOpen: true, type, category, hour });
    }
  };

  const inputTotals = INPUT_COLS.map((col) => colTotal(entryLookup, col, "INTAKE"));
  const outputTotals = OUTPUT_COLS.map((col) => colTotal(entryLookup, col, "OUTPUT"));

  const dayEntries = Object.values(entryLookup)
    .filter(e => e.recorded_at)
    .sort((a, b) => new Date(a.recorded_at.replace(" ", "T")).getTime() - new Date(b.recorded_at.replace(" ", "T")).getTime());
  const lastEntry = dayEntries[dayEntries.length - 1];

  const lastUpdatedStr = lastEntry
    ? `${new Date(lastEntry.recorded_at.replace(" ", "T")).toLocaleDateString("en-GB")} ${fmt(lastEntry.recorded_at)} by ${lastEntry.recorded_by_name || "—"}`
    : "—";

  // ── Styles ─────────────────────────────────────────────────────────────────
  const s = {
    wrap: { fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "13px", color: "#1a1a1a", background: "#f0f2f8", minHeight: "100%" },
    topbar: { background: "#fff", borderBottom: "1px solid #e0e4ef", padding: "10px 18px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" as const },
    chartTitle: { fontSize: "18px", fontWeight: 800, color: "#1c2b4a", marginRight: "auto", whiteSpace: "nowrap" as const },
    patientVal: { fontSize: "13px", fontWeight: 700, color: "#1c2b4a" },
    detailsBtn: { background: "#1c3d7a", color: "#fff", border: "none", borderRadius: "7px", padding: "7px 14px", fontSize: "12px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" as const },
    metaBar: { background: "#fff", borderBottom: "1px solid #e0e4ef", padding: "8px 18px", display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" as const },
    metaLabel: { fontSize: "11px", color: "#6b7a9a" },
    metaInput: { border: "1px solid #d0d6e6", borderRadius: "6px", padding: "4px 10px", fontSize: "12px", fontWeight: 600, color: "#1c2b4a", background: "#f8f9fc", outline: "none", minWidth: "110px" },
    metaInputGreen: { border: "1px solid #a7f3d0", borderRadius: "6px", padding: "4px 10px", fontSize: "12px", fontWeight: 600, color: "#065f46", background: "#f0fdf4", outline: "none", minWidth: "50px" },
    body: { display: "flex", gap: "14px", padding: "14px", flexWrap: "wrap" as const, alignItems: "flex-start" },
    tables: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column" as const, gap: "14px" },
    tableCard: { background: "#fff", borderRadius: "10px", overflow: "hidden", border: "1px solid #d8dce8", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflowX: "auto" as const },
    th: (bg: string): React.CSSProperties => ({ background: bg, color: "#fff", padding: "9px 12px", fontSize: "12px", fontWeight: 800, textAlign: "left", letterSpacing: "0.5px" }),
    thCell: (bg: string): React.CSSProperties => ({ background: bg, color: "#fff", padding: "6px 5px", fontSize: "10px", fontWeight: 700, textAlign: "center", whiteSpace: "nowrap", border: "1px solid rgba(255,255,255,0.15)" }),
    timeCell: (hs: HourState): React.CSSProperties => ({ padding: "4px 10px", fontSize: "11px", fontWeight: hs === "current" ? 800 : 400, color: hs === "current" ? "#1c3d7a" : hs === "past" ? "#9aa3b8" : "#4a5568", whiteSpace: "nowrap", minWidth: "92px", borderRight: "2px solid #e0e4ef", border: "1px solid #e0e4ef", background: hs === "current" ? "#ebf4ff" : "transparent" }),
    hourlyCell: (color: string, bg: string): React.CSSProperties => ({ padding: "4px 8px", textAlign: "right", fontSize: "12px", fontWeight: 700, color, border: "1px solid #e0e4ef", background: bg }),
    trTotal: { background: "#1c3d7a" },
    trTotalGreen: { background: "#1b6e4a" },
    sidebar: { width: "290px", flexShrink: 0, display: "flex", flexDirection: "column" as const, gap: "12px" },
    sideCard: { background: "#fff", borderRadius: "10px", border: "1px solid #d8dce8", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" },
    sideHead: (bg: string): React.CSSProperties => ({ background: bg, color: "#fff", padding: "8px 14px", fontSize: "10px", fontWeight: 800, letterSpacing: "0.8px", textTransform: "uppercase" }),
    sideBody: { padding: "12px 14px" },
    quickRow: { background: "#fff", borderTop: "1px solid #e0e4ef", padding: "10px 18px", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" as const },
    quickLabel: { fontSize: "11px", color: "#6b7a9a", fontWeight: 700, marginRight: "2px" },
    quickBtn: (color: string): React.CSSProperties => ({ border: `1.5px solid ${color}`, color, background: "#fff", borderRadius: "6px", padding: "5px 11px", fontSize: "11px", fontWeight: 700, cursor: isViewOnly ? "not-allowed" : "pointer", whiteSpace: "nowrap", opacity: isViewOnly ? 0.5 : 1, transition: "all 0.15s" }),
    footBar: { background: "#fff", borderTop: "1px solid #e0e4ef", padding: "10px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" as const, gap: "10px" },
    
    // Sidebar metric boxes
    metricBox: { background: "#f5f8ff", borderRadius: "8px", padding: "8px 4px", textAlign: "center" as const },
    metricLabel: { fontSize: "9px", color: "#6b7a9a", marginBottom: "3px", lineHeight: 1.2 },
    metricVal: (color: string): React.CSSProperties => ({ fontSize: "16px", fontWeight: 800, color }),
  };
  const rowBg = (hs: HourState, even: boolean): React.CSSProperties => ({ background: hs === "current" ? "#ebf4ff" : even ? "#f8f9fc" : "#fff" });

  return (
    <div style={s.wrap}>
      <IOModal isOpen={ioModal.isOpen} onClose={() => setIoModal({ ...ioModal, isOpen: false })} type={ioModal.type} category={ioModal.category} encounterNumber={encounterNumber} onSave={fetchChart} hour={ioModal.hour} windowStart={windowStart} />
      <CorrectModal isOpen={correctModal.isOpen} entry={correctModal.entry} onClose={() => setCorrectModal({ isOpen: false, entry: null })} onSave={fetchChart} />
      <CancelModal isOpen={cancelModal.isOpen} entry={cancelModal.entry} onClose={() => setCancelModal({ isOpen: false, entry: null })} onSave={fetchChart} />
      <h2 className="sr-only">24-hour fluid balance chart</h2>

      <div style={s.topbar}>
        <span style={s.chartTitle}>Fluid Balance Chart</span>
        {isHistorical && (
          <span style={{ background: "#fef2f2", color: "#991b1b", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", padding: "4px 10px", borderRadius: "6px", border: "1px solid #fecaca" }}>
            Viewing historical data — read only
          </span>
        )}
        {/* {[["Patient", p.full_name || "—"], ["MRN", p.mrn || "—"], ["Age / Sex", p.age ? `${p.age}y / ${p.gender?.[0] || "—"}` : "—"], ["Ward", c.ward || "—"], ["Encounter", e.encounter_number || "—"]].map(([label, val]) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", fontSize: "11px", color: "#6b7a9a", gap: "1px", minWidth: "70px" }}>
            <span style={{ fontSize: "10px", color: "#8a94ad" }}>{label}</span><span style={s.patientVal}>{val}</span>
          </div>
        ))} */}
        {isReadOnly && !isHistorical && (
          <span style={{ background: "#fef3c7", color: "#92400e", fontSize: "10px", fontWeight: 800, textTransform: "uppercase", padding: "4px 10px", borderRadius: "6px", marginLeft: "auto", display: "flex", alignItems: "center", gap: "4px" }}><AlertCircle size={12} /> Read Only</span>
        )}
        {!isHistorical && (
          <>
            <button onClick={() => setShowTransfusionModal(true)} style={{ ...s.detailsBtn, background: "#b91c1c" }}>
              Blood Transfusion
            </button>
            <button onClick={() => setShowInfusionModal(true)} style={{ ...s.detailsBtn, background: "#5b21b6" }}>
              Active Infusions
            </button>
            <button onClick={() => setShowMARModal(true)} style={{ ...s.detailsBtn, background: "#0d9488" }}>
              Medication Administration
            </button>
          </>
        )}
        <button style={s.detailsBtn}>Patient details</button>
      </div>

      <div style={s.metaBar}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={s.metaLabel}>Chart start</span>
          <input style={s.metaInput} value={displayChartDate} readOnly />
          <input style={{ ...s.metaInput, minWidth: "60px" }} value={displayChartTime} readOnly />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto" }}>
          <span style={s.metaLabel}>View date:</span>
          <button onClick={goToPrevDay} style={{ ...navBtn, borderRadius: "6px 0 0 6px" }} title="Previous day">‹</button>
          <input type="date" value={selectedDateStr} onChange={(e) => setSelectedDateStr(e.target.value)} style={{ ...s.metaInput, minWidth: "130px", borderRadius: 0, borderLeft: "none", borderRight: "none", textAlign: "center" }} />
          <button onClick={goToNextDay} disabled={!isHistorical} style={{ ...navBtn, borderRadius: "0 6px 6px 0", opacity: !isHistorical ? 0.4 : 1 }} title="Next day">›</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={s.metaLabel}>Fluid restriction</span><input style={s.metaInput} defaultValue={isFluidRestricted ? `${fluidRestrictionLimit} ml / 24 hrs` : "No restriction"} readOnly />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={s.metaLabel}>IV fluid plan</span><input style={{ ...s.metaInput, minWidth: "180px" }} value={ivPlan} readOnly />
        </div>
      </div>

      <div style={s.body}>
        <div style={s.tables}>
          {/* INPUT TABLE */}
          <div style={s.tableCard}>
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", minWidth: "620px" }}>
              <colgroup><col style={{ width: "94px" }} />{INPUT_COLS.map((c) => <col key={c} style={{ width: "70px" }} />)}<col style={{ width: "72px" }} /></colgroup>
              <thead>
                <tr><th style={s.th("#1c3d7a")} colSpan={INPUT_COLS.length + 2}>INPUT (ml)</th></tr>
                <tr>
                  <th style={{ ...s.thCell("#2a5298"), textAlign: "left", padding: "6px 10px" }}>Time</th>
                  {INPUT_COLS.map((col) => <th key={col} style={s.thCell("#2a5298")}>{col}</th>)}
                  <th style={{ ...s.thCell("#2a5298"), color: "#93c5fd" }}>Hourly ∑</th>
                </tr>
              </thead>
              <tbody>
                {CHART_HOURS.map(({ label, hour }, idx) => {
                  const hs = getHourState(hour, isHistorical);
                  const rowEntries = INPUT_COLS.map((col) => {
                      const entry = entryLookup[catKey(hour, col)];
                      return entry && entry.type === "INTAKE" ? entry : undefined;
                  });
                  const hourTotal = rowEntries.reduce((s, e) => s + (e ? Number(e.volume) : 0), 0);
                  return (
                    <tr key={label} style={rowBg(hs, idx % 2 === 0)}>
                      <td style={s.timeCell(hs)}>{hs === "current" ? <strong>{label}</strong> : label}</td>
                      {INPUT_COLS.map((col, ci) => (
                        <EntryCell key={col} entry={rowEntries[ci]} hourState={hs} onActionClick={() => handleActionClick("INTAKE", col, hour)} onCorrect={(entry) => setCorrectModal({ isOpen: true, entry })} onCancel={(entry) => setCancelModal({ isOpen: true, entry })} isReadOnly={isViewOnly} colColor="#1c6dd6" />
                      ))}
                      <td style={s.hourlyCell(hourTotal ? "#1c6dd6" : "#bbb", hs === "current" ? "#dbeafe" : "transparent")}>{hourTotal || (hs === "past" ? "—" : "")}</td>
                    </tr>
                  );
                })}
                <tr style={s.trTotal}>
                  <td style={{ padding: "7px 10px", fontSize: "12px", fontWeight: 800, color: "#fff", border: "1px solid rgba(255,255,255,0.1)" }}>TOTAL (ml)</td>
                  {inputTotals.map((t, i) => <td key={i} style={{ padding: "7px 5px", textAlign: "right", fontSize: "12px", fontWeight: 700, color: t ? "#93c5fd" : "#6b7a9a", border: "1px solid rgba(255,255,255,0.1)" }}>{t || "0"}</td>)}
                  <td style={{ padding: "7px 8px", textAlign: "right", fontSize: "13px", fontWeight: 900, color: "#93c5fd", border: "1px solid rgba(255,255,255,0.1)" }}>{totalIntake24h}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* OUTPUT TABLE */}
          <div style={s.tableCard}>
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", minWidth: "680px" }}>
              <colgroup><col style={{ width: "94px" }} />{OUTPUT_COLS.map((c) => <col key={c} style={{ width: "68px" }} />)}<col style={{ width: "72px" }} /></colgroup>
              <thead>
                <tr><th style={s.th("#1b6e4a")} colSpan={OUTPUT_COLS.length + 2}>OUTPUT (ml)</th></tr>
                <tr>
                  <th style={{ ...s.thCell("#238a5e"), textAlign: "left", padding: "6px 10px" }}>Time</th>
                  {OUTPUT_COLS.map((col) => <th key={col} style={s.thCell("#238a5e")}>{col}</th>)}
                  <th style={{ ...s.thCell("#238a5e"), color: "#6ee7b7" }}>Hourly ∑</th>
                </tr>
              </thead>
              <tbody>
                {CHART_HOURS.map(({ label, hour }, idx) => {
                  const hs = getHourState(hour, isHistorical);
                  const rowEntries = OUTPUT_COLS.map((col) => {
                      const entry = entryLookup[catKey(hour, col)];
                      return entry && entry.type === "OUTPUT" ? entry : undefined;
                  });
                  const hourTotal = rowEntries.reduce((s, e) => s + (e ? Number(e.volume) : 0), 0);
                  return (
                    <tr key={label} style={rowBg(hs, idx % 2 === 0)}>
                      <td style={s.timeCell(hs)}>{hs === "current" ? <strong>{label}</strong> : label}</td>
                      {OUTPUT_COLS.map((col, ci) => (
                        <EntryCell key={col} entry={rowEntries[ci]} hourState={hs} onActionClick={() => handleActionClick("OUTPUT", col, hour)} onCorrect={(entry) => setCorrectModal({ isOpen: true, entry })} onCancel={(entry) => setCancelModal({ isOpen: true, entry })} isReadOnly={isViewOnly} colColor="#1b6e4a" />
                      ))}
                      <td style={s.hourlyCell(hourTotal ? "#1b6e4a" : "#bbb", hs === "current" ? "#d1fae5" : "transparent")}>{hourTotal || (hs === "past" ? "—" : "")}</td>
                    </tr>
                  );
                })}
                <tr style={s.trTotalGreen}>
                  <td style={{ padding: "7px 10px", fontSize: "12px", fontWeight: 800, color: "#fff", border: "1px solid rgba(255,255,255,0.1)" }}>TOTAL (ml)</td>
                  {outputTotals.map((t, i) => <td key={i} style={{ padding: "7px 5px", textAlign: "right", fontSize: "12px", fontWeight: 700, color: t ? "#6ee7b7" : "#6b7a9a", border: "1px solid rgba(255,255,255,0.1)" }}>{t || "0"}</td>)}
                  <td style={{ padding: "7px 8px", textAlign: "right", fontSize: "13px", fontWeight: 900, color: "#6ee7b7", border: "1px solid rgba(255,255,255,0.1)" }}>{totalOutput24h}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div style={s.sidebar}>
          
          {/* Fluid Balance Summary */}
          <div style={s.sideCard}>
            <div style={s.sideHead("#1c3d7a")}>Fluid Balance Summary</div>
            <div style={s.sideBody}>
              
              {/* 24 Hour Totals */}
              <div style={{ fontSize: "10px", fontWeight: 800, color: "#1c2b4a", marginBottom: "6px" }}>24 HOUR TOTALS ({displayChartTime} – {displayChartTime})</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", marginBottom: "16px" }}>
                {([["Total Input", totalIntake24h, "#1c6dd6"], ["Total Output", totalOutput24h, "#1b6e4a"], ["Net Balance", netBalance24h, netBalance24h >= 0 ? "#1c6dd6" : "#b91c1c"]] as [string, number, string][]).map(([label, val, color]) => (
                  <div key={label} style={s.metricBox}>
                    <div style={s.metricLabel}>{label}</div>
                    <div style={s.metricVal(color)}>{label === "Net Balance" && val > 0 ? "+" : ""}{val} <span style={{ fontSize: "10px", fontWeight: 600 }}>ml</span></div>
                  </div>
                ))}
              </div>

              {/* All Time Totals */}
              <div style={{ fontSize: "10px", fontWeight: 800, color: "#1c2b4a", borderTop: "1px dashed #d0d6e6", paddingTop: "12px", marginBottom: "6px" }}>ALL TIME TOTALS</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
                {([["Total Input", allTimeIntake, "#1c6dd6"], ["Total Output", allTimeOutput, "#1b6e4a"], ["Net Balance", allTimeBalance, allTimeBalance >= 0 ? "#1c6dd6" : "#b91c1c"]] as [string, number, string][]).map(([label, val, color]) => (
                  <div key={label} style={{ ...s.metricBox, background: "#f8f9fc" }}>
                    <div style={s.metricLabel}>{label}</div>
                    <div style={s.metricVal(color)}>{label === "Net Balance" && val > 0 ? "+" : ""}{val} <span style={{ fontSize: "10px", fontWeight: 600 }}>ml</span></div>
                  </div>
                ))}
              </div>
              
            </div>
          </div>
          


          {/* Urine Output */}
          <div style={s.sideCard}>
            <div style={s.sideHead("#0f6e56")}>Urine Output</div>
            <div style={s.sideBody}>
              <div style={{ fontSize: "11px", color: "#6b7a9a", marginBottom: "4px" }}>
                {totalUrine} ml total · {actualWeight} kg · {hrsSinceStart.toFixed(1)} hrs
              </div>
              <div style={{ fontSize: "28px", fontWeight: 900, color: isTargetMet ? "#1b7a4a" : "#c0392b", marginBottom: "3px" }}>
                {isNaN(urineRate) ? "—" : urineRate.toFixed(2)} <span style={{ fontSize: "13px", fontWeight: 600 }}>ml/kg/hr</span>
              </div>
              <div style={{ fontSize: "11px", color: "#6b7a9a", display: "flex", alignItems: "center", gap: "6px" }}>
                Target ≥ {targetUrineRate} ml/kg/hr {isTargetMet ? <span style={{ color: "#1b7a4a", fontWeight: 800 }}>✓</span> : <span style={{ color: "#c0392b", fontWeight: 800 }}>✗</span>}
              </div>
            </div>
          </div>


          {/* Urine Output */}
          {/* <div style={s.sideCard}>
            <div style={s.sideHead("#0f6e56")}>Urine Output</div>
            <div style={s.sideBody}>
              <div style={{ fontSize: "11px", color: "#6b7a9a", marginBottom: "4px" }}>{totalUrine} ml total · {weightKg || urineAnalysis.weight_kg || 80} kg</div>
              <div style={{ fontSize: "28px", fontWeight: 900, color: isTargetMet ? "#1b7a4a" : "#c0392b", marginBottom: "3px" }}>{isNaN(urineRate) ? "—" : urineRate.toFixed(2)} <span style={{ fontSize: "13px", fontWeight: 600 }}>ml/kg/hr</span></div>
              <div style={{ fontSize: "11px", color: "#6b7a9a", display: "flex", alignItems: "center", gap: "6px" }}>Target ≥ {targetUrineRate} ml/kg/hr {isTargetMet ? <span style={{ color: "#1b7a4a", fontWeight: 800 }}>✓</span> : <span style={{ color: "#c0392b", fontWeight: 800 }}>✗</span>}</div>
            </div>
          </div> */}
          
          {/* Fluid Restriction */}
          <div style={s.sideCard}>
            <div style={s.sideHead("#5a3e9c")}>Fluid Restriction</div>
            <div style={s.sideBody}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a", marginBottom: "4px" }}>{isFluidRestricted ? `${fluidRestrictionLimit} ml / 24 hrs` : "None"}</div>
              {isFluidRestricted && remaining !== null && (
                <>
                  <div style={{ fontSize: "11px", color: "#6b7a9a", marginBottom: "6px" }}>Remaining allowance</div>
                  <div style={{ fontSize: "24px", fontWeight: 900, color: remaining < 300 ? "#c0392b" : "#1c6dd6", marginBottom: "8px" }}>{remaining} <span style={{ fontSize: "13px", fontWeight: 600 }}>ml</span></div>
                  <div style={{ background: "#e8eaf2", borderRadius: "6px", height: "10px", overflow: "hidden", marginBottom: "6px" }}><div style={{ width: `${usedPct}%`, height: "100%", borderRadius: "6px", transition: "width 0.4s", background: usedPct > 90 ? "#c0392b" : usedPct > 70 ? "#e67e22" : "#1c6dd6" }} /></div>
                  <div style={{ fontSize: "11px", color: "#6b7a9a", textAlign: "right" }}>{usedPct}% used</div>
                </>
              )}
              {!isFluidRestricted && <div style={{ fontSize: "11px", color: "#6b7a9a" }}>Consumed: <strong style={{ color: "#1c6dd6" }}>{consumedMl} ml</strong></div>}
            </div>
          </div>
          
          {/* Alerts */}
          <div style={s.sideCard}>
            <div style={s.sideHead("#7a4a00")}>Alerts</div>
            <div style={s.sideBody}>
              {chartData?.alerts?.length > 0 ? chartData.alerts.map((alert: any, idx: number) => (
                <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "8px", padding: "8px 10px", background: alert.severity === "WARNING" || alert.severity === "CRITICAL" ? "#fff8e1" : "#e8f4ff", borderRadius: "8px", marginBottom: "6px", fontSize: "11px", color: alert.severity === "WARNING" || alert.severity === "CRITICAL" ? "#7a5a00" : "#0a4480", border: `1px solid ${alert.severity === "WARNING" || alert.severity === "CRITICAL" ? "#fde68a" : "#bfdbfe"}` }}>
                  <span style={{ fontSize: "14px", lineHeight: 1 }}>{alert.severity === "INFO" ? "ℹ" : "⚠"}</span>
                  <div><div style={{ fontWeight: 700, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>{alert.severity}</div>{alert.message}</div>
                </div>
              )) : <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", background: "#e8f4ff", borderRadius: "8px", fontSize: "11px", color: "#0a4480" }}><span>ℹ</span> All parameters normal</div>}
            </div>
          </div>
        </div>
      </div>

      {/* ── MAR PANEL MODAL (current day only) ── */}
      {!isHistorical && showMARModal && (
        <div style={{ ...modalOverlay, zIndex: 150 }}>
          <div style={{ width: "98vw", maxWidth: "1920px", height: "95vh", maxHeight: "95vh", display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: "12px" }}>
            <MARPanel
              encounterNumber={encounterNumber}
              onClose={() => setShowMARModal(false)}
            />
          </div>
        </div>
      )}

      {/* ── INFUSION PANEL MODAL (current day only) ── */}
      {!isHistorical && showInfusionModal && (
        <div style={{ ...modalOverlay, zIndex: 150 }}>
          <div style={{ width: "98vw", maxWidth: "1600px", height: "95vh", maxHeight: "95vh", display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: "10px" }}>
            <InfusionPanel
              encounterNumber={encounterNumber}
              wardId={chartData?.clinical?.ward_id}
              sessions={infusionData?.infusion_sessions || []}
              onRefresh={fetchChart}
              onClose={() => setShowInfusionModal(false)}
            />
          </div>
        </div>
      )}

      {/* ── TRANSFUSION PANEL MODAL ── */}
      {!isHistorical && showTransfusionModal && (
        <div style={{ ...modalOverlay, zIndex: 150 }}>
          <div style={{ width: "98vw", maxWidth: "1920px", height: "95vh", maxHeight: "95vh", display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: "24px", WebkitOverflowScrolling: "touch" }}>
            <TransfusionPanel
              encounterNumber={encounterNumber}
              onClose={() => setShowTransfusionModal(false)}
            />
          </div>
        </div>
      )}

      <div style={s.quickRow}>
        <span style={s.quickLabel}>QUICK ADD</span>
        {([["+ Oral", "#1c6dd6", "INTAKE", "Oral"], ["+ IV Fluid", "#1c6dd6", "INTAKE", "IV Fluids"], ["+ IV Drug", "#1c6dd6", "INTAKE", "IV Drugs"], ["+ Blood", "#b91c1c", "INTAKE", "Blood Products"], ["+ NG Feed", "#1c6dd6", "INTAKE", "NG/PEG Feed"], ["+ Flush", "#1c6dd6", "INTAKE", "Flushes"], ["+ TPN", "#7c3aed", "INTAKE", "TPN"], ["+ Other Input", "#6b7a9a", "INTAKE", "Other Input"], ["+ Other Output", "#1b6e4a", "OUTPUT", "Other Output"]] as [string, string, "INTAKE" | "OUTPUT", string][]).map(([label, color, type, cat]) => (
          <button key={label} disabled={isViewOnly} style={s.quickBtn(color)} onClick={() => handleActionClick(type, cat)}>{label}</button>
        ))}
        <button disabled={isViewOnly} style={{ ...s.quickBtn("#6b7a9a"), marginLeft: "auto" }}>••• More</button>
      </div>

      <div style={s.footBar}>
        <div style={{ fontSize: "11px", color: "#6b7a9a" }}>
          <span>Next review due: &nbsp;<strong>{new Date(Date.now() + 3600000).toLocaleDateString("en-GB")} {new Date(Date.now() + 3600000).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</strong></span>
          &nbsp;&nbsp;<span>Last updated: &nbsp;<strong>{lastUpdatedStr}</strong></span>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button style={{ border: "1px solid #d0d6e6", background: "#fff", color: "#4a5568", borderRadius: "7px", padding: "8px 22px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>CANCEL</button>
          <button disabled={isViewOnly} onClick={fetchChart} style={{ background: "#1c3d7a", color: "#fff", border: "none", borderRadius: "7px", padding: "8px 22px", fontSize: "13px", fontWeight: 700, cursor: isViewOnly ? "not-allowed" : "pointer", opacity: isViewOnly ? 0.5 : 1 }}>REFRESH</button>
        </div>
      </div>
    </div>
  );
}
