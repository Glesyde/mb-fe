
import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  History, 
  Search, 
  Filter, 
  MoreVertical, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Lock,
  Globe,
  Settings2,
  Mail,
  Building2,
  Trash2,
  ShieldAlert,
  ShieldPlus,
  Eye,
  EyeOff
} from 'lucide-react';
import PasswordValidator from './shared/PasswordValidator';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: 'Active' | 'Inactive';
  lastLogin: string;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  ip: string;
}

const INITIAL_STAFF: StaffUser[] = [
  { id: '1', name: 'Dr. Gregory House', email: 'g.house@medcore.his', role: 'Doctor', department: 'Diagnostics', status: 'Active', lastLogin: '10 mins ago' },
  { id: '2', name: 'Sarah Miller', email: 's.miller@medcore.his', role: 'Nurse', department: 'Ward A', status: 'Active', lastLogin: '2 hours ago' },
  { id: '3', name: 'Admin Jane', email: 'admin@medcore.his', role: 'Admin', department: 'IT / Operations', status: 'Active', lastLogin: '5 mins ago' },
  { id: '4', name: 'James Wilson', email: 'j.wilson@medcore.his', role: 'Doctor', department: 'Oncology', status: 'Active', lastLogin: 'Yesterday' },
  { id: '5', name: 'John Cashier', email: 'j.cashier@medcore.his', role: 'Cashier', department: 'Accounts', status: 'Inactive', lastLogin: '3 days ago' },
];

const AUDIT_LOGS: AuditEntry[] = [
  { id: 'A1', timestamp: '2025-05-22 14:45:02', user: 'Admin Jane', action: 'Deleted Invoice #1024', ip: '192.168.1.45' },
  { id: 'A2', timestamp: '2025-05-22 14:30:15', user: 'Dr. Gregory House', action: 'Viewed Clinical Notes - MRN-2024-8842', ip: '192.168.1.12' },
  { id: 'A3', timestamp: '2025-05-22 14:15:55', user: 'Sarah Miller', action: 'Admitted Patient to Bed A-4', ip: '192.168.1.88' },
  { id: 'A4', timestamp: '2025-05-22 13:50:01', user: 'Admin Jane', action: 'Updated HMO Tariff: Reliance Health', ip: '192.168.1.45' },
];

const PERMISSIONS = [
  'View Clinical Notes',
  'Edit Clinical Notes',
  'Admit Patient',
  'Discharge Patient',
  'Delete Invoice',
  'Modify Pharmacy Stock',
  'View Audit Logs',
  'Manage User Accounts',
  'Create Appointments'
];

const DEPARTMENTS = [
  'General Medicine',
  'Diagnostics',
  'Pharmacy',
  'Accounts',
  'Emergency',
  'Administration',
  'Ward A',
  'IT / Operations'
];

const UserManagementModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'permissions' | 'audit'>('users');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [staffList, setStaffList] = useState<StaffUser[]>(INITIAL_STAFF);
  
  // Stateful roles for dynamic expansion
  const [roles, setRoles] = useState<string[]>(['Admin', 'Doctor', 'Nurse', 'Cashier', 'Pharmacist']);
  const [newRoleName, setNewRoleName] = useState('');

  // New Staff Form State
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    role: 'Doctor',
    department: 'General Medicine',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isPassValid, setIsPassValid] = useState(false);

  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({
    'Admin': PERMISSIONS,
    'Doctor': ['View Clinical Notes', 'Edit Clinical Notes', 'Admit Patient', 'Create Appointments'],
    'Nurse': ['View Clinical Notes', 'Admit Patient', 'Discharge Patient'],
    'Cashier': ['Create Appointments'],
    'Pharmacist': ['Modify Pharmacy Stock', 'Create Appointments']
  });

  const togglePermission = (role: string, permission: string) => {
    setRolePermissions(prev => {
      const current = prev[role] || [];
      const updated = current.includes(permission)
        ? current.filter(p => p !== permission)
        : [...current, permission];
      return { ...prev, [role]: updated };
    });
  };

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedRole = newRoleName.trim();
    if (formattedRole && !roles.includes(formattedRole)) {
      setRoles([...roles, formattedRole]);
      setRolePermissions(prev => ({ ...prev, [formattedRole]: [] }));
      setShowAddRoleModal(false);
      setNewRoleName('');
    }
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formState.name || !formState.email || !formState.role || !formState.department || !formState.password) {
      alert("Please fill in all required fields.");
      return;
    }

    if (!isPassValid) {
      alert("Password must meet security requirements.");
      return;
    }

    const newUser: StaffUser = {
      id: Math.random().toString(36).substr(2, 9),
      name: formState.name,
      email: formState.email,
      role: formState.role,
      department: formState.department,
      status: 'Active',
      lastLogin: 'Never'
    };

    setStaffList([newUser, ...staffList]);
    setShowAddModal(false);
    
    // Reset Form
    setFormState({
      name: '',
      email: '',
      role: roles[0] || 'Doctor',
      department: 'General Medicine',
      password: ''
    });
    setIsPassValid(false);
  };

  const filteredStaff = staffList.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      {/* Module Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-slate-800 text-white rounded-xl shadow-lg shadow-slate-200">
              <Users size={24} />
            </div>
            User & Security Management
          </h1>
          <p className="text-slate-500 font-medium">Control staff access, define roles, and monitor system activity.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-brand-primary text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-brand-primary transition-all shadow-lg shadow-brand-active"
          >
            <UserPlus size={20} /> Add New Staff
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100/50 backdrop-blur rounded-[20px] w-fit">
        {[
          { id: 'users', label: 'Staff Directory', icon: Users },
          { id: 'permissions', label: 'Permissions Matrix', icon: ShieldCheck },
          { id: 'audit', label: 'Audit Logs', icon: History },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`
              flex items-center gap-2 px-6 py-2.5 rounded-[16px] text-sm font-bold transition-all
              ${activeTab === tab.id 
                ? 'bg-white text-brand-primary shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'}
            `}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* User List Table */}
      {activeTab === 'users' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search staff by name or email..."
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-brand-active0/10 outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50">
              <Filter size={16} /> Department
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="px-8 py-5">Staff Member</th>
                    <th className="px-8 py-5">Role / Designation</th>
                    <th className="px-8 py-5">Department</th>
                    <th className="px-8 py-5">Status</th>
                    <th className="px-8 py-5">Last Activity</th>
                    <th className="px-8 py-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredStaff.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-500 group-hover:bg-brand-primary group-hover:text-white transition-all">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{user.name}</p>
                            <p className="text-xs text-slate-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-sm text-slate-500 font-medium">
                        {user.department}
                      </td>
                      <td className="px-8 py-5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider
                          ${user.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}
                        `}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-xs text-slate-400">
                        {user.lastLogin}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                          <MoreVertical size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Matrix */}
      {activeTab === 'permissions' && (
        <div className="bg-white border border-slate-200 rounded-[40px] shadow-sm overflow-hidden animate-in fade-in duration-500">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Access Control Matrix</h2>
              <p className="text-xs text-slate-500 font-medium">Define high-level security permissions for hospital staff roles.</p>
            </div>
            <div className="flex items-center gap-2">
               <button 
                onClick={() => setShowAddRoleModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
               >
                <ShieldPlus size={14} /> Create New Role
              </button>
               <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all">
                <Settings2 size={14} /> Global Defaults
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/30 sticky left-0 z-10 border-r border-slate-100">Permissions \ Roles</th>
                  {roles.map(role => (
                    <th key={role} className="px-8 py-6 text-center text-xs font-black text-slate-800 border-r border-slate-50 last:border-r-0 uppercase tracking-widest min-w-[140px]">
                      {role}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {PERMISSIONS.map(permission => (
                  <tr key={permission} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-8 py-5 text-sm font-bold text-slate-700 bg-slate-50/10 sticky left-0 z-10 border-r border-slate-100">
                      {permission}
                    </td>
                    {roles.map(role => (
                      <td key={role} className="px-8 py-5 text-center border-r border-slate-50 last:border-r-0">
                        <div className="flex justify-center">
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 rounded-lg border-slate-200 text-brand-primary focus:ring-brand-active0 transition-all cursor-pointer"
                            checked={rolePermissions[role]?.includes(permission)}
                            onChange={() => togglePermission(role, permission)}
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
             <div className="flex items-center gap-3 text-slate-400">
              <ShieldAlert size={18} />
              <p className="text-xs font-medium">Changes made to the matrix are applied in real-time to active user sessions.</p>
             </div>
             <button className="px-8 py-3 bg-brand-primary text-white rounded-2xl font-bold hover:bg-brand-primary shadow-md shadow-brand-active transition-all">
               Save Permissions
             </button>
          </div>
        </div>
      )}

      {/* Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-slate-200 rounded-[40px] shadow-sm overflow-hidden animate-in fade-in duration-500">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">System Audit Log</h2>
            <div className="flex gap-2">
               <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50">
                 <History size={14} /> Recent only
               </button>
               <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800">
                 <Globe size={14} /> Export Logs
               </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="px-8 py-5">Timestamp</th>
                  <th className="px-8 py-5">User Account</th>
                  <th className="px-8 py-5">Action Performed</th>
                  <th className="px-8 py-5">IP Address</th>
                  <th className="px-8 py-5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium">
                {AUDIT_LOGS.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5 text-xs text-slate-400 font-mono">
                      {log.timestamp}
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-slate-700">
                      {log.user}
                    </td>
                    <td className="px-8 py-5 text-sm text-slate-600">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold mr-2 uppercase tracking-tight
                        ${log.action.includes('Deleted') ? 'bg-red-50 text-red-600' : 'bg-brand-active text-brand-primary'}
                      `}>
                        {log.action.split(' ')[0]}
                      </span>
                      {log.action.split(' ').slice(1).join(' ')}
                    </td>
                    <td className="px-8 py-5 text-xs text-slate-400 font-mono">
                      {log.ip}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button className="text-[10px] font-black text-brand-primary hover:underline uppercase tracking-widest">
                        Full Log
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Role Creation Modal */}
      {showAddRoleModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAddRoleModal(false)} />
          <form 
            onSubmit={handleCreateRole}
            className="relative bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
          >
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-indigo-50/30">
              <h2 className="text-lg font-bold text-slate-800">Create Hospital Role</h2>
              <button type="button" onClick={() => setShowAddRoleModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <div className="p-8 space-y-4">
               <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Role Designation Name</label>
                  <input 
                    autoFocus
                    required
                    type="text" 
                    placeholder="e.g. Radiologist, Intern, HMO Lead" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all" 
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                  />
               </div>
               <p className="text-[10px] text-slate-500 italic">This role will immediately appear in the Permissions Matrix and Staff Enrollment options.</p>
            </div>
            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setShowAddRoleModal(false)}
                className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 shadow-md transition-all"
              >
                Save Role
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Staff Enrollment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowAddModal(false)} />
          <form 
            onSubmit={handleCreateAccount}
            className="relative bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
          >
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-brand-active/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-primary text-white rounded-xl">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight">New Staff Enrollment</h2>
                  <p className="text-xs text-brand-primary font-bold uppercase tracking-widest">Provision System Access</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)} 
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
                  <input 
                    required
                    type="text" 
                    placeholder="John Doe" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-brand-active0/10 focus:border-brand-active0 transition-all" 
                    value={formState.name}
                    onChange={(e) => setFormState({...formState, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      required
                      type="email" 
                      placeholder="j.doe@hospital.com" 
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-brand-active0/10 focus:border-brand-active0 transition-all" 
                      value={formState.email}
                      onChange={(e) => setFormState({...formState, email: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System Role</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <select 
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none appearance-none font-bold text-slate-700"
                      value={formState.role}
                      onChange={(e) => setFormState({...formState, role: e.target.value})}
                    >
                      {/* Using stateful roles here */}
                      {roles.map(role => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </div>
                </div>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Initial System Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-brand-active0 transition-colors" />
                  <input 
                    required
                    type={showPassword ? "text" : "password"} 
                    placeholder="Create a secure password" 
                    className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-brand-active0/10 focus:border-brand-active0 transition-all font-mono" 
                    value={formState.password}
                    onChange={(e) => setFormState({...formState, password: e.target.value})}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <PasswordValidator password={formState.password} onValidChange={setIsPassValid} />
              </div>

              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
                <AlertCircle className="text-amber-600 flex-shrink-0" size={18} />
                <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                  Enrollment will send a secure activation link to the staff member's email address. They will be required to set up MFA upon first login.
                </p>
              </div>
            </div>

            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={!isPassValid || !formState.name || !formState.email || !formState.password}
                className="bg-brand-primary disabled:bg-slate-200 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-brand-primary shadow-md shadow-brand-active transition-all flex items-center gap-2"
              >
                <CheckCircle2 size={18} /> Create Account
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default UserManagementModule;
