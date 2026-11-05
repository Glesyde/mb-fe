import apiClient from '../api/client';

export const bloodBankService = {
  // Get list of blood requests
  async getRequests(params?: {
    mrn?: string;
    encounter_number?: string;
    patient_name?: string;
    date_from?: string;
    date_to?: string;
    request_status?: string;
    urgency?: string;
    sample_condition?: string;
  }): Promise<any[]> {
    const response = await apiClient.get('/blood/request/list', { params });
    const resData = response.data;
    
    if (Array.isArray(resData?.data)) return resData.data;
    if (Array.isArray(resData?.message)) return resData.message;
    if (Array.isArray(resData)) return resData;
    
    return [];
  },

  // View specific request details
  async getRequestDetails(request_id: number): Promise<any> {
    try {
      const response = await apiClient.get('/blood/request/view', {
        params: { request_id }
      });
      const resData = response.data;

      // FIX: Explicitly ensure it grabs the Object, and ignores the empty []
      if (resData?.data && typeof resData.data === 'object' && !Array.isArray(resData.data)) return resData.data;
      if (resData?.message && typeof resData.message === 'object' && !Array.isArray(resData.message)) return resData.message;
      
      return resData;
    } catch (error) {
      console.error('Error fetching blood request details:', error);
      throw error;
    }
  },

  // Create/Prepare Unit for a request
  async createUnit(payload: any): Promise<any> {
    try {
      const response = await apiClient.post('/blood/unit/create', payload);
      return response.data;
    } catch (error) {
      console.error('Error creating blood unit:', error);
      throw error;
    }
  },

  // Issue Unit for a request
  async issueUnit(payload: { unit_id: number; request_id: number }): Promise<any> {
    try {
      const response = await apiClient.post('/blood/unit/issue', payload);
      return response.data;
    } catch (error) {
      console.error('Error issuing blood unit:', error);
      throw error;
    }
  },

  // Receive sample
  async receiveSample(payload: {
    request_id: number;
    accession_no: string;
    sample_condition: string;
  }): Promise<any> {
    const response = await apiClient.post('/blood/sample/receive', payload);
    return response.data;
  },

  // Save result
  async saveResult(payload: {
    request_id: number;
    abo_group: string;
    rh_type: string;
    antibody_screen: string;
    antibody_identified?: string | null;
    comments?: string;
  }): Promise<any> {
    const response = await apiClient.post('/blood/result/save', payload);
    return response.data;
  },

  // ==========================================
  // Transfusion Management & Consent Endpoints
  // ==========================================
  async getTransfusionView(request_id: number): Promise<any> {
    try {
      const response = await apiClient.get('/blood/transfusion/view', { params: { request_id } });
      const resData = response.data;

      // FIX: Explicitly ensure it grabs the Object, and ignores the empty []
      if (resData?.data && typeof resData.data === 'object' && !Array.isArray(resData.data)) return resData.data;
      if (resData?.message && typeof resData.message === 'object' && !Array.isArray(resData.message)) return resData.message;
      
      return resData;
    } catch (error) {
      console.error('Error fetching transfusion view', error);
      throw error;
    }
  },

  async submitConsent(payload: any): Promise<any> {
    const response = await apiClient.post('/blood/consent', payload);
    return response.data;
  },

  // NEW: Fetch valid existing consents for the Yes/No workflow
  async getValidPatientConsents(patientId: number): Promise<any> {
    const response = await apiClient.get('/blood/consents/valid', { 
      params: { patient_id: patientId } 
    });
    return response.data;
  },

  // NEW: Link an existing consent to a new request
  async linkExistingConsent(payload: any): Promise<any> {
    const response = await apiClient.post('/blood/consents/link', payload);
    return response.data;
  },

  async startTransfusion(payload: any): Promise<any> {
    const response = await apiClient.post('/blood/transfusion/start', payload);
    return response.data;
  },

  async pauseTransfusion(payload: any): Promise<any> {
    const response = await apiClient.post('/blood/transfusion/pause', payload);
    return response.data;
  },

  async resumeTransfusion(payload: any): Promise<any> {
    const response = await apiClient.post('/blood/transfusion/resume', payload);
    return response.data;
  },

  async stopTransfusion(payload: any): Promise<any> {
    const response = await apiClient.post('/blood/transfusion/stop', payload);
    return response.data;
  },

  async completeTransfusion(payload: any): Promise<any> {
    const response = await apiClient.post('/blood/transfusion/complete', payload);
    return response.data;
  },

  async forceCompleteRequest(payload: { request_id: number; remarks: string }): Promise<any> {
    const response = await apiClient.post('/blood-bank/requests/force-complete', payload);
    return response.data;
  }
};














