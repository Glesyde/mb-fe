
import React, { useEffect, useRef, useState } from 'react';
import { MonitorPlay, AlertTriangle, Wifi, Maximize, Tv2, Loader2 } from 'lucide-react';
import { otService, OTRoom, OTRequest, OTSurgery } from '../services/ot.service';
import OTBoardView from './OTBoardView';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CaseBlock {
  id: string;
  otCaseId: number;       // numeric surgery id for OT board API
  otCaseNumber?: string;  // e.g. "OT-2026-00021"
  patientCode: string;    // e.g. "0877"
  patientSex: string;     // e.g. "ML, 56M"
  names: string;          // e.g. "Berry / Welsh / MT / SC"
  procedure: string;      // e.g. "Thyroid"
  startTime: number;      // minutes from 07:00
  duration: number;       // minutes
  status: 'scheduled' | 'checked-in' | 'surgery-start' | 'in-progress' | 'transport' | 'anesthesia' | 'delayed' | 'pacu';
  statusLabel: string;    // e.g. "· Surgery Start"
  notes?: string;
  anesthesia?: string;
  priority?: string;
  ward?: string;
  room?: string;
  bed?: string;
  delayed?: boolean;
  allergy?: boolean;
}

interface ORRow {
  id: string;
  label: string;         // vertical room name (e.g. "Burns")
  color: string;         // tailwind bg for room tab
  cases: CaseBlock[];
}

// ─── Color Maps ───────────────────────────────────────────────────────────────
const BLOCK_COLORS: Record<string, string> = {
  'scheduled': 'bg-sky-500',
  'checked-in': 'bg-teal-500',
  'surgery-start': 'bg-green-500',
  'in-progress': 'bg-green-600',
  'transport': 'bg-amber-400',
  'anesthesia': 'bg-purple-500',
  'delayed': 'bg-orange-400',
  'pacu': 'bg-cyan-500',
};

// ─── MOCK DATA REMOVED ────────────────────────────────────────────────────────

// Ticker messages will be generated dynamically

// ─── Constants ────────────────────────────────────────────────────────────────
const START_HOUR = 0;          // 00:00
const END_HOUR = 24;           // 24:00
const TOTAL_MINS = (END_HOUR - START_HOUR) * 60;  // 1440 min
const HOUR_LABELS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => {
  const h = START_HOUR + i;
  return h.toString().padStart(2, '0') + '00';
});

// pixels per minute (for the timeline width)
const PX_PER_MIN = 3;  // 1 minute = 3px → total width = 2340px
const LABEL_W = 160; // px for the left OR label column

