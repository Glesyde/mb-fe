const fs = require('fs');
const path = require('path');

const files = [
  'HMOLayout.tsx', 'LabLayout.tsx', 'BloodBankLayout.tsx', 'EMRLayout.tsx', 
  'AppointmentLayout.tsx', 'EmergencyLayout.tsx', 'UserManagementLayout.tsx', 
  'TheatreLayout.tsx', 'nursing/NursingLayout.tsx', 'InventoryLayout.tsx', 
  'SettingsLayout.tsx', 'BillingLayout.tsx', 'ManagementLayout.tsx', 
  'RadiologyLayout.tsx', 'WardLayout.tsx', 'PharmacyLayout.tsx', 
  'assets/AssetsLayout.tsx', 'AllReportsLayout.tsx', 'ReportingLayout.tsx',
  'PatientLayout.tsx'
];

files.forEach(file => {
  const p = path.join(__dirname, 'src/components', file);
  if (!fs.existsSync(p)) return;
  
  let content = fs.readFileSync(p, 'utf-8');

  // Skip if already has useEffect for portalRoot
  if (content.includes('setPortalRoot(')) return;

  // Add useState and useEffect to imports if missing
  if (!content.includes('useState')) {
    content = content.replace(/import React(?:[^;]*)?;/, `import React, { useState, useEffect } from "react";`);
  }

  // Replace const portalRoot = ... with state and effect
  const oldDecl = `const portalRoot = document.getElementById("module-tabs-portal");`;
  const newDecl = `const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);\n  useEffect(() => {\n    setPortalRoot(document.getElementById("module-tabs-portal"));\n  }, []);`;
  
  if (content.includes(oldDecl)) {
    content = content.replace(oldDecl, newDecl);
    fs.writeFileSync(p, content, 'utf-8');
    console.log('Fixed state in: ' + file);
  }
});
