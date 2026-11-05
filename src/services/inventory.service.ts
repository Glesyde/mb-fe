import apiClient from "../api/client";

export type MarkupType = "PERCENTAGE" | "FIXED" | "NONE";

export type RequisitionDepartment =
  | "STORE"
  | "PHARMACY"
  | "CSSD"
  | "THEATRE"
  | "LAB"
  | "RADIOLOGY"
  | "WARD"
  | "ICU"
  | "HDU"
  | "ERD"
  | "OPD"
  | "DIALYSIS"
  | "LABOUR_WARD"
  | "BILLING"
  | "PATIENTADMIN";

const DEPARTMENT_LABELS: Partial<Record<RequisitionDepartment | "ALL", string>> = {
  PATIENTADMIN: "Patient Admin",
  ALL: "All Departments",
};
const DEPARTMENT_ACRONYMS = new Set(["OPD", "ICU", "HDU", "ERD", "CSSD"]);

export function formatDepartmentLabel(code?: string | null): string {
  if (!code) return "N/A";
  if (DEPARTMENT_LABELS[code as RequisitionDepartment | "ALL"]) {
    return DEPARTMENT_LABELS[code as RequisitionDepartment | "ALL"]!;
  }
  if (DEPARTMENT_ACRONYMS.has(code)) return code;
  return code.charAt(0) + code.slice(1).toLowerCase();
}

// Departments that have a per-department stock_<dept> field on the item search response.
// (DIALYSIS/BILLING/PATIENTADMIN aren't stock-tracked, so they're excluded here.)
export const ITEM_STOCK_DEPARTMENTS: RequisitionDepartment[] = [
  "STORE",
  "PHARMACY",
  "CSSD",
  "THEATRE",
  "LAB",
  "RADIOLOGY",
  "WARD",
  "ICU",
  "HDU",
  "ERD",
  "OPD",
];

export function getItemDeptStock(item: any, dept: RequisitionDepartment): number {
  const key = `stock_${dept.toLowerCase()}`;
  return parseFloat(item?.[key] ?? "0") || 0;
}

export type RequisitionType = "GENERAL" | "PATIENT_SPECIFIC" | "EMERGENCY";

export interface InventoryItem {
  id: number;
  items_uhid: string;
  name: string;
  brand?: string;
  item_type: "DRUG" | "CONSUMABLE" | "DEVICE";
  strength?: string;
  formulation?: string;
  category_code: string;
  unit: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by?: number;
  reference_id?: number;
}

export interface InventoryBatch {
  id: number;
  item_id: number;
  batch_number: string;
  expiry_date?: string;
  vendor_id?: number;
  purchase_price?: string;
  markup_type: MarkupType;
  markup_value: string;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by?: number;
  is_active: number;
  item_name: string;
  brand: string;
  vendor_name?: string;
  selling_price: string;
}

