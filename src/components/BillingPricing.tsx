import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Filter,
  Edit2,
  Trash2,
  Loader2,
  DollarSign,
  Tag,
  Activity,
  CheckCircle2,
  X,
  Save,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Layers
} from "lucide-react";
import TariffComponentsModal from './TariffComponentsModal';
import { billingService } from "../services/billing.service";
import { userService } from "../services/user.service";
import { useNotification } from "../context/NotificationContext";

const CARE_LEVELS = ["OPD", "IPD", "ICU", "HDU"];
const CATEGORIES = [
  "consultation",
  "lab",
  "radiology",
  "pharmacy",
  "procedure",
  "surgery",
  "consumables",
  "bed_charge",
  "registration",
  "blood_bank",
  "implant",
  "nursing_charge",
  "professional_fee",
  "food",
  "other",
];

const BillingPricing: React.FC = () => {
  const { notify } = useNotification();
  
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [payers, setPayers] = useState<any[]>([]);
  const [specializations, setSpecializations] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search, Filters & Pagination States
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [careLevelFilter, setCareLevelFilter] = useState("ALL");
  const [payerFilter, setPayerFilter] = useState("ALL");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const itemsPerPage = 10;

  const [componentTariff, setComponentTariff] = useState<any | null>(null);
  const [labParameters, setLabParameters] = useState([{ name: "", unit: "", reference_range: "" }]);
  const [radiologySetup, setRadiologySetup] = useState({ modality: "X-RAY", template: "" });

  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [formData, setFormData] = useState({
    billable_name: "",
    category: "consultation",
    payer_type_id: "",
    payer_id: "", // Added to track specific payers like Leadway
    care_level: "OPD",
    unit_price: "",
    effective_from: "",
    effective_to: "",
    is_active: 1,
    specialization_code: "",
    doctor_id: "",
  });

  // 1. Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 2. Fetch Reference Data
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const [payersData, specializationsData, doctorsData] = await Promise.all([
          billingService.getPayers(),
          userService.getSpecializations(),
          userService.getDoctors(),
        ]);
        setPayers(payersData);
        setSpecializations(specializationsData);
        setDoctors(doctorsData);
      } catch (err) {
        notify("Failed to load reference data", "error");
      }
    };
    fetchReferenceData();
  }, []);

  // 3. Fetch Tariffs
  const fetchTariffs = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        limit: itemsPerPage
      };
      
      if (debouncedSearch) params.search = debouncedSearch;
      if (categoryFilter !== "ALL") params.category = categoryFilter;
      if (careLevelFilter !== "ALL") params.care_level = careLevelFilter;
      if (payerFilter !== "ALL") params.payer_id = payerFilter; // Filter by exact payer now

      const response = await billingService.searchTariffs(params);
      
      setTariffs(Array.isArray(response.data) ? response.data : []);
      setTotalRecords(response.total || 0);
    } catch (err) {
      notify("Failed to load pricing data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTariffs();
  }, [debouncedSearch, currentPage, categoryFilter, careLevelFilter, payerFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, careLevelFilter, payerFilter]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      billable_name: "",
      category: "consultation",
      payer_type_id: payers.length > 0 ? payers[0].payer_type_id : "",
      payer_id: payers.length > 0 ? payers[0].id : "",
      care_level: "OPD",
      unit_price: "",
      effective_from: new Date().toISOString().split("T")[0],
      effective_to: "",
      is_active: 1,
      specialization_code: "",
      doctor_id: "",
    });
    setShowModal(true);
  };

  const handleOpenEdit = async (id: number) => {
    try {
      const data = await billingService.getTariff(id);
      const tariff = Array.isArray(data) ? data[0] : data;
      if (!tariff) throw new Error("Tariff not found");

      setEditingId(id);
      setFormData({
        billable_name: tariff.billable_name,
        category: tariff.category || "other",
        payer_type_id: tariff.payer_type_id,
        payer_id: tariff.payer_id || "", // Ensure payer_id is populated
        care_level: tariff.care_level,
        unit_price: tariff.unit_price,
        effective_from: tariff.effective_from,
        effective_to: tariff.effective_to || "",
        is_active: tariff.is_active,
        specialization_code: tariff.specialization_code || "",
        doctor_id: tariff.doctor_id || "",
      });
      setShowModal(true);
    } catch (err) {
      notify("Failed to fetch tariff details", "error");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: any = {
        billable_name: formData.billable_name,
        category: formData.category,
        payer_type_id: parseInt(String(formData.payer_type_id)),
        payer_id: formData.payer_id ? parseInt(String(formData.payer_id)) : null, // Add to payload
        care_level: formData.care_level,
        unit_price: parseFloat(String(formData.unit_price)),
        effective_from: formData.effective_from,
        effective_to: formData.effective_to || null,
        is_active: formData.is_active,
      };

      if (formData.category === "consultation") {
        if (formData.specialization_code) payload.specialization_code = formData.specialization_code;
        if (formData.doctor_id) payload.doctor_id = parseInt(String(formData.doctor_id));
      }

      if (editingId) {
        await billingService.updateTariff(editingId, payload);
        notify("Service pricing updated successfully", "success");
      } else {
        await billingService.createTariff(payload);
        notify("New service tariff created", "success");
      }
      setShowModal(false);
      fetchTariffs();
    } catch (err: any) {
      notify(err.response?.data?.message || "Operation failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to remove this pricing rule? This may affect billing.")) return;
    try {
      await billingService.deleteTariff(id);
      notify("Tariff removed successfully", "success");
      fetchTariffs();
    } catch (err) {
      notify("Failed to delete tariff", "error");
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await billingService.exportTariffs();
      notify("Tariffs exported successfully", "success");
    } catch (err) {
      notify("Failed to export tariffs", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalRecords / itemsPerPage));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign size={24} />
            </div>
            Services & Pricing Master
          </h1>
          <p className="text-slate-500 font-medium">
            Configure global billable items and insurance tariffs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-white text-emerald-600 border border-emerald-200 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-emerald-50 transition-all active:scale-95 disabled:opacity-50"
          >
            {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Export Excel
          </button>
          <button
            onClick={handleOpenCreate}
            className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95"
          >
            <Plus size={18} /> Add New Service
          </button>
        </div>
      </div>

      {/* Dynamic Filters UI */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-1 w-full">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search service name or code..."
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
        >
          <option value="ALL">All Categories</option>
          {CATEGORIES.map(c => <option value={c} key={c}>{c.toUpperCase()}</option>)}
        </select>

        <select
          value={careLevelFilter}
          onChange={(e) => setCareLevelFilter(e.target.value)}
          className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
        >
          <option value="ALL">All Care Levels</option>
          {CARE_LEVELS.map(c => <option value={c} key={c}>{c}</option>)}
        </select>

        <select
          value={payerFilter}
          onChange={(e) => setPayerFilter(e.target.value)}
          className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500/20 md:max-w-[200px] cursor-pointer truncate"
        >
          <option value="ALL">All Specific Payers</option>
          {payers.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-sm min-h-[400px] flex flex-col">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 flex-1">
            <Loader2 size={40} className="text-emerald-600 animate-spin mb-4" />
            <p className="text-slate-400 font-bold uppercase tracking-widest">
              Loading Price List...
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-8 py-5">Service Details</th>
                    <th className="px-8 py-5">Payer / Plan</th>
                    <th className="px-8 py-5">Category</th>
                    <th className="px-8 py-5 text-right">Unit Price</th>
                    <th className="px-8 py-5 text-center">Status</th>
                    <th className="px-8 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {tariffs.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-8 py-5">
                        <p className="text-sm font-black text-slate-800">
                          {t.billable_name}
                        </p>
                        <span className="text-[10px] font-mono font-bold text-brand-primary bg-brand-active px-2 py-0.5 rounded border border-brand-active uppercase tracking-tight">
                          {t.billable_code || "NO-CODE"}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col gap-1.5">
                          {/* Elegantly shows Leadway, or falls back to General */}
                          <span className="text-sm font-black text-slate-800">
                            {t.payer_name || "Standard / General"}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase tracking-widest">
                              {t.payer_type_code || t.payer_type_name || "HMO"}
                            </span>
                            <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">
                              {t.care_level}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-[10px] font-black uppercase text-slate-500 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                          {t.category}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <p className="text-sm font-black text-emerald-600">
                          ₦{parseFloat(t.unit_price).toLocaleString()}
                        </p>
                      </td>
                      <td className="px-8 py-5 text-center">
                        {t.is_active ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 uppercase tracking-wider">
                            <Activity size={10} /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-full border border-slate-200 uppercase tracking-wider">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          
                          {['surgery', 'procedure', 'package'].includes(t.category?.toLowerCase()) && (
                            <button
                              onClick={() => setComponentTariff(t)}
                              title="Manage Components"
                              className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            >
                              <Layers size={16} />
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenEdit(t.id)}
                            title="Edit Tariff"
                            className="p-2 text-slate-300 hover:text-brand-primary hover:bg-brand-active rounded-xl transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            title="Delete Tariff"
                            className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {tariffs.length === 0 && (
                <div className="py-20 text-center opacity-40">
                  <Tag size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                    No Services Found
                  </p>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">
                  Showing {(currentPage - 1) * itemsPerPage + (tariffs.length > 0 ? 1 : 0)} to{" "}
                  {Math.min(currentPage * itemsPerPage, totalRecords)} of {totalRecords} entries
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-brand-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-black text-slate-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-brand-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setShowModal(false)}
          />
          <form
            onSubmit={handleSubmit}
            className="relative bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
          >
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-lg">
                  <DollarSign size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800 tracking-tight">
                    {editingId ? "Modify Tariff" : "New Service Item"}
                  </h2>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">
                    Pricing Configuration
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Billable Name
                </label>
                <input
                  required
                  type="text"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                  placeholder="e.g. General Consultation"
                  value={formData.billable_name}
                  onChange={(e) =>
                    setFormData({ ...formData, billable_name: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Category
                  </label>
                  <select
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none appearance-none cursor-pointer"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Care Level
                  </label>
                  <select
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none appearance-none cursor-pointer"
                    value={formData.care_level}
                    onChange={(e) =>
                      setFormData({ ...formData, care_level: e.target.value })
                    }
                  >
                    {CARE_LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Clinical Configuration Section */}
              {formData.category === "lab" && (
                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-4">
                  <h3 className="text-xs font-black text-blue-800 uppercase tracking-widest">Lab Test Parameters</h3>
                  <p className="text-[10px] text-blue-600 mb-2">These parameters will auto-populate when a doctor orders this test.</p>

                  {labParameters.map((param, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input 
                        placeholder="Parameter (e.g., Hemoglobin)" 
                        className="flex-1 px-3 py-2 text-sm border rounded-xl"
                        value={param.name}
                        onChange={(e) => {
                          const newParams = [...labParameters];
                          newParams[index].name = e.target.value;
                          setLabParameters(newParams);
                        }}
                      />
                      <input 
                        placeholder="Unit (e.g., g/dL)" 
                        className="w-24 px-3 py-2 text-sm border rounded-xl"
                        value={param.unit}
                        onChange={(e) => { /* update unit */ }}
                      />
                      <input 
                        placeholder="Normal Range (e.g., 12-16)" 
                        className="w-32 px-3 py-2 text-sm border rounded-xl"
                        value={param.reference_range}
                        onChange={(e) => { /* update range */ }}
                      />
                    </div>
                  ))}
                  <button type="button" onClick={() => setLabParameters([...labParameters, { name: "", unit: "", reference_range: "" }])} className="text-xs font-bold text-blue-600">+ Add Parameter</button>
                </div>
              )}

              {formData.category === "radiology" && (
                <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-4">
                  <h3 className="text-xs font-black text-purple-800 uppercase tracking-widest">Radiology Template</h3>
                  <select className="w-full px-3 py-2 text-sm border rounded-xl mb-2" value={radiologySetup.modality} onChange={e => setRadiologySetup({...radiologySetup, modality: e.target.value})}>
                    <option value="X-RAY">X-Ray</option>
                    <option value="MRI">MRI</option>
                    <option value="CT">CT Scan</option>
                    <option value="USG">Ultrasound</option>
                  </select>
                  <textarea 
                    placeholder="Default Report Template structure..." 
                    className="w-full px-3 py-2 text-sm border rounded-xl h-24"
                    value={radiologySetup.template}
                    onChange={e => setRadiologySetup({...radiologySetup, template: e.target.value})}
                  />
                </div>
              )}

              {formData.category === "consultation" && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-brand-active/50 rounded-2xl border border-brand-active">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Specialization (Optional)
                    </label>
                    <select
                      className="w-full px-5 py-4 bg-white border border-brand-active rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand-active0/10 outline-none appearance-none cursor-pointer"
                      value={formData.specialization_code}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          specialization_code: e.target.value,
                        })
                      }
                    >
                      <option value="">No Specialization</option>
                      {specializations.map((s) => (
                        <option key={s.id} value={s.code}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Doctor (Optional)
                    </label>
                    <select
                      className="w-full px-5 py-4 bg-white border border-brand-active rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand-active0/10 outline-none appearance-none cursor-pointer"
                      value={formData.doctor_id}
                      onChange={(e) =>
                        setFormData({ ...formData, doctor_id: e.target.value })
                      }
                    >
                      <option value="">No Doctor</option>
                      {doctors.map((d) => (
                        <option key={d.doctor_id} value={d.doctor_id}>
                          {d.first_name} {d.last_name} ({d.specialization_code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Payer / Insurance
                  </label>
                  <select
                    required
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none appearance-none cursor-pointer"
                    value={formData.payer_id}
                    onChange={(e) => {
                      const selectedId = e.target.value ? parseInt(e.target.value) : "";
                      const selectedPayer = payers.find(p => p.id === selectedId);
                      setFormData({
                        ...formData,
                        payer_id: String(selectedId),
                        payer_type_id: selectedPayer ? String(selectedPayer.payer_type_id) : formData.payer_type_id,
                      });
                    }}
                  >
                    <option value="">Select Specific Payer...</option>
                    {payers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Unit Price (₦)
                  </label>
                  <input
                    required
                    type="number"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none"
                    value={formData.unit_price}
                    onChange={(e) =>
                      setFormData({ ...formData, unit_price: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                    <Calendar size={12} /> Effective From
                  </label>
                  <input
                    required
                    type="date"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none"
                    value={formData.effective_from}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        effective_from: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                    <Calendar size={12} /> Valid To (Optional)
                  </label>
                  <input
                    type="date"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none"
                    value={formData.effective_to}
                    onChange={(e) =>
                      setFormData({ ...formData, effective_to: e.target.value })
                    }
                  />
                </div>
              </div>

              <div
                className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer"
                onClick={() =>
                  setFormData({
                    ...formData,
                    is_active: formData.is_active ? 0 : 1,
                  })
                }
              >
                <div
                  className={`w-10 h-6 rounded-full p-1 transition-all ${formData.is_active ? "bg-emerald-500" : "bg-slate-300"}`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full shadow-sm transition-all ${formData.is_active ? "translate-x-4" : "translate-x-0"}`}
                  />
                </div>
                <span className="text-xs font-bold text-slate-600">
                  Service is Active & Billable
                </span>
              </div>
            </div>

            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={isSubmitting}
                className="px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-emerald-600 text-white px-10 py-3 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Save Tariff
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Components Manager Modal */}
      {componentTariff && (
        <TariffComponentsModal 
          tariff={componentTariff} 
          onClose={() => setComponentTariff(null)} 
        />
      )}
    </div>
  );
};

export default BillingPricing;


// import React, { useState, useEffect } from "react";
// import {
//   Search,
//   Plus,
//   Filter,
//   Edit2,
//   Trash2,
//   Loader2,
//   DollarSign,
//   Tag,
//   Activity,
//   CheckCircle2,
//   X,
//   Save,
//   Calendar,
//   ChevronLeft,
//   ChevronRight,
//   Download,
//   Layers
// } from "lucide-react";
// import TariffComponentsModal from './TariffComponentsModal';
// import { billingService } from "../services/billing.service";
// import { userService } from "../services/user.service";
// import { useNotification } from "../context/NotificationContext";

// const CARE_LEVELS = ["OPD", "IPD", "ICU", "HDU"];
// const CATEGORIES = [
//   "consultation",
//   "lab",
//   "radiology",
//   "pharmacy",
//   "procedure",
//   "surgery",
//   "consumables",
//   "bed_charge",
//   "registration",
//   "blood_bank",
//   "implant",
//   "nursing_charge",
//   "professional_fee",
//   "food",
//   "other",
// ];

// const BillingPricing: React.FC = () => {
//   const { notify } = useNotification();
  
//   const [tariffs, setTariffs] = useState<any[]>([]);
//   const [payers, setPayers] = useState<any[]>([]);
//   const [specializations, setSpecializations] = useState<any[]>([]);
//   const [doctors, setDoctors] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);

//   // Search, Filters & Pagination States
//   const [searchTerm, setSearchTerm] = useState("");
//   const [debouncedSearch, setDebouncedSearch] = useState("");
//   const [categoryFilter, setCategoryFilter] = useState("ALL");
//   const [careLevelFilter, setCareLevelFilter] = useState("ALL");
//   const [payerFilter, setPayerFilter] = useState("ALL");

//   const [currentPage, setCurrentPage] = useState(1);
//   const [totalRecords, setTotalRecords] = useState(0);
//   const itemsPerPage = 10;

//   const [componentTariff, setComponentTariff] = useState<any | null>(null);
//   const [labParameters, setLabParameters] = useState([{ name: "", unit: "", reference_range: "" }]);
//   const [radiologySetup, setRadiologySetup] = useState({ modality: "X-RAY", template: "" });

//   const [showModal, setShowModal] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [editingId, setEditingId] = useState<number | null>(null);
//   const [isExporting, setIsExporting] = useState(false);

//   const [formData, setFormData] = useState({
//     billable_name: "",
//     category: "consultation",
//     payer_type_id: "",
//     care_level: "OPD",
//     unit_price: "",
//     effective_from: "",
//     effective_to: "",
//     is_active: 1,
//     specialization_code: "",
//     doctor_id: "",
//   });

//   // 1. Debounce Search (Waits 500ms after user stops typing)
//   useEffect(() => {
//     const timer = setTimeout(() => {
//       setDebouncedSearch(searchTerm);
//       setCurrentPage(1); // Reset to page 1 when search changes
//     }, 500);
//     return () => clearTimeout(timer);
//   }, [searchTerm]);

//   // 2. Fetch Reference Data ONLY ONCE on mount
//   useEffect(() => {
//     const fetchReferenceData = async () => {
//       try {
//         const [payersData, specializationsData, doctorsData] = await Promise.all([
//           billingService.getPayers(),
//           userService.getSpecializations(),
//           userService.getDoctors(),
//         ]);
//         setPayers(payersData);
//         setSpecializations(specializationsData);
//         setDoctors(doctorsData);
//       } catch (err) {
//         notify("Failed to load reference data", "error");
//       }
//     };
//     fetchReferenceData();
//   }, []);

//   // 3. Fetch Tariffs whenever Page, Search, or any Filter changes
//   const fetchTariffs = async () => {
//     setLoading(true);
//     try {
//       const params: any = {
//         page: currentPage,
//         limit: itemsPerPage
//       };
      
//       // Only append filters if they are actively being used
//       if (debouncedSearch) params.search = debouncedSearch;
//       if (categoryFilter !== "ALL") params.category = categoryFilter;
//       if (careLevelFilter !== "ALL") params.care_level = careLevelFilter;
//       if (payerFilter !== "ALL") params.payer_type_id = payerFilter;

//       const response = await billingService.searchTariffs(params);
      
//       setTariffs(Array.isArray(response.data) ? response.data : []);
//       setTotalRecords(response.total || 0);
//     } catch (err) {
//       notify("Failed to load pricing data", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchTariffs();
//   }, [debouncedSearch, currentPage, categoryFilter, careLevelFilter, payerFilter]);

//   // Reset page to 1 when a dropdown filter is changed
//   useEffect(() => {
//     setCurrentPage(1);
//   }, [categoryFilter, careLevelFilter, payerFilter]);

//   const handleOpenCreate = () => {
//     setEditingId(null);
//     setFormData({
//       billable_name: "",
//       category: "consultation",
//       payer_type_id: payers.length > 0 ? payers[0].id : "",
//       care_level: "OPD",
//       unit_price: "",
//       effective_from: new Date().toISOString().split("T")[0],
//       effective_to: "",
//       is_active: 1,
//       specialization_code: "",
//       doctor_id: "",
//     });
//     setShowModal(true);
//   };

//   const handleOpenEdit = async (id: number) => {
//     try {
//       const data = await billingService.getTariff(id);
//       const tariff = Array.isArray(data) ? data[0] : data;
//       if (!tariff) throw new Error("Tariff not found");

//       setEditingId(id);
//       setFormData({
//         billable_name: tariff.billable_name,
//         category: tariff.category || "other",
//         payer_type_id: tariff.payer_type_id,
//         care_level: tariff.care_level,
//         unit_price: tariff.unit_price,
//         effective_from: tariff.effective_from,
//         effective_to: tariff.effective_to || "",
//         is_active: tariff.is_active,
//         specialization_code: tariff.specialization_code || "",
//         doctor_id: tariff.doctor_id || "",
//       });
//       setShowModal(true);
//     } catch (err) {
//       notify("Failed to fetch tariff details", "error");
//     }
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setIsSubmitting(true);
//     try {
//       const payload: any = {
//         billable_name: formData.billable_name,
//         category: formData.category,
//         payer_type_id: parseInt(String(formData.payer_type_id)),
//         care_level: formData.care_level,
//         unit_price: parseFloat(String(formData.unit_price)),
//         effective_from: formData.effective_from,
//         effective_to: formData.effective_to || null,
//         is_active: formData.is_active,
//       };

//       if (formData.category === "consultation") {
//         if (formData.specialization_code) payload.specialization_code = formData.specialization_code;
//         if (formData.doctor_id) payload.doctor_id = parseInt(String(formData.doctor_id));
//       }

//       if (editingId) {
//         await billingService.updateTariff(editingId, payload);
//         notify("Service pricing updated successfully", "success");
//       } else {
//         await billingService.createTariff(payload);
//         notify("New service tariff created", "success");
//       }
//       setShowModal(false);
//       fetchTariffs(); // Refetch after saving
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Operation failed", "error");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const handleDelete = async (id: number) => {
//     if (!confirm("Are you sure you want to remove this pricing rule? This may affect billing.")) return;
//     try {
//       await billingService.deleteTariff(id);
//       notify("Tariff removed successfully", "success");
//       fetchTariffs(); // Refetch after deleting
//     } catch (err) {
//       notify("Failed to delete tariff", "error");
//     }
//   };

//   const getPayerName = (id: number) => {
//     const payer = payers.find((p) => p.id === id);
//     return payer ? payer.name : "Unknown";
//   };

//   const handleExport = async () => {
//     setIsExporting(true);
//     try {
//       await billingService.exportTariffs();
//       notify("Tariffs exported successfully", "success");
//     } catch (err) {
//       notify("Failed to export tariffs", "error");
//     } finally {
//       setIsExporting(false);
//     }
//   };

//   // Safe Math for total pages
//   const totalPages = Math.max(1, Math.ceil(totalRecords / itemsPerPage));

//   return (
//     <div className="space-y-6 animate-in fade-in duration-500">
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//         <div>
//           <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
//             <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
//               <DollarSign size={24} />
//             </div>
//             Services & Pricing Master
//           </h1>
//           <p className="text-slate-500 font-medium">
//             Configure global billable items and insurance tariffs.
//           </p>
//         </div>
//         <div className="flex items-center gap-3">
//           <button
//             onClick={handleExport}
//             disabled={isExporting}
//             className="bg-white text-emerald-600 border border-emerald-200 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-emerald-50 transition-all active:scale-95 disabled:opacity-50"
//           >
//             {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
//             Export Excel
//           </button>
//           <button
//             onClick={handleOpenCreate}
//             className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95"
//           >
//             <Plus size={18} /> Add New Service
//           </button>
//         </div>
//       </div>

//       {/* Dynamic Filters UI */}
//       <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center shadow-sm">
//         <div className="relative flex-1 w-full">
//           <Search
//             className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
//             size={18}
//           />
//           <input
//             type="text"
//             placeholder="Search service name or code..."
//             className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//           />
//         </div>
        
//         <select
//           value={categoryFilter}
//           onChange={(e) => setCategoryFilter(e.target.value)}
//           className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
//         >
//           <option value="ALL">All Categories</option>
//           {CATEGORIES.map(c => <option value={c} key={c}>{c.toUpperCase()}</option>)}
//         </select>

//         <select
//           value={careLevelFilter}
//           onChange={(e) => setCareLevelFilter(e.target.value)}
//           className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
//         >
//           <option value="ALL">All Care Levels</option>
//           {CARE_LEVELS.map(c => <option value={c} key={c}>{c}</option>)}
//         </select>

//         <select
//           value={payerFilter}
//           onChange={(e) => setPayerFilter(e.target.value)}
//           className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500/20 md:max-w-[200px] cursor-pointer truncate"
//         >
//           <option value="ALL">All Payers</option>
//           {payers.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}
//         </select>
//       </div>

//       {/* Table */}
//       <div className="bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-sm min-h-[400px] flex flex-col">
//         {loading ? (
//           <div className="flex flex-col items-center justify-center py-20 flex-1">
//             <Loader2 size={40} className="text-emerald-600 animate-spin mb-4" />
//             <p className="text-slate-400 font-bold uppercase tracking-widest">
//               Loading Price List...
//             </p>
//           </div>
//         ) : (
//           <>
//             <div className="overflow-x-auto flex-1">
//               <table className="w-full text-left">
//                 <thead>
//                   <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
//                     <th className="px-8 py-5">Service Details</th>
//                     <th className="px-8 py-5">Payer / Plan</th>
//                     <th className="px-8 py-5">Category</th>
//                     <th className="px-8 py-5 text-right">Unit Price</th>
//                     <th className="px-8 py-5 text-center">Status</th>
//                     <th className="px-8 py-5 text-right">Actions</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-50">
//                   {tariffs.map((t) => (
//                     <tr
//                       key={t.id}
//                       className="hover:bg-slate-50/50 transition-colors group"
//                     >
//                       <td className="px-8 py-5">
//                         <p className="text-sm font-black text-slate-800">
//                           {t.billable_name}
//                         </p>
//                         <span className="text-[10px] font-mono font-bold text-brand-primary bg-brand-active px-2 py-0.5 rounded border border-brand-active uppercase tracking-tight">
//                           {t.billable_code || "NO-CODE"}
//                         </span>
//                       </td>
//                       <td className="px-8 py-5">
//                         <div className="flex flex-col">
//                           <span className="text-xs font-bold text-slate-700">
//                             {/* Use the name from the API directly, fallback to the lookup, then fallback to Unknown */}
//                             {t.payer_type_name || getPayerName(t.payer_type_id)}
//                           </span>
//                           <span className="text-[10px] text-slate-400 uppercase tracking-wider">
//                             {t.care_level}
//                           </span>
//                         </div>
//                       </td>
//                       {/* <td className="px-8 py-5">
//                         <div className="flex flex-col">
//                           <span className="text-xs font-bold text-slate-700">
//                             {getPayerName(t.payer_type_id)}
//                           </span>
//                           <span className="text-[10px] text-slate-400 uppercase tracking-wider">
//                             {t.care_level}
//                           </span>
//                         </div>
//                       </td> */}
//                       <td className="px-8 py-5">
//                         <span className="text-[10px] font-black uppercase text-slate-500 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
//                           {t.category}
//                         </span>
//                       </td>
//                       <td className="px-8 py-5 text-right">
//                         <p className="text-sm font-black text-emerald-600">
//                           ₦{parseFloat(t.unit_price).toLocaleString()}
//                         </p>
//                       </td>
//                       <td className="px-8 py-5 text-center">
//                         {t.is_active ? (
//                           <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 uppercase tracking-wider">
//                             <Activity size={10} /> Active
//                           </span>
//                         ) : (
//                           <span className="inline-flex items-center gap-1 text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-full border border-slate-200 uppercase tracking-wider">
//                             Inactive
//                           </span>
//                         )}
//                       </td>
//                       <td className="px-8 py-5 text-right">
//                         <div className="flex items-center justify-end gap-2">
                          
//                           {/* Show Component button for categories that typically need breakdowns */}
//                           {['surgery', 'procedure', 'package'].includes(t.category?.toLowerCase()) && (
//                             <button
//                               onClick={() => setComponentTariff(t)}
//                               title="Manage Components"
//                               className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
//                             >
//                               <Layers size={16} />
//                             </button>
//                           )}

//                           <button
//                             onClick={() => handleOpenEdit(t.id)}
//                             title="Edit Tariff"
//                             className="p-2 text-slate-300 hover:text-brand-primary hover:bg-brand-active rounded-xl transition-all"
//                           >
//                             <Edit2 size={16} />
//                           </button>
//                           <button
//                             onClick={() => handleDelete(t.id)}
//                             title="Delete Tariff"
//                             className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
//                           >
//                             <Trash2 size={16} />
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//               {tariffs.length === 0 && (
//                 <div className="py-20 text-center opacity-40">
//                   <Tag size={48} className="mx-auto text-slate-300 mb-4" />
//                   <p className="text-xs font-black uppercase tracking-widest text-slate-400">
//                     No Services Found
//                   </p>
//                 </div>
//               )}
//             </div>

//             {/* Pagination Controls */}
//             {totalPages > 1 && (
//               <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
//                 <span className="text-xs font-bold text-slate-500">
//                   Showing {(currentPage - 1) * itemsPerPage + (tariffs.length > 0 ? 1 : 0)} to{" "}
//                   {Math.min(currentPage * itemsPerPage, totalRecords)} of {totalRecords} entries
//                 </span>
//                 <div className="flex items-center gap-2">
//                   <button
//                     onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
//                     disabled={currentPage === 1}
//                     className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-brand-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
//                   >
//                     <ChevronLeft size={16} />
//                   </button>
//                   <span className="text-xs font-black text-slate-700">
//                     Page {currentPage} of {totalPages}
//                   </span>
//                   <button
//                     onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
//                     disabled={currentPage === totalPages}
//                     className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-brand-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
//                   >
//                     <ChevronRight size={16} />
//                   </button>
//                 </div>
//               </div>
//             )}
//           </>
//         )}
//       </div>

//       {/* Create/Edit Modal */}
//       {showModal && (
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
//           <div
//             className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
//             onClick={() => setShowModal(false)}
//           />
//           <form
//             onSubmit={handleSubmit}
//             className="relative bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
//           >
//             <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
//               <div className="flex items-center gap-3">
//                 <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-lg">
//                   <DollarSign size={20} />
//                 </div>
//                 <div>
//                   <h2 className="text-lg font-black text-slate-800 tracking-tight">
//                     {editingId ? "Modify Tariff" : "New Service Item"}
//                   </h2>
//                   <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">
//                     Pricing Configuration
//                   </p>
//                 </div>
//               </div>
//               <button
//                 type="button"
//                 onClick={() => setShowModal(false)}
//                 className="p-2 hover:bg-slate-200 rounded-full transition-colors"
//               >
//                 <X size={20} />
//               </button>
//             </div>

//             <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
//               <div className="space-y-2">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                   Billable Name
//                 </label>
//                 <input
//                   required
//                   type="text"
//                   className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
//                   placeholder="e.g. General Consultation"
//                   value={formData.billable_name}
//                   onChange={(e) =>
//                     setFormData({ ...formData, billable_name: e.target.value })
//                   }
//                 />
//               </div>

//               <div className="grid grid-cols-2 gap-4">
//                 <div className="space-y-2">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                     Category
//                   </label>
//                   <select
//                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none appearance-none"
//                     value={formData.category}
//                     onChange={(e) =>
//                       setFormData({ ...formData, category: e.target.value })
//                     }
//                   >
//                     {CATEGORIES.map((c) => (
//                       <option key={c} value={c}>
//                         {c.toUpperCase()}
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//                 <div className="space-y-2">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                     Care Level
//                   </label>
//                   <select
//                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none appearance-none"
//                     value={formData.care_level}
//                     onChange={(e) =>
//                       setFormData({ ...formData, care_level: e.target.value })
//                     }
//                   >
//                     {CARE_LEVELS.map((l) => (
//                       <option key={l} value={l}>
//                         {l}
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//               </div>

//               {/* Dynamic Clinical Configuration Section */}
//               {formData.category === "lab" && (
//                 <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-4">
//                   <h3 className="text-xs font-black text-blue-800 uppercase tracking-widest">Lab Test Parameters</h3>
//                   <p className="text-[10px] text-blue-600 mb-2">These parameters will auto-populate when a doctor orders this test.</p>

//                   {labParameters.map((param, index) => (
//                     <div key={index} className="flex gap-2 items-center">
//                       <input 
//                         placeholder="Parameter (e.g., Hemoglobin)" 
//                         className="flex-1 px-3 py-2 text-sm border rounded-xl"
//                         value={param.name}
//                         onChange={(e) => {
//                           const newParams = [...labParameters];
//                           newParams[index].name = e.target.value;
//                           setLabParameters(newParams);
//                         }}
//                       />
//                       <input 
//                         placeholder="Unit (e.g., g/dL)" 
//                         className="w-24 px-3 py-2 text-sm border rounded-xl"
//                         value={param.unit}
//                         onChange={(e) => { /* update unit */ }}
//                       />
//                       <input 
//                         placeholder="Normal Range (e.g., 12-16)" 
//                         className="w-32 px-3 py-2 text-sm border rounded-xl"
//                         value={param.reference_range}
//                         onChange={(e) => { /* update range */ }}
//                       />
//                     </div>
//                   ))}
//                   <button type="button" onClick={() => setLabParameters([...labParameters, { name: "", unit: "", reference_range: "" }])} className="text-xs font-bold text-blue-600">+ Add Parameter</button>
//                 </div>
//               )}

//               {formData.category === "radiology" && (
//                 <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-4">
//                   <h3 className="text-xs font-black text-purple-800 uppercase tracking-widest">Radiology Template</h3>
//                   <select className="w-full px-3 py-2 text-sm border rounded-xl mb-2" value={radiologySetup.modality} onChange={e => setRadiologySetup({...radiologySetup, modality: e.target.value})}>
//                     <option value="X-RAY">X-Ray</option>
//                     <option value="MRI">MRI</option>
//                     <option value="CT">CT Scan</option>
//                     <option value="USG">Ultrasound</option>
//                   </select>
//                   <textarea 
//                     placeholder="Default Report Template structure..." 
//                     className="w-full px-3 py-2 text-sm border rounded-xl h-24"
//                     value={radiologySetup.template}
//                     onChange={e => setRadiologySetup({...radiologySetup, template: e.target.value})}
//                   />
//                 </div>
//               )}

//               {formData.category === "consultation" && (
//                 <div className="grid grid-cols-2 gap-4 p-4 bg-brand-active/50 rounded-2xl border border-brand-active">
//                   <div className="space-y-2">
//                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                       Specialization (Optional)
//                     </label>
//                     <select
//                       className="w-full px-5 py-4 bg-white border border-brand-active rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand-active0/10 outline-none appearance-none"
//                       value={formData.specialization_code}
//                       onChange={(e) =>
//                         setFormData({
//                           ...formData,
//                           specialization_code: e.target.value,
//                         })
//                       }
//                     >
//                       <option value="">No Specialization</option>
//                       {specializations.map((s) => (
//                         <option key={s.id} value={s.code}>
//                           {s.name} ({s.code})
//                         </option>
//                       ))}
//                     </select>
//                   </div>
//                   <div className="space-y-2">
//                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                       Doctor (Optional)
//                     </label>
//                     <select
//                       className="w-full px-5 py-4 bg-white border border-brand-active rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand-active0/10 outline-none appearance-none"
//                       value={formData.doctor_id}
//                       onChange={(e) =>
//                         setFormData({ ...formData, doctor_id: e.target.value })
//                       }
//                     >
//                       <option value="">No Doctor</option>
//                       {doctors.map((d) => (
//                         <option key={d.doctor_id} value={d.doctor_id}>
//                           {d.first_name} {d.last_name} ({d.specialization_code})
//                         </option>
//                       ))}
//                     </select>
//                   </div>
//                 </div>
//               )}

//               <div className="grid grid-cols-2 gap-4">
//                 <div className="space-y-2">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                     Payer Type
//                   </label>
//                   <select
//                     required
//                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none appearance-none"
//                     value={formData.payer_type_id}
//                     onChange={(e) =>
//                       setFormData({
//                         ...formData,
//                         payer_type_id: e.target.value,
//                       })
//                     }
//                   >
//                     <option value="">Select Payer...</option>
//                     {payers.map((p) => (
//                       <option key={p.id} value={p.id}>
//                         {p.name}
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//                 <div className="space-y-2">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                     Unit Price (₦)
//                   </label>
//                   <input
//                     required
//                     type="number"
//                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none"
//                     value={formData.unit_price}
//                     onChange={(e) =>
//                       setFormData({ ...formData, unit_price: e.target.value })
//                     }
//                   />
//                 </div>
//               </div>

//               <div className="grid grid-cols-2 gap-4">
//                 <div className="space-y-2">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
//                     <Calendar size={12} /> Effective From
//                   </label>
//                   <input
//                     required
//                     type="date"
//                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none"
//                     value={formData.effective_from}
//                     onChange={(e) =>
//                       setFormData({
//                         ...formData,
//                         effective_from: e.target.value,
//                       })
//                     }
//                   />
//                 </div>
//                 <div className="space-y-2">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
//                     <Calendar size={12} /> Valid To (Optional)
//                   </label>
//                   <input
//                     type="date"
//                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none"
//                     value={formData.effective_to}
//                     onChange={(e) =>
//                       setFormData({ ...formData, effective_to: e.target.value })
//                     }
//                   />
//                 </div>
//               </div>

//               <div
//                 className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer"
//                 onClick={() =>
//                   setFormData({
//                     ...formData,
//                     is_active: formData.is_active ? 0 : 1,
//                   })
//                 }
//               >
//                 <div
//                   className={`w-10 h-6 rounded-full p-1 transition-all ${formData.is_active ? "bg-emerald-500" : "bg-slate-300"}`}
//                 >
//                   <div
//                     className={`w-4 h-4 bg-white rounded-full shadow-sm transition-all ${formData.is_active ? "translate-x-4" : "translate-x-0"}`}
//                   />
//                 </div>
//                 <span className="text-xs font-bold text-slate-600">
//                   Service is Active & Billable
//                 </span>
//               </div>
//             </div>

//             <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
//               <button
//                 type="button"
//                 onClick={() => setShowModal(false)}
//                 disabled={isSubmitting}
//                 className="px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-800"
//               >
//                 Cancel
//               </button>
//               <button
//                 type="submit"
//                 disabled={isSubmitting}
//                 className="bg-emerald-600 text-white px-10 py-3 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-2"
//               >
//                 {isSubmitting ? (
//                   <Loader2 size={16} className="animate-spin" />
//                 ) : (
//                   <Save size={16} />
//                 )}
//                 Save Tariff
//               </button>
//             </div>
//           </form>
//         </div>
//       )}

//       {/* Components Manager Modal */}
//       {componentTariff && (
//         <TariffComponentsModal 
//           tariff={componentTariff} 
//           onClose={() => setComponentTariff(null)} 
//         />
//       )}
//     </div>
//   );
// };

// export default BillingPricing;



// import React, { useState, useEffect } from "react";
// import {
//   Search,
//   Plus,
//   Filter,
//   Edit2,
//   Trash2,
//   Loader2,
//   DollarSign,
//   Tag,
//   Activity,
//   CheckCircle2,
//   X,
//   Save,
//   Calendar,
//   ChevronLeft,
//   ChevronRight,
//   Download,
//   Layers
// } from "lucide-react";
// import TariffComponentsModal from './TariffComponentsModal';
// import { billingService } from "../services/billing.service";
// import { userService } from "../services/user.service";
// import { useNotification } from "../context/NotificationContext";

// const CARE_LEVELS = ["OPD", "IPD", "ICU", "HDU"];
// const CATEGORIES = [
//   "consultation",
//   "lab",
//   "radiology",
//   "pharmacy",
//   "procedure",
//   "surgery",
//   "consumables",
//   "bed_charge",
//   "registration",
//   "blood_bank",
//   "implant",
//   "nursing_charge",
//   "food",
//   "other",
// ];

// const BillingPricing: React.FC = () => {
//   const { notify } = useNotification();
  
//   const [tariffs, setTariffs] = useState<any[]>([]);
//   const [payers, setPayers] = useState<any[]>([]);
//   const [specializations, setSpecializations] = useState<any[]>([]);
//   const [doctors, setDoctors] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);

//   // Search & Pagination States
//   const [searchTerm, setSearchTerm] = useState("");
//   const [debouncedSearch, setDebouncedSearch] = useState("");
//   const [currentPage, setCurrentPage] = useState(1);
//   const [totalRecords, setTotalRecords] = useState(0);
//   const itemsPerPage = 10;

//   const [componentTariff, setComponentTariff] = useState<any | null>(null);
//   const [labParameters, setLabParameters] = useState([{ name: "", unit: "", reference_range: "" }]);
//   const [radiologySetup, setRadiologySetup] = useState({ modality: "X-RAY", template: "" });

//   const [showModal, setShowModal] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [editingId, setEditingId] = useState<number | null>(null);
//   const [isExporting, setIsExporting] = useState(false);

//   const [formData, setFormData] = useState({
//     billable_name: "",
//     category: "consultation",
//     payer_type_id: "",
//     care_level: "OPD",
//     unit_price: "",
//     effective_from: "",
//     effective_to: "",
//     is_active: 1,
//     specialization_code: "",
//     doctor_id: "",
//   });

//   // 1. Debounce Search (Waits 500ms after user stops typing)
//   useEffect(() => {
//     const timer = setTimeout(() => {
//       setDebouncedSearch(searchTerm);
//       setCurrentPage(1); // Reset to page 1 when search changes
//     }, 500);
//     return () => clearTimeout(timer);
//   }, [searchTerm]);

//   // 2. Fetch Reference Data ONLY ONCE on mount
//   useEffect(() => {
//     const fetchReferenceData = async () => {
//       try {
//         const [payersData, specializationsData, doctorsData] = await Promise.all([
//           billingService.getPayers(),
//           userService.getSpecializations(),
//           userService.getDoctors(),
//         ]);
//         setPayers(payersData);
//         setSpecializations(specializationsData);
//         setDoctors(doctorsData);
//       } catch (err) {
//         notify("Failed to load reference data", "error");
//       }
//     };
//     fetchReferenceData();
//   }, []);

//   // 3. Fetch Tariffs whenever Page or Debounced Search changes
//   const fetchTariffs = async () => {
//     setLoading(true);
//     try {
//       const response = await billingService.searchTariffs({
//         search: debouncedSearch,
//         page: currentPage,
//         limit: itemsPerPage
//       });
//       // Safety fallback to ensure it is ALWAYS an array
//       setTariffs(Array.isArray(response.data) ? response.data : []);
//       setTotalRecords(response.total || 0);
//     } catch (err) {
//       notify("Failed to load pricing data", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchTariffs();
//   }, [debouncedSearch, currentPage]);

//   const handleOpenCreate = () => {
//     setEditingId(null);
//     setFormData({
//       billable_name: "",
//       category: "consultation",
//       payer_type_id: payers.length > 0 ? payers[0].id : "",
//       care_level: "OPD",
//       unit_price: "",
//       effective_from: new Date().toISOString().split("T")[0],
//       effective_to: "",
//       is_active: 1,
//       specialization_code: "",
//       doctor_id: "",
//     });
//     setShowModal(true);
//   };

//   const handleOpenEdit = async (id: number) => {
//     try {
//       const data = await billingService.getTariff(id);
//       const tariff = Array.isArray(data) ? data[0] : data;
//       if (!tariff) throw new Error("Tariff not found");

//       setEditingId(id);
//       setFormData({
//         billable_name: tariff.billable_name,
//         category: tariff.category || "other",
//         payer_type_id: tariff.payer_type_id,
//         care_level: tariff.care_level,
//         unit_price: tariff.unit_price,
//         effective_from: tariff.effective_from,
//         effective_to: tariff.effective_to || "",
//         is_active: tariff.is_active,
//         specialization_code: tariff.specialization_code || "",
//         doctor_id: tariff.doctor_id || "",
//       });
//       setShowModal(true);
//     } catch (err) {
//       notify("Failed to fetch tariff details", "error");
//     }
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setIsSubmitting(true);
//     try {
//       const payload: any = {
//         billable_name: formData.billable_name,
//         category: formData.category,
//         payer_type_id: parseInt(String(formData.payer_type_id)),
//         care_level: formData.care_level,
//         unit_price: parseFloat(String(formData.unit_price)),
//         effective_from: formData.effective_from,
//         effective_to: formData.effective_to || null,
//         is_active: formData.is_active,
//       };

//       if (formData.category === "consultation") {
//         if (formData.specialization_code) payload.specialization_code = formData.specialization_code;
//         if (formData.doctor_id) payload.doctor_id = parseInt(String(formData.doctor_id));
//       }

//       if (editingId) {
//         await billingService.updateTariff(editingId, payload);
//         notify("Service pricing updated successfully", "success");
//       } else {
//         await billingService.createTariff(payload);
//         notify("New service tariff created", "success");
//       }
//       setShowModal(false);
//       fetchTariffs(); // Refetch after saving
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Operation failed", "error");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const handleDelete = async (id: number) => {
//     if (!confirm("Are you sure you want to remove this pricing rule? This may affect billing.")) return;
//     try {
//       await billingService.deleteTariff(id);
//       notify("Tariff removed successfully", "success");
//       fetchTariffs(); // Refetch after deleting
//     } catch (err) {
//       notify("Failed to delete tariff", "error");
//     }
//   };

//   const getPayerName = (id: number) => {
//     const payer = payers.find((p) => p.id === id);
//     return payer ? payer.name : "Unknown";
//   };

//   const handleExport = async () => {
//     setIsExporting(true);
//     try {
//       await billingService.exportTariffs();
//       notify("Tariffs exported successfully", "success");
//     } catch (err) {
//       notify("Failed to export tariffs", "error");
//     } finally {
//       setIsExporting(false);
//     }
//   };

//   // Safe Math for total pages
//   const totalPages = Math.max(1, Math.ceil(totalRecords / itemsPerPage));

//   return (
//     <div className="space-y-6 animate-in fade-in duration-500">
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//         <div>
//           <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
//             <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
//               <DollarSign size={24} />
//             </div>
//             Services & Pricing Master
//           </h1>
//           <p className="text-slate-500 font-medium">
//             Configure global billable items and insurance tariffs.
//           </p>
//         </div>
//         <div className="flex items-center gap-3">
//           <button
//             onClick={handleExport}
//             disabled={isExporting}
//             className="bg-white text-emerald-600 border border-emerald-200 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-emerald-50 transition-all active:scale-95 disabled:opacity-50"
//           >
//             {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
//             Export Excel
//           </button>
//           <button
//             onClick={handleOpenCreate}
//             className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95"
//           >
//             <Plus size={18} /> Add New Service
//           </button>
//         </div>
//       </div>

//       {/* Filters */}
//       <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center shadow-sm">
//         <div className="relative flex-1 w-full">
//           <Search
//             className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
//             size={18}
//           />
//           <input
//             type="text"
//             placeholder="Search service name or code..."
//             className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//           />
//         </div>
//         <button className="flex items-center gap-2 px-5 py-3 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all">
//           <Filter size={16} /> Filter
//         </button>
//       </div>

//       {/* Table */}
//       <div className="bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-sm min-h-[400px] flex flex-col">
//         {loading ? (
//           <div className="flex flex-col items-center justify-center py-20 flex-1">
//             <Loader2 size={40} className="text-emerald-600 animate-spin mb-4" />
//             <p className="text-slate-400 font-bold uppercase tracking-widest">
//               Loading Price List...
//             </p>
//           </div>
//         ) : (
//           <>
//             <div className="overflow-x-auto flex-1">
//               <table className="w-full text-left">
//                 <thead>
//                   <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
//                     <th className="px-8 py-5">Service Details</th>
//                     <th className="px-8 py-5">Payer / Plan</th>
//                     <th className="px-8 py-5">Category</th>
//                     <th className="px-8 py-5 text-right">Unit Price</th>
//                     <th className="px-8 py-5 text-center">Status</th>
//                     <th className="px-8 py-5 text-right">Actions</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-50">
//                   {tariffs.map((t) => (
//                     <tr
//                       key={t.id}
//                       className="hover:bg-slate-50/50 transition-colors group"
//                     >
//                       <td className="px-8 py-5">
//                         <p className="text-sm font-black text-slate-800">
//                           {t.billable_name}
//                         </p>
//                         <span className="text-[10px] font-mono font-bold text-brand-primary bg-brand-active px-2 py-0.5 rounded border border-brand-active uppercase tracking-tight">
//                           {t.billable_code || "NO-CODE"}
//                         </span>
//                       </td>
//                       <td className="px-8 py-5">
//                         <div className="flex flex-col">
//                           <span className="text-xs font-bold text-slate-700">
//                             {getPayerName(t.payer_type_id)}
//                           </span>
//                           <span className="text-[10px] text-slate-400 uppercase tracking-wider">
//                             {t.care_level}
//                           </span>
//                         </div>
//                       </td>
//                       <td className="px-8 py-5">
//                         <span className="text-[10px] font-black uppercase text-slate-500 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
//                           {t.category}
//                         </span>
//                       </td>
//                       <td className="px-8 py-5 text-right">
//                         <p className="text-sm font-black text-emerald-600">
//                           ₦{parseFloat(t.unit_price).toLocaleString()}
//                         </p>
//                       </td>
//                       <td className="px-8 py-5 text-center">
//                         {t.is_active ? (
//                           <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 uppercase tracking-wider">
//                             <Activity size={10} /> Active
//                           </span>
//                         ) : (
//                           <span className="inline-flex items-center gap-1 text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-full border border-slate-200 uppercase tracking-wider">
//                             Inactive
//                           </span>
//                         )}
//                       </td>
//                       <td className="px-8 py-5 text-right">
//                         <div className="flex items-center justify-end gap-2">
                          
//                           {/* Show Component button for categories that typically need breakdowns */}
//                           {['surgery', 'procedure', 'package'].includes(t.category?.toLowerCase()) && (
//                             <button
//                               onClick={() => setComponentTariff(t)}
//                               title="Manage Components"
//                               className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
//                             >
//                               <Layers size={16} />
//                             </button>
//                           )}

//                           <button
//                             onClick={() => handleOpenEdit(t.id)}
//                             title="Edit Tariff"
//                             className="p-2 text-slate-300 hover:text-brand-primary hover:bg-brand-active rounded-xl transition-all"
//                           >
//                             <Edit2 size={16} />
//                           </button>
//                           <button
//                             onClick={() => handleDelete(t.id)}
//                             title="Delete Tariff"
//                             className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
//                           >
//                             <Trash2 size={16} />
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//               {tariffs.length === 0 && (
//                 <div className="py-20 text-center opacity-40">
//                   <Tag size={48} className="mx-auto text-slate-300 mb-4" />
//                   <p className="text-xs font-black uppercase tracking-widest text-slate-400">
//                     No Services Found
//                   </p>
//                 </div>
//               )}
//             </div>

//             {/* Pagination Controls */}
//             {totalPages > 1 && (
//               <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
//                 <span className="text-xs font-bold text-slate-500">
//                   Showing {(currentPage - 1) * itemsPerPage + (tariffs.length > 0 ? 1 : 0)} to{" "}
//                   {Math.min(currentPage * itemsPerPage, totalRecords)} of {totalRecords} entries
//                 </span>
//                 <div className="flex items-center gap-2">
//                   <button
//                     onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
//                     disabled={currentPage === 1}
//                     className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-brand-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
//                   >
//                     <ChevronLeft size={16} />
//                   </button>
//                   <span className="text-xs font-black text-slate-700">
//                     Page {currentPage} of {totalPages}
//                   </span>
//                   <button
//                     onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
//                     disabled={currentPage === totalPages}
//                     className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-brand-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
//                   >
//                     <ChevronRight size={16} />
//                   </button>
//                 </div>
//               </div>
//             )}
//           </>
//         )}
//       </div>

//       {/* Create/Edit Modal */}
//       {showModal && (
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
//           <div
//             className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
//             onClick={() => setShowModal(false)}
//           />
//           <form
//             onSubmit={handleSubmit}
//             className="relative bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
//           >
//             <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
//               <div className="flex items-center gap-3">
//                 <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-lg">
//                   <DollarSign size={20} />
//                 </div>
//                 <div>
//                   <h2 className="text-lg font-black text-slate-800 tracking-tight">
//                     {editingId ? "Modify Tariff" : "New Service Item"}
//                   </h2>
//                   <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">
//                     Pricing Configuration
//                   </p>
//                 </div>
//               </div>
//               <button
//                 type="button"
//                 onClick={() => setShowModal(false)}
//                 className="p-2 hover:bg-slate-200 rounded-full transition-colors"
//               >
//                 <X size={20} />
//               </button>
//             </div>

//             <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
//               <div className="space-y-2">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                   Billable Name
//                 </label>
//                 <input
//                   required
//                   type="text"
//                   className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
//                   placeholder="e.g. General Consultation"
//                   value={formData.billable_name}
//                   onChange={(e) =>
//                     setFormData({ ...formData, billable_name: e.target.value })
//                   }
//                 />
//               </div>

//               <div className="grid grid-cols-2 gap-4">
//                 <div className="space-y-2">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                     Category
//                   </label>
//                   <select
//                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none appearance-none"
//                     value={formData.category}
//                     onChange={(e) =>
//                       setFormData({ ...formData, category: e.target.value })
//                     }
//                   >
//                     {CATEGORIES.map((c) => (
//                       <option key={c} value={c}>
//                         {c.toUpperCase()}
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//                 <div className="space-y-2">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                     Care Level
//                   </label>
//                   <select
//                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none appearance-none"
//                     value={formData.care_level}
//                     onChange={(e) =>
//                       setFormData({ ...formData, care_level: e.target.value })
//                     }
//                   >
//                     {CARE_LEVELS.map((l) => (
//                       <option key={l} value={l}>
//                         {l}
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//               </div>

//               {/* Dynamic Clinical Configuration Section */}
//               {formData.category === "lab" && (
//                 <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-4">
//                   <h3 className="text-xs font-black text-blue-800 uppercase tracking-widest">Lab Test Parameters</h3>
//                   <p className="text-[10px] text-blue-600 mb-2">These parameters will auto-populate when a doctor orders this test.</p>

//                   {labParameters.map((param, index) => (
//                     <div key={index} className="flex gap-2 items-center">
//                       <input 
//                         placeholder="Parameter (e.g., Hemoglobin)" 
//                         className="flex-1 px-3 py-2 text-sm border rounded-xl"
//                         value={param.name}
//                         onChange={(e) => {
//                           const newParams = [...labParameters];
//                           newParams[index].name = e.target.value;
//                           setLabParameters(newParams);
//                         }}
//                       />
//                       <input 
//                         placeholder="Unit (e.g., g/dL)" 
//                         className="w-24 px-3 py-2 text-sm border rounded-xl"
//                         value={param.unit}
//                         onChange={(e) => { /* update unit */ }}
//                       />
//                       <input 
//                         placeholder="Normal Range (e.g., 12-16)" 
//                         className="w-32 px-3 py-2 text-sm border rounded-xl"
//                         value={param.reference_range}
//                         onChange={(e) => { /* update range */ }}
//                       />
//                     </div>
//                   ))}
//                   <button type="button" onClick={() => setLabParameters([...labParameters, { name: "", unit: "", reference_range: "" }])} className="text-xs font-bold text-blue-600">+ Add Parameter</button>
//                 </div>
//               )}

//               {formData.category === "radiology" && (
//                 <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-4">
//                   <h3 className="text-xs font-black text-purple-800 uppercase tracking-widest">Radiology Template</h3>
//                   <select className="w-full px-3 py-2 text-sm border rounded-xl mb-2" value={radiologySetup.modality} onChange={e => setRadiologySetup({...radiologySetup, modality: e.target.value})}>
//                     <option value="X-RAY">X-Ray</option>
//                     <option value="MRI">MRI</option>
//                     <option value="CT">CT Scan</option>
//                     <option value="USG">Ultrasound</option>
//                   </select>
//                   <textarea 
//                     placeholder="Default Report Template structure..." 
//                     className="w-full px-3 py-2 text-sm border rounded-xl h-24"
//                     value={radiologySetup.template}
//                     onChange={e => setRadiologySetup({...radiologySetup, template: e.target.value})}
//                   />
//                 </div>
//               )}

//               {formData.category === "consultation" && (
//                 <div className="grid grid-cols-2 gap-4 p-4 bg-brand-active/50 rounded-2xl border border-brand-active">
//                   <div className="space-y-2">
//                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                       Specialization (Optional)
//                     </label>
//                     <select
//                       className="w-full px-5 py-4 bg-white border border-brand-active rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand-active0/10 outline-none appearance-none"
//                       value={formData.specialization_code}
//                       onChange={(e) =>
//                         setFormData({
//                           ...formData,
//                           specialization_code: e.target.value,
//                         })
//                       }
//                     >
//                       <option value="">No Specialization</option>
//                       {specializations.map((s) => (
//                         <option key={s.id} value={s.code}>
//                           {s.name} ({s.code})
//                         </option>
//                       ))}
//                     </select>
//                   </div>
//                   <div className="space-y-2">
//                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                       Doctor (Optional)
//                     </label>
//                     <select
//                       className="w-full px-5 py-4 bg-white border border-brand-active rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand-active0/10 outline-none appearance-none"
//                       value={formData.doctor_id}
//                       onChange={(e) =>
//                         setFormData({ ...formData, doctor_id: e.target.value })
//                       }
//                     >
//                       <option value="">No Doctor</option>
//                       {doctors.map((d) => (
//                         <option key={d.doctor_id} value={d.doctor_id}>
//                           {d.first_name} {d.last_name} ({d.specialization_code})
//                         </option>
//                       ))}
//                     </select>
//                   </div>
//                 </div>
//               )}

//               <div className="grid grid-cols-2 gap-4">
//                 <div className="space-y-2">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                     Payer Type
//                   </label>
//                   <select
//                     required
//                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none appearance-none"
//                     value={formData.payer_type_id}
//                     onChange={(e) =>
//                       setFormData({
//                         ...formData,
//                         payer_type_id: e.target.value,
//                       })
//                     }
//                   >
//                     <option value="">Select Payer...</option>
//                     {payers.map((p) => (
//                       <option key={p.id} value={p.id}>
//                         {p.name}
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//                 <div className="space-y-2">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                     Unit Price (₦)
//                   </label>
//                   <input
//                     required
//                     type="number"
//                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none"
//                     value={formData.unit_price}
//                     onChange={(e) =>
//                       setFormData({ ...formData, unit_price: e.target.value })
//                     }
//                   />
//                 </div>
//               </div>

//               <div className="grid grid-cols-2 gap-4">
//                 <div className="space-y-2">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
//                     <Calendar size={12} /> Effective From
//                   </label>
//                   <input
//                     required
//                     type="date"
//                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none"
//                     value={formData.effective_from}
//                     onChange={(e) =>
//                       setFormData({
//                         ...formData,
//                         effective_from: e.target.value,
//                       })
//                     }
//                   />
//                 </div>
//                 <div className="space-y-2">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
//                     <Calendar size={12} /> Valid To (Optional)
//                   </label>
//                   <input
//                     type="date"
//                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none"
//                     value={formData.effective_to}
//                     onChange={(e) =>
//                       setFormData({ ...formData, effective_to: e.target.value })
//                     }
//                   />
//                 </div>
//               </div>

//               <div
//                 className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer"
//                 onClick={() =>
//                   setFormData({
//                     ...formData,
//                     is_active: formData.is_active ? 0 : 1,
//                   })
//                 }
//               >
//                 <div
//                   className={`w-10 h-6 rounded-full p-1 transition-all ${formData.is_active ? "bg-emerald-500" : "bg-slate-300"}`}
//                 >
//                   <div
//                     className={`w-4 h-4 bg-white rounded-full shadow-sm transition-all ${formData.is_active ? "translate-x-4" : "translate-x-0"}`}
//                   />
//                 </div>
//                 <span className="text-xs font-bold text-slate-600">
//                   Service is Active & Billable
//                 </span>
//               </div>
//             </div>

//             <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
//               <button
//                 type="button"
//                 onClick={() => setShowModal(false)}
//                 disabled={isSubmitting}
//                 className="px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-800"
//               >
//                 Cancel
//               </button>
//               <button
//                 type="submit"
//                 disabled={isSubmitting}
//                 className="bg-emerald-600 text-white px-10 py-3 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-2"
//               >
//                 {isSubmitting ? (
//                   <Loader2 size={16} className="animate-spin" />
//                 ) : (
//                   <Save size={16} />
//                 )}
//                 Save Tariff
//               </button>
//             </div>
//           </form>
//         </div>
//       )}

//       {/* Components Manager Modal */}
//       {componentTariff && (
//         <TariffComponentsModal 
//           tariff={componentTariff} 
//           onClose={() => setComponentTariff(null)} 
//         />
//       )}
//     </div>
//   );
// };

// export default BillingPricing;



// import React, { useState, useEffect, useMemo } from "react";
// import {
//   Search,
//   Plus,
//   Filter,
//   Edit2,
//   Trash2,
//   Loader2,
//   DollarSign,
//   Tag,
//   Activity,
//   CheckCircle2,
//   X,
//   Save,
//   Calendar,
//   ChevronLeft,
//   ChevronRight,
//   Download,
//   Layers
// } from "lucide-react";
// import TariffComponentsModal from './TariffComponentsModal';
// import { billingService } from "../services/billing.service";
// import { userService } from "../services/user.service";
// import { useNotification } from "../context/NotificationContext";

// const CARE_LEVELS = ["OPD", "IPD", "ICU", "HDU"];
// const CATEGORIES = [
//   "consultation",
//   "lab",
//   "radiology",
//   "pharmacy",
//   "procedure",
//   "surgery",
//   "consumables",
//   "bed_charge",
//   "registration",
//   "blood_bank",
//   "implant",
//   "nursing_charge",
//   "food",
//   "other",
// ];

// const BillingPricing: React.FC = () => {
//   const { notify } = useNotification();

//   const [tariffs, setTariffs] = useState<any[]>([]);
//   const [payers, setPayers] = useState<any[]>([]);
//   const [specializations, setSpecializations] = useState<any[]>([]);
//   const [doctors, setDoctors] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
  
//   // Search & Pagination States
//   const [searchTerm, setSearchTerm] = useState("");
//   const [debouncedSearch, setDebouncedSearch] = useState("");
//   const [currentPage, setCurrentPage] = useState(1);
//   const [totalRecords, setTotalRecords] = useState(0);
//   const itemsPerPage = 10;

//   const [componentTariff, setComponentTariff] = useState<any | null>(null);
//   const [labParameters, setLabParameters] = useState([{ name: "", unit: "", reference_range: "" }]);
//   const [radiologySetup, setRadiologySetup] = useState({ modality: "X-RAY", template: "" });

//   const [showModal, setShowModal] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [editingId, setEditingId] = useState<number | null>(null);
//   const [isExporting, setIsExporting] = useState(false);

//   const [formData, setFormData] = useState({
//     billable_name: "",
//     category: "consultation",
//     payer_type_id: "",
//     care_level: "OPD",
//     unit_price: "",
//     effective_from: "",
//     effective_to: "",
//     is_active: 1,
//     specialization_code: "",
//     doctor_id: "",
//   });

//   // 1. Debounce Search (Waits 500ms after user stops typing)
//   useEffect(() => {
//     const timer = setTimeout(() => {
//       setDebouncedSearch(searchTerm);
//       setCurrentPage(1); // Reset to page 1 when search changes
//     }, 500);
//     return () => clearTimeout(timer);
//   }, [searchTerm]);

//   // 2. Fetch Reference Data ONLY ONCE on mount
//   useEffect(() => {
//     const fetchReferenceData = async () => {
//       try {
//         const [payersData, specializationsData, doctorsData] = await Promise.all([
//           billingService.getPayers(),
//           userService.getSpecializations(),
//           userService.getDoctors(),
//         ]);
//         setPayers(payersData);
//         setSpecializations(specializationsData);
//         setDoctors(doctorsData);
//       } catch (err) {
//         notify("Failed to load reference data", "error");
//       }
//     };
//     fetchReferenceData();
//   }, []);

//   // 3. Fetch Tariffs whenever Page or Debounced Search changes
//   const fetchTariffs = async () => {
//     setLoading(true);
//     try {
//       const response = await billingService.searchTariffs({
//         search: debouncedSearch,
//         page: currentPage,
//         limit: itemsPerPage
//       });
//       setTariffs(response.data);
//       setTotalRecords(response.total);
//     } catch (err) {
//       notify("Failed to load pricing data", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchTariffs();
//   }, [debouncedSearch, currentPage]);

//   const handleOpenCreate = () => {
//     setEditingId(null);
//     setFormData({
//       billable_name: "",
//       category: "consultation",
//       payer_type_id: payers.length > 0 ? payers[0].id : "",
//       care_level: "OPD",
//       unit_price: "",
//       effective_from: new Date().toISOString().split("T")[0],
//       effective_to: "",
//       is_active: 1,
//       specialization_code: "",
//       doctor_id: "",
//     });
//     setShowModal(true);
//   };

//   const handleOpenEdit = async (id: number) => {
//     try {
//       const data = await billingService.getTariff(id);
//       const tariff = Array.isArray(data) ? data[0] : data;
//       if (!tariff) throw new Error("Tariff not found");

//       setEditingId(id);
//       setFormData({
//         billable_name: tariff.billable_name,
//         category: tariff.category || "other",
//         payer_type_id: tariff.payer_type_id,
//         care_level: tariff.care_level,
//         unit_price: tariff.unit_price,
//         effective_from: tariff.effective_from,
//         effective_to: tariff.effective_to || "",
//         is_active: tariff.is_active,
//         specialization_code: tariff.specialization_code || "",
//         doctor_id: tariff.doctor_id || "",
//       });
//       setShowModal(true);
//     } catch (err) {
//       notify("Failed to fetch tariff details", "error");
//     }
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setIsSubmitting(true);
//     try {
//       const payload: any = {
//         billable_name: formData.billable_name,
//         category: formData.category,
//         payer_type_id: parseInt(String(formData.payer_type_id)),
//         care_level: formData.care_level,
//         unit_price: parseFloat(String(formData.unit_price)),
//         effective_from: formData.effective_from,
//         effective_to: formData.effective_to || null,
//         is_active: formData.is_active,
//       };

//       if (formData.category === "consultation") {
//         if (formData.specialization_code) payload.specialization_code = formData.specialization_code;
//         if (formData.doctor_id) payload.doctor_id = parseInt(String(formData.doctor_id));
//       }

//       if (editingId) {
//         await billingService.updateTariff(editingId, payload);
//         notify("Service pricing updated successfully", "success");
//       } else {
//         await billingService.createTariff(payload);
//         notify("New service tariff created", "success");
//       }
//       setShowModal(false);
//       fetchTariffs(); // Refetch after saving
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Operation failed", "error");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const handleDelete = async (id: number) => {
//     if (!confirm("Are you sure you want to remove this pricing rule? This may affect billing.")) return;
//     try {
//       await billingService.deleteTariff(id);
//       notify("Tariff removed successfully", "success");
//       fetchTariffs(); // Refetch after deleting
//     } catch (err) {
//       notify("Failed to delete tariff", "error");
//     }
//   };

//   const getPayerName = (id: number) => {
//     const payer = payers.find((p) => p.id === id);
//     return payer ? payer.name : "Unknown";
//   };

//   const handleExport = async () => {
//     setIsExporting(true);
//     try {
//       await billingService.exportTariffs();
//       notify("Tariffs exported successfully", "success");
//     } catch (err) {
//       notify("Failed to export tariffs", "error");
//     } finally {
//       setIsExporting(false);
//     }
//   };

//   const totalPages = Math.ceil(totalRecords / itemsPerPage);





  
//   // const [tariffs, setTariffs] = useState<any[]>([]);
//   // const [payers, setPayers] = useState<any[]>([]);
//   // const [specializations, setSpecializations] = useState<any[]>([]);
//   // const [doctors, setDoctors] = useState<any[]>([]);
//   // const [loading, setLoading] = useState(true);
//   // const [searchTerm, setSearchTerm] = useState("");
//   // const [debouncedSearch, setDebouncedSearch] = useState(""); // <-- NEW DEBOUNCE STATE
//   // const [componentTariff, setComponentTariff] = useState<any | null>(null);
//   // // Add this new state inside BillingPricing component
//   // const [labParameters, setLabParameters] = useState([{ name: "", unit: "", reference_range: "" }]);
//   // const [radiologySetup, setRadiologySetup] = useState({ modality: "X-RAY", template: "" });

//   // // Pagination
//   // const [currentPage, setCurrentPage] = useState(1);
//   // const [totalRecords, setTotalRecords] = useState(0); // <-- NEW BACKEND TOTAL STATE
//   // const itemsPerPage = 10;

//   // // Modal State
//   // const [showModal, setShowModal] = useState(false);
//   // const [isSubmitting, setIsSubmitting] = useState(false);
//   // const [editingId, setEditingId] = useState<number | null>(null);
//   // const [isExporting, setIsExporting] = useState(false);

//   // const [formData, setFormData] = useState({
//   //   billable_name: "",
//   //   category: "consultation",
//   //   payer_type_id: "",
//   //   care_level: "OPD",
//   //   unit_price: "",
//   //   effective_from: "",
//   //   effective_to: "",
//   //   is_active: 1,
//   //   specialization_code: "",
//   //   doctor_id: "",
//   // });

//   // const fetchData = async () => {
//   //   setLoading(true);
//   //   try {
//   //     const [tariffsData, payersData, specializationsData, doctorsData] =
//   //       await Promise.all([
//   //         billingService.searchTariffs(),
//   //         billingService.getPayers(),
//   //         userService.getSpecializations(),
//   //         userService.getDoctors(),
//   //       ]);
//   //     setTariffs(tariffsData);
//   //     setPayers(payersData);
//   //     setSpecializations(specializationsData);
//   //     setDoctors(doctorsData);
//   //   } catch (err) {
//   //     notify("Failed to load pricing data", "error");
//   //   } finally {
//   //     setLoading(false);
//   //   }
//   // };

//   // useEffect(() => {
//   //   fetchData();
//   // }, []);

//   // const handleOpenCreate = () => {
//   //   setEditingId(null);
//   //   setFormData({
//   //     billable_name: "",
//   //     category: "consultation",
//   //     payer_type_id: payers.length > 0 ? payers[0].id : "",
//   //     care_level: "OPD",
//   //     unit_price: "",
//   //     effective_from: new Date().toISOString().split("T")[0],
//   //     effective_to: "", // Optional
//   //     is_active: 1,
//   //     specialization_code: "",
//   //     doctor_id: "",
//   //   });
//   //   setShowModal(true);
//   // };

  

//   // // 2. Fetch Reference Data ONLY ONCE on mount
//   // useEffect(() => {
//   //   const fetchReferenceData = async () => {
//   //     try {
//   //       const [payersData, specializationsData, doctorsData] = await Promise.all([
//   //         billingService.getPayers(),
//   //         userService.getSpecializations(),
//   //         userService.getDoctors(),
//   //       ]);
//   //       setPayers(payersData);
//   //       setSpecializations(specializationsData);
//   //       setDoctors(doctorsData);
//   //     } catch (err) {
//   //       notify("Failed to load reference data", "error");
//   //     }
//   //   };
//   //   fetchReferenceData();
//   // }, []);

//   // // 3. Fetch Tariffs whenever Page or Debounced Search changes
//   // const fetchTariffs = async () => {
//   //   setLoading(true);
//   //   try {
//   //     const response = await billingService.searchTariffs({
//   //       search: debouncedSearch,
//   //       page: currentPage,
//   //       limit: itemsPerPage
//   //     });
//   //     setTariffs(response.data || []);
//   //     setTotalRecords(response.total || 0);
//   //   } catch (err) {
//   //     notify("Failed to load pricing data", "error");
//   //   } finally {
//   //     setLoading(false);
//   //   }
//   // };

//   // useEffect(() => {
//   //   fetchTariffs();
//   // }, [debouncedSearch, currentPage]);


//   // const handleOpenEdit = async (id: number) => {
//   //   try {
//   //     const data = await billingService.getTariff(id);
//   //     // If API returns array, take first, otherwise take object
//   //     const tariff = Array.isArray(data) ? data[0] : data;

//   //     if (!tariff) throw new Error("Tariff not found");

//   //     setEditingId(id);
//   //     setFormData({
//   //       billable_name: tariff.billable_name,
//   //       category: tariff.category || "other",
//   //       payer_type_id: tariff.payer_type_id,
//   //       care_level: tariff.care_level,
//   //       unit_price: tariff.unit_price,
//   //       effective_from: tariff.effective_from,
//   //       effective_to: tariff.effective_to || "",
//   //       is_active: tariff.is_active,
//   //       specialization_code: tariff.specialization_code || "",
//   //       doctor_id: tariff.doctor_id || "",
//   //     });
//   //     setShowModal(true);
//   //   } catch (err) {
//   //     notify("Failed to fetch tariff details", "error");
//   //   }
//   // };

//   // const handleSubmit = async (e: React.FormEvent) => {
//   //   e.preventDefault();
//   //   setIsSubmitting(true);
//   //   try {
//   //     const payload: any = {
//   //       billable_name: formData.billable_name,
//   //       category: formData.category,
//   //       payer_type_id: parseInt(String(formData.payer_type_id)),
//   //       care_level: formData.care_level,
//   //       unit_price: parseFloat(String(formData.unit_price)),
//   //       effective_from: formData.effective_from,
//   //       effective_to: formData.effective_to || null,
//   //       is_active: formData.is_active,
//   //     };

//   //     // Add consultation-specific fields
//   //     if (formData.category === "consultation") {
//   //       if (formData.specialization_code) {
//   //         payload.specialization_code = formData.specialization_code;
//   //       }
//   //       if (formData.doctor_id) {
//   //         payload.doctor_id = parseInt(String(formData.doctor_id));
//   //       }
//   //     }

//   //     if (editingId) {
//   //       await billingService.updateTariff(editingId, payload);
//   //       notify("Service pricing updated successfully", "success");
//   //     } else {
//   //       await billingService.createTariff(payload);
//   //       notify("New service tariff created", "success");
//   //     }
//   //     setShowModal(false);
//   //     fetchData();
//   //   } catch (err: any) {
//   //     notify(err.response?.data?.message || "Operation failed", "error");
//   //   } finally {
//   //     setIsSubmitting(false);
//   //   }
//   // };

//   // const handleDelete = async (id: number) => {
//   //   if (
//   //     !confirm(
//   //       "Are you sure you want to remove this pricing rule? This may affect billing.",
//   //     )
//   //   )
//   //     return;
//   //   try {
//   //     await billingService.deleteTariff(id);
//   //     notify("Tariff removed successfully", "success");
//   //     fetchData();
//   //   } catch (err) {
//   //     notify("Failed to delete tariff", "error");
//   //   }
//   // };

//   // const getPayerName = (id: number) => {
//   //   const payer = payers.find((p) => p.id === id);
//   //   return payer ? payer.name : "Unknown";
//   // };

//   // const handleExport = async () => {
//   //   setIsExporting(true);
//   //   try {
//   //     await billingService.exportTariffs();
//   //     notify("Tariffs exported successfully", "success");
//   //   } catch (err) {
//   //     notify("Failed to export tariffs", "error");
//   //   } finally {
//   //     setIsExporting(false);
//   //   }
//   // };

//   // const filteredTariffs = useMemo(() => {
//   //   const filtered = tariffs.filter(
//   //     (t) =>
//   //       t.billable_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//   //       t.billable_code?.toLowerCase().includes(searchTerm.toLowerCase()),
//   //   );
//   //   return filtered;
//   // }, [tariffs, searchTerm]);

//   // // Pagination Logic
//   // const totalPages = Math.ceil(filteredTariffs.length / itemsPerPage);
//   // const paginatedTariffs = useMemo(() => {

//   // const start = (currentPage - 1) * itemsPerPage;
//   //   return filteredTariffs.slice(start, start + itemsPerPage);
//   // }, [filteredTariffs, currentPage]);

//   // Reset to first page when search changes
//   // useEffect(() => {
//   //   setCurrentPage(1);
//   // }, [searchTerm]);

//   return (
//     <div className="space-y-6 animate-in fade-in duration-500">
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//         <div>
//           <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
//             <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
//               <DollarSign size={24} />
//             </div>
//             Services & Pricing Master
//           </h1>
//           <p className="text-slate-500 font-medium">
//             Configure global billable items and insurance tariffs.
//           </p>
//         </div>
//         <div className="flex items-center gap-3">
//           <button
//             onClick={handleExport}
//             disabled={isExporting}
//             className="bg-white text-emerald-600 border border-emerald-200 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-emerald-50 transition-all active:scale-95 disabled:opacity-50"
//           >
//             {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
//             Export Excel
//           </button>
//           <button
//             onClick={handleOpenCreate}
//             className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95"
//           >
//             <Plus size={18} /> Add New Service
//           </button>
//         </div>
//       </div>

//       {/* Filters */}
//       <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center shadow-sm">
//         <div className="relative flex-1 w-full">
//           <Search
//             className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
//             size={18}
//           />
//           <input
//             type="text"
//             placeholder="Search service name or code..."
//             className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//           />
//         </div>
//         <button className="flex items-center gap-2 px-5 py-3 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all">
//           <Filter size={16} /> Filter
//         </button>
//       </div>

//       {/* Table */}
//       <div className="bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-sm min-h-[400px] flex flex-col">
//         {loading ? (
//           <div className="flex flex-col items-center justify-center py-20 flex-1">
//             <Loader2 size={40} className="text-emerald-600 animate-spin mb-4" />
//             <p className="text-slate-400 font-bold uppercase tracking-widest">
//               Loading Price List...
//             </p>
//           </div>
//         ) : (
//           <>
//             <div className="overflow-x-auto flex-1">
//               <table className="w-full text-left">
//                 <thead>
//                   <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
//                     <th className="px-8 py-5">Service Details</th>
//                     <th className="px-8 py-5">Payer / Plan</th>
//                     <th className="px-8 py-5">Category</th>
//                     <th className="px-8 py-5 text-right">Unit Price</th>
//                     <th className="px-8 py-5 text-center">Status</th>
//                     <th className="px-8 py-5 text-right">Actions</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-50">
//                   {paginatedTariffs.map((t) => (
//                     <tr
//                       key={t.id}
//                       className="hover:bg-slate-50/50 transition-colors group"
//                     >
//                       <td className="px-8 py-5">
//                         <p className="text-sm font-black text-slate-800">
//                           {t.billable_name}
//                         </p>
//                         <span className="text-[10px] font-mono font-bold text-brand-primary bg-brand-active px-2 py-0.5 rounded border border-brand-active uppercase tracking-tight">
//                           {t.billable_code || "NO-CODE"}
//                         </span>
//                       </td>
//                       <td className="px-8 py-5">
//                         <div className="flex flex-col">
//                           <span className="text-xs font-bold text-slate-700">
//                             {getPayerName(t.payer_type_id)}
//                           </span>
//                           <span className="text-[10px] text-slate-400 uppercase tracking-wider">
//                             {t.care_level}
//                           </span>
//                         </div>
//                       </td>
//                       <td className="px-8 py-5">
//                         <span className="text-[10px] font-black uppercase text-slate-500 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
//                           {t.category}
//                         </span>
//                       </td>
//                       <td className="px-8 py-5 text-right">
//                         <p className="text-sm font-black text-emerald-600">
//                           ₦{parseFloat(t.unit_price).toLocaleString()}
//                         </p>
//                       </td>
//                       <td className="px-8 py-5 text-center">
//                         {t.is_active ? (
//                           <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 uppercase tracking-wider">
//                             <Activity size={10} /> Active
//                           </span>
//                         ) : (
//                           <span className="inline-flex items-center gap-1 text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-full border border-slate-200 uppercase tracking-wider">
//                             Inactive
//                           </span>
//                         )}
//                       </td>
//                       <td className="px-8 py-5 text-right">
//                         <div className="flex items-center justify-end gap-2">
                          
//                           {/* Show Component button for categories that typically need breakdowns */}
//                           {['surgery', 'procedure', 'package'].includes(t.category?.toLowerCase()) && (
//                             <button
//                               onClick={() => setComponentTariff(t)}
//                               title="Manage Components"
//                               className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
//                             >
//                               <Layers size={16} />
//                             </button>
//                           )}

//                           <button
//                             onClick={() => handleOpenEdit(t.id)}
//                             title="Edit Tariff"
//                             className="p-2 text-slate-300 hover:text-brand-primary hover:bg-brand-active rounded-xl transition-all"
//                           >
//                             <Edit2 size={16} />
//                           </button>
//                           <button
//                             onClick={() => handleDelete(t.id)}
//                             title="Delete Tariff"
//                             className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
//                           >
//                             <Trash2 size={16} />
//                           </button>
//                         </div>
//                       </td>
//                       {/* <td className="px-8 py-5 text-right">
//                         <div className="flex items-center justify-end gap-2">
//                           <button
//                             onClick={() => handleOpenEdit(t.id)}
//                             className="p-2 text-slate-300 hover:text-brand-primary hover:bg-brand-active rounded-xl transition-all"
//                           >
//                             <Edit2 size={16} />
//                           </button>
//                           <button
//                             onClick={() => handleDelete(t.id)}
//                             className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
//                           >
//                             <Trash2 size={16} />
//                           </button>
//                         </div>
//                       </td> */}
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//               {paginatedTariffs.length === 0 && (
//                 <div className="py-20 text-center opacity-40">
//                   <Tag size={48} className="mx-auto text-slate-300 mb-4" />
//                   <p className="text-xs font-black uppercase tracking-widest text-slate-400">
//                     No Services Found
//                   </p>
//                 </div>
//               )}
//             </div>

//             {/* Pagination Controls */}
//             {totalPages > 1 && (
//               <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">

//                 <span className="text-xs font-bold text-slate-500">
//                   Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
//                   {Math.min(currentPage * itemsPerPage, totalRecords)} of {totalRecords} entries
//                 </span>                
//                 {/* <span className="text-xs font-bold text-slate-500">
//                   Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
//                   {Math.min(currentPage * itemsPerPage, filteredTariffs.length)}{" "}
//                   of {filteredTariffs.length} entries
//                 </span> */}
//                 <div className="flex items-center gap-2">
//                   <button
//                     onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
//                     disabled={currentPage === 1}
//                     className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-brand-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
//                   >
//                     <ChevronLeft size={16} />
//                   </button>
//                   <span className="text-xs font-black text-slate-700">
//                     Page {currentPage} of {totalPages}
//                   </span>
//                   <button
//                     onClick={() =>
//                       setCurrentPage((p) => Math.min(totalPages, p + 1))
//                     }
//                     disabled={currentPage === totalPages}
//                     className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-brand-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
//                   >
//                     <ChevronRight size={16} />
//                   </button>
//                 </div>
//               </div>
//             )}
//           </>
//         )}
//       </div>

//       {/* Create/Edit Modal */}
//       {showModal && (
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
//           <div
//             className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
//             onClick={() => setShowModal(false)}
//           />
//           <form
//             onSubmit={handleSubmit}
//             className="relative bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
//           >
//             <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
//               <div className="flex items-center gap-3">
//                 <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-lg">
//                   <DollarSign size={20} />
//                 </div>
//                 <div>
//                   <h2 className="text-lg font-black text-slate-800 tracking-tight">
//                     {editingId ? "Modify Tariff" : "New Service Item"}
//                   </h2>
//                   <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">
//                     Pricing Configuration
//                   </p>
//                 </div>
//               </div>
//               <button
//                 type="button"
//                 onClick={() => setShowModal(false)}
//                 className="p-2 hover:bg-slate-200 rounded-full transition-colors"
//               >
//                 <X size={20} />
//               </button>
//             </div>

//             <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
//               <div className="space-y-2">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                   Billable Name
//                 </label>
//                 <input
//                   required
//                   type="text"
//                   className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
//                   placeholder="e.g. General Consultation"
//                   value={formData.billable_name}
//                   onChange={(e) =>
//                     setFormData({ ...formData, billable_name: e.target.value })
//                   }
//                 />
//               </div>

//               <div className="grid grid-cols-2 gap-4">
//                 <div className="space-y-2">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                     Category
//                   </label>
//                   <select
//                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none appearance-none"
//                     value={formData.category}
//                     onChange={(e) =>
//                       setFormData({ ...formData, category: e.target.value })
//                     }
//                   >
//                     {CATEGORIES.map((c) => (
//                       <option key={c} value={c}>
//                         {c.toUpperCase()}
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//                 <div className="space-y-2">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                     Care Level
//                   </label>
//                   <select
//                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none appearance-none"
//                     value={formData.care_level}
//                     onChange={(e) =>
//                       setFormData({ ...formData, care_level: e.target.value })
//                     }
//                   >
//                     {CARE_LEVELS.map((l) => (
//                       <option key={l} value={l}>
//                         {l}
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//               </div>

//               {/* Dynamic Clinical Configuration Section */}
//               {formData.category === "lab" && (
//                 <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-4">
//                   <h3 className="text-xs font-black text-blue-800 uppercase tracking-widest">Lab Test Parameters</h3>
//                   <p className="text-[10px] text-blue-600 mb-2">These parameters will auto-populate when a doctor orders this test.</p>
                  
//                   {labParameters.map((param, index) => (
//                     <div key={index} className="flex gap-2 items-center">
//                       <input 
//                         placeholder="Parameter (e.g., Hemoglobin)" 
//                         className="flex-1 px-3 py-2 text-sm border rounded-xl"
//                         value={param.name}
//                         onChange={(e) => {
//                           const newParams = [...labParameters];
//                           newParams[index].name = e.target.value;
//                           setLabParameters(newParams);
//                         }}
//                       />
//                       <input 
//                         placeholder="Unit (e.g., g/dL)" 
//                         className="w-24 px-3 py-2 text-sm border rounded-xl"
//                         value={param.unit}
//                         onChange={(e) => { /* update unit */ }}
//                       />
//                       <input 
//                         placeholder="Normal Range (e.g., 12-16)" 
//                         className="w-32 px-3 py-2 text-sm border rounded-xl"
//                         value={param.reference_range}
//                         onChange={(e) => { /* update range */ }}
//                       />
//                     </div>
//                   ))}
//                   <button type="button" onClick={() => setLabParameters([...labParameters, { name: "", unit: "", reference_range: "" }])} className="text-xs font-bold text-blue-600">+ Add Parameter</button>
//                 </div>
//               )}

//               {formData.category === "radiology" && (
//                 <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-4">
//                   <h3 className="text-xs font-black text-purple-800 uppercase tracking-widest">Radiology Template</h3>
//                   <select className="w-full px-3 py-2 text-sm border rounded-xl mb-2" value={radiologySetup.modality} onChange={e => setRadiologySetup({...radiologySetup, modality: e.target.value})}>
//                     <option value="X-RAY">X-Ray</option>
//                     <option value="MRI">MRI</option>
//                     <option value="CT">CT Scan</option>
//                     <option value="USG">Ultrasound</option>
//                   </select>
//                   <textarea 
//                     placeholder="Default Report Template structure..." 
//                     className="w-full px-3 py-2 text-sm border rounded-xl h-24"
//                     value={radiologySetup.template}
//                     onChange={e => setRadiologySetup({...radiologySetup, template: e.target.value})}
//                   />
//                 </div>
//               )}

//               {formData.category === "consultation" && (
//                 <div className="grid grid-cols-2 gap-4 p-4 bg-brand-active/50 rounded-2xl border border-brand-active">
//                   <div className="space-y-2">
//                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                       Specialization (Optional)
//                     </label>
//                     <select
//                       className="w-full px-5 py-4 bg-white border border-brand-active rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand-active0/10 outline-none appearance-none"
//                       value={formData.specialization_code}
//                       onChange={(e) =>
//                         setFormData({
//                           ...formData,
//                           specialization_code: e.target.value,
//                         })
//                       }
//                     >
//                       <option value="">No Specialization</option>
//                       {specializations.map((s) => (
//                         <option key={s.id} value={s.code}>
//                           {s.name} ({s.code})
//                         </option>
//                       ))}
//                     </select>
//                   </div>
//                   <div className="space-y-2">
//                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                       Doctor (Optional)
//                     </label>
//                     <select
//                       className="w-full px-5 py-4 bg-white border border-brand-active rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand-active0/10 outline-none appearance-none"
//                       value={formData.doctor_id}
//                       onChange={(e) =>
//                         setFormData({ ...formData, doctor_id: e.target.value })
//                       }
//                     >
//                       <option value="">No Doctor</option>
//                       {doctors.map((d) => (
//                         <option key={d.doctor_id} value={d.doctor_id}>
//                           {d.first_name} {d.last_name} ({d.specialization_code})
//                         </option>
//                       ))}
//                     </select>
//                   </div>
//                 </div>
//               )}

              

//               <div className="grid grid-cols-2 gap-4">
//                 <div className="space-y-2">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                     Payer Type
//                   </label>
//                   <select
//                     required
//                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none appearance-none"
//                     value={formData.payer_type_id}
//                     onChange={(e) =>
//                       setFormData({
//                         ...formData,
//                         payer_type_id: e.target.value,
//                       })
//                     }
//                   >
//                     <option value="">Select Payer...</option>
//                     {payers.map((p) => (
//                       <option key={p.id} value={p.id}>
//                         {p.name}
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//                 <div className="space-y-2">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                     Unit Price (₦)
//                   </label>
//                   <input
//                     required
//                     type="number"
//                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none"
//                     value={formData.unit_price}
//                     onChange={(e) =>
//                       setFormData({ ...formData, unit_price: e.target.value })
//                     }
//                   />
//                 </div>
//               </div>

//               <div className="grid grid-cols-2 gap-4">
//                 <div className="space-y-2">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
//                     <Calendar size={12} /> Effective From
//                   </label>
//                   <input
//                     required
//                     type="date"
//                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none"
//                     value={formData.effective_from}
//                     onChange={(e) =>
//                       setFormData({
//                         ...formData,
//                         effective_from: e.target.value,
//                       })
//                     }
//                   />
//                 </div>
//                 <div className="space-y-2">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
//                     <Calendar size={12} /> Valid To (Optional)
//                   </label>
//                   <input
//                     type="date"
//                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none"
//                     value={formData.effective_to}
//                     onChange={(e) =>
//                       setFormData({ ...formData, effective_to: e.target.value })
//                     }
//                   />
//                 </div>
//               </div>

//               <div
//                 className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer"
//                 onClick={() =>
//                   setFormData({
//                     ...formData,
//                     is_active: formData.is_active ? 0 : 1,
//                   })
//                 }
//               >
//                 <div
//                   className={`w-10 h-6 rounded-full p-1 transition-all ${formData.is_active ? "bg-emerald-500" : "bg-slate-300"}`}
//                 >
//                   <div
//                     className={`w-4 h-4 bg-white rounded-full shadow-sm transition-all ${formData.is_active ? "translate-x-4" : "translate-x-0"}`}
//                   />
//                 </div>
//                 <span className="text-xs font-bold text-slate-600">
//                   Service is Active & Billable
//                 </span>
//               </div>
//             </div>

//             <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
//               <button
//                 type="button"
//                 onClick={() => setShowModal(false)}
//                 disabled={isSubmitting}
//                 className="px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-800"
//               >
//                 Cancel
//               </button>
//               <button
//                 type="submit"
//                 disabled={isSubmitting}
//                 className="bg-emerald-600 text-white px-10 py-3 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-2"
//               >
//                 {isSubmitting ? (
//                   <Loader2 size={16} className="animate-spin" />
//                 ) : (
//                   <Save size={16} />
//                 )}
//                 Save Tariff
//               </button>
//             </div>
//           </form>
//         </div>
//       )}

//       {/* Components Manager Modal */}
//       {componentTariff && (
//         <TariffComponentsModal 
//           tariff={componentTariff} 
//           onClose={() => setComponentTariff(null)} 
//         />
//       )}
//     </div>
//   );
// };

// export default BillingPricing;
