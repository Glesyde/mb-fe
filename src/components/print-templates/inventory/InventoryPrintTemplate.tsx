import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { inventoryService } from '../../../services/inventory.service';
import {
  Loader2,
  AlertTriangle,
  Printer,
  Box,
  Layers,
  History,
  TrendingUp,
} from 'lucide-react';

/* ─── tiny helpers ──────────────────────────────────────── */
const fmt = (v: string | number | null | undefined) => v || '—';
const fmtDateOnly = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleDateString('en-GB', { dateStyle: 'long' }) : '—';

/* ─── print-page atoms ──────────────────────────────────── */
const BRAND = '#3B309A';

const SectionHeader = ({ char, title, icon: Icon }: { char: string; title: string; icon?: React.ElementType }) => (
  <div className="flex items-center mb-4 mt-7 rounded-sm overflow-hidden" style={{ background: BRAND }}>
    <div className="w-10 h-7 flex items-center justify-center text-white font-extrabold text-xs border-r border-white/20 shrink-0">
      {char}
    </div>
    <div className="flex items-center gap-2 pl-3 text-white font-extrabold text-[11px] uppercase tracking-widest">
      {Icon && <Icon size={12} />}
      {title}
    </div>
  </div>
);

const Field = ({ label, value, wide }: { label: string; value?: string | number | null; wide?: boolean }) => (
  <div className={`mb-2.5 ${wide ? 'col-span-2' : ''}`}>
    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <div className="border border-slate-200 bg-slate-50 rounded px-2.5 py-1.5 min-h-[26px] flex items-center">
      <span className="text-[11px] font-bold text-slate-800 leading-tight">{fmt(value)}</span>
    </div>
  </div>
);

interface InventoryPrintTemplateProps {
  type: 'item' | 'batches';
}