// import apiClient from '../api/client';

// export const bloodBankService = {
//   // Get list of blood requests
//   async getRequests(params?: {
//     mrn?: string;
//     encounter_number?: string;
//     patient_name?: string;
//     date_from?: string;
//     date_to?: string;
//     request_status?: string;
//     urgency?: string;
//     sample_condition?: string;
//   }): Promise<any[]> {
//     const response = await apiClient.get('/blood/request/list', { params });
//     const resData = response.data;
    
//     if (Array.isArray(resData?.data)) return resData.data;
//     if (Array.isArray(resData?.message)) return resData.message;
//     if (Array.isArray(resData)) return resData;
    
//     return [];
//   },

//   // View specific request details
//   async getRequestDetails(request_id: number): Promise<any> {
//     try {
//       const response = await apiClient.get('/blood/request/view', {
//         params: { request_id }
//       });
//       const resData = response.data;

//       // FIX: Explicitly ensure it grabs the Object, and ignores the empty []
//       if (resData?.data && typeof resData.data === 'object' && !Array.isArray(resData.data)) return resData.data;
//       if (resData?.message && typeof resData.message === 'object' && !Array.isArray(resData.message)) return resData.message;
      
//       return resData;
//     } catch (error) {
//       console.error('Error fetching blood request details:', error);
//       throw error;
//     }
//   },

//   // Create/Prepare Unit for a request
//   async createUnit(payload: any): Promise<any> {
//     try {
//       const response = await apiClient.post('/blood/unit/create', payload);
//       return response.data;
//     } catch (error) {
//       console.error('Error creating blood unit:', error);
//       throw error;
//     }
//   },

//   // Issue Unit for a request
//   async issueUnit(payload: { unit_id: number; request_id: number }): Promise<any> {
//     try {
//       const response = await apiClient.post('/blood/unit/issue', payload);
//       return response.data;
//     } catch (error) {
//       console.error('Error issuing blood unit:', error);
//       throw error;
//     }
//   },

//   // Receive sample
//   async receiveSample(payload: {
//     request_id: number;
//     accession_no: string;
//     sample_condition: string;
//   }): Promise<any> {
//     const response = await apiClient.post('/blood/sample/receive', payload);
//     return response.data;
//   },

//   // Save result
//   async saveResult(payload: {
//     request_id: number;
//     abo_group: string;
//     rh_type: string;
//     antibody_screen: string;
//     antibody_identified?: string | null;
//     comments?: string;
//   }): Promise<any> {
//     const response = await apiClient.post('/blood/result/save', payload);
//     return response.data;
//   },

//   // Transfusion Management Endpoints
//   async getTransfusionView(request_id: number): Promise<any> {
//     try {
//       const response = await apiClient.get('/blood/transfusion/view', { params: { request_id } });
//       const resData = response.data;

//       // FIX: Explicitly ensure it grabs the Object, and ignores the empty []
//       if (resData?.data && typeof resData.data === 'object' && !Array.isArray(resData.data)) return resData.data;
//       if (resData?.message && typeof resData.message === 'object' && !Array.isArray(resData.message)) return resData.message;
      
//       return resData;
//     } catch (error) {
//       console.error('Error fetching transfusion view', error);
//       throw error;
//     }
//   },

//   async submitConsent(payload: any): Promise<any> {
//     const response = await apiClient.post('/blood/consent', payload);
//     return response.data;
//   },

//   async startTransfusion(payload: any): Promise<any> {
//     const response = await apiClient.post('/blood/transfusion/start', payload);
//     return response.data;
//   },

