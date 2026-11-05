import apiClient from "../api/client";

export const billingService = {
  // --- Payers ---
  async getPayers(): Promise<any[]> {
    const response = await apiClient.get("/payers");
    return response.data?.data || [];
  },

  // Add these inside your billingService object

  // --- Tariff Components ---
  async getTariffComponents(parentTariffId: number): Promise<any> {
    const response = await apiClient.get(`/billing/tariff/components?parent_tariff_id=${parentTariffId}`);
    return response.data?.data || { components: [], summary: {} };
  },

  async addTariffComponents(parentTariffId: number, components: any[]): Promise<any> {
    const response = await apiClient.post("/billing/tariff/components/add", {
      parent_tariff_id: parentTariffId,
      components
    });
    return response.data;
  },

  async updateTariffComponent(componentId: number, payload: any): Promise<any> {
    const response = await apiClient.post("/billing/tariff/components/update", {
      component_id: componentId,
      ...payload
    });
    return response.data;
  },

  async deleteTariffComponent(componentId: number): Promise<any> {
    const response = await apiClient.post("/billing/tariff/components/delete", {
      component_id: componentId
    });
    return response.data;
  },

  // --- Tariffs (Pricing) ---
  async createTariff(payload: any): Promise<any> {
    const response = await apiClient.post("/billing/create/tariffs", payload);
    return response.data;
  },




  // --- Tariffs (Pricing) ---
  // Change the params type to 'any' so it accepts care_level and payer_type_id without TypeScript complaining
  async searchTariffs(params?: any): Promise<{ data: any[], total: number }> {
    let url = "/billing/search/tariffs";
    const query = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          query.append(key, String(value));
        }
      });
    }

    const queryString = query.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    const response = await apiClient.get(url);
    const payload = response.data?.data; 
    
    return {
      data: payload?.data || [],
      total: payload?.total || 0
    };
  },

  
  // --- Tariffs (Pricing) ---
  // async searchTariffs(params?: { 
  //   search?: string; 
  //   category?: string; 
  //   page?: number; 
  //   limit?: number; 
  // }): Promise<{ data: any[], total: number }> {
  //   let url = "/billing/search/tariffs";
  //   const query = new URLSearchParams();

  //   if (params) {
  //     Object.entries(params).forEach(([key, value]) => {
  //       if (value !== undefined && value !== "") {
  //         query.append(key, String(value));
  //       }
  //     });
  //   }

  //   const queryString = query.toString();
  //   if (queryString) {
  //     url += `?${queryString}`;
  //   }

  //   const response = await apiClient.get(url);
    
  //   // Safely unwrap the nested data structure from the PHP JSONResponse
  //   const payload = response.data?.data; 
    
  //   return {
  //     data: payload?.data || [],
  //     total: payload?.total || 0
  //   };
  // },


  // --- Tariffs (Pricing) ---
  // async searchTariffs(params?: { 
  //   search?: string; 
  //   category?: string; 
  //   page?: number; 
  //   limit?: number; 
  // }): Promise<{ data: any[], total: number }> {
  //   let url = "/billing/search/tariffs";
  //   const query = new URLSearchParams();

  //   if (params) {
  //     Object.entries(params).forEach(([key, value]) => {
  //       if (value !== undefined && value !== "") {
  //         query.append(key, String(value));
  //       }
  //     });
  //   }

  //   const queryString = query.toString();
  //   if (queryString) {
  //     url += `?${queryString}`;
  //   }

  //   const response = await apiClient.get(url);
  //   // Because the new PHP model returns ['total' => X, 'data' => Y]
  //   return response.data?.data || { data: [], total: 0 };
  // },

  // async searchTariffs(careLevel?: string, payerName?: string): Promise<any[]> {
  //   let url = "/billing/search/tariffs";
  //   const params = new URLSearchParams();

  //   if (careLevel) {
  //     params.append("care_level", careLevel);
  //   }
  //   if (payerName) {
  //     params.append("payer_name", payerName);
  //   }

  //   const queryString = params.toString();
  //   if (queryString) {
  //     url += `?${queryString}`;
  //   }

  //   const response = await apiClient.get(url);
  //   return response.data?.data || [];
  // },

  // Update this inside your billing.service.ts
  async searchDrugTariffs(params?: { search?: string; limit?: number; item_type?: string }): Promise<any[]> {
    let url = "/search/drugs/tariffs";
    const query = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          query.append(key, String(value));
        }
      });
    }

    const queryString = query.toString();
    if (queryString) url += `?${queryString}`;

    const response = await apiClient.get(url);
    // Some backend methods return data directly, some wrap it. This handles both safely.
    return response.data?.data?.data || response.data?.data || [];
  },

  // async searchDrugTariffs(): Promise<any[]> {
  //   const response = await apiClient.get("/search/drugs/tariffs");
  //   return response.data?.data || [];
  // },

  async getTariff(id: number): Promise<any> {
    const response = await apiClient.get(`/billing/show/tariffs?id=${id}`);
    return response.data?.data;
  },

  async updateTariff(id: number, payload: any): Promise<any> {
    const response = await apiClient.patch(
      `/billing/tariffs/update?id=${id}`,
      payload,
    );
    return response.data;
  },

  async deleteTariff(id: number): Promise<any> {
    const response = await apiClient.delete(`/billing/tariffs/delete?id=${id}`);
    return response.data;
  },

  // --- Order Processing ---
  async processOPDOrder(payload: any): Promise<any> {
    const response = await apiClient.post(
      "/billing/opd/order/process",
      payload,
    );
    return response.data;
  },

  async processAppointmentClearance(payload: {
    appointment_code: string;
    payment_method?: string;
    payment_method_id?: number;
    payment_reference?: string;
    amount_paid: number;
    use_advance?: boolean;
    preauth_code?: string;
  }): Promise<any> {
    const response = await apiClient.post(
      "/billing/appointment/clearance",
      payload,
    );
    return response.data;
  },

  // --- Advance Management ---
  async getAdvanceHistory(mrn: string): Promise<any> {
    const response = await apiClient.get(`/billing/advance/history?mrn=${mrn}`);
    return response.data; // Returns { status, message: { total_balance, transactions... }, data }
  },

  async collectAdvance(payload: {
    patient_mrn: string;
    amount: number;
    payment_method_id: number;
    payment_reference?: string;
  }): Promise<any> {
    const response = await apiClient.post("/billing/advance/collect", payload);
    return response.data;
  },

  // --- Appointment Billing Draft ---
  async getAppointmentBillingDraft(appointmentCode: string): Promise<any> {
    const response = await apiClient.get(
      `/appointment/billing?appointment_code=${appointmentCode}`,
    );
    return response.data;
  },

  // Inside frontend billing.service.ts
  async getBillingEncounters(mrn: string): Promise<any[]> {
    const response = await apiClient.get(`/billing/patient/encounters?mrn=${mrn}`);
    return response.data?.data || [];
  },

  async getOPDOrderPreview(encounterNumber: string): Promise<any> {
    const response = await apiClient.get(
      `/billing/opd/order/preview?encounter_number=${encounterNumber}`,
    );
    return response.data;
  },

  async getIPDStatement(encounterNumber: string): Promise<any> {
    const response = await apiClient.get(
      `/billing/ipd/statement?encounter_number=${encounterNumber}`,
    );
    return response.data;
  },

  // --- Billing History ---
  async getBillingHistory(
    mrn: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<any> {
    const response = await apiClient.get(
      `/billing/history?mrn=${mrn}&limit=${limit}&offset=${offset}`,
    );
    return response.data;
  },

  // --- Invoice Details ---
  async getInvoiceDetails(
    type: "INVOICE" | "ADVANCE",
    id: number,
  ): Promise<any> {
    const response = await apiClient.get(
      `/billing/invoice/details?type=${type}&id=${id}`,
    );
    return response.data;
  },

  // --- Order Management ---
  // Billing lines carry billable_item_id; fall back to order_id only when billable_item_id is empty.
  async deleteOrder(
    encounterNumber: string,
    ids: { billableItemId?: number | null; orderId?: number | null },
    remarks: string = "",
  ): Promise<any> {
    const data: Record<string, any> = {
      encounter_number: encounterNumber,
      remarks,
    };
    if (ids.billableItemId) {
      data.billable_item_id = ids.billableItemId;
    } else {
      data.order_id = ids.orderId;
    }
    const response = await apiClient.delete("/emr/order/delete", { data });
    return response.data;
  },

  async getPaymentMethods(): Promise<any[]> {
    const response = await apiClient.get("/billing/payment-methods");
    return response.data?.data || [];
  },

  // --- Discounts ---
  async applyDiscount(payload: {
    encounter_id: string | number;
    billable_item_id?: number;
    discount_type: "PERCENTAGE" | "FLAT" | "WAIVER";
    value: number;
    reason: string;
  }): Promise<any> {
    const response = await apiClient.post("/billing/discount/apply", payload);
    return response.data;
  },

  async requestDiscount(payload: {
    invoice_id: number;
    discount_type: "PERCENTAGE" | "FLAT" | "WAIVER";
    value: number;
    reason: string;
  }): Promise<any> {
    const response = await apiClient.post("/billing/discount/request", payload);
    return response.data;
  },

  async removeDiscount(payload: { invoice_id: number }): Promise<any> {
    const response = await apiClient.post("/billing/discount/remove", payload);
    return response.data;
  },

  async approveDiscount(payload: { discount_id: number }): Promise<any> {
    const response = await apiClient.post("/billing/discount/approve", payload);
    return response.data;
  },

  async rejectDiscount(payload: { discount_id: number }): Promise<any> {
    const response = await apiClient.post("/billing/discount/reject", payload);
    return response.data;
  },

  async unapplyDiscount(payload: { encounter_id: number; billable_item_id?: number }): Promise<any> {
    const response = await apiClient.post("/billing/discount/unapply", payload);
    return response.data;
  },

  async getDiscountHistory(patientId: number): Promise<any> {
    const response = await apiClient.get(`/billing/discount/history?patient_id=${patientId}`);
    return response.data;
  },

  async getDiscountList(params?: {
    mrn?: string;
    status?: string;
    discount_type?: string;
    date_from?: string;
  }): Promise<any> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) query.append(key, value);
      });
    }
    const queryString = query.toString() ? `?${query.toString()}` : "";
    const response = await apiClient.get(`/billing/discount/list${queryString}`);
    return response.data;
  },

  // --- Invoice & Refunds ---
  async cancelInvoice(payload: {
    invoice_id: number;
    reference: string;
    action: string;
    reason: string;
    reverse_payments: boolean;
    generate_refund: boolean;
    notes: string;
  }): Promise<any> {
    const response = await apiClient.post("/billing/invoice/cancel", payload);
    return response.data;
  },

  async lookupInvoice(invoiceNumber: string): Promise<any> {
    const response = await apiClient.get(`/billing/invoice/lookup?invoice_number=${invoiceNumber}`);
    return response.data;
  },

  async requestRefund(payload: {
    invoice_id: number;
    refund_amount: number;
    reason: string;
  }): Promise<any> {
    const response = await apiClient.post("/billing/refund/request", payload);
    return response.data;
  },

  async reviewRefund(payload: {
    refund_id: number;
    action: string;
    notes: string;
  }): Promise<any> {
    const response = await apiClient.post("/billing/refund/review", payload);
    return response.data;
  },

  async payoutRefund(payload: {
    refund_id: number;
    refund_method_id: number;
    payment_reference: string;
  }): Promise<any> {
    const response = await apiClient.post("/billing/refund/payout", payload);
    return response.data;
  },

  async getRefundList(params?: any): Promise<any> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) query.append(key, value as string);
      });
    }
    const queryString = query.toString() ? `?${query.toString()}` : "";
    const response = await apiClient.get(`/billing/refund/list${queryString}`);
    return response.data;
  },

  async exportTariffs(): Promise<void> {
    const response = await apiClient.get('/billing/tariffs/export?format=xlsx', {
      responseType: 'blob'
    });
    
    const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'tariffs.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },


  // --- Reopen Invoice (Financial Reversal) ---
  async reopenInvoice(payload: {
    invoice_id: number;
    reason: string;
  }): Promise<any> {
    const response = await apiClient.post("/billing/invoice/reopen", payload);
    return response.data;
  },

  // --- Audit Bill ---
  async getAuditTrail(encounterNumber: string): Promise<any> {
    const response = await apiClient.get(`/billing/ipd/audit?encounter_number=${encounterNumber}`);
    return response.data;
  },

};
