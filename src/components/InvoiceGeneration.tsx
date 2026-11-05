
import React, { useState } from 'react';
import { 
  FileText, 
  Layers, 
  Search, 
  Plus, 
  MoreVertical, 
  Clock, 
  User, 
  Building2, 
  ArrowRight,
  Printer,
  CheckSquare,
  CheckCircle2,
  LayoutGrid,
  Filter,
  Trash2,
  Activity,
  // Added missing ChevronRight import
  ChevronRight
} from 'lucide-react';

interface DraftInvoice {
  id: string;
  patient: string;
  type: 'Private' | 'HMO' | 'Corporate';
  total: number;
  itemsCount: number;
  lastEdited: string;
}

const MOCK_DRAFTS: DraftInvoice[] = [
  { id: 'DRF-991', patient: 'Alexander Thompson', type: 'Private', total: 12500, itemsCount: 4, lastEdited: '2 mins ago' },
  { id: 'DRF-985', patient: 'Sarah Miller', type: 'HMO', total: 45000, itemsCount: 8, lastEdited: '15 mins ago' },
  { id: 'DRF-972', patient: 'Lily Evans', type: 'Corporate', total: 120000, itemsCount: 2, lastEdited: '1 hour ago' },
  { id: 'DRF-950', patient: 'James Wilson', type: 'Private', total: 5000, itemsCount: 1, lastEdited: '2 hours ago' },
];

