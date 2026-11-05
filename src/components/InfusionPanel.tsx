import React, { useState, useEffect, useCallback } from "react";
import {
  X, Save, Loader2, Play, Pause, Square, Activity,
  ChevronDown, ChevronUp, AlertTriangle, Plus, Clock,
  Droplets, Zap
} from "lucide-react";
import { nursingService } from "../services/nursing.service";
import { useNotification } from "../context/NotificationContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InfusionEvent {
  event_type: "STARTED" | "TITRATED" | "PAUSED" | "RESUMED" | "STOPPED";
  previous_rate_ml_hr: string | null;
  new_rate_ml_hr: string | null;
  volume_ml: string | null;
  remarks: string | null;
  recorded_at: string;
  recorded_by_name?: string;
}

interface SafetyAlert {
  alert_type: string;
  severity: string;
  message: string;
  triggered_at: string;
  acknowledged: number;
  acknowledged_at: string | null;
  triggered_by_name?: string;
}

interface InfusionSession {
  session_id: number;
  infusion_type: string;
  session_status: "RUNNING" | "PAUSED" | "STOPPED";
  start_rate_ml_hr: string;
  current_rate_ml_hr: string;
  total_volume_ml: string | null;
  access_site: string;
  batch_number?: string;
  started_at: string;
  stopped_at: string | null;
  stop_reason: string | null;
  started_by_name: string;
  prescription_id: number;
  drug_name: string;
  drug_code?: string;
  dosage: string;
  frequency?: string;
  duration?: number;
  duration_unit?: string;
  route?: string;
  instructions?: string | null;
  dispense_status?: string;
  prescribed_at?: string;
  prescribed_by_name?: string;
  unacknowledged_alerts: number;
  events: InfusionEvent[];
  safety_alerts: SafetyAlert[];
}

interface Prescription {
  prescription_id: number;
  drug_name: string;
  drug_code: string;
  dosage: string;
  frequency: string;
  duration: number;
  duration_unit: string;
  route: string;
  instructions: string | null;
  prescribed_at: string;
  prescribed_by: string;
  has_active_session: number;
  last_session_id: number | null;
  last_session_status: string | null;
  current_rate_ml_hr: string | null;
}

