/**
 * OT Checklist Service
 * Handles all API calls for WHO Surgical Safety Checklist (T1)
 */

import apiClient from "../api/client";
import {
  ChecklistData,
  ChecklistRequest,
  ChecklistResponse,
  WardCheck1Data,
  WardCheck2Data,
  SignInData,
  TimeOutData,
  SignOutData,
} from "../types/ot-checklist.types";

export const otChecklistService = {
  /**
   * Save checklist stage
   * Posts data to /ot/checklist with stage identifier
   */
  saveStage: async (
    data:
      | WardCheck1Data
      | WardCheck2Data
      | SignInData
      | TimeOutData
      | SignOutData,
  ): Promise<ChecklistResponse> => {
    try {
      const response = await apiClient.post<ChecklistResponse>(
        "/ot/checklist",
        data,
      );
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Failed to save checklist stage";
      throw new Error(message);
    }
  },

  /**
   * Get checklist by OT case ID
   * Retrieves existing checklist data for resume workflow
   */
  getChecklist: async (ot_case_id: number): Promise<ChecklistData> => {
    try {
      const response = await apiClient.get<ChecklistResponse>(
        "/ot/checklist/view",
        {
          params: { ot_case_id },
        },
      );

      if (!response.data?.data) {
        throw new Error("No checklist data returned");
      }

      return response.data.data;
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Failed to retrieve checklist";

      // If 404, checklist doesn't exist yet - this is not an error
      if (error.response?.status === 404) {
        console.debug(`No existing checklist for OT case ${ot_case_id}`);
        return null as any; // Return null to indicate no existing data
      }

      throw new Error(message);
    }
  },

  /**
   * Delete checklist
   * Removes checklist entirely (via soft delete or hard delete based on backend)
   */
  deleteChecklist: async (ot_case_id: number): Promise<ChecklistResponse> => {
    try {
      const response = await apiClient.delete<ChecklistResponse>(
        "/ot/checklist/delete",
        {
          data: { ot_case_id },
        },
      );
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Failed to delete checklist";
      throw new Error(message);
    }
  },

  /**
   * Helper: Parse JSON fields from API response
   * Converts JSON strings to objects for surgeon_notes, anaesthesia_notes, etc
   */
  parseChecklistData: (data: ChecklistData): ChecklistData => {
    // Parse JSON fields if they exist and are strings
    const parsed = { ...data };

    // Parse Time Out notes
    if (typeof data.to_surgeon_notes === "string") {
      try {
        (parsed.to_surgeon_notes as any) = JSON.parse(data.to_surgeon_notes);
      } catch (e) {
        console.warn("Failed to parse surgeon_notes");
      }
    }

    if (typeof data.to_anaesthesia_notes === "string") {
      try {
        (parsed.to_anaesthesia_notes as any) = JSON.parse(
          data.to_anaesthesia_notes,
        );
      } catch (e) {
        console.warn("Failed to parse anaesthesia_notes");
      }
    }

    if (typeof data.to_nurse_notes === "string") {
      try {
        (parsed.to_nurse_notes as any) = JSON.parse(data.to_nurse_notes);
      } catch (e) {
        console.warn("Failed to parse nurse_notes");
      }
    }

    // Parse Sign In allergies
    if (typeof data.si_allergies_json === "string") {
      try {
        (parsed.si_allergies_json as any) = JSON.parse(data.si_allergies_json);
      } catch (e) {
        console.warn("Failed to parse allergies");
      }
    }

    return parsed;
  },

  /**
   * Helper: Check which stages are completed
   */
  getCompletedStages: (data: ChecklistData): boolean[] => {
    return [
      data.wc1_done === 1,
      data.wc2_done === 1,
      data.sign_in_done === 1,
      data.time_out_done === 1,
      data.sign_out_done === 1,
    ];
  },

  /**
   * Helper: Check if any stage is completed
   */
  isAnyStageCompleted: (data: ChecklistData): boolean => {
    return (
      data.wc1_done === 1 ||
      data.wc2_done === 1 ||
      data.sign_in_done === 1 ||
      data.time_out_done === 1 ||
      data.sign_out_done === 1
    );
  },

  /**
   * Helper: Check if checklist is fully completed
   */
  isFullyCompleted: (data: ChecklistData): boolean => {
    return (
      data.wc1_done === 1 &&
      data.wc2_done === 1 &&
      data.sign_in_done === 1 &&
      data.time_out_done === 1 &&
      data.sign_out_done === 1
    );
  },
};
