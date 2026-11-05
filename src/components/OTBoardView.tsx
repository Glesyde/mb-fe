import React, { useEffect, useState, useRef } from "react";
import {
  X,
  Check,
  Square,
  Loader2,
  AlertTriangle,
  Maximize2,
  Minimize2,
  User,
  MonitorPlay,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Plus,
} from "lucide-react";
import { otService, OTCaseBoard } from "../services/ot.service";
import { BASE_URL } from "../api/client";

const getFileUrl = (path: string) => {
  if (!path) return "";
  if (path.startsWith("data:") || path.startsWith("http")) return path;
  const normalizedBaseUrl = BASE_URL.replace(/\/\$/, "");
  return path.startsWith("/") ? `${normalizedBaseUrl}${path}` : `${normalizedBaseUrl}/${path}`;
};

// ─── PACS Image Carousel (manual navigation only) ──────────────────────────────
const PacsCarousel: React.FC<{ images?: OTCaseBoard["radiology_images"] }> = ({ images = [] }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [images]);

  if (!images || images.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-700">
        <ImageIcon size={64} className="opacity-20" />
      </div>
    );
  }

  const current = images[index];
  if (!current) return null;

  return (
    <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
      <img
        key={current.file_path}
        src={getFileUrl(current.file_path)}
        alt={`Radiology image ${index + 1}`}
        className="max-h-full max-w-full object-contain"
      />
      {images.length > 1 && (
        <>
          <button
            onClick={() => setIndex((prev) => (prev - 1 + images.length) % images.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => setIndex((prev) => (prev + 1) % images.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          >
            <ChevronRight size={20} />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === index ? "bg-white" : "bg-white/30"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

interface OTBoardViewProps {
  otCaseId: number;
  caseNumber?: string;
  onClose: () => void;
}

// ─── Live Clock ────────────────────────────────────────────────────────────────
const LiveClock: React.FC = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const date = now.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).toUpperCase();
  const time = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return (
    <span className="font-sans text-sm tracking-wide text-white">
      {date} <span className="text-slate-500 mx-2">|</span> {time}
    </span>
  );
};

// ─── Team Avatar ───────────────────────────────────────────────────────────────
const TeamCol: React.FC<{ role: string; name: string; iconColor: string }> = ({
  role,
  name,
  iconColor,
}) => (
  <div className="flex flex-col items-center gap-0.5 px-2 border-r border-[#1a4a82] last:border-r-0 flex-1 py-1">
    <div className="flex items-center gap-1.5">
      <div className={`flex items-center justify-center ${iconColor}`}>
        <User size={14} className="text-white" />
      </div>
      <span className="text-[11px] font-bold text-white uppercase tracking-wider">
        {role}
      </span>
    </div>
    <span
      className={`text-sm font-bold leading-tight ${name ? "text-[#38bdf8]" : "text-slate-500 italic"}`}
    >
      {name || "—"}
    </span>
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────
const OTBoardView: React.FC<OTBoardViewProps> = ({
  otCaseId,
  caseNumber,
  onClose,
}) => {
  const [data, setData] = useState<OTCaseBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [editingCounts, setEditingCounts] = useState(false);
  const [draftCounts, setDraftCounts] = useState<Array<{ item: string; in: number; out: number }> | null>(null);
  const [savingCounts, setSavingCounts] = useState(false);
  const [newItemName, setNewItemName] = useState("");

  const loadBoard = async () => {
    setLoading(true);
    setError(null);
    try {
      const board = await otService.getCaseBoard(otCaseId);
      setData(board);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to load board data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoard();
    const interval = setInterval(loadBoard, 3600000); // Refresh every 1 hour

    // Attempt to automatically go fullscreen on open
    if (containerRef.current && !document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    }

    return () => clearInterval(interval);
  }, [otCaseId]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.fullscreenElement) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const allMatched = data?.counts?.every((c) => c.status === "MATCHED");

  const startEditingCounts = () => {
    setDraftCounts((data?.counts || []).map((c) => ({ item: c.item, in: c.in, out: c.out })));
    setEditingCounts(true);
  };

  const cancelEditingCounts = () => {
    setEditingCounts(false);
    setDraftCounts(null);
    setNewItemName("");
  };

  const updateDraftCount = (index: number, field: "in" | "out", value: number) => {
    setDraftCounts((prev) =>
      prev ? prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)) : prev,
    );
  };

  const addDraftItem = () => {
    const name = newItemName.trim();
    if (!name) return;
    setDraftCounts((prev) => [...(prev || []), { item: name, in: 0, out: 0 }]);
    setNewItemName("");
  };

  const removeDraftItem = (index: number) => {
    setDraftCounts((prev) => (prev ? prev.filter((_, i) => i !== index) : prev));
  };

  const saveCounts = async () => {
    if (!draftCounts) return;
    setSavingCounts(true);
    try {
      await otService.submitSwabCounts({ ot_case_id: otCaseId, counts: draftCounts });
      setEditingCounts(false);
      setDraftCounts(null);
      setNewItemName("");
      await loadBoard();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to save counts");
    } finally {
      setSavingCounts(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black">
      {/* Board Container */}
      <div
        ref={containerRef}
        className="relative w-full h-full flex flex-col bg-black text-white font-sans"
      >
        {/* ── TOP HEADER ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-3 shrink-0 border-b-2 border-[#1a4a82] bg-black">
          {/* Left: Logo + Hospital name */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col leading-none">
              <div className="flex items-center justify-center">
                <img
                  src="/assets/logo-nobg.png"
                  alt="Logo"
                  width={200}
                  height={200}
                />
              </div>
              <span className="text-[10px] font-normal text-[#4ade80] tracking-wide mt-1">
                Compassion <span className="text-white mx-1">|</span> Excellence <span className="text-white mx-1">|</span> Innovation
              </span>
            </div>
          </div>

          {/* Center: Theatre Name */}
          <div className="text-center absolute left-1/2 -translate-x-1/2">
            <h1 className="text-3xl font-bold text-white tracking-wide">
              {loading || !data
                ? "OT BOARD"
                : data.theatre_info.room_name.toUpperCase()}
            </h1>
          </div>

          {/* Right: Date/Time + Controls */}
          <div className="flex items-center gap-4">
            <LiveClock />
            <div className="flex items-center gap-1 border-l border-slate-700 pl-4">
              <button
                onClick={toggleFullscreen}
                className="p-1.5 text-slate-400 hover:text-white rounded"
              >
                {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-red-400 rounded"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* ── LOADING / ERROR ─────────────────────────────────────────────────── */}
        {loading && (
          <div className="flex-1 flex items-center justify-center gap-4 bg-black">
            <Loader2 size={40} className="animate-spin text-[#0ea5e9]" />
            <span className="text-white font-bold text-xl tracking-wider">
              LOADING THEATRE BOARD...
            </span>
          </div>
        )}

        {!loading && error && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-black">
            <AlertTriangle size={60} className="text-red-500" />
            <p className="text-white font-bold text-2xl">BOARD UNAVAILABLE</p>
            <p className="text-slate-400 text-lg">{error}</p>
          </div>
        )}

        {/* ── BOARD CONTENT ───────────────────────────────────────────────────── */}
        {!loading && data && (
          <div className="flex-1 flex flex-col overflow-hidden bg-black p-1 gap-1">
            {/* ── PATIENT & PROCEDURE BARS ─────────────────────────────────── */}
            <div className="flex flex-col border border-[#1a4a82]">
              {/* Patient Info Row */}
              <div className="flex items-center justify-center gap-6 py-2 border-b border-[#1a4a82] bg-[#020813]">
                <InfoPill label="PATIENT ID" value={data.patient.id} valueClass="text-[#38bdf8]" />
                <span className="text-slate-500 text-lg">|</span>
                <InfoPill label="AGE" value={String(data.patient.age)} />
                <span className="text-slate-500 text-lg">|</span>
                <InfoPill label="SEX" value={data.patient.sex} />
                <span className="text-slate-500 text-lg">|</span>
                <InfoPill
                  label="ALLERGY"
                  value={data.patient.allergy}
                  valueClass={
                    data.patient.allergy === "NKDA"
                      ? "text-[#4ade80]"
                      : "text-red-400"
                  }
                />
              </div>

              {/* Procedure Row */}
              <div className="flex items-center justify-center gap-3 py-2 border-b border-[#1a4a82] bg-[#020813]">
                <span className="text-base font-bold text-white uppercase tracking-wider">
                  PROCEDURE:
                </span>
                <span className="text-xl font-bold text-[#38bdf8] uppercase tracking-wide">
                  {data.procedure}
                </span>
              </div>

              {/* Team Row */}
              <div className="flex items-stretch py-1.5 bg-[#020813]">
                <TeamCol role="SURGEON" name={data.team.surgeon} iconColor="text-[#38bdf8]" />
                <TeamCol role="ASSIST. SURGEON" name={data.team.assist_surgeon} iconColor="text-[#38bdf8]" />
                <TeamCol role="ANAESTHETIST" name={data.team.anaesthetist} iconColor="text-[#38bdf8]" />
                <TeamCol role="SCRUB NURSE" name={data.team.scrub_nurse} iconColor="text-[#c084fc]" />
                <TeamCol role="CIRCULATOR" name={data.team.circulator} iconColor="text-[#c084fc]" />
              </div>
            </div>

            {/* ── IMAGE PANELS ─────────────────────────────────────────────── */}
            <div className="flex h-[35vh] gap-1">
              <div className="flex-1 flex flex-col border border-[#1a4a82] bg-[#020813]">
                <div className="py-1.5 text-center border-b border-[#1a4a82] bg-[#042a59]">
                  <span className="text-[13px] font-bold text-white uppercase tracking-wider">
                    LIVE SURGICAL VIEW
                  </span>
                </div>
                <div className="flex-1 flex items-center justify-center text-slate-700">
                  <MonitorPlay size={64} className="opacity-20" />
                </div>
              </div>
              <div className="flex-1 flex flex-col border border-[#1a4a82] bg-[#020813]">
                <div className="py-1.5 text-center border-b border-[#1a4a82] bg-[#042a59]">
                  <span className="text-[13px] font-bold text-white uppercase tracking-wider">
                    CT / PACS / IMAGE VIEW
                  </span>
                </div>
                <PacsCarousel images={data.radiology_images || []} />
              </div>
            </div>

            {/* ── BOTTOM 3-COLUMN SECTION ───────────────────────────────────── */}
            <div className="flex flex-1 gap-1 min-h-0">
              {/* ── COL 1: WHO CHECKLIST + TIMERS ── */}
              <div className="w-[300px] shrink-0 flex flex-col gap-1 border border-[#1a4a82] bg-[#020813]">
                {/* WHO Checklist */}
                <div className="flex flex-col">
                  <SectionHeader label="WHO CHECKLIST" />
                  <div className="px-5 py-4 space-y-4">
                    <CheckRow label="Sign In" done={data.checklists.sign_in.status} time={data.checklists.sign_in.time} />
                    <CheckRow label="Time Out" done={data.checklists.time_out.status} time={data.checklists.time_out.time} />
                    <CheckRow label="Sign Out" done={data.checklists.sign_out.status} time={data.checklists.sign_out.time} />
                  </div>
                </div>
                <div className="flex-1" />
                {/* Timers */}
                <div className="flex flex-col">
                  <SectionHeader label="TIMERS" />
                  <div className="px-5 py-4 space-y-4">
                    <TimerRow label="Anaes Start:" value={data.timers.anaes_start} />
                    <TimerRow label="Knife to Skin:" value={data.timers.knife_to_skin} />
                    <TimerRow label="Elapsed Time:" value={data.timers.elapsed_time} highlight />
                  </div>
                </div>
              </div>

              {/* ── COL 2: SWAB COUNT ── */}
              <div className="flex-[2] flex flex-col border border-[#1a4a82] bg-[#020813] min-w-0">
                <SectionHeader
                  label="DIGITAL SWAB / INSTRUMENT COUNT"
                  action={
                    editingCounts ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={cancelEditingCounts}
                          disabled={savingCounts}
                          className="px-3 py-1 rounded-lg text-xs font-bold text-slate-300 hover:text-white border border-[#1a4a82] hover:bg-[#0a2a52] transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={saveCounts}
                          disabled={savingCounts}
                          className="px-3 py-1 rounded-lg text-xs font-bold text-[#020813] bg-[#4ade80] hover:bg-[#3fce70] transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {savingCounts && <Loader2 size={12} className="animate-spin" />}
                          Save Counts
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={startEditingCounts}
                        className="px-3 py-1 rounded-lg text-xs font-bold text-white border border-[#1a4a82] hover:bg-[#0a2a52] transition-colors"
                      >
                        Edit
                      </button>
                    )
                  }
                />

                <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#020813] sticky top-0 border-b border-[#1a4a82]">
                      <tr>
                        <th className="py-2.5 px-4 text-sm font-bold text-white w-1/2 border-r border-[#1a4a82]">ITEM</th>
                        <th className="py-2.5 px-4 text-sm font-bold text-white text-center border-r border-[#1a4a82]">IN</th>
                        <th className="py-2.5 px-4 text-sm font-bold text-white text-center border-r border-[#1a4a82]">OUT</th>
                        <th className="py-2.5 px-4 text-sm font-bold text-white text-center">STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(editingCounts && draftCounts ? draftCounts : data.counts).map((row, i) => (
                        <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-900/50">
                          <td className="py-2.5 px-4 text-base font-normal text-white border-r border-[#1a4a82] flex items-center gap-2">
                            <span className="text-slate-500 text-xs">▤</span> {row.item}
                          </td>
                          <td className="py-2.5 px-4 text-lg font-normal text-white text-center border-r border-[#1a4a82]">
                            {editingCounts ? (
                              <input
                                type="number"
                                min={0}
                                value={row.in}
                                onChange={(e) => updateDraftCount(i, "in", parseInt(e.target.value) || 0)}
                                className="w-16 bg-[#0a2a52] border border-[#1a4a82] rounded-md text-center text-white text-base outline-none focus:border-[#4ade80]"
                              />
                            ) : (
                              row.in
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-lg font-normal text-white text-center border-r border-[#1a4a82]">
                            {editingCounts ? (
                              <input
                                type="number"
                                min={0}
                                value={row.out}
                                onChange={(e) => updateDraftCount(i, "out", parseInt(e.target.value) || 0)}
                                className="w-16 bg-[#0a2a52] border border-[#1a4a82] rounded-md text-center text-white text-base outline-none focus:border-[#4ade80]"
                              />
                            ) : (
                              row.out
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            {editingCounts ? (
                              <button
                                onClick={() => removeDraftItem(i)}
                                title="Remove item"
                                className="p-1.5 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            ) : "status" in row ? (
                              <span className={`inline-flex items-center gap-1.5 text-sm font-bold ${(row as any).status === "MATCHED" ? "text-[#4ade80]" : "text-red-500"}`}>
                                <div className="w-4 h-4 rounded-full bg-[#4ade80]/20 flex items-center justify-center">
                                  <Check size={12} strokeWidth={4} />
                                </div>
                                {(row as any).status}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {editingCounts && (
                        <tr className="border-b border-slate-800/50 bg-[#020813]">
                          <td className="py-2 px-4 border-r border-[#1a4a82]">
                            <input
                              type="text"
                              value={newItemName}
                              onChange={(e) => setNewItemName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addDraftItem();
                                }
                              }}
                              placeholder="New item name..."
                              className="w-full bg-[#0a2a52] border border-[#1a4a82] rounded-md px-2 py-1.5 text-sm text-white outline-none focus:border-[#4ade80] placeholder:text-slate-500"
                            />
                          </td>
                          <td className="border-r border-[#1a4a82]" />
                          <td className="border-r border-[#1a4a82]" />
                          <td className="py-2 px-4 text-center">
                            <button
                              onClick={addDraftItem}
                              disabled={!newItemName.trim()}
                              title="Add item"
                              className="p-1.5 rounded-md text-[#4ade80] hover:bg-[#4ade80]/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Plus size={16} />
                            </button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Specimen Row */}
                <div className="px-4 py-3 border-t border-[#1a4a82] flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white rounded-sm flex items-center justify-center">
                      <Check size={12} className="text-white" strokeWidth={4} />
                    </div>
                    <span className="text-sm font-bold text-white uppercase">SPECIMEN(S):</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 border-2 rounded-sm flex items-center justify-center ${data.specimen.collected ? "border-[#4ade80]" : "border-slate-500"}`}>
                      {data.specimen.collected && <Check size={12} className="text-[#4ade80]" strokeWidth={4} />}
                    </div>
                    <span className="text-sm text-white">Collected</span>
                  </div>

                  <span className="text-sm text-white">
                    Type: <span className="text-white">{data.specimen.type || "—"}</span>
                  </span>

                  <span className="text-sm text-white">
                    Sent: <span className={data.specimen.sent ? "text-[#4ade80]" : "text-red-500"}>{data.specimen.sent ? "YES" : "NO"}</span>
                  </span>
                </div>
              </div>

              {/* ── COL 3: BLOOD LOSS + NEXT CASE ── */}
              <div className="w-[320px] shrink-0 flex flex-col gap-1 border border-[#1a4a82] bg-[#020813]">
                <div className="flex flex-col flex-1 min-h-0 border-b border-[#1a4a82]">
                  <SectionHeader label="BLOOD LOSS" />
                  <div className="px-5 py-3 flex flex-col gap-3 overflow-y-auto">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-white text-base">Swabs:</span>
                        <span className="text-white text-base font-normal">
                          {(data.blood_loss as any).swabs_ml !== undefined ? `${(data.blood_loss as any).swabs_ml} ml` : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white text-base">Suction:</span>
                        <span className="text-white text-base font-normal">
                          {(data.blood_loss as any).suction_ml !== undefined ? `${(data.blood_loss as any).suction_ml} ml` : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white text-base">Irrigation:</span>
                        <span className="text-white text-base font-normal">
                          {(data.blood_loss as any).irrigation_ml !== undefined ? `${(data.blood_loss as any).irrigation_ml} ml` : "—"}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-auto pt-3 border-t border-[#1a4a82] text-center">
                      <p className="text-[11px] font-bold text-[#facc15] uppercase tracking-wide mb-1 leading-tight">
                        ESTIMATED TOTAL BLOOD LOSS:
                      </p>
                      <p className="text-4xl font-bold text-[#facc15] whitespace-nowrap">
                        {data.blood_loss?.estimated_total_ml ?? 0} <span className="text-2xl">ml</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col shrink-0 min-h-[120px]">
                  <SectionHeader label="NEXT CASE" />
                  <div className="px-5 py-4 flex flex-col items-center justify-center text-center h-full">
                    <p className="text-xl font-bold text-[#facc15] leading-tight mb-4">
                      {data.next_case?.procedure || "—"}
                    </p>
                    {data.next_case?.status && (
                      <div className="flex items-center gap-2">
                        <div className={`w-3.5 h-3.5 rounded-full ${data.next_case.status === "SCHEDULED" ? "bg-[#4ade80]" : "bg-[#facc15]"}`} />
                        <span className="text-base font-bold text-[#4ade80] uppercase tracking-widest">
                          {data.next_case.status === "SCHEDULED" ? "READY" : data.next_case.status}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── FOOTER STATUS BAR ─────────────────────────────────────────── */}
            <div className="flex items-center justify-center gap-6 py-2 shrink-0 border border-[#1a4a82] bg-black">
              {allMatched ? (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-[#4ade80] flex items-center justify-center">
                      <Check size={14} className="text-black" strokeWidth={4} />
                    </div>
                    <span className="text-base font-bold text-[#4ade80] uppercase tracking-wider">
                      COUNTS MATCHED
                    </span>
                  </div>
                  <span className="text-slate-500 text-xl">|</span>
                  <span className="text-base font-bold text-[#4ade80] uppercase tracking-wider">
                    SAFE TO PROCEED TO SIGN OUT
                  </span>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                      <AlertTriangle size={14} className="text-black" strokeWidth={3} />
                    </div>
                    <span className="text-base font-bold text-red-500 uppercase tracking-wider">
                      COUNT MISMATCH
                    </span>
                  </div>
                  <span className="text-slate-500 text-xl">|</span>
                  <span className="text-base font-bold text-red-500 uppercase tracking-wider">
                    DO NOT PROCEED
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Small Helpers ─────────────────────────────────────────────────────────────

const InfoPill: React.FC<{
  label: string;
  value: string;
  valueClass?: string;
}> = ({ label, value, valueClass = "text-white" }) => (
  <div className="flex items-center gap-2">
    <span className="text-base font-bold text-white uppercase tracking-wider">
      {label}:
    </span>
    <span className={`text-xl font-normal ${valueClass}`}>{value}</span>
  </div>
);

const SectionHeader: React.FC<{ label: string; action?: React.ReactNode }> = ({ label, action }) => (
  <div className="py-1.5 px-4 flex items-center bg-[#042a59] border-b border-[#1a4a82]">
    <span className="flex-1 text-sm font-bold text-white uppercase tracking-wider text-center">
      {label}
    </span>
    {action}
  </div>
);

const CheckRow: React.FC<{
  label: string;
  done: boolean;
  time: string;
}> = ({ label, done, time }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      {done ? (
        <Check size={20} className="text-[#4ade80]" strokeWidth={4} />
      ) : (
        <Square size={20} className="text-white" />
      )}
      <span className="text-base font-normal text-white">{label}</span>
    </div>
    {done && time && (
      <span className="text-base font-bold text-[#facc15]">{time}</span>
    )}
  </div>
);

const TimerRow: React.FC<{
  label: string;
  value: string;
  highlight?: boolean;
}> = ({ label, value, highlight }) => (
  <div className="flex items-center justify-between">
    <span className="text-base font-normal text-white">{label}</span>
    <span className={`text-xl font-bold ${highlight ? "text-[#facc15]" : "text-[#facc15]"}`}>
      {value || "—"}
    </span>
  </div>
);

export default OTBoardView;


// import React, { useEffect, useState, useRef } from "react";
// import {
//   X,
//   Check,
//   Square,
//   Loader2,
//   AlertTriangle,
//   Maximize2,
//   Minimize2,
//   User,
//   MonitorPlay,
//   Image as ImageIcon,
//   ChevronLeft,
//   ChevronRight,
//   Trash2,
//   Plus,
// } from "lucide-react";
// import { otService, OTCaseBoard } from "../services/ot.service";
// import { BASE_URL } from "../api/client";

// const getFileUrl = (path: string) => {
//   if (!path) return "";
//   if (path.startsWith("data:") || path.startsWith("http")) return path;
//   const normalizedBaseUrl = BASE_URL.replace(/\/$/, "");
//   return path.startsWith("/") ? `${normalizedBaseUrl}${path}` : `${normalizedBaseUrl}/${path}`;
// };

// // ─── PACS Image Carousel (manual navigation only) ──────────────────────────────
// const PacsCarousel: React.FC<{ images: OTCaseBoard["radiology_images"] }> = ({ images }) => {
//   const [index, setIndex] = useState(0);

//   useEffect(() => {
//     setIndex(0);
//   }, [images]);

//   if (images.length === 0) {
//     return (
//       <div className="flex-1 flex items-center justify-center text-slate-700">
//         <ImageIcon size={64} className="opacity-20" />
//       </div>
//     );
//   }

//   const current = images[index];

//   return (
//     <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
//       <img
//         key={current.file_path}
//         src={getFileUrl(current.file_path)}
//         alt={`Radiology image ${index + 1}`}
//         className="max-h-full max-w-full object-contain"
//       />
//       {images.length > 1 && (
//         <>
//           <button
//             onClick={() => setIndex((prev) => (prev - 1 + images.length) % images.length)}
//             className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
//           >
//             <ChevronLeft size={20} />
//           </button>
//           <button
//             onClick={() => setIndex((prev) => (prev + 1) % images.length)}
//             className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
//           >
//             <ChevronRight size={20} />
//           </button>
//           <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
//             {images.map((_, i) => (
//               <span
//                 key={i}
//                 className={`w-1.5 h-1.5 rounded-full transition-colors ${i === index ? "bg-white" : "bg-white/30"}`}
//               />
//             ))}
//           </div>
//         </>
//       )}
//     </div>
//   );
// };

// interface OTBoardViewProps {
//   otCaseId: number;
//   caseNumber?: string;
//   onClose: () => void;
// }

// // ─── Live Clock ────────────────────────────────────────────────────────────────
// const LiveClock: React.FC = () => {
//   const [now, setNow] = useState(new Date());
//   useEffect(() => {
//     const t = setInterval(() => setNow(new Date()), 1000);
//     return () => clearInterval(t);
//   }, []);
//   const date = now.toLocaleDateString("en-GB", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//   }).toUpperCase();
//   const time = now.toLocaleTimeString("en-US", {
//     hour: "2-digit",
//     minute: "2-digit",
//     hour12: true,
//   });
//   return (
//     <span className="font-sans text-sm tracking-wide text-white">
//       {date} <span className="text-slate-500 mx-2">|</span> {time}
//     </span>
//   );
// };

// // ─── Team Avatar ───────────────────────────────────────────────────────────────
// const TeamCol: React.FC<{ role: string; name: string; iconColor: string }> = ({
//   role,
//   name,
//   iconColor,
// }) => (
//   <div className="flex flex-col items-center gap-0.5 px-2 border-r border-[#1a4a82] last:border-r-0 flex-1 py-1">
//     <div className="flex items-center gap-1.5">
//       <div className={`flex items-center justify-center ${iconColor}`}>
//         <User size={14} className="text-white" />
//       </div>
//       <span className="text-[11px] font-bold text-white uppercase tracking-wider">
//         {role}
//       </span>
//     </div>
//     <span
//       className={`text-sm font-bold leading-tight ${name ? "text-[#38bdf8]" : "text-slate-500 italic"}`}
//     >
//       {name || "—"}
//     </span>
//   </div>
// );

// // ─── Main Component ────────────────────────────────────────────────────────────
// const OTBoardView: React.FC<OTBoardViewProps> = ({
//   otCaseId,
//   caseNumber,
//   onClose,
// }) => {
//   const [data, setData] = useState<OTCaseBoard | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [isFullscreen, setIsFullscreen] = useState(false);
//   const containerRef = useRef<HTMLDivElement>(null);

//   const [editingCounts, setEditingCounts] = useState(false);
//   const [draftCounts, setDraftCounts] = useState<Array<{ item: string; in: number; out: number }> | null>(null);
//   const [savingCounts, setSavingCounts] = useState(false);
//   const [newItemName, setNewItemName] = useState("");

//   const loadBoard = async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       const board = await otService.getCaseBoard(otCaseId);
//       setData(board);
//     } catch (err: any) {
//       setError(err?.response?.data?.message || err?.message || "Failed to load board data");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadBoard();
//     const interval = setInterval(loadBoard, 3600000); // Refresh every 1 hour

//     // Attempt to automatically go fullscreen on open
//     if (containerRef.current && !document.fullscreenElement) {
//       containerRef.current.requestFullscreen().catch(() => {});
//     }

//     return () => clearInterval(interval);
//   }, [otCaseId]);

//   const toggleFullscreen = () => {
//     if (!document.fullscreenElement) {
//       containerRef.current?.requestFullscreen().catch(() => {});
//     } else {
//       document.exitFullscreen();
//     }
//   };

//   useEffect(() => {
//     const handler = () => setIsFullscreen(!!document.fullscreenElement);
//     document.addEventListener("fullscreenchange", handler);
//     return () => document.removeEventListener("fullscreenchange", handler);
//   }, []);

//   useEffect(() => {
//     const handler = (e: KeyboardEvent) => {
//       if (e.key === "Escape" && !document.fullscreenElement) onClose();
//     };
//     window.addEventListener("keydown", handler);
//     return () => window.removeEventListener("keydown", handler);
//   }, [onClose]);

//   const allMatched = data?.counts?.every((c) => c.status === "MATCHED");

//   const startEditingCounts = () => {
//     setDraftCounts((data?.counts || []).map((c) => ({ item: c.item, in: c.in, out: c.out })));
//     setEditingCounts(true);
//   };

//   const cancelEditingCounts = () => {
//     setEditingCounts(false);
//     setDraftCounts(null);
//     setNewItemName("");
//   };

//   const updateDraftCount = (index: number, field: "in" | "out", value: number) => {
//     setDraftCounts((prev) =>
//       prev ? prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)) : prev,
//     );
//   };

//   const addDraftItem = () => {
//     const name = newItemName.trim();
//     if (!name) return;
//     setDraftCounts((prev) => [...(prev || []), { item: name, in: 0, out: 0 }]);
//     setNewItemName("");
//   };

//   const removeDraftItem = (index: number) => {
//     setDraftCounts((prev) => (prev ? prev.filter((_, i) => i !== index) : prev));
//   };

//   const saveCounts = async () => {
//     if (!draftCounts) return;
//     setSavingCounts(true);
//     try {
//       await otService.submitSwabCounts({ ot_case_id: otCaseId, counts: draftCounts });
//       setEditingCounts(false);
//       setDraftCounts(null);
//       setNewItemName("");
//       await loadBoard();
//     } catch (err: any) {
//       setError(err?.response?.data?.message || err?.message || "Failed to save counts");
//     } finally {
//       setSavingCounts(false);
//     }
//   };

//   return (
//     <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black">
//       {/* Board Container */}
//       <div
//         ref={containerRef}
//         className="relative w-full h-full flex flex-col bg-black text-white font-sans"
//       >
//         {/* ── TOP HEADER ─────────────────────────────────────────────────────── */}
//         <div className="flex items-center justify-between px-6 py-3 shrink-0 border-b-2 border-[#1a4a82] bg-black">
//           {/* Left: Logo + Hospital name */}
//           <div className="flex items-center gap-3">

//             <div className="flex flex-col leading-none">
//               <div className="flex items-center justify-center">
//                 {/* <div className="w-4 h-4 bg-[#22c55e] rounded-full opacity-80" /> */}
//                 <img
//                   src="/assets/logo-nobg.png"
//                   alt="Logo"
//                   width={200}
//                   height={200}
//                   fill
//                 />
//               </div>
//               <span className="text-[10px] font-normal text-[#4ade80] tracking-wide mt-1">
//                 Compassion <span className="text-white mx-1">|</span> Excellence <span className="text-white mx-1">|</span> Innovation
//               </span>
//             </div>
//           </div>

//           {/* Center: Theatre Name */}
//           <div className="text-center absolute left-1/2 -translate-x-1/2">
//             <h1 className="text-3xl font-bold text-white tracking-wide">
//               {loading || !data
//                 ? "OT BOARD"
//                 : data.theatre_info.room_name.toUpperCase()}
//             </h1>
//           </div>

//           {/* Right: Date/Time + Controls */}
//           <div className="flex items-center gap-4">
//             <LiveClock />
//             <div className="flex items-center gap-1 border-l border-slate-700 pl-4">
//               <button
//                 onClick={toggleFullscreen}
//                 className="p-1.5 text-slate-400 hover:text-white rounded"
//               >
//                 {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
//               </button>
//               <button
//                 onClick={onClose}
//                 className="p-1.5 text-slate-400 hover:text-red-400 rounded"
//               >
//                 <X size={20} />
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* ── LOADING / ERROR ─────────────────────────────────────────────────── */}
//         {loading && (
//           <div className="flex-1 flex items-center justify-center gap-4 bg-black">
//             <Loader2 size={40} className="animate-spin text-[#0ea5e9]" />
//             <span className="text-white font-bold text-xl tracking-wider">
//               LOADING THEATRE BOARD...
//             </span>
//           </div>
//         )}

//         {!loading && error && (
//           <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-black">
//             <AlertTriangle size={60} className="text-red-500" />
//             <p className="text-white font-bold text-2xl">BOARD UNAVAILABLE</p>
//             <p className="text-slate-400 text-lg">{error}</p>
//           </div>
//         )}

//         {/* ── BOARD CONTENT ───────────────────────────────────────────────────── */}
//         {!loading && data && (
//           <div className="flex-1 flex flex-col overflow-hidden bg-black p-1 gap-1">
//             {/* ── PATIENT & PROCEDURE BARS ─────────────────────────────────── */}
//             <div className="flex flex-col border border-[#1a4a82]">
//               {/* Patient Info Row */}
//               <div className="flex items-center justify-center gap-6 py-2 border-b border-[#1a4a82] bg-[#020813]">
//                 <InfoPill label="PATIENT ID" value={data.patient.id} valueClass="text-[#38bdf8]" />
//                 <span className="text-slate-500 text-lg">|</span>
//                 <InfoPill label="AGE" value={String(data.patient.age)} />
//                 <span className="text-slate-500 text-lg">|</span>
//                 <InfoPill label="SEX" value={data.patient.sex} />
//                 <span className="text-slate-500 text-lg">|</span>
//                 <InfoPill
//                   label="ALLERGY"
//                   value={data.patient.allergy}
//                   valueClass={
//                     data.patient.allergy === "NKDA"
//                       ? "text-[#4ade80]"
//                       : "text-red-400"
//                   }
//                 />
//               </div>

//               {/* Procedure Row */}
//               <div className="flex items-center justify-center gap-3 py-2 border-b border-[#1a4a82] bg-[#020813]">
//                 <span className="text-base font-bold text-white uppercase tracking-wider">
//                   PROCEDURE:
//                 </span>
//                 <span className="text-xl font-bold text-[#38bdf8] uppercase tracking-wide">
//                   {data.procedure}
//                 </span>
//               </div>

//               {/* Team Row */}
//               <div className="flex items-stretch py-1.5 bg-[#020813]">
//                 <TeamCol role="SURGEON" name={data.team.surgeon} iconColor="text-[#38bdf8]" />
//                 <TeamCol role="ASSIST. SURGEON" name={data.team.assist_surgeon} iconColor="text-[#38bdf8]" />
//                 <TeamCol role="ANAESTHETIST" name={data.team.anaesthetist} iconColor="text-[#38bdf8]" />
//                 <TeamCol role="SCRUB NURSE" name={data.team.scrub_nurse} iconColor="text-[#c084fc]" />
//                 <TeamCol role="CIRCULATOR" name={data.team.circulator} iconColor="text-[#c084fc]" />
//               </div>
//             </div>

//             {/* ── IMAGE PANELS ─────────────────────────────────────────────── */}
//             <div className="flex h-[35vh] gap-1">
//               <div className="flex-1 flex flex-col border border-[#1a4a82] bg-[#020813]">
//                 <div className="py-1.5 text-center border-b border-[#1a4a82] bg-[#042a59]">
//                   <span className="text-[13px] font-bold text-white uppercase tracking-wider">
//                     LIVE SURGICAL VIEW
//                   </span>
//                 </div>
//                 <div className="flex-1 flex items-center justify-center text-slate-700">
//                   <MonitorPlay size={64} className="opacity-20" />
//                 </div>
//               </div>
//               <div className="flex-1 flex flex-col border border-[#1a4a82] bg-[#020813]">
//                 <div className="py-1.5 text-center border-b border-[#1a4a82] bg-[#042a59]">
//                   <span className="text-[13px] font-bold text-white uppercase tracking-wider">
//                     CT / PACS / IMAGE VIEW
//                   </span>
//                 </div>
//                 <PacsCarousel images={data.radiology_images || []} />
//               </div>
//             </div>

//             {/* ── BOTTOM 3-COLUMN SECTION ───────────────────────────────────── */}
//             <div className="flex flex-1 gap-1 min-h-0">
//               {/* ── COL 1: WHO CHECKLIST + TIMERS ── */}
//               <div className="w-[300px] shrink-0 flex flex-col gap-1 border border-[#1a4a82] bg-[#020813]">
//                 {/* WHO Checklist */}
//                 <div className="flex flex-col">
//                   <SectionHeader label="WHO CHECKLIST" />
//                   <div className="px-5 py-4 space-y-4">
//                     <CheckRow label="Sign In" done={data.checklists.sign_in.status} time={data.checklists.sign_in.time} />
//                     <CheckRow label="Time Out" done={data.checklists.time_out.status} time={data.checklists.time_out.time} />
//                     <CheckRow label="Sign Out" done={data.checklists.sign_out.status} time={data.checklists.sign_out.time} />
//                   </div>
//                 </div>
//                 <div className="flex-1" />
//                 {/* Timers */}
//                 <div className="flex flex-col">
//                   <SectionHeader label="TIMERS" />
//                   <div className="px-5 py-4 space-y-4">
//                     <TimerRow label="Anaes Start:" value={data.timers.anaes_start} />
//                     <TimerRow label="Knife to Skin:" value={data.timers.knife_to_skin} />
//                     <TimerRow label="Elapsed Time:" value={data.timers.elapsed_time} highlight />
//                   </div>
//                 </div>
//               </div>

//               {/* ── COL 2: SWAB COUNT ── */}
//               <div className="flex-[2] flex flex-col border border-[#1a4a82] bg-[#020813] min-w-0">
//                 <SectionHeader
//                   label="DIGITAL SWAB / INSTRUMENT COUNT"
//                   action={
//                     editingCounts ? (
//                       <div className="flex items-center gap-2">
//                         <button
//                           onClick={cancelEditingCounts}
//                           disabled={savingCounts}
//                           className="px-3 py-1 rounded-lg text-xs font-bold text-slate-300 hover:text-white border border-[#1a4a82] hover:bg-[#0a2a52] transition-colors disabled:opacity-50"
//                         >
//                           Cancel
//                         </button>
//                         <button
//                           onClick={saveCounts}
//                           disabled={savingCounts}
//                           className="px-3 py-1 rounded-lg text-xs font-bold text-[#020813] bg-[#4ade80] hover:bg-[#3fce70] transition-colors disabled:opacity-50 flex items-center gap-1.5"
//                         >
//                           {savingCounts && <Loader2 size={12} className="animate-spin" />}
//                           Save Counts
//                         </button>
//                       </div>
//                     ) : (
//                       <button
//                         onClick={startEditingCounts}
//                         className="px-3 py-1 rounded-lg text-xs font-bold text-white border border-[#1a4a82] hover:bg-[#0a2a52] transition-colors"
//                       >
//                         Edit
//                       </button>
//                     )
//                   }
//                 />

//                 <div className="flex-1 overflow-y-auto">
//                   <table className="w-full text-left">
//                     <thead className="bg-[#020813] sticky top-0 border-b border-[#1a4a82]">
//                       <tr>
//                         <th className="py-2.5 px-4 text-sm font-bold text-white w-1/2 border-r border-[#1a4a82]">ITEM</th>
//                         <th className="py-2.5 px-4 text-sm font-bold text-white text-center border-r border-[#1a4a82]">IN</th>
//                         <th className="py-2.5 px-4 text-sm font-bold text-white text-center border-r border-[#1a4a82]">OUT</th>
//                         <th className="py-2.5 px-4 text-sm font-bold text-white text-center">STATUS</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {(editingCounts && draftCounts ? draftCounts : data.counts).map((row, i) => (
//                         <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-900/50">
//                           <td className="py-2.5 px-4 text-base font-normal text-white border-r border-[#1a4a82] flex items-center gap-2">
//                             <span className="text-slate-500 text-xs">▤</span> {row.item}
//                           </td>
//                           <td className="py-2.5 px-4 text-lg font-normal text-white text-center border-r border-[#1a4a82]">
//                             {editingCounts ? (
//                               <input
//                                 type="number"
//                                 min={0}
//                                 value={row.in}
//                                 onChange={(e) => updateDraftCount(i, "in", parseInt(e.target.value) || 0)}
//                                 className="w-16 bg-[#0a2a52] border border-[#1a4a82] rounded-md text-center text-white text-base outline-none focus:border-[#4ade80]"
//                               />
//                             ) : (
//                               row.in
//                             )}
//                           </td>
//                           <td className="py-2.5 px-4 text-lg font-normal text-white text-center border-r border-[#1a4a82]">
//                             {editingCounts ? (
//                               <input
//                                 type="number"
//                                 min={0}
//                                 value={row.out}
//                                 onChange={(e) => updateDraftCount(i, "out", parseInt(e.target.value) || 0)}
//                                 className="w-16 bg-[#0a2a52] border border-[#1a4a82] rounded-md text-center text-white text-base outline-none focus:border-[#4ade80]"
//                               />
//                             ) : (
//                               row.out
//                             )}
//                           </td>
//                           <td className="py-2.5 px-4 text-center">
//                             {editingCounts ? (
//                               <button
//                                 onClick={() => removeDraftItem(i)}
//                                 title="Remove item"
//                                 className="p-1.5 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
//                               >
//                                 <Trash2 size={16} />
//                               </button>
//                             ) : "status" in row ? (
//                               <span className={`inline-flex items-center gap-1.5 text-sm font-bold ${(row as any).status === "MATCHED" ? "text-[#4ade80]" : "text-red-500"}`}>
//                                 <div className="w-4 h-4 rounded-full bg-[#4ade80]/20 flex items-center justify-center">
//                                   <Check size={12} strokeWidth={4} />
//                                 </div>
//                                 {(row as any).status}
//                               </span>
//                             ) : (
//                               <span className="text-slate-500 text-xs">—</span>
//                             )}
//                           </td>
//                         </tr>
//                       ))}
//                       {editingCounts && (
//                         <tr className="border-b border-slate-800/50 bg-[#020813]">
//                           <td className="py-2 px-4 border-r border-[#1a4a82]">
//                             <input
//                               type="text"
//                               value={newItemName}
//                               onChange={(e) => setNewItemName(e.target.value)}
//                               onKeyDown={(e) => {
//                                 if (e.key === "Enter") {
//                                   e.preventDefault();
//                                   addDraftItem();
//                                 }
//                               }}
//                               placeholder="New item name..."
//                               className="w-full bg-[#0a2a52] border border-[#1a4a82] rounded-md px-2 py-1.5 text-sm text-white outline-none focus:border-[#4ade80] placeholder:text-slate-500"
//                             />
//                           </td>
//                           <td className="border-r border-[#1a4a82]" />
//                           <td className="border-r border-[#1a4a82]" />
//                           <td className="py-2 px-4 text-center">
//                             <button
//                               onClick={addDraftItem}
//                               disabled={!newItemName.trim()}
//                               title="Add item"
//                               className="p-1.5 rounded-md text-[#4ade80] hover:bg-[#4ade80]/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
//                             >
//                               <Plus size={16} />
//                             </button>
//                           </td>
//                         </tr>
//                       )}
//                     </tbody>
//                   </table>
//                 </div>

//                 {/* Specimen Row */}
//                 <div className="px-4 py-3 border-t border-[#1a4a82] flex items-center gap-6">
//                   <div className="flex items-center gap-2">
//                     <div className="w-4 h-4 border-2 border-white rounded-sm flex items-center justify-center">
//                       <Check size={12} className="text-white" strokeWidth={4} />
//                     </div>
//                     <span className="text-sm font-bold text-white uppercase">SPECIMEN(S):</span>
//                   </div>
                  
//                   <div className="flex items-center gap-2">
//                     <div className={`w-4 h-4 border-2 rounded-sm flex items-center justify-center ${data.specimen.collected ? "border-[#4ade80]" : "border-slate-500"}`}>
//                       {data.specimen.collected && <Check size={12} className="text-[#4ade80]" strokeWidth={4} />}
//                     </div>
//                     <span className="text-sm text-white">Collected</span>
//                   </div>

//                   <span className="text-sm text-white">
//                     Type: <span className="text-white">{data.specimen.type || "—"}</span>
//                   </span>

//                   <span className="text-sm text-white">
//                     Sent: <span className={data.specimen.sent ? "text-[#4ade80]" : "text-red-500"}>{data.specimen.sent ? "YES" : "NO"}</span>
//                   </span>
//                 </div>
//               </div>

//               {/* ── COL 3: BLOOD LOSS + NEXT CASE ── */}
//               <div className="w-[320px] shrink-0 flex flex-col gap-1 border border-[#1a4a82] bg-[#020813]">
//                 <div className="flex flex-col flex-1 min-h-0 border-b border-[#1a4a82]">
//                   <SectionHeader label="BLOOD LOSS" />
//                   <div className="px-5 py-3 flex flex-col gap-3 overflow-y-auto">
//                     <div className="space-y-2">
//                       <div className="flex justify-between">
//                         <span className="text-white text-base">Swabs:</span>
//                         <span className="text-white text-base font-normal">
//                           {(data.blood_loss as any).swabs_ml !== undefined ? `${(data.blood_loss as any).swabs_ml} ml` : "—"}
//                         </span>
//                       </div>
//                       <div className="flex justify-between">
//                         <span className="text-white text-base">Suction:</span>
//                         <span className="text-white text-base font-normal">
//                           {(data.blood_loss as any).suction_ml !== undefined ? `${(data.blood_loss as any).suction_ml} ml` : "—"}
//                         </span>
//                       </div>
//                       <div className="flex justify-between">
//                         <span className="text-white text-base">Irrigation:</span>
//                         <span className="text-white text-base font-normal">
//                           {(data.blood_loss as any).irrigation_ml !== undefined ? `${(data.blood_loss as any).irrigation_ml} ml` : "—"}
//                         </span>
//                       </div>
//                     </div>
                    
//                     <div className="mt-auto pt-3 border-t border-[#1a4a82] text-center">
//                       <p className="text-[11px] font-bold text-[#facc15] uppercase tracking-wide mb-1 leading-tight">
//                         ESTIMATED TOTAL BLOOD LOSS:
//                       </p>
//                       <p className="text-4xl font-bold text-[#facc15] whitespace-nowrap">
//                         {data.blood_loss?.estimated_total_ml ?? 0} <span className="text-2xl">ml</span>
//                       </p>
//                     </div>
//                   </div>
//                 </div>

//                 <div className="flex flex-col shrink-0 min-h-[120px]">
//                   <SectionHeader label="NEXT CASE" />
//                   <div className="px-5 py-4 flex flex-col items-center justify-center text-center h-full">
//                     <p className="text-xl font-bold text-[#facc15] leading-tight mb-4">
//                       {data.next_case?.procedure || "—"}
//                     </p>
//                     {data.next_case?.status && (
//                       <div className="flex items-center gap-2">
//                         <div className={`w-3.5 h-3.5 rounded-full ${data.next_case.status === "SCHEDULED" ? "bg-[#4ade80]" : "bg-[#facc15]"}`} />
//                         <span className="text-base font-bold text-[#4ade80] uppercase tracking-widest">
//                           {data.next_case.status === "SCHEDULED" ? "READY" : data.next_case.status}
//                         </span>
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* ── FOOTER STATUS BAR ─────────────────────────────────────────── */}
//             <div className="flex items-center justify-center gap-6 py-2 shrink-0 border border-[#1a4a82] bg-black">
//               {allMatched ? (
//                 <>
//                   <div className="flex items-center gap-2">
//                     <div className="w-5 h-5 rounded-full bg-[#4ade80] flex items-center justify-center">
//                       <Check size={14} className="text-black" strokeWidth={4} />
//                     </div>
//                     <span className="text-base font-bold text-[#4ade80] uppercase tracking-wider">
//                       COUNTS MATCHED
//                     </span>
//                   </div>
//                   <span className="text-slate-500 text-xl">|</span>
//                   <span className="text-base font-bold text-[#4ade80] uppercase tracking-wider">
//                     SAFE TO PROCEED TO SIGN OUT
//                   </span>
//                 </>
//               ) : (
//                 <>
//                   <div className="flex items-center gap-2">
//                     <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
//                       <AlertTriangle size={14} className="text-black" strokeWidth={3} />
//                     </div>
//                     <span className="text-base font-bold text-red-500 uppercase tracking-wider">
//                       COUNT MISMATCH
//                     </span>
//                   </div>
//                   <span className="text-slate-500 text-xl">|</span>
//                   <span className="text-base font-bold text-red-500 uppercase tracking-wider">
//                     DO NOT PROCEED
//                   </span>
//                 </>
//               )}
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// // ─── Small Helpers ─────────────────────────────────────────────────────────────

// const InfoPill: React.FC<{
//   label: string;
//   value: string;
//   valueClass?: string;
// }> = ({ label, value, valueClass = "text-white" }) => (
//   <div className="flex items-center gap-2">
//     <span className="text-base font-bold text-white uppercase tracking-wider">
//       {label}:
//     </span>
//     <span className={`text-xl font-normal ${valueClass}`}>{value}</span>
//   </div>
// );

// const SectionHeader: React.FC<{ label: string; action?: React.ReactNode }> = ({ label, action }) => (
//   <div className="py-1.5 px-4 flex items-center bg-[#042a59] border-b border-[#1a4a82]">
//     <span className="flex-1 text-sm font-bold text-white uppercase tracking-wider text-center">
//       {label}
//     </span>
//     {action}
//   </div>
// );

// const CheckRow: React.FC<{
//   label: string;
//   done: boolean;
//   time: string;
// }> = ({ label, done, time }) => (
//   <div className="flex items-center justify-between">
//     <div className="flex items-center gap-3">
//       {done ? (
//         <Check size={20} className="text-[#4ade80]" strokeWidth={4} />
//       ) : (
//         <Square size={20} className="text-white" />
//       )}
//       <span className="text-base font-normal text-white">{label}</span>
//     </div>
//     {done && time && (
//       <span className="text-base font-bold text-[#facc15]">{time}</span>
//     )}
//   </div>
// );

// const TimerRow: React.FC<{
//   label: string;
//   value: string;
//   highlight?: boolean;
// }> = ({ label, value, highlight }) => (
//   <div className="flex items-center justify-between">
//     <span className="text-base font-normal text-white">{label}</span>
//     <span className={`text-xl font-bold ${highlight ? "text-[#facc15]" : "text-[#facc15]"}`}>
//       {value || "—"}
//     </span>
//   </div>
// );

// export default OTBoardView;
