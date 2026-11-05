import apiClient from "../api/client";

export const emrService = {
  async getTodayEncounters(): Promise<any[]> {
    const response = await apiClient.get("/emr/encounters?today");
    return response.data?.data || [];
  },

  async getEncountersByDate(date: string): Promise<any[]> {
    const response = await apiClient.get(`/emr/encounters?date=${date}`);
    return response.data?.data || [];
  },

  async getAllEncounters(): Promise<any[]> {
    const response = await apiClient.get("/emr/encounters");
    return response.data?.data || [];
  },

  // --- Clinical Notes ---
  async saveClinicalNote(payload: {
    encounter_number: string;
    note_type: "SOAP" | "PROGRESS" | "DISCHARGE" | "NURSING";
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  }): Promise<any> {
    const response = await apiClient.post("/emr/notes", payload);
    return response.data;
  },

  async updateClinicalNote(payload: {
    encounter_number: string;
    note_id: number;
    note_type: "SOAP" | "PROGRESS" | "DISCHARGE" | "NURSING";
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  }): Promise<any> {
    const response = await apiClient.put("/emr/notes/update", payload);
    return response.data;
  },

  async getClinicalNotes(encounterNumber: string): Promise<any[]> {
    const response = await apiClient.get(
      `/emr/notes/list?encounter_number=${encounterNumber}`,
    );
    return response.data?.data || [];
  },

  // --- Diagnosis ---
  async saveDiagnosis(payload: {
    encounter_number: string;
    icd10_code: string;
    diagnosis_description: string;
    diagnosis_type: "PRIMARY" | "SECONDARY";
  }): Promise<any> {
    const response = await apiClient.post("/emr/diagnosis", payload);
    return response.data;
  },

  async getDiagnoses(encounterNumber: string): Promise<any[]> {
    const response = await apiClient.get(
      `/emr/diagnosis/list?encounter_number=${encounterNumber}`,
    );
    return response.data?.data || [];
  },

  async updateDiagnosis(payload: {
    encounter_number: string;
    diagnosis_id: number;
    icd10_code: string;
    diagnosis_description: string;
    diagnosis_type: "PRIMARY" | "SECONDARY";
  }): Promise<any> {
    const response = await apiClient.put("/emr/diagnosis/update", payload);
    return response.data;
  },

  // --- Diagnosis ---
  // ... other diagnosis methods ...

  async deleteDiagnosis(diagnosisId: number, encounterNumber: string): Promise<any> {
    // Note: Axios DELETE requests that require a body must wrap the payload in a `data` object
    const response = await apiClient.delete("/emr/diagnosis/delete", {
      data: {
        diagnosis_id: diagnosisId,
        encounter_number: encounterNumber
      }
    });
    return response.data;
  },

  // --- Nursing Vitals ---
  async saveVitals(payload: import("../types/nursing-vitals.validation").NursingVitalsPayload): Promise<any> {
    const response = await apiClient.post("/nursing/vitals", payload);
    return response.data;
  },

  async updateVitals(payload: import("../types/nursing-vitals.validation").NursingVitalsUpdatePayload): Promise<any> {
    const response = await apiClient.post("/nursing/vitals", payload);
    return response.data;
  },

  async getVitals(encounterNumber: string): Promise<any[]> {
    const response = await apiClient.get(
      `/patients/vitals?encounter_number=${encounterNumber}`,
    );
    return response.data?.data || [];
  },

  // --- Nursing Notes ---
  async saveNursingNote(payload: {
    encounter_number: string;
    note_type: "OPD" | "IPD" | "NICU" | "HDU";
    clinical_summary: string;
    vitals_summary: string;
    care_level: "general" | "high_dependency" | "ICU";
    ward_id?: number | null;
    nursing_shift_id?: number | null;
  }): Promise<any> {
    const response = await apiClient.post("/nursing/notes", payload);
    return response.data;
  },

  async updateNursingNote(payload: {
    encounter_number: string;
    note_id: number;
    note_type: "OPD" | "IPD" | "NICU" | "HDU";
    clinical_summary: string;
    vitals_summary: string;
    care_level: "general" | "high_dependency" | "ICU";
    ward_id?: number | null;
    nursing_shift_id?: number | null;
  }): Promise<any> {
    const response = await apiClient.post("/nursing/notes", payload);
    return response.data;
  },

  async getNursingNotes(encounterNumber: string): Promise<any[]> {
    const response = await apiClient.get(
      `/patients/nursingNotes?encounter_number=${encounterNumber}`,
    );
    return response.data?.data || [];
  },

  // --- Order Entry (CPOE) ---

  async createOrder(payload: {
    encounter_number?: string;
    patient_id?: number;
    order_type: "LAB" | "RADIOLOGY" | "PHARMACY" | "PROCEDURE" | "SURGERY" | "CONSUMABLE" | "BLOOD_TRANSFUSION" | "FOOD";
    tariff_id: number;
    clinical_reason?: string;
    dispensing_dept?: string;
    items?: {
      item_id: number;
      quantity: number;
    }[];
    medications?: {
      drug_id: number;
      dose: string;
      frequency: string;
      duration_days: number;
      quantity: number;
      route: string;
    }[];
  }): Promise<any> {
    const response = await apiClient.post("/emr/order", payload);
    return response.data;
  },

  async deleteOrder(payload: {
    encounter_number: string;
    order_id: number;
    remarks: string;
  }): Promise<any> {
    // EMR orders have no billable_item_id — the order's own `id` is what identifies it here.
    // Axios delete with body requires 'data' key in config
    const response = await apiClient.delete("/emr/order/delete", {
      data: payload,
    });
    return response.data;
  },

  async cancelPrescriptionItem(payload: {
    encounter_number: string;
    prescription_id?: number;
  }): Promise<any> {
    const response = await apiClient.delete("/emr/cancel/prescription", {
      data: payload,
    });
    return response.data;
  },

  async stopPrescriptionItem(payload: {
    encounter_number: string;
    prescription_id?: number;
  }): Promise<any> {
    const response = await apiClient.put("/emr/stop/prescription", payload);
    return response.data;
  },

  async cancelConsumableItem(payload: {
    encounter_number: string;
    consumable_item_id: number;
    quantity: number;
    remarks: string;
  }): Promise<any> {
    const response = await apiClient.post("/emr/consumables/cancel", payload);
    return response.data;
  },

  async stopConsumableItem(payload: {
    encounter_number: string;
    consumable_item_id: number;
  }): Promise<any> {
    const response = await apiClient.put("/emr/consumables/stop", payload);
    return response.data;
  },

  async listOrders(encounterNumber: string): Promise<any[]> {
    const response = await apiClient.get(
      `/emr/order/list?encounter_number=${encounterNumber}`,
    );
    return response.data?.data || [];
  },

  async getEncounterSummary(encounterNumber: string): Promise<any> {
    const response = await apiClient.get(
      `/emr/encounter/summary?encounter_number=${encounterNumber}`,
    );
    return response.data?.data;
  },

  async getComprehensivePatientHistory(mrn: string): Promise<any> {
    const response = await apiClient.get(`/emr/patient/history?mrn=${mrn}`);
    return response.data?.data;
  },

  async closeEncounter(encounterNumber: string): Promise<any> {
    const response = await apiClient.post("/emr/encounter/close", {
      encounter_number: encounterNumber,
    });
    return response.data;
  },

  

  // --- ICD10 Diagnosis List ---
  async getICD10DiagnosisList(): Promise<
    Array<{
      code: string;
      description: string;
      chapter_code: string;
      chapter_name: string;
      category: string;
      specialization_id: number | null;
    }>
  > {
    const response = await apiClient.get("/emr/list/diagnosis");
    return response.data?.data || [];
  },



  // --- Search ICD10 Diagnosis ---
  async searchDiagnosis(searchTerm: string): Promise<any[]> {
    // FIXED: Now points to the actual backend route for your ICD-10 list
    const response = await apiClient.get("/emr/list/diagnosis", {
      params: { search: searchTerm }
    });
    return response.data?.data || response.data || [];
  },


  // // In emr.service.ts
  //   updateMedicalProfile: async (payload: { patient_id: number; blood_group?: string; genotype?: string }) => {
  //       const res = await axiosInstance.put("/emr/patient/profile/update", payload);
  //       return res.data;
  //   },

  //   addPatientAllergy: async (payload: { patient_id: number; allergen: string; reaction: string; severity: "MILD" | "MODERATE" | "SEVERE" }) => {
  //       const res = await axiosInstance.post("/emr/patient/allergy/add", payload);
  //       return res.data;
  //   },


  updateMedicalProfile: async (payload: { patient_id: number; blood_group?: string; genotype?: string }) => {
      // Changed axiosInstance to apiClient
      const res = await apiClient.put("/emr/patient/profile/update", payload);
      return res.data;
  },

  addPatientAllergy: async (payload: { patient_id: number; allergen: string; reaction: string; severity: "MILD" | "MODERATE" | "SEVERE" }) => {
      // Changed axiosInstance to apiClient
      const res = await apiClient.post("/emr/patient/allergy/add", payload);
      return res.data;
  },


  forceCompleteOrder: async (payload: { order_id: number; remarks: string }) => {
    const response = await apiClient.post('/services/orders/force-complete', payload);
    return response.data;
  },



  
  saveAssessment: async (payload: {
    ipd_admission_id?: number | null;   // Replaced admission_id
    er_admission_id?: number | null;    // Added ER admission ID
    patient_id: number;
    ward_id?: number;
    assessment_datetime: string;
    general_condition: string;
    consciousness: string;
    mobility: string;
    skin_findings: string[];
    skin_findings_other?: string;
    wound_present: "Yes" | "No" | "Unknown";
    wound_site?: string;
    wound_description?: string;
    other_findings?: string;
    initial_actions: string[];
    initial_actions_other?: string;
    ack_name: string;
    ack_relationship: string;
    ack_signature?: string; // base64
    ack_date: string;
  }): Promise<any> => {
    const response = await apiClient.post("/clinical/admission-assessment", payload);
    return response.data;
  },

  
  // saveAssessment: async (payload: {
  //   admission_id: number;
  //   patient_id: number;
  //   ward_id?: number;
  //   assessment_datetime: string;
  //   general_condition: string;
  //   consciousness: string;
  //   mobility: string;
  //   skin_findings: string[];
  //   skin_findings_other?: string;
  //   wound_present: "Yes" | "No" | "Unknown";
  //   wound_site?: string;
  //   wound_description?: string;
  //   other_findings?: string;
  //   initial_actions: string[];
  //   initial_actions_other?: string;
  //   ack_name: string;
  //   ack_relationship: string;
  //   ack_signature?: string; // base64
  //   ack_date: string;
  // }): Promise<any> => {
  //   const response = await apiClient.post("/clinical/admission-assessment", payload);
  //   return response.data;
  // },

  getAssessment: async (admissionId: number): Promise<any> => {
    const response = await apiClient.get(`/clinical/admission-assessment/view?admission_id=${admissionId}`);
    return response.data?.data;
  }

  
  
};



