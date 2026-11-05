import React from "react";

interface ConsentPrintTemplateProps {
  title: string;
  patientName: string;
  mrn: string;
  encounterNumber: string;
  serviceName?: string;
  consentDeclaration: string;
  signatureImageUrl?: string;
  patientSignatureLabel?: string;
  witnessName?: string;
  witnessUserId?: number;
  dateSigned: string;
  status: string;
  statusColor: string;
  consentId?: number;
}

const ConsentPrintTemplate: React.FC<ConsentPrintTemplateProps> = ({
  title,
  patientName,
  mrn,
  encounterNumber,
  serviceName,
  consentDeclaration,
  signatureImageUrl,
  patientSignatureLabel = "Patient/Guardian Signature",
  witnessName,
  witnessUserId,
  dateSigned,
  status,
  statusColor,
  consentId,
}) => {
  return (
    <div
      className="w-full min-h-screen bg-white p-8"
      style={{ fontFamily: "InterVar, Segoe UI, sans-serif" }}
    >
      {/* Document Container - A4 sized */}
      <div
        className="max-w-[210mm] mx-auto bg-white"
        style={{ minHeight: "297mm" }}
      >
        {/* Header Section */}
        <div className="text-center mb-8 pb-6 border-b-2 border-slate-300">
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-wider mb-2">
            {title}
          </h1>
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
            CONSENT DOCUMENT - PATIENT: {patientName.toUpperCase()}
          </p>
        </div>

        {/* Patient Information Section */}
        <div className="mb-8 p-6 bg-brand-active rounded-lg border border-brand-active">
          <h3 className="text-xs font-bold text-brand-primary uppercase mb-4 tracking-wide">
            Patient Information
          </h3>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wide">
                Patient Name
              </p>
              <p className="text-sm font-bold text-slate-800">{patientName}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wide">
                Medical Record Number
              </p>
              <p className="text-sm font-bold text-slate-800">{mrn}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wide">
                Encounter Number
              </p>
              <p className="text-sm font-bold text-slate-800">
                {encounterNumber}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wide">
                Service/Procedure
              </p>
              <p className="text-sm font-bold text-slate-800">
                {serviceName || "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Consent Declaration */}
        <div className="mb-8 p-6 bg-slate-50 rounded-lg border border-slate-200">
          <h3 className="text-xs font-bold text-slate-900 uppercase mb-4 tracking-wide">
            Consent Declaration
          </h3>
          <p className="text-sm leading-relaxed text-slate-800 text-justify">
            {consentDeclaration}
          </p>
        </div>

        {/* Signatures Section */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Patient Signature */}
          <div>
            <p className="text-sm font-bold text-slate-700 mb-4">
              {patientSignatureLabel}
            </p>
            <div className="border border-slate-300 rounded bg-slate-50 p-4 h-32 flex items-center justify-center">
              {signatureImageUrl ? (
                <img
                  src={signatureImageUrl}
                  alt="Patient Signature"
                  className="max-h-28 max-w-full object-contain"
                />
              ) : (
                <p className="text-xs text-slate-400">[Signature Image]</p>
              )}
            </div>
            <p className="text-[10px] text-slate-600 mt-2 font-medium text-center">
              I hereby consent to the procedure
            </p>
          </div>

          {/* Witness Information */}
          <div>
            <p className="text-sm font-bold text-slate-700 mb-4">
              Witness Information
            </p>
            <div className="border border-slate-300 rounded bg-slate-50 p-6 space-y-4 h-32 flex flex-col justify-center">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Witness Name
                </p>
                <p className="text-sm font-bold text-slate-800">
                  {witnessName || "Hospital Staff"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Staff ID / Witness ID
                </p>
                <p className="text-sm font-bold text-slate-800">
                  {witnessUserId || "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Date and Status Footer */}
        <div
          className="mt-8 p-6 rounded-lg"
          style={{
            backgroundColor: `${statusColor}15`,
            borderLeft: `4px solid ${statusColor}`,
          }}
        >
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">
                Date Signed
              </p>
              <p className="text-sm font-bold text-slate-800">
                {new Date(dateSigned).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">
                Status
              </p>
              <p className="text-sm font-bold" style={{ color: statusColor }}>
                {status}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">
                Document ID
              </p>
              <p className="text-sm font-mono text-slate-800">#{consentId}</p>
            </div>
          </div>
        </div>

        {/* Document Footer */}
        <div className="mt-12 pt-6 border-t border-slate-200 text-center text-[9px] text-slate-500 space-y-1">
          <p>This is an official medical consent document.</p>
          <p>
            Printed on{" "}
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConsentPrintTemplate;
