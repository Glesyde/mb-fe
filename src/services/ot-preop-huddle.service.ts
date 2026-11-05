/**
 * OT Preoperative Huddle Service (T2)
 * Handles all API calls for Preoperative Team Huddle Surgical Safety Meeting Checklist
 * 4 stages: Surgeon → Anaesthetist → Scrub Nurse → Complete
 */

import apiClient from "../api/client";

export interface PreopHuddleSurgeonData {
  ot_case_id: number;
  stage: "surgeon";
  identity_confirmed: boolean;
  procedure_position: string; // YES/NO
  equipment_discussed: boolean;
  blood_loss_risk: boolean;
  blood_prepared: boolean;
  imaging_reviewed: string; // YES/NO
  special_equipment?: string;
  critical_steps?: string;
  patient_specific_concerns?: string;
  surgeon_id: number;
  surgeon_name: string;
  surgeon_designation: string;
}

export interface PreopHuddleAnaesthetistData {
  ot_case_id: number;
  stage: "anaesthetist";
  airway_risk: string; // YES/NO
  airway_prepared: boolean;
  has_allergy: boolean;
  allergies_json?: Array<{ allergy: string; reaction?: string }>;
  asa_grade: string;
  risk_score: string; // LOW, MODERATE, HIGH
  monitoring_plan?: string;
  anaesthetist_id: number;
  anaesthetist_name: string;
  anaesthetist_designation: string;
}

export interface PreopHuddleScrubData {
  ot_case_id: number;
  stage: "scrub";
  instrument_sterility_confirmed: boolean;
  equipment_ready_confirmed: boolean;
  equipment_issues_flag: number; // 0 or 1
  equipment_issue_details?: string | null;
  team_introduced: boolean;
  imaging_displayed: string; // YES/NO
  nurse_id: number;
  nurse_name: string;
  nurse_designation: string;
}

export interface PreopHuddleCompleteData {
  ot_case_id: number;
  stage: "complete";
  icu_required: number; // 0 or 1
  recovery_concerns?: string;
  completed: boolean;
}

export type PreopHuddleStageData =
  | PreopHuddleSurgeonData
  | PreopHuddleAnaesthetistData
  | PreopHuddleScrubData
  | PreopHuddleCompleteData;

export interface PreopHuddleResponse {
  status: "success" | "error";
  message: string;
  data?: any;
}

export const otPreopHuddleService = {
  /**
   * Save preop huddle stage
   */
  saveStage: async (
    data: PreopHuddleStageData,
  ): Promise<PreopHuddleResponse> => {
    try {
      const response = await apiClient.post<PreopHuddleResponse>(
        "/ot/preop-huddle/save",
        data,
      );
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Failed to save preop huddle stage";
      throw new Error(message);
    }
  },

  /**
   * Get preop huddle by OT case ID
   */
  getHuddle: async (ot_case_id: number): Promise<any> => {
    try {
      const response = await apiClient.get("/ot/preop-huddle/get", {
        params: { ot_case_id },
      });
      return response.data?.data || null;
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Failed to fetch preop huddle";
      throw new Error(message);
    }
  },

  /**
   * Delete preop huddle
   */
  deleteHuddle: async (ot_case_id: number): Promise<PreopHuddleResponse> => {
    try {
      const response = await apiClient.delete<PreopHuddleResponse>(
        "/ot/preop-huddle/delete",
        {
          data: { ot_case_id },
        },
      );
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Failed to delete preop huddle";
      throw new Error(message);
    }
  },

  /**
   * Check if stage is completed
   */
  isStageCompleted: (huddle: any, stage: string): boolean => {
    if (!huddle) return false;
    // Check based on stage
    switch (stage) {
      case "surgeon":
        return !!huddle.surgeon_id;
      case "anaesthetist":
        return !!huddle.anaesthetist_id;
      case "scrub":
        return !!huddle.nurse_id;
      case "complete":
        return !!huddle.completed;
      default:
        return false;
    }
  },

  /**
   * Get completed stages
   */
  getCompletedStages: (huddle: any): boolean[] => {
    if (!huddle) return [false, false, false, false];
    return [
      !!huddle.surgeon_id,
      !!huddle.anaesthetist_id,
      !!huddle.nurse_id,
      !!huddle.completed,
    ];
  },
};
