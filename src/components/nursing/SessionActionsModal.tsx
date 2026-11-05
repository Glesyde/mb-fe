import React from "react";
import { XCircle, Eye, Edit, Trash2, PlayCircle } from "lucide-react";

interface SessionActionsModalProps {
  session: any;
  onClose: () => void;
  onView: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onStart?: () => void;
  isPending?: boolean;
}

const SessionActionsModal: React.FC<SessionActionsModalProps> = ({
  session,
  onClose,
  onView,
  onEdit,
  onDelete,
  onStart,
  isPending = false,
}) => {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="bg-slate-50 px-6 py-5 border-b border-slate-100 flex justify-between items-start sticky top-0 z-10">
          <div>
            <h3 className="font-black text-slate-800 text-xl tracking-tight">
              {isPending ? "Admission Actions" : "Session Actions"}
            </h3>
            <p className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-2">
              <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700">
                {session.mrn}
              </span>
              {session.patient_name} • Adm: {session.adm_num}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-red-500 bg-white hover:bg-red-50 p-2 rounded-full transition-all border border-slate-200 hover:border-red-200 shadow-sm"
          >
            <XCircle size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {isPending ? (
              session.session_id ? (
                <button
                  onClick={() => {
                    onClose();
                    onView();
                  }}
                  className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-slate-100 rounded-2xl hover:bg-slate-50 hover:border-brand-primary/40 transition-all text-slate-700 group col-span-2 sm:col-span-3 max-w-xs mx-auto w-full"
                >
                  <div className="p-4 bg-slate-100 rounded-2xl group-hover:scale-110 group-hover:bg-brand-active group-hover:text-brand-primary transition-all">
                    <Eye size={28} className="text-slate-600 group-hover:text-brand-primary" />
                  </div>
                  <span className="text-sm font-bold text-center group-hover:text-brand-primary transition-colors">View Partogram</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    onClose();
                    if (onStart) onStart();
                  }}
                  className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-slate-100 rounded-2xl hover:bg-slate-50 hover:border-brand-primary/40 transition-all text-slate-700 group col-span-2 sm:col-span-3 max-w-xs mx-auto w-full"
                >
                  <div className="p-4 bg-slate-100 rounded-2xl group-hover:scale-110 group-hover:bg-brand-active group-hover:text-brand-primary transition-all">
                    <PlayCircle size={28} className="text-slate-600 group-hover:text-brand-primary" />
                  </div>
                  <span className="text-sm font-bold text-center group-hover:text-brand-primary transition-colors">Start Session</span>
                </button>
              )
            ) : (
              <>
                {/* View Partogram */}
                <button
                  onClick={() => {
                    onClose();
                    onView();
                  }}
                  className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-slate-100 rounded-2xl hover:bg-slate-50 hover:border-brand-primary/40 transition-all text-slate-700 group"
                >
                  <div className="p-4 bg-slate-100 rounded-2xl group-hover:scale-110 group-hover:bg-brand-active group-hover:text-brand-primary transition-all">
                    <Eye size={28} className="text-slate-600 group-hover:text-brand-primary" />
                  </div>
                  <span className="text-sm font-bold text-center group-hover:text-brand-primary transition-colors">View Partogram</span>
                </button>

                {/* Edit Session */}
                <button
                  onClick={() => {
                    onClose();
                    if (onEdit) onEdit();
                  }}
                  className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-slate-100 rounded-2xl hover:bg-slate-50 hover:border-amber-400/40 transition-all text-slate-700 group"
                >
                  <div className="p-4 bg-slate-100 rounded-2xl group-hover:scale-110 group-hover:bg-amber-50 group-hover:text-amber-600 transition-all">
                    <Edit size={28} className="text-slate-600 group-hover:text-amber-600" />
                  </div>
                  <span className="text-sm font-bold text-center group-hover:text-amber-600 transition-colors">Edit Details</span>
                </button>

                {/* Delete Session */}
                <button
                  onClick={() => {
                    onClose();
                    if (onDelete) onDelete();
                  }}
                  className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-slate-100 rounded-2xl hover:bg-red-50 hover:border-red-200 transition-all text-slate-700 group"
                >
                  <div className="p-4 bg-slate-100 rounded-2xl group-hover:scale-110 group-hover:bg-white group-hover:shadow-sm transition-all text-red-500">
                    <Trash2 size={28} />
                  </div>
                  <span className="text-sm font-bold text-center group-hover:text-red-600 transition-colors">Cancel Session</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionActionsModal;