export const inventoryService = {
  /**
   * VENDOR MANAGEMENT
   */
  async addVendor(payload: {
    name: string;
    contact_person: string;
    contact_phone: string;
    contact_email: string;
    address: string;
    status: string;
  }): Promise<any> {
    const response = await apiClient.post("/inventory/add-vendors", payload);
    return response.data;
  },

  async searchVendors(): Promise<any[]> {
    const response = await apiClient.get("/inventory/search-vendors");
    return response.data?.data || [];
  },

  async getVendor(id: number): Promise<any> {
    const response = await apiClient.get(`/inventory/vendor/show?id=${id}`);
    return response.data?.data;
  },

  async updateVendor(id: number, payload: any): Promise<any> {
    const response = await apiClient.put(
      `/inventory/vendor/update?id=${id}`,
      payload,
    );
    return response.data;
  },

  async deleteVendor(id: number): Promise<any> {
    const response = await apiClient.delete(
      `/inventory/vendor/delete?id=${id}`,
    );
    return response.data;
  },

  /**
   * ITEM MANAGEMENT
   */
  async createItem(payload: {
    name: string;
    item_type: "DRUG" | "CONSUMABLE" | "DEVICE";
    category_code: string;
    unit_id: number;
    brand?: string;
    strength?: string;
    formulation?: string;
  }): Promise<any> {
    const response = await apiClient.post("/inventory/create/items", payload);
    return response.data;
  },

  async getItemUnits(): Promise<any[]> {
    const response = await apiClient.get("/inventory/items/units");
    return response.data?.data || [];
  },

  async downloadItemTemplate(format: "csv" | "xlsx" = "csv"): Promise<void> {
    const response = await apiClient.get(`/inventory/items/template?format=${format}`, {
      responseType: "blob",
    });
    const mimeType =
      format === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "text/csv";
    const blob = new Blob([response.data], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `inventory-item-template.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async uploadItemTemplate(file: File): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post("/inventory/items/upload", formData);
    return response.data;
  },

  async searchItems(): Promise<any[]> {
    const response = await apiClient.get("/inventory/search/items");
    return response.data?.data || [];
  },

  async getItem(id: number): Promise<any> {
    const response = await apiClient.get(`/inventory/items/search?id=${id}`);
    return response.data?.data;
  },

  async updateItem(id: number, payload: any): Promise<any> {
    const response = await apiClient.put(
      `/inventory/items/update?id=${id}`,
      payload,
    );
    return response.data;
  },

  async deleteItem(id: number): Promise<any> {
    const response = await apiClient.delete(`/inventory/items/delete?id=${id}`);
    return response.data;
  },

  /**
   * BATCH MANAGEMENT
   */
  async createBatch(payload: {
    item_id: number;
    expiry_date: string;
    vendor_uhid: string;
    purchase_price: number;
    markup_type: MarkupType;
    markup_value: number;
  }): Promise<any> {
    const response = await apiClient.post("/inventory/items/batch", payload);
    return response.data;
  },

  async searchBatches(): Promise<any[]> {
    const response = await apiClient.get("/inventory/search/items/batch");
    return response.data?.data || [];
  },

  async getBatch(id: number): Promise<any> {
    const response = await apiClient.get(
      `/inventory/show/items/batch?id=${id}`,
    );
    return response.data?.data;
  },

  async updateBatch(
    id: number,
    payload: {
      expiry_date?: string;
      purchase_price?: number;
      vendor_uhid?: string;
      markup_type?: MarkupType;
      markup_value?: number;
      is_active?: number;
    },
  ): Promise<any> {
    const response = await apiClient.put(
      `/inventory/update/items/batch?id=${id}`,
      payload,
    );
    return response.data;
  },

  async deleteBatch(id: number): Promise<any> {
    const response = await apiClient.delete(
      `/inventory/delete/items/batch?id=${id}`,
    );
    return response.data;
  },

  /**
   * STOCK MANAGEMENT & MOVEMENT
   */
  async stockIn(payload: {
    item_id: number;
    batch_number: string;
    quantity: number;
    source_location: string;
    reason: string;
  }): Promise<any> {
    const response = await apiClient.post("/inventory/stock/in", payload);
    return response.data;
  },

  async issueStock(payload: {
    item_id: number;
    batch_number: string;
    quantity: number;
    destination: string;
    reason: string;
  }): Promise<any> {
    const response = await apiClient.post("/inventory/stock/issue", payload);
    return response.data;
  },

  async recordMovement(payload: {
    item_id: number;
    batch_number: string;
    movement_type: "IN" | "OUT" | "ADJUSTMENT";
    reference_type:
      | "PURCHASE"
      | "ISSUE"
      | "CONSUMPTION"
      | "ADJUSTMENT"
      | "EXPIRY"
      | "RETURN";
    patient_id?: number;
    encounter_id?: number;
    quantity: number;
    source_location: string;
    reason: string;
  }): Promise<any> {
    const response = await apiClient.post("/inventory/stock/movement", payload);
    return response.data;
  },

  async searchStock(): Promise<any[]> {
    const response = await apiClient.get("/inventory/stock/search");
    return response.data?.data || [];
  },

  async getStockMovements(referenceType?: string): Promise<any[]> {
    const url = referenceType
      ? `/inventory/stock/movement?reference_type=${referenceType}`
      : "/inventory/stock/movement";
    const response = await apiClient.get(url);
    return response.data?.data || [];
  },

  async getDepartmentMovements(
    destinationLocation?: string,
  ): Promise<{ count: number; results: any[] }> {
    const url = destinationLocation
      ? `/inventory/stock/movement?destination_location=${destinationLocation}`
      : "/inventory/stock/movement";
    const response = await apiClient.get(url);
    return response.data?.data || { count: 0, results: [] };
  },

  async getDepartmentItems(
    location?: string,
  ): Promise<any[]> {
    const url = location
      ? `/inventory/items?location=${location}`
      : "/inventory/items";
    const response = await apiClient.get(url);
    return response.data?.data || [];
  },

  async getStockDetail(id: number): Promise<any> {
    const response = await apiClient.get(`/inventory/stock/show?id=${id}`);
    return response.data?.data;
  },

  async updateStock(id: number, payload: any): Promise<any> {
    const response = await apiClient.put(
      `/inventory/stock/update?id=${id}`,
      payload,
    );
    return response.data;
  },

  async deleteStock(id: number): Promise<any> {
    const response = await apiClient.delete(`/inventory/stock/delete?id=${id}`);
    return response.data;
  },

  /**
   * REQUISITIONS
   */
  async createRequisition(payload: {
    source_location: RequisitionDepartment;
    destination_location: RequisitionDepartment;
    requisition_type: RequisitionType;
    date_required?: string;
    reason?: string;
    remarks: string;
    items: { item_id: number; quantity: number }[];
  }): Promise<any> {
    const response = await apiClient.post(
      "/inventory/stock/requisition",
      payload,
    );
    return response.data;
  },

  // async getRequisitions(filters?: {
  //   status?: string;
  //   source_location?: string;
  //   destination_location?: string;
  //   requisition_type?: string;
  //   requester_name?: string;
  //   approver_name?: string;
  // }): Promise<any[]> {
  //   const params = new URLSearchParams();
  //   if (filters) {
  //     Object.entries(filters).forEach(([key, value]) => {
  //       if (value) params.append(key, value);
  //     });
  //   }
  //   const query = params.toString();
  //   const response = await apiClient.get(
  //     `/inventory/list/requisition${query ? `?${query}` : ""}`,
  //   );
  //   return response.data?.data || [];
  // },

  async getRequisitionDetails(id: number | string): Promise<any> {
    const response = await apiClient.get(
      `/inventory/stock/requisition/view?id=${id}`,
    );
    return response.data?.data;
  },

  async approveRequisition(
    id: number | string,
    payload: {
      items: { item_id: number; approved_qty: number }[];
    },
  ): Promise<any> {
    const response = await apiClient.post(
      `/inventory/stock/requisition/approve?id=${id}`,
      payload,
    );
    return response.data;
  },


  async setBulkPayerMarkup(payload: {
    payer_id: number;
    markup_type: MarkupType;
    markup_value: number;
  }): Promise<any> {
    const response = await apiClient.post("/inventory/items/batch/bulk-markup", payload);
    return response.data;
  },

  

  // --- PURCHASE ORDERS ---
  async getPurchaseOrders(filters?: { status?: string; vendor_id?: string; search?: string }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    const response = await apiClient.get(`/inventory/purchase-orders/list?${params.toString()}`);
    return response.data?.data || [];
  },

  async getPurchaseOrderDetails(id: number): Promise<any> {
    const response = await apiClient.get(`/inventory/purchase-orders/show?id=${id}`);
    return response.data?.data;
  },

  async createPurchaseOrder(payload: any): Promise<any> {
    const response = await apiClient.post("/inventory/purchase-orders/create", payload);
    return response.data;
  },

  async approvePurchaseOrder(id: number): Promise<any> {
    const response = await apiClient.post("/inventory/purchase-orders/approve", { id });
    return response.data;
  },


  // --- INTERNAL CONSUMPTION METHODS ---
  
  async getDepartments(): Promise<any[]> {
    // Note: Adjust the "/departments" endpoint if your backend uses a different route for fetching departments
    const response = await apiClient.get("/departments");
    return response.data?.data || [];
  },

  async getConsumableItems(): Promise<any[]> {
    const response = await apiClient.get("/inventory/search/items?item_type=CONSUMABLE");
    return response.data?.data || [];
  },

  async getAvailableBatches(itemId: number, location: string): Promise<any[]> {
    const response = await apiClient.get(`/inventory/stock/available-batches?item_id=${itemId}&location=${location}`);
    return response.data?.data || [];
  },

  async recordConsumption(payload: any): Promise<any> {
    const response = await apiClient.post("/inventory/stock/consume", payload);
    return response.data;
  },

  // Do not paste below this line, it should close your inventoryService object
  // };


  // --- GOODS RECEIVED NOTES (GRN) ---
  async createGRN(payload: any): Promise<any> {
    const response = await apiClient.post("/inventory/grn/create", payload);
    return response.data;
  },

  async approveGRN(id: number): Promise<any> {
    const response = await apiClient.post("/inventory/grn/approve", { id });
    return response.data;
  },

  // // Inside inventory.service.ts
  // async getRequisitions(department?: string): Promise<any> {
  //   const url = department 
  //     ? `/inventory/list/requisition?department=${department}` 
  //     : `/inventory/list/requisition`;
      
  //   const response = await apiClient.get(url);
  //   return response.data?.data || response.data;
  // },


  // async getRequisitions(filters?: {
  //   status?: string;
  //   department?: string; // <-- Added department here!
  //   source_location?: string;
  //   destination_location?: string;
  //   requisition_type?: string;
  //   requester_name?: string;
  //   approver_name?: string;
  // }): Promise<any[]> {
  //   const params = new URLSearchParams();
  //   if (filters) {
  //     Object.entries(filters).forEach(([key, value]) => {
  //       if (value) params.append(key, value);
  //     });
  //   }
  //   const query = params.toString();
  //   const response = await apiClient.get(
  //     `/inventory/list/requisition${query ? `?\${query}` : ""}`,
  //   );
  //   return response.data?.data || [];
  // },



  async getRequisitions(filters?: {
    status?: string;
    department?: string;
    source_location?: string;
    destination_location?: string;
    requisition_type?: string;
    requester_name?: string;
    approver_name?: string;
  }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    
    const query = params.toString();
    let url = "/inventory/list/requisition";
    if (query) {
      url += `?${query}`; // Safely appends the query string
    }
    
    const response = await apiClient.get(url);
    return response.data?.data || [];
  },
};
