import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { billingService } from '../../../services/billing.service'; // Adjust path as needed
import { Loader2, AlertTriangle, Printer } from 'lucide-react';

const PrescriptionPrintTemplate: React.FC = () => {
  const { encounterNumber } = useParams<{ encounterNumber: string }>();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!encounterNumber) throw new Error("No encounter number provided");
        
        // Fetch the preview data, we will extract ONLY the drugs
        const res = await billingService.getOPDOrderPreview(encounterNumber);
        const previewData = res.data?.data || res.data;

        if (previewData) {
          setData(previewData);
          setTimeout(() => window.print(), 1000);
        } else {
          setError('Prescription details not found.');
        }
      } catch (err) {
        setError('Could not load prescription data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [encounterNumber]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 size={48} className="animate-spin text-[#3B309A]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
          <AlertTriangle size={32} className="text-red-600 mx-auto mb-4" />
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  // Extract Age and Gender
  const ageGenderParts = data.patient_details?.age_gender?.split('/') || [];
  const age = ageGenderParts.slice(0, -1).join('/').trim() || data.patient_details?.age_gender || '';
  const gender = ageGenderParts.length > 1 ? ageGenderParts[ageGenderParts.length - 1]?.trim() : '';

  // Recursively find all items that contain "prescription_info"
  const extractPrescriptions = (items: any[]) => {
    let drugs: any[] = [];
    items?.forEach(item => {
      if (item.prescription_info) {
        drugs.push(item);
      }
      if (item.children && item.children.length > 0) {
        drugs = [...drugs, ...extractPrescriptions(item.children)];
      }
    });
    return drugs;
  };

  const prescribedDrugs = extractPrescriptions(data.items || []);

  return (
    <div
      className="fixed inset-0 bg-slate-100 overflow-y-auto px-4 py-20 print:static print:bg-white print:p-0"
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-8 print:hidden z-[100] shadow-md">
        <p className="font-bold text-sm">Clinical Prescription Preview</p>
        <button onClick={() => window.print()} className="bg-[#3B309A] hover:bg-brand-primary text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all">
          <Printer size={16} /> Print Prescription
        </button>
      </div>

      <style>{`@page { size: A5; margin: 10mm; }`}</style>
      
      {/* A5 Sized Prescription Pad (Standard Rx Size) */}
      <div
        className="w-[148mm] min-h-[210mm] bg-white shadow-2xl print:shadow-none print:m-0 print:border-none print:w-full border border-slate-200 mx-auto transform-gpu transition-all flex flex-col relative"
        style={{ padding: '8mm' }}
      >
        {/* Header Block */}
        <div className="w-full flex items-center justify-between border-b-2 border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            {/* Make sure the logo path is correct */}
            <img src="/assets/login-bg.jpeg" alt="Gracespring Logo" style={{ width: '25mm', height: 'auto', objectFit: 'contain' }} />
            <div>
              <h1 className="text-slate-900 font-black leading-none tracking-tight uppercase" style={{ fontSize: '14pt' }}>
                Gracespring Hospitals
              </h1>
              <p className="text-slate-500 mt-1" style={{ fontSize: '7pt', lineHeight: 1.2 }}>
                Plot 3, Block 32, Ajayi Apata Estate<br/>
                Sangotedo, Lekki, Lagos, Nigeria<br/>
                +234 705 648 2776
              </p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-slate-800 font-black uppercase tracking-widest" style={{ fontSize: '18pt' }}>Rx</h2>
            <p className="text-slate-500 font-bold" style={{ fontSize: '8pt' }}>PRESCRIPTION</p>
          </div>
        </div>

        {/* Patient Info Block */}
        <div className="border border-slate-300 rounded-lg p-3 mb-6 bg-slate-50/50 relative z-10">
          <div className="grid grid-cols-2 gap-y-2">
            <div className="col-span-2 flex items-end border-b border-slate-200 pb-1">
              <span className="text-slate-500 font-bold uppercase w-16" style={{ fontSize: '7pt' }}>Name:</span>
              <span className="font-black text-slate-800 uppercase" style={{ fontSize: '10pt' }}>{data.patient_details?.full_name}</span>
            </div>
            <div className="col-span-1 flex items-end border-b border-slate-200 pb-1 pr-2">
              <span className="text-slate-500 font-bold uppercase w-16" style={{ fontSize: '7pt' }}>MRN:</span>
              <span className="font-bold text-slate-800" style={{ fontSize: '9pt' }}>{data.patient_details?.mrn}</span>
            </div>
            <div className="col-span-1 flex items-end border-b border-slate-200 pb-1 pl-2">
              <span className="text-slate-500 font-bold uppercase w-16" style={{ fontSize: '7pt' }}>Date:</span>
              <span className="font-bold text-slate-800" style={{ fontSize: '9pt' }}>{new Date().toLocaleDateString('en-GB')}</span>
            </div>
            <div className="col-span-1 flex items-end">
              <span className="text-slate-500 font-bold uppercase w-16" style={{ fontSize: '7pt' }}>Age/Sex:</span>
              <span className="font-bold text-slate-800" style={{ fontSize: '9pt' }}>{age} / {gender}</span>
            </div>
            <div className="col-span-1 flex items-end pl-2">
              <span className="text-slate-500 font-bold uppercase w-16" style={{ fontSize: '7pt' }}>Doctor:</span>
              <span className="font-bold text-slate-800" style={{ fontSize: '9pt' }}>{data.visit_details?.doctor_name}</span>
            </div>
          </div>
        </div>

        {/* Big Rx Symbol Background Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0">
          <span style={{ fontSize: '250pt', fontFamily: 'serif', fontWeight: 'bold' }}>Rx</span>
        </div>

        {/* Prescription List */}
        <div className="flex-1 z-10">
          {prescribedDrugs.length === 0 ? (
            <div className="text-center py-10 text-slate-400 italic font-bold" style={{ fontSize: '10pt' }}>
              No medications prescribed in this encounter.
            </div>
          ) : (
            <div className="space-y-5">
              {prescribedDrugs.map((drug, index) => {
                const info = drug.prescription_info;
                return (
                  <div key={index} className="flex gap-3 items-start border-b border-slate-100 pb-3">
                    <span className="font-bold text-slate-400" style={{ fontSize: '10pt' }}>{index + 1}.</span>
                    <div className="flex-1">
                      {/* Drug Name and Strength */}
                      <div className="flex justify-between items-baseline mb-1">
                        <h4 className="font-black text-slate-900 uppercase tracking-tight" style={{ fontSize: '11pt' }}>
                          {drug.description} 
                        </h4>
                        <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded" style={{ fontSize: '8pt' }}>
                          Dispense: <span className="font-black">{info.calculated_total_qty || drug.quantity}</span>
                        </span>
                      </div>
                      
                      {/* Sig (Instructions) */}
                      {/* Sig (Instructions) */}
                      <div className="text-slate-800 leading-snug" style={{ fontSize: '9.5pt' }}>
                        <span className="font-bold text-slate-500 italic mr-1">Instructions:</span>
                        Take <span className="font-bold">{info.dosage || info.clinical_dose}</span> via <span className="font-bold">{info.route}</span>, <span className="font-bold">{info.frequency}</span> for <span className="font-bold">{info.duration}</span>.
                      </div>
                      {/* <div className="text-slate-800 leading-snug" style={{ fontSize: '9.5pt' }}>
                        <span className="font-bold text-slate-500 italic mr-1">Sig:</span>
                        Take <span className="font-bold">{info.clinical_dose}</span> via <span className="font-bold">{info.route}</span>, <span className="font-bold">{info.frequency}</span> for <span className="font-bold">{info.duration}</span>.
                      </div> */}

                      {/* Additional Instructions if any */}
                      {info.instructions && (
                        <div className="text-slate-600 italic mt-0.5" style={{ fontSize: '8.5pt' }}>
                          Note: {info.instructions}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Doctor Signature & Footer */}
        <div className="mt-10 pt-4 z-10">
          <div className="flex justify-between items-end">
            <div className="w-1/2">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 border border-slate-400"></div>
                <span className="text-slate-500 font-bold uppercase" style={{ fontSize: '7pt' }}>Generic Substitution Permitted</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border border-slate-400"></div>
                <span className="text-slate-500 font-bold uppercase" style={{ fontSize: '7pt' }}>Dispense as Written</span>
              </div>
            </div>

            <div className="w-1/2 text-center">
              <div className="border-b border-slate-800 h-8 mb-1"></div>
              <p className="font-black text-slate-800 uppercase" style={{ fontSize: '8pt' }}>{data.visit_details?.doctor_name}</p>
              <p className="text-slate-500 font-bold uppercase tracking-widest" style={{ fontSize: '6pt' }}>Prescriber Signature</p>
            </div>
          </div>
          
          <div className="text-center mt-6 border-t border-slate-200 pt-2">
             <p className="text-[7px] text-slate-400 font-bold uppercase tracking-widest">
               Electronically generated via Gracespring EMR • Encounter: {encounterNumber}
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionPrintTemplate;


// import React, { useEffect, useState } from 'react';
// import { useParams, useSearchParams } from 'react-router-dom';
// import { billingService } from '../../../services/billing.service'; // Adjust path if needed
// import { Loader2, AlertTriangle, Printer } from 'lucide-react';

// const PrescriptionPrintTemplate: React.FC = () => {
//   const { encounterNumber } = useParams<{ encounterNumber: string }>();
  
//   const [data, setData] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         if (!encounterNumber) throw new Error("No encounter number provided");
        
//         // We fetch the same preview data, but we will ONLY extract the drugs
//         const res = await billingService.getOPDOrderPreview(encounterNumber);
//         const previewData = res.data?.data || res.data;

//         if (previewData) {
//           setData(previewData);
//           setTimeout(() => window.print(), 1000);
//         } else {
//           setError('Prescription details not found.');
//         }
//       } catch (err) {
//         setError('Could not load prescription data.');
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchData();
//   }, [encounterNumber]);

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center min-h-screen bg-slate-50">
//         <Loader2 size={48} className="animate-spin text-[#3B309A]" />
//       </div>
//     );
//   }

//   if (error || !data) {
//     return (
//       <div className="flex items-center justify-center min-h-screen bg-slate-50">
//         <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
//           <AlertTriangle size={32} className="text-red-600 mx-auto mb-4" />
//           <p className="text-slate-500">{error}</p>
//         </div>
//       </div>
//     );
//   }

//   // Extract Age and Gender
//   const ageGenderParts = data.patient_details?.age_gender?.split('/') || [];
//   const age = ageGenderParts.slice(0, -1).join('/').trim() || data.patient_details?.age_gender || '';
//   const gender = ageGenderParts.length > 1 ? ageGenderParts[ageGenderParts.length - 1]?.trim() : '';

//   // Recursively find all items that contain "prescription_info"
//   const extractPrescriptions = (items: any[]) => {
//     let drugs: any[] = [];
//     items?.forEach(item => {
//       if (item.prescription_info) {
//         drugs.push(item);
//       }
//       if (item.children && item.children.length > 0) {
//         drugs = [...drugs, ...extractPrescriptions(item.children)];
//       }
//     });
//     return drugs;
//   };

//   const prescribedDrugs = extractPrescriptions(data.items || []);

//   return (
//     <div
//       className="fixed inset-0 bg-slate-100 overflow-y-auto px-4 py-20 print:static print:bg-white print:p-0"
//       style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
//     >
//       <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-8 print:hidden z-[100] shadow-md">
//         <p className="font-bold text-sm">Clinical Prescription Preview</p>
//         <button onClick={() => window.print()} className="bg-[#3B309A] hover:bg-brand-primary text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all">
//           <Printer size={16} /> Print Prescription
//         </button>
//       </div>

//       <style>{`@page { size: A5; margin: 10mm; }`}</style>
      
//       {/* A5 Sized Prescription Pad (Standard Rx Size) */}
//       <div
//         className="w-[148mm] min-h-[210mm] bg-white shadow-2xl print:shadow-none print:m-0 print:border-none print:w-full border border-slate-200 mx-auto transform-gpu transition-all flex flex-col relative"
//         style={{ padding: '8mm' }}
//       >
//         {/* Header Block */}
//         <div className="w-full flex items-center justify-between border-b-2 border-slate-800 pb-4 mb-4">
//           <div className="flex items-center gap-3">
//             <img src="/assets/login-bg.jpeg" alt="Gracespring Logo" style={{ width: '25mm', height: 'auto', objectFit: 'contain' }} />
//             <div>
//               <h1 className="text-slate-900 font-black leading-none tracking-tight uppercase" style={{ fontSize: '14pt' }}>
//                 Gracespring Hospitals
//               </h1>
//               <p className="text-slate-500 mt-1" style={{ fontSize: '7pt', lineHeight: 1.2 }}>
//                 Plot 3, Block 32, Ajayi Apata Estate<br/>
//                 Sangotedo, Lekki, Lagos, Nigeria<br/>
//                 +234 705 648 2776
//               </p>
//             </div>
//           </div>
//           <div className="text-right">
//             <h2 className="text-slate-800 font-black uppercase tracking-widest" style={{ fontSize: '18pt' }}>Rx</h2>
//             <p className="text-slate-500 font-bold" style={{ fontSize: '8pt' }}>PRESCRIPTION</p>
//           </div>
//         </div>

//         {/* Patient Info Block */}
//         <div className="border border-slate-300 rounded-lg p-3 mb-6 bg-slate-50/50">
//           <div className="grid grid-cols-2 gap-y-2">
//             <div className="col-span-2 flex items-end border-b border-slate-200 pb-1">
//               <span className="text-slate-500 font-bold uppercase w-16" style={{ fontSize: '7pt' }}>Name:</span>
//               <span className="font-black text-slate-800 uppercase" style={{ fontSize: '10pt' }}>{data.patient_details?.full_name}</span>
//             </div>
//             <div className="col-span-1 flex items-end border-b border-slate-200 pb-1 pr-2">
//               <span className="text-slate-500 font-bold uppercase w-16" style={{ fontSize: '7pt' }}>MRN:</span>
//               <span className="font-bold text-slate-800" style={{ fontSize: '9pt' }}>{data.patient_details?.mrn}</span>
//             </div>
//             <div className="col-span-1 flex items-end border-b border-slate-200 pb-1 pl-2">
//               <span className="text-slate-500 font-bold uppercase w-16" style={{ fontSize: '7pt' }}>Date:</span>
//               <span className="font-bold text-slate-800" style={{ fontSize: '9pt' }}>{new Date().toLocaleDateString('en-GB')}</span>
//             </div>
//             <div className="col-span-1 flex items-end">
//               <span className="text-slate-500 font-bold uppercase w-16" style={{ fontSize: '7pt' }}>Age/Sex:</span>
//               <span className="font-bold text-slate-800" style={{ fontSize: '9pt' }}>{age} / {gender}</span>
//             </div>
//             <div className="col-span-1 flex items-end pl-2">
//               <span className="text-slate-500 font-bold uppercase w-16" style={{ fontSize: '7pt' }}>Doctor:</span>
//               <span className="font-bold text-slate-800" style={{ fontSize: '9pt' }}>{data.visit_details?.doctor_name}</span>
//             </div>
//           </div>
//         </div>

//         {/* Big Rx Symbol Background Watermark (Optional but looks authentic) */}
//         <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0">
//           <span style={{ fontSize: '250pt', fontFamily: 'serif', fontWeight: 'bold' }}>Rx</span>
//         </div>

//         {/* Prescription List */}
//         <div className="flex-1 z-10">
//           {prescribedDrugs.length === 0 ? (
//             <div className="text-center py-10 text-slate-400 italic font-bold" style={{ fontSize: '10pt' }}>
//               No medications prescribed in this encounter.
//             </div>
//           ) : (
//             <div className="space-y-5">
//               {prescribedDrugs.map((drug, index) => {
//                 const info = drug.prescription_info;
//                 return (
//                   <div key={index} className="flex gap-3 items-start border-b border-slate-100 pb-3">
//                     <span className="font-bold text-slate-400" style={{ fontSize: '10pt' }}>{index + 1}.</span>
//                     <div className="flex-1">
//                       {/* Drug Name and Strength */}
//                       <div className="flex justify-between items-baseline mb-1">
//                         <h4 className="font-black text-slate-900 uppercase tracking-tight" style={{ fontSize: '11pt' }}>
//                           {drug.description} 
//                         </h4>
//                         <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded" style={{ fontSize: '8pt' }}>
//                           Dispense: <span className="font-black">{info.calculated_total_qty || drug.quantity}</span>
//                         </span>
//                       </div>
                      
//                       {/* Sig (Instructions) */}
//                       <div className="text-slate-800 leading-snug" style={{ fontSize: '9.5pt' }}>
//                         <span className="font-bold text-slate-500 italic mr-1">Sig:</span>
//                         Take <span className="font-bold">{info.clinical_dose}</span> via <span className="font-bold">{info.route}</span>, <span className="font-bold">{info.frequency}</span> for <span className="font-bold">{info.duration}</span>.
//                       </div>

//                       {/* Additional Instructions if any */}
//                       {info.instructions && (
//                         <div className="text-slate-600 italic mt-0.5" style={{ fontSize: '8.5pt' }}>
//                           Note: {info.instructions}
//                         </div>
//                       )}
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>
//           )}
//         </div>

//         {/* Doctor Signature & Footer */}
//         <div className="mt-10 pt-4 z-10">
//           <div className="flex justify-between items-end">
//             <div className="w-1/2">
//               {/* Blank space for future notes or refils */}
//               <div className="flex items-center gap-2 mb-1">
//                 <div className="w-3 h-3 border border-slate-400"></div>
//                 <span className="text-slate-500 font-bold uppercase" style={{ fontSize: '7pt' }}>Generic Substitution Permitted</span>
//               </div>
//               <div className="flex items-center gap-2">
//                 <div className="w-3 h-3 border border-slate-400"></div>
//                 <span className="text-slate-500 font-bold uppercase" style={{ fontSize: '7pt' }}>Dispense as Written</span>
//               </div>
//             </div>

//             <div className="w-1/2 text-center">
//               <div className="border-b border-slate-800 h-8 mb-1"></div>
//               <p className="font-black text-slate-800 uppercase" style={{ fontSize: '8pt' }}>{data.visit_details?.doctor_name}</p>
//               <p className="text-slate-500 font-bold uppercase tracking-widest" style={{ fontSize: '6pt' }}>Prescriber Signature</p>
//             </div>
//           </div>
          
//           <div className="text-center mt-6 border-t border-slate-200 pt-2">
//              <p className="text-[7px] text-slate-400 font-bold uppercase tracking-widest">
//                Electronically generated via Gracespring EMR • Encounter: {encounterNumber}
//              </p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default PrescriptionPrintTemplate;