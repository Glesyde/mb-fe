/**
 * Nursing Vitals Validation Schema
 * Based on obj_patient_vitals database table constraints
 */

export interface NursingVitalsPayload {
  encounter_number: string;
  temperature?: number | null;
  temperature_site?: "ORAL" | "AXILLARY" | "TYMPANIC" | null;
  pulse?: number | null;
  pulse_rhythm?: "REGULAR" | "IRREGULAR" | null;
  respiration?: number | null;
  systolic_bp?: number | null;
  diastolic_bp?: number | null;
  spo2?: number | null;
  spo2_scale?: "SCALE_1" | "SCALE_2" | null;
  weight?: number | null;
  height?: number | null;
  blood_glucose?: number | null;
  glucose_type?: "FASTING" | "RANDOM" | "POST_PRANDIAL" | null;
  urine_output?: number | null;
  urine_output_unit?: "ML_HOUR" | "ML_SHIFT" | null;
  monitoring_frequency?: "CONTINUOUS" | "HOURLY" | "4_HOURLY" | "8_HOURLY" | "DAILY" | null;
  oxygen_supplement?: number | null;
  fio2?: number | null;
  oxygen_device?: string | null;
  oxygen_flow_rate?: number | null;
  consciousness?: "A" | "C" | "V" | "P" | "U" | null;
}

export interface NursingVitalsUpdatePayload extends NursingVitalsPayload {
  id: number;
}

/**
 * Consciousness Level Scale (ACVPU)
 * A = Alert
 * C = Confused
 * V = Verbal (responds to voice)
 * P = Pain (responds to pain)
 * U = Unresponsive
 */
export const CONSCIOUSNESS_LEVELS = ["A", "C", "V", "P", "U"] as const;

export const TEMPERATURE_SITES = ["ORAL", "AXILLARY", "TYMPANIC"] as const;
export const PULSE_RHYTHMS = ["REGULAR", "IRREGULAR"] as const;
export const SPO2_SCALES = ["SCALE_1", "SCALE_2"] as const;
export const GLUCOSE_TYPES = ["FASTING", "RANDOM", "POST_PRANDIAL"] as const;
export const URINE_OUTPUT_UNITS = ["ML_HOUR", "ML_SHIFT"] as const;
export const MONITORING_FREQUENCIES = ["CONTINUOUS", "HOURLY", "4_HOURLY", "8_HOURLY", "DAILY"] as const;

/**
 * NEWS2 Risk Level Classification
 * Based on National Early Warning Score 2
 */
export const NEWS2_RISK_LEVELS = [
  "LOW",
  "LOW-MEDIUM",
  "MEDIUM",
  "HIGH",
] as const;

/**
 * Validation Rules for Nursing Vitals
 * Required flags are set to false for medical equipment unavailability fallbacks.
 * Numeric ranges match the database CHECK constraints.
 */
export const VITALS_VALIDATION_RULES = {
  temperature: {
    min: 30,
    max: 45,
    decimals: 1,
    unit: "°C",
    required: false,
  },
  pulse: {
    min: 20,
    max: 250,
    unit: "bpm",
    required: false,
  },
  respiration: {
    min: 5,
    max: 60,
    unit: "breaths/min",
    required: false,
  },
  systolic_bp: {
    min: 50,
    max: 250,
    unit: "mmHg",
    required: false,
  },
  diastolic_bp: {
    min: 0,
    max: 180,
    unit: "mmHg",
    required: false,
  },
  spo2: {
    min: 50,
    max: 100,
    unit: "%",
    required: false,
  },
  oxygen_supplement: {
    min: 0,
    max: 1,
    unit: "boolean",
    required: false,
    default: 0,
  },
  consciousness: {
    type: "enum",
    values: CONSCIOUSNESS_LEVELS,
    required: false,
  },
  weight: {
    min: 0,
    max: 999.99,
    decimals: 2,
    unit: "kg",
    required: false,
  },
  height: {
    min: 0,
    max: 300,
    decimals: 2,
    unit: "cm",
    required: false,
  },
  news2_score: {
    min: 0,
    max: 20,
    unit: "score",
    required: false,
  },
  news2_risk_level: {
    type: "enum",
    values: NEWS2_RISK_LEVELS,
    required: false,
  },
  escalation_required: {
    min: 0,
    max: 1,
    unit: "boolean",
    required: false,
    default: 0,
  },
} as const;

