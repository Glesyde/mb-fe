import React, { useEffect } from "react";
import ConsentPrintTemplate from "./ConsentPrintTemplate";
import { Consent } from "../services/consent.service";
import { BASE_URL } from "../api/client";

interface ConsentPrintViewProps {
  isOpen: boolean;
  onClose: () => void;
  consent: Consent | null;
}

const ConsentPrintView: React.FC<ConsentPrintViewProps> = ({
  isOpen,
  onClose,
  consent,
}) => {
  const getSignatureUrl = (filePath?: string | null) => {
    if (!filePath) return "";
    if (filePath.startsWith("data:")) return filePath;

    const normalizedBaseUrl = BASE_URL.replace(/\/$/, "");

    try {
      const parsedUrl = new URL(filePath);
      if (
        parsedUrl.hostname === "localhost" ||
        parsedUrl.hostname === "127.0.0.1"
      ) {
        return `${normalizedBaseUrl}${parsedUrl.pathname}${parsedUrl.search}`;
      }
      return parsedUrl.toString();
    } catch {
      const normalizedPath = filePath.startsWith("/")
        ? filePath
        : `/${filePath}`;
      return `${normalizedBaseUrl}${normalizedPath}`;
    }
  };

  useEffect(() => {
    if (isOpen && consent) {
      // Get the HTML content to print
      const printWindow = window.open(
        "",
        "consent_print",
        "width=900,height=1000",
      );
      if (printWindow) {
        const consentDeclaration = `I, ${consent.first_name} ${consent.last_name} (MRN: ${consent.mrn}), hereby acknowledge that I have been fully informed about the ${consent.consent_form_name} procedure. I understand the potential risks, benefits, and alternatives. I have had the opportunity to ask questions and have received satisfactory answers. I hereby give my informed consent to proceed with the above-mentioned procedure.`;

        const htmlContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${consent.consent_form_name} - Consent Document</title>
              <script src="https://cdn.tailwindcss.com"></script>
              <style>
                @media print {
                  body { margin: 0; padding: 0; }
                  .no-print { display: none; }
                }
                body { margin: 0; padding: 0; background: #f3f4f6; }
              </style>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <div style="background: white; width: 100%; min-height: 100vh; padding: 2rem;">
                <div style="max-width: 210mm; margin: 0 auto; background: white; min-height: 297mm;">
                  <!-- Header -->
                  <div style="text-align: center; margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 2px solid #cbd5e1;">
                    <h1 style="font-size: 1.875rem; font-weight: 900; color: #0f172a; margin: 0; letter-spacing: 0.05em; text-transform: uppercase;">
                      ${consent.consent_form_name}
                    </h1>
                    <p style="font-size: 0.75rem; font-weight: 700; color: #475569; margin: 0.5rem 0 0 0; letter-spacing: 0.05em; text-transform: uppercase;">
                      CONSENT DOCUMENT - PATIENT: ${consent.first_name} ${consent.last_name}
                    </p>
                  </div>

                  <!-- Patient Information -->
                  <div style="margin-bottom: 2rem; padding: 1.5rem; background: #eff6ff; border-radius: 0.5rem; border: 1px solid #bfdbfe;">
                    <h3 style="font-size: 0.75rem; font-weight: 700; color: #1e3a8a; margin: 0 0 1rem 0; letter-spacing: 0.05em; text-transform: uppercase;">
                      PATIENT INFORMATION
                    </h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                      <div>
                        <p style="font-size: 0.625rem; font-weight: 700; color: #64748b; margin: 0 0 0.5rem 0; letter-spacing: 0.05em; text-transform: uppercase;">Patient Name</p>
                        <p style="font-size: 0.875rem; font-weight: 700; color: #1e293b; margin: 0;">${consent.first_name} ${consent.last_name}</p>
                      </div>
                      <div>
                        <p style="font-size: 0.625rem; font-weight: 700; color: #64748b; margin: 0 0 0.5rem 0; letter-spacing: 0.05em; text-transform: uppercase;">Medical Record Number</p>
                        <p style="font-size: 0.875rem; font-weight: 700; color: #1e293b; margin: 0;">${consent.mrn}</p>
                      </div>
                      <div>
                        <p style="font-size: 0.625rem; font-weight: 700; color: #64748b; margin: 0 0 0.5rem 0; letter-spacing: 0.05em; text-transform: uppercase;">Encounter Number</p>
                        <p style="font-size: 0.875rem; font-weight: 700; color: #1e293b; margin: 0;">${consent.encounter_number}</p>
                      </div>
                      <div>
                        <p style="font-size: 0.625rem; font-weight: 700; color: #64748b; margin: 0 0 0.5rem 0; letter-spacing: 0.05em; text-transform: uppercase;">Service/Procedure</p>
                        <p style="font-size: 0.875rem; font-weight: 700; color: #1e293b; margin: 0;">${consent.service_name || "N/A"}</p>
                      </div>
                    </div>
                  </div>

                  <!-- Consent Declaration -->
                  <div style="margin-bottom: 2rem; padding: 1.5rem; background: #f8fafc; border-radius: 0.5rem; border: 1px solid #e2e8f0;">
                    <h3 style="font-size: 0.75rem; font-weight: 700; color: #0f172a; margin: 0 0 1rem 0; letter-spacing: 0.05em; text-transform: uppercase;">Consent Declaration</h3>
                    <p style="font-size: 0.875rem; line-height: 1.625; color: #1e293b; text-align: justify; margin: 0;">
                      ${consentDeclaration}
                    </p>
                  </div>

                  <!-- Signatures -->
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
                    <!-- Patient Signature -->
                    <div>
                      <p style="font-size: 0.875rem; font-weight: 700; color: #334155; margin: 0 0 1rem 0;">Patient/Guardian Signature</p>
                      <div style="border: 1px solid #cbd5e1; border-radius: 0.25rem; background: #f8fafc; padding: 1rem; height: 8rem; display: flex; align-items: center; justify-content: center;">
                        ${consent.file_path ? `<img src="${getSignatureUrl(consent.file_path)}" alt="Signature" style="max-height: 7rem; max-width: 100%; object-fit: contain;">` : '<p style="font-size: 0.75rem; color: #cbd5e1; margin: 0;">[Signature Image]</p>'}
                      </div>
                      <p style="font-size: 0.625rem; color: #64748b; margin: 0.5rem 0 0 0; font-weight: 500; text-align: center;">I hereby consent to the procedure</p>
                    </div>

                    <!-- Witness -->
                    <div>
                      <p style="font-size: 0.875rem; font-weight: 700; color: #334155; margin: 0 0 1rem 0;">Witness Information</p>
                      <div style="border: 1px solid #cbd5e1; border-radius: 0.25rem; background: #f8fafc; padding: 1.5rem; height: 8rem; display: flex; flex-direction: column; justify-content: center;">
                        <div style="margin-bottom: 1rem;">
                          <p style="font-size: 0.625rem; font-weight: 700; color: #64748b; margin: 0 0 0.25rem 0; letter-spacing: 0.05em; text-transform: uppercase;">Witness Name</p>
                          <p style="font-size: 0.875rem; font-weight: 700; color: #1e293b; margin: 0;">${consent.witness_name || "Hospital Staff"}</p>
                        </div>
                        <div>
                          <p style="font-size: 0.625rem; font-weight: 700; color: #64748b; margin: 0 0 0.25rem 0; letter-spacing: 0.05em; text-transform: uppercase;">Staff ID</p>
                          <p style="font-size: 0.875rem; font-weight: 700; color: #1e293b; margin: 0;">${consent.witness_user_id || "N/A"}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Date and Status -->
                  <div style="padding: 1.5rem; border-radius: 0.5rem; border-left: 4px solid ${consent.color_code}; background: ${consent.color_code}15;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1.5rem;">
                      <div>
                        <p style="font-size: 0.625rem; font-weight: 700; color: #64748b; margin: 0 0 0.5rem 0; letter-spacing: 0.05em; text-transform: uppercase;">Date Signed</p>
                        <p style="font-size: 0.875rem; font-weight: 700; color: #1e293b; margin: 0;">
                          ${new Date(consent.signed_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                        </p>
                      </div>
                      <div>
                        <p style="font-size: 0.625rem; font-weight: 700; color: #64748b; margin: 0 0 0.5rem 0; letter-spacing: 0.05em; text-transform: uppercase;">Status</p>
                        <p style="font-size: 0.875rem; font-weight: 700; color: ${consent.color_code}; margin: 0;">
                          ${consent.status_label}
                        </p>
                      </div>
                      <div>
                        <p style="font-size: 0.625rem; font-weight: 700; color: #64748b; margin: 0 0 0.5rem 0; letter-spacing: 0.05em; text-transform: uppercase;">Document ID</p>
                        <p style="font-size: 0.875rem; font-weight: 700; font-family: monospace; color: #1e293b; margin: 0;">#${consent.id}</p>
                      </div>
                    </div>
                  </div>

                  <!-- Footer -->
                  <div style="margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid #e2e8f0; text-align: center; font-size: 0.56rem; color: #64748b; line-height: 1.5;">
                    <p style="margin: 0;">This is an official medical consent document.</p>
                    <p style="margin: 0.25rem 0 0 0;">
                      Printed on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  </div>
                </div>
              </div>

              <script>
                window.addEventListener("load", () => {
                  setTimeout(() => {
                    window.print();
                  }, 250);
                });
              </script>
            </body>
          </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();

        // Close the modal after opening print window
        setTimeout(() => {
          onClose();
        }, 500);
      }
    }
  }, [isOpen, consent, onClose]);

  return null;
};

export default ConsentPrintView;