interface InfusionPanelProps {
  encounterNumber: string;
  wardId?: number;
  sessions: InfusionSession[];
  onRefresh: () => void;
  onClose?: () => void;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const ACCESS_SITES = [
  "Peripheral IV - Right Hand",
  "Peripheral IV - Left Hand",
  "Peripheral IV - Right Arm",
  "Peripheral IV - Left Arm",
  "Central Line - Subclavian",
  "Central Line - Jugular",
  "Central Line - Femoral",
  "PICC Line",
  "Midline",
  "Other",
];

const INFUSION_TYPES = ["CONTINUOUS", "INTERMITTENT", "BOLUS"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDt = (dt: string) => {
  if (!dt) return "—";
  try {
    const d = new Date(dt.replace(" ", "T"));
    return d.toLocaleString("en-GB", {
      day: "2-digit", month: "2-digit", year: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return dt; }
};

const fmtTime = (dt: string) => {
  if (!dt) return "—";
  try {
    return new Date(dt.replace(" ", "T")).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  } catch { return dt; }
};

const statusConfig = (status: InfusionSession["session_status"]) => {
  switch (status) {
    case "RUNNING": return { bg: "#dcfce7", color: "#166534", dot: "#16a34a", label: "RUNNING" };
    case "PAUSED":  return { bg: "#fef9c3", color: "#854d0e", dot: "#ca8a04", label: "PAUSED" };
    case "STOPPED": return { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626", label: "STOPPED" };
  }
};

const eventConfig = (type: InfusionEvent["event_type"]) => {
  switch (type) {
    case "STARTED":  return { color: "#16a34a", bg: "#dcfce7", icon: "▶" };
    case "TITRATED": return { color: "#1d4ed8", bg: "#dbeafe", icon: "⟳" };
    case "PAUSED":   return { color: "#b45309", bg: "#fef9c3", icon: "⏸" };
    case "RESUMED":  return { color: "#0f766e", bg: "#ccfbf1", icon: "▷" };
    case "STOPPED":  return { color: "#dc2626", bg: "#fee2e2", icon: "⏹" };
  }
};

// ─── Shared modal styles ──────────────────────────────────────────────────────

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)",
  backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
  justifyContent: "center", zIndex: 300, padding: "16px",
};
const card: React.CSSProperties = {
  background: "#fff", borderRadius: "16px",
  boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
  width: "100%", maxWidth: "480px", overflow: "hidden",
};
const mHead = (bg: string): React.CSSProperties => ({
  background: bg, padding: "16px 20px", display: "flex",
  alignItems: "center", justifyContent: "space-between",
  borderBottom: "1px solid rgba(255,255,255,0.15)",
});
const mBody: React.CSSProperties = { padding: "20px", display: "flex", flexDirection: "column", gap: "14px" };
const label: React.CSSProperties = { display: "block", fontSize: "13px", fontWeight: 700, color: "#6b7a9a", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "6px" };
const input: React.CSSProperties = { width: "100%", padding: "10px 14px", border: "1px solid #d0d6e6", borderRadius: "10px", fontSize: "16px", fontWeight: 500, color: "#1c2b4a", background: "#f8f9fc", outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const btnRow: React.CSSProperties = { display: "flex", gap: "10px", marginTop: "4px" };
const secBtn: React.CSSProperties = { flex: 1, padding: "10px", border: "1px solid #d0d6e6", borderRadius: "10px", fontSize: "16px", fontWeight: 700, color: "#4a5568", background: "#fff", cursor: "pointer" };
const makePrimBtn = (bg: string): React.CSSProperties => ({ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "10px", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: 700, color: "#fff", background: bg, cursor: "pointer" });
const closeBtn: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", padding: "4px", borderRadius: "6px", lineHeight: 1, color: "rgba(255,255,255,0.8)" };
const contextPill: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.15)", borderRadius: "8px", padding: "4px 10px", fontSize: "14px", fontWeight: 700, color: "#fff", marginTop: "4px" };

// ─── Inline Forms ─────────────────────────────────────────────────────────

const inlineInput = (borderColor: string): React.CSSProperties => ({
  ...input,
  background: "#fff",
  border: `1px solid ${borderColor}`,
  padding: "8px 12px",
  fontSize: "15px",
  borderRadius: "8px",
});

const InlineFormWrap: React.FC<{ title: string; icon: React.ReactNode; color: string; bg: string; borderColor: string; children: React.ReactNode }> = ({ title, icon, color, bg, borderColor, children }) => (
  <div style={{ margin: "0 14px 14px", background: bg, borderRadius: "8px", border: `1px solid ${borderColor}`, padding: "12px 14px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: "6px", color, fontWeight: 800, fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>
      {icon} {title}
    </div>
    {children}
  </div>
);

const InlineTitrate: React.FC<{ session: InfusionSession; onCancel: () => void; onSave: () => void; }> = ({ session, onCancel, onSave }) => {
  const [rate, setRate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { notify } = useNotification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rate || Number(rate) <= 0) { notify("Please enter a valid rate", "warning"); return; }
    setSubmitting(true);
    try {
      await nursingService.titrateInfusion({ infusion_session_id: session.session_id, rate_ml_hr: Number(rate), remarks });
      notify("Infusion rate updated", "success"); onSave(); onCancel();
    } catch (err: any) { notify(err.response?.data?.message || "Failed to titrate infusion", "error"); } finally { setSubmitting(false); }
  };

  return (
    <InlineFormWrap title="Titrate Infusion" icon={<Zap size={14} />} color="#1d4ed8" bg="#eff6ff" borderColor="#bfdbfe">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 120px" }}>
            <label style={label}>New Rate (ml/hr) *</label>
            <input type="number" min="1" autoFocus required value={rate} onChange={e => setRate(e.target.value)} style={inlineInput("#bfdbfe")} placeholder={`${session.current_rate_ml_hr}`} />
          </div>
          <div style={{ flex: "2 1 200px" }}>
            <label style={label}>Remarks (optional)</label>
            <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} style={inlineInput("#bfdbfe")} placeholder="e.g. Protocol" />
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" }}>
          <button type="button" style={{ ...secBtn, flex: 0, padding: "7px 14px", fontSize: "15px", whiteSpace: "nowrap" }} onClick={onCancel}>Cancel</button>
          <button type="submit" disabled={submitting} style={{ ...makePrimBtn("#1d4ed8"), flex: 0, padding: "7px 14px", fontSize: "15px", whiteSpace: "nowrap" }}>{submitting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : "Update Rate"}</button>
        </div>
      </form>
    </InlineFormWrap>
  );
};

const InlinePause: React.FC<{ session: InfusionSession; onCancel: () => void; onSave: () => void; }> = ({ session, onCancel, onSave }) => {
  const [submitting, setSubmitting] = useState(false);
  const { notify } = useNotification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await nursingService.pauseInfusion({ infusion_session_id: session.session_id });
      notify("Infusion paused", "success"); onSave(); onCancel();
    } catch (err: any) { notify(err.response?.data?.message || "Failed to pause infusion", "error"); } finally { setSubmitting(false); }
  };

  return (
    <InlineFormWrap title="Pause Infusion" icon={<Pause size={14} />} color="#b45309" bg="#fefce8" borderColor="#fef08a">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ fontSize: "15px", color: "#854d0e" }}>⚠ The infusion will be paused.</div>
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" }}>
          <button type="button" style={{ ...secBtn, flex: 0, padding: "7px 14px", fontSize: "15px", whiteSpace: "nowrap" }} onClick={onCancel}>Cancel</button>
          <button type="submit" disabled={submitting} style={{ ...makePrimBtn("#b45309"), flex: 0, padding: "7px 14px", fontSize: "15px", whiteSpace: "nowrap" }}>{submitting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : "Pause Infusion"}</button>
        </div>
      </form>
    </InlineFormWrap>
  );
};

