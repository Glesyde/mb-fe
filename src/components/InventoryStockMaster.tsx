import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Edit2,
  X,
  Save,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
  Trash2,
  RefreshCcw,
  Plus,
  History,
  Tag,
  ArrowDownToLine,
  ArrowUpRight,
  Box,
  Building2,
  Printer,
  FileText,
  Upload,
  Download,
  UploadCloud,
  Users,
  Settings,
  AlertCircle 
} from "lucide-react";
import { inventoryService, MarkupType } from "../services/inventory.service";
import { billingService } from "../services/billing.service";
import { MARKUP_TYPES } from "../constants";
import { useNotification } from "../context/NotificationContext";

interface PayerMarkupRule {
  id: string;
  markup_type: MarkupType;
  markup_value: number;
  payer_ids: number[];
}

const InventoryStockMaster: React.FC = () => {
  const { notify } = useNotification();
  
  // Core Data
  const [items, setItems] = useState<any[]>([]);
  const [payers, setPayers] = useState<any[]>([]); 
  const [units, setUnits] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [loadingDependencies, setLoadingDependencies] = useState(false);

  // Advanced Filtering
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterLowStock, setFilterLowStock] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals & Forms State
  const [showBatchModal, setShowBatchModal] = useState<any | null>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);

  const [showStockInModal, setShowStockInModal] = useState<any | null>(null);
  const [stockInForm, setStockInForm] = useState({ quantity: 0 });
  const [showStockIssueModal, setShowStockIssueModal] = useState<any | null>(null);
  const [stockIssueForm, setStockIssueForm] = useState({ quantity: 0, destination: "WARD" });
  const [stockEntries, setStockEntries] = useState<any[]>([]);
  const [loadingStockEntries, setLoadingStockEntries] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Item Creation/Edit Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "", item_type: "DRUG" as "DRUG" | "CONSUMABLE" | "DEVICE", category_code: "PHARMACY", unit_id: 0, brand: "", strength: "", formulation: "", reorder_level: 50
  });

  // Batch Modals
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [addBatchForm, setAddBatchForm] = useState({
    mfg_batch_no: "",
    expiry_date: "", purchase_price: 0, vendor_uhid: "", markup_type: "PERCENTAGE" as MarkupType, markup_value: 0, payer_markups: [] as PayerMarkupRule[],
  });

  const [showEditBatchModal, setShowEditBatchModal] = useState<any | null>(null);
  const [editBatchForm, setEditBatchForm] = useState({
    mfg_batch_no: "",
    expiry_date: "", purchase_price: 0, vendor_uhid: "", markup_type: "PERCENTAGE" as MarkupType, markup_value: 0, payer_markups: [] as PayerMarkupRule[],
  });

  // Confirmations & Utilites
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [showDeleteBatchConfirm, setShowDeleteBatchConfirm] = useState<number | null>(null);
  const [showPrintOptionsModal, setShowPrintOptionsModal] = useState<any | null>(null);

  // Bulk Pricing Modal
  const [showBulkPricingModal, setShowBulkPricingModal] = useState(false);
  const [bulkPricingForm, setBulkPricingForm] = useState({
    payer_id: "", markup_type: "PERCENTAGE" as MarkupType, markup_value: 0
  });

  // Bulk Import Modal
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState<"csv" | "xlsx" | null>(null);
  const [bulkImportFile, setBulkImportFile] = useState<File | null>(null);
  const [isUploadingBulkImport, setIsUploadingBulkImport] = useState(false);
  const [isDraggingImportFile, setIsDraggingImportFile] = useState(false);

  // Custom Dropdown States
  const [unitSearchTerm, setUnitSearchTerm] = useState("");
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [vendorSearchTerm, setVendorSearchTerm] = useState("");
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [payerSearchTerm, setPayerSearchTerm] = useState("");
  const [showPayerDropdown, setShowPayerDropdown] = useState(false);

  // --- Initial Data Fetching ---
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await inventoryService.searchItems();
      setItems(data);
    } catch (err: any) {
      notify("Failed to load item master index", "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  const fetchDependencies = useCallback(async () => {
    setLoadingDependencies(true);
    try {
      const [uData, pData, vData] = await Promise.all([
        inventoryService.getItemUnits(),
        billingService.getPayers(),
        inventoryService.searchVendors()
      ]);
      setUnits(uData);
      setPayers(pData);
      setVendors(vData);
    } catch (err) {
      notify("Failed to load system dependencies", "error");
    } finally {
      setLoadingDependencies(false);
    }
  }, [notify]);

  useEffect(() => {
    fetchItems();
    fetchDependencies();
  }, [fetchItems, fetchDependencies]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterLowStock]);

  // --- Batch & Stock Loaders ---
  const fetchItemBatches = async (itemId: number) => {
    setLoadingBatches(true);
    try {
      const allBatches = await inventoryService.searchBatches();
      setBatches(allBatches.filter((b: any) => b.item_id === itemId));
    } catch (err) {
      notify("Failed to load item batches", "error");
    } finally {
      setLoadingBatches(false);
    }
  };

  const fetchStockEntries = async (itemId: number) => {
    setLoadingStockEntries(true);
    try {
      const allStock = await inventoryService.searchStock();
      setStockEntries(allStock.filter((s: any) => s.item_id === itemId));
    } catch (err) {
      notify("Failed to load item stock entries", "error");
    } finally {
      setLoadingStockEntries(false);
    }
  };

  useEffect(() => {
    if (showBatchModal) fetchStockEntries(showBatchModal.id);
  }, [showBatchModal]);




  const handleExportCSV = () => {
    if (filtered.length === 0) {
      notify("No items to export", "warning");
      return;
    }
    
    // Headers exactly match the Backend Import Template
    const headers = [
      "Item UHID", "Name", "Brand", "Item Type", "Strength", "Formulation", "Category Code", 
      "Unit Name", "Reorder Level", "Department", "Mfg Batch No", 
      "Expiry Date (YYYY-MM-DD)", "Vendor UHID", "Purchase Price", 
      "Markup Type", "Markup Value", "Stock Location", "Quantity"
    ];
    
    const csvRows = [headers.join(",")];
    
    filtered.forEach(i => {
      // We export the Item Master Data. 
      // The Batch/Stock columns are intentionally left blank so users can fill them out and re-upload!
      const row = [
        `"${i.items_uhid || ""}"`, 
        `"${i.name || ""}"`, 
        `"${i.brand || ""}"`, 
        `"${i.item_type || ""}"`, 
        `"${i.strength || ""}"`, 
        `"${i.formulation || ""}"`, 
        `"${i.category_code || "PHARMACY"}"`, 
        `"${i.unit_name || ""}"`, 
        i.reorder_level || 50,
        `"${i.department || ""}"`,
        // Blank columns for: Mfg Batch No, Expiry, Vendor, Price, Markup Type, Markup Val, Location, Qty
        "", "", "", "", "", "", "", "" 
      ];
      csvRows.push(row.join(","));
    });

    const csvData = csvRows.join("\n");
    const blob = new Blob([csvData], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Inventory_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };


  // --- Submissions & Actions ---
  // const handleExportCSV = () => {
  //   if (filtered.length === 0) {
  //     notify("No items to export", "warning");
  //     return;
  //   }
  //   const headers = ["ID", "UHID", "Name", "Brand", "Type", "Strength", "Formulation", "Global Stock", "Store Stock", "Pharmacy Stock", "Reorder Level"];
  //   const csvRows = [headers.join(",")];
    
  //   filtered.forEach(i => {
  //     const row = [
  //       i.id, i.items_uhid, `"${i.name}"`, `"${i.brand || ""}"`, i.item_type, 
  //       `"${i.strength || ""}"`, `"${i.formulation || ""}"`, i.global_stock, 
  //       i.stock_store, i.stock_pharmacy, i.reorder_level
  //     ];
  //     csvRows.push(row.join(","));
  //   });

  //   const csvData = csvRows.join("\n");
  //   const blob = new Blob([csvData], { type: "text/csv" });
  //   const url = window.URL.createObjectURL(blob);
  //   const link = document.createElement("a");
  //   link.href = url;
  //   link.setAttribute("download", `Inventory_Export_${new Date().toISOString().split('T')[0]}.csv`);
  //   document.body.appendChild(link);
  //   link.click();
  //   link.remove();
  // };

  const handleBulkPricingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkPricingForm.payer_id) {
      notify("Please select a Payer", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      await inventoryService.setBulkPayerMarkup({
        payer_id: parseInt(bulkPricingForm.payer_id),
        markup_type: bulkPricingForm.markup_type,
        markup_value: bulkPricingForm.markup_value
      });
      notify("Bulk pricing rules applied to all active batches successfully", "success");
      setShowBulkPricingModal(false);
      setBulkPricingForm({ payer_id: "", markup_type: "PERCENTAGE", markup_value: 0 });
      if (showBatchModal) fetchItemBatches(showBatchModal.id);
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to apply bulk pricing", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCreate = () => {
    setModalMode("create");
    setEditingId(null);
    setFormData({ name: "", item_type: "DRUG", category_code: "PHARMACY", unit_id: 0, brand: "", strength: "", formulation: "", reorder_level: 50 });
    setShowAddModal(true);
  };

  const handleOpenEdit = (item: any) => {
    setModalMode("edit");
    setEditingId(item.id);
    setFormData({
      name: item.name, item_type: item.item_type, category_code: item.category_code,
      unit_id: item.unit_id || 0, brand: item.brand || "", strength: item.strength || "", 
      formulation: item.formulation || "", reorder_level: item.reorder_level || 50
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (modalMode === "create") {
        await inventoryService.createItem(formData);
        notify("Inventory item registered successfully", "success");
      } else if (editingId) {
        await inventoryService.updateItem(editingId, formData);
        notify("Item details updated successfully", "success");
      }
      setShowAddModal(false);
      fetchItems();
    } catch (err: any) {
      notify(err.response?.data?.message || "Operation failed. Verify parameters.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) return;
    setIsSubmitting(true);
    try {
      await inventoryService.deleteItem(showDeleteConfirm);
      notify("Item removed from hospital master list", "success");
      setShowDeleteConfirm(null);
      fetchItems();
    } catch (err: any) {
      notify("Failed to delete item. It may have active dependencies.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenBatches = (item: any) => {
    setShowBatchModal(item);
    fetchItemBatches(item.id);
  };

  const handleAddBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const cleanedMarkups = addBatchForm.payer_markups.filter(r => r.payer_ids.length > 0);
      await inventoryService.createBatch({
        item_id: showBatchModal.id,
        mfg_batch_no: addBatchForm.mfg_batch_no,
        expiry_date: addBatchForm.expiry_date,
        vendor_uhid: addBatchForm.vendor_uhid,
        purchase_price: addBatchForm.purchase_price,
        markup_type: addBatchForm.markup_type,
        markup_value: addBatchForm.markup_value,
        payer_markups: cleanedMarkups
      });
      notify("Batch created successfully", "success");
      setShowAddBatchModal(false);
      setAddBatchForm({ mfg_batch_no: "", expiry_date: "", purchase_price: 0, vendor_uhid: "", markup_type: "PERCENTAGE", markup_value: 0, payer_markups: [] });
      fetchItemBatches(showBatchModal.id);
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to create batch", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditBatch = (batch: any) => {
    setShowEditBatchModal(batch);
    const rulesMap = new Map<string, { type: string, val: number, ids: number[] }>();
    if (batch.payer_markups && Array.isArray(batch.payer_markups)) {
        batch.payer_markups.forEach((m: any) => {
            const key = `${m.markup_type}-${m.markup_value}`;
            if (!rulesMap.has(key)) {
                rulesMap.set(key, { type: m.markup_type, val: parseFloat(m.markup_value), ids: [] });
            }
            rulesMap.get(key)!.ids.push(parseInt(m.payer_id));
        });
    }

    const compiledRules: PayerMarkupRule[] = Array.from(rulesMap.values()).map((r, i) => ({
        id: `edit-${i}`, markup_type: r.type as MarkupType, markup_value: r.val, payer_ids: r.ids
    }));

    setEditBatchForm({
      mfg_batch_no: batch.mfg_batch_no || "",
      expiry_date: batch.expiry_date || "",
      purchase_price: parseFloat(batch.purchase_price) || 0,
      vendor_uhid: batch.vendor_uhid || "",
      markup_type: batch.markup_type || "PERCENTAGE",
      markup_value: parseFloat(batch.markup_value) || 0,
      payer_markups: compiledRules
    });
  };

  const handleEditBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const cleanedMarkups = editBatchForm.payer_markups.filter(r => r.payer_ids.length > 0);
      await inventoryService.updateBatch(showEditBatchModal.id, {
        item_id: showEditBatchModal.item_id,
        mfg_batch_no: editBatchForm.mfg_batch_no,
        expiry_date: editBatchForm.expiry_date,
        purchase_price: editBatchForm.purchase_price,
        vendor_uhid: editBatchForm.vendor_uhid,
        markup_type: editBatchForm.markup_type,
        markup_value: editBatchForm.markup_value,
        payer_markups: cleanedMarkups
      });
      notify("Batch updated successfully", "success");
      setShowEditBatchModal(null);
      if (showBatchModal) fetchItemBatches(showBatchModal.id);
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to update batch", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBatch = async () => {
    if (!showDeleteBatchConfirm) return;
    setIsSubmitting(true);
    try {
      await inventoryService.deleteBatch(showDeleteBatchConfirm);
      notify("Batch deleted successfully", "success");
      setShowDeleteBatchConfirm(null);
      if (showBatchModal) fetchItemBatches(showBatchModal.id);
    } catch (err: any) {
      notify("Failed to delete batch. It may have active stock movements.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  
  const handleOpenStockIn = (batch: any) => {
    setShowStockInModal(batch);
    setStockInForm({ quantity: 0 });
  };

  const handleStockInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stockInForm.quantity <= 0) return;
    setIsSubmitting(true);
    try {
      await inventoryService.stockIn({
        item_id: showStockInModal.item_id,
        batch_number: showStockInModal.batch_number,
        quantity: stockInForm.quantity,
        source_location: showStockInModal.location || "STORE",
        reason: "Manual Stock Addition",
      });
      notify(`Successfully added ${stockInForm.quantity} units to batch ${showStockInModal.batch_number}`, "success");
      setShowStockInModal(null);
      if (showBatchModal) fetchStockEntries(showBatchModal.id);
    } catch (err) {
      notify("Stock update failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenStockIssue = (batch: any) => {
    setShowStockIssueModal(batch);
    setStockIssueForm({ quantity: 0, destination: "WARD" });
  };

  const handleStockIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stockIssueForm.quantity <= 0) return;
    setIsSubmitting(true);
    try {
      await inventoryService.issueStock({
        item_id: showStockIssueModal.item_id,
        batch_number: showStockIssueModal.batch_number,
        quantity: stockIssueForm.quantity,
        destination: stockIssueForm.destination,
        reason: "Stock Issue",
      });
      notify(`Successfully issued ${stockIssueForm.quantity} units to ${stockIssueForm.destination}`, "success");
      setShowStockIssueModal(null);
      if (showBatchModal) fetchStockEntries(showBatchModal.id);
    } catch (err: any) {
      notify(err.response?.data?.message || "Stock issue failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };


  // --- Dynamic Rule Helpers ---
  const handleAddPayerRule = (formState: any, setFormState: any) => {
    setFormState({
      ...formState,
      payer_markups: [...formState.payer_markups, { id: Date.now().toString(), markup_type: "PERCENTAGE", markup_value: 0, payer_ids: [] }],
    });
  };

  const handleRemovePayerRule = (formState: any, setFormState: any, ruleId: string) => {
    setFormState({
      ...formState, payer_markups: formState.payer_markups.filter((r: any) => r.id !== ruleId)
    });
  };

  const handleTogglePayerInRule = (formState: any, setFormState: any, ruleId: string, payerId: number) => {
    setFormState({
      ...formState,
      payer_markups: formState.payer_markups.map((rule: any) => {
        if (rule.id === ruleId) {
          const hasPayer = rule.payer_ids.includes(payerId);
          return { ...rule, payer_ids: hasPayer ? rule.payer_ids.filter((id: number) => id !== payerId) : [...rule.payer_ids, payerId] };
        }
        return rule;
      })
    });
  };

  const updatePayerRuleValue = (formState: any, setFormState: any, ruleId: string, field: "markup_type" | "markup_value", value: any) => {
    setFormState({
      ...formState, payer_markups: formState.payer_markups.map((rule: any) => rule.id === ruleId ? { ...rule, [field]: value } : rule)
    });
  };

  // --- Bulk Import ---
  const handleDownloadTemplate = async (format: "csv" | "xlsx") => {
    setIsDownloadingTemplate(format);
    try { await inventoryService.downloadItemTemplate(format); } 
    catch (err: any) { notify(err.response?.data?.message || "Failed to download template", "error"); } 
    finally { setIsDownloadingTemplate(null); }
  };

  const acceptImportFile = (file: File | undefined | null) => {
    if (!file) return;
    if (!/\.(csv|xlsx|xls)$/i.test(file.name)) { notify("Please select a CSV or XLSX file", "error"); return; }
    setBulkImportFile(file);
  };



  const handleBulkImportSubmit = async () => {
    if (!bulkImportFile) { notify("Select a file to upload", "error"); return; }
    setIsUploadingBulkImport(true);
    try {
      const res: any = await inventoryService.uploadItemTemplate(bulkImportFile);
      if (!res || typeof res !== "object" || res.status !== "success") {
        notify("Unexpected response from server — import may not have completed.", "error"); return;
      }

      // Check if there are specific row errors returned by the backend
      if (res.data && res.data.error_count > 0) {
        // 1. Format the errors into a readable string (limit to 5 to avoid massive toasts)
        const errorDetails = res.data.errors
          .slice(0, 5)
          .map((e: any) => `Row ${e.row} (${e.item || 'Unknown'}): ${e.error}`)
          .join("\n");
          
        // 2. Add a suffix if there are more than 5 errors
        const moreErrors = res.data.errors.length > 5 
          ? `\n...and ${res.data.errors.length - 5} more errors.` 
          : "";

        // 3. Show the complete message in the notification
        notify(
          `Import finished: ${res.data.success_count} succeeded, ${res.data.error_count} failed.\n\n${errorDetails}${moreErrors}`, 
          "error" // Changed to "error" so the user pays attention
        );
        
        console.table(res.data.errors); // Still log to console for debugging
      } else {
        notify(res.message || "Items imported successfully", "success");
      }

      setShowBulkImportModal(false);
      setBulkImportFile(null);
      fetchItems();
    } catch (err: any) { 
      notify(err.response?.data?.message || "Failed to import items", "error"); 
    } 
    finally { setIsUploadingBulkImport(false); }
  };

  // const handleBulkImportSubmit = async () => {
  //   if (!bulkImportFile) { notify("Select a file to upload", "error"); return; }
  //   setIsUploadingBulkImport(true);
  //   try {
  //     const res: any = await inventoryService.uploadItemTemplate(bulkImportFile);
  //     if (!res || typeof res !== "object" || res.status !== "success") {
  //       notify("Unexpected response from server — import may not have completed.", "error"); return;
  //     }

  //     // Check if there are specific row errors returned by the new backend logic
  //     if (res.data && res.data.error_count > 0) {
  //       notify(`Import finished: ${res.data.success_count} succeeded, ${res.data.error_count} failed. Check console for details.`, "warning");
  //       console.table(res.data.errors); // Logs the exact rows that failed
  //     } else {
  //       notify(res.message || "Items imported successfully", "success");
  //     }

  //     setShowBulkImportModal(false);
  //     setBulkImportFile(null);
  //     fetchItems();
  //   } catch (err: any) { 
  //     notify(err.response?.data?.message || "Failed to import items", "error"); 
  //   } 
  //   finally { setIsUploadingBulkImport(false); }
  // };


  // const handleBulkImportSubmit = async () => {
  //   if (!bulkImportFile) { notify("Select a file to upload", "error"); return; }
  //   setIsUploadingBulkImport(true);
  //   try {
  //     const res = await inventoryService.uploadItemTemplate(bulkImportFile);
  //     if (!res || typeof res !== "object" || res.status !== "success") {
  //       notify("Unexpected response from server — import may not have completed.", "error"); return;
  //     }
  //     notify(res.message || "Items imported successfully", "success");
  //     setShowBulkImportModal(false);
  //     setBulkImportFile(null);
  //     fetchItems();
  //   } catch (err: any) { notify(err.response?.data?.message || "Failed to import items", "error"); } 
  //   finally { setIsUploadingBulkImport(false); }
  // };



  // --- Filtering & Pagination ---
  const filtered = useMemo(() => {
    let result = items;
    if (filterLowStock) result = result.filter(i => i.is_low_stock === 1);
    if (filterType !== "ALL") result = result.filter(i => i.item_type === filterType);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(i => 
        i.name.toLowerCase().includes(q) || 
        (i.items_uhid && i.items_uhid.toLowerCase().includes(q)) || 
        (i.brand && i.brand.toLowerCase().includes(q)) ||
        (i.mfg_batch_no && i.mfg_batch_no.toLowerCase().includes(q)) // <-- Added search check
      );
    }
    return result;
  }, [items, searchTerm, filterType, filterLowStock]);


  
  // --- Filtering & Pagination ---
  // const filtered = useMemo(() => {
  //   let result = items;
  //   if (filterLowStock) result = result.filter(i => i.is_low_stock === 1);
  //   if (filterType !== "ALL") result = result.filter(i => i.item_type === filterType);
  //   if (searchTerm) {
  //     const q = searchTerm.toLowerCase();
  //     result = result.filter(i => i.name.toLowerCase().includes(q) || (i.items_uhid && i.items_uhid.toLowerCase().includes(q)) || (i.brand && i.brand.toLowerCase().includes(q)));
  //   }
  //   return result;
  // }, [items, searchTerm, filterType, filterLowStock]);

  const lowStockCount = useMemo(() => items.filter((i) => i.is_low_stock === 1).length, [items]);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* Top Control Bar */}
      <div className="bg-white p-4 rounded-[32px] border border-slate-200 flex flex-col xl:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={22} />

          <input
            type="text"
            placeholder="Search items by name, brand, ID, or batch no..."
            className="w-full pl-14 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-slate-900/5 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {/* <input
            type="text"
            placeholder="Search items by name, brand, ID, or batch no..."
            className="w-full pl-14 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-slate-900/5 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          /> */}
          
          {/* <input
            type="text"
            placeholder="Search items by name, brand, or ID..."
            className="w-full pl-14 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-slate-900/5 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          /> */}
        </div>
          <button
            onClick={fetchItems}
            className="p-4 bg-white border border-slate-200 text-slate-400 hover:text-brand-primary rounded-2xl transition-all shadow-sm"
          >
            <RefreshCcw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        <div className="flex items-center gap-3 w-full xl:w-auto overflow-x-auto no-scrollbar pb-2 xl:pb-0">

          
          <button
            onClick={() => setFilterLowStock(!filterLowStock)}
            className={`border rounded-2xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${filterLowStock ? "bg-rose-100 border-rose-200 text-rose-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            <div>



              <div>

                  {lowStockCount > 0 && (
                    <div onClick={() => setFilterLowStock(true)} className="border-rose-200 p-4 rounded-3xl flex items-center justify-between cursor-pointer hover:bg-rose-100 transition-colors shadow-sm">
                      <div className="flex items-center gap-4">
                        {/* <div className="p-3 bg-white text-rose-600 rounded-2xl shadow-sm border border-rose-100"> */}
                          <AlertTriangle size={16} className="animate-pulse" />
                        {/* </div> */}
                        <div>
                          <p className="font-black text-rose-800">{lowStockCount} Low Stocks!</p>
                          {/* <p className="text-xs font-bold text-rose-600 uppercase tracking-widest mt-0.5">Click here to view items needing immediate restock</p> */}
                        </div>
                      </div>
                    </div>
                  )}

               </div>

              {/* <div>
                <AlertTriangle size={16} /> Low Stock
              </div> */}

            </div>

          </button>

          <select
            className="px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none cursor-pointer"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            <option value="DRUG">Drugs</option>
            <option value="CONSUMABLE">Consumables</option>
            <option value="DEVICE">Devices</option>
          </select>


          <div className="w-px h-10 bg-slate-200 mx-1 hidden sm:block"></div>

          <button onClick={handleExportCSV} className="p-4 bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 rounded-2xl transition-all shadow-sm flex items-center gap-2" title="Export CSV">
            <Download size={18} /> <span className="text-xs font-bold hidden sm:inline">Export</span>
          </button>
          
          <button onClick={() => setShowBulkPricingModal(true)} className="p-4 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 rounded-2xl transition-all shadow-sm flex items-center gap-2" title="Bulk Payer Pricing">
            <Settings size={18} /> <span className="text-xs font-bold hidden sm:inline">Bulk Pricing</span>
          </button>
          
          <button onClick={() => setShowBulkImportModal(true)} className="p-4 bg-white border border-slate-200 text-slate-600 hover:text-blue-600 rounded-2xl transition-all shadow-sm flex items-center gap-2" title="Bulk Import">
            <Upload size={18} />
          </button>
          
          <button onClick={handleOpenCreate} className="bg-slate-900 text-white px-6 py-4 rounded-[20px] font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap">
            <Plus size={18} /> Register Item
          </button>
        </div>
      </div>



      {/* Main Table View */}
      <div className="bg-white border border-slate-200 rounded-[44px] overflow-hidden shadow-sm min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-8 py-6">Item Identity</th>
                <th className="px-8 py-6">Brand</th>
                <th className="px-8 py-6">Classification</th>
                <th className="px-8 py-6">Strength</th>
                <th className="px-8 py-6 text-center">Unit / UOM</th>
                <th className="px-8 py-6 text-center">Status</th>
                <th className="px-8 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <Loader2 size={40} className="animate-spin mx-auto text-brand-primary mb-4" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Querying Inventory database...</p>
                  </td>
                </tr>
              ) : paginatedItems.length > 0 ? (
                paginatedItems.map((item) => (
                  <tr key={item.id} className={`transition-colors group ${item.is_low_stock === 1 ? "bg-rose-50/60 hover:bg-rose-100/60" : "hover:bg-slate-50/50"}`}>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm">
                          <Layers size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800">{item.name}</p>
                          <p className="text-[10px] font-mono font-black text-brand-primary uppercase tracking-tighter mt-0.5">{item.items_uhid}</p>
                          {item.is_low_stock === 1 && (
                            <span className="inline-block mt-1 text-[8px] font-black uppercase tracking-widest text-rose-600 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200">Low Stock (≤ {item.reorder_level})</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm text-slate-600 font-bold">{item.brand || "N/A"}</td>
                    <td className="px-8 py-6"><span className="text-[10px] font-black text-slate-500 bg-slate-100 px-3 py-1 rounded-lg uppercase tracking-wider border border-slate-200">{item.item_type}</span></td>
                    <td className="px-8 py-6 text-sm text-slate-600 font-bold">{item.strength || "N/A"}</td>
                    <td className="px-8 py-6 text-sm text-slate-600 font-bold text-center">{item.unit_name}</td>
                    <td className="px-8 py-6">
                      <div className={`mx-auto flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border w-fit ${item.is_active ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-100 text-slate-400 border-slate-200"}`}>
                        {item.is_active ? <CheckCircle2 size={12} /> : <X size={12} />}
                        {item.is_active ? "Active" : "Inactive"}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setShowPrintOptionsModal(item)} className="p-2.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-sm bg-white border border-slate-100" title="Print Item"><Printer size={16} /></button>
                        <button onClick={() => handleOpenBatches(item)} className="p-2.5 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all shadow-sm bg-white border border-slate-100" title="View Batches"><History size={16} /></button>
                        <button onClick={() => handleOpenEdit(item)} className="p-2.5 text-slate-300 hover:text-brand-primary hover:bg-brand-active rounded-xl transition-all shadow-sm bg-white border border-slate-100"><Edit2 size={16} /></button>
                        <button onClick={() => setShowDeleteConfirm(item.id)} className="p-2.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-sm bg-white border border-slate-100"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-32 text-center">
                    <Layers className="mx-auto text-slate-200 mb-4" size={48} />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No matching items in master registry</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Showing <span className="text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-800">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of <span className="text-slate-800">{filtered.length}</span> Master Items
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-3 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-brand-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm">
                <ChevronLeft size={18} />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages > 5 ? 5 : totalPages }).map((_, i) => (
                    <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all border ${currentPage === i + 1 ? "bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-active" : "bg-white text-slate-400 border-slate-200 hover:bg-slate-100"}`}>
                      {i + 1}
                    </button>
                ))}
              </div>
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-3 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-brand-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Item Modal (Create/Edit) */}
      {showAddModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => !isSubmitting && setShowAddModal(false)} />
          <form onSubmit={handleSubmit} className="relative bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex-shrink-0 px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg">
                  <Layers size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">
                    {modalMode === "create" ? "Register New Item" : "Modify Item Parameters"}
                  </h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                    Registry Governance
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setShowAddModal(false)} disabled={isSubmitting} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                <X size={24} />
              </button>
            </div>

            <div className="p-10 space-y-6 flex-1 overflow-y-auto no-scrollbar">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Official Name / Description *</label>
                <input required type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white focus:ring-8 focus:ring-slate-900/5 transition-all outline-none" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Paracetamol 500mg Tablet" />
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Item Category Type</label>
                  <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none cursor-pointer" value={formData.item_type} onChange={(e) => setFormData({ ...formData, item_type: e.target.value as any })}>
                    <option value="DRUG">DRUG</option>
                    <option value="CONSUMABLE">CONSUMABLE</option>
                    <option value="DEVICE">DEVICE</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Department Code</label>
                  <input type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none" value={formData.category_code} onChange={(e) => setFormData({ ...formData, category_code: e.target.value })} placeholder="e.g. PHARMACY" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2 relative">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit of Measure (UOM) *</label>
                  <button type="button" onClick={() => setShowUnitDropdown(!showUnitDropdown)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white transition-all outline-none text-left flex items-center justify-between hover:border-brand-primary">
                    <span className={!formData.unit_id ? "text-slate-400" : ""}>{units.find((u) => u.id === formData.unit_id)?.name || "Select a unit..."}</span>
                    <ChevronDown size={16} className="text-slate-400" />
                  </button>
                  {showUnitDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-lg z-[130]">
                      <div className="p-3 border-b border-slate-100">
                        <input type="text" placeholder="Search unit..." className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0" value={unitSearchTerm} onChange={(e) => setUnitSearchTerm(e.target.value)} autoFocus />
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {loadingDependencies ? (
                          <div className="p-4 text-center"><Loader2 size={16} className="animate-spin mx-auto text-brand-primary" /></div>
                        ) : (
                          units.filter((unit) => unit.name.toLowerCase().includes(unitSearchTerm.toLowerCase())).map((unit) => (
                            <button key={unit.id} type="button" onClick={() => { setFormData({ ...formData, unit_id: unit.id }); setShowUnitDropdown(false); setUnitSearchTerm(""); }} className="w-full text-left px-5 py-3 hover:bg-brand-active border-b border-slate-50 transition-colors last:border-b-0">
                              <p className="text-sm font-black text-slate-800">{unit.name}</p>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><AlertTriangle size={10} className="text-amber-500" /> Reorder Level Threshold</label>
                  <input type="number" required min="0" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white transition-all outline-none" value={formData.reorder_level} onChange={(e) => setFormData({ ...formData, reorder_level: parseInt(e.target.value) || 0 })} placeholder="e.g. 50" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Brand Name</label>
                  <input type="text" placeholder="e.g. Panadol, Aspirin Plus" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:bg-white transition-all" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Strength / Dosage</label>
                  <input type="text" placeholder="e.g. 500mg, 1g, 2.5%" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:bg-white transition-all" value={formData.strength} onChange={(e) => setFormData({ ...formData, strength: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Formulation Type</label>
                <input type="text" placeholder="e.g. Tablet, Capsule, Injection, Syrup" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:bg-white transition-all" value={formData.formulation} onChange={(e) => setFormData({ ...formData, formulation: e.target.value })} />
              </div>
            </div>

            <div className="flex-shrink-0 px-10 py-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={() => setShowAddModal(false)} disabled={isSubmitting} className="px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-700">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="bg-slate-900 text-white px-10 py-4 rounded-[20px] font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-2">
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {isSubmitting ? "Syncing..." : modalMode === "create" ? "Register Item" : "Commit Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* NEW BULK PRICING MODAL */}
      {showBulkPricingModal && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => !isSubmitting && setShowBulkPricingModal(false)} />
          <form onSubmit={handleBulkPricingSubmit} className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex-shrink-0 p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <Settings size={20} className="text-indigo-600" />
                  Bulk Payer Pricing
                </h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                  Apply markup rule to ALL active batches
                </p>
              </div>
              <button type="button" onClick={() => setShowBulkPricingModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-6">
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex gap-3">
                <AlertCircle size={20} className="text-indigo-600 shrink-0" />
                <p className="text-[10px] font-bold text-indigo-800 leading-relaxed uppercase">
                  Warning: This action overrides existing pricing rules for the selected payer across all active inventory batches instantly.
                </p>
              </div>

              <div className="space-y-2 relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Payer (Cash/HMO/Corporate) *</label>
                <button type="button" onClick={() => setShowPayerDropdown(!showPayerDropdown)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white transition-all outline-none text-left flex items-center justify-between hover:border-brand-primary">
                  <span className={!bulkPricingForm.payer_id ? "text-slate-400" : ""}>
                    {payers.find((p) => p.id.toString() === bulkPricingForm.payer_id)?.name || "Select a Payer..."}
                  </span>
                  <ChevronDown size={16} className="text-slate-400" />
                </button>
                {showPayerDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-lg z-[170]">
                    <div className="p-3 border-b border-slate-100">
                      <input type="text" placeholder="Search payer..." className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0" value={payerSearchTerm} onChange={(e) => setPayerSearchTerm(e.target.value)} autoFocus />
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {loadingDependencies ? (
                        <div className="p-4 text-center"><Loader2 size={16} className="animate-spin mx-auto text-brand-primary" /></div>
                      ) : (
                          payers.filter(p => p.name.toLowerCase().includes(payerSearchTerm.toLowerCase())).map((payer) => (
                        // payers.filter(p => p.name !== "Cash Payment" && p.name.toLowerCase().includes(payerSearchTerm.toLowerCase())).map((payer) => (
                          <button key={payer.id} type="button" onClick={() => { setBulkPricingForm({ ...bulkPricingForm, payer_id: payer.id.toString() }); setShowPayerDropdown(false); setPayerSearchTerm(""); }} className="w-full text-left px-5 py-3 hover:bg-brand-active border-b border-slate-50 transition-colors last:border-b-0">
                            <p className="text-sm font-black text-slate-800">{payer.name}</p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Markup Type</label>
                  <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none cursor-pointer" value={bulkPricingForm.markup_type} onChange={(e) => setBulkPricingForm({ ...bulkPricingForm, markup_type: e.target.value as MarkupType })}>
                    {MARKUP_TYPES.map((type) => ( <option key={type} value={type}>{type}</option> ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Markup Value</label>
                  <div className="relative">
                    <input required type="number" className="w-full pl-10 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none" value={bulkPricingForm.markup_value} onChange={(e) => setBulkPricingForm({ ...bulkPricingForm, markup_value: parseFloat(e.target.value) || 0 })} />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400"> {bulkPricingForm.markup_type === "PERCENTAGE" ? "%" : "₦"} </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 p-8 pt-0 flex gap-3">
              <button type="button" onClick={() => setShowBulkPricingModal(false)} className="flex-1 py-4 rounded-2xl border-2 border-slate-100 font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting} className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Settings size={16} />}
                {isSubmitting ? "Processing..." : "Apply to All"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Batch Management Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowBatchModal(null)} />
          <div className="relative bg-white h-full w-full max-w-5xl shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="p-10 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase tracking-widest">
                  Batch Inventory
                </h3>
                <p className="text-sm font-bold text-brand-primary uppercase tracking-widest mt-1">
                  {showBatchModal.name}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowAddBatchModal(true)} className="px-6 py-3 bg-brand-primary text-white rounded-[20px] font-black uppercase text-[10px] tracking-widest hover:bg-brand-primary/90 transition-all flex items-center gap-2">
                  <Plus size={16} /> Add Batch
                </button>
                <button onClick={() => window.open(`/print/inventory/batches/${showBatchModal.id}`, "_blank")} className="p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-400" title="Print Batches">
                  <Printer size={24} />
                </button>
                <button onClick={() => setShowBatchModal(null)} className="p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                  <X size={28} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-6 no-scrollbar bg-slate-50/30">
              {loadingBatches ? (
                <div className="py-20 text-center">
                  <Loader2 size={40} className="animate-spin mx-auto text-brand-primary mb-4" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Retrieving Batch Records...</p>
                </div>
              ) : batches.length > 0 ? (
                <div className="space-y-4">
                  {batches.map((batch) => (
                    <div key={batch.id} className="p-6 rounded-[32px] border-2 border-slate-100 hover:border-brand-active transition-all group bg-white shadow-sm">
                      <div className="flex items-start justify-between mb-6">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sys Ref: {batch.batch_number}</p>
                          <p className="text-sm font-black text-slate-800 font-mono">Mfg: {batch.mfg_batch_no || "N/A"}</p>
                          <p className="text-[10px] font-bold text-brand-primary uppercase tracking-tighter">{batch.item_name} - {batch.brand}</p>
                        </div>
                        <div className="flex gap-10">
                          <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Purchase Price</p>
                            <p className="text-sm font-black text-slate-700">₦{parseFloat(batch.purchase_price || 0).toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expiry Date</p>
                            <p className={`text-sm font-black ${batch.expiry_date ? "text-slate-800" : "text-slate-300 italic"}`}>{batch.expiry_date || "No Expiry Set"}</p>
                          </div>
                        </div>
                      </div>

                      {/* Display Rules */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                        {/* Cash Rule (Default) */}
                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Cash / Default Selling Price</p>
                          <div className="flex items-end justify-between">
                            <span className="text-base font-black text-emerald-600">₦{parseFloat(batch.selling_price || 0).toLocaleString()}</span>
                            <span className="text-[10px] font-bold text-slate-500">{batch.markup_type} {batch.markup_value}%</span>
                          </div>
                        </div>

                        {/* Payer Rules */}
                        {batch.payer_markups && batch.payer_markups.map((rule: any, i: number) => {
                          const cost = parseFloat(batch.purchase_price);
                          const val = parseFloat(rule.markup_value);
                          let price = cost;
                          if (rule.markup_type === "PERCENTAGE") price = cost + (cost * val / 100);
                          else if (rule.markup_type === "FIXED") price = cost + val;

                          return (
                            <div key={i} className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl flex flex-col justify-between">
                              <p className="text-[9px] font-black text-indigo-400 uppercase truncate" title={payers.find(p => p.id === parseInt(rule.payer_id))?.name || "Unknown Payer"}>
                                {payers.find(p => p.id === parseInt(rule.payer_id))?.name || "Unknown Payer"}
                              </p>
                              <div className="flex items-end justify-between mt-1">
                                <span className="text-base font-black text-indigo-700">₦{price.toLocaleString()}</span>
                                <span className="text-[10px] font-bold text-indigo-500">{rule.markup_type} {rule.markup_value}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase">Total Stock</p>
                            <p className="text-lg font-black text-purple-600 leading-none">
                              {stockEntries.filter((s) => s.batch_id === batch.id).reduce((total, s) => total + parseFloat(s.quantity || 0), 0).toLocaleString()} <span className="text-[10px] font-bold text-slate-400">units</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleOpenStockIn(batch)} className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all shadow-sm border border-emerald-100 flex items-center gap-2" title="Stock In to this Batch">
                            <ArrowDownToLine size={16} /> <span className="text-[10px] font-bold pr-1 hidden sm:inline">Stock In</span>
                          </button>
                          <button onClick={() => handleOpenStockIssue(batch)} className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white rounded-xl transition-all shadow-sm border border-amber-100 flex items-center gap-2" title="Issue Stock from this Batch">
                            <ArrowUpRight size={16} /> <span className="text-[10px] font-bold pr-1 hidden sm:inline">Issue</span>
                          </button>
                          <button onClick={() => handleOpenEditBatch(batch)} className="p-2 text-slate-400 hover:text-brand-primary hover:bg-brand-active border border-slate-100 hover:border-transparent rounded-xl transition-all shadow-sm" title="Edit Batch">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => setShowDeleteBatchConfirm(batch.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-100 hover:border-transparent rounded-xl transition-all shadow-sm" title="Delete Batch">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Stock Entries Details */}
         

         {/* Stock Entries Details */}
                      <div className="mt-6 pt-4 border-t border-slate-50 space-y-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Stock Distribution by Location</p>
                        
                        {loadingStockEntries ? (
                          <div className="flex items-center gap-2 py-2">
                            <Loader2 size={12} className="animate-spin text-brand-primary" />
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Syncing...</span>
                          </div>
                        ) : stockEntries.filter((s) => s.batch_id === batch.id).length > 0 ? (
                          <div className="bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden">
                            <div className="overflow-x-auto w-full">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-slate-100/50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    <th className="py-3 pl-4 pr-2">Location</th>
                                    <th className="py-3 px-2 text-right">Quantity</th>
                                    <th className="py-3 px-2 text-center">Unit</th>
                                    <th className="py-3 px-2">Created Info</th>
                                    <th className="py-3 px-2">Last Updated</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {stockEntries.filter((s) => s.batch_id === batch.id).map((stock) => (
                                    <tr key={stock.id} className="hover:bg-white transition-colors group">
                                      {/* Location */}
                                      <td className="py-3 pl-4 pr-2">
                                        <div className="flex items-center gap-3">
                                          <div className="p-1.5 bg-white text-slate-400 rounded-lg shadow-sm border border-slate-200 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                            <Building2 size={12} />
                                          </div>
                                          <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">
                                            {stock.location}
                                          </span>
                                        </div>
                                      </td>
                                      
                                      {/* Quantity */}
                                      <td className="py-3 px-2 text-right">
                                        <span className="text-sm font-black text-brand-primary">
                                          {parseFloat(stock.quantity).toLocaleString()}
                                        </span>
                                      </td>

                                      {/* Unit */}
                                      <td className="py-3 px-2 text-center">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">
                                          {stock.unit_name}
                                        </span>
                                      </td>

                                      {/* Created Info */}
                                      <td className="py-3 px-2">
                                        <div className="flex flex-col">
                                          <span className="text-[11px] font-bold text-slate-600">
                                            {stock.created_at || "N/A"}
                                          </span>
                                          <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                                            By: <span className="text-brand-primary">{stock.created_by_name || "System"}</span>
                                          </span>
                                        </div>
                                      </td>

                                      {/* Updated Info */}
                                      <td className="py-3 px-2">
                                        <div className="flex flex-col">
                                          <span className="text-[11px] font-bold text-slate-600">
                                            {stock.updated_at || "N/A"}
                                          </span>
                                          <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                                            By: <span className="text-brand-primary">{stock.updated_by_name || "-"}</span>
                                          </span>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center py-6 border-2 border-dashed border-slate-100 rounded-2xl bg-white">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No stock records found for this batch.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-[40px]">
                  <History size={48} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No batches found for this item</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Batch Modal */}
      {showAddBatchModal && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => !isSubmitting && setShowAddBatchModal(false)} />
          <form onSubmit={handleAddBatchSubmit} className="relative bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex-shrink-0 px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-600 text-white rounded-2xl shadow-lg">
                  <Plus size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">Add New Batch</h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">For {showBatchModal?.name}</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowAddBatchModal(false)} disabled={isSubmitting} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                <X size={24} />
              </button>
            </div>

            <div className="p-10 space-y-6 text-left flex-1 overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Batch No *</label>
                  <input required type="text" placeholder="e.g. BATCH-001" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white transition-all outline-none" value={addBatchForm.mfg_batch_no} onChange={(e) => setAddBatchForm({ ...addBatchForm, mfg_batch_no: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Expiry Date *</label>
                  <input required type="date" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white transition-all outline-none" value={addBatchForm.expiry_date} onChange={(e) => setAddBatchForm({ ...addBatchForm, expiry_date: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cost Price (₦) *</label>
                  <input required min="0.01" step="any" type="number" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white transition-all outline-none" value={addBatchForm.purchase_price || ""} onChange={(e) => setAddBatchForm({ ...addBatchForm, purchase_price: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>

              <div className="space-y-1.5 relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vendor / Supplier</label>
                <button type="button" onClick={() => setShowVendorDropdown(!showVendorDropdown)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white transition-all outline-none text-left flex items-center justify-between hover:border-brand-primary">
                  <span>{vendors.find((v) => v.vendor_uhid === addBatchForm.vendor_uhid)?.name || "Select vendor..."}</span>
                  <ChevronDown size={16} className="text-slate-400" />
                </button>
                {showVendorDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-lg z-[170]">
                    <div className="p-3 border-b border-slate-100">
                      <input type="text" placeholder="Search vendor..." className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0" value={vendorSearchTerm} onChange={(e) => setVendorSearchTerm(e.target.value)} autoFocus />
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {loadingDependencies ? (
                        <div className="p-4 text-center"><Loader2 size={16} className="animate-spin mx-auto text-brand-primary" /></div>
                      ) : (
                        vendors.filter((v) => v.name.toLowerCase().includes(vendorSearchTerm.toLowerCase()) || v.vendor_uhid.toLowerCase().includes(vendorSearchTerm.toLowerCase())).map((vendor) => (
                            <button key={vendor.vendor_uhid} type="button" onClick={() => { setAddBatchForm({ ...addBatchForm, vendor_uhid: vendor.vendor_uhid }); setShowVendorDropdown(false); setVendorSearchTerm(""); }} className="w-full text-left px-5 py-3 hover:bg-brand-active border-b border-slate-50 transition-colors last:border-b-0">
                              <p className="text-sm font-black text-slate-800">{vendor.name}</p>
                              <p className="text-[10px] font-bold text-slate-500 mt-0.5">{vendor.vendor_uhid} • {vendor.contact_person}</p>
                            </button>
                          ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Default Cash Markup Type</label>
                  <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white transition-all outline-none" value={addBatchForm.markup_type} onChange={(e) => setAddBatchForm({ ...addBatchForm, markup_type: e.target.value as MarkupType })}>
                    {MARKUP_TYPES.map((type) => ( <option key={type} value={type}>{type}</option> ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Default Cash Markup Value *</label>
                  <input required type="number" min="0.01" step="any" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white transition-all outline-none" value={addBatchForm.markup_value || ""} onChange={(e) => setAddBatchForm({ ...addBatchForm, markup_value: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>

              {/* Dynamic Payer Markups */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-black text-slate-800 tracking-wider">HMO / Corporate Pricing Rules</h4>
                  <button type="button" onClick={() => setAddBatchForm({ ...addBatchForm, payer_markups: [...addBatchForm.payer_markups, { id: Date.now().toString(), markup_type: "PERCENTAGE", markup_value: 0, payer_ids: [] }] })} className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors uppercase tracking-widest flex items-center gap-1">
                    <Plus size={12} /> Add Rule
                  </button>
                </div>
                {addBatchForm.payer_markups.map((rule) => (
                  <div key={rule.id} className="mb-4 p-4 bg-white rounded-xl border border-indigo-100 shadow-sm relative pr-12">
                    <button type="button" onClick={() => setAddBatchForm({ ...addBatchForm, payer_markups: addBatchForm.payer_markups.filter(r => r.id !== rule.id) })} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 bg-slate-50 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={16} /></button>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-4">
                        <div className="w-32">
                          <select className="w-full px-3 py-2 border border-indigo-100 rounded-lg text-xs font-bold bg-indigo-50/30 text-indigo-800" value={rule.markup_type} onChange={(e) => setAddBatchForm({ ...addBatchForm, payer_markups: addBatchForm.payer_markups.map(r => r.id === rule.id ? { ...r, markup_type: e.target.value as MarkupType } : r) })}>
                            {MARKUP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div className="w-32 relative">
                          <input type="number" className="w-full px-3 py-2 border border-indigo-100 rounded-lg text-xs font-bold pl-8 text-indigo-900 bg-white" value={rule.markup_value || ""} onChange={(e) => setAddBatchForm({ ...addBatchForm, payer_markups: addBatchForm.payer_markups.map(r => r.id === rule.id ? { ...r, markup_value: parseFloat(e.target.value) || 0 } : r) })} />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-indigo-400">{rule.markup_type === "PERCENTAGE" ? "%" : "₦"}</span>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-indigo-50">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 flex items-center gap-1"><Users size={12} /> Applies To Payer(s):</span>
                        <div className="flex flex-wrap gap-2">
                          {payers.map((payer) => {
                            const currentlyAllocatedIds = addBatchForm.payer_markups.flatMap(r => r.payer_ids);
                            const isSelectedInOtherRule = currentlyAllocatedIds.includes(payer.id) && !rule.payer_ids.includes(payer.id);
                            const isSelectedHere = rule.payer_ids.includes(payer.id);
                            return (
                              <button type="button" key={payer.id} disabled={isSelectedInOtherRule} onClick={() => setAddBatchForm({ ...addBatchForm, payer_markups: addBatchForm.payer_markups.map(r => { if (r.id === rule.id) { return { ...r, payer_ids: isSelectedHere ? r.payer_ids.filter(id => id !== payer.id) : [...r.payer_ids, payer.id] }; } return r; }) })} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${isSelectedHere ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : isSelectedInOtherRule ? "bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed opacity-50" : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"}`}>
                                {payer.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {addBatchForm.payer_markups.length === 0 && <p className="text-xs text-slate-400 italic text-center py-2">No HMO exceptions defined. Default Cash markup will apply to all.</p>}
              </div>

            </div>
            <div className="flex-shrink-0 px-10 py-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={() => setShowAddBatchModal(false)} disabled={isSubmitting} className="px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Cancel</button>
              
              <button 
                type="submit" 
                disabled={isSubmitting || !addBatchForm.mfg_batch_no.trim() || !addBatchForm.expiry_date || addBatchForm.purchase_price <= 0 || addBatchForm.markup_value <= 0} 
                className="bg-green-600 text-white px-8 py-3 rounded-[20px] font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Create Batch
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Batch Modal */}
      {showEditBatchModal && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => !isSubmitting && setShowEditBatchModal(null)} />
          <form onSubmit={handleEditBatchSubmit} className="relative bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex-shrink-0 px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-brand-primary text-white rounded-2xl shadow-lg">
                  <Edit2 size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">Modify Batch</h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Ref: {showEditBatchModal.batch_number}</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowEditBatchModal(null)} disabled={isSubmitting} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                <X size={24} />
              </button>
            </div>

            <div className="p-10 space-y-6 text-left flex-1 overflow-y-auto no-scrollbar">

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Batch No *</label>
                  <input required type="text" placeholder="e.g. BATCH-001" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white transition-all outline-none" value={editBatchForm.mfg_batch_no} onChange={(e) => setEditBatchForm({ ...editBatchForm, mfg_batch_no: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Expiry Date *</label>
                  <input required type="date" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white transition-all outline-none" value={editBatchForm.expiry_date} onChange={(e) => setEditBatchForm({ ...editBatchForm, expiry_date: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cost Price (₦) *</label>
                  <input required min="0.01" step="any" type="number" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white transition-all outline-none" value={editBatchForm.purchase_price || ""} onChange={(e) => setEditBatchForm({ ...editBatchForm, purchase_price: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>

              <div className="space-y-1.5 relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vendor / Supplier</label>
                <button type="button" onClick={() => setShowVendorDropdown(!showVendorDropdown)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white transition-all outline-none text-left flex items-center justify-between hover:border-brand-primary">
                  <span>{vendors.find((v) => v.vendor_uhid === editBatchForm.vendor_uhid)?.name || "Select vendor..."}</span>
                  <ChevronDown size={16} className="text-slate-400" />
                </button>
                {showVendorDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-lg z-[170]">
                    <div className="p-3 border-b border-slate-100">
                      <input type="text" placeholder="Search vendor..." className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-active0" value={vendorSearchTerm} onChange={(e) => setVendorSearchTerm(e.target.value)} autoFocus />
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {loadingDependencies ? (
                        <div className="p-4 text-center"><Loader2 size={16} className="animate-spin mx-auto text-brand-primary" /></div>
                      ) : (
                        vendors.filter((v) => v.name.toLowerCase().includes(vendorSearchTerm.toLowerCase()) || v.vendor_uhid.toLowerCase().includes(vendorSearchTerm.toLowerCase())).map((vendor) => (
                            <button key={vendor.vendor_uhid} type="button" onClick={() => { setEditBatchForm({ ...editBatchForm, vendor_uhid: vendor.vendor_uhid }); setShowVendorDropdown(false); setVendorSearchTerm(""); }} className="w-full text-left px-5 py-3 hover:bg-brand-active border-b border-slate-50 transition-colors last:border-b-0">
                              <p className="text-sm font-black text-slate-800">{vendor.name}</p>
                              <p className="text-[10px] font-bold text-slate-500 mt-0.5">{vendor.vendor_uhid} • {vendor.contact_person}</p>
                            </button>
                          ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Default Cash Markup Type</label>
                  <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white transition-all outline-none" value={editBatchForm.markup_type} onChange={(e) => setEditBatchForm({ ...editBatchForm, markup_type: e.target.value as MarkupType })}>
                    {MARKUP_TYPES.map((type) => (<option key={type} value={type}>{type}</option>))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Default Cash Markup Value *</label>
                  <input required type="number" min="0.01" step="any" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white transition-all outline-none" value={editBatchForm.markup_value || ""} onChange={(e) => setEditBatchForm({ ...editBatchForm, markup_value: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>

              {/* Dynamic Payer Markups */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-black text-slate-800 tracking-wider">HMO / Corporate Pricing Rules</h4>
                  <button type="button" onClick={() => setEditBatchForm({ ...editBatchForm, payer_markups: [...editBatchForm.payer_markups, { id: Date.now().toString(), markup_type: "PERCENTAGE", markup_value: 0, payer_ids: [] }] })} className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors uppercase tracking-widest flex items-center gap-1">
                    <Plus size={12} /> Add Rule
                  </button>
                </div>
                {editBatchForm.payer_markups.map((rule) => (
                  <div key={rule.id} className="mb-4 p-4 bg-white rounded-xl border border-indigo-100 shadow-sm relative pr-12">
                    <button type="button" onClick={() => setEditBatchForm({ ...editBatchForm, payer_markups: editBatchForm.payer_markups.filter(r => r.id !== rule.id) })} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-50 bg-slate-50 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={16} /></button>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-4">
                        <div className="w-32">
                          <select className="w-full px-3 py-2 border border-indigo-100 rounded-lg text-xs font-bold bg-indigo-50/30 text-indigo-800" value={rule.markup_type} onChange={(e) => setEditBatchForm({ ...editBatchForm, payer_markups: editBatchForm.payer_markups.map(r => r.id === rule.id ? { ...r, markup_type: e.target.value as MarkupType } : r) })}>
                            {MARKUP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div className="w-32 relative">
                          <input type="number" className="w-full px-3 py-2 border border-indigo-100 rounded-lg text-xs font-bold pl-8 text-indigo-900 bg-white" value={rule.markup_value || ""} onChange={(e) => setEditBatchForm({ ...editBatchForm, payer_markups: editBatchForm.payer_markups.map(r => r.id === rule.id ? { ...r, markup_value: parseFloat(e.target.value) || 0 } : r) })} />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-indigo-400">{rule.markup_type === "PERCENTAGE" ? "%" : "₦"}</span>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-indigo-50">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 flex items-center gap-1"><Users size={12} /> Applies To Payer(s):</span>
                        <div className="flex flex-wrap gap-2">
                          {payers.map((payer) => {
                            const currentlyAllocatedIds = editBatchForm.payer_markups.flatMap(r => r.payer_ids);
                            const isSelectedInOtherRule = currentlyAllocatedIds.includes(payer.id) && !rule.payer_ids.includes(payer.id);
                            const isSelectedHere = rule.payer_ids.includes(payer.id);
                            return (
                              <button type="button" key={payer.id} disabled={isSelectedInOtherRule} onClick={() => setEditBatchForm({ ...editBatchForm, payer_markups: editBatchForm.payer_markups.map(r => { if (r.id === rule.id) { return { ...r, payer_ids: isSelectedHere ? r.payer_ids.filter(id => id !== payer.id) : [...r.payer_ids, payer.id] }; } return r; }) })} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${isSelectedHere ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : isSelectedInOtherRule ? "bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed opacity-50" : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"}`}>
                                {payer.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {editBatchForm.payer_markups.length === 0 && <p className="text-xs text-slate-400 italic text-center py-2">No HMO exceptions defined. Default Cash markup will apply to all.</p>}
              </div>

            </div>
            <div className="flex-shrink-0 px-10 py-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={() => setShowEditBatchModal(null)} disabled={isSubmitting} className="px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Cancel</button>
              <button 
                type="submit" 
                disabled={isSubmitting || !editBatchForm.mfg_batch_no.trim() || !editBatchForm.expiry_date || editBatchForm.purchase_price <= 0 || editBatchForm.markup_value <= 0} 
                className="bg-brand-primary text-white px-8 py-3 rounded-[20px] font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkImportModal && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => { setShowBulkImportModal(false); setBulkImportFile(null); }} />
          <div className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <Upload size={20} className="text-brand-primary" />
                  Bulk Import Items
                </h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Download, fill, and upload a template</p>
              </div>
              <button onClick={() => { setShowBulkImportModal(false); setBulkImportFile(null); }} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"><X size={20} /></button>
            </div>

            <div className="p-8 space-y-6">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Step 1 — Download Template</p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => handleDownloadTemplate("csv")} disabled={isDownloadingTemplate !== null} className="p-4 rounded-2xl border-2 border-slate-100 hover:border-brand-primary hover:bg-brand-active transition-all flex flex-col items-center gap-2 disabled:opacity-50">
                    {isDownloadingTemplate === "csv" ? <Loader2 size={20} className="animate-spin text-brand-primary" /> : <Download size={20} className="text-slate-400" />}
                    <span className="text-xs font-black text-slate-700">CSV</span>
                  </button>
                  <button onClick={() => handleDownloadTemplate("xlsx")} disabled={isDownloadingTemplate !== null} className="p-4 rounded-2xl border-2 border-slate-100 hover:border-brand-primary hover:bg-brand-active transition-all flex flex-col items-center gap-2 disabled:opacity-50">
                    {isDownloadingTemplate === "xlsx" ? <Loader2 size={20} className="animate-spin text-brand-primary" /> : <Download size={20} className="text-slate-400" />}
                    <span className="text-xs font-black text-slate-700">XLSX</span>
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Step 2 — Upload Filled Template</p>
                <label
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingImportFile(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDraggingImportFile(false); }}
                  onDrop={(e) => { e.preventDefault(); setIsDraggingImportFile(false); acceptImportFile(e.dataTransfer.files?.[0]); }}
                  className={`w-full p-6 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center gap-2 cursor-pointer ${isDraggingImportFile ? "border-brand-primary bg-brand-active/40" : "border-slate-200 hover:border-brand-primary hover:bg-brand-active/40"}`}
                >
                  <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => acceptImportFile(e.target.files?.[0])} />
                  <UploadCloud size={24} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-600 text-center">{bulkImportFile ? bulkImportFile.name : "Drag & drop a file here, or click to browse"}</span>
                </label>
              </div>
            </div>

            <div className="p-8 pt-0 flex gap-3">
              <button onClick={() => { setShowBulkImportModal(false); setBulkImportFile(null); }} className="flex-1 py-4 rounded-2xl border-2 border-slate-100 font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all">Cancel</button>
              <button onClick={handleBulkImportSubmit} disabled={!bulkImportFile || isUploadingBulkImport} className="flex-1 py-4 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {isUploadingBulkImport ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} {isUploadingBulkImport ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Item Confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => !isSubmitting && setShowDeleteConfirm(null)} />
          <div className="relative bg-white w-full max-w-sm rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 p-10 text-center">
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-[32px] flex items-center justify-center mx-auto mb-6 border border-red-100 shadow-inner">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Confirm Removal</h3>
            <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed px-4">Remove this item from the hospital inventory registry? This action cannot be reversed.</p>
            <div className="mt-10 flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} disabled={isSubmitting} className="flex-1 px-6 py-4 rounded-[24px] font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-slate-800 transition-all">Cancel</button>
              <button onClick={handleDelete} disabled={isSubmitting} className="flex-1 bg-red-600 text-white px-6 py-4 rounded-[24px] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-red-200 hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-2">
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Batch Confirm */}
      {showDeleteBatchConfirm && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => !isSubmitting && setShowDeleteBatchConfirm(null)} />
          <div className="relative bg-white w-full max-w-sm rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 p-10 text-center">
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-[32px] flex items-center justify-center mx-auto mb-6 border border-red-100 shadow-inner">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Delete Batch</h3>
            <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed px-4">Are you sure you want to delete this batch? This action cannot be undone and will fail if stock movements exist.</p>
            <div className="mt-10 flex gap-3">
              <button onClick={() => setShowDeleteBatchConfirm(null)} disabled={isSubmitting} className="flex-1 px-6 py-4 rounded-[24px] font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-slate-800 transition-all">Cancel</button>
              <button onClick={handleDeleteBatch} disabled={isSubmitting} className="flex-1 bg-red-600 text-white px-6 py-4 rounded-[24px] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-red-200 hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-2">
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock In & Issue Modals */}
      {showStockInModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => !isSubmitting && setShowStockInModal(null)} />
          <form onSubmit={handleStockInSubmit} className="relative bg-white w-full max-w-sm rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-10 text-center">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[32px] flex items-center justify-center mx-auto mb-6 border border-emerald-100">
                <Box size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Update Stock Levels</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Ref: {showStockInModal.batch_number || "UNKNOWN"}</p>
              <div className="mt-8 space-y-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Additional Quantity</label>
                  <input required autoFocus type="number" className="w-full px-5 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl text-3xl font-black text-slate-900 outline-none focus:border-emerald-500 focus:ring-8 focus:ring-emerald-500/5 transition-all text-center" value={stockInForm.quantity || ""} onChange={(e) => setStockInForm({ quantity: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="mt-10 flex gap-3">
                <button type="button" onClick={() => setShowStockInModal(null)} disabled={isSubmitting} className="flex-1 px-6 py-4 rounded-[24px] font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-slate-800 transition-all">Cancel</button>
                <button type="submit" disabled={isSubmitting || stockInForm.quantity <= 0} className="flex-1 bg-emerald-600 text-white px-6 py-4 rounded-[24px] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Commit IN
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {showStockIssueModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => !isSubmitting && setShowStockIssueModal(null)} />
          <form onSubmit={handleStockIssueSubmit} className="relative bg-white w-full max-w-sm rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-10 text-center">
              <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-[32px] flex items-center justify-center mx-auto mb-6 border border-amber-100">
                <ArrowUpRight size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Issue Stock</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Ref: {showStockIssueModal.batch_number || "UNKNOWN"}</p>
              <div className="mt-8 space-y-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Issue Quantity</label>
                  <input required autoFocus type="number" className="w-full px-5 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl text-3xl font-black text-slate-900 outline-none focus:border-amber-500 focus:ring-8 focus:ring-amber-500/5 transition-all text-center" value={stockIssueForm.quantity || ""} onChange={(e) => setStockIssueForm({ ...stockIssueForm, quantity: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Destination</label>
                  <select required className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-amber-500 focus:ring-8 focus:ring-amber-500/5 transition-all cursor-pointer" value={stockIssueForm.destination} onChange={(e) => setStockIssueForm({ ...stockIssueForm, destination: e.target.value })}>
                    <option value="WARD">Ward</option>
                    <option value="PHARMACY">Pharmacy</option>
                    <option value="THEATRE">Theatre</option>
                    <option value="ICU">ICU</option>
                    <option value="OUTPATIENT">Outpatient</option>
                    <option value="EMERGENCY">Emergency</option>
                    <option value="OTHER">Other Department</option>
                  </select>
                </div>
              </div>
              <div className="mt-10 flex gap-3">
                <button type="button" onClick={() => setShowStockIssueModal(null)} disabled={isSubmitting} className="flex-1 px-6 py-4 rounded-[24px] font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-slate-800 transition-all">Cancel</button>
                <button type="submit" disabled={isSubmitting || stockIssueForm.quantity <= 0} className="flex-1 bg-amber-600 text-white px-6 py-4 rounded-[24px] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-amber-100 hover:bg-amber-700 active:scale-95 transition-all flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Confirm Issue
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default InventoryStockMaster;


