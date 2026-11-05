import React, { useState, useEffect, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Search, Upload, CheckCircle2, X, AlertCircle, Image as ImageIcon,
  Scan, Loader2, MoreVertical, Eye, Edit3, ChevronLeft, ChevronRight, MonitorPlay
} from 'lucide-react';
import { radiologyService } from '../services/radiology.service';
import { useNotification } from '../context/NotificationContext';
import { createPortal } from 'react-dom';

const RadiologyResultEntry: React.FC = () => {
  const { notify } = useNotification();
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenu, setActiveMenu] = useState<number | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<any | null>(null);
  const [modalMode, setModalMode] = useState<'enter' | 'update' | 'view'>('enter');
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]); 
  const [report, setReport] = useState('');
  const [impression, setImpression] = useState('');
  const [referenceNo, setReferenceNo] = useState('');

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const scans = await radiologyService.getScanList();
      setQueue(scans);
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to load radiology queue", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleOpenModal = (scanCase: any, mode: 'enter' | 'update' | 'view') => {
    setSelectedCase(scanCase);
    setModalMode(mode);
    setReferenceNo(scanCase.reference_no || '');
    
    if (mode === 'view' || scanCase.findings) {
      setReport(scanCase.findings || '');
      setImpression(scanCase.impression || '');
      try {
        const parsedImages = scanCase.image_path ? JSON.parse(scanCase.image_path) : [];
        setImages(Array.isArray(parsedImages) ? parsedImages.map((img: any) => img.path || img) : []);
      } catch (e) {
        setImages(scanCase.image_path ? [scanCase.image_path] : []);
      }
    } else {
      setReport('');
      setImpression('');
      setImages([]);
    }
    setImageFiles([]); 
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCase(null);
    setReport('');
    setImpression('');
    setImages([]);
    setImageFiles([]);
    setReferenceNo('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setImageFiles(prev => [...prev, ...newFiles]);
      const previewUrls = newFiles.map(file => URL.createObjectURL(file));
      setImages(prev => [...prev, ...previewUrls]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    if (index < imageFiles.length) {
      setImageFiles(imageFiles.filter((_, i) => i !== index));
    }
  };

  const handlePublish = async (complete: boolean = true) => {
    if (!report || !impression) {
      notify("Please enter clinical findings and impression.", "error");
      return;
    }
    if (!referenceNo) {
      notify("Reference Number is required.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('reference_no', referenceNo);
      formData.append('findings', report);
      formData.append('impression', impression);
      
      imageFiles.forEach((file) => {
        formData.append(`images[]`, file);
      });

      if (modalMode === 'update') {
        await radiologyService.submitReport(formData); 
      } else {
        await radiologyService.submitReport(formData);
      }
      
      notify(complete ? "Diagnostic report published successfully." : "Report saved as draft.", "success");
      
      if (complete) handleCloseModal();
      else setModalMode('update');
      
      fetchQueue();
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to publish report", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredQueue = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    return queue.filter(c => 
      (c.first_name + ' ' + c.last_name).toLowerCase().includes(lowerSearch) ||
      c.mrn?.toLowerCase().includes(lowerSearch) ||
      c.order_id?.toString().includes(lowerSearch) ||
      (c.service_name || '').toLowerCase().includes(lowerSearch) ||
      c.reference_no?.toLowerCase().includes(lowerSearch)
    );
  }, [queue, searchTerm]);

  const totalPages = Math.ceil(filteredQueue.length / itemsPerPage);
  const paginatedQueue = filteredQueue.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Radiology Results</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Manage and enter radiology diagnostic reports</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        
        {/* Search & Filter Bar */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by Patient, MRN, Service, Order No..."
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-slate-500 focus:ring-4 focus:ring-slate-500/10 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
              Total: {filteredQueue.length}
            </span>
          </div>
        </div>

        {/* Table Section */}
        <div className="overflow-x-auto pb-24">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Order / Ref No</th>
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Patient Details</th>
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Service</th>
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Processed At</th>
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Status</th>
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <Loader2 className="animate-spin mx-auto text-slate-600 mb-2" size={24} />
                    <p className="text-sm text-slate-500 font-medium">Loading radiology queue...</p>
                  </td>
                </tr>
              ) : paginatedQueue.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <Scan size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-lg font-bold text-slate-700">No scans found</p>
                    <p className="text-sm text-slate-500 mt-1">Try adjusting your search criteria</p>
                  </td>
                </tr>
              ) : (
                paginatedQueue.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800">{c.reference_no || '-'}</span>
                        <span className="text-[10px] font-mono text-slate-500 mt-0.5">Order ID: {c.order_id}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800">{c.first_name} {c.last_name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">MRN: {c.mrn}</span>
                          <span className="text-[10px] text-slate-500">{c.phone || 'No Phone'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-bold text-slate-700">{c.service_name}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-xs text-slate-600 font-medium">
                        {c.processed_at ? new Date(c.processed_at).toLocaleString() : 'N/A'}
                      </span>
                    </td>
                    <td className="p-4">
                      {c.status === 'REPORTED' || c.status === 'COMPLETED' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest border border-emerald-200">
                          <CheckCircle2 size={12} /> {c.status}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest border border-amber-200">
                          <AlertCircle size={12} /> {c.status}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenu(activeMenu === c.id ? null : c.id);
                        }}
                        className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400 hover:text-slate-700"
                      >
                        <MoreVertical size={18} />
                      </button>
                      
                      {activeMenu === c.id && (
                        <div className="absolute right-8 top-10 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-10 animate-in fade-in slide-in-from-top-2">
                          
                          {c.study_instance_uid && (
                             <NavLink 
                               to={`/radiology/view?uid=${c.study_instance_uid}`}
                               className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2 border-b border-slate-100"
                             >
                               <MonitorPlay size={16} /> Open in Viewer
                             </NavLink>
                          )}

                          {c.status !== 'COMPLETED' && (
                            <button 
                              onClick={() => handleOpenModal(c, c.findings ? 'update' : 'enter')}
                              className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2"
                            >
                              <Edit3 size={16} /> {c.findings ? 'Update Result' : 'Enter Result'}
                            </button>
                          )}
                          <button 
                            onClick={() => handleOpenModal(c, 'view')}
                            className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-brand-primary flex items-center gap-2"
                          >
                            <Eye size={16} /> View Details
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filteredQueue.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredQueue.length)} of {filteredQueue.length} entries
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-bold text-slate-700 px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Section */}
      {isModalOpen && selectedCase && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={handleCloseModal} />
           
           <div className="relative w-full max-w-4xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
             
             {/* Modal Header */}
             <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between shrink-0">
               <div className="flex items-center gap-5">
                 <div className="w-14 h-14 rounded-2xl bg-slate-700 text-white flex items-center justify-center shadow-lg shadow-slate-200 shrink-0">
                   <Scan size={28} />
                 </div>
                 <div>
                   <h2 className="text-xl font-black text-slate-800 tracking-tight">
                     {modalMode === 'enter' ? 'Enter Radiology Results' : 'View Radiology Results'}
                   </h2>
                   <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm font-medium text-slate-500">
                     <span className="font-bold text-slate-700">{selectedCase.service_name}</span>
                     <span>•</span>
                     <span>{selectedCase.first_name} {selectedCase.last_name} ({selectedCase.mrn})</span>
                     <span>•</span>
                     <span className="font-mono text-xs">{selectedCase.reference_no}</span>
                   </div>
                 </div>
               </div>
               <button 
                 onClick={handleCloseModal}
                 className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
               >
                 <X size={24} />
               </button>
             </div>

             {/* Modal Body / Inputs */}
             <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6">
               <div className="space-y-1.5">
                 <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Reference No (from Scan)</label>
                 <input 
                   className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-slate-500 focus:bg-white transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                   value={referenceNo}
                   onChange={e => setReferenceNo(e.target.value)}
                   placeholder="Enter Reference No (e.g. RAD-2026...)"
                   disabled={modalMode === 'view'}
                 />
               </div>

               <div className="space-y-1.5">
                 <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Findings</label>
                 <textarea 
                   rows={6} 
                   className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-slate-500 transition-all resize-none leading-relaxed disabled:opacity-70 disabled:cursor-not-allowed" 
                   placeholder="Enter detailed clinical findings..."
                   value={report}
                   onChange={e => setReport(e.target.value)}
                   disabled={modalMode === 'view'}
                 />
               </div>

               <div className="space-y-1.5">
                 <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Impression</label>
                 <textarea 
                   rows={4} 
                   className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-slate-500 transition-all resize-none leading-relaxed disabled:opacity-70 disabled:cursor-not-allowed" 
                   placeholder="Enter impression / conclusion..."
                   value={impression}
                   onChange={e => setImpression(e.target.value)}
                   disabled={modalMode === 'view'}
                 />
               </div>

               {/* File Upload Section */}
               <div className="space-y-2">
                 <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 flex items-center gap-2">
                   <ImageIcon size={14} /> Imaging Attachment (DICOM/PNG/JPG)
                 </label>
                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                   {images.map((img, i) => (
                     <div key={i} className="aspect-square bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-slate-400 relative group overflow-hidden">
                       {img.startsWith('blob:') || img.match(/\.(jpeg|jpg|png)$/i) ? (
                         <img src={img.startsWith('blob') ? img : `/${img}`} alt="Scan" className="w-full h-full object-cover" />
                       ) : (
                         <>
                           <ImageIcon size={24} />
                           <span className="text-[10px] mt-2 font-bold truncate w-full px-2 text-center">DICOM File</span>
                         </>
                       )}
                       {modalMode !== 'view' && (
                         <button 
                           onClick={() => handleRemoveImage(i)} 
                           className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                         >
                           <X size={12}/>
                         </button>
                       )}
                     </div>
                   ))}
                   {modalMode !== 'view' && (
                     <label className="aspect-square border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-slate-400 hover:bg-slate-50 transition-all cursor-pointer group">
                       <Upload size={24} className="group-hover:scale-110 transition-transform" />
                       <span className="text-[10px] font-bold uppercase mt-2 text-center px-2">Upload File</span>
                       <input type="file" multiple className="hidden" accept="image/*,.dcm" onChange={handleImageUpload} />
                     </label>
                   )}
                 </div>
               </div>
             </div>
             
             {/* Modal Footer */}
             <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
               {modalMode !== 'view' ? (
                <>
                  <div className="flex items-center gap-2 text-slate-500 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                    <AlertCircle size={16} />
                    <span className="text-xs font-bold">Review PACS integration before finalizing</span>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button 
                      onClick={() => handlePublish(false)}
                      disabled={submitting}
                      className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                      Save Draft
                    </button>
                    <button 
                      onClick={() => handlePublish(true)}
                      disabled={submitting}
                      className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold text-white bg-slate-800 rounded-xl hover:bg-slate-900 shadow-lg shadow-slate-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} 
                      Publish Report
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full flex justify-end">
                  <button 
                    onClick={handleCloseModal}
                    className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
             </div>

           </div>
        </div>
      , document.body)}
    </div>
  );
};

