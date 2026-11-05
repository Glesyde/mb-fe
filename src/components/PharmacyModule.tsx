
import React, { useState } from 'react';
import { 
  Pill, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  PackageCheck,
  PackageX,
  Printer,
  ShoppingBag
} from 'lucide-react';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  inStock: boolean;
}

interface Prescription {
  id: string;
  patientName: string;
  doctorName: string;
  date: string;
  status: 'Pending' | 'Dispensed' | 'Partial';
  medications: Medication[];
}

const MOCK_PRESCRIPTIONS: Prescription[] = [
  {
    id: 'RX-8821',
    patientName: 'Alexander J. Thompson',
    doctorName: 'Dr. Gregory House',
    date: 'Today, 10:45 AM',
    status: 'Pending',
    medications: [
      { name: 'Amoxicillin 500mg', dosage: '1 cap', frequency: '8 hourly', duration: '7 days', inStock: true },
      { name: 'Paracetamol 500mg', dosage: '2 tabs', frequency: 'PRN (As needed)', duration: '3 days', inStock: true },
      { name: 'Vitamin C 1000mg', dosage: '1 tab', frequency: 'Daily', duration: '30 days', inStock: false },
    ]
  },
  {
    id: 'RX-8822',
    patientName: 'Sarah Miller',
    doctorName: 'Dr. Wilson',
    date: 'Today, 11:20 AM',
    status: 'Pending',
    medications: [
      { name: 'Ibuprofen 400mg', dosage: '1 tab', frequency: '12 hourly', duration: '5 days', inStock: true },
    ]
  },
  {
    id: 'RX-8815',
    patientName: 'Robert Brown',
    doctorName: 'Dr. Cuddy',
    date: 'Yesterday',
    status: 'Dispensed',
    medications: [
      { name: 'Metformin 500mg', dosage: '1 tab', frequency: 'Daily', duration: '30 days', inStock: true },
    ]
  }
];

const PharmacyModule: React.FC = () => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(MOCK_PRESCRIPTIONS);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleDispense = (id: string) => {
    setPrescriptions(prev => prev.map(p => p.id === id ? { ...p, status: 'Dispensed' } : p));
  };

  const filtered = prescriptions.filter(p => 
    p.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
              <Pill size={24} />
            </div>
            Pharmacy & Dispensing
          </h1>
          <p className="text-slate-500">Manage prescription fulfillment and medication inventory.</p>
        </div>
        <div className="flex items-center gap-2">
           <button className="flex items-center gap-2 px-4 py-2 text-teal-600 bg-teal-50 rounded-xl hover:bg-teal-100 transition-colors text-sm font-bold">
            <ShoppingBag className="w-4 h-4" /> Stock Management
          </button>
        </div>
      </div>

      {/* Search & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text"
            placeholder="Search by Patient Name or RX ID..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-900 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending</span>
          <span className="text-xl font-bold text-teal-600">{prescriptions.filter(p => p.status === 'Pending').length}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dispensed</span>
          <span className="text-xl font-bold text-slate-400">{prescriptions.filter(p => p.status === 'Dispensed').length}</span>
        </div>
      </div>

      {/* Dispensing Queue */}
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Clock size={16} /> Dispensing Queue
          </h2>
        </div>
        
        <div className="divide-y divide-slate-100">
          {filtered.map((rx) => (
            <div key={rx.id} className="transition-all hover:bg-slate-50/50">
              <div 
                className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                onClick={() => setExpandedId(expandedId === rx.id ? null : rx.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold
                    ${rx.status === 'Dispensed' ? 'bg-slate-300' : 'bg-teal-500 shadow-lg shadow-teal-100'}
                  `}>
                    {rx.patientName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{rx.patientName}</h3>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                      <span className="font-mono text-teal-600 font-bold">{rx.id}</span>
                      <span>•</span>
                      <span>{rx.medications.length} items</span>
                      <span>•</span>
                      <span>{rx.date}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end md:self-auto">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border
                    ${rx.status === 'Dispensed' ? 'bg-slate-50 text-slate-400 border-slate-100' : 'bg-teal-50 text-teal-600 border-teal-100'}
                  `}>
                    {rx.status.toUpperCase()}
                  </span>
                  {expandedId === rx.id ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                </div>
              </div>

              {expandedId === rx.id && (
                <div className="px-6 pb-6 pt-2 animate-in slide-in-from-top-2 duration-300">
                  <div className="bg-slate-50 border border-slate-100 rounded-[24px] p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div className="text-xs text-slate-500">
                        Prescribing Doctor: <span className="font-bold text-slate-800">{rx.doctorName}</span>
                      </div>
                      <button className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-teal-600 transition-colors uppercase">
                        <Printer size={14} /> Label Print
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {rx.medications.map((med, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="text-sm font-bold text-slate-800">{med.name}</h4>
                              {med.inStock ? (
                                <div className="text-teal-600 flex items-center gap-1 text-[9px] font-bold bg-teal-50 px-1.5 py-0.5 rounded" title="In Stock">
                                  <PackageCheck size={12} /> OK
                                </div>
                              ) : (
                                <div className="text-red-600 flex items-center gap-1 text-[9px] font-bold bg-red-50 px-1.5 py-0.5 rounded" title="Out of Stock">
                                  <PackageX size={12} /> OOS
                                </div>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium">Dosage: {med.dosage}</p>
                            <p className="text-[11px] text-slate-500 font-medium">Freq: {med.frequency}</p>
                            <p className="text-[11px] text-slate-500 font-medium">Duration: {med.duration}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                      <button className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800">
                        Reject Order
                      </button>
                      <button 
                        onClick={() => handleDispense(rx.id)}
                        disabled={rx.status === 'Dispensed'}
                        className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md active:scale-95 flex items-center gap-2
                          ${rx.status === 'Dispensed' 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' 
                            : 'bg-teal-600 text-white hover:bg-teal-700 shadow-teal-200'}
                        `}
                      >
                        {rx.status === 'Dispensed' ? <CheckCircle2 size={18} /> : <Pill size={18} />}
                        {rx.status === 'Dispensed' ? 'Dispensed' : 'Confirm & Dispense'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center">
              <div className="bg-slate-50 p-6 rounded-full mb-4">
                <Search size={48} className="text-slate-200" />
              </div>
              <h3 className="font-bold text-slate-400">No prescriptions found</h3>
            </div>
          )}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6 flex items-start gap-4">
        <AlertCircle className="text-amber-600 flex-shrink-0" size={20} />
        <div>
          <h4 className="text-sm font-bold text-amber-800">Controlled Substances Notice</h4>
          <p className="text-xs text-amber-600 leading-relaxed mt-1">
            Orders containing opioids or psychotropic drugs require a second sign-off by a senior pharmacist before physical dispensing.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PharmacyModule;
