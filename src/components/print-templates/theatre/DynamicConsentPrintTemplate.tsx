import React from "react";
import { BASE_URL } from "../../../api/client";

interface SchemaField {
  id?: string;
  type?: string;
  label?: string;
  content?: string;
  required?: boolean;
}

interface SchemaSection {
  id: string;
  type: "static" | "form" | "table";
  title?: string;
  content?: string;
  fields?: SchemaField[];
  columns?: string[];
  rows?: string[][];
}

interface DynamicConsentPrintTemplateProps {
  formData?: any;
  templateData?: any; // ConsentTemplate
}

const titleCase = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const DynamicConsentPrintTemplate: React.FC<DynamicConsentPrintTemplateProps> = ({ formData, templateData }) => {
  if (!formData || !templateData) return null;

  const d = formData;
  const sections: SchemaSection[] = templateData.form_schema?.sections || [];

  // FIX: Properly strip /api or /api/v1 from BASE_URL to point to the public root for uploads
  const getSigUrl = (path: string | undefined | null) => {
    if (!path) return "";
    if (path.startsWith("data:")) return path;
    const normalizedBaseUrl = BASE_URL.replace(/\/api(\/v\d+)?\/?$/, "").replace(/\/$/, "");
    return path.startsWith("/") ? `${normalizedBaseUrl}${path}` : `${normalizedBaseUrl}/${path}`;
  };

  const Checkbox = ({ checked, label }: { checked?: boolean; label?: string }) => (
    <div className="flex items-start gap-2 mb-1">
      <div className={`w-4 h-4 border-2 ${checked ? "bg-black border-black" : "border-gray-400 bg-white"} mt-0.5 flex-shrink-0 flex items-center justify-center`}>
        {checked && <span className="text-white text-xs font-bold">✓</span>}
      </div>
      {label && <span className="text-[10px] text-gray-800 leading-tight">{label}</span>}
    </div>
  );

  // FIX: Added 'break-words whitespace-pre-wrap' to ensure long text wraps naturally
  const FormField = ({ label, value, colSpan = 1 }: { label: string; value?: string; colSpan?: number }) => (
    <div className={`col-span-${colSpan} mb-2`}>
      <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mb-1">{label}</p>
      <div className="border border-gray-300 bg-gray-50 px-2 py-1 min-h-[24px] break-words whitespace-pre-wrap">
        <span className="text-[11px] text-gray-800">{value || "-"}</span>
      </div>
    </div>
  );

  const SignatureBlock = ({ title, signature }: { title: string; signature?: string }) => (
    <div className="border border-gray-300 p-3 bg-gray-50 break-inside-avoid">
      <p className="text-[9px] font-bold text-gray-700 uppercase tracking-wide mb-2 text-center">{title}</p>
      {signature ? (
        <img src={getSigUrl(signature)} alt="Signature" className="h-12 w-full object-contain" />
      ) : (
        <div className="border-b border-gray-400 h-12"></div>
      )}
    </div>
  );

  const renderField = (field: SchemaField) => {
    if (!field.id || !field.type) {
      if (field.content) {
        return <p key={field.content} className="text-[10px] text-gray-700 italic col-span-2">{field.content}</p>;
      }
      return null;
    }
    if (field.type === "signature") {
      return <SignatureBlock key={field.id} title={field.label || ""} signature={d[field.id]} />;
    }
    if (field.type === "checkbox") {
      return <Checkbox key={field.id} checked={!!d[field.id]} label={field.label} />;
    }
    return <FormField key={field.id} label={field.label || ""} value={d[field.id]} colSpan={field.type === "textarea" ? 2 : 1} />;
  };

  const renderSection = (section: SchemaSection) => {
    if (section.type === "table") {
      return (
        <div key={section.id} className="mb-4 break-inside-avoid">
          {section.title && (
            <div className="bg-slate-700 text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">{section.title}</div>
          )}
          <table className="w-full border border-slate-400 text-[9px] table-fixed">
            <thead className="bg-slate-100">
              <tr>
                {(section.columns || []).map((c) => (
                  <th key={c} className="border border-slate-300 px-2 py-1 text-left font-bold uppercase">{titleCase(c)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(section.rows || []).map((row, idx) => (
                <tr key={idx}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="border border-slate-300 px-2 py-1 align-top break-words whitespace-pre-wrap">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (section.type === "static") {
      return (
        <div key={section.id} className="mb-4">
          {section.title && (
            <div className="bg-slate-700 text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">{section.title}</div>
          )}
          <div className="border border-slate-400 p-3 break-words whitespace-pre-wrap">
            <p className="text-[10px] text-gray-800 leading-relaxed">{section.content}</p>
          </div>
        </div>
      );
    }

    // form
    return (
      <div key={section.id} className="mb-4">
        {section.title && (
          <div className="bg-slate-700 text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">{section.title}</div>
        )}
        <div className="border border-slate-400 p-3 grid grid-cols-2 gap-3">
          {section.content && <p className="text-[9px] text-gray-600 italic col-span-2 break-words whitespace-pre-wrap">{section.content}</p>}
          {(section.fields || []).map(renderField)}
        </div>
      </div>
    );
  };

  return (
    <div className="w-[210mm] bg-white p-8 text-[11px]">
      {/* Header Block */}
      <div className="w-full bg-[#1e40af] flex items-center p-4 min-h-[28mm] mb-1">
        <div className="w-[25%] flex items-center justify-center border-r-[1.5px] border-[#3b5bcc] pr-4 h-full">
          <img src="/assets/login-bg.jpeg" alt="Logo" className="w-[20mm] object-contain" />
        </div>
        <div className="w-[75%] pl-6 flex flex-col justify-center">
          <h1 className="text-white text-2xl font-extrabold leading-none tracking-tight mb-2 uppercase italic">
            Procedure Consent Form
          </h1>
          <p className="text-[#93c5fd] text-[10px] leading-tight font-bold uppercase">{templateData.display_name}</p>
          <p className="text-[#93c5fd]/70 text-[8px] mt-1">Policy Ref: {templateData.form_schema?.metadata?.policy || "GSH-T6"} Version {templateData.version}</p>
        </div>
      </div>

      <div className="w-full text-center py-2 border-b border-slate-200 mb-4">
        <p className="text-[8px] text-slate-500 font-medium italic">Head Office: Medbookie Limited Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos, Nigeria &nbsp;•&nbsp; +234 705 648 2776 &nbsp;•&nbsp; info@Medbookiehospital.com</p>
      </div>

      {sections.map(renderSection)}

      <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between items-center text-[8px] text-slate-400 font-bold uppercase tracking-widest">
        <span>Medbookie - Clinical Documentation</span>
        <span>{templateData.slug} v{templateData.version}</span>
      </div>
    </div>
  );
};

export default DynamicConsentPrintTemplate;


// import React from "react";
// import { BASE_URL } from "../../../api/client";

// interface SchemaField {
//   id?: string;
//   type?: string;
//   label?: string;
//   content?: string;
//   required?: boolean;
// }

// interface SchemaSection {
//   id: string;
//   type: "static" | "form" | "table";
//   title?: string;
//   content?: string;
//   fields?: SchemaField[];
//   columns?: string[];
//   rows?: string[][];
// }

// interface DynamicConsentPrintTemplateProps {
//   formData?: any;
//   templateData?: any; // ConsentTemplate
// }

// const titleCase = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// const DynamicConsentPrintTemplate: React.FC<DynamicConsentPrintTemplateProps> = ({ formData, templateData }) => {
//   if (!formData || !templateData) return null;

//   const d = formData;
//   const sections: SchemaSection[] = templateData.form_schema?.sections || [];

//   const getSigUrl = (path: string | undefined | null) => {
//     if (!path) return "";
//     if (path.startsWith("data:")) return path;
//     const normalizedBaseUrl = BASE_URL.replace(/\/$/, "");
//     return path.startsWith("/") ? `${normalizedBaseUrl}${path}` : `${normalizedBaseUrl}/${path}`;
//   };

//   const Checkbox = ({ checked, label }: { checked?: boolean; label?: string }) => (
//     <div className="flex items-start gap-2 mb-1">
//       <div className={`w-4 h-4 border-2 ${checked ? "bg-black border-black" : "border-gray-400 bg-white"} mt-0.5 flex-shrink-0 flex items-center justify-center`}>
//         {checked && <span className="text-white text-xs font-bold">✓</span>}
//       </div>
//       {label && <span className="text-[10px] text-gray-800 leading-tight">{label}</span>}
//     </div>
//   );

//   const FormField = ({ label, value, colSpan = 1 }: { label: string; value?: string; colSpan?: number }) => (
//     <div className={`col-span-${colSpan} mb-2`}>
//       <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mb-1">{label}</p>
//       <div className="border border-gray-300 bg-gray-50 px-2 py-1 min-h-[24px]">
//         <span className="text-[11px] text-gray-800">{value || "-"}</span>
//       </div>
//     </div>
//   );

//   const SignatureBlock = ({ title, signature }: { title: string; signature?: string }) => (
//     <div className="border border-gray-300 p-3 bg-gray-50">
//       <p className="text-[9px] font-bold text-gray-700 uppercase tracking-wide mb-2 text-center">{title}</p>
//       {signature ? (
//         <img src={getSigUrl(signature)} alt="Signature" className="h-12 w-full object-contain" />
//       ) : (
//         <div className="border-b border-gray-400 h-12"></div>
//       )}
//     </div>
//   );

//   const renderField = (field: SchemaField) => {
//     if (!field.id || !field.type) {
//       if (field.content) {
//         return <p key={field.content} className="text-[10px] text-gray-700 italic col-span-2">{field.content}</p>;
//       }
//       return null;
//     }
//     if (field.type === "signature") {
//       return <SignatureBlock key={field.id} title={field.label || ""} signature={d[field.id]} />;
//     }
//     if (field.type === "checkbox") {
//       return <Checkbox key={field.id} checked={!!d[field.id]} label={field.label} />;
//     }
//     return <FormField key={field.id} label={field.label || ""} value={d[field.id]} colSpan={field.type === "textarea" ? 2 : 1} />;
//   };

//   const renderSection = (section: SchemaSection) => {
//     if (section.type === "table") {
//       return (
//         <div key={section.id} className="mb-4">
//           {section.title && (
//             <div className="bg-slate-700 text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">{section.title}</div>
//           )}
//           <table className="w-full border border-slate-400 text-[9px]">
//             <thead className="bg-slate-100">
//               <tr>
//                 {(section.columns || []).map((c) => (
//                   <th key={c} className="border border-slate-300 px-2 py-1 text-left font-bold uppercase">{titleCase(c)}</th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody>
//               {(section.rows || []).map((row, idx) => (
//                 <tr key={idx}>
//                   {row.map((cell, ci) => (
//                     <td key={ci} className="border border-slate-300 px-2 py-1 align-top">{cell}</td>
//                   ))}
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       );
//     }

//     if (section.type === "static") {
//       return (
//         <div key={section.id} className="mb-4">
//           {section.title && (
//             <div className="bg-slate-700 text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">{section.title}</div>
//           )}
//           <div className="border border-slate-400 p-3">
//             <p className="text-[10px] text-gray-800 whitespace-pre-line leading-relaxed">{section.content}</p>
//           </div>
//         </div>
//       );
//     }

//     // form
//     return (
//       <div key={section.id} className="mb-4">
//         {section.title && (
//           <div className="bg-slate-700 text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">{section.title}</div>
//         )}
//         <div className="border border-slate-400 p-3 grid grid-cols-2 gap-3">
//           {section.content && <p className="text-[9px] text-gray-600 italic col-span-2">{section.content}</p>}
//           {(section.fields || []).map(renderField)}
//         </div>
//       </div>
//     );
//   };

//   return (
//     <div className="w-[210mm] bg-white p-8 text-[11px]">
//       {/* Header Block */}
//       <div className="w-full bg-[#1e40af] flex items-center p-4 min-h-[28mm] mb-1">
//         <div className="w-[25%] flex items-center justify-center border-r-[1.5px] border-[#3b5bcc] pr-4 h-full">
//           <img src="/assets/login-bg.jpeg" alt="Logo" className="w-[20mm] object-contain" />
//         </div>
//         <div className="w-[75%] pl-6 flex flex-col justify-center">
//           <h1 className="text-white text-2xl font-extrabold leading-none tracking-tight mb-2 uppercase italic">
//             Procedure Consent Form
//           </h1>
//           <p className="text-[#93c5fd] text-[10px] leading-tight font-bold uppercase">{templateData.display_name}</p>
//           <p className="text-[#93c5fd]/70 text-[8px] mt-1">Policy Ref: {templateData.form_schema?.metadata?.policy} • Version {templateData.version}</p>
//         </div>
//       </div>

//       <div className="w-full text-center py-2 border-b border-slate-200 mb-4">
//         <p className="text-[8px] text-slate-500 font-medium italic">Head Office: Medbookie Limited Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos, Nigeria &nbsp;•&nbsp; +234 705 648 2776 &nbsp;•&nbsp; info@Medbookiehospital.com</p>
//       </div>

//       {sections.map(renderSection)}

//       <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between items-center text-[8px] text-slate-400 font-bold uppercase tracking-widest">
//         <span>Medbookie - Clinical Documentation</span>
//         <span>{templateData.slug} • v{templateData.version}</span>
//       </div>
//     </div>
//   );
// };

// export default DynamicConsentPrintTemplate;
