
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Eye, 
  Edit2, 
  Stethoscope, 
  Trash2 
} from 'lucide-react';

interface Patient {
  mrn: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  hmo: string;
  status: 'Inpatient' | 'Outpatient';
}

const INITIAL_PATIENTS: Patient[] = [
  { mrn: 'MRN-2024-001', name: 'John Doe', age: 34, gender: 'Male', phone: '08034567890', hmo: 'Reliance Health', status: 'Outpatient' },
  { mrn: 'MRN-2024-002', name: 'Sarah Jenkins', age: 28, gender: 'Female', phone: '08123456789', hmo: 'AXA Mansard', status: 'Inpatient' },
  { mrn: 'MRN-2024-003', name: 'Michael Chen', age: 45, gender: 'Male', phone: '09055544433', hmo: 'Private/Self', status: 'Outpatient' },
  { mrn: 'MRN-2024-004', name: 'Elena Rodriguez', age: 31, gender: 'Female', phone: '07088899900', hmo: 'Hygeia HMO', status: 'Inpatient' },
];

const PatientRegistry: React.FC = () => {
  const navigate = useNavigate();
  const [patients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    if (activeMenu) window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeMenu]);

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.mrn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Patient Administration</h1>
          <p className="text-slate-500 font-medium">Manage and search hospital patient indices.</p>
        </div>
        <button 
          onClick={() => navigate('/patients/register')}
          className="flex items-center gap-2 bg-brand-primary text-white px-5 py-2.5 rounded-2xl font-bold hover:bg-brand-primary transition-all shadow-lg shadow-brand-active"
        >
          <Plus size={20} />
          Register New Patient
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Filter by name, MRN or phone..."
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-brand-active0/10 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button className="flex items-center gap-2 px-5 py-3 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all">
            <Filter size={16} /> Filters
          </button>
          <select className="px-5 py-3 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-brand-active0/20">
            <option>All Status</option>
            <option>Inpatient</option>
            <option>Outpatient</option>
          </select>
        </div>
      </div>

      {/* Patient Table */}
      <div className="bg-white rounded-[40px] border border-slate-200 overflow-visible shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">MRN</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Name</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Age/Gender</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">HMO Provider</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredPatients.map((patient) => (
                <tr key={patient.mrn} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-8 py-5">
                    <span className="text-sm font-bold text-brand-primary bg-brand-active px-3 py-1 rounded-lg border border-brand-active">{patient.mrn}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm font-black text-slate-800">{patient.name}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm text-slate-500 font-medium">{patient.age}Y • {patient.gender}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm text-slate-500 font-medium">{patient.phone}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">{patient.hmo}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`
                      text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider
                      ${patient.status === 'Inpatient' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}
                    `}>
                      {patient.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(activeMenu === patient.mrn ? null : patient.mrn);
                      }}
                      className="p-2 text-slate-300 hover:text-slate-600 rounded-xl transition-all"
                    >
                      <MoreVertical size={18} />
                    </button>
                    
                    {activeMenu === patient.mrn && (
                      <div className="absolute right-8 top-14 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[100] py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all">
                          <Eye size={16} className="text-slate-400" /> View Profile
                        </button>
                        <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all">
                          <Edit2 size={16} className="text-slate-400" /> Edit Record
                        </button>
                        <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all">
                          <Stethoscope size={16} className="text-slate-400" /> Create Vitals
                        </button>
                        <div className="h-px bg-slate-100 my-1" />
                        <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition-all">
                          <Trash2 size={16} /> Archive Record
                        </button>
                      </div>
                    )}
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

export default PatientRegistry;
