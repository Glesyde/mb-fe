POST nursing/infusion/start				
{				
"encounter_number": "OPE-APT-20260509-C93A",				
"prescription_id": 9,				
"rate_ml_hr": 50,				
"infusion_type": "CONTINUOUS",				
"access_site": "Peripheral IV - Left Arm",				
"volume_ml": 500,				
"shift_id": 15,				
"remarks": "Infusion started via pump, patient tolerated well"				
}				

POST nursing/infusion/titrate			
{			
"infusion_session_id": 1,			
"rate_ml_hr": 185,			
"shift_id": 15,			
"remarks": "Increasing rate per clinical protocol"			
}			

POST nursing/infusion/resume				
{				
"infusion_session_id": 1,				
"rate_ml_hr": 75,				
"shift_id": 15,				
"remarks": "Line repositioned, resuming infusion"				
}				

POST nursing/infusion/stop				
{				
"infusion_session_id": 1,				
"shift_id": 15,				
"stop_reason": "Infusion complete - IV discontinued, site intact, no redness"				
}				
				
POST /nursing/io/log		

A. Oral Fluids			
			
{			
"encounter_number": "ENC-2026-0001",			
"type": "INTAKE",			
"category": "Oral Fluids",			
"volume": 250,			
"recorded_at": "2026-05-24 14:00:00",			
"remarks": "Tea"			
}			

B. Vomit / Emesis			
			
{			
"encounter_number": "ENC-2026-0001",			
"type": "OUTPUT",			
"category": "Vomit",			
"volume_ml": 180,			
"remarks": "Post medication vomiting"			
}			

C. Stool / Diarrhoea			
			
{			
"encounter_number": "ENC-20260521-6AC6",			
"type": "OUTPUT",			
"category": "Stool/Diarrhoea",			
"volume_ml": 180,			
"remarks": "Post medication Stool/Diarrhoea"			
}			

D. Drain 1			
			
{			
"encounter_number": "ENC-2026-0001",			
"type": "OUTPUT",			
"category": "Drain 1",			
"volume": 120,			
"remarks": "JP drain"			
}			

E. Drain 2			
			
{			
"encounter_number": "ENC-2026-0001",			
"type": "OUTPUT",			
"category": "Drain 2",			
"volume": 95,			
}			

F. NG Aspirate			
{			
"encounter_number": "ENC-2026-0001",			
"type": "OUTPUT",			
"category": "NG Aspirate",			
"volume": 450,			
}			

G. Blood Loss			
{			
"encounter_number": "ENC-2026-0001",			
"type": "OUTPUT",			
"category": "Blood Loss",			
"volume": 250,			
"remarks": "Post-op dressing soak"			
}			

H. Dialysis Fluid Removed			
{			
"encounter_number": "ENC-20260521-6AC6",			
"type": "OUTPUT",			
"category": "Dialysis Output",			
"volume_ml": 180,			
"remarks": "Post medication Drain 1"			
}			

I. TPN Manual Entry			
{			
"encounter_number": "ENC-2026-0001",			
"type": "INTAKE",			
"category": "TPN",			
"volume": 1000,			
"remarks": "TPN overnight"			
}		
GET /nursing/io/report?encounter_number=ENC-20260521-6AC6
{
    "status": "success",
    "message": "IO report",
    "data": {
        "patient": {
            "patient_id": 30,
            "mrn": "100025",
            "full_name": "Kandi hgdjh",
            "gender": "Male",
            "age": 0,
            "phone": "789388937"
        },
        "encounter": {
            "encounter_id": 48,
            "encounter_number": "ENC-20260521-6AC6",
            "type": "OPD",
            "status": "OPEN",
            "started_at": "2026-05-21 21:16:34"
        },
        "clinical": {
            "consultant": null,
            "specialization": null,
            "ward_id": null,
            "ward": null
        },
        "chart_window": {
            "start": "2026-05-25 07:00:00",
            "end": "2026-05-26 07:00:00"
        },
        "chart_entries": [],
        "category_summary": [],
        "hourly_breakdown": [],
        "totals": {
            "total_intake_ml": "0",
            "total_output_ml": "0",
            "balance_ml": 0
        },
        "urine": {
            "volume_ml": 0,
            "weight_kg": 0,
            "hours_elapsed": 4,
            "rate_ml_kg_hr": null,
            "target_ml_kg_hr": 0.5,
            "target_met": false,
            "hours_since_last": 4
        },
        "fluid_restriction": {
            "active": false,
            "limit_ml": 0,
            "consumed_ml": 0,
            "remaining_ml": null,
            "percent_used": null
        },
        "alerts": [
            {
                "code": "NO_URINE_RECORDED",
                "severity": "WARNING",
                "message": "No urine recorded for 4 hr(s)"
            }
        ]
    }
}

