import apiClient from "../api/client";

export interface Role {
  id: number;
  name: string;
  description?: string;
}

export interface Permission {
  id: number;
  code: string;
  description: string;
  module: string;
}

export const permissionService = {
  /**
   * Fetches all available system roles.
   * Endpoint: GET /auth/roles
   */
  async getRoles(): Promise<Role[]> {
    const response = await apiClient.get("/auth/roles");
    return response.data?.data || [];
  },

  /**
   * Fetches all available permissions.
   * Endpoint: GET /admin/get/permissions
   */
  async getPermissions(): Promise<Permission[]> {
    const response = await apiClient.get("/admin/get/permissions");
    return response.data?.data || [];
  },

  /**
   * Fetches all active permissions assigned to a specific role.
   * Endpoint: GET /admin/get/role-permissions?role_id={roleId}
   */
  async getRolePermissions(roleId: number): Promise<Permission[]> {
    const response = await apiClient.get(
      `/admin/get/role-permissions?role_id=${roleId}`,
    );
    return response.data?.data || [];
  },

  /**
   * Removes a permission from a role.
   * Endpoint: POST /admin/remove/role-permissions
   */
  async removeRolePermission(payload: {
    role_id: number;
    permission_id: number;
  }): Promise<any> {
    const response = await apiClient.post(
      "/admin/remove/role-permissions",
      payload,
    );
    return response.data;
  },

  /**
   * Assigns a permission to a role.
   * Endpoint: POST /admin/assign/role-permissions
   */
  async assignRolePermission(payload: {
    role_id: number;
    permission_id: number;
  }): Promise<any> {
    const response = await apiClient.post(
      "/admin/assign/role-permissions",
      payload,
    );
    return response.data;
  },
};