//   async pauseTransfusion(payload: any): Promise<any> {
//     const response = await apiClient.post('/blood/transfusion/pause', payload);
//     return response.data;
//   },

//   async resumeTransfusion(payload: any): Promise<any> {
//     const response = await apiClient.post('/blood/transfusion/resume', payload);
//     return response.data;
//   },

//   async stopTransfusion(payload: any): Promise<any> {
//     const response = await apiClient.post('/blood/transfusion/stop', payload);
//     return response.data;
//   },

//   async completeTransfusion(payload: any): Promise<any> {
//     const response = await apiClient.post('/blood/transfusion/complete', payload);
//     return response.data;
//   },

//   async forceCompleteRequest(payload: { request_id: number; remarks: string }): Promise<any> {
//     const response = await apiClient.post('/blood-bank/requests/force-complete', payload);
//     return response.data;
//   }

  
// };



// import apiClient from '../api/client';

// export const bloodBankService = {
//   // Get list of blood requests
//   async getRequests(params?: {
//     mrn?: string;
//     encounter_number?: string;
//     patient_name?: string;
//     date_from?: string;
//     date_to?: string;
//     request_status?: string;
//     urgency?: string;
//     sample_condition?: string;
//   }): Promise<any[]> {
//     const response = await apiClient.get('/blood/request/list', { params });
    
//     // Axios puts the JSON response in response.data.
//     // Based on your backend, the array is inside the "data" property of that JSON.
//     if (response.data && Array.isArray(response.data.data)) {
//         return response.data.data;
//     }
    
//     // Fallback if the backend directly returns the array
//     if (Array.isArray(response.data)) {
//         return response.data;
//     }

//     // Fallback if it is somehow stuck in message
//     if (response.data && Array.isArray(response.data.message)) {
//         return response.data.message;
//     }

//     return [];
//   },

//   // View specific request details
//   async getRequestDetails(request_id: number): Promise<any> {
//     try {
//       const response = await apiClient.get('/blood/request/view', {
//         params: { request_id }
//       });
//       // The backend puts single objects inside "data" as well
//       return response.data?.data || response.data?.message || response.data;
//     } catch (error) {
//       console.error('Error fetching blood request details:', error);
//       throw error;
//     }
//   },

//   // Create/Prepare Unit for a request
//   async createUnit(payload: any): Promise<any> {
//     try {
//       const response = await apiClient.post('/blood/unit/create', payload);
//       return response.data;
//     } catch (error) {
//       console.error('Error creating blood unit:', error);
//       throw error;
//     }
//   },

//   // Issue Unit for a request
//   async issueUnit(payload: { unit_id: number; request_id: number }): Promise<any> {
//     try {
//       const response = await apiClient.post('/blood/unit/issue', payload);
//       return response.data;
//     } catch (error) {
//       console.error('Error issuing blood unit:', error);
//       throw error;
//     }
//   },

//   // Receive sample
//   async receiveSample(payload: {
//     request_id: number;
//     accession_no: string;
//     sample_condition: string;
//   }): Promise<any> {
//     const response = await apiClient.post('/blood/sample/receive', payload);
//     return response.data;
//   },

//   // Save result
//   async saveResult(payload: {
//     request_id: number;
//     abo_group: string;
//     rh_type: string;
//     antibody_screen: string;
//     antibody_identified?: string | null;
//     comments?: string;
//   }): Promise<any> {
//     const response = await apiClient.post('/blood/result/save', payload);
//     return response.data;
//   },

//   // Transfusion Management Endpoints
//   async getTransfusionView(request_id: number): Promise<any> {
//     try {
//       const response = await apiClient.get('/blood/transfusion/view', { params: { request_id } });
//       return response.data?.data || response.data?.message || response.data;
//     } catch (error) {
//       console.error('Error fetching transfusion view', error);
//       throw error;
//     }
//   },

//   async submitConsent(payload: any): Promise<any> {
//     const response = await apiClient.post('/blood/consent', payload);
//     return response.data;
//   },

//   async startTransfusion(payload: any): Promise<any> {
//     const response = await apiClient.post('/blood/transfusion/start', payload);
//     return response.data;
//   },