export default RadiologyResultEntry;



// import React, { useState, useEffect, useMemo } from 'react';
// import { NavLink } from 'react-router-dom';
// import { 
//   Search, Upload, CheckCircle2, X, AlertCircle, Image as ImageIcon,
//   Scan, Loader2, MoreVertical, Eye, Edit3, ChevronLeft, ChevronRight, MonitorPlay
// } from 'lucide-react';
// import { radiologyService } from '../services/radiology.service';
// import { useNotification } from '../context/NotificationContext';
// import { createPortal } from 'react-dom';

// const RadiologyResultEntry: React.FC = () => {
//   const { notify } = useNotification();
//   const [queue, setQueue] = useState<any[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [activeMenu, setActiveMenu] = useState<number | null>(null);

//   const [currentPage, setCurrentPage] = useState(1);
//   const itemsPerPage = 10;

//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [selectedCase, setSelectedCase] = useState<any | null>(null);
//   const [modalMode, setModalMode] = useState<'enter' | 'update' | 'view'>('enter');
//   const [submitting, setSubmitting] = useState(false);

//   // Form states
//   const [images, setImages] = useState<string[]>([]);
//   const [imageFiles, setImageFiles] = useState<File[]>([]); // 🔥 Added to store actual files for FormData
//   const [report, setReport] = useState('');
//   const [impression, setImpression] = useState('');
//   const [referenceNo, setReferenceNo] = useState('');

