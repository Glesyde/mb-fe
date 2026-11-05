import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { labService } from '../../../services/lab.service';
import {
  Loader2,
  AlertCircle,
  Printer,
  CheckCircle2,
  Clock,
  Activity,
} from 'lucide-react';

/* ─── Helpers ──────────────────────────────────────── */
const fmt = (v: string | number | null | undefined) => (v !== null && v !== undefined && v !== '' ? v : '—');
const fmtDate = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const fmtDateOnly = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleDateString('en-GB', { dateStyle: 'medium' }) : '—';
const fmtRange = (low: any, high: any) => 
  (low && high) ? `${low} - ${high}` : (low || high || '—');

/* ─── Flagging Logic ───────────────────────────────── */
const getFlagStyles = (f: string | null | undefined) => {
  const flag = f?.toUpperCase();
  if (!flag || flag === 'NORMAL' || flag === 'N') return { text: 'text-slate-700', badge: 'bg-slate-100 text-slate-600' };
  if (flag === 'HH' || flag === 'LL' || flag === 'CRITICAL HIGH' || flag === 'CRITICAL LOW') return { text: 'text-red-600 font-bold', badge: 'bg-red-100 text-red-700 border-red-200' };
  return { text: 'text-amber-600 font-semibold', badge: 'bg-amber-100 text-amber-700 border-amber-200' };
};

const formatFlagLabel = (code: string | null | undefined, interp: string | null | undefined) => {
  if (interp) return interp;
  const map: Record<string, string> = { H: 'High', HH: 'Critical High', L: 'Low', LL: 'Critical Low', A: 'Abnormal', N: 'Normal' };
  return code ? (map[code.toUpperCase()] ?? code) : 'Normal';
};

/* ─── Micro-components ─────────────────────────────── */
const BRAND = '#2A157c';

const InfoRow = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div className="flex justify-between py-1 border-b border-slate-100 last:border-0 break-inside-avoid">
    <span className="text-xs text-slate-500 font-medium">{label}</span>
    <span className="text-xs font-semibold text-slate-900 text-right">{fmt(value)}</span>
  </div>
);

