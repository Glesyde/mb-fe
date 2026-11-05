import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { billingService } from '../../../services/billing.service';
import { Loader2, AlertTriangle, Printer, Activity } from 'lucide-react';

const BRAND = '#2A157c';

/* ─── Helpers ──────────────────────────────────────── */
const fmt = (v: string | number | null | undefined) => (v !== null && v !== undefined && v !== '' ? v : '—');

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

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
};

/* ─── Micro-components ─────────────────────────────── */
const InfoRow = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div className="flex justify-between py-1 border-b border-slate-100 last:border-0 break-inside-avoid">
    <span className="text-xs text-slate-500 font-medium">{label}</span>
    <span className="text-xs font-semibold text-slate-900 text-right">{fmt(value)}</span>
  </div>
);

/* ════════════════════════════════════════════════════════ */
const IPDBillingPrintTemplate: React.FC = () => {
  const { encounterNumber } = useParams<{ encounterNumber: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!encounterNumber) throw new Error("No encounter number provided");
        const res = await billingService.getIPDStatement(encounterNumber);

        let statementData = res.data;
        if (statementData && statementData.data && statementData.data.clinical_header) {
          statementData = statementData.data;
        } else if (res.data && res.data.clinical_header) {
          statementData = res.data;
        }

        if (statementData) {
          setData(statementData);
          // Auto-trigger print slightly after render for seamless UX
          setTimeout(() => window.print(), 800);
        } else {
          setError('Billing statement not found.');
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <Loader2 size={40} className="animate-spin mb-4" style={{ color: BRAND }} />
        <p className="text-sm font-medium text-slate-600 animate-pulse">Preparing provisional bill...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm w-full border border-red-100">
          <AlertTriangle size={40} className="text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800 mb-2">Bill Unavailable</h3>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  const fp = data.financial_position;
  const ageGenderParts = data.clinical_header?.age_gender?.split('/') || [];
  const age = ageGenderParts.slice(0, -1).join('/').trim() || data.clinical_header?.age_gender || '';
  const gender = ageGenderParts.length > 1 ? ageGenderParts[ageGenderParts.length - 1]?.trim() : '';

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
            <h2 className="font-bold text-slate-800 text-sm leading-tight">
              IPD Provisional Bill Preview
            </h2>
            <p className="text-[11px] text-slate-500 font-mono">{data.administrative?.encounter_no}</p>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all shadow-md hover:shadow-lg active:scale-95"
          style={{ backgroundColor: BRAND }}
        >
          <Printer size={16} /> Print Bill
        </button>
      </div>

      {/* ── A4 Print Container ── */}
      <div className="w-full max-w-[210mm] min-h-[297mm] bg-white mx-auto shadow-2xl rounded-sm print:shadow-none print:rounded-none print:max-w-none print:w-full border border-slate-300 print:border-none relative flex flex-col">
        
        {/* ── Brand Header ── */}
        <div className="flex justify-between items-start border-b-2 p-6" style={{ backgroundColor: BRAND }}>
          <div className="flex items-center gap-4">
            <img src="/assets/logo-nobg.png" alt="Hospital Logo" className="w-[10em] h-auto object-contain" />
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-black uppercase tracking-wider text-white">
              IPD Provisional Bill
            </h2>
            <p className="text-xs font-bold text-white mt-1">Ref: <span className="font-mono text-white">{data.administrative?.encounter_no || 'N/A'}</span></p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 uppercase">
              {data.administrative?.status || 'UNKNOWN'}
            </div>
          </div>
        </div>

        {/* ── Body Sections ── */}
        <div className="px-10 py-8 flex-1">
          
          {/* ── Patient & Clinical Info Grid ── */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 break-inside-avoid">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Patient & Clinical Details</h3>
              <div className="space-y-1">
                <InfoRow label="Patient Name" value={data.clinical_header?.patient_name} />
                <InfoRow label="MRN (File No.)" value={data.clinical_header?.mrn} />
                <InfoRow label="Age / Gender" value={`${fmt(age)} / ${fmt(gender)}`} />
                <InfoRow label="Admitting Doctor" value={data.clinical_header?.admitting_dr} />
                <InfoRow label="Ward Location" value={data.clinical_header?.ward_location} />
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 break-inside-avoid">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Administrative Details</h3>
              <div className="space-y-1">
                <InfoRow label="Admission No." value={data.administrative?.admission_no} />
                <InfoRow label="Encounter No." value={data.administrative?.encounter_no} />
                <InfoRow label="Date Admitted" value={data.administrative?.date_admitted} />
                <InfoRow label="Date Discharged" value={data.administrative?.date_discharged || 'Active'} />
                <InfoRow label="Payer" value={data.administrative?.payer} />
                <InfoRow label="Policy No." value={data.administrative?.policy_no} />
              </div>
            </div>
          </div>

          {/* ── Section C: Particulars (Grouped) ── */}
          {data.billing_groups && Object.keys(data.billing_groups).length > 0 && (
            <div className="mb-8">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Bill Particulars</h3>
              
              {Object.entries(data.billing_groups).map(([groupKey, group]: [string, any]) => (
                <div key={groupKey} className="mb-4 break-inside-avoid rounded-lg overflow-hidden border border-slate-200">
                  <div className="px-4 py-2 flex items-center justify-between border-b" style={{ backgroundColor: `${BRAND}15`, borderColor: `${BRAND}30` }}>
                    <h4 className="font-bold uppercase tracking-widest text-xs" style={{ color: BRAND }}>
                      {groupKey.replace(/_/g, ' ')}
                    </h4>
                    <span className="font-black text-xs" style={{ color: BRAND }}>
                      {formatCurrency(group.dept_total)}
                    </span>
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="py-2 px-3 font-semibold text-slate-600 w-8">#</th>
                        <th className="py-2 px-3 font-semibold text-slate-600">Description</th>
                        <th className="py-2 px-3 font-semibold text-slate-600 w-32">Date & Time</th>
                        <th className="py-2 px-3 font-semibold text-slate-600 text-center w-12">Qty</th>
                        <th className="py-2 px-3 font-semibold text-slate-600 text-right w-20">Rate</th>
                        <th className="py-2 px-3 font-semibold text-slate-600 text-right w-20">Disc.</th>
                        <th className="py-2 px-3 font-semibold text-slate-600 text-right w-24">Net Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {group.items?.flatMap((item: any) => {
                        if (item.drugs && Array.isArray(item.drugs) && item.drugs.length > 0) {
                          return item.drugs.map((drug: any, dIdx: number) => ({
                            id: `${item.id}-drug-${dIdx}`,
                            item_name: `${drug.drug_name} (${drug.dosage} - ${drug.frequency})`,
                            date: drug.date ?? item.date,
                            rate: drug.rate,
                            nos: drug.qty,
                            total: drug.total,
                            fee_breakdown: null,
                            parent_discount: item.discount_applied,
                          }));
                        }
                        if (item.details && Array.isArray(item.details) && item.details.length > 0) {
                          return item.details.map((detail: any, dIdx: number) => ({
                            id: `${item.id}-detail-${dIdx}`,
                            item_name: detail.name,
                            date: item.date,
                            rate: detail.rate,
                            nos: detail.qty,
                            total: detail.total,
                            fee_breakdown: null,
                            parent_discount: item.discount_applied,
                          }));
                        }
                        return [{ ...item, parent_discount: item.discount_applied }];
                      }).map((row: any, idx: number) => (
                        <React.Fragment key={row.id || idx}>
                          <tr className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 text-slate-500">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-800">{row.item_name}</td>
                            <td className="py-2.5 px-3 text-[10px] text-slate-500 whitespace-nowrap">
                              {formatDate(row.date)}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 text-center">{row.nos}</td>
                            <td className="py-2.5 px-3 text-slate-600 text-right">{formatCurrency(row.rate)}</td>
                            <td className="py-2.5 px-3 text-right">
                              {row.parent_discount && row.parent_discount.amount > 0 ? (
                                <div className="flex flex-col items-end leading-tight">
                                  <span className="font-semibold text-slate-700">-{formatCurrency(row.parent_discount.amount)}</span>
                                  <span className="text-[9px] text-slate-400">
                                    {row.parent_discount.type === 'PERCENTAGE' ? `${row.parent_discount.value}%` : 'FLAT'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-right text-slate-900">
                              {row.parent_discount && row.parent_discount.amount > 0 ? (
                                <div className="flex flex-col items-end leading-tight">
                                  <span className="line-through text-slate-400 font-normal text-[10px]">
                                    {formatCurrency(row.gross_total ?? row.total)}
                                  </span>
                                  <span>{formatCurrency(row.net_total ?? (row.total - row.parent_discount.amount))}</span>
                                </div>
                              ) : (
                                formatCurrency(row.total)
                              )}
                            </td>
                          </tr>
                          {row.fee_breakdown && row.fee_breakdown.length > 0 && (
                            <tr className="bg-slate-50/30">
                              <td></td>
                              <td colSpan={6} className="px-3 py-1">
                                <div className="pl-3 border-l-2 ml-1 my-1" style={{ borderColor: `${BRAND}30` }}>
                                  <table className="w-full text-[10px]">
                                    <tbody>
                                      {row.fee_breakdown.map((fee: any, fIdx: number) => (
                                        <tr key={fIdx}>
                                          <td className="py-0.5 text-slate-600">
                                            <span className="font-medium text-slate-700">{fee.component_name}</span>{' '}
                                            <span className="text-slate-400">({fee.component_type.replace(/_/g, ' ')})</span>
                                          </td>
                                          <td className="py-0.5 text-right text-slate-600">{formatCurrency(fee.amount)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {/* ── Section D: Financial Position (Right-Aligned Grid) ── */}
          {fp && (
            <div className="flex justify-end mb-4 break-inside-avoid">
              <div className="w-3/4 min-w-[380px]">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1 text-right">Financial Position</h3>
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                  
                  {/* Regular Metrics */}
                  <div>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Gross Current Bill</p>
                    <p className="text-sm font-black text-slate-800">{formatCurrency(fp.gross_current_bill)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Total Discounts</p>
                    <p className="text-sm font-black text-red-600">- {formatCurrency(fp.total_discounts)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Net Current Bill</p>
                    <p className="text-sm font-black text-slate-800">{formatCurrency(fp.net_current_bill)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Insurance Copay</p>
                    <p className="text-sm font-black text-slate-800">{formatCurrency(fp.insurance_copay)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Current Debt</p>
                    <p className="text-sm font-black text-slate-800">{formatCurrency(fp.current_debt)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Previous Debt</p>
                    <p className="text-sm font-black text-slate-800">{formatCurrency(fp.previous_debt)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Total Patient Debt</p>
                    <p className="text-sm font-black text-slate-800">{formatCurrency(fp.total_patient_debt)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Current Advance</p>
                    <p className="text-sm font-black text-green-700">{formatCurrency(fp.current_advance)}</p>
                  </div>

                  {/* Highlight Metrics */}
                  <div className="col-span-2 rounded-md p-3 border mt-2" style={{ backgroundColor: `${BRAND}10`, borderColor: `${BRAND}30` }}>
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Ledger Balance</p>
                      <p className="text-lg font-black" style={{ color: BRAND }}>{formatCurrency(fp.ledger_balance)}</p>
                    </div>
                  </div>
                  <div className="col-span-2 rounded-md p-3 shadow-sm" style={{ backgroundColor: BRAND }}>
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] text-white/80 font-bold uppercase tracking-wider">Total Amount Payable</p>
                      <p className="text-lg font-black text-white">{formatCurrency(fp.total_amount_payable)}</p>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Signatures & Footer (Forced to bottom via mt-auto) ── */}
        <div className="mt-auto px-10 pb-8 print:pb-12 break-inside-avoid">
          
          {/* Signatures */}
          <div className="grid grid-cols-2 gap-12 mb-8 pt-4">
            <div className="text-center">
              <div className="border-b border-slate-300 pb-2 mb-2"></div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cashier / Authorized Signatory</p>
            </div>
            <div className="text-center">
              <div className="border-b border-slate-300 pb-2 mb-2"></div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Patient / Client Signature</p>
            </div>
          </div>

          {/* Hospital Address and Document Meta */}
          <div className="border-t-2 border-slate-200 pt-4 text-center">
            <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-widest mb-1">Gracespring Hospitals Limited</h4>
            <p className="text-[10px] text-slate-500">
              Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              +234 705 648 2776 &nbsp;|&nbsp; finance@gracespringhospital.com
            </p>
            
            <div className="flex justify-between items-center text-[9px] text-slate-400 mt-4 px-4">
              <p>Generated electronically on {formatDate(new Date().toISOString())}</p>
              <p className="font-mono font-bold text-slate-500">Encounter: {data.administrative?.encounter_no}</p>
            </div>
            
            <p className="text-[8px] text-slate-300 text-center mt-2 uppercase tracking-widest">
              Confidential Medical Document • Unauthorized Access Prohibited
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default IPDBillingPrintTemplate;


// import React, { useEffect, useState } from 'react';
// import { useParams } from 'react-router-dom';
// import { billingService } from '../../../services/billing.service';
// import { Loader2, AlertTriangle, Printer } from 'lucide-react';

// const IPDBillingPrintTemplate: React.FC = () => {
//   const { encounterNumber } = useParams<{ encounterNumber: string }>();
//   const [data, setData] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         if (!encounterNumber) throw new Error("No encounter number provided");
//         const res = await billingService.getIPDStatement(encounterNumber);

//         let statementData = res.data;
//         if (statementData && statementData.data && statementData.data.clinical_header) {
//           statementData = statementData.data;
//         } else if (res.data && res.data.clinical_header) {
//           statementData = res.data;
//         }

//         if (statementData) {
//           setData(statementData);
//           setTimeout(() => window.print(), 1000);
//         } else {
//           setError('Billing statement not found.');
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
//         <Loader2 size={48} className="animate-spin text-[#2d258a]" />
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

//   // Compact form field — smaller height & text for dense layout
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

//   // Section header — tighter vertical padding
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

//   const fp = data.financial_position;
//   const ageGenderParts = data.clinical_header?.age_gender?.split('/') || [];
//   const age = ageGenderParts.slice(0, -1).join('/').trim() || data.clinical_header?.age_gender || '';
//   const gender = ageGenderParts.length > 1 ? ageGenderParts[ageGenderParts.length - 1]?.trim() : '';

//   return (
//     <div
//       className="fixed inset-0 bg-slate-100 overflow-y-auto px-4 py-20 print:static print:bg-white print:p-0"
//       style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
//     >
//       <style>{`@page { size: A4; margin: 8mm; }`}</style>
//       {/* Screen-only top bar */}
//       <div className="fixed top-0 left-0 right-0 h-14 bg-slate-900 text-white flex items-center justify-between px-8 print:hidden z-[100] shadow-md">
//         <p className="font-bold text-sm">IPD Provisional Bill Preview</p>
//         <button
//           onClick={() => window.print()}
//           className="bg-[#2d258a] hover:bg-brand-primary text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all"
//         >
//           <Printer size={16} /> Print Bill
//         </button>
//       </div>

//       {/* A4 page container */}
//       <div
//         className="w-[210mm] min-h-[297mm] bg-white shadow-2xl print:shadow-none print:m-0 print:border-none print:w-full border border-slate-200 mx-auto"
//         style={{ padding: '8mm 10mm' }}
//       >

//         {/* ── HEADER BLOCK ── */}
//         <div className="w-full bg-[#3B309A] flex items-center" style={{ padding: '5mm 6mm', minHeight: '22mm' }}>
//           {/* Logo — larger */}
//           <div className="flex items-center justify-center border-r-[1.5px] border-[#4c3fbf]" style={{ width: '44mm', paddingRight: '5mm' }}>
//             <img src="/assets/login-bg.jpeg" alt="Gracespring Logo" style={{ width: '40mm', height: 'auto', objectFit: 'contain' }} />
//           </div>
//           <div className="flex flex-col justify-center" style={{ paddingLeft: '6mm' }}>
//             <h1 className="text-white font-extrabold leading-none tracking-tight" style={{ fontSize: '20pt', marginBottom: '3px' }}>
//               IPD Provisional Bill
//             </h1>
//             <p className="text-brand-active" style={{ fontSize: '7.5pt', lineHeight: 1.3 }}>
//               Comprehensive overview of patient encounter charges and bill particulars. Authorized internal medical utility only.
//             </p>
//           </div>
//         </div>

//         {/* Address bar */}
//         <div className="w-full text-center border-b border-slate-200" style={{ padding: '3px 0 4px' }}>
//           <p style={{ fontSize: '6.5pt', color: '#94a3b8' }}>
//             Head Office: Gracespring Hospitals Limited Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos, Nigeria &nbsp;•&nbsp; +234 705 648 2776 &nbsp;•&nbsp; info@gracespringhospital.com
//           </p>
//         </div>

//         {/* ── SECTIONS A & B SIDE BY SIDE ── */}
//         <div className="grid grid-cols-2 gap-x-5 mt-1">

//           {/* LEFT — Section A: Patient & Clinical */}
//           <div>
//             <SectionHeader char="A" title="PATIENT & CLINICAL DETAIL" />
//             <div className="grid grid-cols-4 gap-x-2">
//               <FormField label="PATIENT NAME" colSpan={2} value={data.clinical_header?.patient_name} />
//               <FormField label="MRN" colSpan={1} value={data.clinical_header?.mrn} />
//               <FormField label="AGE" colSpan={1} value={age} />
//               <FormField label="GENDER" colSpan={2} value={gender} />
//               <FormField label="ADMITTING DR." colSpan={2} value={data.clinical_header?.admitting_dr} />
//               <FormField label="WARD LOCATION" colSpan={4} value={data.clinical_header?.ward_location} />
//             </div>
//           </div>

//           {/* RIGHT — Section B: Administrative */}
//           <div>
//             <SectionHeader char="B" title="ADMINISTRATIVE DETAIL" />
//             <div className="grid grid-cols-4 gap-x-2">
//               <FormField label="ADMISSION NO" colSpan={2} value={data.administrative?.admission_no} />
//               <FormField label="ENCOUNTER NO" colSpan={2} value={data.administrative?.encounter_no} />
//               <FormField label="DATE ADMITTED" colSpan={2} value={data.administrative?.date_admitted} />
//               <FormField label="STATUS" colSpan={1} value={data.administrative?.status} />
//               <FormField label="PAYER" colSpan={2} value={data.administrative?.payer} />
//               <FormField label="POLICY NO" colSpan={2} value={data.administrative?.policy_no || 'N/A'} />
//             </div>
//           </div>
//         </div>


//         {/* ── SECTION C: BILL PARTICULARS ── */}
//         {data.billing_groups && Object.keys(data.billing_groups).length > 0 && (
//           <div>
//             <SectionHeader char="C" title="BILL PARTICULARS" />

//             {Object.entries(data.billing_groups).map(([groupKey, group]: [string, any]) => (
//               <div key={groupKey} className="mb-3">
//                 {/* Group header */}
//                 <div className="bg-[#3B309A]/10 px-3 py-1.5 flex items-center justify-between border-b-2 border-[#3B309A] rounded-t">
//                   <h3 className="font-bold text-[#2d258a] uppercase tracking-widest" style={{ fontSize: '8.5pt' }}>
//                     {groupKey.replace(/_/g, ' ')}
//                   </h3>
//                   <span className="font-black text-[#2d258a]" style={{ fontSize: '9pt' }}>
//                     {formatCurrency(group.dept_total)}
//                   </span>
//                 </div>

//                 <table className="w-full text-left border-x border-b border-slate-200">
//                   <thead>
//                     <tr className="bg-slate-50 border-b border-slate-200">
//                       <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest w-8" style={{ fontSize: '7pt' }}>#</th>
//                       <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest" style={{ fontSize: '7pt' }}>DESCRIPTION</th>
//                       <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest text-center" style={{ fontSize: '7pt' }}>DATE</th>
//                       <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest text-center w-10" style={{ fontSize: '7pt' }}>QTY</th>
//                       <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest text-right w-24" style={{ fontSize: '7pt' }}>RATE</th>
//                       <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest text-right w-24" style={{ fontSize: '7pt' }}>DISCOUNT</th>
//                       <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest text-right w-28" style={{ fontSize: '7pt' }}>NET TOTAL</th>
//                     </tr>
//                   </thead>
//                   <tbody className="divide-y divide-slate-100">
//                     {group.items?.flatMap((item: any) => {
//                       if (item.drugs && Array.isArray(item.drugs) && item.drugs.length > 0) {
//                         return item.drugs.map((drug: any, dIdx: number) => ({
//                           id: `${item.id}-drug-${dIdx}`,
//                           item_name: `${drug.drug_name} (${drug.dosage} - ${drug.frequency})`,
//                           date: drug.date,
//                           rate: drug.rate,
//                           nos: drug.qty,
//                           total: drug.total,
//                           fee_breakdown: null,
//                           parent_discount: item.discount_applied,
//                         }));
//                       }
//                       // Bundled consumable lines (e.g. "Consumables Used") carry the real
//                       // per-item breakdown in `details` — expand those instead of showing the generic label.
//                       if (item.details && Array.isArray(item.details) && item.details.length > 0) {
//                         return item.details.map((detail: any, dIdx: number) => ({
//                           id: `${item.id}-detail-${dIdx}`,
//                           item_name: detail.name,
//                           date: item.date,
//                           rate: detail.rate,
//                           nos: detail.qty,
//                           total: detail.total,
//                           fee_breakdown: null,
//                           parent_discount: item.discount_applied,
//                         }));
//                       }
//                       return [{
//                         ...item,
//                         parent_discount: item.discount_applied
//                       }];
//                     }).map((item: any, idx: number) => (
//                       <React.Fragment key={item.id || idx}>
//                         <tr className="even:bg-slate-50/40">
//                           <td className="py-1 px-2 text-slate-500" style={{ fontSize: '8pt' }}>{idx + 1}</td>
//                           <td className="py-1 px-2 font-bold text-slate-800" style={{ fontSize: '8pt' }}>{item.item_name}</td>
//                           <td className="py-1 px-2 text-slate-500 text-center" style={{ fontSize: '8pt' }}>
//                             {new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
//                           </td>
//                           <td className="py-1 px-2 text-slate-600 text-center" style={{ fontSize: '8pt' }}>{item.nos}</td>
//                           <td className="py-1 px-2 text-slate-600 text-right" style={{ fontSize: '8pt' }}>{formatCurrency(item.rate)}</td>
                          
//                           <td className="py-1 px-2 text-right" style={{ fontSize: '8pt' }}>
//                             {item.parent_discount && item.parent_discount.amount > 0 ? (
//                               <div className="flex flex-col items-end">
//                                 <span className="font-bold text-slate-700">-{formatCurrency(item.parent_discount.amount)}</span>
//                                 <span style={{ fontSize: '6.5pt' }} className="text-slate-500">
//                                   {item.parent_discount.type === 'PERCENTAGE' ? `${item.parent_discount.value}%` : 'FLAT'}
//                                 </span>
//                               </div>
//                             ) : (
//                               <span className="text-slate-300">—</span>
//                             )}
//                           </td>
                          
//                           <td className="py-1 px-2 font-bold text-[#2d258a] text-right" style={{ fontSize: '8pt' }}>
//                             {item.parent_discount && item.parent_discount.amount > 0 ? (
//                               <div className="flex flex-col items-end">
//                                 <span className="line-through text-slate-400 font-normal" style={{ fontSize: '7pt' }}>
//                                   {formatCurrency(item.gross_total ?? item.total)}
//                                 </span>
//                                 <span>{formatCurrency(item.net_total ?? (item.total - item.parent_discount.amount))}</span>
//                               </div>
//                             ) : (
//                               formatCurrency(item.total)
//                             )}
//                           </td>
//                         </tr>
//                         {item.fee_breakdown && item.fee_breakdown.length > 0 && (
//                           <tr className="bg-slate-50/20">
//                             <td></td>
//                             <td colSpan={6} className="px-3 py-1">
//                               <div className="pl-3 border-l-2 border-[#3B309A]/30 ml-1">
//                                 <table className="w-full" style={{ fontSize: '7.5pt' }}>
//                                   <tbody>
//                                     {item.fee_breakdown.map((fee: any, fIdx: number) => (
//                                       <tr key={fIdx}>
//                                         <td className="py-0.5 text-slate-600">
//                                           <span className="font-bold text-slate-700">{fee.component_name}</span>{' '}
//                                           <span className="text-slate-400">({fee.component_type.replace(/_/g, ' ')})</span>
//                                         </td>
//                                         <td className="py-0.5 text-right text-slate-600">{formatCurrency(fee.amount)}</td>
//                                       </tr>
//                                     ))}
//                                   </tbody>
//                                 </table>
//                               </div>
//                             </td>
//                           </tr>
//                         )}
//                       </React.Fragment>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             ))}
//           </div>
//         )}

//         {/* ── SECTION D: FINANCIAL POSITION ── */}
//         {fp && (
//           <div>
//             <SectionHeader char="D" title="FINANCIAL POSITION" />
//             <div
//               className="grid gap-x-2 gap-y-1.5 rounded border border-slate-200 bg-slate-50/40"
//               style={{ gridTemplateColumns: 'repeat(4, 1fr)', padding: '6px 8px 8px' }}
//             >
//               {/* Row 1 */}
//               <div className="col-span-1">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Gross Current Bill</p>
//                 <p style={{ fontSize: '9pt' }} className="font-black text-slate-800">{formatCurrency(fp.gross_current_bill)}</p>
//               </div>
//               <div className="col-span-1">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Total Discounts</p>
//                 <p style={{ fontSize: '9pt' }} className="font-black text-red-600">- {formatCurrency(fp.total_discounts)}</p>
//               </div>
//               <div className="col-span-1">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Net Current Bill</p>
//                 <p style={{ fontSize: '9pt' }} className="font-black text-slate-800">{formatCurrency(fp.net_current_bill)}</p>
//               </div>
//               <div className="col-span-1">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Insurance Copay</p>
//                 <p style={{ fontSize: '9pt' }} className="font-black text-slate-800">{formatCurrency(fp.insurance_copay)}</p>
//               </div>

//               {/* Row 2 */}
//               <div className="col-span-1">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Current Debt</p>
//                 <p style={{ fontSize: '9pt' }} className="font-black text-slate-800">{formatCurrency(fp.current_debt)}</p>
//               </div>
//               <div className="col-span-1">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Previous Debt</p>
//                 <p style={{ fontSize: '9pt' }} className="font-black text-slate-800">{formatCurrency(fp.previous_debt)}</p>
//               </div>
//               <div className="col-span-1">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Total Patient Debt</p>
//                 <p style={{ fontSize: '9pt' }} className="font-black text-slate-800">{formatCurrency(fp.total_patient_debt)}</p>
//               </div>
//               <div className="col-span-1">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Current Advance</p>
//                 <p style={{ fontSize: '9pt' }} className="font-black text-green-700">{formatCurrency(fp.current_advance)}</p>
//               </div>

//               {/* Row 3 — highlights */}
//               <div className="col-span-2 bg-[#3B309A]/8 rounded p-1.5 border border-[#3B309A]/20">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Ledger Balance</p>
//                 <p style={{ fontSize: '10pt' }} className="font-black text-[#3B309A]">{formatCurrency(fp.ledger_balance)}</p>
//               </div>
//               <div className="col-span-2 bg-[#3B309A] rounded p-1.5">
//                 <p style={{ fontSize: '6.5pt' }} className="text-white/70 font-bold uppercase tracking-wider mb-0.5">Total Amount Payable</p>
//                 <p style={{ fontSize: '10pt' }} className="font-black text-white">{formatCurrency(fp.total_amount_payable)}</p>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Footer */}
//         <div className="mt-6 text-center border-t border-slate-200 pt-3">
//           <p style={{ fontSize: '7.5pt' }} className="text-slate-400 font-bold uppercase tracking-widest">
//             Confidential Medical Document &bull; Unauthorized Access Prohibited
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default IPDBillingPrintTemplate;











// import React, { useEffect, useState } from 'react';
// import { useParams } from 'react-router-dom';
// import { billingService } from '../../../services/billing.service';
// import { Loader2, AlertTriangle, Printer } from 'lucide-react';

// const IPDBillingPrintTemplate: React.FC = () => {
//   const { encounterNumber } = useParams<{ encounterNumber: string }>();
//   const [data, setData] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         if (!encounterNumber) throw new Error("No encounter number provided");
//         const res = await billingService.getIPDStatement(encounterNumber);

//         let statementData = res.data;
//         if (statementData && statementData.data && statementData.data.clinical_header) {
//           statementData = statementData.data;
//         } else if (res.data && res.data.clinical_header) {
//           statementData = res.data;
//         }

//         if (statementData) {
//           setData(statementData);
//           setTimeout(() => window.print(), 1000);
//         } else {
//           setError('Billing statement not found.');
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
//         <Loader2 size={48} className="animate-spin text-[#2d258a]" />
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

//   // Compact form field — smaller height & text for dense layout
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

//   // Section header — tighter vertical padding
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

//   const fp = data.financial_position;
//   const ageGenderParts = data.clinical_header?.age_gender?.split('/') || [];
//   const age = ageGenderParts.slice(0, -1).join('/').trim() || data.clinical_header?.age_gender || '';
//   const gender = ageGenderParts.length > 1 ? ageGenderParts[ageGenderParts.length - 1]?.trim() : '';

//   return (
//     <div
//       className="fixed inset-0 bg-slate-100 overflow-y-auto px-4 py-20 print:static print:bg-white print:p-0"
//       style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
//     >
//       <style>{`@page { size: A4; margin: 8mm; }`}</style>
//       {/* Screen-only top bar */}
//       <div className="fixed top-0 left-0 right-0 h-14 bg-slate-900 text-white flex items-center justify-between px-8 print:hidden z-[100] shadow-md">
//         <p className="font-bold text-sm">IPD Provisional Bill Preview</p>
//         <button
//           onClick={() => window.print()}
//           className="bg-[#2d258a] hover:bg-brand-primary text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all"
//         >
//           <Printer size={16} /> Print Bill
//         </button>
//       </div>

//       {/* A4 page container */}
//       <div
//         className="w-[210mm] min-h-[297mm] bg-white shadow-2xl print:shadow-none print:m-0 print:border-none print:w-full border border-slate-200 mx-auto"
//         style={{ padding: '8mm 10mm' }}
//       >

//         {/* ── HEADER BLOCK ── */}
//         <div className="w-full bg-[#3B309A] flex items-center" style={{ padding: '5mm 6mm', minHeight: '22mm' }}>
//           {/* Logo — larger */}
//           <div className="flex items-center justify-center border-r-[1.5px] border-[#4c3fbf]" style={{paddingRight: '5mm' }}>
//             <img src="/assets/logo-nobg.png" alt="Gracespring Logo" style={{ width: '50mm', height: 'auto', objectFit: 'contain' }} />
//           </div>
//           <div className="flex flex-col justify-center" style={{ paddingLeft: '6mm' }}>
//             <h1 className="text-white font-extrabold leading-none tracking-tight" style={{ fontSize: '20pt', marginBottom: '3px' }}>
//               IPD Provisional Bill
//             </h1>
//             <p className="text-brand-active" style={{ fontSize: '7.5pt', lineHeight: 1.3 }}>
//               Comprehensive overview of patient encounter charges and bill particulars. Authorized internal medical utility only.
//             </p>
//           </div>
//         </div>

//         {/* Address bar */}
//         <div className="w-full text-center border-b border-slate-200" style={{ padding: '3px 0 4px' }}>
//           <p style={{ fontSize: '6.5pt', color: '#94a3b8' }}>
//             Head Office: Gracespring Hospitals Limited Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos, Nigeria &nbsp;•&nbsp; +234 705 648 2776 &nbsp;•&nbsp; finance@gracespringhospital.com
//           </p>
//         </div>

//         {/* ── SECTIONS A & B SIDE BY SIDE ── */}
//         <div className="grid grid-cols-2 gap-x-5 mt-1">

//           {/* LEFT — Section A: Patient & Clinical */}
//           <div>
//             <SectionHeader char="A" title="PATIENT & CLINICAL DETAIL" />
//             <div className="grid grid-cols-4 gap-x-2">
//               <FormField label="PATIENT NAME" colSpan={2} value={data.clinical_header?.patient_name} />
//               <FormField label="MRN" colSpan={1} value={data.clinical_header?.mrn} />
//               <FormField label="AGE" colSpan={1} value={age} />
//               <FormField label="GENDER" colSpan={2} value={gender} />
//               <FormField label="ADMITTING DR." colSpan={2} value={data.clinical_header?.admitting_dr} />
//               <FormField label="WARD LOCATION" colSpan={4} value={data.clinical_header?.ward_location} />
//             </div>
//           </div>

//           {/* RIGHT — Section B: Administrative */}
//           <div>
//             <SectionHeader char="B" title="ADMINISTRATIVE DETAIL" />
//             <div className="grid grid-cols-4 gap-x-2">
//               <FormField label="ADMISSION NO" colSpan={2} value={data.administrative?.admission_no} />
//               <FormField label="ENCOUNTER NO" colSpan={2} value={data.administrative?.encounter_no} />
//               <FormField label="DATE ADMITTED" colSpan={2} value={data.administrative?.date_admitted} />
//               <FormField label="STATUS" colSpan={1} value={data.administrative?.status} />
//               <FormField label="PAYER" colSpan={2} value={data.administrative?.payer} />
//               <FormField label="POLICY NO" colSpan={2} value={data.administrative?.policy_no || 'N/A'} />
//             </div>
//           </div>
//         </div>


//         {/* ── SECTION C: BILL PARTICULARS ── */}
//         {data.billing_groups && Object.keys(data.billing_groups).length > 0 && (
//           <div>
//             <SectionHeader char="C" title="BILL PARTICULARS" />

//             {Object.entries(data.billing_groups)
//               .filter(([_, group]: [string, any]) => Number(group.dept_total) > 0)
//               .map(([groupKey, group]: [string, any]) => (
//               <div key={groupKey} className="mb-3">
//                 {/* Group header */}
//                 <div className="bg-[#3B309A]/10 px-3 py-1.5 flex items-center justify-between border-b-2 border-[#3B309A] rounded-t">
//                   <h3 className="font-bold text-[#2d258a] uppercase tracking-widest" style={{ fontSize: '8.5pt' }}>
//                     {groupKey.replace(/_/g, ' ')}
//                   </h3>
//                   <span className="font-black text-[#2d258a]" style={{ fontSize: '9pt' }}>
//                     {formatCurrency(group.dept_total)}
//                   </span>
//                 </div>

//                 <table className="w-full text-left border-x border-b border-slate-200">
//                   <thead>
//                     <tr className="bg-slate-50 border-b border-slate-200">
//                       <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest w-8" style={{ fontSize: '7pt' }}>#</th>
//                       <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest" style={{ fontSize: '7pt' }}>DESCRIPTION</th>
//                       <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest text-center" style={{ fontSize: '7pt' }}>DATE & TIME</th>
//                       <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest text-center w-10" style={{ fontSize: '7pt' }}>QTY</th>
//                       <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest text-right w-24" style={{ fontSize: '7pt' }}>RATE</th>
//                       <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest text-right w-24" style={{ fontSize: '7pt' }}>DISCOUNT</th>
//                       <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest text-right w-28" style={{ fontSize: '7pt' }}>NET TOTAL</th>
//                     </tr>
//                   </thead>
//                   <tbody className="divide-y divide-slate-100">
//                     {group.items?.flatMap((item: any) => {
//                       if (item.drugs && Array.isArray(item.drugs) && item.drugs.length > 0) {
//                         return item.drugs.map((drug: any, dIdx: number) => ({
//                           id: `${item.id}-drug-${dIdx}`,
//                           item_name: `${drug.drug_name} (${drug.dosage} - ${drug.frequency})`,
//                           date: drug.date,
//                           rate: drug.rate,
//                           nos: drug.qty,
//                           total: drug.total,
//                           fee_breakdown: null,
//                           parent_discount: item.discount_applied,
//                         }));
//                       }
//                       if (item.details && Array.isArray(item.details) && item.details.length > 0) {
//                         return item.details.map((detail: any, dIdx: number) => ({
//                           id: `${item.id}-detail-${dIdx}`,
//                           item_name: detail.name,
//                           date: item.date,
//                           rate: detail.rate,
//                           nos: detail.qty,
//                           total: detail.total,
//                           fee_breakdown: null,
//                           parent_discount: item.discount_applied,
//                         }));
//                       }
//                       return [{
//                         ...item,
//                         parent_discount: item.discount_applied
//                       }];
//                     })
//                     // Filter out any zero amount line items
//                     .filter((item: any) => Number(item.total) > 0)
//                     .map((item: any, idx: number) => (
//                       <React.Fragment key={item.id || idx}>
//                         <tr className="even:bg-slate-50/40">
//                           <td className="py-1 px-2 text-slate-500" style={{ fontSize: '8pt' }}>{idx + 1}</td>
//                           <td className="py-1 px-2 font-bold text-slate-800" style={{ fontSize: '8pt' }}>{item.item_name}</td>
//                           <td className="py-1 px-2 text-slate-500 text-center whitespace-nowrap" style={{ fontSize: '7.5pt' }}>
//                             {new Date(item.date).toLocaleString('en-GB', { 
//                                 day: '2-digit', 
//                                 month: '2-digit', 
//                                 year: 'numeric',
//                                 hour: '2-digit',
//                                 minute: '2-digit',
//                                 hour12: true
//                             })}
//                           </td>
//                           <td className="py-1 px-2 text-slate-600 text-center" style={{ fontSize: '8pt' }}>{item.nos}</td>
//                           <td className="py-1 px-2 text-slate-600 text-right" style={{ fontSize: '8pt' }}>{formatCurrency(item.rate)}</td>
                          
//                           <td className="py-1 px-2 text-right" style={{ fontSize: '8pt' }}>
//                             {item.parent_discount && item.parent_discount.amount > 0 ? (
//                               <div className="flex flex-col items-end">
//                                 <span className="font-bold text-slate-700">-{formatCurrency(item.parent_discount.amount)}</span>
//                                 <span style={{ fontSize: '6.5pt' }} className="text-slate-500">
//                                   {item.parent_discount.type === 'PERCENTAGE' ? `${item.parent_discount.value}%` : 'FLAT'}
//                                 </span>
//                               </div>
//                             ) : (
//                               <span className="text-slate-300">—</span>
//                             )}
//                           </td>
                          
//                           <td className="py-1 px-2 font-bold text-[#2d258a] text-right" style={{ fontSize: '8pt' }}>
//                             {item.parent_discount && item.parent_discount.amount > 0 ? (
//                               <div className="flex flex-col items-end">
//                                 <span className="line-through text-slate-400 font-normal" style={{ fontSize: '7pt' }}>
//                                   {formatCurrency(item.gross_total ?? item.total)}
//                                 </span>
//                                 <span>{formatCurrency(item.net_total ?? (item.total - item.parent_discount.amount))}</span>
//                               </div>
//                             ) : (
//                               formatCurrency(item.total)
//                             )}
//                           </td>
//                         </tr>
//                         {item.fee_breakdown && item.fee_breakdown.length > 0 && (
//                           <tr className="bg-slate-50/20">
//                             <td></td>
//                             <td colSpan={6} className="px-3 py-1">
//                               <div className="pl-3 border-l-2 border-[#3B309A]/30 ml-1">
//                                 <table className="w-full" style={{ fontSize: '7.5pt' }}>
//                                   <tbody>
//                                     {item.fee_breakdown.map((fee: any, fIdx: number) => (
//                                       <tr key={fIdx}>
//                                         <td className="py-0.5 text-slate-600">
//                                           <span className="font-bold text-slate-700">{fee.component_name}</span>{' '}
//                                           <span className="text-slate-400">({fee.component_type.replace(/_/g, ' ')})</span>
//                                         </td>
//                                         <td className="py-0.5 text-right text-slate-600">{formatCurrency(fee.amount)}</td>
//                                       </tr>
//                                     ))}
//                                   </tbody>
//                                 </table>
//                               </div>
//                             </td>
//                           </tr>
//                         )}
//                       </React.Fragment>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             ))}
//           </div>
//         )}

//         {/* ── SECTION D: FINANCIAL POSITION ── */}
//         {fp && (
//           <div>
//             <SectionHeader char="D" title="FINANCIAL POSITION" />
//             <div
//               className="grid gap-x-2 gap-y-1.5 rounded border border-slate-200 bg-slate-50/40"
//               style={{ gridTemplateColumns: 'repeat(4, 1fr)', padding: '6px 8px 8px' }}
//             >
//               {/* Row 1 */}
//               <div className="col-span-1">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Gross Current Bill</p>
//                 <p style={{ fontSize: '9pt' }} className="font-black text-slate-800">{formatCurrency(fp.gross_current_bill)}</p>
//               </div>
//               <div className="col-span-1">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Total Discounts</p>
//                 <p style={{ fontSize: '9pt' }} className="font-black text-red-600">- {formatCurrency(fp.total_discounts)}</p>
//               </div>
//               <div className="col-span-1">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Net Current Bill</p>
//                 <p style={{ fontSize: '9pt' }} className="font-black text-slate-800">{formatCurrency(fp.net_current_bill)}</p>
//               </div>
//               <div className="col-span-1">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Insurance Copay</p>
//                 <p style={{ fontSize: '9pt' }} className="font-black text-slate-800">{formatCurrency(fp.insurance_copay)}</p>
//               </div>

//               {/* Row 2 */}
//               <div className="col-span-1">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Current Debt</p>
//                 <p style={{ fontSize: '9pt' }} className="font-black text-slate-800">{formatCurrency(fp.current_debt)}</p>
//               </div>
//               <div className="col-span-1">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Previous Debt</p>
//                 <p style={{ fontSize: '9pt' }} className="font-black text-slate-800">{formatCurrency(fp.previous_debt)}</p>
//               </div>
//               <div className="col-span-1">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Total Patient Debt</p>
//                 <p style={{ fontSize: '9pt' }} className="font-black text-slate-800">{formatCurrency(fp.total_patient_debt)}</p>
//               </div>
//               <div className="col-span-1">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Current Advance</p>
//                 <p style={{ fontSize: '9pt' }} className="font-black text-green-700">{formatCurrency(fp.current_advance)}</p>
//               </div>

//               {/* Row 3 — highlights */}
//               <div className="col-span-2 bg-[#3B309A]/8 rounded p-1.5 border border-[#3B309A]/20">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Ledger Balance</p>
//                 <p style={{ fontSize: '10pt' }} className="font-black text-[#3B309A]">{formatCurrency(fp.ledger_balance)}</p>
//               </div>
//               <div className="col-span-2 bg-[#3B309A] rounded p-1.5">
//                 <p style={{ fontSize: '6.5pt' }} className="text-white/70 font-bold uppercase tracking-wider mb-0.5">Total Amount Payable</p>
//                 <p style={{ fontSize: '10pt' }} className="font-black text-white">{formatCurrency(fp.total_amount_payable)}</p>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Footer */}
//         <div className="mt-6 text-center border-t border-slate-200 pt-3">
//           <p style={{ fontSize: '7.5pt' }} className="text-slate-400 font-bold uppercase tracking-widest">
//             Confidential Medical Document &bull; Unauthorized Access Prohibited
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default IPDBillingPrintTemplate;








// UPGRADED CODE SNIPPET



// import React, { useEffect, useState } from 'react';
// import { useParams } from 'react-router-dom';
// import { billingService } from '../../../services/billing.service';
// import { Loader2, AlertCircle, Printer, Receipt } from 'lucide-react';

// /* ─── Helpers ──────────────────────────────────────── */
// const formatCurrency = (amount: number | string | undefined | null) => {
//   if (amount === undefined || amount === null) return '₦0.00';
//   const num = typeof amount === 'string' ? parseFloat(amount) : amount;
//   if (isNaN(num)) return '₦0.00';
//   return new Intl.NumberFormat('en-NG', {
//     style: 'currency',
//     currency: 'NGN',
//     minimumFractionDigits: 2,
//   }).format(num);
// };

// const fmt = (v: string | number | null | undefined) => (v !== null && v !== undefined && v !== '' ? v : '—');

// /* ─── Micro-components ─────────────────────────────── */
// const BRAND = '#3B309A';

// const InfoRow = ({ label, value }: { label: string; value?: string | number | null }) => (
//   <div className="flex justify-between py-1.5 border-b border-slate-100 last:border-0">
//     <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">{label}</span>
//     <span className="text-xs font-semibold text-slate-900 text-right">{fmt(value)}</span>
//   </div>
// );

// const SummaryRow = ({ label, value, isBold = false, isHighlight = false, isDeduction = false }: any) => (
//   <div className={`flex justify-between py-1.5 ${isHighlight ? 'border-t-2 border-slate-800 mt-2 pt-2' : ''}`}>
//     <span className={`text-xs ${isBold || isHighlight ? 'font-bold text-slate-800' : 'text-slate-600'}`}>{label}</span>
//     <span className={`text-xs ${isBold || isHighlight ? 'font-black' : 'font-medium'} ${isDeduction ? 'text-red-600' : 'text-slate-900'} ${isHighlight ? 'text-base' : ''}`}>
//       {isDeduction && value !== '₦0.00' ? `- ${value}` : value}
//     </span>
//   </div>
// );

// /* ════════════════════════════════════════════════════════ */
// const IPDBillingPrintTemplate: React.FC = () => {
//   const { encounterNumber } = useParams<{ encounterNumber: string }>();
//   const [data, setData] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         if (!encounterNumber) throw new Error("No encounter number provided");
//         const res = await billingService.getIPDStatement(encounterNumber);

//         let statementData = res.data?.data?.clinical_header 
//           ? res.data.data 
//           : res.data?.clinical_header 
//             ? res.data 
//             : null;

//         if (statementData) {
//           setData(statementData);
//           setTimeout(() => window.print(), 1000);
//         } else {
//           setError('Billing statement data is incomplete or missing.');
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
//       <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
//         <Loader2 size={40} className="animate-spin mb-4" style={{ color: BRAND }} />
//         <p className="text-sm font-medium text-slate-600 animate-pulse">Generating Provisional Bill...</p>
//       </div>
//     );
//   }

//   if (error || !data) {
//     return (
//       <div className="flex items-center justify-center min-h-screen bg-slate-50 p-6">
//         <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm w-full border border-red-100">
//           <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
//           <h3 className="text-lg font-bold text-slate-800 mb-2">Statement Unavailable</h3>
//           <p className="text-sm text-slate-500">{error}</p>
//         </div>
//       </div>
//     );
//   }

//   const fp = data.financial_position;
//   const ageGenderParts = data.clinical_header?.age_gender?.split('/') || [];
//   const age = ageGenderParts.slice(0, -1).join('/').trim() || data.clinical_header?.age_gender || '—';
//   const gender = ageGenderParts.length > 1 ? ageGenderParts[ageGenderParts.length - 1]?.trim() : '—';

//   return (
//     <div className="min-h-screen bg-slate-200 py-20 px-4 print:bg-white print:p-0 print:py-0 font-sans selection:bg-blue-100">
      
//       {/* ── Screen Preview Toolbar (Hidden on Print) ── */}
//       <div className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 md:px-12 print:hidden z-50 shadow-sm">
//         <div className="flex items-center gap-3">
//           <Receipt size={20} style={{ color: BRAND }} />
//           <div>
//             <h2 className="font-bold text-slate-800 text-sm leading-tight">IPD Bill Preview</h2>
//             <p className="text-[11px] text-slate-500 font-mono">{encounterNumber}</p>
//           </div>
//         </div>
//         <button
//           onClick={() => window.print()}
//           className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all shadow-md hover:shadow-lg active:scale-95"
//           style={{ backgroundColor: BRAND }}
//         >
//           <Printer size={16} /> Print Bill
//         </button>
//       </div>

//       {/* ── A4 Print Container ── */}
//       <div className="w-full max-w-[210mm] min-h-[297mm] bg-white mx-auto shadow-2xl rounded-sm print:shadow-none print:rounded-none print:max-w-none print:w-full border border-slate-300 print:border-none relative flex flex-col px-10 py-10">
        
//         {/* ── Header Section ── */}
//         <div className="flex justify-between items-start border-b-2 pb-6 mb-6" style={{ borderColor: BRAND }}>
//           <div className="flex items-center gap-4">
//             <img src="/assets/logo-nobg.png" alt="Hospital Logo" className="w-16 h-16 object-contain" />
//             <div>
//               <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">Gracespring Hospitals</h1>
//               <p className="text-xs text-slate-500 mt-1 max-w-[280px] leading-relaxed">
//                 Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos, Nigeria<br/>
//                 +234 705 648 2776 • finance@gracespringhospital.com
//               </p>
//             </div>
//           </div>
//           <div className="text-right">
//             <h2 className="text-2xl font-black uppercase tracking-wider text-slate-800">Provisional Bill</h2>
//             <p className="text-xs font-bold text-slate-500 mt-1">
//               Date: <span className="text-slate-900 font-medium">{new Date().toLocaleDateString('en-GB')}</span>
//             </p>
//             <div className="mt-2 inline-flex items-center px-3 py-1 rounded bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-800 uppercase tracking-widest">
//               In-Patient Department
//             </div>
//           </div>
//         </div>

//         {/* ── Patient & Admin Information Grid ── */}
//         <div className="grid grid-cols-2 gap-8 mb-8">
//           <div>
//             <h3 className="text-xs font-bold uppercase tracking-widest mb-3 border-b pb-1" style={{ color: BRAND, borderColor: `${BRAND}40` }}>
//               Patient Information
//             </h3>
//             <InfoRow label="Patient Name" value={data.clinical_header?.patient_name} />
//             <InfoRow label="MRN (File No.)" value={data.clinical_header?.mrn} />
//             <InfoRow label="Age / Gender" value={`${age} / ${gender}`} />
//             <InfoRow label="Ward Location" value={data.clinical_header?.ward_location} />
//             <InfoRow label="Admitting Dr." value={data.clinical_header?.admitting_dr} />
//           </div>
//           <div>
//             <h3 className="text-xs font-bold uppercase tracking-widest mb-3 border-b pb-1" style={{ color: BRAND, borderColor: `${BRAND}40` }}>
//               Administrative Details
//             </h3>
//             <InfoRow label="Encounter No." value={data.administrative?.encounter_no} />
//             <InfoRow label="Admission No." value={data.administrative?.admission_no} />
//             <InfoRow label="Date Admitted" value={data.administrative?.date_admitted} />
//             <InfoRow label="Payer Profile" value={data.administrative?.payer} />
//             <InfoRow label="Policy No." value={data.administrative?.policy_no || 'N/A'} />
//           </div>
//         </div>

//         {/* ── Bill Particulars (Itemized) ── */}
//         {data.billing_groups && Object.keys(data.billing_groups).length > 0 && (
//           <div className="mb-8 flex-1">
//             <h3 className="text-xs font-bold uppercase tracking-widest mb-4 border-b-2 pb-2 text-slate-800 border-slate-800">
//               Itemized Charges
//             </h3>

//             {Object.entries(data.billing_groups)
//               .filter(([_, group]: [string, any]) => Number(group.dept_total) > 0)
//               .map(([groupKey, group]: [string, any]) => (
//                 <div key={groupKey} className="mb-6">
//                   <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-t-md border-b border-slate-200">
//                     <h4 className="font-bold text-slate-700 uppercase tracking-widest text-[11px]">
//                       {groupKey.replace(/_/g, ' ')}
//                     </h4>
//                     <span className="font-bold text-slate-800 text-xs">
//                       {formatCurrency(group.dept_total)}
//                     </span>
//                   </div>

//                   <table className="w-full text-left text-[11px]">
//                     <thead>
//                       <tr className="text-slate-500 uppercase tracking-wider border-b border-slate-200">
//                         <th className="py-2 px-3 font-semibold w-8">#</th>
//                         <th className="py-2 px-3 font-semibold">Description</th>
//                         <th className="py-2 px-3 font-semibold text-center">Date</th>
//                         <th className="py-2 px-3 font-semibold text-center">Qty</th>
//                         <th className="py-2 px-3 font-semibold text-right">Rate</th>
//                         <th className="py-2 px-3 font-semibold text-right">Discount</th>
//                         <th className="py-2 px-3 font-semibold text-right">Total</th>
//                       </tr>
//                     </thead>
//                     <tbody className="divide-y divide-slate-100">
//                       {group.items?.flatMap((item: any) => {
//                         // Flattener logic retained exactly from original request
//                         if (item.drugs && Array.isArray(item.drugs) && item.drugs.length > 0) {
//                           return item.drugs.map((drug: any, dIdx: number) => ({
//                             id: `${item.id}-drug-${dIdx}`, item_name: `${drug.drug_name} (${drug.dosage} - ${drug.frequency})`,
//                             date: drug.date, rate: drug.rate, nos: drug.qty, total: drug.total, fee_breakdown: null, parent_discount: item.discount_applied,
//                           }));
//                         }
//                         if (item.details && Array.isArray(item.details) && item.details.length > 0) {
//                           return item.details.map((detail: any, dIdx: number) => ({
//                             id: `${item.id}-detail-${dIdx}`, item_name: detail.name,
//                             date: item.date, rate: detail.rate, nos: detail.qty, total: detail.total, fee_breakdown: null, parent_discount: item.discount_applied,
//                           }));
//                         }
//                         return [{ ...item, parent_discount: item.discount_applied }];
//                       })
//                       .filter((item: any) => Number(item.total) > 0)
//                       .map((item: any, idx: number) => (
//                         <React.Fragment key={item.id || idx}>
//                           <tr className="hover:bg-slate-50/50">
//                             <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
//                             <td className="py-2 px-3 font-medium text-slate-800">{item.item_name}</td>
//                             <td className="py-2 px-3 text-slate-500 text-center whitespace-nowrap">
//                               {new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
//                             </td>
//                             <td className="py-2 px-3 text-slate-600 text-center">{item.nos}</td>
//                             <td className="py-2 px-3 text-slate-600 text-right">{formatCurrency(item.rate)}</td>
//                             <td className="py-2 px-3 text-right">
//                               {item.parent_discount?.amount > 0 ? (
//                                 <span className="text-red-500 font-medium">-{formatCurrency(item.parent_discount.amount)}</span>
//                               ) : <span className="text-slate-300">—</span>}
//                             </td>
//                             <td className="py-2 px-3 font-semibold text-slate-900 text-right">
//                               {item.parent_discount?.amount > 0 ? (
//                                 <div className="flex flex-col items-end">
//                                   <span className="line-through text-slate-400 font-normal text-[9px]">{formatCurrency(item.gross_total ?? item.total)}</span>
//                                   <span>{formatCurrency(item.net_total ?? (item.total - item.parent_discount.amount))}</span>
//                                 </div>
//                               ) : formatCurrency(item.total)}
//                             </td>
//                           </tr>
                          
//                           {/* Fee Breakdown Sub-rows */}
//                           {item.fee_breakdown && item.fee_breakdown.length > 0 && (
//                             <tr>
//                               <td colSpan={7} className="px-4 py-1 pb-2 bg-slate-50/30">
//                                 <div className="pl-6 border-l-2 border-slate-200 ml-4">
//                                   {item.fee_breakdown.map((fee: any, fIdx: number) => (
//                                     <div key={fIdx} className="flex justify-between text-[10px] py-0.5">
//                                       <span className="text-slate-500">
//                                         <span className="font-medium text-slate-700">{fee.component_name}</span> ({fee.component_type.replace(/_/g, ' ')})
//                                       </span>
//                                       <span className="text-slate-500">{formatCurrency(fee.amount)}</span>
//                                     </div>
//                                   ))}
//                                 </div>
//                               </td>
//                             </tr>
//                           )}
//                         </React.Fragment>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               ))}
//           </div>
//         )}

//         {/* ── Financial Summary (Invoice Style) ── */}
//         {fp && (
//           <div className="mt-8 flex justify-end">
//             <div className="w-full max-w-[320px] bg-slate-50 rounded-lg p-5 border border-slate-200 shadow-sm">
//               <h3 className="text-[10px] font-bold uppercase tracking-widest mb-3 text-slate-400">Account Summary</h3>
              
//               <SummaryRow label="Gross Current Bill" value={formatCurrency(fp.gross_current_bill)} />
//               <SummaryRow label="Total Discounts" value={formatCurrency(fp.total_discounts)} isDeduction />
//               <SummaryRow label="Insurance Copay" value={formatCurrency(fp.insurance_copay)} />
//               <SummaryRow label="Net Current Bill" value={formatCurrency(fp.net_current_bill)} isBold />
              
//               <div className="my-2 border-t border-slate-200 border-dashed" />
              
//               <SummaryRow label="Previous Debt" value={formatCurrency(fp.previous_debt)} />
//               <SummaryRow label="Current Advance" value={formatCurrency(fp.current_advance)} isDeduction />
//               <SummaryRow label="Ledger Balance" value={formatCurrency(fp.ledger_balance)} />
              
//               <div className="mt-3 bg-white border-2 rounded p-3" style={{ borderColor: BRAND }}>
//                 <div className="flex justify-between items-center">
//                   <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Total Payable</span>
//                   <span className="text-lg font-black" style={{ color: BRAND }}>
//                     {formatCurrency(fp.total_amount_payable)}
//                   </span>
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* ── Footer ── */}
//         <div className="mt-12 text-center border-t border-slate-200 pt-4">
//           <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
//             Confidential Medical Document &bull; Unauthorized Access Prohibited
//           </p>
//           <p className="text-[8px] text-slate-400 mt-1">
//             This bill is electronically generated and represents a provisional statement of account as of {new Date().toLocaleString('en-GB')}.
//           </p>
//         </div>

//       </div>
//     </div>
//   );
// };

// export default IPDBillingPrintTemplate;


// import React, { useEffect, useState } from 'react';
// import { useParams } from 'react-router-dom';
// import { billingService } from '../../../services/billing.service';
// import { Loader2, AlertTriangle, Printer } from 'lucide-react';

// const IPDBillingPrintTemplate: React.FC = () => {
//   const { encounterNumber } = useParams<{ encounterNumber: string }>();
//   const [data, setData] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         if (!encounterNumber) throw new Error("No encounter number provided");
//         const res = await billingService.getIPDStatement(encounterNumber);

//         let statementData = res.data;
//         if (statementData && statementData.data && statementData.data.clinical_header) {
//           statementData = statementData.data;
//         } else if (res.data && res.data.clinical_header) {
//           statementData = res.data;
//         }

//         if (statementData) {
//           setData(statementData);
//           setTimeout(() => window.print(), 1000);
//         } else {
//           setError('Billing statement not found.');
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
//         <Loader2 size={48} className="animate-spin text-[#2d258a]" />
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

//   // Compact form field — smaller height & text for dense layout
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

//   // Section header — tighter vertical padding
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

//   const fp = data.financial_position;
//   const ageGenderParts = data.clinical_header?.age_gender?.split('/') || [];
//   const age = ageGenderParts.slice(0, -1).join('/').trim() || data.clinical_header?.age_gender || '';
//   const gender = ageGenderParts.length > 1 ? ageGenderParts[ageGenderParts.length - 1]?.trim() : '';

//   return (
//     <div
//       className="fixed inset-0 bg-slate-100 overflow-y-auto px-4 py-20 print:static print:bg-white print:p-0"
//       style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
//     >
//       <style>{`@page { size: A4; margin: 8mm; }`}</style>
//       {/* Screen-only top bar */}
//       <div className="fixed top-0 left-0 right-0 h-14 bg-slate-900 text-white flex items-center justify-between px-8 print:hidden z-[100] shadow-md">
//         <p className="font-bold text-sm">IPD Provisional Bill Preview</p>
//         <button
//           onClick={() => window.print()}
//           className="bg-[#2d258a] hover:bg-brand-primary text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all"
//         >
//           <Printer size={16} /> Print Bill
//         </button>
//       </div>

//       {/* A4 page container */}
//       <div
//         className="w-[210mm] min-h-[297mm] bg-white shadow-2xl print:shadow-none print:m-0 print:border-none print:w-full border border-slate-200 mx-auto"
//         style={{ padding: '8mm 10mm' }}
//       >

//         {/* ── HEADER BLOCK ── */}
//         <div className="w-full bg-[#3B309A] flex items-center" style={{ padding: '5mm 6mm', minHeight: '22mm' }}>
//           {/* Logo — larger */}
//           <div className="flex items-center justify-center border-r-[1.5px] border-[#4c3fbf]" style={{ width: '44mm', paddingRight: '5mm' }}>
//             <img src="/assets/login-bg.jpeg" alt="Gracespring Logo" style={{ width: '40mm', height: 'auto', objectFit: 'contain' }} />
//           </div>
//           <div className="flex flex-col justify-center" style={{ paddingLeft: '6mm' }}>
//             <h1 className="text-white font-extrabold leading-none tracking-tight" style={{ fontSize: '20pt', marginBottom: '3px' }}>
//               IPD Provisional Bill
//             </h1>
//             <p className="text-brand-active" style={{ fontSize: '7.5pt', lineHeight: 1.3 }}>
//               Comprehensive overview of patient encounter charges and bill particulars. Authorized internal medical utility only.
//             </p>
//           </div>
//         </div>

//         {/* Address bar */}
//         <div className="w-full text-center border-b border-slate-200" style={{ padding: '3px 0 4px' }}>
//           <p style={{ fontSize: '6.5pt', color: '#94a3b8' }}>
//             Head Office: Gracespring Hospitals Limited Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos, Nigeria &nbsp;•&nbsp; +234 705 648 2776 &nbsp;•&nbsp; info@gracespringhospital.com
//           </p>
//         </div>

//         {/* ── SECTIONS A & B SIDE BY SIDE ── */}
//         <div className="grid grid-cols-2 gap-x-5 mt-1">

//           {/* LEFT — Section A: Patient & Clinical */}
//           <div>
//             <SectionHeader char="A" title="PATIENT & CLINICAL DETAIL" />
//             <div className="grid grid-cols-4 gap-x-2">
//               <FormField label="PATIENT NAME" colSpan={2} value={data.clinical_header?.patient_name} />
//               <FormField label="MRN" colSpan={1} value={data.clinical_header?.mrn} />
//               <FormField label="AGE" colSpan={1} value={age} />
//               <FormField label="GENDER" colSpan={2} value={gender} />
//               <FormField label="ADMITTING DR." colSpan={2} value={data.clinical_header?.admitting_dr} />
//               <FormField label="WARD LOCATION" colSpan={4} value={data.clinical_header?.ward_location} />
//             </div>
//           </div>

//           {/* RIGHT — Section B: Administrative */}
//           <div>
//             <SectionHeader char="B" title="ADMINISTRATIVE DETAIL" />
//             <div className="grid grid-cols-4 gap-x-2">
//               <FormField label="ADMISSION NO" colSpan={2} value={data.administrative?.admission_no} />
//               <FormField label="ENCOUNTER NO" colSpan={2} value={data.administrative?.encounter_no} />
//               <FormField label="DATE ADMITTED" colSpan={2} value={data.administrative?.date_admitted} />
//               <FormField label="STATUS" colSpan={1} value={data.administrative?.status} />
//               <FormField label="PAYER" colSpan={2} value={data.administrative?.payer} />
//               <FormField label="POLICY NO" colSpan={2} value={data.administrative?.policy_no || 'N/A'} />
//             </div>
//           </div>
//         </div>


//         {/* ── SECTION C: BILL PARTICULARS ── */}
//         {data.billing_groups && Object.keys(data.billing_groups).length > 0 && (
//           <div>
//             <SectionHeader char="C" title="BILL PARTICULARS" />

//             {Object.entries(data.billing_groups).map(([groupKey, group]: [string, any]) => (
//               <div key={groupKey} className="mb-3">
//                 {/* Group header */}
//                 <div className="bg-[#3B309A]/10 px-3 py-1.5 flex items-center justify-between border-b-2 border-[#3B309A] rounded-t">
//                   <h3 className="font-bold text-[#2d258a] uppercase tracking-widest" style={{ fontSize: '8.5pt' }}>
//                     {groupKey.replace(/_/g, ' ')}
//                   </h3>
//                   <span className="font-black text-[#2d258a]" style={{ fontSize: '9pt' }}>
//                     {formatCurrency(group.dept_total)}
//                   </span>
//                 </div>

//                 <table className="w-full text-left border-x border-b border-slate-200">
//                   <thead>
//                     <tr className="bg-slate-50 border-b border-slate-200">
//                       <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest w-8" style={{ fontSize: '7pt' }}>#</th>
//                       <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest" style={{ fontSize: '7pt' }}>DESCRIPTION</th>
//                       <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest text-center" style={{ fontSize: '7pt' }}>DATE & TIME</th>
//                       <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest text-center w-10" style={{ fontSize: '7pt' }}>QTY</th>
//                       <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest text-right w-24" style={{ fontSize: '7pt' }}>RATE</th>
//                       <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest text-right w-24" style={{ fontSize: '7pt' }}>DISCOUNT</th>
//                       <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest text-right w-28" style={{ fontSize: '7pt' }}>NET TOTAL</th>
//                     </tr>
//                   </thead>
//                   <tbody className="divide-y divide-slate-100">
//                     {group.items?.flatMap((item: any) => {
//                       if (item.drugs && Array.isArray(item.drugs) && item.drugs.length > 0) {
//                         return item.drugs.map((drug: any, dIdx: number) => ({
//                           id: `${item.id}-drug-${dIdx}`,
//                           item_name: `${drug.drug_name} (${drug.dosage} - ${drug.frequency})`,
//                           date: drug.date,
//                           rate: drug.rate,
//                           nos: drug.qty,
//                           total: drug.total,
//                           fee_breakdown: null,
//                           parent_discount: item.discount_applied,
//                         }));
//                       }
//                       // Bundled consumable lines (e.g. "Consumables Used") carry the real
//                       // per-item breakdown in `details` — expand those instead of showing the generic label.
//                       if (item.details && Array.isArray(item.details) && item.details.length > 0) {
//                         return item.details.map((detail: any, dIdx: number) => ({
//                           id: `${item.id}-detail-${dIdx}`,
//                           item_name: detail.name,
//                           date: item.date,
//                           rate: detail.rate,
//                           nos: detail.qty,
//                           total: detail.total,
//                           fee_breakdown: null,
//                           parent_discount: item.discount_applied,
//                         }));
//                       }
//                       return [{
//                         ...item,
//                         parent_discount: item.discount_applied
//                       }];
//                     }).map((item: any, idx: number) => (
//                       <React.Fragment key={item.id || idx}>
//                         <tr className="even:bg-slate-50/40">
//                           <td className="py-1 px-2 text-slate-500" style={{ fontSize: '8pt' }}>{idx + 1}</td>
//                           <td className="py-1 px-2 font-bold text-slate-800" style={{ fontSize: '8pt' }}>{item.item_name}</td>
//                           {/* UPDATED: Displays full timestamp instead of just date */}
//                           <td className="py-1 px-2 text-slate-500 text-center whitespace-nowrap" style={{ fontSize: '7.5pt' }}>
//                             {new Date(item.date).toLocaleString('en-GB', { 
//                                 day: '2-digit', 
//                                 month: '2-digit', 
//                                 year: 'numeric',
//                                 hour: '2-digit',
//                                 minute: '2-digit',
//                                 hour12: true
//                             })}
//                           </td>
//                           <td className="py-1 px-2 text-slate-600 text-center" style={{ fontSize: '8pt' }}>{item.nos}</td>
//                           <td className="py-1 px-2 text-slate-600 text-right" style={{ fontSize: '8pt' }}>{formatCurrency(item.rate)}</td>
                          
//                           <td className="py-1 px-2 text-right" style={{ fontSize: '8pt' }}>
//                             {item.parent_discount && item.parent_discount.amount > 0 ? (
//                               <div className="flex flex-col items-end">
//                                 <span className="font-bold text-slate-700">-{formatCurrency(item.parent_discount.amount)}</span>
//                                 <span style={{ fontSize: '6.5pt' }} className="text-slate-500">
//                                   {item.parent_discount.type === 'PERCENTAGE' ? `${item.parent_discount.value}%` : 'FLAT'}
//                                 </span>
//                               </div>
//                             ) : (
//                               <span className="text-slate-300">—</span>
//                             )}
//                           </td>
                          
//                           <td className="py-1 px-2 font-bold text-[#2d258a] text-right" style={{ fontSize: '8pt' }}>
//                             {item.parent_discount && item.parent_discount.amount > 0 ? (
//                               <div className="flex flex-col items-end">
//                                 <span className="line-through text-slate-400 font-normal" style={{ fontSize: '7pt' }}>
//                                   {formatCurrency(item.gross_total ?? item.total)}
//                                 </span>
//                                 <span>{formatCurrency(item.net_total ?? (item.total - item.parent_discount.amount))}</span>
//                               </div>
//                             ) : (
//                               formatCurrency(item.total)
//                             )}
//                           </td>
//                         </tr>
//                         {item.fee_breakdown && item.fee_breakdown.length > 0 && (
//                           <tr className="bg-slate-50/20">
//                             <td></td>
//                             <td colSpan={6} className="px-3 py-1">
//                               <div className="pl-3 border-l-2 border-[#3B309A]/30 ml-1">
//                                 <table className="w-full" style={{ fontSize: '7.5pt' }}>
//                                   <tbody>
//                                     {item.fee_breakdown.map((fee: any, fIdx: number) => (
//                                       <tr key={fIdx}>
//                                         <td className="py-0.5 text-slate-600">
//                                           <span className="font-bold text-slate-700">{fee.component_name}</span>{' '}
//                                           <span className="text-slate-400">({fee.component_type.replace(/_/g, ' ')})</span>
//                                         </td>
//                                         <td className="py-0.5 text-right text-slate-600">{formatCurrency(fee.amount)}</td>
//                                       </tr>
//                                     ))}
//                                   </tbody>
//                                 </table>
//                               </div>
//                             </td>
//                           </tr>
//                         )}
//                       </React.Fragment>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             ))}
//           </div>
//         )}

//         {/* ── SECTION D: FINANCIAL POSITION ── */}
//         {fp && (
//           <div>
//             <SectionHeader char="D" title="FINANCIAL POSITION" />
//             <div
//               className="grid gap-x-2 gap-y-1.5 rounded border border-slate-200 bg-slate-50/40"
//               style={{ gridTemplateColumns: 'repeat(4, 1fr)', padding: '6px 8px 8px' }}
//             >
//               {/* Row 1 */}
//               <div className="col-span-1">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Gross Current Bill</p>
//                 <p style={{ fontSize: '9pt' }} className="font-black text-slate-800">{formatCurrency(fp.gross_current_bill)}</p>
//               </div>
//               <div className="col-span-1">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Total Discounts</p>
//                 <p style={{ fontSize: '9pt' }} className="font-black text-red-600">- {formatCurrency(fp.total_discounts)}</p>
//               </div>
//               <div className="col-span-1">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Net Current Bill</p>
//                 <p style={{ fontSize: '9pt' }} className="font-black text-slate-800">{formatCurrency(fp.net_current_bill)}</p>
//               </div>
//               <div className="col-span-1">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Insurance Copay</p>
//                 <p style={{ fontSize: '9pt' }} className="font-black text-slate-800">{formatCurrency(fp.insurance_copay)}</p>
//               </div>

//               {/* Row 2 */}
//               <div className="col-span-1">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Current Debt</p>
//                 <p style={{ fontSize: '9pt' }} className="font-black text-slate-800">{formatCurrency(fp.current_debt)}</p>
//               </div>
//               <div className="col-span-1">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Previous Debt</p>
//                 <p style={{ fontSize: '9pt' }} className="font-black text-slate-800">{formatCurrency(fp.previous_debt)}</p>
//               </div>
//               <div className="col-span-1">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Total Patient Debt</p>
//                 <p style={{ fontSize: '9pt' }} className="font-black text-slate-800">{formatCurrency(fp.total_patient_debt)}</p>
//               </div>
//               <div className="col-span-1">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Current Advance</p>
//                 <p style={{ fontSize: '9pt' }} className="font-black text-green-700">{formatCurrency(fp.current_advance)}</p>
//               </div>

//               {/* Row 3 — highlights */}
//               <div className="col-span-2 bg-[#3B309A]/8 rounded p-1.5 border border-[#3B309A]/20">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Ledger Balance</p>
//                 <p style={{ fontSize: '10pt' }} className="font-black text-[#3B309A]">{formatCurrency(fp.ledger_balance)}</p>
//               </div>
//               <div className="col-span-2 bg-[#3B309A] rounded p-1.5">
//                 <p style={{ fontSize: '6.5pt' }} className="text-white/70 font-bold uppercase tracking-wider mb-0.5">Total Amount Payable</p>
//                 <p style={{ fontSize: '10pt' }} className="font-black text-white">{formatCurrency(fp.total_amount_payable)}</p>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Footer */}
//         <div className="mt-6 text-center border-t border-slate-200 pt-3">
//           <p style={{ fontSize: '7.5pt' }} className="text-slate-400 font-bold uppercase tracking-widest">
//             Confidential Medical Document &bull; Unauthorized Access Prohibited
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default IPDBillingPrintTemplate;

// import React, { useEffect, useState } from 'react';
// import { useParams } from 'react-router-dom';
// import { billingService } from '../../../services/billing.service';
// import { Loader2, AlertTriangle, Printer } from 'lucide-react';

// const IPDBillingPrintTemplate: React.FC = () => {
//   const { encounterNumber } = useParams<{ encounterNumber: string }>();
//   const [data, setData] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         if (!encounterNumber) throw new Error("No encounter number provided");
//         const res = await billingService.getIPDStatement(encounterNumber);

//         let statementData = res.data;
//         if (statementData && statementData.data && statementData.data.clinical_header) {
//           statementData = statementData.data;
//         } else if (res.data && res.data.clinical_header) {
//           statementData = res.data;
//         }

//         if (statementData) {
//           setData(statementData);
//           setTimeout(() => window.print(), 1000);
//         } else {
//           setError('Billing statement not found.');
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
//         <Loader2 size={48} className="animate-spin text-[#2d258a]" />
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

//   // Compact form field — smaller height & text for dense layout
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

//   // Section header — tighter vertical padding
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

//   const fp = data.financial_position;
//   const ageGenderParts = data.clinical_header?.age_gender?.split('/') || [];
//   const age = ageGenderParts.slice(0, -1).join('/').trim() || data.clinical_header?.age_gender || '';
//   const gender = ageGenderParts.length > 1 ? ageGenderParts[ageGenderParts.length - 1]?.trim() : '';

//   return (
//     <div
//       className="fixed inset-0 bg-slate-100 overflow-y-auto px-4 py-20 print:static print:bg-white print:p-0"
//       style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
//     >
//       <style>{`@page { size: A4; margin: 8mm; }`}</style>
//       {/* Screen-only top bar */}
//       <div className="fixed top-0 left-0 right-0 h-14 bg-slate-900 text-white flex items-center justify-between px-8 print:hidden z-[100] shadow-md">
//         <p className="font-bold text-sm">IPD Provisional Bill Preview</p>
//         <button
//           onClick={() => window.print()}
//           className="bg-[#2d258a] hover:bg-brand-primary text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all"
//         >
//           <Printer size={16} /> Print Bill
//         </button>
//       </div>

//       {/* A4 page container */}
//       <div
//         className="w-[210mm] min-h-[297mm] bg-white shadow-2xl print:shadow-none print:m-0 print:border-none print:w-full border border-slate-200 mx-auto"
//         style={{ padding: '8mm 10mm' }}
//       >

//         {/* ── HEADER BLOCK ── */}
//         <div className="w-full bg-[#3B309A] flex items-center" style={{ padding: '5mm 6mm', minHeight: '22mm' }}>
//           {/* Logo — larger */}
//           <div className="flex items-center justify-center border-r-[1.5px] border-[#4c3fbf]" style={{ width: '44mm', paddingRight: '5mm' }}>
//             <img src="/assets/login-bg.jpeg" alt="Gracespring Logo" style={{ width: '40mm', height: 'auto', objectFit: 'contain' }} />
//           </div>
//           <div className="flex flex-col justify-center" style={{ paddingLeft: '6mm' }}>
//             <h1 className="text-white font-extrabold leading-none tracking-tight" style={{ fontSize: '20pt', marginBottom: '3px' }}>
//               IPD Provisional Bill
//             </h1>
//             <p className="text-brand-active" style={{ fontSize: '7.5pt', lineHeight: 1.3 }}>
//               Comprehensive overview of patient encounter charges and bill particulars. Authorized internal medical utility only.
//             </p>
//           </div>
//         </div>

//         {/* Address bar */}
//         <div className="w-full text-center border-b border-slate-200" style={{ padding: '3px 0 4px' }}>
//           <p style={{ fontSize: '6.5pt', color: '#94a3b8' }}>
//             Head Office: Gracespring Hospitals Limited Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos, Nigeria &nbsp;•&nbsp; +234 705 648 2776 &nbsp;•&nbsp; info@gracespringhospital.com
//           </p>
//         </div>

//         {/* ── SECTIONS A & B SIDE BY SIDE ── */}
//         <div className="grid grid-cols-2 gap-x-5 mt-1">

//           {/* LEFT — Section A: Patient & Clinical */}
//           <div>
//             <SectionHeader char="A" title="PATIENT & CLINICAL DETAIL" />
//             <div className="grid grid-cols-4 gap-x-2">
//               <FormField label="PATIENT NAME" colSpan={2} value={data.clinical_header?.patient_name} />
//               <FormField label="MRN" colSpan={1} value={data.clinical_header?.mrn} />
//               <FormField label="AGE" colSpan={1} value={age} />
//               <FormField label="GENDER" colSpan={2} value={gender} />
//               <FormField label="ADMITTING DR." colSpan={2} value={data.clinical_header?.admitting_dr} />
//               <FormField label="WARD LOCATION" colSpan={4} value={data.clinical_header?.ward_location} />
//             </div>
//           </div>

//           {/* RIGHT — Section B: Administrative */}
//           <div>
//             <SectionHeader char="B" title="ADMINISTRATIVE DETAIL" />
//             <div className="grid grid-cols-4 gap-x-2">
//               <FormField label="ADMISSION NO" colSpan={2} value={data.administrative?.admission_no} />
//               <FormField label="ENCOUNTER NO" colSpan={2} value={data.administrative?.encounter_no} />
//               <FormField label="DATE ADMITTED" colSpan={2} value={data.administrative?.date_admitted} />
//               <FormField label="STATUS" colSpan={1} value={data.administrative?.status} />
//               <FormField label="PAYER" colSpan={2} value={data.administrative?.payer} />
//               <FormField label="POLICY NO" colSpan={2} value={data.administrative?.policy_no || 'N/A'} />
//             </div>
//           </div>
//         </div>


//         {/* ── SECTION C: BILL PARTICULARS ── */}
//         {data.billing_groups && Object.keys(data.billing_groups).length > 0 && (
//           <div>
//             <SectionHeader char="C" title="BILL PARTICULARS" />

//             {Object.entries(data.billing_groups).map(([groupKey, group]: [string, any]) => (
//               <div key={groupKey} className="mb-3">
//                 {/* Group header */}
//                 <div className="bg-[#3B309A]/10 px-3 py-1.5 flex items-center justify-between border-b-2 border-[#3B309A] rounded-t">
//                   <h3 className="font-bold text-[#2d258a] uppercase tracking-widest" style={{ fontSize: '8.5pt' }}>
//                     {groupKey.replace(/_/g, ' ')}
//                   </h3>
//                   <span className="font-black text-[#2d258a]" style={{ fontSize: '9pt' }}>
//                     {formatCurrency(group.dept_total)}
//                   </span>
//                 </div>

//                 <table className="w-full text-left border-x border-b border-slate-200">
//                   <thead>
//                     <tr className="bg-slate-50 border-b border-slate-200">
//                       <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest w-8" style={{ fontSize: '7pt' }}>#</th>
//                       <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest" style={{ fontSize: '7pt' }}>DESCRIPTION</th>
//                       <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest text-center" style={{ fontSize: '7pt' }}>DATE</th>
//                       <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest text-center w-10" style={{ fontSize: '7pt' }}>QTY</th>
//                       <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest text-right w-24" style={{ fontSize: '7pt' }}>RATE</th>
//                       <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest text-right w-24" style={{ fontSize: '7pt' }}>DISCOUNT</th>
//                       <th className="py-1.5 px-2 font-black text-slate-500 uppercase tracking-widest text-right w-28" style={{ fontSize: '7pt' }}>NET TOTAL</th>
//                     </tr>
//                   </thead>
//                   <tbody className="divide-y divide-slate-100">
//                     {group.items?.flatMap((item: any) => {
//                       if (item.drugs && Array.isArray(item.drugs) && item.drugs.length > 0) {
//                         return item.drugs.map((drug: any, dIdx: number) => ({
//                           id: `${item.id}-drug-${dIdx}`,
//                           item_name: `${drug.drug_name} (${drug.dosage} - ${drug.frequency})`,
//                           date: drug.date,
//                           rate: drug.rate,
//                           nos: drug.qty,
//                           total: drug.total,
//                           fee_breakdown: null,
//                           parent_discount: item.discount_applied,
//                         }));
//                       }
//                       // Bundled consumable lines (e.g. "Consumables Used") carry the real
//                       // per-item breakdown in `details` — expand those instead of showing the generic label.
//                       if (item.details && Array.isArray(item.details) && item.details.length > 0) {
//                         return item.details.map((detail: any, dIdx: number) => ({
//                           id: `${item.id}-detail-${dIdx}`,
//                           item_name: detail.name,
//                           date: item.date,
//                           rate: detail.rate,
//                           nos: detail.qty,
//                           total: detail.total,
//                           fee_breakdown: null,
//                           parent_discount: item.discount_applied,
//                         }));
//                       }
//                       return [{
//                         ...item,
//                         parent_discount: item.discount_applied
//                       }];
//                     }).map((item: any, idx: number) => (
//                       <React.Fragment key={item.id || idx}>
//                         <tr className="even:bg-slate-50/40">
//                           <td className="py-1 px-2 text-slate-500" style={{ fontSize: '8pt' }}>{idx + 1}</td>
//                           <td className="py-1 px-2 font-bold text-slate-800" style={{ fontSize: '8pt' }}>{item.item_name}</td>
//                           <td className="py-1 px-2 text-slate-500 text-center" style={{ fontSize: '8pt' }}>
//                             {new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
//                           </td>
//                           <td className="py-1 px-2 text-slate-600 text-center" style={{ fontSize: '8pt' }}>{item.nos}</td>
//                           <td className="py-1 px-2 text-slate-600 text-right" style={{ fontSize: '8pt' }}>{formatCurrency(item.rate)}</td>
                          
//                           <td className="py-1 px-2 text-right" style={{ fontSize: '8pt' }}>
//                             {item.parent_discount && item.parent_discount.amount > 0 ? (
//                               <div className="flex flex-col items-end">
//                                 <span className="font-bold text-slate-700">-{formatCurrency(item.parent_discount.amount)}</span>
//                                 <span style={{ fontSize: '6.5pt' }} className="text-slate-500">
//                                   {item.parent_discount.type === 'PERCENTAGE' ? `${item.parent_discount.value}%` : 'FLAT'}
//                                 </span>
//                               </div>
//                             ) : (
//                               <span className="text-slate-300">—</span>
//                             )}
//                           </td>
                          
//                           <td className="py-1 px-2 font-bold text-[#2d258a] text-right" style={{ fontSize: '8pt' }}>
//                             {item.parent_discount && item.parent_discount.amount > 0 ? (
//                               <div className="flex flex-col items-end">
//                                 <span className="line-through text-slate-400 font-normal" style={{ fontSize: '7pt' }}>
//                                   {formatCurrency(item.gross_total ?? item.total)}
//                                 </span>
//                                 <span>{formatCurrency(item.net_total ?? (item.total - item.parent_discount.amount))}</span>
//                               </div>
//                             ) : (
//                               formatCurrency(item.total)
//                             )}
//                           </td>
//                         </tr>
//                         {item.fee_breakdown && item.fee_breakdown.length > 0 && (
//                           <tr className="bg-slate-50/20">
//                             <td></td>
//                             <td colSpan={6} className="px-3 py-1">
//                               <div className="pl-3 border-l-2 border-[#3B309A]/30 ml-1">
//                                 <table className="w-full" style={{ fontSize: '7.5pt' }}>
//                                   <tbody>
//                                     {item.fee_breakdown.map((fee: any, fIdx: number) => (
//                                       <tr key={fIdx}>
//                                         <td className="py-0.5 text-slate-600">
//                                           <span className="font-bold text-slate-700">{fee.component_name}</span>{' '}
//                                           <span className="text-slate-400">({fee.component_type.replace(/_/g, ' ')})</span>
//                                         </td>
//                                         <td className="py-0.5 text-right text-slate-600">{formatCurrency(fee.amount)}</td>
//                                       </tr>
//                                     ))}
//                                   </tbody>
//                                 </table>
//                               </div>
//                             </td>
//                           </tr>
//                         )}
//                       </React.Fragment>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             ))}
//           </div>
//         )}

//         {/* ── SECTION D: FINANCIAL POSITION ── */}
//         {fp && (
//           <div>
//             <SectionHeader char="D" title="FINANCIAL POSITION" />
//             <div
//               className="grid gap-x-2 gap-y-1.5 rounded border border-slate-200 bg-slate-50/40"
//               style={{ gridTemplateColumns: 'repeat(4, 1fr)', padding: '6px 8px 8px' }}
//             >
//               {/* Row 1 */}
//               <div className="col-span-1">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Gross Current Bill</p>
//                 <p style={{ fontSize: '9pt' }} className="font-black text-slate-800">{formatCurrency(fp.gross_current_bill)}</p>
//               </div>
//               <div className="col-span-1">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Total Discounts</p>
//                 <p style={{ fontSize: '9pt' }} className="font-black text-red-600">- {formatCurrency(fp.total_discounts)}</p>
//               </div>
//               <div className="col-span-1">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Net Current Bill</p>
//                 <p style={{ fontSize: '9pt' }} className="font-black text-slate-800">{formatCurrency(fp.net_current_bill)}</p>
//               </div>
//               <div className="col-span-1">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Insurance Copay</p>
//                 <p style={{ fontSize: '9pt' }} className="font-black text-slate-800">{formatCurrency(fp.insurance_copay)}</p>
//               </div>

//               {/* Row 2 */}
//               <div className="col-span-1">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Current Debt</p>
//                 <p style={{ fontSize: '9pt' }} className="font-black text-slate-800">{formatCurrency(fp.current_debt)}</p>
//               </div>
//               <div className="col-span-1">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Previous Debt</p>
//                 <p style={{ fontSize: '9pt' }} className="font-black text-slate-800">{formatCurrency(fp.previous_debt)}</p>
//               </div>
//               <div className="col-span-1">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Total Patient Debt</p>
//                 <p style={{ fontSize: '9pt' }} className="font-black text-slate-800">{formatCurrency(fp.total_patient_debt)}</p>
//               </div>
//               <div className="col-span-1">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Current Advance</p>
//                 <p style={{ fontSize: '9pt' }} className="font-black text-green-700">{formatCurrency(fp.current_advance)}</p>
//               </div>

//               {/* Row 3 — highlights */}
//               <div className="col-span-2 bg-[#3B309A]/8 rounded p-1.5 border border-[#3B309A]/20">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Ledger Balance</p>
//                 <p style={{ fontSize: '10pt' }} className="font-black text-[#3B309A]">{formatCurrency(fp.ledger_balance)}</p>
//               </div>
//               <div className="col-span-2 bg-[#3B309A] rounded p-1.5">
//                 <p style={{ fontSize: '6.5pt' }} className="text-white/70 font-bold uppercase tracking-wider mb-0.5">Total Amount Payable</p>
//                 <p style={{ fontSize: '10pt' }} className="font-black text-white">{formatCurrency(fp.total_amount_payable)}</p>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Footer */}
//         <div className="mt-6 text-center border-t border-slate-200 pt-3">
//           <p style={{ fontSize: '7.5pt' }} className="text-slate-400 font-bold uppercase tracking-widest">
//             Confidential Medical Document &bull; Unauthorized Access Prohibited
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default IPDBillingPrintTemplate;