//   useEffect(() => {
//     fetchQueue();
//   }, []);

//   const fetchQueue = async () => {
//     setLoading(true);
//     try {
//       const scans = await radiologyService.getScanList();
//       setQueue(scans);
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Failed to load radiology queue", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     setCurrentPage(1);
//   }, [searchTerm]);

//   useEffect(() => {
//     const handleClickOutside = () => setActiveMenu(null);
//     document.addEventListener('click', handleClickOutside);
//     return () => document.removeEventListener('click', handleClickOutside);
//   }, []);

//   const handleOpenModal = (scanCase: any, mode: 'enter' | 'update' | 'view') => {
//     setSelectedCase(scanCase);
//     setModalMode(mode);
//     setReferenceNo(scanCase.reference_no || '');
    
//     if (mode === 'view' || scanCase.findings) {
//       setReport(scanCase.findings || '');
//       setImpression(scanCase.impression || '');
//       // If image_path exists (JSON string from DB), parse it or set it
//       try {
//         const parsedImages = scanCase.image_path ? JSON.parse(scanCase.image_path) : [];
//         setImages(Array.isArray(parsedImages) ? parsedImages.map((img: any) => img.path || img) : []);
//       } catch (e) {
//         setImages(scanCase.image_path ? [scanCase.image_path] : []);
//       }
//     } else {
//       setReport('');
//       setImpression('');
//       setImages([]);
//     }
//     setImageFiles([]); // Reset files
//     setIsModalOpen(true);
//   };

