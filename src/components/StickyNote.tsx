import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  StickyNote as StickyNoteIcon,
  X,
  Minus,
  Plus,
  Trash2,
  GripVertical,
  Maximize2,
  Minimize2,
} from "lucide-react";

const STORAGE_KEY = "hims_sticky_note";
const POS_KEY = "hims_sticky_note_pos";
const SIZE_KEY = "hims_sticky_note_size";

const DEFAULT_SIZE = { w: 300, h: 260 };
const EXPANDED_SIZE = { w: 520, h: 420 };
const MIN_W = 240;
const MIN_H = 160;

const StickyNote: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [text, setText] = useState(() => localStorage.getItem(STORAGE_KEY) || "");
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem(POS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { x: window.innerWidth - 340, y: window.innerHeight - 380 };
  });
  const [size, setSize] = useState<{ w: number; h: number }>(() => {
    try {
      const saved = localStorage.getItem(SIZE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_SIZE;
  });

  const dragging = useRef(false);
  const resizing = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const noteRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Persist
  useEffect(() => { localStorage.setItem(STORAGE_KEY, text); }, [text]);
  useEffect(() => { localStorage.setItem(POS_KEY, JSON.stringify(position)); }, [position]);
  useEffect(() => { localStorage.setItem(SIZE_KEY, JSON.stringify(size)); }, [size]);

  // Focus on open
  useEffect(() => {
    if (isOpen && !isMinimized && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  // --- Dragging ---
  const handleDragMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragging.current = true;
    dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  }, [position]);

  // --- Resizing ---
  const handleResizeMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    resizing.current = true;
    resizeStart.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h };
  }, [size]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (dragging.current) {
        const noteW = noteRef.current?.offsetWidth || size.w;
        const noteH = noteRef.current?.offsetHeight || 60;
        const newX = Math.max(0, Math.min(window.innerWidth - noteW, e.clientX - dragOffset.current.x));
        const newY = Math.max(0, Math.min(window.innerHeight - noteH, e.clientY - dragOffset.current.y));
        setPosition({ x: newX, y: newY });
      }
      if (resizing.current) {
        const dx = e.clientX - resizeStart.current.x;
        const dy = e.clientY - resizeStart.current.y;
        setSize({
          w: Math.max(MIN_W, resizeStart.current.w + dx),
          h: Math.max(MIN_H, resizeStart.current.h + dy),
        });
        setIsExpanded(false);
      }
    };
    const onMouseUp = () => {
      dragging.current = false;
      resizing.current = false;
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [size.w, size.h]);

  const toggleExpand = () => {
    if (isExpanded) {
      setSize(DEFAULT_SIZE);
      setIsExpanded(false);
    } else {
      setSize(EXPANDED_SIZE);
      setIsExpanded(true);
      // nudge back on screen if needed
      setPosition((pos) => ({
        x: Math.min(pos.x, window.innerWidth - EXPANDED_SIZE.w - 8),
        y: Math.min(pos.y, window.innerHeight - EXPANDED_SIZE.h - 8),
      }));
    }
  };

  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          title="Open Quick Notes"
          style={{ width: 52, height: 52 }}
          className="fixed z-[9998] bottom-6 right-6 flex items-center justify-center bg-amber-400 hover:bg-amber-500 text-white rounded-2xl shadow-xl shadow-amber-200/70 transition-all duration-200 hover:scale-110 active:scale-95"
        >
          <StickyNoteIcon size={22} />
          {text.trim() && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 rounded-full text-[8px] font-black text-white flex items-center justify-center shadow-sm">
              ✓
            </span>
          )}
        </button>
      )}

      {/* Sticky Note Panel */}
      {isOpen && (
        <div
          ref={noteRef}
          className="fixed z-[9999] flex flex-col rounded-[20px] shadow-2xl shadow-amber-200/60 border border-amber-200 overflow-hidden"
          style={{
            left: position.x,
            top: position.y,
            width: size.w,
            height: isMinimized ? "auto" : size.h,
            minWidth: MIN_W,
          }}
        >
          {/* Header / Drag Handle */}
          <div
            onMouseDown={handleDragMouseDown}
            className="flex items-center justify-between px-3 py-2.5 bg-amber-400 cursor-grab active:cursor-grabbing select-none shrink-0"
          >
            <div className="flex items-center gap-1.5">
              <GripVertical size={13} className="text-amber-700/60" />
              <StickyNoteIcon size={14} className="text-amber-800" />
              <span className="text-[10px] font-black text-amber-900 uppercase tracking-widest">
                Quick Notes
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              {/* Expand / Collapse */}
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={toggleExpand}
                className="p-1 hover:bg-amber-500 rounded-lg transition-colors text-amber-800"
                title={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
              {/* Minimize */}
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setIsMinimized((v) => !v)}
                className="p-1 hover:bg-amber-500 rounded-lg transition-colors text-amber-800"
                title={isMinimized ? "Restore" : "Minimize"}
              >
                {isMinimized ? <Plus size={13} /> : <Minus size={13} />}
              </button>
              {/* Close */}
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-amber-500 rounded-lg transition-colors text-amber-800"
                title="Close"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Body */}
          {!isMinimized && (
            <div className="flex flex-col bg-amber-50 flex-1 min-h-0">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={"Jot something down…\n\n• Patient to follow up\n• Pending results\n• Call pharmacy"}
                className="flex-1 resize-none bg-transparent px-4 py-3 text-sm text-amber-900 placeholder-amber-300 outline-none leading-relaxed font-medium min-h-0"
                style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}
              />

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2 bg-amber-100 border-t border-amber-200 shrink-0">
                <span className="text-[10px] font-bold text-amber-500">
                  {wordCount} {wordCount === 1 ? "word" : "words"} · {charCount} chars
                </span>
                <button
                  onClick={() => {
                    if (text.trim() && window.confirm("Clear all notes?")) setText("");
                  }}
                  title="Clear notes"
                  className="p-1 text-amber-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Resize Handle */}
              <div
                onMouseDown={handleResizeMouseDown}
                className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize flex items-end justify-end pr-1 pb-1 select-none"
                title="Drag to resize"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" className="text-amber-400 opacity-70">
                  <path d="M1 9L9 1M5 9L9 5M9 9L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default StickyNote;
