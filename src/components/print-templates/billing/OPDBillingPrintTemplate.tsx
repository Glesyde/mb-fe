import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { billingService } from '../../../services/billing.service';
import { Loader2, AlertTriangle, Printer, User, Calendar, CreditCard, Activity, FileText } from 'lucide-react';

const OPDBillingPrintTemplate: React.FC = () => {
  const { encounterNumber } = useParams<{ encounterNumber: string }>();
  const [searchParams] = useSearchParams();
  const printType = searchParams.get('type') || 'provisional'; // 'provisional' or 'receipt'
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!encounterNumber) throw new Error("No encounter number provided");
        
        // For OPD, both print and provisional currently use the order preview data structure
        // unless it's a specific paid receipt which would use ReceiptPrintTemplate.
        const res = await billingService.getOPDOrderPreview(encounterNumber);
        
        const previewData = res.data?.data || res.data;

        if (previewData) {
          setData(previewData);
          setTimeout(() => window.print(), 1000);
        } else {
          setError('Billing details not found.');
        }
      } catch (err) {
        setError('Could not load billing data.');
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

  const formatCurrency = (amount: number | string | undefined | null) => {
    if (amount === undefined || amount === null) return '₦0.00';
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(num)) return '₦0.00';
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
    }).format(num);
  };

  // Compact form field — matches IPDBillingPrintTemplate.tsx sizing exactly
  const FormField = ({ label, value, colSpan = 1 }: { label: string; value?: string; colSpan?: number }) => (
    <div className={`col-span-${colSpan} mb-2`}>
      <p className="text-[7.5px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-0.5">
        {label}
      </p>
      <div className="w-full h-7 border border-slate-200 bg-slate-50/50 rounded flex items-center px-2 shadow-sm">
        <span className="text-[10px] font-bold text-slate-800 uppercase truncate">{value || ''}</span>
      </div>
    </div>
  );

  // Section header — matches IPDBillingPrintTemplate.tsx sizing exactly
  const SectionHeader = ({ char, title }: { char: string; title: string }) => (
    <div className="w-full bg-[#3B309A] flex items-center mb-3 mt-4 rounded-sm">
      <div className="w-9 h-6 flex items-center justify-center text-white font-extrabold text-[11px] border-r border-[#4c3fbf]">
        {char}
      </div>
      <div className="pl-3 text-white font-extrabold text-[10px] uppercase tracking-widest">
        {title}
      </div>
    </div>
  );

  // JSON only provides a combined "55y 7m / Male" string, not separate age/gender fields
  const ageGenderParts = data.patient_details?.age_gender?.split('/') || [];
  const age = ageGenderParts.slice(0, -1).join('/').trim() || data.patient_details?.age_gender || '';
  const gender = ageGenderParts.length > 1 ? ageGenderParts[ageGenderParts.length - 1]?.trim() : '';

  return (
    <div
      className="fixed inset-0 bg-slate-100 overflow-y-auto px-4 py-20 print:static print:bg-white print:p-0"
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-8 print:hidden z-[100] shadow-md">
        <p className="font-bold text-sm">OPD {printType === 'receipt' ? 'Payment Receipt' : 'Provisional Bill'} Preview</p>
        <button onClick={() => window.print()} className="bg-[#3B309A] hover:bg-brand-primary text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all">
          <Printer size={16} /> Print {printType === 'receipt' ? 'Receipt' : 'Bill'}
        </button>
      </div>

      <style>{`@page { size: A4; margin: 8mm; }`}</style>
      <div
        className="w-[210mm] min-h-[297mm] bg-white shadow-2xl print:shadow-none print:m-0 print:border-none print:w-full border border-slate-200 mx-auto transform-gpu transition-all"
        style={{ padding: '8mm 10mm' }}
      >
        {/* Header Block */}
        <div className="w-full bg-[#3B309A] flex items-center" style={{ padding: '5mm 6mm', minHeight: '22mm' }}>
          <div className="flex items-center justify-center border-r-[1.5px] border-[#4c3fbf]" style={{ width: '44mm', paddingRight: '5mm' }}>
            <img src="/assets/login-bg.jpeg" alt="Gracespring Logo" style={{ width: '40mm', height: 'auto', objectFit: 'contain' }} />
          </div>
          <div className="flex flex-col justify-center" style={{ paddingLeft: '6mm' }}>
            <h1 className="text-white font-extrabold leading-none tracking-tight uppercase" style={{ fontSize: '20pt', marginBottom: '3px' }}>
              OPD {printType === 'receipt' ? 'Payment Receipt' : 'Provisional Bill'}
            </h1>
            <p className="text-brand-active" style={{ fontSize: '7.5pt', lineHeight: 1.3 }}>Patient encounter details and bill particulars. Authorized medical utility only.</p>
          </div>
        </div>

        {/* Address Bar */}
        <div className="w-full text-center border-b border-slate-200" style={{ padding: '3px 0 4px' }}>
          <p style={{ fontSize: '6.5pt', color: '#94a3b8' }}>Head Office: Gracespring Hospitals Limited Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos, Nigeria &nbsp;•&nbsp; +234 705 648 2776 &nbsp;•&nbsp; info@gracespringhospital.com</p>
        </div>

        {/* Sections A & B side by side — matches IPDBillingPrintTemplate.tsx layout */}
        <div className="grid grid-cols-2 gap-x-5 mt-1">
          {/* LEFT — Section A: Patient Information */}
          <div>
            <SectionHeader char="A" title="PATIENT INFORMATION" />
            <div className="grid grid-cols-4 gap-x-2">
              <FormField label="PATIENT NAME" colSpan={4} value={data.patient_details?.full_name} />
              <FormField label="MRN" colSpan={2} value={data.patient_details?.mrn} />
              <FormField label="AGE" colSpan={1} value={age} />
              <FormField label="GENDER" colSpan={1} value={gender} />
              <FormField label="LAST VISIT" colSpan={2} value={data.patient_details?.last_visit?.date} />
              <FormField label="VISIT REASON" colSpan={2} value={data.patient_details?.last_visit?.reason} />
            </div>
          </div>

          {/* RIGHT — Section B: Visit & Encounter Detail */}
          <div>
            <SectionHeader char="B" title="VISIT & ENCOUNTER DETAIL" />
            <div className="grid grid-cols-4 gap-x-2">
              <FormField label="ENCOUNTER NO" colSpan={2} value={encounterNumber} />
              <FormField label="DOCTOR" colSpan={2} value={data.visit_details?.doctor_name} />
              <FormField label="SPECIALIZATION" colSpan={2} value={data.visit_details?.specialization} />
              <FormField label="PAYER" colSpan={2} value={data.payer_details?.payer_name} />
              <FormField label="PAYER CATEGORY" colSpan={4} value={data.payer_details?.category} />
            </div>
          </div>
        </div>

        {/* Particulars Table */}
        <SectionHeader char="C" title="BILL PARTICULARS & PRESCRIPTIONS" />
        <table className="w-full text-left border-x border-b border-slate-200">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest w-8" style={{ fontSize: '7pt' }}>#</th>
              <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest" style={{ fontSize: '7pt' }}>DESCRIPTION</th>
              <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest text-center w-20" style={{ fontSize: '7pt' }}>CODE</th>
              <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest text-center w-10" style={{ fontSize: '7pt' }}>QTY</th>
              <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest text-right w-24" style={{ fontSize: '7pt' }}>RATE</th>
              <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest text-right w-28" style={{ fontSize: '7pt' }}>AMOUNT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.items?.map((item: any, idx: number) => (
              <React.Fragment key={`parent-${idx}`}>
                {/* Main Item Row */}
                <tr className={item.children?.length ? "bg-slate-100/60" : "even:bg-slate-50/40"}>
                  <td className="py-1.5 px-2 text-slate-500 align-top" style={{ fontSize: '8pt' }}>{idx + 1}</td>
                  <td className="py-1.5 px-2 font-bold text-slate-800 uppercase align-top" style={{ fontSize: '8pt' }}>{item.description}</td>
                  <td className="py-1.5 px-2 text-slate-500 text-center uppercase align-top" style={{ fontSize: '8pt' }}>{item.service_code || 'N/A'}</td>
                  <td className="py-1.5 px-2 text-slate-600 text-center align-top" style={{ fontSize: '8pt' }}>{item.quantity}</td>
                  <td className="py-1.5 px-2 text-slate-600 text-right align-top" style={{ fontSize: '8pt' }}>{formatCurrency(item.unit_price)}</td>
                  <td className="py-1.5 px-2 font-bold text-[#3B309A] text-right align-top" style={{ fontSize: '8pt' }}>{formatCurrency(item.line_total)}</td>
                </tr>

                {/* Sub-items (Prescriptions details inside Pharmacy) */}
                {item.children?.map((child: any, cIdx: number) => (
                  <tr key={`child-${idx}-${cIdx}`} className="border-b border-slate-50 border-dashed bg-white">
                    <td className="py-1.5 px-2"></td>
                    <td className="py-1.5 px-2" colSpan={2}>
                      <div className="pl-3 border-l-2 border-indigo-200">
                        <div className="font-bold text-slate-700" style={{ fontSize: '7.5pt' }}>{child.description}</div>
                        {child.prescription_info && (
                          <div className="text-slate-500 mt-0.5" style={{ fontSize: '6.5pt' }}>
                            <span className="font-semibold text-slate-600">Sig:</span> {child.prescription_info.clinical_dose} • {child.prescription_info.frequency} • {child.prescription_info.duration} • {child.prescription_info.route}
                            {child.prescription_info.instructions ? ` • ${child.prescription_info.instructions}` : ''}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-1.5 px-2 text-slate-600 text-center align-top" style={{ fontSize: '7.5pt' }}>{child.quantity}</td>
                    <td className="py-1.5 px-2 text-slate-500 text-right align-top" style={{ fontSize: '7.5pt' }}>
                      {/* Deriving Unit Price from line total and qty if missing */}
                      {formatCurrency(child.unit_price || (child.line_total / child.quantity))}
                    </td>
                    <td className="py-1.5 px-2 font-bold text-slate-600 text-right align-top" style={{ fontSize: '7.5pt' }}>{formatCurrency(child.line_total)}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {/* Financial Position */}
        <div>
          <SectionHeader char="D" title="FINANCIAL POSITION" />
          <div
            className="grid gap-x-2 gap-y-1.5 rounded border border-slate-200 bg-slate-50/40"
            style={{ gridTemplateColumns: 'repeat(4, 1fr)', padding: '6px 8px 8px' }}
          >
            <div className="col-span-1">
              <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Previous Outstanding</p>
              <p style={{ fontSize: '9pt' }} className="font-black text-slate-800">{formatCurrency(data.financial_position?.previous_outstanding)}</p>
            </div>
            <div className="col-span-1">
              <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Available Advance</p>
              <p style={{ fontSize: '9pt' }} className="font-black text-green-700">{formatCurrency(data.financial_position?.available_advance)}</p>
            </div>
            <div className="col-span-1">
              <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Net Balance</p>
              <p style={{ fontSize: '9pt' }} className="font-black text-slate-800">{formatCurrency(data.financial_position?.net_balance)}</p>
            </div>
            <div className="col-span-1">
              <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Gross Current Bill</p>
              <p style={{ fontSize: '9pt' }} className="font-black text-slate-800">{formatCurrency(data.gross_bill)}</p>
            </div>

            <div className="col-span-2 bg-[#3B309A]/8 rounded p-1.5 border border-[#3B309A]/20 mt-1">
              <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Total Current Bill</p>
              <p style={{ fontSize: '10pt' }} className="font-black text-[#3B309A]">{formatCurrency(data.total_current_bill)}</p>
            </div>
            <div className="col-span-2 bg-[#3B309A] rounded p-1.5 mt-1">
              <p style={{ fontSize: '6.5pt' }} className="text-white/70 font-bold uppercase tracking-wider mb-0.5">Estimated Final Balance</p>
              <p style={{ fontSize: '10pt' }} className="font-black text-white">{formatCurrency(data.estimated_final_balance)}</p>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-12 mt-8 px-8">
          <div className="text-center">
            <div className="border-b border-slate-300 pb-2 mb-2"></div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Authorized Hospital Staff</p>
          </div>
          <div className="text-center">
            <div className="border-b border-slate-300 pb-2 mb-2"></div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Patient / Client Signature</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center border-t border-slate-200 pt-6">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest tracking-[0.2em]">Confidential Medical Record • Gracespring Hospital • {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
};

export default OPDBillingPrintTemplate;


// import React, { useEffect, useState } from 'react';
// import { useParams, useSearchParams } from 'react-router-dom';
// import { billingService } from '../../../services/billing.service';
// import { Loader2, AlertTriangle, Printer, User, Calendar, CreditCard, Activity, FileText } from 'lucide-react';

// const OPDBillingPrintTemplate: React.FC = () => {
//   const { encounterNumber } = useParams<{ encounterNumber: string }>();
//   const [searchParams] = useSearchParams();
//   const printType = searchParams.get('type') || 'provisional'; // 'provisional' or 'receipt'
  
//   const [data, setData] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         if (!encounterNumber) throw new Error("No encounter number provided");
        
//         // For OPD, both print and provisional currently use the order preview data structure
//         // unless it's a specific paid receipt which would use ReceiptPrintTemplate.
//         // The user specifically asked for "opd the print and print provisional" here.
//         const res = await billingService.getOPDOrderPreview(encounterNumber);
        
//         const previewData = res.data?.data || res.data;

//         if (previewData) {
//           setData(previewData);
//           setTimeout(() => window.print(), 1000);
//         } else {
//           setError('Billing details not found.');
//         }
//       } catch (err) {
//         setError('Could not load billing data.');
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

//   const formatCurrency = (amount: number | string | undefined | null) => {
//     if (amount === undefined || amount === null) return '₦0.00';
//     const num = typeof amount === "string" ? parseFloat(amount) : amount;
//     if (isNaN(num)) return '₦0.00';
//     return new Intl.NumberFormat("en-NG", {
//       style: "currency",
//       currency: "NGN",
//       minimumFractionDigits: 2,
//     }).format(num);
//   };

//   // Compact form field — matches IPDBillingPrintTemplate.tsx sizing exactly
//   const FormField = ({ label, value, colSpan = 1 }: { label: string; value?: string; colSpan?: number }) => (
//     <div className={`col-span-${colSpan} mb-2`}>
//       <p className="text-[7.5px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-0.5">
//         {label}
//       </p>
//       <div className="w-full h-7 border border-slate-200 bg-slate-50/50 rounded flex items-center px-2 shadow-sm">
//         <span className="text-[10px] font-bold text-slate-800 uppercase truncate">{value || ''}</span>
//       </div>
//     </div>
//   );

//   // Section header — matches IPDBillingPrintTemplate.tsx sizing exactly
//   const SectionHeader = ({ char, title }: { char: string; title: string }) => (
//     <div className="w-full bg-[#3B309A] flex items-center mb-3 mt-4 rounded-sm">
//       <div className="w-9 h-6 flex items-center justify-center text-white font-extrabold text-[11px] border-r border-[#4c3fbf]">
//         {char}
//       </div>
//       <div className="pl-3 text-white font-extrabold text-[10px] uppercase tracking-widest">
//         {title}
//       </div>
//     </div>
//   );

//   // JSON only provides a combined "55y 7m / Male" string, not separate age/gender fields
//   const ageGenderParts = data.patient_details?.age_gender?.split('/') || [];
//   const age = ageGenderParts.slice(0, -1).join('/').trim() || data.patient_details?.age_gender || '';
//   const gender = ageGenderParts.length > 1 ? ageGenderParts[ageGenderParts.length - 1]?.trim() : '';

//   return (
//     <div
//       className="fixed inset-0 bg-slate-100 overflow-y-auto px-4 py-20 print:static print:bg-white print:p-0"
//       style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
//     >
//       <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-8 print:hidden z-[100] shadow-md">
//         <p className="font-bold text-sm">OPD {printType === 'receipt' ? 'Payment Receipt' : 'Provisional Bill'} Preview</p>
//         <button onClick={() => window.print()} className="bg-[#3B309A] hover:bg-brand-primary text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all">
//           <Printer size={16} /> Print {printType === 'receipt' ? 'Receipt' : 'Bill'}
//         </button>
//       </div>

//       <style>{`@page { size: A4; margin: 8mm; }`}</style>
//       <div
//         className="w-[210mm] min-h-[297mm] bg-white shadow-2xl print:shadow-none print:m-0 print:border-none print:w-full border border-slate-200 mx-auto transform-gpu transition-all"
//         style={{ padding: '8mm 10mm' }}
//       >
//         {/* Header Block */}
//         <div className="w-full bg-[#3B309A] flex items-center" style={{ padding: '5mm 6mm', minHeight: '22mm' }}>
//           <div className="flex items-center justify-center border-r-[1.5px] border-[#4c3fbf]" style={{ width: '44mm', paddingRight: '5mm' }}>
//             <img src="/assets/login-bg.jpeg" alt="Gracespring Logo" style={{ width: '40mm', height: 'auto', objectFit: 'contain' }} />
//           </div>
//           <div className="flex flex-col justify-center" style={{ paddingLeft: '6mm' }}>
//             <h1 className="text-white font-extrabold leading-none tracking-tight uppercase" style={{ fontSize: '20pt', marginBottom: '3px' }}>
//               OPD {printType === 'receipt' ? 'Payment Receipt' : 'Provisional Bill'}
//             </h1>
//             <p className="text-brand-active" style={{ fontSize: '7.5pt', lineHeight: 1.3 }}>Patient encounter details and bill particulars. Authorized medical utility only.</p>
//           </div>
//         </div>

//         {/* Address Bar */}
//         <div className="w-full text-center border-b border-slate-200" style={{ padding: '3px 0 4px' }}>
//           <p style={{ fontSize: '6.5pt', color: '#94a3b8' }}>Head Office: Gracespring Hospitals Limited Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos, Nigeria &nbsp;•&nbsp; +234 705 648 2776 &nbsp;•&nbsp; info@gracespringhospital.com</p>
//         </div>

//         {/* Sections A & B side by side — matches IPDBillingPrintTemplate.tsx layout */}
//         <div className="grid grid-cols-2 gap-x-5 mt-1">
//           {/* LEFT — Section A: Patient Information (3 rows, matches Section B height) */}
//           <div>
//             <SectionHeader char="A" title="PATIENT INFORMATION" />
//             <div className="grid grid-cols-4 gap-x-2">
//               <FormField label="PATIENT NAME" colSpan={4} value={data.patient_details?.full_name} />
//               <FormField label="MRN" colSpan={2} value={data.patient_details?.mrn} />
//               <FormField label="AGE" colSpan={1} value={age} />
//               <FormField label="GENDER" colSpan={1} value={gender} />
//               <FormField label="LAST VISIT" colSpan={2} value={data.patient_details?.last_visit?.date} />
//               <FormField label="VISIT REASON" colSpan={2} value={data.patient_details?.last_visit?.reason} />
//             </div>
//           </div>

//           {/* RIGHT — Section B: Visit & Encounter Detail (3 rows, matches Section A height) */}
//           <div>
//             <SectionHeader char="B" title="VISIT & ENCOUNTER DETAIL" />
//             <div className="grid grid-cols-4 gap-x-2">
//               <FormField label="ENCOUNTER NO" colSpan={2} value={encounterNumber} />
//               <FormField label="DOCTOR" colSpan={2} value={data.visit_details?.doctor_name} />
//               <FormField label="SPECIALIZATION" colSpan={2} value={data.visit_details?.specialization} />
//               <FormField label="PAYER" colSpan={2} value={data.payer_details?.payer_name} />
//               <FormField label="PAYER CATEGORY" colSpan={4} value={data.payer_details?.category} />
//             </div>
//           </div>
//         </div>

//         {/* Particulars Table */}
//         <SectionHeader char="C" title="BILL PARTICULARS" />
//         <table className="w-full text-left border-x border-b border-slate-200">
//           <thead>
//             <tr className="bg-slate-50 border-b border-slate-200">
//               <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest w-8" style={{ fontSize: '7pt' }}>#</th>
//               <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest" style={{ fontSize: '7pt' }}>DESCRIPTION</th>
//               <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest text-center w-20" style={{ fontSize: '7pt' }}>CODE</th>
//               <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest text-center w-10" style={{ fontSize: '7pt' }}>QTY</th>
//               <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest text-right w-24" style={{ fontSize: '7pt' }}>RATE</th>
//               <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest text-right w-28" style={{ fontSize: '7pt' }}>AMOUNT</th>
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-slate-100">
//             {data.items?.map((item: any, idx: number) => (
//               <tr key={idx} className="even:bg-slate-50/40">
//                 <td className="py-1 px-2 text-slate-500" style={{ fontSize: '8pt' }}>{idx + 1}</td>
//                 <td className="py-1 px-2 font-bold text-slate-800 uppercase" style={{ fontSize: '8pt' }}>{item.description}</td>
//                 <td className="py-1 px-2 text-slate-500 text-center uppercase" style={{ fontSize: '8pt' }}>{item.service_code || 'N/A'}</td>
//                 <td className="py-1 px-2 text-slate-600 text-center" style={{ fontSize: '8pt' }}>{item.quantity}</td>
//                 <td className="py-1 px-2 text-slate-600 text-right" style={{ fontSize: '8pt' }}>{formatCurrency(item.unit_price)}</td>
//                 <td className="py-1 px-2 font-bold text-[#3B309A] text-right" style={{ fontSize: '8pt' }}>{formatCurrency(item.line_total)}</td>
//               </tr>
//             ))}
//           </tbody>
//         </table>

//         {/* Financial Position */}
//         <div>
//           <SectionHeader char="D" title="FINANCIAL POSITION" />
//           <div
//             className="grid gap-x-2 gap-y-1.5 rounded border border-slate-200 bg-slate-50/40"
//             style={{ gridTemplateColumns: 'repeat(4, 1fr)', padding: '6px 8px 8px' }}
//           >
//             <div className="col-span-1">
//               <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Previous Outstanding</p>
//               <p style={{ fontSize: '9pt' }} className="font-black text-slate-800">{formatCurrency(data.financial_position?.previous_outstanding)}</p>
//             </div>
//             <div className="col-span-1">
//               <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Available Advance</p>
//               <p style={{ fontSize: '9pt' }} className="font-black text-green-700">{formatCurrency(data.financial_position?.available_advance)}</p>
//             </div>
//             <div className="col-span-1">
//               <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Net Balance</p>
//               <p style={{ fontSize: '9pt' }} className="font-black text-slate-800">{formatCurrency(data.financial_position?.net_balance)}</p>
//             </div>
//             <div className="col-span-1">
//               <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Gross Current Bill</p>
//               <p style={{ fontSize: '9pt' }} className="font-black text-slate-800">{formatCurrency(data.gross_bill)}</p>
//             </div>

//             <div className="col-span-2 bg-[#3B309A]/8 rounded p-1.5 border border-[#3B309A]/20">
//               <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Total Current Bill</p>
//               <p style={{ fontSize: '10pt' }} className="font-black text-[#3B309A]">{formatCurrency(data.total_current_bill)}</p>
//             </div>
//             <div className="col-span-2 bg-[#3B309A] rounded p-1.5">
//               <p style={{ fontSize: '6.5pt' }} className="text-white/70 font-bold uppercase tracking-wider mb-0.5">Estimated Final Balance</p>
//               <p style={{ fontSize: '10pt' }} className="font-black text-white">{formatCurrency(data.estimated_final_balance)}</p>
//             </div>
//           </div>
//         </div>

//         {/* Signatures */}
//         <div className="grid grid-cols-2 gap-12 mt-8 px-8">
//           <div className="text-center">
//             <div className="border-b border-slate-300 pb-2 mb-2"></div>
//             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Authorized Hospital Staff</p>
//           </div>
//           <div className="text-center">
//             <div className="border-b border-slate-300 pb-2 mb-2"></div>
//             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Patient / Client Signature</p>
//           </div>
//         </div>

//         {/* Footer */}
//         <div className="mt-16 text-center border-t border-slate-200 pt-6">
//           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest tracking-[0.2em]">Confidential Medical Record • Gracespring Hospital • {new Date().toLocaleDateString()}</p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default OPDBillingPrintTemplate;


// import React, { useEffect, useState } from 'react';
// import { useParams, useSearchParams } from 'react-router-dom';
// import { billingService } from '../../../services/billing.service';
// import { Loader2, AlertTriangle, Printer, User, Calendar, CreditCard, Activity, FileText } from 'lucide-react';

// const OPDBillingPrintTemplate: React.FC = () => {
//   const { encounterNumber } = useParams<{ encounterNumber: string }>();
//   const [searchParams] = useSearchParams();
//   const printType = searchParams.get('type') || 'provisional'; // 'provisional' or 'receipt'
  
//   const [data, setData] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         if (!encounterNumber) throw new Error("No encounter number provided");
        
//         // For OPD, both print and provisional currently use the order preview data structure
//         // unless it's a specific paid receipt which would use ReceiptPrintTemplate.
//         // The user specifically asked for "opd the print and print provisional" here.
//         const res = await billingService.getOPDOrderPreview(encounterNumber);
        
//         const previewData = res.data?.data || res.data;

//         if (previewData) {
//           setData(previewData);
//           setTimeout(() => window.print(), 1000);
//         } else {
//           setError('Billing details not found.');
//         }
//       } catch (err) {
//         setError('Could not load billing data.');
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

//   const formatCurrency = (amount: number | string | undefined | null) => {
//     if (amount === undefined || amount === null) return '₦0.00';
//     const num = typeof amount === "string" ? parseFloat(amount) : amount;
//     if (isNaN(num)) return '₦0.00';
//     return new Intl.NumberFormat("en-NG", {
//       style: "currency",
//       currency: "NGN",
//       minimumFractionDigits: 2,
//     }).format(num);
//   };

//   const FormField = ({ label, value, colSpan = 1 }: { label: string; value?: string; colSpan?: number }) => (
//     <div className={`col-span-${colSpan} mb-3`}>
//       <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
//         {label}
//       </p>
//       <div className="w-full h-9 border border-slate-200 bg-slate-50/50 rounded flex items-center px-2 shadow-sm">
//         <span className="text-sm font-bold text-slate-800 uppercase">{value || ''}</span>
//       </div>
//     </div>
//   );

//   const SectionHeader = ({ char, title }: { char: string; title: string }) => (
//     <div className="w-full bg-[#3B309A] flex items-center mb-6 mt-8 rounded-sm">
//       <div className="w-12 h-8 flex items-center justify-center text-white font-extrabold text-sm border-r border-[#4c3fbf]">
//         {char}
//       </div>
//       <div className="pl-4 text-white font-extrabold text-[12px] uppercase tracking-widest">
//         {title}
//       </div>
//     </div>
//   );

//   return (
//     <div
//       className="fixed inset-0 bg-slate-100 overflow-y-auto px-4 py-20 print:static print:bg-white print:p-0"
//       style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
//     >
//       <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-8 print:hidden z-[100] shadow-md">
//         <p className="font-bold text-sm">OPD {printType === 'receipt' ? 'Payment Receipt' : 'Provisional Bill'} Preview</p>
//         <button onClick={() => window.print()} className="bg-[#3B309A] hover:bg-brand-primary text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all">
//           <Printer size={16} /> Print {printType === 'receipt' ? 'Receipt' : 'Bill'}
//         </button>
//       </div>

//       <div className="w-[210mm] min-h-[297mm] bg-white p-12 shadow-2xl print:shadow-none print:m-0 print:border-none border border-slate-200 mx-auto transform-gpu transition-all">
//         {/* Header Block */}
//         <div className="w-full bg-[#3B309A] flex items-center p-4 min-h-[28mm]">
//           <div className="w-[25%] flex items-center justify-center border-r-[1.5px] border-[#4c3fbf] pr-4 h-full">
//             <img src="/assets/login-bg.jpeg" alt="Logo" className="w-[20mm] object-contain" />
//           </div>
//           <div className="w-[75%] pl-6 flex flex-col justify-center">
//             <h1 className="text-white text-3xl font-extrabold leading-none tracking-tight mb-2 uppercase">
//               OPD {printType === 'receipt' ? 'Payment Receipt' : 'Provisional Bill'}
//             </h1>
//             <p className="text-brand-active text-[10px] leading-tight">Patient encounter details and bill particulars. Authorized medical utility only.</p>
//           </div>
//         </div>

//         {/* Address Bar */}
//         <div className="w-full text-center py-2 border-b border-slate-200 mb-8">
//           <p className="text-[8px] text-slate-500 font-medium">Head Office: Gracespring Hospitals Limited Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos, Nigeria Lagos State, Nigeria. &nbsp;•&nbsp; +234 705 648 2776 &nbsp;•&nbsp; info@gracespringhospital.com</p>
//         </div>

//         {/* Patient Section */}
//         <SectionHeader char="A" title="PATIENT INFORMATION" />
//         <div className="grid grid-cols-5 gap-x-4 mb-4">
//           <FormField label="PATIENT NAME" colSpan={2} value={data.patient_details?.full_name} />
//           <FormField label="MRN" colSpan={1} value={data.patient_details?.mrn} />
//           <FormField label="AGE" colSpan={1} value={data.patient_details?.age} />
//           <FormField label="GENDER" colSpan={1} value={data.patient_details?.gender} />
          
//           <FormField label="LAST VISIT" colSpan={2} value={data.patient_details?.last_visit?.date} />
//           <FormField label="PAYER" colSpan={3} value={data.payer_details?.payer_name} />
//         </div>

//         {/* Visit Details */}
//         <SectionHeader char="B" title="VISIT & ENCOUNTER DETAIL" />
//         <div className="grid grid-cols-4 gap-x-4 mb-4">
//           <FormField label="ENCOUNTER NO" colSpan={2} value={encounterNumber} />
//           <FormField label="DOCTOR" colSpan={2} value={data.visit_details?.doctor_name} />
//           <FormField label="SPECIALIZATION" colSpan={2} value={data.visit_details?.specialization} />
//           <FormField label="PAYER CATEGORY" colSpan={2} value={data.payer_details?.category} />
//         </div>

//         {/* Particulars Table */}
//         <SectionHeader char="C" title="BILL PARTICULARS" />
//         <table className="w-full text-left text-sm border-x border-b border-slate-200 mb-8">
//           <thead>
//             <tr className="bg-slate-50 border-b border-slate-200">
//               <th className="py-2.5 px-4 font-black text-slate-500 uppercase text-[9px] tracking-widest w-12">#</th>
//               <th className="py-2.5 px-4 font-black text-slate-500 uppercase text-[9px] tracking-widest">DESCRIPTION</th>
//               <th className="py-2.5 px-4 font-black text-slate-500 uppercase text-[9px] tracking-widest text-center w-24">CODE</th>
//               <th className="py-2.5 px-4 font-black text-slate-500 uppercase text-[9px] tracking-widest text-center w-16">QTY</th>
//               <th className="py-2.5 px-4 font-black text-slate-500 uppercase text-[9px] tracking-widest text-right w-28">RATE</th>
//               <th className="py-2.5 px-4 font-black text-slate-500 uppercase text-[9px] tracking-widest text-right w-32">AMOUNT</th>
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-slate-100">
//             {data.items?.map((item: any, idx: number) => (
//               <tr key={idx} className="even:bg-slate-50/50">
//                 <td className="py-2.5 px-4 text-xs text-slate-500">{idx + 1}</td>
//                 <td className="py-2.5 px-4 text-xs font-bold text-slate-800 uppercase">{item.description}</td>
//                 <td className="py-2.5 px-4 text-xs text-slate-500 text-center uppercase">{item.service_code || 'N/A'}</td>
//                 <td className="py-2.5 px-4 text-xs text-slate-600 text-center">{item.quantity}</td>
//                 <td className="py-2.5 px-4 text-xs text-slate-600 text-right">{formatCurrency(item.unit_price)}</td>
//                 <td className="py-2.5 px-4 text-xs font-bold text-[#3B309A] text-right">{formatCurrency(item.line_total)}</td>
//               </tr>
//             ))}
//           </tbody>
//         </table>

//         {/* Financial Position */}
//         <SectionHeader char="D" title="FINANCIAL SUMMARY" />
//         <div className="grid grid-cols-4 gap-x-4 mb-4">
//           <FormField label="PREVIOUS OUTSTANDING" colSpan={1} value={formatCurrency(data.financial_position?.previous_outstanding)} />
//           <FormField label="AVAILABLE ADVANCE" colSpan={1} value={formatCurrency(data.financial_position?.available_advance)} />
//           <FormField label="NET BALANCE" colSpan={1} value={formatCurrency(data.financial_position?.net_balance)} />
//           <FormField label="EST. FINAL BALANCE" colSpan={1} value={formatCurrency(data.estimated_final_balance)} />
//         </div>

//         {/* Grand Total */}
//         <div className="flex justify-end mt-12 border-t-2 border-slate-300 pt-6">
//           <div className="w-80 bg-[#3B309A] text-white p-5 rounded-xl shadow-lg">
//             <p className="text-[10px] font-bold text-brand-active uppercase tracking-widest text-right mb-1">TOTAL BILL AMOUNT</p>
//             <p className="text-4xl font-black text-right tracking-tighter">{formatCurrency(data.total_current_bill)}</p>
//           </div>
//         </div>

//         {/* Signatures */}
//         <div className="grid grid-cols-2 gap-12 mt-20 px-8">
//           <div className="text-center">
//             <div className="border-b border-slate-300 pb-2 mb-2"></div>
//             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Authorized Hospital Staff</p>
//           </div>
//           <div className="text-center">
//             <div className="border-b border-slate-300 pb-2 mb-2"></div>
//             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Patient / Client Signature</p>
//           </div>
//         </div>

//         {/* Footer */}
//         <div className="mt-16 text-center border-t border-slate-200 pt-6">
//           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest tracking-[0.2em]">Confidential Medical Record • Gracespring Hospital • {new Date().toLocaleDateString()}</p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default OPDBillingPrintTemplate;