const InlineResume: React.FC<{ session: InfusionSession; onCancel: () => void; onSave: () => void; }> = ({ session, onCancel, onSave }) => {
  const [rate, setRate] = useState(session.current_rate_ml_hr || "");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { notify } = useNotification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rate || Number(rate) <= 0) { notify("Please enter a valid rate", "warning"); return; }
    setSubmitting(true);
    try {
      await nursingService.resumeInfusion({ infusion_session_id: session.session_id, rate_ml_hr: Number(rate), remarks });
      notify("Infusion resumed", "success"); onSave(); onCancel();
    } catch (err: any) { notify(err.response?.data?.message || "Failed to resume infusion", "error"); } finally { setSubmitting(false); }
  };

  return (
    <InlineFormWrap title="Resume Infusion" icon={<Play size={14} />} color="#0f766e" bg="#f0fdfa" borderColor="#99f6e4">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 120px" }}>
            <label style={label}>Resume Rate (ml/hr) *</label>
            <input type="number" min="1" autoFocus required value={rate} onChange={e => setRate(e.target.value)} style={inlineInput("#99f6e4")} />
          </div>
          <div style={{ flex: "2 1 200px" }}>
            <label style={label}>Remarks (optional)</label>
            <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} style={inlineInput("#99f6e4")} placeholder="e.g. Line repositioned" />
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" }}>
          <button type="button" style={{ ...secBtn, flex: 0, padding: "7px 14px", fontSize: "15px", whiteSpace: "nowrap" }} onClick={onCancel}>Cancel</button>
          <button type="submit" disabled={submitting} style={{ ...makePrimBtn("#0f766e"), flex: 0, padding: "7px 14px", fontSize: "15px", whiteSpace: "nowrap" }}>{submitting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : "Resume Infusion"}</button>
        </div>
      </form>
    </InlineFormWrap>
  );
};

