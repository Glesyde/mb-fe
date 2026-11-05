
import React, { useState } from 'react';
import { 
  FlaskConical, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileEdit, 
  Upload, 
  FileText,
  X,
  Droplets,
  Microscope,
  Activity,
  ChevronRight
} from 'lucide-react';

interface LabOrder {
  id: string;
  patientName: string;
  testName: string;
  priority: 'Stat' | 'Normal';
  status: 'Ordered' | 'Sample Collected' | 'Result Ready';
  requestDate: string;
  results?: { [key: string]: string };
}

const MOCK_LAB_ORDERS: LabOrder[] = [
  { id: 'LAB-5021', patientName: 'James Wilson', testName: 'Full Blood Count (FBC)', priority: 'Stat', status: 'Sample Collected', requestDate: '10:15 AM' },
  { id: 'LAB-5022', patientName: 'Elena Rodriguez', testName: 'Malaria Parasite', priority: 'Normal', status: 'Ordered', requestDate: '11:05 AM' },
  { id: 'LAB-5018', patientName: 'Sarah Miller', testName: 'Lipid Profile', priority: 'Normal', status: 'Result Ready', requestDate: 'Yesterday' },
];

const LabModule: React.FC = () => {
  const [orders, setOrders] = useState<LabOrder[]>(MOCK_LAB_ORDERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [showResultModal, setShowResultModal] = useState<LabOrder | null>(null);
  const [resultForm, setResultForm] = useState({ hb: '', wbc: '', platelets: '' });

  const updateStatus = (id: string, newStatus: LabOrder['status']) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
  };

  const handleSaveResults = () => {
    if (showResultModal) {
      updateStatus(showResultModal.id, 'Result Ready');
      setShowResultModal(null);
    }
  };

  const filtered = orders.filter(o => 
    o.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.testName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <FlaskConical size={24} />
            </div>
            Laboratory (LIS)
          </h1>
          <p className="text-slate-500">Monitor diagnostic requests and record laboratory findings.</p>
        </div>
        <div className="flex items-center gap-2">
           <button className="flex items-center gap-2 px-4 py-2 text-purple-600 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors text-sm font-bold">
            <Microscope className="w-4 h-4" /> Lab Inventory
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text"
            placeholder="Search by Patient MRN, ID or Test Name..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500/20 text-slate-900 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-4">
          <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
            <Activity size={18} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Stat Tests</p>
            <p className="text-lg font-bold text-slate-800">{orders.filter(o => o.priority === 'Stat' && o.status !== 'Result Ready').length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-4">
           <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Ready Today</p>
            <p className="text-lg font-bold text-slate-800">12</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Droplets size={16} /> Investigation Workflow
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4">Lab ID</th>
                <th className="px-6 py-4">Patient</th>
                <th className="px-6 py-4">Test Requested</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((order) => (
                <tr key={order.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-xs font-mono font-bold text-purple-600">{order.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-800">{order.patientName}</p>
                    <p className="text-[10px] text-slate-400 italic">Requested {order.requestDate}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-slate-600">{order.testName}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider
                      ${order.priority === 'Stat' ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-50 text-slate-400'}
                    `}>
                      {order.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border
                      ${order.status === 'Ordered' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                        order.status === 'Sample Collected' ? 'bg-brand-active text-brand-primary border-brand-active' : 
                        'bg-emerald-50 text-emerald-600 border-emerald-100'}
                    `}>
                      {order.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {order.status === 'Ordered' && (
                      <button 
                        onClick={() => updateStatus(order.id, 'Sample Collected')}
                        className="bg-brand-primary text-white px-4 py-1.5 rounded-xl text-xs font-bold hover:bg-brand-primary transition-all shadow-md shadow-brand-active"
                      >
                        Collect Sample
                      </button>
                    )}
                    {order.status === 'Sample Collected' && (
                      <button 
                        onClick={() => setShowResultModal(order)}
                        className="bg-purple-600 text-white px-4 py-1.5 rounded-xl text-xs font-bold hover:bg-purple-700 transition-all shadow-md shadow-purple-100 flex items-center gap-1.5 justify-center ml-auto"
                      >
                        <FileEdit size={14} /> Update Results
                      </button>
                    )}
                    {order.status === 'Result Ready' && (
                      <button className="text-slate-400 hover:text-slate-800 p-2 transition-colors">
                        <FileText size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Update Results Modal */}
      {showResultModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowResultModal(null)} />
          <div className="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-purple-50/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
                  <Microscope size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Result Input</h2>
                  <p className="text-xs text-slate-500">{showResultModal.testName} • {showResultModal.patientName}</p>
                </div>
              </div>
              <button onClick={() => setShowResultModal(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hemoglobin (Hb)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-purple-500/20"
                      placeholder="e.g. 13.5"
                      value={resultForm.hb}
                      onChange={e => setResultForm({...resultForm, hb: e.target.value})}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">g/dL</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">WBC Count</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-purple-500/20"
                      placeholder="e.g. 7.2"
                      value={resultForm.wbc}
                      onChange={e => setResultForm({...resultForm, wbc: e.target.value})}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">x10³/µL</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Laboratory Remarks</label>
                <textarea 
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-purple-500/20"
                  placeholder="Clinical notes or observations..."
                />
              </div>

              <div className="border-2 border-dashed border-slate-100 rounded-[24px] p-6 text-center bg-slate-50/50 hover:bg-slate-50 hover:border-purple-200 transition-all cursor-pointer group">
                <Upload className="mx-auto w-10 h-10 text-slate-300 group-hover:text-purple-400 mb-2" />
                <p className="text-sm font-bold text-slate-700">Attach Automated Report (PDF)</p>
                <p className="text-[10px] text-slate-400 mt-1 uppercase">Max 5MB file size</p>
              </div>
            </div>

            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button 
                onClick={() => setShowResultModal(null)}
                className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800"
              >
                Discard
              </button>
              <button 
                onClick={handleSaveResults}
                className="bg-purple-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-purple-700 transition-all shadow-md shadow-purple-900/20 active:scale-95 flex items-center gap-2"
              >
                <CheckCircle2 size={18} /> Publish Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabModule;
