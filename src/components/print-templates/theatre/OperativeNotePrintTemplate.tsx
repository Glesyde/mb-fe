import React from "react";
import { Printer } from "lucide-react";
import { OTSurgery } from "../../../services/ot.service";

interface OperativeNotePrintTemplateProps {
  isOpen: boolean;
  onClose: () => void;
  formData: any;
  surgery: OTSurgery;
}

const OperativeNotePrintTemplate: React.FC<OperativeNotePrintTemplateProps> = ({
  isOpen,
  onClose,
  formData,
  surgery,
}) => {
  if (!isOpen) return null;

  const data = formData || {};

  const Checkbox = ({
    checked,
    label,
  }: {
    checked?: boolean;
    label?: string;
  }) => (
    <div className="flex items-start gap-1">
      <div
        className={`w-3 h-3 border border-gray-500 flex-shrink-0 flex items-center justify-center`}
      >
        {checked && <span className="text-black text-[10px] font-bold">✓</span>}
      </div>
      {label && <span className="text-[10px] text-gray-800 leading-none">{label}</span>}
    </div>
  );

  const SectionHeader = ({ number, title, subtitle }: { number: string, title: string, subtitle?: string }) => (
    <div className="bg-[#1A202C] text-white flex justify-between items-center px-2 py-1 mt-2">
      <div className="flex items-center gap-2">
        <div className="bg-white text-[#1A202C] rounded-full w-4 h-4 flex items-center justify-center font-bold text-[10px]">
          {number}
        </div>
        <span className="font-bold text-[10px] uppercase tracking-wider">{title}</span>
      </div>
      {subtitle && <span className="text-[9px] italic opacity-80">{subtitle}</span>}
    </div>
  );

  const FormField = ({ label, value, colSpan = 1, borderTop = false }: { label: string; value?: string | number | null; colSpan?: number, borderTop?: boolean }) => (
    <div className={`col-span-${colSpan} px-2 py-1 flex flex-col justify-between h-full ${borderTop ? 'border-t border-gray-300' : ''}`}>
      <span className="text-[8px] font-bold text-[#556987] uppercase tracking-widest">{label}</span>
      <span className="text-[10px] text-gray-900 mt-1">{value || "\u00A0"}</span>
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-slate-100 overflow-y-auto px-4 py-20 print:static print:bg-white print:p-0 z-[200]"
      style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
    >
      <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-8 print:hidden z-[210] shadow-md">
        <p className="font-bold text-sm">Operative Note Preview</p>
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.print()}
            className="bg-[#3B309A] hover:bg-[#2d258a] text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all"
          >
            <Printer size={16} /> Print Form
          </button>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 font-bold"
          >
            Close
          </button>
        </div>
      </div>

      <div className="w-[210mm] min-h-[297mm] bg-white p-8 shadow-2xl print:shadow-none print:m-0 print:border-none mx-auto text-[11px] font-sans">
        {/* Header Block */}
        <div className="w-full bg-[#3B309A] flex items-center p-4 min-h-[28mm]">
          <div className="w-[25%] flex items-center justify-center border-r-[1.5px] border-[#4c3fbf] pr-4 h-full">
            <img src="/assets/login-bg.jpeg" alt="Logo" className="w-[20mm] object-contain" />
          </div>
          <div className="w-[75%] pl-6 flex flex-col justify-center">
            <h1 className="text-white text-3xl font-extrabold leading-none tracking-tight mb-2 uppercase">
              Operative Note
            </h1>
            <p className="text-blue-200 text-[10px] leading-tight font-black uppercase tracking-widest">
              OPERATING THEATRES - SURGICAL SERVICES
            </p>
          </div>
        </div>

        {/* Address Bar */}
        <div className="w-full text-center py-2 border-b border-slate-200 mb-6">
          <p className="text-[8px] text-slate-500 font-medium">Head Office: Gracespring Hospitals Limited, Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos, Nigeria, Lagos State, Nigeria. &nbsp;•&nbsp; +234 705 648 2776 &nbsp;•&nbsp; info@gracespringhospital.com</p>
        </div>

        {/* Title & Sticker */}
        <div className="flex justify-between items-end mb-2">
          <div>
            <p className="text-[#3B309A] text-[9px] font-bold uppercase tracking-widest">
              SURGICAL DOCUMENTATION
            </p>
            <h2 className="text-[#3B309A] text-2xl font-serif italic font-bold">
              Operative Note
            </h2>
          </div>
          <div className="w-48 h-12 border border-dashed border-gray-400 flex items-center justify-center relative">
            <span className="absolute top-[-8px] right-2 bg-white px-1 text-[8px] text-gray-500">Patient Label / Sticker</span>
          </div>
        </div>

        {/* Patient Identifiers Box */}
        <div className="border border-[#7A9BB8] mb-4">
          <div className="bg-[#EBF1F5] px-2 py-1 border-b border-[#7A9BB8]">
            <span className="text-[9px] font-bold text-[#2A4365] uppercase tracking-widest">PATIENT IDENTIFIERS</span>
          </div>
          <div className="grid grid-cols-12 divide-x divide-[#7A9BB8]">
            <div className="col-span-8 px-2 py-1 border-b border-[#7A9BB8]">
              <span className="text-[8px] font-bold text-[#556987] uppercase">SURNAME, GIVEN NAMES</span>
              <p className="text-[10px] mt-1">{data.patient_full_name || `${surgery.last_name}, ${surgery.first_name}`}</p>
            </div>
            <div className="col-span-2 px-2 py-1 border-b border-[#7A9BB8]">
              <span className="text-[8px] font-bold text-[#556987] uppercase">MRN</span>
              <p className="text-[10px] mt-1">{data.mrn || surgery.mrn}</p>
            </div>
            <div className="col-span-2 px-2 py-1 border-b border-[#7A9BB8]">
              <span className="text-[8px] font-bold text-[#556987] uppercase">DATE OF BIRTH</span>
              <p className="text-[10px] mt-1">{data.dob || surgery.age}</p>
            </div>
          </div>
          <div className="grid grid-cols-12 divide-x divide-[#7A9BB8]">
            <div className="col-span-1 px-2 py-1 flex flex-col border-b border-[#7A9BB8]">
               <span className="text-[8px] font-bold text-[#556987] uppercase">AGE</span>
               <p className="text-[10px] mt-1">{data.patient_age || surgery.age || 'N/A'}</p>
            </div>
            <div className="col-span-3 px-2 py-1 flex flex-col border-b border-[#7A9BB8]">
              <span className="text-[8px] font-bold text-[#556987] uppercase mb-1">SEX</span>
              <div className="flex gap-3">
                <Checkbox checked={(data.gender || surgery.gender) === "M" || (data.gender || surgery.gender) === "Male"} label="M" />
                <Checkbox checked={(data.gender || surgery.gender) === "F" || (data.gender || surgery.gender) === "Female"} label="F" />
                <Checkbox checked={(data.gender || surgery.gender) === "Other" || (!data.gender && !surgery.gender)} label="Other" />
              </div>
            </div>
            <div className="col-span-8 px-2 py-1 border-b border-[#7A9BB8]">
              <span className="text-[8px] font-bold text-[#556987] uppercase">PRE-OPERATIVE DIAGNOSIS</span>
              <p className="text-[10px] mt-1">{data.preop_diagnosis}</p>
            </div>
          </div>
          <div className="grid grid-cols-12">
            <div className="col-span-12 px-2 py-1 border-b border-[#7A9BB8]">
              <span className="text-[8px] font-bold text-[#556987] uppercase">TITLE OF OPERATION</span>
              <p className="text-[10px] mt-1">{data.procedures_performed}</p>
            </div>
          </div>
          <div className="grid grid-cols-12 divide-x divide-[#7A9BB8] bg-[#EBF1F5]">
            <div className="col-span-6 px-2 py-1">
              <span className="text-[8px] font-bold text-[#556987] uppercase">AUTHOR OF THIS NOTE</span>
            </div>
            <div className="col-span-3 px-2 py-1">
              <span className="text-[8px] font-bold text-[#556987] uppercase">DESIGNATION</span>
            </div>
            <div className="col-span-3 px-2 py-1">
              <span className="text-[8px] font-bold text-[#556987] uppercase">DATE / TIME OF WRITING</span>
            </div>
          </div>
        </div>

        {/* 1. Operation Details */}
        <SectionHeader number="1" title="OPERATION DETAILS" subtitle="complete fully" />
        <div className="border-x border-b border-[#7A9BB8] mb-4">
          <div className="grid grid-cols-12 divide-x divide-[#7A9BB8] border-b border-[#7A9BB8]">
            <FormField label="DATE OF OPERATION" value={data.operation_date} colSpan={3} />
            <FormField label="START TIME (KNIFE)" value={data.start_time} colSpan={3} />
            <FormField label="END TIME (CLOSURE)" value={data.end_time} colSpan={3} />
            <div className="col-span-3 px-2 py-1">
              <span className="text-[8px] font-bold text-[#556987] uppercase">PROCEDURE TYPE</span>
              <div className="flex gap-2 mt-1">
                <Checkbox checked={data.procedure_type === "Elective"} label="Elective" />
                <Checkbox checked={data.procedure_type === "Emergency"} label="Emergency" />
              </div>
            </div>
          </div>
          <div className="px-2 py-1 border-b border-[#7A9BB8]">
             <span className="text-[8px] font-bold text-[#556987] uppercase">THEATRE</span>
             <p className="text-[10px]">{surgery.ot_room_id}</p>
          </div>
          <div className="px-2 py-1 border-b border-[#7A9BB8]">
            <span className="text-[8px] font-bold text-[#556987] uppercase tracking-widest mb-1 block">ANAESTHESIA TYPE • TICK ALL THAT APPLY</span>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <Checkbox checked={data.anesthesia_type?.includes('General (GA)')} label="General (GA)" />
              <Checkbox checked={data.anesthesia_type?.includes('Local (LA)')} label="Local (LA)" />
              <Checkbox checked={data.anesthesia_type?.includes('Regional - Spinal')} label="Regional - Spinal" />
              <Checkbox checked={data.anesthesia_type?.includes('Regional - Epidural')} label="Regional - Epidural" />
              <Checkbox checked={data.anesthesia_type?.includes('Regional - Caudal')} label="Regional - Caudal" />
              <Checkbox checked={data.anesthesia_type?.includes('Combined Spinal')} label="Combined Spinal & Epidural (CSE)" />
              <Checkbox checked={data.anesthesia_type?.includes('Sedation - with')} label="Sedation - with anaesthetist" />
              <Checkbox checked={data.anesthesia_type?.includes('Sedation - no')} label="Sedation - no anaesthetist" />
              <Checkbox checked={data.anesthesia_type?.includes('No anaesthesia')} label="No anaesthesia" />
              <div className="flex items-center gap-1">
                <Checkbox checked={data.anesthesia_type?.includes('Other')} label="Other:" />
                <span className="border-b border-gray-400 w-24 inline-block"></span>
              </div>
            </div>
          </div>
          <div className="px-2 py-1">
            <span className="text-[8px] font-bold text-[#556987] uppercase tracking-widest">LOCAL ANAESTHETIC / DRUGS ADMINISTERED BY THE SURGEON (AGENT, CONCENTRATION, VOLUME, TOTAL DOSE)</span>
            <div className="min-h-[20px] text-[10px] mt-1 border-b border-gray-300 pb-1">{data.anesthetic_drugs || "\u00A0"}</div>
            <div className="min-h-[14px] border-b border-gray-300"></div>
          </div>
        </div>

        {/* 2. Performed By */}
        <SectionHeader number="2" title="PERFORMED BY" subtitle="enter full names" />
        <div className="border-x border-b border-[#7A9BB8] mb-4">
          <div className="grid grid-cols-2 divide-x divide-[#7A9BB8]">
            <FormField label="SURGEON" value={data.surgeon_name || data.surgeon_id} borderTop={false} />
            <FormField label="ASSISTANT 1" value={data.assistant1_name || data.assistant1_id} borderTop={false} />
            <FormField label="ASSISTANT 2" value={data.assistant2_name || data.assistant2_id} borderTop />
            <FormField label="ANAESTHETIST 1" value={data.anaesthetist1_name || data.anaesthetist1_id} borderTop />
            <FormField label="ANAESTHETIST 2" value={data.anaesthetist2_name || data.anaesthetist2_id} borderTop />
            <FormField label="SCRUB PRACTITIONER" value={data.scrub_practitioner_name || data.scrub_practitioner_id} borderTop />
            <FormField label="ANAESTHETIC TECHNICIAN" value={data.anaesthetic_technician_name || data.anaesthetic_technician_id} borderTop />
            <FormField label="CIRCULATOR" value={data.circulator_name || data.circulator_id} borderTop />
            <FormField label="OTHER" value={data.other_staff} borderTop />
            <FormField label="OTHER" value={""} borderTop />
            <FormField label="SUPERVISED BY" value={data.supervisor_name || data.supervised_by_id} borderTop />
            <div className="px-2 py-1 border-t border-[#7A9BB8]">
              <span className="text-[8px] font-bold text-[#556987] uppercase block mb-1">SUPERVISION LEVEL</span>
              <div className="flex gap-3">
                <Checkbox checked={data.supervision_level === "Direct"} label="Direct" />
                <Checkbox checked={data.supervision_level === "Indirect"} label="Indirect" />
                <Checkbox checked={data.supervision_level === "Independent"} label="Independent" />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Procedure(s) & Operative Diagnosis */}
        <SectionHeader number="3" title="PROCEDURE(S) & OPERATIVE DIAGNOSIS" />
        <div className="border-x border-b border-[#7A9BB8] mb-4">
          <div className="px-2 py-1 border-b border-[#7A9BB8]">
            <span className="text-[8px] font-bold text-[#556987] uppercase tracking-widest">PROCEDURE(S) PERFORMED (LIST ALL; PRIMARY FIRST)</span>
            <div className="min-h-[20px] text-[10px] mt-1 border-b border-gray-300 pb-1">{data.procedures_performed || "\u00A0"}</div>
            <div className="min-h-[14px] border-b border-gray-300"></div>
          </div>
          <div className="px-2 py-1">
            <span className="text-[8px] font-bold text-[#556987] uppercase tracking-widest">OPERATIVE DIAGNOSIS (POST-OPERATIVE)</span>
            <div className="min-h-[20px] text-[10px] mt-1 border-b border-gray-300 pb-1">{data.postop_diagnosis || "\u00A0"}</div>
            <div className="min-h-[14px] border-b border-gray-300"></div>
          </div>
        </div>

        {/* 4. Operative Narrative */}
        <SectionHeader number="4" title="OPERATIVE NARRATIVE" subtitle="structured account" />
        <div className="border-x border-b border-[#7A9BB8] mb-4">
          <div className="px-2 py-1 border-b border-[#7A9BB8]">
            <span className="text-[8px] font-bold text-[#556987] uppercase tracking-widest">OPERATIVE INDICATION</span>
            <div className="min-h-[20px] text-[10px] mt-1 border-b border-gray-300 pb-1">{data.operative_indication || "\u00A0"}</div>
            <div className="min-h-[14px] border-b border-gray-300"></div>
          </div>
          <div className="px-2 py-1 border-b border-[#7A9BB8]">
            <span className="text-[8px] font-bold text-[#556987] uppercase tracking-widest">OPERATIVE FINDINGS</span>
            <div className="min-h-[20px] text-[10px] mt-1 border-b border-gray-300 pb-1 whitespace-pre-wrap">{data.operative_findings || "\u00A0"}</div>
            <div className="min-h-[14px] border-b border-gray-300"></div>
          </div>
          <div className="px-2 py-1 border-b border-[#7A9BB8]">
            <span className="text-[8px] font-bold text-[#556987] uppercase tracking-widest">OPERATIVE PROCEDURE — STEP BY STEP</span>
            <div className="min-h-[60px] text-[10px] mt-1 border-b border-gray-300 pb-1 whitespace-pre-wrap leading-relaxed">{data.operative_procedure_steps || "\u00A0"}</div>
            <div className="min-h-[14px] border-b border-gray-300"></div>
            <div className="min-h-[14px] border-b border-gray-300"></div>
            <div className="min-h-[14px] border-b border-gray-300"></div>
          </div>
          <div className="px-2 py-1 border-b border-[#7A9BB8]">
            <span className="text-[8px] font-bold text-[#556987] uppercase tracking-widest">CLOSURE TECHNIQUE (LAYERS, SUTURE MATERIAL, SKIN)</span>
            <div className="min-h-[20px] text-[10px] mt-1 border-b border-gray-300 pb-1">{data.closure_technique || "\u00A0"}</div>
            <div className="min-h-[14px] border-b border-gray-300"></div>
          </div>

          {/* INTRA-OPERATIVE ADJUNCTS */}
          <div className="bg-[#EBF1F5] px-2 py-1 border-b border-[#7A9BB8]">
            <span className="text-[9px] font-bold text-[#2A4365] uppercase tracking-widest">INTRA-OPERATIVE ADJUNCTS</span>
          </div>
          <div className="grid grid-cols-12 divide-x divide-[#7A9BB8] border-b border-[#7A9BB8]">
            <div className="col-span-3 px-2 py-1">
              <span className="text-[8px] font-bold text-[#556987] uppercase block mb-1">DRAINS</span>
              <div className="flex gap-2">
                 <Checkbox checked={!data.drains_present} label="None" />
                 <Checkbox checked={data.drains_present} label="Yes" />
              </div>
            </div>
            <div className="col-span-9 px-2 py-1">
               <span className="text-[8px] font-bold text-[#556987] uppercase block">TYPE, SITE & NUMBER (IF ANY)</span>
               <div className="min-h-[14px] text-[10px] mt-1 border-b border-gray-300 pb-1">{data.drains_details || "\u00A0"}</div>
            </div>
          </div>
          <div className="grid grid-cols-12 divide-x divide-[#7A9BB8] border-b border-[#7A9BB8]">
            <div className="col-span-3 px-2 py-1">
              <span className="text-[8px] font-bold text-[#556987] uppercase block mb-1">TOURNIQUET</span>
              <div className="flex gap-2">
                 <Checkbox checked={!data.tourniquet_used} label="None" />
                 <Checkbox checked={data.tourniquet_used} label="Yes" />
              </div>
            </div>
            <div className="col-span-3 px-2 py-1">
               <span className="text-[8px] font-bold text-[#556987] uppercase block">SITE</span>
               <div className="min-h-[14px] text-[10px] mt-1 border-b border-gray-300 pb-1">{data.tourniquet_site || "\u00A0"}</div>
            </div>
            <div className="col-span-3 px-2 py-1">
               <span className="text-[8px] font-bold text-[#556987] uppercase block">PRESSURE (MMHG)</span>
               <div className="min-h-[14px] text-[10px] mt-1 border-b border-gray-300 pb-1">{data.tourniquet_pressure || "\u00A0"}</div>
            </div>
            <div className="col-span-3 px-2 py-1">
               <span className="text-[8px] font-bold text-[#556987] uppercase block">TOTAL TIME (MIN)</span>
               <div className="min-h-[14px] text-[10px] mt-1 border-b border-gray-300 pb-1">{data.tourniquet_duration || "\u00A0"}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-[#7A9BB8] border-b border-[#7A9BB8]">
            <FormField label="ESTIMATED BLOOD LOSS (EBL, ML)" value={data.estimated_blood_loss} />
            <FormField label="FLUIDS GIVEN (TYPE / VOLUME)" value={data.fluids_given} />
            <FormField label="BLOOD PRODUCTS (UNITS)" value={data.blood_products} />
          </div>

          {/* DRUGS & PROPHYLAXIS */}
          <div className="bg-[#EBF1F5] px-2 py-1 border-b border-[#7A9BB8]">
            <span className="text-[9px] font-bold text-[#2A4365] uppercase tracking-widest">DRUGS & PROPHYLAXIS</span>
          </div>
          <div className="grid grid-cols-12 divide-x divide-[#7A9BB8] border-b border-[#7A9BB8]">
            <div className="col-span-5 px-2 py-1">
              <span className="text-[8px] font-bold text-[#556987] uppercase block mb-1">ANTIBIOTIC PROPHYLAXIS</span>
              <div className="flex gap-2">
                 <Checkbox checked={data.antibiotic_prophylaxis} label="Given" />
                 <Checkbox checked={!data.antibiotic_prophylaxis && data.antibiotic_agent === "Not indicated"} label="Not indicated" />
                 <Checkbox checked={!data.antibiotic_prophylaxis && data.antibiotic_agent === "Declined"} label="Declined" />
              </div>
            </div>
            <div className="col-span-7 px-2 py-1">
               <span className="text-[8px] font-bold text-[#556987] uppercase block">AGENT, DOSE, ROUTE & TIME GIVEN</span>
               <div className="min-h-[14px] text-[10px] mt-1 border-b border-gray-300 pb-1">{data.antibiotic_agent || "\u00A0"}</div>
            </div>
          </div>
          <div className="grid grid-cols-12 divide-x divide-[#7A9BB8] border-b border-[#7A9BB8]">
            <div className="col-span-5 px-2 py-1">
              <span className="text-[8px] font-bold text-[#556987] uppercase block mb-1">DVT PROPHYLAXIS</span>
              <div className="flex gap-2">
                 <Checkbox checked={data.dvt_prophylaxis === "Mechanical" || data.dvt_prophylaxis === "Both"} label="Mechanical" />
                 <Checkbox checked={data.dvt_prophylaxis === "Pharmacological" || data.dvt_prophylaxis === "Both"} label="Pharmacological" />
                 <Checkbox checked={data.dvt_prophylaxis === "Both"} label="Both" />
                 <Checkbox checked={data.dvt_prophylaxis === "None"} label="None" />
              </div>
            </div>
            <div className="col-span-7 px-2 py-1">
               <span className="text-[8px] font-bold text-[#556987] uppercase block">DETAILS (TED STOCKINGS / IPC / LMWH DOSE, ETC.)</span>
               <div className="min-h-[14px] text-[10px] mt-1 border-b border-gray-300 pb-1">{data.dvt_details || "\u00A0"}</div>
            </div>
          </div>
          <div className="px-2 py-1 border-b border-[#7A9BB8]">
            <span className="text-[8px] font-bold text-[#556987] uppercase tracking-widest">OTHER DRUGS ADMINISTERED INTRA-OPERATIVELY</span>
            <div className="min-h-[20px] text-[10px] mt-1 border-b border-gray-300 pb-1">{data.other_drugs || "\u00A0"}</div>
            <div className="min-h-[14px] border-b border-gray-300"></div>
          </div>

          {/* SPECIMENS */}
          <div className="bg-[#EBF1F5] px-2 py-1 border-b border-[#7A9BB8]">
            <span className="text-[9px] font-bold text-[#2A4365] uppercase tracking-widest">SPECIMENS</span>
          </div>
          <div className="px-2 py-1 border-b border-[#7A9BB8]">
             <span className="text-[8px] font-bold text-[#556987] uppercase tracking-widest mb-1 block">SPECIMEN SENT TO</span>
             <div className="flex gap-4 mt-1">
               <Checkbox checked={data.specimens_sent_to === "Histology"} label="Histology" />
               <Checkbox checked={data.specimens_sent_to === "Microbiology"} label="Microbiology" />
               <Checkbox checked={data.specimens_sent_to === "Cytology"} label="Cytology" />
               <Checkbox checked={data.specimens_sent_to === "Frozen section"} label="Frozen section" />
               <Checkbox checked={data.specimens_sent_to === "Disposed of"} label="Disposed of" />
               <Checkbox checked={data.specimens_sent_to === "Other"} label="Other" />
             </div>
          </div>
          <div className="px-2 py-1">
            <span className="text-[8px] font-bold text-[#556987] uppercase tracking-widest">SPECIMEN DESCRIPTION & LABELLING (POTS NUMBERED, REQUEST FORM COMPLETED)</span>
            <div className="min-h-[20px] text-[10px] mt-1 border-b border-gray-300 pb-1">{data.specimen_description || "\u00A0"}</div>
            <div className="min-h-[14px] border-b border-gray-300"></div>
          </div>
        </div>

        {/* Page Break logic depending on actual content. Using page-break-inside avoid if needed. */}
        <div className="page-break-before mt-4" style={{ pageBreakBefore: 'always' }}></div>

        {/* 5. Outcome */}
        <SectionHeader number="5" title="OUTCOME" />
        <div className="border-x border-b border-[#7A9BB8] mb-4">
          <div className="grid grid-cols-12 divide-x divide-[#7A9BB8] border-b border-[#7A9BB8]">
            <div className="col-span-3 px-2 py-1">
              <span className="text-[8px] font-bold text-[#556987] uppercase block mb-1">OUTCOME</span>
              <div className="flex gap-2">
                 <Checkbox checked={data.outcome === "Uncomplicated"} label="Uncomplicated" />
                 <Checkbox checked={data.outcome === "Complicated"} label="Complicated" />
              </div>
            </div>
            <div className="col-span-9 px-2 py-1">
               <span className="text-[8px] font-bold text-[#556987] uppercase block">PATIENT CONDITION LEAVING THEATRE</span>
               <div className="min-h-[14px] text-[10px] mt-1 border-b border-gray-300 pb-1">{data.patient_condition_leaving || "\u00A0"}</div>
            </div>
          </div>
          <div className="px-2 py-1">
            <span className="text-[8px] font-bold text-[#556987] uppercase tracking-widest">IF COMPLICATED — DESCRIBE COMPLICATION, ACTION TAKEN, PERSONS INFORMED</span>
            <div className="min-h-[20px] text-[10px] mt-1 border-b border-gray-300 pb-1">{data.complications || "\u00A0"}</div>
            <div className="min-h-[14px] border-b border-gray-300"></div>
          </div>
        </div>

        {/* 6. Post-Operative Information */}
        <SectionHeader number="6" title="POST-OPERATIVE INFORMATION" />
        <div className="border-x border-b border-[#7A9BB8] mb-4">
          <div className="grid grid-cols-12 divide-x divide-[#7A9BB8] border-b border-[#7A9BB8]">
            <div className="col-span-6 px-2 py-1">
              <span className="text-[8px] font-bold text-[#556987] uppercase block mb-1">TRANSFER TO</span>
              <div className="flex gap-2 flex-wrap">
                 <Checkbox checked={data.transfer_to === "Recovery" || data.transfer_to === "Recovery / PACU"} label="Recovery / PACU" />
                 <Checkbox checked={data.transfer_to === "HDU"} label="HDU" />
                 <Checkbox checked={data.transfer_to === "ICU"} label="ICU" />
                 <Checkbox checked={data.transfer_to === "Ward"} label="Ward" />
                 <Checkbox checked={data.transfer_to === "Day-case discharge"} label="Day-case discharge" />
                 <Checkbox checked={data.transfer_to === "Other"} label="Other" />
              </div>
            </div>
            <div className="col-span-6 px-2 py-1">
               <span className="text-[8px] font-bold text-[#556987] uppercase block">DESTINATION WARD / UNIT</span>
               <div className="min-h-[14px] text-[10px] mt-1 border-b border-gray-300 pb-1">{data.destination_ward || "\u00A0"}</div>
            </div>
          </div>
          <div className="px-2 py-1 border-b border-[#7A9BB8]">
            <span className="text-[8px] font-bold text-[#556987] uppercase tracking-widest">POST-OPERATIVE INSTRUCTIONS (OBSERVATIONS, POSITION, NBM/DIET, MOBILISATION, WOUND CARE, DRAINS, CATHETERS)</span>
            <div className="min-h-[20px] text-[10px] mt-1 border-b border-gray-300 pb-1">{data.postop_instructions || "\u00A0"}</div>
            <div className="min-h-[14px] border-b border-gray-300"></div>
          </div>
          <div className="px-2 py-1 border-b border-[#7A9BB8]">
            <span className="text-[8px] font-bold text-[#556987] uppercase tracking-widest">NEW MEDICATIONS REQUESTED (DRUG, DOSE, ROUTE, FREQUENCY, DURATION)</span>
            <div className="min-h-[20px] text-[10px] mt-1 border-b border-gray-300 pb-1">{data.new_medications || "\u00A0"}</div>
            <div className="min-h-[14px] border-b border-gray-300"></div>
          </div>
          <div className="px-2 py-1 border-b border-[#7A9BB8]">
            <span className="text-[8px] font-bold text-[#556987] uppercase tracking-widest">DISCHARGE INSTRUCTIONS (WHEN APPLICABLE — WOUND CARE, FOLLOW-UP, RED FLAGS, SICK CERTIFICATE, RETURN TO WORK)</span>
            <div className="min-h-[20px] text-[10px] mt-1 border-b border-gray-300 pb-1">{data.discharge_instructions || "\u00A0"}</div>
            <div className="min-h-[14px] border-b border-gray-300"></div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-[#7A9BB8]">
            <FormField label="FOLLOW-UP CLINIC / DATE" value={data.followup_clinic_date} />
            <FormField label="SUTURE / STAPLE REMOVAL DATE" value={data.suture_removal_date} />
            <FormField label="HISTOLOGY FOLLOW-UP PLAN" value={data.histology_followup} />
          </div>
        </div>

        {/* Author Sign-Off */}
        <div className="border border-[#7A9BB8] mb-4 mt-6">
          <div className="bg-[#EBF1F5] px-2 py-1 border-b border-[#7A9BB8]">
            <span className="text-[9px] font-bold text-[#2A4365] uppercase tracking-widest">AUTHOR SIGN-OFF</span>
          </div>
          <div className="grid grid-cols-2 divide-x divide-[#7A9BB8]">
            <div className="p-2">
              <span className="text-[8px] font-bold text-[#556987] uppercase">SURGEON / AUTHOR SIGNATURE</span>
              <div className="h-12 border-b border-gray-300 mt-2 mb-2"></div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div>
                   <span className="text-[8px] font-bold text-[#556987] uppercase">PRINTED NAME & DESIGNATION</span>
                   <div className="h-4 border-b border-gray-300 mt-1"></div>
                </div>
                <div>
                   <span className="text-[8px] font-bold text-[#556987] uppercase">MDCN NO.</span>
                   <div className="h-4 border-b border-gray-300 mt-1"></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                   <span className="text-[8px] font-bold text-[#556987] uppercase">DATE</span>
                   <div className="h-4 border-b border-gray-300 mt-1"></div>
                </div>
                <div>
                   <span className="text-[8px] font-bold text-[#556987] uppercase">TIME</span>
                   <div className="h-4 border-b border-gray-300 mt-1"></div>
                </div>
              </div>
            </div>
            <div className="p-2">
              <span className="text-[8px] font-bold text-[#556987] uppercase">COUNTER-SIGNATURE (SUPERVISING CONSULTANT, IF APPLICABLE)</span>
              <div className="h-12 border-b border-gray-300 mt-2 mb-2"></div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div>
                   <span className="text-[8px] font-bold text-[#556987] uppercase">PRINTED NAME & DESIGNATION</span>
                   <div className="h-4 border-b border-gray-300 mt-1"></div>
                </div>
                <div>
                   <span className="text-[8px] font-bold text-[#556987] uppercase">MDCN NO.</span>
                   <div className="h-4 border-b border-gray-300 mt-1"></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                   <span className="text-[8px] font-bold text-[#556987] uppercase">DATE</span>
                   <div className="h-4 border-b border-gray-300 mt-1"></div>
                </div>
                <div>
                   <span className="text-[8px] font-bold text-[#556987] uppercase">TIME</span>
                   <div className="h-4 border-b border-gray-300 mt-1"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center text-[8px] text-gray-500 mt-6 pt-2 border-t border-gray-200">
          <span>Gracespring Hospitals - Operating Theatres</span>
          <span>GH-OT-021 • v1.0 • File in patient case-notes</span>
        </div>
      </div>
    </div>
  );
};

export default OperativeNotePrintTemplate;