//   const handleCloseModal = () => {
//     setIsModalOpen(false);
//     setSelectedCase(null);
//     setReport('');
//     setImpression('');
//     setImages([]);
//     setImageFiles([]);
//     setReferenceNo('');
//   };

//   const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
//     if (e.target.files && e.target.files.length > 0) {
//       const newFiles = Array.from(e.target.files);
      
//       // Store actual File objects for backend
//       setImageFiles(prev => [...prev, ...newFiles]);
      
//       // Create local preview URLs
//       const previewUrls = newFiles.map(file => URL.createObjectURL(file));
//       setImages(prev => [...prev, ...previewUrls]);
//     }
//   };

//   const handleRemoveImage = (index: number) => {
//     setImages(images.filter((_, i) => i !== index));
//     // Also remove from files array if it corresponds to a newly uploaded file
//     // Note: If removing an existing DB image, you'd need extra logic, but this works for new uploads.
//     if (index < imageFiles.length) {
//       setImageFiles(imageFiles.filter((_, i) => i !== index));
//     }
//   };

//   const handlePublish = async (complete: boolean = true) => {
//     if (!report || !impression) {
//       notify("Please enter clinical findings and impression.", "error");
//       return;
//     }
//     if (!referenceNo) {
//       notify("Reference Number is required.", "error");
//       return;
//     }

//     setSubmitting(true);
//     try {
//       // 🔥 CRITICAL FIX: Use FormData so PHP $_FILES is populated
//       const formData = new FormData();
//       formData.append('reference_no', referenceNo);
//       formData.append('findings', report);
//       formData.append('impression', impression);
      
//       // Append all DICOM/Image files
//       imageFiles.forEach((file) => {
//         formData.append(`images[]`, file);
//       });

//       if (modalMode === 'update') {
//         // Assume update uses same endpoint or specific update endpoint
//         await radiologyService.submitReport(formData); 
//       } else {
//         await radiologyService.submitReport(formData);
//       }
      
//       notify(complete ? "Diagnostic report published successfully." : "Report saved as draft.", "success");
      
//       if (complete) handleCloseModal();
//       else setModalMode('update');
      
//       fetchQueue();
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Failed to publish report", "error");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   const filteredQueue = useMemo(() => {
//     const lowerSearch = searchTerm.toLowerCase();
//     return queue.filter(c => 
//       (c.first_name + ' ' + c.last_name).toLowerCase().includes(lowerSearch) ||
//       c.mrn?.toLowerCase().includes(lowerSearch) ||
//       c.encounter_number?.toLowerCase().includes(lowerSearch) ||
//       c.reference_no?.toLowerCase().includes(lowerSearch)
//     );
//   }, [queue, searchTerm]);

//   const totalPages = Math.ceil(filteredQueue.length / itemsPerPage);
//   const paginatedQueue = filteredQueue.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

//   return (
//     <div className="space-y-6 animate-in fade-in duration-500">
//       {/* ... Headers and Search Bar (Unchanged) ... */}
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//         <div>
//           <h2 className="text-2xl font-black text-slate-800 tracking-tight">Radiology Results</h2>
//           <p className="text-sm text-slate-500 font-medium mt-1">Manage and enter radiology diagnostic reports</p>
//         </div>
//       </div>

//       <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
//         {/* ... Search input ... */}
        
//         <div className="overflow-x-auto pb-24">
//           <table className="w-full text-left border-collapse">
//             {/* ... Table Headers ... */}
//             <tbody className="divide-y divide-slate-100">
//               {paginatedQueue.map((c) => (
//                 <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
//                   {/* ... Table Columns (Reference, Patient, Service, etc.) ... */}
//                   <td className="p-4 text-right relative">
//                     <button 
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         setActiveMenu(activeMenu === c.id ? null : c.id);
//                       }}
//                       className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400 hover:text-slate-700"
//                     >
//                       <MoreVertical size={18} />
//                     </button>
                    
//                     {activeMenu === c.id && (
//                       <div className="absolute right-8 top-10 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-10 animate-in fade-in slide-in-from-top-2">
                        
//                         {/* 🔥 Link to OHIF Viewer if UID exists */}
//                         {c.study_instance_uid && (
//                            <NavLink 
//                              to={`/radiology/view?uid=${c.study_instance_uid}`}
//                              className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2 border-b border-slate-100"
//                            >
//                              <MonitorPlay size={16} /> Open in Viewer
//                            </NavLink>
//                         )}

