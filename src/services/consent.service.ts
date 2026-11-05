import apiClient from "../api/client";

export interface ConsentEntity {
  id: number;
  slug: string;
  display_name: string;
}

export interface ConsentStatus {
  id: number;
  slug: string;
  display_name: string;
  color_code: string;
}

export interface ConsentMetadata {
  entities: ConsentEntity[];
  statuses: ConsentStatus[];
}

export interface ConsentTemplate {
  id: number;
  slug: string;
  display_name: string;
  category: string;
  form_schema: {
    metadata: {
      policy: string;
      compliance: string;
      multi_stage: boolean;
      document_type: string;
    };
    sections: any[];
  };
  version: number;
  is_active: number;
}

export interface Consent {
  id: number;
  encounter_id: number;
  entity_type_id: number;
  entity_id: number;
  reference_table?: string | null;
  reference_id?: number | null;
  context?: string | null;
  consent_form_name: string;
  status_id: number;
  signed_at: string;
  signed_by_patient: number;
  witness_user_id: number;
  file_path: string;
  created_at: string;
  entity_type_slug: string;
  entity_type_label: string;
  status_slug: string;
  status_label: string;
  color_code: string;
  encounter_number: string;
  mrn: string;
  first_name: string;
  last_name: string;
  order_type?: string | null;
  service_name?: string | null;
  witness_name: string | null;
  form_data?: any; // Added this just in case you ever need to access parsed draft data directly
}

export const consentService = {
  // Get metadata (entities and statuses)
  getStates: async () => {
    const response = await apiClient.get("/clinical/consent/states");
    return response.data?.data as ConsentMetadata;
  },

  // List all consents (Updated to accept filters)
  getAllConsents: async (params?: { 
    mrn?: string; 
    encounter_number?: string; 
    entity_type?: string; 
    entity_id?: number; 
    status?: string 
  }) => {
    const response = await apiClient.get("/clinical/all/consents", { params });
    return response.data?.data as Consent[];
  },

  // View a specific consent
  getConsent: async (consentId: number) => {
    const response = await apiClient.get(
      `/clinical/consent/view?consent_id=${consentId}`,
    );
    return response.data?.data as Consent;
  },

  // Create a new consent (Updated to support drafts)
  createConsent: async (data: {
    encounter_number?: string;
    entity_type?: string;
    entity_id?: number;
    consent_form_name?: string;
    witness_user_id: number;
    signature?: string; // base64
    order_id?: number;
    template_slug?: string;
    workflow_stage?: string;
    form_data?: any;
    // ---> NEW DRAFT FIELDS <---
    is_draft?: boolean;
    consent_id?: number | null;
  }) => {
    const response = await apiClient.post("/clinical/consent", data);
    return response.data;
  },

  getTemplate: async (slug: string) => {
    const response = await apiClient.get(`/clinical/consent/template?slug=${encodeURIComponent(slug)}`);
    return response.data?.data as ConsentTemplate;
  },

  // Update a consent
  updateConsent: async (data: {
    id: number;
    form_name?: string;
    status?: string;
    form_data?: any;
    workflow_stage?: string;
  }) => {
    const response = await apiClient.put("/clinical/consent/update", data);
    return response.data;
  },

  // Delete a consent
  deleteConsent: async (id: number) => {
    const response = await apiClient.delete(
      `/clinical/consent/delete?id=${id}`,
    );
    return response.data;
  },
};

// import apiClient from "../api/client";

// export interface ConsentEntity {
//   id: number;
//   slug: string;
//   display_name: string;
// }

// export interface ConsentStatus {
//   id: number;
//   slug: string;
//   display_name: string;
//   color_code: string;
// }

// export interface ConsentMetadata {
//   entities: ConsentEntity[];
//   statuses: ConsentStatus[];
// }

// export interface ConsentTemplate {
//   id: number;
//   slug: string;
//   display_name: string;
//   category: string;
//   form_schema: {
//     metadata: {
//       policy: string;
//       compliance: string;
//       multi_stage: boolean;
//       document_type: string;
//     };
//     sections: any[];
//   };
//   version: number;
//   is_active: number;
// }

// export interface Consent {
//   id: number;
//   encounter_id: number;
//   entity_type_id: number;
//   entity_id: number;
//   reference_table?: string | null;
//   reference_id?: number | null;
//   context?: string | null;
//   consent_form_name: string;
//   status_id: number;
//   signed_at: string;
//   signed_by_patient: number;
//   witness_user_id: number;
//   file_path: string;
//   created_at: string;
//   entity_type_slug: string;
//   entity_type_label: string;
//   status_slug: string;
//   status_label: string;
//   color_code: string;
//   encounter_number: string;
//   mrn: string;
//   first_name: string;
//   last_name: string;
//   order_type?: string | null;
//   service_name?: string | null;
//   witness_name: string | null;
// }

// export const consentService = {
//   // Get metadata (entities and statuses)
//   getStates: async () => {
//     const response = await apiClient.get("/clinical/consent/states");
//     return response.data?.data as ConsentMetadata;
//   },


//   // List all consents (Updated to accept filters)
//   getAllConsents: async (params?: { 
//     mrn?: string; 
//     encounter_number?: string; 
//     entity_type?: string; 
//     entity_id?: number; 
//     status?: string 
//   }) => {
//     const response = await apiClient.get("/clinical/all/consents", { params });
//     return response.data?.data as Consent[];
//   },

//   // List all consents
//   // getAllConsents: async () => {
//   //   const response = await apiClient.get("/clinical/all/consents");
//   //   return response.data?.data as Consent[];
//   // },

//   // View a specific consent
//   getConsent: async (consentId: number) => {
//     const response = await apiClient.get(
//       `/clinical/consent/view?consent_id=${consentId}`,
//     );
//     return response.data?.data as Consent;
//   },

//   // Create a new consent
//   createConsent: async (data: {
//     encounter_number?: string;
//     entity_type?: string;
//     entity_id?: number;
//     consent_form_name?: string;
//     witness_user_id: number;
//     signature?: string; // base64
//     order_id?: number;
//     template_slug?: string;
//     workflow_stage?: string;
//     form_data?: any;
//   }) => {
//     const response = await apiClient.post("/clinical/consent", data);
//     return response.data;
//   },

//   getTemplate: async (slug: string) => {
//     const response = await apiClient.get(`/clinical/consent/template?slug=${encodeURIComponent(slug)}`);
//     return response.data?.data as ConsentTemplate;
//   },

//   // Update a consent
//   updateConsent: async (data: {
//     id: number;
//     form_name: string;
//     status: string;
//   }) => {
//     const response = await apiClient.put("/clinical/consent/update", data);
//     return response.data;
//   },

//   // Delete a consent
//   deleteConsent: async (id: number) => {
//     const response = await apiClient.delete(
//       `/clinical/consent/delete?id=${id}`,
//     );
//     return response.data;
//   },
// };
