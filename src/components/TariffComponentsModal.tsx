import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Loader2, Layers, AlertCircle } from "lucide-react";
import { billingService } from "../services/billing.service";
import { useNotification } from "../context/NotificationContext";

const COMPONENT_TYPES = [
  "SURGERY_FEE", "ANESTHETIST_FEE", "ANESTHESIA", "OPERATION_THEATRE",
  "IMPLANT", "CONSUMABLE", "ICU", "ASSISTANT_SURGEON", "OTHER"
];

interface Props {
  tariff: any;
  onClose: () => void;
}

const TariffComponentsModal: React.FC<Props> = ({ tariff, onClose }) => {
  const { notify } = useNotification();
  const [components, setComponents] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newComponent, setNewComponent] = useState({
    component_type: "SURGERY_FEE",
    component_name: "",
    amount: "",
    is_mandatory: 1
  });

  const fetchComponents = async () => {
    setLoading(true);
    try {
      const data = await billingService.getTariffComponents(tariff.id);
      setComponents(data.components || []);
      setSummary(data.summary || {});
    } catch (err) {
      notify("Failed to load components", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComponents();
  }, [tariff.id]);

  const handleAddComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComponent.component_name || !newComponent.amount) {
      return notify("Name and amount are required", "error");
    }

    setIsSubmitting(true);
    try {
      await billingService.addTariffComponents(tariff.id, [{
        ...newComponent,
        amount: parseFloat(newComponent.amount)
      }]);
      notify("Component added successfully", "success");
      setNewComponent({ component_type: "SURGERY_FEE", component_name: "", amount: "", is_mandatory: 1 });
      fetchComponents();
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to add component", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (componentId: number) => {
    if (!confirm("Remove this component?")) return;
    try {
      await billingService.deleteTariffComponent(componentId);
      notify("Component removed", "success");
      fetchComponents();
    } catch (err) {
      notify("Failed to remove component", "error");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 tracking-tight">Tariff Breakdown</h2>
              <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">{tariff.billable_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel: Form */}
          <div className="w-1/3 bg-slate-50 border-r border-slate-100 p-6 flex flex-col gap-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Add New Component</h3>
            <form onSubmit={handleAddComponent} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Type</label>
                <select 
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none"
                  value={newComponent.component_type}
                  onChange={e => setNewComponent({...newComponent, component_type: e.target.value})}
                >
                  {COMPONENT_TYPES.map(type => (
                    <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Name / Description</label>
                <input 
                  type="text" 
                  placeholder="e.g. Lead Surgeon Fee"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none"
                  value={newComponent.component_name}
                  onChange={e => setNewComponent({...newComponent, component_name: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Amount (₦)</label>
                <input 
                  type="number" 
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none"
                  value={newComponent.amount}
                  onChange={e => setNewComponent({...newComponent, amount: e.target.value})}
                />
              </div>
              <label className="flex items-center gap-2 px-1 cursor-pointer mt-2">
                <input 
                  type="checkbox" 
                  checked={newComponent.is_mandatory === 1}
                  onChange={e => setNewComponent({...newComponent, is_mandatory: e.target.checked ? 1 : 0})}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-bold text-slate-700">Mandatory inclusion in billing</span>
              </label>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full mt-4 bg-indigo-600 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Add Component
              </button>
            </form>

            <div className="mt-auto bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
               <div className="flex justify-between items-center mb-1">
                 <span className="text-xs font-bold text-slate-500">Base Price:</span>
                 <span className="text-sm font-black">₦{parseFloat(tariff.unit_price).toLocaleString()}</span>
               </div>
               <div className="flex justify-between items-center mb-1">
                 <span className="text-xs font-bold text-slate-500">Components (Mandatory):</span>
                 <span className="text-sm font-black text-indigo-600">₦{(summary.total_mandatory || 0).toLocaleString()}</span>
               </div>
               {summary.total_mandatory !== parseFloat(tariff.unit_price) && (
                 <div className="flex items-start gap-2 mt-3 p-2 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-bold">
                   <AlertCircle size={14} className="shrink-0 mt-0.5" />
                   Warning: The sum of mandatory components does not equal the base unit price of the tariff.
                 </div>
               )}
            </div>
          </div>

          {/* Right Panel: List */}
          <div className="w-2/3 p-6 overflow-y-auto bg-white">
            {loading ? (
               <div className="flex justify-center items-center h-full">
                 <Loader2 className="animate-spin text-slate-300" size={32} />
               </div>
            ) : components.length === 0 ? (
               <div className="flex flex-col justify-center items-center h-full opacity-40">
                 <Layers size={48} className="text-slate-300 mb-4" />
                 <p className="text-xs font-black uppercase tracking-widest text-slate-400">No components configured</p>
               </div>
            ) : (
              <div className="space-y-3">
                {components.map((c: any) => (
                  <div key={c.id} className="group flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:border-indigo-100 hover:bg-indigo-50/30 transition-all">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                          {c.component_type.replace(/_/g, ' ')}
                        </span>
                        {!c.is_mandatory && (
                           <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-amber-100 text-amber-600">
                             Optional
                           </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-slate-800">{c.component_name}</p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-black text-slate-800">
                        ₦{parseFloat(c.amount).toLocaleString()}
                      </span>
                      <button 
                        onClick={() => handleDelete(c.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TariffComponentsModal;