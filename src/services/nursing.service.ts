import apiClient from "../api/client";

export const nursingService = {
  // --- IO Chart ---
  async logIO(payload: {
    encounter_number: string;
    type: "INTAKE" | "OUTPUT";
    category: string;
    volume?: number;
    volume_ml?: number;
    recorded_at?: string;
    remarks?: string;
    event_at?: string;
  }): Promise<any> {
    const response = await apiClient.post("/nursing/io/log", payload);
    return response.data;
  },

  async getIOReport(encounterNumber: string, date?: string): Promise<any> {
    const query = date
      ? `/nursing/io/report?encounter_number=${encounterNumber}&date=${date}`
      : `/nursing/io/report?encounter_number=${encounterNumber}`;
    const response = await apiClient.get(query);
    return response.data;
  },

  // --- Infusion ---
  async getInfusionPrescriptions(encounterNumber: string): Promise<any> {
    const response = await apiClient.get(
      `/nursing/infusion/prescriptions?encounter_number=${encounterNumber}`,
    );
    return response.data;
  },

  async getInfusionChart(encounterNumber: string): Promise<any> {
    const response = await apiClient.get(
      `/nursing/infusion/chart?encounter_number=${encounterNumber}`,
    );
    return response.data;
  },

  async getActiveInfusions(encounterNumber: string): Promise<any> {
    const response = await apiClient.get(
      `/nursing/infusion/active?encounter_number=${encounterNumber}`,
    );
    return response.data;
  },

  async getInfusionTimeline(sessionId: number): Promise<any> {
    const response = await apiClient.get(
      `/nursing/infusion/timeline?session_id=${sessionId}`,
    );
    return response.data;
  },

  async startInfusion(payload: {
    encounter_number: string;
    ward_id?: number;
    prescription_id: number;
    rate_ml_hr: number;
    infusion_type: string;
    access_site: string;
    volume_ml: number;
    event_at?: string;
    remarks?: string;
  }): Promise<any> {
    const response = await apiClient.post("/nursing/infusion/start", payload);
    return response.data;
  },

  async titrateInfusion(payload: {
    infusion_session_id: number;
    rate_ml_hr: number;
    shift_id?: number;
    remarks?: string;
  }): Promise<any> {
    const response = await apiClient.post("/nursing/infusion/titrate", payload);
    return response.data;
  },

  async resumeInfusion(payload: {
    infusion_session_id: number;
    rate_ml_hr: number;
    shift_id?: number;
    remarks?: string;
  }): Promise<any> {
    const response = await apiClient.post("/nursing/infusion/resume", payload);
    return response.data;
  },

  async pauseInfusion(payload: {
    infusion_session_id: number;
  }): Promise<any> {
    const response = await apiClient.post("/nursing/infusion/pause", payload);
    return response.data;
  },

  async stopInfusion(payload: {
    infusion_session_id: number;
    shift_id?: number;
    stop_reason: string;
  }): Promise<any> {
    const response = await apiClient.post("/nursing/infusion/stop", payload);
    return response.data;
  },

  // --- IO Correct / Cancel ---
  async correctIO(payload: {
    entry_id: number;
    volume_ml: number;
    category: string;
    correction_reason: string;
    remarks?: string;
  }): Promise<any> {
    const response = await apiClient.post("/nursing/io/correct", payload);
    return response.data;
  },

  async cancelIO(payload: {
    entry_id: number;
    reason: string;
  }): Promise<any> {
    const response = await apiClient.post("/nursing/io/cancel", payload);
    return response.data;
  },

  // --- MAR (Medication Administration Record) ---
  async getMARDue(encounterNumber: string): Promise<any> {
    const response = await apiClient.get(
      `/nursing/mar/due?encounter_number=${encounterNumber}`,
    );
    return response.data;
  },

  async getMARHistory(encounterNumber: string): Promise<any> {
    const response = await apiClient.get(
      `/nursing/mar/history?encounter_number=${encounterNumber}`,
    );
    return response.data;
  },

  async getMARDueHistory(encounterNumber: string): Promise<any> {
    const response = await apiClient.get(
      `/nursing/mar/dueHistory?encounter_number=${encounterNumber}`,
    );
    return response.data;
  },

  // --- MAR Monthly Calendar Endpoint ---
  async getMARMonth(encounterNumber: string, month: number, year: number): Promise<any> {
    const response = await apiClient.get(
      `/nursing/mar/dueMonth?encounter_number=${encounterNumber}&month=${month}&year=${year}`
    );
    return response.data;
  },

  async administerMedication(payload: {
    encounter_number: string;
    prescription_id: number;
    drug_id?: number;
    dose: string;
    route: string;
    administered_at: string;
    status: string;
    volume_ml?: number;
    diluent?: string;
    rate_ml_hr?: number;
    flush_ml?: number;
    access_site?: string;
    batch_number?: string;
    remarks?: string;
  }): Promise<any> {
    const response = await apiClient.post("/nursing/mar/administer", payload);
    return response.data;
  },


  // Add these inside your exported nursingService object:

  async missedMedication(payload: any): Promise<any> {
    const response = await apiClient.post("/nursing/mar/missed", payload);
    return response.data;
  },

  async refusedMedication(payload: any): Promise<any> {
    const response = await apiClient.post("/nursing/mar/refused", payload);
    return response.data;
  },

  async wastedMedication(payload: any): Promise<any> {
    const response = await apiClient.post("/nursing/mar/wasted", payload);
    return response.data;
  },

  // Inside inventory.service.ts
  async searchItems(location?: string): Promise<any> {
    const url = location ? `/inventory/search/items?location=${location}` : `/inventory/search/items`;
    const response = await apiClient.get(url);
    // Accommodate standard API wrappers
    return response.data?.data || response.data || [];
  },

};
