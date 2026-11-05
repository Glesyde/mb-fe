
import React from 'react';
import { 
  FilePlus, 
  Construction, 
  Layout, 
  Database, 
  MousePointer2, 
  ArrowRight,
  TrendingUp,
  PieChart,
  Activity
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

const ReportBuilderPlaceholder: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in zoom-in-95 duration-500 pb-20">
      {/* Main Messaging Banner */}
      <div className="bg-white border border-slate-200 rounded-[48px] p-16 text-center shadow-sm relative overflow-hidden">
        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center justify-center p-5 bg-amber-50 text-amber-600 rounded-[32px] border-4 border-white shadow-xl mb-4 animate-bounce">
            <Construction size={48} />
          </div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">Custom Report Builder</h2>
          <p className="text-slate-500 text-lg font-medium max-w-2xl mx-auto leading-relaxed">
            Custom Report Builder is <span className="text-amber-600 font-black italic">coming soon</span>. 
            We are fine-tuning the drag-and-drop engine to ensure seamless data querying across all hospital modules.
          </p>
          <div className="pt-8 flex flex-col md:flex-row items-center justify-center gap-4">
             <NavLink 
               to="/reports/revenue"
               className="px-8 py-4 bg-indigo-600 text-white rounded-[24px] font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2 active:scale-95"
             >
                <TrendingUp size={16} /> Use Revenue Templates
             </NavLink>
             <NavLink 
               to="/reports/patients"
               className="px-8 py-4 bg-white border-2 border-slate-100 text-slate-600 rounded-[24px] font-black uppercase text-xs tracking-widest hover:border-indigo-200 hover:text-indigo-600 transition-all flex items-center gap-2"
             >
                <PieChart size={16} /> Patient Analytics
             </NavLink>
          </div>
        </div>
        
        {/* Background Patterns */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 border border-slate-100" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-50 rounded-full -ml-32 -mb-32 border border-slate-100" />
      </div>

      {/* Visual Teaser: Greyed out builder interface */}
      <div className="space-y-6 opacity-40 grayscale pointer-events-none select-none">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Future Interface Preview</h3>
        <div className="bg-slate-100/50 border-4 border-dashed border-slate-200 rounded-[48px] p-12 min-h-[500px] flex gap-8">
           {/* Sidebar Component Picker */}
           <div className="w-64 space-y-4">
              <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
                 <p className="text-[10px] font-black text-slate-300 uppercase">Data Blocks</p>
                 <div className="h-10 bg-slate-50 rounded-xl border border-slate-100" />
                 <div className="h-10 bg-slate-50 rounded-xl border border-slate-100" />
                 <div className="h-10 bg-slate-50 rounded-xl border border-slate-100" />
              </div>
              <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
                 <p className="text-[10px] font-black text-slate-300 uppercase">Visual Widgets</p>
                 <div className="grid grid-cols-2 gap-2">
                    <div className="h-12 bg-slate-50 rounded-xl border border-slate-100" />
                    <div className="h-12 bg-slate-50 rounded-xl border border-slate-100" />
                 </div>
              </div>
           </div>

           {/* Canvas Area */}
           <div className="flex-1 bg-white rounded-[40px] border border-slate-200 shadow-lg p-10 flex flex-col items-center justify-center text-center">
              <div className="p-8 border-4 border-dashed border-slate-100 rounded-[32px] w-full max-w-xl flex flex-col items-center gap-4">
                 <MousePointer2 size={40} className="text-slate-200" />
                 <p className="text-sm font-black text-slate-300 uppercase tracking-widest">Drop Elements Here to Build Dashboard</p>
              </div>
           </div>
        </div>
      </div>

      {/* Development Roadmap Card */}
      <div className="bg-indigo-50 border border-indigo-100 p-8 rounded-[44px] flex items-start gap-6">
         <div className="p-3 bg-white text-indigo-600 rounded-2xl shadow-sm border border-indigo-100">
            <Activity size={24} />
         </div>
         <div>
            <h4 className="text-lg font-black text-indigo-900 tracking-tight">Coming Q3: Cross-Module Intelligence</h4>
            <p className="text-sm text-indigo-700/80 leading-relaxed font-medium mt-1">
              The new builder will allow you to correlate patient arrival times with billing revenue and clinical inventory usage in real-time, enabling automated facility resource forecasting.
            </p>
         </div>
      </div>
    </div>
  );
};

export default ReportBuilderPlaceholder;
