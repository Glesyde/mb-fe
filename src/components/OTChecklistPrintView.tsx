import React, { useEffect } from "react";
import { ChecklistData, OTChecklistPrintViewProps } from "../types/ot-checklist.types";

const OTChecklistPrintView: React.FC<OTChecklistPrintViewProps> = ({
  checklistData,
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
          <title>GHS FORM T1 - WHO SURGICAL SAFETY CHECKLIST</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: 'Arial', sans-serif; color: #000; margin: 0; padding: 0; line-height: 1.3; font-size: 11px; }
            .page { width: 210mm; height: 297mm; padding: 10px; box-sizing: border-box; position: relative; page-break-after: always; }
            .container { border: 1px solid #000; height: 100%; padding: 10px; display: flex; flex-direction: column; }
            
            .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px; }
            .title-block { width: 60%; }
            .title { color: #3B309A; font-size: 24px; font-weight: 800; margin: 0; line-height: 1.1; }
            
            .patient-box { width: 38%; border: 1px solid #000; padding: 8px; font-size: 10px; }
            .patient-box p { margin: 3px 0; }
            
            .details-grid { display: grid; grid-template-columns: 2fr 1fr; border: 1px solid #000; margin-bottom: 10px; }
            .grid-label { background: #E5E7EB; border: 1px solid #000; padding: 5px 8px; font-weight: bold; font-size: 12px; }
            .grid-value { border: 1px solid #000; padding: 5px 8px; min-height: 30px; font-weight: bold; }
            
            .section { border: 1px solid #000; margin-bottom: 10px; }
            .section-header { border-bottom: 1px solid #000; padding: 5px 8px; font-weight: 800; font-size: 16px; display: flex; align-items: center; }
            .section-header span { font-size: 9px; font-weight: normal; margin-left: 8px; }
            
            .check-item { display: flex; align-items: start; padding: 5px 10px; border-bottom: 1px solid #eee; }
            .check-item:last-child { border-bottom: none; }
            .item-number { font-weight: bold; width: 20px; }
            .checkbox { width: 14px; height: 14px; border: 1px solid #000; margin-right: 10px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 10px; flex-shrink: 0; margin-top: 2px; }
            .check-text { flex: 1; }
            
            .or-divider { text-align: center; font-weight: 900; font-size: 14px; margin: 5px 0; }
            
            .sign-area { padding: 5px 10px; font-size: 11px; }
            .sign-row { margin-bottom: 4px; }
            .sign-label { font-weight: bold; display: inline-block; width: 100px; }
            
            .footer { font-size: 8px; color: #666; text-align: left; position: absolute; bottom: 15px; left: 20px; }
            
            /* Page 2 Specifics */
            .p2-header { background: #3B309A; color: #fff; padding: 8px; font-size: 18px; font-weight: 800; text-align: center; margin-bottom: 10px; }
            .p2-columns { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0; border: 1px solid #000; flex: 1; min-height: 0; }
            .p2-col { border-right: 1px solid #000; padding: 0; display: flex; flex-direction: column; }
            .p2-col:last-child { border-right: none; }
            .col-header { padding: 5px; font-weight: bold; border-bottom: 1px solid #000; text-align: center; font-size: 10px; height: 30px; display: flex; align-items: center; justify-content: center; }
            .col-subhead { padding: 5px; font-weight: bold; text-align: left; font-size: 11px; }
            .check-group { padding: 5px 10px; border-bottom: 1px solid #eee; }
            .check-group-title { font-weight: bold; margin-bottom: 3px; font-size: 10.5px; }
            
            .p2-footer-section { display: grid; grid-template-columns: 1.5fr 1fr; border: 1px solid #000; margin-top: 10px; min-height: 120px; }
            .patient-details-footer { border-right: 1px solid #000; padding: 8px; }
            .signatures-footer { padding: 8px; }
            
            @media print {
              .no-print { display: none; }
              body { -webkit-print-color-adjust: exact; }
              .page { margin: 0; border: none; }
            }
          </style>
        </head>
        <body>
          <!-- PAGE 1 -->
          <div class="page">
            <div class="container">
              <div class="header">
                <div class="title-block">
                  <h1 class="title">Surgical Safety<br/>Checklist (WARD)</h1>
                </div>
                <div class="patient-box">
                  <p><strong>Patient's Details</strong> <i>(Insert addressograph here)</i></p>
                  <p>Last Name: ${checklistData.patient_name?.split(" ").pop() || "........"}</p>
                  <p>First Name: ${checklistData.patient_name?.split(" ").shift() || "........"}</p>
                  <p>Date of Birth: ${checklistData.date_of_birth || "__/__/____"}</p>
                  <p>Hospital Number: ${checklistData.mrn || "........."}</p>
                </div>
              </div>

              <div class="details-grid">
                <div class="grid-label">Operation Details<br/>& Intended<br/>Surgical Site</div>
                <div class="grid-label">Operation<br/>Date</div>
                <div class="grid-value">${checklistData.procedure_name || ""}</div>
                <div class="grid-value">${checklistData.operation_date || "__/__/____"}</div>
              </div>

              <!-- WARD CHECK 1 -->
              <div class="section">
                <div class="section-header">
                  WARD CHECK 1 <span>(BY OPERATING SURGEON OR NOMINATED DEPUTY)</span>
                </div>
                <div class="check-item">
                  <div class="item-number">1.</div>
                  <div class="checkbox">${checklistData.wc1_identity_confirmed ? "✓" : ""}</div>
                  <div class="check-text"><strong>Check</strong> the patient's identity, procedure, resuscitation status and relevant paperwork</div>
                </div>
                <div class="check-item">
                  <div class="item-number">2.</div>
                  <div class="checkbox">${checklistData.wc1_documents_checked ? "✓" : ""}</div>
                  <div class="check-text"><strong>Check</strong> reliable documentation and/or images to ascertain the intended surgical site/side. Confirm this with the patient</div>
                </div>
                <div class="check-item">
                  <div class="item-number">3.</div>
                  <div class="checkbox">${checklistData.wc1_site_marked ? "✓" : ""}</div>
                  <div class="check-text"><strong>Mark</strong> the intended site with an arrow using an indelible pen</div>
                </div>
                <div class="or-divider">OR</div>
                <div class="check-item" style="border-top: 1px solid #000">
                  <div class="item-number"></div>
                  <div class="checkbox">${checklistData.wc1_not_applicable ? "✓" : ""}</div>
                  <div class="check-text">Not Applicable (Obstetrics/Gynaecology/Oral Surgery ONLY)</div>
                </div>
                
                <div class="sign-area" style="border-top: 1px solid #000">
                  <div class="sign-row"><span class="sign-label">Signed by:</span> ${checklistData.wc1_signed_at ? "✅ Electronically Signed" : "__________________________"}</div>
                  <div class="sign-row"><span class="sign-label">Printed Name:</span> ${checklistData.wc1_signed_name || "__________________________"}</div>
                  <div class="sign-row"><span class="sign-label">Designation:</span> ${checklistData.wc1_designation || "__________________________"}</div>
                </div>
              </div>

              <!-- WARD CHECK 2 -->
              <div class="section">
                <div class="section-header">
                  WARD CHECK 2 <span>(BY WARD NURSE): <b>PRIOR</b> to leaving the ward area</span>
                </div>
                <div class="check-item">
                  <div class="item-number">1.</div>
                  <div class="checkbox">${checklistData.wc2_patient_details_correct ? "✓" : ""}</div>
                  <div class="check-text"><strong>Patient's details</strong> are correct</div>
                </div>
                <div class="check-item">
                  <div class="item-number">2.</div>
                  <div class="checkbox">${checklistData.wc2_site_checked ? "✓" : ""}</div>
                  <div class="check-text"><strong>Check</strong> the intended surgical site/side mark is inspected and confirmed with the patient and relevant documentation to be correct</div>
                </div>
                <div class="or-divider">OR</div>
                <div class="check-item" style="border-top: 1px solid #000">
                  <div class="item-number"></div>
                  <div class="checkbox">${checklistData.wc2_not_applicable ? "✓" : ""}</div>
                  <div class="check-text">Not Applicable (Obstetrics/Gynaecology/Oral Surgery ONLY)</div>
                </div>
                
                <div class="sign-area" style="border-top: 1px solid #000">
                  <div class="sign-row"><span class="sign-label">Signed by:</span> ${checklistData.wc2_signed_at ? "✅ Electronically Signed" : "__________________________"}</div>
                  <div class="sign-row"><span class="sign-label">Printed Name:</span> ${checklistData.wc2_signed_name || "__________________________"}</div>
                  <div class="sign-row"><span class="sign-label">Designation:</span> ${checklistData.wc2_designation || "__________________________"}</div>
                </div>
              </div>

              <div class="footer">
                GSH FORM T1: WHO SURGICAL SAFETY CHECKLIST &nbsp;&nbsp; Page 1 of 2
              </div>
            </div>
          </div>

          <!-- PAGE 2 -->
          <div class="page">
            <div class="container" style="padding: 0;">
              <div class="p2-header">WHO Surgical Safety Check List</div>
              <div class="p2-columns">
                <!-- SIGN IN -->
                <div class="p2-col" style="background: #E8F5E9">
                  <div class="col-header" style="background: #E0E0E0">SIGN IN (To be read out loud)</div>
                  <div class="col-subhead" style="background: #C8E6C9">Before Induction of Anaesthesia</div>
                  
                  <div class="check-group">
                    <div class="check-group-title">Has the patient confirmed their identity, site, procedure and consent</div>
                    <div style="display: flex; align-items: center;"><div class="checkbox">${checklistData.si_identity_confirmed ? "✓" : ""}</div> Yes</div>
                  </div>
                  
                  <div class="check-group">
                    <div class="check-group-title">Is the surgical site marked/not applicable</div>
                    <div style="display: flex; align-items: center;"><div class="checkbox">${checklistData.si_site_marked ? "✓" : ""}</div> Yes/Not applicable</div>
                  </div>

                  <div class="check-group">
                    <div class="check-group-title">Is the anaesthesia and medication check complete</div>
                    <div style="display: flex; align-items: center;"><div class="checkbox">${checklistData.si_anaesthesia_check ? "✓" : ""}</div> Yes</div>
                  </div>

                  <div class="check-group">
                    <div class="check-group-title">Is there a difficult airway or aspiration risk</div>
                    <div style="display: flex; align-items: center;"><div class="checkbox">${checklistData.si_airway_risk === "NO" ? "✓" : ""}</div> No</div>
                    <div style="display: flex; align-items: center; margin-top:2px;"><div class="checkbox">${checklistData.si_airway_risk === "YES" ? "✓" : ""}</div> Yes, and equipment/assistance available</div>
                  </div>

                  <div class="check-group">
                    <div class="check-group-title">Does the patient have any known allergy</div>
                    <div style="display: flex; align-items: center;"><div class="checkbox">${!checklistData.si_has_allergy ? "✓" : ""}</div> No</div>
                    <div style="display: flex; align-items: center; margin-top:2px;"><div class="checkbox">${checklistData.si_has_allergy ? "✓" : ""}</div> Yes (list out: ${checklistData.si_allergies_json || ""})</div>
                  </div>

                  <div class="check-group">
                    <div class="check-group-title">Is there any metal work/implant/pacemaker and if yes, which site?</div>
                    <div style="display: flex; align-items: center;"><div class="checkbox">${!checklistData.si_has_implant ? "✓" : ""}</div> No</div>
                    <div style="display: flex; align-items: center; margin-top:2px;"><div class="checkbox">${checklistData.si_has_implant ? "✓" : ""}</div> Yes (list out: ${checklistData.si_implant_details || ""})</div>
                  </div>

                  <div class="check-group">
                    <div class="check-group-title">Is there a risk of >500mls blood loss (7mls/kg in a child)</div>
                    <div style="display: flex; align-items: center;"><div class="checkbox">${!checklistData.si_blood_loss_risk ? "✓" : ""}</div> No</div>
                    <div style="display: flex; align-items: center; margin-top:2px;"><div class="checkbox">${checklistData.si_blood_loss_risk ? "✓" : ""}</div> Yes and adequate IV access/fluids/blood and blood products</div>
                  </div>
                </div>

                <!-- TIME OUT -->
                <div class="p2-col" style="background: #FFF3E0">
                  <div class="col-header" style="background: #E0E0E0">TIME OUT (To be read out loud)</div>
                  <div class="col-subhead" style="background: #FFE0B2">Before start of surgical intervention e.g. skin incision</div>
                  
                  <div class="check-group">
                    <div class="check-group-title">Have all team members introduced themselves by name and role?</div>
                    <div style="display: flex; align-items: center;"><div class="checkbox">${checklistData.time_out_done ? "✓" : ""}</div> Yes</div>
                  </div>

                  <div class="check-group">
                    <div class="check-group-title">Surgeon, Anaesthetist and Registered theatre practitioner confirm:</div>
                    <div style="display: flex; align-items: center;"><div class="checkbox">${checklistData.to_patient_confirmed ? "✓" : ""}</div> What is the patient's name</div>
                    <div style="display: flex; align-items: center; margin-top:2px;"><div class="checkbox">${checklistData.to_procedure_confirmed ? "✓" : ""}</div> What procedure, site and position are planned</div>
                  </div>

                  <div class="check-group">
                    <div class="check-group-title">Anticipated Critical Events</div>
                    <div style="margin-bottom: 5px;"><strong>Surgeon:</strong></div>
                    <div style="display: flex; align-items: center; margin-left: 5px;"><div class="checkbox">✓</div> How much blood loss is anticipated?</div>
                    <div style="display: flex; align-items: center; margin-left: 5px;"><div class="checkbox">✓</div> Any special equipment requirements?</div>
                    
                    <div style="margin: 5px 0;"><strong>Anaesthetist:</strong></div>
                    <div style="display: flex; align-items: center; margin-left: 5px;"><div class="checkbox">✓</div> Any patient specific concerns?</div>
                    
                    <div style="margin: 5px 0;"><strong>Scrub Nurse/ODP:</strong></div>
                    <div style="display: flex; align-items: center; margin-left: 5px;"><div class="checkbox">✓</div> Sterility confirmed?</div>
                  </div>

                  <div class="check-group">
                    <div class="check-group-title">Surgical Site Infection Bundle</div>
                    <div style="display: flex; align-items: center;"><div class="checkbox">${checklistData.to_antibiotic_given ? "✓" : ""}</div> Antibiotic prophylaxis in last 60m</div>
                    <div style="display: flex; align-items: center;"><div class="checkbox">${checklistData.to_warming_done ? "✓" : ""}</div> Patient warming</div>
                    <div style="display: flex; align-items: center;"><div class="checkbox">${checklistData.to_hair_removed ? "✓" : ""}</div> Hair removal</div>
                  </div>
                </div>

                <!-- SIGN OUT -->
                <div class="p2-col" style="background: #FFEBEE">
                  <div class="col-header" style="background: #E0E0E0">SIGN OUT (To be read out loud)</div>
                  <div class="col-subhead" style="background: #FFCDD2">Before any member of the team leaves the operating room</div>
                  
                  <div class="check-group">
                    <div class="check-group-title">Registered practitioner verbally confirms with the team:</div>
                    <div style="display: flex; align-items: center;"><div class="checkbox">${checklistData.so_procedure_recorded ? "✓" : ""}</div> Has the name of the procedure been recorded?</div>
                    <div style="display: flex; align-items: center; margin-top:2px;"><div class="checkbox">${checklistData.so_counts_complete ? "✓" : ""}</div> Has it been confirmed that instruments, swabs and sharps counts are complete?</div>
                    <div style="display: flex; align-items: center; margin-top:2px;"><div class="checkbox">${checklistData.so_specimen_labelled ? "✓" : ""}</div> Have the specimen(s) forms and containers been labelled?</div>
                  </div>

                  <div class="check-group">
                    <div class="check-group-title">Surgeon, Anaesthetist and Registered practitioner</div>
                    <div style="display: flex; align-items: center; margin-top:2px;"><div class="checkbox">✓</div> What are the key concerns for recovery and management of this patient?</div>
                  </div>

                  <div class="check-group">
                    <div class="check-group-title">Is essential imaging displayed?</div>
                    <div style="display: flex; align-items: center; margin-top:2px;"><div class="checkbox">${checklistData.so_imaging_displayed ? "✓" : ""}</div> Yes/not applicable</div>
                  </div>
                </div>
              </div>

              <div class="p2-footer-section">
                <div class="patient-details-footer">
                   <p><strong>Patient's Details</strong> <i>(Insert addressograph here)</i></p>
                   <p>Last Name: ${checklistData.patient_name?.split(" ").pop() || ""}</p>
                   <p>First Name: ${checklistData.patient_name?.split(" ").shift() || ""}</p>
                   <p>Date of Birth: ${checklistData.date_of_birth || ""}</p>
                   <p>Hospital Number: ${checklistData.mrn || ""}</p>
                   <p>Procedure: ${checklistData.procedure_name || ""}</p>
                </div>
                <div class="signatures-footer text-xs font-bold">
                  <p>Signed by:</p>
                  <p style="margin-top: 10px;">Surgeon: ________________________</p>
                  <p style="margin-top: 10px;">Anaesthetist: _____________________</p>
                  <p style="margin-top: 10px;">Scrub Nurse: _____________________</p>
                </div>
              </div>

              <div class="footer">
                GSH FORM T1: WHO SURGICAL SAFETY CHECKLIST &nbsp;&nbsp; Page 2 of 2
              </div>
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

export default OTChecklistPrintView;
