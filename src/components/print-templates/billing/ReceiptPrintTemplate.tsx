import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { billingService } from '../../../services/billing.service';
import { Loader2, AlertTriangle, Printer, CheckCircle2, Clock, Activity } from 'lucide-react';

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
  if (!dateString || dateString === 'N/A') return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString; 
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
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
const ReceiptPrintTemplate: React.FC = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!type || !id) {
        setError('Invalid receipt parameters');
        setLoading(false);
        return;
      }
      try {
        const response = await billingService.getInvoiceDetails(
          type as "INVOICE" | "ADVANCE",
          parseInt(id),
        );

        if (response.status === "success" && response.data) {
          setData(response.data);
          setTimeout(() => window.print(), 800);
        } else {
          setError('Receipt details not found.');
        }
      } catch (err: any) {
        setError(err.message || 'Could not load receipt data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [type, id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <Loader2 size={40} className="animate-spin mb-4" style={{ color: BRAND }} />
        <p className="text-sm font-medium text-slate-600 animate-pulse">Preparing official receipt...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm w-full border border-red-100">
          <AlertTriangle size={40} className="text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800 mb-2">Receipt Unavailable</h3>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  const isAdvance = type?.toUpperCase() === 'ADVANCE';
  const isPaid = data.header?.status === 'PAID' || data.header?.status === 'SUCCESS';
  const isIPD = data.encounter?.type === 'IPD';
  const adminData = data.administrative;

  return (
    <div className="fixed inset-0 overflow-y-auto bg-slate-200 pt-24 pb-20 px-4 print:static print:bg-white print:p-0 font-sans selection:bg-blue-100">
      <style>
        {`
          @media print {
            @page { margin: 0; }
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
              {isAdvance ? 'Advance Receipt' : 'Invoice Receipt'} Preview
            </h2>
            <p className="text-[11px] text-slate-500 font-mono">{data.header?.reference}</p>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all shadow-md hover:shadow-lg active:scale-95"
          style={{ backgroundColor: BRAND }}
        >
          <Printer size={16} /> Print Receipt
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
              {isAdvance ? 'Advance Receipt' : 'Receipt / Invoice'}
            </h2>
            <p className="text-xs font-bold text-white mt-1">Ref: <span className="font-mono text-white">{data.header?.reference || 'N/A'}</span></p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 uppercase">
              {isPaid ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Clock size={12} className="text-amber-500" />}
              {data.header?.status || 'UNKNOWN'}
            </div>
          </div>
        </div>

        {/* ── Body Sections ── */}
        <div className="px-10 py-8 flex-1">
          
          {/* ── Patient & Receipt Information Grid ── */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 break-inside-avoid">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Patient Details</h3>
              <div className="space-y-1">
                <InfoRow label="Patient Name" value={data.patient_details?.full_name} />
                <InfoRow label="MRN (File No.)" value={data.patient_details?.mrn} />
                <InfoRow label="Age / Gender" value={`${fmt(data.patient_details?.age)} / ${fmt(data.patient_details?.gender)}`} />
                <InfoRow label="Date of Birth" value={formatDate(data.patient_details?.dob).split(',')[0]} />
                <InfoRow label="Contact Phone" value={data.patient_details?.phone} />
                <InfoRow label="Email" value={data.patient_details?.email} />
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 break-inside-avoid">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Receipt Details</h3>
              <div className="space-y-1">
                <InfoRow label="Receipt/Invoice No." value={data.header?.reference} />
                <InfoRow label="Transaction Date" value={formatDate(data.header?.created_at)} />
                <InfoRow label="Encounter Number" value={data.encounter?.number} />
                <InfoRow label="Doctor" value={data.doctor} />
                
                {isIPD && adminData && (
                  <>
                    <InfoRow label="Date Admitted" value={formatDate(adminData.date_admitted)} />
                    <InfoRow label="Date Discharged" value={formatDate(adminData.date_discharged)} />
                  </>
                )}

                <InfoRow label="Payer Name" value={data.payer?.name} />
                <InfoRow label="Payer Type" value={data.payer?.type} />
              </div>
            </div>
          </div>

          {/* ── Section C: Particulars (Grouped & Filtered) ── */}
          {!isAdvance && data.items_grouped && Object.keys(data.items_grouped).length > 0 && (
            <div className="mb-8">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Bill Particulars</h3>
              
              {Object.entries(data.items_grouped)
                .filter(([_, group]: [string, any]) => group.items && group.items.length > 0)
                .map(([groupKey, group]: [string, any]) => (
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
                      {(group.items || [])
                        .flatMap((item: any) => {
                          if (item.drugs && Array.isArray(item.drugs) && item.drugs.length > 0) {
                            return item.drugs.map((drug: any, dIdx: number) => ({
                              id: `${item.id}-drug-${dIdx}`,
                              item_name: `${drug.drug_name} ${drug.dosage ? `(${drug.dosage}${drug.frequency ? ` - ${drug.frequency}` : ""})` : ""}`.trim(),
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
                        })
                        .map((row: any, idx: number) => (
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
                              <tr className="bg-slate-50/50 print:bg-slate-50/50">
                                <td className="py-0"></td>
                                <td colSpan={6} className="py-2 pr-4">
                                  <div className="pl-3 border-l-2 ml-1" style={{ borderColor: `${BRAND}40` }}>
                                    <table className="w-full text-[10px]">
                                      <tbody>
                                        {row.fee_breakdown.map((fee: any, fIdx: number) => (
                                          <tr key={fIdx}>
                                            <td className="py-1 text-slate-600">
                                              <span className="font-semibold text-slate-700">{fee.component_name}</span>{' '}
                                              <span className="text-slate-400">({fee.component_type.replace(/_/g, ' ')})</span>
                                            </td>
                                            <td className="py-1 text-right text-slate-500 w-16">
                                              {fee.quantity > 1 ? `x${fee.quantity}` : ''}
                                            </td>
                                            <td className="py-1 text-right text-slate-700 font-medium w-24">
                                              {formatCurrency(fee.amount * (fee.quantity || 1))}
                                            </td>
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
          {data.financial_summary && (
            <div className="flex justify-end mb-8 break-inside-avoid">
              <div className="w-3/5 min-w-[320px]">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1 text-right">Financial Position</h3>
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                  <div>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Gross Amount</p>
                    <p className="text-sm font-black text-slate-800">{formatCurrency(data.financial_summary.gross_amount)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Discount</p>
                    <p className="text-sm font-black text-red-600">-{formatCurrency(data.financial_summary.discount)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Amount Paid</p>
                    <p className="text-sm font-black text-emerald-600">{formatCurrency(data.financial_summary.amount_paid)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Amount Refunded</p>
                    <p className="text-sm font-black text-slate-800">{formatCurrency(data.financial_summary.amount_refunded)}</p>
                  </div>

                  {/* Highlight Metrics */}
                  <div className="col-span-2 rounded-md p-3 border mt-1" style={{ backgroundColor: `${BRAND}10`, borderColor: `${BRAND}30` }}>
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Net Amount</p>
                      <p className="text-lg font-black" style={{ color: BRAND }}>{formatCurrency(data.financial_summary.net_amount)}</p>
                    </div>
                  </div>
                  <div className="col-span-2 rounded-md p-3 shadow-sm" style={{ backgroundColor: BRAND }}>
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] text-white/80 font-bold uppercase tracking-wider">Outstanding Balance</p>
                      <p className="text-lg font-black text-white">{formatCurrency(data.financial_summary.outstanding)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── NEW: Section E: Payment & Settlement History ── */}
          {data.payments && data.payments.length > 0 && (
            <div className="mb-8 break-inside-avoid">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Payment & Settlement History</h3>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="py-2 px-4 font-semibold text-slate-600 w-32">Date</th>
                      <th className="py-2 px-4 font-semibold text-slate-600">Reference</th>
                      <th className="py-2 px-4 font-semibold text-slate-600">Mode / Source</th>
                      <th className="py-2 px-4 font-semibold text-slate-600">Cashier</th>
                      <th className="py-2 px-4 font-semibold text-slate-600 text-right w-28">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.payments.map((payment: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-4 text-[10px] text-slate-500">{formatDate(payment.date)}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">{payment.reference || 'N/A'}</td>
                        <td className="py-2.5 px-4">
                          <span className="font-medium text-slate-800">{payment.payment_method || 'N/A'}</span>
                          <span className="block text-[9px] text-slate-400 uppercase mt-0.5">{payment.source?.replace('_', ' ')}</span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-700">{payment.cashier_name || 'System Auto'}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-900 text-right">{formatCurrency(payment.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ── Signatures & Footer ── */}
        <div className="mt-auto px-10 pb-8 print:pb-12 break-inside-avoid">
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

          <div className="border-t-2 border-slate-200 pt-4 text-center">
            <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-widest mb-1">Medbookie Limited</h4>
            <p className="text-[10px] text-slate-500">Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos</p>
            <p className="text-[10px] text-slate-500 mt-0.5">+234 705 648 2776 &nbsp;|&nbsp; finance@Medbookiehospitals.com</p>
            
            <div className="flex justify-between items-center text-[9px] text-slate-400 mt-4 px-4">
              <p>Generated electronically on {formatDate(new Date().toISOString())}</p>
              <p className="font-mono font-bold text-slate-500">Ref: {data.header?.reference}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ReceiptPrintTemplate;

// import React, { useEffect, useState } from 'react';
// import { useParams } from 'react-router-dom';
// import { billingService } from '../../../services/billing.service';
// import { Loader2, AlertTriangle, Printer, CheckCircle2, Clock, Activity } from 'lucide-react';

// const BRAND = '#2A157c';

// /* ─── Helpers ──────────────────────────────────────── */
// const fmt = (v: string | number | null | undefined) => (v !== null && v !== undefined && v !== '' ? v : '—');

// const formatCurrency = (amount: number | string | undefined | null) => {
//   if (amount === undefined || amount === null) return '₦0.00';
//   const num = typeof amount === "string" ? parseFloat(amount) : amount;
//   if (isNaN(num)) return '₦0.00';
//   return new Intl.NumberFormat("en-NG", {
//     style: "currency",
//     currency: "NGN",
//     minimumFractionDigits: 2,
//   }).format(num);
// };

// const formatDate = (dateString: string | null | undefined) => {
//   if (!dateString || dateString === 'N/A') return '—';
//   const date = new Date(dateString);
//   if (isNaN(date.getTime())) return dateString; 
//   return date.toLocaleString("en-GB", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//     hour: "2-digit",
//     minute: "2-digit",
//     second: "2-digit",
//   });
// };

// /* ─── Micro-components ─────────────────────────────── */
// const InfoRow = ({ label, value }: { label: string; value?: string | number | null }) => (
//   <div className="flex justify-between py-1 border-b border-slate-100 last:border-0 break-inside-avoid">
//     <span className="text-xs text-slate-500 font-medium">{label}</span>
//     <span className="text-xs font-semibold text-slate-900 text-right">{fmt(value)}</span>
//   </div>
// );

// /* ════════════════════════════════════════════════════════ */
// const ReceiptPrintTemplate: React.FC = () => {
//   const { type, id } = useParams<{ type: string; id: string }>();
//   const [data, setData] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     const fetchData = async () => {
//       if (!type || !id) {
//         setError('Invalid receipt parameters');
//         setLoading(false);
//         return;
//       }
//       try {
//         const response = await billingService.getInvoiceDetails(
//           type as "INVOICE" | "ADVANCE",
//           parseInt(id),
//         );

//         if (response.status === "success" && response.data) {
//           setData(response.data);
//           setTimeout(() => window.print(), 800);
//         } else {
//           setError('Receipt details not found.');
//         }
//       } catch (err: any) {
//         setError(err.message || 'Could not load receipt data.');
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchData();
//   }, [type, id]);

//   if (loading) {
//     return (
//       <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
//         <Loader2 size={40} className="animate-spin mb-4" style={{ color: BRAND }} />
//         <p className="text-sm font-medium text-slate-600 animate-pulse">Preparing official receipt...</p>
//       </div>
//     );
//   }

//   if (error || !data) {
//     return (
//       <div className="flex items-center justify-center min-h-screen bg-slate-50 p-6">
//         <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm w-full border border-red-100">
//           <AlertTriangle size={40} className="text-red-500 mx-auto mb-4" />
//           <h3 className="text-lg font-bold text-slate-800 mb-2">Receipt Unavailable</h3>
//           <p className="text-sm text-slate-500">{error}</p>
//         </div>
//       </div>
//     );
//   }

//   const isAdvance = type?.toUpperCase() === 'ADVANCE';
//   const isPaid = data.header?.status === 'PAID' || data.header?.status === 'SUCCESS';
  
//   const isIPD = data.encounter?.type === 'IPD';
//   const adminData = data.administrative;

//   return (
//     <div className="fixed inset-0 overflow-y-auto bg-slate-200 pt-24 pb-20 px-4 print:static print:bg-white print:p-0 font-sans selection:bg-blue-100">
//       <style>
//         {`
//           @media print {
//             @page { margin: 0; }
//             body {
//               -webkit-print-color-adjust: exact;
//               print-color-adjust: exact;
//             }
//           }
//         `}
//       </style>

//       {/* ── Screen Preview Toolbar (Hidden on Print) ── */}
//       <div className="fixed top-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 md:px-12 print:hidden z-50 shadow-sm">
//         <div className="flex items-center gap-3">
//           <Activity size={20} style={{ color: BRAND }} />
//           <div>
//             <h2 className="font-bold text-slate-800 text-sm leading-tight">
//               {isAdvance ? 'Advance Receipt' : 'Invoice Receipt'} Preview
//             </h2>
//             <p className="text-[11px] text-slate-500 font-mono">{data.header?.reference}</p>
//           </div>
//         </div>
//         <button
//           onClick={() => window.print()}
//           className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all shadow-md hover:shadow-lg active:scale-95"
//           style={{ backgroundColor: BRAND }}
//         >
//           <Printer size={16} /> Print Receipt
//         </button>
//       </div>

//       {/* ── A4 Print Container ── */}
//       <div className="w-full max-w-[210mm] min-h-[297mm] bg-white mx-auto shadow-2xl rounded-sm print:shadow-none print:rounded-none print:max-w-none print:w-full border border-slate-300 print:border-none relative flex flex-col">
        
//         {/* ── Brand Header ── */}
//         <div className="flex justify-between items-start border-b-2 p-6" style={{ backgroundColor: BRAND }}>
//           <div className="flex items-center gap-4">
//             <img src="/assets/logo-nobg.png" alt="Hospital Logo" className="w-[10em] h-auto object-contain" />
//           </div>
//           <div className="text-right">
//             <h2 className="text-2xl font-black uppercase tracking-wider text-white">
//               {isAdvance ? 'Advance Receipt' : 'Receipt / Invoice'}
//             </h2>
//             <p className="text-xs font-bold text-white mt-1">Ref: <span className="font-mono text-white">{data.header?.reference || 'N/A'}</span></p>
//             <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 uppercase">
//               {isPaid ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Clock size={12} className="text-amber-500" />}
//               {data.header?.status || 'UNKNOWN'}
//             </div>
//           </div>
//         </div>

//         {/* ── Body Sections ── */}
//         <div className="px-10 py-8 flex-1">
          
//           {/* ── Patient & Receipt Information Grid (Lab Style) ── */}
//           <div className="grid grid-cols-2 gap-6 mb-8">
//             <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 break-inside-avoid">
//               <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Patient Details</h3>
//               <div className="space-y-1">
//                 <InfoRow label="Patient Name" value={data.patient_details?.full_name} />
//                 <InfoRow label="MRN (File No.)" value={data.patient_details?.mrn} />
//                 <InfoRow label="Age / Gender" value={`${fmt(data.patient_details?.age)} / ${fmt(data.patient_details?.gender)}`} />
//                 <InfoRow label="Date of Birth" value={formatDate(data.patient_details?.dob).split(',')[0]} />
//                 <InfoRow label="Contact Phone" value={data.patient_details?.phone} />
//                 <InfoRow label="Email" value={data.patient_details?.email} />
//               </div>
//             </div>

//             <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 break-inside-avoid">
//               <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Receipt Details</h3>
//               <div className="space-y-1">
//                 <InfoRow label="Receipt/Invoice No." value={data.header?.reference} />
//                 <InfoRow label="Transaction Date" value={formatDate(data.header?.created_at)} />
//                 <InfoRow label="Encounter Number" value={data.encounter?.number} />
//                 <InfoRow label="Doctor" value={data.doctor} />
                
//                 {isIPD && adminData && (
//                   <>
//                     <InfoRow label="Date Admitted" value={formatDate(adminData.date_admitted)} />
//                     <InfoRow label="Date Discharged" value={formatDate(adminData.date_discharged)} />
//                   </>
//                 )}

//                 <InfoRow label="Payer Name" value={data.payer?.name} />
//                 <InfoRow label="Payer Type" value={data.payer?.type} />
//               </div>
//             </div>
//           </div>

//           {/* ── Section C: Particulars (Grouped & Filtered) ── */}
//           {!isAdvance && data.items_grouped && Object.keys(data.items_grouped).length > 0 && (
//             <div className="mb-8">
//               <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Bill Particulars</h3>
              
//               {Object.entries(data.items_grouped)
//                 .filter(([_, group]: [string, any]) => group.items && group.items.length > 0) // Hide empty groups
//                 .map(([groupKey, group]: [string, any]) => (
//                 <div key={groupKey} className="mb-4 break-inside-avoid rounded-lg overflow-hidden border border-slate-200">
//                   <div className="px-4 py-2 flex items-center justify-between border-b" style={{ backgroundColor: `${BRAND}15`, borderColor: `${BRAND}30` }}>
//                     <h4 className="font-bold uppercase tracking-widest text-xs" style={{ color: BRAND }}>
//                       {groupKey.replace(/_/g, ' ')}
//                     </h4>
//                     <span className="font-black text-xs" style={{ color: BRAND }}>
//                       {formatCurrency(group.dept_total)}
//                     </span>
//                   </div>
//                   <table className="w-full text-left text-xs">
//                     <thead>
//                       <tr className="bg-slate-50 border-b border-slate-200">
//                         <th className="py-2 px-3 font-semibold text-slate-600 w-8">#</th>
//                         <th className="py-2 px-3 font-semibold text-slate-600">Description</th>
//                         <th className="py-2 px-3 font-semibold text-slate-600 w-32">Date & Time</th>
//                         <th className="py-2 px-3 font-semibold text-slate-600 text-center w-12">Qty</th>
//                         <th className="py-2 px-3 font-semibold text-slate-600 text-right w-20">Rate</th>
//                         <th className="py-2 px-3 font-semibold text-slate-600 text-right w-20">Disc.</th>
//                         <th className="py-2 px-3 font-semibold text-slate-600 text-right w-24">Net Total</th>
//                       </tr>
//                     </thead>
//                     <tbody className="divide-y divide-slate-100">
//                       {(group.items || [])
//                         .flatMap((item: any) => {
//                           if (item.drugs && Array.isArray(item.drugs) && item.drugs.length > 0) {
//                             return item.drugs.map((drug: any, dIdx: number) => ({
//                               id: `${item.id}-drug-${dIdx}`,
//                               item_name: `${drug.drug_name} ${drug.dosage ? `(${drug.dosage}${drug.frequency ? ` - ${drug.frequency}` : ""})` : ""}`.trim(),
//                               date: drug.date ?? item.date,
//                               rate: drug.rate,
//                               nos: drug.qty,
//                               total: drug.total,
//                               fee_breakdown: null,
//                               parent_discount: item.discount_applied,
//                             }));
//                           }
//                           if (item.details && Array.isArray(item.details) && item.details.length > 0) {
//                             return item.details.map((detail: any, dIdx: number) => ({
//                               id: `${item.id}-detail-${dIdx}`,
//                               item_name: detail.name,
//                               date: item.date,
//                               rate: detail.rate,
//                               nos: detail.qty,
//                               total: detail.total,
//                               fee_breakdown: null,
//                               parent_discount: item.discount_applied,
//                             }));
//                           }
//                           return [{ ...item, parent_discount: item.discount_applied }];
//                         })
//                         .map((row: any, idx: number) => (
//                           <React.Fragment key={row.id || idx}>
//                             <tr className="hover:bg-slate-50/80 transition-colors">
//                               <td className="py-2.5 px-3 text-slate-500">{idx + 1}</td>
//                               <td className="py-2.5 px-3 font-medium text-slate-800">{row.item_name}</td>
//                               <td className="py-2.5 px-3 text-[10px] text-slate-500 whitespace-nowrap">
//                                 {formatDate(row.date)}
//                               </td>
//                               <td className="py-2.5 px-3 text-slate-600 text-center">{row.nos}</td>
//                               <td className="py-2.5 px-3 text-slate-600 text-right">{formatCurrency(row.rate)}</td>
//                               <td className="py-2.5 px-3 text-right">
//                                 {row.parent_discount && row.parent_discount.amount > 0 ? (
//                                   <div className="flex flex-col items-end leading-tight">
//                                     <span className="font-semibold text-slate-700">-{formatCurrency(row.parent_discount.amount)}</span>
//                                     <span className="text-[9px] text-slate-400">
//                                       {row.parent_discount.type === 'PERCENTAGE' ? `${row.parent_discount.value}%` : 'FLAT'}
//                                     </span>
//                                   </div>
//                                 ) : (
//                                   <span className="text-slate-300">—</span>
//                                 )}
//                               </td>
//                               <td className="py-2.5 px-3 font-bold text-right text-slate-900">
//                                 {row.parent_discount && row.parent_discount.amount > 0 ? (
//                                   <div className="flex flex-col items-end leading-tight">
//                                     <span className="line-through text-slate-400 font-normal text-[10px]">
//                                       {formatCurrency(row.gross_total ?? row.total)}
//                                     </span>
//                                     <span>{formatCurrency(row.net_total ?? (row.total - row.parent_discount.amount))}</span>
//                                   </div>
//                                 ) : (
//                                   formatCurrency(row.total)
//                                 )}
//                               </td>
//                             </tr>
//                             {row.fee_breakdown && row.fee_breakdown.length > 0 && (
//                               <tr className="bg-slate-50/50 print:bg-slate-50/50">
//                                 <td className="py-0"></td>
//                                 <td colSpan={6} className="py-2 pr-4">
//                                   <div className="pl-3 border-l-2 ml-1" style={{ borderColor: `${BRAND}40` }}>
//                                     <table className="w-full text-[10px]">
//                                       <tbody>
//                                         {row.fee_breakdown.map((fee: any, fIdx: number) => (
//                                           <tr key={fIdx}>
//                                             <td className="py-1 text-slate-600">
//                                               <span className="font-semibold text-slate-700">{fee.component_name}</span>{' '}
//                                               <span className="text-slate-400">({fee.component_type.replace(/_/g, ' ')})</span>
//                                             </td>
//                                             <td className="py-1 text-right text-slate-500 w-16">
//                                               {fee.quantity > 1 ? `x${fee.quantity}` : ''}
//                                             </td>
//                                             <td className="py-1 text-right text-slate-700 font-medium w-24">
//                                               {formatCurrency(fee.amount * (fee.quantity || 1))}
//                                             </td>
//                                           </tr>
//                                         ))}
//                                       </tbody>
//                                     </table>
//                                   </div>
//                                 </td>
//                               </tr>
//                             )}
//                           </React.Fragment>
//                         ))}
//                     </tbody>
//                   </table>
//                 </div>
//               ))}
//             </div>
//           )}

//           {/* ── Section D: Financial Position (Right-Aligned Grid) ── */}
//           {data.financial_summary && (
//             <div className="flex justify-end mb-4 break-inside-avoid">
//               <div className="w-3/5 min-w-[320px]">
//                 <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1 text-right">Financial Position</h3>
//                 <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                  
//                   {/* Regular Metrics */}
//                   <div>
//                     <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Gross Amount</p>
//                     <p className="text-sm font-black text-slate-800">{formatCurrency(data.financial_summary.gross_amount)}</p>
//                   </div>
//                   <div>
//                     <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Discount</p>
//                     <p className="text-sm font-black text-red-600">-{formatCurrency(data.financial_summary.discount)}</p>
//                   </div>
//                   <div>
//                     <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Amount Paid</p>
//                     <p className="text-sm font-black text-emerald-600">{formatCurrency(data.financial_summary.amount_paid)}</p>
//                   </div>
//                   <div>
//                     <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Amount Refunded</p>
//                     <p className="text-sm font-black text-slate-800">{formatCurrency(data.financial_summary.amount_refunded)}</p>
//                   </div>

//                   {/* Highlight Metrics */}
//                   <div className="col-span-2 rounded-md p-3 border mt-1" style={{ backgroundColor: `${BRAND}10`, borderColor: `${BRAND}30` }}>
//                     <div className="flex justify-between items-center">
//                       <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Net Amount</p>
//                       <p className="text-lg font-black" style={{ color: BRAND }}>{formatCurrency(data.financial_summary.net_amount)}</p>
//                     </div>
//                   </div>
//                   <div className="col-span-2 rounded-md p-3 shadow-sm" style={{ backgroundColor: BRAND }}>
//                     <div className="flex justify-between items-center">
//                       <p className="text-[10px] text-white/80 font-bold uppercase tracking-wider">Outstanding Balance</p>
//                       <p className="text-lg font-black text-white">{formatCurrency(data.financial_summary.outstanding)}</p>
//                     </div>
//                   </div>

//                 </div>
//               </div>
//             </div>
//           )}
//         </div>

//         {/* ── Signatures & Footer ── */}
//         <div className="mt-auto px-10 pb-8 print:pb-12 break-inside-avoid">
//           <div className="grid grid-cols-2 gap-12 mb-8 pt-4">
//             <div className="text-center">
//               <div className="border-b border-slate-300 pb-2 mb-2"></div>
//               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cashier / Authorized Signatory</p>
//             </div>
//             <div className="text-center">
//               <div className="border-b border-slate-300 pb-2 mb-2"></div>
//               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Patient / Client Signature</p>
//             </div>
//           </div>

//           <div className="border-t-2 border-slate-200 pt-4 text-center">
//             <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-widest mb-1">Medbookie Limited</h4>
//             <p className="text-[10px] text-slate-500">Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos</p>
//             <p className="text-[10px] text-slate-500 mt-0.5">+234 705 648 2776 &nbsp;|&nbsp; finance@Medbookiehospitals.com</p>
            
//             <div className="flex justify-between items-center text-[9px] text-slate-400 mt-4 px-4">
//               <p>Generated electronically on {formatDate(new Date().toISOString())}</p>
//               <p className="font-mono font-bold text-slate-500">Ref: {data.header?.reference}</p>
//             </div>
//           </div>
//         </div>

//       </div>
//     </div>
//   );
// };

// export default ReceiptPrintTemplate;


// import React, { useEffect, useState } from 'react';
// import { useParams } from 'react-router-dom';
// import { billingService } from '../../../services/billing.service';
// import { Loader2, AlertTriangle, Printer, CheckCircle2, Clock, Activity } from 'lucide-react';

// const BRAND = '#2A157c';

// /* ─── Helpers ──────────────────────────────────────── */
// const fmt = (v: string | number | null | undefined) => (v !== null && v !== undefined && v !== '' ? v : '—');

// const formatCurrency = (amount: number | string | undefined | null) => {
//   if (amount === undefined || amount === null) return '₦0.00';
//   const num = typeof amount === "string" ? parseFloat(amount) : amount;
//   if (isNaN(num)) return '₦0.00';
//   return new Intl.NumberFormat("en-NG", {
//     style: "currency",
//     currency: "NGN",
//     minimumFractionDigits: 2,
//   }).format(num);
// };

// const formatDate = (dateString: string | null | undefined) => {
//   if (!dateString || dateString === 'N/A') return '—';
//   const date = new Date(dateString);
//   // Prevent "Invalid Date" from rendering
//   if (isNaN(date.getTime())) return dateString; 
//   return date.toLocaleString("en-GB", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//     hour: "2-digit",
//     minute: "2-digit",
//     second: "2-digit",
//   });
// };

// /* ─── Micro-components ─────────────────────────────── */
// const InfoRow = ({ label, value }: { label: string; value?: string | number | null }) => (
//   <div className="flex justify-between py-1 border-b border-slate-100 last:border-0 break-inside-avoid">
//     <span className="text-xs text-slate-500 font-medium">{label}</span>
//     <span className="text-xs font-semibold text-slate-900 text-right">{fmt(value)}</span>
//   </div>
// );

// /* ════════════════════════════════════════════════════════ */
// const ReceiptPrintTemplate: React.FC = () => {
//   const { type, id } = useParams<{ type: string; id: string }>();
//   const [data, setData] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     const fetchData = async () => {
//       if (!type || !id) {
//         setError('Invalid receipt parameters');
//         setLoading(false);
//         return;
//       }
//       try {
//         const response = await billingService.getInvoiceDetails(
//           type as "INVOICE" | "ADVANCE",
//           parseInt(id),
//         );

//         if (response.status === "success" && response.data) {
//           setData(response.data);
//           // Auto-trigger print slightly after render for seamless UX
//           setTimeout(() => window.print(), 800);
//         } else {
//           setError('Receipt details not found.');
//         }
//       } catch (err: any) {
//         setError(err.message || 'Could not load receipt data.');
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchData();
//   }, [type, id]);

//   if (loading) {
//     return (
//       <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
//         <Loader2 size={40} className="animate-spin mb-4" style={{ color: BRAND }} />
//         <p className="text-sm font-medium text-slate-600 animate-pulse">Preparing official receipt...</p>
//       </div>
//     );
//   }

//   if (error || !data) {
//     return (
//       <div className="flex items-center justify-center min-h-screen bg-slate-50 p-6">
//         <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm w-full border border-red-100">
//           <AlertTriangle size={40} className="text-red-500 mx-auto mb-4" />
//           <h3 className="text-lg font-bold text-slate-800 mb-2">Receipt Unavailable</h3>
//           <p className="text-sm text-slate-500">{error}</p>
//         </div>
//       </div>
//     );
//   }

//   const isAdvance = type?.toUpperCase() === 'ADVANCE';
//   const isPaid = data.header?.status === 'PAID' || data.header?.status === 'SUCCESS';
  
//   // Safely check if this is an IPD encounter that should show admission/discharge dates
//   const isIPD = data.encounter?.type === 'IPD';
//   const adminData = data.administrative;

//   return (
//     <div className="fixed inset-0 overflow-y-auto bg-slate-200 pt-24 pb-20 px-4 print:static print:bg-white print:p-0 font-sans selection:bg-blue-100">
      
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
//       <div className="fixed top-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 md:px-12 print:hidden z-50 shadow-sm">
//         <div className="flex items-center gap-3">
//           <Activity size={20} style={{ color: BRAND }} />
//           <div>
//             <h2 className="font-bold text-slate-800 text-sm leading-tight">
//               {isAdvance ? 'Advance Receipt' : 'Invoice Receipt'} Preview
//             </h2>
//             <p className="text-[11px] text-slate-500 font-mono">{data.header?.reference}</p>
//           </div>
//         </div>
//         <button
//           onClick={() => window.print()}
//           className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all shadow-md hover:shadow-lg active:scale-95"
//           style={{ backgroundColor: BRAND }}
//         >
//           <Printer size={16} /> Print Receipt
//         </button>
//       </div>

//       {/* ── A4 Print Container ── */}
//       <div className="w-full max-w-[210mm] min-h-[297mm] bg-white mx-auto shadow-2xl rounded-sm print:shadow-none print:rounded-none print:max-w-none print:w-full border border-slate-300 print:border-none relative flex flex-col">
        
//         {/* ── Brand Header ── */}
//         <div className="flex justify-between items-start border-b-2 p-6" style={{ backgroundColor: BRAND }}>
//           <div className="flex items-center gap-4">
//             <img src="/assets/logo-nobg.png" alt="Hospital Logo" className="w-[10em] h-auto object-contain" />
//           </div>
//           <div className="text-right">
//             <h2 className="text-2xl font-black uppercase tracking-wider text-white">
//               {isAdvance ? 'Advance Receipt' : 'Receipt / Invoice'}
//             </h2>
//             <p className="text-xs font-bold text-white mt-1">Ref: <span className="font-mono text-white">{data.header?.reference || 'N/A'}</span></p>
//             <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 uppercase">
//               {isPaid ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Clock size={12} className="text-amber-500" />}
//               {data.header?.status || 'UNKNOWN'}
//             </div>
//           </div>
//         </div>

//         {/* ── Body Sections ── */}
//         <div className="px-10 py-8 flex-1">
          
//           {/* ── Patient & Receipt Information Grid (Lab Style) ── */}
//           <div className="grid grid-cols-2 gap-6 mb-8">
//             <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 break-inside-avoid">
//               <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Patient Details</h3>
//               <div className="space-y-1">
//                 <InfoRow label="Patient Name" value={data.patient_details?.full_name} />
//                 <InfoRow label="MRN (File No.)" value={data.patient_details?.mrn} />
//                 <InfoRow label="Age / Gender" value={`${fmt(data.patient_details?.age)} / ${fmt(data.patient_details?.gender)}`} />
//                 <InfoRow label="Date of Birth" value={formatDate(data.patient_details?.dob).split(',')[0]} />
//                 <InfoRow label="Contact Phone" value={data.patient_details?.phone} />
//                 <InfoRow label="Email" value={data.patient_details?.email} />
//               </div>
//             </div>

//             <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 break-inside-avoid">
//               <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Receipt Details</h3>
//               <div className="space-y-1">
//                 <InfoRow label="Receipt/Invoice No." value={data.header?.reference} />
//                 <InfoRow label="Transaction Date" value={formatDate(data.header?.created_at)} />
//                 <InfoRow label="Encounter Number" value={data.encounter?.number} />
//                 <InfoRow label="Doctor" value={data.doctor} />
                
//                 {/* ── NEW: Show Admission and Discharge Dates for IPD Encounters ── */}
//                 {isIPD && adminData && (
//                   <>
//                     <InfoRow label="Date Admitted" value={formatDate(adminData.date_admitted)} />
//                     <InfoRow label="Date Discharged" value={formatDate(adminData.date_discharged)} />
//                   </>
//                 )}

//                 <InfoRow label="Payer Name" value={data.payer?.name} />
//                 <InfoRow label="Payer Type" value={data.payer?.type} />
//               </div>
//             </div>
//           </div>

//           {/* ── Section C: Particulars (Grouped) ── */}
//           {!isAdvance && data.items_grouped && Object.keys(data.items_grouped).length > 0 && (
//             <div className="mb-8">
//               <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Particulars</h3>
              
//               {Object.entries(data.items_grouped).map(([groupKey, group]: [string, any]) => (
//                 <div key={groupKey} className="mb-4 break-inside-avoid rounded-lg overflow-hidden border border-slate-200">
//                   <div className="px-4 py-2 flex items-center justify-between border-b" style={{ backgroundColor: `${BRAND}15`, borderColor: `${BRAND}30` }}>
//                     <h4 className="font-bold uppercase tracking-widest text-xs" style={{ color: BRAND }}>
//                       {groupKey.replace(/_/g, ' ')}
//                     </h4>
//                     <span className="font-black text-xs" style={{ color: BRAND }}>
//                       {formatCurrency(group.dept_total)}
//                     </span>
//                   </div>
//                   <table className="w-full text-left text-xs">
//                     <thead>
//                       <tr className="bg-slate-50 border-b border-slate-200">
//                         <th className="py-2 px-3 font-semibold text-slate-600 w-8">#</th>
//                         <th className="py-2 px-3 font-semibold text-slate-600">Description</th>
//                         <th className="py-2 px-3 font-semibold text-slate-600 w-32">Date & Time</th>
//                         <th className="py-2 px-3 font-semibold text-slate-600 text-center w-12">Qty</th>
//                         <th className="py-2 px-3 font-semibold text-slate-600 text-right w-20">Rate</th>
//                         <th className="py-2 px-3 font-semibold text-slate-600 text-right w-20">Disc.</th>
//                         <th className="py-2 px-3 font-semibold text-slate-600 text-right w-24">Net Total</th>
//                       </tr>
//                     </thead>
//                     <tbody className="divide-y divide-slate-100">
//                       {(group.items || [])
//                         .flatMap((item: any) => {
//                           if (item.drugs && Array.isArray(item.drugs) && item.drugs.length > 0) {
//                             return item.drugs.map((drug: any, dIdx: number) => ({
//                               id: `${item.id}-drug-${dIdx}`,
//                               item_name: `${drug.drug_name} (${drug.dosage}${drug.frequency ? ` - ${drug.frequency}` : ""})`,
//                               date: drug.date ?? item.date,
//                               rate: drug.rate,
//                               nos: drug.qty,
//                               total: drug.total,
//                               fee_breakdown: null,
//                               parent_discount: item.discount_applied,
//                             }));
//                           }
//                           if (item.details && Array.isArray(item.details) && item.details.length > 0) {
//                             return item.details.map((detail: any, dIdx: number) => ({
//                               id: `${item.id}-detail-${dIdx}`,
//                               item_name: detail.name,
//                               date: item.date,
//                               rate: detail.rate,
//                               nos: detail.qty,
//                               total: detail.total,
//                               fee_breakdown: null,
//                               parent_discount: item.discount_applied,
//                             }));
//                           }
//                           return [{ ...item, parent_discount: item.discount_applied }];
//                         })
//                         .map((row: any, idx: number) => (
//                           <React.Fragment key={row.id || idx}>
//                             <tr className="hover:bg-slate-50/80 transition-colors">
//                               <td className="py-2.5 px-3 text-slate-500">{idx + 1}</td>
//                               <td className="py-2.5 px-3 font-medium text-slate-800">{row.item_name}</td>
//                               <td className="py-2.5 px-3 text-[10px] text-slate-500 whitespace-nowrap">
//                                 {formatDate(row.date)}
//                               </td>
//                               <td className="py-2.5 px-3 text-slate-600 text-center">{row.nos}</td>
//                               <td className="py-2.5 px-3 text-slate-600 text-right">{formatCurrency(row.rate)}</td>
//                               <td className="py-2.5 px-3 text-right">
//                                 {row.parent_discount && row.parent_discount.amount > 0 ? (
//                                   <div className="flex flex-col items-end leading-tight">
//                                     <span className="font-semibold text-slate-700">-{formatCurrency(row.parent_discount.amount)}</span>
//                                     <span className="text-[9px] text-slate-400">
//                                       {row.parent_discount.type === 'PERCENTAGE' ? `${row.parent_discount.value}%` : 'FLAT'}
//                                     </span>
//                                   </div>
//                                 ) : (
//                                   <span className="text-slate-300">—</span>
//                                 )}
//                               </td>
//                               <td className="py-2.5 px-3 font-bold text-right text-slate-900">
//                                 {row.parent_discount && row.parent_discount.amount > 0 ? (
//                                   <div className="flex flex-col items-end leading-tight">
//                                     <span className="line-through text-slate-400 font-normal text-[10px]">
//                                       {formatCurrency(row.gross_total ?? row.total)}
//                                     </span>
//                                     <span>{formatCurrency(row.net_total ?? (row.total - row.parent_discount.amount))}</span>
//                                   </div>
//                                 ) : (
//                                   formatCurrency(row.total)
//                                 )}
//                               </td>
//                             </tr>
//                             {row.fee_breakdown && row.fee_breakdown.length > 0 && (
//                               <tr className="bg-slate-50/50 print:bg-slate-50/50">
//                                 <td className="py-0"></td>
//                                 <td colSpan={6} className="py-2 pr-4">
//                                   <div className="pl-3 border-l-2 ml-1" style={{ borderColor: `${BRAND}40` }}>
//                                     <table className="w-full text-[10px]">
//                                       <tbody>
//                                         {row.fee_breakdown.map((fee: any, fIdx: number) => (
//                                           <tr key={fIdx}>
//                                             <td className="py-1 text-slate-600">
//                                               <span className="font-semibold text-slate-700">{fee.component_name}</span>{' '}
//                                               <span className="text-slate-400">({fee.component_type.replace(/_/g, ' ')})</span>
//                                             </td>
//                                             <td className="py-1 text-right text-slate-500 w-16">
//                                               {fee.quantity > 1 ? `x${fee.quantity}` : ''}
//                                             </td>
//                                             <td className="py-1 text-right text-slate-700 font-medium w-24">
//                                               {formatCurrency(fee.amount * (fee.quantity || 1))}
//                                             </td>
//                                           </tr>
//                                         ))}
//                                       </tbody>
//                                     </table>
//                                   </div>
//                                 </td>
//                               </tr>
//                             )}
//                           </React.Fragment>
//                         ))}
//                     </tbody>
//                   </table>
//                 </div>
//               ))}
//             </div>
//           )}

//           {/* ── Fallback Section C: Particulars (Ungrouped) ── */}
//           {!isAdvance && !data.items_grouped && data.items && data.items.length > 0 && (
//             <div className="mb-8">
//               <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Particulars</h3>
//               <div className="border border-slate-200 rounded-lg overflow-hidden">
//                 <table className="w-full text-left text-xs">
//                   <thead>
//                     <tr className="bg-slate-50 border-b border-slate-200">
//                       <th className="py-2.5 px-4 font-semibold text-slate-600">Description</th>
//                       <th className="py-2.5 px-4 font-semibold text-slate-600">Date & Time</th>
//                       <th className="py-2.5 px-4 font-semibold text-slate-600 text-center w-16">Qty</th>
//                       <th className="py-2.5 px-4 font-semibold text-slate-600 text-right w-24">Unit Price</th>
//                       <th className="py-2.5 px-4 font-semibold text-slate-600 text-right w-28">Amount</th>
//                     </tr>
//                   </thead>
//                   <tbody className="divide-y divide-slate-100">
//                     {data.items.map((item: any, idx: number) => (
//                       <tr key={idx} className="hover:bg-slate-50/80 transition-colors break-inside-avoid">
//                         <td className="py-3 px-4 font-medium text-slate-800">
//                           <div>{item.display_name || item.description || item.service_name || item.item_name || item.drug_name}</div>
//                           <div className="text-[10px] text-slate-500 mt-1 font-normal space-y-0.5">
//                             {item.drug_code && (<div><span className="font-medium text-slate-600">Drug Code:</span> {item.drug_code}</div>)}
//                             {item.item_code && (<div><span className="font-medium text-slate-600">Item Code:</span> {item.item_code}</div>)}
//                             {item.dosage && (<div><span className="font-medium text-slate-600">Dosage:</span> {item.dosage}</div>)}
//                             {item.dispensing_dept && (<div><span className="font-medium text-slate-600">Department:</span> {item.dispensing_dept}</div>)}
//                           </div>
//                         </td>
//                         <td className="py-3 px-4 text-[10px] text-slate-500 whitespace-nowrap">
//                           {formatDate(item.ordered_at || item.date)}
//                         </td>
//                         <td className="py-3 px-4 text-slate-600 text-center">{parseFloat(item.quantity).toFixed(1)}</td>
//                         <td className="py-3 px-4 text-slate-600 text-right">{formatCurrency(item.unit_price)}</td>
//                         <td className="py-3 px-4 font-bold text-slate-900 text-right">{formatCurrency(item.line_total)}</td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             </div>
//           )}

//           {/* ── Section D: Financial Position (Right-Aligned Grid) ── */}
//           {data.financial_summary && (
//             <div className="flex justify-end mb-4 break-inside-avoid">
//               <div className="w-3/5 min-w-[320px]">
//                 <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1 text-right">Financial Position</h3>
//                 <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                  
//                   {/* Regular Metrics */}
//                   <div>
//                     <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Gross Amount</p>
//                     <p className="text-sm font-black text-slate-800">{formatCurrency(data.financial_summary.gross_amount)}</p>
//                   </div>
//                   <div>
//                     <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Discount</p>
//                     <p className="text-sm font-black text-red-600">-{formatCurrency(data.financial_summary.discount)}</p>
//                   </div>
//                   <div>
//                     <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Amount Paid</p>
//                     <p className="text-sm font-black text-emerald-600">{formatCurrency(data.financial_summary.amount_paid)}</p>
//                   </div>
//                   <div>
//                     <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Amount Refunded</p>
//                     <p className="text-sm font-black text-slate-800">{formatCurrency(data.financial_summary.amount_refunded)}</p>
//                   </div>

//                   {/* Highlight Metrics - Span full width of their container */}
//                   <div className="col-span-2 rounded-md p-3 border mt-1" style={{ backgroundColor: `${BRAND}10`, borderColor: `${BRAND}30` }}>
//                     <div className="flex justify-between items-center">
//                       <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Net Amount</p>
//                       <p className="text-lg font-black" style={{ color: BRAND }}>{formatCurrency(data.financial_summary.net_amount)}</p>
//                     </div>
//                   </div>
//                   <div className="col-span-2 rounded-md p-3 shadow-sm" style={{ backgroundColor: BRAND }}>
//                     <div className="flex justify-between items-center">
//                       <p className="text-[10px] text-white/80 font-bold uppercase tracking-wider">Outstanding Balance</p>
//                       <p className="text-lg font-black text-white">{formatCurrency(data.financial_summary.outstanding)}</p>
//                     </div>
//                   </div>

//                 </div>
//               </div>
//             </div>
//           )}
//         </div>

//         {/* ── Signatures & Footer (Forced to bottom via mt-auto) ── */}
//         <div className="mt-auto px-10 pb-8 print:pb-12 break-inside-avoid">
          
//           {/* Signatures */}
//           <div className="grid grid-cols-2 gap-12 mb-8 pt-4">
//             <div className="text-center">
//               <div className="border-b border-slate-300 pb-2 mb-2"></div>
//               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cashier / Authorized Signatory</p>
//             </div>
//             <div className="text-center">
//               <div className="border-b border-slate-300 pb-2 mb-2"></div>
//               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Patient / Client Signature</p>
//             </div>
//           </div>

//           {/* Hospital Address and Document Meta */}
//           <div className="border-t-2 border-slate-200 pt-4 text-center">
//             <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-widest mb-1">Medbookie Limited</h4>
//             <p className="text-[10px] text-slate-500">
//               Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos
//             </p>
//             <p className="text-[10px] text-slate-500 mt-0.5">
//               +234 705 648 2776 &nbsp;|&nbsp; finance@Medbookiehospitals.com
//             </p>
            
//             <div className="flex justify-between items-center text-[9px] text-slate-400 mt-4 px-4">
//               <p>Generated electronically on {formatDate(new Date().toISOString())}</p>
//               <p className="font-mono font-bold text-slate-500">Ref: {data.header?.reference}</p>
//             </div>
            
//             <p className="text-[8px] text-slate-300 text-center mt-2 uppercase tracking-widest">
//               Official Receipt • Thank you for your payment
//             </p>
//           </div>
//         </div>

//       </div>
//     </div>
//   );
// };

// export default ReceiptPrintTemplate;














// import React, { useEffect, useState } from 'react';
// import { useParams } from 'react-router-dom';
// import { billingService } from '../../../services/billing.service';
// import { Loader2, AlertTriangle, Printer, CheckCircle2, Clock, Activity } from 'lucide-react';

// const BRAND = '#2A157c';

// /* ─── Helpers ──────────────────────────────────────── */
// const fmt = (v: string | number | null | undefined) => (v !== null && v !== undefined && v !== '' ? v : '—');

// const formatCurrency = (amount: number | string | undefined | null) => {
//   if (amount === undefined || amount === null) return '₦0.00';
//   const num = typeof amount === "string" ? parseFloat(amount) : amount;
//   if (isNaN(num)) return '₦0.00';
//   return new Intl.NumberFormat("en-NG", {
//     style: "currency",
//     currency: "NGN",
//     minimumFractionDigits: 2,
//   }).format(num);
// };

// const formatDate = (dateString: string | null | undefined) => {
//   if (!dateString) return '—';
//   const date = new Date(dateString);
//   return date.toLocaleString("en-GB", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//     hour: "2-digit",
//     minute: "2-digit",
//     second: "2-digit",
//   });
// };

// /* ─── Micro-components ─────────────────────────────── */
// const InfoRow = ({ label, value }: { label: string; value?: string | number | null }) => (
//   <div className="flex justify-between py-1 border-b border-slate-100 last:border-0 break-inside-avoid">
//     <span className="text-xs text-slate-500 font-medium">{label}</span>
//     <span className="text-xs font-semibold text-slate-900 text-right">{fmt(value)}</span>
//   </div>
// );

// /* ════════════════════════════════════════════════════════ */
// const ReceiptPrintTemplate: React.FC = () => {
//   const { type, id } = useParams<{ type: string; id: string }>();
//   const [data, setData] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     const fetchData = async () => {
//       if (!type || !id) {
//         setError('Invalid receipt parameters');
//         setLoading(false);
//         return;
//       }
//       try {
//         const response = await billingService.getInvoiceDetails(
//           type as "INVOICE" | "ADVANCE",
//           parseInt(id),
//         );

//         if (response.status === "success" && response.data) {
//           setData(response.data);
//           // Auto-trigger print slightly after render for seamless UX
//           setTimeout(() => window.print(), 800);
//         } else {
//           setError('Receipt details not found.');
//         }
//       } catch (err: any) {
//         setError(err.message || 'Could not load receipt data.');
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchData();
//   }, [type, id]);

//   if (loading) {
//     return (
//       <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
//         <Loader2 size={40} className="animate-spin mb-4" style={{ color: BRAND }} />
//         <p className="text-sm font-medium text-slate-600 animate-pulse">Preparing official receipt...</p>
//       </div>
//     );
//   }

//   if (error || !data) {
//     return (
//       <div className="flex items-center justify-center min-h-screen bg-slate-50 p-6">
//         <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm w-full border border-red-100">
//           <AlertTriangle size={40} className="text-red-500 mx-auto mb-4" />
//           <h3 className="text-lg font-bold text-slate-800 mb-2">Receipt Unavailable</h3>
//           <p className="text-sm text-slate-500">{error}</p>
//         </div>
//       </div>
//     );
//   }

//   const isAdvance = type?.toUpperCase() === 'ADVANCE';
//   const isPaid = data.header?.status === 'PAID' || data.header?.status === 'SUCCESS';

//   return (
//     <div className="fixed inset-0 overflow-y-auto bg-slate-200 pt-24 pb-20 px-4 print:static print:bg-white print:p-0 font-sans selection:bg-blue-100">
      
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
//       <div className="fixed top-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 md:px-12 print:hidden z-50 shadow-sm">
//         <div className="flex items-center gap-3">
//           <Activity size={20} style={{ color: BRAND }} />
//           <div>
//             <h2 className="font-bold text-slate-800 text-sm leading-tight">
//               {isAdvance ? 'Advance Receipt' : 'Invoice Receipt'} Preview
//             </h2>
//             <p className="text-[11px] text-slate-500 font-mono">{data.header?.reference}</p>
//           </div>
//         </div>
//         <button
//           onClick={() => window.print()}
//           className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all shadow-md hover:shadow-lg active:scale-95"
//           style={{ backgroundColor: BRAND }}
//         >
//           <Printer size={16} /> Print Receipt
//         </button>
//       </div>

//       {/* ── A4 Print Container ── */}
//       <div className="w-full max-w-[210mm] min-h-[297mm] bg-white mx-auto shadow-2xl rounded-sm print:shadow-none print:rounded-none print:max-w-none print:w-full border border-slate-300 print:border-none relative flex flex-col">
        
//         {/* ── Brand Header ── */}
//         <div className="flex justify-between items-start border-b-2 p-6" style={{ backgroundColor: BRAND }}>
//           <div className="flex items-center gap-4">
//             <img src="/assets/logo-nobg.png" alt="Hospital Logo" className="w-[10em] h-auto object-contain" />
//           </div>
//           <div className="text-right">
//             <h2 className="text-2xl font-black uppercase tracking-wider text-white">
//               {isAdvance ? 'Advance Receipt' : 'Receipt / Invoice'}
//             </h2>
//             <p className="text-xs font-bold text-white mt-1">Ref: <span className="font-mono text-white">{data.header?.reference || 'N/A'}</span></p>
//             <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 uppercase">
//               {isPaid ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Clock size={12} className="text-amber-500" />}
//               {data.header?.status || 'UNKNOWN'}
//             </div>
//           </div>
//         </div>

//         {/* ── Body Sections ── */}
//         <div className="px-10 py-8 flex-1">
          
//           {/* ── Patient & Receipt Information Grid (Lab Style) ── */}
//           <div className="grid grid-cols-2 gap-6 mb-8">
//             <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 break-inside-avoid">
//               <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Patient Details</h3>
//               <div className="space-y-1">
//                 <InfoRow label="Patient Name" value={data.patient_details?.full_name} />
//                 <InfoRow label="MRN (File No.)" value={data.patient_details?.mrn} />
//                 <InfoRow label="Age / Gender" value={`${fmt(data.patient_details?.age)} / ${fmt(data.patient_details?.gender)}`} />
//                 <InfoRow label="Date of Birth" value={formatDate(data.patient_details?.dob).split(',')[0]} />
//                 <InfoRow label="Contact Phone" value={data.patient_details?.phone} />
//                 <InfoRow label="Email" value={data.patient_details?.email} />
//               </div>
//             </div>

//             <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 break-inside-avoid">
//               <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Receipt Details</h3>
//               <div className="space-y-1">
//                 <InfoRow label="Receipt/Invoice No." value={data.header?.reference} />
//                 <InfoRow label="Transaction Date" value={formatDate(data.header?.created_at)} />
//                 <InfoRow label="Encounter Number" value={data.encounter?.number} />
//                 <InfoRow label="Doctor" value={data.doctor} />
//                 <InfoRow label="Payer Name" value={data.payer?.name} />
//                 <InfoRow label="Payer Type" value={data.payer?.type} />
//               </div>
//             </div>
//           </div>

//           {/* ── Section C: Particulars (Grouped) ── */}
//           {!isAdvance && data.items_grouped && Object.keys(data.items_grouped).length > 0 && (
//             <div className="mb-8">
//               <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Particulars</h3>
              
//               {Object.entries(data.items_grouped).map(([groupKey, group]: [string, any]) => (
//                 <div key={groupKey} className="mb-4 break-inside-avoid rounded-lg overflow-hidden border border-slate-200">
//                   <div className="px-4 py-2 flex items-center justify-between border-b" style={{ backgroundColor: `${BRAND}15`, borderColor: `${BRAND}30` }}>
//                     <h4 className="font-bold uppercase tracking-widest text-xs" style={{ color: BRAND }}>
//                       {groupKey.replace(/_/g, ' ')}
//                     </h4>
//                     <span className="font-black text-xs" style={{ color: BRAND }}>
//                       {formatCurrency(group.dept_total)}
//                     </span>
//                   </div>
//                   <table className="w-full text-left text-xs">
//                     <thead>
//                       <tr className="bg-slate-50 border-b border-slate-200">
//                         <th className="py-2 px-3 font-semibold text-slate-600 w-8">#</th>
//                         <th className="py-2 px-3 font-semibold text-slate-600">Description</th>
//                         <th className="py-2 px-3 font-semibold text-slate-600 w-32">Date & Time</th>
//                         <th className="py-2 px-3 font-semibold text-slate-600 text-center w-12">Qty</th>
//                         <th className="py-2 px-3 font-semibold text-slate-600 text-right w-20">Rate</th>
//                         <th className="py-2 px-3 font-semibold text-slate-600 text-right w-20">Disc.</th>
//                         <th className="py-2 px-3 font-semibold text-slate-600 text-right w-24">Net Total</th>
//                       </tr>
//                     </thead>
//                     <tbody className="divide-y divide-slate-100">
//                       {(group.items || [])
//                         .flatMap((item: any) => {
//                           if (item.drugs && Array.isArray(item.drugs) && item.drugs.length > 0) {
//                             return item.drugs.map((drug: any, dIdx: number) => ({
//                               id: `${item.id}-drug-${dIdx}`,
//                               item_name: `${drug.drug_name} (${drug.dosage}${drug.frequency ? ` - ${drug.frequency}` : ""})`,
//                               date: drug.date ?? item.date,
//                               rate: drug.rate,
//                               nos: drug.qty,
//                               total: drug.total,
//                               fee_breakdown: null,
//                               parent_discount: item.discount_applied,
//                             }));
//                           }
//                           if (item.details && Array.isArray(item.details) && item.details.length > 0) {
//                             return item.details.map((detail: any, dIdx: number) => ({
//                               id: `${item.id}-detail-${dIdx}`,
//                               item_name: detail.name,
//                               date: item.date,
//                               rate: detail.rate,
//                               nos: detail.qty,
//                               total: detail.total,
//                               fee_breakdown: null,
//                               parent_discount: item.discount_applied,
//                             }));
//                           }
//                           return [{ ...item, parent_discount: item.discount_applied }];
//                         })
//                         .map((row: any, idx: number) => (
//                           <React.Fragment key={row.id || idx}>
//                             <tr className="hover:bg-slate-50/80 transition-colors">
//                               <td className="py-2.5 px-3 text-slate-500">{idx + 1}</td>
//                               <td className="py-2.5 px-3 font-medium text-slate-800">{row.item_name}</td>
//                               <td className="py-2.5 px-3 text-[10px] text-slate-500 whitespace-nowrap">
//                                 {formatDate(row.date)}
//                               </td>
//                               <td className="py-2.5 px-3 text-slate-600 text-center">{row.nos}</td>
//                               <td className="py-2.5 px-3 text-slate-600 text-right">{formatCurrency(row.rate)}</td>
//                               <td className="py-2.5 px-3 text-right">
//                                 {row.parent_discount && row.parent_discount.amount > 0 ? (
//                                   <div className="flex flex-col items-end leading-tight">
//                                     <span className="font-semibold text-slate-700">-{formatCurrency(row.parent_discount.amount)}</span>
//                                     <span className="text-[9px] text-slate-400">
//                                       {row.parent_discount.type === 'PERCENTAGE' ? `${row.parent_discount.value}%` : 'FLAT'}
//                                     </span>
//                                   </div>
//                                 ) : (
//                                   <span className="text-slate-300">—</span>
//                                 )}
//                               </td>
//                               <td className="py-2.5 px-3 font-bold text-right text-slate-900">
//                                 {row.parent_discount && row.parent_discount.amount > 0 ? (
//                                   <div className="flex flex-col items-end leading-tight">
//                                     <span className="line-through text-slate-400 font-normal text-[10px]">
//                                       {formatCurrency(row.gross_total ?? row.total)}
//                                     </span>
//                                     <span>{formatCurrency(row.net_total ?? (row.total - row.parent_discount.amount))}</span>
//                                   </div>
//                                 ) : (
//                                   formatCurrency(row.total)
//                                 )}
//                               </td>
//                             </tr>
//                             {row.fee_breakdown && row.fee_breakdown.length > 0 && (
//                               <tr className="bg-slate-50/30">
//                                 <td></td>
//                                 <td colSpan={6} className="px-3 py-1">
//                                   <div className="pl-3 border-l-2 ml-1 my-1" style={{ borderColor: `${BRAND}30` }}>
//                                     <table className="w-full text-[10px]">
//                                       <tbody>
//                                         {row.fee_breakdown.map((fee: any, fIdx: number) => (
//                                           <tr key={fIdx}>
//                                             <td className="py-0.5 text-slate-600">
//                                               <span className="font-medium text-slate-700">{fee.component_name}</span>{' '}
//                                               <span className="text-slate-400">({fee.component_type.replace(/_/g, ' ')})</span>
//                                             </td>
//                                             <td className="py-0.5 text-right text-slate-600">{formatCurrency(fee.amount)}</td>
//                                           </tr>
//                                         ))}
//                                       </tbody>
//                                     </table>
//                                   </div>
//                                 </td>
//                               </tr>
//                             )}
//                           </React.Fragment>
//                         ))}
//                     </tbody>
//                   </table>
//                 </div>
//               ))}
//             </div>
//           )}

//           {/* ── Fallback Section C: Particulars (Ungrouped) ── */}
//           {!isAdvance && !data.items_grouped && data.items && data.items.length > 0 && (
//             <div className="mb-8">
//               <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Particulars</h3>
//               <div className="border border-slate-200 rounded-lg overflow-hidden">
//                 <table className="w-full text-left text-xs">
//                   <thead>
//                     <tr className="bg-slate-50 border-b border-slate-200">
//                       <th className="py-2.5 px-4 font-semibold text-slate-600">Description</th>
//                       <th className="py-2.5 px-4 font-semibold text-slate-600">Date & Time</th>
//                       <th className="py-2.5 px-4 font-semibold text-slate-600 text-center w-16">Qty</th>
//                       <th className="py-2.5 px-4 font-semibold text-slate-600 text-right w-24">Unit Price</th>
//                       <th className="py-2.5 px-4 font-semibold text-slate-600 text-right w-28">Amount</th>
//                     </tr>
//                   </thead>
//                   <tbody className="divide-y divide-slate-100">
//                     {data.items.map((item: any, idx: number) => (
//                       <tr key={idx} className="hover:bg-slate-50/80 transition-colors break-inside-avoid">
//                         <td className="py-3 px-4 font-medium text-slate-800">
//                           <div>{item.display_name || item.description || item.service_name || item.item_name || item.drug_name}</div>
//                           <div className="text-[10px] text-slate-500 mt-1 font-normal space-y-0.5">
//                             {item.drug_code && (<div><span className="font-medium text-slate-600">Drug Code:</span> {item.drug_code}</div>)}
//                             {item.item_code && (<div><span className="font-medium text-slate-600">Item Code:</span> {item.item_code}</div>)}
//                             {item.dosage && (<div><span className="font-medium text-slate-600">Dosage:</span> {item.dosage}</div>)}
//                             {item.dispensing_dept && (<div><span className="font-medium text-slate-600">Department:</span> {item.dispensing_dept}</div>)}
//                           </div>
//                         </td>
//                         <td className="py-3 px-4 text-[10px] text-slate-500 whitespace-nowrap">
//                           {formatDate(item.ordered_at || item.date)}
//                         </td>
//                         <td className="py-3 px-4 text-slate-600 text-center">{parseFloat(item.quantity).toFixed(1)}</td>
//                         <td className="py-3 px-4 text-slate-600 text-right">{formatCurrency(item.unit_price)}</td>
//                         <td className="py-3 px-4 font-bold text-slate-900 text-right">{formatCurrency(item.line_total)}</td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             </div>
//           )}

//           {/* ── Section D: Financial Position (Right-Aligned Grid) ── */}
//           {data.financial_summary && (
//             <div className="flex justify-end mb-4 break-inside-avoid">
//               <div className="w-3/5 min-w-[320px]">
//                 <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1 text-right">Financial Position</h3>
//                 <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                  
//                   {/* Regular Metrics */}
//                   <div>
//                     <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Gross Amount</p>
//                     <p className="text-sm font-black text-slate-800">{formatCurrency(data.financial_summary.gross_amount)}</p>
//                   </div>
//                   <div>
//                     <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Discount</p>
//                     <p className="text-sm font-black text-red-600">- {formatCurrency(data.financial_summary.discount)}</p>
//                   </div>
//                   <div>
//                     <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Amount Paid</p>
//                     <p className="text-sm font-black text-emerald-600">{formatCurrency(data.financial_summary.amount_paid)}</p>
//                   </div>
//                   <div>
//                     <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Amount Refunded</p>
//                     <p className="text-sm font-black text-slate-800">{formatCurrency(data.financial_summary.amount_refunded)}</p>
//                   </div>

//                   {/* Highlight Metrics - Span full width of their container */}
//                   <div className="col-span-2 rounded-md p-3 border mt-1" style={{ backgroundColor: `${BRAND}10`, borderColor: `${BRAND}30` }}>
//                     <div className="flex justify-between items-center">
//                       <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Net Amount</p>
//                       <p className="text-lg font-black" style={{ color: BRAND }}>{formatCurrency(data.financial_summary.net_amount)}</p>
//                     </div>
//                   </div>
//                   <div className="col-span-2 rounded-md p-3 shadow-sm" style={{ backgroundColor: BRAND }}>
//                     <div className="flex justify-between items-center">
//                       <p className="text-[10px] text-white/80 font-bold uppercase tracking-wider">Outstanding Balance</p>
//                       <p className="text-lg font-black text-white">{formatCurrency(data.financial_summary.outstanding)}</p>
//                     </div>
//                   </div>

//                 </div>
//               </div>
//             </div>
//           )}
//         </div>

//         {/* ── Signatures & Footer (Forced to bottom via mt-auto) ── */}
//         <div className="mt-auto px-10 pb-8 print:pb-12 break-inside-avoid">
          
//           {/* Signatures */}
//           <div className="grid grid-cols-2 gap-12 mb-8 pt-4">
//             <div className="text-center">
//               <div className="border-b border-slate-300 pb-2 mb-2"></div>
//               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cashier / Authorized Signatory</p>
//             </div>
//             <div className="text-center">
//               <div className="border-b border-slate-300 pb-2 mb-2"></div>
//               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Patient / Client Signature</p>
//             </div>
//           </div>

//           {/* Hospital Address and Document Meta */}
//           <div className="border-t-2 border-slate-200 pt-4 text-center">
//             <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-widest mb-1">Medbookie Limited</h4>
//             <p className="text-[10px] text-slate-500">
//               Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos
//             </p>
//             <p className="text-[10px] text-slate-500 mt-0.5">
//               +234 705 648 2776 &nbsp;|&nbsp; finance@Medbookiehospital.com
//             </p>
            
//             <div className="flex justify-between items-center text-[9px] text-slate-400 mt-4 px-4">
//               <p>Generated electronically on {formatDate(new Date().toISOString())}</p>
//               <p className="font-mono font-bold text-slate-500">Ref: {data.header?.reference}</p>
//             </div>
            
//             <p className="text-[8px] text-slate-300 text-center mt-2 uppercase tracking-widest">
//               Official Receipt • Thank you for your payment
//             </p>
//           </div>
//         </div>

//       </div>
//     </div>
//   );
// };

// export default ReceiptPrintTemplate;


// import React, { useEffect, useState } from 'react';
// import { useParams } from 'react-router-dom';
// import { billingService } from '../../../services/billing.service';
// import { Loader2, AlertTriangle, Printer, User, FileText } from 'lucide-react';

// const ReceiptPrintTemplate: React.FC = () => {
//   const { type, id } = useParams<{ type: string; id: string }>();
//   const [data, setData] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     const fetchData = async () => {
//       if (!type || !id) {
//         setError('Invalid receipt parameters');
//         setLoading(false);
//         return;
//       }
//       try {
//         const response = await billingService.getInvoiceDetails(
//           type as "INVOICE" | "ADVANCE",
//           parseInt(id),
//         );

//         if (response.status === "success" && response.data) {
//           setData(response.data);
//           setTimeout(() => window.print(), 1000);
//         } else {
//           setError('Receipt details not found.');
//         }
//       } catch (err: any) {
//         setError(err.message || 'Could not load receipt data.');
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchData();
//   }, [type, id]);

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

//   const formatDate = (dateString: string) => {
//     if (!dateString) return 'N/A';
//     const date = new Date(dateString);
//     return date.toLocaleDateString("en-NG", {
//       day: "2-digit",
//       month: "short",
//       year: "numeric",
//       hour: "2-digit",
//       minute: "2-digit"
//     });
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

//   const isAdvance = type?.toUpperCase() === 'ADVANCE';
//   const isPaid = data.header?.status === 'PAID' || data.header?.status === 'SUCCESS';

//   return (
//     <div
//       className="fixed inset-0 bg-slate-100 overflow-y-auto px-4 py-20 print:static print:bg-white print:p-0"
//       style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
//     >
//       <style>{`@page { size: A4; margin: 8mm; }`}</style>
//       <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-8 print:hidden z-[100] shadow-md">
//         <p className="font-bold text-sm">{isAdvance ? 'Advance Receipt' : 'Invoice Receipt'} Preview</p>
//         <button onClick={() => window.print()} className="bg-[#2d258a] hover:bg-brand-primary text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all">
//           <Printer size={16} /> Print Receipt
//         </button>
//       </div>

//       <div
//         className="w-[210mm] min-h-[297mm] bg-white shadow-2xl print:shadow-none print:m-0 print:border-none print:w-full border border-slate-200 mx-auto transform-gpu transition-all"
//         style={{ padding: '8mm 10mm' }}
//       >
//         {/* Header Block */}
//         <div className="w-full bg-[#3B309A] flex items-center" style={{ padding: '5mm 6mm', minHeight: '22mm' }}>
//           <div className="flex items-center justify-center border-r-[1.5px] border-[#4c3fbf]" style={{ width: '44mm', paddingRight: '5mm' }}>
//             <img src="/assets/login-bg.jpeg" alt="Medbookie Logo" style={{ width: '40mm', height: 'auto', objectFit: 'contain' }} />
//           </div>
//           <div className="flex flex-col justify-center" style={{ paddingLeft: '6mm' }}>
//             <h1 className="text-white font-extrabold leading-none tracking-tight" style={{ fontSize: '20pt', marginBottom: '3px' }}>
//               {isAdvance ? 'Advance Payment Receipt' : 'Payment Receipt / Invoice'}
//             </h1>
//             <p className="text-brand-active" style={{ fontSize: '7.5pt', lineHeight: 1.3 }}>Official financial record. Please retain for your records.</p>
//           </div>
//         </div>

//         {/* Address Bar */}
//         <div className="w-full text-center border-b border-slate-200" style={{ padding: '3px 0 4px' }}>
//           <p style={{ fontSize: '6.5pt', color: '#94a3b8' }}>Head Office: Medbookie Limited Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos, Nigeria &nbsp;•&nbsp; +234 705 648 2776 &nbsp;•&nbsp; info@Medbookiehospital.com</p>
//         </div>

//         {/* Status Banner */}
//         {/* <div className={`mb-4 p-4 rounded flex items-center justify-center gap-2 border ${isPaid ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
//             {isPaid ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
//             <span className="font-black tracking-widest uppercase text-sm">
//                 STATUS: {data.header?.status || 'UNKNOWN'}
//             </span>
//         </div> */}

//         {/* Sections A & B side by side — matches IPDBillingPrintTemplate.tsx layout */}
//         <div className="grid grid-cols-2 gap-x-5 mt-1">
//           {/* LEFT — Section A: Patient Information (4 rows, matches Section B height) */}
//           <div>
//             <SectionHeader char="A" title="PATIENT INFORMATION" />
//             <div className="grid grid-cols-4 gap-x-2">
//               <FormField label="PATIENT NAME" colSpan={4} value={data.patient_details?.full_name} />
//               <FormField label="MRN" colSpan={2} value={data.patient_details?.mrn} />
//               <FormField label="AGE" colSpan={2} value={data.patient_details?.age} />
//               <FormField label="GENDER" colSpan={2} value={data.patient_details?.gender} />
//               <FormField label="DOB" colSpan={2} value={data.patient_details?.dob || 'N/A'} />
//               <FormField label="CONTACT PHONE" colSpan={2} value={data.patient_details?.phone} />
//               <FormField label="EMAIL" colSpan={2} value={data.patient_details?.email || 'N/A'} />
//             </div>
//           </div>

//           {/* RIGHT — Section B: Receipt Details (4 rows, matches Section A height) */}
//           <div>
//             <SectionHeader char="B" title="RECEIPT DETAILS" />
//             <div className="grid grid-cols-4 gap-x-2">
//               <FormField label="RECEIPT/INVOICE NO." colSpan={2} value={data.header?.reference} />
//               <FormField label="TRANSACTION DATE" colSpan={2} value={formatDate(data.header?.created_at)} />
//               <FormField label="ENCOUNTER NUMBER" colSpan={2} value={data.encounter?.number || 'N/A'} />
//               <FormField label="DOCTOR" colSpan={2} value={data.doctor || 'N/A'} />
//               <FormField label="PAYER" colSpan={2} value={data.payer?.name} />
//               <FormField label="STATUS" colSpan={1} value={data.header?.status} />
//               <FormField label="ENCOUNTER TYPE" colSpan={1} value={data.encounter?.type || 'N/A'} />
//               <FormField label="PAYER TYPE" colSpan={2} value={data.payer?.type || 'N/A'} />
//               <FormField label="POLICY NUMBER" colSpan={2} value={data.payer?.policy_number || 'N/A'} />
//             </div>
//           </div>
//         </div>

//         {/* Line Items — dept-grouped provisional-bill style, matching IPDBillingPrintTemplate.tsx / InvoiceDetailsModal.tsx */}
//         {!isAdvance && data.items_grouped && Object.keys(data.items_grouped).length > 0 && (
//           <div>
//             <SectionHeader char="C" title="PARTICULARS" />
//             {Object.entries(data.items_grouped).map(([groupKey, group]: [string, any]) => (
//               <div key={groupKey} className="mb-4">
//                 <div className="bg-[#3B309A]/10 px-3 py-1.5 flex items-center justify-between border-b-2 border-[#3B309A] rounded-t">
//                   <h3 className="font-bold text-[#2d258a] uppercase tracking-widest text-[10px]">
//                     {groupKey.replace(/_/g, ' ')}
//                   </h3>
//                   <span className="font-black text-[#2d258a] text-xs">
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
//                     {(group.items || [])
//                       .flatMap((item: any) => {
//                         if (item.drugs && Array.isArray(item.drugs) && item.drugs.length > 0) {
//                           return item.drugs.map((drug: any, dIdx: number) => ({
//                             id: `${item.id}-drug-${dIdx}`,
//                             item_name: `${drug.drug_name} (${drug.dosage}${drug.frequency ? ` - ${drug.frequency}` : ""})`,
//                             date: drug.date ?? item.date,
//                             rate: drug.rate,
//                             nos: drug.qty,
//                             total: drug.total,
//                             fee_breakdown: null,
//                             parent_discount: item.discount_applied,
//                           }));
//                         }
//                         if (item.details && Array.isArray(item.details) && item.details.length > 0) {
//                           return item.details.map((detail: any, dIdx: number) => ({
//                             id: `${item.id}-detail-${dIdx}`,
//                             item_name: detail.name,
//                             date: item.date,
//                             rate: detail.rate,
//                             nos: detail.qty,
//                             total: detail.total,
//                             fee_breakdown: null,
//                             parent_discount: item.discount_applied,
//                           }));
//                         }
//                         return [{ ...item, parent_discount: item.discount_applied }];
//                       })
//                       .map((row: any, idx: number) => (
//                         <React.Fragment key={row.id || idx}>
//                           <tr className="even:bg-slate-50/40">
//                             <td className="py-1 px-2 text-slate-500" style={{ fontSize: '8pt' }}>{idx + 1}</td>
//                             <td className="py-1 px-2 font-bold text-slate-800" style={{ fontSize: '8pt' }}>{row.item_name}</td>
//                             <td className="py-1 px-2 text-slate-500 text-center" style={{ fontSize: '8pt' }}>
//                               {row.date ? new Date(row.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
//                             </td>
//                             <td className="py-1 px-2 text-slate-600 text-center" style={{ fontSize: '8pt' }}>{row.nos}</td>
//                             <td className="py-1 px-2 text-slate-600 text-right" style={{ fontSize: '8pt' }}>{formatCurrency(row.rate)}</td>
//                             <td className="py-1 px-2 text-right" style={{ fontSize: '8pt' }}>
//                               {row.parent_discount && row.parent_discount.amount > 0 ? (
//                                 <div className="flex flex-col items-end">
//                                   <span className="font-bold text-slate-700">-{formatCurrency(row.parent_discount.amount)}</span>
//                                   <span style={{ fontSize: '6.5pt' }} className="text-slate-500">
//                                     {row.parent_discount.type === 'PERCENTAGE' ? `${row.parent_discount.value}%` : 'FLAT'}
//                                   </span>
//                                 </div>
//                               ) : (
//                                 <span className="text-slate-300">—</span>
//                               )}
//                             </td>
//                             <td className="py-1 px-2 font-bold text-[#2d258a] text-right" style={{ fontSize: '8pt' }}>
//                               {row.parent_discount && row.parent_discount.amount > 0 ? (
//                                 <div className="flex flex-col items-end">
//                                   <span className="line-through text-slate-400 font-normal" style={{ fontSize: '7pt' }}>
//                                     {formatCurrency(row.gross_total ?? row.total)}
//                                   </span>
//                                   <span>{formatCurrency(row.net_total ?? (row.total - row.parent_discount.amount))}</span>
//                                 </div>
//                               ) : (
//                                 formatCurrency(row.total)
//                               )}
//                             </td>
//                           </tr>
//                           {row.fee_breakdown && row.fee_breakdown.length > 0 && (
//                             <tr className="bg-slate-50/20">
//                               <td></td>
//                               <td colSpan={6} className="px-3 py-1">
//                                 <div className="pl-3 border-l-2 border-[#3B309A]/30 ml-1">
//                                   <table className="w-full" style={{ fontSize: '7.5pt' }}>
//                                     <tbody>
//                                       {row.fee_breakdown.map((fee: any, fIdx: number) => (
//                                         <tr key={fIdx}>
//                                           <td className="py-0.5 text-slate-600">
//                                             <span className="font-bold text-slate-700">{fee.component_name}</span>{' '}
//                                             <span className="text-slate-400">({fee.component_type.replace(/_/g, ' ')})</span>
//                                           </td>
//                                           <td className="py-0.5 text-right text-slate-600">{formatCurrency(fee.amount)}</td>
//                                         </tr>
//                                       ))}
//                                     </tbody>
//                                   </table>
//                                 </div>
//                               </td>
//                             </tr>
//                           )}
//                         </React.Fragment>
//                       ))}
//                   </tbody>
//                 </table>
//               </div>
//             ))}
//           </div>
//         )}

//         {/* Fallback flat line items — only when the backend has not grouped items by department */}
//         {!isAdvance && !data.items_grouped && data.items && data.items.length > 0 && (
//           <div>
//             <SectionHeader char="C" title="PARTICULARS" />
//             <table className="w-full text-left text-sm border-x border-b border-slate-200">
//               <thead>
//                 <tr className="bg-slate-50 border-b border-slate-200">
//                   <th className="py-2.5 px-4 font-black text-slate-500 uppercase text-[9px] tracking-widest">DESCRIPTION</th>
//                   <th className="py-2.5 px-4 font-black text-slate-500 uppercase text-[9px] tracking-widest text-center w-16">QTY</th>
//                   <th className="py-2.5 px-4 font-black text-slate-500 uppercase text-[9px] tracking-widest text-right w-28">UNIT PRICE</th>
//                   <th className="py-2.5 px-4 font-black text-slate-500 uppercase text-[9px] tracking-widest text-right w-32">AMOUNT</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 {data.items.map((item: any, idx: number) => (
//                   <tr key={idx} className="even:bg-slate-50/50">
//                     <td className="py-2.5 px-4 text-xs font-bold text-slate-800">
//                       <div>{item.display_name || item.description || item.service_name || item.item_name || item.drug_name}</div>
//                       <div className="text-[9px] text-slate-500 mt-1 font-normal space-y-0.5">
//                         {item.drug_code && (
//                           <div>
//                             <span className="font-semibold text-slate-600">Drug Code:</span> {item.drug_code}
//                           </div>
//                         )}
//                         {item.item_code && (
//                           <div>
//                             <span className="font-semibold text-slate-600">Item Code:</span> {item.item_code}
//                           </div>
//                         )}
//                         {item.dosage && (
//                           <div>
//                             <span className="font-semibold text-slate-600">Dosage:</span> {item.dosage}
//                           </div>
//                         )}
//                         {item.ordered_at && (
//                           <div>
//                             <span className="font-semibold text-slate-600">Ordered:</span> {item.ordered_at}
//                           </div>
//                         )}
//                         {item.order_status && (
//                           <div>
//                             <span className="font-semibold text-slate-600">Status:</span> {item.order_status}
//                           </div>
//                         )}
//                         {item.dispensing_dept && (
//                           <div>
//                             <span className="font-semibold text-slate-600">Department:</span> {item.dispensing_dept}
//                           </div>
//                         )}
//                       </div>
//                     </td>
//                     <td className="py-2.5 px-4 text-xs text-slate-600 text-center">{parseFloat(item.quantity).toFixed(1)}</td>
//                     <td className="py-2.5 px-4 text-xs text-slate-600 text-right">{formatCurrency(item.unit_price)}</td>
//                     <td className="py-2.5 px-4 text-xs font-bold text-[#2d258a] text-right">{formatCurrency(item.line_total)}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}

//         {/* Section D: Financial Position — matches IPDBillingPrintTemplate.tsx layout, wired to financial_summary */}
//         {data.financial_summary && (
//           <div>
//             <SectionHeader char="D" title="FINANCIAL POSITION" />
//             <div
//               className="grid gap-x-2 gap-y-1.5 rounded border border-slate-200 bg-slate-50/40"
//               style={{ gridTemplateColumns: 'repeat(4, 1fr)', padding: '6px 8px 8px' }}
//             >
//               {/* Row 1 */}
//               <div className="col-span-1">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Gross Amount</p>
//                 <p style={{ fontSize: '9pt' }} className="font-black text-slate-800">{formatCurrency(data.financial_summary.gross_amount)}</p>
//               </div>
//               <div className="col-span-1">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Discount</p>
//                 <p style={{ fontSize: '9pt' }} className="font-black text-red-600">- {formatCurrency(data.financial_summary.discount)}</p>
//               </div>
//               <div className="col-span-1">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Amount Paid</p>
//                 <p style={{ fontSize: '9pt' }} className="font-black text-emerald-700">{formatCurrency(data.financial_summary.amount_paid)}</p>
//               </div>
//               <div className="col-span-1">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Amount Refunded</p>
//                 <p style={{ fontSize: '9pt' }} className="font-black text-slate-800">{formatCurrency(data.financial_summary.amount_refunded)}</p>
//               </div>

//               {/* Row 2 — highlights */}
//               <div className="col-span-2 bg-[#3B309A]/8 rounded p-1.5 border border-[#3B309A]/20">
//                 <p style={{ fontSize: '6.5pt' }} className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Net Amount</p>
//                 <p style={{ fontSize: '10pt' }} className="font-black text-[#3B309A]">{formatCurrency(data.financial_summary.net_amount)}</p>
//               </div>
//               <div className="col-span-2 bg-[#3B309A] rounded p-1.5">
//                 <p style={{ fontSize: '6.5pt' }} className="text-white/70 font-bold uppercase tracking-wider mb-0.5">Outstanding Balance</p>
//                 <p style={{ fontSize: '10pt' }} className="font-black text-white">{formatCurrency(data.financial_summary.outstanding)}</p>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Signatures */}
//         <div className="grid grid-cols-2 gap-12 mt-16 px-8">
//           <div className="text-center">
//             <div className="border-b border-slate-300 pb-2 mb-2"></div>
//             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cashier / Authorized Signatory</p>
//           </div>
//           <div className="text-center">
//             <div className="border-b border-slate-300 pb-2 mb-2"></div>
//             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Patient / Client Signature</p>
//           </div>
//         </div>

//         {/* Footer */}
//         <div className="mt-16 text-center border-t border-slate-200 pt-6">
//           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Official Receipt • Thank you for your payment</p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ReceiptPrintTemplate;



// import React, { useEffect, useState } from 'react';
// import { useParams } from 'react-router-dom';
// import { billingService } from '../../../services/billing.service';
// import { Loader2, AlertTriangle, Printer, User, FileText, CheckCircle2 } from 'lucide-react';

// const ReceiptPrintTemplate: React.FC = () => {
//   const { type, id } = useParams<{ type: string; id: string }>();
//   const [data, setData] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     const fetchData = async () => {
//       if (!type || !id) {
//         setError('Invalid receipt parameters');
//         setLoading(false);
//         return;
//       }
//       try {
//         const response = await billingService.getInvoiceDetails(
//           type as "INVOICE" | "ADVANCE",
//           parseInt(id),
//         );

//         if (response.status === "success" && response.data) {
//           setData(response.data);
//           setTimeout(() => window.print(), 1000);
//         } else {
//           setError('Receipt details not found.');
//         }
//       } catch (err: any) {
//         setError(err.message || 'Could not load receipt data.');
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchData();
//   }, [type, id]);

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

//   const formatDate = (dateString: string) => {
//     if (!dateString) return 'N/A';
//     const date = new Date(dateString);
//     return date.toLocaleDateString("en-NG", {
//       day: "2-digit",
//       month: "short",
//       year: "numeric",
//       hour: "2-digit",
//       minute: "2-digit"
//     });
//   };

//   const FormField = ({ label, value, colSpan = 1 }: { label: string; value?: string; colSpan?: number }) => (
//     <div className="mb-3" style={{ gridColumn: `span ${colSpan} / span ${colSpan}` }}>
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

//   const isAdvance = type?.toUpperCase() === 'ADVANCE';
//   const isPaid = data.header?.status === 'PAID' || data.header?.status === 'SUCCESS';

//   return (
//     <div
//       className="fixed inset-0 bg-slate-100 overflow-y-auto px-4 py-20 print:static print:bg-white print:p-0"
//       style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
//     >
//       <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-8 print:hidden z-[100] shadow-md">
//         <p className="font-bold text-sm">{isAdvance ? 'Advance Receipt' : 'Invoice Receipt'} Preview</p>
//         <button onClick={() => window.print()} className="bg-[#2d258a] hover:bg-brand-primary text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all">
//           <Printer size={16} /> Print Receipt
//         </button>
//       </div>

//       <div className="w-[210mm] min-h-[297mm] bg-white p-12 shadow-2xl print:shadow-none print:m-0 print:border-none border border-slate-200 mx-auto transform-gpu transition-all">
//         {/* Header Block */}
//         <div className="w-full bg-[#3B309A] flex items-center p-4 min-h-[28mm] mb-8 relative overflow-hidden">
//           <div className="w-[25%] flex items-center justify-center border-r-[1.5px] border-[#4c3fbf] pr-4 h-full relative z-10">
//             <img src="/assets/login-bg.jpeg" alt="Logo" className="w-[20mm] object-contain" />
//           </div>
//           <div className="w-[75%] pl-6 flex flex-col justify-center relative z-10">
//             <h1 className="text-white text-3xl font-extrabold leading-none tracking-tight mb-2">
//               {isAdvance ? 'Advance Payment Receipt' : 'Payment Receipt / Invoice'}
//             </h1>
//             <p className="text-brand-active text-[10px] leading-tight">Official financial record. Please retain for your records.</p>
//           </div>
//           {isPaid && (
//             <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
//               <CheckCircle2 size={120} className="text-emerald-400" />
//             </div>
//           )}
//         </div>

//         {/* Address Bar */}
//         <div className="w-full text-center py-2 border-b border-slate-200 mb-8">
//           <p className="text-[8px] text-slate-500 font-medium">Head Office: Medbookie Limited Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos, Nigeria Lagos State, Nigeria. &nbsp;•&nbsp; +234 705 648 2776 &nbsp;•&nbsp; info@Medbookiehospital.com</p>
//         </div>

//         {/* Status Banner */}
//         {/* <div className={`mb-4 p-4 rounded flex items-center justify-center gap-2 border ${isPaid ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
//             {isPaid ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
//             <span className="font-black tracking-widest uppercase text-sm">
//                 STATUS: {data.header?.status || 'UNKNOWN'}
//             </span>
//         </div> */}

//         {/* Patient & Clinical Section */}
//         <SectionHeader char="A" title="PATIENT INFORMATION" />
//         <div className="grid grid-cols-6 gap-x-4 mb-4">
//           <FormField label="PATIENT NAME" colSpan={3} value={data.patient_details?.full_name} />
//           <FormField label="MRN" colSpan={1} value={data.patient_details?.mrn} />
//           <FormField label="AGE" colSpan={1} value={data.patient_details?.age} />
//           <FormField label="GENDER" colSpan={1} value={data.patient_details?.gender} />
          
//           <FormField label="DOB" colSpan={2} value={data.patient_details?.dob || 'N/A'} />
//           <FormField label="CONTACT PHONE" colSpan={2} value={data.patient_details?.phone} />
//           <FormField label="EMAIL" colSpan={2} value={data.patient_details?.email || 'N/A'} />
//         </div>

//         {/* Receipt Details Section */}
//         <SectionHeader char="B" title="RECEIPT DETAILS" />
//         <div className="grid grid-cols-6 gap-x-4 mb-4">
//           <FormField label="RECEIPT/INVOICE NO." colSpan={2} value={data.header?.reference} />
//           <FormField label="TRANSACTION DATE" colSpan={2} value={formatDate(data.header?.created_at)} />
//           <FormField label="STATUS" colSpan={2} value={data.header?.status} />

//           <FormField label="ENCOUNTER NUMBER" colSpan={2} value={data.encounter?.number || 'N/A'} />
//           <FormField label="ENCOUNTER TYPE" colSpan={2} value={data.encounter?.type || 'N/A'} />
//           <FormField label="DOCTOR" colSpan={2} value={data.doctor || 'N/A'} />

//           <FormField label="PAYER" colSpan={2} value={data.payer?.name} />
//           <FormField label="PAYER TYPE" colSpan={2} value={data.payer?.type || 'N/A'} />
//           <FormField label="POLICY NUMBER" colSpan={2} value={data.payer?.policy_number || 'N/A'} />
//         </div>

//         {/* Line Items */}
//         {!isAdvance && data.items && data.items.length > 0 && (
//           <div>
//             <SectionHeader char="C" title="PARTICULARS" />
//             <table className="w-full text-left text-sm border-x border-b border-slate-200">
//               <thead>
//                 <tr className="bg-slate-50 border-b border-slate-200">
//                   <th className="py-2.5 px-4 font-black text-slate-500 uppercase text-[9px] tracking-widest">DESCRIPTION</th>
//                   <th className="py-2.5 px-4 font-black text-slate-500 uppercase text-[9px] tracking-widest text-center w-16">QTY</th>
//                   <th className="py-2.5 px-4 font-black text-slate-500 uppercase text-[9px] tracking-widest text-right w-28">UNIT PRICE</th>
//                   <th className="py-2.5 px-4 font-black text-slate-500 uppercase text-[9px] tracking-widest text-right w-32">AMOUNT</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 {data.items.map((item: any, idx: number) => (
//                   <tr key={idx} className="even:bg-slate-50/50">
//                     <td className="py-2.5 px-4 text-xs font-bold text-slate-800">
//                       <div>{item.display_name || item.description || item.service_name || item.item_name || item.drug_name}</div>
//                       <div className="text-[9px] text-slate-500 mt-1 font-normal space-y-0.5">
//                         {item.drug_code && (
//                           <div>
//                             <span className="font-semibold text-slate-600">Drug Code:</span> {item.drug_code}
//                           </div>
//                         )}
//                         {item.item_code && (
//                           <div>
//                             <span className="font-semibold text-slate-600">Item Code:</span> {item.item_code}
//                           </div>
//                         )}
//                         {item.dosage && (
//                           <div>
//                             <span className="font-semibold text-slate-600">Dosage:</span> {item.dosage}
//                           </div>
//                         )}
//                         {item.ordered_at && (
//                           <div>
//                             <span className="font-semibold text-slate-600">Ordered:</span> {item.ordered_at}
//                           </div>
//                         )}
//                         {item.order_status && (
//                           <div>
//                             <span className="font-semibold text-slate-600">Status:</span> {item.order_status}
//                           </div>
//                         )}
//                         {item.dispensing_dept && (
//                           <div>
//                             <span className="font-semibold text-slate-600">Department:</span> {item.dispensing_dept}
//                           </div>
//                         )}
//                       </div>
//                     </td>
//                     <td className="py-2.5 px-4 text-xs text-slate-600 text-center">{parseFloat(item.quantity).toFixed(1)}</td>
//                     <td className="py-2.5 px-4 text-xs text-slate-600 text-right">{formatCurrency(item.unit_price)}</td>
//                     <td className="py-2.5 px-4 text-xs font-bold text-[#2d258a] text-right">{formatCurrency(item.line_total)}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}

//         {/* Financial Summary */}
//         <div className="flex justify-end mt-6 border-t-2 border-slate-300 pt-4 mb-12">
//           <div className="w-80 border border-slate-200 rounded overflow-hidden">
//             <div className="p-4 bg-slate-50 space-y-3">
//               <div className="flex justify-between items-center">
//                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gross Amount</span>
//                 <span className="font-bold text-slate-800 text-sm">{formatCurrency(data.financial_summary?.gross_amount)}</span>
//               </div>
//               {parseFloat(data.financial_summary?.discount) > 0 && (
//                 <div className="flex justify-between items-center text-rose-600">
//                   <span className="text-[10px] font-bold uppercase tracking-widest">Discount</span>
//                   <span className="font-bold text-sm">-{formatCurrency(data.financial_summary?.discount)}</span>
//                 </div>
//               )}
//               <div className="flex justify-between items-center text-emerald-600">
//                 <span className="text-[10px] font-bold uppercase tracking-widest">Paid Amount</span>
//                 <span className="font-bold text-sm">{formatCurrency(data.financial_summary?.amount_paid ?? 0)}</span>
//               </div>
//             </div>
//             <div className="bg-[#3B309A] text-white p-4">
//               <div className="flex justify-between items-center mb-1">
//                 <span className="text-[10px] font-bold text-brand-active uppercase tracking-widest">Net Payable</span>
//                 <span className="font-black text-xl tracking-tight">{formatCurrency(data.financial_summary?.net_amount)}</span>
//               </div>
//             </div>
//             {parseFloat(data.financial_summary?.outstanding) > 0 && (
//               <div className="p-3 bg-rose-50 border-t border-rose-100 flex justify-between items-center text-rose-700">
//                 <span className="text-[10px] font-bold uppercase tracking-widest">Outstanding Balance</span>
//                 <span className="font-bold text-sm">{formatCurrency(data.financial_summary?.outstanding)}</span>
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Signatures */}
//         <div className="grid grid-cols-2 gap-12 mt-16 px-8">
//           <div className="text-center">
//             <div className="border-b border-slate-300 pb-2 mb-2"></div>
//             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cashier / Authorized Signatory</p>
//           </div>
//           <div className="text-center">
//             <div className="border-b border-slate-300 pb-2 mb-2"></div>
//             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Patient / Client Signature</p>
//           </div>
//         </div>

//         {/* Footer */}
//         <div className="mt-16 text-center border-t border-slate-200 pt-6">
//           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Official Receipt • Thank you for your payment</p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ReceiptPrintTemplate;
