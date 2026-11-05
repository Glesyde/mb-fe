import React from "react";
import { X, Activity, FileText } from "lucide-react";
import { LabourSession } from "../../types/nursing.types";

interface ObservationActionModalProps {
  session: LabourSession;
  onClose: () => void;
  onSelectAction: (action: "partogram" | "ctg") => void;
}

const ObservationActionModal: React.FC<ObservationActionModalProps> = ({
  session,
  onClose,
  onSelectAction,
}) => {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 md:p-8 border-b border-slate-100">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
              Observation Actions
            </h2>
            <div className="mt-2 flex items-center gap-3">
              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-black tracking-widest uppercase">
                {session.patient_mrn || session.mrn}
              </span>
              <span className="text-sm font-bold text-slate-500 uppercase">
                {session.patient_name} • {session.gestational_age_weeks} Weeks
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Action Cards */}
        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 overflow-y-auto">
          {/* Partogram Action */}
          <button
            onClick={() => onSelectAction("partogram")}
            className="group flex flex-col items-center justify-center p-8 bg-white border-2 border-slate-100 rounded-3xl hover:border-brand-primary hover:shadow-xl hover:shadow-brand-primary/10 transition-all text-center gap-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-lg mb-1">
                Partogram Observation
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Record cervical dilation, fetal descent, moulding, and liquor status.
              </p>
            </div>
          </button>

          {/* CTG Action */}
          <button
            onClick={() => onSelectAction("ctg")}
            className="group flex flex-col items-center justify-center p-8 bg-white border-2 border-slate-100 rounded-3xl hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/10 transition-all text-center gap-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Activity className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-lg mb-1">
                CTG Observation
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Record continuous fetal heart rate monitoring and contractions.
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ObservationActionModal;
