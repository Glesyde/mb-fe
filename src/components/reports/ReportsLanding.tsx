import React from "react";
import { FileSpreadsheet, ArrowUp } from "lucide-react";

const ReportsLanding: React.FC = () => {
  return (
    <div className="hidden flex flex-col items-center justify-center min-h-[60vh] bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center animate-in fade-in duration-500">
      <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-emerald-100">
        <FileSpreadsheet className="text-emerald-500 w-10 h-10" />
      </div>
      <h2 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">
        Welcome to the Module Reports Hub
      </h2>
      <p className="text-slate-500 max-w-md text-lg mb-8 leading-relaxed">
        Select a report category from the tabs in the top navigation bar above to view, analyze, and export your hospital data.
      </p>
      
      <div className="flex items-center gap-2 text-emerald-600 font-bold bg-emerald-50 px-4 py-2 rounded-full animate-bounce">
        <ArrowUp size={20} />
        <span>Hover over the tabs above to begin</span>
      </div>
    </div>
  );
};

export default ReportsLanding;