/* ════════════════════════════════════════════════════════ */
const LabReportPrintTemplate: React.FC = () => {
  const { referenceNo } = useParams<{ referenceNo: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        if (!referenceNo) throw new Error('No reference number provided.');
        const result = await labService.getResultByRef(referenceNo);
        if (!result) throw new Error('Report data not found.');
        setData(result);
        setTimeout(() => window.print(), 800);
      } catch (err) {
        setError('Unable to load the laboratory report.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [referenceNo]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <Loader2 size={40} className="animate-spin mb-4" style={{ color: BRAND }} />
        <p className="text-sm font-medium text-slate-600 animate-pulse">Preparing official report...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm w-full border border-red-100">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800 mb-2">Report Unavailable</h3>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  const results: any[] = data.results || [];
  const wfStatus = (data.processing_status || data.order_status || '').toUpperCase();
  const isCompleted = wfStatus === 'COMPLETED' || wfStatus === 'RELEASED';
  const doctorName = data.doctor_name || data.requesting_doctor_name || data.attending_doctor_name;

  return (
    <div className="fixed inset-0 overflow-y-auto bg-slate-200 pt-24 pb-20 px-4 print:static print:bg-white print:p-0 font-sans selection:bg-blue-100">
      
      {/* ── CSS Override to remove browser URLs and force background colors ── */}
      <style>
        {`
          @media print {
            @page {
              margin: 0; /* Removes default browser headers/footers (URL, dates) */
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        `}
      </style>

      {/* ── Screen Preview Toolbar (Hidden on Print) ── */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 md:px-12 print:hidden z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <Activity size={20} style={{ color: BRAND }} />
          <div>
            <h2 className="font-bold text-slate-800 text-sm leading-tight">Report Preview</h2>
            <p className="text-[11px] text-slate-500 font-mono">{data.reference_no}</p>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all shadow-md hover:shadow-lg active:scale-95"
          style={{ backgroundColor: BRAND }}
        >
          <Printer size={16} /> Print Report
        </button>
      </div>

      {/* ── A4 Print Container ── */}
      <div className="w-full max-w-[210mm] min-h-[297mm] bg-white mx-auto shadow-2xl rounded-sm print:shadow-none print:rounded-none print:max-w-none print:w-full border border-slate-300 print:border-none relative flex flex-col">

        <div className="flex justify-between items-start border-b-2 p-6" style={{ backgroundColor: BRAND }}>
          <div className="flex items-center gap-4">
            <img src="/assets/logo-nobg.png" alt="Hospital Logo" className="w-[10em] h-auto object-contain" />
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-black uppercase tracking-wider text-white">Lab Report</h2>
            <p className="text-xs font-bold text-white mt-1">Ref: <span className="font-mono text-white">{data.reference_no}</span></p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 uppercase">
              {isCompleted ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Clock size={12} className="text-amber-500" />}
              {wfStatus.replace('_', ' ')}
            </div>
          </div>
        </div>

        <div className="px-10 py-8 flex-1">
          {/* ── Patient & Order Information Grid ── */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 break-inside-avoid">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Patient Details</h3>
              <div className="space-y-1">
                <InfoRow label="Patient Name" value={data.patient_name} />
                <InfoRow label="MRN (File No.)" value={data.mrn} />
                <InfoRow label="Age / Gender" value={`${fmt(data.patient_age)} / ${fmt(data.gender)}`} />
                <InfoRow label="Date of Birth" value={fmtDateOnly(data.date_of_birth)} />
                <InfoRow label="Contact Phone" value={data.phone} />
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 break-inside-avoid">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Investigation Details</h3>
              <div className="space-y-1">
                <InfoRow label="Test Requested" value={data.service_name} />
                <InfoRow label="Requesting Doctor" value={doctorName} />
                <InfoRow label="Visit Reason" value={data.visit_reason} />
                <InfoRow label="Date Requested" value={fmtDate(data.ordered_at)} />
                <InfoRow label="Date Reported" value={fmtDate(data.completed_at || new Date().toISOString())} />
              </div>
            </div>
          </div>

          {/* ── Results Table ── */}
          <div className="mb-8">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Test Results</h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr style={{ backgroundColor: BRAND }} className="text-white">
                    <th className="py-2.5 px-4 font-semibold w-1/3">Parameter</th>
                    <th className="py-2.5 px-4 font-semibold">Result</th>
                    <th className="py-2.5 px-4 font-semibold">Flag</th>
                    <th className="py-2.5 px-4 font-semibold">Unit</th>
                    <th className="py-2.5 px-4 font-semibold">Reference Range</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 italic bg-slate-50">
                        No result parameters found for this investigation.
                      </td>
                    </tr>
                  ) : (
                    results.map((res: any, i: number) => {
                      const styles = getFlagStyles(res.flagged);
                      const flagLabel = formatFlagLabel(res.flagged, res.interpretation);
                      
                      return (
                        <tr key={i} className="hover:bg-slate-50/80 transition-colors break-inside-avoid">
                          <td className="py-3 px-4 font-medium text-slate-800">{fmt(res.parameter_name)}</td>
                          <td className={`py-3 px-4 text-sm ${styles.text}`}>
                            {fmt(res.result_value)}
                          </td>
                          <td className="py-3 px-4">
                            {flagLabel !== 'Normal' ? (
                              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${styles.badge}`}>
                                {flagLabel}
                              </span>
                            ) : (
                              <span className="text-slate-300 text-[10px]">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-500">{fmt(res.unit)}</td>
                          <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                            {fmtRange(res.ref_low, res.ref_high)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Signatures & Footer (Forced to bottom via mt-auto) ── */}
        <div className="mt-auto px-10 pb-8 print:pb-12 break-inside-avoid">
          {/* Signatures */}
          <div className="grid grid-cols-3 gap-8 mb-8 pt-4">
            {[
              { name: data.results?.[0]?.reported_by_name, role: 'Medical Lab Scientist' },
              { name: data.results?.[0]?.reviewed_by_name, role: 'Reviewing Technologist' },
              { name: data.results?.[0]?.verified_by_name, role: 'Consultant Pathologist' },
            ].map((signer, idx) => (
              <div key={idx} className="text-center">
                <div className="h-10 flex items-end justify-center mb-1">
                  <span className="text-sm font-bold text-slate-800">{fmt(signer.name)}</span>
                </div>
                <div className="border-t border-slate-300 pt-1">
                  <p className="text-[9px] font-semibold text-slate-500 uppercase">{signer.role}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Hospital Address and Document Meta */}
          <div className="border-t-2 border-slate-200 pt-4 text-center">
            <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-widest mb-1">Medbookie Limited</h4>
            <p className="text-[10px] text-slate-500">
              Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              +234 705 648 2776 &nbsp;|&nbsp; info@Medbookiehospital.com
            </p>
            
            <div className="flex justify-between items-center text-[9px] text-slate-400 mt-4 px-4">
              <p>Generated electronically on {new Date().toLocaleString('en-GB')}</p>
              <p className="font-mono font-bold text-slate-500">ID: {data.reference_no}</p>
            </div>
            
            <p className="text-[8px] text-slate-300 text-center mt-2 uppercase tracking-widest">
              This report is computer-generated and electronically validated. Valid without physical signature.
            </p>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default LabReportPrintTemplate;



// import React, { useEffect, useState } from 'react';
// import { useParams } from 'react-router-dom';
// import { labService } from '../../../services/lab.service';
// import {
//   Loader2,
//   AlertCircle,
//   Printer,
//   CheckCircle2,
//   Clock,
//   Activity,
// } from 'lucide-react';

// /* ─── Helpers ──────────────────────────────────────── */
// const fmt = (v: string | number | null | undefined) => (v !== null && v !== undefined && v !== '' ? v : '—');
// const fmtDate = (v: string | null | undefined) =>
//   v ? new Date(v).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
// const fmtDateOnly = (v: string | null | undefined) =>
//   v ? new Date(v).toLocaleDateString('en-GB', { dateStyle: 'medium' }) : '—';
// const fmtRange = (low: any, high: any) => 
//   (low && high) ? `${low} - ${high}` : (low || high || '—');

// /* ─── Flagging Logic ───────────────────────────────── */
// const getFlagStyles = (f: string | null | undefined) => {
//   const flag = f?.toUpperCase();
//   if (!flag || flag === 'NORMAL' || flag === 'N') return { text: 'text-slate-700', badge: 'bg-slate-100 text-slate-600' };
//   if (flag === 'HH' || flag === 'LL' || flag === 'CRITICAL HIGH' || flag === 'CRITICAL LOW') return { text: 'text-red-600 font-bold', badge: 'bg-red-100 text-red-700 border-red-200' };
//   return { text: 'text-amber-600 font-semibold', badge: 'bg-amber-100 text-amber-700 border-amber-200' };
// };

// const formatFlagLabel = (code: string | null | undefined, interp: string | null | undefined) => {
//   if (interp) return interp;
//   const map: Record<string, string> = { H: 'High', HH: 'Critical High', L: 'Low', LL: 'Critical Low', A: 'Abnormal', N: 'Normal' };
//   return code ? (map[code.toUpperCase()] ?? code) : 'Normal';
// };

// /* ─── Micro-components ─────────────────────────────── */
// const BRAND = '#2A157c';

// const InfoRow = ({ label, value }: { label: string; value?: string | number | null }) => (
//   <div className="flex justify-between py-1 border-b border-slate-100 last:border-0 break-inside-avoid">
//     <span className="text-xs text-slate-500 font-medium">{label}</span>
//     <span className="text-xs font-semibold text-slate-900 text-right">{fmt(value)}</span>
//   </div>
// );

// /* ════════════════════════════════════════════════════════ */
// const LabReportPrintTemplate: React.FC = () => {
//   const { referenceNo } = useParams<{ referenceNo: string }>();
//   const [data, setData] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     const load = async () => {
//       try {
//         if (!referenceNo) throw new Error('No reference number provided.');
//         const result = await labService.getResultByRef(referenceNo);
//         if (!result) throw new Error('Report data not found.');
//         setData(result);
//         setTimeout(() => window.print(), 800);
//       } catch (err) {
//         setError('Unable to load the laboratory report.');
//       } finally {
//         setLoading(false);
//       }
//     };
//     load();
//   }, [referenceNo]);

//   if (loading) {
//     return (
//       <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
//         <Loader2 size={40} className="animate-spin mb-4" style={{ color: BRAND }} />
//         <p className="text-sm font-medium text-slate-600 animate-pulse">Preparing official report...</p>
//       </div>
//     );
//   }

//   if (error || !data) {
//     return (
//       <div className="flex items-center justify-center min-h-screen bg-slate-50 p-6">
//         <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm w-full border border-red-100">
//           <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
//           <h3 className="text-lg font-bold text-slate-800 mb-2">Report Unavailable</h3>
//           <p className="text-sm text-slate-500">{error}</p>
//         </div>
//       </div>
//     );
//   }

//   const results: any[] = data.results || [];
//   const wfStatus = (data.processing_status || data.order_status || '').toUpperCase();
//   const isCompleted = wfStatus === 'COMPLETED' || wfStatus === 'RELEASED';
//   const doctorName = data.doctor_name || data.requesting_doctor_name || data.attending_doctor_name;

//   return (
//     <div className="min-h-screen bg-slate-200 py-20 px-4 print:bg-white print:p-0 print:py-0 font-sans selection:bg-blue-100">
      
//       {/* ── CSS Override to remove browser URLs and force background colors ── */}
//       <style>
//         {`
//           @media print {
//             @page {
//               margin: 0; /* Removes default browser headers/footers (URL, dates) */
//             }
//             body {
//               -webkit-print-color-adjust: exact;
//               print-color-adjust: exact;
//             }
//           }
//         `}
//       </style>

//       {/* ── Screen Preview Toolbar (Hidden on Print) ── */}
//       <div className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 md:px-12 print:hidden z-50 shadow-sm">
//         <div className="flex items-center gap-3">
//           <Activity size={20} style={{ color: BRAND }} />
//           <div>
//             <h2 className="font-bold text-slate-800 text-sm leading-tight">Report Preview</h2>
//             <p className="text-[11px] text-slate-500 font-mono">{data.reference_no}</p>
//           </div>
//         </div>
//         <button
//           onClick={() => window.print()}
//           className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all shadow-md hover:shadow-lg active:scale-95"
//           style={{ backgroundColor: BRAND }}
//         >
//           <Printer size={16} /> Print Report
//         </button>
//       </div>

//       {/* ── A4 Print Container ── */}
//       <div className="w-full max-w-[210mm] min-h-[297mm] bg-white mx-auto shadow-2xl rounded-sm print:shadow-none print:rounded-none print:max-w-none print:w-full border border-slate-300 print:border-none relative flex flex-col">


//                   <div className="flex justify-between items-start border-b-2 p-6" style={{ backgroundColor: BRAND }}>
//              <div className="flex items-center gap-4">
//                <img src="/assets/logo-nobg.png" alt="Hospital Logo" className="w-30 h-20 object-contain" />
//                <div>
//                  {/* <h1 className="border-2 border-[red] text-xl font-black tracking-tight text-slate-900 uppercase">Medbookie</h1> */}
//                  {/* <p className="text-xs text-white mt-1 max-w-[250px] leading-relaxed">
//                    Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos
//                  </p> */}
//                </div>
//              </div>
//              <div className="text-right">
//                <h2 className="text-2xl font-black uppercase tracking-wider" style={{ color: "white" }}>Lab Report</h2>
//                <p className="text-xs font-bold text-white mt-1">Ref: <span className="font-mono text-white">{data.reference_no}</span></p>
//                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 uppercase">
//                  {isCompleted ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Clock size={12} className="text-amber-500" />}
//                  {wfStatus.replace('_', ' ')}
//                </div>
//              </div>
//            </div>


//         {/* ── Brand Header ── */}
//         {/* <div className="flex justify-between items-start border-b-4 p-8 print:pt-12" style={{ borderColor: BRAND }}>
//           <div className="flex items-center gap-4">
//             <img src="/assets/logo-nobg.png" alt="Hospital Logo" className="w-24 h-auto object-contain" />
//             <div>
//               <h1 className="text-2xl font-black tracking-tight uppercase" style={{ color: BRAND }}>
//                 Medbookie
//               </h1>
//               <p className="text-xs font-semibold text-slate-500 mt-1">Laboratory Services Division</p>
//             </div>
//           </div>
//           <div className="text-right">
//             <h2 className="text-xl font-black uppercase tracking-wider text-slate-800">Lab Report</h2>
//             <p className="text-xs font-bold text-slate-500 mt-1">Ref: <span className="font-mono text-slate-800">{data.reference_no}</span></p>
//             <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 uppercase">
//               {isCompleted ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Clock size={12} className="text-amber-500" />}
//               {wfStatus.replace('_', ' ')}
//             </div>
//           </div>
//         </div> */}

//         <div className="px-10 py-8 flex-1">
//           {/* ── Patient & Order Information Grid ── */}
//           <div className="grid grid-cols-2 gap-6 mb-8">
//             <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 break-inside-avoid">
//               <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Patient Details</h3>
//               <div className="space-y-1">
//                 <InfoRow label="Patient Name" value={data.patient_name} />
//                 <InfoRow label="MRN (File No.)" value={data.mrn} />
//                 <InfoRow label="Age / Gender" value={`${fmt(data.patient_age)} / ${fmt(data.gender)}`} />
//                 <InfoRow label="Date of Birth" value={fmtDateOnly(data.date_of_birth)} />
//                 <InfoRow label="Contact Phone" value={data.phone} />
//               </div>
//             </div>

//             <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 break-inside-avoid">
//               <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Investigation Details</h3>
//               <div className="space-y-1">
//                 <InfoRow label="Test Requested" value={data.service_name} />
//                 <InfoRow label="Requesting Doctor" value={doctorName} />
//                 <InfoRow label="Visit Reason" value={data.visit_reason} />
//                 <InfoRow label="Date Requested" value={fmtDate(data.ordered_at)} />
//                 <InfoRow label="Date Reported" value={fmtDate(data.completed_at || new Date().toISOString())} />
//               </div>
//             </div>
//           </div>

//           {/* ── Results Table ── */}
//           <div className="mb-8">
//             <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Test Results</h3>
//             <div className="border border-slate-200 rounded-lg overflow-hidden">
//               <table className="w-full text-left text-xs">
//                 <thead>
//                   <tr style={{ backgroundColor: BRAND }} className="text-white">
//                     <th className="py-2.5 px-4 font-semibold w-1/3">Parameter</th>
//                     <th className="py-2.5 px-4 font-semibold">Result</th>
//                     <th className="py-2.5 px-4 font-semibold">Flag</th>
//                     <th className="py-2.5 px-4 font-semibold">Unit</th>
//                     <th className="py-2.5 px-4 font-semibold">Reference Range</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-100">
//                   {results.length === 0 ? (
//                     <tr>
//                       <td colSpan={5} className="py-8 text-center text-slate-400 italic bg-slate-50">
//                         No result parameters found for this investigation.
//                       </td>
//                     </tr>
//                   ) : (
//                     results.map((res: any, i: number) => {
//                       const styles = getFlagStyles(res.flagged);
//                       const flagLabel = formatFlagLabel(res.flagged, res.interpretation);
                      
//                       return (
//                         <tr key={i} className="hover:bg-slate-50/80 transition-colors break-inside-avoid">
//                           <td className="py-3 px-4 font-medium text-slate-800">{fmt(res.parameter_name)}</td>
//                           <td className={`py-3 px-4 text-sm ${styles.text}`}>
//                             {fmt(res.result_value)}
//                           </td>
//                           <td className="py-3 px-4">
//                             {flagLabel !== 'Normal' ? (
//                               <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${styles.badge}`}>
//                                 {flagLabel}
//                               </span>
//                             ) : (
//                               <span className="text-slate-300 text-[10px]">—</span>
//                             )}
//                           </td>
//                           <td className="py-3 px-4 text-slate-500">{fmt(res.unit)}</td>
//                           <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
//                             {fmtRange(res.ref_low, res.ref_high)}
//                           </td>
//                         </tr>
//                       );
//                     })
//                   )}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         </div>

//         {/* ── Signatures & Footer (Forced to bottom via mt-auto) ── */}
//         <div className="mt-auto px-10 pb-8 print:pb-12 break-inside-avoid">
//           {/* Signatures */}
//           <div className="grid grid-cols-3 gap-8 mb-8 pt-4">
//             {[
//               { name: data.results?.[0]?.reported_by_name, role: 'Medical Lab Scientist' },
//               { name: data.results?.[0]?.reviewed_by_name, role: 'Reviewing Technologist' },
//               { name: data.results?.[0]?.verified_by_name, role: 'Consultant Pathologist' },
//             ].map((signer, idx) => (
//               <div key={idx} className="text-center">
//                 <div className="h-10 flex items-end justify-center mb-1">
//                   <span className="text-sm font-bold text-slate-800">{fmt(signer.name)}</span>
//                 </div>
//                 <div className="border-t border-slate-300 pt-1">
//                   <p className="text-[9px] font-semibold text-slate-500 uppercase">{signer.role}</p>
//                 </div>
//               </div>
//             ))}
//           </div>

//           {/* Hospital Address and Document Meta */}
//           <div className="border-t-2 border-slate-200 pt-4 text-center">
//             <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-widest mb-1">Medbookie Limited</h4>
//             <p className="text-[10px] text-slate-500">
//               Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos
//             </p>
//             <p className="text-[10px] text-slate-500 mt-0.5">
//               +234 705 648 2776 &nbsp;|&nbsp; lab@Medbookiehospital.com
//             </p>
            
//             <div className="flex justify-between items-center text-[9px] text-slate-400 mt-4 px-4">
//               <p>Generated electronically on {new Date().toLocaleString('en-GB')}</p>
//               <p className="font-mono font-bold text-slate-500">ID: {data.reference_no}</p>
//             </div>
            
//             <p className="text-[8px] text-slate-300 text-center mt-2">
//               This report is computer-generated and electronically validated. Valid without physical signature.
//             </p>
//           </div>
//         </div>
        
//       </div>
//     </div>
//   );
// };

// export default LabReportPrintTemplate;


// // import React, { useEffect, useState } from 'react';
// // import { useParams } from 'react-router-dom';
// // import { labService } from '../../../services/lab.service';
// // import {
// //   Loader2,
// //   AlertCircle,
// //   Printer,
// //   CheckCircle2,
// //   Clock,
// //   Activity,
// // } from 'lucide-react';

// // /* ─── Helpers ──────────────────────────────────────── */
// // const fmt = (v: string | number | null | undefined) => (v !== null && v !== undefined && v !== '' ? v : '—');
// // const fmtDate = (v: string | null | undefined) =>
// //   v ? new Date(v).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
// // const fmtDateOnly = (v: string | null | undefined) =>
// //   v ? new Date(v).toLocaleDateString('en-GB', { dateStyle: 'medium' }) : '—';
// // const fmtRange = (low: any, high: any) => 
// //   (low && high) ? `${low} - ${high}` : (low || high || '—');

// // /* ─── Flagging Logic ───────────────────────────────── */
// // const getFlagStyles = (f: string | null | undefined) => {
// //   const flag = f?.toUpperCase();
// //   if (!flag || flag === 'NORMAL' || flag === 'N') return { text: 'text-slate-700', badge: 'bg-slate-100 text-slate-600' };
// //   if (flag === 'HH' || flag === 'LL' || flag === 'CRITICAL HIGH' || flag === 'CRITICAL LOW') return { text: 'text-red-600 font-bold', badge: 'bg-red-100 text-red-700 border-red-200' };
// //   return { text: 'text-amber-600 font-semibold', badge: 'bg-amber-100 text-amber-700 border-amber-200' };
// // };

// // const formatFlagLabel = (code: string | null | undefined, interp: string | null | undefined) => {
// //   if (interp) return interp;
// //   const map: Record<string, string> = { H: 'High', HH: 'Critical High', L: 'Low', LL: 'Critical Low', A: 'Abnormal', N: 'Normal' };
// //   return code ? (map[code.toUpperCase()] ?? code) : 'Normal';
// // };

// // /* ─── Micro-components ─────────────────────────────── */
// // const BRAND = '#2A157c';

// // const InfoRow = ({ label, value }: { label: string; value?: string | number | null }) => (
// //   <div className="flex justify-between py-1 border-b border-slate-100 last:border-0">
// //     <span className="text-xs text-slate-500 font-medium">{label}</span>
// //     <span className="text-xs font-semibold text-slate-900 text-right">{fmt(value)}</span>
// //   </div>
// // );

// // /* ════════════════════════════════════════════════════════ */
// // const LabReportPrintTemplate: React.FC = () => {
// //   const { referenceNo } = useParams<{ referenceNo: string }>();
// //   const [data, setData] = useState<any>(null);
// //   const [loading, setLoading] = useState(true);
// //   const [error, setError] = useState('');

// //   useEffect(() => {
// //     const load = async () => {
// //       try {
// //         if (!referenceNo) throw new Error('No reference number provided.');
// //         const result = await labService.getResultByRef(referenceNo);
// //         if (!result) throw new Error('Report data not found.');
// //         setData(result);
// //         // Auto-trigger print slightly after render for seamless UX
// //         setTimeout(() => window.print(), 800);
// //       } catch (err) {
// //         setError('Unable to load the laboratory report.');
// //       } finally {
// //         setLoading(false);
// //       }
// //     };
// //     load();
// //   }, [referenceNo]);

// //   if (loading) {
// //     return (
// //       <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
// //         <Loader2 size={40} className="animate-spin mb-4" style={{ color: BRAND }} />
// //         <p className="text-sm font-medium text-slate-600 animate-pulse">Preparing official report...</p>
// //       </div>
// //     );
// //   }

// //   if (error || !data) {
// //     return (
// //       <div className="flex items-center justify-center min-h-screen bg-slate-50 p-6">
// //         <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm w-full border border-red-100">
// //           <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
// //           <h3 className="text-lg font-bold text-slate-800 mb-2">Report Unavailable</h3>
// //           <p className="text-sm text-slate-500">{error}</p>
// //         </div>
// //       </div>
// //     );
// //   }

// //   const results: any[] = data.results || [];
// //   const wfStatus = (data.processing_status || data.order_status || '').toUpperCase();
// //   const isCompleted = wfStatus === 'COMPLETED' || wfStatus === 'RELEASED';
// //   const doctorName = data.doctor_name || data.requesting_doctor_name || data.attending_doctor_name;

// //   return (
// //     <div className="min-h-screen bg-slate-200 py-20 px-4 print:bg-white print:p-0 print:py-0 font-sans selection:bg-blue-100">
      
// //       {/* ── Screen Preview Toolbar (Hidden on Print) ── */}
// //       <div className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 md:px-12 print:hidden z-50 shadow-sm">
// //         <div className="flex items-center gap-3">
// //           <Activity size={20} style={{ color: BRAND }} />
// //           <div>
// //             <h2 className="font-bold text-slate-800 text-sm leading-tight">Report Preview</h2>
// //             <p className="text-[11px] text-slate-500 font-mono">{data.reference_no}</p>
// //           </div>
// //         </div>
// //         <button
// //           onClick={() => window.print()}
// //           className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all shadow-md hover:shadow-lg active:scale-95"
// //           style={{ backgroundColor: BRAND }}
// //         >
// //           <Printer size={16} /> Print Report
// //         </button>
// //       </div>

// //       {/* ── A4 Print Container ── */}
// //       <div className="w-full max-w-[210mm] min-h-[297mm] bg-white mx-auto shadow-2xl rounded-sm print:shadow-none print:rounded-none print:max-w-none print:w-full border border-slate-300 print:border-none relative flex flex-col">
        
// //           <div className="flex justify-between items-start border-b-2 p-6" style={{ backgroundColor: BRAND }}>
// //             <div className="flex items-center gap-4">
// //               <img src="/assets/logo-nobg.png" alt="Hospital Logo" className="w-30 h-20 object-contain" />
// //               <div>
// //                 {/* <h1 className="border-2 border-[red] text-xl font-black tracking-tight text-slate-900 uppercase">Medbookie</h1> */}
// //                 {/* <p className="text-xs text-white mt-1 max-w-[250px] leading-relaxed">
// //                   Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos
// //                 </p> */}
// //               </div>
// //             </div>
// //             <div className="text-right">
// //               <h2 className="text-2xl font-black uppercase tracking-wider" style={{ color: "white" }}>Lab Report</h2>
// //               <p className="text-xs font-bold text-white mt-1">Ref: <span className="font-mono text-white">{data.reference_no}</span></p>
// //               <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 uppercase">
// //                 {isCompleted ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Clock size={12} className="text-amber-500" />}
// //                 {wfStatus.replace('_', ' ')}
// //               </div>
// //             </div>
// //           </div>

// //         <div className="px-10 py-10 flex-1">
// //           {/* ── Header Section ── */}


// //           {/* ── Patient & Order Information Grid ── */}
// //           <div className="grid grid-cols-2 gap-6 mb-8">
// //             {/* Patient Info Card */}
// //             <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
// //               <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
// //                 Patient Details
// //               </h3>
// //               <div className="space-y-1">
// //                 <InfoRow label="Patient Name" value={data.patient_name} />
// //                 <InfoRow label="MRN (File No.)" value={data.mrn} />
// //                 <InfoRow label="Age / Gender" value={`${fmt(data.patient_age)} / ${fmt(data.gender)}`} />
// //                 <InfoRow label="Date of Birth" value={fmtDateOnly(data.date_of_birth)} />
// //                 <InfoRow label="Contact Phone" value={data.phone} />
// //               </div>
// //             </div>

// //             {/* Clinical Info Card */}
// //             <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
// //               <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
// //                 Investigation Details
// //               </h3>
// //               <div className="space-y-1">
// //                 <InfoRow label="Test Requested" value={data.service_name} />
// //                 <InfoRow label="Requesting Doctor" value={doctorName} />
// //                 <InfoRow label="Visit Reason" value={data.visit_reason} />
// //                 <InfoRow label="Date Requested" value={fmtDate(data.ordered_at)} />
// //                 <InfoRow label="Date Reported" value={fmtDate(data.completed_at || new Date().toISOString())} />
// //               </div>
// //             </div>
// //           </div>

// //           {/* ── Results Table ── */}
// //           <div className="mb-8">
// //             <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Test Results</h3>
// //             <div className="border border-slate-200 rounded-lg overflow-hidden">
// //               <table className="w-full text-left text-xs">
// //                 <thead>
// //                   <tr style={{ backgroundColor: BRAND }} className="text-white">
// //                     <th className="py-2.5 px-4 font-semibold w-1/3">Parameter</th>
// //                     <th className="py-2.5 px-4 font-semibold">Result</th>
// //                     <th className="py-2.5 px-4 font-semibold">Flag</th>
// //                     <th className="py-2.5 px-4 font-semibold">Unit</th>
// //                     <th className="py-2.5 px-4 font-semibold">Reference Range</th>
// //                   </tr>
// //                 </thead>
// //                 <tbody className="divide-y divide-slate-100">
// //                   {results.length === 0 ? (
// //                     <tr>
// //                       <td colSpan={5} className="py-8 text-center text-slate-400 italic bg-slate-50">
// //                         No result parameters found for this investigation.
// //                       </td>
// //                     </tr>
// //                   ) : (
// //                     results.map((res: any, i: number) => {
// //                       const styles = getFlagStyles(res.flagged);
// //                       const flagLabel = formatFlagLabel(res.flagged, res.interpretation);
                      
// //                       return (
// //                         <tr key={i} className="hover:bg-slate-50/80 transition-colors">
// //                           <td className="py-3 px-4 font-medium text-slate-800">{fmt(res.parameter_name)}</td>
// //                           <td className={`py-3 px-4 text-sm ${styles.text}`}>
// //                             {fmt(res.result_value)}
// //                           </td>
// //                           <td className="py-3 px-4">
// //                             {flagLabel !== 'Normal' ? (
// //                               <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${styles.badge}`}>
// //                                 {flagLabel}
// //                               </span>
// //                             ) : (
// //                               <span className="text-slate-300 text-[10px]">—</span>
// //                             )}
// //                           </td>
// //                           <td className="py-3 px-4 text-slate-500">{fmt(res.unit)}</td>
// //                           <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
// //                             {fmtRange(res.ref_low, res.ref_high)}
// //                           </td>
// //                         </tr>
// //                       );
// //                     })
// //                   )}
// //                 </tbody>
// //               </table>
// //             </div>
// //           </div>
// //         </div>

// //         {/* ── Signatures & Footer (Pushed to bottom) ── */}
// //         <div className="mt-auto px-10 pb-8 pt-8">
// //           <div className="grid grid-cols-3 gap-8 mb-8">
// //             {[
// //               { name: data.results?.[0]?.reported_by_name, role: 'Medical Lab Scientist' },
// //               { name: data.results?.[0]?.reviewed_by_name, role: 'Reviewing Technologist' },
// //               { name: data.results?.[0]?.verified_by_name, role: 'Consultant Pathologist' },
// //             ].map((signer, idx) => (
// //               <div key={idx} className="text-center">
// //                 <div className="h-10 flex items-end justify-center mb-1">
// //                   {/* Digital Signature Image could go here if available */}
// //                   <span className="text-sm font-bold text-slate-800">{fmt(signer.name)}</span>
// //                 </div>
// //                 <div className="border-t border-slate-300 pt-1">
// //                   <p className="text-[9px] font-semibold text-slate-500 uppercase">{signer.role}</p>
// //                 </div>
// //               </div>
// //             ))}
// //           </div>

// //           <div className="border-t border-slate-200 pt-4 flex justify-between items-center text-[9px] text-slate-400">
// //             <p>Generated electronically on {new Date().toLocaleString('en-GB')}</p>
// //             <p>Page 1 of 1</p>
// //             <p className="font-mono">ID: {data.reference_no}</p>
// //           </div>
// //           <p className="text-[8px] text-slate-300 text-center mt-2">
// //             This report is computer-generated and electronically validated. Valid without physical signature.
// //           </p>
// //         </div>
        
// //       </div>
// //     </div>
// //   );
// // };

// // export default LabReportPrintTemplate;


// // // import React, { useEffect, useState } from 'react';
// // // import { useParams } from 'react-router-dom';
// // // import { labService } from '../../../services/lab.service';
// // // import {
// // //   Loader2,
// // //   AlertTriangle,
// // //   Printer,
// // //   CheckCircle2,
// // //   Clock,
// // //   User,
// // //   Stethoscope,
// // //   FlaskConical,
// // //   BarChart2,
// // //   ShieldCheck,
// // //   Send,
// // // } from 'lucide-react';

// // // /* ─── tiny helpers ──────────────────────────────────────── */
// // // // FIX: Added 'number' to allowed types so Age and Doctor ID render correctly
// // // const fmt = (v: string | number | null | undefined) => v || '—';
// // // const fmtDate = (v: string | null | undefined) =>
// // //   v ? new Date(v).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
// // // const fmtDateOnly = (v: string | null | undefined) =>
// // //   v ? new Date(v).toLocaleDateString('en-GB', { dateStyle: 'long' }) : '—';

// // // /* ─── flag helpers ──────────────────────────────────────── */
// // // const flagColor = (f: string | null | undefined) => {
// // //   if (!f || f === 'NORMAL' || f === 'N') return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
// // //   if (f === 'HH' || f === 'Critical High' || f === 'LL' || f === 'Critical Low') return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' };
// // //   return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
// // // };

// // // const flagLabel = (code: string | null | undefined, interp: string | null | undefined) => {
// // //   if (interp) return interp;
// // //   const map: Record<string, string> = {
// // //     H: 'High', HH: 'Critical High', L: 'Low', LL: 'Critical Low',
// // //     A: 'Abnormal', N: 'Normal',
// // //   };
// // //   return code ? (map[code] ?? code) : 'Normal';
// // // };

// // // /* ─── print-page atoms ──────────────────────────────────── */
// // // const BRAND = '#3B309A';

// // // const SectionHeader = ({ char, title, icon: Icon }: { char: string; title: string; icon?: React.ElementType }) => (
// // //   <div className="flex items-center mb-4 mt-7 rounded-sm overflow-hidden" style={{ background: BRAND }}>
// // //     <div className="w-10 h-7 flex items-center justify-center text-white font-extrabold text-xs border-r border-white/20 shrink-0">
// // //       {char}
// // //     </div>
// // //     <div className="flex items-center gap-2 pl-3 text-white font-extrabold text-[11px] uppercase tracking-widest">
// // //       {Icon && <Icon size={12} />}
// // //       {title}
// // //     </div>
// // //   </div>
// // // );

// // // // FIX: Added 'number' to the value prop types
// // // const Field = ({ label, value, wide }: { label: string; value?: string | number | null; wide?: boolean }) => (
// // //   <div className={`mb-2.5 ${wide ? 'col-span-2' : ''}`}>
// // //     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
// // //     <div className="border border-slate-200 bg-slate-50 rounded px-2.5 py-1.5 min-h-[26px] flex items-center">
// // //       <span className="text-[11px] font-bold text-slate-800 leading-tight">{fmt(value)}</span>
// // //     </div>
// // //   </div>
// // // );

// // // /* ════════════════════════════════════════════════════════ */
// // // const LabReportPrintTemplate: React.FC = () => {
// // //   const { referenceNo } = useParams<{ referenceNo: string }>();
// // //   const [data, setData] = useState<any>(null);
// // //   const [loading, setLoading] = useState(true);
// // //   const [error, setError] = useState('');

// // //   useEffect(() => {
// // //     const load = async () => {
// // //       try {
// // //         if (!referenceNo) throw new Error('No reference number');
// // //         const result = await labService.getResultByRef(referenceNo);
// // //         if (!result) throw new Error('No data returned');
// // //         setData(result);
// // //         setTimeout(() => window.print(), 1200);
// // //       } catch {
// // //         setError('Could not load lab result.');
// // //       } finally {
// // //         setLoading(false);
// // //       }
// // //     };
// // //     load();
// // //   }, [referenceNo]);

// // //   if (loading) {
// // //     return (
// // //       <div className="flex items-center justify-center min-h-screen bg-slate-50">
// // //         <div className="text-center">
// // //           <Loader2 size={48} className="animate-spin mx-auto mb-4" style={{ color: BRAND }} />
// // //           <p className="text-sm font-bold text-slate-500">Fetching laboratory report…</p>
// // //         </div>
// // //       </div>
// // //     );
// // //   }

// // //   if (error || !data) {
// // //     return (
// // //       <div className="flex items-center justify-center min-h-screen bg-slate-50">
// // //         <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
// // //           <AlertTriangle size={32} className="text-red-500 mx-auto mb-3" />
// // //           <p className="text-slate-600 font-semibold">{error || 'Unknown error'}</p>
// // //         </div>
// // //       </div>
// // //     );
// // //   }

// // //   const results: any[] = data.results || [];
// // //   const summary = data.summary || {};

// // //   /* status ribbon */
// // //   const wfStatus = data.processing_status || data.order_status || '';
// // //   const isReleased = wfStatus === 'RELEASED';
// // //   const isCompleted = wfStatus === 'COMPLETED' || isReleased;

// // //   /* TAT */
// // //   const tatMinutes = data.turnaround_time_minutes;
// // //   const tatDisplay = tatMinutes != null
// // //     ? tatMinutes >= 60
// // //       ? `${Math.floor(tatMinutes / 60)}h ${tatMinutes % 60}m`
// // //       : `${tatMinutes}m`
// // //     : null;

// // //   return (
// // //     <div
// // //       className="fixed inset-0 bg-slate-200 overflow-y-auto py-20 px-4 print:static print:bg-white print:p-0"
// // //       style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as any}
// // //     >
// // //       {/* ── Preview toolbar (hidden on print) ── */}
// // //       <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-8 print:hidden z-[100] shadow-md">
// // //         <div>
// // //           <p className="font-black text-sm">Lab Report Preview</p>
// // //           <p className="text-[10px] text-slate-400 font-mono">{data.reference_no}</p>
// // //         </div>
// // //         <button
// // //           onClick={() => window.print()}
// // //           className="flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all hover:opacity-90"
// // //           style={{ background: BRAND }}
// // //         >
// // //           <Printer size={15} /> Print Report
// // //         </button>
// // //       </div>

// // //       {/* ── A4 page ── */}
// // //       <div className="w-[210mm] min-h-[297mm] bg-white mx-auto shadow-2xl print:shadow-none print:m-0 border border-slate-300 px-10 py-10 print:border-none">

// // //         {/* ── Brand Header ── */}
// // //         <div className="flex items-stretch mb-0 rounded-sm overflow-hidden" style={{ background: BRAND, minHeight: 64 }}>
// // //           <div className="w-20 flex items-center justify-center border-r border-white/20 p-3 shrink-0">
// // //             <img src="/assets/logo-nobg.png" alt="Logo" className="w-12 object-contain" />
// // //           </div>
// // //           <div className="flex flex-col justify-center pl-5">
// // //             <h1 className="text-white text-2xl font-black tracking-tight leading-none uppercase">Laboratory Report</h1>
// // //             <p className="text-blue-200 text-[9px] mt-1 font-semibold">Official Clinical Investigation Results — Electronically Generated</p>
// // //           </div>
// // //           <div className="ml-auto px-6 flex flex-col justify-center text-right shrink-0">
// // //             <p className="text-blue-200 text-[9px] font-bold uppercase tracking-widest">Ref No.</p>
// // //             <p className="text-white text-[11px] font-black font-mono">{data.reference_no}</p>
// // //             <p className="text-blue-300 text-[9px] mt-1">{fmtDateOnly(data.ordered_at)}</p>
// // //           </div>
// // //         </div>

// // //         {/* Address strip */}
// // //         <div className="text-center py-2 border-b border-slate-200 mb-1">
// // //           <p className="text-[8px] text-slate-500 font-medium">
// // //             Medbookie Limited &nbsp;•&nbsp; Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos &nbsp;•&nbsp;
// // //             +234 705 648 2776 &nbsp;•&nbsp; lab@Medbookiehospital.com
// // //           </p>
// // //         </div>

// // //         {/* ── Status Banner ── */}
// // //         <div className={`flex items-center justify-between px-5 py-2.5 rounded-lg mb-3 mt-4 ${isReleased ? 'bg-emerald-50 border border-emerald-200' : isCompleted ? 'bg-blue-50 border border-blue-200' : 'bg-amber-50 border border-amber-200'}`}>
// // //           <div className="flex items-center gap-2">
// // //             {isReleased ? <Send size={14} className="text-emerald-600" /> : <CheckCircle2 size={14} className={isCompleted ? 'text-blue-600' : 'text-amber-600'} />}
// // //             <span className={`text-[10px] font-black uppercase tracking-widest ${isReleased ? 'text-emerald-800' : isCompleted ? 'text-blue-800' : 'text-amber-800'}`}>
// // //               Report Status: {wfStatus.replace('_', ' ')}
// // //             </span>
// // //           </div>
// // //           {tatDisplay && (
// // //             <div className="flex items-center gap-1.5">
// // //               <Clock size={11} className="text-slate-400" />
// // //               <span className="text-[9px] font-bold text-slate-500">TAT: {tatDisplay}</span>
// // //             </div>
// // //           )}
// // //         </div>

// // //         {/* ── Summary Stats ── */}
// // //         {/* {summary.total_parameters > 0 && (
// // //           <div className="grid grid-cols-4 gap-2 mb-2">
// // //             {[
// // //               { label: 'Total Parameters', value: summary.total_parameters, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
// // //               { label: 'Critical Results', value: summary.critical_results, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
// // //               { label: 'Abnormal Results', value: summary.abnormal_results, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
// // //               { label: 'Normal Results', value: summary.normal_results, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
// // //             ].map((s) => (
// // //               <div key={s.label} className={`rounded-lg border px-3 py-2 text-center ${s.bg}`}>
// // //                 <p className={`text-lg font-black leading-none ${s.color}`}>{s.value ?? 0}</p>
// // //                 <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{s.label}</p>
// // //               </div>
// // //             ))}
// // //           </div>
// // //         )} */}

// // //         {/* ── A. Patient Information ── */}
// // //         <SectionHeader char="A" title="Patient Information" icon={User} />
// // //         <div className="grid grid-cols-4 gap-x-3">
// // //           <div className="col-span-2"><Field label="Full Name" value={data.patient_name} /></div>
// // //           <Field label="MRN" value={data.mrn} />
// // //           <Field label="Gender" value={data.gender} />
// // //           <Field label="Date of Birth" value={fmtDateOnly(data.date_of_birth)} />
// // //           <div className="col-span-2"><Field label="Age" value={data.patient_age} /></div>
// // //           <Field label="Phone" value={data.phone} />
// // //         </div>

// // //         {/* ── B. Encounter / Visit ── */}
// // //         <SectionHeader char="B" title="Encounter / Visit Details" icon={Stethoscope} />
// // //         <div className="grid grid-cols-4 gap-x-3">
// // //           <div className="col-span-2"><Field label="Encounter Number" value={data.encounter_number} /></div>
// // //           <Field label="Encounter Type" value={data.encounter_type} />
// // //           <Field label="Specialty" value={data.specialty} />
// // //           <div className="col-span-2"><Field label="Visit Reason" value={data.visit_reason} /></div>
// // //           <div className="col-span-2"><Field label="Encounter Started" value={fmtDate(data.encounter_started_at)} /></div>
// // //         </div>

// // //         {/* FIX: Cleaned up Doctor rendering so it doesn't duplicate if Requesting is the same as Attending */}
// // //         {(data.doctor_name || data.requesting_doctor_name || data.attending_doctor_name) && (
// // //           <div className="grid grid-cols-4 gap-x-3 mt-2.5">
// // //             <div className="col-span-2">
// // //               <Field label="Attending / Requesting Doctor" value={data.doctor_name || data.requesting_doctor_name || data.attending_doctor_name} />
// // //             </div>
// // //             {/* <Field label="Doctor ID" value={data.doctor_id || data.requesting_doctor_id} /> */}
// // //             <Field label="Specialization" value={data.requesting_doctor_specialization || 'General'} />
// // //           </div>
// // //         )}

// // //         {/* ── C. Investigation Detail ── */}
// // //         <SectionHeader char="C" title="Investigation Detail" icon={FlaskConical} />
// // //         <div className="grid grid-cols-4 gap-x-3">
// // //           <div className="col-span-2"><Field label="Test / Service" value={data.service_name} /></div>
// // //           {/* <Field label="Service Code" value={data.service_code} />
// // //           <Field label="Order ID" value={data.order_id} /> */}

// // //           <div className="col-span-2"><Field label="Lab Reference No." value={data.reference_no} /></div>
// // //           <Field label="Order Status" value={data.order_status} />
// // //           {/* <Field label="Processing Status" value={data.processing_status} /> */}

// // //           <div className="col-span-2"><Field label="Date Requested" value={fmtDate(data.ordered_at)} /></div>
// // //           <div className="col-span-2"><Field label="Date Completed" value={fmtDate(data.completed_at)} /></div>
// // //         </div>

// // //         {/* ── D. Results & Findings ── */}
// // //         <SectionHeader char="D" title="Results &amp; Findings" icon={BarChart2} />
// // //         <table className="w-full text-left border border-slate-200 rounded-lg overflow-hidden mb-4" style={{ fontSize: 10 }}>
// // //           <thead>
// // //             <tr style={{ background: BRAND }}>
// // //               {['Parameter', 'Result', 'Unit', 'Ref Low', 'Ref High', 'Critical Low', 'Critical High', 'Flag / Interpretation', 'Version'].map((h) => (
// // //                 <th key={h} className="py-2 px-2 text-white font-black text-[8px] uppercase tracking-widest whitespace-nowrap">{h}</th>
// // //               ))}
// // //             </tr>
// // //           </thead>
// // //           <tbody className="divide-y divide-slate-100">
// // //             {results.length === 0 && (
// // //               <tr><td colSpan={9} className="py-4 text-center text-xs text-slate-400 italic">No result entries recorded.</td></tr>
// // //             )}
// // //             {results.map((res: any, i: number) => {
// // //               const fc = flagColor(res.flagged);
// // //               const fl = flagLabel(res.flagged, res.interpretation);
// // //               return (
// // //                 <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
// // //                   <td className="py-2 px-2 font-bold text-slate-800">{fmt(res.parameter_name)}</td>
// // //                   <td className={`py-2 px-2 font-black text-center ${res.flagged && res.flagged !== 'NORMAL' && res.flagged !== 'N' ? 'text-red-700' : 'text-blue-700'}`} style={{ color: res.flagged && res.flagged !== 'N' ? undefined : BRAND }}>
// // //                     {fmt(res.result_value)}
// // //                   </td>
// // //                   <td className="py-2 px-2 text-slate-500 text-center">{fmt(res.unit)}</td>
// // //                   <td className="py-2 px-2 text-slate-600 text-center font-mono">{fmt(res.ref_low)}</td>
// // //                   <td className="py-2 px-2 text-slate-600 text-center font-mono">{fmt(res.ref_high)}</td>
// // //                   <td className="py-2 px-2 text-red-500 text-center font-mono">{fmt(res.critical_low)}</td>
// // //                   <td className="py-2 px-2 text-red-500 text-center font-mono">{fmt(res.critical_high)}</td>
// // //                   <td className="py-2 px-2">
// // //                     <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-black border uppercase ${fc.bg} ${fc.text} ${fc.border}`}>
// // //                       {fl}
// // //                     </span>
// // //                   </td>
// // //                   <td className="py-2 px-2 text-slate-400 text-center font-mono text-[9px]">v{res.version_no ?? 1}</td>
// // //                 </tr>
// // //               );
// // //             })}
// // //           </tbody>
// // //         </table>

// // //         {/* ── Signatures ── */}
// // //         <div className="grid grid-cols-3 gap-12 mt-14 px-6">
// // //           {[
// // //             { name: data.results?.[0]?.reported_by_name || '—', role: 'Medical Laboratory Scientist' },
// // //             { name: data.results?.[0]?.reviewed_by_name || '—', role: 'Reviewing Technologist' },
// // //             { name: data.results?.[0]?.verified_by_name || '—', role: 'Consultant Pathologist' },
// // //           ].map((s) => (
// // //             <div key={s.role} className="text-center">
// // //               <p className="text-[10px] font-black text-slate-700 mb-6">{s.name}</p>
// // //               <div className="border-b-2 border-slate-300 mb-1" />
// // //               <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{s.role}</p>
// // //             </div>
// // //           ))}
// // //         </div>

// // //         {/* ── Footer ── */}
// // //         <div className="mt-10 pt-4 border-t border-slate-200 text-center">
// // //           <p className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.15em]">
// // //             Medbookie • {data.reference_no} • Generated {new Date().toLocaleString('en-GB')}
// // //           </p>
// // //           <p className="text-[7px] text-slate-300 mt-0.5">This report is computer-generated and electronically validated. No signature required if stamped.</p>
// // //         </div>

// // //       </div>
// // //     </div>
// // //   );
// // // };

// // // export default LabReportPrintTemplate;

// // // import React, { useEffect, useState } from 'react';
// // // import { useParams } from 'react-router-dom';
// // // import { labService } from '../../../services/lab.service';
// // // import {
// // //   Loader2,
// // //   AlertTriangle,
// // //   Printer,
// // //   CheckCircle2,
// // //   Clock,
// // //   User,
// // //   Stethoscope,
// // //   FlaskConical,
// // //   BarChart2,
// // //   ShieldCheck,
// // //   Send,
// // // } from 'lucide-react';

// // // /* ─── tiny helpers ──────────────────────────────────────── */
// // // const fmt = (v: string | null | undefined) => v || '—';
// // // const fmtDate = (v: string | null | undefined) =>
// // //   v ? new Date(v).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
// // // const fmtDateOnly = (v: string | null | undefined) =>
// // //   v ? new Date(v).toLocaleDateString('en-GB', { dateStyle: 'long' }) : '—';

// // // /* ─── flag helpers ──────────────────────────────────────── */
// // // const flagColor = (f: string | null | undefined) => {
// // //   if (!f || f === 'NORMAL' || f === 'N') return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
// // //   if (f === 'HH' || f === 'Critical High' || f === 'LL' || f === 'Critical Low') return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' };
// // //   return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
// // // };

// // // const flagLabel = (code: string | null | undefined, interp: string | null | undefined) => {
// // //   if (interp) return interp;
// // //   const map: Record<string, string> = {
// // //     H: 'High', HH: 'Critical High', L: 'Low', LL: 'Critical Low',
// // //     A: 'Abnormal', N: 'Normal',
// // //   };
// // //   return code ? (map[code] ?? code) : 'Normal';
// // // };

// // // /* ─── print-page atoms ──────────────────────────────────── */
// // // const BRAND = '#3B309A';

// // // const SectionHeader = ({ char, title, icon: Icon }: { char: string; title: string; icon?: React.ElementType }) => (
// // //   <div className="flex items-center mb-4 mt-7 rounded-sm overflow-hidden" style={{ background: BRAND }}>
// // //     <div className="w-10 h-7 flex items-center justify-center text-white font-extrabold text-xs border-r border-white/20 shrink-0">
// // //       {char}
// // //     </div>
// // //     <div className="flex items-center gap-2 pl-3 text-white font-extrabold text-[11px] uppercase tracking-widest">
// // //       {Icon && <Icon size={12} />}
// // //       {title}
// // //     </div>
// // //   </div>
// // // );

// // // const Field = ({ label, value, wide }: { label: string; value?: string | null; wide?: boolean }) => (
// // //   <div className={`mb-2.5 ${wide ? 'col-span-2' : ''}`}>
// // //     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
// // //     <div className="border border-slate-200 bg-slate-50 rounded px-2.5 py-1.5 min-h-[26px] flex items-center">
// // //       <span className="text-[11px] font-bold text-slate-800 leading-tight">{fmt(value)}</span>
// // //     </div>
// // //   </div>
// // // );

// // // /* ════════════════════════════════════════════════════════ */
// // // const LabReportPrintTemplate: React.FC = () => {
// // //   const { referenceNo } = useParams<{ referenceNo: string }>();
// // //   const [data, setData] = useState<any>(null);
// // //   const [loading, setLoading] = useState(true);
// // //   const [error, setError] = useState('');

// // //   useEffect(() => {
// // //     const load = async () => {
// // //       try {
// // //         if (!referenceNo) throw new Error('No reference number');
// // //         const result = await labService.getResultByRef(referenceNo);
// // //         if (!result) throw new Error('No data returned');
// // //         setData(result);
// // //         setTimeout(() => window.print(), 1200);
// // //       } catch {
// // //         setError('Could not load lab result.');
// // //       } finally {
// // //         setLoading(false);
// // //       }
// // //     };
// // //     load();
// // //   }, [referenceNo]);

// // //   if (loading) {
// // //     return (
// // //       <div className="flex items-center justify-center min-h-screen bg-slate-50">
// // //         <div className="text-center">
// // //           <Loader2 size={48} className="animate-spin mx-auto mb-4" style={{ color: BRAND }} />
// // //           <p className="text-sm font-bold text-slate-500">Fetching laboratory report…</p>
// // //         </div>
// // //       </div>
// // //     );
// // //   }

// // //   if (error || !data) {
// // //     return (
// // //       <div className="flex items-center justify-center min-h-screen bg-slate-50">
// // //         <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
// // //           <AlertTriangle size={32} className="text-red-500 mx-auto mb-3" />
// // //           <p className="text-slate-600 font-semibold">{error || 'Unknown error'}</p>
// // //         </div>
// // //       </div>
// // //     );
// // //   }

// // //   const results: any[] = data.results || [];

// // //   /* summary */
// // //   const summary = data.summary || {};

// // //   /* status ribbon */
// // //   const wfStatus = data.processing_status || data.order_status || '';
// // //   const isReleased = wfStatus === 'RELEASED';
// // //   const isCompleted = wfStatus === 'COMPLETED' || isReleased;

// // //   /* TAT */
// // //   const tatMinutes = data.turnaround_time_minutes;
// // //   const tatDisplay = tatMinutes != null
// // //     ? tatMinutes >= 60
// // //       ? `${Math.floor(tatMinutes / 60)}h ${tatMinutes % 60}m`
// // //       : `${tatMinutes}m`
// // //     : null;

// // //   return (
// // //     <div
// // //       className="fixed inset-0 bg-slate-200 overflow-y-auto py-20 px-4 print:static print:bg-white print:p-0"
// // //       style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as any}
// // //     >
// // //       {/* ── Preview toolbar (hidden on print) ── */}
// // //       <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-8 print:hidden z-[100] shadow-md">
// // //         <div>
// // //           <p className="font-black text-sm">Lab Report Preview</p>
// // //           <p className="text-[10px] text-slate-400 font-mono">{data.reference_no}</p>
// // //         </div>
// // //         <button
// // //           onClick={() => window.print()}
// // //           className="flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all hover:opacity-90"
// // //           style={{ background: BRAND }}
// // //         >
// // //           <Printer size={15} /> Print Report
// // //         </button>
// // //       </div>

// // //       {/* ── A4 page ── */}
// // //       <div className="w-[210mm] min-h-[297mm] bg-white mx-auto shadow-2xl print:shadow-none print:m-0 border border-slate-300 px-10 py-10 print:border-none">

// // //         {/* ── Brand Header ── */}
// // //         <div className="flex items-stretch mb-0 rounded-sm overflow-hidden" style={{ background: BRAND, minHeight: 64 }}>
// // //           <div className="w-20 flex items-center justify-center border-r border-white/20 p-3 shrink-0">
// // //             <img src="/assets/login-bg.jpeg" alt="Logo" className="w-12 object-contain" />
// // //           </div>
// // //           <div className="flex flex-col justify-center pl-5">
// // //             <h1 className="text-white text-2xl font-black tracking-tight leading-none uppercase">Laboratory Report</h1>
// // //             <p className="text-blue-200 text-[9px] mt-1 font-semibold">Official Clinical Investigation Results — Electronically Generated</p>
// // //           </div>
// // //           <div className="ml-auto px-6 flex flex-col justify-center text-right shrink-0">
// // //             <p className="text-blue-200 text-[9px] font-bold uppercase tracking-widest">Ref No.</p>
// // //             <p className="text-white text-[11px] font-black font-mono">{data.reference_no}</p>
// // //             <p className="text-blue-300 text-[9px] mt-1">{fmtDateOnly(data.ordered_at)}</p>
// // //           </div>
// // //         </div>

// // //         {/* Address strip */}
// // //         <div className="text-center py-2 border-b border-slate-200 mb-1">
// // //           <p className="text-[8px] text-slate-500 font-medium">
// // //             Medbookie Limited &nbsp;•&nbsp; Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos &nbsp;•&nbsp;
// // //             +234 705 648 2776 &nbsp;•&nbsp; info@Medbookiehospital.com
// // //           </p>
// // //         </div>

// // //         {/* ── Status Banner ── */}
// // //         <div className={`flex items-center justify-between px-5 py-2.5 rounded-lg mb-3 mt-4 ${isReleased ? 'bg-emerald-50 border border-emerald-200' : isCompleted ? 'bg-blue-50 border border-blue-200' : 'bg-amber-50 border border-amber-200'}`}>
// // //           <div className="flex items-center gap-2">
// // //             {isReleased ? <Send size={14} className="text-emerald-600" /> : <CheckCircle2 size={14} className={isCompleted ? 'text-blue-600' : 'text-amber-600'} />}
// // //             <span className={`text-[10px] font-black uppercase tracking-widest ${isReleased ? 'text-emerald-800' : isCompleted ? 'text-blue-800' : 'text-amber-800'}`}>
// // //               Report Status: {wfStatus.replace('_', ' ')}
// // //             </span>
// // //           </div>
// // //           {tatDisplay && (
// // //             <div className="flex items-center gap-1.5">
// // //               <Clock size={11} className="text-slate-400" />
// // //               <span className="text-[9px] font-bold text-slate-500">TAT: {tatDisplay}</span>
// // //             </div>
// // //           )}
// // //         </div>

// // //         {/* ── Summary Stats ── */}
// // //         {summary.total_parameters > 0 && (
// // //           <div className="grid grid-cols-4 gap-2 mb-2">
// // //             {[
// // //               { label: 'Total Parameters', value: summary.total_parameters, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
// // //               { label: 'Critical Results', value: summary.critical_results, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
// // //               { label: 'Abnormal Results', value: summary.abnormal_results, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
// // //               { label: 'Normal Results', value: summary.normal_results, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
// // //             ].map((s) => (
// // //               <div key={s.label} className={`rounded-lg border px-3 py-2 text-center ${s.bg}`}>
// // //                 <p className={`text-lg font-black leading-none ${s.color}`}>{s.value ?? 0}</p>
// // //                 <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{s.label}</p>
// // //               </div>
// // //             ))}
// // //           </div>
// // //         )}

// // //         {/* ── A. Patient Information ── */}
// // //         <SectionHeader char="A" title="Patient Information" icon={User} />
// // //         <div className="grid grid-cols-4 gap-x-3">
// // //           <div className="col-span-2"><Field label="Full Name" value={data.patient_name} /></div>
// // //           <Field label="MRN" value={data.mrn} />
// // //           <Field label="Gender" value={data.gender} />

// // //           <Field label="Date of Birth" value={fmtDateOnly(data.date_of_birth)} />
// // //           <div className="col-span-2"><Field label="Age" value={data.patient_age} /></div>
// // //           <Field label="Phone" value={data.phone} />
// // //         </div>

// // //         {/* ── B. Encounter / Visit ── */}
// // //         <SectionHeader char="B" title="Encounter / Visit Details" icon={Stethoscope} />
// // //         <div className="grid grid-cols-4 gap-x-3">
// // //           <div className="col-span-2"><Field label="Encounter Number" value={data.encounter_number} /></div>
// // //           <Field label="Encounter Type" value={data.encounter_type} />
// // //           <Field label="Specialty" value={data.specialty} />

// // //           <div className="col-span-2"><Field label="Visit Reason" value={data.visit_reason} /></div>
// // //           <div className="col-span-2"><Field label="Encounter Started" value={fmtDate(data.encounter_started_at)} /></div>
// // //         </div>

// // //         {/* Requesting / Attending Doctors */}
// // //         {(data.requesting_doctor_name || data.attending_doctor_name || data.doctor_name) && (
// // //           <div className="grid grid-cols-4 gap-x-3">
// // //             {(data.requesting_doctor_name || data.doctor_name) && (
// // //               <>
// // //                 <div className="col-span-2"><Field label="Requesting Doctor" value={data.requesting_doctor_name || data.doctor_name} /></div>
// // //                 <Field label="Code" value={data.requesting_doctor_code || data.doctor_id} />
// // //                 <Field label="Specialization" value={data.requesting_doctor_specialization} />
// // //               </>
// // //             )}
// // //             {data.attending_doctor_name && (
// // //               <>
// // //                 <div className="col-span-2"><Field label="Attending Doctor" value={data.attending_doctor_name} /></div>
// // //                 <Field label="Code" value={data.attending_doctor_code} />
// // //                 <Field label="Specialization" value={data.attending_doctor_specialization} />
// // //               </>
// // //             )}
// // //           </div>
// // //         )}

// // //         {/* ── C. Investigation Detail ── */}
// // //         <SectionHeader char="C" title="Investigation Detail" icon={FlaskConical} />
// // //         <div className="grid grid-cols-4 gap-x-3">
// // //           <div className="col-span-2"><Field label="Test / Service" value={data.service_name} /></div>
// // //           <Field label="Service Code" value={data.service_code} />
// // //           <Field label="Order ID" value={data.order_id ? String(data.order_id) : null} />

// // //           <div className="col-span-2"><Field label="Lab Reference No." value={data.reference_no} /></div>
// // //           <Field label="Order Status" value={data.order_status} />
// // //           <Field label="Processing Status" value={data.processing_status} />

// // //           <div className="col-span-2"><Field label="Date Ordered" value={fmtDate(data.ordered_at)} /></div>
// // //           <div className="col-span-2"><Field label="Date Completed" value={fmtDate(data.completed_at)} /></div>
// // //         </div>

// // //         {/* ── D. Results & Findings ── */}
// // //         <SectionHeader char="D" title="Results &amp; Findings" icon={BarChart2} />
// // //         <table className="w-full text-left border border-slate-200 rounded-lg overflow-hidden mb-4" style={{ fontSize: 10 }}>
// // //           <thead>
// // //             <tr style={{ background: BRAND }}>
// // //               {['Parameter', 'Result', 'Unit', 'Ref Low', 'Ref High', 'Critical Low', 'Critical High', 'Flag / Interpretation', 'Version'].map((h) => (
// // //                 <th key={h} className="py-2 px-2 text-white font-black text-[8px] uppercase tracking-widest whitespace-nowrap">{h}</th>
// // //               ))}
// // //             </tr>
// // //           </thead>
// // //           <tbody className="divide-y divide-slate-100">
// // //             {results.length === 0 && (
// // //               <tr><td colSpan={9} className="py-4 text-center text-xs text-slate-400 italic">No result entries recorded.</td></tr>
// // //             )}
// // //             {results.map((res: any, i: number) => {
// // //               const fc = flagColor(res.flagged);
// // //               const fl = flagLabel(res.flagged, res.interpretation);
// // //               return (
// // //                 <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
// // //                   <td className="py-2 px-2 font-bold text-slate-800">{fmt(res.parameter_name)}</td>
// // //                   <td className={`py-2 px-2 font-black text-center ${res.flagged && res.flagged !== 'NORMAL' && res.flagged !== 'N' ? 'text-red-700' : 'text-blue-700'}`} style={{ color: res.flagged && res.flagged !== 'N' ? undefined : BRAND }}>
// // //                     {fmt(res.result_value)}
// // //                   </td>
// // //                   <td className="py-2 px-2 text-slate-500 text-center">{fmt(res.unit)}</td>
// // //                   <td className="py-2 px-2 text-slate-600 text-center font-mono">{fmt(res.ref_low)}</td>
// // //                   <td className="py-2 px-2 text-slate-600 text-center font-mono">{fmt(res.ref_high)}</td>
// // //                   <td className="py-2 px-2 text-red-500 text-center font-mono">{fmt(res.critical_low)}</td>
// // //                   <td className="py-2 px-2 text-red-500 text-center font-mono">{fmt(res.critical_high)}</td>
// // //                   <td className="py-2 px-2">
// // //                     <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-black border uppercase ${fc.bg} ${fc.text} ${fc.border}`}>
// // //                       {fl}
// // //                     </span>
// // //                   </td>
// // //                   <td className="py-2 px-2 text-slate-400 text-center font-mono text-[9px]">v{res.version_no ?? 1}</td>
// // //                 </tr>
// // //               );
// // //             })}
// // //           </tbody>
// // //         </table>

// // //         {/* ── E. Audit Trail ── */}
// // //         {/* results.length > 0 && (
// // //           <>
// // //             <SectionHeader char="E" title="Audit Trail" icon={ShieldCheck} />
// // //             <table className="w-full text-left border border-slate-200 rounded-lg overflow-hidden mb-4" style={{ fontSize: 9 }}>
// // //               <thead>
// // //                 <tr className="bg-slate-100 border-b border-slate-200">
// // //                   {['Parameter', 'Reported By', 'Reported At', 'Reviewed By', 'Reviewed At', 'Verified By', 'Verified At', 'Released By', 'Released At'].map((h) => (
// // //                     <th key={h} className="py-1.5 px-2 text-[8px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
// // //                   ))}
// // //                 </tr>
// // //               </thead>
// // //               <tbody className="divide-y divide-slate-100">
// // //                 {results.map((res: any, i: number) => (
// // //                   <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
// // //                     <td className="py-1.5 px-2 font-bold text-slate-700">{fmt(res.parameter_name)}</td>
// // //                     <td className="py-1.5 px-2 text-slate-600">{fmt(res.reported_by_name)}</td>
// // //                     <td className="py-1.5 px-2 text-slate-500 font-mono whitespace-nowrap">{fmtDate(res.reported_at)}</td>
// // //                     <td className="py-1.5 px-2 text-slate-600">{fmt(res.reviewed_by_name)}</td>
// // //                     <td className="py-1.5 px-2 text-slate-500 font-mono whitespace-nowrap">{fmtDate(res.reviewed_at)}</td>
// // //                     <td className="py-1.5 px-2 text-slate-600">{fmt(res.verified_by_name)}</td>
// // //                     <td className="py-1.5 px-2 text-slate-500 font-mono whitespace-nowrap">{fmtDate(res.verified_at)}</td>
// // //                     <td className="py-1.5 px-2 text-slate-600">{fmt(res.released_by_name)}</td>
// // //                     <td className="py-1.5 px-2 text-slate-500 font-mono whitespace-nowrap">{fmtDate(res.released_at)}</td>
// // //                   </tr>
// // //                 ))}
// // //               </tbody>
// // //             </table>
// // //           </>
// // //         ) */}

// // //         {/* ── F. Comments / Remarks ── */}
// // //         {/* results.some((r: any) => r.result_comment || r.review_comment || r.verification_comment || r.amendment_reason) && (
// // //           <>
// // //             <SectionHeader char="F" title="Comments &amp; Remarks" />
// // //             <div className="space-y-2 mb-4">
// // //               {results.map((res: any, i: number) => (
// // //                 <React.Fragment key={i}>
// // //                   {res.result_comment && (
// // //                     <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
// // //                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Result Comment — {res.parameter_name}</p>
// // //                       <p className="text-[11px] font-semibold text-slate-700 italic">"{res.result_comment}"</p>
// // //                     </div>
// // //                   )}
// // //                   {res.review_comment && (
// // //                     <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
// // //                       <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest mb-1">Technician Review — {res.parameter_name}</p>
// // //                       <p className="text-[11px] font-semibold text-amber-900 italic">"{res.review_comment}"</p>
// // //                     </div>
// // //                   )}
// // //                   {res.verification_comment && (
// // //                     <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
// // //                       <p className="text-[8px] font-black text-purple-600 uppercase tracking-widest mb-1">Pathologist Verification — {res.parameter_name}</p>
// // //                       <p className="text-[11px] font-semibold text-purple-900 italic">"{res.verification_comment}"</p>
// // //                     </div>
// // //                   )}
// // //                   {res.amendment_reason && (
// // //                     <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
// // //                       <p className="text-[8px] font-black text-red-600 uppercase tracking-widest mb-1">Amendment Reason — {res.parameter_name}</p>
// // //                       <p className="text-[11px] font-semibold text-red-900 italic">"{res.amendment_reason}"</p>
// // //                     </div>
// // //                   )}
// // //                 </React.Fragment>
// // //               ))}
// // //             </div>
// // //           </>
// // //         )}

// // //         {/* ── Signatures ── */}
// // //         <div className="grid grid-cols-3 gap-12 mt-14 px-6">
// // //           {[
// // //             { name: data.results?.[0]?.reported_by_name || '—', role: 'Medical Laboratory Scientist' },
// // //             { name: data.results?.[0]?.reviewed_by_name || '—', role: 'Reviewing Technologist' },
// // //             { name: data.results?.[0]?.verified_by_name || '—', role: 'Consultant Pathologist' },
// // //           ].map((s) => (
// // //             <div key={s.role} className="text-center">
// // //               <p className="text-[10px] font-black text-slate-700 mb-6">{s.name}</p>
// // //               <div className="border-b-2 border-slate-300 mb-1" />
// // //               <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{s.role}</p>
// // //             </div>
// // //           ))}
// // //         </div>

// // //         {/* ── Footer ── */}
// // //         <div className="mt-10 pt-4 border-t border-slate-200 text-center">
// // //           <p className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.15em]">
// // //             Medbookie • {data.reference_no} • Generated {new Date().toLocaleString('en-GB')}
// // //           </p>
// // //           <p className="text-[7px] text-slate-300 mt-0.5">This report is computer-generated and electronically validated. No signature required if stamped.</p>
// // //         </div>

// // //       </div>
// // //     </div>
// // //   );
// // // };

// // // export default LabReportPrintTemplate;
