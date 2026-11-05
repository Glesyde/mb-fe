import apiClient from "../api/client";

export interface OTCaseBoard {
  theatre_info: {
    room_name: string;
    current_time: string;
  };
  patient: {
    id: string;
    age: number;
    sex: string;
    allergy: string;
  };
  procedure: string;
  team: {
    surgeon: string;
    assist_surgeon: string;
    anaesthetist: string;
    scrub_nurse: string;
    circulator: string;
  };
  checklists: {
    sign_in: { status: boolean; time: string };
    time_out: { status: boolean; time: string };
    sign_out: { status: boolean; time: string };
  };
  timers: {
    anaes_start: string;
    knife_to_skin: string;
    elapsed_time: string;
  };
  counts: Array<{
    item: string;
    in: number;
    out: number;
    status: string;
  }>;
  blood_loss: {
    estimated_total_ml: number;
  };
  specimen: {
    collected: boolean;
    type: string;
    sent: boolean;
  };
  next_case: {
    procedure: string;
    status: string;
  };

  radiology_images?: any[];
}

export interface OTRoom {
  id: number;
  room_name: string;
  status: string;
  created_at: string;
}

export interface OTRequest {
  order_id: number;
  service_code: string;
  service_name: string;
  tariff_id: number;
  order_status: string;
  ordered_at: string;
  patient_id: number;
  mrn: string;
  first_name: string;
  last_name: string;
  gender: string;
  phone: string;
  encounter_id: number;
  encounter_number: string;
  encounter_status: string;
  admission_id: number | null;
  admission_number: string | null;
  admission_status: string | null;
  admission_date: string | null;
  ward_name: string;
  room_number: string;
  bed_number: string;
  doctor_id: number;
  doctor_first_name: string;
  doctor_last_name: string;
  ot_case_id: number;
  ot_case_number: string | null;
  surgery_name: string;
  surgery_type: "ELECTIVE" | "EMERGENCY";
  anesthesia_type: string | null;
  ot_status: string;
  request_status: string;
  priority: string;
  financial_status: string;
  is_billed: number;
  estimated_duration_min: number | null;
  preferred_surgery_date: string;
  preferred_surgery_time: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  start_time: string | null;
  end_time: string | null;
  request_notes: string;
  assigned_ot_room: string | null;
  preferred_ot_room: string;
  surgeon_id: number | null;
  surgeon_first_name: string | null;
  surgeon_last_name: string | null;
  requested_by_first_name: string;
  requested_by_last_name: string;
  request_time: string;
  payer_name?: string;
  consent_status?: string;
  status_label?: string;
  status_color?: string;
}

export interface OTSurgery {
  id: number;
  order_id: number;
  ot_case_number: string;
  encounter_id: number;
  admission_id: number;
  ot_room_id: number;
  surgery_name: string;
  surgery_type: "ELECTIVE" | "EMERGENCY";
  scheduled_date: string;
  scheduled_time: string;
  start_time: string | null;
  end_time: string | null;
  status:
    | "REQUESTED"
    | "SCHEDULED"
    | "CHECKED_IN"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "DOCUMENTED"
    | "CANCELLED";
  is_billed: number;
  financial_status: string;
  encounter_number: string;
  admission_number: string;
  mrn: string;
  first_name: string;
  last_name: string;
  room_name: string;
  creator_first_name: string;
  creator_last_name: string;
  consent_status: string;
  status_label: string;
  status_color: string;
  age?: string;
  gender?: string;
  anaesthesia_completed?: boolean;
  checklist_completed?: boolean;
  cardiac_completed?: boolean;
  perfusion_completed?: boolean;
  op_note_completed?: boolean;
  huddle_completed?: boolean;
  patient_name?: string;
  doctor_name?: string;
  diagnosis?:string;
  
}


// ─── ADD THESE INTERFACES AT THE TOP OR BOTTOM OF THE FILE ──────────────────

export interface AnaesthesiaGridObservation {
  observation_time: string;
  bp_systolic?: number;
  bp_diastolic?: number;
  map?: number;
  heart_rate?: number;
  spo2?: number;
  etco2?: number;
  temperature?: number;
  resp_rate?: number;
  airway_pressure?: number;
  mac_value?: number;
  fio2?: number;
  cvp?: number;
  urine_output_ml?: number;
  blood_loss_ml?: number;
  additional_metrics?: any;
}

export interface AnaesthesiaRecord {
  id: number;
  ot_case_id: number;
  status: string;
  observations_grid: AnaesthesiaGridObservation[];
  // ... other fields are mapped but we only need the grid for this component
}