const InventoryPrintTemplate: React.FC<InventoryPrintTemplateProps> = ({ type }) => {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        if (!id) throw new Error('No item ID provided');
        
        // Fetch item details
        const itemsList = await inventoryService.searchItems();
        const foundItem = itemsList.find((i: any) => i.id === Number(id));
        
        if (!foundItem) throw new Error('Item not found');
        setItem(foundItem);

        // Fetch batches if needed
        if (type === 'batches') {
          const allBatches = await inventoryService.searchBatches();
          const itemBatches = allBatches.filter((b: any) => b.item_id === Number(id));
          setBatches(itemBatches);
        }

        setTimeout(() => window.print(), 1200);
      } catch (err: any) {
        setError(err.message || 'Could not load inventory data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, type]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin mx-auto mb-4" style={{ color: BRAND }} />
          <p className="text-sm font-bold text-slate-500">Fetching inventory report…</p>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
          <AlertTriangle size={32} className="text-red-500 mx-auto mb-3" />
          <p className="text-slate-600 font-semibold">{error || 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-slate-200 overflow-y-auto py-20 px-4 print:static print:bg-white print:p-0"
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as any}
    >
      {/* ── Preview toolbar (hidden on print) ── */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-8 print:hidden z-[100] shadow-md">
        <div>
          <p className="font-black text-sm">
            {type === 'item' ? 'Item Master Print Preview' : 'Batch History Print Preview'}
          </p>
          <p className="text-[10px] text-slate-400 font-mono">{item.items_uhid}</p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all hover:opacity-90"
          style={{ background: BRAND }}
        >
          <Printer size={15} /> Print Report
        </button>
      </div>

      {/* ── A4 page ── */}
      <div className="w-[210mm] min-h-[297mm] bg-white mx-auto shadow-2xl print:shadow-none print:m-0 border border-slate-300 px-10 py-10 print:border-none">

        {/* ── Brand Header ── */}
        <div className="flex items-stretch mb-0 rounded-sm overflow-hidden" style={{ background: BRAND, minHeight: 64 }}>
          <div className="w-20 flex items-center justify-center border-r border-white/20 p-3 shrink-0">
            <img src="/assets/login-bg.jpeg" alt="Logo" className="w-12 object-contain" />
          </div>
          <div className="flex flex-col justify-center pl-5">
            <h1 className="text-white text-2xl font-black tracking-tight leading-none uppercase">
              {type === 'item' ? 'Item Master Report' : 'Batch History Report'}
            </h1>
            <p className="text-blue-200 text-[9px] mt-1 font-semibold">Official Inventory Records — Electronically Generated</p>
          </div>
          <div className="ml-auto px-6 flex flex-col justify-center text-right shrink-0">
            <p className="text-blue-200 text-[9px] font-bold uppercase tracking-widest">Item ID</p>
            <p className="text-white text-[11px] font-black font-mono">{item.items_uhid}</p>
            <p className="text-blue-300 text-[9px] mt-1">{fmtDateOnly(new Date().toISOString())}</p>
          </div>
        </div>

        {/* Address strip */}
        <div className="text-center py-2 border-b border-slate-200 mb-1">
          <p className="text-[8px] text-slate-500 font-medium">
            Medbookie Limited &nbsp;•&nbsp; Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos &nbsp;•&nbsp;
            +234 705 648 2776 &nbsp;•&nbsp; info@Medbookiehospital.com
          </p>
        </div>

        {/* ── Status Banner ── */}
        <div className={`flex items-center justify-between px-5 py-2.5 rounded-lg mb-3 mt-4 ${item.is_active ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-100 border border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <Box size={14} className={item.is_active ? 'text-emerald-600' : 'text-slate-600'} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${item.is_active ? 'text-emerald-800' : 'text-slate-800'}`}>
              Item Status: {item.is_active ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>
          {item.is_low_stock === 1 && (
             <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-100 text-rose-700 rounded border border-rose-200">
               <AlertTriangle size={11} />
               <span className="text-[9px] font-black uppercase tracking-widest">LOW STOCK ALERT</span>
             </div>
          )}
        </div>

        {/* ── A. Item Identity ── */}
        <SectionHeader char="A" title="Item Identity & Classification" icon={Layers} />
        <div className="grid grid-cols-4 gap-x-3">
          <div className="col-span-2"><Field label="Item Name" value={item.name} /></div>
          <Field label="UHID" value={item.items_uhid} />
          <Field label="Brand" value={item.brand} />

          <Field label="Category" value={item.category_code} />
          <Field label="Item Type" value={item.item_type} />
          <Field label="Formulation" value={item.formulation} />
          <Field label="Strength" value={item.strength} />

          <Field label="Unit / UOM" value={item.unit_name} />
          <Field label="Reorder Level" value={item.reorder_level} />
          <div className="col-span-2"><Field label="Registered Date" value={fmtDateOnly(item.created_at)} /></div>
        </div>

        {type === 'item' && (
          <>
            {/* ── B. Global Stock Distribution ── */}
            <SectionHeader char="B" title="Global Stock Distribution" icon={TrendingUp} />
            
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="col-span-4 rounded-lg border px-3 py-3 text-center bg-blue-50 border-blue-200">
                <p className="text-xl font-black leading-none text-blue-700">{item.global_stock}</p>
                <p className="text-[8px] font-bold text-blue-600 uppercase tracking-wider mt-1">Total Global Stock</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <Field label="Main Store" value={item.stock_store} />
              <Field label="Pharmacy" value={item.stock_pharmacy} />
              <Field label="Ward" value={item.stock_ward} />
              <Field label="Theatre" value={item.stock_theatre} />
              <Field label="Laboratory" value={item.stock_lab} />
              <Field label="Radiology" value={item.stock_radiology} />
              <Field label="ERD" value={item.stock_erd} />
              <Field label="OPD" value={item.stock_opd} />
              <Field label="ICU" value={item.stock_icu} />
              <Field label="HDU" value={item.stock_hdu} />
              <Field label="CSSD" value={item.stock_cssd} />
            </div>
          </>
        )}

        {type === 'batches' && (
          <>
            {/* ── B. Batch History ── */}
            <SectionHeader char="B" title="Batch History" icon={History} />
            <table className="w-full text-left border border-slate-200 rounded-lg overflow-hidden mb-4" style={{ fontSize: 10 }}>
              <thead>
                <tr style={{ background: BRAND }}>
                  {['Batch Number', 'Vendor', 'Expiry Date', 'Purchase Price', 'Markup', 'Selling Price', 'Status'].map((h) => (
                    <th key={h} className="py-2 px-2 text-white font-black text-[8px] uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.length === 0 && (
                  <tr><td colSpan={7} className="py-4 text-center text-xs text-slate-400 italic">No batches recorded for this item.</td></tr>
                )}
                {batches.map((batch: any, i: number) => {
                  return (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                      <td className="py-2 px-2 font-bold text-slate-800 font-mono text-[9px]">{fmt(batch.batch_number)}</td>
                      <td className="py-2 px-2 font-semibold text-slate-700">{fmt(batch.vendor_name)}</td>
                      <td className="py-2 px-2 text-slate-600 whitespace-nowrap">{fmtDateOnly(batch.expiry_date)}</td>
                      <td className="py-2 px-2 text-slate-600 font-mono">₦{fmt(batch.purchase_price)}</td>
                      <td className="py-2 px-2 text-slate-500 font-mono">{fmt(batch.markup_value)} {batch.markup_type === 'PERCENTAGE' ? '%' : ''}</td>
                      <td className="py-2 px-2 text-emerald-700 font-black font-mono">₦{fmt(batch.selling_price)}</td>
                      <td className="py-2 px-2">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-black border uppercase tracking-widest ${batch.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {batch.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            <div className="flex justify-end gap-6 mt-4 border-t border-slate-200 pt-3">
              <div className="text-right">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Batches</p>
                <p className="text-[14px] font-black text-slate-800">{batches.length}</p>
              </div>
            </div>
          </>
        )}

        {/* ── Footer ── */}
        <div className="mt-14 pt-4 border-t border-slate-200 text-center">
          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.15em]">
            Medbookie • {item.items_uhid} • Generated {new Date().toLocaleString('en-GB')}
          </p>
          <p className="text-[7px] text-slate-300 mt-0.5">This report is computer-generated from the Hospital Information System. No signature required if stamped.</p>
        </div>

      </div>
    </div>
  );
};

export default InventoryPrintTemplate;
