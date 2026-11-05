import apiClient from '../api/client';

/**
 * MedCore Auth Messenger
 * Relies on HttpOnly Cookies for session management
 */
export const authService = {
  /**
   * Primary Login
   * Browser automatically captures HttpOnly cookies from response
   */
  async login(username: string, password: string): Promise<any> {
    const response = await apiClient.post('/auth/login', { username, password });
    return response.data.data;
  },

  /**
   * Retrieve Current Authenticated User Profile
   */
  async getMe(): Promise<any> {
    const response = await apiClient.get('/auth/me');
    return response.data.data;
  },

  /**
   * Secure Logout
   * Backend will clear cookies upon successful request
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      window.location.href = '/login';
    }
  },

  /**
   * Clinical Account Governance
   */
  async changePassword(currentPass: string, newPass: string): Promise<any> {
    const response = await apiClient.post('/auth/change-password', {
      current_password: currentPass,
      new_password: newPass
    });
    return response.data.data;
  }
};