//                         {c.status !== 'COMPLETED' && (
//                           <button 
//                             onClick={() => handleOpenModal(c, c.findings ? 'update' : 'enter')}
//                             className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2"
//                           >
//                             <Edit3 size={16} /> {c.findings ? 'Update Result' : 'Enter Result'}
//                           </button>
//                         )}
//                         <button 
//                           onClick={() => handleOpenModal(c, 'view')}
//                           className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-brand-primary flex items-center gap-2"
//                         >
//                           <Eye size={16} /> View Details
//                         </button>
//                       </div>
//                     )}
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* Modal ... */}
//       {isModalOpen && selectedCase && createPortal(
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
//            {/* ... Modal Overlay ... */}
//            <div className="relative w-full max-w-4xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
//              {/* ... Header & Inputs ... */}
             
//              {/* File Upload Section */}
//              <div className="space-y-2 p-6 sm:p-8 overflow-y-auto">
//                 <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 flex items-center gap-2">
//                   <ImageIcon size={14} /> Imaging Attachment (DICOM/PNG/JPG)
//                 </label>
//                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
//                   {images.map((img, i) => (
//                     <div key={i} className="aspect-square bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-slate-400 relative group overflow-hidden">
//                       {img.startsWith('blob:') || img.match(/\.(jpeg|jpg|png)$/i) ? (
//                         <img src={img.startsWith('blob') ? img : `/${img}`} alt="Scan" className="w-full h-full object-cover" />
//                       ) : (
//                         <>
//                           <ImageIcon size={24} />
//                           <span className="text-[10px] mt-2 font-bold truncate w-full px-2 text-center">DICOM File</span>
//                         </>
//                       )}
//                       {modalMode !== 'view' && (
//                         <button 
//                           onClick={() => handleRemoveImage(i)} 
//                           className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
//                         >
//                           <X size={12}/>
//                         </button>
//                       )}
//                     </div>
//                   ))}
//                   {modalMode !== 'view' && (
//                     <label className="aspect-square border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-slate-400 hover:bg-slate-50 transition-all cursor-pointer group">
//                       <Upload size={24} className="group-hover:scale-110 transition-transform" />
//                       <span className="text-[10px] font-bold uppercase mt-2 text-center px-2">Upload File</span>
//                       {/* 🔥 Allow multiple file uploads */}
//                       <input type="file" multiple className="hidden" accept="image/*,.dcm" onChange={handleImageUpload} />
//                     </label>
//                   )}
//                 </div>
//               </div>

//               {/* ... Modal Footer Buttons (Publish/Save/Close) ... */}


//              <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
//                {modalMode !== 'view' ? (
//                 <>
//                   <div className="flex items-center gap-2 text-slate-500 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
//                     <AlertCircle size={16} />
//                     <span className="text-xs font-bold">Review PACS integration before finalizing</span>
//                   </div>
//                   <div className="flex items-center gap-3 w-full sm:w-auto">
//                     <button 
//                       onClick={() => handlePublish(false)}
//                       disabled={submitting}
//                       className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
//                     >
//                       {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
//                       Save Draft
//                     </button>
//                     <button 
//                       onClick={() => handlePublish(true)}
//                       disabled={submitting}
//                       className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold text-white bg-slate-800 rounded-xl hover:bg-slate-900 shadow-lg shadow-slate-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
//                     >
//                       {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} 
//                       Publish Report
//                     </button>
//                   </div>
//                 </>
//               ) : (
//                 <div className="w-full flex justify-end">
//                   <button 
//                     onClick={handleCloseModal}
//                     className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
//                   >
//                     Close
//                   </button>
//                 </div>
//               )}
//             </div>
            


//            </div>
//         </div>
//       , document.body)}
//     </div>
//   );
// };

// export default RadiologyResultEntry;

// import React, { useState, useEffect, useMemo } from 'react';
// import { 
//   Search, 
//   Upload, 
//   CheckCircle2, 
//   X, 
//   AlertCircle, 
//   Image as ImageIcon,
//   Scan,
//   Loader2,
//   MoreVertical,
//   Eye,
//   Edit3,
//   FileText,
//   ChevronLeft,
//   ChevronRight
// } from 'lucide-react';
// import { radiologyService } from '../services/radiology.service';
// import { useNotification } from '../context/NotificationContext';
// import { createPortal } from 'react-dom';

// const RadiologyResultEntry: React.FC = () => {
//   const { notify } = useNotification();
//   const [queue, setQueue] = useState<any[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [activeMenu, setActiveMenu] = useState<number | null>(null);

//   // Pagination
//   const [currentPage, setCurrentPage] = useState(1);
//   const itemsPerPage = 10;

//   // Modal states
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [selectedCase, setSelectedCase] = useState<any | null>(null);
//   const [modalMode, setModalMode] = useState<'enter' | 'update' | 'view'>('enter');
//   const [submitting, setSubmitting] = useState(false);

//   // Form states
//   const [images, setImages] = useState<string[]>([]);
//   const [report, setReport] = useState('');
//   const [impression, setImpression] = useState('');
//   const [referenceNo, setReferenceNo] = useState('');

