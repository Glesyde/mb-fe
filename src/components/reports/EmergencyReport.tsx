import React from "react";
import { Ambulance, Clock } from "lucide-react";

const EmergencyReport: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 animate-in slide-in-from-bottom-4 duration-500 w-full overflow-hidden flex flex-col items-center justify-center min-h-[50vh] text-center">
      <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-rose-100">
        <Ambulance className="text-rose-500 w-10 h-10" />
      </div>
      <h2 className="text-2xl font-black text-slate-800 mb-2">Emergency Patient Report</h2>
      <p className="text-slate-500 max-w-md text-lg mb-8">
        This report is currently under development. Emergency department metrics will be available here soon.
      </p>
      
      <div className="flex items-center gap-2 text-rose-600 font-bold bg-rose-50 px-4 py-2 rounded-full">
        <Clock size={16} />
        <span>Coming Soon</span>
      </div>
    </div>
  );
};

export default EmergencyReport;