export const otService = {
  // Rooms
  getRooms: async () => {
    const response = await apiClient.get("/ot/room/list");
    return response.data?.data || [];
  },

  createRoom: async (data: { room_name: string }) => {
    const response = await apiClient.post("/ot/room/create", data);
    return response.data;
  },

  // Requests
  getRequests: async () => {
    const response = await apiClient.get("/ot/request/list");
    return response.data?.data || [];
  },

  // Scheduling & Management
  getSurgeries: async () => {
    const response = await apiClient.get("/ot/list");
    return response.data?.data || [];
  },

  scheduleSurgery: async (data: {
    ot_case_id: number;
    ot_room_id: number;
    scheduled_date: string;
    scheduled_time: string;
  }) => {
    const response = await apiClient.post("/ot/schedule", data);
    return response.data;
  },

  signSurgeryConsent: async (data: {
    order_id: number;
    signature: string;
    witness_user_id: number;
  }) => {
    const response = await apiClient.post("/clinical/consent", data);
    return response.data;
  },

  updateSurgery: async (data: {
    id: number;
    surgery_name?: string;
    surgery_type?: "ELECTIVE" | "EMERGENCY";
    scheduled_date?: string;
    scheduled_time?: string;
    status?: string;
  }) => {
    const response = await apiClient.put("/ot/update", data);
    return response.data;
  },

  cancelSurgery: async (ot_case_id: number) => {
    const response = await apiClient.put("/ot/cancel", { ot_case_id });
    return response.data;
  },

  billingClearance: async (ot_case_id: number) => {
    const response = await apiClient.put("/ot/billing-clearance", {
      ot_case_id,
    });
    return response.data;
  },

  startSurgery: async (ot_case_id: number) => {
    const response = await apiClient.put("/ot/start", { ot_case_id });
    return response.data;
  },

  completeSurgery: async (ot_case_id: number) => {
    const response = await apiClient.put("/ot/complete", { ot_case_id });
    return response.data;
  },

  // Operative Note Endpoints
  getOperativeNote: async (ot_case_id: number) => {
    const response = await apiClient.get(`/ot/operative-note/view`, {
      params: { ot_case_id },
    });
    return response.data?.data;
  },

  createOperativeNote: async (data: any) => {
    const response = await apiClient.post("/ot/operative-note", data);
    return response.data;
  },

  updateOperativeNote: async (data: any) => {
    const response = await apiClient.put("/ot/operative-note/update", data);
    return response.data;
  },

  getCaseBoard: async (ot_case_id: number): Promise<OTCaseBoard> => {
    const response = await apiClient.get("/ot/board/case", {
      params: { ot_case_id },
    });
    return response.data?.data;
  },

  submitSwabCounts: async (payload: {
    ot_case_id: number;
    counts: Array<{ item: string; in: number; out: number }>;
  }): Promise<any> => {
    const response = await apiClient.post("/ot/board/swab/counts", payload);
    return response.data;
  },

  getBoard: async () => {
    const response = await apiClient.get("/ot/board");
    return response.data?.data;
  },



  // ─── APPEND THESE METHODS INSIDE THE EXISTING `otService` OBJECT ─────────────
  // Locate the bottom of `otService` and add these before the final closing brace };

  // Anaesthesia & Perioperative Monitoring Endpoints
  getAnaesthesiaRecord: async (ot_case_id: number): Promise<AnaesthesiaRecord | null> => {
    const response = await apiClient.get("/ot/anaesthesia/record/get", {
      params: { ot_case_id },
    });
    return response.data?.data;
  },

  syncCompleteRecord: async (payload: any) => {
    // Points directly to the POST endpoint you specified
    const response = await apiClient.post("/ot/anaesthesia/record/save", payload);
    return response.data;
  },

  
  saveAnaesthesiaGrid: async (data: {
    anaesthesia_record_id: number;
    observations: any[];
  }) => {
    const response = await apiClient.post("/ot/anaesthesia/grid/save", data);
    return response.data;
  },


  // 🔴 FIX: Use apiClient and async/await to match the rest of the file
  syncPerfusionRecord: async (data: any) => {
    const response = await apiClient.post('/ot/perfusion/record/sync', data);
    return response.data;
  },

  getPerfusionRecord: async (caseId: number) => {
    const response = await apiClient.get(`/ot/perfusion/record/get?ot_case_id=${caseId}`);
    return response.data?.data;
  }

};


// import apiClient from "../api/client";