//   useEffect(() => {
//     const fetchQueue = async () => {
//       setLoading(true);
//       try {
//         const scans = await radiologyService.getScanList();
//         setQueue(scans);
//       } catch (err: any) {
//         console.error(err);
//         notify(err.response?.data?.message || "Failed to load radiology queue", "error");
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchQueue();
//   }, []);

//   // Reset page on search
//   useEffect(() => {
//     setCurrentPage(1);
//   }, [searchTerm]);

//   // Close dropdown when clicking outside
//   useEffect(() => {
//     const handleClickOutside = () => setActiveMenu(null);
//     document.addEventListener('click', handleClickOutside);
//     return () => document.removeEventListener('click', handleClickOutside);
//   }, []);

//   const handleOpenModal = (scanCase: any, mode: 'enter' | 'update' | 'view') => {
//     setSelectedCase(scanCase);
//     setModalMode(mode);
//     setReferenceNo(scanCase.reference_no || '');
    
//     if (mode === 'view' || scanCase.findings) {
//       setReport(scanCase.findings || '');
//       setImpression(scanCase.impression || '');
//       setImages(scanCase.image_path ? [scanCase.image_path] : []);
//     } else {
//       setReport('');
//       setImpression('');
//       setImages([]);
//     }
    
//     setIsModalOpen(true);
//   };

//   const handleCloseModal = () => {
//     setIsModalOpen(false);
//     setSelectedCase(null);
//     setReport('');
//     setImpression('');
//     setImages([]);
//     setReferenceNo('');
//   };

//   const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
//     if (e.target.files && e.target.files[0]) {
//       const file = e.target.files[0];
//       const previewUrl = URL.createObjectURL(file);
//       setImages([...images, previewUrl]);
//     }
//   };

//   const handlePublish = async (complete: boolean = true) => {
//     if (!report || !impression) {
//       notify("Please enter clinical findings and impression.", "error");
//       return;
//     }
//     if (!referenceNo) {
//         notify("Reference Number is required. Please start the scan first to generate one.", "error");
//         return;
//     }

//     setSubmitting(true);
//     try {
//       const payload = {
//         reference_no: referenceNo,
//         findings: report,
//         impression: impression,
//         image_path: images.length > 0 ? images[0] : "uploads/radiology/2026/02/IMG_65d3a1.jpg" // Mock path or actual path
//       };

//       if (modalMode === 'update') {
//         await radiologyService.updateReport(payload);
//       } else {
//         await radiologyService.submitReport(payload);
//       }
      
//       notify(complete ? "Diagnostic report published successfully." : "Report saved as draft.", "success");
      
//       if (complete) {
//         handleCloseModal();
//       } else {
//         setModalMode('update');
//       }
      
//       // Refresh queue
//       const scans = await radiologyService.getScanList();
//       setQueue(scans);
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Failed to publish report", "error");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   const filteredQueue = useMemo(() => {
//     const lowerSearch = searchTerm.toLowerCase();
//     return queue.filter(c => 
//       (c.first_name + ' ' + c.last_name).toLowerCase().includes(lowerSearch) ||
//       c.mrn?.toLowerCase().includes(lowerSearch) ||
//       c.encounter_number?.toLowerCase().includes(lowerSearch) ||
//       (c.service_name || '').toLowerCase().includes(lowerSearch) ||
//       c.reference_no?.toLowerCase().includes(lowerSearch)
//     );
//   }, [queue, searchTerm]);

//   const totalPages = Math.ceil(filteredQueue.length / itemsPerPage);
//   const paginatedQueue = filteredQueue.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

//   return (
//     <div className="space-y-6 animate-in fade-in duration-500">
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//         <div>
//           <h2 className="text-2xl font-black text-slate-800 tracking-tight">Radiology Results</h2>
//           <p className="text-sm text-slate-500 font-medium mt-1">Manage and enter radiology diagnostic reports</p>
//         </div>
//       </div>

//       <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
//         <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
//           <div className="relative max-w-md w-full">
//             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//             <input 
//               type="text" 
//               placeholder="Search by Patient, MRN, Service, Encounter, Order No..."
//               className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-slate-500 focus:ring-4 focus:ring-slate-500/10 transition-all"
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//             />
//           </div>
//           <div className="flex items-center gap-3">
//             <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
//               Total: {filteredQueue.length}
//             </span>
//           </div>
//         </div>

