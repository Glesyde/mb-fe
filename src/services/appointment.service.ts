import apiClient from '../api/client';

export const appointmentService = {
  /**
   * APPOINTMENT BOOKING & METADATA
   */
  async getSpecializations(): Promise<any[]> {
    const response = await apiClient.get('/doctors-specializations');
    return response.data?.data || [];
  },

  /**
   * List verified doctors
   * Endpoint: GET /doctors
   */
  async listDoctors(): Promise<any[]> {
    const response = await apiClient.get('/doctors');
    const data = response.data?.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && Array.isArray(data.doctors)) return data.doctors;
    return [];
  },

  async bookAppointment(payload: {
    mrn: string;
    doctor_id: number;
    appointment_date: string;
    appointment_time: string;
    duration: number; // Added duration in minutes
    booking_type: 'PRE_BOOKED' | 'WALK_IN';
    reason_for_visit: string;
  }): Promise<any> {
    const response = await apiClient.post('/appointments/book', payload);
    return response.data;
  },

  async updateAppointment(id: number, payload: any): Promise<any> {
    const response = await apiClient.post(`/appointments/update?id=${id}`, payload);
    return response.data;
  },

  async updateAppointmentStatus(payload: {
    appointment_code: string;
    mrn: string;
    status: string;
  }): Promise<any> {
    const response = await apiClient.put('/appointments/update/status', payload);
    return response.data;
  },

  // Fetch draft billing details for a specific appointment
  async getBillingDetails(appointmentCode: string): Promise<any> {
    const response = await apiClient.get(`/appointment/billing?appointment_code=${appointmentCode}`);
    return response.data;
  },

  // Finalize payment for appointment
  async processPayment(payload: {
    appointment_code: string;
    payment_method: 'CASH' | 'POS' | 'TRANSFER';
    amount_paid: number;
  }): Promise<any> {
    // Updated endpoint as requested
    const response = await apiClient.post('/billing/appointment/clearance', payload);
    return response.data;
  },

  async deleteAppointment(id: number): Promise<any> {
    const response = await apiClient.post(`/appointments/delete?id=${id}`);
    return response.data;
  },

  /**
   * List appointments for a specific date, ID, or specialization
   * Endpoint: GET /appointments?appointment_date={date}&specialization_name={name}
   */
  async listAppointments(params?: { id?: number; appointment_date?: string; specialization_name?: string }): Promise<any[]> {
    let url = '/appointments';
    const queryParts = [];
    if (params?.id) queryParts.push(`id=${params.id}`);
    if (params?.appointment_date) queryParts.push(`appointment_date=${params.appointment_date}`);
    if (params?.specialization_name) queryParts.push(`specialization_name=${params.specialization_name}`);

    if (queryParts.length > 0) {
      url += `?${queryParts.join('&')}`;
    }

    const response = await apiClient.get(url);
    const data = response.data?.data;
    if (Array.isArray(data)) return data;
    // Handle cases where backend wraps array in an object (e.g. { appointments: [...] })
    if (data && typeof data === 'object' && Array.isArray(data.appointments)) return data.appointments;
    return [];
  },

  /**
   * DOCTOR SCHEDULE MANAGEMENT (ROTA)
   */
  async listSchedules(doctorId: number): Promise<any[]> {
    const response = await apiClient.get(`/doctors/list/schedules?id=${doctorId}`);
    const data = response.data?.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && Array.isArray(data.schedules)) return data.schedules;
    return [];
  },

  async createSchedule(payload: {
    doctor_id: number;
    day_of_week: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
    start_time: string;
    end_time: string;
    slot_duration: number;
  }): Promise<any> {
    const response = await apiClient.post('/doctors/create/schedules', payload);
    return response.data;
  },

  async updateSchedule(id: number, payload: any): Promise<any> {
    const response = await apiClient.put(`/doctors/update/schedules?id=${id}`, payload);
    return response.data;
  },

  async deleteSchedule(id: number): Promise<any> {
    const response = await apiClient.delete(`/doctors/delete/schedules?id=${id}`);
    return response.data;
  }
};
