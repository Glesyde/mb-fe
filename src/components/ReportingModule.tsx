
import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Bed, 
  FlaskConical, 
  Download, 
  Filter, 
  Calendar as CalendarIcon,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  MousePointer2,
  PieChart as PieChartIcon,
  RefreshCcw
} from 'lucide-react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

// Mock Data
const REVENUE_DATA = [
  { day: '01 May', revenue: 420000 }, { day: '05 May', revenue: 580000 },
  { day: '10 May', revenue: 390000 }, { day: '15 May', revenue: 720000 },
  { day: '20 May', revenue: 610000 }, { day: '25 May', revenue: 850000 },
  { day: '30 May', revenue: 910000 },
];

const DEMOGRAPHIC_DATA = [
  { name: 'HMO Patients', value: 65, color: '#3b82f6' },
  { name: 'Private/Self', value: 25, color: '#14b8a6' },
  { name: 'Corporate', value: 10, color: '#6366f1' },
];

const DEPT_PERFORMANCE = [
  { name: 'GOPD', visits: 1240 },
  { name: 'Pediatrics', visits: 850 },
  { name: 'Antenatal', visits: 620 },
  { name: 'Cardiology', visits: 410 },
  { name: 'Surgery', visits: 280 },
  { name: 'Dental', visits: 190 },
];

const ReportingModule: React.FC = () => {
  const [dateRange, setDateRange] = useState({ from: '2025-05-01', to: '2025-05-31' });
  const [reportType, setReportType] = useState('Revenue Analysis');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExport = (type: 'pdf' | 'excel') => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      alert(`Exporting ${reportType} as ${type.toUpperCase()}...`);
    }, 1500);
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      {/* Module Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100">
              <BarChart3 size={24} />
            </div>
            Reporting & Analytics
          </h1>
          <p className="text-slate-500 font-medium">Hospital-wide operational insights and performance tracking.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
            <RefreshCcw size={20} />
          </button>
          <div className="h-8 w-px bg-slate-200 mx-2" />
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">
            <Filter size={14} /> Filter Dashboard
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Patients Today', value: '142', icon: Users, color: 'blue', trend: '+12%' },
          { label: 'Revenue Today', value: '₦1.2M', icon: TrendingUp, color: 'emerald', trend: '+8.4%' },
          { label: 'Active Admissions', value: '48', icon: Bed, color: 'indigo', trend: '-2%' },
          { label: 'Pending Lab Tests', value: '31', icon: FlaskConical, color: 'purple', trend: '+5%' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600`}>
                <stat.icon size={24} />
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${stat.trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                {stat.trend}
              </span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Charts Area */}
        <div className="lg:col-span-3 space-y-8">
          {/* Revenue Trend Chart */}
          <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Revenue Trend</h3>
                <p className="text-xs text-slate-500 font-medium">Daily revenue accumulation over the last 30 days.</p>
              </div>
              <div className="flex items-center gap-2">
                 <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl text-[10px] font-bold text-slate-500 border border-slate-100">
                    <div className="w-2 h-2 rounded-full bg-brand-primary" /> Revenue (₦)
                 </div>
              </div>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={REVENUE_DATA}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B309A" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3B309A" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 600}} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 600}} 
                    tickFormatter={(val) => `₦${val/1000}k`}
                  />
                  <Tooltip 
                    contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px'}}
                    itemStyle={{fontWeight: 700, fontSize: '12px'}}
                    labelStyle={{fontWeight: 800, fontSize: '10px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase'}}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#3B309A" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Department Performance */}
            <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
              <h3 className="text-lg font-black text-slate-800 tracking-tight mb-6">Visits per Clinic</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={DEPT_PERFORMANCE} layout="vertical" margin={{left: -20}}>
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#64748b', fontSize: 11, fontWeight: 700}} 
                      width={100}
                    />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px'}} />
                    <Bar dataKey="visits" fill="#3b82f6" radius={[0, 10, 10, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Demographics */}
            <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
              <h3 className="text-lg font-black text-slate-800 tracking-tight mb-6 flex items-center gap-2">
                <PieChartIcon size={20} className="text-teal-500" /> Patient Segments
              </h3>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={DEMOGRAPHIC_DATA}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {DEMOGRAPHIC_DATA.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {DEMOGRAPHIC_DATA.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs font-bold text-slate-600">{item.name}</span>
                    </div>
                    <span className="text-xs font-black text-slate-800">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Report Generator Panel */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[40px] p-8 text-white shadow-xl shadow-slate-200">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-brand-primary rounded-xl">
                <FileText size={20} />
              </div>
              <h3 className="text-xl font-bold">Report Builder</h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <CalendarIcon size={12} /> Reporting Period
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <input 
                    type="date" 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-active0 transition-colors"
                    value={dateRange.from}
                    onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
                  />
                  <input 
                    type="date" 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-active0 transition-colors"
                    value={dateRange.to}
                    onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Report Template</label>
                <div className="relative">
                  <select 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm outline-none appearance-none font-bold"
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                  >
                    <option>Revenue Analysis</option>
                    <option>HMO Utilization</option>
                    <option>Patient Attendance</option>
                    <option>Inventory Usage</option>
                    <option>Clinical Outcome</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-3">
                <button 
                  onClick={() => handleExport('excel')}
                  disabled={isGenerating}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  <FileSpreadsheet size={18} /> 
                  {isGenerating ? 'Generating...' : 'Export to Excel'}
                </button>
                <button 
                  onClick={() => handleExport('pdf')}
                  disabled={isGenerating}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Download size={18} /> 
                  {isGenerating ? 'Generating...' : 'Export to PDF'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-[32px]">
            <h4 className="text-sm font-bold text-indigo-800 mb-2 flex items-center gap-2">
               <MousePointer2 size={16} /> Data Interactivity
            </h4>
            <p className="text-xs text-indigo-600 leading-relaxed font-medium">
              Click on chart elements to drill down into specific departmental datasets. All data is sanitized and follows HIPAA/GDPR standards.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportingModule;
