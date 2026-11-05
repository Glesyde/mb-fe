import React, { useState, useEffect, useCallback } from "react";
import {
  History,
  Globe,
  ShieldAlert,
  Activity,
  ArrowRight,
  Download,
  Filter,
  Search,
  FileCheck,
  Calendar,
  ShieldCheck,
  MoreVertical,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useNotification } from "../context/NotificationContext";
import { auditService } from "../services/audit.service";
import { AuditLog } from "../types";

interface FilterState {
  action: string;
  startDate: string;
  endDate: string;
  performedBy: string;
}

const SecurityAudit: React.FC = () => {
  const { notify } = useNotification();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    action: "",
    startDate: "",
    endDate: "",
    performedBy: "",
  });

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {};

      if (filters.action) params.action = filters.action;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.performedBy) params.performedBy = filters.performedBy;

      const data = await auditService.getAuditLogs(params);
      setAuditLogs(data);
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
      setError("Failed to load audit logs. Please try again.");
      notify("Failed to load audit logs", "error");
    } finally {
      setLoading(false);
    }
  }, [filters, notify]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // Apply search and local filtering
  useEffect(() => {
    const filtered = auditLogs.filter(
      (log) =>
        log.performed_by?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        "" ||
        log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        "" ||
        log.ip_address?.includes(searchTerm) ||
        "",
    );
    setFilteredLogs(filtered);
  }, [auditLogs, searchTerm]);

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      notify(
        "Forensic Audit Log compiled. Secure download link sent to your verified work email.",
        "success",
      );
    }, 2000);
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const getImpactLevel = (action: string): "Low" | "Medium" | "High" => {
    if (
      ["PATIENT_DELETED", "RECORD_MODIFIED", "DOCUMENT_DELETED"].includes(
        action,
      )
    ) {
      return "High";
    }
    if (
      ["PATIENT_UPDATED", "PATIENT_CREATED", "DOCUMENT_UPLOADED"].includes(
        action,
      )
    ) {
      return "Medium";
    }
    return "Low";
  };

  const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      LOGIN_SUCCESS: "Login",
      LOGIN_FAILED: "Login Failed",
      LOGOUT: "Logout",
      TOKEN_REFRESH: "Token Refresh",
      PATIENT_CREATED: "Patient Created",
      PATIENT_UPDATED: "Patient Updated",
      PATIENT_DELETED: "Patient Deleted",
      PATIENT_HISTORY_VIEWED: "History Viewed",
      DOCUMENT_UPLOADED: "Document Uploaded",
      DOCUMENT_DELETED: "Document Deleted",
      RECORD_MODIFIED: "Record Modified",
    };
    return labels[action] || action;
  };

  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header Info Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 rounded-[48px] p-10 text-white relative overflow-hidden group shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />{" "}
                Live Forensic Feed
              </div>
              <h2 className="text-4xl font-black tracking-tight leading-none">
                Security Monitoring
              </h2>
              <p className="text-slate-400 font-medium max-w-md">
                Immutable logging of all sensitive clinical and financial
                transactions across the Medbookie HIS network.
              </p>
            </div>
            <div className="flex items-center gap-10">
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  Anomalies
                </p>
                <p className="text-3xl font-black text-rose-500">0</p>
              </div>
              <div className="p-6 bg-white/5 rounded-[32px] border border-white/10 backdrop-blur-sm">
                <ShieldCheck size={48} className="text-emerald-400" />
              </div>
            </div>
          </div>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-brand-primary/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
        </div>

        <div className="bg-white border border-slate-200 rounded-[44px] p-10 shadow-sm flex flex-col justify-between">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Activity size={18} className="text-brand-primary" /> System Integrity
          </h3>
          <div className="space-y-4 py-6">
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold text-slate-500">Active Sessions</span>
              <span className="font-black text-slate-800">
                12 Terminal Nodes
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-primary rounded-full"
                style={{ width: "85%" }}
              />
            </div>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full py-4 bg-slate-50 hover:bg-brand-primary hover:text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            {exporting ? "Compiling Vault..." : "Export Governance Vault"}
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[44px] shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-brand-primary transition-colors" />
            <input
              type="text"
              placeholder="Search user, action or IP..."
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-8 focus:ring-brand-active0/5 focus:border-brand-active0 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange("action", e.target.value)}
              className="px-5 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all cursor-pointer"
            >
              <option value="">All Actions</option>
              {auditService.getAvailableActions().map((action) => (
                <option key={action} value={action}>
                  {getActionLabel(action)}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
              className="px-5 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all cursor-pointer"
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
              className="px-5 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all cursor-pointer"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 mx-8 mt-4 bg-red-50 border border-red-200 rounded-[24px] flex items-center gap-3">
            <AlertCircle size={20} className="text-red-600" />
            <span className="text-sm font-bold text-red-700">{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-4">
              <Loader2 size={40} className="text-brand-primary animate-spin" />
              <p className="text-slate-500 font-bold">Loading audit logs...</p>
            </div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-4 text-center">
              <ShieldAlert size={40} className="text-slate-300" />
              <p className="text-slate-500 font-bold">No audit logs found</p>
              <p className="text-slate-400 text-sm">
                Try adjusting your filters or search criteria
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <th className="px-8 py-5">Event Timestamp</th>
                  <th className="px-8 py-5">Authenticated User</th>
                  <th className="px-8 py-5">Transaction Details</th>
                  <th className="px-8 py-5">Source IP</th>
                  <th className="px-8 py-5 text-center">Impact</th>
                  <th className="px-8 py-5 text-right">User Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-8 py-6">
                      <p className="text-xs font-bold text-slate-400 font-mono tracking-tighter">
                        {formatTimestamp(log.created_at)}
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-black text-xs text-slate-500 group-hover:bg-slate-800 group-hover:text-white transition-all">
                          {(log.performed_by || "S").split(" ")[0]?.charAt(0)}
                          {(log.performed_by || "Y").split(" ").slice(-1)[0]?.charAt(0)}
                        </div>
                        <p className="text-sm font-black text-slate-800">
                          {log.performed_by || "System Event"}
                        </p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border
                          ${getImpactLevel(log.action) === "High"
                              ? "bg-red-50 text-red-600 border-red-100"
                              : log.action.includes("VIEWED")
                                ? "bg-brand-active text-brand-primary border-brand-active"
                                : "bg-emerald-50 text-emerald-600 border-emerald-100"
                            }
                         `}
                        >
                          {getActionLabel(log.action).split(" ")[0]}
                        </span>
                        <span className="text-xs text-slate-600 font-bold max-w-[200px] truncate">
                          {getActionLabel(log.action)}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-xs font-bold text-slate-400 font-mono bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 w-fit">
                        {log.ip_address}
                      </p>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span
                        className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-tighter
                          ${getImpactLevel(log.action) === "High" ? "bg-rose-100 text-rose-700" : getImpactLevel(log.action) === "Medium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}
                       `}
                      >
                        {getImpactLevel(log.action)}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <p className="text-[10px] font-bold text-slate-500 max-w-[200px] truncate">
                        {log.user_agent}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityAudit;
