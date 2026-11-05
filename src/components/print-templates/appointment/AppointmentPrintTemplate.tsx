import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { appointmentService } from '../../../services/appointment.service';
import { Loader2, AlertTriangle, Printer, User, Calendar, Clock, MapPin, Activity } from 'lucide-react';

const AppointmentPrintTemplate: React.FC = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!appointmentId) throw new Error("No appointment ID provided");
        // The listAppointments service can take an ID filter
        const result = await appointmentService.listAppointments({ id: parseInt(appointmentId) });

        if (result && result.length > 0) {
          setData(result[0]);
          setTimeout(() => window.print(), 1000);
        } else {
          setError('Appointment not found.');
        }
      } catch (err) {
        setError('Could not load appointment data.');
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
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  const FormField = ({ label, value, colSpan = 1 }: { label: string; value?: string; colSpan?: number }) => (
    <div className={`col-span-${colSpan} mb-3`}>
      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
        {label}
      </p>
      <div className="w-full h-9 border border-slate-200 bg-slate-50/50 rounded flex items-center px-2 shadow-sm">
        <span className="text-sm font-bold text-slate-800 uppercase">{value || ''}</span>
      </div>
    </div>
  );

  const SectionHeader = ({ char, title }: { char: string; title: string }) => (
    <div className="w-full bg-[#3B309A] flex items-center mb-6 mt-8 rounded-sm">
      <div className="w-12 h-8 flex items-center justify-center text-white font-extrabold text-sm border-r border-[#4c3fbf]">
        {char}
      </div>
      <div className="pl-4 text-white font-extrabold text-[12px] uppercase tracking-widest">
        {title}
      </div>
    </div>
  );

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '--:--';
    return timeStr.substring(0, 5);
  };

  return (
    <div
      className="fixed inset-0 bg-slate-100 overflow-y-auto px-4 py-20 print:static print:bg-white print:p-0"
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-8 print:hidden z-[100] shadow-md">
        <p className="font-bold text-sm">Appointment Slip Preview</p>
        <button onClick={() => window.print()} className="bg-[#3B309A] hover:bg-brand-primary text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all">
          <Printer size={16} /> Print Slip
        </button>
      </div>

      <div className="w-[210mm] min-h-[297mm] bg-white p-12 shadow-2xl print:shadow-none print:m-0 print:border-none border border-slate-200 mx-auto transform-gpu transition-all">
        {/* Header Block */}
        <div className="w-full bg-[#3B309A] flex items-center p-4 min-h-[28mm]">
          <div className="w-[25%] flex items-center justify-center border-r-[1.5px] border-[#4c3fbf] pr-4 h-full">
            <img src="/assets/login-bg.jpeg" alt="Logo" className="w-[20mm] object-contain" />
          </div>
          <div className="w-[75%] pl-6 flex flex-col justify-center">
            <h1 className="text-white text-3xl font-extrabold leading-none tracking-tight mb-2 uppercase">
              Appointment Slip
            </h1>
            <p className="text-brand-active text-[10px] leading-tight">Official appointment confirmation. Please present this slip at the reception desk.</p>
          </div>
        </div>

        {/* Address Bar */}
        <div className="w-full text-center py-2 border-b border-slate-200 mb-8">
          <p className="text-[8px] text-slate-500 font-medium">Head Office: Medbookie Limited, Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos, Nigeria, Lagos State, Nigeria. &nbsp;•&nbsp; +234 705 648 2776 &nbsp;•&nbsp; info@Medbookiehospital.com</p>
        </div>

        {/* Appointment Status Banner */}
        <div className="mb-6 p-4 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-center gap-3">
          <Calendar className="text-emerald-600" size={20} />
          <span className="text-sm font-black text-emerald-800 uppercase tracking-widest">
            Confirmed Appointment: {data.appointment_code}
          </span>
        </div>

        {/* Patient Section */}
        <SectionHeader char="A" title="PATIENT INFORMATION" />
        <div className="grid grid-cols-4 gap-x-4 mb-4">
          <FormField label="PATIENT NAME" colSpan={2} value={`${data.patient_first} ${data.patient_last}`} />
          <FormField label="MRN" colSpan={1} value={data.mrn} />
          <FormField label="GENDER / AGE" colSpan={1} value={`${data.gender} / ${data.display_age || data.age_years + 'y'}`} />

          <FormField label="PAYER TYPE" colSpan={2} value={data.payer_type} />
          <FormField label="PAYER NAME" colSpan={2} value={data.payer_name} />
        </div>

        {/* Schedule Details */}
        <SectionHeader char="B" title="SCHEDULE DETAILS" />
        <div className="grid grid-cols-4 gap-x-4 mb-4">
          <FormField label="APPOINTMENT DATE" colSpan={2} value={new Date(data.appointment_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} />
          <FormField label="APPOINTMENT TIME" colSpan={1} value={formatTime(data.appointment_time)} />
          <FormField label="BOOKING TYPE" colSpan={1} value={data.booking_type?.replace('_', ' ')} />
        </div>

        {/* Medical Provider */}
        <SectionHeader char="C" title="MEDICAL PROVIDER" />
        <div className="grid grid-cols-4 gap-x-4 mb-4">
          <FormField label="CONSULTANT" colSpan={2} value={`Dr. ${data.doctor_first} ${data.doctor_last}`} />
          <FormField label="SPECIALIZATION" colSpan={2} value={data.specialization_name || 'General Practice'} />
        </div>

        {/* Reason for Visit */}
        <SectionHeader char="D" title="REASON FOR VISIT" />
        <div className="w-full border border-slate-200 bg-slate-50/50 rounded p-4 shadow-sm min-h-[100px]">
          <p className="text-sm font-bold text-slate-800 italic uppercase">
            {data.reason_for_visit || 'Routine Consultation / General Checkup'}
          </p>
        </div>

        {/* Instructions */}
        <div className="mt-12 p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
          <h4 className="text-[10px] font-black text-[#3B309A] uppercase tracking-widest mb-3">Important Instructions:</h4>
          <ul className="text-[10px] font-bold text-slate-500 space-y-2 list-disc pl-4">
            <li>Please arrive at least 15 minutes before your scheduled appointment time.</li>
            <li>Present this slip at the reception or nurse's station upon arrival.</li>
            <li>Ensure you have your hospital card or a valid means of identification.</li>
            <li>If you need to reschedule, please call the hospital records department at least 24 hours in advance.</li>
          </ul>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-12 mt-20 px-8">
          <div className="text-center">
            <div className="border-b border-slate-300 pb-2 mb-2"></div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Records Officer Signature</p>
          </div>
          <div className="text-center">
            <div className="border-b border-slate-300 pb-2 mb-2"></div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date & Time Printed</p>
            <p className="text-[10px] font-bold text-slate-400 mt-1">{new Date().toLocaleString()}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center border-t border-slate-200 pt-6">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest tracking-[0.2em]">Medbookie's Health Management System • Confidential Slip • {data.appointment_code}</p>
        </div>
      </div>
    </div>
  );
};

export default AppointmentPrintTemplate;
