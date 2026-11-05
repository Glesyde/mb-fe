
import apiClient from '../api/client';

export const radiologyService = {
  /**
   * Fetch pending radiology orders
   * Endpoint: GET /radiology/orders
   */
  async getOrders(): Promise<any[]> {
    const response = await apiClient.get('/radiology/orders');
    return response.data?.data || [];
  },

  /**
   * Start a radiology scan
   * Endpoint: POST /radiology/scan/start
   */
  async startScan(orderId: number): Promise<any> {
    const response = await apiClient.post('/radiology/scan/start', { order_id: orderId });
    return response.data;
  },

  /**
   * Submit a radiology report
   * Endpoint: POST /radiology/report/submit
   */
  async submitReport(payload: { 
    reference_no: string; 
    findings: string; 
    impression: string; 
    image_path?: string 
  }): Promise<any> {
    const response = await apiClient.post('/radiology/report/submit', payload);
    return response.data;
  },

  /**
   * Update a radiology report
   * Endpoint: PUT /radiology/report/update
   */
  async updateReport(payload: { 
    reference_no: string; 
    findings: string; 
    impression: string; 
    image_path?: string 
  }): Promise<any> {
    const response = await apiClient.put('/radiology/report/update', payload);
    return response.data;
  },

  /**
   * View a radiology report
   * Endpoint: GET /radiology/report/view?reference_no={ref}
   */
  async viewReport(referenceNo: string): Promise<any> {
    const response = await apiClient.get(`/radiology/report/view?reference_no=${referenceNo}`);
    return response.data?.data;
  },

  /**
   * Get list of scanned radiology orders for result entry
   * Endpoint: GET /radiology/scan/list
   */
  async getScanList(): Promise<any[]> {
    const response = await apiClient.get('/radiology/scan/list');
    return response.data?.data || [];
  }
};
