
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { labService } from '../services/lab.service';
import PrintTemplate from './PrintTemplate';
import { Loader2, Printer, AlertTriangle } from 'lucide-react';

const LabPrintView: React.FC = () => {
  const { referenceNo } = useParams<{ referenceNo: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!referenceNo) return;
      try {
        const result = await labService.getResultByRef(referenceNo);
        setData(result);
        
        // Auto-print after a short delay to ensure rendering
        setTimeout(() => {
           window.print();
        }, 1000);
        
      } catch (err) {
        setError('Could not load lab result. Please check the reference number.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [referenceNo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
           <Loader2 size={48} className="animate-spin text-[#3B309A] mx-auto mb-4" />
           <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Preparing Document...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
         <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
               <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Document Error</h3>
            <p className="text-slate-500">{error || 'Result data unavailable.'}</p>
         </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-100 h-screen w-full overflow-y-auto print:bg-white print:h-auto print:overflow-visible">
      {/* Web-only controls */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-8 print:hidden z-50 shadow-md">
         <p className="font-bold text-sm">Print Preview</p>
         <button 
           onClick={() => window.print()}
           className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all"
         >
           <Printer size={16} /> Print Now
         </button>
      </div>

      <div className="pt-20 pb-10 print:pt-0 print:pb-0">
        <PrintTemplate 
          title="Laboratory Investigation Report" 
          subtitle={`Reference No: ${data.reference_no}`}
        >
          <div className="space-y-8">
             {/* Patient Demographics Grid */}
             <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-[#3B309A]/5 border-b border-slate-200 px-4 py-2">
                   <h3 className="text-xs font-black text-[#3B309A] uppercase tracking-widest">Patient Demographics</h3>
                </div>
                <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-8">
                   <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name</p>
                      <p className="text-sm font-black text-slate-900 truncate">{data.first_name} {data.last_name}</p>
                   </div>
                   <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hospital No (MRN)</p>
                      <p className="text-sm font-black text-slate-900">{data.mrn || 'N/A'}</p>
                   </div>
                   <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Encounter ID</p>
                      <p className="text-sm font-black text-slate-900 truncate">{data.encounter_number}</p>
                   </div>
                   <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date Ordered</p>
                      <p className="text-sm font-black text-slate-900">{new Date(data.ordered_at).toLocaleDateString()}</p>
                   </div>
                </div>
             </div>

             {/* Test Info */}
             <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4">
                <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Investigation</p>
                   <p className="text-xl font-black text-[#3B309A]">{data.service_name || data.sample_name}</p>
                </div>
                <div className="text-right space-y-1.5">
                   <div>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Report Status</p>
                     <span className={`inline-block px-3 py-1 text-[10px] font-black uppercase rounded border print:border-slate-300 print:text-slate-800 ${
                       data.workflow_status === 'RELEASED'
                         ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                         : data.workflow_status === 'VERIFIED'
                           ? 'bg-blue-50 text-blue-700 border-blue-100'
                           : data.workflow_status === 'TECH_REVIEW'
                             ? 'bg-purple-50 text-purple-700 border-purple-100'
                             : data.workflow_status === 'COMPLETED'
                               ? 'bg-teal-50 text-teal-700 border-teal-100'
                               : data.workflow_status === 'AMENDED'
                                 ? 'bg-orange-50 text-orange-700 border-orange-100'
                                 : 'bg-amber-50 text-amber-700 border-amber-100'
                     }`}>
                       {data.workflow_status || 'PENDING'}
                     </span>
                   </div>
                   {data.ordered_at && data.completed_at && (() => {
                     const start = new Date(data.ordered_at).getTime();
                     const end = new Date(data.completed_at).getTime();
                     const diffMs = end - start;
                     const totalMins = Math.floor(diffMs / 60000);
                     const hours = Math.floor(totalMins / 60);
                     const mins = totalMins % 60;
                     return (
                       <div>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TAT</p>
                         <p className="text-xs font-black text-slate-700">{hours}h {mins}m</p>
                       </div>
                     );
                   })()}
                </div>
             </div>

             {/* Results Table */}
             <div className="mt-6">
                <table className="w-full text-left text-sm">
                   <thead>
                      <tr className="border-b-2 border-slate-200">
                         <th className="py-3 px-2 font-black text-slate-600 uppercase text-[10px] tracking-widest">Parameter</th>
                         <th className="py-3 px-2 font-black text-slate-600 uppercase text-[10px] tracking-widest text-center">Result</th>
                         <th className="py-3 px-2 font-black text-slate-600 uppercase text-[10px] tracking-widest text-center">Unit</th>
                         <th className="py-3 px-2 font-black text-slate-600 uppercase text-[10px] tracking-widest text-center">Ref. Range</th>
                         <th className="py-3 px-2 font-black text-slate-600 uppercase text-[10px] tracking-widest text-right">Flag</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {data.results.map((res: any, idx: number) => (
                        <tr key={idx} className="even:bg-slate-50 print:even:bg-slate-50">
                           <td className="py-3 px-2 font-bold text-slate-800">{res.parameter_name}</td>
                           <td className="py-3 px-2 text-center font-black text-slate-900 text-base">{res.result_value}</td>
                           <td className="py-3 px-2 text-center text-slate-600 text-xs">{res.unit}</td>
                           <td className="py-3 px-2 text-center text-slate-500 text-xs">{res.reference_range}</td>
                           <td className="py-3 px-2 text-right">
                              {res.flagged !== 'NORMAL' ? (
                                 <span className={`text-[10px] font-black px-2 py-1 rounded border uppercase
                                    ${res.flagged === 'HIGH' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-amber-50 text-amber-700 border-amber-100'}
                                    print:border-slate-400 print:text-slate-900
                                 `}>
                                    {res.flagged}
                                 </span>
                              ) : (
                                 <span className="text-[10px] font-bold text-emerald-600 print:text-slate-500">Normal</span>
                              )}
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>

             {/* Clinical Notes / Comments */}
             <div className="mt-8 p-6 bg-slate-50 rounded-xl border border-slate-100 print:bg-white print:border-slate-300">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pathologist / Lab Scientist Comments</p>
                <p className="text-sm font-medium text-slate-700 italic">
                   {data.comments || "Results validated. No specific clinical remarks."}
                </p>
             </div>
          </div>
        </PrintTemplate>
      </div>
    </div>
  );
};

export default LabPrintView;