//   async pauseTransfusion(payload: any): Promise<any> {
//     const response = await apiClient.post('/blood/transfusion/pause', payload);
//     return response.data;
//   },

//   async resumeTransfusion(payload: any): Promise<any> {
//     const response = await apiClient.post('/blood/transfusion/resume', payload);
//     return response.data;
//   },

//   async stopTransfusion(payload: any): Promise<any> {
//     const response = await apiClient.post('/blood/transfusion/stop', payload);
//     return response.data;
//   },

//   async completeTransfusion(payload: any): Promise<any> {
//     const response = await apiClient.post('/blood/transfusion/complete', payload);
//     return response.data;
//   },

//   async forceCompleteRequest(payload: { request_id: number; remarks: string }): Promise<any> {
//     const response = await apiClient.post('/blood-bank/requests/force-complete', payload);
//     return response.data;
//   }
// };



// import apiClient from '../api/client';

// export const bloodBankService = {
//   // Get list of blood requests
//   async getRequests(params?: {
//     mrn?: string;
//     encounter_number?: string;
//     patient_name?: string;
//     date_from?: string;
//     date_to?: string;
//     request_status?: string;
//     urgency?: string;
//     sample_condition?: string;
//   }): Promise<any[]> {
//     const response = await apiClient.get('/blood/request/list', { params });
//     const resData = response.data;
    
//     // SMART EXTRACTOR: Looks for the array wherever the PHP backend puts it
//     if (Array.isArray(resData?.data)) return resData.data;
//     if (Array.isArray(resData?.message)) return resData.message;
//     if (Array.isArray(resData)) return resData;
    
//     return [];
//   },

//   // View specific request details
//   async getRequestDetails(request_id: number): Promise<any> {
//     try {
//       const response = await apiClient.get('/blood/request/view', {
//         params: { request_id }
//       });
//       return response.data?.data || response.data?.message || response.data;
//     } catch (error) {
//       console.error('Error fetching blood request details:', error);
//       throw error;
//     }
//   },

//   // Create/Prepare Unit for a request
//   async createUnit(payload: any): Promise<any> {
//     try {
//       const response = await apiClient.post('/blood/unit/create', payload);
//       return response.data;
//     } catch (error) {
//       console.error('Error creating blood unit:', error);
//       throw error;
//     }
//   },

//   // Issue Unit for a request
//   async issueUnit(payload: { unit_id: number; request_id: number }): Promise<any> {
//     try {
//       const response = await apiClient.post('/blood/unit/issue', payload);
//       return response.data;
//     } catch (error) {
//       console.error('Error issuing blood unit:', error);
//       throw error;
//     }
//   },

//   // Receive sample
//   async receiveSample(payload: {
//     request_id: number;
//     accession_no: string;
//     sample_condition: string;
//   }): Promise<any> {
//     const response = await apiClient.post('/blood/sample/receive', payload);
//     return response.data;
//   },

//   // Save result
//   async saveResult(payload: {
//     request_id: number;
//     abo_group: string;
//     rh_type: string;
//     antibody_screen: string;
//     antibody_identified?: string | null;
//     comments?: string;
//   }): Promise<any> {
//     const response = await apiClient.post('/blood/result/save', payload);
//     return response.data;
//   },

//   // Transfusion Management Endpoints
//   async getTransfusionView(request_id: number): Promise<any> {
//     try {
//       const response = await apiClient.get('/blood/transfusion/view', { params: { request_id } });
//       return response.data?.data || response.data?.message || response.data;
//     } catch (error) {
//       console.error('Error fetching transfusion view', error);
//       throw error;
//     }
//   },

//   async submitConsent(payload: any): Promise<any> {
//     const response = await apiClient.post('/blood/consent', payload);
//     return response.data;
//   },

//   async startTransfusion(payload: any): Promise<any> {
//     const response = await apiClient.post('/blood/transfusion/start', payload);
//     return response.data;
//   },

//   async pauseTransfusion(payload: any): Promise<any> {
//     const response = await apiClient.post('/blood/transfusion/pause', payload);
//     return response.data;
//   },

