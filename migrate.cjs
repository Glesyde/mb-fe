const fs = require('fs');
const path = require('path');

const files = [
  'HMOLayout.tsx', 'LabLayout.tsx', 'BloodBankLayout.tsx', 'EMRLayout.tsx', 
  'AppointmentLayout.tsx', 'EmergencyLayout.tsx', 'UserManagementLayout.tsx', 
  'TheatreLayout.tsx', 'nursing/NursingLayout.tsx', 'InventoryLayout.tsx', 
  'SettingsLayout.tsx', 'BillingLayout.tsx', 'ManagementLayout.tsx', 
  'RadiologyLayout.tsx', 'WardLayout.tsx', 'PharmacyLayout.tsx', 
  'assets/AssetsLayout.tsx', 'AllReportsLayout.tsx', 'ReportingLayout.tsx'
];

files.forEach(file => {
  const p = path.join(__dirname, 'src/components', file);
  if (!fs.existsSync(p)) return;
  
  let content = fs.readFileSync(p, 'utf-8');

  // Skip if already done
  if (content.includes('createPortal')) return;

  // Add import
  if (content.includes('import React')) {
    content = content.replace(/(import React.*?from\s+["']react["'];)/, `$1\nimport { createPortal } from "react-dom";`);
  } else {
    content = `import { createPortal } from "react-dom";\n` + content;
  }

  // Add portalRoot declaration
  content = content.replace(/(const \w+(?:Layout|Module): React\.FC(?:\<[^>]+\>)?\s*=\s*\([^)]*\)\s*=>\s*\{)/, `$1\n  const portalRoot = document.getElementById("module-tabs-portal");`);

  // Wrap the navigation div
  // The navigation div is typically right before {/* Content Area */} or <div className="min-h-[60vh]"> or <Outlet />
  // We can match it broadly: it starts with <div className="...w-fit..." and ends before <div className="min-h-[60vh]">
  
  const targetPattern = /(<div className="[^"]*?(?:gap-1|gap-2)[^"]*w-fit[^"]*">[\s\S]*?<\/div>)\s*(?:{\/\*\s*(?:Module )?Content Area\s*\*\/}\s*)?(<div className="min-h-\[60vh\]">)/;
  
  const match = content.match(targetPattern);
  if (match) {
    const divAndContent = match[1];
    const afterDiv = match[2];
    
    const newDivAndContent = `{portalRoot && createPortal(\n        ${divAndContent},\n        portalRoot\n      )}\n\n      `;
    
    content = content.replace(targetPattern, newDivAndContent + afterDiv);
    fs.writeFileSync(p, content, 'utf-8');
    console.log('Updated: ' + file);
  } else {
    console.log('Could not find target pattern in: ' + file);
  }
});
