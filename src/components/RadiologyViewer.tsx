import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { MonitorPlay, ZoomIn, ZoomOut, RotateCcw, Maximize2, Layers, Move, Grid3X3, Contrast } from 'lucide-react';

const RadiologyViewer: React.FC = () => {
  const [searchParams] = useSearchParams();
  const studyUid = searchParams.get("uid");

  // Ensure this points to where you are hosting OHIF Viewer
  const ohifBaseUrl = "http://localhost:3000/viewer"; 
  const iframeSrc = studyUid ? `${ohifBaseUrl}?StudyInstanceUID=${studyUid}` : "";

  return (
    <div className="h-[calc(100vh-250px)] bg-slate-900 rounded-[48px] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-500">
      
      <div className="bg-slate-800/50 backdrop-blur-md p-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-1">
           {[
             { icon: ZoomIn, label: 'Zoom In' },
             { icon: ZoomOut, label: 'Zoom Out' },
             { icon: Move, label: 'Pan' },
             { icon: RotateCcw, label: 'Rotate' },
             { icon: Contrast, label: 'Windowing' },
             { icon: Layers, label: 'Stack' },
           ].map((tool, i) => (
             <button key={i} className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all" title={tool.label}>
               <tool.icon size={18} />
             </button>
           ))}
        </div>

        <div className="flex items-center gap-4">
           <div className="h-8 w-px bg-white/10 mx-2" />
           <div className="flex items-center gap-1">
             <button className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"><Grid3X3 size={18}/></button>
             <button className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"><Maximize2 size={18}/></button>
           </div>
           {studyUid && (
             <div className="ml-4 bg-emerald-500/10 text-emerald-400 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-emerald-500/20">
               Study UID: {studyUid.substring(0, 12)}...
             </div>
           )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative bg-black flex items-center justify-center group overflow-hidden">
           
           {studyUid ? (
              <iframe 
                src={iframeSrc} 
                className="w-full h-full border-0"
                allowFullScreen 
                title="OHIF DICOM Viewer"
              />
           ) : (
              <>
                 <div className="absolute inset-0 flex items-center justify-center opacity-10">
                    <MonitorPlay size={200} className="text-white" />
                 </div>
                 
                 <div className="relative z-10 text-center space-y-4">
                    <div className="w-20 h-20 bg-white/5 rounded-[32px] border border-white/10 flex items-center justify-center mx-auto text-slate-400 shadow-xl">
                       <MonitorPlay size={40} />
                    </div>
                    <h3 className="text-xl font-black text-white tracking-tight">PACS Digital Workstation</h3>
                    <p className="text-slate-400 text-sm max-w-xs mx-auto">Please select a completed study from the Results queue to launch the diagnostic viewer.</p>
                 </div>
              </>
           )}
        </div>
      </div>
    </div>
  );
};

export default RadiologyViewer;

// import React from 'react';
// import { useSearchParams } from 'react-router-dom';
// import { MonitorPlay, ZoomIn, ZoomOut, RotateCcw, Maximize2, Layers, Move, Grid3X3, Contrast } from 'lucide-react';

// const RadiologyViewer: React.FC = () => {
//   const [searchParams] = useSearchParams();
//   const studyUid = searchParams.get("uid");

//   // Ensure this points to where you are hosting OHIF Viewer
//   const ohifBaseUrl = "http://localhost:3000/viewer"; 
//   const iframeSrc = studyUid ? `${ohifBaseUrl}?StudyInstanceUID=${studyUid}` : "";

//   return (
//     <div className="h-[calc(100vh-250px)] bg-slate-900 rounded-[48px] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-500">
      
//       <div className="bg-slate-800/50 backdrop-blur-md p-4 flex items-center justify-between border-b border-white/5">
//         <div className="flex items-center gap-1">
//            {[
//              { icon: ZoomIn, label: 'Zoom In' },
//              { icon: ZoomOut, label: 'Zoom Out' },
//              { icon: Move, label: 'Pan' },
//              { icon: RotateCcw, label: 'Rotate' },
//              { icon: Contrast, label: 'Windowing' },
//              { icon: Layers, label: 'Stack' },
//            ].map((tool, i) => (
//              <button key={i} className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all" title={tool.label}>
//                <tool.icon size={18} />
//              </button>
//            ))}
//         </div>

//         <div className="flex items-center gap-4">
//            <div className="h-8 w-px bg-white/10 mx-2" />
//            <div className="flex items-center gap-1">
//              <button className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"><Grid3X3 size={18}/></button>
//              <button className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"><Maximize2 size={18}/></button>
//            </div>
//            {studyUid && (
//              <div className="ml-4 bg-emerald-500/10 text-emerald-400 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-emerald-500/20">
//                Study UID: {studyUid.substring(0, 12)}...
//              </div>
//            )}
//         </div>
//       </div>

//       <div className="flex-1 flex overflow-hidden">
//         <div className="flex-1 relative bg-black flex items-center justify-center group overflow-hidden">
           
//            {studyUid ? (
//               <iframe 
//                 src={iframeSrc} 
//                 className="w-full h-full border-0"
//                 allowFullScreen 
//                 title="OHIF DICOM Viewer"
//               />
//            ) : (
//               <>
//                  <div className="absolute inset-0 flex items-center justify-center opacity-10">
//                     <MonitorPlay size={200} className="text-white" />
//                  </div>
                 
//                  <div className="relative z-10 text-center space-y-4">
//                     <div className="w-20 h-20 bg-white/5 rounded-[32px] border border-white/10 flex items-center justify-center mx-auto text-slate-400 shadow-xl">
//                        <MonitorPlay size={40} />
//                     </div>
//                     <h3 className="text-xl font-black text-white tracking-tight">PACS Digital Workstation</h3>
//                     <p className="text-slate-400 text-sm max-w-xs mx-auto">Please select a completed study from the Results queue to launch the diagnostic viewer.</p>
//                  </div>
//               </>
//            )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default RadiologyViewer;


// // import React from 'react';
// // import { useSearchParams } from 'react-router-dom';
// // import { MonitorPlay, Search, ZoomIn, ZoomOut, RotateCcw, Maximize2, Layers, Move, Grid3X3, Contrast } from 'lucide-react';

// // const RadiologyViewer: React.FC = () => {
// //   const [searchParams] = useSearchParams();
// //   const studyUid = searchParams.get("uid");

// //   // Replace this with the actual URL where your OHIF viewer is hosted
// //   // e.g., if OHIF is built and served on port 3000 of your server:
// //   const ohifBaseUrl = "http://localhost:3000/viewer"; 
// //   const iframeSrc = studyUid ? `${ohifBaseUrl}?StudyInstanceUID=${studyUid}` : "";

// //   return (
// //     <div className="h-[calc(100vh-250px)] bg-slate-900 rounded-[48px] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-500">
      
// //       {/* Viewer Toolbar (Placeholder for custom controls if not using OHIF's built-in ones) */}
// //       <div className="bg-slate-800/50 backdrop-blur-md p-4 flex items-center justify-between border-b border-white/5">
// //         <div className="flex items-center gap-1">
// //            {[
// //              { icon: ZoomIn, label: 'Zoom In' },
// //              { icon: ZoomOut, label: 'Zoom Out' },
// //              { icon: Move, label: 'Pan' },
// //              { icon: RotateCcw, label: 'Rotate' },
// //              { icon: Contrast, label: 'Windowing' },
// //              { icon: Layers, label: 'Stack' },
// //            ].map((tool, i) => (
// //              <button key={i} className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all" title={tool.label}>
// //                <tool.icon size={18} />
// //              </button>
// //            ))}
// //         </div>

// //         <div className="flex items-center gap-4">
// //            <div className="h-8 w-px bg-white/10 mx-2" />
// //            <div className="flex items-center gap-1">
// //              <button className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"><Grid3X3 size={18}/></button>
// //              <button className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"><Maximize2 size={18}/></button>
// //            </div>
// //            {studyUid && (
// //              <div className="ml-4 bg-emerald-500/10 text-emerald-400 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-emerald-500/20">
// //                Study Linked: {studyUid.substring(0, 15)}...
// //              </div>
// //            )}
// //         </div>
// //       </div>

// //       <div className="flex-1 flex overflow-hidden">
// //         {/* Main View Area */}
// //         <div className="flex-1 relative bg-black flex items-center justify-center group overflow-hidden">
           
// //            {studyUid ? (
// //               // LOAD OHIF VIEWER IN IFRAME
// //               <iframe 
// //                 src={iframeSrc} 
// //                 className="w-full h-full border-0"
// //                 allowFullScreen 
// //                 title="OHIF DICOM Viewer"
// //               />
// //            ) : (
// //               // NO STUDY SELECTED FALLBACK
// //               <>
// //                  <div className="absolute inset-0 flex items-center justify-center opacity-10">
// //                     <MonitorPlay size={200} className="text-white" />
// //                  </div>
                 
// //                  <div className="relative z-10 text-center space-y-4">
// //                     <div className="w-20 h-20 bg-white/5 rounded-[32px] border border-white/10 flex items-center justify-center mx-auto text-brand-active0 shadow-xl">
// //                        <MonitorPlay size={40} />
// //                     </div>
// //                     <h3 className="text-xl font-black text-white tracking-tight">PACS Digital Workstation</h3>
// //                     <p className="text-slate-400 text-sm max-w-xs mx-auto">Please select a completed study from the worklist to launch the high-resolution diagnostic viewer.</p>
// //                  </div>

// //                  <div className="absolute top-8 left-8 text-white/40 space-y-1">
// //                     <p className="text-[10px] font-black uppercase tracking-widest">Active Study: None</p>
// //                     <p className="text-xs font-bold">Waiting for DICOM feed</p>
// //                  </div>
// //               </>
// //            )}
// //         </div>
// //       </div>
// //     </div>
// //   );
// // };

// // export default RadiologyViewer;

// // import React from 'react';
// // import { MonitorPlay, Search, ZoomIn, ZoomOut, RotateCcw, Maximize2, Layers, Move, Grid3X3, Contrast } from 'lucide-react';

// // const RadiologyViewer: React.FC = () => {
// //   return (
// //     <div className="h-[calc(100vh-250px)] bg-slate-900 rounded-[48px] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-500">
// //       {/* Viewer Toolbar */}
// //       <div className="bg-slate-800/50 backdrop-blur-md p-4 flex items-center justify-between border-b border-white/5">
// //         <div className="flex items-center gap-1">
// //            {[
// //              { icon: ZoomIn, label: 'Zoom In' },
// //              { icon: ZoomOut, label: 'Zoom Out' },
// //              { icon: Move, label: 'Pan' },
// //              { icon: RotateCcw, label: 'Rotate' },
// //              { icon: Contrast, label: 'Windowing' },
// //              { icon: Layers, label: 'Stack' },
// //            ].map((tool, i) => (
// //              <button key={i} className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all" title={tool.label}>
// //                <tool.icon size={18} />
// //              </button>
// //            ))}
// //         </div>

// //         <div className="flex items-center gap-4">
// //            <div className="h-8 w-px bg-white/10 mx-2" />
// //            <div className="flex items-center gap-1">
// //              <button className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"><Grid3X3 size={18}/></button>
// //              <button className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"><Maximize2 size={18}/></button>
// //            </div>
// //            <button className="ml-4 bg-brand-primary text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-primary transition-all">
// //              Link Study
// //            </button>
// //         </div>
// //       </div>

// //       <div className="flex-1 flex overflow-hidden">
// //         {/* Thumbnails Sidebar */}
// //         <div className="w-24 bg-black/40 border-r border-white/5 p-3 flex flex-col gap-3 overflow-y-auto no-scrollbar">
// //            {[1,2,3,4].map(i => (
// //              <div key={i} className={`aspect-square rounded-xl border-2 transition-all cursor-pointer flex items-center justify-center text-white/20
// //                ${i === 1 ? 'border-brand-active0 bg-brand-active0/10' : 'border-white/5 bg-white/5 hover:border-white/20'}
// //              `}>
// //                <MonitorPlay size={24} />
// //              </div>
// //            ))}
// //         </div>

// //         {/* Main View Area */}
// //         <div className="flex-1 relative flex items-center justify-center group overflow-hidden">
// //            <div className="absolute inset-0 flex items-center justify-center opacity-10">
// //               <MonitorPlay size={200} className="text-white" />
// //            </div>
           
// //            <div className="relative z-10 text-center space-y-4">
// //               <div className="w-20 h-20 bg-white/5 rounded-[32px] border border-white/10 flex items-center justify-center mx-auto text-brand-active0 shadow-xl">
// //                  <MonitorPlay size={40} />
// //               </div>
// //               <h3 className="text-xl font-black text-white tracking-tight">PACS Digital Workstation</h3>
// //               <p className="text-slate-400 text-sm max-w-xs mx-auto">Please select a completed study from the worklist to launch the high-resolution diagnostic viewer.</p>
// //            </div>

// //            {/* Corner Patient Info Overlay */}
// //            <div className="absolute top-8 left-8 text-white/40 space-y-1">
// //               <p className="text-[10px] font-black uppercase tracking-widest">Active Study: None</p>
// //               <p className="text-xs font-bold">1920 x 1080 • DICOM 3.0</p>
// //            </div>

// //            <div className="absolute bottom-8 right-8">
// //               <div className="p-3 bg-white/5 backdrop-blur rounded-2xl border border-white/10 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
// //                 Hardware Acceleration Active
// //               </div>
// //            </div>
// //         </div>
// //       </div>
// //     </div>
// //   );
// // };

// // export default RadiologyViewer;
