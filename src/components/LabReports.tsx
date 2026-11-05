import React, { useState, useEffect } from 'react';
import { 
  Search, Printer, Activity, CheckCircle2, Loader2, User,
  Stethoscope, ChevronLeft, ChevronRight
} from 'lucide-react';
import { labService } from '../services/lab.service';
import { useNotification } from '../context/NotificationContext';

// Robust extractor for nested paginated responses from PHP/Axios
const extractPaginatedData = (res: any) => {
  if (res?.data?.status === 'success' && res?.data?.data) {
      return {
          data: Array.isArray(res.data.data.data) ? res.data.data.data : [],
          total: Number(res.data.data.total) || 0
      };
  }
  if (res?.status === 'success' && res?.data) {
      return {
          data: Array.isArray(res.data.data) ? res.data.data : [],
          total: Number(res.data.total) || 0
      };
  }
  if (res?.total !== undefined && Array.isArray(res?.data)) {
      return {
          data: res.data,
          total: Number(res.total) || 0
      };
  }
  const fallbackArray = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
  return { data: fallbackArray, total: fallbackArray.length };
};

const LabReports: React.FC = () => {
  const { notify } = useNotification();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Debounce logic
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Reset to page 1 on new search or limit change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, itemsPerPage]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearch,
        status: 'RELEASED' // Force backend to only fetch released reports
      };
      
      const response = await labService.getSamples(params);
      const { data, total } = extractPaginatedData(response);

      setReports(data);
      setTotalItems(total);
    } catch (err) {
      notify('Failed to load report archive', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [currentPage, itemsPerPage, debouncedSearch]);

  const handlePrintPreview = (report: any) => {
    const url = `/print/lab/${report.reference_no}`;
    window.open(url, '_blank');
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Central Search Archive */}
      <div className="bg-emerald-600 rounded-[48px] p-12 text-white shadow-xl shadow-emerald-100 relative overflow-hidden group">
        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-8">
           <div>
              <h2 className="text-3xl font-black tracking-tight">Finalized Result Archive</h2>
              <p className="text-emerald-100 font-medium mt-2">Secure access to published clinical investigations and patient reports.</p>
           </div>
           
           <div className="relative group/input">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-400 group-focus-within/input:text-emerald-600 transition-colors" size={24} />
              <input 
                type="text" 
                placeholder="Search by Patient Name, Lab Ref or Test..."
                className="w-full pl-16 pr-6 py-6 bg-white/10 border-2 border-white/20 rounded-[32px] text-lg font-bold text-white placeholder:text-emerald-200 outline-none focus:bg-white focus:text-emerald-900 focus:border-white transition-all shadow-2xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
        </div>
        
        {/* Decorative background blur */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
      </div>

      <div className="bg-white border border-slate-200 rounded-[44px] shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shadow-sm">
                     <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">Published Reports</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">Clinical Ledger View</p>
                  </div>
               </div>
            </div>

            <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                       <th className="px-8 py-5">Published Date</th>
                       <th className="px-8 py-5">Reference No</th>
                       <th className="px-8 py-5">Patient Name</th>
                       <th className="px-8 py-5">Investigation</th>
                       <th className="px-8 py-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                       <tr>
                          <td colSpan={5} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-emerald-600 mb-2"/> <p className="text-xs font-bold text-slate-400">Loading Archive...</p></td>
                       </tr>
                    ) : reports.length === 0 ? (
                      <tr>
                          <td colSpan={5} className="py-20 text-center opacity-30">
                            <Activity size={48} className="text-slate-400 mb-4 mx-auto" />
                            <p className="text-xs font-black uppercase tracking-widest">No matching records found</p>
                          </td>
                      </tr>
                    ) : reports.map((row) => (
                      <tr key={row.id || row.order_id} className="hover:bg-emerald-50/30 transition-all group">
                        <td className="px-8 py-6">
                           <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-500">{new Date(row.completed_at || row.ordered_at).toLocaleDateString()}</span>
                              <span className="text-[10px] font-bold text-slate-400">{new Date(row.completed_at || row.ordered_at).toLocaleTimeString()}</span>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <span className="text-[10px] font-mono font-bold text-brand-primary uppercase bg-brand-active px-2 py-1 rounded">{row.reference_no}</span>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs"><User size={14}/></div>
                              <p className="text-sm font-black text-slate-800">{row.patient_name}</p>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <p className="text-sm font-bold text-slate-700">{row.service_name || row.sample_name}</p>
                           {row.doctor_name && (
                              <div className="flex items-center gap-1 text-[10px] font-bold text-purple-600/80 bg-purple-50/50 w-fit px-1.5 py-0.5 rounded mt-1.5">
                                 <Stethoscope size={10} />
                                 {row.doctor_name.replace(/^Dr\.?\s*/i, 'Dr. ')}
                              </div>
                           )}
                        </td>
                        <td className="px-8 py-6 text-right">
                           <button 
                            onClick={() => handlePrintPreview(row)}
                            className="p-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all" title="View & Print"
                           >
                              <Printer size={20}/>
                           </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>

            {/* Server-Side Pagination Footer */}
            {!loading && reports.length > 0 && (
              <div className="p-8 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, totalItems)} of{" "}
                  {totalItems} reports
                </span>
                <div className="flex items-center gap-4">
                  <select 
                      value={itemsPerPage} 
                      onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                      className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-xl outline-none bg-white text-slate-600 shadow-sm"
                  >
                      <option value={10}>10 / page</option>
                      <option value={20}>20 / page</option>
                      <option value={50}>50 / page</option>
                      <option value={100}>100 / page</option>
                  </select>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-bold text-slate-700 px-3">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
      </div>
    </div>
  );
};

export default LabReports;


// import React, { useState, useEffect } from 'react';
// import { 
//   Search, 
//   Printer, 
//   Activity, 
//   CheckCircle2, 
//   Loader2, 
//   User,
//   Stethoscope,
//   ChevronLeft,
//   ChevronRight
// } from 'lucide-react';
// import { labService } from '../services/lab.service';
// import { useNotification } from '../context/NotificationContext';

// const LabReports: React.FC = () => {
//   const { notify } = useNotification();
//   const [reports, setReports] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
  
//   // Search & Pagination
//   const [searchTerm, setSearchTerm] = useState('');
//   const [debouncedSearch, setDebouncedSearch] = useState('');
//   const [currentPage, setCurrentPage] = useState(1);
//   const [totalItems, setTotalItems] = useState(0);
//   const itemsPerPage = 10;

//   // Debounce logic
//   useEffect(() => {
//     const handler = setTimeout(() => setDebouncedSearch(searchTerm), 500);
//     return () => clearTimeout(handler);
//   }, [searchTerm]);

//   // Reset to page 1 on new search
//   useEffect(() => {
//     setCurrentPage(1);
//   }, [debouncedSearch]);

//   const fetchReports = async () => {
//     setLoading(true);
//     try {
//       const params = {
//         page: currentPage,
//         limit: itemsPerPage,
//         search: debouncedSearch,
//         status: 'RELEASED' // Force backend to only fetch released reports
//       };
      
//       const response = await labService.getSamples(params);
      
//       // Handle the API pagination response
//       const resData = response?.data?.data || response?.data || {};
//       const dataArray = Array.isArray(resData.data) ? resData.data : (Array.isArray(resData) ? resData : []);
//       const total = resData.total || dataArray.length;

//       setReports(dataArray);
//       setTotalItems(total);
//     } catch (err) {
//       notify('Failed to load report archive', 'error');
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchReports();
//   }, [currentPage, debouncedSearch]);

//   const handlePrintPreview = (report: any) => {
//     const url = `/print/lab/${report.reference_no}`;
//     window.open(url, '_blank');
//   };

//   const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

//   return (
//     <div className="space-y-8 animate-in fade-in duration-500 pb-20">
//       {/* Central Search Archive - Themed Green */}
//       <div className="bg-emerald-600 rounded-[48px] p-12 text-white shadow-xl shadow-emerald-100 relative overflow-hidden group">
//         <div className="relative z-10 max-w-3xl mx-auto text-center space-y-8">
//            <div>
//               <h2 className="text-3xl font-black tracking-tight">Finalized Result Archive</h2>
//               <p className="text-emerald-100 font-medium mt-2">Secure access to published clinical investigations and patient reports.</p>
//            </div>
           
//            <div className="relative group/input">
//               <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-400 group-focus-within/input:text-emerald-600 transition-colors" size={24} />
//               <input 
//                 type="text" 
//                 placeholder="Search by Patient Name, Lab Ref or Test..."
//                 className="w-full pl-16 pr-6 py-6 bg-white/10 border-2 border-white/20 rounded-[32px] text-lg font-bold text-white placeholder:text-emerald-200 outline-none focus:bg-white focus:text-emerald-900 focus:border-white transition-all shadow-2xl"
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//               />
//            </div>
//         </div>
        
//         {/* Decorative background blur */}
//         <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
//       </div>

//       <div className="bg-white border border-slate-200 rounded-[44px] shadow-sm overflow-hidden flex flex-col h-full">
//             <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
//                <div className="flex items-center gap-4">
//                   <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shadow-sm">
//                      <CheckCircle2 size={24} />
//                   </div>
//                   <div>
//                     <h3 className="text-xl font-black text-slate-800 tracking-tight">Published Reports</h3>
//                     <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">Clinical Ledger View</p>
//                   </div>
//                </div>
//             </div>

//             <div className="overflow-x-auto">
//                <table className="w-full text-left">
//                   <thead>
//                     <tr className="bg-white border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
//                        <th className="px-8 py-5">Published Date</th>
//                        <th className="px-8 py-5">Reference No</th>
//                        <th className="px-8 py-5">Patient Name</th>
//                        <th className="px-8 py-5">Investigation</th>
//                        <th className="px-8 py-5 text-right">Action</th>
//                     </tr>
//                   </thead>
//                   <tbody className="divide-y divide-slate-50">
//                     {loading ? (
//                        <tr>
//                           <td colSpan={5} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-emerald-600 mb-2"/> <p className="text-xs font-bold text-slate-400">Loading Archive...</p></td>
//                        </tr>
//                     ) : reports.length === 0 ? (
//                       <tr>
//                           <td colSpan={5} className="py-20 text-center opacity-30">
//                             <Activity size={48} className="text-slate-400 mb-4 mx-auto" />
//                             <p className="text-xs font-black uppercase tracking-widest">No matching records found</p>
//                           </td>
//                       </tr>
//                     ) : reports.map((row) => (
//                       <tr key={row.id || row.order_id} className="hover:bg-emerald-50/30 transition-all group">
//                         <td className="px-8 py-6">
//                            <div className="flex flex-col">
//                               <span className="text-xs font-bold text-slate-500">{new Date(row.completed_at || row.ordered_at).toLocaleDateString()}</span>
//                               <span className="text-[10px] font-bold text-slate-400">{new Date(row.completed_at || row.ordered_at).toLocaleTimeString()}</span>
//                            </div>
//                         </td>
//                         <td className="px-8 py-6">
//                            <span className="text-[10px] font-mono font-bold text-brand-primary uppercase bg-brand-active px-2 py-1 rounded">{row.reference_no}</span>
//                         </td>
//                         <td className="px-8 py-6">
//                            <div className="flex items-center gap-3">
//                               <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs"><User size={14}/></div>
//                               <p className="text-sm font-black text-slate-800">{row.patient_name}</p>
//                            </div>
//                         </td>
//                         <td className="px-8 py-6">
//                            <p className="text-sm font-bold text-slate-700">{row.service_name || row.sample_name}</p>
//                            {row.doctor_name && (
//                               <div className="flex items-center gap-1 text-[10px] font-bold text-purple-600/80 bg-purple-50/50 w-fit px-1.5 py-0.5 rounded mt-1.5">
//                                  <Stethoscope size={10} />
//                                  {row.doctor_name.replace(/^Dr\.?\s*/i, 'Dr. ')}
//                               </div>
//                            )}
//                         </td>
//                         <td className="px-8 py-6 text-right">
//                            <button 
//                             onClick={() => handlePrintPreview(row)}
//                             className="p-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all" title="View & Print"
//                            >
//                               <Printer size={20}/>
//                            </button>
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                </table>
//             </div>

//             {/* Server-Side Pagination Footer */}
//             {!loading && reports.length > 0 && (
//               <div className="p-8 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
//                 <span className="text-xs font-semibold text-slate-500">
//                   Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
//                   {Math.min(currentPage * itemsPerPage, totalItems)} of{" "}
//                   {totalItems} reports
//                 </span>
//                 <div className="flex items-center gap-2">
//                   <button
//                     onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
//                     disabled={currentPage === 1}
//                     className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//                   >
//                     <ChevronLeft size={16} />
//                   </button>
//                   <span className="text-xs font-bold text-slate-700 px-3">
//                     Page {currentPage} of {totalPages}
//                   </span>
//                   <button
//                     onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
//                     disabled={currentPage === totalPages}
//                     className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//                   >
//                     <ChevronRight size={16} />
//                   </button>
//                 </div>
//               </div>
//             )}
//       </div>
//     </div>
//   );
// };

// export default LabReports;

// // import React, { useState, useEffect } from 'react';
// // import { 
// //   Search, 
// //   Printer, 
// //   Activity, 
// //   CheckCircle2, 
// //   Loader2, 
// //   User,
// //   Stethoscope
// // } from 'lucide-react';
// // import { labService } from '../services/lab.service';
// // import { useNotification } from '../context/NotificationContext';

// // const LabReports: React.FC = () => {
// //   const { notify } = useNotification();
// //   const [reports, setReports] = useState<any[]>([]);
// //   const [loading, setLoading] = useState(true);
// //   const [searchTerm, setSearchTerm] = useState('');

// //   const fetchReports = async () => {
// //     setLoading(true);
// //     try {
// //       const data = await labService.getSamples();
// //       // Filter for only RELEASED samples
// //       setReports(data.filter((s: any) => s.workflow_status === 'RELEASED'));
// //     } catch (err) {
// //       notify('Failed to load report archive', 'error');
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   useEffect(() => {
// //     fetchReports();
// //   }, []);

// //   const handlePrintPreview = (report: any) => {
// //     // Open the print view in a new tab
// //     const url = `/print/lab/${report.reference_no}`;
// //     window.open(url, '_blank');
// //   };

// //   const filtered = reports.filter(r => 
// //     (r.patient_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
// //     (r.reference_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
// //     (r.service_name || r.sample_name || '').toLowerCase().includes(searchTerm.toLowerCase())
// //   );

// //   return (
// //     <div className="space-y-8 animate-in fade-in duration-500 pb-20">
// //       {/* Central Search Archive - Themed Green */}
// //       <div className="bg-emerald-600 rounded-[48px] p-12 text-white shadow-xl shadow-emerald-100 relative overflow-hidden group">
// //         <div className="relative z-10 max-w-3xl mx-auto text-center space-y-8">
// //            <div>
// //               <h2 className="text-3xl font-black tracking-tight">Finalized Result Archive</h2>
// //               <p className="text-emerald-100 font-medium mt-2">Secure access to published clinical investigations and patient reports.</p>
// //            </div>
           
// //            <div className="relative group/input">
// //               <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-400 group-focus-within/input:text-emerald-600 transition-colors" size={24} />
// //               <input 
// //                 type="text" 
// //                 placeholder="Search by Patient Name, Lab Ref or Test..."
// //                 className="w-full pl-16 pr-6 py-6 bg-white/10 border-2 border-white/20 rounded-[32px] text-lg font-bold text-white placeholder:text-emerald-200 outline-none focus:bg-white focus:text-emerald-900 focus:border-white transition-all shadow-2xl"
// //                 value={searchTerm}
// //                 onChange={(e) => setSearchTerm(e.target.value)}
// //               />
// //            </div>
// //         </div>
        
// //         {/* Decorative background blur */}
// //         <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
// //       </div>

// //       <div className="bg-white border border-slate-200 rounded-[44px] shadow-sm overflow-hidden flex flex-col h-full">
// //             <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
// //                <div className="flex items-center gap-4">
// //                   <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shadow-sm">
// //                      <CheckCircle2 size={24} />
// //                   </div>
// //                   <div>
// //                     <h3 className="text-xl font-black text-slate-800 tracking-tight">Published Reports</h3>
// //                     <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">Clinical Ledger View</p>
// //                   </div>
// //                </div>
// //             </div>

// //             <div className="overflow-x-auto">
// //                <table className="w-full text-left">
// //                   <thead>
// //                     <tr className="bg-white border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
// //                        <th className="px-8 py-5">Published Date</th>
// //                        <th className="px-8 py-5">Reference No</th>
// //                        <th className="px-8 py-5">Patient Name</th>
// //                        <th className="px-8 py-5">Investigation</th>
// //                        <th className="px-8 py-5 text-right">Action</th>
// //                     </tr>
// //                   </thead>
// //                   <tbody className="divide-y divide-slate-50">
// //                     {loading ? (
// //                        <tr>
// //                           <td colSpan={5} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-emerald-600 mb-2"/> <p className="text-xs font-bold text-slate-400">Loading Archive...</p></td>
// //                        </tr>
// //                     ) : filtered.length === 0 ? (
// //                       <tr>
// //                           <td colSpan={5} className="py-20 text-center opacity-30">
// //                             <Activity size={48} className="text-slate-400 mb-4 mx-auto" />
// //                             <p className="text-xs font-black uppercase tracking-widest">No matching records found</p>
// //                           </td>
// //                       </tr>
// //                     ) : filtered.map((row) => (
// //                       <tr key={row.id} className="hover:bg-emerald-50/30 transition-all group">
// //                         <td className="px-8 py-6">
// //                            <div className="flex flex-col">
// //                               <span className="text-xs font-bold text-slate-500">{new Date(row.completed_at || row.ordered_at).toLocaleDateString()}</span>
// //                               <span className="text-[10px] font-bold text-slate-400">{new Date(row.completed_at || row.ordered_at).toLocaleTimeString()}</span>
// //                            </div>
// //                         </td>
// //                         <td className="px-8 py-6">
// //                            <span className="text-[10px] font-mono font-bold text-brand-primary uppercase bg-brand-active px-2 py-1 rounded">{row.reference_no}</span>
// //                         </td>
// //                         <td className="px-8 py-6">
// //                            <div className="flex items-center gap-3">
// //                               <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs"><User size={14}/></div>
// //                               <p className="text-sm font-black text-slate-800">{row.patient_name}</p>
// //                            </div>
// //                         </td>
// //                         <td className="px-8 py-6">
// //                            <p className="text-sm font-bold text-slate-700">{row.service_name || row.sample_name}</p>
// //                            {row.doctor_name && (
// //                               <div className="flex items-center gap-1 text-[10px] font-bold text-purple-600/80 bg-purple-50/50 w-fit px-1.5 py-0.5 rounded mt-1.5">
// //                                  <Stethoscope size={10} />
// //                                  {row.doctor_name.replace(/^Dr\.?\s*/i, 'Dr. ')}
// //                               </div>
// //                            )}
// //                         </td>
// //                         <td className="px-8 py-6 text-right">
// //                            <button 
// //                             onClick={() => handlePrintPreview(row)}
// //                             className="p-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all" title="View & Print"
// //                            >
// //                               <Printer size={20}/>
// //                            </button>
// //                         </td>
// //                       </tr>
// //                     ))}
// //                   </tbody>
// //                </table>
// //             </div>
// //       </div>
// //     </div>
// //   );
// // };

// // export default LabReports;
