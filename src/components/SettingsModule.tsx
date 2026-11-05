import React, { useState } from 'react';
import {
  Settings,
  Building2,
  Layers,
  DollarSign,
  Stethoscope,
  Printer,
  Plus,
  Trash2,
  Edit2,
  Save,
  Upload,
  Search,
  CheckCircle2,
  X,
  Globe,
  Mail,
  Phone,
  Monitor,
  // Fix: Added missing Download icon import
  Download
} from 'lucide-react';

const INITIAL_DEPARTMENTS = [
  'General Outpatient (GOPD)',
  'Cardiology',
  'Pediatrics',
  'Internal Medicine',
  'Obstetrics & Gynecology',
  'Radiology',
  'Laboratory'
];

const INITIAL_SERVICES = [
  { id: 'S1', name: 'General Consultation', category: 'Consultation', price: 5000 },
  { id: 'S2', name: 'Specialist Consultation', category: 'Consultation', price: 15000 },
  { id: 'S3', name: 'Full Blood Count (FBC)', category: 'Labs', price: 4500 },
  { id: 'S4', name: 'Malaria Parasite Test', category: 'Labs', price: 2500 },
  { id: 'S5', name: 'Urinalysis', category: 'Labs', price: 1500 },
  { id: 'S6', name: 'Appendectomy', category: 'Procedures', price: 120000 },
  { id: 'S7', name: 'Wound Dressing', category: 'Procedures', price: 5500 },
];

const SettingsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'depts' | 'services' | 'diagnosis' | 'printers'>('services');
  const [departments, setDepartments] = useState(INITIAL_DEPARTMENTS);
  const [services, setServices] = useState(INITIAL_SERVICES);
  const [newDept, setNewDept] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleAddDept = () => {
    if (newDept.trim()) {
      setDepartments([...departments, newDept.trim()]);
      setNewDept('');
    }
  };

  const handleDeleteDept = (index: number) => {
    setDepartments(departments.filter((_, i) => i !== index));
  };

  const handlePriceChange = (id: string, newPrice: number) => {
    setServices(services.map(s => s.id === id ? { ...s, price: newPrice } : s));
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-6 mb-8">
              <div className="relative group">
                <div className="w-24 h-24 rounded-3xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 group-hover:border-brand-primary group-hover:bg-brand-active transition-all cursor-pointer overflow-hidden">
                  <Upload size={32} />
                </div>
                <button className="absolute -bottom-2 -right-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm text-brand-primary hover:text-brand-primary">
                  <Edit2 size={14} />
                </button>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Hospital Brand Identity</h3>
                <p className="text-sm text-slate-500">Update your hospital logo and contact details.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hospital Name</label>
                <input type="text" defaultValue="Medbookie Specialist Hospital" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-brand-active0/10 focus:border-brand-active0 transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Official Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input type="email" defaultValue="admin@medcore.his" className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-brand-active0/10 focus:border-brand-active0 transition-all" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact Phone</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input type="tel" defaultValue="+234 800 MED CORE" className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-brand-active0/10 focus:border-brand-active0 transition-all" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Website</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input type="text" defaultValue="www.medcore-hospital.com" className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-brand-active0/10 focus:border-brand-active0 transition-all" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Address</label>
              <textarea rows={3} defaultValue="15 Medical Plaza, Healthcare District, VI, Lagos." className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-brand-active0/10 focus:border-brand-active0 transition-all resize-none" />
            </div>

            <div className="flex justify-end pt-4">
              <button className="bg-brand-primary text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-brand-primary shadow-lg shadow-brand-active transition-all">
                <Save size={18} /> Update Profile
              </button>
            </div>
          </div>
        );

      case 'depts':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Departments & Units</h3>
                <p className="text-sm text-slate-500">Configure clinical and administrative hospital units.</p>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-200/60 mb-8">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Enter department name..."
                  className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-brand-active0/10 transition-all"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddDept()}
                />
                <button
                  onClick={handleAddDept}
                  className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all"
                >
                  <Plus size={18} /> Add Dept
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {departments.map((dept, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-brand-active hover:shadow-sm transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-active text-brand-primary flex items-center justify-center font-bold text-xs">{i + 1}</div>
                    <span className="text-sm font-semibold text-slate-700">{dept}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteDept(i)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      case 'services':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Services & Pricing Master</h3>
                <p className="text-sm text-slate-500">Define billable hospital services and standard pricing.</p>
              </div>
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search services..."
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-active0/10 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Service Item</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Standard Price (₦)</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {services.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(service => (
                    <tr key={service.id} className="hover:bg-slate-50/30 group">
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-slate-800">{service.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 uppercase tracking-wider">{service.category}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <input
                          type="number"
                          className="w-32 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-brand-primary text-right outline-none focus:bg-white focus:border-brand-active0 transition-all"
                          value={service.price}
                          onChange={(e) => handlePriceChange(service.id, parseInt(e.target.value) || 0)}
                        />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-[10px] font-bold text-slate-400 hover:text-brand-primary uppercase tracking-widest">Log History</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-3">
              <button className="px-6 py-3 text-sm font-bold text-slate-500">Discard</button>
              <button className="bg-brand-primary text-white px-8 py-3 rounded-2xl font-bold hover:bg-brand-primary shadow-md transition-all">Save Changes</button>
            </div>
          </div>
        );

      case 'diagnosis':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Diagnosis Codes (ICD-10)</h3>
                <p className="text-sm text-slate-500">Manage the clinical diagnosis registry.</p>
              </div>
              <button className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold">
                <Upload size={16} /> Sync with WHO LIS
              </button>
            </div>
            <div className="p-12 border-2 border-dashed border-slate-200 rounded-[40px] text-center bg-slate-50/50">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300 shadow-sm">
                <Stethoscope size={32} />
              </div>
              <h4 className="text-lg font-bold text-slate-800">ICD-10 Registry Ready</h4>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">Over 14,000 diagnostic codes are indexed. Use the global search at the top of the EMR to access these codes.</p>
              <button className="mt-6 text-sm font-bold text-brand-primary hover:underline flex items-center gap-1 mx-auto">
                Download Local Copy <Download size={14} />
              </button>
            </div>
          </div>
        );

      case 'printers':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Hardware & Printers</h3>
              <p className="text-sm text-slate-500">Configure network peripheral settings for receipts and labels.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-brand-active text-brand-primary rounded-2xl">
                    <Printer size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">Receipt Printer</h4>
                    <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Invoices & Bills</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Network IP Address</label>
                  <input type="text" defaultValue="192.168.1.102" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono outline-none focus:bg-white focus:border-brand-active0" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Printer Driver / Model</label>
                  <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none">
                    <option>Epson TM-T88VI (Thermal)</option>
                    <option>Star Micronics mC-Print3</option>
                    <option>Zebra ZD421</option>
                  </select>
                </div>
                <button className="w-full py-3 bg-slate-100 hover:bg-brand-active hover:text-brand-primary text-slate-500 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2">
                  <Monitor size={16} /> Test Connection
                </button>
              </div>

              <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl">
                    <PackageCheck size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">Wristband Printer</h4>
                    <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Patient Admissions</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Network IP Address</label>
                  <input type="text" defaultValue="192.168.1.105" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono outline-none focus:bg-white focus:border-teal-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Printer Driver / Model</label>
                  <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none">
                    <option>Zebra HC100 (Admissions)</option>
                    <option>Citizen CL-E300</option>
                  </select>
                </div>
                <button className="w-full py-3 bg-slate-100 hover:bg-teal-50 hover:text-teal-600 text-slate-500 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2">
                  <CheckCircle2 size={16} /> Print Test Strip
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <div className="p-2 bg-slate-800 text-white rounded-xl shadow-lg shadow-slate-200">
            <Settings size={24} />
          </div>
          System Configuration
        </h1>
        <p className="text-slate-500 font-medium">Control global hospital parameters, prices, and device connectivity.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-[40px] shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        {/* Vertical Tabs Sidebar */}
        <div className="w-full md:w-72 border-r border-slate-100 bg-slate-50/30 p-6 space-y-1">
          {[
            { id: 'profile', label: 'Hospital Profile', icon: Building2 },
            { id: 'depts', label: 'Departments', icon: Layers },
            { id: 'services', label: 'Services & Prices', icon: DollarSign },
            { id: 'diagnosis', label: 'Diagnosis Codes', icon: Stethoscope },
            { id: 'printers', label: 'Printer Config', icon: Printer },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all
                ${activeTab === tab.id
                  ? 'bg-white text-brand-primary shadow-sm border border-slate-100'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}
              `}
            >
              <tab.icon size={18} className={activeTab === tab.id ? 'text-brand-primary' : 'text-slate-400'} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 md:p-12 overflow-y-auto max-h-[calc(100vh-250px)]">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

const PackageCheck = ({ size, className }: any) => <div className={className}><CheckCircle2 size={size} /></div>;

export default SettingsModule;