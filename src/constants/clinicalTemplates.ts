export interface TemplateCategory {
    categoryName: string;
    items: string[];
}

export interface ClinicalTemplate {
    id: string;
    title: string;
    description: string;
    iconName?: string;
    subjective: TemplateCategory[];
    objective: TemplateCategory[];
    assessmentQuickPicks: string[];
    planQuickPicks: string[];
}

export const CLINICAL_TEMPLATES: ClinicalTemplate[] = [
    {
        id: "malaria",
        title: "Malaria Screening Protocol",
        description: "Standard acute febrile illness and malaria evaluation",
        subjective: [
            {
                categoryName: "Constitutional & Fevers",
                items: [
                    "High-grade intermittent fever",
                    "Chills and rigors",
                    "Excessive night sweats",
                    "Generalized body weakness / fatigue",
                    "Severe throbbing headache",
                    "Generalized arthralgia & myalgia"
                ]
            },
            {
                categoryName: "Gastrointestinal & Danger Signs",
                items: [
                    "Nausea and vomiting",
                    "Loss of appetite (anorexia)",
                    "Abdominal discomfort / cramps",
                    "Inability to tolerate oral feeds/meds",
                    "Dark/tea-colored urine",
                    "Dizziness or lightheadedness"
                ]
            }
        ],
        objective: [
            {
                categoryName: "General Exam",
                items: [
                    "Conscious and alert",
                    "Febrile to touch",
                    "Pallor (conjunctival/palmar)",
                    "Icterus / Jaundice (scleral)",
                    "Dehydrated / Dry mucous membranes",
                    "Signs of respiratory distress"
                ]
            },
            {
                categoryName: "Abdominal Exam",
                items: [
                    "Soft, non-tender abdomen",
                    "Epigastric tenderness",
                    "Splenomegaly noted",
                    "Hepatomegaly noted",
                    "Normal active bowel sounds"
                ]
            }
        ],
        assessmentQuickPicks: [
            "B54 - Uncomplicated Malaria (Plasmodium falciparum)",
            "B50.0 - Severe / Complicated Malaria",
            "D64.9 - Secondary Anemia secondary to Malaria",
            "R50.9 - Acute Febrile Illness under evaluation"
        ],
        planQuickPicks: [
            "STAT Malaria Rapid Diagnostic Test (mRDT) & Thick/Thin Blood Smear",
            "Full Blood Count (FBC) + Differential",
            "Electrolytes, Urea, Creatinine (E/U/Cr)",
            "Rx: Artemether-Lumefantrine (Coartem) 80/480mg PO BD x 3 days with fatty meal",
            "Rx: Paracetamol 1g PO TDS x 3 days PRN for fever",
            "Encourage aggressive oral hydration (ORS) and bed rest",
            "Advise return if vomiting, convulsion, dark urine, or persistent fever > 48hrs"
        ]
    },
    {
        id: "covid_uri",
        title: "URI & COVID-19 / Viral Respiratory",
        description: "Upper respiratory tract infection, flu-like illness & COVID workup",
        subjective: [
            {
                categoryName: "Upper Airway & ENT",
                items: [
                    "Sore / scratchy throat",
                    "Rhinorrhea (nasal discharge)",
                    "Nasal congestion / sneezing",
                    "Sudden loss of smell (anosmia)",
                    "Loss of taste (ageusia)",
                    "Ear fullness / pain"
                ]
            },
            {
                categoryName: "Lower Respiratory & Systemic",
                items: [
                    "Dry non-productive cough",
                    "Productive cough with sputum",
                    "Shortness of breath on exertion",
                    "Pleuritic chest pain",
                    "Low-grade fever",
                    "Known exposure to COVID-19 / sick contacts"
                ]
            }
        ],
        objective: [
            {
                categoryName: "ENT & Throat",
                items: [
                    "Erythematous posterior pharynx",
                    "Tonsillar enlargement / exudate",
                    "Posterior pharyngeal cobblestoning",
                    "Clear rhinorrhea present",
                    "Cervical lymphadenopathy"
                ]
            },
            {
                categoryName: "Chest Auscultation",
                items: [
                    "Lungs clear to auscultation bilaterally",
                    "Vesicular breath sounds intact",
                    "End-inspiratory fine crackles",
                    "Expiratory wheezing noted",
                    "Absence of accessory muscle use",
                    "SpO2 room air > 95%"
                ]
            }
        ],
        assessmentQuickPicks: [
            "J06.9 - Acute Upper Respiratory Infection (URI)",
            "U07.1 - COVID-19, Virus Identified",
            "J02.9 - Acute Pharyngitis",
            "J20.9 - Acute Bronchitis"
        ],
        planQuickPicks: [
            "COVID-19 Rapid Antigen Test",
            "Throat Swab / Culture",
            "Posterior-Anterior (PA) Chest Radiograph (CXR)",
            "Warm saline gargles TDS and steam inhalation",
            "Rx: Tab Vitamin C 1000mg + Zinc 20mg Daily x 10 days",
            "Rx: Antihistamine (Cetirizine 10mg PO Nocté x 5 days)",
            "Self-isolate at home pending test results; monitor SpO2 with pulse oximeter"
        ]
    },
    {
        id: "dyspepsia_gerd",
        title: "Dyspepsia & GERD / Heartburn",
        description: "Acid reflux, gastritis, epigastric pain, and peptic symptoms",
        subjective: [
            {
                categoryName: "Symptom Characteristics",
                items: [
                    "Burning epigastric pain",
                    "Retrosternal chest burning (heartburn)",
                    "Acid brash / sour regurgitation",
                    "Pain relieved by meals/antacids",
                    "Pain aggravated by spicy/greasy food",
                    "Early satiety and bloating"
                ]
            },
            {
                categoryName: "Risk Factors & Red Flags",
                items: [
                    "Frequent NSAID / Aspirin consumption",
                    "Difficulty swallowing (dysphagia)",
                    "Painful swallowing (odynophagia)",
                    "Vomiting coffee-ground material",
                    "Black tarry stools (melena)",
                    "Unintentional weight loss"
                ]
            }
        ],
        objective: [
            {
                categoryName: "Abdominal Examination",
                items: [
                    "Epigastric tenderness on deep palpation",
                    "No rebound tenderness or guarding",
                    "Murphy's sign negative",
                    "No organomegaly / palpable masses",
                    "Normoactive bowel sounds",
                    "Nil scleral icterus"
                ]
            }
        ],
        assessmentQuickPicks: [
            "K21.9 - Gastro-esophageal reflux disease without esophagitis (GERD)",
            "K30 - Functional Dyspepsia",
            "K29.7 - Gastritis, unspecified",
            "K27.9 - Peptic Ulcer Disease (PUD)"
        ],
        planQuickPicks: [
            "Helicobacter pylori Stool Antigen Test (HpSA)",
            "Full Blood Count (Rule out occult blood loss anemia)",
            "Schedule Esophagogastroduodenoscopy (EGD) if red-flag symptoms develop",
            "Rx: Tab Esomeprazole 40mg PO Daily 30 mins before breakfast x 4 weeks",
            "Rx: Suspension Magnesium Trisilicate / Alginate 10mL TDS post-prandial & PRN",
            "Lifestyle: Avoid eating within 3 hours of sleeping; elevate head of bed 6 inches; eliminate caffeine & NSAIDs"
        ]
    }
];