//         <div className="overflow-x-auto pb-24">
//           <table className="w-full text-left border-collapse">
//             <thead>
//               <tr className="bg-slate-50 border-b border-slate-100">
//                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Order / Ref No</th>
//                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Patient Details</th>
//                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Service</th>
//                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Encounter</th>
//                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Ordered At</th>
//                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Status</th>
//                 <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap text-right">Actions</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-100">
//               {loading ? (
//                 <tr>
//                   <td colSpan={7} className="p-8 text-center">
//                     <Loader2 className="animate-spin mx-auto text-slate-600 mb-2" size={24} />
//                     <p className="text-sm text-slate-500 font-medium">Loading radiology queue...</p>
//                   </td>
//                 </tr>
//               ) : paginatedQueue.length === 0 ? (
//                 <tr>
//                   <td colSpan={7} className="p-12 text-center">
//                     <Scan size={48} className="mx-auto text-slate-300 mb-4" />
//                     <p className="text-lg font-bold text-slate-700">No scans found</p>
//                     <p className="text-sm text-slate-500 mt-1">Try adjusting your search criteria</p>
//                   </td>
//                 </tr>
//               ) : (
//                 paginatedQueue.map((c) => (
//                   <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
//                     <td className="p-4">
//                       <div className="flex flex-col">
//                         <span className="text-sm font-bold text-slate-800">{c.reference_no || '-'}</span>
//                         <span className="text-[10px] font-mono text-slate-500 mt-0.5">ID: {c.id}</span>
//                       </div>
//                     </td>
//                     <td className="p-4">
//                       <div className="flex flex-col">
//                         <span className="text-sm font-bold text-slate-800">{c.first_name} {c.last_name}</span>
//                         <div className="flex items-center gap-2 mt-0.5">
//                           <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">MRN: {c.mrn}</span>
//                           <span className="text-[10px] text-slate-500">{c.contact}</span>
//                         </div>
//                       </div>
//                     </td>
//                     <td className="p-4">
//                       <span className="text-sm font-bold text-slate-700">{c.service_name}</span>
//                     </td>
//                     <td className="p-4">
//                       <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
//                         {c.encounter_number}
//                       </span>
//                     </td>
//                     <td className="p-4">
//                       <span className="text-xs text-slate-600 font-medium">
//                         {new Date(c.ordered_at).toLocaleString()}
//                       </span>
//                     </td>
//                     <td className="p-4">
//                       {c.status === 'COMPLETED' ? (
//                         <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest border border-emerald-200">
//                           <CheckCircle2 size={12} /> Completed
//                         </span>
//                       ) : (
//                         <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest border border-amber-200">
//                           <AlertCircle size={12} /> Pending
//                         </span>
//                       )}
//                     </td>
//                     <td className="p-4 text-right relative">
//                       <button 
//                         onClick={(e) => {
//                           e.stopPropagation();
//                           setActiveMenu(activeMenu === c.id ? null : c.id);
//                         }}
//                         className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400 hover:text-slate-700"
//                       >
//                         <MoreVertical size={18} />
//                       </button>
                      
//                       {activeMenu === c.id && (
//                         <div className="absolute right-8 top-10 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-10 animate-in fade-in slide-in-from-top-2">
//                           {c.status !== 'COMPLETED' && (
//                             <button 
//                               onClick={() => handleOpenModal(c, c.findings ? 'update' : 'enter')}
//                               className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2"
//                             >
//                               <Edit3 size={16} /> {c.findings ? 'Update Result' : 'Enter Result'}
//                             </button>
//                           )}
//                           <button 
//                             onClick={() => handleOpenModal(c, 'view')}
//                             className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-brand-primary flex items-center gap-2"
//                           >
//                             <Eye size={16} /> View Entries
//                           </button>
//                         </div>
//                       )}
//                     </td>
//                   </tr>
//                 ))
//               )}
//             </tbody>
//           </table>
//         </div>

//         {/* Pagination */}
//         {!loading && filteredQueue.length > 0 && (
//           <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
//             <span className="text-xs font-medium text-slate-500">
//               Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredQueue.length)} of {filteredQueue.length} entries
//             </span>
//             <div className="flex items-center gap-2">
//               <button 
//                 onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
//                 disabled={currentPage === 1}
//                 className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//               >
//                 <ChevronLeft size={16} />
//               </button>
//               <span className="text-xs font-bold text-slate-700 px-2">
//                 Page {currentPage} of {totalPages}
//               </span>
//               <button 
//                 onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
//                 disabled={currentPage === totalPages}
//                 className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//               >
//                 <ChevronRight size={16} />
//               </button>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* Result Entry/View Modal */}
//       {isModalOpen && selectedCase && createPortal(
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
//           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={handleCloseModal} />
//           <div className="relative w-full max-w-4xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            
//             {/* Modal Header */}
//             <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between shrink-0">
//               <div className="flex items-center gap-5">
//                 <div className="w-14 h-14 rounded-2xl bg-slate-700 text-white flex items-center justify-center shadow-lg shadow-slate-200 shrink-0">
//                   <Scan size={28} />
//                 </div>
//                 <div>
//                   <h2 className="text-xl font-black text-slate-800 tracking-tight">
//                     {modalMode === 'enter' ? 'Enter Radiology Results' : 'View Radiology Results'}
//                   </h2>
//                   <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm font-medium text-slate-500">
//                     <span className="font-bold text-slate-700">{selectedCase.service_name}</span>
//                     <span>•</span>
//                     <span>{selectedCase.first_name} {selectedCase.last_name} ({selectedCase.mrn})</span>
//                     <span>•</span>
//                     <span className="font-mono text-xs">{selectedCase.reference_no}</span>
//                   </div>
//                 </div>
//               </div>
//               <button 
//                 onClick={handleCloseModal}
//                 className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
//               >
//                 <X size={24} />
//               </button>
//             </div>

