
import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Calendar, 
  Download, 
  Filter, 
  User, 
  ArrowRight, 
  ArrowLeft,
  ChevronRight,
  MoreVertical,
  Activity,
  LogOut,
  LogIn
} from 'lucide-react';

interface AdmissionRecord {
  id: string;
  patient: string;
  mrn: string;
  ward: string;
  bed: string;
  admittedAt: string;
  dischargedAt?: string;
  status: 'Current' | 'Discharged';
  consultant: string;
}

const MOCK_LOGS: AdmissionRecord[] = [
  { id: 'ADM-9921', patient: 'Alexander Thompson', mrn: 'MRN-8842', ward: 'General Ward A', bed: 'A1', admittedAt: '15 May 2025, 09:15', status: 'Current', consultant: 'Dr. House' },
  { id: 'ADM-9915', patient: 'Sarah Miller', mrn: 'MRN-1120', ward: 'Male Surgical Ward', bed: 'B4', admittedAt: '20 May 2025, 14:30', status: 'Current', consultant: 'Dr. Wilson' },
  { id: 'ADM-9882', patient: 'Robert Jenkins', mrn: 'MRN-4421', ward: 'General Ward A', bed: 'A8', admittedAt: '10 May 2025, 11:00', dischargedAt: '18 May 2025, 16:45', status: 'Discharged', consultant: 'Dr. Cuddy' },
  { id: 'ADM-9870', patient: 'John Doe', mrn: 'MRN-001', ward: 'General Ward A', bed: 'A4', admittedAt: '05 May 2025, 10:20', dischargedAt: '12 May 2025, 09:00', status: 'Discharged', consultant: 'Dr. House' },
];

const AdmissionsLog: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = MOCK_LOGS.filter(log => 
    log.patient.toLowerCase().includes(searchTerm.toLowerCase()) || 
    log.mrn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Search & Filter Header */}
      <div className="bg-white p-6 rounded-[40px] border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-center">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={22} />
          <input 
            type="text" 
            placeholder="Search by Patient, MRN or ID..." 
            className="w-full pl-14 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-[28px] text-sm font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-brand-active0/10 transition-all outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button className="flex items-center gap-2 px-6 py-4 bg-white border border-slate-200 rounded-[24px] text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 transition-all">
            <Calendar size={18} /> Date Range
          </button>
          <button className="bg-slate-900 text-white px-8 py-4 rounded-[24px] font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2">
            <Download size={18} /> Export CSV
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200 rounded-[44px] overflow-hidden shadow-sm">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
           <div>
             <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
               <History size={24} className="text-brand-primary" /> Lifecycle Registry
             </h3>
             <p className="text-xs font-bold text-slate-400 mt-1">Admission tracking and facility throughput monitoring.</p>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b border-slate-100">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Patient & ID</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ward Location</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Enrollment Dates</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-500 group-hover:bg-brand-primary group-hover:text-white transition-all shadow-sm">
                        {log.patient.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800">{log.patient}</p>
                        <p className="text-[10px] font-mono font-bold text-brand-primary uppercase tracking-tighter mt-0.5">{log.mrn}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-xs font-black text-slate-700">{log.ward}</p>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bed {log.bed}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase">
                        <LogIn size={12} /> {log.admittedAt}
                      </div>
                      {log.dischargedAt ? (
                        <div className="flex items-center gap-2 text-[10px] font-bold text-rose-600 uppercase">
                          <LogOut size={12} /> {log.dischargedAt}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-[10px] font-bold text-amber-500 uppercase animate-pulse">
                          <Activity size={12} /> In Progress
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`text-[9px] font-black px-3 py-1 rounded-full border uppercase tracking-widest
                      ${log.status === 'Current' ? 'bg-brand-active text-brand-primary border-brand-active' : 'bg-slate-100 text-slate-500 border-slate-200'}
                    `}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-brand-primary transition-all shadow-sm" title="View Detail">
                        <ChevronRight size={18} />
                      </button>
                      <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-all shadow-sm">
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdmissionsLog;
