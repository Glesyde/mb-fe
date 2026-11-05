
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Filter, 
  Mail, 
  Phone, 
  MoreVertical, 
  Star, 
  CheckCircle2, 
  XCircle, 
  Activity,
  Globe,
  ChevronRight,
  ShieldCheck,
  User,
  X,
  MapPin,
  Loader2,
  AlertCircle,
  Edit2,
  Trash2,
  RefreshCcw,
  History,
  Save,
  ChevronLeft,
  AlertTriangle
} from 'lucide-react';
import { inventoryService } from '../services/inventory.service';
import { useNotification } from '../context/NotificationContext';

const InventorySuppliers: React.FC = () => {
  const { notify } = useNotification();
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal Mode
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    contact_phone: '',
    contact_email: '',
    address: '',
    status: 'ACTIVE'
  });

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const data = await inventoryService.searchVendors();
      setVendors(data);
    } catch (err: any) {
      notify('Failed to load vendor registry', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  // Reset to page 1 when searching
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleOpenCreate = () => {
    setModalMode('create');
    setFormData({ name: '', contact_person: '', contact_phone: '', contact_email: '', address: '', status: 'ACTIVE' });
    setShowAddModal(true);
  };

  const handleOpenEdit = async (id: number) => {
    setActiveMenuId(null);
    setLoading(true);
    try {
      const data = await inventoryService.getVendor(id);
      setModalMode('edit');
      setEditingId(id);
      setFormData({
        name: data.name,
        contact_person: data.contact_person,
        contact_phone: data.contact_phone,
        contact_email: data.contact_email,
        address: data.address || '',
        status: data.is_active ? 'ACTIVE' : 'INACTIVE'
      });
      setShowAddModal(true);
    } catch (err: any) {
      notify('Failed to fetch vendor details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (modalMode === 'create') {
        await inventoryService.addVendor(formData);
        notify('New vendor successfully registered', 'success');
      } else if (editingId) {
        await inventoryService.updateVendor(editingId, formData);
        notify('Vendor details updated successfully', 'success');
      }
      setShowAddModal(false);
      fetchVendors();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Operation failed. Verify inputs.';
      notify(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) return;
    setIsSubmitting(true);
    try {
      await inventoryService.deleteVendor(showDeleteConfirm);
      notify('Vendor removed from system', 'success');
      setShowDeleteConfirm(null);
      fetchVendors();
    } catch (err: any) {
      notify('Failed to delete vendor', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Memoized Filtered List
  const filtered = useMemo(() => {
    return vendors.filter(v => 
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      v.vendor_uhid.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [vendors, searchTerm]);

  // Memoized Paginated Data
  const paginatedVendors = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Action Bar */}
      <div className="bg-white p-4 rounded-[32px] border border-slate-200 flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={22} />
          <input 
            type="text" 
            placeholder="Search by vendor name or UHID..."
            className="w-full pl-14 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-slate-900/5 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button 
            onClick={fetchVendors}
            className="p-4 bg-white border border-slate-200 text-slate-400 hover:text-brand-primary rounded-2xl transition-all"
          >
            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={handleOpenCreate}
            className="flex-1 md:flex-none bg-slate-900 text-white px-8 py-4 rounded-[20px] font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Add New Supplier
          </button>
        </div>
      </div>

      {/* Supplier Table Container */}
      <div className="bg-white border border-slate-200 rounded-[44px] overflow-hidden shadow-sm min-h-[400px]">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Approved Vendor Directory</h2>
            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Master Procurement Index</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 flex items-center gap-2">
            <ShieldCheck size={16} className="text-brand-primary" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Verified Registry</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <th className="px-8 py-6">Vendor Identity</th>
                <th className="px-8 py-6">Contact Point</th>
                <th className="px-8 py-6">Communication</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-8 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium">
              {loading && paginatedVendors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <Loader2 size={40} className="animate-spin mx-auto text-brand-primary mb-4" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Querying Vendor database...</p>
                  </td>
                </tr>
              ) : paginatedVendors.length > 0 ? (
                paginatedVendors.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm">
                          <Building2 size={22} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800">{v.name}</p>
                          <p className="text-[10px] font-mono font-black text-brand-primary uppercase tracking-tighter">{v.vendor_uhid}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-slate-300" />
                        <p className="text-sm text-slate-700 font-bold">{v.contact_person}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <p className="text-xs text-slate-500 flex items-center gap-1.5"><Mail size={12}/> {v.contact_email}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5"><Phone size={12}/> {v.contact_phone}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border
                        ${v.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-400 border-slate-200'}
                      `}>
                        {v.is_active ? <CheckCircle2 size={12}/> : <XCircle size={12}/>}
                        {v.is_active ? 'Active' : 'Inactive'}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right relative">
                      <button 
                        onClick={() => setActiveMenuId(activeMenuId === v.id ? null : v.id)}
                        className={`p-3 rounded-xl transition-all ${activeMenuId === v.id ? 'bg-slate-900 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-400 hover:text-slate-900 shadow-sm'}`}
                      >
                        <MoreVertical size={18} />
                      </button>
                      
                      {activeMenuId === v.id && (
                        <div className="absolute right-20 top-6 w-56 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[100] py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                          <button 
                            onClick={() => handleOpenEdit(v.id)}
                            className="w-full flex items-center gap-3 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <Edit2 size={16} className="text-brand-active0" /> Modify Vendor
                          </button>
                          <button className="w-full flex items-center gap-3 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                            <History size={16} className="text-slate-400" /> Supply History
                          </button>
                          <div className="h-px bg-slate-50 my-1 mx-3" />
                          <button 
                            onClick={() => {
                              setActiveMenuId(null);
                              setShowDeleteConfirm(v.id);
                            }}
                            className="w-full flex items-center gap-3 px-5 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={16} /> Delete Record
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-32 text-center">
                    <Search className="mx-auto text-slate-200 mb-4" size={48} />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No matching vendors found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filtered.length > 0 && (
          <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Showing <span className="text-slate-800 font-black">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-800 font-black">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of <span className="text-slate-800 font-black">{filtered.length}</span> Vendors
            </p>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-3 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-brand-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <ChevronLeft size={18} />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages > 5 ? 5 : totalPages }).map((_, i) => {
                  const pageNum = i + 1; 
                  return (
                    <button 
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 rounded-xl text-xs font-black transition-all border
                        ${currentPage === pageNum ? 'bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-active' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50 hover:text-slate-800'}
                      `}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-3 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-brand-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => !isSubmitting && setShowAddModal(false)} />
          <form 
            onSubmit={handleSubmit}
            className="relative bg-white w-full max-w-xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
          >
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg">
                  <Building2 size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">
                    {modalMode === 'create' ? 'Vendor Onboarding' : 'Modify Vendor'}
                  </h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Registry Governance</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)} 
                disabled={isSubmitting}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 disabled:opacity-30"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-10 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Legal Company Name *</label>
                <input 
                  required
                  type="text" 
                  placeholder="e.g. Emzor Pharmaceuticals" 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all outline-none"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Person</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Name / Title" 
                      className="w-full pl-11 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:bg-white transition-all"
                      value={formData.contact_person}
                      onChange={e => setFormData({...formData, contact_person: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Phone *</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      required
                      type="tel" 
                      placeholder="+234..." 
                      className="w-full pl-11 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:bg-white transition-all"
                      value={formData.contact_phone}
                      onChange={e => setFormData({...formData, contact_phone: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" size={18} />
                  <input 
                    type="email" 
                    placeholder="sales@company.com" 
                    className="w-full pl-11 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:bg-white transition-all"
                    value={formData.contact_email}
                    onChange={e => setFormData({...formData, contact_email: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vendor Status</label>
                <select 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none"
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value})}
                >
                  <option value="ACTIVE">Authorized / Active</option>
                  <option value="INACTIVE">Deactivated / Suspended</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Billing / Legal Address</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-5 text-slate-400" size={18} />
                  <textarea 
                    rows={3} 
                    placeholder="Physical location details..." 
                    className="w-full pl-11 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-bold outline-none focus:bg-white transition-all resize-none"
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)} 
                className="px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-slate-900 text-white px-10 py-4 rounded-[20px] font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-2"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : (modalMode === 'create' ? <Plus size={16} /> : <Save size={16} />)}
                {isSubmitting ? 'Processing...' : (modalMode === 'create' ? 'Register Vendor' : 'Commit Changes')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => !isSubmitting && setShowDeleteConfirm(null)} />
          <div className="relative bg-white w-full max-w-sm rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-10 text-center">
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-[32px] flex items-center justify-center mx-auto mb-6 border border-red-100 shadow-inner">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Confirm Deletion</h3>
              <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed px-4">
                Are you sure you want to remove this vendor? This action will permanently archive their registry record.
              </p>
            </div>
            <div className="px-8 py-8 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-3">
              <button 
                onClick={() => setShowDeleteConfirm(null)}
                disabled={isSubmitting}
                className="px-6 py-4 rounded-[24px] font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-slate-800 transition-all disabled:opacity-30"
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                disabled={isSubmitting}
                className="bg-red-600 text-white px-6 py-4 rounded-[24px] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-red-200 hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventorySuppliers;
