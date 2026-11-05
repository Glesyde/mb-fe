
import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Search, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  Stethoscope, 
  CheckCircle2, 
  Timer, 
  MoreHorizontal,
  X,
  User,
  AlertCircle
} from 'lucide-react';

interface Appointment {
  id: string;
  patientName: string;
  specialty: string;
  time: string;
  date: string;
  status: 'Confirmed' | 'Completed' | 'Waiting' | 'Cancelled' | 'In-Consultation';
  type: 'Walk-in' | 'Pre-booked';
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 10 }, (_, i) => `${i + 8}:00`);

const INITIAL_QUEUE: Appointment[] = [
  { id: '1', patientName: 'James Wilson', specialty: 'Cardiology', time: '09:00 AM', date: '2025-05-20', status: 'In-Consultation', type: 'Pre-booked' },
  { id: '2', patientName: 'Sarah Miller', specialty: 'Pediatrics', time: '09:30 AM', date: '2025-05-20', status: 'Waiting', type: 'Walk-in' },
  { id: '3', patientName: 'Robert Brown', specialty: 'General Medicine', time: '10:15 AM', date: '2025-05-20', status: 'Confirmed', type: 'Pre-booked' },
];

const AppointmentModule: React.FC = () => {
  const [view, setView] = useState<'week' | 'month'>('week');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_QUEUE);
  const [selectedSlot, setSelectedSlot] = useState<{ day: string; time: string } | null>(null);

  // Form State
  const [bookingForm, setBookingForm] = useState({
    patientName: '',
    specialty: '',
    reason: '',
    type: 'Pre-booked'
  });

  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'Confirmed': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Completed': return 'bg-slate-100 text-slate-500 border-slate-200';
      case 'Waiting': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'Cancelled': return 'bg-red-50 text-red-600 border-red-100';
      case 'In-Consultation': return 'bg-brand-active text-brand-primary border-brand-active';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  const handleBookSlot = (day: string, time: string) => {
    setSelectedSlot({ day, time });
    setShowBookingModal(true);
  };

  const handleConfirmBooking = () => {
    if (!bookingForm.patientName || !bookingForm.specialty) return;
    
    const newAppointment: Appointment = {
      id: Math.random().toString(36).substr(2, 9),
      patientName: bookingForm.patientName,
      specialty: bookingForm.specialty,
      time: selectedSlot?.time || '08:00 AM',
      date: '2025-05-20', // Mock current date
      status: 'Confirmed',
      type: bookingForm.type as any
    };

    setAppointments([newAppointment, ...appointments]);
    setShowBookingModal(false);
    setBookingForm({ patientName: '', specialty: '', reason: '', type: 'Pre-booked' });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full animate-in fade-in duration-500">
      {/* Left: Main Calendar View */}
      <div className="flex-1 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Scheduling & Appointments</h1>
            <p className="text-slate-500 text-sm">Coordinate clinic flow and specialist availability.</p>
          </div>
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <button 
              onClick={() => setView('week')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${view === 'week' ? 'bg-brand-primary text-white shadow-md shadow-brand-active' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Weekly
            </button>
            <button 
              onClick={() => setView('month')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${view === 'month' ? 'bg-brand-primary text-white shadow-md shadow-brand-active' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Monthly
            </button>
          </div>
        </div>

        {/* Calendar Header Nav */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-800">May 18 - May 24, 2025</h2>
            <div className="flex items-center border border-slate-100 rounded-lg overflow-hidden">
              <button className="p-2 hover:bg-slate-50 border-r border-slate-100"><ChevronLeft size={16} /></button>
              <button className="p-2 hover:bg-slate-50"><ChevronRight size={16} /></button>
            </div>
          </div>
          <button 
            onClick={() => setShowBookingModal(true)}
            className="flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-brand-primary transition-all active:scale-95"
          >
            <Plus size={18} /> Book Appointment
          </button>
        </div>

        {/* Weekly Grid */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-8 border-b border-slate-100 bg-slate-50/50">
            <div className="p-4 border-r border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center">Time</div>
            {DAYS.map((day, idx) => (
              <div key={day} className={`p-4 text-center border-r border-slate-100 ${idx === 6 ? 'border-r-0' : ''}`}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{day}</p>
                <p className={`text-sm font-bold mt-1 ${day === 'Wed' ? 'text-brand-primary' : 'text-slate-800'}`}>{18 + idx}</p>
              </div>
            ))}
          </div>

          <div className="max-h-[600px] overflow-y-auto">
            {HOURS.map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b border-slate-50 last:border-0 hover:bg-slate-50/30 transition-colors">
                <div className="p-4 border-r border-slate-100 text-xs font-medium text-slate-500 flex items-center justify-center">{hour}</div>
                {DAYS.map((day) => {
                  const isBooked = Math.random() > 0.8;
                  return (
                    <div 
                      key={`${day}-${hour}`} 
                      onClick={() => !isBooked && handleBookSlot(day, hour)}
                      className={`p-1 border-r border-slate-100 min-h-[60px] cursor-pointer transition-all flex flex-col items-center justify-center
                        ${isBooked ? 'bg-brand-active/30 cursor-not-allowed' : 'hover:bg-brand-active/50'}
                      `}
                    >
                      {isBooked && (
                        <div className="bg-brand-active/50 text-brand-primary p-1.5 rounded-lg text-[9px] font-bold w-full text-center border border-brand-active/50">
                          Unavailable
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Side Panel (Queue) */}
      <div className="w-full lg:w-80 space-y-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm sticky top-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Users size={20} className="text-brand-primary" /> Today's Queue
            </h3>
            <span className="bg-brand-active text-brand-primary text-[10px] font-bold px-2 py-1 rounded-full">{appointments.length} Total</span>
          </div>

          <div className="space-y-4">
            {appointments.map((item) => (
              <div key={item.id} className="group relative flex items-start gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                <div className="relative">
                   <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                    <User size={20} />
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white 
                    ${item.status === 'In-Consultation' ? 'bg-brand-active0 animate-pulse' : 
                      item.status === 'Waiting' ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-bold text-slate-800 truncate">{item.patientName}</p>
                    <span className="text-[10px] font-mono font-medium text-slate-400">{item.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mb-2">{item.specialty}</p>
                  <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border ${getStatusColor(item.status)}`}>
                    {item.status === 'In-Consultation' && <Timer size={12} />}
                    {item.status}
                  </div>
                </div>
                <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white rounded-lg transition-all">
                  <MoreHorizontal size={14} className="text-slate-400" />
                </button>
              </div>
            ))}
          </div>

          <button className="w-full mt-6 flex items-center justify-center gap-2 text-sm font-bold text-brand-primary bg-brand-active/50 py-3 rounded-2xl hover:bg-brand-active transition-colors">
            <CheckCircle2 size={16} /> Manage All Queue
          </button>
        </div>

        {/* Clinic Notice Card */}
        <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6">
          <div className="flex items-center gap-2 text-amber-700 mb-2">
            <AlertCircle size={18} />
            <span className="text-sm font-bold">Clinical Alert</span>
          </div>
          <p className="text-xs text-amber-600 leading-relaxed">
            Dr. House is currently unavailable for Emergency Consultations between 14:00 - 15:30 due to surgery.
          </p>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowBookingModal(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-active text-brand-primary rounded-xl">
                  <CalendarIcon size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Book Appointment</h2>
                  <p className="text-xs text-slate-500">
                    {selectedSlot ? `${selectedSlot.day}, ${selectedSlot.time}` : 'New Schedule Entry'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowBookingModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Patient (Searchable)</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search by Name or MRN..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-active0/20 outline-none"
                    value={bookingForm.patientName}
                    onChange={(e) => setBookingForm({ ...bookingForm, patientName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Specialty / Clinic</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-brand-active0/20"
                    value={bookingForm.specialty}
                    onChange={(e) => setBookingForm({ ...bookingForm, specialty: e.target.value })}
                  >
                    <option value="">Select Specialty</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Dermatology">Dermatology</option>
                    <option value="General Medicine">General Medicine</option>
                    <option value="Orthopedics">Orthopedics</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-brand-active0/20"
                    value={bookingForm.type}
                    onChange={(e) => setBookingForm({ ...bookingForm, type: e.target.value })}
                  >
                    <option value="Pre-booked">Pre-booked</option>
                    <option value="Walk-in">Walk-in</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Follow-up">Follow-up</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reason for Visit</label>
                <textarea 
                  rows={3}
                  placeholder="Patient's primary complaint or medical reason..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-brand-active0/20"
                  value={bookingForm.reason}
                  onChange={(e) => setBookingForm({ ...bookingForm, reason: e.target.value })}
                />
              </div>
            </div>

            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button 
                onClick={() => setShowBookingModal(false)}
                className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmBooking}
                className="bg-brand-primary text-white px-8 py-2.5 rounded-xl font-bold hover:bg-brand-primary transition-all shadow-md active:scale-95 flex items-center gap-2"
              >
                <Stethoscope size={18} />
                Confirm Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentModule;