// export interface OTCaseBoard {
//   theatre_info: {
//     room_name: string;
//     current_time: string;
//   };
//   patient: {
//     id: string;
//     age: number;
//     sex: string;
//     allergy: string;
//   };
//   procedure: string;
//   team: {
//     surgeon: string;
//     assist_surgeon: string;
//     anaesthetist: string;
//     scrub_nurse: string;
//     circulator: string;
//   };
//   checklists: {
//     sign_in: { status: boolean; time: string };
//     time_out: { status: boolean; time: string };
//     sign_out: { status: boolean; time: string };
//   };
//   timers: {
//     anaes_start: string;
//     knife_to_skin: string;
//     elapsed_time: string;
//   };
//   counts: Array<{
//     item: string;
//     in: number;
//     out: number;
//     status: string;
//   }>;
//   radiology_images: Array<{
//     file_path: string;
//     file_type: string;
//     source: string;
//   }>;
//   blood_loss: {
//     estimated_total_ml: number;
//   };
//   specimen: {
//     collected: boolean;
//     type: string;
//     sent: boolean;
//   };
//   next_case: {
//     procedure: string;
//     status: string;
//   };
// }

// export interface OTRoom {
//   id: number;
//   room_name: string;
//   status: string;
//   created_at: string;
// }

// export interface OTRequest {
//   order_id: number;
//   service_code: string;
//   service_name: string;
//   tariff_id: number;
//   order_status: string;
//   ordered_at: string;
//   patient_id: number;
//   mrn: string;
//   first_name: string;
//   last_name: string;
//   gender: string;
//   phone: string;
//   encounter_id: number;
//   encounter_number: string;
//   encounter_status: string;
//   admission_id: number | null;
//   admission_number: string | null;
//   admission_status: string | null;
//   admission_date: string | null;
//   ward_name: string;
//   room_number: string;
//   bed_number: string;
//   doctor_id: number;
//   doctor_first_name: string;
//   doctor_last_name: string;
//   ot_case_id: number;
//   ot_case_number: string | null;
//   surgery_name: string;
//   surgery_type: "ELECTIVE" | "EMERGENCY";
//   anesthesia_type: string | null;
//   ot_status: string;
//   request_status: string;
//   priority: string;
//   financial_status: string;
//   is_billed: number;
//   estimated_duration_min: number | null;
//   preferred_surgery_date: string;
//   preferred_surgery_time: string;
//   scheduled_date: string | null;
//   scheduled_time: string | null;
//   start_time: string | null;
//   end_time: string | null;
//   request_notes: string;
//   assigned_ot_room: string | null;
//   preferred_ot_room: string;
//   surgeon_id: number | null;
//   surgeon_first_name: string | null;
//   surgeon_last_name: string | null;
//   requested_by_first_name: string;
//   requested_by_last_name: string;
//   request_time: string;
//   payer_name?: string;
//   consent_status?: string;
//   status_label?: string;
//   status_color?: string;
// }

// export interface OTSurgery {
//   id: number;
//   order_id: number;
//   ot_case_number: string;
//   encounter_id: number;
//   admission_id: number;
//   ot_room_id: number;
//   surgery_name: string;
//   surgery_type: "ELECTIVE" | "EMERGENCY";
//   scheduled_date: string;
//   scheduled_time: string;
//   start_time: string | null;
//   end_time: string | null;
//   status:
//     | "REQUESTED"
//     | "SCHEDULED"
//     | "CHECKED_IN"
//     | "IN_PROGRESS"
//     | "COMPLETED"
//     | "DOCUMENTED"
//     | "CANCELLED";
//   is_billed: number;
//   financial_status: string;
//   encounter_number: string;
//   admission_number: string;
//   mrn: string;
//   first_name: string;
//   last_name: string;
//   room_name: string;
//   creator_first_name: string;
//   creator_last_name: string;
//   consent_status: string;
//   status_label: string;
//   status_color: string;
//   age?: string;
//   gender?: string;
// }


// // ─── ADD THESE INTERFACES AT THE TOP OR BOTTOM OF THE FILE ──────────────────

// export interface AnaesthesiaGridObservation {
//   observation_time: string;
//   bp_systolic?: number;
//   bp_diastolic?: number;
//   map?: number;
//   heart_rate?: number;
//   spo2?: number;
//   etco2?: number;
//   temperature?: number;
//   resp_rate?: number;
//   airway_pressure?: number;
//   mac_value?: number;
//   fio2?: number;
//   cvp?: number;
//   urine_output_ml?: number;
//   blood_loss_ml?: number;
//   additional_metrics?: any;
// }

