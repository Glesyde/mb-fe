import React, { useState, useEffect } from 'react';
import {
  Search,
  User,
  Bed,
  Calendar,
  CreditCard,
  FileText,
  ChevronDown,
  ChevronRight,
  Printer,
  Loader2,
  AlertCircle,
  Save,
  MoreHorizontal,
  Stethoscope,
  Building2,
  Wallet,
  CheckCircle2,
  RotateCcw,
  LogOut,
  X,
  Plus,
  Tag,
  Trash2
} from 'lucide-react';
import { billingService } from '../services/billing.service';
import { patientService } from '../services/patient.service';
import { wardService } from '../services/ward.service';
import { useNotification } from '../context/NotificationContext';
import IPDAddServiceModal from './IPDAddServiceModal';
import ReversalModal from './ReversalModal';
import AuditBillModal from './AuditBillModal'; // <-- IMPORT ADDED HERE

interface ClinicalHeader {
  mrn: string;
  patient_name: string;
  age_gender: string;
  admitting_dr: string;
  ward_location: string;
}

interface Administrative {
  admission_id: number;
  admission_no: string;
  encounter_id?: number;
  encounter_no: string;
  encounter_type: string;
  date_admitted: string;
  status: string;
  discharge_stage: string;
  payer: string;
  policy_no: string;
}

interface FinancialPosition {
  gross_current_bill: number;
  total_discounts: number;
  net_current_bill: number;
  insurance_copay: number;
  current_debt: number;
  previous_debt: number;
  total_patient_debt: number;
  current_advance: number;
  ledger_balance: number;
  total_amount_payable: number;
}

interface BillingGroup {
  dept_total: number;
  items: any[];
}

interface BillingStatement {
  clinical_header: ClinicalHeader;
  administrative: Administrative;
  financial_position: FinancialPosition;
  billing_groups: Record<string, BillingGroup>;
  provisional_total: number;
}

interface Encounter {
  id: number;
  encounter_number: string;
  encounter_type: string;
  encounter_status: string;
  visit_reason: string | null;
  created_at: string;
}

