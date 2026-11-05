import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { billingService } from '../services/billing.service';
import PrintTemplate from './PrintTemplate';
import { Loader2, AlertTriangle, Printer, CheckCircle2, Clock } from 'lucide-react';

const BillingPrintView: React.FC = () => {
  const { encounterNumber } = useParams<{ encounterNumber: string }>();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') as 'provisional' | 'receipt' || 'provisional';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!encounterNumber) return;
      try {
        const res = await billingService.getOPDOrderPreview(encounterNumber);
        const result = res.data?.data || res.data;

        if (result) {
          setData(result);
          setTimeout(() => {
            window.print();
          }, 1000);
        } else {
          setError('Billing details not found.');
        }
      } catch (err) {
        setError('Could not load billing details.');
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
          <p className="text-slate-500">{error || 'Data unavailable.'}</p>
        </div>
      </div>
    );
  }

  const isReceipt = type === 'receipt';
  const title = isReceipt ? 'Payment Receipt' : 'Provisional Invoice';
  const totalAmount = data.items?.reduce((sum: number, item: any) => sum + (parseFloat(item.unit_price) * (item.quantity || 1)), 0) || 0;

  return (
    <div className="bg-slate-100 h-screen w-full overflow-y-auto print:bg-white print:h-auto print:overflow-visible">
      <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-8 print:hidden z-50 shadow-md">
        <p className="font-bold text-sm">{title} Preview</p>
        <button onClick={() => window.print()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all">
          <Printer size={16} /> Print Now
        </button>
      </div>

      <div className="pt-20 pb-10 print:pt-0 print:pb-0">
        <PrintTemplate title={title} subtitle={`Encounter: ${encounterNumber}`}>
          <div className="space-y-8">
            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-8 border-b border-slate-200 pb-6">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Billed To</p>
                <p className="text-lg font-black text-slate-900">{data.patient_details?.full_name}</p>
                <p className="text-sm font-medium text-slate-600">MRN: {data.patient_details?.mrn}</p>
                <p className="text-xs text-slate-500 mt-1">{data.payer_details?.payer_name} ({data.payer_details?.category})</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</p>
                <p className="text-lg font-black text-slate-900">{new Date().toLocaleDateString()}</p>
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
                  {isReceipt ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Clock size={14} className="text-amber-600" />}
                  <span className={`text-xs font-bold uppercase ${isReceipt ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {isReceipt ? 'Paid' : 'Unpaid / Draft'}
                  </span>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="py-3 font-black text-slate-600 uppercase text-[10px] tracking-widest w-12">#</th>
                    <th className="py-3 font-black text-slate-600 uppercase text-[10px] tracking-widest">Service Description</th>
                    <th className="py-3 font-black text-slate-600 uppercase text-[10px] tracking-widest text-center w-20">Qty</th>
                    <th className="py-3 font-black text-slate-600 uppercase text-[10px] tracking-widest text-right w-32">Unit Price</th>
                    <th className="py-3 font-black text-slate-600 uppercase text-[10px] tracking-widest text-right w-32">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items?.map((item: any, idx: number) => (
                    <tr key={idx} className="even:bg-slate-50 print:even:bg-slate-50">
                      <td className="py-3 text-slate-500">{idx + 1}</td>
                      <td className="py-3 font-bold text-slate-800">{item.description}</td>
                      <td className="py-3 text-center text-slate-600">{item.quantity || 1}</td>
                      <td className="py-3 text-right text-slate-600">₦{parseFloat(item.unit_price).toLocaleString()}</td>
                      <td className="py-3 text-right font-bold text-slate-900">₦{(parseFloat(item.unit_price) * (item.quantity || 1)).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={4} className="py-4 text-right font-black text-slate-600 uppercase text-xs tracking-widest">Subtotal</td>
                    <td className="py-4 text-right font-bold text-slate-800">₦{totalAmount.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="py-2 text-right font-black text-slate-600 uppercase text-xs tracking-widest">Tax / VAT</td>
                    <td className="py-2 text-right font-bold text-slate-800">₦0.00</td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="py-4 text-right font-black text-[#3B309A] uppercase text-sm tracking-widest">Total Amount</td>
                    <td className="py-4 text-right font-black text-[#3B309A] text-xl">₦{totalAmount.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Footer Notes */}
            <div className="mt-8 pt-8 border-t border-slate-200 text-center">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Thank you for choosing Medbookie</p>
              <p className="text-[10px] text-slate-400">Please retain this document for your records.</p>
            </div>
          </div>
        </PrintTemplate>
      </div>
    </div>
  );
};

export default BillingPrintView;
