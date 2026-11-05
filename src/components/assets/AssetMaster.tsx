import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Filter, AlertCircle, RefreshCw, MoreVertical, Eye, ArrowLeft, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import LoadingAnimation from '../animations/LoadingAnimation';

const parseDateString = (dateStr?: string | null) => {
  if (!dateStr) return '';
  const parts = dateStr.split(' ');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const monthStr = parts[1].slice(0, 3);
    const year = parts[2];
    const months: Record<string, string> = {
      Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
      Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
    };
    const month = months[monthStr];
    if (day && month && year) {
      return `${year}-${month}-${day}`;
    }
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return dateStr;
};

interface AssetLookupItem {
  id: number;
  name: string;
}

interface AssetLookups {
  categories: AssetLookupItem[];
  conditions: AssetLookupItem[];
  statuses: AssetLookupItem[];
  intervals: AssetLookupItem[];
  wings: AssetLookupItem[];
  locations: AssetLookupItem[];
}

interface Asset {
  id: number;
  unique_id: string;
  asset_name: string;
  category: { id: number, name: string } | null;
  location: { id: number, name: string } | null;
  wing: { id: number, name: string } | null;
  condition: { id: number, name: string } | null;
  status: { id: number, name: string } | null;
  service_interval: { id: number, name: string, months: number } | null;
  make: string | null;
  model: string | null;
  serial_number: string | null;
  supplier_vendor: string | null;
  remarks: string | null;
  purchase_cost: { amount: number, formatted: string, currency: string } | null;
  purchase_date: string | null;
  warranty_expiry: string | null;
  warranty_status: string | null;
  last_service_date: string | null;
  next_service_due: string | null;
  service_status: string | null;
  responsible_officer: { id: number, name: string | null } | null;
  created_at: string | null;
  updated_at: string | null;
}

