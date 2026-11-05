import React, { useState, useRef, useEffect, useCallback } from "react";
import { Calculator as CalcIcon, X, GripVertical, Delete } from "lucide-react";

const POS_KEY = "hims_calc_pos";

type CalcOp = "+" | "-" | "×" | "÷" | null;

const BillingCalculator: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<string | null>(null);
  const [op, setOp] = useState<CalcOp>(null);
  const [fresh, setFresh] = useState(false); // next input should replace display
  const [history, setHistory] = useState<string[]>([]);

  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem(POS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { x: Math.max(0, window.innerWidth - 310), y: 90 };
  });

  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const calcRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(POS_KEY, JSON.stringify(position));
  }, [position]);

  const handleDragMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  }, [position]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const w = calcRef.current?.offsetWidth || 280;
      const h = calcRef.current?.offsetHeight || 420;
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - w, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - h, e.clientY - dragOffset.current.y)),
      });
    };
    const onMouseUp = () => { dragging.current = false; };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const appendDigit = (d: string) => {
    if (fresh) {
      setDisplay(d === "." ? "0." : d);
      setFresh(false);
    } else {
      if (d === "." && display.includes(".")) return;
      setDisplay(display === "0" && d !== "." ? d : display + d);
    }
  };

  const handleOperator = (o: CalcOp) => {
    setPrev(display);
    setOp(o);
    setFresh(true);
  };

  const calculate = () => {
    if (!op || prev === null) return;
    const a = parseFloat(prev);
    const b = parseFloat(display);
    let result: number;
    switch (op) {
      case "+": result = a + b; break;
      case "-": result = a - b; break;
      case "×": result = a * b; break;
      case "÷": result = b !== 0 ? a / b : NaN; break;
      default: return;
    }
    const expr = `${prev} ${op} ${display} = ${isNaN(result) ? "Error" : +result.toFixed(10)}`;
    setHistory((h) => [expr, ...h.slice(0, 9)]);
    setDisplay(isNaN(result) ? "Error" : String(+result.toFixed(10)));
    setPrev(null);
    setOp(null);
    setFresh(true);
  };

  const handlePercent = () => {
    setDisplay(String(parseFloat(display) / 100));
    setFresh(true);
  };

  const handleToggleSign = () => {
    setDisplay(String(-parseFloat(display)));
  };

  const handleClear = () => {
    setDisplay("0");
    setPrev(null);
    setOp(null);
    setFresh(false);
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay("0");
    }
  };

  // Format display nicely
  const formattedDisplay = (() => {
    if (display === "Error") return "Error";
    const num = parseFloat(display);
    if (isNaN(num)) return display;
    // Show trailing dot if user is typing decimal
    const trailingDot = display.endsWith(".") ? "." : "";
    return num.toLocaleString("en-US", { maximumFractionDigits: 10 }) + trailingDot;
  })();

  const displayFontSize = formattedDisplay.length > 12 ? "text-xl" : formattedDisplay.length > 8 ? "text-2xl" : "text-3xl";

  type BtnType = "digit" | "op" | "action" | "equals";
  const btn = (label: string, action: () => void, type: BtnType = "digit") => ({ label, action, type });

  const buttons = [
    btn("AC", handleClear, "action"),
    btn("+/-", handleToggleSign, "action"),
    btn("%", handlePercent, "action"),
    btn("÷", () => handleOperator("÷"), "op"),
    btn("7", () => appendDigit("7")),
    btn("8", () => appendDigit("8")),
    btn("9", () => appendDigit("9")),
    btn("×", () => handleOperator("×"), "op"),
    btn("4", () => appendDigit("4")),
    btn("5", () => appendDigit("5")),
    btn("6", () => appendDigit("6")),
    btn("-", () => handleOperator("-"), "op"),
    btn("1", () => appendDigit("1")),
    btn("2", () => appendDigit("2")),
    btn("3", () => appendDigit("3")),
    btn("+", () => handleOperator("+"), "op"),
    btn("0", () => appendDigit("0")),
    btn(".", () => appendDigit(".")),
    btn("⌫", handleBackspace, "action"),
    btn("=", calculate, "equals"),
  ];

  const btnClass = (type: BtnType) => {
    const base = "flex items-center justify-center rounded-xl text-sm font-black transition-all duration-100 active:scale-95 select-none cursor-pointer";
    switch (type) {
      case "action":  return `${base} bg-slate-200 hover:bg-slate-300 text-slate-700`;
      case "op":      return `${base} bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-200`;
      case "equals":  return `${base} bg-brand-primary hover:bg-blue-700 text-white shadow-md shadow-blue-200`;
      default:        return `${base} bg-white hover:bg-slate-50 text-slate-800 border border-slate-100 shadow-sm`;
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          title="Open Calculator"
          style={{ width: 52, height: 52 }}
          className="fixed z-[9998] bottom-6 right-20 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-xl shadow-blue-200/70 transition-all duration-200 hover:scale-110 active:scale-95"
        >
          <CalcIcon size={22} />
        </button>
      )}

      {/* Calculator Panel */}
      {isOpen && (
        <div
          ref={calcRef}
          className="fixed z-[9999] flex flex-col rounded-[24px] shadow-2xl shadow-blue-200/50 border border-slate-200 bg-white overflow-hidden"
          style={{ left: position.x, top: position.y, width: 280 }}
        >
          {/* Header */}
          <div
            onMouseDown={handleDragMouseDown}
            className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 cursor-grab active:cursor-grabbing select-none"
          >
            <div className="flex items-center gap-2">
              <GripVertical size={14} className="text-blue-300" />
              <CalcIcon size={14} className="text-blue-100" />
              <span className="text-[10px] font-black text-blue-100 uppercase tracking-widest">Calculator</span>
            </div>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-blue-500 rounded-lg transition-colors text-blue-200"
            >
              <X size={14} />
            </button>
          </div>

          {/* Display */}
          <div className="bg-slate-800 px-4 pt-3 pb-2">
            {/* Expression row */}
            <div className="text-right text-xs text-slate-500 font-mono min-h-[16px] truncate">
              {prev !== null ? `${prev} ${op ?? ""}` : ""}
            </div>
            {/* Main number */}
            <div className={`text-right font-black text-white leading-tight mt-0.5 ${displayFontSize} font-mono truncate`}>
              {formattedDisplay}
            </div>
          </div>

          {/* Buttons Grid */}
          <div className="grid grid-cols-4 gap-2 p-3 bg-slate-50">
            {buttons.map((b, i) => (
              <button
                key={i}
                onClick={b.action}
                className={btnClass(b.type) + " py-3.5"}
              >
                {b.label === "⌫" ? <Delete size={15} /> : b.label}
              </button>
            ))}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="border-t border-slate-100 bg-white px-3 py-2 max-h-32 overflow-y-auto">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">History</p>
              {history.map((h, i) => (
                <p key={i} className="text-[10px] text-slate-500 font-mono leading-relaxed truncate">{h}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default BillingCalculator;