//   async resumeTransfusion(payload: any): Promise<any> {
//     const response = await apiClient.post('/blood/transfusion/resume', payload);
//     return response.data;
//   },

//   async stopTransfusion(payload: any): Promise<any> {
//     const response = await apiClient.post('/blood/transfusion/stop', payload);
//     return response.data;
//   },

//   async completeTransfusion(payload: any): Promise<any> {
//     const response = await apiClient.post('/blood/transfusion/complete', payload);
//     return response.data;
//   },

//   async forceCompleteRequest(payload: { request_id: number; remarks: string }): Promise<any> {
//     const response = await apiClient.post('/blood-bank/requests/force-complete', payload);
//     return response.data;
//   }
// };


// import apiClient from '../api/client';

// export const bloodBankService = {
//   // Get list of blood requests
//   async getRequests(params?: {
//     mrn?: string;
//     encounter_number?: string;
//     patient_name?: string;
//     date_from?: string;
//     date_to?: string;
//     request_status?: string;
//     urgency?: string;
//     sample_condition?: string;
//   }): Promise<any[]> {
//     const response = await apiClient.get('/blood/request/list', { params });
//     // Assuming backend structure similar to provided: { status, message: [...], data: [] }
//     return response.data?.message || [];
//   },

//   // View specific request details
//   async getRequestDetails(request_id: number): Promise<any> {
//     try {
//       const response = await apiClient.get('/blood/request/view', {
//         params: { request_id }
//       });
//       return response.data;
//     } catch (error) {
//       console.error('Error fetching blood request details:', error);
//       throw error;
//     }
//   },

//   // Create/Prepare Unit for a request
//   async createUnit(payload: any): Promise<any> {
//     try {
//       const response = await apiClient.post('/blood/unit/create', payload);
//       return response.data;
//     } catch (error) {
//       console.error('Error creating blood unit:', error);
//       throw error;
//     }
//   },

//   // Issue Unit for a request
//   async issueUnit(payload: { unit_id: number; request_id: number }): Promise<any> {
//     try {
//       const response = await apiClient.post('/blood/unit/issue', payload);
//       return response.data;
//     } catch (error) {
//       console.error('Error issuing blood unit:', error);
//       throw error;
//     }
//   },

//   // Receive sample
//   async receiveSample(payload: {
//     request_id: number;
//     accession_no: string;
//     sample_condition: string;
//   }): Promise<any> {
//     const response = await apiClient.post('/blood/sample/receive', payload);
//     return response.data;
//   },

//   // Save result
//   async saveResult(payload: {
//     request_id: number;
//     abo_group: string;
//     rh_type: string;
//     antibody_screen: string;
//     antibody_identified?: string | null;
//     comments?: string;
//   }): Promise<any> {
//     const response = await apiClient.post('/blood/result/save', payload);
//     return response.data;
//   },
//   // Transfusion Management Endpoints
//   async getTransfusionView(request_id: number): Promise<any> {
//     try {
//       const response = await apiClient.get('/blood/transfusion/view', { params: { request_id } });
//       return response.data?.message;
//     } catch (error) {
//       console.error('Error fetching transfusion view', error);
//       throw error;
//     }
//   },

//   async submitConsent(payload: any): Promise<any> {
//     const response = await apiClient.post('/blood/consent', payload);
//     return response.data;
//   },

//   async startTransfusion(payload: any): Promise<any> {
//     const response = await apiClient.post('/blood/transfusion/start', payload);
//     return response.data;
//   },

//   async pauseTransfusion(payload: any): Promise<any> {
//     const response = await apiClient.post('/blood/transfusion/pause', payload);
//     return response.data;
//   },

//   async resumeTransfusion(payload: any): Promise<any> {
//     const response = await apiClient.post('/blood/transfusion/resume', payload);
//     return response.data;
//   },

//   async stopTransfusion(payload: any): Promise<any> {
//     const response = await apiClient.post('/blood/transfusion/stop', payload);
//     return response.data;
//   },

//   async completeTransfusion(payload: any): Promise<any> {
//     const response = await apiClient.post('/blood/transfusion/complete', payload);
//     return response.data;
//   }
// };