const AssetMaster: React.FC = () => {
  const { notify: showNotification } = useNotification();
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [lookups, setLookups] = useState<AssetLookups | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [activeActionAsset, setActiveActionAsset] = useState<Asset | null>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Form State
  const [formData, setFormData] = useState({
    asset_name: '',
    category_id: '',
    location_id: '',
    wing_id: '',
    condition_id: '',
    status_id: '',
    service_interval_id: '',
    purchase_cost: '',
    purchase_date: '',
    warranty_expiry: '',
    responsible_officer_id: '',
    type_code: 'MED',
    make: '',
    model: '',
    serial_number: '',
    supplier_vendor: '',
    last_service_date: '',
    next_service_due: '',
    service_status: 'OK',
    remarks: ''
  });

  const fetchLookups = async () => {
    try {
      const response = await apiClient.get('/assets/lookups');
      if (response.data?.status === 'success') {
        setLookups(response.data.data);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error(error);
      showNotification('Failed to fetch lookups', 'error');
    }
  };

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/assets/list');
      if (response.data?.status === 'success') {
        setAssets(response.data.data);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error(error);
      showNotification('Failed to fetch assets', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLookups();
    fetchAssets();
  }, []);

  const handleOpenModal = (asset?: Asset) => {
    if (asset) {
      setEditingAsset(asset);
      setFormData({
        asset_name: asset.asset_name,
        category_id: asset.category?.id?.toString() || '',
        location_id: asset.location?.id?.toString() || '',
        wing_id: asset.wing?.id?.toString() || '',
        condition_id: asset.condition?.id?.toString() || '',
        status_id: asset.status?.id?.toString() || '',
        service_interval_id: asset.service_interval?.id?.toString() || '',
        purchase_cost: asset.purchase_cost?.amount?.toString() || '',
        purchase_date: parseDateString(asset.purchase_date),
        warranty_expiry: parseDateString(asset.warranty_expiry),
        responsible_officer_id: asset.responsible_officer?.id?.toString() || '',
        type_code: "MED",
        make: asset.make || '',
        model: asset.model || '',
        serial_number: asset.serial_number || '',
        supplier_vendor: asset.supplier_vendor || '',
        last_service_date: parseDateString(asset.last_service_date),
        next_service_due: parseDateString(asset.next_service_due),
        service_status: asset.service_status || 'OK',
        remarks: asset.remarks || ''
      });
    } else {
      setEditingAsset(null);
      setFormData({
        asset_name: '',
        category_id: '',
        location_id: '',
        wing_id: '',
        condition_id: '',
        status_id: '',
        service_interval_id: '',
        purchase_cost: '',
        purchase_date: '',
        warranty_expiry: '',
        responsible_officer_id: user?.id?.toString() || '',
        type_code: 'MED',
        make: '',
        model: '',
        serial_number: '',
        supplier_vendor: '',
        last_service_date: '',
        next_service_due: '',
        service_status: 'OK',
        remarks: ''
      });
    }
    setIsModalOpen(true);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAsset(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingAsset) {
        const payload = { ...formData };
        delete (payload as any).category_id;
        await apiClient.put(`/assets/update?id=${editingAsset.id}`, payload);
        showNotification('Asset updated successfully', 'success');
      } else {
        await apiClient.post('/assets/create', formData);
        showNotification('Asset created successfully', 'success');
      }
      handleCloseModal();
      fetchAssets();
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || error.message || 'Failed to save asset';
      showNotification(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.asset_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          asset.unique_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter ? asset.category?.id?.toString() === categoryFilter : true;
    const matchesStatus = statusFilter ? asset.status?.id?.toString() === statusFilter : true;
    const matchesCondition = conditionFilter ? asset.condition?.id?.toString() === conditionFilter : true;
    return matchesSearch && matchesCategory && matchesStatus && matchesCondition;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, statusFilter, conditionFilter]);

  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);
  const paginatedAssets = filteredAssets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Asset Master</h2>
          <p className="text-slate-500">Manage all facility assets and equipment</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-brand-primary text-white px-6 py-2.5 rounded-xl font-bold hover:bg-brand-secondary transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          New Asset
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mt-6">
        <div className="p-6 border-b border-slate-100 flex flex-col gap-6 bg-white">
          <div className="flex justify-between items-center gap-4">
            <div className="relative w-full max-w-2xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search assets by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all text-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 flex-shrink-0">
                Total: {filteredAssets.length}
              </div>
              <button 
                onClick={fetchAssets}
                className="p-2.5 text-slate-500 bg-white border border-slate-200 hover:text-brand-primary hover:bg-brand-50 rounded-xl transition-colors flex-shrink-0"
                title="Refresh"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-4 overflow-x-auto pb-2 hide-scrollbar">
            <div className="flex flex-col gap-1.5 min-w-[160px]">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Asset Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:border-brand-primary transition-colors cursor-pointer"
              >
                <option value="">All Categories</option>
                {lookups?.categories.map(c => <option key={c.id} value={c.id.toString()}>{c.name}</option>)}
              </select>
            </div>
            
            <div className="flex flex-col gap-1.5 min-w-[160px]">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:border-brand-primary transition-colors cursor-pointer"
              >
                <option value="">All Statuses</option>
                {lookups?.statuses.map(c => <option key={c.id} value={c.id.toString()}>{c.name}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5 min-w-[160px]">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Condition</label>
              <select
                value={conditionFilter}
                onChange={(e) => setConditionFilter(e.target.value)}
                className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:border-brand-primary transition-colors cursor-pointer"
              >
                <option value="">All Conditions</option>
                {lookups?.conditions.map(c => <option key={c.id} value={c.id.toString()}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="p-4 font-black text-[11px] text-slate-500 uppercase tracking-wider">Asset Details</th>
                <th className="p-4 font-black text-[11px] text-slate-500 uppercase tracking-wider">Location</th>
                <th className="p-4 font-black text-[11px] text-slate-500 uppercase tracking-wider">Financials & Dates</th>
                <th className="p-4 font-black text-[11px] text-slate-500 uppercase tracking-wider">Maintenance</th>
                <th className="p-4 font-black text-[11px] text-slate-500 uppercase tracking-wider">Status & Cond.</th>
                <th className="p-4 font-black text-[11px] text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <LoadingAnimation />
                  </td>
                </tr>
              ) : paginatedAssets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 flex flex-col items-center">
                    <AlertCircle size={32} className="text-slate-300 mb-2" />
                    No assets found matching your criteria.
                  </td>
                </tr>
              ) : (
                paginatedAssets.map(asset => (
                  <tr key={asset.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors bg-white">
                    {/* Asset Details */}
                    <td className="p-4 align-top">
                      <p className="text-sm font-black text-slate-800">{asset.asset_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-tight">ID: {asset.unique_id}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{asset.category?.name || '-'}</span>
                      </div>
                      {(asset.make || asset.model) && <p className="text-[10px] text-slate-400 mt-1 font-medium">{asset.make || ''} {asset.model || ''} {asset.serial_number ? `(SN: ${asset.serial_number})` : ''}</p>}
                    </td>

                    {/* Location */}
                    <td className="p-4 align-top">
                      <p className="text-xs font-bold text-slate-700">{asset.wing?.name || '-'}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-medium uppercase tracking-tight">{asset.location?.name || '-'}</p>
                    </td>

                    {/* Financials & Dates */}
                    <td className="p-4 align-top">
                      <p className="text-xs font-black text-slate-700">{asset.purchase_cost?.formatted || '-'}</p>
                      <div className="flex flex-col gap-0.5 mt-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Purchased: <span className="text-slate-600">{asset.purchase_date || '-'}</span></span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Warranty: <span className="text-slate-600">{asset.warranty_expiry || '-'}</span></span>
                      </div>
                    </td>

                    {/* Maintenance */}
                    <td className="p-4 align-top">
                      <p className="text-xs font-bold text-slate-700">{asset.service_interval?.name || '-'}</p>
                      <div className="flex flex-col gap-0.5 mt-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Last Svc: <span className="text-slate-600">{asset.last_service_date || '-'}</span></span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Next Svc: <span className="text-slate-600">{asset.next_service_due || '-'}</span></span>
                      </div>
                    </td>

                    {/* Status & Condition */}
                    <td className="p-4 align-top">
                      <div className="flex flex-col items-start gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-tighter uppercase ${asset.status?.name === 'In Use' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {asset.status?.name || '-'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-tighter uppercase ${asset.condition?.name === 'Good' ? 'bg-purple-50 text-purple-700' : asset.condition?.name === 'Fair' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                          {asset.condition?.name || '-'}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-4 align-top text-right">
                      <div className="flex justify-end">
                         <button 
                           onClick={() => { setActiveActionAsset(asset); setIsActionModalOpen(true); }}
                           className="p-1.5 text-slate-400 hover:text-brand-primary rounded-lg transition-colors"
                           title="Actions"
                         >
                           <MoreVertical size={18} />
                         </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-sm font-medium text-slate-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredAssets.length)} of {filteredAssets.length} entries
            </span>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 text-slate-400 hover:text-brand-primary disabled:opacity-50 disabled:hover:text-slate-400 rounded-lg transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-bold text-slate-700 px-3">Page {currentPage} of {totalPages}</span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 text-slate-400 hover:text-brand-primary disabled:opacity-50 disabled:hover:text-slate-400 rounded-lg transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Asset Modal */}
      {isModalOpen && lookups && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                {editingAsset && (
                  <button 
                    type="button"
                    onClick={() => { setIsModalOpen(false); setIsActionModalOpen(true); }}
                    className="p-1.5 text-slate-400 hover:text-brand-primary hover:bg-brand-50 rounded-lg transition-colors"
                  >
                    <ArrowLeft size={20} />
                  </button>
                )}
                <h3 className="text-xl font-bold text-slate-800">
                  {editingAsset ? 'Edit Asset' : 'Register New Asset'}
                </h3>
              </div>
              <button 
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            
            <form id="assetForm" onSubmit={handleSubmit} className="flex flex-col overflow-hidden max-h-full">
              <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Basic Info */}
                <div className="space-y-4 md:col-span-2">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-2">Basic Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Asset Name</label>
                      <input 
                        type="text"
                        name="asset_name"
                        value={formData.asset_name}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g. Ultrasound Scanner"
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary focus:bg-white outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
                      <select
                        name="category_id"
                        value={formData.category_id}
                        onChange={handleInputChange}
                        required
                        disabled={!!editingAsset}
                        className={`w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary focus:bg-white outline-none transition-all ${editingAsset ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <option value="">Select Category</option>
                        {lookups.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Equipment Specifications */}
                <div className="space-y-4 md:col-span-2">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-2">Equipment Specifications</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Make / Manufacturer</label>
                      <input 
                        type="text"
                        name="make"
                        value={formData.make}
                        onChange={handleInputChange}
                        placeholder="e.g. Philips"
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary focus:bg-white outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Model</label>
                      <input 
                        type="text"
                        name="model"
                        value={formData.model}
                        onChange={handleInputChange}
                        placeholder="e.g. Lumify"
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary focus:bg-white outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Serial Number</label>
                      <input 
                        type="text"
                        name="serial_number"
                        value={formData.serial_number}
                        onChange={handleInputChange}
                        placeholder="e.g. PHL-US-9921"
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary focus:bg-white outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Location & Tracking */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-2">Location</h4>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Wing</label>
                    <select
                      name="wing_id"
                      value={formData.wing_id}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary focus:bg-white outline-none transition-all"
                    >
                      <option value="">Select Wing</option>
                      {lookups.wings?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Location</label>
                    <select
                      name="location_id"
                      value={formData.location_id}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary focus:bg-white outline-none transition-all"
                    >
                      <option value="">Select Location</option>
                      {lookups.locations?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Status & Condition */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-2">Status & Condition</h4>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Condition</label>
                    <select
                      name="condition_id"
                      value={formData.condition_id}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary focus:bg-white outline-none transition-all"
                    >
                      <option value="">Select Condition</option>
                      {lookups.conditions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                    <select
                      name="status_id"
                      value={formData.status_id}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary focus:bg-white outline-none transition-all"
                    >
                      <option value="">Select Status</option>
                      {lookups.statuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Maintenance & Purchase */}
                <div className="space-y-4 md:col-span-2">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-2">Maintenance & Financials</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Service Interval</label>
                      <select
                        name="service_interval_id"
                        value={formData.service_interval_id}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary focus:bg-white outline-none transition-all"
                      >
                        <option value="">Select Interval</option>
                        {lookups.intervals.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Purchase Cost</label>
                      <input 
                        type="number"
                        step="0.01"
                        name="purchase_cost"
                        value={formData.purchase_cost}
                        onChange={handleInputChange}
                        placeholder="e.g. 150000.00"
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary focus:bg-white outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Purchase Date</label>
                      <input 
                        type="date"
                        name="purchase_date"
                        value={formData.purchase_date}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary focus:bg-white outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Warranty Expiry</label>
                      <input 
                        type="date"
                        name="warranty_expiry"
                        value={formData.warranty_expiry}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary focus:bg-white outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Supplier / Vendor</label>
                      <input 
                        type="text"
                        name="supplier_vendor"
                        value={formData.supplier_vendor}
                        onChange={handleInputChange}
                        placeholder="e.g. MedEquip Nigeria Ltd"
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary focus:bg-white outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Maintenance Tracking */}
                <div className="space-y-4 md:col-span-2">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-2">Maintenance Tracking</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Last Service Date</label>
                      <input 
                        type="date"
                        name="last_service_date"
                        value={formData.last_service_date}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary focus:bg-white outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Next Service Due</label>
                      <input 
                        type="date"
                        name="next_service_due"
                        value={formData.next_service_due}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary focus:bg-white outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Service Status</label>
                      <select
                        name="service_status"
                        value={formData.service_status}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary focus:bg-white outline-none transition-all"
                      >
                        <option value="OK">OK</option>
                        <option value="DUE">DUE</option>
                        <option value="OVERDUE">OVERDUE</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Remarks */}
                <div className="space-y-4 md:col-span-2">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-2">Additional Remarks</h4>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Remarks / Notes</label>
                    <input 
                      type="text"
                      name="remarks"
                      value={formData.remarks}
                      onChange={handleInputChange}
                      placeholder="e.g. Assigned to Radiology Dept"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary focus:bg-white outline-none transition-all"
                    />
                  </div>
                </div>

              </div>
              
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 mt-auto">
                <button 
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2.5 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl font-bold text-white bg-brand-primary hover:bg-brand-secondary transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting && <RefreshCw size={18} className="animate-spin" />}
                  {isSubmitting ? 'Saving...' : editingAsset ? 'Save Changes' : 'Create Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Action Modal */}
      {isActionModalOpen && activeActionAsset && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[1.5rem] shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-start bg-white">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Asset Actions</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded border border-slate-200 text-slate-700 bg-white">{activeActionAsset.unique_id}</span>
                  <span className="text-sm font-semibold text-slate-500">{activeActionAsset.asset_name} &bull; {activeActionAsset.category?.name || 'Uncategorized'}</span>
                </div>
              </div>
              <button 
                onClick={() => { setIsActionModalOpen(false); setActiveActionAsset(null); }}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-full transition-colors border border-slate-200"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div className="p-8 flex flex-wrap gap-4 bg-white justify-center">
              <button
                onClick={() => {
                  setIsActionModalOpen(false);
                  setIsViewModalOpen(true);
                }}
                className="flex flex-col items-center justify-center gap-3 w-[150px] h-[140px] bg-white border border-slate-100 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] hover:border-brand-primary/40 hover:shadow-md rounded-[1.25rem] transition-all group"
              >
                <div className="w-14 h-14 flex items-center justify-center bg-slate-50 rounded-[1rem] group-hover:bg-brand-50 transition-colors">
                  <Eye size={24} className="text-slate-500 group-hover:text-brand-primary" />
                </div>
                <span className="font-bold text-sm text-slate-700 group-hover:text-brand-primary">View Details</span>
              </button>
              
              <button
                onClick={() => {
                  setIsActionModalOpen(false);
                  handleOpenModal(activeActionAsset);
                }}
                className="flex flex-col items-center justify-center gap-3 w-[150px] h-[140px] bg-white border border-slate-100 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] hover:border-emerald-500/40 hover:shadow-md rounded-[1.25rem] transition-all group"
              >
                <div className="w-14 h-14 flex items-center justify-center bg-slate-50 rounded-[1rem] group-hover:bg-emerald-50 transition-colors">
                  <Edit2 size={24} className="text-slate-500 group-hover:text-emerald-600" />
                </div>
                <span className="font-bold text-sm text-slate-700 group-hover:text-emerald-600">Edit Asset</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {isViewModalOpen && activeActionAsset && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => { setIsViewModalOpen(false); setIsActionModalOpen(true); }}
                  className="p-1.5 text-slate-400 hover:text-brand-primary hover:bg-brand-50 rounded-lg transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <FileText size={20} className="text-brand-primary" />
                    Asset Details
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => { setIsViewModalOpen(false); setActiveActionAsset(null); }}
                className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-50/30 flex-1">
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm mb-6">
                <div className="flex items-start justify-between border-b border-slate-100 pb-6 mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-slate-800">{activeActionAsset.asset_name}</h2>
                    <p className="text-sm font-medium text-slate-500 mt-1">{activeActionAsset.category?.name || 'No Category'}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-black tracking-tight bg-slate-100 text-slate-600 uppercase mb-2">
                      {activeActionAsset.unique_id}
                    </span>
                    <div className="flex items-center gap-2 justify-end">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-tighter uppercase ${activeActionAsset.status?.name === 'In Use' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {activeActionAsset.status?.name || '-'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-tighter uppercase ${activeActionAsset.condition?.name === 'Good' ? 'bg-purple-50 text-purple-700' : activeActionAsset.condition?.name === 'Fair' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                        {activeActionAsset.condition?.name || '-'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Equipment Details */}
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                      Equipment Specs
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Make</p>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5">{activeActionAsset.make || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Model</p>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5">{activeActionAsset.model || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Serial Number</p>
                        <p className="text-sm font-mono text-slate-600 mt-0.5">{activeActionAsset.serial_number || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Supplier / Vendor</p>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5">{activeActionAsset.supplier_vendor || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Location Details */}
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Location Info
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Wing / Department</p>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5">{activeActionAsset.wing?.name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Specific Location</p>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5">{activeActionAsset.location?.name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Responsible Officer</p>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5">{activeActionAsset.responsible_officer?.name || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Financial Details */}
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                      Financial Details
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Purchase Cost</p>
                        <p className="text-sm font-black text-emerald-600 mt-0.5">{activeActionAsset.purchase_cost?.formatted || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Purchase Date</p>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5">{activeActionAsset.purchase_date || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Warranty Expiry</p>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5">{activeActionAsset.warranty_expiry || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Warranty Status</p>
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase mt-1 ${activeActionAsset.warranty_status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                          {activeActionAsset.warranty_status || '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Maintenance Log */}
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      Maintenance Log
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Service Interval</p>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5">{activeActionAsset.service_interval?.name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Last Service</p>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5">{activeActionAsset.last_service_date || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Next Service Due</p>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5">{activeActionAsset.next_service_due || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Service Status</p>
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase mt-1 ${activeActionAsset.service_status === 'OK' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {activeActionAsset.service_status || '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Remarks */}
                {activeActionAsset.remarks && (
                  <div className="mt-6 bg-slate-50/30 p-4 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Remarks / Notes</p>
                    <p className="text-sm text-slate-700 font-medium">{activeActionAsset.remarks}</p>
                  </div>
                )}

                {/* System Audit Trails */}
                <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4 text-slate-500">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Created By</p>
                    <p className="text-xs font-semibold mt-0.5">{activeActionAsset.created_by?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Created At</p>
                    <p className="text-xs font-semibold mt-0.5">{activeActionAsset.created_at || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Updated By</p>
                    <p className="text-xs font-semibold mt-0.5">{activeActionAsset.updated_by?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Updated At</p>
                    <p className="text-xs font-semibold mt-0.5">{activeActionAsset.updated_at || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetMaster;
