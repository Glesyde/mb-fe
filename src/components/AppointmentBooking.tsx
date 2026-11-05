import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Calendar,
  Search,
  User,
  Stethoscope,
  CheckCircle2,
  ChevronLeft,
  X,
  Clock,
  AlertCircle,
  FileText,
  Loader2,
  CalendarDays,
} from "lucide-react";
import { appointmentService } from "../services/appointment.service";
import { patientService } from "../services/patient.service";
import { useNotification } from "../context/NotificationContext";

const AppointmentBooking: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useNotification();
  const slotInfo = location.state as { day?: string; time?: string } | null;

  // Data Loading States
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  // Patient Search States
  const [patientSearch, setPatientSearch] = useState("");
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [patientResults, setPatientResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);

  // Form State
  const [bookingForm, setBookingForm] = useState({
    mrn: "",
    doctor_id: "",
    appointment_date: slotInfo?.day || new Date().toLocaleDateString("en-CA"),
    appointment_time: slotInfo?.time ? slotInfo.time : "09:00",
    duration: 30,
    booking_type: "PRE_BOOKED",
    reason_for_visit: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Doctors on Mount
  useEffect(() => {
    const fetchDoctors = async () => {
      setLoadingDoctors(true);
      try {
        const data = await appointmentService.listDoctors();
        setDoctors(data);
      } catch (err) {
        notify("Failed to load doctors list", "error");
      } finally {
        setLoadingDoctors(false);
      }
    };
    fetchDoctors();
  }, [notify]);

  // Handle Patient Search Debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (patientSearch.length > 2 && !selectedPatient) {
        setSearchingPatients(true);
        try {
          const results = await patientService.searchPatients(patientSearch);
          setPatientResults(results);
        } catch (err) {
          console.error(err);
        } finally {
          setSearchingPatients(false);
        }
      } else {
        setPatientResults([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [patientSearch, selectedPatient]);

  const selectPatient = (patient: any) => {
    setSelectedPatient(patient);
    setBookingForm((prev) => ({ ...prev, mrn: patient.mrn }));
    setPatientSearch(
      `${patient.demographics.first_name} ${patient.demographics.last_name}`,
    );
    setPatientResults([]);
  };

  const clearPatient = () => {
    setSelectedPatient(null);
    setBookingForm((prev) => ({ ...prev, mrn: "" }));
    setPatientSearch("");
  };

  const handleConfirm = async () => {
    if (
      !bookingForm.mrn ||
      !bookingForm.doctor_id ||
      !bookingForm.appointment_date ||
      !bookingForm.appointment_time
    ) {
      notify(
        "Please fill in all required fields (Patient, Doctor, Date, Time)",
        "warning",
      );
      return;
    }

    // Validation: Prevent past dates/times
    const now = new Date();
    const todayStr = now.toLocaleDateString("en-CA");

    if (bookingForm.appointment_date < todayStr) {
      notify("Cannot book appointments for past dates", "error");
      return;
    }

    if (bookingForm.appointment_date === todayStr) {
      const [hours, minutes] = bookingForm.appointment_time
        .split(":")
        .map(Number);
      const selectedTime = new Date();
      selectedTime.setHours(hours, minutes, 0, 0);

      if (selectedTime < now) {
        notify("Cannot book appointments for past time slots today", "error");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Format time to HH:mm:ss if it's in HH:mm format
      const formattedTime = bookingForm.appointment_time.includes(":")
        ? bookingForm.appointment_time.split(":").length === 2
          ? `${bookingForm.appointment_time}:00`
          : bookingForm.appointment_time
        : bookingForm.appointment_time;

      await appointmentService.bookAppointment({
        mrn: bookingForm.mrn,
        doctor_id: Number(bookingForm.doctor_id),
        appointment_date: bookingForm.appointment_date,
        appointment_time: formattedTime,
        duration: bookingForm.duration,
        booking_type: bookingForm.booking_type as "PRE_BOOKED" | "WALK_IN",
        reason_for_visit: bookingForm.reason_for_visit,
      });

      notify("Appointment created successfully", "success");
      navigate("/appointments/queue");
    } catch (err: any) {
      notify(err.response?.data?.message || "Booking failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-4 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-[40px] border border-slate-200 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-10 py-8 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-primary text-white rounded-2xl shadow-lg shadow-brand-active">
              <Calendar size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                Create New Appointment
              </h1>
              <p className="text-slate-500 font-medium">
                Reserve a consultation slot in the clinical registry.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/appointments/schedule")}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-10 space-y-10">
          {/* Patient Search Section */}
          <div className="space-y-3 relative z-20">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Patient Search (Registry Index) *
            </label>
            {!selectedPatient ? (
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
                <input
                  type="text"
                  placeholder="Search by Patient MRN, Name or Phone..."
                  className="w-full pl-14 pr-4 py-5 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-brand-active0/10 focus:border-brand-active0 outline-none transition-all"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                />
                {searchingPatients && (
                  <div className="absolute right-5 top-1/2 -translate-y-1/2">
                    <Loader2 className="animate-spin text-brand-primary" size={20} />
                  </div>
                )}

                {/* Search Results Dropdown */}
                {patientResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto z-50">
                    {patientResults.map((patient) => (
                      <div
                        key={patient.id}
                        onClick={() => selectPatient(patient)}
                        className="px-6 py-4 hover:bg-brand-active cursor-pointer border-b border-slate-50 last:border-0 transition-colors"
                      >
                        <p className="text-sm font-black text-slate-800">
                          {patient.demographics.first_name}{" "}
                          {patient.demographics.last_name}
                        </p>
                        <p className="text-xs font-medium text-slate-500">
                          {patient.mrn} • {patient.demographics.phone}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between animate-in fade-in zoom-in-95">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-lg">
                    {selectedPatient.demographics.first_name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-black text-emerald-900">
                      {selectedPatient.demographics.first_name}{" "}
                      {selectedPatient.demographics.last_name}
                    </p>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                      {selectedPatient.mrn} • Verified
                    </p>
                  </div>
                </div>
                <button
                  onClick={clearPatient}
                  className="text-emerald-600 text-xs font-black uppercase hover:underline p-2"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {/* Configuration */}
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Consulting Doctor *
              </label>
              <div className="relative">
                <Stethoscope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <select
                  className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none cursor-pointer focus:bg-white focus:border-brand-active0 transition-all"
                  value={bookingForm.doctor_id}
                  onChange={(e) =>
                    setBookingForm({
                      ...bookingForm,
                      doctor_id: e.target.value,
                    })
                  }
                  disabled={loadingDoctors}
                >
                  <option value="">
                    {loadingDoctors ? "Loading..." : "Select Doctor"}
                  </option>
                  {doctors.map((doc) => (
                    <option key={doc.doctor_id} value={doc.doctor_id}>
                      Dr. {doc.first_name} {doc.last_name} (
                      {doc.specialization_name || "General"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Appointment Date *
              </label>
              <div className="relative">
                <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="date"
                  className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-brand-active0 transition-all"
                  value={bookingForm.appointment_date}
                  onChange={(e) =>
                    setBookingForm({
                      ...bookingForm,
                      appointment_date: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Time Slot *
              </label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="time"
                  className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-brand-active0 transition-all"
                  value={bookingForm.appointment_time}
                  onChange={(e) =>
                    setBookingForm({
                      ...bookingForm,
                      appointment_time: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Booking Type
              </label>
              <div className="flex p-1.5 bg-slate-50 border border-slate-200 rounded-2xl">
                {["PRE_BOOKED", "WALK_IN"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() =>
                      setBookingForm({ ...bookingForm, booking_type: type })
                    }
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${bookingForm.booking_type === type ? "bg-white text-brand-primary shadow-sm" : "text-slate-400"}`}
                  >
                    {type.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Duration (Minutes)
              </label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <select
                  className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none cursor-pointer focus:bg-white focus:border-brand-active0 transition-all"
                  value={bookingForm.duration}
                  onChange={(e) =>
                    setBookingForm({
                      ...bookingForm,
                      duration: Number(e.target.value),
                    })
                  }
                >
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes</option>
                  <option value={90}>90 Minutes</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <FileText size={12} /> Reason for Visit
            </label>
            <textarea
              rows={4}
              placeholder="Brief summary of primary complaint..."
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-brand-active0 transition-all resize-none"
              value={bookingForm.reason_for_visit}
              onChange={(e) =>
                setBookingForm({
                  ...bookingForm,
                  reason_for_visit: e.target.value,
                })
              }
            />
          </div>

          <div className="bg-amber-50 border border-amber-100 p-6 rounded-[32px] flex items-start gap-4">
            <AlertCircle className="text-amber-600 flex-shrink-0" size={20} />
            <p className="text-xs text-amber-700 leading-relaxed font-medium">
              An appointment notification will be sent to the patient's
              registered mobile number via SMS and Email upon confirmation.
            </p>
          </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            disabled={isSubmitting}
            className="flex items-center gap-2 text-sm font-black text-slate-400 hover:text-slate-800 transition-colors uppercase tracking-widest"
          >
            <ChevronLeft size={18} /> Discard Request
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="bg-brand-primary text-white px-10 py-4 rounded-[20px] font-black hover:bg-brand-primary transition-all shadow-xl shadow-brand-active active:scale-95 flex items-center gap-3 uppercase tracking-widest text-xs disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <CheckCircle2 size={20} />
            )}
            Confirm Appointment
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentBooking;
