import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { appointmentService } from '../services/appointment.service';
import PrintTemplate from './PrintTemplate';
import { Loader2, AlertTriangle, Printer, Calendar, Clock, MapPin, User } from 'lucide-react';

const AppointmentPrintView: React.FC = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!appointmentId) return;
      try {
        const result = await appointmentService.listAppointments({ id: parseInt(appointmentId) });
        if (result && result.length > 0) {
            setData(result[0]);
            setTimeout(() => {
               window.print();
            }, 1000);
        } else {
            setError('Appointment not found.');
        }
      } catch (err) {
        setError('Could not load appointment details.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [appointmentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 size={48} className="animate-spin text-[#3B309A]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
         <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
            <AlertTriangle size={32} className="text-red-600 mx-auto mb-4" />
            <p className="text-slate-500">{error || 'Data unavailable.'}</p>
         </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-100 h-screen w-full overflow-y-auto print:bg-white print:h-auto print:overflow-visible no-scrollbar">
      <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-8 print:hidden z-50 shadow-md">
         <p className="font-bold text-sm">Appointment Slip Preview</p>
         <button onClick={() => window.print()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all">
           <Printer size={16} /> Print Now
         </button>
      </div>

      <div className="pt-20 pb-10 print:pt-0 print:pb-0">
        <PrintTemplate title="Appointment Confirmation" subtitle={`Ref: ${data.appointment_code || data.id}`}>
          <div className="space-y-8">
             <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center print:border-slate-300">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-4">Scheduled Date & Time</p>
                <h3 className="text-4xl font-black text-[#3B309A] mb-2">
                    {new Date(data.appointment_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </h3>
                <div className="flex items-center justify-center gap-2 text-xl font-bold text-slate-700 mt-4">
                    <Clock size={24} className="text-emerald-600" />
                    {data.appointment_time?.substring(0, 5)}
                    <span className="text-xs font-bold text-slate-400 uppercase ml-2 px-2 py-0.5 border border-slate-200 rounded-lg">
                      {data.booking_type === 'WALK_IN' ? 'Walk-In' : 'Pre-Booked'}
                    </span>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-8">
                <div className="space-y-6">
                    <h4 className="text-sm font-black text-[#3B309A] uppercase tracking-widest border-b border-slate-200 pb-2">Patient Information</h4>
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Name</p>
                            <p className="text-lg font-bold text-slate-900">{data.patient_first} {data.patient_last}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">MRN</p>
                                <p className="text-sm font-black text-brand-primary font-mono tracking-tighter">{data.mrn}</p>
                            </div>
                            <div className="space-y-1 text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gender / Age</p>
                                <p className="text-sm font-bold text-slate-700">{data.gender || '--'} / {data.display_age || data.age_years + 'y'}</p>
                            </div>
                        </div>
                        <div className="space-y-1 pt-2 border-t border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment / Payer</p>
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-bold text-slate-700">{data.payer_type || 'Private'}</p>
                                <p className="text-xs font-medium text-slate-500">{data.payer_name}</p>
                            </div>
                            {Number(data.outstanding_amount) > 0 && (
                                <p className="text-[10px] font-black text-rose-500 uppercase mt-1">Outstanding: {data.outstanding_amount}</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <h4 className="text-sm font-black text-[#3B309A] uppercase tracking-widest border-b border-slate-200 pb-2">Medical Provider</h4>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Consultant</p>
                            <p className="text-lg font-bold text-slate-900">Dr. {data.doctor_first} {data.doctor_last}</p>
                            {data.doctor_code && <p className="text-[10px] font-bold text-slate-400">{data.doctor_code}</p>}
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Specialization</p>
                            <p className="text-sm font-bold text-slate-700">{data.specialization_name || 'General Practice'}</p>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg flex items-center gap-3">
                            <User size={16} className="text-emerald-600" />
                            <div>
                                <p className="text-[10px] font-black text-emerald-800 uppercase tracking-[0.2em] leading-none mb-1">Status</p>
                                <p className="text-sm font-black text-emerald-900 uppercase tracking-widest leading-none">Registered</p>
                            </div>
                        </div>
                    </div>
                </div>
             </div>

             <div className="bg-brand-active border border-brand-active p-6 rounded-2xl print:border-slate-300">
                <h4 className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] mb-3 print:text-slate-800 ml-1">Clinical Note / Reason for Visit</h4>
                <div className="bg-white/60 p-4 rounded-xl border border-brand-active/50 min-h-[80px]">
                    <p className="text-sm font-bold text-brand-primary print:text-slate-900 italic">{data.reason_for_visit || 'Routine Consultation / General Checkup'}</p>
                </div>
             </div>

             <div className="mt-12 text-center space-y-4 border-t border-slate-100 pt-8">
                <div className="flex items-center justify-center gap-8 mb-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <MapPin size={14} className="text-brand-primary" /> Ground Floor, OPD Desk
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <Calendar size={14} className="text-brand-primary" /> Valid for Appointment Date Only
                    </div>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">*** Please present this slip at the reception ***</p>
             </div>
          </div>
        </PrintTemplate>
      </div>
    </div>
  );
};

export default AppointmentPrintView;