/**
 * Helper to identify whether a value has been entered
 */
const hasValue = (val: any): boolean => {
  return val !== undefined && val !== null && val !== "";
};

/**
 * Validate nursing vitals payload
 * All measurement fields are optional to allow entry when specific devices are missing.
 * Range rules are strictly enforced only when a value is present.
 */
export function validateNursingVitals(payload: Partial<NursingVitalsPayload>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 1. Encounter number remains the ONLY mandatory identifier
  if (!payload.encounter_number || typeof payload.encounter_number !== "string") {
    errors.push("Encounter number is required");
  }

  // 2. Temperature (Optional: checked only when entered)
  if (hasValue(payload.temperature)) {
    const val = Number(payload.temperature);
    if (isNaN(val)) {
      errors.push("Temperature must be a valid number");
    } else if (val < VITALS_VALIDATION_RULES.temperature.min || val > VITALS_VALIDATION_RULES.temperature.max) {
      errors.push(
        `Temperature must be between ${VITALS_VALIDATION_RULES.temperature.min} and ${VITALS_VALIDATION_RULES.temperature.max}°C`,
      );
    }
  }

  // 3. Pulse (Optional)
  if (hasValue(payload.pulse)) {
    const val = Number(payload.pulse);
    if (isNaN(val)) {
      errors.push("Pulse must be a valid number");
    } else if (val < VITALS_VALIDATION_RULES.pulse.min || val > VITALS_VALIDATION_RULES.pulse.max) {
      errors.push(
        `Pulse must be between ${VITALS_VALIDATION_RULES.pulse.min} and ${VITALS_VALIDATION_RULES.pulse.max} bpm`,
      );
    }
  }

  // 4. Respiration (Optional)
  if (hasValue(payload.respiration)) {
    const val = Number(payload.respiration);
    if (isNaN(val)) {
      errors.push("Respiration must be a valid number");
    } else if (val < VITALS_VALIDATION_RULES.respiration.min || val > VITALS_VALIDATION_RULES.respiration.max) {
      errors.push(
        `Respiration must be between ${VITALS_VALIDATION_RULES.respiration.min} and ${VITALS_VALIDATION_RULES.respiration.max} breaths/min`,
      );
    }
  }

  // 5. Systolic BP (Optional)
  if (hasValue(payload.systolic_bp)) {
    const val = Number(payload.systolic_bp);
    if (isNaN(val)) {
      errors.push("Systolic BP must be a valid number");
    } else if (val < VITALS_VALIDATION_RULES.systolic_bp.min || val > VITALS_VALIDATION_RULES.systolic_bp.max) {
      errors.push(
        `Systolic BP must be between ${VITALS_VALIDATION_RULES.systolic_bp.min} and ${VITALS_VALIDATION_RULES.systolic_bp.max} mmHg`,
      );
    }
  }

  // 6. Diastolic BP (Optional)
  if (hasValue(payload.diastolic_bp)) {
    const val = Number(payload.diastolic_bp);
    if (isNaN(val)) {
      errors.push("Diastolic BP must be a valid number");
    } else if (val < VITALS_VALIDATION_RULES.diastolic_bp.min || val > VITALS_VALIDATION_RULES.diastolic_bp.max) {
      errors.push(
        `Diastolic BP must be between ${VITALS_VALIDATION_RULES.diastolic_bp.min} and ${VITALS_VALIDATION_RULES.diastolic_bp.max} mmHg`,
      );
    }
  }

  // 7. SpO2 (Optional)
  if (hasValue(payload.spo2)) {
    const val = Number(payload.spo2);
    if (isNaN(val)) {
      errors.push("SpO2 must be a valid number");
    } else if (val < VITALS_VALIDATION_RULES.spo2.min || val > VITALS_VALIDATION_RULES.spo2.max) {
      errors.push(
        `SpO2 must be between ${VITALS_VALIDATION_RULES.spo2.min} and ${VITALS_VALIDATION_RULES.spo2.max}%`,
      );
    }
  }

  // 8. Weight (Optional)
  if (hasValue(payload.weight)) {
    const val = Number(payload.weight);
    if (isNaN(val)) {
      errors.push("Weight must be a valid number");
    } else if (val < VITALS_VALIDATION_RULES.weight.min || val > VITALS_VALIDATION_RULES.weight.max) {
      errors.push(
        `Weight must be between ${VITALS_VALIDATION_RULES.weight.min} and ${VITALS_VALIDATION_RULES.weight.max} kg`,
      );
    }
  }

  // 9. Height (Optional)
  if (hasValue(payload.height)) {
    const val = Number(payload.height);
    if (isNaN(val)) {
      errors.push("Height must be a valid number");
    } else if (val < VITALS_VALIDATION_RULES.height.min || val > VITALS_VALIDATION_RULES.height.max) {
      errors.push(
        `Height must be between ${VITALS_VALIDATION_RULES.height.min} and ${VITALS_VALIDATION_RULES.height.max} cm`,
      );
    }
  }

  // 10. Oxygen Supplement (Optional)
  if (hasValue(payload.oxygen_supplement)) {
    const val = Number(payload.oxygen_supplement);
    if (![0, 1].includes(val)) {
      errors.push("Oxygen supplement must be 0 or 1");
    }
  }

  // 11. Consciousness / ACVPU (Optional)
  if (hasValue(payload.consciousness)) {
    if (!CONSCIOUSNESS_LEVELS.includes(payload.consciousness as any)) {
      errors.push(
        `Consciousness level must be one of: ${CONSCIOUSNESS_LEVELS.join(", ")} (Alert, Confused, Verbal, Pain response, Unresponsive)`,
      );
    }
  }

  // 12. Guard against submitting a completely blank record
  const hasAtLeastOneVital = [
    payload.temperature,
    payload.pulse,
    payload.respiration,
    payload.systolic_bp,
    payload.diastolic_bp,
    payload.spo2,
    payload.weight,
    payload.height,
    payload.blood_glucose,
    payload.urine_output,
    payload.consciousness,
  ].some(hasValue);

  if (!hasAtLeastOneVital) {
    errors.push("Please enter at least one vital sign reading before saving.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}


// /**
//  * Nursing Vitals Validation Schema
//  * Based on obj_patient_vitals database table constraints
//  */

// export interface NursingVitalsPayload {
//   encounter_number: string;
//   temperature: number;
//   temperature_site?: "ORAL" | "AXILLARY" | "TYMPANIC";
//   pulse: number;
//   pulse_rhythm?: "REGULAR" | "IRREGULAR";
//   respiration: number;
//   systolic_bp: number;
//   diastolic_bp: number;
//   spo2: number;
//   spo2_scale?: "SCALE_1" | "SCALE_2";
//   weight: number;
//   height: number;
//   blood_glucose?: number;
//   glucose_type?: "FASTING" | "RANDOM" | "POST_PRANDIAL";
//   urine_output?: number;
//   urine_output_unit?: "ML_HOUR" | "ML_SHIFT";
//   monitoring_frequency?: "CONTINUOUS" | "HOURLY" | "4_HOURLY" | "8_HOURLY" | "DAILY";
//   oxygen_supplement?: number;
//   fio2?: number;
//   oxygen_device?: string;
//   oxygen_flow_rate?: number;
//   consciousness?: "A" | "C" | "V" | "P" | "U";
// }

// export interface NursingVitalsUpdatePayload extends NursingVitalsPayload {
//   id: number;
// }

// /**
//  * Consciousness Level Scale (ACVPU)
//  * A = Alert
//  * C = Confused
//  * V = Verbal (responds to voice)
//  * P = Pain (responds to pain)
//  * U = Unresponsive
//  */
// export const CONSCIOUSNESS_LEVELS = ["A", "C", "V", "P", "U"] as const;

// export const TEMPERATURE_SITES = ["ORAL", "AXILLARY", "TYMPANIC"] as const;
// export const PULSE_RHYTHMS = ["REGULAR", "IRREGULAR"] as const;
// export const SPO2_SCALES = ["SCALE_1", "SCALE_2"] as const;
// export const GLUCOSE_TYPES = ["FASTING", "RANDOM", "POST_PRANDIAL"] as const;
// export const URINE_OUTPUT_UNITS = ["ML_HOUR", "ML_SHIFT"] as const;
// export const MONITORING_FREQUENCIES = ["CONTINUOUS", "HOURLY", "4_HOURLY", "8_HOURLY", "DAILY"] as const;

// /**
//  * NEWS2 Risk Level Classification
//  * Based on National Early Warning Score 2
//  */
// export const NEWS2_RISK_LEVELS = [
//   "LOW",
//   "LOW-MEDIUM",
//   "MEDIUM",
//   "HIGH",
// ] as const;

// /**
//  * Validation Rules for Nursing Vitals
//  * These constraints match the database schema checks
//  */
// export const VITALS_VALIDATION_RULES = {
//   temperature: {
//     min: 30,
//     max: 45,
//     decimals: 1,
//     unit: "°C",
//     required: true,
//   },
//   pulse: {
//     min: 20,
//     max: 250,
//     unit: "bpm",
//     required: true,
//   },
//   respiration: {
//     min: 5,
//     max: 60,
//     unit: "breaths/min",
//     required: true,
//   },
//   systolic_bp: {
//     min: 50,
//     max: 250,
//     unit: "mmHg",
//     required: true,
//   },
//   diastolic_bp: {
//     min: 0,
//     max: 180,
//     unit: "mmHg",
//     required: true,
//   },
//   spo2: {
//     min: 50,
//     max: 100,
//     unit: "%",
//     required: true,
//   },
//   oxygen_supplement: {
//     min: 0,
//     max: 1,
//     unit: "boolean",
//     required: false,
//     default: 0,
//   },
//   consciousness: {
//     type: "enum",
//     values: CONSCIOUSNESS_LEVELS,
//     required: false,
//   },
//   weight: {
//     min: 0,
//     max: 999.99,
//     decimals: 2,
//     unit: "kg",
//     required: true,
//   },
//   height: {
//     min: 0,
//     max: 300,
//     decimals: 2,
//     unit: "m",
//     required: true,
//   },
//   news2_score: {
//     min: 0,
//     max: 20,
//     unit: "score",
//     required: false,
//   },
//   news2_risk_level: {
//     type: "enum",
//     values: NEWS2_RISK_LEVELS,
//     required: false,
//   },
//   escalation_required: {
//     min: 0,
//     max: 1,
//     unit: "boolean",
//     required: false,
//     default: 0,
//   },
// } as const;

// /**
//  * Validate nursing vitals payload
//  * @param payload - The vitals payload to validate
//  * @returns Object with isValid flag and errors array
//  */
// export function validateNursingVitals(payload: Partial<NursingVitalsPayload>): {
//   isValid: boolean;
//   errors: string[];
// } {
//   const errors: string[] = [];

//   // Check encounter_number
//   if (
//     !payload.encounter_number ||
//     typeof payload.encounter_number !== "string"
//   ) {
//     errors.push("Encounter number is required");
//   }

//   // Validate temperature
//   if (payload.temperature !== undefined) {
//     if (typeof payload.temperature !== "number") {
//       errors.push("Temperature must be a number");
//     } else if (
//       payload.temperature < VITALS_VALIDATION_RULES.temperature.min ||
//       payload.temperature > VITALS_VALIDATION_RULES.temperature.max
//     ) {
//       errors.push(
//         `Temperature must be between ${VITALS_VALIDATION_RULES.temperature.min} and ${VITALS_VALIDATION_RULES.temperature.max}°C`,
//       );
//     }
//   } else {
//     errors.push("Temperature is required");
//   }

//   // Validate pulse
//   if (payload.pulse !== undefined) {
//     if (typeof payload.pulse !== "number") {
//       errors.push("Pulse must be a number");
//     } else if (
//       payload.pulse < VITALS_VALIDATION_RULES.pulse.min ||
//       payload.pulse > VITALS_VALIDATION_RULES.pulse.max
//     ) {
//       errors.push(
//         `Pulse must be between ${VITALS_VALIDATION_RULES.pulse.min} and ${VITALS_VALIDATION_RULES.pulse.max} bpm`,
//       );
//     }
//   } else {
//     errors.push("Pulse is required");
//   }

//   // Validate respiration
//   if (payload.respiration !== undefined) {
//     if (typeof payload.respiration !== "number") {
//       errors.push("Respiration must be a number");
//     } else if (
//       payload.respiration < VITALS_VALIDATION_RULES.respiration.min ||
//       payload.respiration > VITALS_VALIDATION_RULES.respiration.max
//     ) {
//       errors.push(
//         `Respiration must be between ${VITALS_VALIDATION_RULES.respiration.min} and ${VITALS_VALIDATION_RULES.respiration.max} breaths/min`,
//       );
//     }
//   } else {
//     errors.push("Respiration is required");
//   }

//   // Validate systolic BP
//   if (payload.systolic_bp !== undefined) {
//     if (typeof payload.systolic_bp !== "number") {
//       errors.push("Systolic BP must be a number");
//     } else if (
//       payload.systolic_bp < VITALS_VALIDATION_RULES.systolic_bp.min ||
//       payload.systolic_bp > VITALS_VALIDATION_RULES.systolic_bp.max
//     ) {
//       errors.push(
//         `Systolic BP must be between ${VITALS_VALIDATION_RULES.systolic_bp.min} and ${VITALS_VALIDATION_RULES.systolic_bp.max} mmHg`,
//       );
//     }
//   } else {
//     errors.push("Systolic BP is required");
//   }

//   // Validate diastolic BP
//   if (payload.diastolic_bp !== undefined) {
//     if (typeof payload.diastolic_bp !== "number") {
//       errors.push("Diastolic BP must be a number");
//     } else if (
//       payload.diastolic_bp < VITALS_VALIDATION_RULES.diastolic_bp.min ||
//       payload.diastolic_bp > VITALS_VALIDATION_RULES.diastolic_bp.max
//     ) {
//       errors.push(
//         `Diastolic BP must be between ${VITALS_VALIDATION_RULES.diastolic_bp.min} and ${VITALS_VALIDATION_RULES.diastolic_bp.max} mmHg`,
//       );
//     }
//   } else {
//     errors.push("Diastolic BP is required");
//   }

//   // Validate SpO2
//   if (payload.spo2 !== undefined) {
//     if (typeof payload.spo2 !== "number") {
//       errors.push("SpO2 must be a number");
//     } else if (
//       payload.spo2 < VITALS_VALIDATION_RULES.spo2.min ||
//       payload.spo2 > VITALS_VALIDATION_RULES.spo2.max
//     ) {
//       errors.push(
//         `SpO2 must be between ${VITALS_VALIDATION_RULES.spo2.min} and ${VITALS_VALIDATION_RULES.spo2.max}%`,
//       );
//     }
//   } else {
//     errors.push("SpO2 is required");
//   }

//   // Validate weight
//   if (payload.weight !== undefined) {
//     if (typeof payload.weight !== "number") {
//       errors.push("Weight must be a number");
//     } else if (
//       payload.weight < VITALS_VALIDATION_RULES.weight.min ||
//       payload.weight > VITALS_VALIDATION_RULES.weight.max
//     ) {
//       errors.push(
//         `Weight must be between ${VITALS_VALIDATION_RULES.weight.min} and ${VITALS_VALIDATION_RULES.weight.max} kg`,
//       );
//     }
//   } else {
//     errors.push("Weight is required");
//   }

//   // Validate height
//   if (payload.height !== undefined) {
//     if (typeof payload.height !== "number") {
//       errors.push("Height must be a number");
//     } else if (
//       payload.height < VITALS_VALIDATION_RULES.height.min ||
//       payload.height > VITALS_VALIDATION_RULES.height.max
//     ) {
//       errors.push(
//         `Height must be between ${VITALS_VALIDATION_RULES.height.min} and ${VITALS_VALIDATION_RULES.height.max} m`,
//       );
//     }
//   } else {
//     errors.push("Height is required");
//   }

//   // Validate oxygen_supplement (optional)
//   if (payload.oxygen_supplement !== undefined) {
//     if (
//       typeof payload.oxygen_supplement !== "number" ||
//       ![0, 1].includes(payload.oxygen_supplement)
//     ) {
//       errors.push("Oxygen supplement must be 0 or 1");
//     }
//   }

//   // Validate consciousness (optional)
//   if (payload.consciousness !== undefined) {
//     if (!CONSCIOUSNESS_LEVELS.includes(payload.consciousness as any)) {
//       errors.push(
//         `Consciousness level must be one of: ${CONSCIOUSNESS_LEVELS.join(", ")} (Alert, Confused, Verbal, Pain response, Unresponsive)`,
//       );
//     }
//   }

//   return {
//     isValid: errors.length === 0,
//     errors,
//   };
// }
