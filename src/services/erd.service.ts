import apiClient from "../api/client";

export const erdService = {
  createBed: async (data: { bed_number: string; triage_category: string }) => {
    const response = await apiClient.post("/clinical/erd/bed/create", data);
    return response.data;
  },

  getBeds: async (params?: any) => {
    const response = await apiClient.get("/clinical/erd/beds", { params });
    return response.data;
  },

  updateBed: async (data: {
    id: number;
    bed_number: string;
    bed_status: string;
    triage_category: string;
  }) => {
    const response = await apiClient.put("/clinical/erd/bed/update", data);
    return response.data;
  },

  deleteBed: async (id: number) => {
    const response = await apiClient.delete("/clinical/erd/bed/delete", {
      data: { id },
    });
    return response.data;
  },

  admitPatient: async (data: {
    mrn: string;
    bed_number: string;
    triage_level: string;
    admitting_doctor_id: number;
  }) => {
    const response = await apiClient.post("/erd/admit", data);
    return response.data;
  },

  getAdmissions: async (params?: any) => {
    const response = await apiClient.get("/erd/admission/list", { params });
    return response.data;
  },

  // Discharge Process
  markForDischarge: async (data: {
    admission_id: number;
    discharge_reason_id: number;
    discharge_notes: string;
    doctor_signature: string;
    patient_witness: string;
  }) => {
    const response = await apiClient.post("/erd/discharge/patient/mark-for-discharge", data);
    return response.data;
  },
  nurseClearance: async (data: {
    admission_id: number;
    remarks: string;
    checklist: any;
    patient_relative_name: string;
    patient_id_card: string;
    patient_signature: string;
    witness_name: string;
    witness_id_card: string;
    witness_signature: string;
  }) => {
    const response = await apiClient.post("/erd/discharge/nurse-clearance", data);
    return response.data;
  },
  transferToIpd: async (data: {
    admission_id: number;
    mrn: string;
    target_ipd_bed_id: number;
    admitting_doctor_id: number;
    admission_reason: string;
  }) => {
    const response = await apiClient.post("/erd/transfer/ipd", data);
    return response.data;
  },
  pharmacyClearance: async (data: {
    admission_id: number;
    remarks: string;
    checklist: any;
  }) => {
    const response = await apiClient.post("/erd/discharge/pharmacy-clearance", data);
    return response.data;
  },
  billingFileReceived: async (admission_id: number) => {
    const response = await apiClient.post("/erd/discharge/billing-file-received", { admission_id });
    return response.data;
  },
  billingClearance: async (admission_id: number) => {
    const response = await apiClient.post("/erd/discharge/billing-clearance", { admission_id });
    return response.data;
  },
  finalize: async (admission_id: number) => {
    const response = await apiClient.post("/erd/discharge/finalize", { admission_id });
    return response.data;
  },

  // Reversals
  reverseDoctorMark: async (data: { admission_id: number; reason: string }) => {
    const response = await apiClient.post("/erd/discharge/reverse-doctor-mark", data);
    return response.data;
  },
  reverseNurseClearance: async (data: { admission_id: number; reason: string }) => {
    const response = await apiClient.post("/erd/discharge/reverse-nurse-clearance", data);
    return response.data;
  },
  reversePharmacyClearance: async (data: { admission_id: number; reason: string }) => {
    const response = await apiClient.post("/erd/discharge/reverse-pharmacy-clearance", data);
    return response.data;
  },
  reverseBillingFileReceived: async (data: { admission_id: number; reason: string }) => {
    const response = await apiClient.post("/erd/discharge/reverse-billing-file-received", data);
    return response.data;
  },
  reverseBillingClearance: async (data: { admission_id: number; reason: string }) => {
    const response = await apiClient.post("/erd/discharge/reverse-billing-clearance", data);
    return response.data;
  },
  getDischargeSummary: async (encounter_id: number) => {
    const response = await apiClient.get(`/erd/discharge/summary?encounter_id=${encounter_id}`);
    return response.data;
  }
};
