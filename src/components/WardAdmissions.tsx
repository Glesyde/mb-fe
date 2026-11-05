import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Calendar, 
  History, 
  Pill,
  Undo2,
  X,
  Send,
  AlertCircle,
  CheckCircle2,
  Activity,
  MoreVertical,
  Loader2
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { wardService } from '../services/ward.service'; 
import { useNotification } from '../context/NotificationContext'; // Assuming you have this

const WardMedicationReturns: React.FC = () => {
  const { notify } = useNotification(); // Optional: Replace with your alert system
  const [searchTerm, setSearchTerm] = useState('');
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [dispensedDrugs, setDispensedDrugs] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  // Return Form State
  const [returnForms, setReturnForms] = useState<Record<number, { qty: number | string; reason: string }>>({});
  const [isSubmitting, setIsSubmitting] = useState<number | null>(null);

  useEffect(() => {
    const fetchAdmissions = async () => {
      setLoading(true);
      try {
        const response = await wardService.getAdmissions();
        const results = response?.data?.results || response?.data || [];
        setAdmissions(Array.isArray(results) ? results : []);
      } catch (err) {
        console.error("Failed to load admissions", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAdmissions();
  }, []);

  const handleOpenModal = async (patient: any) => {
    setSelectedPatient(patient);
    setIsModalOpen(true);
    setModalLoading(true);
    setDispensedDrugs([]); // Reset previous data

    try {
      // Fetch Real Dispensed Data
      const response = await wardService.getDispensedForReturn(patient.encounter_id);
      const drugs = response?.data || [];
      setDispensedDrugs(drugs);
    } catch (err) {
      console.error(err);
      notify?.("Failed to fetch medication history.", "error");
    } finally {
      setModalLoading(false);
    }
  };

  const handleFormChange = (dispenseId: number, field: 'qty' | 'reason', value: any) => {
    setReturnForms(prev => ({
      ...prev,
      [dispenseId]: {
        ...prev[dispenseId],
        [field]: value
      }
    }));
  };

  const handleSubmitReturn = async (drug: any) => {
    const form = returnForms[drug.dispensing_id];
    if (!form || !form.qty || !form.reason.trim()) {
      notify?.("Please provide both quantity and reason.", "warning") || alert("Please provide both quantity and reason.");
      return;
    }

    // MAR Validation: Cannot return more than (Dispensed - Already Returned - Pending - Used)
    // Note: MAR quantity_used is an estimate based on administrations. The nurse makes the final physical count call.
    const qtyLeft = drug.quantity_dispensed - drug.quantity_already_returned - drug.quantity_pending_return;
    
    if (Number(form.qty) > qtyLeft) {
      notify?.("Cannot return more than the available unreturned quantity.", "error") || alert("Cannot return more than the available quantity left.");
      return;
    }

    setIsSubmitting(drug.dispensing_id);
    try {
      // API Call
      await wardService.requestMedicationReturn({
        dispensing_id: drug.dispensing_id,
        qty: Number(form.qty),
        reason: form.reason
      });

      notify?.("Return request sent to Pharmacy successfully!", "success");
      
      // Update local UI state dynamically without re-fetching
      setDispensedDrugs(prev => prev.map(d => 
        d.dispensing_id === drug.dispensing_id 
          ? { ...d, quantity_pending_return: Number(d.quantity_pending_return) + Number(form.qty) } 
          : d
      ));
      
      // Clear specific row form
      setReturnForms(prev => ({ ...prev, [drug.dispensing_id]: { qty: '', reason: '' } }));

    } catch (err: any) {
      notify?.(err.response?.data?.message || "Failed to submit request.", "error") || alert("Failed to submit request.");
    } finally {
      setIsSubmitting(null);
    }
  };

  const filtered = admissions.filter(e => 
    (e.patient_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (e.mrn || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header Controls */}
      <div className="bg-white p-6 rounded-[40px] border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-center">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-600 transition-colors" size={22} />
          <input 
            type="text" 
            placeholder="Search patient to return medications..." 
            className="w-full pl-14 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-[28px] text-sm font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-purple-500/10 transition-all outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button className="flex items-center gap-2 px-6 py-4 bg-white border border-slate-200 rounded-[24px] text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 transition-all">
            <Calendar size={18} /> Date Range
          </button>
        </div>
      </div>

      {/* Main Patient Table */}
      <div className="bg-white border border-slate-200 rounded-[44px] overflow-hidden shadow-sm">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
           <div>
             <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
               <Pill size={24} className="text-purple-600" /> Ward Medication Returns
             </h3>
             <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Select an admitted patient to reconcile unused drugs</p>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b border-slate-100">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Patient Details</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">MRN & Adm #</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Location</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Attending</th>
                <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <Loader2 size={32} className="animate-spin text-purple-600 mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-24 text-center opacity-30">
                    <History size={64} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest">No admitted patients found</p>
                  </td>
                </tr>
              ) : (
                filtered.map((event) => (
                  <tr key={event.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center font-black text-purple-600 shadow-sm">
                          {event.patient_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800">{event.patient_name}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{event.gender}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <p className="text-xs font-black text-purple-600">MRN: {event.mrn}</p>
                        <p className="text-[10px] font-mono font-bold text-slate-500">{event.admission_number}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-700">{event.ward_name}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{event.room_number} / {event.bed_number}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                        <Activity size={14} className="text-slate-400"/>
                        <span>Dr. {event.doctor_first_name} {event.doctor_last_name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => handleOpenModal(event)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-purple-200 text-purple-600 hover:bg-purple-50 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm"
                      >
                        <Undo2 size={16} /> Reconcile Drugs
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* LINE-BY-LINE RECONCILIATION MODAL */}
      {isModalOpen && selectedPatient && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-6xl bg-white rounded-[40px] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/80 flex items-start justify-between shrink-0 rounded-t-[40px]">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-inner shrink-0">
                  <Undo2 size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">
                     Medication Return Request
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs font-bold text-slate-500 uppercase tracking-widest">
                    <span className="text-purple-600">{selectedPatient.patient_name}</span>
                    <span>•</span>
                    <span>{selectedPatient.mrn}</span>
                    <span>•</span>
                    <span>{selectedPatient.ward_name}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                <X size={24} />
              </button>
            </div>

            {/* Modal Body: Drug List */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-white">
              {modalLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-purple-600">
                  <Loader2 size={32} className="animate-spin mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest">Fetching Dispense & MAR Records...</p>
                </div>
              ) : dispensedDrugs.length === 0 ? (
                <div className="text-center py-20">
                  <Pill size={48} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-lg font-black text-slate-700">No Medications Dispensed</p>
                  <p className="text-sm text-slate-500 mt-1">There are no active pharmacy dispenses eligible for return.</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-3xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Drug & Dosage</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Dispensed</th>
                        <th className="px-6 py-4 text-[10px] font-black text-emerald-600 uppercase tracking-widest text-center bg-emerald-50/50">Used (MAR)</th>
                        <th className="px-6 py-4 text-[10px] font-black text-rose-600 uppercase tracking-widest text-center bg-rose-50/50">Qty Left</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Return Process</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dispensedDrugs.map((drug) => {
                        // Calculate unreturned physical balance
                        const physicalBalance = Number(drug.quantity_dispensed) - Number(drug.quantity_already_returned) - Number(drug.quantity_pending_return);
                        
                        // Calculate expected physical balance (just a guide using MAR)
                        const expectedPhysicalLeft = physicalBalance - Number(drug.quantity_used);

                        const isFullyReturned = physicalBalance <= 0;
                        const isPending = Number(drug.quantity_pending_return) > 0;

                        return (
                          <tr key={drug.dispensing_id} className="hover:bg-slate-50/50">
                            <td className="px-6 py-4">
                              <p className="text-sm font-black text-slate-800">{drug.drug_name}</p>
                              <p className="text-[10px] font-bold text-slate-400 mt-0.5">{drug.dosage}</p>
                            </td>
                            
                            <td className="px-6 py-4 text-center">
                              <span className="text-sm font-bold text-slate-700">{drug.quantity_dispensed - drug.quantity_already_returned}</span>
                              <span className="text-[10px] text-slate-400 ml-1">{drug.unit}</span>
                            </td>

                            <td className="px-6 py-4 text-center bg-emerald-50/10">
                              <span className="text-sm font-black text-emerald-600" title="Based on MAR Administrations">{drug.quantity_used}</span>
                            </td>

                            <td className="px-6 py-4 text-center bg-rose-50/10">
                              <span className="text-lg font-black text-rose-600">
                                {expectedPhysicalLeft < 0 ? 0 : expectedPhysicalLeft}
                              </span>
                            </td>

                            <td className="px-6 py-4 w-[340px]">
                              {isFullyReturned ? (
                                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-2 rounded-xl">
                                  <CheckCircle2 size={14} /> Fully Reconciled
                                </div>
                              ) : (
                                <div className="flex flex-col gap-2">
                                  {isPending && (
                                    <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1.5 rounded-lg w-fit uppercase tracking-widest">
                                      <Loader2 size={12} className="animate-spin" /> {drug.quantity_pending_return} Pending Review
                                    </div>
                                  )}
                                  
                                  {physicalBalance > 0 && (
                                    <div className="flex gap-2">
                                      <input 
                                        type="number" 
                                        min="1" 
                                        max={physicalBalance}
                                        placeholder="Qty"
                                        value={returnForms[drug.dispensing_id]?.qty || ''}
                                        onChange={(e) => handleFormChange(drug.dispensing_id, 'qty', e.target.value)}
                                        className="w-20 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-purple-500 transition-colors"
                                      />
                                      <input 
                                        type="text" 
                                        placeholder="Reason (e.g., patient discharged)"
                                        value={returnForms[drug.dispensing_id]?.reason || ''}
                                        onChange={(e) => handleFormChange(drug.dispensing_id, 'reason', e.target.value)}
                                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-purple-500 transition-colors"
                                      />
                                      <button 
                                        onClick={() => handleSubmitReturn(drug)}
                                        disabled={isSubmitting === drug.dispensing_id}
                                        className="p-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 shrink-0"
                                      >
                                        {isSubmitting === drug.dispensing_id ? <Loader2 size={16} className="animate-spin"/> : <Send size={16} />}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0 rounded-b-[40px]">
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-xl border border-amber-100">
                <AlertCircle size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Pharmacy must physically receive and verify before ledger adjusts</span>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                Close Panel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default WardMedicationReturns;

// import React, { useState, useEffect } from 'react';
// import { 
//   Search, 
//   Calendar, 
//   Download, 
//   History, 
//   Pill,
//   Undo2,
//   X,
//   Send,
//   AlertCircle,
//   CheckCircle2,
//   Activity,
//   User,
//   MoreVertical,
//   Loader2
// } from 'lucide-react';
// import { createPortal } from 'react-dom';
// import { wardService } from '../services/ward.service'; 

// const WardMedicationReturns: React.FC = () => {
//   const [searchTerm, setSearchTerm] = useState('');
//   const [admissions, setAdmissions] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);

//   // Modal States
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
//   const [dispensedDrugs, setDispensedDrugs] = useState<any[]>([]);
//   const [modalLoading, setModalLoading] = useState(false);

//   // Return Form State (Tracks inputs for each row by dispensing_id)
//   const [returnForms, setReturnForms] = useState<Record<number, { qty: number | string; reason: string }>>({});
//   const [isSubmitting, setIsSubmitting] = useState<number | null>(null); // tracks which row is submitting

//   useEffect(() => {
//     // Mock Fetching Admissions/Encounters
//     const fetchAdmissions = async () => {
//       setLoading(true);
//       try {
//         // const response = await wardService.getAdmissions();
//         // setAdmissions(response.data);
        
//         // MOCK DATA FOR UI PREVIEW
//         setAdmissions([
//           {
//             id: 1,
//             encounter_id: 101,
//             patient_name: "Sarah Jenkins",
//             gender: "Female",
//             mrn: "MRN-99821",
//             admission_number: "ADM-2026-001",
//             ward_name: "General Ward A",
//             room_number: "Room 102",
//             bed_number: "Bed 4",
//             payer_name: "Aetna HMO",
//             doctor_first_name: "James",
//             doctor_last_name: "Wilson",
//             admission_date: "2026-08-25T10:00:00Z"
//           }
//         ]);
//       } catch (err) {
//         console.error("Failed to load admissions", err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchAdmissions();
//   }, []);

//   const handleOpenModal = async (patient: any) => {
//     setSelectedPatient(patient);
//     setIsModalOpen(true);
//     setModalLoading(true);

//     try {
//       // Fetch dispensed drugs for this encounter
//       // const response = await wardService.getDispensedMedications(patient.encounter_id);
      
//       // MOCK DATA FOR UI PREVIEW
//       setTimeout(() => {
//         setDispensedDrugs([
//           {
//             dispensing_id: 501,
//             drug_name: "Paracetamol 500mg Tablet",
//             dosage: "1000mg",
//             quantity_dispensed: 20,
//             quantity_used: 4, // From MAR
//             quantity_pending_return: 0,
//             unit: "Tabs"
//           },
//           {
//             dispensing_id: 502,
//             drug_name: "Ceftriaxone 1g Injection",
//             dosage: "1g",
//             quantity_dispensed: 5,
//             quantity_used: 5, // Fully used
//             quantity_pending_return: 0,
//             unit: "Vials"
//           },
//           {
//             dispensing_id: 503,
//             drug_name: "Ibuprofen 100mg/5ml Syrup",
//             dosage: "10ml",
//             quantity_dispensed: 2,
//             quantity_used: 0, 
//             quantity_pending_return: 1, // Already requested 1
//             unit: "Bottles"
//           }
//         ]);
//         setModalLoading(false);
//       }, 800);
//     } catch (err) {
//       console.error(err);
//       setModalLoading(false);
//     }
//   };

//   const handleFormChange = (dispenseId: number, field: 'qty' | 'reason', value: any) => {
//     setReturnForms(prev => ({
//       ...prev,
//       [dispenseId]: {
//         ...prev[dispenseId],
//         [field]: value
//       }
//     }));
//   };

//   const handleSubmitReturn = async (drug: any) => {
//     const form = returnForms[drug.dispensing_id];
//     if (!form || !form.qty || !form.reason.trim()) {
//       alert("Please provide both quantity and reason.");
//       return;
//     }

//     const qtyLeft = drug.quantity_dispensed - drug.quantity_used - drug.quantity_pending_return;
//     if (Number(form.qty) > qtyLeft) {
//       alert("Cannot return more than the available quantity left.");
//       return;
//     }

//     setIsSubmitting(drug.dispensing_id);
//     try {
//       // await wardService.requestMedicationReturn({
//       //   dispensing_id: drug.dispensing_id,
//       //   qty: Number(form.qty),
//       //   reason: form.reason
//       // });

//       // Mock Success
//       setTimeout(() => {
//         alert("Return request sent to Pharmacy!");
        
//         // Update local state to reflect pending return
//         setDispensedDrugs(prev => prev.map(d => 
//           d.dispensing_id === drug.dispensing_id 
//             ? { ...d, quantity_pending_return: d.quantity_pending_return + Number(form.qty) } 
//             : d
//         ));
        
//         // Clear form
//         setReturnForms(prev => ({ ...prev, [drug.dispensing_id]: { qty: '', reason: '' } }));
//         setIsSubmitting(null);
//       }, 1000);

//     } catch (err) {
//       alert("Failed to submit request.");
//       setIsSubmitting(null);
//     }
//   };

//   const filtered = admissions.filter(e => 
//     (e.patient_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
//     (e.mrn || '').toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   return (
//     <div className="space-y-8 animate-in fade-in duration-500 pb-20">
//       {/* Header Controls */}
//       <div className="bg-white p-6 rounded-[40px] border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-center">
//         <div className="relative flex-1 w-full group">
//           <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-600 transition-colors" size={22} />
//           <input 
//             type="text" 
//             placeholder="Search patient to return medications..." 
//             className="w-full pl-14 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-[28px] text-sm font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-purple-500/10 transition-all outline-none"
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//           />
//         </div>
//         <div className="flex items-center gap-3 w-full md:w-auto">
//           <button className="flex items-center gap-2 px-6 py-4 bg-white border border-slate-200 rounded-[24px] text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 transition-all">
//             <Calendar size={18} /> Date Range
//           </button>
//         </div>
//       </div>

//       {/* Main Patient Table */}
//       <div className="bg-white border border-slate-200 rounded-[44px] overflow-hidden shadow-sm">
//         <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
//            <div>
//              <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
//                <Pill size={24} className="text-purple-600" /> Ward Medication Returns
//              </h3>
//              <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Select an admitted patient to reconcile unused drugs</p>
//            </div>
//         </div>

//         <div className="overflow-x-auto">
//           <table className="w-full text-left">
//             <thead>
//               <tr className="bg-white border-b border-slate-100">
//                 <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Patient Details</th>
//                 <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">MRN & Adm #</th>
//                 <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Location</th>
//                 <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Attending</th>
//                 <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-50">
//               {filtered.map((event) => (
//                 <tr key={event.id} className="hover:bg-slate-50/50 transition-colors group">
//                   <td className="px-8 py-6">
//                     <div className="flex items-center gap-4">
//                       <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center font-black text-purple-600 shadow-sm">
//                         {event.patient_name?.charAt(0)}
//                       </div>
//                       <div>
//                         <p className="text-sm font-black text-slate-800">{event.patient_name}</p>
//                         <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{event.gender}</p>
//                       </div>
//                     </div>
//                   </td>
//                   <td className="px-8 py-6">
//                     <div className="space-y-1">
//                       <p className="text-xs font-black text-purple-600">MRN: {event.mrn}</p>
//                       <p className="text-[10px] font-mono font-bold text-slate-500">{event.admission_number}</p>
//                     </div>
//                   </td>
//                   <td className="px-8 py-6">
//                     <div className="space-y-1">
//                       <p className="text-xs font-bold text-slate-700">{event.ward_name}</p>
//                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{event.room_number} / {event.bed_number}</p>
//                     </div>
//                   </td>
//                   <td className="px-8 py-6">
//                     <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
//                       <Activity size={14} className="text-slate-400"/>
//                       <span>Dr. {event.doctor_first_name} {event.doctor_last_name}</span>
//                     </div>
//                   </td>
//                   <td className="px-8 py-6 text-right">
//                     <button 
//                       onClick={() => handleOpenModal(event)}
//                       className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-purple-200 text-purple-600 hover:bg-purple-50 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm"
//                     >
//                       <Undo2 size={16} /> Reconcile Drugs
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* LINE-BY-LINE RECONCILIATION MODAL */}
//       {isModalOpen && selectedPatient && createPortal(
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
//           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
//           <div className="relative w-full max-w-6xl bg-white rounded-[40px] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            
//             {/* Modal Header */}
//             <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/80 flex items-start justify-between shrink-0 rounded-t-[40px]">
//               <div className="flex items-center gap-5">
//                 <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-inner shrink-0">
//                   <Undo2 size={28} />
//                 </div>
//                 <div>
//                   <h2 className="text-xl font-black text-slate-800 tracking-tight">
//                      Medication Return Request
//                   </h2>
//                   <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs font-bold text-slate-500 uppercase tracking-widest">
//                     <span className="text-purple-600">{selectedPatient.patient_name}</span>
//                     <span>•</span>
//                     <span>{selectedPatient.mrn}</span>
//                     <span>•</span>
//                     <span>{selectedPatient.ward_name}</span>
//                   </div>
//                 </div>
//               </div>
//               <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
//                 <X size={24} />
//               </button>
//             </div>

//             {/* Modal Body: Drug List */}
//             <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-white">
//               {modalLoading ? (
//                 <div className="flex flex-col items-center justify-center py-20 text-purple-600">
//                   <Loader2 size={32} className="animate-spin mb-4" />
//                   <p className="text-xs font-black uppercase tracking-widest">Fetching Dispense & MAR Records...</p>
//                 </div>
//               ) : dispensedDrugs.length === 0 ? (
//                 <div className="text-center py-20">
//                   <Pill size={48} className="mx-auto text-slate-200 mb-4" />
//                   <p className="text-lg font-black text-slate-700">No Medications Dispensed</p>
//                   <p className="text-sm text-slate-500 mt-1">There are no active pharmacy dispenses to return for this patient.</p>
//                 </div>
//               ) : (
//                 <div className="border border-slate-200 rounded-3xl overflow-hidden">
//                   <table className="w-full text-left">
//                     <thead className="bg-slate-50 border-b border-slate-200">
//                       <tr>
//                         <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Drug & Dosage</th>
//                         <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Dispensed</th>
//                         <th className="px-6 py-4 text-[10px] font-black text-emerald-600 uppercase tracking-widest text-center bg-emerald-50/50">Used (MAR)</th>
//                         <th className="px-6 py-4 text-[10px] font-black text-rose-600 uppercase tracking-widest text-center bg-rose-50/50">Qty Left</th>
//                         <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Return Process</th>
//                       </tr>
//                     </thead>
//                     <tbody className="divide-y divide-slate-100">
//                       {dispensedDrugs.map((drug) => {
//                         const qtyLeft = drug.quantity_dispensed - drug.quantity_used - drug.quantity_pending_return;
//                         const isFullyUsed = qtyLeft <= 0 && drug.quantity_pending_return === 0;
//                         const isPending = drug.quantity_pending_return > 0;

//                         return (
//                           <tr key={drug.dispensing_id} className="hover:bg-slate-50/50">
//                             <td className="px-6 py-4">
//                               <p className="text-sm font-black text-slate-800">{drug.drug_name}</p>
//                               <p className="text-[10px] font-bold text-slate-400 mt-0.5">{drug.dosage}</p>
//                             </td>
                            
//                             <td className="px-6 py-4 text-center">
//                               <span className="text-sm font-bold text-slate-700">{drug.quantity_dispensed}</span>
//                               <span className="text-[10px] text-slate-400 ml-1">{drug.unit}</span>
//                             </td>

//                             <td className="px-6 py-4 text-center bg-emerald-50/10">
//                               <span className="text-sm font-black text-emerald-600">{drug.quantity_used}</span>
//                             </td>

//                             <td className="px-6 py-4 text-center bg-rose-50/10">
//                               <span className="text-lg font-black text-rose-600">{qtyLeft}</span>
//                             </td>

//                             <td className="px-6 py-4 w-[340px]">
//                               {isFullyUsed ? (
//                                 <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-2 rounded-xl">
//                                   <CheckCircle2 size={14} /> Fully Consumed
//                                 </div>
//                               ) : (
//                                 <div className="flex flex-col gap-2">
//                                   {isPending && (
//                                     <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1.5 rounded-lg w-fit uppercase tracking-widest">
//                                       <Loader2 size={12} className="animate-spin" /> {drug.quantity_pending_return} Pending Review
//                                     </div>
//                                   )}
                                  
//                                   {qtyLeft > 0 && (
//                                     <div className="flex gap-2">
//                                       <input 
//                                         type="number" 
//                                         min="1" 
//                                         max={qtyLeft}
//                                         placeholder="Qty"
//                                         value={returnForms[drug.dispensing_id]?.qty || ''}
//                                         onChange={(e) => handleFormChange(drug.dispensing_id, 'qty', e.target.value)}
//                                         className="w-20 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-purple-500 transition-colors"
//                                       />
//                                       <input 
//                                         type="text" 
//                                         placeholder="Reason (e.g., patient discharged)"
//                                         value={returnForms[drug.dispensing_id]?.reason || ''}
//                                         onChange={(e) => handleFormChange(drug.dispensing_id, 'reason', e.target.value)}
//                                         className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-purple-500 transition-colors"
//                                       />
//                                       <button 
//                                         onClick={() => handleSubmitReturn(drug)}
//                                         disabled={isSubmitting === drug.dispensing_id}
//                                         className="p-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 shrink-0"
//                                       >
//                                         {isSubmitting === drug.dispensing_id ? <Loader2 size={16} className="animate-spin"/> : <Send size={16} />}
//                                       </button>
//                                     </div>
//                                   )}
//                                 </div>
//                               )}
//                             </td>
//                           </tr>
//                         );
//                       })}
//                     </tbody>
//                   </table>
//                 </div>
//               )}
//             </div>
            
//             <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0 rounded-b-[40px]">
//               <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-xl border border-amber-100">
//                 <AlertCircle size={16} />
//                 <span className="text-[10px] font-black uppercase tracking-widest">Pharmacy must physically receive and verify before ledger adjusts</span>
//               </div>
//               <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
//                 Close Panel
//               </button>
//             </div>
//           </div>
//         </div>,
//         document.body
//       )}
//     </div>
//   );
// };

// export default WardMedicationReturns;

// import React, { useState, useEffect } from 'react';
// import { 
//   History, 
//   Search, 
//   Calendar, 
//   Download, 
//   Filter, 
//   ArrowUpRight, 
//   ArrowDownLeft, 
//   Clock, 
//   User, 
//   ChevronRight,
//   MoreVertical,
//   Activity,
//   LogOut,
//   LogIn,
//   Printer
// } from 'lucide-react';
// import { wardService } from '../services/ward.service';

// const WardAdmissions: React.FC = () => {
//   const [searchTerm, setSearchTerm] = useState('');
//   const [admissions, setAdmissions] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchAdmissions = async () => {
//       try {
//         const response = await wardService.getAdmissions();
//         const results = response?.data?.results || response?.data || [];
//         setAdmissions(Array.isArray(results) ? results : []);
//       } catch (err) {
//         console.error("Failed to load admissions", err);
//         setAdmissions([]);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchAdmissions();
//   }, []);

//   const filtered = admissions.filter(e => 
//     (e.patient_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
//     (e.bed_number || '').toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   return (
//     <div className="space-y-8 animate-in fade-in duration-500 pb-20">
//       {/* Module Header Controls */}
//       <div className="bg-white p-6 rounded-[40px] border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-center">
//         <div className="relative flex-1 w-full group">
//           <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={22} />
//           <input 
//             type="text" 
//             placeholder="Search registry by Patient or Bed Number..." 
//             className="w-full pl-14 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-[28px] text-sm font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-brand-active0/10 transition-all outline-none"
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//           />
//         </div>
//         <div className="flex items-center gap-3 w-full md:w-auto">
//           <button className="flex items-center gap-2 px-6 py-4 bg-white border border-slate-200 rounded-[24px] text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 transition-all">
//             <Calendar size={18} /> Date Range
//           </button>
//           <button className="bg-slate-900 text-white px-8 py-4 rounded-[24px] font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2">
//             <Download size={18} /> Export Log
//           </button>
//         </div>
//       </div>

//       {/* Event Table */}
//       <div className="bg-white border border-slate-200 rounded-[44px] overflow-hidden shadow-sm">
//         <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
//            <div>
//              <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
//                <History size={24} className="text-brand-primary" /> Facility Lifecycle Log
//              </h3>
//              <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Real-time Admission and Turnover Tracking</p>
//            </div>
//            <div className="flex items-center gap-2">
//               <span className="bg-brand-active text-brand-primary px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border border-brand-active">
//                 {admissions.length} Total Records
//               </span>
//            </div>
//         </div>

//         <div className="overflow-x-auto">
//           <table className="w-full text-left">
//             <thead>
//               <tr className="bg-white border-b border-slate-100">
//                 <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Lifecycle</th>
//                 <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Patient Details</th>
//                 <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">MRN & Adm #</th>
//                 <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Location</th>
//                 <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Payer & Doctor</th>
//                 <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Stage</th>
//                 <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Timestamp</th>
//                 <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-50">
//               {filtered.map((event) => (
//                 <tr key={event.id} className="hover:bg-slate-50/50 transition-colors group">
//                   <td className="px-8 py-6">
//                     <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border
//                       ${event.status === 'Discharged' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}
//                     `}>
//                       {event.status === 'Discharged' ? <LogOut size={14}/> : <LogIn size={14}/>}
//                       {event.status === 'Discharged' ? 'Discharge' : 'Admission'}
//                     </div>
//                   </td>
//                   <td className="px-8 py-6">
//                     <div className="flex items-center gap-4">
//                       <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-500 group-hover:bg-brand-primary group-hover:text-white transition-all shadow-sm">
//                         {event.first_name?.charAt(0) || event.patient_name?.charAt(0)}
//                       </div>
//                       <div>
//                         <p className="text-sm font-black text-slate-800">{event.first_name} {event.last_name}</p>
//                         <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
//                           <span>{event.gender}</span>
//                           <span>•</span>
//                           <span>{event.phone}</span>
//                         </div>
//                       </div>
//                     </div>
//                   </td>
//                   <td className="px-8 py-6">
//                     <div className="space-y-1">
//                       <p className="text-xs font-black text-brand-primary">MRN: {event.mrn}</p>
//                       <p className="text-[10px] font-mono font-bold text-slate-500">{event.admission_number}</p>
//                     </div>
//                   </td>
//                   <td className="px-8 py-6">
//                     <div className="space-y-1">
//                       <p className="text-xs font-bold text-slate-700">{event.ward_name}</p>
//                       <p className="text-[10px] font-black text-brand-active0 uppercase tracking-widest">{event.room_number} / {event.bed_number}</p>
//                     </div>
//                   </td>
//                   <td className="px-8 py-6">
//                     <div className="space-y-1">
//                       <p className="text-xs font-bold text-slate-700">{event.payer_name}</p>
//                       <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
//                         <Activity size={12} />
//                         <span>Dr. {event.doctor_first_name} {event.doctor_last_name}</span>
//                       </div>
//                     </div>
//                   </td>
//                   <td className="px-8 py-6">
//                     <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border
//                       ${event.discharge_stage === 'DOCTOR_MARKED' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-400 border-slate-100'}
//                     `}>
//                       {event.discharge_stage ? event.discharge_stage.replace(/_/g, ' ') : 'PENDING'}
//                     </div>
//                   </td>
//                   <td className="px-8 py-6">
//                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
//                         <Clock size={14} className="text-slate-300" />
//                         {new Date(event.admission_date).toLocaleDateString()}
//                      </div>
//                   </td>
//                   <td className="px-8 py-6 text-right">
//                     <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
//                       <button 
//                         onClick={() => {
//                           const admissionNumber = event.admission_number || `ADM-2026-${String(event.id).padStart(5, '0')}`;
//                           window.open(`/print/wristband/${admissionNumber}`, '_blank');
//                         }}
//                         className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-brand-primary transition-all shadow-sm"
//                         title="Print Wristband"
//                       >
//                         <Printer size={18} />
//                       </button>
//                       <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-all shadow-sm">
//                         <MoreVertical size={18} />
//                       </button>
//                     </div>
//                   </td>
//                 </tr>
//               ))}
//               {filtered.length === 0 && (
//                 <tr>
//                   <td colSpan={7} className="py-24 text-center opacity-30">
//                     <History size={64} className="mx-auto text-slate-300 mb-4" />
//                     <p className="text-xs font-black uppercase tracking-widest">No activity found for current filters</p>
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* Info Panel */}
//       <div className="bg-brand-active border border-brand-active p-8 rounded-[40px] flex items-center justify-between">
//          <div className="flex items-center gap-6">
//             <div className="p-3 bg-white text-brand-primary rounded-2xl shadow-sm">
//                <Activity size={24} />
//             </div>
//             <div>
//                <h4 className="text-lg font-black text-brand-primary tracking-tight">Facility Utilization Analytics</h4>
//                <p className="text-sm text-brand-primary/80 leading-relaxed font-medium mt-1">
//                  Current turnover efficiency is tracked against a target of 1h 30m from discharge to new admission readiness.
//                </p>
//             </div>
//          </div>
//          <button className="hidden md:flex items-center gap-2 text-xs font-black text-brand-primary uppercase tracking-widest hover:underline">
//             View KPIs <ArrowUpRight size={16} />
//          </button>
//       </div>
//     </div>
//   );
// };

// export default WardAdmissions;