// ─── Helpers ──────────────────────────────────────────────────────────────────
function nowOffset(): number {
  // Current time as minutes from START_HOUR
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins - START_HOUR * 60;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
const CaseBlockEl: React.FC<{ block: CaseBlock; rowHeight: number; onOpenBoard: (block: CaseBlock) => void }> = ({ block, rowHeight, onOpenBoard }) => {
  const [hovered, setHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const left = Math.max(0, block.startTime * PX_PER_MIN);
  const originalWidth = Math.max(20, block.duration * PX_PER_MIN);
  const maxAllowedWidth = Math.max(20, (TOTAL_MINS * PX_PER_MIN) - left);
  const width = Math.min(originalWidth, maxAllowedWidth);
  const color = BLOCK_COLORS[block.status] ?? 'bg-slate-500';

  return (
    <>
      <div
        className={`absolute ${color} rounded text-white text-[10px] leading-tight px-2 py-1.5 overflow-hidden cursor-pointer transition-all duration-150 shadow-md select-none flex flex-col justify-center animate-in zoom-in-95 fade-in ${block.status === 'in-progress' || block.status === 'surgery-start' ? 'animate-pulse' : ''} ${isExpanded ? 'ring-2 ring-white z-50 scale-105' : 'z-10'}`}
        style={{ left, width, top: '50%', transform: 'translateY(-50%)', height: 'calc(100% - 16px)', maxHeight: 120, animationDelay: '300ms', animationFillMode: 'both' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Header row */}
        <div className="flex flex-col gap-0.5 mb-1 shrink-0">
          <span className="font-black leading-none break-words whitespace-normal line-clamp-2">{block.names}</span>
          <span className="font-bold opacity-90 text-[8px] shrink-0 bg-white/20 self-start px-1 rounded-sm uppercase tracking-tighter">{block.statusLabel}</span>
        </div>

        {/* Procedure */}
        <div className="font-semibold opacity-95 break-words whitespace-normal leading-tight line-clamp-3 mb-1">{block.procedure}</div>

        {/* Footer */}
        <div className="flex flex-wrap items-center gap-1.5 mt-auto opacity-80 text-[9px]">
          <span className="font-bold">{block.patientCode}</span>
          <span>{block.patientSex}</span>
          {block.allergy && (
            <span className="inline-flex items-center gap-0.5 bg-white/25 rounded px-1">
              <AlertTriangle size={8} /> Allergy
            </span>
          )}
          {block.delayed && (
            <span className="ml-auto font-black tracking-wide bg-red-600 rounded px-1">DELAYED</span>
          )}
        </div>

        {/* Hover/Expand glow */}
        {(hovered || isExpanded) && (
          <div className="absolute inset-0 bg-white/10 rounded pointer-events-none" />
        )}
      </div>

      {/* Expanded Detail Card */}
      {isExpanded && (
        <div 
          className="absolute z-[100] bg-white border border-slate-200 rounded-lg shadow-2xl p-4 w-72 animate-in zoom-in-90 fade-in slide-in-from-top-2 duration-200"
          style={{ 
            left: left + width + 12 > (TOTAL_MINS * PX_PER_MIN) ? left - 300 : left + width + 12,
            top: '50%',
            transform: 'translateY(-50%)'
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-black text-slate-800 text-xs uppercase tracking-tight">Case Details</h4>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
              className="text-slate-400 hover:text-slate-600 text-lg"
            >&times;</button>
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Procedure</div>
              <div className="text-xs font-bold text-slate-700">{block.procedure}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Patient</div>
                <div className="text-xs font-bold text-slate-700">{block.patientCode} ({block.patientSex})</div>
              </div>
              <div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Status</div>
                <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded inline-block text-white ${color}`}>{block.status.toUpperCase()}</div>
              </div>
            </div>

            <div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Staff</div>
              <div className="text-xs font-medium text-slate-600">{block.names}</div>
            </div>

            {(block.priority || block.anesthesia) && (
              <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-2">
                {block.priority && (
                  <div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Priority</div>
                    <div className="text-xs font-black text-rose-600">{block.priority}</div>
                  </div>
                )}
                {block.anesthesia && (
                  <div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Anesthesia</div>
                    <div className="text-xs text-slate-600">{block.anesthesia}</div>
                  </div>
                )}
              </div>
            )}

            {block.notes && (
              <div className="border-t border-slate-100 pt-2">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Notes</div>
                <div className="text-[10px] text-slate-500 italic leading-relaxed">{block.notes}</div>
              </div>
            )}

            <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-[9px] font-bold text-slate-400">
              <span>{block.ward} · {block.room}</span>
              <span>{block.duration} MINS</span>
            </div>

            {/* Open OT Board Button */}
            <button
              onClick={(e) => { e.stopPropagation(); setIsExpanded(false); onOpenBoard(block); }}
              className="mt-3 w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-blue-700 text-white text-[11px] font-black uppercase tracking-widest py-2 rounded-lg transition-all border border-slate-700 hover:border-blue-600 active:scale-95"
            >
              <Tv2 size={13} />
              Open OT Board
            </button>
          </div>
        </div>
      )}
    </>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const LiveStatusBoard: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const tickerRef = useRef<HTMLDivElement>(null);
  const tickerAnim = useRef<number>();
  const ROW_HEIGHT = 90; // px per OR row

  const [boardData, setBoardData] = useState<any>(null);
  const [liveRooms, setLiveRooms] = useState<ORRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentMins, setCurrentMins] = useState(nowOffset());
  const [boardCase, setBoardCase] = useState<{ id: number; caseNumber?: string } | null>(null);
  
  // Hover state to pause auto-scrolling
  const isHovering = useRef(false);
  const scrollDirection = useRef<'right'|'left'>('right');
  const hoverTimeout = useRef<NodeJS.Timeout>();

  const handleInteract = () => {
    isHovering.current = true;
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => {
      isHovering.current = false;
    }, 2000);
  };

  // Update current time line every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMins(nowOffset());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      if (!boardData) setLoading(true);
      const data = await otService.getBoard();
      setBoardData(data);
    } catch (err) {
      console.error('Failed to fetch live board data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!boardData || !boardData.rooms) return;

    const mappedRooms: ORRow[] = boardData.rooms.map((room: any, idx: number) => {
      const cases: CaseBlock[] = room.cases.map((surgery: any) => {
        let startMins = 0;
        const timeStr = surgery.scheduled_time || surgery.start_time || "07:00:00";
        if (timeStr) {
          const [hours, minutes] = timeStr.split(':').map(Number);
          startMins = (hours * 60 + minutes) - (START_HOUR * 60);
          if (startMins < 0) startMins = 0;
        }

        const duration = surgery.estimated_duration_min || 60;

        let statusId: CaseBlock['status'] = 'scheduled';
        if (surgery.status === 'CHECKED_IN') statusId = 'checked-in';
        else if (surgery.status === 'IN_PROGRESS') statusId = 'surgery-start';
        else if (surgery.status === 'COMPLETED') statusId = 'pacu';
        else if (surgery.status === 'CANCELLED') statusId = 'delayed';

        const surgeonName = surgery.surgeon_id ? "Surgeon" : "";
        const surgeryCreator = `${surgery.creator_first_name || ''} ${surgery.creator_last_name || ''}`.trim();
        const names = surgeonName || surgeryCreator || "Pending Staff";

        const patientSex = surgery.gender === 'Male' ? 'M' : surgery.gender === 'Female' ? 'F' : 'U';
        const age = surgery.age || 'Unknown';

        return {
          id: surgery.id.toString(),
          otCaseId: surgery.id,
          otCaseNumber: surgery.ot_case_number,
          patientCode: surgery.mrn ? surgery.mrn : '',
          patientSex: `${patientSex}, ${age}`,
          names: names,
          procedure: surgery.surgery_name,
          startTime: startMins,
          duration: duration,
          status: statusId,
          statusLabel: `· ${surgery.ot_status_label || surgery.status.replace('_', ' ')}`,
          notes: surgery.request_notes,
          anesthesia: surgery.anesthesia_type,
          priority: surgery.priority,
          ward: "",
          room: surgery.room_name,
          bed: "",
        };
      });

      return {
        id: `OR-${idx + 1}`,
        label: room.room_name,
        color: ['bg-slate-600', 'bg-rose-600', 'bg-indigo-600', 'bg-teal-600'][idx % 4],
        cases: cases
      };
    });
    setLiveRooms(mappedRooms);
  }, [boardData]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Current-time offset in px
  const nowPx = Math.max(0, Math.min(currentMins * PX_PER_MIN, TOTAL_MINS * PX_PER_MIN));

  const allCases = boardData?.rooms?.flatMap((r: any) => r.cases) || [];
  const tickerEvents = allCases.length > 0
    ? allCases.slice(0, 10).map((s: any) => ({
      color: BLOCK_COLORS[
        s.status === 'CHECKED_IN' ? 'checked-in' :
          s.status === 'IN_PROGRESS' ? 'surgery-start' :
            s.status === 'COMPLETED' ? 'pacu' :
              s.status === 'CANCELLED' ? 'delayed' : 'scheduled'
      ] || 'bg-brand-active0',
      text: `${s.creator_first_name || 'Staff'} ${s.creator_last_name || ''} — ${s.ot_status_label || s.status.replace('_', ' ')} · Room: ${s.room_name} · Case ${s.ot_case_number || s.id}`
    }))
    : [{ color: 'bg-slate-400', text: 'Awaiting updates... Live Theatre Status Board connected.' }];

  // Ensure ticker is long enough to scroll properly
  const displayTickerEvents = [...tickerEvents, ...tickerEvents, ...tickerEvents, ...tickerEvents];

  // Ticker scroll animation
  useEffect(() => {
    let x = 0;
    const speed = 0.5; // px per frame
    const animate = () => {
      if (tickerRef.current) {
        // Since we quadrupled the items, we can reset halfway to make it seamless
        const totalW = tickerRef.current.scrollWidth / 2;
        x -= speed;
        if (Math.abs(x) >= totalW) x = 0;
        tickerRef.current.style.transform = `translateX(${x}px)`;
      }
      tickerAnim.current = requestAnimationFrame(animate);
    };
    tickerAnim.current = requestAnimationFrame(animate);
    return () => { if (tickerAnim.current) cancelAnimationFrame(tickerAnim.current); };
  }, [tickerEvents.length]);

  // Ping-Pong Auto-scroll animation for the Gantt Board
  useEffect(() => {
    let animFrame: number;
    let lastTime = performance.now();
    
    // Jump to current time immediately on mount
    if (boardRef.current) {
      boardRef.current.scrollLeft = Math.max(0, LABEL_W + nowPx - boardRef.current.clientWidth / 2);
    }

    const animateScroll = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;

      if (boardRef.current && !isHovering.current && !boardCase) {
        const board = boardRef.current;
        const maxScroll = board.scrollWidth - board.clientWidth;
        
        if (maxScroll > 0) {
          // speed: 80 pixels per second
          const step = (80 * delta) / 1000;
          
          if (scrollDirection.current === 'right') {
            board.scrollLeft += step;
            if (board.scrollLeft >= maxScroll - 1) {
              scrollDirection.current = 'left';
            }
          } else {
            board.scrollLeft -= step;
            if (board.scrollLeft <= 1) {
              scrollDirection.current = 'right';
            }
          }
        }
      }
      animFrame = requestAnimationFrame(animateScroll);
    };

    animFrame = requestAnimationFrame(animateScroll);
    return () => cancelAnimationFrame(animFrame);
  }, [nowPx, boardCase]);

  return (
    <div ref={containerRef} className="flex flex-col flex-1 h-full min-h-[800px] w-full bg-white animate-in fade-in duration-500">

      {/* ── Header Bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2">
          <MonitorPlay size={18} className="text-rose-600" />
          <span className="font-black text-slate-800 text-sm tracking-tight">Live Theatre Status Board</span>
          <span className="ml-2 w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1 hover:text-slate-600 transition-colors"
          >
            <Maximize size={12} /> {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
          <span className="flex items-center gap-1"><Wifi size={11} className="text-green-500" /> Connected</span>
          <span>Today · {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-2 bg-slate-50 border-b border-slate-200 shrink-0">
        {[
          { label: 'Scheduled', color: 'bg-sky-500' },
          { label: 'Checked-In', color: 'bg-teal-500' },
          { label: 'Surgery Start', color: 'bg-green-500' },
          { label: 'Anesthesia', color: 'bg-purple-500' },
          { label: 'Transport', color: 'bg-amber-400' },
          { label: 'Delayed', color: 'bg-orange-400' },
          { label: 'PACU', color: 'bg-cyan-500' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-sm ${color} shrink-0`} />
            <span className="text-[10px] font-bold text-slate-500">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Main Gantt Grid ─────────────────────────────────────────────────── */}
      <div
        ref={boardRef}
        className="flex-1 overflow-x-auto overflow-y-auto bg-white relative flex flex-col"
        style={{ minHeight: 0 }}
        onMouseMove={handleInteract}
        onTouchMove={handleInteract}
        onClick={handleInteract}
        onWheel={handleInteract}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center flex-1 h-full min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
            <p className="mt-4 text-xs font-bold tracking-wider text-slate-500 uppercase">Loading Live Board...</p>
          </div>
        ) : (
          <div
            className="flex-1 flex flex-col min-h-full"
            style={{
              width: LABEL_W + TOTAL_MINS * PX_PER_MIN,
              minWidth: '100%',
              position: 'relative'
            }}
          >

          {/* ── Time Header ────────────────────────────────────────────────── */}
          <div className="flex sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm shrink-0">
            {/* Corner spacer */}
            <div
              className="shrink-0 border-r border-slate-200 bg-white"
              style={{ width: LABEL_W }}
            />
            {/* Hour labels */}
            <div className="relative flex-1">
              {HOUR_LABELS.map((label, i) => (
                <div
                  key={label}
                  className="absolute top-0 bottom-0 flex items-center justify-start pl-1"
                  style={{ left: i * 60 * PX_PER_MIN, width: 60 * PX_PER_MIN }}
                >
                  <span className="text-[10px] font-black text-slate-400 tracking-wider">{label}</span>
                </div>
              ))}
              <div style={{ height: 28 }} />
            </div>
          </div>

          {/* ── OR Rows ────────────────────────────────────────────────────── */}
          {liveRooms.map((room, rIdx) => (
            <div
              key={room.id}
              className="flex border-b border-slate-100 group flex-1 animate-in slide-in-from-bottom-4 fade-in min-h-[120px]"
              style={{ animationDelay: `${rIdx * 100}ms`, animationFillMode: 'both', animationDuration: '600ms' }}
            >
              {/* Left Label */}
              <div
                className="shrink-0 border-r border-slate-200 flex flex-col items-center justify-center gap-1 bg-slate-50 sticky left-0 z-20"
                style={{ width: LABEL_W }}
              >
                <span className="text-xs font-black text-slate-700">{room.id}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{room.label}</span>
              </div>

              {/* Timeline Canvas */}
              <div className="relative flex-1">
                {/* Hour grid lines */}
                {HOUR_LABELS.map((_, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 border-l border-slate-100"
                    style={{ left: i * 60 * PX_PER_MIN }}
                  />
                ))}

                {/* Case Blocks */}
                {room.cases.map(block => (
                  <CaseBlockEl
                    key={block.id}
                    block={block}
                    rowHeight={ROW_HEIGHT}
                    onOpenBoard={(b) => setBoardCase({ id: b.otCaseId, caseNumber: b.otCaseNumber })}
                  />
                ))}
              </div>

              {/* Right Room Tab (vertical label) */}
              <div
                className={`shrink-0 ${room.color} flex items-center justify-center sticky right-0 z-20`}
                style={{ width: 24 }}
              >
                <span
                  className="text-white text-[9px] font-black tracking-widest uppercase"
                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                >
                  {room.label}
                </span>
              </div>
            </div>
          ))}

          {/* ── Current Time Line ──────────────────────────────────────────── */}
          <div
            className="absolute top-0 bottom-0 z-40 pointer-events-none"
            style={{ left: LABEL_W + nowPx, width: 2 }}
          >
            <div className="w-full h-full bg-red-500 opacity-80" />
            <div
              className="absolute -top-1 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[8px] font-black px-1 rounded whitespace-nowrap"
            >
              NOW
            </div>
          </div>

        </div>
        )}
      </div>

      {/* ── Activity Ticker ─────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-slate-900 overflow-hidden h-8 flex items-center relative">
        <div
          ref={tickerRef}
          className="flex items-center gap-0 whitespace-nowrap will-change-transform"
          style={{ display: 'inline-flex' }}
        >
          {displayTickerEvents.map((evt, i) => (
            <div key={i} className="flex items-center shrink-0">
              <span className={`w-2 h-2 rounded-full ${evt.color} mx-3 shrink-0`} />
              <span className="text-[10px] font-bold text-slate-200 mr-8">{evt.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── OT Board Full View ────────────────────────────────────────────── */}
      {boardCase && (
        <OTBoardView
          otCaseId={boardCase.id}
          caseNumber={boardCase.caseNumber}
          onClose={() => setBoardCase(null)}
        />
      )}
    </div>
  );
};

export default LiveStatusBoard;
