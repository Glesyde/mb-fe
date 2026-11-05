import React, { useState, useEffect } from 'react';
import { PackageMinus, Plus, Trash2, CheckCircle2, Loader2, AlertCircle, X } from 'lucide-react';
import SearchableDropdown from './SearchableDropdown';
import { useNotification } from '../context/NotificationContext';
import { inventoryService } from '../services/inventory.service';

// Add this to your inventory.service.ts:
// getAvailableBatches: (itemId: number, location: string) => axios.get(`/inventory/stock/available-batches?item_id=${itemId}&location=${location}`).then(res => res.data.data),

export default function InternalConsumptionForm({ onClose, preselectedDepartment }: { onClose: () => void, preselectedDepartment?: string }) {
  const { notify } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [departments, setDepartments] = useState<any[]>([]);
  const [consumables, setConsumables] = useState<any[]>([]);
  const [locations] = useState([
    { value: 'STORE', label: 'Main Store' },
    { value: 'PHARMACY', label: 'Pharmacy' },
    { value: 'WARD', label: 'Ward' },
    { value: 'THEATRE', label: 'Theatre' },
    { value: 'LAB', label: 'Laboratory' }
  ]);

  const [form, setForm] = useState({
    department_id: preselectedDepartment || '',
    notes: ''
  });
  
  // Notice we added availableBatches to the row state
  const [items, setItems] = useState<any[]>([
    { item_id: '', batch_id: '', source_location: 'STORE', quantity: 1, availableBatches: [], maxQuantity: 0 }
  ]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [deptData, itemData] = await Promise.all([
          inventoryService.getDepartments(),
          inventoryService.getConsumableItems() 
        ]);
        setDepartments(deptData.map((d: any) => ({ value: d.id, label: d.name })));
        setConsumables(itemData.map((i: any) => ({ value: i.id, label: `${i.name} (${i.brand || 'No Brand'})` })));
      } catch (err) {
        notify("Failed to load form data.", "error");
      }
    };
    loadData();
  }, []);

  // Fetch batches when Item or Location changes
  const fetchBatchesForRow = async (index: number, itemId: string, location: string) => {
    if (!itemId) return;
    
    try {
      const batches = await inventoryService.getAvailableBatches(Number(itemId), location);
      
      const updatedItems = [...items];
      updatedItems[index].availableBatches = batches.map((b: any) => ({
        value: b.batch_id,
        label: `Batch: ${b.batch_number} (Qty: ${b.available_quantity}) - Exp: ${b.expiry_date ? new Date(b.expiry_date).toLocaleDateString() : 'N/A'}`,
        available_quantity: b.available_quantity
      }));
      
      // Auto-select the first (earliest expiring) batch if available
      if (batches.length > 0) {
        updatedItems[index].batch_id = batches[0].batch_id;
        updatedItems[index].maxQuantity = batches[0].available_quantity;
        updatedItems[index].quantity = 1;
      } else {
        updatedItems[index].batch_id = '';
        updatedItems[index].maxQuantity = 0;
      }
      
      setItems(updatedItems);
    } catch (error) {
      notify("Failed to fetch batches.", "error");
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index][field] = value;

    // Trigger batch fetch if item or location changes
    if (field === 'item_id' || field === 'source_location') {
      fetchBatchesForRow(index, updated[index].item_id, updated[index].source_location);
    }
    
    // Update max quantity rule if they manually change the batch
    if (field === 'batch_id') {
      const selectedBatch = updated[index].availableBatches.find((b: any) => b.value === value);
      updated[index].maxQuantity = selectedBatch ? selectedBatch.available_quantity : 0;
      if (updated[index].quantity > updated[index].maxQuantity) {
        updated[index].quantity = updated[index].maxQuantity;
      }
    }

    setItems(updated);
  };

  const handleSubmit = async () => {
    if (!form.department_id || items.some(i => !i.item_id || !i.batch_id || i.quantity <= 0)) {
      notify("Please ensure all items have a selected batch and valid quantity.", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      await inventoryService.recordConsumption({
        ...form,
        items: items.map(i => ({ 
          item_id: i.item_id, 
          batch_id: i.batch_id, 
          source_location: i.source_location, 
          quantity: Number(i.quantity) 
        }))
      });
      notify("Internal consumption recorded successfully.", "success");
      onClose(); // Close modal on success
    } catch (err: any) {
      notify(err.message || "Failed to record consumption.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-[24px] shadow-xl p-6 max-w-4xl w-full mx-auto max-h-[90vh] overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl"><PackageMinus size={20} /></div>
          <div>
            <h2 className="text-lg font-black text-slate-800">Log Internal Consumption</h2>
            <p className="text-xs font-medium text-slate-500">Record items used by departments (non-billable).</p>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 bg-slate-50 p-2 rounded-xl"><X size={20}/></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Requesting Department *</label>
          <SearchableDropdown
            options={departments}
            value={form.department_id}
            onChange={(val: string) => setForm({...form, department_id: val})}
            placeholder="Search Department..."
            buttonClassName="p-3 bg-slate-50"
          />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Reason / Notes</label>
          <input 
            type="text" value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})}
            placeholder="e.g., Weekly office supplies"
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-400"
          />
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Consumed Items</h3>
          <button onClick={() => setItems([...items, { item_id: '', batch_id: '', source_location: 'STORE', quantity: 1, availableBatches: [], maxQuantity: 0 }])} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-indigo-100"><Plus size={14}/> Add Item</button>
        </div>
        
        <div className="space-y-4">
          {items.map((line, idx) => (
            <div key={idx} className="flex flex-col gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-200">
              
              {/* Row 1: Item and Location */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 w-full">
                  <SearchableDropdown
                    options={consumables}
                    value={line.item_id}
                    onChange={(val: string) => handleItemChange(idx, 'item_id', val)}
                    placeholder="-- Select Item --"
                    buttonClassName="p-2.5 text-xs bg-white"
                  />
                </div>
                <div className="w-full sm:w-48 shrink-0">
                  <SearchableDropdown
                    options={locations}
                    value={line.source_location}
                    onChange={(val: string) => handleItemChange(idx, 'source_location', val)}
                    buttonClassName="p-2.5 text-xs bg-white"
                  />
                </div>
              </div>

              {/* Row 2: Batch Selection and Quantity */}
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <div className="flex-1 w-full relative">
                  <SearchableDropdown
                    options={line.availableBatches}
                    value={line.batch_id}
                    onChange={(val: string) => handleItemChange(idx, 'batch_id', val)}
                    placeholder={line.item_id ? (line.availableBatches.length > 0 ? "-- Select Batch --" : "Out of Stock") : "Select item first"}
                    buttonClassName={`p-2.5 text-xs bg-white ${line.item_id && line.availableBatches.length === 0 ? 'border-red-300 text-red-500' : ''}`}
                  />
                  {line.item_id && line.availableBatches.length === 0 && (
                    <span className="absolute -bottom-4 left-1 text-[9px] font-bold text-red-500 flex items-center gap-1"><AlertCircle size={10}/> Out of stock in selected location</span>
                  )}
                </div>

                <div className="w-full sm:w-32 flex items-center gap-2">
                  <input 
                    type="number" 
                    min="1" 
                    max={line.maxQuantity || 1} 
                    placeholder="Qty" 
                    value={line.quantity} 
                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)} 
                    disabled={!line.batch_id}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none text-center disabled:opacity-50" 
                  />
                </div>

                <button onClick={() => setItems(items.filter((_, i) => i !== idx))} disabled={items.length === 1} className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30 shrink-0">
                  <Trash2 size={16} />
                </button>
              </div>

            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-100">
        <button 
          onClick={handleSubmit} disabled={isSubmitting}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-8 py-3.5 rounded-xl uppercase tracking-widest shadow-md disabled:opacity-50 transition-all flex items-center gap-2"
        >
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Submit Consumption
        </button>
      </div>
    </div>
  );
}