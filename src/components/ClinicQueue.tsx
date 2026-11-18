
import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  MoreVertical,
  Clock,
  UserCheck,
  Stethoscope,
  Activity,
  Timer,
  Filter,
  ArrowUpRight,
  CheckCircle2,
  Loader2,
  CalendarDays,
  Printer
} from 'lucide-react';
import { appointmentService } from '../services/appointment.service';
import { useNotification } from '../context/NotificationContext';
import { i18n } from "../i18n";

const ClinicQueue: React.FC = () => {
  const { notify } = useNotification();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecName, setSelectedSpecName] = useState<string>('');
  const [specializations, setSpecializations] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAllHistory, setShowAllHistory] = useState(false);

  useEffect(() => {
    const fetchSpecs = async () => {
      try {
        const data = await appointmentService.getSpecializations();
        setSpecializations(data);
      } catch (err) {
        console.error('Failed to fetch specializations', err);
      }
    };
    fetchSpecs();
  }, []);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      // Build filters: when showAllHistory is true, omit date → GET /appointments
      const filters: Record<string, string> = {};
      if (!showAllHistory) filters.appointment_date = selectedDate;
      if (selectedSpecName) filters.specialization_name = selectedSpecName;
      const data = await appointmentService.listAppointments(filters);
      setAppointments(data);
    } catch (err) {
      notify('Failed to load clinic queue', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    // Poll every 60s (only on live/today view)
    if (!showAllHistory) {
      const interval = setInterval(fetchQueue, 60000);
      return () => clearInterval(interval);
    }
  }, [selectedDate, selectedSpecName, showAllHistory]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CHECKED_IN': return 'bg-brand-active text-brand-primary border-brand-active'; // Ready for consult
      case 'SCHEDULED': return 'bg-slate-100 text-slate-500 border-slate-200';
      case 'CONFIRMED': return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'IN_CONSULTATION': return 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse';
      case 'COMPLETED': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'NO_SHOW': return 'bg-red-50 text-red-600 border-red-100';
      case 'CANCELLED': return 'bg-gray-50 text-gray-400 border-gray-200';
      default: return 'bg-slate-50 text-slate-500';
    }
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '--:--';
    return timeStr.substring(0, 5); // "14:30:00" -> "14:30"
  };

  // Filter logic
  const filteredQueue = appointments.filter(appt => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${appt.patient_first} ${appt.patient_last}`.toLowerCase();
    const mrn = appt.mrn?.toLowerCase() || '';
    return fullName.includes(searchLower) || mrn.includes(searchLower);
  });

  // Stats
  const stats = {
    total: appointments.length,
    waiting: appointments.filter(a => ['CHECKED_IN', 'CONFIRMED'].includes(a.status)).length,
    inConsult: appointments.filter(a => a.status === 'IN_CONSULTATION').length,
    completed: appointments.filter(a => a.status === 'COMPLETED').length
  };

  const efficiency = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 100;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className={`p-2 rounded-xl ${showAllHistory ? 'bg-purple-50 text-purple-600' : 'bg-emerald-50 text-emerald-600'}`}>
              <Users size={24} />
            </div>
            {showAllHistory ? i18n.t("All Appointments") : i18n.t("Clinical Queue")}
          </h1>
          <p className="text-slate-500 font-medium">
            {showAllHistory
              ? i18n.t("Showing full appointment history across all dates.")
              : `Monitoring patient flow for ${new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.`}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* All History Toggle */}
          <button
            onClick={() => setShowAllHistory(p => !p)}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all shadow-sm ${
              showAllHistory
                ? 'bg-purple-600 text-white border-purple-700 shadow-purple-100'
                : 'bg-white text-slate-500 border-slate-200 hover:border-purple-200 hover:text-purple-600'
            }`}
          >
            <CalendarDays size={14} />
            {showAllHistory ? i18n.t("All History") : i18n.t("All History")}
          </button>
          {/* Date Picker — only shown when not in All History mode */}
          {!showAllHistory && (
            <input
              type="date"
              className="bg-white border border-slate-200 px-4 py-2 rounded-2xl text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          )}
          <div className={`bg-white border border-slate-200 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-sm`}>
            <div className={`w-2 h-2 rounded-full ${showAllHistory ? 'bg-purple-400' : 'bg-emerald-500 animate-pulse'}`} />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              {showAllHistory ? i18n.t("All History") : i18n.t("Live Updates")}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{i18n.t("Total Scheduled")}</p>
            <p className="text-xl font-black text-slate-800">{stats.total}</p>
          </div>
          <div className="p-2.5 bg-brand-active text-brand-primary rounded-xl"><Users size={20} /></div>
        </div>
        <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{i18n.t("Waiting Room")}</p>
            <p className="text-xl font-black text-amber-600">{stats.waiting}</p>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl"><Clock size={20} /></div>
        </div>
        <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{i18n.t("In Consult")}</p>
            <p className="text-xl font-black text-brand-primary">{stats.inConsult}</p>
          </div>
          <div className="p-2.5 bg-brand-active text-brand-primary rounded-xl"><Stethoscope size={20} /></div>
        </div>
        <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{i18n.t("Completion")}</p>
            <p className="text-xl font-black text-emerald-600">{efficiency}%</p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><Activity size={20} /></div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={i18n.t("Search queue by patient or MRN...")}
            className="w-full ps-11 pe-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Stethoscope className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <select
              className="ps-9 pe-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl outline-none appearance-none hover:bg-slate-50 transition-all cursor-pointer"
              value={selectedSpecName}
              onChange={(e) => setSelectedSpecName(e.target.value)}
            >
              <option value="">{i18n.t("All Specialties")}</option>
              {specializations.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
          <button onClick={fetchQueue} className="flex items-center gap-2 px-5 py-3 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all">
            <Activity size={16} className={loading ? "animate-spin" : ""} />{" "}{i18n.t("Refresh")}</button>
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm min-h-[400px]">
        {loading && appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 h-full">
            <Loader2 size={40} className="text-emerald-600 animate-spin mb-4" />
            <p className="text-slate-400 font-bold uppercase tracking-widest">{i18n.t("Loading Today's Queue...")}</p>
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 h-full opacity-60">
            <CalendarDays size={48} className="text-slate-300 mb-4" />
            <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">{i18n.t("No Appointments Found")}</h3>
            <p className="text-sm font-medium text-slate-400 mt-1">{i18n.t("There are no patients scheduled for")}{" "}{selectedDate}{" "}{i18n.t("matching your search.")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{i18n.t("Time / Sl.")}</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{i18n.t("Patient Details")}</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{i18n.t("Doctor / Specialty")}</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{i18n.t("Type")}</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{i18n.t("Current Status")}</th>
                  <th className="px-8 py-6 text-end text-[10px] font-black text-slate-400 uppercase tracking-widest">{i18n.t("Details")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredQueue.map((appt, i) => (
                  <tr key={appt.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-8 py-6">
                      <p className="text-sm font-black text-slate-800">{formatTime(appt.appointment_time)}- {appt.appointment_date}</p>
                      <p className="text-[10px] font-bold text-slate-400">{i18n.t("Position #")}{i + 1}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white ${appt.status === 'IN_CONSULTATION' ? 'bg-brand-primary animate-pulse' : 'bg-slate-200 text-slate-500'}`}>
                          {appt.patient_first?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800">{appt.patient_first} {appt.patient_last}</p>
                          <p className="text-[10px] font-mono font-bold text-brand-primary">{appt.mrn}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-bold text-slate-700">{i18n.t("Dr.")}{" "}{appt.doctor_first} {appt.doctor_last}</p>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {appt.specialization_name || i18n.t("General Practice")}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border
                        ${appt.booking_type === 'WALK_IN' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-brand-active text-brand-primary border-brand-active'}
                      `}>
                        {appt.booking_type?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border ${getStatusColor(appt.status)}`}>
                        {appt.status === 'IN_CONSULTATION' && <Timer size={14} className="animate-spin-slow" />}
                        {i18n.tv(appt.status)}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-end">
                      <button
                        onClick={() => window.open(`/print/appointment/${appt.id}`, '_blank')}
                        className="p-2 text-slate-300 hover:text-brand-primary rounded-xl transition-all"
                        title={i18n.t("Print Appointment Slip")}
                      >
                        <Printer size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-brand-active border border-brand-active p-8 rounded-[40px] flex items-start gap-4">
        <div className="p-3 bg-white text-brand-primary rounded-2xl shadow-sm border border-brand-active flex-shrink-0">
          <Activity size={24} />
        </div>
        <div>
          <h4 className="text-lg font-black text-brand-primary tracking-tight">{i18n.t("Clinical Flow")}</h4>
          <p className="text-sm text-brand-primary/80 leading-relaxed font-medium mt-1">{i18n.t("This board provides a read-only view of today's patient flow. Clinical actions such as starting a consultation, documenting encounters, or marking no-shows must be performed within the **EMR Module** or **Doctor Schedule**.")}</p>
          <button className="mt-4 flex items-center gap-2 text-xs font-black text-brand-primary hover:underline uppercase tracking-widest">{i18n.t("Go to EMR")}{" "}<ArrowUpRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClinicQueue;
