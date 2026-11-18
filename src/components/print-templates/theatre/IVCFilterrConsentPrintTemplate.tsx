import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, AlertTriangle, Printer } from 'lucide-react';
import { BASE_URL } from "../../../api/client";
import { i18n } from "../../../i18n";

interface IVCFilterConsentPrintTemplateProps {
  formData?: any;
  templateData?: any;
}

const IVCFilterConsentPrintTemplate: React.FC<IVCFilterConsentPrintTemplateProps> = ({ formData: propFormData, templateData: propTemplateData }) => {
  const { orderId } = useParams<{ orderId: string }>();
  const [formData, setFormData] = useState<any>(propFormData || null);
  const [templateData, setTemplateData] = useState<any>(propTemplateData || null);
  const [loading, setLoading] = useState(!propFormData && !propTemplateData);
  const [error, setError] = useState('');

  useEffect(() => {
    if (propFormData && propTemplateData) {
      setFormData(propFormData);
      setTemplateData(propTemplateData);
      setLoading(false);
      return;
    }

    // If data is passed via props, use it; otherwise would fetch from API
    setLoading(false);
  }, [propFormData, propTemplateData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 size={48} className="animate-spin text-[#2d258a]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
          <AlertTriangle size={32} className="text-red-600 mx-auto mb-4" />
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  const getSigUrl = (path: string | undefined | null) => {
    if (!path) return "";
    if (path.startsWith("data:")) return path;
    const normalizedBaseUrl = BASE_URL.replace(/\/$/, "");
    return path.startsWith("/") ? `${normalizedBaseUrl}${path}` : `${normalizedBaseUrl}/${path}`;
  };

  const Checkbox = ({ checked, label }: { checked?: boolean; label?: string }) => (
    <div className="flex items-start gap-2 mb-1">
      <div className={`w-4 h-4 border-2 ${checked ? 'bg-black border-black' : 'border-gray-400 bg-white'} mt-0.5 flex-shrink-0 flex items-center justify-center`}>
        {checked && <span className="text-white text-xs font-bold">✓</span>}
      </div>
      {label && <span className="text-[10px] text-gray-800 leading-tight">{label}</span>}
    </div>
  );

  const FormField = ({ label, value, colSpan = 1, underline = false }: { label: string; value?: string; colSpan?: number; underline?: boolean }) => (
    <div className={`col-span-${colSpan} mb-2`}>
      <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mb-1">{label}</p>
      {underline ? (
        <div className="border-b border-gray-400 pb-1 min-h-[20px]">
          <span className="text-[11px] text-gray-800">{value || ''}</span>
        </div>
      ) : (
        <div className="border border-gray-300 bg-gray-50 px-2 py-1 min-h-[24px]">
          <span className="text-[11px] text-gray-800">{value || ''}</span>
        </div>
      )}
    </div>
  );

  const SignatureBlock = ({ title, signature, name, designation, date, time }: { title: string; signature?: string; name?: string; designation?: string; date?: string; time?: string }) => (
    <div className="border border-gray-300 p-3 bg-gray-50">
      <p className="text-[9px] font-bold text-gray-700 uppercase tracking-wide mb-2 text-center">{title}</p>
      <div className="mb-2">
        {signature ? (
          <img src={getSigUrl(signature)} alt={i18n.t("Signature")} className="h-12 w-full object-contain" />
        ) : (
          <div className="border-b border-gray-400 h-12"></div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-[8px] text-gray-500 uppercase">{i18n.t("Full Name (print)")}</p>
          <div className="border-b border-gray-400 h-5 mt-1">
            <span className="text-[9px] text-gray-800">{name || ''}</span>
          </div>
        </div>
        <div>
          <p className="text-[8px] text-gray-500 uppercase">{i18n.t("Designation/Bleep")}</p>
          <div className="border-b border-gray-400 h-5 mt-1">
            <span className="text-[9px] text-gray-800">{designation || ''}</span>
          </div>
        </div>
        <div>
          <p className="text-[8px] text-gray-500 uppercase">{i18n.t("Date")}</p>
          <div className="border-b border-gray-400 h-5 mt-1">
            <span className="text-[9px] text-gray-800">{date || ''}</span>
          </div>
        </div>
        <div>
          <p className="text-[8px] text-gray-500 uppercase">{i18n.t("Time")}</p>
          <div className="border-b border-gray-400 h-5 mt-1">
            <span className="text-[9px] text-gray-800">{time || ''}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const data = formData || {};
  const template = templateData || {};

  return (
    <div
      className="fixed inset-0 bg-slate-100 overflow-y-auto px-4 py-20 print:static print:bg-white print:p-0"
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      <div className="fixed top-0 start-0 end-0 h-16 bg-slate-900 text-white flex items-center justify-between px-8 print:hidden z-[100] shadow-md">
        <p className="font-bold text-sm">{i18n.t("IVC Filter Consent Form Preview")}</p>
        <button onClick={() => window.print()} className="bg-[#2d258a] hover:bg-brand-primary text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all">
          <Printer size={16} />{" "}{i18n.t("Print Form")}</button>
      </div>

      <div className="w-[210mm] bg-white p-8 shadow-2xl print:shadow-none print:m-0 print:border-none border border-slate-200 mx-auto text-[11px]">
        <div className="w-full bg-[#3B309A] flex items-center p-4 min-h-[28mm] mb-1">
          <div className="w-[25%] flex items-center justify-center border-e-[1.5px] border-[#4c3fbf] pe-4 h-full">
            <img src="/assets/login-bg.jpeg" alt={i18n.t("Logo")} className="w-[20mm] object-contain" />
          </div>
          <div className="w-[75%] ps-6 flex flex-col justify-center">
            <h1 className="text-white text-2xl font-extrabold leading-none tracking-tight mb-2 uppercase italic">{i18n.t("Procedure Consent Form")}</h1>
            <p className="text-brand-active text-[10px] leading-tight font-bold uppercase">{i18n.t("C-Arm Guided Inferior Vena Cava (IVC) Filter Insertion")}</p>
            <p className="text-brand-active/50 text-[8px] mt-1">{i18n.t("Form Ref: GSH-CONSENT-IVC-001 • Policy Ref: GSH-T6 • Version 1.0")}</p>
          </div>
        </div>

        {/* Address Bar */}
        <div className="w-full text-center py-2 border-b border-slate-200 mb-6">
          <p className="text-[8px] text-slate-500 font-medium italic">{i18n.t("Head Office: Medbookie Limited Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos, Nigeria Lagos State, Nigeria.  •  +234 705 648 2776  •  info@Medbookiehospital.com")}</p>
        </div>

        {/* Patient Rights */}
        <div className="border border-gray-300 p-4 mb-6 bg-brand-active/50 rounded-sm italic">
          <p className="text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1">{i18n.t("Patient Rights")}</p>
          <p className="text-[9px] text-gray-600 leading-relaxed">{i18n.t("You have the right to make decisions about your medical care and to refuse any procedure. If you wish to withdraw consent at any time before the procedure begins, you may do so. Signing this form does not remove your legal rights. This form complies with the National Health Act 2014 (Nigeria) and Medbookie Consent Policy (GSH-T6).")}</p>
        </div>

        {/* Part A - Patient Identification */}
        <div className="mb-6">
          <div className="bg-[#3B309A] text-white px-3 py-2 flex items-center mb-3">
            <span className="font-bold text-sm me-3">{i18n.t("A")}</span>
            <span className="font-bold text-xs uppercase tracking-wide">{i18n.t("Patient Identification")}</span>
          </div>
          <div className="border border-gray-300 p-4">
            <div className="grid grid-cols-3 gap-3">
              <FormField label={i18n.t("Patient Full Name")} value={data.patient_name} colSpan={2} />
              <FormField label={i18n.t("Date of Birth")} value={data.dob} colSpan={1} />
              <FormField label={i18n.t("Sex at Birth")} value={data.sex} colSpan={1} />
              <FormField label={i18n.t("MRN")} value={data.mrn} colSpan={1} />
              <FormField label={i18n.t("Ward / Unit")} value={data.ward} colSpan={1} />
              <FormField label={i18n.t("Consultant Vascular Surgeon")} value={data.consultant} colSpan={2} />
              <FormField label={i18n.t("Primary Diagnosis / Indication")} value={data.diagnosis} colSpan={3} underline />
              <div className="col-span-3 mt-2">
                <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mb-2">{i18n.t("Venous Access Site")}</p>
                <div className="grid grid-cols-5 gap-2">
                  {['Right femoral', 'Left femoral', 'Right jugular', 'Left jugular', 'Antecubital'].map((site, idx) => (
                    <div key={idx}>
                      <Checkbox checked={data.access_site?.includes(site)} label={site} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Part B - Description of Procedure */}
        <div className="mb-6">
          <div className="bg-[#3B309A] text-white px-3 py-2 flex items-center mb-3">
            <span className="font-bold text-sm me-3">{i18n.t("B")}</span>
            <span className="font-bold text-xs uppercase tracking-wide">{i18n.t("Description of the Procedure")}</span>
          </div>
          <div className="border border-gray-300 p-4">
            <p className="text-[10px] text-gray-700 leading-relaxed">{i18n.t("An Inferior Vena Cava (IVC) filter is a small cage-like device inserted into the inferior vena cava to prevent pulmonary embolism. The procedure is performed under fluoroscopic guidance using local anaesthesia with or without sedation and typically takes 30–60 minutes. Step-by-step procedure includes venous access, catheter insertion, positioning, deployment, and post-procedure monitoring.")}</p>
          </div>
        </div>

        {/* Part C - Contrast Agent & Radiation Disclosure */}
        <div className="mb-6">
          <div className="bg-[#3B309A] text-white px-3 py-2 flex items-center mb-3">
            <span className="font-bold text-sm me-3">{i18n.t("C")}</span>
            <span className="font-bold text-xs uppercase tracking-wide">{i18n.t("Contrast Agent & Radiation Disclosure")}</span>
          </div>
          <div className="border border-gray-300 p-4">
            <div className="mb-4">
              <p className="text-[9px] font-bold text-gray-700 uppercase mb-1">{i18n.t("Contrast Dye Disclosure")}</p>
              <p className="text-[9px] text-gray-600 leading-relaxed mb-2">{i18n.t("This procedure involves the use of iodinated contrast dye. Some patients may experience allergic reactions ranging from mild (hives, itching) to severe (anaphylaxis). Please inform the team if you have had previous reactions to contrast dye.")}</p>
              <Checkbox checked={data.contrast_ack} label={i18n.t("I have been informed about the use of contrast dye and its risks")} />
            </div>

            <div className="mb-4">
              <p className="text-[9px] font-bold text-gray-700 uppercase mb-1">{i18n.t("Contrast Allergy Disclosure")}</p>
              <p className="text-[9px] text-gray-600 leading-relaxed mb-2">{i18n.t("If you have a known contrast allergy, pre-medication may be administered prior to the procedure to reduce the risk of reaction.")}</p>
              <div className="flex items-center gap-4 mb-2">
                <Checkbox checked={data.contrast_allergy === 'Known allergy'} label={i18n.t("Known contrast allergy")} />
                <Checkbox checked={data.contrast_allergy === 'No known allergy'} label={i18n.t("No known contrast allergy")} />
              </div>
              {data.contrast_allergy === 'Known allergy' && (
                <div className="ms-6 mt-1">
                  <p className="text-[9px] text-gray-600">{i18n.t("Specify:")}{" "}{data.contrast_allergy_details || '_________________________'}</p>
                </div>
              )}
            </div>

            <div className="mb-4">
              <p className="text-[9px] font-bold text-gray-700 uppercase mb-1">{i18n.t("Renal Impairment Disclosure")}</p>
              <p className="text-[9px] text-gray-600 leading-relaxed mb-2">{i18n.t("Patients with renal impairment may require additional precautions. Creatinine/eGFR will be checked prior to procedure. If on Metformin, it may need to be withheld for 48 hours post-procedure.")}</p>
              <Checkbox checked={data.renal_check} label={i18n.t("Recent renal function result noted by team")} />
              <Checkbox checked={data.metformin_withheld} label={i18n.t("Metformin withheld for 48 hours post-procedure if applicable")} />
            </div>

            <div className="mb-4">
              <p className="text-[9px] font-bold text-gray-700 uppercase mb-1">{i18n.t("Pregnancy Disclosure")}</p>
              <p className="text-[9px] text-gray-600 leading-relaxed mb-2">{i18n.t("X-ray exposure during pregnancy may pose risks to the fetus. Pregnancy status will be confirmed prior to procedure.")}</p>
              <div className="flex items-center gap-4 mb-2">
                <Checkbox checked={data.not_pregnant} label={i18n.t("Not pregnant / pregnancy excluded")} />
              </div>
              <div className="ms-6">
                <p className="text-[9px] text-gray-600">{i18n.t("Pregnancy status confirmed by:")}{" "}{i18n.tv(data.pregnancy_status) || '_________________________'}</p>
              </div>
            </div>

            <div>
              <p className="text-[9px] font-bold text-gray-700 uppercase mb-1">{i18n.t("Radiation Disclosure")}</p>
              <p className="text-[9px] text-gray-600 leading-relaxed mb-2">{i18n.t("This procedure uses X-ray (ionising) radiation. The benefits of this procedure outweigh the small potential risk from radiation exposure.")}</p>
              <Checkbox checked={data.radiation_ack} label={i18n.t("I have been informed about the use of radiation and its risks")} />
            </div>
          </div>
        </div>

        {/* Part D - Benefits of the Procedure */}
        <div className="mb-6">
          <div className="bg-[#3B309A] text-white px-3 py-2 flex items-center mb-3">
            <span className="font-bold text-sm me-3">{i18n.t("D")}</span>
            <span className="font-bold text-xs uppercase tracking-wide">{i18n.t("Benefits of the Procedure")}</span>
          </div>
          <div className="border border-gray-300 p-4">
            <p className="text-[10px] text-gray-700 leading-relaxed mb-3">
              <span className="font-bold">{i18n.t("Primary Benefit:")}</span>{" "}{i18n.t("Prevention of life-threatening pulmonary embolism in patients who are unsuitable for anticoagulation or where anticoagulation has failed.")}</p>
            <p className="text-[10px] text-gray-700 leading-relaxed">
              <span className="font-bold">{i18n.t("Additional Benefits:")}</span>{" "}{i18n.t("The IVC filter provides mechanical protection against embolism while allowing for future retrieval if the patient's condition changes. Retrievable filters offer temporary protection with the option for removal when no longer needed.")}</p>
          </div>
        </div>

        {/* Part E - Risks & Complications */}
        <div className="mb-6">
          <div className="bg-[#3B309A] text-white px-3 py-2 flex items-center mb-3">
            <span className="font-bold text-sm me-3">{i18n.t("E")}</span>
            <span className="font-bold text-xs uppercase tracking-wide">{i18n.t("Risks & Complications")}</span>
          </div>
          <div className="border border-gray-300 p-4">
            <table className="w-full text-[9px]">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300">
                  <th className="text-start py-2 px-2 font-bold text-gray-700 uppercase">{i18n.t("Frequency")}</th>
                  <th className="text-start py-2 px-2 font-bold text-gray-700 uppercase">{i18n.t("Risk / Complication")}</th>
                  <th className="text-start py-2 px-2 font-bold text-gray-700 uppercase">{i18n.t("Details")}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-2 px-2 font-semibold">{i18n.t("COMMON (>1 in 10)")}</td>
                  <td className="py-2 px-2">{i18n.t("Access site pain / bruising")}</td>
                  <td className="py-2 px-2">{i18n.t("Usually resolves within 1–2 weeks")}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 px-2 font-semibold">{i18n.t("COMMON")}</td>
                  <td className="py-2 px-2">{i18n.t("Vasovagal reaction")}</td>
                  <td className="py-2 px-2">{i18n.t("Transient; managed with fluids")}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 px-2 font-semibold">{i18n.t("UNCOMMON (1 in 100–1,000)")}</td>
                  <td className="py-2 px-2">{i18n.t("IVC thrombosis")}</td>
                  <td className="py-2 px-2">{i18n.t("2–10% incidence")}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 px-2 font-semibold">{i18n.t("RARE (1 in 1,000–10,000)")}</td>
                  <td className="py-2 px-2">{i18n.t("Filter migration")}</td>
                  <td className="py-2 px-2">{i18n.t("May require intervention")}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 px-2 font-semibold">{i18n.t("RARE")}</td>
                  <td className="py-2 px-2">{i18n.t("Filter fracture")}</td>
                  <td className="py-2 px-2">{i18n.t("Very rare; may require retrieval")}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 px-2 font-semibold">{i18n.t("VERY RARE")}</td>
                  <td className="py-2 px-2">{i18n.t("Anaphylaxis")}</td>
                  <td className="py-2 px-2">{i18n.t("~0.04% incidence")}</td>
                </tr>
                <tr>
                  <td className="py-2 px-2 font-semibold">{i18n.t("VERY RARE")}</td>
                  <td className="py-2 px-2">{i18n.t("Death")}</td>
                  <td className="py-2 px-2">&lt;0.1%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Part F - Alternatives */}
        <div className="mb-6">
          <div className="bg-[#3B309A] text-white px-3 py-2 flex items-center mb-3">
            <span className="font-bold text-sm me-3">{i18n.t("F")}</span>
            <span className="font-bold text-xs uppercase tracking-wide">{i18n.t("Alternatives to IVC Filter Insertion")}</span>
          </div>
          <div className="border border-gray-300 p-4">
            <table className="w-full text-[9px]">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300">
                  <th className="text-start py-2 px-2 font-bold text-gray-700 uppercase w-1/3">{i18n.t("Alternative Option")}</th>
                  <th className="text-start py-2 px-2 font-bold text-gray-700 uppercase w-1/3">{i18n.t("Description")}</th>
                  <th className="text-start py-2 px-2 font-bold text-gray-700 uppercase w-1/3">{i18n.t("Limitations / Reason Alternative May Not Be Suitable")}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-2 px-2 font-semibold">{i18n.t("Therapeutic anticoagulation")}</td>
                  <td className="py-2 px-2">{i18n.t("Use of blood thinners (e.g., heparin, warfarin, DOACs) to prevent clot formation and propagation")}</td>
                  <td className="py-2 px-2">{i18n.t("Contraindicated in patients with active bleeding, high bleeding risk, or failed anticoagulation")}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 px-2 font-semibold">{i18n.t("Systemic or catheter-directed thrombolysis")}</td>
                  <td className="py-2 px-2">{i18n.t("Administration of clot-dissolving medication to break down existing clots")}</td>
                  <td className="py-2 px-2">{i18n.t("High bleeding risk; not suitable for all patients; requires careful monitoring")}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 px-2 font-semibold">{i18n.t("Observation / conservative management")}</td>
                  <td className="py-2 px-2">{i18n.t("Close monitoring without active intervention")}</td>
                  <td className="py-2 px-2">{i18n.t("High risk of recurrent pulmonary embolism; not appropriate for high-risk patients")}</td>
                </tr>
                <tr>
                  <td className="py-2 px-2 font-semibold">{i18n.t("No intervention")}</td>
                  <td className="py-2 px-2">{i18n.t("No active treatment provided")}</td>
                  <td className="py-2 px-2">{i18n.t("Unacceptable risk of fatal pulmonary embolism in patients with DVT/PE")}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Part G - Retrievable IVC Filter */}
        <div className="mb-6">
          <div className="bg-[#3B309A] text-white px-3 py-2 flex items-center mb-3">
            <span className="font-bold text-sm me-3">{i18n.t("G")}</span>
            <span className="font-bold text-xs uppercase tracking-wide">{i18n.t("Retrievable IVC Filter: Additional Information")}</span>
          </div>
          <div className="border border-gray-300 p-4">
            <div className="text-[9px] text-gray-700 leading-relaxed mb-4 space-y-2">
              <p><span className="font-bold">1.</span>{" "}{i18n.t("Retrievable IVC filters are designed to provide temporary protection against pulmonary embolism and can be removed when no longer needed (typically within weeks to months, depending on filter type and clinical circumstances).")}</p>
              <p><span className="font-bold">2.</span>{" "}{i18n.t("Retrieval is performed via a similar minimally invasive procedure. Not all filters can be successfully retrieved due to factors such as filter tilt, endothelialization, or clot entrapment.")}</p>
              <p><span className="font-bold">3.</span>{" "}{i18n.t("If retrieval is not possible or clinically contraindicated, the filter may become permanent. The patient and clinician should discuss this possibility prior to insertion.")}</p>
              <p><span className="font-bold">4.</span>{" "}{i18n.t("The patient must follow up for assessment of retrieval suitability. Failure to attend follow-up may result in the filter remaining in place indefinitely with associated long-term risks.")}</p>
            </div>
            <div className="border-t border-gray-300 pt-3">
              <p className="text-[9px] font-bold text-gray-700 uppercase mb-2">{i18n.t("Patient Acknowledgement (for retrievable filter)")}</p>
              <Checkbox checked={data.retrieval_ack} label={i18n.t("I understand that the IVC filter is intended to be retrievable and that retrieval will be assessed at follow-up")} />
              <Checkbox checked={data.retrieval_not_guaranteed} label={i18n.t("I understand that retrieval is not guaranteed and may not be possible due to clinical or technical factors")} />
              <Checkbox checked={data.permanent_if_needed} label={i18n.t("I consent to permanent placement of the filter if retrieval is not possible or clinically contraindicated")} />
              <Checkbox checked={data.followup_commitment} label={i18n.t("I commit to attending follow-up appointments for retrieval assessment")} />
              <Checkbox checked={data.permanent_filter_planned} label={i18n.t("NOT APPLICABLE - permanent filter planned")} />
            </div>
          </div>
        </div>

        {/* Part H - Anaesthesia & Sedation */}
        <div className="mb-6">
          <div className="bg-[#3B309A] text-white px-3 py-2 flex items-center mb-3">
            <span className="font-bold text-sm me-3">{i18n.t("H")}</span>
            <span className="font-bold text-xs uppercase tracking-wide">{i18n.t("Anaesthesia & Sedation")}</span>
          </div>
          <div className="border border-gray-300 p-4">
            <p className="text-[9px] font-bold text-gray-700 uppercase mb-2">{i18n.t("Planned anaesthesia / sedation")}</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <Checkbox checked={data.anaesthesia_type === 'Local'} label={i18n.t("Local anaesthetic only")} />
              <Checkbox checked={data.anaesthesia_type === 'Sedation'} label={i18n.t("Local anaesthetic with conscious sedation")} />
              <Checkbox checked={data.anaesthesia_type === 'General'} label={i18n.t("General anaesthesia")} />
            </div>
            <FormField label={i18n.t("Planned anaesthetic agent(s)")} value={data.drug_allergies} colSpan={3} underline />
            <FormField label={i18n.t("Anticoagulation status")} value={data.anticoagulation} colSpan={3} underline />
          </div>
        </div>

        {/* Part I - Patient Questions */}
        <div className="mb-6">
          <div className="bg-[#3B309A] text-white px-3 py-2 flex items-center mb-3">
            <span className="font-bold text-sm me-3">{i18n.t("I")}</span>
            <span className="font-bold text-xs uppercase tracking-wide">{i18n.t("Patient Questions & Additional Information Requested")}</span>
          </div>
          <div className="border border-gray-300 p-4">
            <p className="text-[9px] font-bold text-gray-700 uppercase mb-2">{i18n.t("Questions asked by the patient during the consent discussion")}</p>
            <div className="border border-gray-300 bg-gray-50 p-2 min-h-[60px] mb-3">
              <p className="text-[10px] text-gray-700 whitespace-pre-wrap">{data.questions || '1. ___________________________\n2. ___________________________\n3. ___________________________'}</p>
            </div>
            <p className="text-[9px] font-bold text-gray-700 uppercase mb-2">{i18n.t("Answers provided / additional information given")}</p>
            <div className="border border-gray-300 bg-gray-50 p-2 min-h-[60px] mb-3">
              <p className="text-[10px] text-gray-700 whitespace-pre-wrap">{data.answers || ''}</p>
            </div>
            <p className="text-[9px] text-gray-700 mb-2">{i18n.t("Any additional material not contained in this standard form has been documented in the patient's clinical notes and reviewed at this consent discussion:")}</p>
            <div className="flex items-center gap-4">
              <Checkbox checked={data.additional_material_yes} label={i18n.t("Yes")} />
              <Checkbox checked={data.additional_material_no} label={i18n.t("No")} />
            </div>
          </div>
        </div>

        {/* Part J - Clinician Declaration */}
        <div className="mb-6">
          <div className="bg-[#3B309A] text-white px-3 py-2 flex items-center mb-3">
            <span className="font-bold text-sm me-3">{i18n.t("J")}</span>
            <span className="font-bold text-xs uppercase tracking-wide">{i18n.t("Declaration of Consenting Clinician")}</span>
          </div>
          <div className="border border-gray-300 p-4">
            <p className="text-[9px] font-bold text-gray-700 uppercase mb-3">{i18n.t("I confirm that:")}</p>
            <div className="space-y-1 mb-4">
              <Checkbox checked={data.clinician_confirm} label={i18n.t("I have explained the nature, purpose, benefits, risks, and alternatives of the procedure")} />
              <Checkbox checked={data.clinician_questions_answered} label={i18n.t("I have answered all questions raised by the patient to their satisfaction")} />
              <Checkbox checked={data.clinician_capacity_assessed} label={i18n.t("I have assessed the patient's capacity to consent and believe they understand the information provided")} />
              <Checkbox checked={data.clinician_risks_documented} label={i18n.t("I have documented any patient-specific risks or complications relevant to this case")} />
            </div>

            <p className="text-[9px] font-bold text-gray-700 uppercase mb-2">{i18n.t("Capacity assessment (if applicable)")}</p>
            <div className="space-y-1 mb-4">
              <Checkbox checked={data.capacity_confirmed} label={i18n.t("Patient has confirmed capacity to consent")} />
              <Checkbox checked={data.capacity_documented} label={i18n.t("Capacity assessment documented separately in clinical notes")} />
              <Checkbox checked={data.capacity_lacks} label={i18n.t("Patient lacks capacity - appropriate legal representative consent obtained")} />
            </div>

            <p className="text-[9px] font-bold text-gray-700 uppercase mb-2">{i18n.t("Interpreter used")}</p>
            <div className="flex items-center gap-2 mb-2">
              <Checkbox checked={data.interpreter_used} label={i18n.t("Yes")} />
              <span className="text-[9px] text-gray-600">{i18n.t("Language:")}{" "}{data.interpreter_language || '________________'}</span>
              <span className="text-[9px] text-gray-600">{i18n.t("Name:")}{" "}{data.interpreter_name || '________________'}</span>
            </div>
            <Checkbox checked={data.no_interpreter} label={i18n.t("No interpreter required")} />

            <div className="grid grid-cols-2 gap-4 mt-4">
              <SignatureBlock 
                title={i18n.t("Consenting Clinician")}
                signature={data.clinician_signature}
                name={data.clinician_name}
                designation={data.clinician_designation}
                date={data.clinician_date}
                time={data.clinician_time}
              />
              <SignatureBlock 
                title={i18n.t("Supervising Consultant Surgeon / Interventional Radiologist")}
                signature={data.supervisor_signature}
                name={data.supervisor_name}
                designation={data.supervisor_designation}
                date={data.supervisor_date}
                time={data.supervisor_time}
              />
            </div>
          </div>
        </div>

        {/* Part K - Patient Consent Declaration */}
        <div className="mb-6">
          <div className="bg-[#3B309A] text-white px-3 py-2 flex items-center mb-3">
            <span className="font-bold text-sm me-3">{i18n.t("K")}</span>
            <span className="font-bold text-xs uppercase tracking-wide">{i18n.t("Patient Consent Declaration")}</span>
          </div>
          <div className="border border-gray-300 p-4">
            <p className="text-[9px] font-bold text-gray-700 uppercase mb-3">{i18n.t("Patient / Authorised Representative Declaration")}</p>
            <div className="space-y-1 mb-4">
              <Checkbox checked={data.patient_understood} label={i18n.t("I have read or had read to me the information in this consent form")} />
              <Checkbox checked={data.patient_risks_understood} label={i18n.t("I understand the nature, purpose, benefits, and risks of the procedure")} />
              <Checkbox checked={data.patient_alternatives_understood} label={i18n.t("I understand the alternatives to this procedure and their risks")} />
              <Checkbox checked={data.patient_anaesthesia_consent} label={i18n.t("I consent to the administration of anaesthesia/sedation as planned")} />
              <Checkbox checked={data.patient_withdrawal_right} label={i18n.t("I understand I have the right to withdraw consent at any time before the procedure begins")} />
              <Checkbox checked={data.patient_observation_consent} label={i18n.t("I consent to the observation of this procedure for training purposes")} />
              <Checkbox checked={data.patient_additional_procedures} label={i18n.t("I consent to any additional procedures that may become necessary during the course of this intervention")} />
            </div>

            <div className="bg-gray-100 border border-gray-400 p-3 mt-4 mb-4">
              <p className="text-xs font-bold text-center text-gray-900 uppercase">{i18n.t("I GIVE MY INFORMED CONSENT to proceed with C-arm guided Inferior Vena Cava (IVC) Filter Insertion")}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <SignatureBlock 
                title={i18n.t("Patient Signature")}
                signature={data.patient_signature}
                name={data.patient_name_print}
                designation={data.patient_designation}
                date={data.patient_date}
                time={data.patient_time}
              />
              <SignatureBlock 
                title={i18n.t("Witness to Patient Signature (if patient unable to sign independently)")}
                signature={data.witness_signature}
                name={data.witness_name}
                designation={data.witness_designation}
                date={data.witness_date}
                time={data.witness_time}
              />
            </div>
          </div>
        </div>

        {/* Part M - Withdrawal of Consent */}
        <div className="mb-6">
          <div className="bg-[#3B309A] text-white px-3 py-2 flex items-center mb-3">
            <span className="font-bold text-sm me-3">{i18n.t("M")}</span>
            <span className="font-bold text-xs uppercase tracking-wide">{i18n.t("Withdrawal of Consent")}</span>
          </div>
          <div className="border border-gray-300 p-4">
            <p className="text-[9px] text-gray-700 mb-3">{i18n.t("If the patient wishes to withdraw consent before the procedure begins, complete this section:")}</p>
            <FormField label={i18n.t("Reason for withdrawal")} value={data.withdraw_reason} colSpan={3} underline />
            <div className="mt-4">
              <SignatureBlock 
                title={i18n.t("Patient Signature (Withdrawal)")}
                signature={data.withdraw_signature}
                name={data.withdraw_name}
                designation=""
                date={data.withdraw_date}
                time={data.withdraw_time}
              />
            </div>
          </div>
        </div>

        {/* Part N - Pre-Procedure Checklist */}
        <div className="mb-6">
          <div className="bg-[#3B309A] text-white px-3 py-2 flex items-center mb-3">
            <span className="font-bold text-sm me-3">{i18n.t("N")}</span>
            <span className="font-bold text-xs uppercase tracking-wide">{i18n.t("Immediate Pre-Procedure Checklist")}</span>
          </div>
          <div className="border border-gray-300 p-4">
            <p className="text-[9px] font-bold text-gray-700 uppercase mb-3">{i18n.t("To be completed by nursing staff immediately prior to procedure")}</p>
            <div className="space-y-1 mb-4">
              <Checkbox checked={data.checklist_identity} label={i18n.t("Identity confirmed (patient name, DOB, MRN)")} />
              <Checkbox checked={data.checklist_consent} label={i18n.t("Consent form signed and witnessed")} />
              <Checkbox checked={data.checklist_allergies} label={i18n.t("Allergies checked and documented")} />
              <Checkbox checked={data.checklist_renal} label={i18n.t("Renal function checked (if applicable)")} />
              <Checkbox checked={data.checklist_pregnancy} label={i18n.t("Pregnancy status confirmed (if applicable)")} />
              <Checkbox checked={data.checklist_fasting} label={i18n.t("Fasting status confirmed (if applicable)")} />
              <Checkbox checked={data.checklist_iv_access} label={i18n.t("IV access established")} />
              <Checkbox checked={data.checklist_vitals} label={i18n.t("Baseline vital signs documented")} />
              <Checkbox checked={data.checklist_equipment} label={i18n.t("Equipment ready and functional")} />
              <Checkbox checked={data.checklist_sterile_pack} label={i18n.t("Sterile pack / interventional tray prepared and counted; surgical safety checklist initiated")} />
              <Checkbox checked={data.checklist_patient_fasted} label={i18n.t("Patient fasted as appropriate (minimum 4 hours for solids; 2 hours for clear fluids if sedation planned)")} />
              <Checkbox checked={data.checklist_vitals_recorded} label={i18n.t("Vital signs recorded (BP, HR, SpO2, RR) — pre-procedure baseline documented")} />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <SignatureBlock 
                title={i18n.t("Circulating Nurse (pre-procedure check)")}
                signature={data.circulating_nurse_signature}
                name={data.circulating_nurse_name}
                designation={data.circulating_nurse_designation}
                date={data.circulating_nurse_date}
                time={data.circulating_nurse_time}
              />
              <SignatureBlock 
                title={i18n.t("Operator / Interventional Surgeon (confirms readiness to proceed)")}
                signature={data.operator_readiness_signature}
                name={data.operator_readiness_name}
                designation={data.operator_readiness_designation}
                date={data.operator_readiness_date}
                time={data.operator_readiness_time}
              />
            </div>
          </div>
        </div>

        {/* Part O - Procedure Record */}
        <div className="mb-6 page-break-before">
          <div className="bg-[#3B309A] text-white px-3 py-2 flex items-center mb-3">
            <span className="font-bold text-sm me-3">{i18n.t("O")}</span>
            <span className="font-bold text-xs uppercase tracking-wide">{i18n.t("Procedure Record (Operator Use Only)")}</span>
          </div>
          <div className="border border-gray-300 p-4">
            <p className="text-[9px] font-bold text-gray-700 uppercase mb-3">{i18n.t("Procedure Details")}</p>
            <div className="grid grid-cols-4 gap-2 mb-4">
              <FormField label={i18n.t("Procedure Date")} value={data.procedure_date} colSpan={1} />
              <FormField label={i18n.t("Start Time")} value={data.start_time} colSpan={1} />
              <FormField label={i18n.t("End Time")} value={data.end_time} colSpan={1} />
              <FormField label={i18n.t("Total Duration (min)")} value={data.total_duration} colSpan={1} />
            </div>

            <p className="text-[9px] font-bold text-gray-700 uppercase mb-3">{i18n.t("Personnel")}</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <FormField label={i18n.t("Operating Surgeon / Interventionalist")} value={data.operating_surgeon} colSpan={2} underline />
              <FormField label={i18n.t("MDCN Reg. No.")} value={data.mdcn_no} colSpan={1} underline />
              <FormField label={i18n.t("Assisting Clinician (if applicable)")} value={data.assisting_clinician} colSpan={1} underline />
              <FormField label={i18n.t("Anaesthetist / Sedationist")} value={data.anaesthetist} colSpan={1} underline />
              <FormField label={i18n.t("Circulating Nurse / Scrub")} value={data.circulating_nurse} colSpan={1} underline />
              <FormField label={i18n.t("Radiographer (if separate)")} value={data.radiographer} colSpan={2} underline />
            </div>

            <p className="text-[9px] font-bold text-gray-700 uppercase mb-3">{i18n.t("Device Details")}</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <FormField label={i18n.t("Filter Brand/Model")} value={data.filter_brand} colSpan={1} underline />
              <FormField label={i18n.t("Batch / Lot Number")} value={data.batch_lot} colSpan={1} underline />
              <FormField label={i18n.t("Expiry Date")} value={data.expiry_date} colSpan={1} underline />
              <FormField label={i18n.t("Filter Size")} value={data.filter_size} colSpan={1} underline />
              <FormField label={i18n.t("Cone Diameter")} value={data.cone_diameter} colSpan={1} underline />
              <FormField label={i18n.t("Manufacturer")} value={data.manufacturer} colSpan={1} underline />
              <FormField label={i18n.t("NAFDAC Reg. No.")} value={data.nafdac_no} colSpan={2} underline />
            </div>
            <div className="mb-4">
              <p className="text-[9px] font-bold text-gray-700 uppercase mb-2">{i18n.t("Filter Type")}</p>
              <div className="flex gap-4">
                <Checkbox checked={data.filter_type === 'Permanent'} label={i18n.t("Permanent")} />
                <Checkbox checked={data.filter_type === 'Retrievable'} label={i18n.t("Retrievable")} />
              </div>
            </div>

            <p className="text-[9px] font-bold text-gray-700 uppercase mb-3">{i18n.t("Procedural Details")}</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <FormField label={i18n.t("Venous Access Site Used")} value={data.access_site_used} colSpan={1} underline />
              <FormField label={i18n.t("Sheath Size (French)")} value={data.sheath_size} colSpan={1} underline />
              <FormField label={i18n.t("Contrast Agent Used")} value={data.contrast_agent} colSpan={1} underline />
              <FormField label={i18n.t("Volume (mL)")} value={data.contrast_volume} colSpan={1} underline />
              <FormField label={i18n.t("Concentration")} value={data.contrast_concentration} colSpan={2} underline />
            </div>
            <div className="mb-4">
              <p className="text-[9px] font-bold text-gray-700 uppercase mb-2">{i18n.t("Filter Position")}</p>
              <div className="flex gap-4 mb-2">
                <Checkbox checked={data.filter_position === 'Infra-renal'} label={i18n.t("Infra-renal (standard)")} />
                <Checkbox checked={data.filter_position === 'Supra-renal'} label={i18n.t("Supra-renal (state reason below)")} />
                <Checkbox checked={data.filter_position === 'Other'} label={i18n.t("Other")} />
              </div>
              <FormField label={i18n.t("Supra-renal placement reason (if applicable)")} value={data.supra_renal_reason} colSpan={3} underline />
            </div>
            <div className="mb-4">
              <p className="text-[9px] text-gray-700 mb-2">{i18n.t("Position relative to renal veins confirmed on fluoroscopy:")}</p>
              <div className="flex gap-4">
                <Checkbox checked={data.renal_veins_confirmed} label={i18n.t("Yes")} />
                <Checkbox checked={!data.renal_veins_confirmed} label={i18n.t("No (documented in op note)")} />
              </div>
            </div>

            <p className="text-[9px] font-bold text-gray-700 uppercase mb-3">{i18n.t("Complications / Deviations from Planned Procedure")}</p>
            <div className="mb-3">
              <Checkbox checked={data.no_complications} label={i18n.t("None")} />
              <Checkbox checked={data.complications_occurred} label={i18n.t("Complications occurred (document in operation note and incident report if applicable)")} />
            </div>
            <FormField label={i18n.t("Details")} value={data.complication_details} colSpan={3} underline />

            <p className="text-[9px] font-bold text-gray-700 uppercase mb-3 mt-4">{i18n.t("Post-Procedure Details")}</p>
            <div className="mb-3">
              <p className="text-[9px] text-gray-700 mb-2">{i18n.t("Post-procedure access site:")}</p>
              <div className="flex gap-4">
                <Checkbox checked={data.haemostasis_achieved} label={i18n.t("Haemostasis achieved")} />
                <Checkbox checked={data.pressure_dressing} label={i18n.t("Pressure dressing applied")} />
                <Checkbox checked={data.closure_device} label={i18n.t("Closure device used")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <FormField label={i18n.t("Fluoroscopy Time (minutes)")} value={data.fluoroscopy_time} colSpan={1} underline />
              <FormField label={i18n.t("Radiation Dose (mGy or mGycm²)")} value={data.radiation_dose} colSpan={1} underline />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <SignatureBlock 
                title={i18n.t("Operator Signature (post-procedure)")}
                signature={data.operator_post_signature}
                name={data.operator_post_name}
                designation={data.operator_post_designation}
                date={data.operator_post_date}
                time={data.operator_post_time}
              />
              <SignatureBlock 
                title={i18n.t("Consultant Counter-Signature (if operator is a trainee)")}
                signature={data.consultant_counter_signature}
                name={data.consultant_counter_name}
                designation=""
                date={data.consultant_counter_date}
                time={data.consultant_counter_time}
              />
            </div>
          </div>
        </div>

        {/* Part P - Post-Procedure Instructions */}
        <div className="mb-6">
          <div className="bg-[#3B309A] text-white px-3 py-2 flex items-center mb-3">
            <span className="font-bold text-sm me-3">{i18n.t("P")}</span>
            <span className="font-bold text-xs uppercase tracking-wide">{i18n.t("Post-Procedure Instructions Given to Patient")}</span>
          </div>
          <div className="border border-gray-300 p-4">
            <div className="space-y-1 mb-4">
              <Checkbox checked={data.bed_rest} label={i18n.t("Bed rest for a minimum of 2-4 hours after the procedure")} />
              <Checkbox checked={data.nursing_observations} label={i18n.t("Nursing observations of access site, vital signs and urine output for a minimum of 2 hours post-procedure")} />
              <Checkbox checked={data.report_symptoms} label={i18n.t("Report immediately to the nursing team: swelling or bleeding at the access site; pain in the groin or neck; difficulty breathing; chest pain; palpitations; leg swelling")} />
            </div>

            <div className="mb-4">
              <p className="text-[9px] text-gray-700 mb-2">{i18n.t("Anticoagulation plan post-procedure discussed and prescribed:")}</p>
              <div className="flex gap-4 mb-2">
                <Checkbox checked={data.anticoagulation_continue} label={i18n.t("Continue")} />
                <Checkbox checked={data.anticoagulation_not_planned} label={i18n.t("Not planned")} />
              </div>
              <FormField label={i18n.t("Restart Date")} value={data.anticoagulation_restart_date} colSpan={2} underline />
            </div>

            <div className="space-y-1 mb-4">
              <Checkbox checked={data.discharge_instructions} label={i18n.t("Discharge instructions provided in writing (if applicable)")} />
              <Checkbox checked={data.retrieval_plan_discussed} label={i18n.t("Retrieval plan discussed and follow-up booked (retrievable filter only)")} />
            </div>
            <FormField label={i18n.t("Retrieval Follow-up Date")} value={data.retrieval_followup_date} colSpan={2} underline />

            <div className="space-y-1 mb-4">
              <Checkbox checked={data.inform_providers} label={i18n.t("Patient advised to inform all future healthcare providers of IVC filter presence and type")} />
              <Checkbox checked={data.filter_card_provided} label={i18n.t("Patient provided with filter implant card/documentation for their wallet")} />
            </div>

            <div className="border-t border-gray-300 pt-3 mt-4">
              <p className="text-[9px] font-bold text-gray-700 uppercase mb-2">{i18n.t("Nurse Confirming Instructions Given (print & sign)")}</p>
              <div className="grid grid-cols-2 gap-2">
                <FormField label={i18n.t("Full Name")} value={data.nurse_instructions_name} colSpan={2} underline />
                <FormField label={i18n.t("Designation")} value={data.nurse_instructions_designation} colSpan={1} underline />
                <FormField label={i18n.t("Date")} value={data.nurse_instructions_date} colSpan={1} underline />
              </div>
              <div className="mt-2">
                {data.nurse_instructions_signature ? (
                  <img src={data.nurse_instructions_signature} alt={i18n.t("Nurse Signature")} className="h-12 w-32 object-contain" />
                ) : (
                  <div className="border-b border-gray-400 h-12 w-32"></div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center border-t border-gray-300 pt-4 mt-8">
          <p className="text-[8px] text-gray-500">{i18n.t("Medbookie • Medbookie Limited Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos, Nigeria Lagos State, Nigeria.")}</p>
          <p className="text-[8px] text-gray-500">{i18n.t("+234 705 648 2776 • info@Medbookiehospital.com")}</p>
          <p className="text-[8px] text-gray-400 mt-2">{i18n.t("Document: GSH-T6 IVC Filter Consent Form • Version 1.0 •")}{" "}{new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default IVCFilterConsentPrintTemplate;
