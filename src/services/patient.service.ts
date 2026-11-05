import apiClient from "../api/client";
import { PatientDocument } from "../types";

export const patientService = {
  /**
   * Registers a new patient
   * Endpoint: POST /new-patients/registration
   */
  async registerPatient(payload: any): Promise<any> {
    const response = await apiClient.post(
      "/new-patients/registration",
      payload,
    );
    return response.data;
  },

  /**
   * Updates an existing patient registration
   * Endpoint: PUT /update-patients/registration?mrn={mrn}
   */
  async updatePatient(mrn: string, payload: any): Promise<any> {
    const response = await apiClient.put(
      `/update-patients/registration?mrn=${mrn}`,
      payload,
    );
    return response.data;
  },

  /**
   * Fetches detailed patient profile by MRN
   * Endpoint: GET /patients?mrn={mrn}
   */
  async getPatientByMrn(mrn: string): Promise<any> {
    const response = await apiClient.get(`/patients?mrn=${mrn}`);
    // The API returns data: [{...}], so we take the first item
    if (
      response.data?.data?.patients &&
      Array.isArray(response.data.data.patients) &&
      response.data.data.patients.length > 0
    ) {
      return response.data.data.patients[0];
    }
    return null;
  },

  /**
   * Fetches patient encounter history
   * Endpoint: GET /patients/history?mrn={mrn}
   */
  async getPatientHistory(mrn: string): Promise<any> {
    const response = await apiClient.get(`/patients/history?mrn=${mrn}`);
    return response.data?.data || null;
  },

  /**
   * Fetches comprehensive patient history including all deep clinical charts
   * Endpoint: GET /emr/patient/history?mrn={mrn}
   */
  async getComprehensiveHistory(mrn: string): Promise<any> {
    const response = await apiClient.get(`/emr/patient/history?mrn=${mrn}`);
    return response.data?.data || null;
  },

  /**
   * Searches for patients in the Master Index
   * Endpoint: POST /patients/search
   */
  async searchPatients(query: string): Promise<any[]> {
    const response = await apiClient.post("/patients/search", { query });
    return response.data?.data?.patients || response.data?.data || [];
  },

  /**
   * Get all patients (for mapping IDs to details)
   * Endpoint: GET /patients
   */
  async getAllPatients(): Promise<any[]> {
    const response = await apiClient.get("/patients");
    return response.data?.data?.patients || response.data?.data || [];
  },

  /**
   * PAYER INFRASTRUCTURE
   */
  async getPayerTypes(): Promise<any[]> {
    const response = await apiClient.get("/payer-types");
    return response.data?.data || [];
  },

  async getPayers(payerTypeId: number): Promise<any[]> {
    const response = await apiClient.get(
      `/payers?payer_type_id=${payerTypeId}`,
    );
    return response.data?.data || [];
  },

  async getReferralSources(): Promise<any[]> {
    try {
      const response = await apiClient.get("/referral-sources");
      return response.data?.data || [];
    } catch (error) {
      console.error("Failed to load referral sources", error);
      return [];
    }
  },

  
  /**
   * PATIENT DOCUMENT MANAGEMENT
   */

  /**
   * Uploads a single document for a patient
   * Endpoint: POST /patients/upload-document?mrn={mrn}
   */
  async uploadDocument(
    mrn: string,
    payload: {
      file_type: "LAB" | "RADIOLOGY" | "DOCUMENT" | "IMAGE";
      category: string;
      description: string;
      original_name: string;
      file: string; // base64 encoded file
    },
  ): Promise<PatientDocument> {
    try {
      const response = await apiClient.post(
        `/patients/upload-document?mrn=${mrn}`,
        payload,
      );
      return response.data?.data;
    } catch (error) {
      console.error("Error uploading document:", error);
      throw error;
    }
  },

  /**
   * Uploads multiple documents for a patient
   * Endpoint: POST /patients/bulk-upload?mrn={mrn}
   */
  async uploadBulkDocuments(
    mrn: string,
    files: {
      file_type: "LAB" | "RADIOLOGY" | "DOCUMENT" | "IMAGE";
      category: string;
      description: string;
      original_name: string;
      file: string; // base64 encoded file
    }[],
  ): Promise<PatientDocument[]> {
    try {
      const response = await apiClient.post(
        `/patients/bulk-upload?mrn=${mrn}`,
        { files },
      );
      return response.data?.data || [];
    } catch (error) {
      console.error("Error uploading bulk documents:", error);
      throw error;
    }
  },

  /**
   * Fetches all documents for a patient
   * Endpoint: GET /patients/documents?mrn={mrn}
   */
  async getPatientDocuments(mrn: string): Promise<PatientDocument[]> {
    try {
      const response = await apiClient.get(`/patients/documents?mrn=${mrn}`);
      return response.data?.data || [];
    } catch (error) {
      console.error("Error fetching patient documents:", error);
      throw error;
    }
  },

  /**
   * Fetches a single document for a patient
   * Endpoint: GET /patients/documents?mrn={mrn}&id={id}
   */
  async getPatientDocument(mrn: string, id: number): Promise<PatientDocument> {
    try {
      const response = await apiClient.get(
        `/patients/documents?mrn=${mrn}&id=${id}`,
      );
      return response.data?.data;
    } catch (error) {
      console.error("Error fetching patient document:", error);
      throw error;
    }
  },

  /**
   * Deletes a document for a patient
   * Endpoint: DELETE /patients/documents/delete?mrn={mrn}&id={id}
   */
  async deleteDocument(mrn: string, id: number): Promise<void> {
    try {
      await apiClient.delete(`/patients/documents/delete?mrn=${mrn}&id=${id}`);
    } catch (error) {
      console.error("Error deleting patient document:", error);
      throw error;
    }
  },

  /**
   * Fetches non-clinical admission list
   * Endpoint: GET /admission/list
   */
  async getAdmissionList(): Promise<any> {
    const response = await apiClient.get("/admission/list");
    return response.data?.data || { count: 0, results: [] };
  },
};
