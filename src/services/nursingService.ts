import apiClient from "../api/client";
import {
  IPDAdmission,
  LabourListRecord,
  LabourSession,
  StartLabourSessionPayload,
  PartogramObservation,
  AddObservationPayload,
  PartogramChartData,
  CtgObservation,
  AddCtgObservationPayload,
  EditCtgObservationPayload
} from "../types/nursing.types";

interface ApiResponse<T> {
  status: string;
  message: string;
  data: T;
}

interface ListResponse<T> {
  count: number;
  results: T[];
}

export const nursingService = {
  // IPD Admissions (used as entry point for Labour)
  getFemaleAdmissions: async () => {
    const response = await apiClient.get<ApiResponse<ListResponse<IPDAdmission>>>(
      "/ipd/admission/list"
    );
    // Filter female patients in frontend just in case backend doesn't support it yet
    const data = response.data;
    if (data && data.data && data.data.results) {
      data.data.results = data.data.results.filter(
        (adm) => adm.gender.toLowerCase() === "female" && adm.status === "ACTIVE"
      );
      data.data.count = data.data.results.length;
    }
    return response.data;
  },

  getLabourList: async () => {
    const response = await apiClient.get<ApiResponse<LabourListRecord[]>>(
      "/labour/list"
    );
    return response.data;
  },

  getLabourSessionList: async () => {
    const response = await apiClient.get<ApiResponse<LabourSession[]>>(
      "/labour/session/list"
    );
    return response.data;
  },

  // Labour Session
  startLabourSession: async (payload: StartLabourSessionPayload) => {
    const response = await apiClient.post<ApiResponse<any>>(
      "/labour/session/start",
      payload
    );
    return response.data;
  },

  getLabourSession: async (sessionId: number) => {
    const response = await apiClient.get<ApiResponse<LabourSession>>(
      `/labour/session/view?session_id=${sessionId}`
    );
    return response.data;
  },

  updateLabourSession: async (sessionId: number, payload: any) => {
    const response = await apiClient.put<ApiResponse<any>>(
      `/labour/session/update?session_id=${sessionId}`,
      payload
    );
    return response.data;
  },

  deleteLabourSession: async (sessionId: number) => {
    const response = await apiClient.delete<ApiResponse<any>>(
      `/labour/session/delete?session_id=${sessionId}`
    );
    return response.data;
  },

  // Partogram Observations
  addObservation: async (payload: AddObservationPayload) => {
    const response = await apiClient.post<ApiResponse<any>>(
      "/labour/partogram/observation",
      payload
    );
    return response.data;
  },

  updateObservation: async (id: number, payload: any) => {
    const response = await apiClient.put<ApiResponse<any>>(
      `/labour/partogram/update?id=${id}`,
      payload
    );
    return response.data;
  },

  deleteObservation: async (id: number, payload: { reason: string }) => {
    const response = await apiClient.put<ApiResponse<any>>(
      `/labour/partogram/delete?id=${id}`,
      payload
    );
    return response.data;
  },

  getObservations: async (sessionId: number) => {
    const response = await apiClient.get<ApiResponse<PartogramObservation[]>>(
      `/labour/partogram/list?session_id=${sessionId}`
    );
    return response.data;
  },

  getChartData: async (sessionId: number) => {
    const response = await apiClient.get<ApiResponse<PartogramChartData>>(
      `/labour/partogram/chart?session_id=${sessionId}`
    );
    return response.data;
  },

  // CTG Observations
  addCtgObservation: async (payload: AddCtgObservationPayload) => {
    const response = await apiClient.post<ApiResponse<any>>(
      "/labour/ctg/observation",
      payload
    );
    return response.data;
  },

  updateCtgObservation: async (id: number, payload: EditCtgObservationPayload) => {
    const response = await apiClient.put<ApiResponse<any>>(
      `/labour/ctg/update?id=${id}`,
      payload
    );
    return response.data;
  },

  deleteCtgObservation: async (id: number) => {
    const response = await apiClient.put<ApiResponse<any>>(
      `/labour/ctg/delete?id=${id}`
    );
    return response.data;
  },

  getCtgObservations: async (sessionId: number) => {
    const response = await apiClient.get<ApiResponse<CtgObservation[]>>(
      `/labour/ctg/list?session_id=${sessionId}`
    );
    return response.data;
  },
};
