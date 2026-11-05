/**
 * IdleTimeoutContext — MedCore HIS
 *
 * Monitors user inactivity and shows a countdown modal before auto-logout.
 * Timeline: 4 min idle → warning modal + audio alert → 1 min countdown → logout
 *
 * Features:
 * - Tracks mouse, keyboard, click, scroll, and touch events as "activity"
 * - Saves current route + form drafts to sessionStorage before logout
 * - Plays a Web Audio API beep (no external file required)
 * - "Stay Signed In" button resets the timer
 * - Only active when user is authenticated
 * - NEW: Automatically disabled on Theater Board views to prevent disruption.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { sessionRestoreService } from "../services/session-restore.service";
import { ShieldAlert, Clock, LogOut } from "lucide-react";

// ─── Config ──────────────────────────────────────────────────────────────────
const IDLE_TIMEOUT_MS = 4 * 60 * 1000; // 4 min of inactivity → show warning
const COUNTDOWN_SECONDS = 60;          // 1 min countdown before logout
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "click",
];

// ─── Audio ───────────────────────────────────────────────────────────────────
function playAlertBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Three short ascending beeps — clinical attention signal
    const beepTimes = [0, 0.45, 0.9];
    const frequencies = [660, 770, 880];

    beepTimes.forEach((startAt, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = frequencies[i];
      gain.gain.setValueAtTime(0.25, ctx.currentTime + startAt);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + startAt + 0.35
      );
      osc.start(ctx.currentTime + startAt);
      osc.stop(ctx.currentTime + startAt + 0.35);
    });
  } catch {
    // Audio not available — silent fallback
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────
interface IdleTimeoutContextType {
  resetIdleTimer: () => void;
}

const IdleTimeoutContext = createContext<IdleTimeoutContextType>({
  resetIdleTimer: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────
export const IdleTimeoutProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const [showModal, setShowModal] = useState(false);
  const showModalRef = useRef(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasPlayedSound = useRef(false);

  // ─── Determine if we should ignore timeouts (e.g. Theatre Board) ───────────
  const isTimeoutDisabled = location.pathname.includes("/board") || location.pathname.includes("/theatre-board");

  // ─── Logout with session save ──────────────────────────────────────────────
  const performLogout = useCallback(async () => {
    if (user?.id) {
      sessionRestoreService.saveSession(
        user.id,
        location.pathname,
        location.state 
      );
    }
    setShowModal(false);
    showModalRef.current = false;
    clearAllTimers();
    await logout();
  }, [user, logout, location]);

  // ─── Timer management ──────────────────────────────────────────────────────
  const clearAllTimers = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    idleTimerRef.current = null;
    countdownIntervalRef.current = null;
  }, []);

  const startCountdown = useCallback(() => {
    setCountdown(COUNTDOWN_SECONDS);
    if (!hasPlayedSound.current) {
      playAlertBeep();
      hasPlayedSound.current = true;
    }

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Time's up — logout
          clearInterval(countdownIntervalRef.current!);
          performLogout();
          return 0;
        }
        // Play a reminder beep every 30 seconds
        if (prev === 30) playAlertBeep();
        return prev - 1;
      });
    }, 1000);
  }, [performLogout]);

  const resetIdleTimer = useCallback(() => {
    // DO NOT start the timer if user isn't authenticated or if they are on a disabled route (e.g. Theatre Board)
    if (!isAuthenticated || isTimeoutDisabled) {
        clearAllTimers();
        return;
    }

    clearAllTimers();
    hasPlayedSound.current = false;
    setShowModal(false);
    showModalRef.current = false;
    setCountdown(COUNTDOWN_SECONDS);

    idleTimerRef.current = setTimeout(() => {
      setShowModal(true);
      showModalRef.current = true;
      startCountdown();
    }, IDLE_TIMEOUT_MS);
  }, [isAuthenticated, isTimeoutDisabled, clearAllTimers, startCountdown]);

  // ─── Stay signed in ────────────────────────────────────────────────────────
  const handleStaySignedIn = useCallback(() => {
    clearAllTimers();
    hasPlayedSound.current = false;
    setShowModal(false);
    setCountdown(COUNTDOWN_SECONDS);
    resetIdleTimer();
  }, [clearAllTimers, resetIdleTimer]);

  // ─── Activity listeners ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || isTimeoutDisabled) {
      clearAllTimers();
      setShowModal(false);
      return;
    }

    // Start the idle timer on mount / auth change
    resetIdleTimer();

    // Attach activity listeners
    const handleActivity = () => {
      if (!showModalRef.current) resetIdleTimer();
    };

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, handleActivity, { passive: true })
    );

    return () => {
      clearAllTimers();
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, handleActivity)
      );
    };
  }, [isAuthenticated, isTimeoutDisabled]); // Re-run effect if they navigate to/from the board

  // ─── SVG Countdown Ring ────────────────────────────────────────────────────
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const progress = countdown / COUNTDOWN_SECONDS;
  const dashOffset = circumference * (1 - progress);
  const isUrgent = countdown <= 15;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <IdleTimeoutContext.Provider value={{ resetIdleTimer }}>
      {children}

      {/* ── Idle Timeout Modal ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: "rgba(15, 23, 42, 0.75)", backdropFilter: "blur(6px)" }}
        >
          <div
            className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden"
            style={{
              animation: "idleModalIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both",
            }}
          >
            {/* Header stripe */}
            <div
              className={`h-2 w-full transition-colors duration-500 ${
                isUrgent ? "bg-red-500" : "bg-amber-400"
              }`}
            />

            <div className="p-8 flex flex-col items-center text-center gap-5">
              {/* Countdown ring */}
              <div className="relative w-36 h-36">
                <svg
                  className="w-full h-full -rotate-90"
                  viewBox="0 0 120 120"
                >
                  {/* Track */}
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="8"
                  />
                  {/* Progress arc */}
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke={isUrgent ? "#ef4444" : "#f59e0b"}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.5s" }}
                  />
                </svg>
                {/* Number */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className={`text-4xl font-black tabular-nums transition-colors ${
                      isUrgent ? "text-red-600" : "text-amber-500"
                    }`}
                  >
                    {countdown}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest -mt-1">
                    seconds
                  </span>
                </div>
              </div>

              {/* Text */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-center gap-2">
                  <ShieldAlert
                    size={20}
                    className={isUrgent ? "text-red-500" : "text-amber-500"}
                  />
                  <h2 className="text-xl font-black text-slate-800">
                    Session Expiring
                  </h2>
                </div>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  You've been inactive. For security, you'll be
                  <br />
                  logged out automatically.
                </p>
              </div>

              {/* Time indicator */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 w-full justify-center">
                <Clock size={15} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-600">
                  Logging out in{" "}
                  <span className={`font-black ${isUrgent ? "text-red-600" : "text-amber-600"}`}>
                    {countdown}s
                  </span>
                </span>
              </div>

              {/* Actions */}
              <div className="w-full space-y-2.5">
                <button
                  id="idle-stay-signed-in"
                  onClick={handleStaySignedIn}
                  className="w-full py-3.5 bg-brand-primary hover:bg-brand-primary text-white font-black text-sm rounded-2xl transition-all active:scale-95 shadow-lg shadow-brand-active"
                >
                  Stay Signed In
                </button>
                <button
                  id="idle-logout-now"
                  onClick={performLogout}
                  className="w-full py-3 flex items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                >
                  <LogOut size={15} />
                  Log Out Now
                </button>
              </div>
            </div>
          </div>

          {/* Keyframe injector */}
          <style>{`
            @keyframes idleModalIn {
              from { opacity: 0; transform: scale(0.88) translateY(16px); }
              to   { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}</style>
        </div>
      )}
    </IdleTimeoutContext.Provider>
  );
};

export const useIdleTimeout = () => useContext(IdleTimeoutContext);



// /**
//  * IdleTimeoutContext — MedCore HIS
//  *
//  * Monitors user inactivity and shows a countdown modal before auto-logout.
//  * Timeline: 4 min idle → warning modal + audio alert → 1 min countdown → logout
//  *
//  * Features:
//  * - Tracks mouse, keyboard, click, scroll, and touch events as "activity"
//  * - Saves current route + form drafts to sessionStorage before logout
//  * - Plays a Web Audio API beep (no external file required)
//  * - "Stay Signed In" button resets the timer
//  * - Only active when user is authenticated
//  */

// import React, {
//   createContext,
//   useContext,
//   useEffect,
//   useRef,
//   useState,
//   useCallback,
// } from "react";
// import { useLocation } from "react-router-dom";
// import { useAuth } from "./AuthContext";
// import { sessionRestoreService } from "../services/session-restore.service";
// import { ShieldAlert, Clock, LogOut } from "lucide-react";

// // ─── Config ──────────────────────────────────────────────────────────────────
// const IDLE_TIMEOUT_MS = 4 * 60 * 1000; // 4 min of inactivity → show warning
// const COUNTDOWN_SECONDS = 60;          // 1 min countdown before logout
// const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
//   "mousemove",
//   "mousedown",
//   "keydown",
//   "touchstart",
//   "scroll",
//   "click",
// ];

// // ─── Audio ───────────────────────────────────────────────────────────────────
// function playAlertBeep() {
//   try {
//     const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
//     if (!AudioCtx) return;
//     const ctx = new AudioCtx();

//     // Three short ascending beeps — clinical attention signal
//     const beepTimes = [0, 0.45, 0.9];
//     const frequencies = [660, 770, 880];

//     beepTimes.forEach((startAt, i) => {
//       const osc = ctx.createOscillator();
//       const gain = ctx.createGain();
//       osc.connect(gain);
//       gain.connect(ctx.destination);
//       osc.type = "sine";
//       osc.frequency.value = frequencies[i];
//       gain.gain.setValueAtTime(0.25, ctx.currentTime + startAt);
//       gain.gain.exponentialRampToValueAtTime(
//         0.001,
//         ctx.currentTime + startAt + 0.35
//       );
//       osc.start(ctx.currentTime + startAt);
//       osc.stop(ctx.currentTime + startAt + 0.35);
//     });
//   } catch {
//     // Audio not available — silent fallback
//   }
// }

// // ─── Context ─────────────────────────────────────────────────────────────────
// interface IdleTimeoutContextType {
//   resetIdleTimer: () => void;
// }

// const IdleTimeoutContext = createContext<IdleTimeoutContextType>({
//   resetIdleTimer: () => {},
// });

// // ─── Provider ─────────────────────────────────────────────────────────────────
// export const IdleTimeoutProvider: React.FC<{ children: React.ReactNode }> = ({
//   children,
// }) => {
//   const { user, logout, isAuthenticated } = useAuth();
//   const location = useLocation();
//   const [showModal, setShowModal] = useState(false);
//   const showModalRef = useRef(false);
//   const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

//   const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
//   const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
//   const hasPlayedSound = useRef(false);

//   // ─── Logout with session save ──────────────────────────────────────────────
//   const performLogout = useCallback(async () => {
//     if (user?.id) {
//       // Save current route and state so user can resume exactly what they were doing
//       sessionRestoreService.saveSession(
//         user.id,
//         location.pathname,
//         location.state 
//       );
//     }
//     setShowModal(false);
//     showModalRef.current = false;
//     clearAllTimers();
//     await logout();
//   }, [user, logout, location]);

//   // ─── Timer management ──────────────────────────────────────────────────────
//   const clearAllTimers = useCallback(() => {
//     if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
//     if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
//     idleTimerRef.current = null;
//     countdownIntervalRef.current = null;
//   }, []);

//   const startCountdown = useCallback(() => {
//     setCountdown(COUNTDOWN_SECONDS);
//     if (!hasPlayedSound.current) {
//       playAlertBeep();
//       hasPlayedSound.current = true;
//     }

//     countdownIntervalRef.current = setInterval(() => {
//       setCountdown((prev) => {
//         if (prev <= 1) {
//           // Time's up — logout
//           clearInterval(countdownIntervalRef.current!);
//           performLogout();
//           return 0;
//         }
//         // Play a reminder beep every 30 seconds
//         if (prev === 30) playAlertBeep();
//         return prev - 1;
//       });
//     }, 1000);
//   }, [performLogout, clearAllTimers]);

//   const resetIdleTimer = useCallback(() => {
//     if (!isAuthenticated) return;

//     clearAllTimers();
//     hasPlayedSound.current = false;
//     setShowModal(false);
//     showModalRef.current = false;
//     setCountdown(COUNTDOWN_SECONDS);

//     idleTimerRef.current = setTimeout(() => {
//       setShowModal(true);
//       showModalRef.current = true;
//       startCountdown();
//     }, IDLE_TIMEOUT_MS);
//   }, [isAuthenticated, clearAllTimers, startCountdown]);

//   // ─── Stay signed in ────────────────────────────────────────────────────────
//   const handleStaySignedIn = useCallback(() => {
//     clearAllTimers();
//     hasPlayedSound.current = false;
//     setShowModal(false);
//     setCountdown(COUNTDOWN_SECONDS);
//     resetIdleTimer();
//   }, [clearAllTimers, resetIdleTimer]);

//   // ─── Activity listeners ────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!isAuthenticated) {
//       clearAllTimers();
//       setShowModal(false);
//       return;
//     }

//     // Start the idle timer on mount / auth change
//     resetIdleTimer();

//     // Attach activity listeners
//     const handleActivity = () => {
//       if (!showModalRef.current) resetIdleTimer();
//     };

//     ACTIVITY_EVENTS.forEach((event) =>
//       window.addEventListener(event, handleActivity, { passive: true })
//     );

//     return () => {
//       clearAllTimers();
//       ACTIVITY_EVENTS.forEach((event) =>
//         window.removeEventListener(event, handleActivity)
//       );
//     };
//   }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

//   // ─── SVG Countdown Ring ────────────────────────────────────────────────────
//   const radius = 52;
//   const circumference = 2 * Math.PI * radius;
//   const progress = countdown / COUNTDOWN_SECONDS;
//   const dashOffset = circumference * (1 - progress);
//   const isUrgent = countdown <= 15;

//   // ─── Render ────────────────────────────────────────────────────────────────
//   return (
//     <IdleTimeoutContext.Provider value={{ resetIdleTimer }}>
//       {children}

//       {/* ── Idle Timeout Modal ── */}
//       {showModal && (
//         <div
//           className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
//           style={{ background: "rgba(15, 23, 42, 0.75)", backdropFilter: "blur(6px)" }}
//         >
//           <div
//             className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden"
//             style={{
//               animation: "idleModalIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both",
//             }}
//           >
//             {/* Header stripe */}
//             <div
//               className={`h-2 w-full transition-colors duration-500 ${
//                 isUrgent ? "bg-red-500" : "bg-amber-400"
//               }`}
//             />

//             <div className="p-8 flex flex-col items-center text-center gap-5">
//               {/* Countdown ring */}
//               <div className="relative w-36 h-36">
//                 <svg
//                   className="w-full h-full -rotate-90"
//                   viewBox="0 0 120 120"
//                 >
//                   {/* Track */}
//                   <circle
//                     cx="60"
//                     cy="60"
//                     r={radius}
//                     fill="none"
//                     stroke="#f1f5f9"
//                     strokeWidth="8"
//                   />
//                   {/* Progress arc */}
//                   <circle
//                     cx="60"
//                     cy="60"
//                     r={radius}
//                     fill="none"
//                     stroke={isUrgent ? "#ef4444" : "#f59e0b"}
//                     strokeWidth="8"
//                     strokeLinecap="round"
//                     strokeDasharray={circumference}
//                     strokeDashoffset={dashOffset}
//                     style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.5s" }}
//                   />
//                 </svg>
//                 {/* Number */}
//                 <div className="absolute inset-0 flex flex-col items-center justify-center">
//                   <span
//                     className={`text-4xl font-black tabular-nums transition-colors ${
//                       isUrgent ? "text-red-600" : "text-amber-500"
//                     }`}
//                   >
//                     {countdown}
//                   </span>
//                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest -mt-1">
//                     seconds
//                   </span>
//                 </div>
//               </div>

//               {/* Text */}
//               <div className="space-y-1.5">
//                 <div className="flex items-center justify-center gap-2">
//                   <ShieldAlert
//                     size={20}
//                     className={isUrgent ? "text-red-500" : "text-amber-500"}
//                   />
//                   <h2 className="text-xl font-black text-slate-800">
//                     Session Expiring
//                   </h2>
//                 </div>
//                 <p className="text-sm text-slate-500 font-medium leading-relaxed">
//                   You've been inactive. For security, you'll be
//                   <br />
//                   logged out automatically.
//                 </p>
//               </div>

//               {/* Time indicator */}
//               <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 w-full justify-center">
//                 <Clock size={15} className="text-slate-400" />
//                 <span className="text-xs font-bold text-slate-600">
//                   Logging out in{" "}
//                   <span className={`font-black ${isUrgent ? "text-red-600" : "text-amber-600"}`}>
//                     {countdown}s
//                   </span>
//                 </span>
//               </div>

//               {/* Actions */}
//               <div className="w-full space-y-2.5">
//                 <button
//                   id="idle-stay-signed-in"
//                   onClick={handleStaySignedIn}
//                   className="w-full py-3.5 bg-brand-primary hover:bg-brand-primary text-white font-black text-sm rounded-2xl transition-all active:scale-95 shadow-lg shadow-brand-active"
//                 >
//                   Stay Signed In
//                 </button>
//                 <button
//                   id="idle-logout-now"
//                   onClick={performLogout}
//                   className="w-full py-3 flex items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
//                 >
//                   <LogOut size={15} />
//                   Log Out Now
//                 </button>
//               </div>
//             </div>
//           </div>

//           {/* Keyframe injector */}
//           <style>{`
//             @keyframes idleModalIn {
//               from { opacity: 0; transform: scale(0.88) translateY(16px); }
//               to   { opacity: 1; transform: scale(1) translateY(0); }
//             }
//           `}</style>
//         </div>
//       )}
//     </IdleTimeoutContext.Provider>
//   );
// };

// export const useIdleTimeout = () => useContext(IdleTimeoutContext);