const InvoiceGeneration: React.FC = () => {
  const [drafts, setDrafts] = useState<DraftInvoice[]>(MOCK_DRAFTS);
  const [selectedDrafts, setSelectedDrafts] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const toggleSelect = (id: string) => {
    setSelectedDrafts(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBatchAction = () => {
    if (selectedDrafts.length === 0) return;
    alert(`Finalizing ${selectedDrafts.length} invoices for batch generation...`);
    setDrafts(drafts.filter(d => !selectedDrafts.includes(d.id)));
    setSelectedDrafts([]);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
             <div className="p-2 bg-brand-active text-brand-primary rounded-xl">
              <FileText size={28} />
            </div>
            Draft & Unfinalized Invoices
          </h1>
          <p className="text-slate-500 font-medium">Resume saved billing sessions or batch process corporate invoices.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-6 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
             <Layers size={20} /> Batch Corporate Claim
          </button>
          <button 
            disabled={selectedDrafts.length === 0}
            onClick={handleBatchAction}
            className="px-6 py-3 bg-brand-primary text-white rounded-2xl font-bold hover:bg-brand-primary transition-all shadow-lg shadow-brand-active disabled:opacity-30 disabled:shadow-none flex items-center gap-2"
          >
            <CheckCircle2 size={20} /> Finalize Selected ({selectedDrafts.length})
          </button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search drafts by patient or reference..."
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-brand-active0/10 outline-none transition-all font-bold"
          />
        </div>
        <div className="flex items-center gap-2">
           <button className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50">
            <Filter size={16} /> All Types
          </button>
          <div className="h-8 w-px bg-slate-200 mx-1" />
          <div className="bg-slate-50 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
             <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-400'}`}><LayoutGrid size={18}/></button>
             <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-400'}`}><Layers size={18}/></button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {drafts.length > 0 ? (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "space-y-3"}>
          {drafts.map(draft => (
            viewMode === 'grid' ? (
              <div 
                key={draft.id}
                onClick={() => toggleSelect(draft.id)}
                className={`group bg-white border-2 rounded-[32px] p-6 transition-all cursor-pointer relative overflow-hidden h-64 flex flex-col justify-between
                  ${selectedDrafts.includes(draft.id) ? 'border-brand-primary bg-brand-active/20 ring-4 ring-brand-active0/5' : 'border-slate-100 hover:border-brand-active'}
                `}
              >
                {selectedDrafts.includes(draft.id) && (
                   <div className="absolute top-4 right-4 bg-brand-primary text-white p-1 rounded-lg animate-in zoom-in-50"><CheckCircle2 size={16}/></div>
                )}
                <div className="space-y-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shadow-lg
                    ${draft.type === 'HMO' ? 'bg-indigo-500 shadow-indigo-100' : draft.type === 'Corporate' ? 'bg-slate-800 shadow-slate-200' : 'bg-brand-primary shadow-brand-active'}
                  `}>
                    {draft.patient.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 truncate">{draft.patient}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{draft.type} • {draft.itemsCount} Items</p>
                  </div>
                </div>
                <div className="mt-auto pt-6 border-t border-slate-50">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Draft Amount</p>
                  <p className="text-xl font-black text-slate-900">₦{draft.total.toLocaleString()}</p>
                  <div className="flex items-center justify-between mt-4">
                     <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1"><Clock size={12}/> {draft.lastEdited}</span>
                     <button className="text-[10px] font-black text-brand-primary flex items-center gap-1 hover:underline">Resume <ArrowRight size={14}/></button>
                  </div>
                </div>
              </div>
            ) : (
              <div 
                key={draft.id}
                onClick={() => toggleSelect(draft.id)}
                className={`bg-white border-2 p-4 rounded-[24px] flex items-center justify-between transition-all cursor-pointer group
                  ${selectedDrafts.includes(draft.id) ? 'border-brand-primary bg-brand-active/20' : 'border-slate-100 hover:border-brand-active'}
                `}
              >
                <div className="flex items-center gap-6">
                   <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all
                    ${selectedDrafts.includes(draft.id) ? 'bg-brand-primary border-brand-primary text-white' : 'border-slate-200'}
                   `}>
                     {selectedDrafts.includes(draft.id) && <CheckSquare size={14}/>}
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-brand-active group-hover:text-brand-primary transition-colors">
                        <User size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800">{draft.patient}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{draft.id} • {draft.type}</p>
                      </div>
                   </div>
                </div>
                
                <div className="flex items-center gap-12">
                   <div className="hidden lg:block text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Items</p>
                      <p className="text-sm font-black text-slate-700">{draft.itemsCount}</p>
                   </div>
                   <div className="text-right w-24">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</p>
                      <p className="text-sm font-black text-slate-900">₦{draft.total.toLocaleString()}</p>
                   </div>
                   <div className="flex items-center gap-2">
                      <button className="p-2 text-slate-300 hover:text-brand-primary hover:bg-brand-active rounded-xl transition-all" title="Resume Billing"><ArrowRight size={18}/></button>
                      <button className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Discard Draft"><Trash2 size={18}/></button>
                   </div>
                </div>
              </div>
            )
          ))}
        </div>
      ) : (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-[40px] p-20 text-center">
           <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-[32px] flex items-center justify-center mx-auto mb-6">
              <FileText size={40} />
           </div>
           <h3 className="text-xl font-black text-slate-800">Draft Folder Empty</h3>
           <p className="text-slate-500 max-w-xs mx-auto mt-2">Any billing session you save as draft will appear here for later finalization.</p>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-slate-900 rounded-[40px] p-8 text-white flex items-center justify-between shadow-xl shadow-slate-200">
         <div className="flex items-center gap-6">
            <div className="p-4 bg-brand-primary rounded-3xl shadow-lg shadow-brand-primary/50">
               <Activity size={32} />
            </div>
            <div>
               <h4 className="text-xl font-bold tracking-tight">Corporate Billing Efficiency</h4>
               <p className="text-slate-400 text-sm mt-1">Batch processing allows you to combine multiple drafts into a single consolidated invoice for HMO submissions.</p>
            </div>
         </div>
         <button className="hidden lg:flex items-center gap-2 text-sm font-black text-brand-primary hover:text-brand-primary uppercase tracking-widest">
            Claims Dashboard <ChevronRight size={18} />
         </button>
      </div>
    </div>
  );
};

export default InvoiceGeneration;
