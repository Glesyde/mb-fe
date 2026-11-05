import apiClient from "../api/client";

export const wardService = {
  // Wards
  setupWard: async (data: {
    name: string;
    ward_type: string;
    department: string;
    rooms: number;
    beds_per_room: number;
  }) => {
    const response = await apiClient.post(`/clinical/ipd/wards/setup`, data);
    return response.data;
  },
  createWard: async (data: {
    name: string;
    ward_type: string;
    department: string;
  }) => {
    const response = await apiClient.post(`/clinical/ipd/wards/create`, data);
    return response.data;
  },
  getWards: async () => {
    const response = await apiClient.get(`/clinical/ipd/wards`);
    return response.data;
  },
  updateWard: async (data: {
    id: number;
    name?: string;
    ward_type?: string;
    department?: string;
    is_active?: number;
  }) => {
    const response = await apiClient.put(`/clinical/ipd/wards/update`, data);
    return response.data;
  },
  deleteWard: async (id: number) => {
    const response = await apiClient.delete(`/clinical/ipd/wards/delete`, {
      data: { id },
    });
    return response.data;
  },

  // Rooms
  createRoom: async (data: { ward_id: number; room_number: string }) => {
    const response = await apiClient.post(`/clinical/ipd/rooms/create`, data);
    return response.data;
  },
  getRooms: async (wardId: number) => {
    const response = await apiClient.get(
      `/clinical/ipd/rooms?ward_id=${wardId}`,
    );
    return response.data;
  },
  updateRoom: async (data: { id: number; room_number?: string }) => {
    const response = await apiClient.put(`/clinical/ipd/rooms/update`, data);
    return response.data;
  },
  deleteRoom: async (id: number) => {
    const response = await apiClient.delete(`/clinical/ipd/rooms/delete`, {
      data: { id },
    });
    return response.data;
  },

  // Beds
  createBed: async (data: {
    ward_id: number;
    room_number: string;
    bed_status: string;
  }) => {
    const response = await apiClient.post(`/clinical/ipd/beds/create`, data);
    return response.data;
  },
  getBeds: async (roomId: number) => {
    const response = await apiClient.get(
      `/clinical/ipd/beds?room_id=${roomId}`,
    );
    return response.data;
  },
  updateBed: async (data: {
    id: number;
    bed_number?: string;
    bed_status?: string;
  }) => {
    const response = await apiClient.put(`/clinical/ipd/beds/update`, data);
    return response.data;
  },
  deleteBed: async (id: number) => {
    const response = await apiClient.delete(`/clinical/ipd/beds/delete`, {
      data: { id },
    });
    return response.data;
  },

  // Admissions & Doctors
  getDoctors: async () => {
    const response = await apiClient.get(`/doctors`);
    return response.data;
  },

  admitPatient: async (data: {
    mrn: string;
    bed_id: number;
    admitting_doctor_id: number;
    admission_source: string;
    admission_reason: string;
  }) => {
    const response = await apiClient.post(`/ipd/admit`, data);
    return response.data;
  },

  getAdmissions: async (params?: {
    room_number?: string;
    bed_number?: string;
  }) => {
    const response = await apiClient.get(`/ipd/admission/list`, {
      params,
    });
    return response.data;
  },

  transferDoctor: async (data: {
    admission_id: number;
    new_doctor_id: number;
  }) => {
    const response = await apiClient.post(`/ipd/transfer-doctor`, data);
    return response.data;
  },

  transferBed: async (data: {
    admission_id: number;
    ward_id: number;
    room_id: number;
    bed_id: number;
  }) => {
    const response = await apiClient.post(`/ipd/transfer-bed`, data);
    return response.data;
  },

  // Discharge Process
  markForDischarge: async (data: {
    admission_id: number;
    discharge_reason_id: number;
    discharge_notes: string;
    doctor_signature: string;
    patient_witness_name: string;
    patient_witness: string;
  }) => {
    const response = await apiClient.post(`/ipd/discharge/patient/mark-for-discharge`, data);
    return response.data;
  },
  getDischargeReasons: async () => {
    const response = await apiClient.get(`/ipd/discharge/reasons`);
    return response.data;
  },
  nurseClearance: async (data: {
    admission_id: number;
    remarks: string;
    checklist: any;
    first_name: string;
    last_name: string;
    patient_relative_name: string;
    patient_id_card: string;
    patient_signature: string;
    witness_name: string;
    witness_id_card: string;
    witness_signature: string;
  }) => {
    const response = await apiClient.post(`/ipd/discharge/nurse-clearance`, data);
    return response.data;
  },
  pharmacyClearance: async (data: {
    admission_id: number;
    remarks: string;
    checklist: any;
  }) => {
    const response = await apiClient.post(`/ipd/discharge/pharmacy-clearance`, data);
    return response.data;
  },
  billingFileReceived: async (admission_id: number) => {
    const response = await apiClient.post(`/ipd/discharge/billing-file-received`, { admission_id });
    return response.data;
  },
  billingClearance: async (admission_id: number) => {
    const response = await apiClient.post(`/ipd/discharge/billing-clearance`, { admission_id });
    return response.data;
  },
  finalizeDischarge: async (admission_id: number) => {
    const response = await apiClient.post(`/ipd/discharge/finalize`, { admission_id });
    return response.data;
  },
  reverseDoctorMark: async (data: { admission_id: number; reason: string }) => {
    const response = await apiClient.post(`/ipd/discharge/reverse-doctor-mark`, data);
    return response.data;
  },
  reverseNurseClearance: async (data: { admission_id: number; reason: string }) => {
    const response = await apiClient.post(`/ipd/discharge/reverse-nurse-clearance`, data);
    return response.data;
  },
  reversePharmacyClearance: async (data: { admission_id: number; reason: string }) => {
    const response = await apiClient.post(`/ipd/discharge/reverse-pharmacy-clearance`, data);
    return response.data;
  },
  reverseBillingFileReceived: async (data: { admission_id: number; reason: string }) => {
    const response = await apiClient.post(`/ipd/discharge/reverse-billing-file-received`, data);
    return response.data;
  },
  reverseBillingClearance: async (data: { admission_id: number; reason: string }) => {
    const response = await apiClient.post(`/ipd/discharge/reverse-billing-clearance`, data);
    return response.data;
  },
  getDischargeSummary: async (encounter_id: number) => {
    const response = await apiClient.get(`/ipd/discharge/summary?encounter_id=${encounter_id}`);
    return response.data;
  },

  // ... existing ward services ...

  // Get medications eligible for return for a specific encounter
  getDispensedForReturn: async (encounterId: number) => {
    const response = await apiClient.get(`/nursing/medication/dispensed-for-return?encounter_id=${encounterId}`);
    return response.data;
  },

  // Submit a return request from Nursing to Pharmacy
  requestMedicationReturn: async (data: { dispensing_id: number; qty: number; reason: string }) => {
    const response = await apiClient.post(`/nursing/medication/return-request`, data);
    return response.data;
  },

  
};