//             {/* Modal Body */}
//             <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6">
              
//               {/* Reference No Input */}
//               <div className="space-y-1.5">
//                 <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Reference No (from Scan)</label>
//                 <input 
//                   className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-slate-500 focus:bg-white transition-all"
//                   value={referenceNo}
//                   onChange={e => setReferenceNo(e.target.value)}
//                   placeholder="Enter Reference No (e.g. RAD-2026...)"
//                   disabled={modalMode === 'view'}
//                 />
//               </div>

//               <div className="space-y-1.5">
//                 <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Findings</label>
//                 <textarea 
//                   rows={6} 
//                   className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-slate-500 transition-all resize-none leading-relaxed" 
//                   placeholder="Enter detailed clinical findings..."
//                   value={report}
//                   onChange={e => setReport(e.target.value)}
//                   disabled={modalMode === 'view'}
//                 />
//               </div>

//               <div className="space-y-1.5">
//                 <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Impression</label>
//                 <textarea 
//                   rows={4} 
//                   className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-slate-500 transition-all resize-none leading-relaxed" 
//                   placeholder="Enter impression / conclusion..."
//                   value={impression}
//                   onChange={e => setImpression(e.target.value)}
//                   disabled={modalMode === 'view'}
//                 />
//               </div>

//               <div className="space-y-2">
//                 <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 flex items-center gap-2">
//                   <ImageIcon size={14} /> Imaging Attachment (PNG/JPG)
//                 </label>
//                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
//                   {images.map((img, i) => (
//                     <div key={i} className="aspect-square bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-slate-400 relative group overflow-hidden">
//                       {img.startsWith('blob:') || img.startsWith('http') || img.startsWith('uploads/') ? (
//                         <img src={img} alt="Scan" className="w-full h-full object-cover" />
//                       ) : (
//                         <>
//                           <ImageIcon size={24} />
//                           <span className="text-[10px] mt-2 font-medium truncate w-full px-2 text-center">{img}</span>
//                         </>
//                       )}
//                       {modalMode !== 'view' && (
//                         <button 
//                           onClick={() => setImages(images.filter((_, idx) => idx !== i))} 
//                           className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
//                         >
//                           <X size={12}/>
//                         </button>
//                       )}
//                     </div>
//                   ))}
//                   {modalMode !== 'view' && (
//                     <label className="aspect-square border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-slate-400 hover:bg-slate-50 transition-all cursor-pointer group">
//                       <Upload size={24} className="group-hover:scale-110 transition-transform" />
//                       <span className="text-[10px] font-bold uppercase mt-2">Upload</span>
//                       <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
//                     </label>
//                   )}
//                 </div>
//               </div>
//             </div>

//             {/* Modal Footer */}
//             <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
//               {modalMode !== 'view' ? (
//                 <>
//                   <div className="flex items-center gap-2 text-slate-500 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
//                     <AlertCircle size={16} />
//                     <span className="text-xs font-bold">Review PACS integration before finalizing</span>
//                   </div>
//                   <div className="flex items-center gap-3 w-full sm:w-auto">
//                     <button 
//                       onClick={() => handlePublish(false)}
//                       disabled={submitting}
//                       className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
//                     >
//                       {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
//                       Save Draft
//                     </button>
//                     <button 
//                       onClick={() => handlePublish(true)}
//                       disabled={submitting}
//                       className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold text-white bg-slate-800 rounded-xl hover:bg-slate-900 shadow-lg shadow-slate-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
//                     >
//                       {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} 
//                       Publish Report
//                     </button>
//                   </div>
//                 </>
//               ) : (
//                 <div className="w-full flex justify-end">
//                   <button 
//                     onClick={handleCloseModal}
//                     className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
//                   >
//                     Close
//                   </button>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       , document.body)}
//     </div>
//   );
// };

// export default RadiologyResultEntry;
