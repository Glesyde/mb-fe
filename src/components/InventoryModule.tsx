
import React, { useState } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  AlertTriangle, 
  ArrowDownToLine, 
  ClipboardList, 
  Filter, 
  MoreVertical, 
  FileText, 
  Calendar,
  Layers,
  CheckCircle2,
  X,
  Truck,
  ArrowRight
} from 'lucide-react';

interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category: 'Drug' | 'Consumable' | 'Equipment';
  batchNo: string;
  expiryDate: string;
  quantity: number;
  reorderLevel: number;
  unit: string;
}

const INITIAL_STOCK: InventoryItem[] = [
  { id: '1', code: 'MED-001', name: 'Paracetamol 500mg', category: 'Drug', batchNo: 'BN-8821', expiryDate: '2026-12-30', quantity: 450, reorderLevel: 100, unit: 'Tabs' },
  { id: '2', code: 'CON-042', name: 'Surgical Gloves (Size 7)', category: 'Consumable', batchNo: 'BN-9912', expiryDate: '2027-05-15', quantity: 45, reorderLevel: 50, unit: 'Pairs' },
  { id: '3', code: 'MED-112', name: 'Amoxicillin 500mg', category: 'Drug', batchNo: 'BN-4421', expiryDate: '2025-10-10', quantity: 120, reorderLevel: 80, unit: 'Caps' },
  { id: '4', code: 'CON-088', name: 'Intravenous Cannula 18G', category: 'Consumable', batchNo: 'BN-0012', expiryDate: '2025-08-20', quantity: 12, reorderLevel: 25, unit: 'Pcs' },
  { id: '5', code: 'EQU-005', name: 'Pulse Oximeter (Handheld)', category: 'Equipment', batchNo: 'EQ-1102', expiryDate: 'N/A', quantity: 8, reorderLevel: 2, unit: 'Pcs' },
];

const InventoryModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stock' | 'requisitions' | 'grn'>('stock');
  const [searchTerm, setSearchTerm] = useState('');
  const [showGRNModal, setShowGRNModal] = useState(false);
  const [showRequisitionModal, setShowRequisitionModal] = useState(false);

  const getStockStatus = (item: InventoryItem) => {
    if (item.quantity === 0) return { label: 'Out of Stock', color: 'bg-red-50 text-red-600 border-red-100', icon: AlertTriangle };
    if (item.quantity <= item.reorderLevel) return { label: 'Low Stock', color: 'bg-amber-50 text-amber-600 border-amber-100', icon: AlertTriangle };
    return { label: 'In Stock', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: CheckCircle2 };
  };

  const filteredStock = INITIAL_STOCK.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      {/* Module Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-slate-900 text-white rounded-xl">
              <Package size={24} />
            </div>
            Inventory & Store
          </h1>
          <p className="text-slate-500 font-medium">Manage medical supplies, stock tracking, and internal requisitions.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowRequisitionModal(true)}
            className="px-5 py-2.5 rounded-2xl font-bold text-sm border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <ClipboardList size={18} /> New Requisition
          </button>
          <button 
            onClick={() => setShowGRNModal(true)}
            className="px-5 py-2.5 rounded-2xl font-bold text-sm bg-brand-primary text-white hover:bg-brand-primary transition-all shadow-lg shadow-brand-active flex items-center gap-2"
          >
            <ArrowDownToLine size={18} /> Record GRN
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100/50 backdrop-blur rounded-[20px] w-fit">
        {[
          { id: 'stock', label: 'Stock Master', icon: Layers },
          { id: 'requisitions', label: 'Requisitions', icon: ClipboardList },
          { id: 'grn', label: 'Goods Received', icon: Truck },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`
              flex items-center gap-2 px-6 py-2.5 rounded-[16px] text-sm font-bold transition-all
              ${activeTab === tab.id 
                ? 'bg-white text-brand-primary shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'}
            `}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stock Master Table View */}
      {activeTab === 'stock' && (
        <div className="space-y-6">
          {/* Quick Filters */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search inventory by name, code or batch..."
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-brand-active0/10 outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <button className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all">
                <Filter size={16} /> Category
              </button>
              <button className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-red-600 bg-red-50 border border-red-100 rounded-2xl hover:bg-red-100 transition-all">
                <AlertTriangle size={16} /> Show Low Stock
              </button>
            </div>
          </div>

          {/* Stock Table */}
          <div className="bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Item Code</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Batch/Expiry</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">In Stock</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredStock.map((item) => {
                    const status = getStockStatus(item);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-5">
                          <span className="text-xs font-mono font-bold text-brand-primary bg-brand-active px-2 py-1 rounded-lg border border-brand-active">
                            {item.code}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-sm font-bold text-slate-800">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">UoM: {item.unit}</p>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-xs font-semibold text-slate-500">{item.category}</span>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-[10px] font-bold text-slate-700">{item.batchNo}</p>
                          <p className={`text-[10px] font-bold ${item.expiryDate !== 'N/A' && new Date(item.expiryDate) < new Date('2025-12-31') ? 'text-red-500' : 'text-slate-400'}`}>
                            {item.expiryDate}
                          </p>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <p className={`text-sm font-black ${item.quantity <= item.reorderLevel ? 'text-red-600' : 'text-slate-800'}`}>
                            {item.quantity}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400">Min: {item.reorderLevel}</p>
                        </td>
                        <td className="px-6 py-5">
                          <div className={`mx-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-bold uppercase tracking-wider w-fit ${status.color}`}>
                            <status.icon size={12} />
                            {status.label}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button className="p-2 text-slate-300 hover:text-brand-primary hover:bg-brand-active rounded-xl transition-all">
                            <MoreVertical size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Requisition Tab - Mock View */}
      {activeTab === 'requisitions' && (
        <div className="bg-white border border-slate-200 rounded-[40px] p-8 text-center py-20 animate-in fade-in zoom-in duration-300">
           <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <ClipboardList className="text-slate-300" size={40} />
           </div>
           <h3 className="text-xl font-bold text-slate-800">No Pending Requisitions</h3>
           <p className="text-slate-500 max-w-sm mx-auto mt-2">All unit requests have been fulfilled. Create a new requisition to request stock from the main pharmacy or medical store.</p>
           <button 
             onClick={() => setShowRequisitionModal(true)}
             className="mt-8 bg-brand-primary text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-brand-active hover:bg-brand-primary transition-all active:scale-95"
           >
             Create New Request
           </button>
        </div>
      )}

      {/* GRN Tab - Mock View */}
      {activeTab === 'grn' && (
        <div className="bg-white border border-slate-200 rounded-[40px] p-8 text-center py-20 animate-in fade-in zoom-in duration-300">
           <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Truck className="text-slate-300" size={40} />
           </div>
           <h3 className="text-xl font-bold text-slate-800">Goods Received Registry</h3>
           <p className="text-slate-500 max-w-sm mx-auto mt-2">Log incoming shipments from suppliers and vendors to update stock levels.</p>
           <button 
             onClick={() => setShowGRNModal(true)}
             className="mt-8 bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95"
           >
             Enter New Shipment
           </button>
        </div>
      )}

      {/* GRN Entry Modal */}
      {showGRNModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowGRNModal(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-brand-active/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-active text-brand-primary rounded-xl">
                  <ArrowDownToLine size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Goods Received Note (GRN)</h2>
                  <p className="text-xs text-slate-500 tracking-tight">Updating inventory levels from supplier delivery.</p>
                </div>
              </div>
              <button onClick={() => setShowGRNModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Supplier Name</label>
                  <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none">
                    <option>Global Pharma Ltd</option>
                    <option>MediPlus Supplies</option>
                    <option>Surgical Direct</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Invoice / Ref #</label>
                  <input type="text" placeholder="e.g. INV-99021" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none" />
                </div>
              </div>

              <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 space-y-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Layers size={14} /> Item Selection
                </h4>
                <div className="grid grid-cols-12 gap-3 items-end">
                   <div className="col-span-6 space-y-1.5">
                      <label className="text-[8px] font-bold text-slate-400 uppercase">Search Item</label>
                      <input type="text" placeholder="Item Name or Code..." className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none" />
                   </div>
                   <div className="col-span-3 space-y-1.5">
                      <label className="text-[8px] font-bold text-slate-400 uppercase">Qty Rec.</label>
                      <input type="number" placeholder="0" className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none" />
                   </div>
                   <div className="col-span-3">
                      <button className="w-full bg-slate-800 text-white py-2 rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors">Add</button>
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Batch Number</label>
                    <input type="text" placeholder="BN-XXXX" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none" />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expiry Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input type="date" className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none" />
                    </div>
                 </div>
              </div>
            </div>

            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button onClick={() => setShowGRNModal(false)} className="px-6 py-2.5 text-sm font-bold text-slate-500">Cancel</button>
              <button className="bg-brand-primary text-white px-8 py-2.5 rounded-xl font-bold hover:bg-brand-primary shadow-md transition-all flex items-center gap-2">
                <CheckCircle2 size={18} /> Finalize GRN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Requisition Modal */}
      {showRequisitionModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowRequisitionModal(false)} />
          <div className="relative bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-indigo-50/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight">Internal Stock Request</h2>
                  <p className="text-xs text-indigo-600 font-bold uppercase tracking-widest">Unit Requisition</p>
                </div>
              </div>
              <button onClick={() => setShowRequisitionModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Requesting Department</label>
                <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none">
                  <option>Main Theatre</option>
                  <option>Emergency (ED)</option>
                  <option>Ward A</option>
                  <option>Outpatient Clinic</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Item to Request</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input type="text" placeholder="Search item catalog..." className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quantity Needed</label>
                  <input type="number" placeholder="0" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Urgency</label>
                  <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none">
                    <option>Routine</option>
                    <option>Urgent</option>
                    <option>Critical / Emergency</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Justification / Remarks</label>
                <textarea rows={2} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none resize-none" placeholder="Reason for requisition..."></textarea>
              </div>
            </div>

            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button onClick={() => setShowRequisitionModal(false)} className="px-6 py-2.5 text-sm font-bold text-slate-500">Discard</button>
              <button className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-indigo-700 shadow-md transition-all flex items-center gap-2">
                <Plus size={18} /> Submit Requisition
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryModule;
