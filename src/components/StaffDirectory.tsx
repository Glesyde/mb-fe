import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  MoreVertical,
  Mail,
  Lock,
  Building2,
  X,
  AlertCircle,
  Ban,
  UserCheck,
  ChevronRight,
  Loader2,
  RefreshCcw,
  Stethoscope,
  Phone,
  Save,
  ShieldCheck,
  User as UserIcon,
  Activity,
  Edit2,
  Trash2,
  Printer,
  Eye,
  EyeOff,
  Copy,
  Check,
} from "lucide-react";
import { userService } from "../services/user.service";
import { useNotification } from "../context/NotificationContext";

interface StaffUser {
  id: number;
  username: string;
  email: string | null;
  first_name: string;
  last_name: string;
  is_active: number;
}

const StaffDirectory: React.FC = () => {
  const { notify } = useNotification();
  const [searchTerm, setSearchTerm] = useState("");
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [specializations, setSpecializations] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  // Password Reset State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [pendingLockAction, setPendingLockAction] = useState<"lock" | "unlock" | null>(null);

  const closeProfileModal = () => {
    setSelectedUser(null);
    setPendingLockAction(null);
  };

  const generateSecurePassword = (user: any) => {
    let baseName = user?.first_name || user?.last_name || user?.username || "Admin";
    baseName = baseName.trim().replace(/[^a-zA-Z0-9]/g, "");
    if (baseName.length > 0) {
      baseName = baseName.charAt(0).toUpperCase() + baseName.slice(1).toLowerCase();
    } else {
      baseName = "Admin";
    }
    const digits = Math.floor(100 + Math.random() * 900);
    const specials = ["@", "#", "$", "%", "*"];
    const special = specials[Math.floor(Math.random() * specials.length)];
    return `${baseName}${special}${digits}`;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordValue.trim()) {
      notify("Password cannot be empty", "error");
      return;
    }
    setIsResettingPassword(true);
    try {
      await userService.resetPassword(selectedUser.id, resetPasswordValue);
      notify("Password reset successfully", "success");
      setShowResetModal(false);
    } catch (err: any) {
      notify(err.response?.data?.message || "Password reset failed", "error");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleToggleLock = async () => {
    if (!selectedUser) return;
    setIsLocking(true);
    const action = selectedUser.is_active === 1 ? "lock" : "unlock";
    try {
      if (action === "lock") {
        await userService.lockUser(selectedUser.id);
        notify("Account locked successfully", "success");
      } else {
        await userService.unlockUser(selectedUser.id);
        notify("Account unlocked successfully", "success");
      }
      await handleOpenUser(selectedUser.id);
      fetchData();
    } catch (err: any) {
      notify(err.response?.data?.message || `Failed to ${action} account`, "error");
    } finally {
      setIsLocking(false);
    }
  };

  // Create User Form State
  const [isDoctor, setIsDoctor] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formState, setFormState] = useState({
    username: "",
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    password: "",
    role_id: 4, // Default to user
    staff_id: "",
    specialization_id: "",
    // doctor_code removed as backend handles it
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [users, specs, rolesList] = await Promise.all([
        userService.listUsers(),
        userService.getSpecializations(),
        userService.getRoles(),
      ]);
      setStaffList(users);
      setSpecializations(specs);
      setRoles(rolesList);
    } catch (err) {
      notify("Failed to load system directory", "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenUser = async (id: number) => {
    setLoading(true);
    try {
      const data = await userService.getUserById(id);
      setSelectedUser(data);
    } catch (err) {
      notify("Failed to fetch user details", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Build payload base
      const payload: any = {
        username: formState.username,
        first_name: formState.first_name,
        last_name: formState.last_name,
        role_id: isDoctor ? 8 : formState.role_id,
        staff_id: formState.staff_id,
        phone: formState.phone,
        email: formState.email,
        password: formState.password,
      };

      if (isDoctor) {
        payload.specialization_id = parseInt(formState.specialization_id);
        // doctor_code removed from payload
      }

      await userService.createUser(payload);
      notify(
        `${isDoctor ? "Doctor" : "Staff"} account provisioned successfully`,
        "success",
      );
      setShowAddModal(false);
      fetchData();
    } catch (err: any) {
      notify(err.response?.data?.message || "Provisioning failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStaff = staffList.filter(
    (u) =>
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.last_name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      {/* Action Bar */}
      <div className="bg-white p-4 rounded-[32px] border border-slate-200 flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
          <input
            type="text"
            placeholder="Search directory by username or name..."
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-slate-900/5 outline-none transition-all font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-3.5 bg-white border border-slate-200 text-slate-400 hover:text-brand-primary rounded-2xl transition-all"
          >
            <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => {
              setIsDoctor(false);
              setShowAddModal(true);
            }}
            className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg active:scale-95 text-xs uppercase tracking-widest"
          >
            <UserPlus size={18} /> Enroll Staff
          </button>
          <button
            onClick={() => {
              setIsDoctor(true);
              setShowAddModal(true);
            }}
            className="bg-brand-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-brand-primary transition-all shadow-lg active:scale-95 text-xs uppercase tracking-widest"
          >
            <Stethoscope size={18} /> Enroll Doctor
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* User Table */}
        <div className="bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-sm h-fit">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="px-8 py-5">Full Name</th>
                  <th className="px-8 py-5">System Handle</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Operational Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading && filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-20 text-center">
                      <Loader2
                        size={32}
                        className="animate-spin text-brand-primary mx-auto mb-4"
                      />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Syncing Identity Records...
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                      onClick={() => handleOpenUser(user.id)}
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-xs text-slate-500 group-hover:bg-slate-800 group-hover:text-white transition-all`}
                          >
                            {user.first_name.charAt(0)}
                            {user.last_name.charAt(0)}
                          </div>
                          <p className="text-sm font-black text-slate-800">
                            {user.first_name} {user.last_name}
                          </p>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-[10px] font-mono font-bold text-brand-primary bg-brand-active px-2 py-1 rounded border border-brand-active">
                          {user.username}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <span
                          className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border
                        ${user.is_active === 1 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"}
                      `}
                        >
                          {user.is_active === 1 ? "Active" : "Locked"}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button className="text-[10px] font-black text-brand-primary uppercase hover:underline">
                          View Profile
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Selected User Profile Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={closeProfileModal} />
          <div className="relative bg-white w-full max-w-2xl border border-slate-200 rounded-[44px] shadow-2xl p-10 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start mb-8">
              <div className="flex gap-6 items-center">
                 <div className="w-24 h-24 bg-[#2d258a] rounded-[32px] flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-brand-active">
                   {selectedUser.first_name.charAt(0)}
                   {selectedUser.last_name.charAt(0)}
                 </div>
                 <div>
                   <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                     {selectedUser.first_name} {selectedUser.last_name}
                   </h3>
                   <p className="text-xs font-bold text-brand-primary uppercase tracking-[0.2em] mt-1 bg-brand-active px-3 py-1 rounded inline-block border border-brand-active">
                     SYSTEM ID: {selectedUser.username}
                   </p>
                 </div>
              </div>
              <button
                onClick={closeProfileModal}
                className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-8">
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center gap-4">
                  <div className="p-3 bg-white rounded-xl shadow-sm text-slate-400">
                    <Mail size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Email Address
                    </p>
                    <p className="text-sm font-bold text-slate-700 truncate w-32 md:w-auto">
                      {selectedUser.email || "Not Provided"}
                    </p>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center gap-4">
                  <div className="p-3 bg-white rounded-xl shadow-sm text-slate-400">
                    <Phone size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Phone Number
                    </p>
                    <p className="text-sm font-bold text-slate-700">
                      {selectedUser.phone || "--"}
                    </p>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center gap-4 col-span-2">
                  <div className="p-3 bg-white rounded-xl shadow-sm text-slate-400">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="flex-1 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Staff ID Position
                        </p>
                        <p className="text-sm font-bold text-slate-700">
                          {selectedUser.staff_id || "Global System Account"}
                        </p>
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Date provisioned
                         </p>
                         <p className="text-xs font-black text-slate-600">
                            {new Date(selectedUser.created_at).toLocaleDateString()}
                         </p>
                      </div>
                  </div>
                </div>
              </div>

              {pendingLockAction ? (
                <div className="pt-6 border-t border-slate-100 space-y-4 animate-in fade-in duration-300">
                  <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center gap-3">
                    <AlertCircle className="text-amber-600 flex-shrink-0" size={20} />
                    <p className="text-[10px] text-amber-800 font-bold uppercase tracking-tight">
                      Are you sure you want to {pendingLockAction} {selectedUser.first_name}'s account?
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setPendingLockAction(null)}
                      className="flex-1 py-4 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                      disabled={isLocking}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await handleToggleLock();
                        setPendingLockAction(null);
                      }}
                      disabled={isLocking}
                      className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-white shadow-lg disabled:opacity-50
                        ${pendingLockAction === "lock"
                          ? "bg-rose-600 hover:bg-rose-700 shadow-rose-100"
                          : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100"
                        }
                      `}
                    >
                      {isLocking ? "Processing..." : `Yes, ${pendingLockAction}`}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 pt-6 border-t border-slate-100">
                  <button 
                    onClick={() => window.open(`/print/staff-id/${selectedUser.id}`, '_blank')}
                    className="py-4 bg-[#2d258a] hover:bg-brand-primary text-white shadow-xl shadow-brand-active rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex justify-center items-center gap-2 active:scale-95"
                  >
                    <Printer size={16} /> Print ID
                  </button>
                  <button
                    onClick={() => {
                      setResetPasswordValue("");
                      setShowPasswordText(false);
                      setCopied(false);
                      setShowResetModal(true);
                    }}
                    className="py-4 bg-slate-50 hover:bg-slate-100/80 text-brand-primary rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Reset Password
                  </button>
                  <button
                    onClick={() => setPendingLockAction(selectedUser.is_active === 1 ? "lock" : "unlock")}
                    className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all
                      ${selectedUser.is_active === 1
                        ? "bg-rose-50 hover:bg-rose-100/80 text-rose-600"
                        : "bg-emerald-50 hover:bg-emerald-100/80 text-emerald-600"
                      }
                    `}
                  >
                    {selectedUser.is_active === 1 ? "Lock Account" : "Unlock Account"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && selectedUser && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            onClick={() => !isResettingPassword && setShowResetModal(false)}
          />
          <form
            onSubmit={handleResetPassword}
            className="relative bg-white w-full max-w-md rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
          >
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-brand-primary text-white rounded-2xl shadow-lg shadow-brand-active">
                  <Lock size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">
                    Reset Password
                  </h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                    {selectedUser.first_name} {selectedUser.last_name} ({selectedUser.username})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
                disabled={isResettingPassword}
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"
                  />
                  <input
                    required
                    type={showPasswordText ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-24 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none transition-all"
                    value={resetPasswordValue}
                    onChange={(e) => setResetPasswordValue(e.target.value)}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPasswordText(!showPasswordText)}
                      className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                      title={showPasswordText ? "Hide Password" : "Show Password"}
                    >
                      {showPasswordText ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    {resetPasswordValue && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(resetPasswordValue);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                        title="Copy Password"
                      >
                        {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const generated = generateSecurePassword(selectedUser);
                    setResetPasswordValue(generated);
                    setShowPasswordText(true);
                  }}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Generate Password
                </button>
              </div>

              <div className="bg-amber-50 border border-amber-100 p-6 rounded-[32px] flex items-start gap-4">
                <AlertCircle
                  size={24}
                  className="text-amber-600 flex-shrink-0"
                />
                <p className="text-[10px] text-amber-800 font-bold uppercase tracking-tight leading-relaxed">
                  Resetting the password takes effect immediately. Please copy or remember the password before saving.
                </p>
              </div>
            </div>

            <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-800"
                disabled={isResettingPassword}
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={isResettingPassword}
                className="px-12 py-5 bg-[#2d258a] hover:bg-brand-primary text-white shadow-xl shadow-brand-active rounded-[24px] font-black uppercase text-xs tracking-widest transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50"
              >
                {isResettingPassword ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                {isResettingPassword ? "Updating..." : "Save Password"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Enrollment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            onClick={() => !isSubmitting && setShowAddModal(false)}
          />
          <form
            onSubmit={handleCreateAccount}
            className="relative bg-white w-full max-w-xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
          >
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div
                  className={`p-3 text-white rounded-2xl shadow-lg ${isDoctor ? "bg-brand-primary shadow-brand-active" : "bg-slate-900 shadow-slate-200"}`}
                >
                  {isDoctor ? (
                    <Stethoscope size={24} />
                  ) : (
                    <UserPlus size={24} />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">
                    Provision {isDoctor ? "Doctor" : "Staff"} Node
                  </h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                    Identity Enrollment Protocol
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-10 space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Username (Login Handle)
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. jsmith"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none transition-all"
                    value={formState.username}
                    onChange={(e) =>
                      setFormState({ ...formState, username: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Staff Role Level
                  </label>
                  <select
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none"
                    value={isDoctor ? 8 : formState.role_id}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        role_id: parseInt(e.target.value),
                      })
                    }
                    disabled={isDoctor}
                  >
                    <option value="">Select a role...</option>
                    {roles.length > 0 ? (
                      roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name
                            .split("_")
                            .map(
                              (word) =>
                                word.charAt(0).toUpperCase() + word.slice(1),
                            )
                            .join(" ")}{" "}
                          {role.description && `- ${role.description}`}
                        </option>
                      ))
                    ) : (
                      <option disabled>Loading roles...</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    First Name
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white transition-all outline-none"
                    value={formState.first_name}
                    onChange={(e) =>
                      setFormState({ ...formState, first_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Last Name
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white transition-all outline-none"
                    value={formState.last_name}
                    onChange={(e) =>
                      setFormState({ ...formState, last_name: e.target.value })
                    }
                  />
                </div>
              </div>

              {!isDoctor && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Designation / Staff Title
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Senior Medical Officer"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none transition-all"
                    value={formState.staff_id}
                    onChange={(e) =>
                      setFormState({ ...formState, staff_id: e.target.value })
                    }
                  />
                </div>
              )}

              {/* Standard Account Details (Required for both) */}
              <div className="grid grid-cols-2 gap-6 animate-in slide-in-from-bottom-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Mobile Access Phone
                  </label>
                  <input
                    type="tel"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none"
                    value={formState.phone}
                    onChange={(e) =>
                      setFormState({ ...formState, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Work Email
                  </label>
                  <input
                    type="email"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none"
                    value={formState.email}
                    onChange={(e) =>
                      setFormState({ ...formState, email: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2 animate-in slide-in-from-bottom-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Access Password
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"
                  />
                  <input
                    required
                    type="password"
                    placeholder="••••••••"
                    className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none"
                    value={formState.password}
                    onChange={(e) =>
                      setFormState({ ...formState, password: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Doctor Specific Fields */}
              {isDoctor && (
                <div className="space-y-6 animate-in slide-in-from-bottom-2 p-6 bg-brand-active/50 rounded-[24px] border border-brand-active">
                  <h3 className="text-xs font-black text-brand-primary uppercase tracking-widest">
                    Clinical Profile
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Clinical Specialization
                      </label>
                      <select
                        required
                        className="w-full px-5 py-4 bg-white border border-brand-active rounded-2xl text-sm font-bold outline-none appearance-none focus:ring-4 focus:ring-brand-active0/10"
                        value={formState.specialization_id}
                        onChange={(e) =>
                          setFormState({
                            ...formState,
                            specialization_id: e.target.value,
                          })
                        }
                      >
                        <option value="">Select Specialization...</option>
                        {specializations.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Staff ID / Code
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. GSH-002"
                        className="w-full px-5 py-4 bg-white border border-brand-active rounded-2xl text-sm font-bold focus:ring-4 focus:ring-brand-active0/10 outline-none transition-all"
                        value={formState.staff_id}
                        onChange={(e) =>
                          setFormState({
                            ...formState,
                            staff_id: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-100 p-6 rounded-[32px] flex items-start gap-4">
                <AlertCircle
                  size={24}
                  className="text-amber-600 flex-shrink-0"
                />
                <p className="text-[10px] text-amber-800 font-bold uppercase tracking-tight leading-relaxed">
                  Accounts provisioned here are immediately logged in the
                  forensic audit trail. Ensure credentials follow hospital
                  security hardening standards.
                </p>
              </div>
            </div>

            <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-800"
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-12 py-5 rounded-[24px] font-black uppercase text-xs tracking-widest shadow-2xl transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50
                  ${isDoctor ? "bg-brand-primary text-white shadow-brand-active hover:bg-brand-primary" : "bg-slate-900 text-white shadow-slate-200 hover:bg-slate-800"}
                `}
              >
                {isSubmitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                {isSubmitting ? "Syncing..." : "Provision Node"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default StaffDirectory;
