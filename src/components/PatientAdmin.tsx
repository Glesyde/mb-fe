
import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  Upload, 
  UserPlus,
  CreditCard,
  Heart,
  Edit2,
  Eye,
  Trash2,
  Stethoscope
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

const PatientAdmin: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    gender: '',
    address: '',
    phone: '',
    hmoProvider: '',
    hmoId: '',
    emergencyName: '',
    emergencyRelationship: '',
    mrn: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    // Fix: replaced undefined variable 'activeId' with the correct state 'activeMenu'
    if (activeMenu) window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeMenu]);

  const generateMRN = () => {
    const num = Math.floor(1000 + Math.random() * 9000);
    const newMrn = `MRN-2025-${num}`;
    setFormData({ ...formData, mrn: newMrn });
  };

  const handleNext = () => {
    const newErrors: Record<string, string> = {};
    if (step === 1) {
      if (!formData.firstName) newErrors.firstName = 'First name is required';
      if (!formData.lastName) newErrors.lastName = 'Last name is required';
      if (!formData.phone) newErrors.phone = 'Phone number is required';
      if (!formData.mrn) newErrors.mrn = 'Please generate an MRN';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    setStep(step + 1);
  };

  const handleSubmit = () => {
    const newPatient: Patient = {
      mrn: formData.mrn,
      name: `${formData.firstName} ${formData.lastName}`,
      age: 0, // Simplified for mock
      gender: formData.gender || 'Not specified',
      phone: formData.phone,
      hmo: formData.hmoProvider || 'Private',
      status: 'Outpatient'
    };
    setPatients([newPatient, ...patients]);
    setShowRegisterModal(false);
    resetForm();
  };

  const resetForm = () => {
    setStep(1);
    setFormData({
      firstName: '', lastName: '', dob: '', gender: '', address: '',
      phone: '', hmoProvider: '', hmoId: '', emergencyName: '',
      emergencyRelationship: '', mrn: ''
    });
    setErrors({});
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.mrn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Patient Administration</h1>
          <p className="text-slate-500">Manage patient records and hospital indexing.</p>
        </div>
        <button 
          onClick={() => setShowRegisterModal(true)}
          className="flex items-center gap-2 bg-brand-primary text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-brand-primary transition-all shadow-sm hover:shadow-brand-active"
        >
          <Plus size={20} />
          Register New Patient
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Filter by name, MRN or phone..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-active0/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
            <Filter size={16} /> Filters
          </button>
          <select className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-active0/20">
            <option>All Status</option>
            <option>Inpatient</option>
            <option>Outpatient</option>
          </select>
        </div>
      </div>

      {/* Patient Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-visible shadow-sm">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">MRN</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Age/Gender</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">HMO</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPatients.map((patient) => (
                <tr key={patient.mrn} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-bold text-brand-primary bg-brand-active px-2 py-1 rounded-md">{patient.mrn}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-slate-800">{patient.name}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-slate-600">{patient.age}Y • {patient.gender}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-slate-600">{patient.phone}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-slate-600">{patient.hmo}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`
                      text-[11px] font-bold px-2 py-1 rounded-full uppercase
                      ${patient.status === 'Inpatient' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}
                    `}>
                      {patient.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(activeMenu === patient.mrn ? null : patient.mrn);
                      }}
                      className={`p-2 rounded-lg transition-all ${activeMenu === patient.mrn ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600 group-hover:bg-white'}`}
                    >
                      <MoreVertical size={16} />
                    </button>
                    
                    {/* Action Dropdown */}
                    {activeMenu === patient.mrn && (
                      <div className="absolute right-6 top-12 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-[100] py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                          <Eye size={16} className="text-slate-400" /> View Profile
                        </button>
                        <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                          <Edit2 size={16} className="text-slate-400" /> Edit Record
                        </button>
                        <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                          <Stethoscope size={16} className="text-slate-400" /> Create Vitals
                        </button>
                        <div className="h-px bg-slate-100 my-1"></div>
                        <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 size={16} /> Archive Patient
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredPatients.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-slate-500">No patients found matching your search.</p>
          </div>
        )}
      </div>

      {/* Registration Modal (Wizard) */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowRegisterModal(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-xl font-bold text-slate-800">New Patient Registration</h2>
                <p className="text-sm text-slate-500">Step {step} of 3</p>
              </div>
              <button 
                onClick={() => setShowRegisterModal(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Wizard Progress Bar */}
            <div className="flex h-1.5 w-full bg-slate-100">
              <div className={`h-full bg-brand-primary transition-all duration-300 ${step === 1 ? 'w-1/3' : step === 2 ? 'w-2/3' : 'w-full'}`} />
            </div>

            {/* Modal Body */}
            <div className="p-8">
              {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center gap-3 text-brand-primary mb-2">
                    <UserPlus size={20} />
                    <h3 className="font-bold">Demographics</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">MRN Generation</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          readOnly 
                          placeholder="Click to generate"
                          className={`flex-1 px-4 py-2.5 bg-slate-100 border rounded-xl text-sm font-mono text-slate-900 ${errors.mrn ? 'border-red-500' : 'border-slate-200'}`}
                          value={formData.mrn}
                        />
                        <button 
                          onClick={generateMRN}
                          className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors"
                        >
                          Generate
                        </button>
                      </div>
                      {errors.mrn && <p className="text-[10px] text-red-500 font-medium">{errors.mrn}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">First Name *</label>
                      <input 
                        type="text" 
                        className={`w-full px-4 py-2.5 border rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-brand-active0/20 focus:border-brand-active0 outline-none ${errors.firstName ? 'border-red-500' : 'border-slate-200'}`}
                        value={formData.firstName}
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      />
                      {errors.firstName && <p className="text-[10px] text-red-500 font-medium">{errors.firstName}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Last Name *</label>
                      <input 
                        type="text" 
                        className={`w-full px-4 py-2.5 border rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-brand-active0/20 focus:border-brand-active0 outline-none ${errors.lastName ? 'border-red-500' : 'border-slate-200'}`}
                        value={formData.lastName}
                        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      />
                      {errors.lastName && <p className="text-[10px] text-red-500 font-medium">{errors.lastName}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date of Birth</label>
                      <input 
                        type="date" 
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-brand-active0/20 focus:border-brand-active0 outline-none"
                        value={formData.dob}
                        onChange={(e) => setFormData({...formData, dob: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gender</label>
                      <select 
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-brand-active0/20"
                        value={formData.gender}
                        onChange={(e) => setFormData({...formData, gender: e.target.value})}
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Residential Address</label>
                    <textarea 
                      rows={2}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-brand-active0/20"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number *</label>
                    <input 
                      type="tel" 
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-brand-active0/20 focus:border-brand-active0 outline-none ${errors.phone ? 'border-red-500' : 'border-slate-200'}`}
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                    {errors.phone && <p className="text-[10px] text-red-500 font-medium">{errors.phone}</p>}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center gap-3 text-emerald-600 mb-2">
                    <CreditCard size={20} />
                    <h3 className="font-bold">Insurance & HMO</h3>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">HMO Provider</label>
                    <select 
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={formData.hmoProvider}
                      onChange={(e) => setFormData({...formData, hmoProvider: e.target.value})}
                    >
                      <option value="">Private / Self-Pay</option>
                      <option value="Reliance Health">Reliance Health</option>
                      <option value="AXA Mansard">AXA Mansard</option>
                      <option value="Hygeia HMO">Hygeia HMO</option>
                      <option value="Leadway Health">Leadway Health</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">HMO ID Number</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={formData.hmoId}
                      onChange={(e) => setFormData({...formData, hmoId: e.target.value})}
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">HMO ID Card Photo</label>
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-emerald-300 transition-colors cursor-pointer bg-slate-50 group">
                      <div className="mx-auto w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Upload size={24} />
                      </div>
                      <p className="text-sm font-semibold text-slate-700">Click to upload or drag and drop</p>
                      <p className="text-xs text-slate-400 mt-1">SVG, PNG, JPG or GIF (max. 3MB)</p>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center gap-3 text-red-600 mb-2">
                    <Heart size={20} />
                    <h3 className="font-bold">Emergency Contact</h3>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Full Name</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-red-500/20"
                      value={formData.emergencyName}
                      onChange={(e) => setFormData({...formData, emergencyName: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Relationship</label>
                    <select 
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-red-500/20"
                      value={formData.emergencyRelationship}
                      onChange={(e) => setFormData({...formData, emergencyRelationship: e.target.value})}
                    >
                      <option value="">Select Relationship</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Parent">Parent</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Child">Child</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="bg-brand-active p-6 rounded-2xl border border-brand-active mt-4">
                    <h4 className="text-sm font-bold text-brand-primary mb-2 flex items-center gap-2">
                      <CheckCircle2 size={16} /> Final Review
                    </h4>
                    <p className="text-xs text-brand-primary leading-relaxed">
                      Please confirm all details are correct. Patient will be assigned to <strong>Outpatient</strong> status by default upon registration.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button 
                onClick={() => step > 1 ? setStep(step - 1) : setShowRegisterModal(false)}
                className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
              >
                <ChevronLeft size={18} />
                {step === 1 ? 'Cancel' : 'Back'}
              </button>
              
              <button 
                onClick={step === 3 ? handleSubmit : handleNext}
                className="flex items-center gap-2 bg-brand-primary text-white px-8 py-2.5 rounded-xl font-bold hover:bg-brand-primary transition-all shadow-md active:scale-95"
              >
                {step === 3 ? 'Finalize Registration' : 'Continue'}
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientAdmin;