// export interface AnaesthesiaRecord {
//   id: number;
//   ot_case_id: number;
//   status: string;
//   observations_grid: AnaesthesiaGridObservation[];
//   // ... other fields are mapped but we only need the grid for this component
// }


// export const otService = {
//   // Rooms
//   getRooms: async () => {
//     const response = await apiClient.get("/ot/room/list");
//     return response.data?.data || [];
//   },

//   createRoom: async (data: { room_name: string }) => {
//     const response = await apiClient.post("/ot/room/create", data);
//     return response.data;
//   },

//   // Requests
//   getRequests: async () => {
//     const response = await apiClient.get("/ot/request/list");
//     return response.data?.data || [];
//   },

//   // Scheduling & Management
//   getSurgeries: async () => {
//     const response = await apiClient.get("/ot/list");
//     return response.data?.data || [];
//   },

//   scheduleSurgery: async (data: {
//     ot_case_id: number;
//     ot_room_id: number;
//     scheduled_date: string;
//     scheduled_time: string;
//   }) => {
//     const response = await apiClient.post("/ot/schedule", data);
//     return response.data;
//   },

//   signSurgeryConsent: async (data: {
//     order_id: number;
//     signature: string;
//     witness_user_id: number;
//   }) => {
//     const response = await apiClient.post("/clinical/consent", data);
//     return response.data;
//   },

//   updateSurgery: async (data: {
//     id: number;
//     surgery_name?: string;
//     surgery_type?: "ELECTIVE" | "EMERGENCY";
//     scheduled_date?: string;
//     scheduled_time?: string;
//     status?: string;
//   }) => {
//     const response = await apiClient.put("/ot/update", data);
//     return response.data;
//   },

//   cancelSurgery: async (ot_case_id: number) => {
//     const response = await apiClient.put("/ot/cancel", { ot_case_id });
//     return response.data;
//   },

//   billingClearance: async (ot_case_id: number) => {
//     const response = await apiClient.put("/ot/billing-clearance", {
//       ot_case_id,
//     });
//     return response.data;
//   },

//   startSurgery: async (ot_case_id: number) => {
//     const response = await apiClient.put("/ot/start", { ot_case_id });
//     return response.data;
//   },

//   completeSurgery: async (ot_case_id: number) => {
//     const response = await apiClient.put("/ot/complete", { ot_case_id });
//     return response.data;
//   },

//   // Operative Note Endpoints
//   getOperativeNote: async (ot_case_id: number) => {
//     const response = await apiClient.get(`/ot/operative-note/view`, {
//       params: { ot_case_id },
//     });
//     return response.data?.data;
//   },

//   createOperativeNote: async (data: any) => {
//     const response = await apiClient.post("/ot/operative-note", data);
//     return response.data;
//   },

//   updateOperativeNote: async (data: any) => {
//     const response = await apiClient.put("/ot/operative-note/update", data);
//     return response.data;
//   },

//   getCaseBoard: async (ot_case_id: number): Promise<OTCaseBoard> => {
//     const response = await apiClient.get("/ot/board/case", {
//       params: { ot_case_id },
//     });
//     return response.data?.data;
//   },

//   submitSwabCounts: async (payload: {
//     ot_case_id: number;
//     counts: Array<{ item: string; in: number; out: number }>;
//   }): Promise<any> => {
//     const response = await apiClient.post("/ot/board/swab/counts", payload);
//     return response.data;
//   },

//   getBoard: async () => {
//     const response = await apiClient.get("/ot/board");
//     return response.data?.data;
//   },



//   // ─── APPEND THESE METHODS INSIDE THE EXISTING `otService` OBJECT ─────────────
//   // Locate the bottom of `otService` and add these before the final closing brace };

//   // Anaesthesia & Perioperative Monitoring Endpoints
//   getAnaesthesiaRecord: async (ot_case_id: number): Promise<AnaesthesiaRecord | null> => {
//     const response = await apiClient.get("/ot/anaesthesia/record/get", {
//       params: { ot_case_id },
//     });
//     return response.data?.data;
//   },

//   syncCompleteRecord: async (payload: any) => {
//     // Points directly to the POST endpoint you specified
//     const response = await apiClient.post("/ot/anaesthesia/record/save", payload);
//     return response.data;
//   },

  
//   saveAnaesthesiaGrid: async (data: {
//     anaesthesia_record_id: number;
//     observations: any[];
//   }) => {
//     const response = await apiClient.post("/ot/anaesthesia/grid/save", data);
//     return response.data;
//   },
// };
