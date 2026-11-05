
import React, { useState } from 'react';
import {
  FileText,
  Activity,
  History,
  Pill,
  Paperclip,
  AlertCircle,
  Droplets,
  User,
  Save,
  Clock,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Search
} from 'lucide-react';

interface VitalSign {
  label: string;
  value: string;
  unit: string;
  status: 'normal' | 'high' | 'low';
  lastChecked: string;
}

const EMRModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'notes' | 'vitals' | 'history' | 'meds' | 'attachments'>('notes');
  const [selectedPatient, setSelectedPatient] = useState(true); // Mocking that a patient is selected

  const mockPatient = {
    name: "Alexander J. Thompson",
    mrn: "MRN-2024-8842",
    age: "42Y",
    gender: "Male",
    allergies: ["Penicillin", "Peanuts", "Latex"],
    bloodType: "O+",
    dob: "12 Oct 1982"
  };

  const vitals: VitalSign[] = [
    { label: 'Blood Pressure', value: '145/92', unit: 'mmHg', status: 'high', lastChecked: '10 mins ago' },
    { label: 'Temperature', value: '36.8', unit: '°C', status: 'normal', lastChecked: '10 mins ago' },
    { label: 'Pulse Rate', value: '82', unit: 'bpm', status: 'normal', lastChecked: '10 mins ago' },
    { label: 'SpO2', value: '98', unit: '%', status: 'normal', lastChecked: '10 mins ago' },
    { label: 'Respiratory Rate', value: '18', unit: 'bpm', status: 'normal', lastChecked: '10 mins ago' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'notes':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">New Clinical Note (SOAP)</h3>
              <div className="flex gap-2">
                <button className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 transition-colors">Drafts (2)</button>
                <button className="bg-brand-primary text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-brand-primary shadow-md shadow-brand-active transition-all">
                  <Save size={16} /> Save Clinical Note
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-5 h-5 bg-slate-100 rounded flex items-center justify-center text-slate-600 font-bold">S</span>
                  Subjective (Patient's Complaints)
                </label>
                <textarea
                  className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:ring-2 focus:ring-brand-active0/20 focus:border-brand-active0 outline-none transition-all placeholder:text-slate-400"
                  placeholder="History of present illness, symptoms reported by patient..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-5 h-5 bg-slate-100 rounded flex items-center justify-center text-slate-600 font-bold">O</span>
                  Objective (Clinical Observations)
                </label>
                <textarea
                  className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:ring-2 focus:ring-brand-active0/20 focus:border-brand-active0 outline-none transition-all placeholder:text-slate-400"
                  placeholder="Vital signs, physical exam findings, lab results..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-5 h-5 bg-slate-100 rounded flex items-center justify-center text-slate-600 font-bold">A</span>
                  Assessment (Diagnosis)
                </label>
                <textarea
                  className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:ring-2 focus:ring-brand-active0/20 focus:border-brand-active0 outline-none transition-all placeholder:text-slate-400"
                  placeholder="Primary and secondary diagnosis, differential diagnosis..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-5 h-5 bg-slate-100 rounded flex items-center justify-center text-slate-600 font-bold">P</span>
                  Plan (Next Steps)
                </label>
                <textarea
                  className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:ring-2 focus:ring-brand-active0/20 focus:border-brand-active0 outline-none transition-all placeholder:text-slate-400"
                  placeholder="Treatments, prescriptions, referrals, follow-up instructions..."
                />
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Clock size={48} className="mb-4 opacity-20" />
            <p className="text-sm font-medium">History and Logs for {activeTab} loading...</p>
          </div>
        );
    }
  };

  if (!selectedPatient) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-6">
        <div className="bg-slate-100 p-8 rounded-full">
          <Search size={48} className="text-slate-400" />
        </div>
        <div className="text-center max-w-sm">
          <h2 className="text-xl font-bold text-slate-800">No Patient Selected</h2>
          <p className="text-slate-500 mt-2">Search for a patient using the global search or select from the appointments queue to open their EMR.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col animate-in fade-in duration-500">
      {/* Patient Header - Sticky Banner */}
      {/* Fix: Set top-0 instead of top-16 because main already starts below the header */}
      {/* Added -mt-4 md:-mt-8 to align flush with the scroll container top */}
      <div className="sticky top-0 z-30 -mx-4 md:-mx-8 -mt-4 md:-mt-8 px-4 md:px-8 bg-white border-b border-slate-200 py-6 shadow-sm mb-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-active flex items-center justify-center text-brand-primary border border-brand-active">
              <User size={36} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">{mockPatient.name}</h1>
                <span className="text-[10px] font-bold bg-brand-active text-brand-primary px-2 py-0.5 rounded uppercase tracking-wider border border-brand-active">{mockPatient.mrn}</span>
              </div>
              <div className="flex items-center gap-4 mt-1.5">
                <p className="text-sm text-slate-600 font-medium">{mockPatient.age} • {mockPatient.gender} • {mockPatient.dob}</p>
                <div className="h-1 w-1 rounded-full bg-slate-300" />
                <div className="flex items-center gap-1.5">
                  <Droplets size={14} className="text-red-500" />
                  <span className="text-sm font-bold text-slate-900">{mockPatient.bloodType}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mr-2">Known Allergies:</span>
            {mockPatient.allergies.map(allergy => (
              <span key={allergy} className="bg-red-50 text-red-600 border border-red-100 text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                <AlertCircle size={12} />
                {allergy}
              </span>
            ))}

            {/* Compact Vitals Summary in Header */}
            <div className="flex items-center gap-3 ml-4 pl-4 border-l border-slate-200">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Latest Vitals</span>
                <div className="flex items-center gap-3">
                  {vitals.slice(0, 4).map(v => (
                    <div key={v.label} className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-700">{v.label.split(' ')[0]}:</span>
                      <span className={`text-xs font-black ${v.status === 'high' ? 'text-red-600' : 'text-brand-primary'}`}>
                        {v.value}{v.unit === '°C' || v.unit === '%' ? v.unit : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Clinical Workspace */}
        <div className="flex-1 bg-white border border-slate-200 rounded-[32px] shadow-sm overflow-hidden flex flex-col">
          {/* Tabs Navigation */}
          <div className="flex items-center px-4 bg-slate-50/50 border-b border-slate-100 overflow-x-auto no-scrollbar">
            {[
              { id: 'notes', label: 'Clinical Notes', icon: FileText },
              { id: 'vitals', label: 'Vitals', icon: Activity },
              { id: 'history', label: 'History', icon: History },
              { id: 'meds', label: 'Meds', icon: Pill },
              { id: 'attachments', label: 'Attachments', icon: Paperclip },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'text-brand-primary border-brand-primary bg-white'
                    : 'text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-50'}
                `}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-8 flex-1">
            {renderTabContent()}
          </div>
        </div>

        {/* Right Sidebar: Quick Vitals & Recent Activity - Removed for more horizontal space */}
        {/* 
        <div className="w-full lg:w-80 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm">
            ...
          </div>
        </div> 
        */}
      </div>
    </div>
  );
};

export default EMRModule;