const InlineStop: React.FC<{ session: InfusionSession; onCancel: () => void; onSave: () => void; }> = ({ session, onCancel, onSave }) => {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { notify } = useNotification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) { notify("A stop reason is required", "warning"); return; }
    setSubmitting(true);
    try {
      await nursingService.stopInfusion({ infusion_session_id: session.session_id, stop_reason: reason });
      notify("Infusion stopped", "success"); onSave(); onCancel();
    } catch (err: any) { notify(err.response?.data?.message || "Failed to stop infusion", "error"); } finally { setSubmitting(false); }
  };

  return (
    <InlineFormWrap title="Stop Infusion" icon={<Square size={14} />} color="#dc2626" bg="#fef2f2" borderColor="#fecaca">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ fontSize: "15px", color: "#991b1b" }}>This action will permanently stop the infusion session.</div>
        <div>
          <label style={label}>Stop Reason *</label>
          <input type="text" autoFocus required value={reason} onChange={e => setReason(e.target.value)} style={inlineInput("#fecaca")} placeholder="e.g. Infusion complete" />
        </div>
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" }}>
          <button type="button" style={{ ...secBtn, flex: 0, padding: "7px 14px", fontSize: "15px", whiteSpace: "nowrap" }} onClick={onCancel}>Cancel</button>
          <button type="submit" disabled={submitting} style={{ ...makePrimBtn("#dc2626"), flex: 0, padding: "7px 14px", fontSize: "15px", whiteSpace: "nowrap" }}>{submitting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : "Stop Infusion"}</button>
        </div>
      </form>
    </InlineFormWrap>
  );
};

// ─── Start Infusion Inline ─────────────────────────────────────────────────

