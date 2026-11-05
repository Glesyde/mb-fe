import apiClient from "../api/client";

export const userService = {
  /**
   * Fetches all registered users
   * Endpoint: GET /list-users
   */
  async listUsers(): Promise<any[]> {
    const response = await apiClient.get("/list-users");
    return response.data?.data || [];
  },

  /**
   * Fetches a single user's full profile
   * Endpoint: GET /get-user?id={id}
   */
  async getUserById(id: number): Promise<any> {
    const response = await apiClient.get(`/get-user?id=${id}`);
    return response.data?.data;
  },

  /**
   * Creates a new user (Normal or Doctor)
   * Endpoint: POST /create-user
   */
  async createUser(payload: any): Promise<any> {
    const response = await apiClient.post("/create-user", payload);
    return response.data;
  },

  /**
   * Updates an existing user
   * Endpoint: PUT /update-user?id={id}
   */
  async updateUser(id: number, payload: any): Promise<any> {
    const response = await apiClient.put(`/update-user?id=${id}`, payload);
    return response.data;
  },

  /**
   * Fetches all medical specializations for doctor accounts
   * Endpoint: GET /doctors-specializations
   */
  async getSpecializations(): Promise<any[]> {
    const response = await apiClient.get("/doctors-specializations");
    return response.data?.data || [];
  },

  /**
   * Fetches all available roles
   * Endpoint: GET /auth/roles
   */
  async getRoles(): Promise<any[]> {
    const response = await apiClient.get("/auth/roles");
    return response.data?.data || [];
  },

  /**
   * Fetches all registered doctors
   * Endpoint: GET /doctors
   */
  async getDoctors(): Promise<any[]> {
    const response = await apiClient.get("/doctors");
    return response.data?.data || [];
  },

  /**
   * Resets a user's password
   * Endpoint: POST /auth/reset-password
   */
  async resetPassword(userId: number, newPassword: string): Promise<any> {
    const response = await apiClient.post("/auth/reset-password", {
      user_id: userId,
      new_password: newPassword,
    });
    return response.data;
  },

  /**
   * Locks a user account
   * Endpoint: POST /auth/lock-user
   */
  async lockUser(userId: number): Promise<any> {
    const response = await apiClient.post("/auth/lock-user", {
      user_id: userId,
    });
    return response.data;
  },

  /**
   * Unlocks a user account
   * Endpoint: POST /auth/unlock-user
   */
  async unlockUser(userId: number): Promise<any> {
    const response = await apiClient.post("/auth/unlock-user", {
      user_id: userId,
    });
    return response.data;
  },
};
