
import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  CreditCard, 
  ShieldCheck, 
  Receipt, 
  Search, 
  Wallet, 
  Smartphone, 
  Printer, 
  CheckCircle2,
  X,
  User,
  Info,
  History
} from 'lucide-react';

interface BillingItem {
  id: string;
  service: string;
  category: 'Consultation' | 'Lab' | 'Drug' | 'Radiology' | 'Service';
  price: number;
  qty: number;
}

const SERVICE_CATALOG = [
  { name: 'General Consultation', price: 5000, category: 'Consultation' },
  { name: 'Specialist Consultation', price: 15000, category: 'Consultation' },
  { name: 'Full Blood Count (FBC)', price: 4500, category: 'Lab' },
  { name: 'Malaria Parasite Test', price: 2500, category: 'Lab' },
  { name: 'Paracetamol (Pack)', price: 1200, category: 'Drug' },
  { name: 'Amoxicillin 500mg', price: 3500, category: 'Drug' },
  { name: 'Chest X-Ray', price: 12000, category: 'Radiology' },
];

const BillingModule: React.FC = () => {
  const [items, setItems] = useState<BillingItem[]>([
    { id: '1', service: 'General Consultation', category: 'Consultation', price: 5000, qty: 1 }
  ]);
  const [applyHMO, setApplyHMO] = useState(false);
  const [hmoDetails, setHmoDetails] = useState({ provider: 'Reliance Health', authCode: '', copay: 10 });
  const [showReceipt, setShowReceipt] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');

  const subtotal = useMemo(() => items.reduce((acc, item) => acc + (item.price * item.qty), 0), [items]);
  const hmoCoverage = applyHMO ? (subtotal * (1 - hmoDetails.copay / 100)) : 0;
  const patientToPay = subtotal - hmoCoverage;

  const addItem = () => {
    const newItem: BillingItem = {
      id: Math.random().toString(36).substr(2, 9),
      service: '',
      category: 'Service',
      price: 0,
      qty: 1
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: keyof BillingItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        if (field === 'service') {
          const catalogItem = SERVICE_CATALOG.find(s => s.name === value);
          return { ...item, service: value, price: catalogItem?.price || 0, category: (catalogItem?.category as any) || 'Service' };
        }
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Billing & Invoicing</h1>
          <p className="text-slate-500">Generate patient invoices and manage insurance claims.</p>
        </div>
        <div className="flex items-center gap-2">
           <button className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-sm font-semibold">
            {/* Using History icon from lucide-react */}
            <History className="w-4 h-4" /> Billing History
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Billing Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Selection Card */}
          <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <User size={16} /> Patient Information
            </h2>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text"
                placeholder="Search patient by MRN, Name or Phone..."
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-brand-active0/20 text-slate-900 font-medium"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
              />
            </div>
            {patientSearch && (
               <div className="mt-4 p-4 bg-brand-active border border-brand-active rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-primary text-white rounded-full flex items-center justify-center font-bold">AJ</div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Alexander J. Thompson</p>
                    <p className="text-xs text-slate-500">MRN-2024-8842 • 08012345678</p>
                  </div>
                </div>
                <button className="text-brand-primary text-xs font-bold hover:underline">Change Patient</button>
              </div>
            )}
          </div>

          {/* Line Items Card */}
          <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Receipt size={16} /> Invoice Line Items
              </h2>
              <button 
                onClick={addItem}
                className="flex items-center gap-2 text-brand-primary bg-brand-active px-4 py-2 rounded-xl text-sm font-bold hover:bg-brand-active transition-colors"
              >
                <Plus size={18} /> Add Service
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Service/Item</th>
                    <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-24">Price (₦)</th>
                    <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-20">Qty</th>
                    <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-32">Total (₦)</th>
                    <th className="pb-4 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map((item) => (
                    <tr key={item.id} className="group">
                      <td className="py-4 pr-4">
                        <select 
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:bg-white focus:border-brand-primary outline-none transition-all font-medium"
                          value={item.service}
                          onChange={(e) => updateItem(item.id, 'service', e.target.value)}
                        >
                          <option value="">Select Service...</option>
                          {SERVICE_CATALOG.map(s => (
                            <option key={s.name} value={s.name}>{s.name} ({s.category})</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-4 pr-4">
                        <input 
                          type="number"
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:bg-white outline-none font-semibold"
                          value={item.price}
                          readOnly
                        />
                      </td>
                      <td className="py-4 pr-4">
                        <input 
                          type="number"
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:bg-white outline-none text-center"
                          value={item.qty}
                          onChange={(e) => updateItem(item.id, 'qty', parseInt(e.target.value) || 0)}
                        />
                      </td>
                      <td className="py-4 font-bold text-slate-800">
                        ₦{(item.price * item.qty).toLocaleString()}
                      </td>
                      <td className="py-4 text-right">
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {items.length === 0 && (
              <div className="py-12 text-center text-slate-400 italic text-sm">
                No items added. Click "Add Service" to start building the invoice.
              </div>
            )}
          </div>
        </div>

        {/* Payment & Summary Sidebar */}
        <div className="space-y-6">
          {/* HMO Section */}
          <div className={`bg-white p-6 rounded-[32px] border transition-all duration-300 ${applyHMO ? 'border-emerald-200 ring-4 ring-emerald-500/5' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className={applyHMO ? 'text-emerald-600' : 'text-slate-400'} />
                <h2 className="text-sm font-bold text-slate-800">HMO Coverage</h2>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={applyHMO}
                  onChange={() => setApplyHMO(!applyHMO)}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {applyHMO && (
              <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">HMO Provider</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none"
                    value={hmoDetails.provider}
                    onChange={(e) => setHmoDetails({...hmoDetails, provider: e.target.value})}
                  >
                    <option>Reliance Health</option>
                    <option>AXA Mansard</option>
                    <option>Hygeia HMO</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Auth Code</label>
                  <input 
                    type="text"
                    placeholder="Enter pre-auth code"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={hmoDetails.authCode}
                    onChange={(e) => setHmoDetails({...hmoDetails, authCode: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Patient Co-pay (%)</label>
                  <input 
                    type="number"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none"
                    value={hmoDetails.copay}
                    onChange={(e) => setHmoDetails({...hmoDetails, copay: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
            )}
            {!applyHMO && (
              <p className="text-xs text-slate-500 italic">Enable HMO toggle to apply insurance benefits to this invoice.</p>
            )}
          </div>

          {/* Summary Card */}
          <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-xl shadow-slate-200">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Payment Summary</h2>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Subtotal</span>
                <span className="font-semibold">₦{subtotal.toLocaleString()}</span>
              </div>
              {applyHMO && (
                <div className="flex justify-between text-sm text-emerald-400">
                  <span className="flex items-center gap-1.5"><ShieldCheck size={14} /> HMO Covered</span>
                  <span className="font-semibold">- ₦{hmoCoverage.toLocaleString()}</span>
                </div>
              )}
              <div className="pt-4 border-t border-slate-800 flex justify-between items-end">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase">Patient Payable</span>
                  <p className="text-3xl font-bold tracking-tight">₦{patientToPay.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Select Payment Method</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Wallet, label: 'Cash' },
                  { icon: CreditCard, label: 'Card/POS' },
                  { icon: Smartphone, label: 'Transfer' },
                ].map((method) => (
                  <button 
                    key={method.label}
                    className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-800 border border-slate-700 rounded-2xl hover:bg-slate-700 hover:border-brand-active0 transition-all group"
                  >
                    <method.icon size={18} className="text-slate-400 group-hover:text-brand-primary" />
                    <span className="text-[10px] font-bold">{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={() => setShowReceipt(true)}
              disabled={items.length === 0}
              className="w-full mt-8 bg-brand-primary hover:bg-brand-primary disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-primary/40 active:scale-95"
            >
              <CheckCircle2 size={20} /> Complete Payment
            </button>
          </div>

          <div className="bg-brand-active border border-brand-active p-6 rounded-[32px] flex items-start gap-3">
            <div className="text-brand-primary flex-shrink-0">
               <Info size={18} />
            </div>
            <p className="text-xs text-brand-primary leading-relaxed font-medium">
              Payment confirmation will trigger an automatic update to the Patient's EMR and release drug orders to the Pharmacy.
            </p>
          </div>
        </div>
      </div>

      {/* Receipt Preview Modal */}
      {showReceipt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowReceipt(false)} />
          <div className="relative bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 pb-4 flex justify-between items-start">
              <div className="bg-brand-primary p-2 rounded-xl">
                <ShieldCheck className="text-white w-6 h-6" />
              </div>
              <button onClick={() => setShowReceipt(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="px-8 text-center mb-8">
              <h3 className="text-xl font-black text-slate-800">Transaction Successful</h3>
              <p className="text-sm text-slate-500 mt-1">Receipt ID: RC-2025-09923</p>
            </div>

            <div className="mx-8 p-6 bg-slate-50 rounded-3xl border border-dashed border-slate-200 space-y-4">
              <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                <span>Description</span>
                <span>Amount</span>
              </div>
              <div className="space-y-2 border-t border-slate-200 pt-4">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-slate-600 font-medium">{item.service} (x{item.qty})</span>
                    <span className="text-slate-900 font-bold">₦{(item.price * item.qty).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="text-slate-800">₦{subtotal.toLocaleString()}</span>
                </div>
                {applyHMO && (
                   <div className="flex justify-between text-sm text-emerald-600">
                    <span>HMO Discount ({hmoDetails.provider})</span>
                    <span>-₦{hmoCoverage.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-black text-slate-900 pt-2 border-t border-slate-100">
                  <span>Total Paid</span>
                  <span>₦{patientToPay.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-3">
              <button className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-colors">
                <Printer size={20} /> Print Receipt
              </button>
              <button className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-colors">
                Email Copy to Patient
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingModule;
