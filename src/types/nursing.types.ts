export interface IPDAdmission {
  admission_id: number;
  admission_number: string;
  status: string;
  discharge_stage: string | null;
  admission_date: string;
  mrn: string;
  first_name: string;
  last_name: string;
  gender: string;
  phone: string;
  date_of_birth: string;
  known_allergies: string;
  age_years: number;
  age_months: number;
  age_days: number;
  payer_name: string;
  payer_type_name: string;
  policy_number: string | null;
  authorization_code: string | null;
  ward_name: string;
  room_number: string;
  bed_number: string;
  encounter_number: string;
  encounter_status: string;
  doctor_first_name: string;
  doctor_last_name: string;
}

export interface LabourListRecord {
  admission_id: number;
  admission_number: string;
  encounter_number: string;
  status: string;
  mrn: string;
  patient_name: string;
  gender: string;
  date_of_birth: string;
  session_id: number | null;
  labour_status: string | null;
  gestational_age_weeks: number | null;
  gravida: number | null;
  para: number | null;
  membranes_state: string | null;
  hours_in_labour: number | null;
  ward_name: string;
  bed_label: string;
  attending_doctor: string;
  total_unpaid: string;
}

export interface LabourSession {
  id: number;
  patient_id: number;
  encounter_id: number;
  admission_id: number;
  gravida: number;
  para: number;
  gestational_age_weeks: number;
  membranes_state: string;
  rupture_datetime: string | null;
  blood_group: string;
  gbs_status: string;
  hiv_status: string;
  hb_status: string;
  hbsag_status: string;
  allergies: string;
  analgesia_plan: string;
  status: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  encounter_number: string;
  encounter_type: string;
  encounter_status: string;
  patient_name: string;
  patient_mrn?: string;
  mrn?: string;
  patient_gender?: string;
  patient_date_of_birth?: string;
  admission_number: string;
  admission_status?: string;
  admission_date?: string;
  discharge_date?: string | null;
  bed_number: string;
  room_number: string;
  ward_name: string;
  attending_doctor_name?: string;
  admitting_doctor_name?: string;
  payer_name?: string;
}

export interface StartLabourSessionPayload {
  encounter_number: string;
  gravida: number;
  para: number;
  gestational_age_weeks: number;
  membranes_state: string;
  blood_group: string;
  gbs_status: string;
  hiv_status: string;
  hb_status: string;
  hbsag_status: string;
  allergies: string;
  analgesia_plan: string;
}

export interface PartogramObservation {
  id: number;
  session_id: number;
  observation_datetime: string;
  hour_of_labour: number;
  actual_clock_time: string | null;
  cervical_dilation_cm: string;
  fetal_descent_fifths: string;
  fetal_station: string | null;
  fetal_heart_rate_bpm: number;
  contractions_frequency: number;
  contractions_duration: string;
  liquor_state: string;
  meconium_grade: string | null;
  moulding_score: string;
  caput_category: string;
  arm_datetime: string | null;
  notes: string | null;
  recorded_by: number;
  recorded_by_name: string;
  created_at: string;
  recorded_by_display: string;
  observation_time: string;
  cervical_dilation_display: string;
  fetal_heart_rate_display: string;
  moulding_display: string;
  contractions_duration_label: string;
  fhr_status: string;
  labour_progress_status: string;
}

export interface AddObservationPayload {
  session_id: number;
  hour_of_labour: number;
  observation_datetime: string;
  cervical_dilation_cm: number;
  fetal_descent_fifths: number;
  fetal_heart_rate_bpm: number;
  contractions_frequency: number;
  contractions_duration: string;
  liquor_state: string;
  moulding_score: number;
  caput_category: string;
  actual_clock_time?: string;
}

export interface PartogramChartDataPoint {
  x: number;
  y: number | string;
}

export interface PartogramChartData {
  cervical_dilation: PartogramChartDataPoint[];
  fetal_heart_rate: PartogramChartDataPoint[];
  fetal_descent: PartogramChartDataPoint[];
  contractions: PartogramChartDataPoint[];
}

export interface CtgObservation {
  id: number;
  session_id: number;
  observation_datetime: string;
  fetal_heart_rate_bpm: number;
  contractions_frequency: number;
  contractions_duration: string;
  comment: string;
  recorded_by: number;
  updated_by: number | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  recorded_by_name: string;
  updated_by_name: string | null;
}

export interface AddCtgObservationPayload {
  session_id: number;
  observation_datetime: string;
  fetal_heart_rate_bpm: number;
  contractions_frequency: number;
  contractions_duration: string;
  comment: string;
}

export interface EditCtgObservationPayload {
  session_id: number;
  observation_datetime: string;
  fetal_heart_rate_bpm: number;
  contractions_frequency: number;
  contractions_duration: string;
  comment: string;
}
