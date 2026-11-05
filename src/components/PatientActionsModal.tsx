import React from 'react';
import { 
  X, 
  FilePlus, 
  Stethoscope, 
  LogOut, 
  CheckCircle2, 
  RotateCcw, 
  ClipboardList,
  Activity,
  CheckCircle // Make sure to import this
} from 'lucide-react';

interface PatientActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: any | null;
  onOrders: (patient: any) => void;
  onChart: (patient: any) => void;
  onDischargeAction: (action: string, patient: any) => void;
  onViewSummary: (patient: any) => void;
  onAdmissionAssessment: (patient: any) => void;
}

const PatientActionsModal: React.FC<PatientActionsModalProps> = ({
  isOpen,
  onClose,
  patient,
  onOrders,
  onChart,
  onDischargeAction,
  onViewSummary,
  onAdmissionAssessment
}) => {
  if (!isOpen || !patient) return null;

  const isNone = (!patient.discharge_stage || patient.discharge_stage === 'ACTIVE' || patient.discharge_stage === 'NONE') && !!patient.admission_id;
  const isDoctorMarked = patient.discharge_stage === 'DOCTOR_MARKED' && !!patient.admission_id;
  const isNursingCleared = patient.discharge_stage === 'NURSING_CLEARANCE' && !!patient.admission_id;

  const handleActionClick = (e: React.MouseEvent, actionFn: () => void) => {
    e.stopPropagation();
    onClose();
    actionFn();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 md:p-8 flex items-start justify-between border-b border-slate-100">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Patient Actions</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-black uppercase tracking-widest">
                {patient.mrn}
              </span>
              <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                - {patient.patientName} {patient.visit_reason || 'Inpatient Admission'}
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body (Action Grid) */}
        <div className="p-6 md:p-8 bg-slate-50/50">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            

            
            {/* NEW: Physical Assessment - Blue */}
            <button
              onClick={(e) => handleActionClick(e, () => onAdmissionAssessment(patient))}
              className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-blue-50 rounded-2xl hover:bg-blue-50 hover:border-blue-200 transition-all text-blue-700 group shadow-sm hover:shadow-md shadow-blue-500/5"
            >
              <div className="p-4 bg-blue-100 rounded-2xl group-hover:scale-110 transition-transform relative text-blue-600">
                <Activity size={28} />
                {patient.assessment_completed && (
                  <span className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                    <CheckCircle size={12} />
                  </span>
                )}
              </div>
              <span className="text-xs font-bold text-center">
                 {patient.assessment_completed ? "Amend Assessment" : "Admission Assessment Checklist"}
              </span>
            </button>

            
            {/* Orders */}
            <button
              onClick={(e) => handleActionClick(e, () => onOrders(patient))}
              className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-emerald-50 rounded-2xl hover:bg-emerald-50 hover:border-emerald-200 transition-all text-emerald-700 group shadow-sm hover:shadow-md shadow-emerald-500/5"
            >
              <div className="p-4 bg-emerald-100 rounded-2xl group-hover:scale-110 transition-transform text-emerald-600">
                <FilePlus size={28} />
              </div>
              <span className="text-xs font-bold text-center">Orders</span>
            </button>

            {/* Chart */}
            <button
              onClick={(e) => handleActionClick(e, () => onChart(patient))}
              className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-brand-active rounded-2xl hover:bg-brand-active/50 hover:border-brand-primary transition-all text-brand-primary group shadow-sm hover:shadow-md shadow-brand-primary/10"
            >
              <div className="p-4 bg-brand-active0 rounded-2xl group-hover:scale-110 transition-transform text-brand-primary">
                <Stethoscope size={28} />
              </div>
              <span className="text-xs font-bold text-center">Chart</span>
            </button>


            {/* Mark for Discharge */}
            <button
              onClick={(e) => handleActionClick(e, () => onDischargeAction('markForDischarge', patient))}
              disabled={!isNone}
              className={`flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 rounded-2xl transition-all group relative overflow-hidden shadow-sm
                ${isNone 
                  ? 'border-amber-50 hover:bg-amber-50 hover:border-amber-200 text-amber-700 hover:shadow-md cursor-pointer' 
                  : 'border-slate-100 opacity-50 cursor-not-allowed bg-slate-50'}`}
            >
              <div className={`p-4 rounded-2xl transition-transform
                ${isNone ? 'bg-amber-100 text-amber-600 group-hover:scale-110' : 'bg-slate-100 text-slate-400'}`}>
                <LogOut size={28} />
              </div>
              <span className={`text-xs font-bold text-center ${isNone ? 'text-amber-700' : 'text-slate-400'}`}>
                Mark for Discharge
              </span>
            </button>

            {/* Nurse Clearance */}
            <button
              onClick={(e) => handleActionClick(e, () => onDischargeAction('nurseClearance', patient))}
              disabled={!isDoctorMarked}
              className={`flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 rounded-2xl transition-all group relative overflow-hidden shadow-sm
                ${isDoctorMarked 
                  ? 'border-teal-50 hover:bg-teal-50 hover:border-teal-200 text-teal-700 hover:shadow-md cursor-pointer' 
                  : 'border-slate-100 opacity-50 cursor-not-allowed bg-slate-50'}`}
            >
              <div className={`p-4 rounded-2xl transition-transform
                ${isDoctorMarked ? 'bg-teal-100 text-teal-600 group-hover:scale-110' : 'bg-slate-100 text-slate-400'}`}>
                <CheckCircle2 size={28} />
              </div>
              <span className={`text-xs font-bold text-center ${isDoctorMarked ? 'text-teal-700' : 'text-slate-400'}`}>
                Nurse Clearance
              </span>
            </button>

            {/* Reverse Doctor Mark */}
            <button
              onClick={(e) => handleActionClick(e, () => onDischargeAction('reverseDoctorMark', patient))}
              disabled={!isDoctorMarked}
              className={`flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 rounded-2xl transition-all group relative overflow-hidden shadow-sm
                ${isDoctorMarked 
                  ? 'border-rose-50 hover:bg-rose-50 hover:border-rose-200 text-rose-700 hover:shadow-md cursor-pointer' 
                  : 'border-slate-100 opacity-50 cursor-not-allowed bg-slate-50'}`}
            >
              <div className={`p-4 rounded-2xl transition-transform
                ${isDoctorMarked ? 'bg-rose-100 text-rose-600 group-hover:scale-110' : 'bg-slate-100 text-slate-400'}`}>
                <RotateCcw size={28} />
              </div>
              <span className={`text-xs font-bold text-center ${isDoctorMarked ? 'text-rose-700' : 'text-slate-400'}`}>
                Reverse Doctor Mark

              </span>
            </button>

            {/* View Discharge Summary */}
            {!isNone && (
              <button
                onClick={(e) => handleActionClick(e, () => onViewSummary(patient))}
                className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-indigo-50 rounded-2xl hover:bg-indigo-50 hover:border-indigo-200 transition-all text-indigo-700 group shadow-sm hover:shadow-md shadow-indigo-500/5 md:col-span-1 col-span-2"
              >
                <div className="p-4 bg-indigo-100 rounded-2xl group-hover:scale-110 transition-transform text-indigo-600">
                  <ClipboardList size={28} />
                </div>
                <span className="text-xs font-bold text-center">
                  Discharge Summary
                </span>
              </button>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientActionsModal;

// import React from 'react';
// import { 
//   X, 
//   FilePlus, 
//   Stethoscope, 
//   LogOut, 
//   CheckCircle2, 
//   RotateCcw, 
//   ClipboardList,
//   Activity // Added icon for the assessment
// } from 'lucide-react';

// interface PatientActionsModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   patient: any | null;
//   onOrders: (patient: any) => void;
//   onChart: (patient: any) => void;
//   onDischargeAction: (action: string, patient: any) => void;
//   onViewSummary: (patient: any) => void;
//   onAdmissionAssessment: (patient: any) => void; // New Prop
// }

// const PatientActionsModal: React.FC<PatientActionsModalProps> = ({
//   isOpen,
//   onClose,
//   patient,
//   onOrders,
//   onChart,
//   onDischargeAction,
//   onViewSummary,
//   onAdmissionAssessment // Destructured
// }) => {
//   if (!isOpen || !patient) return null;

//   const isNone = (!patient.discharge_stage || patient.discharge_stage === 'ACTIVE' || patient.discharge_stage === 'NONE') && !!patient.admission_id;
//   const isDoctorMarked = patient.discharge_stage === 'DOCTOR_MARKED' && !!patient.admission_id;
//   const isNursingCleared = patient.discharge_stage === 'NURSING_CLEARANCE' && !!patient.admission_id;

//   const handleActionClick = (e: React.MouseEvent, actionFn: () => void) => {
//     e.stopPropagation();
//     onClose();
//     actionFn();
//   };

//   return (
//     <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
//       <div 
//         className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
//         onClick={onClose}
//       />
//       <div className="relative bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
//         {/* Header */}
//         <div className="p-6 md:p-8 flex items-start justify-between border-b border-slate-100">
//           <div>
//             <h2 className="text-2xl font-black text-slate-800 tracking-tight">Patient Actions</h2>
//             <div className="flex items-center gap-2 mt-2">
//               <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-black uppercase tracking-widest">
//                 {patient.mrn}
//               </span>
//               <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">
//                 - {patient.patientName} {patient.visit_reason || 'Inpatient Admission'}
//               </span>
//             </div>
//           </div>
//           <button 
//             onClick={onClose}
//             className="p-2 border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
//           >
//             <X size={20} />
//           </button>
//         </div>

//         {/* Body (Action Grid) */}
//         <div className="p-6 md:p-8 bg-slate-50/50">
//           <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            
//             {/* Orders */}
//             <button
//               onClick={(e) => handleActionClick(e, () => onOrders(patient))}
//               className="flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-2xl hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-100 transition-all group"
//             >
//               <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
//                 <FilePlus size={28} />
//               </div>
//               <span className="text-xs font-black text-slate-700 uppercase tracking-widest text-center">Orders</span>
//             </button>

//             {/* Chart */}
//             <button
//               onClick={(e) => handleActionClick(e, () => onChart(patient))}
//               className="flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-2xl hover:border-brand-active0 hover:shadow-lg hover:shadow-brand-active transition-all group"
//             >
//               <div className="w-14 h-14 bg-brand-active text-brand-active0 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
//                 <Stethoscope size={28} />
//               </div>
//               <span className="text-xs font-black text-slate-700 uppercase tracking-widest text-center">Chart</span>
//             </button>

//             {/* NEW: Physical Assessment */}
//             <button
//               onClick={(e) => handleActionClick(e, () => onAdmissionAssessment(patient))}
//               className="flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-2xl hover:border-blue-500 hover:shadow-lg hover:shadow-blue-100 transition-all group"
//             >
//               <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
//                 <Activity size={28} />
//               </div>
//               <span className="text-xs font-black text-slate-700 uppercase tracking-widest text-center">Admission Assessment</span>
//             </button>

//             {/* Mark for Discharge */}
//             <button
//               onClick={(e) => handleActionClick(e, () => onDischargeAction('markForDischarge', patient))}
//               disabled={!isNone}
//               className={`flex flex-col items-center justify-center p-6 bg-white border rounded-2xl transition-all group relative overflow-hidden
//                 ${isNone 
//                   ? 'border-slate-200 hover:border-amber-500 hover:shadow-lg hover:shadow-amber-100 cursor-pointer' 
//                   : 'border-slate-100 opacity-50 cursor-not-allowed bg-slate-50'}`}
//             >
//               <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform
//                 ${isNone ? 'bg-amber-50 text-amber-500 group-hover:scale-110' : 'bg-slate-100 text-slate-400'}`}>
//                 <LogOut size={28} />
//               </div>
//               <span className={`text-xs font-black uppercase tracking-widest text-center ${isNone ? 'text-slate-700' : 'text-slate-400'}`}>
//                 Mark for Discharge
//               </span>
//             </button>

//             {/* Nurse Clearance */}
//             <button
//               onClick={(e) => handleActionClick(e, () => onDischargeAction('nurseClearance', patient))}
//               disabled={!isDoctorMarked}
//               className={`flex flex-col items-center justify-center p-6 bg-white border rounded-2xl transition-all group relative overflow-hidden
//                 ${isDoctorMarked 
//                   ? 'border-slate-200 hover:border-teal-500 hover:shadow-lg hover:shadow-teal-100 cursor-pointer' 
//                   : 'border-slate-100 opacity-50 cursor-not-allowed bg-slate-50'}`}
//             >
//               <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform
//                 ${isDoctorMarked ? 'bg-teal-50 text-teal-500 group-hover:scale-110' : 'bg-slate-100 text-slate-400'}`}>
//                 <CheckCircle2 size={28} />
//               </div>
//               <span className={`text-xs font-black uppercase tracking-widest text-center ${isDoctorMarked ? 'text-slate-700' : 'text-slate-400'}`}>
//                 Nurse Clearance
//               </span>
//             </button>

//             {/* Reverse Doctor Mark */}
//             <button
//               onClick={(e) => handleActionClick(e, () => onDischargeAction('reverseDoctorMark', patient))}
//               disabled={!isDoctorMarked}
//               className={`flex flex-col items-center justify-center p-6 bg-white border rounded-2xl transition-all group relative overflow-hidden
//                 ${isDoctorMarked 
//                   ? 'border-slate-200 hover:border-rose-500 hover:shadow-lg hover:shadow-rose-100 cursor-pointer' 
//                   : 'border-slate-100 opacity-50 cursor-not-allowed bg-slate-50'}`}
//             >
//               <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform
//                 ${isDoctorMarked ? 'bg-rose-50 text-rose-500 group-hover:scale-110' : 'bg-slate-100 text-slate-400'}`}>
//                 <RotateCcw size={28} />
//               </div>
//               <span className={`text-xs font-black uppercase tracking-widest text-center ${isDoctorMarked ? 'text-slate-700' : 'text-slate-400'}`}>
//                 Reverse Doctor Mark
//               </span>
//             </button>

//             {/* Reverse Nurse Clearance */}
//             <button
//               onClick={(e) => handleActionClick(e, () => onDischargeAction('reverseNurseClearance', patient))}
//               disabled={!isNursingCleared}
//               className={`flex flex-col items-center justify-center p-6 bg-white border rounded-2xl transition-all group relative overflow-hidden
//                 ${isNursingCleared 
//                   ? 'border-slate-200 hover:border-rose-500 hover:shadow-lg hover:shadow-rose-100 cursor-pointer' 
//                   : 'border-slate-100 opacity-50 cursor-not-allowed bg-slate-50'}`}
//             >
//               <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform
//                 ${isNursingCleared ? 'bg-rose-50 text-rose-500 group-hover:scale-110' : 'bg-slate-100 text-slate-400'}`}>
//                 <RotateCcw size={28} />
//               </div>
//               <span className={`text-xs font-black uppercase tracking-widest text-center ${isNursingCleared ? 'text-slate-700' : 'text-slate-400'}`}>
//                 Reverse Nurse Clearance
//               </span>
//             </button>

//             {/* View Discharge Summary */}
//             {!isNone && (
//               <button
//                 onClick={(e) => handleActionClick(e, () => onViewSummary(patient))}
//                 className="flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-2xl hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-100 transition-all group md:col-span-1 col-span-2"
//               >
//                 <div className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
//                   <ClipboardList size={28} />
//                 </div>
//                 <span className="text-xs font-black text-slate-700 uppercase tracking-widest text-center">
//                   View Discharge Summary
//                 </span>
//               </button>
//             )}

//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default PatientActionsModal;


// import React from 'react';
// import { 
//   X, 
//   FilePlus, 
//   Stethoscope, 
//   LogOut, 
//   CheckCircle2, 
//   RotateCcw, 
//   ClipboardList 
// } from 'lucide-react';

// interface PatientActionsModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   patient: any | null;
//   onOrders: (patient: any) => void;
//   onChart: (patient: any) => void;
//   onDischargeAction: (action: string, patient: any) => void;
//   onViewSummary: (patient: any) => void;
// }

// const PatientActionsModal: React.FC<PatientActionsModalProps> = ({
//   isOpen,
//   onClose,
//   patient,
//   onOrders,
//   onChart,
//   onDischargeAction,
//   onViewSummary
// }) => {
//   if (!isOpen || !patient) return null;

//   const isNone = (!patient.discharge_stage || patient.discharge_stage === 'ACTIVE' || patient.discharge_stage === 'NONE') && !!patient.admission_id;
//   const isDoctorMarked = patient.discharge_stage === 'DOCTOR_MARKED' && !!patient.admission_id;
//   const isNursingCleared = patient.discharge_stage === 'NURSING_CLEARANCE' && !!patient.admission_id;

//   const handleActionClick = (e: React.MouseEvent, actionFn: () => void) => {
//     e.stopPropagation();
//     onClose();
//     actionFn();
//   };

//   return (
//     <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
//       <div 
//         className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
//         onClick={onClose}
//       />
//       <div className="relative bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
//         {/* Header */}
//         <div className="p-6 md:p-8 flex items-start justify-between border-b border-slate-100">
//           <div>
//             <h2 className="text-2xl font-black text-slate-800 tracking-tight">Patient Actions</h2>
//             <div className="flex items-center gap-2 mt-2">
//               <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-black uppercase tracking-widest">
//                 {patient.mrn}
//               </span>
//               <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">
//                 {patient.patientName} • {patient.visit_reason || 'Inpatient Admission'}
//               </span>
//             </div>
//           </div>
//           <button 
//             onClick={onClose}
//             className="p-2 border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
//           >
//             <X size={20} />
//           </button>
//         </div>

//         {/* Body (Action Grid) */}
//         <div className="p-6 md:p-8 bg-slate-50/50">
//           <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            
//             {/* Orders */}
//             <button
//               onClick={(e) => handleActionClick(e, () => onOrders(patient))}
//               className="flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-2xl hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-100 transition-all group"
//             >
//               <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
//                 <FilePlus size={28} />
//               </div>
//               <span className="text-xs font-black text-slate-700 uppercase tracking-widest text-center">Orders</span>
//             </button>

//             {/* Chart */}
//             <button
//               onClick={(e) => handleActionClick(e, () => onChart(patient))}
//               className="flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-2xl hover:border-brand-active0 hover:shadow-lg hover:shadow-brand-active transition-all group"
//             >
//               <div className="w-14 h-14 bg-brand-active text-brand-active0 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
//                 <Stethoscope size={28} />
//               </div>
//               <span className="text-xs font-black text-slate-700 uppercase tracking-widest text-center">Chart</span>
//             </button>

//             {/* Mark for Discharge */}
//             <button
//               onClick={(e) => handleActionClick(e, () => onDischargeAction('markForDischarge', patient))}
//               disabled={!isNone}
//               className={`flex flex-col items-center justify-center p-6 bg-white border rounded-2xl transition-all group relative overflow-hidden
//                 ${isNone 
//                   ? 'border-slate-200 hover:border-amber-500 hover:shadow-lg hover:shadow-amber-100 cursor-pointer' 
//                   : 'border-slate-100 opacity-50 cursor-not-allowed bg-slate-50'}`}
//             >
//               <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform
//                 ${isNone ? 'bg-amber-50 text-amber-500 group-hover:scale-110' : 'bg-slate-100 text-slate-400'}`}>
//                 <LogOut size={28} />
//               </div>
//               <span className={`text-xs font-black uppercase tracking-widest text-center ${isNone ? 'text-slate-700' : 'text-slate-400'}`}>
//                 Mark for Discharge
//               </span>
//             </button>

//             {/* Nurse Clearance */}
//             <button
//               onClick={(e) => handleActionClick(e, () => onDischargeAction('nurseClearance', patient))}
//               disabled={!isDoctorMarked}
//               className={`flex flex-col items-center justify-center p-6 bg-white border rounded-2xl transition-all group relative overflow-hidden
//                 ${isDoctorMarked 
//                   ? 'border-slate-200 hover:border-teal-500 hover:shadow-lg hover:shadow-teal-100 cursor-pointer' 
//                   : 'border-slate-100 opacity-50 cursor-not-allowed bg-slate-50'}`}
//             >
//               <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform
//                 ${isDoctorMarked ? 'bg-teal-50 text-teal-500 group-hover:scale-110' : 'bg-slate-100 text-slate-400'}`}>
//                 <CheckCircle2 size={28} />
//               </div>
//               <span className={`text-xs font-black uppercase tracking-widest text-center ${isDoctorMarked ? 'text-slate-700' : 'text-slate-400'}`}>
//                 Nurse Clearance
//               </span>
//             </button>

//             {/* Reverse Doctor Mark */}
//             <button
//               onClick={(e) => handleActionClick(e, () => onDischargeAction('reverseDoctorMark', patient))}
//               disabled={!isDoctorMarked}
//               className={`flex flex-col items-center justify-center p-6 bg-white border rounded-2xl transition-all group relative overflow-hidden
//                 ${isDoctorMarked 
//                   ? 'border-slate-200 hover:border-rose-500 hover:shadow-lg hover:shadow-rose-100 cursor-pointer' 
//                   : 'border-slate-100 opacity-50 cursor-not-allowed bg-slate-50'}`}
//             >
//               <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform
//                 ${isDoctorMarked ? 'bg-rose-50 text-rose-500 group-hover:scale-110' : 'bg-slate-100 text-slate-400'}`}>
//                 <RotateCcw size={28} />
//               </div>
//               <span className={`text-xs font-black uppercase tracking-widest text-center ${isDoctorMarked ? 'text-slate-700' : 'text-slate-400'}`}>
//                 Reverse Doctor Mark
//               </span>
//             </button>

//             {/* Reverse Nurse Clearance */}
//             <button
//               onClick={(e) => handleActionClick(e, () => onDischargeAction('reverseNurseClearance', patient))}
//               disabled={!isNursingCleared}
//               className={`flex flex-col items-center justify-center p-6 bg-white border rounded-2xl transition-all group relative overflow-hidden
//                 ${isNursingCleared 
//                   ? 'border-slate-200 hover:border-rose-500 hover:shadow-lg hover:shadow-rose-100 cursor-pointer' 
//                   : 'border-slate-100 opacity-50 cursor-not-allowed bg-slate-50'}`}
//             >
//               <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform
//                 ${isNursingCleared ? 'bg-rose-50 text-rose-500 group-hover:scale-110' : 'bg-slate-100 text-slate-400'}`}>
//                 <RotateCcw size={28} />
//               </div>
//               <span className={`text-xs font-black uppercase tracking-widest text-center ${isNursingCleared ? 'text-slate-700' : 'text-slate-400'}`}>
//                 Reverse Nurse Clearance
//               </span>
//             </button>

//             {/* View Discharge Summary */}
//             {!isNone && (
//               <button
//                 onClick={(e) => handleActionClick(e, () => onViewSummary(patient))}
//                 className="flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-2xl hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-100 transition-all group md:col-span-1 col-span-2"
//               >
//                 <div className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
//                   <ClipboardList size={28} />
//                 </div>
//                 <span className="text-xs font-black text-slate-700 uppercase tracking-widest text-center">
//                   View Discharge Summary
//                 </span>
//               </button>
//             )}

//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default PatientActionsModal;
