import apiClient from '../api/client';

export const labService = {
  // Get pending orders (Worklist)
  async getPendingOrders(): Promise<any[]> {
    const response = await apiClient.get('/lab/orders');
    return response.data?.data || [];
  },

  // --- OUTSOURCE CENTERS ---
  async getOutsourceCenters(): Promise<any[]> {
    const response = await apiClient.get('/lab/outsource-centers');
    return response.data?.data || [];
  },

  async saveOutsourceCenter(data: any): Promise<any> {
    const response = await apiClient.post('/lab/save/outsource-center', data);
    return response.data;
  },

  async deleteOutsourceCenter(id: number): Promise<any> {
    const response = await apiClient.delete(`/lab/delete/outsource-center?id=${id}`);
    return response.data;
  },
  // -------------------------

  async collectSample(payload: { order_id: number, collection_type?: string, outsource_center_id?: number | null }): Promise<any> {
    const response = await apiClient.post('/lab/sample/collection', payload);
    return response.data;
  },

  async getSamples(params?: any): Promise<{ data: any[], total: number }> {
    let url = "/lab/sample/view";
    const query = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== "" && value !== "ALL") {
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

  async getResultByRef(referenceNo: string): Promise<any> {
    const response = await apiClient.get(`/lab/sample/result/view?reference_no=${referenceNo}`);
    return response.data?.data;
  },

  async submitResult(payload: { reference_no: string; results: any[] }): Promise<any> {
    const response = await apiClient.post('/lab/sample/result', payload);
    return response.data;
  },

  async updateResult(payload: { reference_no: string; results: any[] }): Promise<any> {
    const response = await apiClient.put('/lab/update/sample/result', payload);
    return response.data;
  },

  async deleteResultEntry(id: number): Promise<any> {
    const response = await apiClient.delete(`/lab/delete/sample/result?id=${id}`);
    return response.data;
  },

  async completeResult(referenceNo: string): Promise<any> {
    const response = await apiClient.post('/lab/sample/complete', {
      reference_no: referenceNo
    });
    return response.data;
  },

  // --- Pathologist Management ---

  async saveCategory(data: { id?: number; name: string; description?: string }): Promise<any> {
    const response = await apiClient.post('/lab/save/category', data);
    return response.data;
  },

  async deleteCategory(id: number): Promise<any> {
    const response = await apiClient.delete(`/lab/delete/category?id=${id}`);
    return response.data;
  },

  async getCategories(): Promise<any[]> {
    const response = await apiClient.get('/lab/categories');
    return response.data?.data || [];
  },

  async getPanels(): Promise<any[]> {
    const response = await apiClient.get('/lab/panels');
    return response.data?.data || [];
  },

  async savePanel(data: any): Promise<any> {
    const response = await apiClient.post('/lab/save/panel', data);
    return response.data;
  },

  async deletePanel(id: number): Promise<any> {
    const response = await apiClient.delete(`/lab/delete/panel?id=${id}`);
    return response.data;
  },

  async getUnits(): Promise<any[]> {
    const response = await apiClient.get('/lab/settings/units');
    return response.data?.data || [];
  },

  async saveParameter(data: any): Promise<any> {
    const response = await apiClient.post('/lab/save/parameters', data);
    return response.data;
  },

  async getParameters(): Promise<any[]> {
    const response = await apiClient.get('/lab/parameters');
    return response.data?.data?.data || response.data?.data || [];
  },

  async deleteParameter(id: number): Promise<any> {
    const response = await apiClient.delete(`/lab/delete/parameter?id=${id}`);
    return response.data;
  },

  async verifyResult(payload: { reference_no: string; comment: string }): Promise<any> {
    const response = await apiClient.post('/lab/sample/result/verify', payload);
    return response.data;
  },

  async reopenResult(payload: { reference_no: string; reason: string }): Promise<any> {
    const response = await apiClient.post('/lab/sample/result/reopen', payload);
    return response.data;
  },

  async releaseResult(payload: { reference_no: string }): Promise<any> {
    const response = await apiClient.post('/lab/sample/result/release', payload);
    return response.data;
  },

  async amendResult(payload: { reference_no: string; reason: string; results: { parameter_id: number; result_value: string }[] }): Promise<any> {
    const response = await apiClient.post('/lab/sample/result/amend', payload);
    return response.data;
  },

  async reviewResult(payload: { reference_no: string; comment: string }): Promise<any> {
    const response = await apiClient.post('/lab/sample/result/review', payload);
    return response.data;
  },

  async reverseResult(payload: { reference_no: string; reason: string }): Promise<any> {
    const response = await apiClient.post('/lab/sample/result/reverse', payload);
    return response.data;
  }
};



// import apiClient from '../api/client';

// export const labService = {
//   // Get pending orders (Worklist)
//   async getPendingOrders(): Promise<any[]> {
//     const response = await apiClient.get('/lab/orders');
//     return response.data?.data || [];
//   },

//   // NEW: Fetch Outsource Centers
//   async getOutsourceCenters(): Promise<any[]> {
//     const response = await apiClient.get('/lab/outsource-centers');
//     return response.data?.data || [];
//   },

//   // UPDATED: Collect Sample now takes a payload object
//   async collectSample(payload: { order_id: number, collection_type?: string, outsource_center_id?: number | null }): Promise<any> {
//     const response = await apiClient.post('/lab/sample/collection', payload);
//     return response.data;
//   },

//   // Get all samples (Used for Result Entry list and Reports list)
//   async getSamples(params?: any): Promise<{ data: any[], total: number }> {
//     let url = "/lab/sample/view";
//     const query = new URLSearchParams();

//     if (params) {
//       Object.entries(params).forEach(([key, value]) => {
//         if (value !== undefined && value !== "" && value !== "ALL") {
//           query.append(key, String(value));
//         }
//       });
//     }

//     const queryString = query.toString();
//     if (queryString) {
//       url += `?${queryString}`;
//     }

//     const response = await apiClient.get(url);
//     const payload = response.data?.data;
    
//     return {
//       data: payload?.data || [],
//       total: payload?.total || 0
//     };
//   },

//   // Get specific result detail for printing/viewing
//   async getResultByRef(referenceNo: string): Promise<any> {
//     const response = await apiClient.get(`/lab/sample/result/view?reference_no=${referenceNo}`);
//     return response.data?.data;
//   },

//   // Submit Result
//   async submitResult(payload: { reference_no: string; results: any[] }): Promise<any> {
//     const response = await apiClient.post('/lab/sample/result', payload);
//     return response.data;
//   },

//   // Update Result
//   async updateResult(payload: { reference_no: string; results: any[] }): Promise<any> {
//     const response = await apiClient.put('/lab/update/sample/result', payload);
//     return response.data;
//   },

//   async deleteResultEntry(id: number): Promise<any> {
//     const response = await apiClient.delete(`/lab/delete/sample/result?id=${id}`);
//     return response.data;
//   },

//   // Complete/Finalize Result
//   async completeResult(referenceNo: string): Promise<any> {
//     const response = await apiClient.post('/lab/sample/complete', {
//       reference_no: referenceNo
//     });
//     return response.data;
//   },

//   // --- Pathologist Management ---

//   async saveCategory(data: { id?: number; name: string; description?: string }): Promise<any> {
//     const response = await apiClient.post('/lab/save/category', data);
//     return response.data;
//   },

//   async deleteCategory(id: number): Promise<any> {
//     const response = await apiClient.delete(`/lab/delete/category?id=${id}`);
//     return response.data;
//   },

//   async getCategories(): Promise<any[]> {
//     const response = await apiClient.get('/lab/categories');
//     return response.data?.data || [];
//   },

//   async getPanels(): Promise<any[]> {
//     const response = await apiClient.get('/lab/panels');
//     return response.data?.data || [];
//   },

//   async savePanel(data: {
//     id?: number;
//     category_id: number;
//     panel_name: string;
//     report_group: string;
//     specimen_type: string;
//     turnaround_time_hours: number;
//     active_status: number | boolean;
//   }): Promise<any> {
//     const response = await apiClient.post('/lab/save/panel', data);
//     return response.data;
//   },

//   async deletePanel(id: number): Promise<any> {
//     const response = await apiClient.delete(`/lab/delete/panel?id=${id}`);
//     return response.data;
//   },

//   async getUnits(): Promise<any[]> {
//     const response = await apiClient.get('/lab/settings/units');
//     return response.data?.data || [];
//   },

//   async saveParameter(data: any): Promise<any> {
//     const response = await apiClient.post('/lab/save/parameters', data);
//     return response.data;
//   },

//   async getParameters(): Promise<any[]> {
//     const response = await apiClient.get('/lab/parameters');
//     return response.data?.data?.data || response.data?.data || [];
//   },

//   async deleteParameter(id: number): Promise<any> {
//     const response = await apiClient.delete(`/lab/delete/parameter?id=${id}`);
//     return response.data;
//   },

//   async verifyResult(payload: { reference_no: string; comment: string }): Promise<any> {
//     const response = await apiClient.post('/lab/sample/result/verify', payload);
//     return response.data;
//   },

//   async reopenResult(payload: { reference_no: string; reason: string }): Promise<any> {
//     const response = await apiClient.post('/lab/sample/result/reopen', payload);
//     return response.data;
//   },

//   async releaseResult(payload: { reference_no: string }): Promise<any> {
//     const response = await apiClient.post('/lab/sample/result/release', payload);
//     return response.data;
//   },

//   async amendResult(payload: { reference_no: string; reason: string; results: { parameter_id: number; result_value: string }[] }): Promise<any> {
//     const response = await apiClient.post('/lab/sample/result/amend', payload);
//     return response.data;
//   },

//   async reviewResult(payload: { reference_no: string; comment: string }): Promise<any> {
//     const response = await apiClient.post('/lab/sample/result/review', payload);
//     return response.data;
//   },

//   async reverseResult(payload: { reference_no: string; reason: string }): Promise<any> {
//     const response = await apiClient.post('/lab/sample/result/reverse', payload);
//     return response.data;
//   },
// };





































































































































// import apiClient from '../api/client';

// export const labService = {
//   // Get pending orders (Worklist)
//   async getPendingOrders(): Promise<any[]> {
//     const response = await apiClient.get('/lab/orders');
//     return response.data?.data || [];
//   },

//   // Collect Sample
//   async collectSample(orderId: number): Promise<any> {
//     const response = await apiClient.post('/lab/sample/collection', {
//       order_id: orderId
//     });
//     return response.data;
//   },

//   // Get all samples (Used for Result Entry list and Reports list)
//   async getSamples(params?: any): Promise<{ data: any[], total: number }> {
//     let url = "/lab/sample/view";
//     const query = new URLSearchParams();

//     if (params) {
//       Object.entries(params).forEach(([key, value]) => {
//         if (value !== undefined && value !== "" && value !== "ALL") {
//           query.append(key, String(value));
//         }
//       });
//     }

//     const queryString = query.toString();
//     if (queryString) {
//       url += `?${queryString}`;
//     }

//     const response = await apiClient.get(url);
//     const payload = response.data?.data;
    
//     return {
//       data: payload?.data || [],
//       total: payload?.total || 0
//     };
//   },
//   // async getSamples(): Promise<any[]> {
//   //   const response = await apiClient.get('/lab/sample/view');
//   //   return response.data?.data || [];
//   // },

//   // Get specific result detail for printing/viewing
//   async getResultByRef(referenceNo: string): Promise<any> {
//     const response = await apiClient.get(`/lab/sample/result/view?reference_no=${referenceNo}`);
//     return response.data?.data;
//   },

//   // Submit Result
//   async submitResult(payload: { reference_no: string; results: any[] }): Promise<any> {
//     const response = await apiClient.post('/lab/sample/result', payload);
//     return response.data;
//   },

//   // Update Result
//   async updateResult(payload: { reference_no: string; results: any[] }): Promise<any> {
//     const response = await apiClient.put('/lab/update/sample/result', payload);
//     return response.data;
//   },

//   async deleteResultEntry(id: number): Promise<any> {
//     // Make sure this matches your PHP routes array!
//     const response = await apiClient.delete(`/lab/delete/sample/result?id=${id}`);
//     return response.data;
//   },

//   // Complete/Finalize Result
//   async completeResult(referenceNo: string): Promise<any> {
//     const response = await apiClient.post('/lab/sample/complete', {
//       reference_no: referenceNo
//     });
//     return response.data;
//   },

//   // --- Pathologist Management ---

//   // Categories
//   async saveCategory(data: { id?: number; name: string; description?: string }): Promise<any> {
//     const response = await apiClient.post('/lab/save/category', data);
//     return response.data;
//   },

//   async deleteCategory(id: number): Promise<any> {
//     const response = await apiClient.delete(`/lab/delete/category?id=${id}`);
//     return response.data;
//   },

//   async getCategories(): Promise<any[]> {
//     const response = await apiClient.get('/lab/categories');
//     return response.data?.data || [];
//   },

//   async getPanels(): Promise<any[]> {
//     const response = await apiClient.get('/lab/panels');
//     return response.data?.data || [];
//   },

//   async savePanel(data: {
//     id?: number;
//     category_id: number;
//     panel_name: string;
//     report_group: string;
//     specimen_type: string;
//     turnaround_time_hours: number;
//     active_status: number | boolean;
//   }): Promise<any> {
//     const response = await apiClient.post('/lab/save/panel', data);
//     return response.data;
//   },

//   async deletePanel(id: number): Promise<any> {
//     const response = await apiClient.delete(`/lab/delete/panel?id=${id}`);
//     return response.data;
//   },

//   async getUnits(): Promise<any[]> {
//     const response = await apiClient.get('/lab/settings/units');
//     return response.data?.data || [];
//   },

//   // Parameters
//   async saveParameter(data: {
//     id?: number;
//     category_id: number;
//     panel_id?: number;
//     parameter_name: string;
//     short_name?: string;
//     test_code?: string;
//     report_section?: string;
//     unit_id?: number;
//     value_type: 'NUMERIC' | 'TEXT' | 'SELECT' | 'BOOLEAN' | 'NARRATIVE';
//     ref_low?: string | number;
//     ref_high?: string | number;
//     ref_low_female?: string | number;
//     ref_high_female?: string | number;
//     critical_low?: string | number;
//     critical_high?: string | number;
//     allow_manual_comment?: boolean;
//     active_status?: number | boolean;
//     notes?: string;
//     rules?: {
//       auto_flag_enabled?: boolean;
//       delta_check_enabled?: boolean;
//       critical_notification_required?: boolean;
//       delta_percent_threshold?: number | string;
//       panic_low?: number | string;
//       panic_high?: number | string;
//       requires_pathologist_review?: boolean;
//       auto_comment_template?: string;
//       critical_message?: string;
//     };
//     options?: {
//       option_label: string;
//       option_value: string;
//       display_order?: number;
//       is_critical_trigger?: boolean;
//     }[];
//     reference_profiles?: {
//       profile_name: string;
//       sex: 'M' | 'F' | 'GENERAL';
//       age_min: number;
//       age_max: number | null;
//       age_unit: 'DAYS' | 'MONTHS' | 'YEARS';
//       pregnancy_status?: number | boolean;
//       pregnancy_trimester?: 'T1' | 'T2' | 'T3' | '';
//       ref_low: number | string;
//       ref_high: number | string;
//       priority_order?: number;
//       active_status?: number | boolean;
//       notes?: string;
//     }[];
//   }): Promise<any> {
//     const response = await apiClient.post('/lab/save/parameters', data);
//     return response.data;
//   },

//   async getParameters(): Promise<any[]> {
//     const response = await apiClient.get('/lab/parameters');
//     // The response structure shared by the user has { total, data: [...] }
//     return response.data?.data?.data || response.data?.data || [];
//   },

//   async deleteParameter(id: number): Promise<any> {
//     const response = await apiClient.delete(`/lab/delete/parameter?id=${id}`);
//     return response.data;
//   },

//   // Verify Result
//   async verifyResult(payload: { reference_no: string; comment: string }): Promise<any> {
//     const response = await apiClient.post('/lab/sample/result/verify', payload);
//     return response.data;
//   },

//   // Reopen Result
//   async reopenResult(payload: { reference_no: string; reason: string }): Promise<any> {
//     const response = await apiClient.post('/lab/sample/result/reopen', payload);
//     return response.data;
//   },

//   // Release Result
//   async releaseResult(payload: { reference_no: string }): Promise<any> {
//     const response = await apiClient.post('/lab/sample/result/release', payload);
//     return response.data;
//   },

//   // Amend Result
//   async amendResult(payload: { reference_no: string; reason: string; results: { parameter_id: number; result_value: string }[] }): Promise<any> {
//     const response = await apiClient.post('/lab/sample/result/amend', payload);
//     return response.data;
//   },

//   // Review Result
//   async reviewResult(payload: { reference_no: string; comment: string }): Promise<any> {
//     const response = await apiClient.post('/lab/sample/result/review', payload);
//     return response.data;
//   },

//   // Reverse Result to Pending
//   async reverseResult(payload: { reference_no: string; reason: string }): Promise<any> {
//     const response = await apiClient.post('/lab/sample/result/reverse', payload);
//     return response.data;
//   },

// };

