import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NAV_PERMISSION_RULES } from "../services/constants";
import {
  Users,
  FileText,
  FlaskConical,
  Pill,
  Activity,
  Bed,
  Ambulance,
  Package,
  BarChart3,
  CreditCard,
  ArrowRight,
  Stethoscope,
} from "lucide-react";

const ALL_MODULES = [
  { id: "patients", label: "Patient Admin", path: "/patients/search", icon: Users, color: "blue", description: "Register & search patients" },
  { id: "emr", label: "EMR", path: "/emr/worklist", icon: FileText, color: "teal", description: "My clinical worklist" },
  { id: "lab", label: "Laboratory", path: "/lab/worklist", icon: FlaskConical, color: "purple", description: "Lab orders & results" },
  { id: "pharmacy", label: "Pharmacy", path: "/pharmacy/queue", icon: Pill, color: "emerald", description: "Dispensing queue" },
  { id: "theatre", label: "Theatre", path: "/theatre/schedule", icon: Activity, color: "rose", description: "Surgical scheduling" },
  { id: "ward", label: "Ward", path: "/ward/beds", icon: Bed, color: "sky", description: "Bed management & nursing" },
  { id: "emergency", label: "Emergency", path: "/emergency/floor", icon: Ambulance, color: "red", description: "Triage & EDfloor" },
  { id: "inventory", label: "Inventory", path: "/inventory/stock", icon: Package, color: "amber", description: "Stock & requisitions" },
  { id: "billing", label: "Billing", path: "/billing/opd", icon: CreditCard, color: "indigo", description: "Invoices & payments" },
  { id: "reporting", label: "Reporting", path: "/reports/overview", icon: BarChart3, color: "slate", description: "Analytics & reports" },
];

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: "bg-brand-active", text: "text-brand-primary", border: "border-brand-active" },
  teal: { bg: "bg-teal-50", text: "text-teal-600", border: "border-teal-100" },
  purple: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-100" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
  rose: { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-100" },
  sky: { bg: "bg-sky-50", text: "text-sky-600", border: "border-sky-100" },
  red: { bg: "bg-red-50", text: "text-red-600", border: "border-red-100" },
  amber: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100" },
  indigo: { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100" },
  slate: { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200" },
};

const greetingHour = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const Dashboard: React.FC = () => {
  const { user, hasPermission, hasAnyPermission } = useAuth();
  const navigate = useNavigate();

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-NG", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });

  const allowedModules = ALL_MODULES.filter((mod) => {
    const rules = NAV_PERMISSION_RULES[mod.id] || [];
    if (rules.length === 0) return true;
    return hasAnyPermission(rules);
  });

  return (
    <div className="min-h-[80vh] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700 pb-16">
      {/* Hero Welcome Section */}
    
      {/* Footer tagline */}
      <div className="mt-auto pt-12 text-center">
        <p className="text-xs text-slate-300 font-medium uppercase tracking-widest">
          Medbookie Information System · Secure · Real-time · HL7 Ready copyright 2026
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
