import React, { useEffect, useState } from "react";
import {
  User,
  Lock,
  Key,
  CheckCircle2,
  Mail,
  Fingerprint,
  Eye,
  EyeOff,
  ShieldCheck,
  LayoutDashboard,
} from "lucide-react";
import { authService } from "../services/auth.service";
import { useNotification } from "../context/NotificationContext";
import PasswordValidator from "./shared/PasswordValidator";

const UserProfile: React.FC = () => {
  const { notify } = useNotification();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Visibility States
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Change Password State
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [isPassValid, setIsPassValid] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await authService.getMe();
        setUserData(data);
      } catch (err) {
        notify("Failed to load profile data", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [notify]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      notify("New passwords do not match", "error");
      return;
    }
    if (!isPassValid) {
      notify("Password does not meet security requirements", "error");
      return;
    }

    setSubmitting(true);
    try {
      await authService.changePassword(passwords.current, passwords.new);
      notify("Password updated successfully", "success");
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (err) {
      notify("Failed to update password", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-10 animate-in fade-in duration-500">
      {/* Profile Header — Integrated & Premium */}
      <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
        <div className="h-36 bg-gradient-to-r from-brand-primary via-indigo-600 to-violet-700 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 transition-transform hover:scale-110 duration-1000">
            <div className="absolute top-0 left-0 w-32 h-32 bg-white/20 blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/10 blur-3xl translate-x-1/4 translate-y-1/4"></div>
          </div>
        </div>
        <div className="px-6 pb-6 -mt-10 flex flex-col md:flex-row items-end gap-5">
          <div className="w-24 h-24 rounded-[24px] bg-gradient-to-br from-brand-primary to-indigo-700 shadow-xl border border-white/20 relative group flex items-center justify-center">
            <span className="text-3xl font-black text-white tracking-tighter">
              {userData.username.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 pb-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                {userData.username}
              </h1>
              <span className="px-2.5 py-0.5 bg-brand-active text-brand-primary text-[10px] font-black uppercase tracking-widest rounded-full border border-brand-active">
                {userData.roles[0]?.name || "N/A"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <p className="text-xs text-slate-500 font-bold flex items-center gap-1.5">
                <Mail size={12} className="text-slate-400" /> Gracespring Identity
                Account
              </p>
              <p className="text-xs text-slate-500 font-bold flex items-center gap-1.5">
                <ShieldCheck size={12} className="text-emerald-500" /> Active
                Session
              </p>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 mb-1">
            <Fingerprint size={16} className="text-brand-active0" />
            <div className="text-left">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                System ID
              </p>
              <p className="text-xs font-black mono tracking-wider text-slate-700">
                #USR-00{userData.id}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Account Quick Stats */}
        <div className="bg-white rounded-[28px] border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-brand-active text-brand-primary rounded-xl flex items-center justify-center">
              <LayoutDashboard size={16} />
            </div>
            <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest">
              Account Overview
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                label: "Username",
                value: userData.username,
                color: "text-slate-800",
              },
              {
                label: "Role Authority",
                value: userData.roles.map((r: any) => r.name || r).join(", "),
                color: "text-brand-primary",
              },
              {
                label: "Access Tier",
                value: "Enterprise Grade",
                color: "text-slate-800",
              },
              {
                label: "Last Sync",
                value: "Less than 1m ago",
                color: "text-slate-500",
              },
            ].map((stat, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-50 transition-all hover:border-slate-200 group"
              >
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  {stat.label}
                </span>
                <span
                  className={`text-xs font-black ${stat.color} group-hover:scale-105 transition-transform origin-right`}
                >
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-white rounded-[28px] border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <Lock size={16} />
            </div>
            <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest">
              Security Credentials
            </h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Current Password
              </label>
              <div className="relative group">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-3.5 h-3.5 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type={showCurrent ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-200 transition-all font-mono"
                  value={passwords.current}
                  onChange={(e) =>
                    setPasswords({ ...passwords, current: e.target.value })
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  New Password
                </label>
                <div className="relative group">
                  <input
                    type={showNew ? "text" : "password"}
                    required
                    placeholder="New auth key"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-200 transition-all font-mono"
                    value={passwords.new}
                    onChange={(e) =>
                      setPasswords({ ...passwords, new: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
                  >
                    {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Confirm Secret
                </label>
                <div className="relative group">
                  <input
                    type={showConfirm ? "text" : "password"}
                    required
                    placeholder="Repeat key"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-200 transition-all font-mono"
                    value={passwords.confirm}
                    onChange={(e) =>
                      setPasswords({ ...passwords, confirm: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
                  >
                    {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <PasswordValidator
              password={passwords.new}
              onValidChange={setIsPassValid}
            />

            <button
              disabled={
                submitting ||
                !isPassValid ||
                !passwords.current ||
                passwords.new !== passwords.confirm
              }
              className="w-full py-3 bg-slate-900 disabled:bg-slate-200 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-slate-200/50 flex items-center justify-center gap-2 mt-4 hover:bg-slate-800"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  Update Security Gateway <CheckCircle2 size={14} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