const StartInfusionInline: React.FC<{
  encounterNumber: string; wardId?: number; onCancel: () => void; onSave: () => void;
}> = ({ encounterNumber, wardId, onCancel, onSave }) => {
  const [phase, setPhase] = useState<1 | 2>(1);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loadingRx, setLoadingRx] = useState(true);
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);
  const [rate, setRate] = useState("");
  const [volume, setVolume] = useState("");
  const [infusionType, setInfusionType] = useState("CONTINUOUS");
  const [accessSite, setAccessSite] = useState(ACCESS_SITES[3]); // default: Peripheral IV - Left Arm
  const [remarks, setRemarks] = useState("");
  const [eventAt, setEventAt] = useState<string>(() => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  });
  const [submitting, setSubmitting] = useState(false);
  const { notify } = useNotification();

  useEffect(() => {
    nursingService.getInfusionPrescriptions(encounterNumber)
      .then(res => setPrescriptions(res.data || []))
      .catch(() => setPrescriptions([]))
      .finally(() => setLoadingRx(false));
  }, [encounterNumber]);

  const handleStartSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRx) return;
    if (!rate || Number(rate) <= 0) { notify("Please enter a valid rate", "warning"); return; }
    if (!volume || Number(volume) <= 0) { notify("Please enter a valid volume", "warning"); return; }
    setSubmitting(true);
    try {
      await nursingService.startInfusion({
        encounter_number: encounterNumber,
        ward_id: wardId,
        prescription_id: selectedRx.prescription_id,
        rate_ml_hr: Number(rate),
        infusion_type: infusionType,
        access_site: accessSite,
        volume_ml: Number(volume),
        event_at: eventAt ? eventAt.replace("T", " ") + ":00" : undefined,
        remarks,
      });
      notify(`${selectedRx.drug_name} infusion started`, "success");
      onSave();
    } catch (err: any) { notify(err.response?.data?.message || "Failed to start infusion", "error"); } finally { setSubmitting(false); }
  };

  return (
    <div style={{ background: "#f5f3ff", border: "1px dashed #a78bfa", borderRadius: "12px", marginBottom: "16px", flexShrink: 0 }}>
      <div style={{ background: "#7c3aed", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", color: "#fff" }}>
        <div>
          <div style={{ fontSize: "18px", fontWeight: 800 }}>
            {phase === 1 ? "Start New Infusion" : "Configure Infusion"}
          </div>
          {phase === 2 && selectedRx && (
            <div style={{ fontSize: "14px", fontWeight: 600, marginTop: "2px", opacity: 0.9 }}>
              {selectedRx.drug_name} · {selectedRx.dosage} · {selectedRx.route}
            </div>
          )}
        </div>
        <button style={closeBtn} onClick={onCancel}><X size={16} /></button>
      </div>

      {phase === 1 && (
        <div style={{ padding: "16px 20px", maxHeight: "460px", overflowY: "auto" }}>
          {loadingRx ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px", gap: "8px", color: "#6b7a9a" }}>
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Loading prescriptions…
            </div>
          ) : prescriptions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#6b7a9a", fontSize: "16px" }}>
              No infusion prescriptions available for this encounter.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {prescriptions.map(rx => {
                const hasActive = rx.has_active_session === 1;
                return (
                  <div
                    key={rx.prescription_id}
                    onClick={() => { if (!hasActive) { setSelectedRx(rx); setPhase(2); } }}
                    style={{
                      border: `2px solid ${hasActive ? "#e0e4ef" : "#7c3aed"}`,
                      borderRadius: "12px", padding: "14px 16px",
                      cursor: hasActive ? "not-allowed" : "pointer",
                      opacity: hasActive ? 0.55 : 1,
                      background: hasActive ? "#f8f9fc" : "#faf5ff",
                      transition: "box-shadow 0.15s, transform 0.1s",
                      position: "relative",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: "18px", color: "#1c2b4a", marginBottom: "3px" }}>{rx.drug_name}</div>
                        <div style={{ fontSize: "14px", color: "#6b7a9a", lineHeight: 1.6 }}>
                          <span style={{ fontWeight: 600 }}>Dose:</span> {rx.dosage} &nbsp;·&nbsp;
                          <span style={{ fontWeight: 600 }}>Route:</span> {rx.route} &nbsp;·&nbsp;
                          <span style={{ fontWeight: 600 }}>Freq:</span> {rx.frequency}
                        </div>
                        <div style={{ fontSize: "14px", color: "#6b7a9a" }}>
                          <span style={{ fontWeight: 600 }}>Duration:</span> {rx.duration} {rx.duration_unit} &nbsp;·&nbsp;
                          <span style={{ fontWeight: 600 }}>By:</span> {rx.prescribed_by}
                        </div>
                        <div style={{ fontSize: "13px", color: "#8a94ad", marginTop: "2px" }}>
                          Prescribed: {fmtDt(rx.prescribed_at)}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                        <span style={{ background: "#ddd6fe", color: "#5b21b6", fontSize: "12px", fontWeight: 800, textTransform: "uppercase", padding: "3px 8px", borderRadius: "20px", letterSpacing: "0.5px" }}>
                          {rx.route}
                        </span>
                        {hasActive && (
                          <span style={{ background: "#dcfce7", color: "#166534", fontSize: "12px", fontWeight: 800, textTransform: "uppercase", padding: "3px 8px", borderRadius: "20px" }}>
                            Active Session
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ paddingTop: "12px", display: "flex", justifyContent: "flex-end" }}>
            <button onClick={onCancel} style={{ ...secBtn, flex: 0, padding: "10px 24px" }}>Cancel</button>
          </div>
        </div>
      )}

      {phase === 2 && selectedRx && (
        <form onSubmit={handleStartSubmit} style={mBody}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={label}>Rate (ml/hr) <span style={{ color: "#e11d48" }}>*</span></label>
              <input type="number" min="1" autoFocus required value={rate} onChange={e => setRate(e.target.value)} style={input} placeholder="e.g. 50" />
            </div>
            <div>
              <label style={label}>Volume (ml) <span style={{ color: "#e11d48" }}>*</span></label>
              <input type="number" min="1" required value={volume} onChange={e => setVolume(e.target.value)} style={input} placeholder="e.g. 500" />
            </div>
          </div>
          <div>
            <label style={label}>Infusion Type</label>
            <select value={infusionType} onChange={e => setInfusionType(e.target.value)} style={{ ...input, appearance: "none" }}>
              {INFUSION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Access Site</label>
            <select value={accessSite} onChange={e => setAccessSite(e.target.value)} style={{ ...input, appearance: "none" }}>
              {ACCESS_SITES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Start Date & Time <span style={{ color: "#e11d48" }}>*</span></label>
            <input
              type="datetime-local"
              required
              value={eventAt}
              onChange={e => setEventAt(e.target.value)}
              style={input}
            />
          </div>
          <div>
            <label style={label}>Remarks <span style={{ color: "#aaa", fontWeight: 400 }}>(optional)</span></label>
            <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} style={input} placeholder="e.g. Infusion started via pump, patient tolerated well" />
          </div>
          <div style={btnRow}>
            <button type="button" style={secBtn} onClick={() => setPhase(1)}>← Back</button>
            <button type="submit" disabled={submitting} style={makePrimBtn("#7c3aed")}>
              {submitting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={14} />}
              Start Infusion
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

// ─── Infusion Session Card ─────────────────────────────────────────────────

const InfusionCard: React.FC<{
  session: InfusionSession;
  onRefresh: () => void;
}> = ({ session, onRefresh }) => {
  const [expanded, setExpanded] = useState(false);
  const [activeModal, setActiveModal] = useState<"titrate" | "pause" | "resume" | "stop" | null>(null);

  const sc = statusConfig(session.session_status);
  const isRunning = session.session_status === "RUNNING";
  const isPaused = session.session_status === "PAUSED";
  const isStopped = session.session_status === "STOPPED";
  const unack = session.unacknowledged_alerts || 0;

  const accentColor = isRunning ? "#16a34a" : isPaused ? "#ca8a04" : "#dc2626";

  return (
    <>
      <div style={{
      background: "#fff",
      borderRadius: "12px",
      border: "1px solid #e0e4ef",
      overflow: "hidden",
      boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
      borderLeft: `4px solid ${accentColor}`,
      opacity: isStopped ? 0.75 : 1,
    }}>
      {/* Card header */}
      <div style={{ padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
        {/* Drug icon */}
        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `${accentColor}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Droplets size={18} color={accentColor} />
        </div>

        {/* Main info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 800, fontSize: "18px", color: "#1c2b4a" }}>{session.drug_name}</span>
            {/* Status badge */}
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: sc.bg, color: sc.color, fontSize: "12px", fontWeight: 800, textTransform: "uppercase", padding: "3px 8px", borderRadius: "20px", letterSpacing: "0.6px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: sc.dot, display: "inline-block" }} />{sc.label}
            </span>
            {/* Safety alerts badge */}
            {unack > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", background: "#fef9c3", color: "#854d0e", fontSize: "12px", fontWeight: 800, padding: "3px 8px", borderRadius: "20px", border: "1px solid #fde047" }}>
                <AlertTriangle size={9} /> {unack} Alert{unack > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Drug details row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "6px" }}>
            {[
              ["Rate", `${session.current_rate_ml_hr} ml/hr`],
              ["Dose", session.dosage],
              ["Type", session.infusion_type],
              ["Access", session.access_site],
              ["Started", fmtDt(session.started_at)],
              ["By", session.started_by_name],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: "12px", color: "#8a94ad", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#1c2b4a" }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Stop reason */}
          {isStopped && session.stop_reason && (
            <div style={{ marginTop: "6px", fontSize: "14px", color: "#991b1b", background: "#fee2e2", borderRadius: "6px", padding: "4px 8px", display: "inline-block" }}>
              Stopped: {session.stop_reason}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", flexShrink: 0 }}>
          {isRunning && (
            <>
              <button onClick={() => setActiveModal(activeModal === "titrate" ? null : "titrate")} style={actionBtn("#1d4ed8")}><Zap size={11} /> Titrate</button>
              <button onClick={() => setActiveModal(activeModal === "pause" ? null : "pause")} style={actionBtn("#b45309")}><Pause size={11} /> Pause</button>
              <button onClick={() => setActiveModal(activeModal === "stop" ? null : "stop")} style={actionBtn("#dc2626")}><Square size={11} /> Stop</button>
            </>
          )}
          {isPaused && (
            <>
              <button onClick={() => setActiveModal(activeModal === "resume" ? null : "resume")} style={actionBtn("#0f766e")}><Play size={11} /> Resume</button>
              <button onClick={() => setActiveModal(activeModal === "stop" ? null : "stop")} style={actionBtn("#dc2626")}><Square size={11} /> Stop</button>
            </>
          )}
        </div>
      </div>

      {/* Inline Action Forms */}
      {activeModal === "titrate" && <InlineTitrate session={session} onCancel={() => setActiveModal(null)} onSave={onRefresh} />}
      {activeModal === "pause" && <InlinePause session={session} onCancel={() => setActiveModal(null)} onSave={onRefresh} />}
      {activeModal === "resume" && <InlineResume session={session} onCancel={() => setActiveModal(null)} onSave={onRefresh} />}
      {activeModal === "stop" && <InlineStop session={session} onCancel={() => setActiveModal(null)} onSave={onRefresh} />}

        {/* Safety alerts panel */}
        {session.safety_alerts && session.safety_alerts.some(a => !a.acknowledged) && (
          <div style={{ margin: "0 14px 10px", background: "#fef9c3", border: "1px solid #fde047", borderRadius: "8px", padding: "8px 12px", display: "flex", flexDirection: "column", gap: "4px" }}>
            {session.safety_alerts.filter(a => !a.acknowledged).map((alert, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "6px", fontSize: "14px", color: "#854d0e" }}>
                <AlertTriangle size={11} style={{ marginTop: "1px", flexShrink: 0 }} />
                <span><strong>[{alert.severity}]</strong> {alert.message} <span style={{ color: "#a78a00", fontWeight: 500 }}>— {fmtTime(alert.triggered_at)}</span></span>
              </div>
            ))}
          </div>
        )}

        {/* Timeline toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ width: "100%", background: "#f8f9fc", border: "none", borderTop: "1px solid #e8eaf2", padding: "7px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontSize: "13px", fontWeight: 700, color: "#6b7a9a", textTransform: "uppercase", letterSpacing: "0.6px" }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "5px" }}><Activity size={11} /> Timeline ({session.events?.length || 0} events)</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {/* Timeline body */}
        {expanded && (
          <div style={{ padding: "10px 14px 14px", background: "#f8f9fc" }}>
            {(session.events || []).length === 0 ? (
              <div style={{ fontSize: "14px", color: "#8a94ad", textAlign: "center", padding: "12px 0" }}>No events recorded.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                {[...session.events].reverse().map((ev, i) => {
                  const ec = eventConfig(ev.event_type);
                  return (
                    <div key={i} style={{ display: "flex", gap: "10px", padding: "7px 0", borderBottom: i < session.events.length - 1 ? "1px dashed #e0e4ef" : "none" }}>
                      {/* Icon */}
                      <div style={{ flexShrink: 0, marginTop: "2px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "22px", height: "22px", background: ec.bg, borderRadius: "50%", fontSize: "13px" }}>
                          {ec.icon}
                        </span>
                      </div>
                      {/* Details */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "2px" }}>
                          <span style={{ fontSize: "13px", fontWeight: 800, color: ec.color, textTransform: "uppercase", letterSpacing: "0.5px" }}>{ev.event_type}</span>
                          {/* Rate change */}
                          {ev.new_rate_ml_hr && (
                            <span style={{ fontSize: "13px", color: "#4a5568", fontWeight: 600 }}>
                              {ev.previous_rate_ml_hr ? `${ev.previous_rate_ml_hr} → ` : "→ "}{ev.new_rate_ml_hr} ml/hr
                            </span>
                          )}
                          {ev.volume_ml && (
                            <span style={{ fontSize: "13px", color: "#4a5568", fontWeight: 600 }}>Vol: {ev.volume_ml} ml</span>
                          )}
                        </div>
                        {ev.remarks && (
                          <div style={{ fontSize: "13px", color: "#6b7a9a", fontStyle: "italic", marginBottom: "2px" }}>"{ev.remarks}"</div>
                        )}
                        <div style={{ fontSize: "12px", color: "#8a94ad" }}>
                          <Clock size={8} style={{ display: "inline", marginRight: "3px" }} />{fmtDt(ev.recorded_at)}{ev.recorded_by_name ? ` — ${ev.recorded_by_name}` : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

const actionBtn = (color: string): React.CSSProperties => ({
  display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px",
  border: `1.5px solid ${color}`, borderRadius: "7px", background: "#fff",
  color, fontSize: "13px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
  transition: "all 0.15s",
});

// ─── Main InfusionPanel ───────────────────────────────────────────────────

const InfusionPanel: React.FC<InfusionPanelProps> = ({ encounterNumber, wardId, sessions, onRefresh, onClose }) => {
  const [showStartModal, setShowStartModal] = useState(false);

  const activeSessions = sessions.filter(s => s.session_status !== "STOPPED");
  const stoppedSessions = sessions.filter(s => s.session_status === "STOPPED");

  return (
    <>
      <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #d8dce8", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>
        {/* Section header */}
        <div style={{ background: "#5b21b6", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Droplets size={14} color="#c4b5fd" />
            <span style={{ fontWeight: 800, fontSize: "15px", color: "#fff", textTransform: "uppercase", letterSpacing: "0.8px" }}>Active Infusions</span>
            {activeSessions.length > 0 && (
              <span style={{ background: "#7c3aed", color: "#e9d5ff", fontSize: "13px", fontWeight: 800, padding: "2px 8px", borderRadius: "20px" }}>
                {activeSessions.length} running
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => setShowStartModal(true)}
              style={{ display: "flex", alignItems: "center", gap: "5px", background: "#7c3aed", border: "none", borderRadius: "7px", padding: "7px 14px", fontSize: "14px", fontWeight: 800, color: "#fff", cursor: "pointer" }}
            >
              <Plus size={12} /> Start Infusion
            </button>
            {onClose && (
              <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "6px", width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer" }}>
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 16px 20px", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {showStartModal && (
            <StartInfusionInline
              encounterNumber={encounterNumber}
              wardId={wardId}
              onCancel={() => setShowStartModal(false)}
              onSave={() => { setShowStartModal(false); onRefresh(); }}
            />
          )}

          {sessions.length === 0 ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 20px", gap: "8px", color: "#6b7a9a" }}>
              <Droplets size={40} color="#c4b5fd" />
              <span style={{ fontSize: "18px", fontWeight: 600 }}>No infusion sessions for this encounter</span>
              <span style={{ fontSize: "14px", color: "#8a94ad" }}>Click "Start Infusion" to begin</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {/* Active / paused first */}
              {activeSessions.map(s => (
                <InfusionCard key={s.session_id} session={s} onRefresh={onRefresh} />
              ))}
              {/* Stopped sessions collapsed */}
              {stoppedSessions.length > 0 && (
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#8a94ad", textTransform: "uppercase", letterSpacing: "0.6px", padding: "4px 2px 8px" }}>
                    Completed / Stopped
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {stoppedSessions.map(s => (
                      <InfusionCard key={s.session_id} session={s} onRefresh={onRefresh} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default InfusionPanel;
