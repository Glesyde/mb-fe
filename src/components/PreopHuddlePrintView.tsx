import React, { useEffect } from "react";

interface PreopHuddlePrintViewProps {
  huddleData: any;
  isOpen: boolean;
  onClose: () => void;
}

const PreopHuddlePrintView: React.FC<PreopHuddlePrintViewProps> = ({
  huddleData,
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    if (isOpen) {
      handleDirectPrint();
    }
  }, [isOpen]);

  const handleDirectPrint = () => {
    const printWindow = window.open("", "_blank", "width=850,height=1100");
    if (!printWindow) {
      alert("Please allow popups for printing");
      onClose();
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>PREOPERATIVE TEAM HUDDLE</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: 'Arial', sans-serif; color: #000; margin: 0; padding: 0; line-height: 1.3; font-size: 11px; }
            .container { max-width: 210mm; margin: 0 auto; padding: 10px; border: 1px solid #ddd; position: relative; }
            
            .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #0D9488; padding-bottom: 10px; }
            .title { color: #0D9488; font-size: 20px; font-weight: 800; margin: 0; text-transform: uppercase; }
            .subtitle { font-size: 14px; font-weight: bold; margin-top: 5px; }
            
            .patient-info { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 15px; border: 1px solid #000; padding: 8px; }
            .info-item { margin-bottom: 4px; }
            .info-label { font-weight: bold; width: 100px; display: inline-block; }
            
            .huddle-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; border: 1px solid #000; min-height: 500px; }
            .huddle-col { border-right: 1px solid #000; display: flex; flex-direction: column; }
            .huddle-col:last-child { border-right: none; }
            
            .col-header { background: #0D9488; color: #fff; padding: 8px; font-weight: bold; text-align: center; font-size: 13px; text-transform: uppercase; }
            
            .check-group { padding: 10px; border-bottom: 1px solid #eee; flex: 1; }
            .check-item { display: flex; align-items: start; margin-bottom: 8px; }
            .checkbox { width: 16px; height: 16px; border: 1px solid #000; margin-right: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0; margin-top: 1px; }
            .label-text { font-size: 10.5px; font-weight: 600; }
            
            .note-box { border: 1px solid #000; min-height: 60px; padding: 5px; margin-top: 5px; font-size: 10px; background: #f9f9f9; }
            
            .sign-section { margin-top: 20px; border-top: 2px solid #0D9488; padding-top: 10px; }
            .sign-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
            .sign-box { text-align: center; }
            .sign-line { border-bottom: 1px solid #000; height: 30px; margin-bottom: 5px; }
            
            .footer { font-size: 9px; color: #666; margin-top: 20px; display: flex; justify-content: space-between; }
            
            @media print {
              body { -webkit-print-color-adjust: exact; }
              .container { border: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="title">Preoperative Team Huddle</h1>
              <p class="subtitle">Surgical Safety Meeting Check List</p>
            </div>

            <div class="patient-info">
              <div>
                <div class="info-item"><span class="info-label">Patient Name:</span> ${huddleData.patient_name || "................................................"}</div>
                <div class="info-item"><span class="info-label">MRN:</span> ${huddleData.mrn || "................................................"}</div>
                <div class="info-item"><span class="info-label">Procedure:</span> ${huddleData.procedure_name || "................................................"}</div>
              </div>
              <div>
                <div class="info-item"><span class="info-label">Date:</span> ${huddleData.created_at ? new Date(huddleData.created_at).toLocaleDateString() : "__/__/____"}</div>
                <div class="info-item"><span class="info-label">OT Case ID:</span> ${huddleData.ot_case_id || "..............." }</div>
              </div>
            </div>

            <div class="huddle-grid">
              <!-- SURGEON -->
              <div class="huddle-col">
                <div class="col-header">Surgeon</div>
                <div class="check-group">
                  <div class="check-item">
                    <div class="checkbox">${huddleData.surgeon_identity_confirmed ? "✓" : ""}</div>
                    <div class="label-text">Identity, Site & Procedure Confirmed?</div>
                  </div>
                  <div class="check-item">
                    <div class="checkbox">${huddleData.surgeon_site_marked ? "✓" : ""}</div>
                    <div class="label-text">Site Marked?</div>
                  </div>
                  <div class="check-item">
                    <div class="checkbox">✓</div>
                    <div class="label-text">Consent Confirmed?</div>
                  </div>
                  <div style="margin-top: 15px;">
                    <div class="label-text">Specific Requirements/Notes:</div>
                    <div class="note-box">${huddleData.critical_steps || "None"}</div>
                  </div>
                </div>
              </div>

              <!-- ANAESTHETIST -->
              <div class="huddle-col">
                <div class="col-header">Anaesthetist</div>
                <div class="check-group">
                  <div class="check-item">
                    <div class="checkbox">${huddleData.airway_prepared ? "✓" : ""}</div>
                    <div class="label-text">Airway/Aspiration Risk?</div>
                  </div>
                  <div class="check-item">
                    <div class="checkbox">${huddleData.asa_grade ? "✓" : ""}</div>
                    <div class="label-text">ASA Grade Reviewed?</div>
                  </div>
                  <div class="check-item">
                    <div class="checkbox">${huddleData.has_allergy ? "✓" : ""}</div>
                    <div class="label-text">Allergies Confirmed?</div>
                  </div>
                  <div style="margin-top: 15px;">
                    <div class="label-text">Risk Score / Concerns:</div>
                    <div class="note-box">${huddleData.risk_score || "None"}</div>
                  </div>
                </div>
              </div>

              <!-- SCRUB TEAM -->
              <div class="huddle-col">
                <div class="col-header">Scrub Team</div>
                <div class="check-group">
                  <div class="check-item">
                    <div class="checkbox">${huddleData.instrument_sterility_confirmed ? "✓" : ""}</div>
                    <div class="label-text">Instrument Sterility Confirmed?</div>
                  </div>
                  <div class="check-item">
                    <div class="checkbox">${huddleData.equipment_ready_confirmed ? "✓" : ""}</div>
                    <div class="label-text">Specialist Equipment Available?</div>
                  </div>
                  <div class="check-item">
                    <div class="checkbox">✓</div>
                    <div class="label-text">Team Roles Assigned?</div>
                  </div>
                  <div style="margin-top: 15px;">
                    <div class="label-text">Equipment Concerns:</div>
                    <div class="note-box">${huddleData.equipment_issue_details || "None"}</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="sign-section">
              <div class="sign-grid">
                <div class="sign-box">
                  <div class="sign-line"></div>
                  <div class="label-text">Surgeon Signature</div>
                  <div style="font-size: 9px; margin-top: 2px;">${huddleData.surgeon_name || ""}</div>
                </div>
                <div class="sign-box">
                  <div class="sign-line"></div>
                  <div class="label-text">Anaesthetist Signature</div>
                  <div style="font-size: 9px; margin-top: 2px;">${huddleData.anaesthetist_name || ""}</div>
                </div>
                <div class="sign-box">
                  <div class="sign-line"></div>
                  <div class="label-text">Scrub Nurse Signature</div>
                  <div style="font-size: 9px; margin-top: 2px;">${huddleData.nurse_name || ""}</div>
                </div>
              </div>
            </div>

            <div class="footer">
              <div>PREOPERATIVE TEAM HUDDLE SURGICAL SAFETY MEETING CHECK LIST</div>
              <div>Generated: ${new Date().toLocaleString()}</div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    onClose();
  };

  return null;
};

export default PreopHuddlePrintView;