GET nursing/infusion/active?encounter_number=ENC-20260521-6AC6
{
    "status": "success",
    "message": "Active infusions",
    "data": [
        {
            "session_id": 9,
            "prescription_id": 28,
            "drug_id": 32,
            "drug_name": "Normal Saline 0.9% 1L",
            "dosage": "1L",
            "infusion_type": "CONTINUOUS",
            "current_rate_ml_hr": "500.00",
            "access_site": "Peripheral IV - Left Arm",
            "batch_number": "DRUG-32",
            "started_at": "2026-05-25 03:57:16",
            "started_by_first": "Super",
            "started_by_last": "Admin"
        }
    ]
}
GET nursing/infusion/timeline?session_id=1				
{
    "status": "success",
    "message": "Infusion timeline",
    "data": [
        {
            "event_type": "STOPPED",
            "previous_rate_ml_hr": null,
            "new_rate_ml_hr": null,
            "volume_ml": null,
            "remarks": "Infusion complete - IV discontinued, site intact, no redness",
            "recorded_at": "2026-05-15 21:43:03"
        },
        {
            "event_type": "RESUMED",
            "previous_rate_ml_hr": null,
            "new_rate_ml_hr": "75.00",
            "volume_ml": null,
            "remarks": "Line repositioned, resuming infusion",
            "recorded_at": "2026-05-15 21:41:20"
        },
        {
            "event_type": "PAUSED",
            "previous_rate_ml_hr": null,
            "new_rate_ml_hr": null,
            "volume_ml": null,
            "remarks": "Patient complaint of arm pain, line assessed",
            "recorded_at": "2026-05-15 21:40:12"
        },
        {
            "event_type": "TITRATED",
            "previous_rate_ml_hr": "75.00",
            "new_rate_ml_hr": "185.00",
            "volume_ml": null,
            "remarks": "Increasing rate per clinical protocol",
            "recorded_at": "2026-05-15 21:33:50"
        },
        {
            "event_type": "TITRATED",
            "previous_rate_ml_hr": "50.00",
            "new_rate_ml_hr": "75.00",
            "volume_ml": null,
            "remarks": "Increasing rate per clinical protocol",
            "recorded_at": "2026-05-15 21:24:05"
        },
        {
            "event_type": "STARTED",
            "previous_rate_ml_hr": null,
            "new_rate_ml_hr": "50.00",
            "volume_ml": "500.00",
            "remarks": "Infusion started via pump, patient tolerated well",
            "recorded_at": "2026-05-15 15:21:16"
        }
    ]
}
							
GET nursing/infusion/chart?encounter_number=OPE-APT-20260509-C93A	
{
    "status": "success",
    "message": "Infusion chart",
    "data": {
        "patient": {
            "patient_id": 25,
            "mrn": "100021",
            "full_name": "Ijeom Michael",
            "first_name": "Ijeom",
            "last_name": "Michael",
            "date_of_birth": "1994-02-09",
            "age": 32,
            "gender": "Female",
            "phone": "0813056236378",
            "blood_group": "",
            "genotype": "",
            "chronic_conditions": "",
            "special_alerts": "",
            "allergies": []
        },
        "encounter": {
            "encounter_id": 30,
            "encounter_number": "OPE-APT-20260509-C93A",
            "encounter_type": "OPD",
            "encounter_status": "OPEN",
            "started_at": "2026-05-09 14:52:26"
        },
        "clinical": {
            "consultant": "Julius Test",
            "specialization": "Anaesthesiology",
            "ward": null,
            "ward_id": null
        },
        "infusion_sessions": [],
        "fluid_balance": {
            "date": "2026-05-25",
            "total_intake_ml": 0,
            "total_output_ml": 0,
            "balance_ml": 0,
            "target_intake_ml": null,
            "io_summary": [],
            "hourly_breakdown": []
        }
    }
}						