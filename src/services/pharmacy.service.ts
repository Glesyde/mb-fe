import apiClient from '../api/client';

export const pharmacyService = {
  getPendingOrders: async (params?: { mrn?: string; patient_name?: string; date_from?: string; date_to?: string; page?: number; limit?: number }) => {
    const response = await apiClient.get('/pharmacy/orders/pending', { params });
    return response.data;
  },
  dispenseMedication: async (payload: { prescription_id: number; batch_id: number; calculated_total_qty?: number | string }) => {
    const response = await apiClient.post('/pharmacy/dispense', payload);
    return response.data;
  },
  getPatientHistory: async (params?: { page?: number; limit?: number }) => {
    const response = await apiClient.get('/pharmacy/patient/history', { params });
    return response.data;
  },

  getDispensingLabel: async (dispensingId: number | string) => {
    const response = await apiClient.get('/pharmacy/dispensing/label', {
      params: { dispensing_id: dispensingId },
    });
    return response.data;
  },


  // getDispensingLabel: async (params?: { page?: number; limit?: number }) => {
  //   const response = await apiClient.get('/pharmacy/dispensing/label', { params });
  //   return response.data;
  // },


  returnMedication: async (payload: {
    dispensing_id: number;
    qty: number;
    reason: string;
    restock_status: "RESTOCKED" | "DISCARDED";
  }) => {
    const response = await apiClient.post('/pharmacy/return', payload);
    return response.data;
  },



  // forceCompleteOrder: async (payload: { order_id: number; remarks: string }) => {
  //   const response = await apiClient.post('/pharmacy/orders/force-complete', payload);
  //   return response.data;
  // },


  forceCompleteOrder: async (payload: { order_id: number; remarks: string }) => {
    const response = await apiClient.post('/services/orders/force-complete', payload);
    return response.data;
  },


};
