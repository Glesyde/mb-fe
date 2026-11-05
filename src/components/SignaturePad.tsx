import React, { useRef, useEffect, useState } from 'react';
import { Eraser, PenTool, CheckCircle, Maximize2 } from 'lucide-react';
import { createPortal } from 'react-dom';

interface SignaturePadProps {
  onEnd?: (dataUrl: string) => void;
  onClear?: () => void;
  className?: string;
  initialDataUrl?: string; // ADDED PROP
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onEnd, onClear, className = '', initialDataUrl }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [internalDataUrl, setInternalDataUrl] = useState<string | null>(initialDataUrl || null);

  // Sync internal state if a loaded profile changes the initial prop
  useEffect(() => {
    if (initialDataUrl) {
      setInternalDataUrl(initialDataUrl);
      setHasSignature(true);
    } else {
      setInternalDataUrl(null);
      setHasSignature(false);
    }
  }, [initialDataUrl]);


  useEffect(() => {
    if (!isFullScreen) return;
    
    let resizeHandler = () => {};

    // Prevent background scrolling immediately
    document.body.style.overflow = 'hidden';

    // Add a slight delay to allow the modal's flexbox layout and animations 
    // to finish rendering so we get the correct clientWidth/clientHeight
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      resizeHandler = () => {
        const parent = canvas.parentElement;
        if (parent && parent.clientWidth > 0 && parent.clientHeight > 0) {
          // Setting width/height clears the canvas context, so we must set styles AFTER
          canvas.width = parent.clientWidth;
          canvas.height = parent.clientHeight;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#1e1b4b'; // Dark blue for better visibility
        }
      };

      // Initialize the canvas size
      resizeHandler();
      window.addEventListener('resize', resizeHandler);
    }, 50); // 50ms is imperceptible to the user but guarantees layout completion

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', resizeHandler);
      document.body.style.overflow = 'auto';
    };
  }, [isFullScreen]);
  
  // useEffect(() => {
  //   if (!isFullScreen) return;
    
  //   const canvas = canvasRef.current;
  //   if (!canvas) return;

  //   const ctx = canvas.getContext('2d');
  //   if (!ctx) return;

  //   const resizeCanvas = () => {
  //     const parent = canvas.parentElement;
  //     if (parent) {
  //       canvas.width = parent.clientWidth;
  //       canvas.height = parent.clientHeight;
  //       ctx.lineCap = 'round';
  //       ctx.lineJoin = 'round';
  //       ctx.lineWidth = 3;
  //       ctx.strokeStyle = '#1e1b4b'; // Dark blue for better visibility
  //     }
  //   };

  //   resizeCanvas();
  //   window.addEventListener('resize', resizeCanvas);
  //   document.body.style.overflow = 'hidden';

  //   return () => {
  //     window.removeEventListener('resize', resizeCanvas);
  //     document.body.style.overflow = 'auto';
  //   };
  // }, [isFullScreen]);

  const getCoordinates = (event: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in event) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = (event as React.MouseEvent).clientX;
      clientY = (event as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (event: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const { x, y } = getCoordinates(event);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (event: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;

    const { x, y } = getCoordinates(event);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
      if (!hasSignature) setHasSignature(true);
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
    }
  };

  const handleDone = () => {
    if (canvasRef.current && hasSignature) {
      const dataUrl = canvasRef.current.toDataURL();
      setInternalDataUrl(dataUrl);
      if (onEnd) onEnd(dataUrl);
    }
    setIsFullScreen(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  };

  const handleClearInternal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInternalDataUrl(null);
    setHasSignature(false);
    if (onClear) onClear();
  };

  const renderModal = () => {
    if (!isFullScreen) return null;
    
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
        <div className="w-full max-w-5xl h-[80vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
          
          <div className="bg-[#1e1b4b] text-white p-4 flex justify-between items-center shrink-0 shadow-md z-10">
            <div>
              <h3 className="font-black tracking-widest uppercase text-sm">Please Sign Below</h3>
              <p className="text-xs text-brand-active opacity-70">Use your finger or a stylus to draw your signature</p>
            </div>
            <button 
              onClick={() => setIsFullScreen(false)}
              className="text-white hover:text-red-400 font-bold px-4 py-2 rounded-lg transition-colors text-sm uppercase tracking-wider"
            >
              Cancel
            </button>
          </div>

          <div className="flex-1 relative bg-slate-50 w-full h-full">
            <canvas
              ref={canvasRef}
              className="w-full h-full block cursor-crosshair touch-none"
              style={{ touchAction: 'none' }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            
            {!hasSignature && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                <div className="text-center">
                  <PenTool size={64} className="mx-auto mb-4 text-slate-400" />
                  <p className="text-xl font-bold text-slate-400 uppercase tracking-widest">Sign Here</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-100 p-4 flex justify-between items-center shrink-0 border-t-2 border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-10">
            <button
              onClick={handleClear}
              className="flex items-center gap-2 px-6 py-3 bg-white text-slate-600 border-2 border-slate-300 rounded-xl font-bold uppercase tracking-wider hover:bg-slate-50 hover:text-red-500 hover:border-red-300 transition-all active:scale-95"
            >
              <Eraser size={18} /> Clear
            </button>
            <button
              onClick={handleDone}
              disabled={!hasSignature}
              className="flex items-center gap-2 px-10 py-3 bg-[#1e1b4b] text-white rounded-xl font-black uppercase tracking-[0.1em] shadow-lg hover:bg-[#2d258a] transition-all disabled:opacity-50 disabled:grayscale active:scale-95"
            >
              <CheckCircle size={20} /> Done Signing
            </button>
          </div>

        </div>
      </div>,
      document.body
    );
  };

  return (
    <>
      <div 
        style={{ minHeight: 'inherit' }}
        className={`relative w-full h-full flex-1 flex flex-col items-center justify-center cursor-pointer hover:bg-brand-active/5 transition-all group select-none ${className}`}
        onClick={() => {
          setIsFullScreen(true);
          setHasSignature(false); // Reset in modal when opening
        }}
      >
        {internalDataUrl ? (
          <div className="w-full h-full p-2 relative flex items-center justify-center">
            <img src={internalDataUrl} alt="Signature" className="max-h-full max-w-full object-contain mx-auto" />
            <div className="absolute inset-0 bg-white/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
              <span className="bg-[#1e1b4b] text-white font-bold px-4 py-2 rounded-lg shadow-md flex items-center gap-2 uppercase tracking-widest text-xs">
                <Maximize2 size={14} /> Tap to edit
              </span>
            </div>
            <button
              onClick={handleClearInternal}
              className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur-sm rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors shadow-sm border border-slate-200 z-10"
              title="Clear Signature"
            >
              <Eraser size={16} />
            </button>
          </div>
        ) : (
          <div className="text-center opacity-50 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center w-full h-full">
            <div className="bg-slate-200/50 p-4 rounded-full mb-3 group-hover:bg-[#1e1b4b] group-hover:text-white transition-colors shadow-sm group-hover:shadow-md">
               <Maximize2 size={24} className="text-slate-500 group-hover:text-white transition-colors" />
            </div>
            <p className="text-[10px] font-black text-slate-400 group-hover:text-[#1e1b4b] uppercase tracking-[0.2em] transition-colors">Tap anywhere to sign</p>
          </div>
        )}
      </div>

      {renderModal()}
    </>
  );
};

export default SignaturePad;




// import React, { useRef, useEffect, useState } from 'react';
// import { Eraser, PenTool, CheckCircle, Maximize2 } from 'lucide-react';
// import { createPortal } from 'react-dom';

// interface SignaturePadProps {
//   onEnd?: (dataUrl: string) => void;
//   onClear?: () => void;
//   className?: string;
// }

// const SignaturePad: React.FC<SignaturePadProps> = ({ onEnd, onClear, className = '' }) => {
//   const canvasRef = useRef<HTMLCanvasElement>(null);
//   const [isDrawing, setIsDrawing] = useState(false);
//   const [hasSignature, setHasSignature] = useState(false);
//   const [isFullScreen, setIsFullScreen] = useState(false);
//   const [internalDataUrl, setInternalDataUrl] = useState<string | null>(null);

//   useEffect(() => {
//     if (!isFullScreen) return;
    
//     const canvas = canvasRef.current;
//     if (!canvas) return;

//     const ctx = canvas.getContext('2d');
//     if (!ctx) return;

//     const resizeCanvas = () => {
//       const parent = canvas.parentElement;
//       if (parent) {
//         canvas.width = parent.clientWidth;
//         canvas.height = parent.clientHeight;
//         ctx.lineCap = 'round';
//         ctx.lineJoin = 'round';
//         ctx.lineWidth = 3;
//         ctx.strokeStyle = '#1e1b4b'; // Dark blue for better visibility
//       }
//     };

//     resizeCanvas();
//     window.addEventListener('resize', resizeCanvas);
    
//     // Prevent scrolling on the body when modal is open
//     document.body.style.overflow = 'hidden';

//     return () => {
//       window.removeEventListener('resize', resizeCanvas);
//       document.body.style.overflow = 'auto';
//     };
//   }, [isFullScreen]);

//   const getCoordinates = (event: React.MouseEvent | React.TouchEvent) => {
//     const canvas = canvasRef.current;
//     if (!canvas) return { x: 0, y: 0 };

//     const rect = canvas.getBoundingClientRect();
//     let clientX, clientY;

//     if ('touches' in event) {
//       clientX = event.touches[0].clientX;
//       clientY = event.touches[0].clientY;
//     } else {
//       clientX = (event as React.MouseEvent).clientX;
//       clientY = (event as React.MouseEvent).clientY;
//     }

//     return {
//       x: clientX - rect.left,
//       y: clientY - rect.top
//     };
//   };

//   const startDrawing = (event: React.MouseEvent | React.TouchEvent) => {
//     // We can call preventDefault on touch events but in React standard touch handlers 
//     // are sometimes passive. It's safer to use CSS touch-action: none on the canvas.
//     setIsDrawing(true);
//     const { x, y } = getCoordinates(event);
//     const ctx = canvasRef.current?.getContext('2d');
//     if (ctx) {
//       ctx.beginPath();
//       ctx.moveTo(x, y);
//     }
//   };

//   const draw = (event: React.MouseEvent | React.TouchEvent) => {
//     if (!isDrawing) return;

//     const { x, y } = getCoordinates(event);
//     const ctx = canvasRef.current?.getContext('2d');
//     if (ctx) {
//       ctx.lineTo(x, y);
//       ctx.stroke();
//       if (!hasSignature) setHasSignature(true);
//     }
//   };

//   const stopDrawing = () => {
//     if (isDrawing) {
//       setIsDrawing(false);
//     }
//   };

//   const handleDone = () => {
//     if (canvasRef.current && hasSignature) {
//       const dataUrl = canvasRef.current.toDataURL();
//       setInternalDataUrl(dataUrl);
//       if (onEnd) onEnd(dataUrl);
//     }
//     setIsFullScreen(false);
//   };

//   const handleClear = () => {
//     const canvas = canvasRef.current;
//     const ctx = canvas?.getContext('2d');
//     if (canvas && ctx) {
//       ctx.clearRect(0, 0, canvas.width, canvas.height);
//       setHasSignature(false);
//     }
//   };

//   const handleClearInternal = (e: React.MouseEvent) => {
//     e.stopPropagation();
//     setInternalDataUrl(null);
//     if (onClear) onClear();
//   };

//   const renderModal = () => {
//     if (!isFullScreen) return null;
    
//     return createPortal(
//       <div className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
//         <div className="w-full max-w-5xl h-[80vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
          
//           <div className="bg-[#1e1b4b] text-white p-4 flex justify-between items-center shrink-0 shadow-md z-10">
//             <div>
//               <h3 className="font-black tracking-widest uppercase text-sm">Please Sign Below</h3>
//               <p className="text-xs text-brand-active opacity-70">Use your finger or a stylus to draw your signature</p>
//             </div>
//             <button 
//               onClick={() => setIsFullScreen(false)}
//               className="text-white hover:text-red-400 font-bold px-4 py-2 rounded-lg transition-colors text-sm uppercase tracking-wider"
//             >
//               Cancel
//             </button>
//           </div>

//           <div className="flex-1 relative bg-slate-50 w-full h-full">
//             <canvas
//               ref={canvasRef}
//               className="w-full h-full block cursor-crosshair touch-none"
//               style={{ touchAction: 'none' }}
//               onMouseDown={startDrawing}
//               onMouseMove={draw}
//               onMouseUp={stopDrawing}
//               onMouseLeave={stopDrawing}
//               onTouchStart={startDrawing}
//               onTouchMove={draw}
//               onTouchEnd={stopDrawing}
//             />
            
//             {!hasSignature && (
//               <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
//                 <div className="text-center">
//                   <PenTool size={64} className="mx-auto mb-4 text-slate-400" />
//                   <p className="text-xl font-bold text-slate-400 uppercase tracking-widest">Sign Here</p>
//                 </div>
//               </div>
//             )}
//           </div>

//           <div className="bg-slate-100 p-4 flex justify-between items-center shrink-0 border-t-2 border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-10">
//             <button
//               onClick={handleClear}
//               className="flex items-center gap-2 px-6 py-3 bg-white text-slate-600 border-2 border-slate-300 rounded-xl font-bold uppercase tracking-wider hover:bg-slate-50 hover:text-red-500 hover:border-red-300 transition-all active:scale-95"
//             >
//               <Eraser size={18} /> Clear
//             </button>
//             <button
//               onClick={handleDone}
//               disabled={!hasSignature}
//               className="flex items-center gap-2 px-10 py-3 bg-[#1e1b4b] text-white rounded-xl font-black uppercase tracking-[0.1em] shadow-lg hover:bg-[#2d258a] transition-all disabled:opacity-50 disabled:grayscale active:scale-95"
//             >
//               <CheckCircle size={20} /> Done Signing
//             </button>
//           </div>

//         </div>
//       </div>,
//       document.body
//     );
//   };

//   return (
//     <>
//       <div 
//         style={{ minHeight: 'inherit' }}
//         className={`relative w-full h-full flex-1 flex flex-col items-center justify-center cursor-pointer hover:bg-brand-active/5 transition-all group select-none ${className}`}
//         onClick={() => {
//           setIsFullScreen(true);
//           setHasSignature(false); // Reset in modal when opening
//         }}
//       >
//         {internalDataUrl ? (
//           <div className="w-full h-full p-2 relative flex items-center justify-center">
//             <img src={internalDataUrl} alt="Signature" className="max-h-full max-w-full object-contain mx-auto" />
//             <div className="absolute inset-0 bg-white/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
//               <span className="bg-[#1e1b4b] text-white font-bold px-4 py-2 rounded-lg shadow-md flex items-center gap-2 uppercase tracking-widest text-xs">
//                 <Maximize2 size={14} /> Tap to edit
//               </span>
//             </div>
//             <button
//               onClick={handleClearInternal}
//               className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur-sm rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors shadow-sm border border-slate-200 z-10"
//               title="Clear Signature"
//             >
//               <Eraser size={16} />
//             </button>
//           </div>
//         ) : (
//           <div className="text-center opacity-50 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center w-full h-full">
//             <div className="bg-slate-200/50 p-4 rounded-full mb-3 group-hover:bg-[#1e1b4b] group-hover:text-white transition-colors shadow-sm group-hover:shadow-md">
//                <Maximize2 size={24} className="text-slate-500 group-hover:text-white transition-colors" />
//             </div>
//             <p className="text-xs font-black text-slate-400 group-hover:text-[#1e1b4b] uppercase tracking-[0.2em] transition-colors">Tap anywhere to sign</p>
//           </div>
//         )}
//       </div>

//       {renderModal()}
//     </>
//   );
// };

// export default SignaturePad;