const IPDBilling: React.FC = () => {
  const { notify } = useNotification();

  // State
  const [searchMrn, setSearchMrn] = useState('');
  const [loading, setLoading] = useState(false);
  const [patient, setPatient] = useState<any>(null);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [selectedEncounterId, setSelectedEncounterId] = useState('');
  const [billingStatement, setBillingStatement] = useState<BillingStatement | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('department');
  const [actionLoading, setActionLoading] = useState(false);
  const [breakdownModal, setBreakdownModal] = useState<{ isOpen: boolean; itemName: string; breakdown: any[] }>({ isOpen: false, itemName: '', breakdown: [] });
  const [viewDiscountModal, setViewDiscountModal] = useState<{ isOpen: boolean; itemName: string; discount: any }>({ isOpen: false, itemName: '', discount: null });
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  
  // <-- NEW STATE FOR AUDIT MODAL ADDED HERE
  const [showAuditModal, setShowAuditModal] = useState(false); 
  
  const [showReversalModal, setShowReversalModal] = useState<{
    admissionId: number;
    action: string;
    title: string;
    description: string;
    patientName: string;
  } | null>(null);

  // Discount State
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountTarget, setDiscountTarget] = useState<"ITEM" | "BILL">("BILL");
  const [discountItemId, setDiscountItemId] = useState<number | null>(null);
  const [unapplyDiscountModal, setUnapplyDiscountModal] = useState<{ billableItemId: number | null } | null>(null);
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FLAT" | "WAIVER">("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState<number | "">("");
  const [discountReason, setDiscountReason] = useState("");
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const [totalDiscountAmount, setTotalDiscountAmount] = useState(0);
  const [hasInvoiceLevelDiscount, setHasInvoiceLevelDiscount] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [deleteItemModal, setDeleteItemModal] = useState<{ rowId: number; billableItemId: number | null; orderId: number | null; remarks: string } | null>(null);

  const removeItem = (rowId: number, billableItemId?: number | null) => {
    setDeleteItemModal({ rowId, billableItemId: billableItemId ?? null, orderId: rowId, remarks: "" });
  };

  const performRemoveItem = async () => {
    if (!deleteItemModal) return;
    const { rowId, billableItemId, orderId, remarks } = deleteItemModal;
    const encounterNum = selectedEncounterId;
    if (!encounterNum) { notify('No encounter selected', 'error'); return; }
    setDeleteItemModal(null);
    setRemovingId(String(rowId));
    try {
      await billingService.deleteOrder(encounterNum, { billableItemId, orderId }, remarks);
      notify('Item deleted successfully', 'success');
      fetchBillingStatement(encounterNum);
    } catch (err: any) {
      notify(err?.response?.data?.message || 'Failed to delete item', 'error');
    } finally {
      setRemovingId(null);
    }
  };

  const handleSearch = async () => {
    if (!searchMrn.trim()) {
      notify("Please enter an MRN", "error");
      return;
    }

    setLoading(true);
    setPatient(null);
    setEncounters([]);
    setBillingStatement(null);
    setSelectedEncounterId('');

    try {
      const res = await patientService.getPatientHistory(searchMrn);
      if (res && res.patient) {
        setPatient(res.patient);
        const encs = res.encounters || [];

        const activeEncounters = encs.filter((enc: Encounter) =>
          enc.encounter_type === 'IPD' && enc.encounter_status !== 'CLOSED'
        );

        setEncounters(activeEncounters);

        if (activeEncounters.length > 0) {
          const latest = activeEncounters[0];
          setSelectedEncounterId(latest.encounter_number);
          fetchBillingStatement(latest.encounter_number);
        } else {
          notify("No active IPD encounters found for this patient", "info");
        }
      } else {
        notify("Patient not found", "error");
      }
    } catch (error: any) {
      console.error("Search Error:", error);
      notify(error.response?.data?.message || error.message || "Failed to fetch patient history", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchBillingStatement = async (encounterNumber: string) => {
    if (!encounterNumber) return;

    setLoading(true);
    try {
      const res = await billingService.getIPDStatement(encounterNumber);
      if (res.status === 'success') {
        let statementData = res.data;
        if (statementData && statementData.data && statementData.data.clinical_header) {
          statementData = statementData.data;
        } else if (res.data && res.data.clinical_header) {
          statementData = res.data;
        }
        setBillingStatement(statementData || null);

        if (statementData?.discounts) {
          setTotalDiscountAmount(statementData.discounts.total_discount_amount || 0);
          setHasInvoiceLevelDiscount((statementData.discounts.invoice_level?.length || 0) > 0);
        } else {
          setTotalDiscountAmount(0);
          setHasInvoiceLevelDiscount(false);
        }

        setExpandedGroups(new Set());
      } else {
        notify(res.message || "Failed to fetch billing statement", "error");
        setBillingStatement(null);
      }
    } catch (error: any) {
      console.error("Statement Error:", error);
      notify(error.response?.data?.message || error.message || "Error fetching statement", "error");
      setBillingStatement(null);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyDiscount = async () => {
    const encounterNum = selectedEncounterId;
    const realEncounterId = billingStatement?.administrative?.encounter_id;

    if (!encounterNum || !realEncounterId) {
      notify("Please select an encounter first", "error");
      return;
    }

    if (!discountReason.trim()) {
      notify("Please provide a reason for the discount", "error");
      return;
    }

    if (discountType !== "WAIVER" && (!discountValue || Number(discountValue) <= 0)) {
      notify("Please provide a valid discount value", "error");
      return;
    }

    setIsApplyingDiscount(true);
    try {
      const payload: any = {
        encounter_id: realEncounterId,
        discount_type: discountType,
        value: discountType === "WAIVER" ? 0 : Number(discountValue),
        reason: discountReason
      };

      if (discountTarget === "ITEM" && discountItemId) {
        payload.billable_item_id = discountItemId;
      }

      const res = await billingService.applyDiscount(payload);
      if (res.status === "success") {
        notify("Discount applied successfully!", "success");
        setShowDiscountModal(false);
        setDiscountValue("");
        setDiscountReason("");
        fetchBillingStatement(encounterNum);
      } else {
        notify(res.message || "Failed to apply discount", "error");
      }
    } catch (err: any) {
      console.error("Discount apply error:", err);
      notify(err.response?.data?.message || "Error applying discount", "error");
    } finally {
      setIsApplyingDiscount(false);
    }
  };

  const handleUnapplyDiscount = async (billableItemId?: number | null) => {
    const encounterNum = selectedEncounterId;
    const realEncounterId = billingStatement?.administrative?.encounter_id;
    if (!encounterNum || !realEncounterId) {
      notify("Please select an encounter first", "error");
      return;
    }
    setIsApplyingDiscount(true);
    try {
      const payload: any = { encounter_id: realEncounterId };
      if (billableItemId) {
        payload.billable_item_id = billableItemId;
      }
      const res = await billingService.unapplyDiscount(payload);
      if (res.status === "success") {
        notify("Discount removed", "success");
        setUnapplyDiscountModal(null);
        fetchBillingStatement(encounterNum);
      } else {
        notify(res.message || "Failed to remove discount", "error");
      }
    } catch (err: any) {
      console.error("Unapply discount error:", err);
      notify(err.response?.data?.message || "Error removing discount", "error");
    } finally {
      setIsApplyingDiscount(false);
    }
  };

  const handleDischargeAction = async (action: string) => {
    const admin = billingStatement?.administrative as any;
    const rawId = admin?.admission_id || admin?.id;
    const admissionId = rawId ? Number(rawId) : null;

    if (!admissionId || isNaN(admissionId)) {
      notify('Admission ID not found or invalid in billing statement', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const patientName = billingStatement?.clinical_header?.patient_name || '';

      if (['reverseBillingFileReceived', 'reverseBillingClearance'].includes(action)) {
        setShowReversalModal({
          admissionId,
          action,
          patientName,
          title: action === 'reverseBillingFileReceived' ? 'Reverse Billing File Received' : 'Reverse Billing Clearance',
          description: `Are you sure you want to reverse the ${action === 'reverseBillingFileReceived' ? 'billing file received' : 'billing clearance'} status?`
        });
        setActionLoading(false);
        return;
      }

      if (action === 'billingFileReceived') await wardService.billingFileReceived(admissionId);
      else if (action === 'billingClearance') await wardService.billingClearance(admissionId);
      else if (action === 'finalizeDischarge') await wardService.finalizeDischarge(admissionId);

      notify('Action successful', 'success');
      fetchBillingStatement(selectedEncounterId);
    } catch (err: any) {
      notify(err.response?.data?.message || 'Failed to perform action', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEncounterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedEncounterId(val);
    if (val) {
      fetchBillingStatement(val);
    } else {
      setBillingStatement(null);
    }
  };

  const toggleGroup = (groupName: string) => {
    const newSet = new Set(expandedGroups);
    if (newSet.has(groupName)) {
      newSet.delete(groupName);
    } else {
      newSet.add(groupName);
    }
    setExpandedGroups(newSet);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    if (dateString.includes(',')) return dateString;
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5] font-sans text-xs">
      {/* 1. HEADER BAR */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-600 text-white px-4 py-2 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-sm tracking-wide">IP Invoice</h1>

          <div className="flex items-center bg-white/10 rounded px-2 py-1 border border-white/20">
            <span className="text-white/70 mr-2 font-medium">UHID:</span>
            <input
              value={searchMrn}
              onChange={(e) => setSearchMrn(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="bg-transparent border-none outline-none text-white placeholder-white/40 w-32 font-medium"
              placeholder="Enter MRN"
            />
            <Search
              size={14}
              className="text-white/70 cursor-pointer hover:text-white ml-2"
              onClick={handleSearch}
            />
          </div>

          {encounters.length > 0 && (
            <div className="flex items-center bg-white/10 rounded px-2 py-1 border border-white/20">
              <span className="text-white/70 mr-2 font-medium">Visit:</span>
              <select
                value={selectedEncounterId}
                onChange={handleEncounterChange}
                className="bg-transparent border-none outline-none text-white w-48 font-medium [&>option]:text-slate-800"
              >
                {encounters.map(enc => (
                  <option key={enc.id} value={enc.encounter_number}>
                    {enc.encounter_number}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {loading && <Loader2 size={16} className="animate-spin text-white/80" />}
          <button className="bg-brand-primary hover:bg-brand-active0 text-white px-3 py-1 rounded text-xs font-bold transition-colors border border-brand-primary shadow-sm flex items-center gap-1">
            <MoreHorizontal size={14} /> Notes
          </button>
        </div>
      </div>

      {/* 2. PATIENT DETAILS BANNER */}
      {billingStatement && billingStatement.clinical_header ? (
        <div className="bg-[#e6f0ff] border-b border-brand-active p-3 shrink-0">
          <div className="grid grid-cols-12 gap-4">
            {/* Col 1: Photo & Status */}
            <div className="col-span-2 flex flex-col items-center gap-2 border-r border-brand-active pr-2">
              <div className="w-16 h-16 bg-white border border-brand-active rounded-md flex items-center justify-center text-brand-primary shadow-sm">
                <User size={32} />
              </div>
              <div className="flex flex-col gap-1 w-full text-center">
                <div className="font-bold text-slate-800 text-sm truncate" title={billingStatement.clinical_header.patient_name}>
                  {billingStatement.clinical_header.patient_name}
                </div>
                <div className="text-xs text-slate-600 truncate" title={billingStatement.clinical_header.age_gender}>
                  {billingStatement.clinical_header.age_gender}
                </div>
                
                {/* CORRECTED AUDIT BUTTON CLICK HANDLER */}
                <button 
                  onClick={() => setShowAuditModal(true)}
                  className="bg-brand-primary text-white text-[10px] font-bold py-1 px-2 rounded shadow-sm hover:bg-brand-primary w-full mt-1"
                >
                  Audit Bill
                </button>
                
                <div className="bg-slate-600 text-white text-[10px] font-bold py-1 px-2 rounded shadow-sm text-center w-full">
                  {billingStatement.administrative.status}
                </div>
              </div>
            </div>

            {/* Col 2: Invoice Details */}
            <div className="col-span-3 space-y-1.5 border-r border-brand-active pr-2">
              <h3 className="text-brand-primary font-bold border-b border-brand-active pb-1 mb-1">Invoice Details</h3>
              <div className="grid grid-cols-[80px_1fr] gap-1 items-center">
                <span className="text-slate-500 font-medium">IP No.</span>
                <span className="font-bold text-slate-800 truncate" title={billingStatement.administrative.encounter_no}>
                  {billingStatement.administrative.encounter_no}
                </span>
              </div>
              <div className="grid grid-cols-[80px_1fr] gap-1 items-center">
                <span className="text-slate-500 font-medium">Type</span>
                <span className="font-bold text-slate-800">Credit</span>
              </div>
              <div className="grid grid-cols-[80px_1fr] gap-1 items-center">
                <span className="text-slate-500 font-medium">Inv. Date</span>
                <span className="font-bold text-slate-800">{new Date().toLocaleDateString()}</span>
              </div>
              <div className="grid grid-cols-[80px_1fr] gap-1 items-center">
                <span className="text-slate-500 font-medium">Admission</span>
                <span className="font-bold text-slate-800 truncate" title={billingStatement.administrative.date_admitted}>
                  {billingStatement.administrative.date_admitted}
                </span>
              </div>
              <div className="grid grid-cols-[80px_1fr] gap-1 items-center">
                <span className="text-slate-500 font-medium">Stage</span>
                <span className="font-bold text-slate-800 truncate">
                  {billingStatement.administrative.discharge_stage}
                </span>
              </div>
            </div>

            {/* Col 3: Payor Details */}
            <div className="col-span-4 space-y-1.5 border-r border-brand-active pr-2">
              <h3 className="text-brand-primary font-bold border-b border-brand-active pb-1 mb-1">Payor Details</h3>
              <div className="grid grid-cols-[80px_1fr] gap-1 items-center">
                <span className="text-slate-500 font-medium">Payer</span>
                <span className="font-bold text-slate-800 truncate" title={billingStatement.administrative.payer}>
                  {billingStatement.administrative.payer}
                </span>
              </div>
              <div className="grid grid-cols-[80px_1fr] gap-1 items-center">
                <span className="text-slate-500 font-medium">Policy No</span>
                <span className="font-bold text-slate-800 truncate">{billingStatement.administrative.policy_no || '-'}</span>
              </div>
              <div className="grid grid-cols-[80px_1fr] gap-1 items-center">
                <span className="text-slate-500 font-medium">Consultant</span>
                <span className="font-bold text-slate-800 truncate" title={billingStatement.clinical_header.admitting_dr}>
                  {billingStatement.clinical_header.admitting_dr}
                </span>
              </div>
              <div className="grid grid-cols-[80px_1fr] gap-1 items-center">
                <span className="text-slate-500 font-medium">Ward/Bed</span>
                <span className="font-bold text-slate-800 truncate" title={billingStatement.clinical_header.ward_location}>
                  {billingStatement.clinical_header.ward_location}
                </span>
              </div>
            </div>

            {/* Col 4: Other Details (Financials) */}
            <div className="col-span-3 space-y-1.5 max-h-48 overflow-y-auto pr-2">
              <h3 className="text-brand-primary font-bold border-b border-brand-active pb-1 mb-1">Financial Position</h3>
              <div className="grid grid-cols-[120px_1fr] gap-1 items-center">
                <span className="text-slate-500 font-medium">Gross Bill</span>
                <span className="font-bold text-slate-800 text-right">{formatCurrency(billingStatement.financial_position.gross_current_bill)}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-1 items-center">
                <span className="text-slate-500 font-medium">Discounts</span>
                <span className="font-bold text-red-500 text-right">-{formatCurrency(billingStatement.financial_position.total_discounts)}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-1 items-center">
                <span className="text-slate-500 font-medium">Net Bill</span>
                <span className="font-bold text-slate-800 text-right">{formatCurrency(billingStatement.financial_position.net_current_bill)}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-1 items-center">
                <span className="text-slate-500 font-medium">Insurance Copay</span>
                <span className="font-bold text-slate-800 text-right">{formatCurrency(billingStatement.financial_position.insurance_copay)}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-1 items-center">
                <span className="text-slate-500 font-medium">Current Debt</span>
                <span className="font-bold text-slate-800 text-right">{formatCurrency(billingStatement.financial_position.current_debt)}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-1 items-center">
                <span className="text-slate-500 font-medium">Previous Debt</span>
                <span className="font-bold text-slate-800 text-right">{formatCurrency(billingStatement.financial_position.previous_debt)}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-1 items-center">
                <span className="text-slate-500 font-medium">Total Debt</span>
                <span className="font-bold text-slate-800 text-right">{formatCurrency(billingStatement.financial_position.total_patient_debt)}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-1 items-center">
                <span className="text-slate-500 font-medium">Current Advance</span>
                <span className="font-bold text-slate-800 text-right">{formatCurrency(billingStatement.financial_position.current_advance)}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-1 items-center">
                <span className="text-slate-500 font-medium">Ledger Balance</span>
                <span className="font-bold text-slate-800 text-right">{formatCurrency(billingStatement.financial_position.ledger_balance)}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-1 items-center bg-brand-active p-1 rounded">
                <span className="text-brand-primary font-bold">Total Payable</span>
                <span className="font-black text-brand-primary text-right">{formatCurrency(billingStatement.financial_position.total_amount_payable)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#e6f0ff] border-b border-brand-active p-8 shrink-0 flex items-center justify-center text-brand-primary">
          <div className="text-center">
            <Search size={40} className="mx-auto mb-2 opacity-50" />
            <p className="font-medium">Search for a patient to view details</p>
          </div>
        </div>
      )}

      {/* 3. TABS */}
      <div className="bg-[#d0e1f5] border-b border-brand-primary px-2 flex items-end gap-1 shrink-0 h-8">
        <button
          onClick={() => setActiveTab('department')}
          className={`px-4 py-1.5 text-xs font-bold rounded-t-lg transition-colors ${activeTab === 'department'
              ? 'bg-white text-brand-primary border-t border-x border-brand-primary shadow-sm mb-[-1px] z-10'
              : 'bg-transparent text-slate-600 hover:bg-white/50'
            }`}
        >
          Department Wise
        </button>
        <button
          onClick={() => setActiveTab('checklist')}
          className={`px-4 py-1.5 text-xs font-bold rounded-t-lg transition-colors ${activeTab === 'checklist'
              ? 'bg-white text-brand-primary border-t border-x border-brand-primary shadow-sm mb-[-1px] z-10'
              : 'bg-transparent text-slate-600 hover:bg-white/50'
            }`}
        >
          Checklist
        </button>
      </div>

      {/* 4. MAIN CONTENT AREA */}
      <div className="flex-1 overflow-auto bg-white p-2">
        {billingStatement && billingStatement.billing_groups ? (
          <div className="border border-slate-300 rounded shadow-sm bg-white min-h-full">
            {/* Toolbar */}
            <div className="flex justify-between items-center p-2 border-b border-slate-200 bg-slate-50/50">
              <button
                onClick={() => setIsAddServiceModalOpen(true)}
                className="flex items-center gap-1 bg-brand-primary text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-brand-primary/90 transition-colors shadow-sm"
              >
                <Plus size={14} /> Add Service
              </button>
            </div>
            
            {/* Table Header */}
            <div className="grid grid-cols-[40px_1fr_100px_80px_60px_100px_100px_50px_36px_80px] bg-[#eef4fa] border-b border-slate-300 text-slate-700 font-bold py-2 px-4 sticky top-0 z-10 text-xs">
              <div className="text-center">#</div>
              <div>Item Name</div>
              <div>Date</div>
              <div className="text-right">Rate</div>
              <div className="text-center">Qty</div>
              <div className="text-right text-indigo-500">Discount</div>
              <div className="text-right">Net Total</div>
              <div className="text-center" title="Apply item discount"><Tag size={12} className="mx-auto text-indigo-400" /></div>
              <div className="text-center" title="Delete item"><Trash2 size={12} className="mx-auto text-red-300" /></div>
              <div className="text-center">Status</div>
            </div>

            {/* Groups */}
            <div className="divide-y divide-slate-200">
              {Object.entries(billingStatement.billing_groups).map(([groupKey, group]: [string, any]) => {
                const isExpanded = expandedGroups.has(groupKey);
                const groupTitle = groupKey.replace(/_/g, ' ').toUpperCase();

                return (
                  <div key={groupKey} className="bg-white">
                    {/* Group Header Row */}
                    <div
                      onClick={() => toggleGroup(groupKey)}
                      className="flex items-center justify-between px-4 py-2 bg-[#f8fafc] hover:bg-[#f1f5f9] cursor-pointer transition-colors border-b border-slate-100"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90 text-brand-primary' : ''}`}>
                          <ChevronRight size={14} />
                        </div>
                        <span className="font-bold text-brand-primary text-xs">{groupTitle}</span>
                        <span className="text-[10px] text-slate-500 bg-slate-200 px-1.5 rounded-full">
                          {group.items.length}
                        </span>
                      </div>
                      <div className="font-bold text-slate-800">
                        {formatCurrency(group.dept_total)}
                      </div>
                    </div>

                    {/* Group Items */}
                    {isExpanded && (
                      <div className="bg-white">
                        {group.items.flatMap((item: any) => {
                          if (item.drugs && Array.isArray(item.drugs) && item.drugs.length > 0) {
                            return item.drugs.map((drug: any, dIdx: number) => ({
                              id: `${item.id}-drug-${dIdx}`,
                              item_name: `${drug.drug_name} (${drug.dosage} - ${drug.frequency})`,
                              date: drug.date,
                              rate: drug.rate,
                              nos: drug.qty,
                              total: drug.total,
                              status: item.status,
                              billable_item_id: item.billable_item_id,
                              parent_discount: item.discount_applied,
                              requested_by: item.requested_by,
                              cancelled_by: item.cancelled_by
                            }));
                          }
                          // Bundled consumable lines (e.g. "Consumables Used") carry the real
                          // per-item breakdown in `details` — expand those instead of showing the generic label.
                          if (item.details && Array.isArray(item.details) && item.details.length > 0) {
                            return item.details.map((detail: any, dIdx: number) => ({
                              id: `${item.id}-detail-${dIdx}`,
                              item_name: detail.name,
                              date: item.date,
                              rate: detail.rate,
                              nos: detail.qty,
                              total: detail.total,
                              status: item.status,
                              billable_item_id: item.billable_item_id,
                              parent_discount: item.discount_applied,
                              requested_by: item.requested_by,
                              cancelled_by: item.cancelled_by
                            }));
                          }
                          return [{
                            ...item,
                            billable_item_id: item.billable_item_id,
                            parent_discount: item.discount_applied
                          }];
                        }).map((item: any, idx: number) => (
                          <div
                            key={item.id}
                          className={`grid grid-cols-[40px_1fr_100px_80px_60px_100px_100px_50px_36px_80px] py-1.5 px-4 border-b border-slate-100 hover:bg-brand-active/30 transition-colors text-slate-600 items-center ${removingId === String(item.id) ? 'opacity-50 pointer-events-none' : ''}`}
                          >
                            <div className="text-center text-slate-400 text-[10px]">{idx + 1}</div>
                            <div className="font-medium truncate pr-2 flex flex-col justify-center" title={item.item_name}>
                              <div className="flex items-center gap-2">
                                <span className="truncate">{item.item_name}</span>
                                {item.fee_breakdown && item.fee_breakdown.length > 0 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setBreakdownModal({ isOpen: true, itemName: item.item_name, breakdown: item.fee_breakdown });
                                    }}
                                    className="flex items-center gap-1 text-[9px] font-bold text-brand-primary hover:text-brand-active0 bg-brand-primary/10 hover:bg-brand-primary/20 px-2 py-1 rounded-full transition-colors shrink-0"
                                  >
                                    <FileText size={10} />
                                    <span>Fee Breakdown</span>
                                  </button>
                                )}
                              </div>
                              {(item.requested_by || item.cancelled_by) && (
                                <div className="text-[10px] mt-0.5 flex gap-2">
                                  {item.requested_by?.name && <span className="text-slate-400">Ordered by: {item.requested_by.name}</span>}
                                  {item.cancelled_by?.name && <span className="text-red-400">Cancelled by: {item.cancelled_by.name}</span>}
                                </div>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500">{item.date}</div>
                            <div className="text-right">{formatCurrency(item.rate)}</div>
                            <div className="text-center">{item.nos}</div>
                            {/* Discount column */}
                            <div className="text-right">
                              {item.parent_discount && item.parent_discount.amount > 0 ? (
                                <div className="flex flex-col items-end gap-1">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[11px] font-bold text-indigo-600">-{formatCurrency(item.parent_discount.amount)}</span>
                                    {item.billable_item_id && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setUnapplyDiscountModal({ billableItemId: item.billable_item_id });
                                        }}
                                        className="text-red-400 hover:text-red-600 transition-colors"
                                        title="Remove discount"
                                      >
                                        <X size={10} />
                                      </button>
                                    )}
                                  </div>
                                  <span className="text-[9px] font-semibold text-indigo-500 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                                    {item.parent_discount.type === 'PERCENTAGE' ? `${item.parent_discount.value}% off` : item.parent_discount.type === 'WAIVER' ? 'WAIVER' : `FLAT`}
                                  </span>
                                  {item.parent_discount.reason && (
                                    <span
                                      className="text-[9px] text-slate-400 italic text-right max-w-[90px] leading-tight cursor-pointer hover:text-indigo-500 hover:underline decoration-indigo-300 decoration-dashed transition-colors"
                                      title="Click to view full reason"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setViewDiscountModal({ isOpen: true, itemName: item.item_name, discount: item.parent_discount });
                                      }}
                                    >
                                      {item.parent_discount.reason.length > 20 ? item.parent_discount.reason.slice(0, 20) + '…' : item.parent_discount.reason}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-300 text-[10px]">—</span>
                              )}
                            </div>
                            {/* Net Total column */}
                            <div className="text-right font-bold">
                              {item.parent_discount && item.parent_discount.amount > 0 ? (
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className="text-[10px] text-slate-400 line-through">{formatCurrency(item.gross_total ?? item.total)}</span>
                                  <span className="text-emerald-600 font-bold">{formatCurrency(item.net_total ?? (item.total - item.parent_discount.amount))}</span>
                                </div>
                              ) : (
                                <span className="text-slate-800">{formatCurrency(item.total)}</span>
                              )}
                            </div>
                            {/* Per-item discount button */}
                            <div className="flex items-center justify-center">
                              {item.billable_item_id ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDiscountTarget("ITEM");
                                    setDiscountItemId(item.billable_item_id);
                                    setDiscountType("PERCENTAGE");
                                    setDiscountValue("");
                                    setDiscountReason("");
                                    setShowDiscountModal(true);
                                  }}
                                  className="group p-1.5 rounded-lg hover:bg-indigo-50 text-slate-300 hover:text-indigo-600 transition-all"
                                  title="Apply item discount"
                                >
                                  <Tag size={12} />
                                </button>
                              ) : (
                                <span className="text-slate-200">—</span>
                              )}
                            </div>
                            {/* Per-item delete button */}
                            <div className="flex items-center justify-center">
                              {item.id ? (
                                removingId === String(item.id) ? (
                                  <Loader2 size={12} className="animate-spin text-red-400" />
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeItem(item.id, item.billable_item_id);
                                    }}
                                    className="group p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all"
                                    title="Delete item"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )
                              ) : (
                                <span className="text-slate-200">—</span>
                              )}
                            </div>
                            <div className="text-center">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${item.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  item.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    'bg-slate-50 text-slate-600 border-slate-200'
                                }`}>
                                {item.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400">
            <p>No billing items to display</p>
          </div>
        )}
      </div>

      {/* 5. FOOTER */}
      <div className="bg-[#d0e1f5] border-t border-brand-primary p-3 shrink-0 flex flex-col gap-3">

        {/* Top Row: Discount controls (inline, compact) + Net Payable */}
        <div className="flex items-center justify-between gap-4">

          {/* LEFT — compact inline discount row */}
          <div className="flex items-center gap-3 flex-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Discount:</span>

            {/* Bill-level button */}
            {billingStatement && (
              <button
                onClick={() => {
                  setDiscountTarget("BILL");
                  setDiscountItemId(null);
                  setDiscountType("PERCENTAGE");
                  setDiscountValue("");
                  setDiscountReason("");
                  setShowDiscountModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-bold transition-colors"
              >
                <Tag size={11} /> Apply to Bill
              </button>
            )}

            {/* Hint for item-level */}
            <span className="text-[10px] text-slate-400 font-medium">
              Use <Tag size={9} className="inline -mt-0.5 text-indigo-400" /> on a row for item discount
            </span>

            {/* Total discount pill — only visible when active */}
            {totalDiscountAmount > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                <CheckCircle2 size={10} />
                -{formatCurrency(totalDiscountAmount)} off
              </span>
            )}

            {/* Remove invoice-level discount */}
            {hasInvoiceLevelDiscount && (
              <button
                onClick={() => setUnapplyDiscountModal({ billableItemId: null })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-lg text-[10px] font-bold transition-colors"
              >
                <X size={11} /> Remove Bill Discount
              </button>
            )}
          </div>

          {/* RIGHT — Net Payable + Print */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Net Payable</span>
              <span className="text-2xl font-black text-brand-primary leading-tight">
                {billingStatement ? formatCurrency(billingStatement.provisional_total) : '₦0.00'}
              </span>
            </div>
            <button
              onClick={() => window.open(`/print/billing/ipd/${billingStatement?.administrative?.encounter_no}`, '_blank')}
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded font-bold shadow-sm flex items-center gap-2 transition-colors"
            >
              <Printer size={16} /> Print
            </button>
          </div>
        </div>

        {/* Discharge Actions Row */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-brand-active/50">
          {billingStatement && (() => {
            const stage = billingStatement.administrative.discharge_stage;
            const isPharmacyClearance = stage === 'PHARMACY_CLEARANCE';
            const isBillingFileReceived = stage === 'BILLING_FILE_RECEIVED';
            const isBillingClearance = stage === 'BILLING_CLEARANCE';

            return (
              <>
                <button
                  onClick={() => isPharmacyClearance && handleDischargeAction('billingFileReceived')}
                  disabled={actionLoading || !isPharmacyClearance}
                  title={!isPharmacyClearance ? "Requires Pharmacy Clearance first, or file already received." : ""}
                  className={`px-4 py-2 rounded font-bold shadow-sm flex items-center gap-2 transition-colors ${isPharmacyClearance && !actionLoading ? 'bg-teal-600 hover:bg-teal-500 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                    }`}
                >
                  {actionLoading && isPharmacyClearance ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Receive File
                </button>

                <button
                  onClick={() => isBillingFileReceived && handleDischargeAction('reverseBillingFileReceived')}
                  disabled={actionLoading || !isBillingFileReceived}
                  title={!isBillingFileReceived ? "Can only reverse if file was just received." : ""}
                  className={`px-4 py-2 rounded font-bold shadow-sm flex items-center gap-2 transition-colors ${isBillingFileReceived && !actionLoading ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                    }`}
                >
                  {actionLoading && isBillingFileReceived ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />} Reverse File
                </button>

                <button
                  onClick={() => isBillingFileReceived && handleDischargeAction('billingClearance')}
                  disabled={actionLoading || !isBillingFileReceived}
                  title={!isBillingFileReceived ? "Requires Billing File Received first, or already cleared." : ""}
                  className={`px-4 py-2 rounded font-bold shadow-sm flex items-center gap-2 transition-colors ${isBillingFileReceived && !actionLoading ? 'bg-teal-600 hover:bg-teal-500 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                    }`}
                >
                  {actionLoading && isBillingFileReceived ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Clear Billing
                </button>

                <button
                  onClick={() => isBillingClearance && handleDischargeAction('reverseBillingClearance')}
                  disabled={actionLoading || !isBillingClearance}
                  title={!isBillingClearance ? "Can only reverse if currently at Billing Clearance stage." : ""}
                  className={`px-4 py-2 rounded font-bold shadow-sm flex items-center gap-2 transition-colors ${isBillingClearance && !actionLoading ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                    }`}
                >
                  {actionLoading && isBillingClearance ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />} Reverse Clearance
                </button>

                <button
                  onClick={() => isBillingClearance && handleDischargeAction('finalizeDischarge')}
                  disabled={actionLoading || !isBillingClearance}
                  title={!isBillingClearance ? "Requires Billing Clearance first." : ""}
                  className={`px-4 py-2 rounded font-bold shadow-sm flex items-center gap-2 transition-colors ${isBillingClearance && !actionLoading ? 'bg-brand-primary hover:bg-brand-active0 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                    }`}
                >
                  {actionLoading && isBillingClearance ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />} Finalize Discharge
                </button>
              </>
            );
          })()}
        </div>

        <div className="flex justify-between items-center pt-1 text-[10px] text-slate-500">
          <span>Facilitator Name: System</span>
          <span>Billing Currency: NGN</span>
        </div>
      </div>

      {/* Fee Breakdown Modal */}
      {breakdownModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-[90vw] max-w-[1200px] h-[90vh] max-h-[900px] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
              <div>
                <h3 className="text-3xl font-black text-slate-800 mb-2">Fee Breakdown</h3>
                <p className="text-lg text-slate-500 font-medium">{breakdownModal.itemName}</p>
              </div>
              <button 
                onClick={() => setBreakdownModal({ isOpen: false, itemName: '', breakdown: [] })} 
                className="p-3 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <X size={28} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="py-5 px-8 text-base font-black text-slate-500 uppercase tracking-widest w-20">#</th>
                      <th className="py-5 px-8 text-base font-black text-slate-500 uppercase tracking-widest">Component Name</th>
                      <th className="py-5 px-8 text-base font-black text-slate-500 uppercase tracking-widest">Type</th>
                      <th className="py-5 px-8 text-base font-black text-slate-500 uppercase tracking-widest text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {breakdownModal.breakdown.map((fee: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-6 px-8 text-lg text-slate-400">{idx + 1}</td>
                        <td className="py-6 px-8 text-xl font-bold text-slate-800">
                          {fee.component_name}
                          {fee.is_mandatory ? (
                            <span className="ml-4 text-xs font-black bg-brand-active/20 text-brand-primary px-3 py-1 rounded uppercase tracking-widest align-middle">Mandatory</span>
                          ) : (
                            <span className="ml-4 text-xs font-black bg-slate-100 text-slate-500 px-3 py-1 rounded uppercase tracking-widest align-middle">Optional</span>
                          )}
                        </td>
                        <td className="py-6 px-8 text-base font-medium text-slate-500 uppercase tracking-wider">
                          {fee.component_type.replace(/_/g, ' ')}
                        </td>
                        <td className="py-6 px-8 text-2xl font-black text-slate-800 text-right">
                          {formatCurrency(fee.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-slate-200 bg-white flex justify-between items-center">
                <div className="text-lg font-medium text-slate-500">
                  Total Components: <span className="font-bold text-slate-800 text-xl">{breakdownModal.breakdown.length}</span>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-xl font-bold text-slate-500 uppercase tracking-widest">Total Amount</span>
                  <span className="text-5xl font-black text-brand-primary">
                      {formatCurrency(breakdownModal.breakdown.reduce((sum, fee) => sum + fee.amount, 0))}
                  </span>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Service Modal */}
      {isAddServiceModalOpen && billingStatement && (
        <IPDAddServiceModal
          isOpen={isAddServiceModalOpen}
          onClose={() => setIsAddServiceModalOpen(false)}
          patient={{ ...patient, payer_name: billingStatement.administrative.payer }}
          encounterNumber={selectedEncounterId}
          onSuccess={() => {
            fetchBillingStatement(selectedEncounterId);
            setIsAddServiceModalOpen(false);
          }}
        />
      )}

      <ReversalModal
        isOpen={!!showReversalModal}
        onClose={() => setShowReversalModal(null)}
        title={showReversalModal?.title || ''}
        description={showReversalModal?.description || ''}
        patientName={showReversalModal?.patientName}
        onConfirm={async (reason) => {
          if (!showReversalModal) return;
          const payload = { admission_id: showReversalModal.admissionId, reason };
          try {
            if (showReversalModal.action === 'reverseBillingFileReceived') await wardService.reverseBillingFileReceived(payload);
            else if (showReversalModal.action === 'reverseBillingClearance') await wardService.reverseBillingClearance(payload);
            notify('Reversal successful', 'success');
            setShowReversalModal(null);
            fetchBillingStatement(selectedEncounterId);
          } catch (err: any) {
            notify(err.response?.data?.message || 'Failed to reverse action', 'error');
            throw err;
          }
        }}
      />

      {/* Delete Item Modal */}
      {deleteItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <AlertCircle className="text-amber-500" size={16} />
                Delete Item
              </h3>
              <button
                onClick={() => setDeleteItemModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-slate-600">This action cannot be undone.</p>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason / Remarks</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Billed in error..."
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 transition-all resize-none"
                  value={deleteItemModal.remarks}
                  onChange={(e) => setDeleteItemModal({ ...deleteItemModal, remarks: e.target.value })}
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2 justify-end">
              <button
                onClick={() => setDeleteItemModal(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-300 transition-colors"
              >
                Close
              </button>
              <button
                onClick={performRemoveItem}
                disabled={!deleteItemModal.remarks.trim()}
                className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-black hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
              <div>
                <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <Tag className="text-indigo-600" size={18} />
                  {discountTarget === "ITEM" ? "Apply Item Discount" : "Apply Bill Discount"}
                </h3>
                <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded-full ${discountTarget === "ITEM" ? "bg-indigo-100 text-indigo-700" : "bg-purple-100 text-purple-700"}`}>
                    {discountTarget === "ITEM" ? "Single Item" : "Whole Bill"}
                  </span>
                  <span className="text-slate-400">{discountTarget === "ITEM" ? "— applies to selected charge only" : "— applies across entire invoice"}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDiscountModal(false);
                  setDiscountValue("");
                  setDiscountReason("");
                  setDiscountType("PERCENTAGE");
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 hover:bg-white rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Discount Type
                </label>
                <div className="relative">
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-sm font-medium text-slate-800 appearance-none bg-white"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat Amount</option>
                    <option value="WAIVER">Full Waiver</option>
                  </select>
                  <ChevronDown
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>

              {discountType !== "WAIVER" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Value
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                      className="w-full pl-3 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-sm font-medium text-slate-800"
                      placeholder={discountType === "PERCENTAGE" ? "e.g. 10" : "e.g. 5000"}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                      {discountType === "PERCENTAGE" ? "%" : "₦"}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason / Justification
                </label>
                <textarea
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-sm resize-none"
                  rows={3}
                  placeholder="Provide a reason for this discount..."
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
              <button
                onClick={() => setShowDiscountModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                disabled={isApplyingDiscount}
              >
                Cancel
              </button>
              <button
                onClick={handleApplyDiscount}
                disabled={isApplyingDiscount}
                className="px-6 py-2 text-xs font-bold text-white bg-indigo-600 border border-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isApplyingDiscount ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Applying...
                  </>
                ) : (
                  "Apply Discount"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Discount Reason Modal */}
      {viewDiscountModal.isOpen && viewDiscountModal.discount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Tag size={16} className="text-indigo-500" />
                Discount Details
              </h3>
              <button
                onClick={() => setViewDiscountModal({ isOpen: false, itemName: '', discount: null })}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-4 text-sm text-slate-600">
              <div>
                <span className="text-slate-400 text-xs uppercase font-bold tracking-wider">Item</span>
                <p className="font-medium text-slate-800 mt-0.5">{viewDiscountModal.itemName}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 text-xs uppercase font-bold tracking-wider">Amount</span>
                  <p className="font-bold text-indigo-600 mt-0.5">{formatCurrency(viewDiscountModal.discount.amount)}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-xs uppercase font-bold tracking-wider">Type</span>
                  <p className="font-semibold text-slate-700 mt-0.5">
                    {viewDiscountModal.discount.type === 'PERCENTAGE' 
                      ? `${viewDiscountModal.discount.value}% off` 
                      : viewDiscountModal.discount.type === 'WAIVER' ? 'Waiver' : 'Flat'}
                  </p>
                </div>
              </div>
              {viewDiscountModal.discount.reason && (
                <div>
                  <span className="text-slate-400 text-xs uppercase font-bold tracking-wider">Reason</span>
                  <div className="mt-1 p-3 bg-slate-50 border border-slate-200 rounded-lg whitespace-pre-wrap text-slate-700 leading-relaxed italic">
                    "{viewDiscountModal.discount.reason}"
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setViewDiscountModal({ isOpen: false, itemName: '', discount: null })}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded font-medium hover:bg-slate-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unapply Discount Confirmation Modal */}
      {unapplyDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <AlertCircle className="text-amber-500" size={16} />
                Remove Discount
              </h3>
              <button
                onClick={() => setUnapplyDiscountModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-slate-600">
                {unapplyDiscountModal.billableItemId
                  ? "This will remove the discount applied to this item."
                  : "This will remove the discount applied to the whole bill."}
              </p>
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2 justify-end">
              <button
                onClick={() => setUnapplyDiscountModal(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUnapplyDiscount(unapplyDiscountModal.billableItemId)}
                disabled={isApplyingDiscount}
                className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-black hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isApplyingDiscount ? "Removing..." : "Confirm Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUDIT BILL MODAL PLACEMENT CORRECTED HERE */}
      {billingStatement && (
        <AuditBillModal 
          isOpen={showAuditModal} 
          onClose={() => setShowAuditModal(false)} 
          encounterNumber={billingStatement.administrative.encounter_no} 
        />
      )}

    </div>
  );
};

export default IPDBilling;


// import React, { useState, useEffect } from 'react';
// import {
//   Search,
//   User,
//   Bed,
//   Calendar,
//   CreditCard,
//   FileText,
//   ChevronDown,
//   ChevronRight,
//   Printer,
//   Loader2,
//   AlertCircle,
//   Save,
//   MoreHorizontal,
//   Stethoscope,
//   Building2,
//   Wallet,
//   CheckCircle2,
//   RotateCcw,
//   LogOut,
//   X,
//   Plus,
//   Tag,
//   Trash2
// } from 'lucide-react';
// import { billingService } from '../services/billing.service';
// import { patientService } from '../services/patient.service';
// import { wardService } from '../services/ward.service';
// import { useNotification } from '../context/NotificationContext';
// import IPDAddServiceModal from './IPDAddServiceModal';
// import ReversalModal from './ReversalModal';

// interface ClinicalHeader {
//   mrn: string;
//   patient_name: string;
//   age_gender: string;
//   admitting_dr: string;
//   ward_location: string;
// }

// interface Administrative {
//   admission_id: number;
//   admission_no: string;
//   encounter_id?: number;
//   encounter_no: string;
//   encounter_type: string; // Added to distinguish IPD/ERD
//   date_admitted: string;
//   status: string;
//   discharge_stage: string;
//   payer: string;
//   policy_no: string;
// }

// interface FinancialPosition {
//   gross_current_bill: number;
//   total_discounts: number;
//   net_current_bill: number;
//   insurance_copay: number;
//   current_debt: number;
//   previous_debt: number;
//   total_patient_debt: number;
//   current_advance: number;
//   ledger_balance: number;
//   total_amount_payable: number;
// }

// interface BillingGroup {
//   dept_total: number;
//   items: any[];
// }

// interface BillingStatement {
//   clinical_header: ClinicalHeader;
//   administrative: Administrative;
//   financial_position: FinancialPosition;
//   billing_groups: Record<string, BillingGroup>;
//   provisional_total: number;
// }

// interface Encounter {
//   id: number;
//   encounter_number: string;
//   encounter_type: string;
//   encounter_status: string;
//   visit_reason: string | null;
//   created_at: string;
// }

// const IPDBilling: React.FC = () => {
//   const { notify } = useNotification();

//   // State
//   const [searchMrn, setSearchMrn] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [patient, setPatient] = useState<any>(null);
//   const [encounters, setEncounters] = useState<Encounter[]>([]);
//   const [selectedEncounterId, setSelectedEncounterId] = useState('');
//   const [billingStatement, setBillingStatement] = useState<BillingStatement | null>(null);
//   const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
//   const [activeTab, setActiveTab] = useState('department');
//   const [actionLoading, setActionLoading] = useState(false);
//   const [breakdownModal, setBreakdownModal] = useState<{ isOpen: boolean; itemName: string; breakdown: any[] }>({ isOpen: false, itemName: '', breakdown: [] });
//   const [viewDiscountModal, setViewDiscountModal] = useState<{ isOpen: boolean; itemName: string; discount: any }>({ isOpen: false, itemName: '', discount: null });
//   const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  
//   const [showReversalModal, setShowReversalModal] = useState<{
//     admissionId: number;
//     action: string;
//     title: string;
//     description: string;
//     patientName: string;
//   } | null>(null);

//   // Discount State
//   const [showDiscountModal, setShowDiscountModal] = useState(false);
//   const [discountTarget, setDiscountTarget] = useState<"ITEM" | "BILL">("BILL");
//   const [discountItemId, setDiscountItemId] = useState<number | null>(null);
//   const [unapplyDiscountModal, setUnapplyDiscountModal] = useState<{ billableItemId: number | null } | null>(null);
//   const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FLAT" | "WAIVER">("PERCENTAGE");
//   const [discountValue, setDiscountValue] = useState<number | "">("");
//   const [discountReason, setDiscountReason] = useState("");
//   const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
//   const [totalDiscountAmount, setTotalDiscountAmount] = useState(0);
//   const [hasInvoiceLevelDiscount, setHasInvoiceLevelDiscount] = useState(false);
//   const [removingId, setRemovingId] = useState<string | null>(null);
//   const [deleteItemModal, setDeleteItemModal] = useState<{ rowId: number; billableItemId: number | null; orderId: number | null; remarks: string } | null>(null);

//   // Remove / Delete billing item — prefer billable_item_id, fall back to the order id (item.id) when it's empty.
//   const removeItem = (rowId: number, billableItemId?: number | null) => {
//     setDeleteItemModal({ rowId, billableItemId: billableItemId ?? null, orderId: rowId, remarks: "" });
//   };

//   const performRemoveItem = async () => {
//     if (!deleteItemModal) return;
//     const { rowId, billableItemId, orderId, remarks } = deleteItemModal;
//     const encounterNum = selectedEncounterId;
//     if (!encounterNum) { notify('No encounter selected', 'error'); return; }
//     setDeleteItemModal(null);
//     setRemovingId(String(rowId));
//     try {
//       await billingService.deleteOrder(encounterNum, { billableItemId, orderId }, remarks);
//       notify('Item deleted successfully', 'success');
//       fetchBillingStatement(encounterNum);
//     } catch (err: any) {
//       notify(err?.response?.data?.message || 'Failed to delete item', 'error');
//     } finally {
//       setRemovingId(null);
//     }
//   };

//   // Search Handler
//   const handleSearch = async () => {
//     if (!searchMrn.trim()) {
//       notify("Please enter an MRN", "error");
//       return;
//     }

//     setLoading(true);
//     setPatient(null);
//     setEncounters([]);
//     setBillingStatement(null);
//     setSelectedEncounterId('');

//     try {
//       const res = await patientService.getPatientHistory(searchMrn);
//       if (res && res.patient) {
//         setPatient(res.patient);
//         const encs = res.encounters || [];

//         // Filter: Only IPD and NOT CLOSED
//         const activeEncounters = encs.filter((enc: Encounter) =>
//           enc.encounter_type === 'IPD' && enc.encounter_status !== 'CLOSED'
//         );

//         setEncounters(activeEncounters);

//         if (activeEncounters.length > 0) {
//           const latest = activeEncounters[0];
//           setSelectedEncounterId(latest.encounter_number);
//           fetchBillingStatement(latest.encounter_number);
//         } else {
//           notify("No active IPD encounters found for this patient", "info");
//         }
//       } else {
//         notify("Patient not found", "error");
//       }
//     } catch (error: any) {
//       console.error("Search Error:", error);
//       notify(error.response?.data?.message || error.message || "Failed to fetch patient history", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Fetch Billing Statement
//   const fetchBillingStatement = async (encounterNumber: string) => {
//     if (!encounterNumber) return;

//     setLoading(true);
//     try {
//       const res = await billingService.getIPDStatement(encounterNumber);
//       if (res.status === 'success') {
//         // Handle nested data structure: res.data.data or res.data
//         let statementData = res.data;
//         if (statementData && statementData.data && statementData.data.clinical_header) {
//           statementData = statementData.data;
//         } else if (res.data && res.data.clinical_header) {
//           statementData = res.data;
//         }
//         setBillingStatement(statementData || null);

//         // Extract total discount amount if available
//         if (statementData?.discounts) {
//           setTotalDiscountAmount(statementData.discounts.total_discount_amount || 0);
//           setHasInvoiceLevelDiscount((statementData.discounts.invoice_level?.length || 0) > 0);
//         } else {
//           setTotalDiscountAmount(0);
//           setHasInvoiceLevelDiscount(false);
//         }

//         setExpandedGroups(new Set());
//       } else {
//         notify(res.message || "Failed to fetch billing statement", "error");
//         setBillingStatement(null);
//       }
//     } catch (error: any) {
//       console.error("Statement Error:", error);
//       notify(error.response?.data?.message || error.message || "Error fetching statement", "error");
//       setBillingStatement(null);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleApplyDiscount = async () => {
//     const encounterNum = selectedEncounterId;
//     const realEncounterId = billingStatement?.administrative?.encounter_id;

//     if (!encounterNum || !realEncounterId) {
//       notify("Please select an encounter first", "error");
//       return;
//     }

//     if (!discountReason.trim()) {
//       notify("Please provide a reason for the discount", "error");
//       return;
//     }

//     if (discountType !== "WAIVER" && (!discountValue || Number(discountValue) <= 0)) {
//       notify("Please provide a valid discount value", "error");
//       return;
//     }

//     setIsApplyingDiscount(true);
//     try {
//       const payload: any = {
//         encounter_id: realEncounterId,
//         discount_type: discountType,
//         value: discountType === "WAIVER" ? 0 : Number(discountValue),
//         reason: discountReason
//       };

//       if (discountTarget === "ITEM" && discountItemId) {
//         payload.billable_item_id = discountItemId;
//       }

//       const res = await billingService.applyDiscount(payload);
//       if (res.status === "success") {
//         notify("Discount applied successfully!", "success");
//         setShowDiscountModal(false);
//         setDiscountValue("");
//         setDiscountReason("");
//         fetchBillingStatement(encounterNum);
//       } else {
//         notify(res.message || "Failed to apply discount", "error");
//       }
//     } catch (err: any) {
//       console.error("Discount apply error:", err);
//       notify(err.response?.data?.message || "Error applying discount", "error");
//     } finally {
//       setIsApplyingDiscount(false);
//     }
//   };

//   const handleUnapplyDiscount = async (billableItemId?: number | null) => {
//     const encounterNum = selectedEncounterId;
//     const realEncounterId = billingStatement?.administrative?.encounter_id;
//     if (!encounterNum || !realEncounterId) {
//       notify("Please select an encounter first", "error");
//       return;
//     }
//     setIsApplyingDiscount(true);
//     try {
//       const payload: any = { encounter_id: realEncounterId };
//       if (billableItemId) {
//         payload.billable_item_id = billableItemId;
//       }
//       const res = await billingService.unapplyDiscount(payload);
//       if (res.status === "success") {
//         notify("Discount removed", "success");
//         setUnapplyDiscountModal(null);
//         fetchBillingStatement(encounterNum);
//       } else {
//         notify(res.message || "Failed to remove discount", "error");
//       }
//     } catch (err: any) {
//       console.error("Unapply discount error:", err);
//       notify(err.response?.data?.message || "Error removing discount", "error");
//     } finally {
//       setIsApplyingDiscount(false);
//     }
//   };

//   const handleDischargeAction = async (action: string) => {
//     const admin = billingStatement?.administrative as any;
//     const rawId = admin?.admission_id || admin?.id;
//     const admissionId = rawId ? Number(rawId) : null;

//     if (!admissionId || isNaN(admissionId)) {
//       notify('Admission ID not found or invalid in billing statement', 'error');
//       return;
//     }

//     setActionLoading(true);
//     try {
//       const patientName = billingStatement?.clinical_header?.patient_name || '';

//       if (['reverseBillingFileReceived', 'reverseBillingClearance'].includes(action)) {
//         setShowReversalModal({
//           admissionId,
//           action,
//           patientName,
//           title: action === 'reverseBillingFileReceived' ? 'Reverse Billing File Received' : 'Reverse Billing Clearance',
//           description: `Are you sure you want to reverse the ${action === 'reverseBillingFileReceived' ? 'billing file received' : 'billing clearance'} status?`
//         });
//         setActionLoading(false);
//         return;
//       }

//       if (action === 'billingFileReceived') await wardService.billingFileReceived(admissionId);
//       else if (action === 'billingClearance') await wardService.billingClearance(admissionId);
//       else if (action === 'finalizeDischarge') await wardService.finalizeDischarge(admissionId);

//       notify('Action successful', 'success');
//       fetchBillingStatement(selectedEncounterId);
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Failed to perform action', 'error');
//     } finally {
//       setActionLoading(false);
//     }
//   };

//   // Handle Encounter Change
//   const handleEncounterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
//     const val = e.target.value;
//     setSelectedEncounterId(val);
//     if (val) {
//       fetchBillingStatement(val);
//     } else {
//       setBillingStatement(null);
//     }
//   };

//   // Toggle Group Expansion
//   const toggleGroup = (groupName: string) => {
//     const newSet = new Set(expandedGroups);
//     if (newSet.has(groupName)) {
//       newSet.delete(groupName);
//     } else {
//       newSet.add(groupName);
//     }
//     setExpandedGroups(newSet);
//   };

//   // Helper to format currency
//   const formatCurrency = (amount: number) => {
//     return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
//   };

//   // Helper to format date
//   const formatDate = (dateString: string) => {
//     if (!dateString) return '-';
//     // If it's already formatted like "03 Mar, 2026", just return it
//     if (dateString.includes(',')) return dateString;
//     return new Date(dateString).toLocaleString();
//   };

//   return (
//     <div className="flex flex-col h-full bg-[#f0f2f5] font-sans text-xs">
//       {/* 1. HEADER BAR */}
//       <div className="bg-gradient-to-r from-slate-700 to-slate-600 text-white px-4 py-2 flex items-center justify-between shadow-sm shrink-0">
//         <div className="flex items-center gap-4">
//           <h1 className="font-bold text-sm tracking-wide">IP Invoice</h1>

//           <div className="flex items-center bg-white/10 rounded px-2 py-1 border border-white/20">
//             <span className="text-white/70 mr-2 font-medium">UHID:</span>
//             <input
//               value={searchMrn}
//               onChange={(e) => setSearchMrn(e.target.value)}
//               onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
//               className="bg-transparent border-none outline-none text-white placeholder-white/40 w-32 font-medium"
//               placeholder="Enter MRN"
//             />
//             <Search
//               size={14}
//               className="text-white/70 cursor-pointer hover:text-white ml-2"
//               onClick={handleSearch}
//             />
//           </div>

//           {encounters.length > 0 && (
//             <div className="flex items-center bg-white/10 rounded px-2 py-1 border border-white/20">
//               <span className="text-white/70 mr-2 font-medium">Visit:</span>
//               <select
//                 value={selectedEncounterId}
//                 onChange={handleEncounterChange}
//                 className="bg-transparent border-none outline-none text-white w-48 font-medium [&>option]:text-slate-800"
//               >
//                 {encounters.map(enc => (
//                   <option key={enc.id} value={enc.encounter_number}>
//                     {enc.encounter_number}
//                   </option>
//                 ))}
//               </select>
//             </div>
//           )}
//         </div>

//         <div className="flex items-center gap-2">
//           {loading && <Loader2 size={16} className="animate-spin text-white/80" />}
//           <button className="bg-brand-primary hover:bg-brand-active0 text-white px-3 py-1 rounded text-xs font-bold transition-colors border border-brand-primary shadow-sm flex items-center gap-1">
//             <MoreHorizontal size={14} /> Notes
//           </button>
//         </div>
//       </div>

//       {/* 2. PATIENT DETAILS BANNER */}
//       {billingStatement && billingStatement.clinical_header ? (
//         <div className="bg-[#e6f0ff] border-b border-brand-active p-3 shrink-0">
//           <div className="grid grid-cols-12 gap-4">
//             {/* Col 1: Photo & Status */}
//             <div className="col-span-2 flex flex-col items-center gap-2 border-r border-brand-active pr-2">
//               <div className="w-16 h-16 bg-white border border-brand-active rounded-md flex items-center justify-center text-brand-primary shadow-sm">
//                 <User size={32} />
//               </div>
//               <div className="flex flex-col gap-1 w-full text-center">
//                 <div className="font-bold text-slate-800 text-sm truncate" title={billingStatement.clinical_header.patient_name}>
//                   {billingStatement.clinical_header.patient_name}
//                 </div>
//                 <div className="text-xs text-slate-600 truncate" title={billingStatement.clinical_header.age_gender}>
//                   {billingStatement.clinical_header.age_gender}
//                 </div>
//                 <button className="bg-brand-primary text-white text-[10px] font-bold py-1 px-2 rounded shadow-sm hover:bg-brand-primary w-full mt-1">
//                   Audit Bill
//                 </button>
//                 <div className="bg-slate-600 text-white text-[10px] font-bold py-1 px-2 rounded shadow-sm text-center w-full">
//                   {billingStatement.administrative.status}
//                 </div>
//               </div>
//             </div>

//             {/* Col 2: Invoice Details */}
//             <div className="col-span-3 space-y-1.5 border-r border-brand-active pr-2">
//               <h3 className="text-brand-primary font-bold border-b border-brand-active pb-1 mb-1">Invoice Details</h3>
//               <div className="grid grid-cols-[80px_1fr] gap-1 items-center">
//                 <span className="text-slate-500 font-medium">IP No.</span>
//                 <span className="font-bold text-slate-800 truncate" title={billingStatement.administrative.encounter_no}>
//                   {billingStatement.administrative.encounter_no}
//                 </span>
//               </div>
//               <div className="grid grid-cols-[80px_1fr] gap-1 items-center">
//                 <span className="text-slate-500 font-medium">Type</span>
//                 <span className="font-bold text-slate-800">Credit</span>
//               </div>
//               <div className="grid grid-cols-[80px_1fr] gap-1 items-center">
//                 <span className="text-slate-500 font-medium">Inv. Date</span>
//                 <span className="font-bold text-slate-800">{new Date().toLocaleDateString()}</span>
//               </div>
//               <div className="grid grid-cols-[80px_1fr] gap-1 items-center">
//                 <span className="text-slate-500 font-medium">Admission</span>
//                 <span className="font-bold text-slate-800 truncate" title={billingStatement.administrative.date_admitted}>
//                   {billingStatement.administrative.date_admitted}
//                 </span>
//               </div>
//               <div className="grid grid-cols-[80px_1fr] gap-1 items-center">
//                 <span className="text-slate-500 font-medium">Stage</span>
//                 <span className="font-bold text-slate-800 truncate">
//                   {billingStatement.administrative.discharge_stage}
//                 </span>
//               </div>
//             </div>

//             {/* Col 3: Payor Details */}
//             <div className="col-span-4 space-y-1.5 border-r border-brand-active pr-2">
//               <h3 className="text-brand-primary font-bold border-b border-brand-active pb-1 mb-1">Payor Details</h3>
//               <div className="grid grid-cols-[80px_1fr] gap-1 items-center">
//                 <span className="text-slate-500 font-medium">Payer</span>
//                 <span className="font-bold text-slate-800 truncate" title={billingStatement.administrative.payer}>
//                   {billingStatement.administrative.payer}
//                 </span>
//               </div>
//               <div className="grid grid-cols-[80px_1fr] gap-1 items-center">
//                 <span className="text-slate-500 font-medium">Policy No</span>
//                 <span className="font-bold text-slate-800 truncate">{billingStatement.administrative.policy_no || '-'}</span>
//               </div>
//               <div className="grid grid-cols-[80px_1fr] gap-1 items-center">
//                 <span className="text-slate-500 font-medium">Consultant</span>
//                 <span className="font-bold text-slate-800 truncate" title={billingStatement.clinical_header.admitting_dr}>
//                   {billingStatement.clinical_header.admitting_dr}
//                 </span>
//               </div>
//               <div className="grid grid-cols-[80px_1fr] gap-1 items-center">
//                 <span className="text-slate-500 font-medium">Ward/Bed</span>
//                 <span className="font-bold text-slate-800 truncate" title={billingStatement.clinical_header.ward_location}>
//                   {billingStatement.clinical_header.ward_location}
//                 </span>
//               </div>
//             </div>

//             {/* Col 4: Other Details (Financials) */}
//             <div className="col-span-3 space-y-1.5 max-h-48 overflow-y-auto pr-2">
//               <h3 className="text-brand-primary font-bold border-b border-brand-active pb-1 mb-1">Financial Position</h3>
//               <div className="grid grid-cols-[120px_1fr] gap-1 items-center">
//                 <span className="text-slate-500 font-medium">Gross Bill</span>
//                 <span className="font-bold text-slate-800 text-right">{formatCurrency(billingStatement.financial_position.gross_current_bill)}</span>
//               </div>
//               <div className="grid grid-cols-[120px_1fr] gap-1 items-center">
//                 <span className="text-slate-500 font-medium">Discounts</span>
//                 <span className="font-bold text-red-500 text-right">-{formatCurrency(billingStatement.financial_position.total_discounts)}</span>
//               </div>
//               <div className="grid grid-cols-[120px_1fr] gap-1 items-center">
//                 <span className="text-slate-500 font-medium">Net Bill</span>
//                 <span className="font-bold text-slate-800 text-right">{formatCurrency(billingStatement.financial_position.net_current_bill)}</span>
//               </div>
//               <div className="grid grid-cols-[120px_1fr] gap-1 items-center">
//                 <span className="text-slate-500 font-medium">Insurance Copay</span>
//                 <span className="font-bold text-slate-800 text-right">{formatCurrency(billingStatement.financial_position.insurance_copay)}</span>
//               </div>
//               <div className="grid grid-cols-[120px_1fr] gap-1 items-center">
//                 <span className="text-slate-500 font-medium">Current Debt</span>
//                 <span className="font-bold text-slate-800 text-right">{formatCurrency(billingStatement.financial_position.current_debt)}</span>
//               </div>
//               <div className="grid grid-cols-[120px_1fr] gap-1 items-center">
//                 <span className="text-slate-500 font-medium">Previous Debt</span>
//                 <span className="font-bold text-slate-800 text-right">{formatCurrency(billingStatement.financial_position.previous_debt)}</span>
//               </div>
//               <div className="grid grid-cols-[120px_1fr] gap-1 items-center">
//                 <span className="text-slate-500 font-medium">Total Debt</span>
//                 <span className="font-bold text-slate-800 text-right">{formatCurrency(billingStatement.financial_position.total_patient_debt)}</span>
//               </div>
//               <div className="grid grid-cols-[120px_1fr] gap-1 items-center">
//                 <span className="text-slate-500 font-medium">Current Advance</span>
//                 <span className="font-bold text-slate-800 text-right">{formatCurrency(billingStatement.financial_position.current_advance)}</span>
//               </div>
//               <div className="grid grid-cols-[120px_1fr] gap-1 items-center">
//                 <span className="text-slate-500 font-medium">Ledger Balance</span>
//                 <span className="font-bold text-slate-800 text-right">{formatCurrency(billingStatement.financial_position.ledger_balance)}</span>
//               </div>
//               <div className="grid grid-cols-[120px_1fr] gap-1 items-center bg-brand-active p-1 rounded">
//                 <span className="text-brand-primary font-bold">Total Payable</span>
//                 <span className="font-black text-brand-primary text-right">{formatCurrency(billingStatement.financial_position.total_amount_payable)}</span>
//               </div>
//             </div>
//           </div>
//         </div>
//       ) : (
//         <div className="bg-[#e6f0ff] border-b border-brand-active p-8 shrink-0 flex items-center justify-center text-brand-primary">
//           <div className="text-center">
//             <Search size={40} className="mx-auto mb-2 opacity-50" />
//             <p className="font-medium">Search for a patient to view details</p>
//           </div>
//         </div>
//       )}

//       {/* 3. TABS */}
//       <div className="bg-[#d0e1f5] border-b border-brand-primary px-2 flex items-end gap-1 shrink-0 h-8">
//         <button
//           onClick={() => setActiveTab('department')}
//           className={`px-4 py-1.5 text-xs font-bold rounded-t-lg transition-colors ${activeTab === 'department'
//               ? 'bg-white text-brand-primary border-t border-x border-brand-primary shadow-sm mb-[-1px] z-10'
//               : 'bg-transparent text-slate-600 hover:bg-white/50'
//             }`}
//         >
//           Department Wise
//         </button>
//         <button
//           onClick={() => setActiveTab('checklist')}
//           className={`px-4 py-1.5 text-xs font-bold rounded-t-lg transition-colors ${activeTab === 'checklist'
//               ? 'bg-white text-brand-primary border-t border-x border-brand-primary shadow-sm mb-[-1px] z-10'
//               : 'bg-transparent text-slate-600 hover:bg-white/50'
//             }`}
//         >
//           Checklist
//         </button>
//       </div>

//       {/* 4. MAIN CONTENT AREA */}
//       <div className="flex-1 overflow-auto bg-white p-2">
//         {billingStatement && billingStatement.billing_groups ? (
//           <div className="border border-slate-300 rounded shadow-sm bg-white min-h-full">
//             {/* Toolbar */}
//             <div className="flex justify-between items-center p-2 border-b border-slate-200 bg-slate-50/50">
//               <button
//                 onClick={() => setIsAddServiceModalOpen(true)}
//                 className="flex items-center gap-1 bg-brand-primary text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-brand-primary/90 transition-colors shadow-sm"
//               >
//                 <Plus size={14} /> Add Service
//               </button>
//             </div>
            
//             {/* Table Header */}
//             <div className="grid grid-cols-[40px_1fr_100px_80px_60px_100px_100px_50px_36px_80px] bg-[#eef4fa] border-b border-slate-300 text-slate-700 font-bold py-2 px-4 sticky top-0 z-10 text-xs">
//               <div className="text-center">#</div>
//               <div>Item Name</div>
//               <div>Date</div>
//               <div className="text-right">Rate</div>
//               <div className="text-center">Qty</div>
//               <div className="text-right text-indigo-500">Discount</div>
//               <div className="text-right">Net Total</div>
//               <div className="text-center" title="Apply item discount"><Tag size={12} className="mx-auto text-indigo-400" /></div>
//               <div className="text-center" title="Delete item"><Trash2 size={12} className="mx-auto text-red-300" /></div>
//               <div className="text-center">Status</div>
//             </div>

//             {/* Groups */}
//             <div className="divide-y divide-slate-200">
//               {Object.entries(billingStatement.billing_groups).map(([groupKey, group]: [string, any]) => {
//                 const isExpanded = expandedGroups.has(groupKey);
//                 const groupTitle = groupKey.replace(/_/g, ' ').toUpperCase();

//                 return (
//                   <div key={groupKey} className="bg-white">
//                     {/* Group Header Row */}
//                     <div
//                       onClick={() => toggleGroup(groupKey)}
//                       className="flex items-center justify-between px-4 py-2 bg-[#f8fafc] hover:bg-[#f1f5f9] cursor-pointer transition-colors border-b border-slate-100"
//                     >
//                       <div className="flex items-center gap-2">
//                         <div className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90 text-brand-primary' : ''}`}>
//                           <ChevronRight size={14} />
//                         </div>
//                         <span className="font-bold text-brand-primary text-xs">{groupTitle}</span>
//                         <span className="text-[10px] text-slate-500 bg-slate-200 px-1.5 rounded-full">
//                           {group.items.length}
//                         </span>
//                       </div>
//                       <div className="font-bold text-slate-800">
//                         {formatCurrency(group.dept_total)}
//                       </div>
//                     </div>

//                     {/* Group Items */}
//                     {isExpanded && (
//                       <div className="bg-white">
//                         {group.items.flatMap((item: any) => {
//                           if (item.drugs && Array.isArray(item.drugs) && item.drugs.length > 0) {
//                             return item.drugs.map((drug: any, dIdx: number) => ({
//                               id: `${item.id}-drug-${dIdx}`,
//                               item_name: `${drug.drug_name} (${drug.dosage} - ${drug.frequency})`,
//                               date: drug.date,
//                               rate: drug.rate,
//                               nos: drug.qty,
//                               total: drug.total,
//                               status: item.status,
//                               billable_item_id: item.billable_item_id,
//                               parent_discount: item.discount_applied,
//                               requested_by: item.requested_by,
//                               cancelled_by: item.cancelled_by
//                             }));
//                           }
//                           // Bundled consumable lines (e.g. "Consumables Used") carry the real
//                           // per-item breakdown in `details` — expand those instead of showing the generic label.
//                           if (item.details && Array.isArray(item.details) && item.details.length > 0) {
//                             return item.details.map((detail: any, dIdx: number) => ({
//                               id: `${item.id}-detail-${dIdx}`,
//                               item_name: detail.name,
//                               date: item.date,
//                               rate: detail.rate,
//                               nos: detail.qty,
//                               total: detail.total,
//                               status: item.status,
//                               billable_item_id: item.billable_item_id,
//                               parent_discount: item.discount_applied,
//                               requested_by: item.requested_by,
//                               cancelled_by: item.cancelled_by
//                             }));
//                           }
//                           return [{
//                             ...item,
//                             billable_item_id: item.billable_item_id,
//                             parent_discount: item.discount_applied
//                           }];
//                         }).map((item: any, idx: number) => (
//                           <div
//                             key={item.id}
//                           className={`grid grid-cols-[40px_1fr_100px_80px_60px_100px_100px_50px_36px_80px] py-1.5 px-4 border-b border-slate-100 hover:bg-brand-active/30 transition-colors text-slate-600 items-center ${removingId === String(item.id) ? 'opacity-50 pointer-events-none' : ''}`}
//                           >
//                             <div className="text-center text-slate-400 text-[10px]">{idx + 1}</div>
//                             <div className="font-medium truncate pr-2 flex flex-col justify-center" title={item.item_name}>
//                               <div className="flex items-center gap-2">
//                                 <span className="truncate">{item.item_name}</span>
//                                 {item.fee_breakdown && item.fee_breakdown.length > 0 && (
//                                   <button
//                                     onClick={(e) => {
//                                       e.stopPropagation();
//                                       setBreakdownModal({ isOpen: true, itemName: item.item_name, breakdown: item.fee_breakdown });
//                                     }}
//                                     className="flex items-center gap-1 text-[9px] font-bold text-brand-primary hover:text-brand-active0 bg-brand-primary/10 hover:bg-brand-primary/20 px-2 py-1 rounded-full transition-colors shrink-0"
//                                   >
//                                     <FileText size={10} />
//                                     <span>Fee Breakdown</span>
//                                   </button>
//                                 )}
//                               </div>
//                               {(item.requested_by || item.cancelled_by) && (
//                                 <div className="text-[10px] mt-0.5 flex gap-2">
//                                   {item.requested_by?.name && <span className="text-slate-400">Ordered by: {item.requested_by.name}</span>}
//                                   {item.cancelled_by?.name && <span className="text-red-400">Cancelled by: {item.cancelled_by.name}</span>}
//                                 </div>
//                               )}
//                             </div>
//                             <div className="text-[10px] text-slate-500">{item.date}</div>
//                             <div className="text-right">{formatCurrency(item.rate)}</div>
//                             <div className="text-center">{item.nos}</div>
//                             {/* Discount column */}
//                             <div className="text-right">
//                               {item.parent_discount && item.parent_discount.amount > 0 ? (
//                                 <div className="flex flex-col items-end gap-1">
//                                   <div className="flex items-center gap-1">
//                                     <span className="text-[11px] font-bold text-indigo-600">-{formatCurrency(item.parent_discount.amount)}</span>
//                                     {item.billable_item_id && (
//                                       <button
//                                         onClick={(e) => {
//                                           e.stopPropagation();
//                                           setUnapplyDiscountModal({ billableItemId: item.billable_item_id });
//                                         }}
//                                         className="text-red-400 hover:text-red-600 transition-colors"
//                                         title="Remove discount"
//                                       >
//                                         <X size={10} />
//                                       </button>
//                                     )}
//                                   </div>
//                                   <span className="text-[9px] font-semibold text-indigo-500 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
//                                     {item.parent_discount.type === 'PERCENTAGE' ? `${item.parent_discount.value}% off` : item.parent_discount.type === 'WAIVER' ? 'WAIVER' : `FLAT`}
//                                   </span>
//                                   {item.parent_discount.reason && (
//                                     <span
//                                       className="text-[9px] text-slate-400 italic text-right max-w-[90px] leading-tight cursor-pointer hover:text-indigo-500 hover:underline decoration-indigo-300 decoration-dashed transition-colors"
//                                       title="Click to view full reason"
//                                       onClick={(e) => {
//                                         e.stopPropagation();
//                                         setViewDiscountModal({ isOpen: true, itemName: item.item_name, discount: item.parent_discount });
//                                       }}
//                                     >
//                                       {item.parent_discount.reason.length > 20 ? item.parent_discount.reason.slice(0, 20) + '…' : item.parent_discount.reason}
//                                     </span>
//                                   )}
//                                 </div>
//                               ) : (
//                                 <span className="text-slate-300 text-[10px]">—</span>
//                               )}
//                             </div>
//                             {/* Net Total column */}
//                             <div className="text-right font-bold">
//                               {item.parent_discount && item.parent_discount.amount > 0 ? (
//                                 <div className="flex flex-col items-end gap-0.5">
//                                   <span className="text-[10px] text-slate-400 line-through">{formatCurrency(item.gross_total ?? item.total)}</span>
//                                   <span className="text-emerald-600 font-bold">{formatCurrency(item.net_total ?? (item.total - item.parent_discount.amount))}</span>
//                                 </div>
//                               ) : (
//                                 <span className="text-slate-800">{formatCurrency(item.total)}</span>
//                               )}
//                             </div>
//                             {/* Per-item discount button */}
//                             <div className="flex items-center justify-center">
//                               {item.billable_item_id ? (
//                                 <button
//                                   onClick={(e) => {
//                                     e.stopPropagation();
//                                     setDiscountTarget("ITEM");
//                                     setDiscountItemId(item.billable_item_id);
//                                     setDiscountType("PERCENTAGE");
//                                     setDiscountValue("");
//                                     setDiscountReason("");
//                                     setShowDiscountModal(true);
//                                   }}
//                                   className="group p-1.5 rounded-lg hover:bg-indigo-50 text-slate-300 hover:text-indigo-600 transition-all"
//                                   title="Apply item discount"
//                                 >
//                                   <Tag size={12} />
//                                 </button>
//                               ) : (
//                                 <span className="text-slate-200">—</span>
//                               )}
//                             </div>
//                             {/* Per-item delete button */}
//                             <div className="flex items-center justify-center">
//                               {item.id ? (
//                                 removingId === String(item.id) ? (
//                                   <Loader2 size={12} className="animate-spin text-red-400" />
//                                 ) : (
//                                   <button
//                                     onClick={(e) => {
//                                       e.stopPropagation();
//                                       removeItem(item.id, item.billable_item_id);
//                                     }}
//                                     className="group p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all"
//                                     title="Delete item"
//                                   >
//                                     <Trash2 size={12} />
//                                   </button>
//                                 )
//                               ) : (
//                                 <span className="text-slate-200">—</span>
//                               )}
//                             </div>
//                             <div className="text-center">
//                               <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${item.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
//                                   item.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
//                                     'bg-slate-50 text-slate-600 border-slate-200'
//                                 }`}>
//                                 {item.status}
//                               </span>
//                             </div>
//                           </div>
//                         ))}
//                       </div>
//                     )}
//                   </div>
//                 );
//               })}
//             </div>
//           </div>
//         ) : (
//           <div className="h-full flex items-center justify-center text-slate-400">
//             <p>No billing items to display</p>
//           </div>
//         )}
//       </div>

//       {/* 5. FOOTER */}
//       <div className="bg-[#d0e1f5] border-t border-brand-primary p-3 shrink-0 flex flex-col gap-3">

//         {/* Top Row: Discount controls (inline, compact) + Net Payable */}
//         <div className="flex items-center justify-between gap-4">

//           {/* LEFT — compact inline discount row */}
//           <div className="flex items-center gap-3 flex-1">
//             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Discount:</span>

//             {/* Bill-level button */}
//             {billingStatement && (
//               <button
//                 onClick={() => {
//                   setDiscountTarget("BILL");
//                   setDiscountItemId(null);
//                   setDiscountType("PERCENTAGE");
//                   setDiscountValue("");
//                   setDiscountReason("");
//                   setShowDiscountModal(true);
//                 }}
//                 className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-bold transition-colors"
//               >
//                 <Tag size={11} /> Apply to Bill
//               </button>
//             )}

//             {/* Hint for item-level */}
//             <span className="text-[10px] text-slate-400 font-medium">
//               Use <Tag size={9} className="inline -mt-0.5 text-indigo-400" /> on a row for item discount
//             </span>

//             {/* Total discount pill — only visible when active */}
//             {totalDiscountAmount > 0 && (
//               <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
//                 <CheckCircle2 size={10} />
//                 -{formatCurrency(totalDiscountAmount)} off
//               </span>
//             )}

//             {/* Remove invoice-level discount */}
//             {hasInvoiceLevelDiscount && (
//               <button
//                 onClick={() => setUnapplyDiscountModal({ billableItemId: null })}
//                 className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-lg text-[10px] font-bold transition-colors"
//               >
//                 <X size={11} /> Remove Bill Discount
//               </button>
//             )}
//           </div>

//           {/* RIGHT — Net Payable + Print */}
//           <div className="flex items-center gap-4 shrink-0">
//             <div className="flex flex-col items-end">
//               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Net Payable</span>
//               <span className="text-2xl font-black text-brand-primary leading-tight">
//                 {billingStatement ? formatCurrency(billingStatement.provisional_total) : '₦0.00'}
//               </span>
//             </div>
//             <button
//               onClick={() => window.open(`/print/billing/ipd/${billingStatement?.administrative?.encounter_no}`, '_blank')}
//               className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded font-bold shadow-sm flex items-center gap-2 transition-colors"
//             >
//               <Printer size={16} /> Print
//             </button>
//           </div>
//         </div>

//         {/* Discharge Actions Row */}
//         <div className="flex items-center justify-end gap-2 pt-3 border-t border-brand-active/50">
//           {billingStatement && (() => {
//             const stage = billingStatement.administrative.discharge_stage;
//             const isPharmacyClearance = stage === 'PHARMACY_CLEARANCE';
//             const isBillingFileReceived = stage === 'BILLING_FILE_RECEIVED';
//             const isBillingClearance = stage === 'BILLING_CLEARANCE';

//             return (
//               <>
//                 <button
//                   onClick={() => isPharmacyClearance && handleDischargeAction('billingFileReceived')}
//                   disabled={actionLoading || !isPharmacyClearance}
//                   title={!isPharmacyClearance ? "Requires Pharmacy Clearance first, or file already received." : ""}
//                   className={`px-4 py-2 rounded font-bold shadow-sm flex items-center gap-2 transition-colors ${isPharmacyClearance && !actionLoading ? 'bg-teal-600 hover:bg-teal-500 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
//                     }`}
//                 >
//                   {actionLoading && isPharmacyClearance ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Receive File
//                 </button>

//                 <button
//                   onClick={() => isBillingFileReceived && handleDischargeAction('reverseBillingFileReceived')}
//                   disabled={actionLoading || !isBillingFileReceived}
//                   title={!isBillingFileReceived ? "Can only reverse if file was just received." : ""}
//                   className={`px-4 py-2 rounded font-bold shadow-sm flex items-center gap-2 transition-colors ${isBillingFileReceived && !actionLoading ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
//                     }`}
//                 >
//                   {actionLoading && isBillingFileReceived ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />} Reverse File
//                 </button>

//                 <button
//                   onClick={() => isBillingFileReceived && handleDischargeAction('billingClearance')}
//                   disabled={actionLoading || !isBillingFileReceived}
//                   title={!isBillingFileReceived ? "Requires Billing File Received first, or already cleared." : ""}
//                   className={`px-4 py-2 rounded font-bold shadow-sm flex items-center gap-2 transition-colors ${isBillingFileReceived && !actionLoading ? 'bg-teal-600 hover:bg-teal-500 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
//                     }`}
//                 >
//                   {actionLoading && isBillingFileReceived ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Clear Billing
//                 </button>

//                 <button
//                   onClick={() => isBillingClearance && handleDischargeAction('reverseBillingClearance')}
//                   disabled={actionLoading || !isBillingClearance}
//                   title={!isBillingClearance ? "Can only reverse if currently at Billing Clearance stage." : ""}
//                   className={`px-4 py-2 rounded font-bold shadow-sm flex items-center gap-2 transition-colors ${isBillingClearance && !actionLoading ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
//                     }`}
//                 >
//                   {actionLoading && isBillingClearance ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />} Reverse Clearance
//                 </button>

//                 <button
//                   onClick={() => isBillingClearance && handleDischargeAction('finalizeDischarge')}
//                   disabled={actionLoading || !isBillingClearance}
//                   title={!isBillingClearance ? "Requires Billing Clearance first." : ""}
//                   className={`px-4 py-2 rounded font-bold shadow-sm flex items-center gap-2 transition-colors ${isBillingClearance && !actionLoading ? 'bg-brand-primary hover:bg-brand-active0 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
//                     }`}
//                 >
//                   {actionLoading && isBillingClearance ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />} Finalize Discharge
//                 </button>
//               </>
//             );
//           })()}
//         </div>

//         <div className="flex justify-between items-center pt-1 text-[10px] text-slate-500">
//           <span>Facilitator Name: System</span>
//           <span>Billing Currency: NGN</span>
//         </div>
//       </div>

//       {/* Fee Breakdown Modal */}
//       {breakdownModal.isOpen && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
//           <div className="bg-white rounded-2xl shadow-2xl w-[90vw] max-w-[1200px] h-[90vh] max-h-[900px] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
//             {/* Header */}
//             <div className="p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
//               <div>
//                 <h3 className="text-3xl font-black text-slate-800 mb-2">Fee Breakdown</h3>
//                 <p className="text-lg text-slate-500 font-medium">{breakdownModal.itemName}</p>
//               </div>
//               <button 
//                 onClick={() => setBreakdownModal({ isOpen: false, itemName: '', breakdown: [] })} 
//                 className="p-3 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
//               >
//                 <X size={28} />
//               </button>
//             </div>

//             {/* Body */}
//             <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
//               <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
//                 <table className="w-full text-left border-collapse">
//                   <thead>
//                     <tr className="bg-slate-50 border-b border-slate-200">
//                       <th className="py-5 px-8 text-base font-black text-slate-500 uppercase tracking-widest w-20">#</th>
//                       <th className="py-5 px-8 text-base font-black text-slate-500 uppercase tracking-widest">Component Name</th>
//                       <th className="py-5 px-8 text-base font-black text-slate-500 uppercase tracking-widest">Type</th>
//                       <th className="py-5 px-8 text-base font-black text-slate-500 uppercase tracking-widest text-right">Amount</th>
//                     </tr>
//                   </thead>
//                   <tbody className="divide-y divide-slate-100">
//                     {breakdownModal.breakdown.map((fee: any, idx: number) => (
//                       <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
//                         <td className="py-6 px-8 text-lg text-slate-400">{idx + 1}</td>
//                         <td className="py-6 px-8 text-xl font-bold text-slate-800">
//                           {fee.component_name}
//                           {fee.is_mandatory ? (
//                             <span className="ml-4 text-xs font-black bg-brand-active/20 text-brand-primary px-3 py-1 rounded uppercase tracking-widest align-middle">Mandatory</span>
//                           ) : (
//                             <span className="ml-4 text-xs font-black bg-slate-100 text-slate-500 px-3 py-1 rounded uppercase tracking-widest align-middle">Optional</span>
//                           )}
//                         </td>
//                         <td className="py-6 px-8 text-base font-medium text-slate-500 uppercase tracking-wider">
//                           {fee.component_type.replace(/_/g, ' ')}
//                         </td>
//                         <td className="py-6 px-8 text-2xl font-black text-slate-800 text-right">
//                           {formatCurrency(fee.amount)}
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             </div>

//             {/* Footer */}
//             <div className="p-8 border-t border-slate-200 bg-white flex justify-between items-center">
//                 <div className="text-lg font-medium text-slate-500">
//                   Total Components: <span className="font-bold text-slate-800 text-xl">{breakdownModal.breakdown.length}</span>
//                 </div>
//                 <div className="flex items-center gap-6">
//                   <span className="text-xl font-bold text-slate-500 uppercase tracking-widest">Total Amount</span>
//                   <span className="text-5xl font-black text-brand-primary">
//                       {formatCurrency(breakdownModal.breakdown.reduce((sum, fee) => sum + fee.amount, 0))}
//                   </span>
//                 </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Add Service Modal */}
//       {isAddServiceModalOpen && billingStatement && (
//         <IPDAddServiceModal
//           isOpen={isAddServiceModalOpen}
//           onClose={() => setIsAddServiceModalOpen(false)}
//           patient={{ ...patient, payer_name: billingStatement.administrative.payer }}
//           encounterNumber={selectedEncounterId}
//           onSuccess={() => {
//             fetchBillingStatement(selectedEncounterId);
//             setIsAddServiceModalOpen(false);
//           }}
//         />
//       )}

//       <ReversalModal
//         isOpen={!!showReversalModal}
//         onClose={() => setShowReversalModal(null)}
//         title={showReversalModal?.title || ''}
//         description={showReversalModal?.description || ''}
//         patientName={showReversalModal?.patientName}
//         onConfirm={async (reason) => {
//           if (!showReversalModal) return;
//           const payload = { admission_id: showReversalModal.admissionId, reason };
//           try {
//             if (showReversalModal.action === 'reverseBillingFileReceived') await wardService.reverseBillingFileReceived(payload);
//             else if (showReversalModal.action === 'reverseBillingClearance') await wardService.reverseBillingClearance(payload);
//             notify('Reversal successful', 'success');
//             setShowReversalModal(null);
//             fetchBillingStatement(selectedEncounterId);
//           } catch (err: any) {
//             notify(err.response?.data?.message || 'Failed to reverse action', 'error');
//             throw err;
//           }
//         }}
//       />

//       {/* Delete Item Modal */}
//       {deleteItemModal && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
//           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
//             <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
//               <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
//                 <AlertCircle className="text-amber-500" size={16} />
//                 Delete Item
//               </h3>
//               <button
//                 onClick={() => setDeleteItemModal(null)}
//                 className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
//               >
//                 <X size={16} />
//               </button>
//             </div>
//             <div className="p-4 space-y-4">
//               <p className="text-sm text-slate-600">This action cannot be undone.</p>
//               <div>
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason / Remarks</label>
//                 <textarea
//                   rows={3}
//                   placeholder="e.g. Billed in error..."
//                   className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 transition-all resize-none"
//                   value={deleteItemModal.remarks}
//                   onChange={(e) => setDeleteItemModal({ ...deleteItemModal, remarks: e.target.value })}
//                 />
//               </div>
//             </div>
//             <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2 justify-end">
//               <button
//                 onClick={() => setDeleteItemModal(null)}
//                 className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-300 transition-colors"
//               >
//                 Close
//               </button>
//               <button
//                 onClick={performRemoveItem}
//                 disabled={!deleteItemModal.remarks.trim()}
//                 className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-black hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
//               >
//                 Confirm Delete
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Discount Modal */}
//       {showDiscountModal && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
//           <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
//             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
//               <div>
//                 <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
//                   <Tag className="text-indigo-600" size={18} />
//                   {discountTarget === "ITEM" ? "Apply Item Discount" : "Apply Bill Discount"}
//                 </h3>
//                 <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
//                   <span className={`px-2 py-0.5 rounded-full ${discountTarget === "ITEM" ? "bg-indigo-100 text-indigo-700" : "bg-purple-100 text-purple-700"}`}>
//                     {discountTarget === "ITEM" ? "Single Item" : "Whole Bill"}
//                   </span>
//                   <span className="text-slate-400">{discountTarget === "ITEM" ? "— applies to selected charge only" : "— applies across entire invoice"}</span>
//                 </p>
//               </div>
//               <button
//                 onClick={() => {
//                   setShowDiscountModal(false);
//                   setDiscountValue("");
//                   setDiscountReason("");
//                   setDiscountType("PERCENTAGE");
//                 }}
//                 className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 hover:bg-white rounded-lg"
//               >
//                 <X size={18} />
//               </button>
//             </div>
//             <div className="p-6 space-y-4">
//               <div>
//                 <label className="block text-xs font-bold text-slate-700 mb-1">
//                   Discount Type
//                 </label>
//                 <div className="relative">
//                   <select
//                     value={discountType}
//                     onChange={(e) => setDiscountType(e.target.value as any)}
//                     className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-sm font-medium text-slate-800 appearance-none bg-white"
//                   >
//                     <option value="PERCENTAGE">Percentage (%)</option>
//                     <option value="FLAT">Flat Amount</option>
//                     <option value="WAIVER">Full Waiver</option>
//                   </select>
//                   <ChevronDown
//                     size={16}
//                     className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
//                   />
//                 </div>
//               </div>

//               {discountType !== "WAIVER" && (
//                 <div>
//                   <label className="block text-xs font-bold text-slate-700 mb-1">
//                     Value
//                   </label>
//                   <div className="relative">
//                     <input
//                       type="number"
//                       value={discountValue}
//                       onChange={(e) => setDiscountValue(Number(e.target.value))}
//                       className="w-full pl-3 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-sm font-medium text-slate-800"
//                       placeholder={discountType === "PERCENTAGE" ? "e.g. 10" : "e.g. 5000"}
//                     />
//                     <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
//                       {discountType === "PERCENTAGE" ? "%" : "₦"}
//                     </div>
//                   </div>
//                 </div>
//               )}

//               <div>
//                 <label className="block text-xs font-bold text-slate-700 mb-1">
//                   Reason / Justification
//                 </label>
//                 <textarea
//                   value={discountReason}
//                   onChange={(e) => setDiscountReason(e.target.value)}
//                   className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-sm resize-none"
//                   rows={3}
//                   placeholder="Provide a reason for this discount..."
//                 />
//               </div>
//             </div>
//             <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
//               <button
//                 onClick={() => setShowDiscountModal(false)}
//                 className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
//                 disabled={isApplyingDiscount}
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={handleApplyDiscount}
//                 disabled={isApplyingDiscount}
//                 className="px-6 py-2 text-xs font-bold text-white bg-indigo-600 border border-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
//               >
//                 {isApplyingDiscount ? (
//                   <>
//                     <Loader2 size={14} className="animate-spin" />
//                     Applying...
//                   </>
//                 ) : (
//                   "Apply Discount"
//                 )}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* View Discount Reason Modal */}
//       {viewDiscountModal.isOpen && viewDiscountModal.discount && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
//           <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
//             <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
//               <h3 className="font-bold text-slate-800 flex items-center gap-2">
//                 <Tag size={16} className="text-indigo-500" />
//                 Discount Details
//               </h3>
//               <button
//                 onClick={() => setViewDiscountModal({ isOpen: false, itemName: '', discount: null })}
//                 className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
//               >
//                 <X size={16} />
//               </button>
//             </div>
//             <div className="p-4 space-y-4 text-sm text-slate-600">
//               <div>
//                 <span className="text-slate-400 text-xs uppercase font-bold tracking-wider">Item</span>
//                 <p className="font-medium text-slate-800 mt-0.5">{viewDiscountModal.itemName}</p>
//               </div>
//               <div className="grid grid-cols-2 gap-4">
//                 <div>
//                   <span className="text-slate-400 text-xs uppercase font-bold tracking-wider">Amount</span>
//                   <p className="font-bold text-indigo-600 mt-0.5">{formatCurrency(viewDiscountModal.discount.amount)}</p>
//                 </div>
//                 <div>
//                   <span className="text-slate-400 text-xs uppercase font-bold tracking-wider">Type</span>
//                   <p className="font-semibold text-slate-700 mt-0.5">
//                     {viewDiscountModal.discount.type === 'PERCENTAGE' 
//                       ? `${viewDiscountModal.discount.value}% off` 
//                       : viewDiscountModal.discount.type === 'WAIVER' ? 'Waiver' : 'Flat'}
//                   </p>
//                 </div>
//               </div>
//               {viewDiscountModal.discount.reason && (
//                 <div>
//                   <span className="text-slate-400 text-xs uppercase font-bold tracking-wider">Reason</span>
//                   <div className="mt-1 p-3 bg-slate-50 border border-slate-200 rounded-lg whitespace-pre-wrap text-slate-700 leading-relaxed italic">
//                     "{viewDiscountModal.discount.reason}"
//                   </div>
//                 </div>
//               )}
//             </div>
//             <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
//               <button
//                 onClick={() => setViewDiscountModal({ isOpen: false, itemName: '', discount: null })}
//                 className="px-4 py-2 bg-slate-200 text-slate-700 rounded font-medium hover:bg-slate-300 transition-colors"
//               >
//                 Close
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Unapply Discount Confirmation Modal */}
//       {unapplyDiscountModal && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
//           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
//             <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
//               <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
//                 <AlertCircle className="text-amber-500" size={16} />
//                 Remove Discount
//               </h3>
//               <button
//                 onClick={() => setUnapplyDiscountModal(null)}
//                 className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
//               >
//                 <X size={16} />
//               </button>
//             </div>
//             <div className="p-4">
//               <p className="text-sm text-slate-600">
//                 {unapplyDiscountModal.billableItemId
//                   ? "This will remove the discount applied to this item."
//                   : "This will remove the discount applied to the whole bill."}
//               </p>
//             </div>
//             <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2 justify-end">
//               <button
//                 onClick={() => setUnapplyDiscountModal(null)}
//                 className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-300 transition-colors"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={() => handleUnapplyDiscount(unapplyDiscountModal.billableItemId)}
//                 disabled={isApplyingDiscount}
//                 className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-black hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
//               >
//                 {isApplyingDiscount ? "Removing..." : "Confirm Remove"}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default IPDBilling;
