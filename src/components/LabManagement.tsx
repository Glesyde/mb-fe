import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Layers, 
  Settings2, 
  FileText, 
  Droplets,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Trash2,
  Filter,
  Eye,
  X,
  ChevronRight,
  Activity,
  Info,
  ArrowDown,
  Building2,
  MapPin,
  Phone
} from 'lucide-react';
import { labService } from '../services/lab.service';
import { useNotification } from '../context/NotificationContext';

const LabManagement: React.FC = () => {
  const { notify } = useNotification();
  // Added 'outsource_centers' to tabs
  const [activeTab, setActiveTab] = useState<'categories' | 'panels' | 'parameters' | 'outsource_centers'>('categories');
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Data States
  const [categories, setCategories] = useState<any[]>([]);
  const [panels, setPanels] = useState<any[]>([]);
  const [parameters, setParameters] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [outsourceCenters, setOutsourceCenters] = useState<any[]>([]);

  // Modal States
  const [isParamModalOpen, setIsParamModalOpen] = useState(false);
  const [isPanelModalOpen, setIsPanelModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedParam, setSelectedParam] = useState<any>(null);

  // FIXED INITIAL FORM TO INCLUDE ID
  const INITIAL_PARAMETER_FORM = {
    id: undefined as number | undefined,
    category_id: '',
    panel_id: '',
    parameter_name: '',
    short_name: '',
    report_section: '',
    unit_id: '' as string | number,
    value_type: 'NUMERIC' as any,
    ref_low: '',
    ref_high: '',
    ref_low_female: '',
    ref_high_female: '',
    critical_low: '',
    critical_high: '',
    allow_manual_comment: true,
    active_status: true,
    notes: '',
    rules: {
      auto_flag_enabled: true,
      delta_check_enabled: false,
      critical_notification_required: false,
      delta_percent_threshold: '',
      panic_low: '',
      panic_high: '',
      requires_pathologist_review: false,
      auto_comment_template: '',
      critical_message: ''
    },
    options: [] as any[],
    reference_profiles: [] as any[]
  };

  const INITIAL_PANEL_FORM = {
    id: undefined as number | undefined,
    category_id: '',
    panel_name: '',
    report_group: '',
    specimen_type: '',
    turnaround_time_hours: '',
    active_status: true
  };

  const INITIAL_CENTER_FORM = {
    id: undefined as number | undefined,
    name: '',
    contact_phone: '',
    contact_email: '',
    address: '',
    active_status: true
  };

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // Form States
  const [categoryForm, setCategoryForm] = useState({ id: undefined as number | undefined, name: '', description: '' });
  const [parameterForm, setParameterForm] = useState(INITIAL_PARAMETER_FORM);
  const [panelForm, setPanelForm] = useState(INITIAL_PANEL_FORM);
  const [centerForm, setCenterForm] = useState(INITIAL_CENTER_FORM);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cats, pans, params, fetchedUnits, centers] = await Promise.all([
        labService.getCategories(),
        labService.getPanels(),
        labService.getParameters(),
        labService.getUnits(),
        labService.getOutsourceCenters()
      ]);
      setCategories(cats);
      setPanels(pans);
      setParameters(params);
      setUnits(fetchedUnits);
      setOutsourceCenters(centers);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to fetch management data';
      notify(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name) return notify('Category name is required', 'warning');
    
    setIsSaving(true);
    try {
      await labService.saveCategory(categoryForm);
      notify('Category saved successfully', 'success');
      setCategoryForm({ id: undefined, name: '', description: '' });
      fetchData();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to save category';
      notify(errorMsg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveOutsourceCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!centerForm.name) return notify('Partner laboratory name is required', 'warning');

    setIsSaving(true);
    try {
      await labService.saveOutsourceCenter({
        ...centerForm,
        active_status: centerForm.active_status ? 1 : 0
      });
      notify(`Outsource center ${centerForm.id ? 'updated' : 'added'} successfully`, 'success');
      setCenterForm(INITIAL_CENTER_FORM);
      fetchData();
    } catch (err: any) {
      notify(err.response?.data?.message || err.message || 'Failed to save outsource center', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOutsourceCenter = async (id: number) => {
    if (!window.confirm('Are you sure you want to remove this partner lab?')) return;
    try {
      await labService.deleteOutsourceCenter(id);
      notify('Partner deleted successfully', 'success');
      fetchData();
    } catch (err: any) {
      notify(err.response?.data?.message || 'Failed to delete partner', 'error');
    }
  };

  const addOption = () => {
    const newOption = { option_label: '', option_value: '', display_order: parameterForm.options.length + 1, is_critical_trigger: false };
    setParameterForm({ ...parameterForm, options: [...parameterForm.options, newOption] });
  };

  const removeOption = (index: number) => {
    const newOptions = parameterForm.options.filter((_, i) => i !== index);
    setParameterForm({ ...parameterForm, options: newOptions });
  };

  const updateOption = (index: number, field: string, value: any) => {
    const newOptions = [...parameterForm.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setParameterForm({ ...parameterForm, options: newOptions });
  };

  const addProfile = () => {
    const newProfile = { 
      profile_name: '', 
      sex: 'GENERAL', 
      age_min: 0, 
      age_max: '', 
      age_unit: 'YEARS', 
      ref_low: '', 
      ref_high: '', 
      priority_order: 50, 
      active_status: 1, 
      notes: '' 
    };
    setParameterForm({ ...parameterForm, reference_profiles: [...parameterForm.reference_profiles, newProfile] });
  };

  const removeProfile = (index: number) => {
    const newProfiles = parameterForm.reference_profiles.filter((_, i) => i !== index);
    setParameterForm({ ...parameterForm, reference_profiles: newProfiles });
  };

  const updateProfile = (index: number, field: string, value: any) => {
    const newProfiles = [...parameterForm.reference_profiles];
    newProfiles[index] = { ...newProfiles[index], [field]: value };
    setParameterForm({ ...parameterForm, reference_profiles: newProfiles });
  };

  const handleSaveParameter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parameterForm.category_id || !parameterForm.parameter_name) {
      return notify('Category and Parameter Name are required', 'warning');
    }

    setIsSaving(true);
    try {
      const isNumeric = parameterForm.value_type === 'NUMERIC';

      const payload = {
        ...parameterForm,
        category_id: Number(parameterForm.category_id),
        panel_id: parameterForm.panel_id ? Number(parameterForm.panel_id) : undefined,
        active_status: parameterForm.active_status ? 1 : 0,
        
        // Conditionally set numeric fields to null if value_type is NOT NUMERIC
        unit_id: isNumeric && parameterForm.unit_id ? Number(parameterForm.unit_id) : null,
        ref_low: isNumeric && parameterForm.ref_low !== '' ? Number(parameterForm.ref_low) : null,
        ref_high: isNumeric && parameterForm.ref_high !== '' ? Number(parameterForm.ref_high) : null,
        ref_low_female: isNumeric && parameterForm.ref_low_female !== '' ? Number(parameterForm.ref_low_female) : null,
        ref_high_female: isNumeric && parameterForm.ref_high_female !== '' ? Number(parameterForm.ref_high_female) : null,
        critical_low: isNumeric && parameterForm.critical_low !== '' ? Number(parameterForm.critical_low) : null,
        critical_high: isNumeric && parameterForm.critical_high !== '' ? Number(parameterForm.critical_high) : null,
        
        rules: {
          ...parameterForm.rules,
          delta_percent_threshold: parameterForm.rules.delta_percent_threshold !== '' ? Number(parameterForm.rules.delta_percent_threshold) : 0,
          panic_low: isNumeric && parameterForm.rules.panic_low !== '' ? Number(parameterForm.rules.panic_low) : null,
          panic_high: isNumeric && parameterForm.rules.panic_high !== '' ? Number(parameterForm.rules.panic_high) : null,
        },
        
        reference_profiles: parameterForm.reference_profiles.map(p => ({
          ...p,
          ref_low: isNumeric && p.ref_low !== '' ? Number(p.ref_low) : 0,
          ref_high: isNumeric && p.ref_high !== '' ? Number(p.ref_high) : 0,
          pregnancy_status: p.pregnancy_status ? 1 : 0,
          active_status: p.active_status ? 1 : 0
        })),
        
        options: parameterForm.options.map((opt, idx) => ({
          ...opt,
          display_order: opt.display_order || idx + 1
        }))
      };
      
      await labService.saveParameter(payload);
      notify(`Parameter ${parameterForm.id ? 'updated' : 'created'} successfully`, 'success');
      setParameterForm(INITIAL_PARAMETER_FORM);
      setIsParamModalOpen(false);
      fetchData();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to save parameter';
      notify(errorMsg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePanel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!panelForm.category_id || !panelForm.panel_name) {
      return notify('Category and Panel Name are required', 'warning');
    }

    setIsSaving(true);
    try {
      const payload = {
        ...panelForm,
        category_id: Number(panelForm.category_id),
        turnaround_time_hours: Number(panelForm.turnaround_time_hours),
        active_status: panelForm.active_status ? 1 : 0
      };
      
      await labService.savePanel(payload);
      notify(`Panel ${panelForm.id ? 'updated' : 'created'} successfully`, 'success');
      setPanelForm(INITIAL_PANEL_FORM);
      setIsPanelModalOpen(false);
      fetchData();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to save panel';
      notify(errorMsg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePanel = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this panel?')) return;
    try {
      await labService.deletePanel(id);
      notify('Panel deleted successfully', 'success');
      fetchData();
    } catch (err: any) {
      notify(err.response?.data?.message || 'Failed to delete panel', 'error');
    }
  };

  const handleDeleteParameter = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this parameter?')) return;
    try {
      await labService.deleteParameter(id);
      notify('Parameter deleted successfully', 'success');
      fetchData();
    } catch (err: any) {
      notify(err.response?.data?.message || 'Failed to delete parameter', 'error');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await labService.deleteCategory(id);
      notify('Category deleted successfully', 'success');
      fetchData();
    } catch (err: any) {
      notify(err.response?.data?.message || 'Failed to delete category', 'error');
    }
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPanels = panels.filter(p => 
    p.panel_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (!filterCategory || p.category_id === Number(filterCategory))
  );

  const filteredParameters = parameters.filter(p => 
    (p.parameter_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     p.short_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     p.test_code?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (!filterCategory || p.category_id === Number(filterCategory))
  );

  const filteredCenters = outsourceCenters.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">System Configuration</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Configure laboratory test parameters, panels, and partners.</p>
        </div>
        
        <div className="flex items-center flex-wrap gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200/50 w-fit">
          <button 
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'categories' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers size={14} /> Categories
          </button>
          <button 
            onClick={() => setActiveTab('panels')}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'panels' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Droplets size={14} /> Panels
          </button>
          <button 
            onClick={() => setActiveTab('parameters')}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'parameters' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings2 size={14} /> Parameters
          </button>
          <button 
            onClick={() => setActiveTab('outsource_centers')}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'outsource_centers' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 size={14} /> Partners
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Form Section */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[32px] shadow-sm p-8">
            {activeTab === 'categories' ? (
              <form onSubmit={handleSaveCategory} className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                    {categoryForm.id ? <Settings2 size={20} /> : <Plus size={20} />}
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">{categoryForm.id ? 'Edit' : 'New'} Category</h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category Name</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
                      placeholder="e.g. HEMATOLOGY"
                      value={categoryForm.name}
                      onChange={e => setCategoryForm({...categoryForm, name: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                    <textarea 
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all resize-none"
                      placeholder="Testing scope and focus..."
                      value={categoryForm.description}
                      onChange={e => setCategoryForm({...categoryForm, description: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-100 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                    {categoryForm.id ? 'Update' : 'Save'} Category
                  </button>

                  {categoryForm.id && (
                    <button 
                      type="button"
                      onClick={() => setCategoryForm({ id: undefined, name: '', description: '' })}
                      className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            ) : activeTab === 'panels' ? (
              <div className="space-y-6">
                 <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Droplets size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800">Diagnostic Panels</h3>
                    <p className="text-xs text-slate-400 font-medium italic">Bundle multiple parameters into single tests.</p>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                   <p className="text-sm text-slate-600 leading-relaxed">
                     Panels allow you to group related parameters (e.g. FBC, Lipid Profile) for easier ordering and reporting.
                   </p>
                </div>
                <button 
                  onClick={() => {
                    setPanelForm(INITIAL_PANEL_FORM);
                    setIsPanelModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                >
                  <Plus size={18} /> Configure New Panel
                </button>
              </div>
            ) : activeTab === 'outsource_centers' ? (
              <form onSubmit={handleSaveOutsourceCenter} className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    {centerForm.id ? <Settings2 size={20} /> : <Building2 size={20} />}
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">{centerForm.id ? 'Edit' : 'New'} Partner</h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Laboratory Name</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                      placeholder="e.g. Synlab Nigeria"
                      value={centerForm.name}
                      onChange={e => setCenterForm({...centerForm, name: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone</label>
                      <input 
                        type="text"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-blue-500 transition-all"
                        placeholder="0800-SYNLAB"
                        value={centerForm.contact_phone}
                        onChange={e => setCenterForm({...centerForm, contact_phone: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                      <input 
                        type="email"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-blue-500 transition-all"
                        placeholder="lab@partner.com"
                        value={centerForm.contact_email}
                        onChange={e => setCenterForm({...centerForm, contact_email: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Address / Notes</label>
                    <textarea 
                      rows={2}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-blue-500 transition-all resize-none"
                      placeholder="Dropoff location details..."
                      value={centerForm.address}
                      onChange={e => setCenterForm({...centerForm, address: e.target.value})}
                    />
                  </div>
                  
                  <div className="flex items-center gap-3 pt-2">
                    <input 
                      type="checkbox"
                      id="center_status"
                      className="w-5 h-5 rounded-lg text-blue-600 focus:ring-blue-500"
                      checked={centerForm.active_status}
                      onChange={e => setCenterForm({...centerForm, active_status: e.target.checked})}
                    />
                    <label htmlFor="center_status" className="text-sm font-bold text-slate-700">Active / Enabled</label>
                  </div>
                </div>

                <div className="space-y-3">
                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                    {centerForm.id ? 'Update' : 'Save'} Partner
                  </button>

                  {centerForm.id && (
                    <button 
                      type="button"
                      onClick={() => setCenterForm(INITIAL_CENTER_FORM)}
                      className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Settings2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800">Lab Parameters</h3>
                    <p className="text-xs text-slate-400 font-medium italic">Define specific measurable values.</p>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                   <p className="text-sm text-slate-600 leading-relaxed">
                     Configure reference ranges, units, and automation rules for individual test components.
                   </p>
                </div>
                <button 
                  onClick={() => {
                    setParameterForm(INITIAL_PARAMETER_FORM);
                    setIsParamModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                  <Plus size={18} /> Define New Parameter
                </button>
              </div>
            )}
          </div>
        </div>

        {/* List Section */}
        <div className="xl:col-span-8 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[32px] shadow-sm overflow-hidden min-h-[500px]">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                {activeTab === 'categories' ? <Layers size={16} /> : activeTab === 'panels' ? <Droplets size={16} /> : activeTab === 'outsource_centers' ? <Building2 size={16} /> : <Settings2 size={16} />}
                Existing {activeTab.replace('_', ' ')}
              </h3>
              
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="relative group w-full md:w-64">
                   <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-600 transition-colors" />
                   <input 
                     type="text"
                     placeholder={`Search ${activeTab.replace('_', ' ')}...`}
                     className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-purple-600 transition-all shadow-sm"
                     value={searchTerm}
                     onChange={e => setSearchTerm(e.target.value)}
                   />
                </div>
                {(activeTab === 'panels' || activeTab === 'parameters') && (
                  <select 
                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-purple-600 transition-all shadow-sm"
                    value={filterCategory}
                    onChange={e => setFilterCategory(e.target.value)}
                  >
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                )}
                <span className="text-[10px] font-black text-slate-400 bg-white px-4 py-2 rounded-xl border border-slate-200 whitespace-nowrap shadow-sm">
                  TOTAL: {activeTab === 'categories' ? filteredCategories.length : activeTab === 'panels' ? filteredPanels.length : activeTab === 'outsource_centers' ? filteredCenters.length : filteredParameters.length}
                </span>
              </div>
            </div>

            <div className="max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="bg-slate-50/30 border-b border-slate-100">
                    {activeTab === 'categories' ? (
                      <>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-20">ID</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Prefix</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Parameters</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                      </>
                    ) : activeTab === 'panels' ? (
                      <>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Panel Name</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">TAT (Hrs)</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                      </>
                    ) : activeTab === 'outsource_centers' ? (
                      <>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Partner Name</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Info</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                      </>
                    ) : (
                      <>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Parameter</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <Loader2 className="animate-spin inline-block text-purple-600 mb-2" size={32} />
                        <p className="text-sm text-slate-500 font-medium">Syncing with server...</p>
                      </td>
                    </tr>
                  ) : activeTab === 'categories' ? (
                    filteredCategories.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center text-slate-400 italic font-medium">No categories matching your search.</td>
                      </tr>
                    ) : (
                      filteredCategories.map(cat => (
                        <tr key={cat.id} className="group hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-xs font-mono text-slate-400">#{cat.id}</td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-slate-800">{cat.name}</p>
                            {cat.description && <p className="text-[10px] text-slate-400 mt-0.5">{cat.description}</p>}
                          </td>
                          <td className="px-6 py-4 text-xs font-black text-purple-600 tracking-wider font-mono">{cat.prefix || '-'}</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-600">{cat.parameter_count || 0} items</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => setCategoryForm({ id: cat.id, name: cat.name, description: cat.description || '' })}
                                className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                                title="Edit Category"
                              >
                                <Settings2 size={16} />
                              </button>
                              <button 
                                onClick={() => handleDeleteCategory(cat.id)}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                title="Delete Category"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )
                  ) : activeTab === 'panels' ? (
                    filteredPanels.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-20 text-center text-slate-400 italic font-medium">No panels found. Try adjusting your filters.</td>
                      </tr>
                    ) : (
                      filteredPanels.map(panel => (
                        <tr key={panel.id} className="group hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-slate-800">{panel.panel_name}</p>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter mt-0.5">{panel.specimen_type}</p>
                          </td>
                          <td className="px-6 py-4">
                             <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 tracking-tight uppercase">
                               {panel.category_name}
                             </span>
                          </td>
                          <td className="px-6 py-4">
                             <span className="text-xs font-bold text-slate-600">{panel.turnaround_time_hours} hrs</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => {
                                  setPanelForm({
                                    id: panel.id,
                                    category_id: panel.category_id,
                                    panel_name: panel.panel_name,
                                    report_group: panel.report_group,
                                    specimen_type: panel.specimen_type,
                                    turnaround_time_hours: panel.turnaround_time_hours,
                                    active_status: panel.active_status
                                  });
                                  setIsPanelModalOpen(true);
                                }}
                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                              >
                                <Settings2 size={18} />
                              </button>
                              <button 
                                onClick={() => handleDeletePanel(panel.id)}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )
                  ) : activeTab === 'outsource_centers' ? (
                    filteredCenters.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-20 text-center text-slate-400 italic font-medium">No partner laboratories registered.</td>
                      </tr>
                    ) : (
                      filteredCenters.map(center => (
                        <tr key={center.id} className="group hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
                                {center.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-800">{center.name}</p>
                                {center.address && <p className="text-[10px] text-slate-400 font-medium truncate max-w-[200px]">{center.address}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              {center.contact_phone && (
                                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                                  <Phone size={12} className="text-slate-400" /> {center.contact_phone}
                                </div>
                              )}
                              {center.contact_email && (
                                <p className="text-[10px] text-slate-400 font-medium">{center.contact_email}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded tracking-tight uppercase ${
                              center.active_status ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {center.active_status ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => {
                                  setCenterForm({
                                    id: center.id,
                                    name: center.name,
                                    address: center.address || '',
                                    contact_phone: center.contact_phone || '',
                                    contact_email: center.contact_email || '',
                                    active_status: center.active_status === 1 || center.active_status === true
                                  });
                                }}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              >
                                <Settings2 size={18} />
                              </button>
                              <button 
                                onClick={() => handleDeleteOutsourceCenter(center.id)}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )
                  ) : (
                    filteredParameters.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-20 text-center text-slate-400 italic font-medium">No parameters found. Try searching for something else.</td>
                      </tr>
                    ) : (
                      filteredParameters.map(param => (
                      <tr key={param.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-800">{param.parameter_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-tight">{param.short_name || 'N/A'}</span>
                            <span className="text-[9px] font-mono text-slate-400">{param.test_code}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 tracking-tight uppercase">{param.category_name}</span>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex flex-col">
                             <span className="text-xs font-bold text-slate-600">{param.unit_display_name || '-'}</span>
                             <span className="text-[9px] text-slate-400 font-medium uppercase tracking-tighter">{param.value_type}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => {
                                setSelectedParam({
                                  ...param,
                                  reference_profiles: param.profiles || []
                                });
                                setIsDetailsModalOpen(true);
                              }}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                              title="View Details"
                            >
                              <Eye size={18} />
                            </button>
                            <button 
                              onClick={() => {
                                setParameterForm({
                                  ...INITIAL_PARAMETER_FORM,
                                  ...param,
                                  reference_profiles: param.profiles || [],
                                  options: param.options || [],
                                  id: param.id,
                                  category_id: String(param.category_id),
                                  panel_id: param.panel_id ? String(param.panel_id) : '',
                                  unit_id: param.unit_id ? Number(param.unit_id) : '',
                                  active_status: param.active_status === 1 || param.active_status === true
                                });
                                setIsParamModalOpen(true);
                              }}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="Edit Parameter"
                            >
                              <Settings2 size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteParameter(param.id)}
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              title="Delete Parameter"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      ))
                    )
                  )
                }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* Create/Edit Parameter Modal */}
      {isParamModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col scale-in-center transition-all">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
                  <Settings2 size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Configure Parameter</h3>
                  <p className="text-xs text-slate-500 font-medium">Define testing rules, ranges, and result formats.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsParamModalOpen(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8">
              <form id="paramForm" onSubmit={handleSaveParameter} className="space-y-10">
                {/* Section 1: Basic Information */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Info size={16} className="text-indigo-600" />
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Basic Information</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Parent Category</label>
                      <select 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                        value={parameterForm.category_id}
                        onChange={e => setParameterForm({
                          ...parameterForm, 
                          category_id: e.target.value,
                          panel_id: '' // Reset panel when category changes
                        })}
                      >
                        <option value="">Select Category</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Laboratory Panel (Optional)</label>
                      <select 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                        value={parameterForm.panel_id}
                        onChange={e => setParameterForm({...parameterForm, panel_id: e.target.value})}
                        disabled={!parameterForm.category_id}
                      >
                        <option value="">Select Panel</option>
                        {panels
                          .filter(p => !parameterForm.category_id || p.category_id === Number(parameterForm.category_id))
                          .map(panel => (
                            <option key={panel.id} value={panel.id}>{panel.panel_name}</option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Parameter Name</label>
                      <input 
                        type="text"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none"
                        placeholder="e.g. Hemoglobin"
                        value={parameterForm.parameter_name}
                        onChange={e => setParameterForm({...parameterForm, parameter_name: e.target.value})}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Short Name / Alias</label>
                      <input 
                        type="text"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none"
                        placeholder="e.g. HB"
                        value={parameterForm.short_name}
                        onChange={e => setParameterForm({...parameterForm, short_name: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Report Section</label>
                      <input 
                        type="text"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none"
                        placeholder="e.g. Hematology"
                        value={parameterForm.report_section}
                        onChange={e => setParameterForm({...parameterForm, report_section: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit</label>
                      <select 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none disabled:opacity-50"
                        value={parameterForm.unit_id}
                        onChange={e => setParameterForm({...parameterForm, unit_id: e.target.value ? Number(e.target.value) : ''})}
                        disabled={parameterForm.value_type !== 'NUMERIC'}
                      >
                        <option value="">-- No Unit --</option>
                        {units.map((u) => (
                          <option key={u.id} value={u.id}>{u.display_name} ({u.description})</option>
                        ))}
                      </select>
                      {parameterForm.value_type !== 'NUMERIC' && (
                        <span className="text-[10px] text-amber-500 font-medium ml-1">Not needed for this type</span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Value Type</label>
                      <select 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none"
                        value={parameterForm.value_type}
                        onChange={e => setParameterForm({...parameterForm, value_type: e.target.value as any})}
                      >
                        <option value="NUMERIC">NUMERIC</option>
                        <option value="TEXT">TEXT</option>
                        <option value="SELECT">SELECT (Options)</option>
                        <option value="BOOLEAN">BOOLEAN</option>
                        <option value="NARRATIVE">NARRATIVE</option>
                      </select>
                      {parameterForm.value_type === 'SELECT' && (
                        <div className="flex items-center gap-1.5 mt-2 ml-1 animate-in slide-in-from-top-1 fade-in duration-300">
                          <ArrowDown size={12} className="text-blue-500 animate-bounce" />
                          <span className="text-[10px] font-bold text-blue-600">Scroll down to configure Result Options</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Conditional Rendering: Only show Reference Ranges if value type is NUMERIC */}
                {parameterForm.value_type === 'NUMERIC' && (
                  <>
                    {/* Section 2: Reference Ranges */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <Activity size={16} className="text-indigo-600" />
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Reference Ranges</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ref Low (Male/Gen)</label>
                          <input 
                            type="number" step="any"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none"
                            value={parameterForm.ref_low}
                            onChange={e => setParameterForm({...parameterForm, ref_low: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ref High (Male/Gen)</label>
                          <input 
                            type="number" step="any"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none"
                            value={parameterForm.ref_high}
                            onChange={e => setParameterForm({...parameterForm, ref_high: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-pink-400 uppercase tracking-widest ml-1">Ref Low (Female)</label>
                          <input 
                            type="number" step="any"
                            className="w-full px-4 py-3 bg-pink-50/30 border border-pink-100 rounded-2xl text-sm font-medium outline-none"
                            value={parameterForm.ref_low_female}
                            onChange={e => setParameterForm({...parameterForm, ref_low_female: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-pink-400 uppercase tracking-widest ml-1">Ref High (Female)</label>
                          <input 
                            type="number" step="any"
                            className="w-full px-4 py-3 bg-pink-50/30 border border-pink-100 rounded-2xl text-sm font-medium outline-none"
                            value={parameterForm.ref_high_female}
                            onChange={e => setParameterForm({...parameterForm, ref_high_female: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-red-400 uppercase tracking-widest ml-1">Critical Low</label>
                          <input 
                            type="number" step="any"
                            className="w-full px-4 py-3 bg-red-50/30 border border-red-100 rounded-2xl text-sm font-medium outline-none"
                            value={parameterForm.critical_low}
                            onChange={e => setParameterForm({...parameterForm, critical_low: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-red-400 uppercase tracking-widest ml-1">Critical High</label>
                          <input 
                            type="number" step="any"
                            className="w-full px-4 py-3 bg-red-50/30 border border-red-100 rounded-2xl text-sm font-medium outline-none"
                            value={parameterForm.critical_high}
                            onChange={e => setParameterForm({...parameterForm, critical_high: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Section 3: Rules & Validation */}
                <div className="space-y-6 p-6 bg-slate-50 rounded-[24px]">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                    <AlertCircle size={16} className="text-amber-600" />
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Rules & Validation</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox"
                        id="auto_flag"
                        className="w-5 h-5 rounded-lg text-indigo-600"
                        checked={parameterForm.rules.auto_flag_enabled}
                        onChange={e => setParameterForm({...parameterForm, rules: {...parameterForm.rules, auto_flag_enabled: e.target.checked}})}
                      />
                      <label htmlFor="auto_flag" className="text-sm font-bold text-slate-700">Auto Flag Enabled</label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox"
                        id="delta_check"
                        className="w-5 h-5 rounded-lg text-indigo-600"
                        checked={parameterForm.rules.delta_check_enabled}
                        onChange={e => setParameterForm({...parameterForm, rules: {...parameterForm.rules, delta_check_enabled: e.target.checked}})}
                      />
                      <label htmlFor="delta_check" className="text-sm font-bold text-slate-700">Delta Check Enabled</label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox"
                        id="pathologist_review"
                        className="w-5 h-5 rounded-lg text-indigo-600"
                        checked={parameterForm.rules.requires_pathologist_review}
                        onChange={e => setParameterForm({...parameterForm, rules: {...parameterForm.rules, requires_pathologist_review: e.target.checked}})}
                      />
                      <label htmlFor="pathologist_review" className="text-sm font-bold text-slate-700">Pathologist Review Req.</label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Panic Low</label>
                      <input 
                        type="number" step="any"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none disabled:opacity-50 disabled:bg-slate-100"
                        value={parameterForm.rules.panic_low}
                        onChange={e => setParameterForm({...parameterForm, rules: {...parameterForm.rules, panic_low: e.target.value}})}
                        disabled={parameterForm.value_type !== 'NUMERIC'}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Panic High</label>
                      <input 
                        type="number" step="any"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none disabled:opacity-50 disabled:bg-slate-100"
                        value={parameterForm.rules.panic_high}
                        onChange={e => setParameterForm({...parameterForm, rules: {...parameterForm.rules, panic_high: e.target.value}})}
                        disabled={parameterForm.value_type !== 'NUMERIC'}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Delta % Threshold</label>
                      <input 
                        type="number"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none"
                        placeholder="e.g. 20"
                        value={parameterForm.rules.delta_percent_threshold}
                        onChange={e => setParameterForm({...parameterForm, rules: {...parameterForm.rules, delta_percent_threshold: e.target.value}})}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Auto Comment Template</label>
                      <textarea 
                        rows={2}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none resize-none"
                        placeholder="Result is {{FLAG}}..."
                        value={parameterForm.rules.auto_comment_template}
                        onChange={e => setParameterForm({...parameterForm, rules: {...parameterForm.rules, auto_comment_template: e.target.value}})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Critical Alert Message</label>
                      <textarea 
                        rows={2}
                        className="w-full px-4 py-3 bg-white border border-red-100 rounded-2xl text-sm font-medium outline-none resize-none text-red-600"
                        placeholder="Immediate notification required..."
                        value={parameterForm.rules.critical_message}
                        onChange={e => setParameterForm({...parameterForm, rules: {...parameterForm.rules, critical_message: e.target.value}})}
                      />
                    </div>
                  </div>
                </div>

                {/* Conditional Rendering: Only show Advanced Profiles if value type is NUMERIC */}
                {parameterForm.value_type === 'NUMERIC' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Droplets size={16} className="text-indigo-600" />
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Advanced Reference Profiles</h4>
                      </div>
                      <button 
                        type="button"
                        onClick={addProfile}
                        className="flex items-center gap-2 px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all"
                      >
                        <Plus size={14} /> Add Profile
                      </button>
                    </div>

                    {parameterForm.reference_profiles.length === 0 ? (
                      <div className="py-10 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                        <Info size={24} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-xs text-slate-400 font-medium italic">No advanced reference profiles defined.<br/>Standard ranges will be used.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {parameterForm.reference_profiles.map((profile, idx) => (
                          <div key={idx} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6 relative group overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                            
                            <div className="flex items-start justify-between">
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Profile Name</label>
                                  <input 
                                    type="text"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                                    placeholder="e.g. Neonatal (0-30 days)"
                                    value={profile.profile_name}
                                    onChange={e => updateProfile(idx, 'profile_name', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sex Context</label>
                                  <select 
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                                    value={profile.sex}
                                    onChange={e => updateProfile(idx, 'sex', e.target.value as any)}
                                  >
                                    <option value="GENERAL">General (Both)</option>
                                    <option value="M">Male Only</option>
                                    <option value="F">Female Only</option>
                                  </select>
                                </div>
                                <div className="space-y-1.5 text-right">
                                  <button 
                                    type="button"
                                    onClick={() => removeProfile(idx)}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Min Age</label>
                                <div className="flex gap-2">
                                  <input 
                                    type="number"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                                    value={profile.age_min}
                                    onChange={e => updateProfile(idx, 'age_min', Number(e.target.value))}
                                  />
                                  <select 
                                    className="px-2 bg-slate-50 border border-slate-200 rounded-xl text-[9px] font-black outline-none"
                                    value={profile.age_unit}
                                    onChange={e => updateProfile(idx, 'age_unit', e.target.value as any)}
                                  >
                                    <option value="DAYS">DAYS</option>
                                    <option value="MONTHS">MONTHS</option>
                                    <option value="YEARS">YEARS</option>
                                  </select>
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Max Age (Null for no limit)</label>
                                <input 
                                  type="number"
                                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                                  value={profile.age_max || ''}
                                  onChange={e => updateProfile(idx, 'age_max', e.target.value ? Number(e.target.value) : null)}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Profile Low</label>
                                <input 
                                  type="number" step="any"
                                  className="w-full px-4 py-2.5 bg-emerald-50/50 border border-emerald-100 rounded-xl text-xs font-bold outline-none"
                                  value={profile.ref_low}
                                  onChange={e => updateProfile(idx, 'ref_low', e.target.value)}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Profile High</label>
                                <input 
                                  type="number" step="any"
                                  className="w-full px-4 py-2.5 bg-emerald-50/50 border border-emerald-100 rounded-xl text-xs font-bold outline-none"
                                  value={profile.ref_high}
                                  onChange={e => updateProfile(idx, 'ref_high', e.target.value)}
                                />
                              </div>
                            </div>

                            {profile.sex === 'F' && (
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl">
                                     <input 
                                       type="checkbox"
                                       checked={profile.pregnancy_status}
                                       onChange={e => updateProfile(idx, 'pregnancy_status', e.target.checked)}
                                       className="w-4 h-4 rounded text-indigo-600"
                                     />
                                     <label className="text-[10px] font-bold text-slate-600">Apply to Pregnancy only?</label>
                                  </div>
                                  {profile.pregnancy_status && (
                                    <select 
                                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                                      value={profile.pregnancy_trimester}
                                      onChange={e => updateProfile(idx, 'pregnancy_trimester', e.target.value as any)}
                                    >
                                      <option value="">Any Trimester</option>
                                      <option value="T1">1st Trimester (T1)</option>
                                      <option value="T2">2nd Trimester (T2)</option>
                                      <option value="T3">3rd Trimester (T3)</option>
                                    </select>
                                  )}
                               </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Section 5: Interpretations & Risk Levels (Options) */}
                {parameterForm.value_type === 'SELECT' ? (
                  <div className="space-y-6">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <Layers size={16} className="text-blue-600" />
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Result Options</h4>
                        </div>
                        <button 
                          type="button"
                          onClick={addOption}
                          className="flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all"
                        >
                          <Plus size={14} /> Add Option
                        </button>
                      </div>

                      <div className="space-y-4">
                        {parameterForm.options.map((opt, idx) => (
                          <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50 p-4 rounded-2xl border border-slate-200/50">
                            <div className="md:col-span-4 space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Label</label>
                              <input 
                                type="text"
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                                placeholder="e.g. Positive"
                                value={opt.option_label}
                                onChange={e => updateOption(idx, 'option_label', e.target.value)}
                              />
                            </div>
                            <div className="md:col-span-3 space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Value</label>
                              <input 
                                type="text"
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono outline-none"
                                placeholder="POS"
                                value={opt.option_value}
                                onChange={e => updateOption(idx, 'option_value', e.target.value)}
                              />
                            </div>
                            <div className="md:col-span-3 flex items-center gap-3 mb-2">
                              <input 
                                type="checkbox"
                                id={`crit-${idx}`}
                                checked={opt.is_critical_trigger}
                                onChange={e => updateOption(idx, 'is_critical_trigger', e.target.checked)}
                              />
                              <label htmlFor={`crit-${idx}`} className="text-[10px] font-bold text-slate-600">Critical Trigger</label>
                            </div>
                            <div className="md:col-span-2 text-right">
                              <button 
                                type="button"
                                onClick={() => removeOption(idx)}
                                className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        ))}
                        {parameterForm.options.length === 0 && (
                          <p className="text-center py-6 text-sm text-slate-400 italic">No options added yet.</p>
                        )}
                      </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                     <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                       <div className="flex items-center gap-2">
                         <Layers size={16} className="text-slate-400" />
                         <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Result Options</h4>
                       </div>
                     </div>
                     <div className="py-8 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                       <Info size={24} className="mx-auto text-blue-400 mb-2" />
                       <p className="text-xs text-slate-500 font-medium">Result options are only available when the <strong className="text-slate-700">Value Type</strong> is set to <strong className="text-slate-700">SELECT (Options)</strong>.</p>
                       <p className="text-[10px] text-slate-400 mt-1">Change the Value Type above to add predefined dropdown options.</p>
                     </div>
                  </div>
                )}
              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-4">
              <button 
                onClick={() => setIsParamModalOpen(false)}
                className="px-8 py-3 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button 
                form="paramForm"
                type="submit"
                disabled={isSaving}
                className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Panel Modal */}
      {isPanelModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col scale-in-center transition-all">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-200">
                  <Droplets size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">{panelForm.id ? 'Update' : 'Configure'} Panel</h3>
                  <p className="text-xs text-slate-500 font-medium">Bundle multiple test parameters together.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsPanelModalOpen(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <form id="panelForm" onSubmit={handleSavePanel} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Parent Category</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                    value={panelForm.category_id}
                    onChange={e => setPanelForm({...panelForm, category_id: e.target.value})}
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Panel Name</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-emerald-500 transition-all"
                    placeholder="e.g. Lipid Profile"
                    value={panelForm.panel_name}
                    onChange={e => setPanelForm({...panelForm, panel_name: e.target.value})}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Report Group</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none"
                    placeholder="e.g. Biochemistry"
                    value={panelForm.report_group}
                    onChange={e => setPanelForm({...panelForm, report_group: e.target.value})}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Specimen Type</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none"
                    placeholder="e.g. Plasma (EDTA)"
                    value={panelForm.specimen_type}
                    onChange={e => setPanelForm({...panelForm, specimen_type: e.target.value})}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">TAT (Hours)</label>
                  <input 
                    type="number"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none"
                    placeholder="e.g. 12"
                    value={panelForm.turnaround_time_hours}
                    onChange={e => setPanelForm({...panelForm, turnaround_time_hours: e.target.value})}
                  />
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <input 
                    type="checkbox"
                    id="panel_status"
                    className="w-5 h-5 rounded-lg text-emerald-600 focus:ring-emerald-500"
                    checked={panelForm.active_status as boolean}
                    onChange={e => setPanelForm({...panelForm, active_status: e.target.checked})}
                  />
                  <label htmlFor="panel_status" className="text-sm font-bold text-slate-700">Active Status</label>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-4">
              <button 
                onClick={() => setIsPanelModalOpen(false)}
                className="px-8 py-3 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button 
                form="panelForm"
                type="submit"
                disabled={isSaving}
                className="px-10 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                {panelForm.id ? 'Update Panel' : 'Create Panel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Parameter Details View Modal */}
      {isDetailsModalOpen && selectedParam && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col scale-in-center">
            {/* Enterprise Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-slate-50 border border-slate-100 text-indigo-600 rounded-2xl shadow-inner">
                  <Activity size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">{selectedParam.parameter_name}</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${selectedParam.active_status ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                      {selectedParam.active_status ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-tighter">{selectedParam.category_name}</span>
                    <span className="text-xs text-slate-400 font-mono font-bold">ID: {selectedParam.test_code}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsDetailsModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 bg-slate-50/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Specs Section */}
                <div className="space-y-10">
                  <div className="bg-white p-8 rounded-[24px] border border-slate-100 shadow-sm">
                    <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                      <Info size={14} /> Core Specifications
                    </h4>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-1">
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Short Name</p>
                        <p className="text-sm font-bold text-slate-700">{selectedParam.short_name || '—'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Result Unit</p>
                        <p className="text-sm font-bold text-slate-700">{selectedParam.unit_display_name || '—'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Data Type</p>
                        <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-black tracking-tight">{selectedParam.value_type}</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Laboratory Panel</p>
                        <p className="text-sm font-bold text-slate-800">
                          {selectedParam.panel_name || panels.find(p => p.id === selectedParam.panel_id)?.panel_name || 'Individual'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Report Section</p>
                        <p className="text-sm font-bold text-slate-700">{selectedParam.report_section || '—'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Manual Comment</p>
                        <span className={`inline-block px-2 py-1 rounded text-[10px] font-black tracking-tight ${selectedParam.allow_manual_comment ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                          {selectedParam.allow_manual_comment ? 'ALLOWED' : 'DISABLED'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-[24px] border border-slate-100 shadow-sm">
                     <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                      <Settings2 size={14} /> Automation Rules
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: 'Auto Flagging', active: selectedParam.auto_flag_enabled },
                        { label: 'Delta Checking', active: selectedParam.delta_check_enabled },
                        { label: 'Pathologist Review', active: selectedParam.requires_pathologist_review },
                        { label: 'Critical Notify', active: selectedParam.critical_notification_required },
                      ].map((rule, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
                          <span className="text-[11px] font-bold text-slate-600">{rule.label}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-black tracking-widest ${rule.active ? 'text-emerald-500' : 'text-slate-400'}`}>
                              {rule.active ? 'ENABLED' : 'DISABLED'}
                            </span>
                            <div className={`w-1.5 h-1.5 rounded-full ${rule.active ? 'bg-emerald-500 shadow-sm shadow-emerald-200' : 'bg-slate-300'}`}></div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Thresholds Sub-section */}
                    <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Delta Thresh.</p>
                        <p className="text-xs font-bold text-slate-700">{selectedParam.delta_percent_threshold ? `${selectedParam.delta_percent_threshold}%` : '—'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">Panic Low</p>
                        <p className="text-xs font-bold text-red-600">{selectedParam.panic_low || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">Panic High</p>
                        <p className="text-xs font-bold text-red-600">{selectedParam.panic_high || '—'}</p>
                      </div>
                    </div>
                  </div>

                  {selectedParam.notes && (
                    <div className="bg-white p-8 rounded-[24px] border border-slate-100 shadow-sm">
                      <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <Info size={14} /> Parameter Description
                      </h4>
                      <p className="text-sm text-slate-600 leading-relaxed font-medium">{selectedParam.notes}</p>
                    </div>
                  )}
                </div>

                {/* Ranges Section */}
                <div className="space-y-10">
                   <div className="bg-white p-8 rounded-[24px] border border-slate-100 shadow-sm">
                    <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                      <Activity size={14} /> Reference Ranges
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Male / General</p>
                          <p className="text-lg font-black text-slate-800 tracking-tight">{selectedParam.ref_low} — {selectedParam.ref_high}</p>
                        </div>
                        <span className="text-[10px] font-bold text-slate-300 italic">{selectedParam.unit_display_name}</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-pink-50/30 border border-pink-100 rounded-2xl">
                        <div>
                          <p className="text-[9px] font-black text-pink-400 uppercase tracking-widest mb-0.5">Female Specific</p>
                          <p className="text-lg font-black text-slate-800 tracking-tight">{selectedParam.ref_low_female || '—'} — {selectedParam.ref_high_female || '—'}</p>
                        </div>
                        <span className="text-[10px] font-bold text-pink-300 italic">{selectedParam.unit_display_name}</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-red-50/30 border border-red-100 rounded-2xl">
                        <div>
                          <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-0.5">Critical Thresholds</p>
                          <p className="text-lg font-black text-red-600 tracking-tight">{selectedParam.critical_low} — {selectedParam.critical_high}</p>
                        </div>
                        <AlertCircle size={20} className="text-red-300" />
                      </div>
                    </div>
                  </div>

                  {selectedParam.reference_profiles && selectedParam.reference_profiles.length > 0 && (
                    <div className="bg-white p-8 rounded-[24px] border border-slate-100 shadow-sm">
                      <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <Droplets size={14} /> Advanced Reference Profiles
                      </h4>
                      <div className="space-y-4">
                        {selectedParam.reference_profiles.map((profile: any, i: number) => (
                          <div key={i} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-200/50 pb-2">
                              <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{profile.profile_name}</p>
                              <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-slate-400">{profile.sex}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Age Context</p>
                                <p className="text-[11px] font-bold text-slate-600">{profile.age_min} — {profile.age_max || '∞'} {profile.age_unit}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Profile Range</p>
                                <p className="text-[11px] font-black text-slate-800">{profile.ref_low} — {profile.ref_high}</p>
                              </div>
                            </div>
                            {profile.notes && <p className="text-[10px] text-slate-400 italic font-medium leading-relaxed">"{profile.notes}"</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedParam.options && selectedParam.options.length > 0 && (
                    <div className="bg-white p-8 rounded-[24px] border border-slate-100 shadow-sm">
                      <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <Layers size={14} /> Result Options
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedParam.options.map((opt: any) => (
                          <div key={opt.id} className={`px-4 py-2 rounded-xl border text-[11px] font-bold flex items-center gap-2 ${opt.is_critical_trigger ? 'bg-red-50 border-red-100 text-red-600' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                            {opt.option_label} 
                            <span className="opacity-30 text-[9px] font-mono">({opt.option_value})</span>
                            {opt.is_critical_trigger && <AlertCircle size={12} />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedParam.auto_comment_template && (
                    <div className="p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 italic text-[11px] text-indigo-600 leading-relaxed">
                      <span className="font-black uppercase tracking-widest text-[9px] block mb-2 not-italic text-indigo-300">Comment Template</span>
                      "{selectedParam.auto_comment_template}"
                    </div>
                  )}

                  {selectedParam.critical_message && (
                    <div className="p-6 bg-red-50/50 rounded-2xl border border-red-100/50 italic text-[11px] text-red-600 leading-relaxed">
                      <span className="font-black uppercase tracking-widest text-[9px] block mb-2 not-italic text-red-300">Critical Alert Message</span>
                      "{selectedParam.critical_message}"
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Registered Date</p>
                 <p className="text-[10px] font-mono font-bold text-slate-400">{selectedParam.created_at}</p>
               </div>
               <button 
                 onClick={() => setIsDetailsModalOpen(false)}
                 className="px-6 py-2 bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-slate-200"
               >
                 Close Details
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabManagement;


// import React, { useState, useEffect } from 'react';
// import { 
//   Plus, 
//   Search, 
//   Layers, 
//   Settings2, 
//   FileText, 
//   Droplets,
//   AlertCircle,
//   Loader2,
//   CheckCircle2,
//   Trash2,
//   Filter,
//   Eye,
//   X,
//   ChevronRight,
//   Activity,
//   Info,
//   ArrowDown
// } from 'lucide-react';
// import { labService } from '../services/lab.service';
// import { useNotification } from '../context/NotificationContext';

// const LabManagement: React.FC = () => {
//   const { notify } = useNotification();
//   const [activeTab, setActiveTab] = useState<'categories' | 'panels' | 'parameters'>('categories');
//   const [loading, setLoading] = useState(false);
//   const [isSaving, setIsSaving] = useState(false);

//   // Data States
//   const [categories, setCategories] = useState<any[]>([]);
//   const [panels, setPanels] = useState<any[]>([]);
//   const [parameters, setParameters] = useState<any[]>([]);
//   const [units, setUnits] = useState<any[]>([]);

//   // Modal States
//   const [isParamModalOpen, setIsParamModalOpen] = useState(false);
//   const [isPanelModalOpen, setIsPanelModalOpen] = useState(false);
//   const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
//   const [selectedParam, setSelectedParam] = useState<any>(null);
//   const [selectedPanel, setSelectedPanel] = useState<any>(null);

//   const INITIAL_PARAMETER_FORM = {
//     category_id: '',
//     panel_id: '',
//     parameter_name: '',
//     short_name: '',
//     report_section: '',
//     unit_id: '' as string | number,
//     value_type: 'NUMERIC' as any,
//     ref_low: '',
//     ref_high: '',
//     ref_low_female: '',
//     ref_high_female: '',
//     critical_low: '',
//     critical_high: '',
//     allow_manual_comment: true,
//     active_status: true,
//     notes: '',
//     rules: {
//       auto_flag_enabled: true,
//       delta_check_enabled: false,
//       critical_notification_required: false,
//       delta_percent_threshold: '',
//       panic_low: '',
//       panic_high: '',
//       requires_pathologist_review: false,
//       auto_comment_template: '',
//       critical_message: ''
//     },
//     options: [] as any[],
//     reference_profiles: [] as any[]
//   };

//   const INITIAL_PANEL_FORM = {
//     id: undefined,
//     category_id: '',
//     panel_name: '',
//     report_group: '',
//     specimen_type: '',
//     turnaround_time_hours: '',
//     active_status: true
//   };

//   // Search & Filter States
//   const [searchTerm, setSearchTerm] = useState('');
//   const [filterCategory, setFilterCategory] = useState('');

//   // Form States
//   const [categoryForm, setCategoryForm] = useState({ id: undefined as number | undefined, name: '', description: '' });
//   const [parameterForm, setParameterForm] = useState(INITIAL_PARAMETER_FORM);
//   const [panelForm, setPanelForm] = useState(INITIAL_PANEL_FORM);

//   const fetchData = async () => {
//     setLoading(true);
//     try {
//       const [cats, pans, params, fetchedUnits] = await Promise.all([
//         labService.getCategories(),
//         labService.getPanels(),
//         labService.getParameters(),
//         labService.getUnits()
//       ]);
//       setCategories(cats);
//       setPanels(pans);
//       setParameters(params);
//       setUnits(fetchedUnits);
//     } catch (err: any) {
//       const errorMsg = err.response?.data?.message || err.message || 'Failed to fetch management data';
//       notify(errorMsg, 'error');
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchData();
//   }, []);

//   const handleSaveCategory = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!categoryForm.name) return notify('Category name is required', 'warning');
    
//     setIsSaving(true);
//     try {
//       await labService.saveCategory(categoryForm);
//       notify('Category saved successfully', 'success');
//       setCategoryForm({ id: undefined, name: '', description: '' });
//       fetchData();
//     } catch (err: any) {
//       const errorMsg = err.response?.data?.message || err.message || 'Failed to save category';
//       notify(errorMsg, 'error');
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   const addOption = () => {
//     const newOption = { option_label: '', option_value: '', display_order: parameterForm.options.length + 1, is_critical_trigger: false };
//     setParameterForm({ ...parameterForm, options: [...parameterForm.options, newOption] });
//   };

//   const removeOption = (index: number) => {
//     const newOptions = parameterForm.options.filter((_, i) => i !== index);
//     setParameterForm({ ...parameterForm, options: newOptions });
//   };

//   const updateOption = (index: number, field: string, value: any) => {
//     const newOptions = [...parameterForm.options];
//     newOptions[index] = { ...newOptions[index], [field]: value };
//     setParameterForm({ ...parameterForm, options: newOptions });
//   };

//   const addProfile = () => {
//     const newProfile = { 
//       profile_name: '', 
//       sex: 'GENERAL', 
//       age_min: 0, 
//       age_max: '', 
//       age_unit: 'YEARS', 
//       ref_low: '', 
//       ref_high: '', 
//       priority_order: 50, 
//       active_status: 1, 
//       notes: '' 
//     };
//     setParameterForm({ ...parameterForm, reference_profiles: [...parameterForm.reference_profiles, newProfile] });
//   };

//   const removeProfile = (index: number) => {
//     const newProfiles = parameterForm.reference_profiles.filter((_, i) => i !== index);
//     setParameterForm({ ...parameterForm, reference_profiles: newProfiles });
//   };

//   const updateProfile = (index: number, field: string, value: any) => {
//     const newProfiles = [...parameterForm.reference_profiles];
//     newProfiles[index] = { ...newProfiles[index], [field]: value };
//     setParameterForm({ ...parameterForm, reference_profiles: newProfiles });
//   };

//   const handleSaveParameter = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!parameterForm.category_id || !parameterForm.parameter_name) {
//       return notify('Category and Parameter Name are required', 'warning');
//     }

//     setIsSaving(true);
//     try {
//       const isNumeric = parameterForm.value_type === 'NUMERIC';

//       const payload = {
//         ...parameterForm,
//         category_id: Number(parameterForm.category_id),
//         panel_id: parameterForm.panel_id ? Number(parameterForm.panel_id) : undefined,
//         active_status: parameterForm.active_status ? 1 : 0,
        
//         // Conditionally set numeric fields to null if value_type is NOT NUMERIC
//         unit_id: isNumeric && parameterForm.unit_id ? Number(parameterForm.unit_id) : null,
//         ref_low: isNumeric && parameterForm.ref_low !== '' ? Number(parameterForm.ref_low) : null,
//         ref_high: isNumeric && parameterForm.ref_high !== '' ? Number(parameterForm.ref_high) : null,
//         ref_low_female: isNumeric && parameterForm.ref_low_female !== '' ? Number(parameterForm.ref_low_female) : null,
//         ref_high_female: isNumeric && parameterForm.ref_high_female !== '' ? Number(parameterForm.ref_high_female) : null,
//         critical_low: isNumeric && parameterForm.critical_low !== '' ? Number(parameterForm.critical_low) : null,
//         critical_high: isNumeric && parameterForm.critical_high !== '' ? Number(parameterForm.critical_high) : null,
        
//         rules: {
//           ...parameterForm.rules,
//           delta_percent_threshold: parameterForm.rules.delta_percent_threshold !== '' ? Number(parameterForm.rules.delta_percent_threshold) : 0,
//           panic_low: isNumeric && parameterForm.rules.panic_low !== '' ? Number(parameterForm.rules.panic_low) : null,
//           panic_high: isNumeric && parameterForm.rules.panic_high !== '' ? Number(parameterForm.rules.panic_high) : null,
//         },
        
//         reference_profiles: parameterForm.reference_profiles.map(p => ({
//           ...p,
//           ref_low: isNumeric && p.ref_low !== '' ? Number(p.ref_low) : 0,
//           ref_high: isNumeric && p.ref_high !== '' ? Number(p.ref_high) : 0,
//           pregnancy_status: p.pregnancy_status ? 1 : 0,
//           active_status: p.active_status ? 1 : 0
//         })),
        
//         options: parameterForm.options.map((opt, idx) => ({
//           ...opt,
//           display_order: opt.display_order || idx + 1
//         }))
//       };
      
//       await labService.saveParameter(payload);
//       notify(`Parameter ${parameterForm.id ? 'updated' : 'created'} successfully`, 'success');
//       setParameterForm(INITIAL_PARAMETER_FORM);
//       setIsParamModalOpen(false);
//       fetchData();
//     } catch (err: any) {
//       const errorMsg = err.response?.data?.message || err.message || 'Failed to save parameter';
//       notify(errorMsg, 'error');
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   const handleSavePanel = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!panelForm.category_id || !panelForm.panel_name) {
//       return notify('Category and Panel Name are required', 'warning');
//     }

//     setIsSaving(true);
//     try {
//       const payload = {
//         ...panelForm,
//         category_id: Number(panelForm.category_id),
//         turnaround_time_hours: Number(panelForm.turnaround_time_hours),
//         active_status: panelForm.active_status ? 1 : 0
//       };
      
//       await labService.savePanel(payload);
//       notify(`Panel ${panelForm.id ? 'updated' : 'created'} successfully`, 'success');
//       setPanelForm(INITIAL_PANEL_FORM);
//       setIsPanelModalOpen(false);
//       fetchData();
//     } catch (err: any) {
//       const errorMsg = err.response?.data?.message || err.message || 'Failed to save panel';
//       notify(errorMsg, 'error');
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   const handleDeletePanel = async (id: number) => {
//     if (!window.confirm('Are you sure you want to delete this panel?')) return;
//     try {
//       await labService.deletePanel(id);
//       notify('Panel deleted successfully', 'success');
//       fetchData();
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Failed to delete panel', 'error');
//     }
//   };

//   const handleDeleteParameter = async (id: number) => {
//     if (!window.confirm('Are you sure you want to delete this parameter?')) return;
//     try {
//       await labService.deleteParameter(id);
//       notify('Parameter deleted successfully', 'success');
//       fetchData();
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Failed to delete parameter', 'error');
//     }
//   };

//   const handleDeleteCategory = async (id: number) => {
//     if (!window.confirm('Are you sure you want to delete this category?')) return;
//     try {
//       await labService.deleteCategory(id);
//       notify('Category deleted successfully', 'success');
//       fetchData();
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Failed to delete category', 'error');
//     }
//   };

//   const filteredCategories = categories.filter(c => 
//     c.name.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   const filteredPanels = panels.filter(p => 
//     p.panel_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
//     (!filterCategory || p.category_id === Number(filterCategory))
//   );

//   const filteredParameters = parameters.filter(p => 
//     (p.parameter_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
//      p.short_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//      p.test_code?.toLowerCase().includes(searchTerm.toLowerCase())) &&
//     (!filterCategory || p.category_id === Number(filterCategory))
//   );

//   return (
//     <div className="space-y-8 animate-in fade-in duration-500 pb-20">
//       {/* Header Section */}
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
//         <div>
//           <h2 className="text-2xl font-black text-slate-800 tracking-tight">System Configuration</h2>
//           <p className="text-sm text-slate-500 font-medium mt-1">Configure laboratory test parameters and diagnostic categories.</p>
//         </div>
        
//         <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200/50 w-fit">
//           <button 
//             onClick={() => setActiveTab('categories')}
//             className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
//               activeTab === 'categories' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
//             }`}
//           >
//             <Layers size={14} /> Categories
//           </button>
//           <button 
//             onClick={() => setActiveTab('panels')}
//             className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
//               activeTab === 'panels' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
//             }`}
//           >
//             <Droplets size={14} /> Panels
//           </button>
//           <button 
//             onClick={() => setActiveTab('parameters')}
//             className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
//               activeTab === 'parameters' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
//             }`}
//           >
//             <Settings2 size={14} /> Parameters
//           </button>
//         </div>
//       </div>

//       <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
//         {/* Form Section */}
//         <div className="xl:col-span-4 space-y-6">
//           <div className="bg-white border border-slate-200 rounded-[32px] shadow-sm p-8">
//             {activeTab === 'categories' ? (
//               <form onSubmit={handleSaveCategory} className="space-y-6">
//                 <div className="flex items-center gap-3 mb-2">
//                   <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
//                     {categoryForm.id ? <Settings2 size={20} /> : <Plus size={20} />}
//                   </div>
//                   <h3 className="text-lg font-bold text-slate-800">{categoryForm.id ? 'Edit' : 'New'} Category</h3>
//                 </div>

//                 <div className="space-y-4">
//                   <div className="space-y-1.5">
//                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category Name</label>
//                     <input 
//                       type="text"
//                       className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
//                       placeholder="e.g. HEMATOLOGY"
//                       value={categoryForm.name}
//                       onChange={e => setCategoryForm({...categoryForm, name: e.target.value})}
//                     />
//                   </div>

//                   <div className="space-y-1.5">
//                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
//                     <textarea 
//                       rows={3}
//                       className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all resize-none"
//                       placeholder="Testing scope and focus..."
//                       value={categoryForm.description}
//                       onChange={e => setCategoryForm({...categoryForm, description: e.target.value})}
//                     />
//                   </div>
//                 </div>

//                 <div className="space-y-3">
//                   <button 
//                     type="submit" 
//                     disabled={isSaving}
//                     className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-100 disabled:opacity-50"
//                   >
//                     {isSaving ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
//                     {categoryForm.id ? 'Update' : 'Save'} Category
//                   </button>

//                   {categoryForm.id && (
//                     <button 
//                       type="button"
//                       onClick={() => setCategoryForm({ id: undefined, name: '', description: '' })}
//                       className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
//                     >
//                       Cancel Edit
//                     </button>
//                   )}
//                 </div>
//               </form>
//             ) : activeTab === 'panels' ? (
//               <div className="space-y-6">
//                  <div className="flex items-center gap-3 mb-2">
//                   <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
//                     <Droplets size={20} />
//                   </div>
//                   <div>
//                     <h3 className="text-lg font-black text-slate-800">Diagnostic Panels</h3>
//                     <p className="text-xs text-slate-400 font-medium italic">Bundle multiple parameters into single tests.</p>
//                   </div>
//                 </div>
//                 <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
//                    <p className="text-sm text-slate-600 leading-relaxed">
//                      Panels allow you to group related parameters (e.g. FBC, Lipid Profile) for easier ordering and reporting.
//                    </p>
//                 </div>
//                 <button 
//                   onClick={() => {
//                     setPanelForm(INITIAL_PANEL_FORM);
//                     setIsPanelModalOpen(true);
//                   }}
//                   className="w-full flex items-center justify-center gap-3 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
//                 >
//                   <Plus size={18} /> Configure New Panel
//                 </button>
//               </div>
//             ) : (
//               <div className="space-y-6">
//                 <div className="flex items-center gap-3 mb-2">
//                   <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
//                     <Plus size={20} />
//                   </div>
//                   <div>
//                     <h3 className="text-lg font-black text-slate-800">Lab Parameters</h3>
//                     <p className="text-xs text-slate-400 font-medium italic">Define specific measurable values.</p>
//                   </div>
//                 </div>
//                 <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
//                    <p className="text-sm text-slate-600 leading-relaxed">
//                      Configure reference ranges, units, and automation rules for individual test components.
//                    </p>
//                 </div>
//                 <button 
//                   onClick={() => {
//                     setParameterForm(INITIAL_PARAMETER_FORM);
//                     setIsParamModalOpen(true);
//                   }}
//                   className="w-full flex items-center justify-center gap-3 py-4 bg-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-all shadow-lg shadow-purple-200"
//                 >
//                   <Plus size={18} /> Define New Parameter
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>

//         {/* List Section */}
//         <div className="xl:col-span-8 space-y-6">
//           <div className="bg-white border border-slate-200 rounded-[32px] shadow-sm overflow-hidden min-h-[500px]">
//             <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
//               <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
//                 {activeTab === 'categories' ? <Layers size={16} /> : activeTab === 'panels' ? <Droplets size={16} /> : <Settings2 size={16} />}
//                 Existing {activeTab}
//               </h3>
              
//               <div className="flex flex-col md:flex-row items-center gap-4">
//                 <div className="relative group w-full md:w-64">
//                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-600 transition-colors" />
//                    <input 
//                      type="text"
//                      placeholder={`Search ${activeTab}...`}
//                      className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-purple-600 transition-all shadow-sm"
//                      value={searchTerm}
//                      onChange={e => setSearchTerm(e.target.value)}
//                    />
//                 </div>
//                 {activeTab !== 'categories' && (
//                   <select 
//                     className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-purple-600 transition-all shadow-sm"
//                     value={filterCategory}
//                     onChange={e => setFilterCategory(e.target.value)}
//                   >
//                     <option value="">All Categories</option>
//                     {categories.map(cat => (
//                       <option key={cat.id} value={cat.id}>{cat.name}</option>
//                     ))}
//                   </select>
//                 )}
//                 <span className="text-[10px] font-black text-slate-400 bg-white px-4 py-2 rounded-xl border border-slate-200 whitespace-nowrap shadow-sm">
//                   TOTAL: {activeTab === 'categories' ? filteredCategories.length : activeTab === 'panels' ? filteredPanels.length : filteredParameters.length}
//                 </span>
//               </div>
//             </div>

//             <div className="max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
//               <table className="w-full text-left border-collapse">
//                 <thead className="sticky top-0 z-10 bg-white">
//                   <tr className="bg-slate-50/30 border-b border-slate-100">
//                     {activeTab === 'categories' ? (
//                       <>
//                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-20">ID</th>
//                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
//                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Prefix</th>
//                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Parameters</th>
//                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
//                       </>
//                     ) : activeTab === 'panels' ? (
//                       <>
//                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Panel Name</th>
//                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
//                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">TAT (Hrs)</th>
//                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
//                       </>
//                     ) : (
//                       <>
//                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Parameter</th>
//                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
//                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit</th>
//                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
//                       </>
//                     )}
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-100">
//                   {loading ? (
//                     <tr>
//                       <td colSpan={5} className="py-20 text-center">
//                         <Loader2 className="animate-spin inline-block text-purple-600 mb-2" size={32} />
//                         <p className="text-sm text-slate-500 font-medium">Syncing with server...</p>
//                       </td>
//                     </tr>
//                   ) : activeTab === 'categories' ? (
//                     filteredCategories.length === 0 ? (
//                       <tr>
//                         <td colSpan={5} className="px-6 py-20 text-center text-slate-400 italic font-medium">No categories matching your search.</td>
//                       </tr>
//                     ) : (
//                       filteredCategories.map(cat => (
//                         <tr key={cat.id} className="group hover:bg-slate-50 transition-colors">
//                           <td className="px-6 py-4 text-xs font-mono text-slate-400">#{cat.id}</td>
//                           <td className="px-6 py-4">
//                             <p className="text-sm font-bold text-slate-800">{cat.name}</p>
//                             {cat.description && <p className="text-[10px] text-slate-400 mt-0.5">{cat.description}</p>}
//                           </td>
//                           <td className="px-6 py-4 text-xs font-black text-purple-600 tracking-wider font-mono">{cat.prefix || '-'}</td>
//                           <td className="px-6 py-4 text-xs font-bold text-slate-600">{cat.parameter_count || 0} items</td>
//                           <td className="px-6 py-4 text-right">
//                             <div className="flex items-center justify-end gap-2">
//                               <button 
//                                 onClick={() => setCategoryForm({ id: cat.id, name: cat.name, description: cat.description || '' })}
//                                 className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
//                                 title="Edit Category"
//                               >
//                                 <Settings2 size={16} />
//                               </button>
//                               <button 
//                                 onClick={() => handleDeleteCategory(cat.id)}
//                                 className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
//                                 title="Delete Category"
//                               >
//                                 <Trash2 size={16} />
//                               </button>
//                             </div>
//                           </td>
//                         </tr>
//                       ))
//                     )
//                   ) : activeTab === 'panels' ? (
//                     filteredPanels.length === 0 ? (
//                       <tr>
//                         <td colSpan={4} className="px-6 py-20 text-center text-slate-400 italic font-medium">No panels found. Try adjusting your filters.</td>
//                       </tr>
//                     ) : (
//                       filteredPanels.map(panel => (
//                         <tr key={panel.id} className="group hover:bg-slate-50 transition-colors">
//                           <td className="px-6 py-4">
//                             <p className="text-sm font-bold text-slate-800">{panel.panel_name}</p>
//                             <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter mt-0.5">{panel.specimen_type}</p>
//                           </td>
//                           <td className="px-6 py-4">
//                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-purple-50 text-purple-600 tracking-tight uppercase">
//                                {panel.category_name}
//                              </span>
//                           </td>
//                           <td className="px-6 py-4">
//                              <span className="text-xs font-bold text-slate-600">{panel.turnaround_time_hours} hrs</span>
//                           </td>
//                           <td className="px-6 py-4 text-right">
//                             <div className="flex items-center justify-end gap-2">
//                               <button 
//                                 onClick={() => {
//                                   setPanelForm({
//                                     id: panel.id,
//                                     category_id: panel.category_id,
//                                     panel_name: panel.panel_name,
//                                     report_group: panel.report_group,
//                                     specimen_type: panel.specimen_type,
//                                     turnaround_time_hours: panel.turnaround_time_hours,
//                                     active_status: panel.active_status
//                                   });
//                                   setIsPanelModalOpen(true);
//                                 }}
//                                 className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
//                               >
//                                 <Settings2 size={18} />
//                               </button>
//                               <button 
//                                 onClick={() => handleDeletePanel(panel.id)}
//                                 className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
//                               >
//                                 <Trash2 size={18} />
//                               </button>
//                             </div>
//                           </td>
//                         </tr>
//                       ))
//                     )
//                   ) : (
//                     filteredParameters.length === 0 ? (
//                       <tr>
//                         <td colSpan={4} className="px-6 py-20 text-center text-slate-400 italic font-medium">No parameters found. Try searching for something else.</td>
//                       </tr>
//                     ) : (
//                       filteredParameters.map(param => (
//                       <tr key={param.id} className="group hover:bg-slate-50 transition-colors">
//                         <td className="px-6 py-4">
//                           <p className="text-sm font-bold text-slate-800">{param.parameter_name}</p>
//                           <div className="flex items-center gap-2 mt-0.5">
//                             <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-tight">{param.short_name || 'N/A'}</span>
//                             <span className="text-[9px] font-mono text-slate-400">{param.test_code}</span>
//                           </div>
//                         </td>
//                         <td className="px-6 py-4">
//                           <span className="text-[10px] font-black px-2 py-0.5 rounded bg-purple-50 text-purple-600 tracking-tight uppercase">{param.category_name}</span>
//                         </td>
//                         <td className="px-6 py-4">
//                            <div className="flex flex-col">
//                              <span className="text-xs font-bold text-slate-600">{param.unit_display_name || '-'}</span>
//                              <span className="text-[9px] text-slate-400 font-medium uppercase tracking-tighter">{param.value_type}</span>
//                            </div>
//                         </td>
//                         <td className="px-6 py-4 text-right">
//                           <div className="flex items-center justify-end gap-2">
//                             <button 
//                               onClick={() => {
//                                 setSelectedParam({
//                                   ...param,
//                                   reference_profiles: param.profiles || []
//                                 });
//                                 setIsDetailsModalOpen(true);
//                               }}
//                               className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
//                               title="View Details"
//                             >
//                               <Eye size={18} />
//                             </button>
//                             <button 
//                               onClick={() => {
//                                 setParameterForm({
//                                   ...INITIAL_PARAMETER_FORM,
//                                   ...param,
//                                   reference_profiles: param.profiles || [],
//                                   options: param.options || [],
//                                   id: param.id,
//                                   category_id: String(param.category_id),
//                                   panel_id: param.panel_id ? String(param.panel_id) : '',
//                                   unit_id: param.unit_id ? Number(param.unit_id) : '',
//                                   active_status: param.active_status === 1 || param.active_status === true
//                                 });
//                                 setIsParamModalOpen(true);
//                               }}
//                               className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
//                               title="Edit Parameter"
//                             >
//                               <Settings2 size={18} />
//                             </button>
//                             <button 
//                               onClick={() => handleDeleteParameter(param.id)}
//                               className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
//                               title="Delete Parameter"
//                             >
//                               <Trash2 size={18} />
//                             </button>
//                           </div>
//                         </td>
//                       </tr>
//                       ))
//                     )
//                   )
//                 }
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* --- MODALS --- */}

//       {/* Create/Edit Parameter Modal */}
//       {isParamModalOpen && (
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
//           <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col scale-in-center transition-all">
//             {/* Modal Header */}
//             <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
//               <div className="flex items-center gap-4">
//                 <div className="p-3 bg-purple-600 text-white rounded-2xl shadow-lg shadow-purple-200">
//                   <Settings2 size={24} />
//                 </div>
//                 <div>
//                   <h3 className="text-xl font-black text-slate-800 tracking-tight">Configure Parameter</h3>
//                   <p className="text-xs text-slate-500 font-medium">Define testing rules, ranges, and result formats.</p>
//                 </div>
//               </div>
//               <button 
//                 onClick={() => setIsParamModalOpen(false)}
//                 className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
//               >
//                 <X size={24} />
//               </button>
//             </div>

//             {/* Modal Body */}
//             <div className="flex-1 overflow-y-auto p-8">
//               <form id="paramForm" onSubmit={handleSaveParameter} className="space-y-10">
//                 {/* Section 1: Basic Information */}
//                 <div className="space-y-6">
//                   <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
//                     <Info size={16} className="text-purple-600" />
//                     <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Basic Information</h4>
//                   </div>
                  
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                     <div className="space-y-1.5">
//                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Parent Category</label>
//                       <select 
//                         className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
//                         value={parameterForm.category_id}
//                         onChange={e => setParameterForm({
//                           ...parameterForm, 
//                           category_id: e.target.value,
//                           panel_id: '' // Reset panel when category changes
//                         })}
//                       >
//                         <option value="">Select Category</option>
//                         {categories.map(cat => (
//                           <option key={cat.id} value={cat.id}>{cat.name}</option>
//                         ))}
//                       </select>
//                     </div>

//                     <div className="space-y-1.5">
//                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Laboratory Panel (Optional)</label>
//                       <select 
//                         className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
//                         value={parameterForm.panel_id}
//                         onChange={e => setParameterForm({...parameterForm, panel_id: e.target.value})}
//                         disabled={!parameterForm.category_id}
//                       >
//                         <option value="">Select Panel</option>
//                         {panels
//                           .filter(p => !parameterForm.category_id || p.category_id === Number(parameterForm.category_id))
//                           .map(panel => (
//                             <option key={panel.id} value={panel.id}>{panel.panel_name}</option>
//                           ))}
//                       </select>
//                     </div>
//                   </div>

//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                     <div className="space-y-1.5">
//                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Parameter Name</label>
//                       <input 
//                         type="text"
//                         className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none"
//                         placeholder="e.g. Hemoglobin"
//                         value={parameterForm.parameter_name}
//                         onChange={e => setParameterForm({...parameterForm, parameter_name: e.target.value})}
//                       />
//                     </div>

//                     <div className="space-y-1.5">
//                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Short Name / Alias</label>
//                       <input 
//                         type="text"
//                         className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none"
//                         placeholder="e.g. HB"
//                         value={parameterForm.short_name}
//                         onChange={e => setParameterForm({...parameterForm, short_name: e.target.value})}
//                       />
//                     </div>
//                   </div>

//                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//                     <div className="space-y-1.5">
//                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Report Section</label>
//                       <input 
//                         type="text"
//                         className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none"
//                         placeholder="e.g. Hematology"
//                         value={parameterForm.report_section}
//                         onChange={e => setParameterForm({...parameterForm, report_section: e.target.value})}
//                       />
//                     </div>
//                     <div className="space-y-1.5">
//                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit</label>
//                       <select 
//                         className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none disabled:opacity-50"
//                         value={parameterForm.unit_id}
//                         onChange={e => setParameterForm({...parameterForm, unit_id: e.target.value ? Number(e.target.value) : ''})}
//                         disabled={parameterForm.value_type !== 'NUMERIC'}
//                       >
//                         <option value="">-- No Unit --</option>
//                         {units.map((u) => (
//                           <option key={u.id} value={u.id}>{u.display_name} ({u.description})</option>
//                         ))}
//                       </select>
//                       {parameterForm.value_type !== 'NUMERIC' && (
//                         <span className="text-[10px] text-amber-500 font-medium ml-1">Not needed for this type</span>
//                       )}
//                     </div>
//                     <div className="space-y-1.5">
//                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Value Type</label>
//                       <select 
//                         className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none"
//                         value={parameterForm.value_type}
//                         onChange={e => setParameterForm({...parameterForm, value_type: e.target.value as any})}
//                       >
//                         <option value="NUMERIC">NUMERIC</option>
//                         <option value="TEXT">TEXT</option>
//                         <option value="SELECT">SELECT (Options)</option>
//                         <option value="BOOLEAN">BOOLEAN</option>
//                         <option value="NARRATIVE">NARRATIVE</option>
//                       </select>
//                       {parameterForm.value_type === 'SELECT' && (
//                         <div className="flex items-center gap-1.5 mt-2 ml-1 animate-in slide-in-from-top-1 fade-in duration-300">
//                           <ArrowDown size={12} className="text-blue-500 animate-bounce" />
//                           <span className="text-[10px] font-bold text-blue-600">Scroll down to configure Result Options</span>
//                         </div>
//                       )}
//                     </div>
//                   </div>
//                 </div>

//                 {/* Conditional Rendering: Only show Reference Ranges if value type is NUMERIC */}
//                 {parameterForm.value_type === 'NUMERIC' && (
//                   <>
//                     {/* Section 2: Reference Ranges */}
//                     <div className="space-y-6">
//                       <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
//                         <Activity size={16} className="text-emerald-600" />
//                         <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Reference Ranges</h4>
//                       </div>
                      
//                       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
//                         <div className="space-y-1.5">
//                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ref Low (Male/Gen)</label>
//                           <input 
//                             type="number" step="any"
//                             className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none"
//                             value={parameterForm.ref_low}
//                             onChange={e => setParameterForm({...parameterForm, ref_low: e.target.value})}
//                           />
//                         </div>
//                         <div className="space-y-1.5">
//                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ref High (Male/Gen)</label>
//                           <input 
//                             type="number" step="any"
//                             className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none"
//                             value={parameterForm.ref_high}
//                             onChange={e => setParameterForm({...parameterForm, ref_high: e.target.value})}
//                           />
//                         </div>
//                         <div className="space-y-1.5">
//                           <label className="text-[10px] font-black text-pink-400 uppercase tracking-widest ml-1">Ref Low (Female)</label>
//                           <input 
//                             type="number" step="any"
//                             className="w-full px-4 py-3 bg-pink-50/30 border border-pink-100 rounded-2xl text-sm font-medium outline-none"
//                             value={parameterForm.ref_low_female}
//                             onChange={e => setParameterForm({...parameterForm, ref_low_female: e.target.value})}
//                           />
//                         </div>
//                         <div className="space-y-1.5">
//                           <label className="text-[10px] font-black text-pink-400 uppercase tracking-widest ml-1">Ref High (Female)</label>
//                           <input 
//                             type="number" step="any"
//                             className="w-full px-4 py-3 bg-pink-50/30 border border-pink-100 rounded-2xl text-sm font-medium outline-none"
//                             value={parameterForm.ref_high_female}
//                             onChange={e => setParameterForm({...parameterForm, ref_high_female: e.target.value})}
//                           />
//                         </div>
//                       </div>

//                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                         <div className="space-y-1.5">
//                           <label className="text-[10px] font-black text-red-400 uppercase tracking-widest ml-1">Critical Low</label>
//                           <input 
//                             type="number" step="any"
//                             className="w-full px-4 py-3 bg-red-50/30 border border-red-100 rounded-2xl text-sm font-medium outline-none"
//                             value={parameterForm.critical_low}
//                             onChange={e => setParameterForm({...parameterForm, critical_low: e.target.value})}
//                           />
//                         </div>
//                         <div className="space-y-1.5">
//                           <label className="text-[10px] font-black text-red-400 uppercase tracking-widest ml-1">Critical High</label>
//                           <input 
//                             type="number" step="any"
//                             className="w-full px-4 py-3 bg-red-50/30 border border-red-100 rounded-2xl text-sm font-medium outline-none"
//                             value={parameterForm.critical_high}
//                             onChange={e => setParameterForm({...parameterForm, critical_high: e.target.value})}
//                           />
//                         </div>
//                       </div>
//                     </div>
//                   </>
//                 )}

//                 {/* Section 3: Rules & Validation */}
//                 <div className="space-y-6 p-6 bg-slate-50 rounded-[24px]">
//                   <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
//                     <AlertCircle size={16} className="text-amber-600" />
//                     <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Rules & Validation</h4>
//                   </div>
                  
//                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
//                     <div className="flex items-center gap-3">
//                       <input 
//                         type="checkbox"
//                         id="auto_flag"
//                         className="w-5 h-5 rounded-lg text-purple-600"
//                         checked={parameterForm.rules.auto_flag_enabled}
//                         onChange={e => setParameterForm({...parameterForm, rules: {...parameterForm.rules, auto_flag_enabled: e.target.checked}})}
//                       />
//                       <label htmlFor="auto_flag" className="text-sm font-bold text-slate-700">Auto Flag Enabled</label>
//                     </div>
//                     <div className="flex items-center gap-3">
//                       <input 
//                         type="checkbox"
//                         id="delta_check"
//                         className="w-5 h-5 rounded-lg text-purple-600"
//                         checked={parameterForm.rules.delta_check_enabled}
//                         onChange={e => setParameterForm({...parameterForm, rules: {...parameterForm.rules, delta_check_enabled: e.target.checked}})}
//                       />
//                       <label htmlFor="delta_check" className="text-sm font-bold text-slate-700">Delta Check Enabled</label>
//                     </div>
//                     <div className="flex items-center gap-3">
//                       <input 
//                         type="checkbox"
//                         id="pathologist_review"
//                         className="w-5 h-5 rounded-lg text-purple-600"
//                         checked={parameterForm.rules.requires_pathologist_review}
//                         onChange={e => setParameterForm({...parameterForm, rules: {...parameterForm.rules, requires_pathologist_review: e.target.checked}})}
//                       />
//                       <label htmlFor="pathologist_review" className="text-sm font-bold text-slate-700">Pathologist Review Req.</label>
//                     </div>
//                   </div>

//                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//                     <div className="space-y-1.5">
//                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Panic Low</label>
//                       <input 
//                         type="number" step="any"
//                         className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none disabled:opacity-50 disabled:bg-slate-100"
//                         value={parameterForm.rules.panic_low}
//                         onChange={e => setParameterForm({...parameterForm, rules: {...parameterForm.rules, panic_low: e.target.value}})}
//                         disabled={parameterForm.value_type !== 'NUMERIC'}
//                       />
//                     </div>
//                     <div className="space-y-1.5">
//                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Panic High</label>
//                       <input 
//                         type="number" step="any"
//                         className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none disabled:opacity-50 disabled:bg-slate-100"
//                         value={parameterForm.rules.panic_high}
//                         onChange={e => setParameterForm({...parameterForm, rules: {...parameterForm.rules, panic_high: e.target.value}})}
//                         disabled={parameterForm.value_type !== 'NUMERIC'}
//                       />
//                     </div>
//                     <div className="space-y-1.5">
//                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Delta % Threshold</label>
//                       <input 
//                         type="number"
//                         className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none"
//                         placeholder="e.g. 20"
//                         value={parameterForm.rules.delta_percent_threshold}
//                         onChange={e => setParameterForm({...parameterForm, rules: {...parameterForm.rules, delta_percent_threshold: e.target.value}})}
//                       />
//                     </div>
//                   </div>

//                   <div className="space-y-4">
//                     <div className="space-y-1.5">
//                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Auto Comment Template</label>
//                       <textarea 
//                         rows={2}
//                         className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none resize-none"
//                         placeholder="Result is {{FLAG}}..."
//                         value={parameterForm.rules.auto_comment_template}
//                         onChange={e => setParameterForm({...parameterForm, rules: {...parameterForm.rules, auto_comment_template: e.target.value}})}
//                       />
//                     </div>
//                     <div className="space-y-1.5">
//                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Critical Alert Message</label>
//                       <textarea 
//                         rows={2}
//                         className="w-full px-4 py-3 bg-white border border-red-100 rounded-2xl text-sm font-medium outline-none resize-none text-red-600"
//                         placeholder="Immediate notification required..."
//                         value={parameterForm.rules.critical_message}
//                         onChange={e => setParameterForm({...parameterForm, rules: {...parameterForm.rules, critical_message: e.target.value}})}
//                       />
//                     </div>
//                   </div>
//                 </div>

//                 {/* Conditional Rendering: Only show Advanced Profiles if value type is NUMERIC */}
//                 {parameterForm.value_type === 'NUMERIC' && (
//                   <div className="space-y-6">
//                     <div className="flex items-center justify-between pb-2 border-b border-slate-100">
//                       <div className="flex items-center gap-2">
//                         <Droplets size={16} className="text-purple-600" />
//                         <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Advanced Reference Profiles</h4>
//                       </div>
//                       <button 
//                         type="button"
//                         onClick={addProfile}
//                         className="flex items-center gap-2 px-4 py-1.5 bg-purple-50 text-purple-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-100 transition-all"
//                       >
//                         <Plus size={14} /> Add Profile
//                       </button>
//                     </div>

//                     {parameterForm.reference_profiles.length === 0 ? (
//                       <div className="py-10 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
//                         <Info size={24} className="mx-auto text-slate-300 mb-2" />
//                         <p className="text-xs text-slate-400 font-medium italic">No advanced reference profiles defined.<br/>Standard ranges will be used.</p>
//                       </div>
//                     ) : (
//                       <div className="space-y-4">
//                         {parameterForm.reference_profiles.map((profile, idx) => (
//                           <div key={idx} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6 relative group overflow-hidden">
//                             <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                            
//                             <div className="flex items-start justify-between">
//                               <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
//                                 <div className="space-y-1.5">
//                                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Profile Name</label>
//                                   <input 
//                                     type="text"
//                                     className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-purple-500"
//                                     placeholder="e.g. Neonatal (0-30 days)"
//                                     value={profile.profile_name}
//                                     onChange={e => updateProfile(idx, 'profile_name', e.target.value)}
//                                   />
//                                 </div>
//                                 <div className="space-y-1.5">
//                                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sex Context</label>
//                                   <select 
//                                     className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
//                                     value={profile.sex}
//                                     onChange={e => updateProfile(idx, 'sex', e.target.value as any)}
//                                   >
//                                     <option value="GENERAL">General (Both)</option>
//                                     <option value="M">Male Only</option>
//                                     <option value="F">Female Only</option>
//                                   </select>
//                                 </div>
//                                 <div className="space-y-1.5 text-right">
//                                   <button 
//                                     type="button"
//                                     onClick={() => removeProfile(idx)}
//                                     className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
//                                   >
//                                     <Trash2 size={18} />
//                                   </button>
//                                 </div>
//                               </div>
//                             </div>

//                             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//                               <div className="space-y-1.5">
//                                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Min Age</label>
//                                 <div className="flex gap-2">
//                                   <input 
//                                     type="number"
//                                     className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
//                                     value={profile.age_min}
//                                     onChange={e => updateProfile(idx, 'age_min', Number(e.target.value))}
//                                   />
//                                   <select 
//                                     className="px-2 bg-slate-50 border border-slate-200 rounded-xl text-[9px] font-black outline-none"
//                                     value={profile.age_unit}
//                                     onChange={e => updateProfile(idx, 'age_unit', e.target.value as any)}
//                                   >
//                                     <option value="DAYS">DAYS</option>
//                                     <option value="MONTHS">MONTHS</option>
//                                     <option value="YEARS">YEARS</option>
//                                   </select>
//                                 </div>
//                               </div>
//                               <div className="space-y-1.5">
//                                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Max Age (Null for no limit)</label>
//                                 <input 
//                                   type="number"
//                                   className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
//                                   value={profile.age_max || ''}
//                                   onChange={e => updateProfile(idx, 'age_max', e.target.value ? Number(e.target.value) : null)}
//                                 />
//                               </div>
//                               <div className="space-y-1.5">
//                                 <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Profile Low</label>
//                                 <input 
//                                   type="number" step="any"
//                                   className="w-full px-4 py-2.5 bg-emerald-50/50 border border-emerald-100 rounded-xl text-xs font-bold outline-none"
//                                   value={profile.ref_low}
//                                   onChange={e => updateProfile(idx, 'ref_low', e.target.value)}
//                                 />
//                               </div>
//                               <div className="space-y-1.5">
//                                 <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Profile High</label>
//                                 <input 
//                                   type="number" step="any"
//                                   className="w-full px-4 py-2.5 bg-emerald-50/50 border border-emerald-100 rounded-xl text-xs font-bold outline-none"
//                                   value={profile.ref_high}
//                                   onChange={e => updateProfile(idx, 'ref_high', e.target.value)}
//                                 />
//                               </div>
//                             </div>

//                             {profile.sex === 'F' && (
//                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
//                                   <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl">
//                                      <input 
//                                        type="checkbox"
//                                        checked={profile.pregnancy_status}
//                                        onChange={e => updateProfile(idx, 'pregnancy_status', e.target.checked)}
//                                        className="w-4 h-4 rounded text-purple-600"
//                                      />
//                                      <label className="text-[10px] font-bold text-slate-600">Apply to Pregnancy only?</label>
//                                   </div>
//                                   {profile.pregnancy_status && (
//                                     <select 
//                                       className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
//                                       value={profile.pregnancy_trimester}
//                                       onChange={e => updateProfile(idx, 'pregnancy_trimester', e.target.value as any)}
//                                     >
//                                       <option value="">Any Trimester</option>
//                                       <option value="T1">1st Trimester (T1)</option>
//                                       <option value="T2">2nd Trimester (T2)</option>
//                                       <option value="T3">3rd Trimester (T3)</option>
//                                     </select>
//                                   )}
//                                </div>
//                             )}
//                           </div>
//                         ))}
//                       </div>
//                     )}
//                   </div>
//                 )}

//                 {/* Section 5: Interpretations & Risk Levels (Options) */}
//                 {parameterForm.value_type === 'SELECT' ? (
//                   <div className="space-y-6">
//                       <div className="flex items-center justify-between pb-2 border-b border-slate-100">
//                         <div className="flex items-center gap-2">
//                           <Layers size={16} className="text-blue-600" />
//                           <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Result Options</h4>
//                         </div>
//                         <button 
//                           type="button"
//                           onClick={addOption}
//                           className="flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all"
//                         >
//                           <Plus size={14} /> Add Option
//                         </button>
//                       </div>

//                       <div className="space-y-4">
//                         {parameterForm.options.map((opt, idx) => (
//                           <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50 p-4 rounded-2xl border border-slate-200/50">
//                             <div className="md:col-span-4 space-y-1">
//                               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Label</label>
//                               <input 
//                                 type="text"
//                                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
//                                 placeholder="e.g. Positive"
//                                 value={opt.option_label}
//                                 onChange={e => updateOption(idx, 'option_label', e.target.value)}
//                               />
//                             </div>
//                             <div className="md:col-span-3 space-y-1">
//                               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Value</label>
//                               <input 
//                                 type="text"
//                                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono outline-none"
//                                 placeholder="POS"
//                                 value={opt.option_value}
//                                 onChange={e => updateOption(idx, 'option_value', e.target.value)}
//                               />
//                             </div>
//                             <div className="md:col-span-3 flex items-center gap-3 mb-2">
//                               <input 
//                                 type="checkbox"
//                                 id={`crit-${idx}`}
//                                 checked={opt.is_critical_trigger}
//                                 onChange={e => updateOption(idx, 'is_critical_trigger', e.target.checked)}
//                               />
//                               <label htmlFor={`crit-${idx}`} className="text-[10px] font-bold text-slate-600">Critical Trigger</label>
//                             </div>
//                             <div className="md:col-span-2 text-right">
//                               <button 
//                                 type="button"
//                                 onClick={() => removeOption(idx)}
//                                 className="p-2 text-slate-300 hover:text-red-500 transition-colors"
//                               >
//                                 <Trash2 size={18} />
//                               </button>
//                             </div>
//                           </div>
//                         ))}
//                         {parameterForm.options.length === 0 && (
//                           <p className="text-center py-6 text-sm text-slate-400 italic">No options added yet.</p>
//                         )}
//                       </div>
//                   </div>
//                 ) : (
//                   <div className="space-y-6">
//                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
//                        <div className="flex items-center gap-2">
//                          <Layers size={16} className="text-slate-400" />
//                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Result Options</h4>
//                        </div>
//                      </div>
//                      <div className="py-8 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
//                        <Info size={24} className="mx-auto text-blue-400 mb-2" />
//                        <p className="text-xs text-slate-500 font-medium">Result options are only available when the <strong className="text-slate-700">Value Type</strong> is set to <strong className="text-slate-700">SELECT (Options)</strong>.</p>
//                        <p className="text-[10px] text-slate-400 mt-1">Change the Value Type above to add predefined dropdown options.</p>
//                      </div>
//                   </div>
//                 )}
//               </form>
//             </div>

//             {/* Modal Footer */}
//             <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-4">
//               <button 
//                 onClick={() => setIsParamModalOpen(false)}
//                 className="px-8 py-3 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-200 transition-all"
//               >
//                 Cancel
//               </button>
//               <button 
//                 form="paramForm"
//                 type="submit"
//                 disabled={isSaving}
//                 className="px-10 py-3 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 flex items-center gap-2 disabled:opacity-50"
//               >
//                 {isSaving ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
//                 Save Configuration
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Create/Edit Panel Modal */}
//       {isPanelModalOpen && (
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
//           <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col scale-in-center transition-all">
//             <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
//               <div className="flex items-center gap-4">
//                 <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-200">
//                   <Droplets size={24} />
//                 </div>
//                 <div>
//                   <h3 className="text-xl font-black text-slate-800 tracking-tight">{panelForm.id ? 'Update' : 'Configure'} Panel</h3>
//                   <p className="text-xs text-slate-500 font-medium">Bundle multiple test parameters together.</p>
//                 </div>
//               </div>
//               <button 
//                 onClick={() => setIsPanelModalOpen(false)}
//                 className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
//               >
//                 <X size={24} />
//               </button>
//             </div>

//             <div className="flex-1 overflow-y-auto p-8">
//               <form id="panelForm" onSubmit={handleSavePanel} className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <div className="space-y-1.5 md:col-span-2">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Parent Category</label>
//                   <select 
//                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
//                     value={panelForm.category_id}
//                     onChange={e => setPanelForm({...panelForm, category_id: e.target.value})}
//                   >
//                     <option value="">Select Category</option>
//                     {categories.map(cat => (
//                       <option key={cat.id} value={cat.id}>{cat.name}</option>
//                     ))}
//                   </select>
//                 </div>

//                 <div className="space-y-1.5 md:col-span-2">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Panel Name</label>
//                   <input 
//                     type="text"
//                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-emerald-500 transition-all"
//                     placeholder="e.g. Lipid Profile"
//                     value={panelForm.panel_name}
//                     onChange={e => setPanelForm({...panelForm, panel_name: e.target.value})}
//                   />
//                 </div>

//                 <div className="space-y-1.5">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Report Group</label>
//                   <input 
//                     type="text"
//                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none"
//                     placeholder="e.g. Biochemistry"
//                     value={panelForm.report_group}
//                     onChange={e => setPanelForm({...panelForm, report_group: e.target.value})}
//                   />
//                 </div>

//                 <div className="space-y-1.5">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Specimen Type</label>
//                   <input 
//                     type="text"
//                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none"
//                     placeholder="e.g. Plasma (EDTA)"
//                     value={panelForm.specimen_type}
//                     onChange={e => setPanelForm({...panelForm, specimen_type: e.target.value})}
//                   />
//                 </div>

//                 <div className="space-y-1.5">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">TAT (Hours)</label>
//                   <input 
//                     type="number"
//                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none"
//                     placeholder="e.g. 12"
//                     value={panelForm.turnaround_time_hours}
//                     onChange={e => setPanelForm({...panelForm, turnaround_time_hours: e.target.value})}
//                   />
//                 </div>

//                 <div className="flex items-center gap-3 pt-6">
//                   <input 
//                     type="checkbox"
//                     id="panel_status"
//                     className="w-5 h-5 rounded-lg text-emerald-600 focus:ring-emerald-500"
//                     checked={panelForm.active_status as boolean}
//                     onChange={e => setPanelForm({...panelForm, active_status: e.target.checked})}
//                   />
//                   <label htmlFor="panel_status" className="text-sm font-bold text-slate-700">Active Status</label>
//                 </div>
//               </form>
//             </div>

//             <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-4">
//               <button 
//                 onClick={() => setIsPanelModalOpen(false)}
//                 className="px-8 py-3 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-200 transition-all"
//               >
//                 Cancel
//               </button>
//               <button 
//                 form="panelForm"
//                 type="submit"
//                 disabled={isSaving}
//                 className="px-10 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center gap-2 disabled:opacity-50"
//               >
//                 {isSaving ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
//                 {panelForm.id ? 'Update Panel' : 'Create Panel'}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Parameter Details View Modal - REDESIGNED */}
//       {isDetailsModalOpen && selectedParam && (
//         <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
//           <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col scale-in-center">
//             {/* Enterprise Header */}
//             <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
//               <div className="flex items-center gap-5">
//                 <div className="p-4 bg-slate-50 border border-slate-100 text-purple-600 rounded-2xl shadow-inner">
//                   <Activity size={28} />
//                 </div>
//                 <div>
//                   <div className="flex items-center gap-3">
//                     <h3 className="text-2xl font-black text-slate-800 tracking-tight">{selectedParam.parameter_name}</h3>
//                     <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${selectedParam.active_status ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
//                       {selectedParam.active_status ? 'Active' : 'Inactive'}
//                     </span>
//                   </div>
//                   <div className="flex items-center gap-2 mt-0.5">
//                     <span className="text-xs font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded uppercase tracking-tighter">{selectedParam.category_name}</span>
//                     <span className="text-xs text-slate-400 font-mono font-bold">ID: {selectedParam.test_code}</span>
//                   </div>
//                 </div>
//               </div>
//               <button 
//                 onClick={() => setIsDetailsModalOpen(false)}
//                 className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
//               >
//                 <X size={24} />
//               </button>
//             </div>

//             <div className="flex-1 overflow-y-auto p-10 bg-slate-50/30">
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
//                 {/* Specs Section */}
//                 <div className="space-y-10">
//                   <div className="bg-white p-8 rounded-[24px] border border-slate-100 shadow-sm">
//                     <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
//                       <Info size={14} /> Core Specifications
//                     </h4>
//                     <div className="grid grid-cols-2 gap-8">
//                       <div className="space-y-1">
//                         <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Short Name</p>
//                         <p className="text-sm font-bold text-slate-700">{selectedParam.short_name || '—'}</p>
//                       </div>
//                       <div className="space-y-1">
//                         <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Result Unit</p>
//                         <p className="text-sm font-bold text-slate-700">{selectedParam.unit_display_name || '—'}</p>
//                       </div>
//                       <div className="space-y-1">
//                         <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Data Type</p>
//                         <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-black tracking-tight">{selectedParam.value_type}</span>
//                       </div>
//                       <div className="space-y-1">
//                         <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Laboratory Panel</p>
//                         <p className="text-sm font-bold text-slate-800">
//                           {selectedParam.panel_name || panels.find(p => p.id === selectedParam.panel_id)?.panel_name || 'Individual'}
//                         </p>
//                       </div>
//                       <div className="space-y-1">
//                         <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Report Section</p>
//                         <p className="text-sm font-bold text-slate-700">{selectedParam.report_section || '—'}</p>
//                       </div>
//                       <div className="space-y-1">
//                         <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Manual Comment</p>
//                         <span className={`inline-block px-2 py-1 rounded text-[10px] font-black tracking-tight ${selectedParam.allow_manual_comment ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
//                           {selectedParam.allow_manual_comment ? 'ALLOWED' : 'DISABLED'}
//                         </span>
//                       </div>
//                     </div>
//                   </div>

//                   <div className="bg-white p-8 rounded-[24px] border border-slate-100 shadow-sm">
//                      <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
//                       <Settings2 size={14} /> Automation Rules
//                     </h4>
//                     <div className="grid grid-cols-2 gap-4">
//                       {[
//                         { label: 'Auto Flagging', active: selectedParam.auto_flag_enabled },
//                         { label: 'Delta Checking', active: selectedParam.delta_check_enabled },
//                         { label: 'Pathologist Review', active: selectedParam.requires_pathologist_review },
//                         { label: 'Critical Notify', active: selectedParam.critical_notification_required },
//                       ].map((rule, i) => (
//                         <div key={i} className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
//                           <span className="text-[11px] font-bold text-slate-600">{rule.label}</span>
//                           <div className="flex items-center gap-2">
//                             <span className={`text-[9px] font-black tracking-widest ${rule.active ? 'text-emerald-500' : 'text-slate-400'}`}>
//                               {rule.active ? 'ENABLED' : 'DISABLED'}
//                             </span>
//                             <div className={`w-1.5 h-1.5 rounded-full ${rule.active ? 'bg-emerald-500 shadow-sm shadow-emerald-200' : 'bg-slate-300'}`}></div>
//                           </div>
//                         </div>
//                       ))}
//                     </div>

//                     {/* Thresholds Sub-section */}
//                     <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-3 gap-4">
//                       <div>
//                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Delta Thresh.</p>
//                         <p className="text-xs font-bold text-slate-700">{selectedParam.delta_percent_threshold ? `${selectedParam.delta_percent_threshold}%` : '—'}</p>
//                       </div>
//                       <div>
//                         <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">Panic Low</p>
//                         <p className="text-xs font-bold text-red-600">{selectedParam.panic_low || '—'}</p>
//                       </div>
//                       <div>
//                         <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">Panic High</p>
//                         <p className="text-xs font-bold text-red-600">{selectedParam.panic_high || '—'}</p>
//                       </div>
//                     </div>
//                   </div>

//                   {selectedParam.notes && (
//                     <div className="bg-white p-8 rounded-[24px] border border-slate-100 shadow-sm">
//                       <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
//                         <Info size={14} /> Parameter Description
//                       </h4>
//                       <p className="text-sm text-slate-600 leading-relaxed font-medium">{selectedParam.notes}</p>
//                     </div>
//                   )}
//                 </div>

//                 {/* Ranges Section */}
//                 <div className="space-y-10">
//                    <div className="bg-white p-8 rounded-[24px] border border-slate-100 shadow-sm">
//                     <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
//                       <Activity size={14} /> Reference Ranges
//                     </h4>
//                     <div className="space-y-4">
//                       <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
//                         <div>
//                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Male / General</p>
//                           <p className="text-lg font-black text-slate-800 tracking-tight">{selectedParam.ref_low} — {selectedParam.ref_high}</p>
//                         </div>
//                         <span className="text-[10px] font-bold text-slate-300 italic">{selectedParam.unit_display_name}</span>
//                       </div>
//                       <div className="flex items-center justify-between p-4 bg-pink-50/30 border border-pink-100 rounded-2xl">
//                         <div>
//                           <p className="text-[9px] font-black text-pink-400 uppercase tracking-widest mb-0.5">Female Specific</p>
//                           <p className="text-lg font-black text-slate-800 tracking-tight">{selectedParam.ref_low_female || '—'} — {selectedParam.ref_high_female || '—'}</p>
//                         </div>
//                         <span className="text-[10px] font-bold text-pink-300 italic">{selectedParam.unit_display_name}</span>
//                       </div>
//                       <div className="flex items-center justify-between p-4 bg-red-50/30 border border-red-100 rounded-2xl">
//                         <div>
//                           <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-0.5">Critical Thresholds</p>
//                           <p className="text-lg font-black text-red-600 tracking-tight">{selectedParam.critical_low} — {selectedParam.critical_high}</p>
//                         </div>
//                         <AlertCircle size={20} className="text-red-300" />
//                       </div>
//                     </div>
//                   </div>

//                   {selectedParam.reference_profiles && selectedParam.reference_profiles.length > 0 && (
//                     <div className="bg-white p-8 rounded-[24px] border border-slate-100 shadow-sm">
//                       <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
//                         <Droplets size={14} /> Advanced Reference Profiles
//                       </h4>
//                       <div className="space-y-4">
//                         {selectedParam.reference_profiles.map((profile: any, i: number) => (
//                           <div key={i} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
//                             <div className="flex items-center justify-between border-b border-slate-200/50 pb-2">
//                               <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{profile.profile_name}</p>
//                               <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-slate-400">{profile.sex}</span>
//                             </div>
//                             <div className="grid grid-cols-2 gap-4">
//                               <div>
//                                 <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Age Context</p>
//                                 <p className="text-[11px] font-bold text-slate-600">{profile.age_min} — {profile.age_max || '∞'} {profile.age_unit}</p>
//                               </div>
//                               <div className="text-right">
//                                 <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Profile Range</p>
//                                 <p className="text-[11px] font-black text-slate-800">{profile.ref_low} — {profile.ref_high}</p>
//                               </div>
//                             </div>
//                             {profile.notes && <p className="text-[10px] text-slate-400 italic font-medium leading-relaxed">"{profile.notes}"</p>}
//                           </div>
//                         ))}
//                       </div>
//                     </div>
//                   )}

//                   {selectedParam.options && selectedParam.options.length > 0 && (
//                     <div className="bg-white p-8 rounded-[24px] border border-slate-100 shadow-sm">
//                       <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
//                         <Layers size={14} /> Result Options
//                       </h4>
//                       <div className="flex flex-wrap gap-2">
//                         {selectedParam.options.map((opt: any) => (
//                           <div key={opt.id} className={`px-4 py-2 rounded-xl border text-[11px] font-bold flex items-center gap-2 ${opt.is_critical_trigger ? 'bg-red-50 border-red-100 text-red-600' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
//                             {opt.option_label} 
//                             <span className="opacity-30 text-[9px] font-mono">({opt.option_value})</span>
//                             {opt.is_critical_trigger && <AlertCircle size={12} />}
//                           </div>
//                         ))}
//                       </div>
//                     </div>
//                   )}

//                   {selectedParam.auto_comment_template && (
//                     <div className="p-6 bg-purple-50/50 rounded-2xl border border-purple-100/50 italic text-[11px] text-purple-600 leading-relaxed">
//                       <span className="font-black uppercase tracking-widest text-[9px] block mb-2 not-italic text-purple-300">Comment Template</span>
//                       "{selectedParam.auto_comment_template}"
//                     </div>
//                   )}

//                   {selectedParam.critical_message && (
//                     <div className="p-6 bg-red-50/50 rounded-2xl border border-red-100/50 italic text-[11px] text-red-600 leading-relaxed">
//                       <span className="font-black uppercase tracking-widest text-[9px] block mb-2 not-italic text-red-300">Critical Alert Message</span>
//                       "{selectedParam.critical_message}"
//                     </div>
//                   )}
//                 </div>
//               </div>
//             </div>

//             <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
//                <div className="flex items-center gap-2">
//                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Registered Date</p>
//                  <p className="text-[10px] font-mono font-bold text-slate-400">{selectedParam.created_at}</p>
//                </div>
//                <button 
//                  onClick={() => setIsDetailsModalOpen(false)}
//                  className="px-6 py-2 bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-slate-200"
//                >
//                  Close Details
//                </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default LabManagement;


// import React, { useState, useEffect } from 'react';
// import { 
//   Plus, 
//   Search, 
//   Layers, 
//   Settings2, 
//   FileText, 
//   Droplets,
//   AlertCircle,
//   Loader2,
//   CheckCircle2,
//   Trash2,
//   Filter,
//   Eye,
//   X,
//   ChevronRight,
//   Activity,
//   Info,
//   ArrowDown
// } from 'lucide-react';
// import { labService } from '../services/lab.service';
// import { useNotification } from '../context/NotificationContext';

// const LabManagement: React.FC = () => {
//   const { notify } = useNotification();
//   const [activeTab, setActiveTab] = useState<'categories' | 'panels' | 'parameters'>('categories');
//   const [loading, setLoading] = useState(false);
//   const [isSaving, setIsSaving] = useState(false);

//   // Data States
//   const [categories, setCategories] = useState<any[]>([]);
//   const [panels, setPanels] = useState<any[]>([]);
//   const [parameters, setParameters] = useState<any[]>([]);
//   const [units, setUnits] = useState<any[]>([]);

//   // Modal States
//   const [isParamModalOpen, setIsParamModalOpen] = useState(false);
//   const [isPanelModalOpen, setIsPanelModalOpen] = useState(false);
//   const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
//   const [selectedParam, setSelectedParam] = useState<any>(null);
//   const [selectedPanel, setSelectedPanel] = useState<any>(null);

//   const INITIAL_PARAMETER_FORM = {
//     category_id: '',
//     panel_id: '',
//     parameter_name: '',
//     short_name: '',
//     report_section: '',
//     unit_id: '' as string | number,
//     value_type: 'NUMERIC' as any,
//     ref_low: '',
//     ref_high: '',
//     ref_low_female: '',
//     ref_high_female: '',
//     critical_low: '',
//     critical_high: '',
//     allow_manual_comment: true,
//     active_status: true,
//     notes: '',
//     rules: {
//       auto_flag_enabled: true,
//       delta_check_enabled: false,
//       critical_notification_required: false,
//       delta_percent_threshold: '',
//       panic_low: '',
//       panic_high: '',
//       requires_pathologist_review: false,
//       auto_comment_template: '',
//       critical_message: ''
//     },
//     options: [] as any[],
//     reference_profiles: [] as any[]
//   };

//   const INITIAL_PANEL_FORM = {
//     id: undefined,
//     category_id: '',
//     panel_name: '',
//     report_group: '',
//     specimen_type: '',
//     turnaround_time_hours: '',
//     active_status: true
//   };

//   // Search & Filter States
//   const [searchTerm, setSearchTerm] = useState('');
//   const [filterCategory, setFilterCategory] = useState('');

//   // Form States
//   const [categoryForm, setCategoryForm] = useState({ id: undefined as number | undefined, name: '', description: '' });
//   const [parameterForm, setParameterForm] = useState(INITIAL_PARAMETER_FORM);
//   const [panelForm, setPanelForm] = useState(INITIAL_PANEL_FORM);

//   const fetchData = async () => {
//     setLoading(true);
//     try {
//       const [cats, pans, params, fetchedUnits] = await Promise.all([
//         labService.getCategories(),
//         labService.getPanels(),
//         labService.getParameters(),
//         labService.getUnits()
//       ]);
//       setCategories(cats);
//       setPanels(pans);
//       setParameters(params);
//       setUnits(fetchedUnits);
//     } catch (err: any) {
//       const errorMsg = err.response?.data?.message || err.message || 'Failed to fetch management data';
//       notify(errorMsg, 'error');
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchData();
//   }, []);

//   const handleSaveCategory = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!categoryForm.name) return notify('Category name is required', 'warning');
    
//     setIsSaving(true);
//     try {
//       await labService.saveCategory(categoryForm);
//       notify('Category saved successfully', 'success');
//       setCategoryForm({ id: undefined, name: '', description: '' });
//       fetchData();
//     } catch (err: any) {
//       const errorMsg = err.response?.data?.message || err.message || 'Failed to save category';
//       notify(errorMsg, 'error');
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   const addOption = () => {
//     const newOption = { option_label: '', option_value: '', display_order: parameterForm.options.length + 1, is_critical_trigger: false };
//     setParameterForm({ ...parameterForm, options: [...parameterForm.options, newOption] });
//   };

//   const removeOption = (index: number) => {
//     const newOptions = parameterForm.options.filter((_, i) => i !== index);
//     setParameterForm({ ...parameterForm, options: newOptions });
//   };

//   const updateOption = (index: number, field: string, value: any) => {
//     const newOptions = [...parameterForm.options];
//     newOptions[index] = { ...newOptions[index], [field]: value };
//     setParameterForm({ ...parameterForm, options: newOptions });
//   };

//   const addProfile = () => {
//     const newProfile = { 
//       profile_name: '', 
//       sex: 'GENERAL', 
//       age_min: 0, 
//       age_max: '', 
//       age_unit: 'YEARS', 
//       ref_low: '', 
//       ref_high: '', 
//       priority_order: 50, 
//       active_status: 1, 
//       notes: '' 
//     };
//     setParameterForm({ ...parameterForm, reference_profiles: [...parameterForm.reference_profiles, newProfile] });
//   };

//   const removeProfile = (index: number) => {
//     const newProfiles = parameterForm.reference_profiles.filter((_, i) => i !== index);
//     setParameterForm({ ...parameterForm, reference_profiles: newProfiles });
//   };

//   const updateProfile = (index: number, field: string, value: any) => {
//     const newProfiles = [...parameterForm.reference_profiles];
//     newProfiles[index] = { ...newProfiles[index], [field]: value };
//     setParameterForm({ ...parameterForm, reference_profiles: newProfiles });
//   };

//   const handleSaveParameter = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!parameterForm.category_id || !parameterForm.parameter_name) {
//       return notify('Category and Parameter Name are required', 'warning');
//     }

//     setIsSaving(true);
//     try {
//       // 1. Check if the parameter is numeric
//       const isNumeric = parameterForm.value_type === 'NUMERIC';

//       const payload = {
//         ...parameterForm,
//         category_id: Number(parameterForm.category_id),
//         panel_id: parameterForm.panel_id ? Number(parameterForm.panel_id) : undefined,
//         active_status: parameterForm.active_status ? 1 : 0,
        
//         // 2. Conditionally set numeric fields to null if value_type is NOT NUMERIC
//         unit_id: isNumeric && parameterForm.unit_id ? Number(parameterForm.unit_id) : null,
//         ref_low: isNumeric && parameterForm.ref_low !== '' ? Number(parameterForm.ref_low) : null,
//         ref_high: isNumeric && parameterForm.ref_high !== '' ? Number(parameterForm.ref_high) : null,
//         ref_low_female: isNumeric && parameterForm.ref_low_female !== '' ? Number(parameterForm.ref_low_female) : null,
//         ref_high_female: isNumeric && parameterForm.ref_high_female !== '' ? Number(parameterForm.ref_high_female) : null,
//         critical_low: isNumeric && parameterForm.critical_low !== '' ? Number(parameterForm.critical_low) : null,
//         critical_high: isNumeric && parameterForm.critical_high !== '' ? Number(parameterForm.critical_high) : null,
        
//         rules: {
//           ...parameterForm.rules,
//           delta_percent_threshold: parameterForm.rules.delta_percent_threshold !== '' ? Number(parameterForm.rules.delta_percent_threshold) : 0,
//           panic_low: isNumeric && parameterForm.rules.panic_low !== '' ? Number(parameterForm.rules.panic_low) : null,
//           panic_high: isNumeric && parameterForm.rules.panic_high !== '' ? Number(parameterForm.rules.panic_high) : null,
//         },
        
//         reference_profiles: parameterForm.reference_profiles.map(p => ({
//           ...p,
//           ref_low: p.ref_low !== '' ? Number(p.ref_low) : 0,
//           ref_high: p.ref_high !== '' ? Number(p.ref_high) : 0,
//           pregnancy_status: p.pregnancy_status ? 1 : 0,
//           active_status: p.active_status ? 1 : 0
//         })),
        
//         options: parameterForm.options.map((opt, idx) => ({
//           ...opt,
//           display_order: opt.display_order || idx + 1
//         }))
//       };
      
//       await labService.saveParameter(payload);
//       notify(`Parameter ${parameterForm.id ? 'updated' : 'created'} successfully`, 'success');
//       setParameterForm(INITIAL_PARAMETER_FORM);
//       setIsParamModalOpen(false);
//       fetchData();
//     } catch (err: any) {
//       const errorMsg = err.response?.data?.message || err.message || 'Failed to save parameter';
//       notify(errorMsg, 'error');
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   // const handleSaveParameter = async (e: React.FormEvent) => {
//   //   e.preventDefault();
//   //   if (!parameterForm.category_id || !parameterForm.parameter_name) {
//   //     return notify('Category and Parameter Name are required', 'warning');
//   //   }

//   //   setIsSaving(true);
//   //   try {
//   //     const payload = {
//   //       ...parameterForm,
//   //       category_id: Number(parameterForm.category_id),
//   //       panel_id: parameterForm.panel_id ? Number(parameterForm.panel_id) : undefined,
//   //       active_status: parameterForm.active_status ? 1 : 0,
//   //       // Convert main numeric fields
//   //       ref_low: parameterForm.ref_low !== '' ? Number(parameterForm.ref_low) : null,
//   //       ref_high: parameterForm.ref_high !== '' ? Number(parameterForm.ref_high) : null,
//   //       ref_low_female: parameterForm.ref_low_female !== '' ? Number(parameterForm.ref_low_female) : null,
//   //       ref_high_female: parameterForm.ref_high_female !== '' ? Number(parameterForm.ref_high_female) : null,
//   //       critical_low: parameterForm.critical_low !== '' ? Number(parameterForm.critical_low) : null,
//   //       critical_high: parameterForm.critical_high !== '' ? Number(parameterForm.critical_high) : null,
        
//   //       rules: {
//   //         ...parameterForm.rules,
//   //         delta_percent_threshold: parameterForm.rules.delta_percent_threshold !== '' ? Number(parameterForm.rules.delta_percent_threshold) : 0,
//   //         panic_low: parameterForm.rules.panic_low !== '' ? Number(parameterForm.rules.panic_low) : null,
//   //         panic_high: parameterForm.rules.panic_high !== '' ? Number(parameterForm.rules.panic_high) : null,
//   //       },
        
//   //       reference_profiles: parameterForm.reference_profiles.map(p => ({
//   //         ...p,
//   //         ref_low: p.ref_low !== '' ? Number(p.ref_low) : 0,
//   //         ref_high: p.ref_high !== '' ? Number(p.ref_high) : 0,
//   //         pregnancy_status: p.pregnancy_status ? 1 : 0,
//   //         active_status: p.active_status ? 1 : 0
//   //       })),
        
//   //       options: parameterForm.options.map((opt, idx) => ({
//   //         ...opt,
//   //         display_order: opt.display_order || idx + 1
//   //       }))
//   //     };
      
//   //     await labService.saveParameter(payload);
//   //     notify(`Parameter ${parameterForm.id ? 'updated' : 'created'} successfully`, 'success');
//   //     setParameterForm(INITIAL_PARAMETER_FORM);
//   //     setIsParamModalOpen(false);
//   //     fetchData();
//   //   } catch (err: any) {
//   //     const errorMsg = err.response?.data?.message || err.message || 'Failed to save parameter';
//   //     notify(errorMsg, 'error');
//   //   } finally {
//   //     setIsSaving(false);
//   //   }
//   // };

//   const handleSavePanel = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!panelForm.category_id || !panelForm.panel_name) {
//       return notify('Category and Panel Name are required', 'warning');
//     }

//     setIsSaving(true);
//     try {
//       const payload = {
//         ...panelForm,
//         category_id: Number(panelForm.category_id),
//         turnaround_time_hours: Number(panelForm.turnaround_time_hours),
//         active_status: panelForm.active_status ? 1 : 0
//       };
      
//       await labService.savePanel(payload);
//       notify(`Panel ${panelForm.id ? 'updated' : 'created'} successfully`, 'success');
//       setPanelForm(INITIAL_PANEL_FORM);
//       setIsPanelModalOpen(false);
//       fetchData();
//     } catch (err: any) {
//       const errorMsg = err.response?.data?.message || err.message || 'Failed to save panel';
//       notify(errorMsg, 'error');
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   const handleDeletePanel = async (id: number) => {
//     if (!window.confirm('Are you sure you want to delete this panel?')) return;
//     try {
//       await labService.deletePanel(id);
//       notify('Panel deleted successfully', 'success');
//       fetchData();
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Failed to delete panel', 'error');
//     }
//   };

//   const handleDeleteParameter = async (id: number) => {
//     if (!window.confirm('Are you sure you want to delete this parameter?')) return;
//     try {
//       await labService.deleteParameter(id);
//       notify('Parameter deleted successfully', 'success');
//       fetchData();
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Failed to delete parameter', 'error');
//     }
//   };

//   const handleDeleteCategory = async (id: number) => {
//     if (!window.confirm('Are you sure you want to delete this category?')) return;
//     try {
//       await labService.deleteCategory(id);
//       notify('Category deleted successfully', 'success');
//       fetchData();
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Failed to delete category', 'error');
//     }
//   };

//   const filteredCategories = categories.filter(c => 
//     c.name.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   const filteredPanels = panels.filter(p => 
//     p.panel_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
//     (!filterCategory || p.category_id === Number(filterCategory))
//   );

//   const filteredParameters = parameters.filter(p => 
//     (p.parameter_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
//      p.short_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//      p.test_code?.toLowerCase().includes(searchTerm.toLowerCase())) &&
//     (!filterCategory || p.category_id === Number(filterCategory))
//   );

//   return (
//     <div className="space-y-8 animate-in fade-in duration-500 pb-20">
//       {/* Header Section */}
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
//         <div>
//           <h2 className="text-2xl font-black text-slate-800 tracking-tight">System Configuration</h2>
//           <p className="text-sm text-slate-500 font-medium mt-1">Configure laboratory test parameters and diagnostic categories.</p>
//         </div>
        
//         <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200/50 w-fit">
//           <button 
//             onClick={() => setActiveTab('categories')}
//             className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
//               activeTab === 'categories' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
//             }`}
//           >
//             <Layers size={14} /> Categories
//           </button>
//           <button 
//             onClick={() => setActiveTab('panels')}
//             className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
//               activeTab === 'panels' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
//             }`}
//           >
//             <Droplets size={14} /> Panels
//           </button>
//           <button 
//             onClick={() => setActiveTab('parameters')}
//             className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
//               activeTab === 'parameters' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
//             }`}
//           >
//             <Settings2 size={14} /> Parameters
//           </button>
//         </div>
//       </div>

//       <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
//         {/* Form Section */}
//         <div className="xl:col-span-4 space-y-6">
//           <div className="bg-white border border-slate-200 rounded-[32px] shadow-sm p-8">
//             {activeTab === 'categories' ? (
//               <form onSubmit={handleSaveCategory} className="space-y-6">
//                 <div className="flex items-center gap-3 mb-2">
//                   <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
//                     {categoryForm.id ? <Settings2 size={20} /> : <Plus size={20} />}
//                   </div>
//                   <h3 className="text-lg font-bold text-slate-800">{categoryForm.id ? 'Edit' : 'New'} Category</h3>
//                 </div>

//                 <div className="space-y-4">
//                   <div className="space-y-1.5">
//                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category Name</label>
//                     <input 
//                       type="text"
//                       className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
//                       placeholder="e.g. HEMATOLOGY"
//                       value={categoryForm.name}
//                       onChange={e => setCategoryForm({...categoryForm, name: e.target.value})}
//                     />
//                   </div>

//                   <div className="space-y-1.5">
//                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
//                     <textarea 
//                       rows={3}
//                       className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all resize-none"
//                       placeholder="Testing scope and focus..."
//                       value={categoryForm.description}
//                       onChange={e => setCategoryForm({...categoryForm, description: e.target.value})}
//                     />
//                   </div>
//                 </div>

//                 <div className="space-y-3">
//                   <button 
//                     type="submit" 
//                     disabled={isSaving}
//                     className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-100 disabled:opacity-50"
//                   >
//                     {isSaving ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
//                     {categoryForm.id ? 'Update' : 'Save'} Category
//                   </button>

//                   {categoryForm.id && (
//                     <button 
//                       type="button"
//                       onClick={() => setCategoryForm({ id: undefined, name: '', description: '' })}
//                       className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
//                     >
//                       Cancel Edit
//                     </button>
//                   )}
//                 </div>
//               </form>
//             ) : activeTab === 'panels' ? (
//               <div className="space-y-6">
//                  <div className="flex items-center gap-3 mb-2">
//                   <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
//                     <Droplets size={20} />
//                   </div>
//                   <div>
//                     <h3 className="text-lg font-black text-slate-800">Diagnostic Panels</h3>
//                     <p className="text-xs text-slate-400 font-medium italic">Bundle multiple parameters into single tests.</p>
//                   </div>
//                 </div>
//                 <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
//                    <p className="text-sm text-slate-600 leading-relaxed">
//                      Panels allow you to group related parameters (e.g. FBC, Lipid Profile) for easier ordering and reporting.
//                    </p>
//                 </div>
//                 <button 
//                   onClick={() => {
//                     setPanelForm(INITIAL_PANEL_FORM);
//                     setIsPanelModalOpen(true);
//                   }}
//                   className="w-full flex items-center justify-center gap-3 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
//                 >
//                   <Plus size={18} /> Configure New Panel
//                 </button>
//               </div>
//             ) : (
//               <div className="space-y-6">
//                 <div className="flex items-center gap-3 mb-2">
//                   <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
//                     <Plus size={20} />
//                   </div>
//                   <div>
//                     <h3 className="text-lg font-black text-slate-800">Lab Parameters</h3>
//                     <p className="text-xs text-slate-400 font-medium italic">Define specific measurable values.</p>
//                   </div>
//                 </div>
//                 <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
//                    <p className="text-sm text-slate-600 leading-relaxed">
//                      Configure reference ranges, units, and automation rules for individual test components.
//                    </p>
//                 </div>
//                 <button 
//                   onClick={() => {
//                     setParameterForm(INITIAL_PARAMETER_FORM);
//                     setIsParamModalOpen(true);
//                   }}
//                   className="w-full flex items-center justify-center gap-3 py-4 bg-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-all shadow-lg shadow-purple-200"
//                 >
//                   <Plus size={18} /> Define New Parameter
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>

//         {/* List Section */}
//         <div className="xl:col-span-8 space-y-6">
//           <div className="bg-white border border-slate-200 rounded-[32px] shadow-sm overflow-hidden min-h-[500px]">
//             <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
//               <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
//                 {activeTab === 'categories' ? <Layers size={16} /> : activeTab === 'panels' ? <Droplets size={16} /> : <Settings2 size={16} />}
//                 Existing {activeTab}
//               </h3>
              
//               <div className="flex flex-col md:flex-row items-center gap-4">
//                 <div className="relative group w-full md:w-64">
//                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-600 transition-colors" />
//                    <input 
//                      type="text"
//                      placeholder={`Search ${activeTab}...`}
//                      className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-purple-600 transition-all shadow-sm"
//                      value={searchTerm}
//                      onChange={e => setSearchTerm(e.target.value)}
//                    />
//                 </div>
//                 {activeTab !== 'categories' && (
//                   <select 
//                     className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-purple-600 transition-all shadow-sm"
//                     value={filterCategory}
//                     onChange={e => setFilterCategory(e.target.value)}
//                   >
//                     <option value="">All Categories</option>
//                     {categories.map(cat => (
//                       <option key={cat.id} value={cat.id}>{cat.name}</option>
//                     ))}
//                   </select>
//                 )}
//                 <span className="text-[10px] font-black text-slate-400 bg-white px-4 py-2 rounded-xl border border-slate-200 whitespace-nowrap shadow-sm">
//                   TOTAL: {activeTab === 'categories' ? filteredCategories.length : activeTab === 'panels' ? filteredPanels.length : filteredParameters.length}
//                 </span>
//               </div>
//             </div>

//             <div className="max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
//               <table className="w-full text-left border-collapse">
//                 <thead className="sticky top-0 z-10 bg-white">
//                   <tr className="bg-slate-50/30 border-b border-slate-100">
//                     {activeTab === 'categories' ? (
//                       <>
//                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-20">ID</th>
//                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
//                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Prefix</th>
//                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Parameters</th>
//                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
//                       </>
//                     ) : activeTab === 'panels' ? (
//                       <>
//                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Panel Name</th>
//                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
//                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">TAT (Hrs)</th>
//                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
//                       </>
//                     ) : (
//                       <>
//                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Parameter</th>
//                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
//                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit</th>
//                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
//                       </>
//                     )}
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-100">
//                   {loading ? (
//                     <tr>
//                       <td colSpan={5} className="py-20 text-center">
//                         <Loader2 className="animate-spin inline-block text-purple-600 mb-2" size={32} />
//                         <p className="text-sm text-slate-500 font-medium">Syncing with server...</p>
//                       </td>
//                     </tr>
//                   ) : activeTab === 'categories' ? (
//                     filteredCategories.length === 0 ? (
//                       <tr>
//                         <td colSpan={5} className="px-6 py-20 text-center text-slate-400 italic font-medium">No categories matching your search.</td>
//                       </tr>
//                     ) : (
//                       filteredCategories.map(cat => (
//                         <tr key={cat.id} className="group hover:bg-slate-50 transition-colors">
//                           <td className="px-6 py-4 text-xs font-mono text-slate-400">#{cat.id}</td>
//                           <td className="px-6 py-4">
//                             <p className="text-sm font-bold text-slate-800">{cat.name}</p>
//                             {cat.description && <p className="text-[10px] text-slate-400 mt-0.5">{cat.description}</p>}
//                           </td>
//                           <td className="px-6 py-4 text-xs font-black text-purple-600 tracking-wider font-mono">{cat.prefix || '-'}</td>
//                           <td className="px-6 py-4 text-xs font-bold text-slate-600">{cat.parameter_count || 0} items</td>
//                           <td className="px-6 py-4 text-right">
//                             <div className="flex items-center justify-end gap-2">
//                               <button 
//                                 onClick={() => setCategoryForm({ id: cat.id, name: cat.name, description: cat.description || '' })}
//                                 className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
//                                 title="Edit Category"
//                               >
//                                 <Settings2 size={16} />
//                               </button>
//                               <button 
//                                 onClick={() => handleDeleteCategory(cat.id)}
//                                 className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
//                                 title="Delete Category"
//                               >
//                                 <Trash2 size={16} />
//                               </button>
//                             </div>
//                           </td>
//                         </tr>
//                       ))
//                     )
//                   ) : activeTab === 'panels' ? (
//                     filteredPanels.length === 0 ? (
//                       <tr>
//                         <td colSpan={4} className="px-6 py-20 text-center text-slate-400 italic font-medium">No panels found. Try adjusting your filters.</td>
//                       </tr>
//                     ) : (
//                       filteredPanels.map(panel => (
//                         <tr key={panel.id} className="group hover:bg-slate-50 transition-colors">
//                           <td className="px-6 py-4">
//                             <p className="text-sm font-bold text-slate-800">{panel.panel_name}</p>
//                             <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter mt-0.5">{panel.specimen_type}</p>
//                           </td>
//                           <td className="px-6 py-4">
//                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-purple-50 text-purple-600 tracking-tight uppercase">
//                                {panel.category_name}
//                              </span>
//                           </td>
//                           <td className="px-6 py-4">
//                              <span className="text-xs font-bold text-slate-600">{panel.turnaround_time_hours} hrs</span>
//                           </td>
//                           <td className="px-6 py-4 text-right">
//                             <div className="flex items-center justify-end gap-2">
//                               <button 
//                                 onClick={() => {
//                                   setPanelForm({
//                                     id: panel.id,
//                                     category_id: panel.category_id,
//                                     panel_name: panel.panel_name,
//                                     report_group: panel.report_group,
//                                     specimen_type: panel.specimen_type,
//                                     turnaround_time_hours: panel.turnaround_time_hours,
//                                     active_status: panel.active_status
//                                   });
//                                   setIsPanelModalOpen(true);
//                                 }}
//                                 className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
//                               >
//                                 <Settings2 size={18} />
//                               </button>
//                               <button 
//                                 onClick={() => handleDeletePanel(panel.id)}
//                                 className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
//                               >
//                                 <Trash2 size={18} />
//                               </button>
//                             </div>
//                           </td>
//                         </tr>
//                       ))
//                     )
//                   ) : (
//                     filteredParameters.length === 0 ? (
//                       <tr>
//                         <td colSpan={4} className="px-6 py-20 text-center text-slate-400 italic font-medium">No parameters found. Try searching for something else.</td>
//                       </tr>
//                     ) : (
//                       filteredParameters.map(param => (
//                       <tr key={param.id} className="group hover:bg-slate-50 transition-colors">
//                         <td className="px-6 py-4">
//                           <p className="text-sm font-bold text-slate-800">{param.parameter_name}</p>
//                           <div className="flex items-center gap-2 mt-0.5">
//                             <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-tight">{param.short_name || 'N/A'}</span>
//                             <span className="text-[9px] font-mono text-slate-400">{param.test_code}</span>
//                           </div>
//                         </td>
//                         <td className="px-6 py-4">
//                           <span className="text-[10px] font-black px-2 py-0.5 rounded bg-purple-50 text-purple-600 tracking-tight uppercase">{param.category_name}</span>
//                         </td>
//                         <td className="px-6 py-4">
//                            <div className="flex flex-col">
//                              <span className="text-xs font-bold text-slate-600">{param.unit_display_name || '-'}</span>
//                              <span className="text-[9px] text-slate-400 font-medium uppercase tracking-tighter">{param.value_type}</span>
//                            </div>
//                         </td>
//                         <td className="px-6 py-4 text-right">
//                           <div className="flex items-center justify-end gap-2">
//                             <button 
//                               onClick={() => {
//                                 setSelectedParam({
//                                   ...param,
//                                   reference_profiles: param.profiles || []
//                                 });
//                                 setIsDetailsModalOpen(true);
//                               }}
//                               className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
//                               title="View Details"
//                             >
//                               <Eye size={18} />
//                             </button>
//                             <button 
//                               onClick={() => {
//                                 setParameterForm({
//                                   ...INITIAL_PARAMETER_FORM,
//                                   ...param,
//                                   reference_profiles: param.profiles || [],
//                                   options: param.options || [],
//                                   id: param.id,
//                                   category_id: String(param.category_id),
//                                   panel_id: param.panel_id ? String(param.panel_id) : '',
//                                   unit_id: param.unit_id ? Number(param.unit_id) : '',
//                                   active_status: param.active_status === 1 || param.active_status === true
//                                 });
//                                 setIsParamModalOpen(true);
//                               }}
//                               className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
//                               title="Edit Parameter"
//                             >
//                               <Settings2 size={18} />
//                             </button>
//                             <button 
//                               onClick={() => handleDeleteParameter(param.id)}
//                               className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
//                               title="Delete Parameter"
//                             >
//                               <Trash2 size={18} />
//                             </button>
//                           </div>
//                           </td>
//                         </tr>
//                       ))
//                     )
//                   )
//                 }
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* --- MODALS --- */}

//       {/* Create/Edit Parameter Modal */}
//       {isParamModalOpen && (
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
//           <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col scale-in-center transition-all">
//             {/* Modal Header */}
//             <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
//               <div className="flex items-center gap-4">
//                 <div className="p-3 bg-purple-600 text-white rounded-2xl shadow-lg shadow-purple-200">
//                   <Settings2 size={24} />
//                 </div>
//                 <div>
//                   <h3 className="text-xl font-black text-slate-800 tracking-tight">Configure Parameter</h3>
//                   <p className="text-xs text-slate-500 font-medium">Define testing rules, ranges, and result formats.</p>
//                 </div>
//               </div>
//               <button 
//                 onClick={() => setIsParamModalOpen(false)}
//                 className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
//               >
//                 <X size={24} />
//               </button>
//             </div>

//             {/* Modal Body */}
//             <div className="flex-1 overflow-y-auto p-8">
//               <form id="paramForm" onSubmit={handleSaveParameter} className="space-y-10">
//                 {/* Section 1: Basic Information */}
//                 <div className="space-y-6">
//                   <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
//                     <Info size={16} className="text-purple-600" />
//                     <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Basic Information</h4>
//                   </div>
                  
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                     <div className="space-y-1.5">
//                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Parent Category</label>
//                       <select 
//                         className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
//                         value={parameterForm.category_id}
//                         onChange={e => setParameterForm({
//                           ...parameterForm, 
//                           category_id: e.target.value,
//                           panel_id: '' // Reset panel when category changes
//                         })}
//                       >
//                         <option value="">Select Category</option>
//                         {categories.map(cat => (
//                           <option key={cat.id} value={cat.id}>{cat.name}</option>
//                         ))}
//                       </select>
//                     </div>

//                     <div className="space-y-1.5">
//                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Laboratory Panel (Optional)</label>
//                       <select 
//                         className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
//                         value={parameterForm.panel_id}
//                         onChange={e => setParameterForm({...parameterForm, panel_id: e.target.value})}
//                         disabled={!parameterForm.category_id}
//                       >
//                         <option value="">Select Panel</option>
//                         {panels
//                           .filter(p => !parameterForm.category_id || p.category_id === Number(parameterForm.category_id))
//                           .map(panel => (
//                             <option key={panel.id} value={panel.id}>{panel.panel_name}</option>
//                           ))}
//                       </select>
//                     </div>
//                   </div>

//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                     <div className="space-y-1.5">
//                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Parameter Name</label>
//                       <input 
//                         type="text"
//                         className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none"
//                         placeholder="e.g. Hemoglobin"
//                         value={parameterForm.parameter_name}
//                         onChange={e => setParameterForm({...parameterForm, parameter_name: e.target.value})}
//                       />
//                     </div>

//                     <div className="space-y-1.5">
//                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Short Name / Alias</label>
//                       <input 
//                         type="text"
//                         className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none"
//                         placeholder="e.g. HB"
//                         value={parameterForm.short_name}
//                         onChange={e => setParameterForm({...parameterForm, short_name: e.target.value})}
//                       />
//                     </div>
//                   </div>

//                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//                     <div className="space-y-1.5">
//                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Report Section</label>
//                       <input 
//                         type="text"
//                         className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none"
//                         placeholder="e.g. Hematology"
//                         value={parameterForm.report_section}
//                         onChange={e => setParameterForm({...parameterForm, report_section: e.target.value})}
//                       />
//                     </div>
//                     <div className="space-y-1.5">
//                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit</label>
//                       <select 
//                         className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none"
//                         value={parameterForm.unit_id}
//                         onChange={e => setParameterForm({...parameterForm, unit_id: e.target.value ? Number(e.target.value) : ''})}
//                       >
//                         <option value="">-- No Unit --</option>
//                         {units.map((u) => (
//                           <option key={u.id} value={u.id}>{u.display_name} ({u.description})</option>
//                         ))}
//                       </select>
//                     </div>
//                     <div className="space-y-1.5">
//                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Value Type</label>
//                       <select 
//                         className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none"
//                         value={parameterForm.value_type}
//                         onChange={e => setParameterForm({...parameterForm, value_type: e.target.value as any})}
//                       >
//                         <option value="NUMERIC">NUMERIC</option>
//                         <option value="TEXT">TEXT</option>
//                         <option value="SELECT">SELECT (Options)</option>
//                         <option value="BOOLEAN">BOOLEAN</option>
//                         <option value="NARRATIVE">NARRATIVE</option>
//                       </select>
//                       {parameterForm.value_type === 'SELECT' && (
//                         <div className="flex items-center gap-1.5 mt-2 ml-1 animate-in slide-in-from-top-1 fade-in duration-300">
//                           <ArrowDown size={12} className="text-blue-500 animate-bounce" />
//                           <span className="text-[10px] font-bold text-blue-600">Scroll down to configure Result Options</span>
//                         </div>
//                       )}
//                     </div>
//                   </div>
//                 </div>


//                 {/* Section 2: Reference Ranges */}
//                 <div className="space-y-6">
//                   <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
//                     <Activity size={16} className="text-emerald-600" />
//                     <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Reference Ranges</h4>
//                   </div>
                  
//                   <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
//                     <div className="space-y-1.5">
//                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ref Low (Male/Gen)</label>
//                       <input 
//                         type="number" step="any"
//                         className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none"
//                         value={parameterForm.ref_low}
//                         onChange={e => setParameterForm({...parameterForm, ref_low: e.target.value})}
//                       />
//                     </div>
//                     <div className="space-y-1.5">
//                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ref High (Male/Gen)</label>
//                       <input 
//                         type="number" step="any"
//                         className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none"
//                         value={parameterForm.ref_high}
//                         onChange={e => setParameterForm({...parameterForm, ref_high: e.target.value})}
//                       />
//                     </div>
//                     <div className="space-y-1.5">
//                       <label className="text-[10px] font-black text-pink-400 uppercase tracking-widest ml-1">Ref Low (Female)</label>
//                       <input 
//                         type="number" step="any"
//                         className="w-full px-4 py-3 bg-pink-50/30 border border-pink-100 rounded-2xl text-sm font-medium outline-none"
//                         value={parameterForm.ref_low_female}
//                         onChange={e => setParameterForm({...parameterForm, ref_low_female: e.target.value})}
//                       />
//                     </div>
//                     <div className="space-y-1.5">
//                       <label className="text-[10px] font-black text-pink-400 uppercase tracking-widest ml-1">Ref High (Female)</label>
//                       <input 
//                         type="number" step="any"
//                         className="w-full px-4 py-3 bg-pink-50/30 border border-pink-100 rounded-2xl text-sm font-medium outline-none"
//                         value={parameterForm.ref_high_female}
//                         onChange={e => setParameterForm({...parameterForm, ref_high_female: e.target.value})}
//                       />
//                     </div>
//                   </div>

//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                     <div className="space-y-1.5">
//                       <label className="text-[10px] font-black text-red-400 uppercase tracking-widest ml-1">Critical Low</label>
//                       <input 
//                         type="number" step="any"
//                         className="w-full px-4 py-3 bg-red-50/30 border border-red-100 rounded-2xl text-sm font-medium outline-none"
//                         value={parameterForm.critical_low}
//                         onChange={e => setParameterForm({...parameterForm, critical_low: e.target.value})}
//                       />
//                     </div>
//                     <div className="space-y-1.5">
//                       <label className="text-[10px] font-black text-red-400 uppercase tracking-widest ml-1">Critical High</label>
//                       <input 
//                         type="number" step="any"
//                         className="w-full px-4 py-3 bg-red-50/30 border border-red-100 rounded-2xl text-sm font-medium outline-none"
//                         value={parameterForm.critical_high}
//                         onChange={e => setParameterForm({...parameterForm, critical_high: e.target.value})}
//                       />
//                     </div>
//                   </div>
//                 </div>

//                 {/* Section 3: Rules & Validation */}
//                 <div className="space-y-6 p-6 bg-slate-50 rounded-[24px]">
//                   <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
//                     <AlertCircle size={16} className="text-amber-600" />
//                     <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Rules & Validation</h4>
//                   </div>
                  
//                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
//                     <div className="flex items-center gap-3">
//                       <input 
//                         type="checkbox"
//                         id="auto_flag"
//                         className="w-5 h-5 rounded-lg text-purple-600"
//                         checked={parameterForm.rules.auto_flag_enabled}
//                         onChange={e => setParameterForm({...parameterForm, rules: {...parameterForm.rules, auto_flag_enabled: e.target.checked}})}
//                       />
//                       <label htmlFor="auto_flag" className="text-sm font-bold text-slate-700">Auto Flag Enabled</label>
//                     </div>
//                     <div className="flex items-center gap-3">
//                       <input 
//                         type="checkbox"
//                         id="delta_check"
//                         className="w-5 h-5 rounded-lg text-purple-600"
//                         checked={parameterForm.rules.delta_check_enabled}
//                         onChange={e => setParameterForm({...parameterForm, rules: {...parameterForm.rules, delta_check_enabled: e.target.checked}})}
//                       />
//                       <label htmlFor="delta_check" className="text-sm font-bold text-slate-700">Delta Check Enabled</label>
//                     </div>
//                     <div className="flex items-center gap-3">
//                       <input 
//                         type="checkbox"
//                         id="pathologist_review"
//                         className="w-5 h-5 rounded-lg text-purple-600"
//                         checked={parameterForm.rules.requires_pathologist_review}
//                         onChange={e => setParameterForm({...parameterForm, rules: {...parameterForm.rules, requires_pathologist_review: e.target.checked}})}
//                       />
//                       <label htmlFor="pathologist_review" className="text-sm font-bold text-slate-700">Pathologist Review Req.</label>
//                     </div>
//                   </div>

//                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//                     <div className="space-y-1.5">
//                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Panic Low</label>
//                       <input 
//                         type="number" step="any"
//                         className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none"
//                         value={parameterForm.rules.panic_low}
//                         onChange={e => setParameterForm({...parameterForm, rules: {...parameterForm.rules, panic_low: e.target.value}})}
//                       />
//                     </div>
//                     <div className="space-y-1.5">
//                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Panic High</label>
//                       <input 
//                         type="number" step="any"
//                         className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none"
//                         value={parameterForm.rules.panic_high}
//                         onChange={e => setParameterForm({...parameterForm, rules: {...parameterForm.rules, panic_high: e.target.value}})}
//                       />
//                     </div>
//                     <div className="space-y-1.5">
//                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Delta % Threshold</label>
//                       <input 
//                         type="number"
//                         className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none"
//                         placeholder="e.g. 20"
//                         value={parameterForm.rules.delta_percent_threshold}
//                         onChange={e => setParameterForm({...parameterForm, rules: {...parameterForm.rules, delta_percent_threshold: e.target.value}})}
//                       />
//                     </div>
//                   </div>

//                   <div className="space-y-4">
//                     <div className="space-y-1.5">
//                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Auto Comment Template</label>
//                       <textarea 
//                         rows={2}
//                         className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none resize-none"
//                         placeholder="Result is {{FLAG}}..."
//                         value={parameterForm.rules.auto_comment_template}
//                         onChange={e => setParameterForm({...parameterForm, rules: {...parameterForm.rules, auto_comment_template: e.target.value}})}
//                       />
//                     </div>
//                     <div className="space-y-1.5">
//                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Critical Alert Message</label>
//                       <textarea 
//                         rows={2}
//                         className="w-full px-4 py-3 bg-white border border-red-100 rounded-2xl text-sm font-medium outline-none resize-none text-red-600"
//                         placeholder="Immediate notification required..."
//                         value={parameterForm.rules.critical_message}
//                         onChange={e => setParameterForm({...parameterForm, rules: {...parameterForm.rules, critical_message: e.target.value}})}
//                       />
//                     </div>
//                   </div>
//                 </div>

//                 {/* Section 4: Reference Profiles (Advanced Ranges) */}
//                 <div className="space-y-6">
//                   <div className="flex items-center justify-between pb-2 border-b border-slate-100">
//                     <div className="flex items-center gap-2">
//                       <Droplets size={16} className="text-purple-600" />
//                       <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Advanced Reference Profiles</h4>
//                     </div>
//                     <button 
//                       type="button"
//                       onClick={addProfile}
//                       className="flex items-center gap-2 px-4 py-1.5 bg-purple-50 text-purple-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-100 transition-all"
//                     >
//                       <Plus size={14} /> Add Profile
//                     </button>
//                   </div>

//                   {parameterForm.reference_profiles.length === 0 ? (
//                     <div className="py-10 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
//                       <Info size={24} className="mx-auto text-slate-300 mb-2" />
//                       <p className="text-xs text-slate-400 font-medium italic">No advanced reference profiles defined.<br/>Standard ranges will be used.</p>
//                     </div>
//                   ) : (
//                     <div className="space-y-4">
//                       {parameterForm.reference_profiles.map((profile, idx) => (
//                         <div key={idx} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6 relative group overflow-hidden">
//                           <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                          
//                           <div className="flex items-start justify-between">
//                             <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
//                               <div className="space-y-1.5">
//                                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Profile Name</label>
//                                 <input 
//                                   type="text"
//                                   className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-purple-500"
//                                   placeholder="e.g. Neonatal (0-30 days)"
//                                   value={profile.profile_name}
//                                   onChange={e => updateProfile(idx, 'profile_name', e.target.value)}
//                                 />
//                               </div>
//                               <div className="space-y-1.5">
//                                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sex Context</label>
//                                 <select 
//                                   className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
//                                   value={profile.sex}
//                                   onChange={e => updateProfile(idx, 'sex', e.target.value as any)}
//                                 >
//                                   <option value="GENERAL">General (Both)</option>
//                                   <option value="M">Male Only</option>
//                                   <option value="F">Female Only</option>
//                                 </select>
//                               </div>
//                               <div className="space-y-1.5 text-right">
//                                 <button 
//                                   type="button"
//                                   onClick={() => removeProfile(idx)}
//                                   className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
//                                 >
//                                   <Trash2 size={18} />
//                                 </button>
//                               </div>
//                             </div>
//                           </div>

//                           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//                             <div className="space-y-1.5">
//                               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Min Age</label>
//                               <div className="flex gap-2">
//                                 <input 
//                                   type="number"
//                                   className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
//                                   value={profile.age_min}
//                                   onChange={e => updateProfile(idx, 'age_min', Number(e.target.value))}
//                                 />
//                                 <select 
//                                   className="px-2 bg-slate-50 border border-slate-200 rounded-xl text-[9px] font-black outline-none"
//                                   value={profile.age_unit}
//                                   onChange={e => updateProfile(idx, 'age_unit', e.target.value as any)}
//                                 >
//                                   <option value="DAYS">DAYS</option>
//                                   <option value="MONTHS">MONTHS</option>
//                                   <option value="YEARS">YEARS</option>
//                                 </select>
//                               </div>
//                             </div>
//                             <div className="space-y-1.5">
//                               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Max Age (Null for no limit)</label>
//                               <input 
//                                 type="number"
//                                 className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
//                                 value={profile.age_max || ''}
//                                 onChange={e => updateProfile(idx, 'age_max', e.target.value ? Number(e.target.value) : null)}
//                               />
//                             </div>
//                             <div className="space-y-1.5">
//                               <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Profile Low</label>
//                               <input 
//                                 type="number" step="any"
//                                 className="w-full px-4 py-2.5 bg-emerald-50/50 border border-emerald-100 rounded-xl text-xs font-bold outline-none"
//                                 value={profile.ref_low}
//                                 onChange={e => updateProfile(idx, 'ref_low', e.target.value)}
//                               />
//                             </div>
//                             <div className="space-y-1.5">
//                               <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Profile High</label>
//                               <input 
//                                 type="number" step="any"
//                                 className="w-full px-4 py-2.5 bg-emerald-50/50 border border-emerald-100 rounded-xl text-xs font-bold outline-none"
//                                 value={profile.ref_high}
//                                 onChange={e => updateProfile(idx, 'ref_high', e.target.value)}
//                               />
//                             </div>
//                           </div>

//                           {profile.sex === 'F' && (
//                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
//                                 <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl">
//                                    <input 
//                                      type="checkbox"
//                                      checked={profile.pregnancy_status}
//                                      onChange={e => updateProfile(idx, 'pregnancy_status', e.target.checked)}
//                                      className="w-4 h-4 rounded text-purple-600"
//                                    />
//                                    <label className="text-[10px] font-bold text-slate-600">Apply to Pregnancy only?</label>
//                                 </div>
//                                 {profile.pregnancy_status && (
//                                   <select 
//                                     className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
//                                     value={profile.pregnancy_trimester}
//                                     onChange={e => updateProfile(idx, 'pregnancy_trimester', e.target.value as any)}
//                                   >
//                                     <option value="">Any Trimester</option>
//                                     <option value="T1">1st Trimester (T1)</option>
//                                     <option value="T2">2nd Trimester (T2)</option>
//                                     <option value="T3">3rd Trimester (T3)</option>
//                                   </select>
//                                 )}
//                              </div>
//                           )}
//                         </div>
//                       ))}
//                     </div>
//                   )}
//                 </div>

//                 {/* Section 5: Interpretations & Risk Levels (Options) */}
//                 {parameterForm.value_type === 'SELECT' ? (
//                   <div className="space-y-6">
//                       <div className="flex items-center justify-between pb-2 border-b border-slate-100">
//                         <div className="flex items-center gap-2">
//                           <Layers size={16} className="text-blue-600" />
//                           <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Result Options</h4>
//                         </div>
//                         <button 
//                           type="button"
//                           onClick={addOption}
//                           className="flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all"
//                         >
//                           <Plus size={14} /> Add Option
//                         </button>
//                       </div>

//                       <div className="space-y-4">
//                         {parameterForm.options.map((opt, idx) => (
//                           <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50 p-4 rounded-2xl border border-slate-200/50">
//                             <div className="md:col-span-4 space-y-1">
//                               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Label</label>
//                               <input 
//                                 type="text"
//                                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
//                                 placeholder="e.g. Positive"
//                                 value={opt.option_label}
//                                 onChange={e => updateOption(idx, 'option_label', e.target.value)}
//                               />
//                             </div>
//                             <div className="md:col-span-3 space-y-1">
//                               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Value</label>
//                               <input 
//                                 type="text"
//                                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono outline-none"
//                                 placeholder="POS"
//                                 value={opt.option_value}
//                                 onChange={e => updateOption(idx, 'option_value', e.target.value)}
//                               />
//                             </div>
//                             <div className="md:col-span-3 flex items-center gap-3 mb-2">
//                               <input 
//                                 type="checkbox"
//                                 id={`crit-${idx}`}
//                                 checked={opt.is_critical_trigger}
//                                 onChange={e => updateOption(idx, 'is_critical_trigger', e.target.checked)}
//                               />
//                               <label htmlFor={`crit-${idx}`} className="text-[10px] font-bold text-slate-600">Critical Trigger</label>
//                             </div>
//                             <div className="md:col-span-2 text-right">
//                               <button 
//                                 type="button"
//                                 onClick={() => removeOption(idx)}
//                                 className="p-2 text-slate-300 hover:text-red-500 transition-colors"
//                               >
//                                 <Trash2 size={18} />
//                               </button>
//                             </div>
//                           </div>
//                         ))}
//                         {parameterForm.options.length === 0 && (
//                           <p className="text-center py-6 text-sm text-slate-400 italic">No options added yet.</p>
//                         )}
//                       </div>
//                   </div>
//                 ) : (
//                   <div className="space-y-6">
//                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
//                        <div className="flex items-center gap-2">
//                          <Layers size={16} className="text-slate-400" />
//                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Result Options</h4>
//                        </div>
//                      </div>
//                      <div className="py-8 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
//                        <Info size={24} className="mx-auto text-blue-400 mb-2" />
//                        <p className="text-xs text-slate-500 font-medium">Result options are only available when the <strong className="text-slate-700">Value Type</strong> is set to <strong className="text-slate-700">SELECT (Options)</strong>.</p>
//                        <p className="text-[10px] text-slate-400 mt-1">Change the Value Type above to add predefined dropdown options.</p>
//                      </div>
//                   </div>
//                 )}
//                 </form>
//             </div>

//             {/* Modal Footer */}
//             <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-4">
//               <button 
//                 onClick={() => setIsParamModalOpen(false)}
//                 className="px-8 py-3 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-200 transition-all"
//               >
//                 Cancel
//               </button>
//               <button 
//                 form="paramForm"
//                 type="submit"
//                 disabled={isSaving}
//                 className="px-10 py-3 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 flex items-center gap-2 disabled:opacity-50"
//               >
//                 {isSaving ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
//                 Save Configuration
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Create/Edit Panel Modal */}
//       {isPanelModalOpen && (
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
//           <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col scale-in-center transition-all">
//             <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
//               <div className="flex items-center gap-4">
//                 <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-200">
//                   <Droplets size={24} />
//                 </div>
//                 <div>
//                   <h3 className="text-xl font-black text-slate-800 tracking-tight">{panelForm.id ? 'Update' : 'Configure'} Panel</h3>
//                   <p className="text-xs text-slate-500 font-medium">Bundle multiple test parameters together.</p>
//                 </div>
//               </div>
//               <button 
//                 onClick={() => setIsPanelModalOpen(false)}
//                 className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
//               >
//                 <X size={24} />
//               </button>
//             </div>

//             <div className="flex-1 overflow-y-auto p-8">
//               <form id="panelForm" onSubmit={handleSavePanel} className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <div className="space-y-1.5 md:col-span-2">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Parent Category</label>
//                   <select 
//                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
//                     value={panelForm.category_id}
//                     onChange={e => setPanelForm({...panelForm, category_id: e.target.value})}
//                   >
//                     <option value="">Select Category</option>
//                     {categories.map(cat => (
//                       <option key={cat.id} value={cat.id}>{cat.name}</option>
//                     ))}
//                   </select>
//                 </div>

//                 <div className="space-y-1.5 md:col-span-2">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Panel Name</label>
//                   <input 
//                     type="text"
//                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-emerald-500 transition-all"
//                     placeholder="e.g. Lipid Profile"
//                     value={panelForm.panel_name}
//                     onChange={e => setPanelForm({...panelForm, panel_name: e.target.value})}
//                   />
//                 </div>

//                 <div className="space-y-1.5">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Report Group</label>
//                   <input 
//                     type="text"
//                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none"
//                     placeholder="e.g. Biochemistry"
//                     value={panelForm.report_group}
//                     onChange={e => setPanelForm({...panelForm, report_group: e.target.value})}
//                   />
//                 </div>

//                 <div className="space-y-1.5">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Specimen Type</label>
//                   <input 
//                     type="text"
//                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none"
//                     placeholder="e.g. Plasma (EDTA)"
//                     value={panelForm.specimen_type}
//                     onChange={e => setPanelForm({...panelForm, specimen_type: e.target.value})}
//                   />
//                 </div>

//                 <div className="space-y-1.5">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">TAT (Hours)</label>
//                   <input 
//                     type="number"
//                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none"
//                     placeholder="e.g. 12"
//                     value={panelForm.turnaround_time_hours}
//                     onChange={e => setPanelForm({...panelForm, turnaround_time_hours: e.target.value})}
//                   />
//                 </div>

//                 <div className="flex items-center gap-3 pt-6">
//                   <input 
//                     type="checkbox"
//                     id="panel_status"
//                     className="w-5 h-5 rounded-lg text-emerald-600 focus:ring-emerald-500"
//                     checked={panelForm.active_status as boolean}
//                     onChange={e => setPanelForm({...panelForm, active_status: e.target.checked})}
//                   />
//                   <label htmlFor="panel_status" className="text-sm font-bold text-slate-700">Active Status</label>
//                 </div>
//               </form>
//             </div>

//             <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-4">
//               <button 
//                 onClick={() => setIsPanelModalOpen(false)}
//                 className="px-8 py-3 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-200 transition-all"
//               >
//                 Cancel
//               </button>
//               <button 
//                 form="panelForm"
//                 type="submit"
//                 disabled={isSaving}
//                 className="px-10 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center gap-2 disabled:opacity-50"
//               >
//                 {isSaving ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
//                 {panelForm.id ? 'Update Panel' : 'Create Panel'}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Parameter Details View Modal - REDESIGNED */}
//       {isDetailsModalOpen && selectedParam && (
//         <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
//           <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col scale-in-center">
//             {/* Enterprise Header */}
//             <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
//               <div className="flex items-center gap-5">
//                 <div className="p-4 bg-slate-50 border border-slate-100 text-purple-600 rounded-2xl shadow-inner">
//                   <Activity size={28} />
//                 </div>
//                 <div>
//                   <div className="flex items-center gap-3">
//                     <h3 className="text-2xl font-black text-slate-800 tracking-tight">{selectedParam.parameter_name}</h3>
//                     <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${selectedParam.active_status ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
//                       {selectedParam.active_status ? 'Active' : 'Inactive'}
//                     </span>
//                   </div>
//                   <div className="flex items-center gap-2 mt-0.5">
//                     <span className="text-xs font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded uppercase tracking-tighter">{selectedParam.category_name}</span>
//                     <span className="text-xs text-slate-400 font-mono font-bold">ID: {selectedParam.test_code}</span>
//                   </div>
//                 </div>
//               </div>
//               <button 
//                 onClick={() => setIsDetailsModalOpen(false)}
//                 className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
//               >
//                 <X size={24} />
//               </button>
//             </div>

//             <div className="flex-1 overflow-y-auto p-10 bg-slate-50/30">
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
//                 {/* Specs Section */}
//                 <div className="space-y-10">
//                   <div className="bg-white p-8 rounded-[24px] border border-slate-100 shadow-sm">
//                     <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
//                       <Info size={14} /> Core Specifications
//                     </h4>
//                     <div className="grid grid-cols-2 gap-8">
//                       <div className="space-y-1">
//                         <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Short Name</p>
//                         <p className="text-sm font-bold text-slate-700">{selectedParam.short_name || '—'}</p>
//                       </div>
//                       <div className="space-y-1">
//                         <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Result Unit</p>
//                         <p className="text-sm font-bold text-slate-700">{selectedParam.unit_display_name || '—'}</p>
//                       </div>
//                       <div className="space-y-1">
//                         <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Data Type</p>
//                         <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-black tracking-tight">{selectedParam.value_type}</span>
//                       </div>
//                       <div className="space-y-1">
//                         <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Laboratory Panel</p>
//                         <p className="text-sm font-bold text-slate-800">
//                           {selectedParam.panel_name || panels.find(p => p.id === selectedParam.panel_id)?.panel_name || 'Individual'}
//                         </p>
//                       </div>
//                       <div className="space-y-1">
//                         <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Report Section</p>
//                         <p className="text-sm font-bold text-slate-700">{selectedParam.report_section || '—'}</p>
//                       </div>
//                       <div className="space-y-1">
//                         <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Manual Comment</p>
//                         <span className={`inline-block px-2 py-1 rounded text-[10px] font-black tracking-tight ${selectedParam.allow_manual_comment ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
//                           {selectedParam.allow_manual_comment ? 'ALLOWED' : 'DISABLED'}
//                         </span>
//                       </div>
//                     </div>
//                   </div>

//                   <div className="bg-white p-8 rounded-[24px] border border-slate-100 shadow-sm">
//                      <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
//                       <Settings2 size={14} /> Automation Rules
//                     </h4>
//                     <div className="grid grid-cols-2 gap-4">
//                       {[
//                         { label: 'Auto Flagging', active: selectedParam.auto_flag_enabled },
//                         { label: 'Delta Checking', active: selectedParam.delta_check_enabled },
//                         { label: 'Pathologist Review', active: selectedParam.requires_pathologist_review },
//                         { label: 'Critical Notify', active: selectedParam.critical_notification_required },
//                       ].map((rule, i) => (
//                         <div key={i} className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
//                           <span className="text-[11px] font-bold text-slate-600">{rule.label}</span>
//                           <div className="flex items-center gap-2">
//                             <span className={`text-[9px] font-black tracking-widest ${rule.active ? 'text-emerald-500' : 'text-slate-400'}`}>
//                               {rule.active ? 'ENABLED' : 'DISABLED'}
//                             </span>
//                             <div className={`w-1.5 h-1.5 rounded-full ${rule.active ? 'bg-emerald-500 shadow-sm shadow-emerald-200' : 'bg-slate-300'}`}></div>
//                           </div>
//                         </div>
//                       ))}
//                     </div>

//                     {/* Thresholds Sub-section */}
//                     <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-3 gap-4">
//                       <div>
//                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Delta Thresh.</p>
//                         <p className="text-xs font-bold text-slate-700">{selectedParam.delta_percent_threshold ? `${selectedParam.delta_percent_threshold}%` : '—'}</p>
//                       </div>
//                       <div>
//                         <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">Panic Low</p>
//                         <p className="text-xs font-bold text-red-600">{selectedParam.panic_low || '—'}</p>
//                       </div>
//                       <div>
//                         <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">Panic High</p>
//                         <p className="text-xs font-bold text-red-600">{selectedParam.panic_high || '—'}</p>
//                       </div>
//                     </div>
//                   </div>

//                   {selectedParam.notes && (
//                     <div className="bg-white p-8 rounded-[24px] border border-slate-100 shadow-sm">
//                       <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
//                         <Info size={14} /> Parameter Description
//                       </h4>
//                       <p className="text-sm text-slate-600 leading-relaxed font-medium">{selectedParam.notes}</p>
//                     </div>
//                   )}
//                 </div>

//                 {/* Ranges Section */}
//                 <div className="space-y-10">
//                    <div className="bg-white p-8 rounded-[24px] border border-slate-100 shadow-sm">
//                     <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
//                       <Activity size={14} /> Reference Ranges
//                     </h4>
//                     <div className="space-y-4">
//                       <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
//                         <div>
//                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Male / General</p>
//                           <p className="text-lg font-black text-slate-800 tracking-tight">{selectedParam.ref_low} — {selectedParam.ref_high}</p>
//                         </div>
//                         <span className="text-[10px] font-bold text-slate-300 italic">{selectedParam.unit_display_name}</span>
//                       </div>
//                       <div className="flex items-center justify-between p-4 bg-pink-50/30 border border-pink-100 rounded-2xl">
//                         <div>
//                           <p className="text-[9px] font-black text-pink-400 uppercase tracking-widest mb-0.5">Female Specific</p>
//                           <p className="text-lg font-black text-slate-800 tracking-tight">{selectedParam.ref_low_female || '—'} — {selectedParam.ref_high_female || '—'}</p>
//                         </div>
//                         <span className="text-[10px] font-bold text-pink-300 italic">{selectedParam.unit_display_name}</span>
//                       </div>
//                       <div className="flex items-center justify-between p-4 bg-red-50/30 border border-red-100 rounded-2xl">
//                         <div>
//                           <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-0.5">Critical Thresholds</p>
//                           <p className="text-lg font-black text-red-600 tracking-tight">{selectedParam.critical_low} — {selectedParam.critical_high}</p>
//                         </div>
//                         <AlertCircle size={20} className="text-red-300" />
//                       </div>
//                     </div>
//                   </div>

//                   {selectedParam.reference_profiles && selectedParam.reference_profiles.length > 0 && (
//                     <div className="bg-white p-8 rounded-[24px] border border-slate-100 shadow-sm">
//                       <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
//                         <Droplets size={14} /> Advanced Reference Profiles
//                       </h4>
//                       <div className="space-y-4">
//                         {selectedParam.reference_profiles.map((profile: any, i: number) => (
//                           <div key={i} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
//                             <div className="flex items-center justify-between border-b border-slate-200/50 pb-2">
//                               <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{profile.profile_name}</p>
//                               <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-slate-400">{profile.sex}</span>
//                             </div>
//                             <div className="grid grid-cols-2 gap-4">
//                               <div>
//                                 <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Age Context</p>
//                                 <p className="text-[11px] font-bold text-slate-600">{profile.age_min} — {profile.age_max || '∞'} {profile.age_unit}</p>
//                               </div>
//                               <div className="text-right">
//                                 <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Profile Range</p>
//                                 <p className="text-[11px] font-black text-slate-800">{profile.ref_low} — {profile.ref_high}</p>
//                               </div>
//                             </div>
//                             {profile.notes && <p className="text-[10px] text-slate-400 italic font-medium leading-relaxed">"{profile.notes}"</p>}
//                           </div>
//                         ))}
//                       </div>
//                     </div>
//                   )}

//                   {selectedParam.options && selectedParam.options.length > 0 && (
//                     <div className="bg-white p-8 rounded-[24px] border border-slate-100 shadow-sm">
//                       <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
//                         <Layers size={14} /> Result Options
//                       </h4>
//                       <div className="flex flex-wrap gap-2">
//                         {selectedParam.options.map((opt: any) => (
//                           <div key={opt.id} className={`px-4 py-2 rounded-xl border text-[11px] font-bold flex items-center gap-2 ${opt.is_critical_trigger ? 'bg-red-50 border-red-100 text-red-600' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
//                             {opt.option_label} 
//                             <span className="opacity-30 text-[9px] font-mono">({opt.option_value})</span>
//                             {opt.is_critical_trigger && <AlertCircle size={12} />}
//                           </div>
//                         ))}
//                       </div>
//                     </div>
//                   )}

//                   {selectedParam.auto_comment_template && (
//                     <div className="p-6 bg-purple-50/50 rounded-2xl border border-purple-100/50 italic text-[11px] text-purple-600 leading-relaxed">
//                       <span className="font-black uppercase tracking-widest text-[9px] block mb-2 not-italic text-purple-300">Comment Template</span>
//                       "{selectedParam.auto_comment_template}"
//                     </div>
//                   )}

//                   {selectedParam.critical_message && (
//                     <div className="p-6 bg-red-50/50 rounded-2xl border border-red-100/50 italic text-[11px] text-red-600 leading-relaxed">
//                       <span className="font-black uppercase tracking-widest text-[9px] block mb-2 not-italic text-red-300">Critical Alert Message</span>
//                       "{selectedParam.critical_message}"
//                     </div>
//                   )}
//                 </div>
//               </div>
//             </div>

//             <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
//                <div className="flex items-center gap-2">
//                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Registered Date</p>
//                  <p className="text-[10px] font-mono font-bold text-slate-400">{selectedParam.created_at}</p>
//                </div>
//                <button 
//                  onClick={() => setIsDetailsModalOpen(false)}
//                  className="px-6 py-2 bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-slate-200"
//                >
//                  Close Details
//                </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default LabManagement;
