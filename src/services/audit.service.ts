import apiClient from "../api/client";
import { AuditLog } from "../types";

export interface AuditLogFilters {
  action?: string;
  startDate?: string;
  endDate?: string;
  userId?: number;
  performedBy?: string;
  limit?: number;
  offset?: number;
}

export const auditService = {
  /**
   * Fetches audit logs with optional filtering
   * Endpoint: GET /audit/logs
   * Query params: action, start_date, end_date, user_id, performed_by
   */
  async getAuditLogs(filters?: AuditLogFilters): Promise<AuditLog[]> {
    try {
      const params = new URLSearchParams();

      if (filters?.action) {
        params.append("action", filters.action);
      }
      if (filters?.startDate) {
        params.append("start_date", filters.startDate);
      }
      if (filters?.endDate) {
        params.append("end_date", filters.endDate);
      }
      if (filters?.userId) {
        params.append("user_id", filters.userId.toString());
      }
      if (filters?.performedBy) {
        params.append("performed_by", filters.performedBy);
      }
      if (filters?.limit) {
        params.append("limit", filters.limit.toString());
      }
      if (filters?.offset) {
        params.append("offset", filters.offset.toString());
      }

      const queryString = params.toString();
      const url = queryString ? `/audit/logs?${queryString}` : "/audit/logs";

      const response = await apiClient.get(url);
      return response.data?.data || [];
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      throw error;
    }
  },

  /**
   * Fetches a single audit log entry by ID
   * Endpoint: GET /audit/logs/{id}
   */
  async getAuditLogById(id: number): Promise<AuditLog> {
    try {
      const response = await apiClient.get(`/audit/logs/${id}`);
      return response.data?.data;
    } catch (error) {
      console.error("Error fetching audit log:", error);
      throw error;
    }
  },

  /**
   * Gets available audit actions for filtering
   * Useful for populating dropdown/filter options
   */
  getAvailableActions(): string[] {
    return [
      "LOGIN_SUCCESS",
      "LOGIN_FAILED",
      "LOGOUT",
      "TOKEN_REFRESH",
      "PATIENT_CREATED",
      "PATIENT_UPDATED",
      "PATIENT_DELETED",
      "PATIENT_HISTORY_VIEWED",
      "DOCUMENT_UPLOADED",
      "DOCUMENT_DELETED",
      "RECORD_MODIFIED",
    ];
  },
};
