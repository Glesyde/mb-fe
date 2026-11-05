
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  User as UserIcon,
  Stethoscope,
  Loader2,
  Settings,
  Trash2,
  Save,
  X,
  FileText,
  AlertCircle,
  Search,
  UserCheck,
  CheckCircle2,
  CreditCard,
  UserX,
  Ban,
  ArrowDown,
  MapPin
} from 'lucide-react';
import { userService } from '../services/user.service';
import { appointmentService } from '../services/appointment.service';
import { patientService } from '../services/patient.service';
import { useNotification } from '../context/NotificationContext';
import LoadingAnimation from './animations/LoadingAnimation';

const API_DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// Generate 30-minute slots for a full 24-hour day (48 slots)
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${minute}`;
});

const DoctorSchedule: React.FC = () => {
  const navigate = useNavigate();
  const { notify } = useNotification();
  
  // Date State
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Data State
  const [doctors, setDoctors] = useState<any[]>([]);
  const [specializations, setSpecializations] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter State
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | string>('');
  const [selectedSpecId, setSelectedSpecId] = useState<number | string>('');

  // Rota Management State
  const [showRotaModal, setShowRotaModal] = useState(false);
  const [isSavingRota, setIsSavingRota] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    day_of_week: 'MON',
    start_time: '08:00',
    end_time: '17:00',
    slot_duration: 30
  });

  // Booking/Edit Modal State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{date: string, time: string} | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  
  // Patient Verification State
  const [patientPreview, setPatientPreview] = useState<any>(null);
  const [verifyingPatient, setVerifyingPatient] = useState(false);

  const [bookingForm, setBookingForm] = useState({
    mrn: '',
    reason_for_visit: '',
    booking_type: 'PRE_BOOKED',
    duration: 30
  });
  const [isSubmittingAppt, setIsSubmittingAppt] = useState(false);
  const [isProcessingBilling, setIsProcessingBilling] = useState(false);

  // Initial Data Fetch
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [docsData, specsData, apptsData] = await Promise.all([
          appointmentService.listDoctors(),
          userService.getSpecializations(),
          appointmentService.listAppointments()
        ]);
        
        setDoctors(docsData);
        setSpecializations(specsData);
        setAppointments(apptsData);
        
        if (docsData.length > 0) {
          setSelectedDoctorId(docsData[0].doctor_id);
        }
      } catch (err) {
        notify('Failed to synchronize registry data', 'error');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [notify]);

  // Scroll to current time or 08:00 on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const grid = document.querySelector('.calendar-grid-container');
      if (grid) {
        const eightAmSlot = Array.from(grid.querySelectorAll('.grid-row-time')).find(el => el.textContent?.trim() === '08:00');
        if (eightAmSlot) {
          eightAmSlot.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Fetch Schedules when doctor changes
  useEffect(() => {
    if (selectedDoctorId) {
      const fetchSchedules = async () => {
        try {
          const data = await appointmentService.listSchedules(Number(selectedDoctorId));
          setSchedules(data);
        } catch (err) {
          console.error(err);
        }
      };
      fetchSchedules();
    } else {
      setSchedules([]);
    }
  }, [selectedDoctorId]);

  // --- Date Helpers ---
  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // adjust when day is sunday
    return new Date(d.setDate(diff));
  };

  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`; // YYYY-MM-DD using local timezone
  };

  const weekDays = useMemo(() => {
    const start = getStartOfWeek(currentDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  const handlePrevWeek = () => setCurrentDate(addDays(currentDate, -7));
  const handleNextWeek = () => setCurrentDate(addDays(currentDate, 7));
  const handleToday = () => setCurrentDate(new Date());

  // --- Rota Logic ---
  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId) return;
    
    setIsSavingRota(true);
    try {
      await appointmentService.createSchedule({
        doctor_id: Number(selectedDoctorId),
        day_of_week: newSchedule.day_of_week as any,
        start_time: `${newSchedule.start_time}:00`,
        end_time: `${newSchedule.end_time}:00`,
        slot_duration: Number(newSchedule.slot_duration)
      });
      notify('Availability slot added successfully', 'success');
      const data = await appointmentService.listSchedules(Number(selectedDoctorId));
      setSchedules(data);
    } catch (err: any) {
      notify(err.response?.data?.message || 'Failed to add schedule', 'error');
    } finally {
      setIsSavingRota(false);
    }
  };

  const handleDeleteSchedule = async (id: number) => {
    if (!window.confirm('Remove this availability block?')) return;
    try {
      await appointmentService.deleteSchedule(id);
      notify('Schedule removed', 'success');
      setSchedules(schedules.filter(s => s.id !== id));
    } catch (err) {
      notify('Failed to delete schedule', 'error');
    }
  };

  // --- Appointment Logic ---
  const handleSlotClick = (dateStr: string, timeStr: string, isAvailable: boolean, existingAppt?: any) => {
    // If user clicks a slot that is part of a longer appointment (but not the start), ignore or handle parent
    if (existingAppt && !existingAppt.isStart) {
       return;
    }

    if (existingAppt && existingAppt.isStart) {
      setSelectedAppointment(existingAppt.data);
      setBookingForm({
        mrn: existingAppt.data.mrn,
        reason_for_visit: existingAppt.data.reason_for_visit || '',
        booking_type: existingAppt.data.booking_type,
        duration: existingAppt.data.duration || 30
      });
      setPatientPreview(null); 
      setShowEditModal(true);
    } else if (isAvailable) {
      setSelectedSlot({ date: dateStr, time: timeStr });
      setBookingForm({ mrn: '', reason_for_visit: '', booking_type: 'PRE_BOOKED', duration: 30 });
      setPatientPreview(null);
      setShowBookingModal(true);
    }
  };

  const handleVerifyPatient = async () => {
    if (!bookingForm.mrn) {
      notify('Please enter an MRN to verify', 'warning');
      return;
    }
    
    setVerifyingPatient(true);
    setPatientPreview(null);
    try {
      const data = await patientService.getPatientByMrn(bookingForm.mrn);
      if (data) {
        setPatientPreview(data);
        notify('Patient identity verified', 'success');
      } else {
        notify('Patient MRN not found in registry', 'error');
      }
    } catch (err) {
      notify('Error verifying patient identity', 'error');
    } finally {
      setVerifyingPatient(false);
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !selectedSlot) return;

    setIsSubmittingAppt(true);
    try {
      await appointmentService.bookAppointment({
        mrn: bookingForm.mrn,
        doctor_id: Number(selectedDoctorId),
        appointment_date: selectedSlot.date,
        appointment_time: selectedSlot.time + ':00',
        booking_type: bookingForm.booking_type as any,
        reason_for_visit: bookingForm.reason_for_visit,
        duration: bookingForm.duration
      });
      
      notify('Appointment booked successfully', 'success');
      setShowBookingModal(false);
      setPatientPreview(null);
      
      // Refresh appointments
      const appts = await appointmentService.listAppointments();
      setAppointments(appts);
    } catch (err: any) {
      notify(err.response?.data?.message || 'Booking failed', 'error');
    } finally {
      setIsSubmittingAppt(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!selectedAppointment) return;

    if (status === 'CANCELLED' || status === 'NO_SHOW') {
      if (!window.confirm(`Are you sure you want to mark this appointment as ${status}?`)) return;
    }

    setIsSubmittingAppt(true);
    try {
      await appointmentService.updateAppointmentStatus({
        appointment_code: selectedAppointment.appointment_code,
        mrn: selectedAppointment.mrn,
        status: status
      });

      notify(`Appointment marked as ${status}`, 'success');
      
      // If just updating status (e.g. to Check-In), refresh list and close modal or keep open?
      // Close modal on success for now
      setShowEditModal(false);

      const appts = await appointmentService.listAppointments();
      setAppointments(appts);
      
    } catch (err: any) {
      notify(err.response?.data?.message || 'Status update failed', 'error');
    } finally {
      setIsSubmittingAppt(false);
    }
  };

  const handleProceedToBilling = async () => {
    if (!selectedAppointment) return;
    
    setIsProcessingBilling(true);
    try {
      // Fetch draft invoice details for this appointment
      const response = await appointmentService.getBillingDetails(selectedAppointment.appointment_code);
      
      if (response && response.data) {
        setShowEditModal(false);
        // Navigate to billing page with pre-filled data and appointment code
        navigate('/billing/opd', { 
          state: { 
            billingData: response.data,
            appointmentCode: selectedAppointment.appointment_code,
            from: 'appointment'
          } 
        });
      } else {
        notify('Could not generate billing details', 'error');
      }
    } catch (err: any) {
      notify(err.response?.data?.message || 'Failed to initiate billing', 'error');
    } finally {
      setIsProcessingBilling(false);
    }
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;

    setIsSubmittingAppt(true);
    try {
      await appointmentService.updateAppointment(selectedAppointment.id, {
        appointment_date: selectedAppointment.appointment_date, 
        appointment_time: selectedAppointment.appointment_time,
        mrn: bookingForm.mrn,
        reason_for_visit: bookingForm.reason_for_visit,
        booking_type: bookingForm.booking_type,
        duration: bookingForm.duration
      });
      notify('Appointment details updated', 'success');
      setShowEditModal(false);
      const appts = await appointmentService.listAppointments();
      setAppointments(appts);
    } catch (err: any) {
      notify('Update failed', 'error');
    } finally {
      setIsSubmittingAppt(false);
    }
  };

  const handleDeleteAppointment = async () => {
    if (!selectedAppointment || !window.confirm('Cancel this appointment?')) return;
    
    try {
      await appointmentService.deleteAppointment(selectedAppointment.id);
      notify('Appointment cancelled', 'success');
      setShowEditModal(false);
      const appts = await appointmentService.listAppointments();
      setAppointments(appts);
    } catch (err) {
      notify('Cancellation failed', 'error');
    }
  };

  // --- Render Helpers ---
  const filteredDoctors = useMemo(() => {
    if (!Array.isArray(doctors)) return [];
    if (!selectedSpecId) return doctors;
    return doctors.filter(d => d.specialization_id === Number(selectedSpecId)); 
  }, [doctors, selectedSpecId]);

  const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const scheduleMatrix = useMemo(() => {
    const matrix: Record<string, { data: any, isStart: boolean }> = {};
    if (!selectedDoctorId || !Array.isArray(appointments)) return matrix;

    const doctorAppts = appointments.filter(a => a.doctor_id === Number(selectedDoctorId) && a.status !== 'CANCELLED');

    doctorAppts.forEach(appt => {
      const datePart = appt.appointment_date; 
      const startMinutes = timeToMinutes(appt.appointment_time);
      const duration = appt.duration || 30; 
      const slotsToFill = Math.ceil(duration / 30);

      const hourPart = appt.appointment_time.substring(0, 5); 
      const key = `${datePart}-${hourPart}`;
      matrix[key] = { data: appt, isStart: true };

      for (let i = 1; i < slotsToFill; i++) {
        const nextTimeMinutes = startMinutes + (i * 30);
        const h = Math.floor(nextTimeMinutes / 60);
        const m = nextTimeMinutes % 60;
        const nextTimeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        const nextKey = `${datePart}-${nextTimeStr}`;
        matrix[nextKey] = { data: appt, isStart: false };
      }
    });

    return matrix;
  }, [appointments, selectedDoctorId]);

  const isWorkingHour = (dayIndex: number, timeStr: string) => {
    if (schedules.length === 0) return false; 
    
    const apiDay = API_DAYS[dayIndex];
    const slotMinutes = timeToMinutes(timeStr);

    return schedules.some(s => {
      if (s.day_of_week !== apiDay) return false;
      const startMinutes = timeToMinutes(s.start_time);
      const endMinutes = timeToMinutes(s.end_time);
      return slotMinutes >= startMinutes && slotMinutes < endMinutes;
    });
  };

  const getStatusColor = (status: string, isBorder = false) => {
    switch (status) {
      case 'SCHEDULED': return isBorder ? 'border-sky-200 bg-sky-50' : 'bg-sky-500 text-white';
      case 'CONFIRMED': return isBorder ? 'border-violet-200 bg-violet-50' : 'bg-violet-600 text-white';
      case 'CHECKED_IN': return isBorder ? 'border-amber-200 bg-amber-50' : 'bg-amber-500 text-white';
      case 'BILLING_CLEARANCE': return isBorder ? 'border-teal-200 bg-teal-50' : 'bg-teal-600 text-white';
      case 'COMPLETED': return isBorder ? 'border-emerald-200 bg-emerald-50' : 'bg-emerald-600 text-white';
      case 'NO_SHOW': return isBorder ? 'border-rose-200 bg-rose-50' : 'bg-rose-500 text-white';
      default: return isBorder ? 'border-slate-200 bg-slate-50' : 'bg-slate-500 text-white';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'text-sky-700';
      case 'CONFIRMED': return 'text-violet-700';
      case 'CHECKED_IN': return 'text-amber-700';
      case 'BILLING_CLEARANCE': return 'text-teal-700';
      case 'COMPLETED': return 'text-emerald-700';
      case 'NO_SHOW': return 'text-rose-700';
      default: return 'text-slate-600';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
             <div className="p-2 bg-brand-active text-brand-primary rounded-xl">
              <CalendarIcon size={24} />
            </div>
            Clinic Scheduling & Availability
          </h1>
          <p className="text-slate-500 font-medium">Coordinate specialist calendars and managed patient booking slots.</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedDoctorId && (
            <button 
              onClick={() => setShowRotaModal(true)}
              className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-2xl font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            >
              <Settings size={18} /> Schedule
            </button>
          )}
        </div>
      </div>

      {/* View Switcher & Date Nav */}
      <div className="bg-white border border-slate-200 rounded-[32px] p-4 flex flex-col md:flex-row items-center justify-between shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
            <button onClick={handlePrevWeek} className="p-2.5 hover:bg-slate-50 border-r border-slate-200 text-slate-400 group/nav"><ChevronLeft size={16} className="group-hover/nav:-translate-x-0.5 transition-transform" /></button>
            <button onClick={handleToday} className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">Today</button>
            <div className="relative border-x border-slate-200 group/date">
              <CalendarIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input 
                type="date" 
                className="pl-9 pr-3 py-2.5 text-xs font-bold text-slate-600 outline-none cursor-pointer bg-transparent hover:bg-slate-50 transition-colors appearance-none"
                value={formatDate(currentDate)}
                onChange={(e) => {
                  if (e.target.value) {
                    const [y, m, d] = e.target.value.split('-').map(Number);
                    setCurrentDate(new Date(y, m - 1, d));
                  }
                }}
              />
            </div>
            <button onClick={handleNextWeek} className="p-2.5 hover:bg-slate-50 text-slate-400 group/nav"><ChevronRight size={16} className="group-hover/nav:translate-x-0.5 transition-transform" /></button>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <h2 className="text-lg font-black text-slate-800">
            {weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Specialization Filter */}
          <div className="relative">
            <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <select 
              className="pl-9 pr-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl outline-none appearance-none hover:bg-slate-50 transition-all cursor-pointer"
              value={selectedSpecId}
              onChange={(e) => setSelectedSpecId(e.target.value)}
            >
              <option value="">All Specialties</option>
              {specializations.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Specialist Filter */}
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <select 
              className="pl-9 pr-8 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl outline-none appearance-none hover:bg-slate-50 transition-all cursor-pointer min-w-[180px]"
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
            >
              <option value="">Select Specialist</option>
              {filteredDoctors.map(d => (
                <option key={d.doctor_id} value={d.doctor_id}>
                  {d.first_name} {d.last_name}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <ChevronRight size={12} className="rotate-90" />
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Grid */}
      <div className={`bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-sm relative ${schedules.length === 0 ? 'opacity-70 pointer-events-none' : ''}`}>
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
            <Loader2 className="animate-spin text-brand-primary" size={40} />
          </div>
        )}
        
        {schedules.length === 0 && !loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50/50 backdrop-blur-[1px]">
            <AlertCircle size={48} className="text-slate-300 mb-4" />
            <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">No Schedule Configured</h3>
            <p className="text-slate-400 text-sm mt-1">Please use 'Schedule' to set availability for this doctor.</p>
          </div>
        )}

        <div className="grid grid-cols-8 border-b border-slate-100 bg-slate-50/30">
          <div className="p-4 border-r border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center">
            <Clock size={14} />
          </div>
          {weekDays.map((date, idx) => {
            const isToday = formatDate(date) === formatDate(new Date());
            return (
              <div key={idx} className={`p-5 text-center border-r border-slate-100 last:border-r-0 ${isToday ? 'bg-brand-active/50' : ''}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest ${isToday ? 'text-brand-primary' : 'text-slate-400'}`}>
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </p>
                <p className={`text-base font-black mt-1 ${isToday ? 'text-brand-primary' : 'text-slate-800'}`}>
                  {date.getDate()}
                </p>
              </div>
            );
          })}
        </div>

        <div className="max-h-[calc(100vh-280px)] overflow-y-auto no-scrollbar scroll-smooth calendar-grid-container">
          {TIME_SLOTS.map((time) => (
            <div key={time} className="grid grid-cols-8 border-b border-slate-50 last:border-0 hover:bg-slate-50/20 transition-colors group">
              <div className="p-3 border-r border-slate-100 text-xs font-bold text-slate-400 flex items-center justify-center bg-slate-50/20 grid-row-time">
                {time}
              </div>
              {weekDays.map((dateObj, dayIndex) => {
                const dateStr = formatDate(dateObj); // YYYY-MM-DD
                const matrixKey = `${dateStr}-${time}`;
                const slotData = scheduleMatrix[matrixKey];
                const appointment = slotData?.data;
                const isBooked = !!appointment;
                const isStart = slotData?.isStart;
                const isBreak = time === '13:00' || time === '13:30'; 
                const isAvailable = isWorkingHour(dateObj.getDay(), time);
                
                return (
                  <div 
                    key={matrixKey} 
                    onClick={() => isAvailable && !isBreak && handleSlotClick(dateStr, time, isAvailable, slotData)}
                    className={`p-1.5 border-r border-slate-100 min-h-[140px] transition-all flex flex-col justify-start last:border-r-0 relative
                      ${!isAvailable ? 'bg-slate-50/50 cursor-not-allowed' : 'bg-white cursor-pointer hover:bg-brand-active/10 group/slot'}
                    `}
                  >
                    {!isAvailable && !isBooked && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                        <div className="w-1 h-1 bg-slate-300 rounded-full" />
                      </div>
                    )}

                    {isBooked ? (
                       isStart ? (
                        <div className={`p-3 rounded-2xl w-full h-full shadow-sm flex flex-col text-left animate-in zoom-in-95 duration-300 z-10 cursor-pointer border-2 hover:shadow-md transition-all relative overflow-hidden ${getStatusColor(appointment.status, true)}`}>
                           {/* Status Indicator Bar */}
                           <div className={`absolute top-0 left-0 w-1.5 h-full ${getStatusColor(appointment.status)}`}></div>
                           
                           <div className="pl-2 flex justify-between items-start">
                              <span className={`text-[9px] font-black uppercase tracking-wider ${getStatusText(appointment.status)}`}>{appointment.status}</span>
                              {appointment.duration > 30 && <span className="text-[9px] font-bold text-slate-400 bg-white/50 px-1.5 rounded">{appointment.duration}m</span>}
                           </div>

                           <div className="pl-2 mt-2 flex-1">
                             <p className="text-[11px] font-black text-slate-800 leading-tight line-clamp-2">
                               {appointment.patient_first} {appointment.patient_last}
                             </p>
                             <p className="text-[9px] font-mono font-bold text-slate-500 mt-1">{appointment.mrn}</p>
                           </div>

                           <div className="pl-2 mt-auto pt-2 border-t border-black/5 flex justify-between items-center">
                              <span className="text-[9px] font-bold text-slate-400">{appointment.booking_type === 'WALK_IN' ? 'WALK-IN' : 'BOOKED'}</span>
                              <UserCheck size={12} className={getStatusText(appointment.status)}/>
                           </div>
                        </div>
                       ) : (
                        // Continuation Block
                        <div className={`w-full h-full rounded-2xl opacity-40 flex items-center justify-center border-2 border-dashed ${getStatusColor(appointment.status, true)}`}>
                           <ArrowDown size={16} className={getStatusText(appointment.status)} />
                        </div>
                       )
                    ) : isBreak ? (
                      <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-2xl">
                        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Break</span>
                      </div>
                    ) : isAvailable ? (
                      <div className="opacity-0 group-hover/slot:opacity-100 bg-brand-active text-brand-primary h-full rounded-2xl flex flex-col items-center justify-center text-[9px] font-black uppercase tracking-widest shadow-inner transition-all scale-95 group-hover/slot:scale-100 border border-brand-active">
                        <Plus size={16} className="mb-1" />
                        Book
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Rota Management Modal */}
      {showRotaModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowRotaModal(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-lg">
                  <Settings size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">Availability Rota</h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                    {doctors.find(d => d.doctor_id == selectedDoctorId)?.first_name}'s Schedule
                  </p>
                </div>
              </div>
              <button onClick={() => setShowRotaModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Existing Schedules List */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Active Time Blocks</h3>
                {schedules.length === 0 ? (
                  <div className="p-8 border-2 border-dashed border-slate-200 rounded-3xl text-center text-slate-400">
                    <p className="text-xs font-bold uppercase">No schedules defined</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {schedules.map(sch => (
                      <div key={sch.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between group hover:border-brand-primary transition-all">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-black text-slate-600 uppercase tracking-widest">{sch.day_of_week}</span>
                            <span className="text-[10px] font-bold text-slate-400">{sch.slot_duration} min slots</span>
                          </div>
                          <p className="text-sm font-black text-slate-800">
                            {sch.start_time.substring(0,5)} - {sch.end_time.substring(0,5)}
                          </p>
                        </div>
                        <button 
                          onClick={() => handleDeleteSchedule(sch.id)}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Schedule Form */}
              <div className="p-6 bg-slate-50 border border-slate-100 rounded-[32px] space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Add New Availability</h3>
                </div>
                
                <form onSubmit={handleAddSchedule} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Day of Week</label>
                      <select 
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                        value={newSchedule.day_of_week}
                        onChange={e => setNewSchedule({...newSchedule, day_of_week: e.target.value})}
                      >
                        {API_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Slot Duration (Min)</label>
                      <select 
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none appearance-none"
                        value={newSchedule.slot_duration}
                        onChange={e => setNewSchedule({...newSchedule, slot_duration: Number(e.target.value)})}
                      >
                        <option value={30}>30 Minutes</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Start Time</label>
                      <input 
                        type="time" 
                        required
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                        value={newSchedule.start_time}
                        onChange={e => setNewSchedule({...newSchedule, start_time: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">End Time</label>
                      <input 
                        type="time" 
                        required
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                        value={newSchedule.end_time}
                        onChange={e => setNewSchedule({...newSchedule, end_time: e.target.value})}
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSavingRota}
                    className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 disabled:opacity-70"
                  >
                    {isSavingRota ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Save Schedule Block
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {showBookingModal && selectedSlot && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => !isSubmittingAppt && setShowBookingModal(false)} />
          <form onSubmit={handleBookAppointment} className="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-brand-active/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand-primary text-white rounded-xl shadow-lg">
                  <CalendarIcon size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">New Appointment</h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                    {selectedSlot.date} at {selectedSlot.time}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setShowBookingModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Patient MRN</label>
                <div className="flex gap-2">
                   <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        required
                        type="text"
                        placeholder="e.g. GSH-2026-000001"
                        className="w-full pl-10 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none transition-all"
                        value={bookingForm.mrn}
                        onChange={e => {
                          setBookingForm({...bookingForm, mrn: e.target.value});
                          setPatientPreview(null);
                        }}
                        onBlur={handleVerifyPatient}
                      />
                   </div>
                   <button 
                     type="button" 
                     onClick={handleVerifyPatient}
                     disabled={verifyingPatient || !bookingForm.mrn}
                     className="px-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center"
                   >
                     {verifyingPatient ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                   </button>
                </div>
              </div>

              {patientPreview && (
                <div className="bg-brand-active border border-brand-active rounded-2xl p-4 flex items-center gap-4 animate-in fade-in zoom-in-95 duration-300">
                   <div className="w-12 h-12 bg-brand-primary rounded-xl flex items-center justify-center text-white font-black">
                     {patientPreview.demographics.first_name.charAt(0)}
                   </div>
                   <div>
                     <h4 className="text-sm font-black text-slate-800">
                       {patientPreview.demographics.first_name} {patientPreview.demographics.last_name}
                     </h4>
                     <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{patientPreview.demographics.gender}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{patientPreview.demographics.date_of_birth}</span>
                        <span className="text-[10px] font-bold text-brand-primary uppercase tracking-tight">{patientPreview.demographics.phone}</span>
                     </div>
                   </div>
                   <div className="ml-auto text-emerald-500">
                     <UserCheck size={20} />
                   </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reason for Visit</label>
                <textarea 
                  required
                  rows={2}
                  placeholder="Clinical notes..."
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none resize-none"
                  value={bookingForm.reason_for_visit}
                  onChange={e => setBookingForm({...bookingForm, reason_for_visit: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Booking Type</label>
                    <select 
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                      value={bookingForm.booking_type}
                      onChange={e => setBookingForm({...bookingForm, booking_type: e.target.value})}
                    >
                      <option value="PRE_BOOKED">Pre-Booked</option>
                      <option value="WALK_IN">Walk-In</option>
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Duration</label>
                    <select 
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                      value={bookingForm.duration}
                      onChange={e => setBookingForm({...bookingForm, duration: Number(e.target.value)})}
                    >
                      <option value={30}>30 Minutes</option>
                      <option value={60}>60 Minutes</option>
                      <option value={90}>90 Minutes</option>
                    </select>
                 </div>
              </div>
            </div>

            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={() => setShowBookingModal(false)} className="px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-800">Cancel</button>
              <button 
                type="submit" 
                disabled={isSubmittingAppt || !patientPreview}
                className="bg-brand-primary text-white px-10 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-brand-primary transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingAppt ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Confirm Booking
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit/View Appointment Modal */}
      {showEditModal && selectedAppointment && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => !isSubmittingAppt && setShowEditModal(false)} />
          <form onSubmit={handleUpdateDetails} className="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-purple-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-lg">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">Appointment Details</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                     <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border tracking-wider ${getStatusColor(selectedAppointment.status)}`}>
                        {selectedAppointment.status}
                     </span>
                     <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                        {selectedAppointment.appointment_code}
                     </p>
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Patient</p>
                    <p className="text-sm font-black text-slate-800">{selectedAppointment.patient_first} {selectedAppointment.patient_last}</p>
                    <p className="text-[10px] font-mono font-bold text-brand-primary uppercase mt-0.5">{selectedAppointment.mrn}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Duration</p>
                    <p className="text-sm font-black text-slate-800">{selectedAppointment.duration || 30} mins</p>
                    <p className="text-[10px] text-slate-500 font-bold">{selectedAppointment.appointment_time}</p>
                 </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reason for Visit</label>
                <textarea 
                  rows={2}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none resize-none"
                  value={bookingForm.reason_for_visit}
                  onChange={e => setBookingForm({...bookingForm, reason_for_visit: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Update Status</label>
                   <select 
                     className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                     onChange={(e) => handleStatusChange(e.target.value)}
                     value={selectedAppointment.status}
                     disabled={selectedAppointment.status === 'CHECKED_IN' || selectedAppointment.status === 'BILLING_CLEARANCE'}
                   >
                     <option value="SCHEDULED">Scheduled</option>
                     <option value="CONFIRMED">Confirmed</option>
                     <option value="CHECKED_IN">Checked In</option>
                     <option value="COMPLETED">Completed</option>
                     <option value="NO_SHOW">No Show</option>
                     <option value="CANCELLED">Cancelled</option>
                   </select>
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modify Duration</label>
                   <select 
                     className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                     value={bookingForm.duration}
                     onChange={(e) => setBookingForm({...bookingForm, duration: Number(e.target.value)})}
                   >
                     <option value={30}>30 Minutes</option>
                     <option value={60}>60 Minutes</option>
                     <option value={90}>90 Minutes</option>
                   </select>
                 </div>
              </div>
            </div>

            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100">
               {selectedAppointment.status === 'CHECKED_IN' && (
                 <div className="mb-4">
                   <button
                     type="button"
                     onClick={handleProceedToBilling}
                     disabled={isProcessingBilling}
                     className="w-full bg-brand-primary text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-primary shadow-md transition-all flex items-center justify-center gap-2"
                   >
                      {isProcessingBilling ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                      Proceed to Billing Clearance
                   </button>
                 </div>
               )}
               
               {selectedAppointment.status === 'SCHEDULED' && (
                 <div className="grid grid-cols-2 gap-3 mb-4">
                    <button 
                       type="button"
                       onClick={() => handleStatusChange('CONFIRMED')}
                       disabled={isSubmittingAppt}
                       className="bg-emerald-600 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 shadow-md transition-all"
                    >
                       Confirm Attendance
                    </button>
                    <button 
                       type="button"
                       onClick={() => handleStatusChange('CANCELLED')}
                       disabled={isSubmittingAppt}
                       className="bg-red-50 text-red-600 border border-red-100 px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all"
                    >
                       Cancel Appointment
                    </button>
                 </div>
               )}

               {selectedAppointment.status === 'CONFIRMED' && (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button 
                       type="button"
                       onClick={() => handleStatusChange('CHECKED_IN')}
                       disabled={isSubmittingAppt}
                       className="bg-brand-primary text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-primary shadow-md transition-all flex items-center justify-center gap-2"
                    >
                       <MapPin size={14} /> Check In (Arrived)
                    </button>
                    <button 
                       type="button"
                       onClick={() => handleStatusChange('NO_SHOW')}
                       disabled={isSubmittingAppt}
                       className="bg-slate-200 text-slate-600 px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-300 transition-all flex items-center justify-center gap-2"
                    >
                       <UserX size={14} /> Mark No-Show
                    </button>
                  </div>
               )}

              <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                 <button 
                   type="button"
                   onClick={handleDeleteAppointment}
                   disabled={isSubmittingAppt}
                   className="text-slate-400 hover:text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-colors"
                 >
                   <Trash2 size={14} /> Remove
                 </button>
                 <div className="flex gap-2">
                   <button type="button" onClick={() => setShowEditModal(false)} className="px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-800">Close</button>
                   <button 
                     type="submit" 
                     disabled={isSubmittingAppt}
                     className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
                   >
                     {isSubmittingAppt ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                     Update
                   </button>
                 </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {isProcessingBilling && <LoadingAnimation />}
    </div>
  );
};

export default DoctorSchedule;
