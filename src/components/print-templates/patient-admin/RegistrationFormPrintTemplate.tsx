import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { patientService } from '../../../services/patient.service';
import { Loader2, AlertTriangle, Printer } from 'lucide-react';
import { i18n } from "../../../i18n";

const RegistrationFormPrintTemplate: React.FC = () => {
  const { mrn } = useParams<{ mrn: string }>();
  const [data, setData] = useState<any>(null);
  const [payerTypes, setPayerTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Payer Types for the checklist
        const pTypes = await patientService.getPayerTypes();
        setPayerTypes(pTypes || []);

        if (!mrn) {
          setLoading(false);
          setTimeout(() => window.print(), 1000);
          return;
        }

        const result = await patientService.getPatientByMrn(mrn);
        if (result) {
          setData(result);
          setTimeout(() => window.print(), 1000);
        } else {
          setError('Patient not found.');
        }
      } catch (err) {
        setError('Could not load patient record or metadata.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [mrn]);

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

  const FormField = ({ label, value, required = false, colSpan = 1 }: { label: string; value?: string; required?: boolean, colSpan?: number }) => (
    <div className={`col-span-${colSpan} mb-3`}>
      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ms-1">
        {label} {required && <span className="text-red-500">*</span>}
      </p>
      <div className="w-full h-9 border border-slate-200 bg-slate-50/50 rounded flex items-center px-2 shadow-sm">
        <span className="text-sm font-bold text-slate-800 uppercase">{value || ''}</span>
      </div>
    </div>
  );

  const SectionHeader = ({ char, title }: { char: string; title: string }) => (
    <div className="w-full bg-[#3B309A] flex items-center mb-6 mt-8 rounded-sm">
      <div className="w-12 h-8 flex items-center justify-center text-white font-extrabold text-sm border-e border-[#4c3fbf]">
        {char}
      </div>
      <div className="ps-4 text-white font-extrabold text-[12px] uppercase tracking-widest">
        {title}
      </div>
    </div>
  );

  const nok = data?.emergency_contacts?.find((c: any) => c.is_primary === 1) || data?.emergency_contacts?.[0];

  return (
    <div
      className="fixed inset-0 bg-slate-100 overflow-y-auto px-4 py-20 print:static print:bg-white print:p-0"
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      <div className="fixed top-0 start-0 end-0 h-16 bg-slate-900 text-white flex items-center justify-between px-8 print:hidden z-[100] shadow-md">
        <p className="font-bold text-sm">{i18n.t("Registration Form Preview")}</p>
        <button onClick={() => window.print()} className="bg-[#2d258a] hover:bg-brand-primary text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all">
          <Printer size={16} />{" "}{i18n.t("Print Form")}</button>
      </div>

      <div className="w-[210mm] min-h-[297mm] bg-white p-12 shadow-2xl print:shadow-none print:m-0 print:border-none border border-slate-200 mx-auto transform-gpu transition-all">
        {/* Header Block exactly like Image 2 */}
        <div className="w-full bg-[#3B309A] flex items-center p-4 min-h-[28mm]">
          <div className="w-[25%] flex items-center justify-center border-e-[1.5px] border-[#4c3fbf] pe-4 h-full">
            <img src="/assets/login-bg.jpeg" alt={i18n.t("Logo")} className="w-[20mm] object-contain" />
          </div>
          <div className="w-[75%] ps-6 flex flex-col justify-center">
            <h1 className="text-white text-3xl font-extrabold leading-none tracking-tight mb-2">{i18n.t("Patient Registration & Enrollment Form")}</h1>
            <p className="text-brand-active text-[10px] leading-tight">{i18n.t("Complete all sections fully and accurately. Fields marked")}{" "}<span className="text-red-300">*</span>{" "}{i18n.t("are required. Return the signed form to hospital records with certified copies of all supporting documents.")}</p>
          </div>
        </div>

        {/* Address Bar */}
        <div className="w-full text-center py-2 border-b border-slate-200">
          <p className="text-[8px] text-slate-500 font-medium">{i18n.t("Head Office: Medbookie Limited Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos, Nigeria Lagos State, Nigeria.  •  +234 705 648 2776  •  info@Medbookiehospital.com")}</p>
        </div>

        {/* Section A */}
        <SectionHeader char="A" title={i18n.t("PERSONAL & BIO DATA")} />

        <div className="grid grid-cols-4 gap-x-4">
          <FormField label={i18n.t("TITLE")} colSpan={1} value="" required />
          <FormField label={i18n.t("FIRST NAME")} colSpan={1} value={data?.demographics?.first_name} required />
          <FormField label={i18n.t("MIDDLE NAME")} colSpan={1} value={data?.demographics?.middle_name} />
          <FormField label={i18n.t("LAST NAME / SURNAME")} colSpan={1} value={data?.demographics?.last_name} required />

          <FormField label={i18n.t("DATE OF BIRTH")} colSpan={1} value={data?.demographics?.date_of_birth} required />
          <FormField label={i18n.t("GENDER")} colSpan={1} value={data?.demographics?.gender} required />
          <FormField label={i18n.t("MARITAL STATUS")} colSpan={1} value={data?.demographics?.marital_status} />
          <FormField label={i18n.t("NATIONALITY")} colSpan={1} value={data?.demographics?.nationality} required />

          <FormField label={i18n.t("STATE / COUNTY OF ORIGIN")} colSpan={1} value={data?.demographics?.state_of_origin} />
          <FormField label={i18n.t("LGA OF ORIGIN")} colSpan={1} value={data?.demographics?.lga} />
          <FormField label={i18n.t("MOBILE NUMBER")} colSpan={1} value={data?.demographics?.phone} required />
          <FormField label={i18n.t("PERSONAL EMAIL ADDRESS")} colSpan={1} value={data?.demographics?.email} required />

          <div className="col-span-4">
            <FormField label={i18n.t("RESIDENTIAL ADDRESS")} colSpan={4} value={data?.demographics?.address} required />
          </div>
        </div>

        {/* Section B */}
        <SectionHeader char="B" title={i18n.t("NEXT OF KIN / EMERGENCY CONTACT")} />

        <div className="grid grid-cols-4 gap-x-4">
          <div className="col-span-2">
            <FormField label={i18n.t("FULL NAME")} colSpan={2} value={nok?.full_name} required />
          </div>
          <FormField label={i18n.t("RELATIONSHIP")} colSpan={1} value={nok?.relationship} required />
          <FormField label={i18n.t("PRIMARY PHONE")} colSpan={1} value={nok?.phone} required />

          <div className="col-span-4">
            <FormField label={i18n.t("CONTACT / RESIDENTIAL ADDRESS")} colSpan={4} value={nok?.address} required />
          </div>
        </div>

        {/* Section C: Medical Information */}
        <SectionHeader char="C" title={i18n.t("MEDICAL PROFILE & CLINICAL DATA")} />

        <div className="grid grid-cols-4 gap-x-4">
          <FormField label={i18n.t("BLOOD GROUP")} colSpan={1} value={data?.medical_profile?.blood_group} />
          <FormField label={i18n.t("GENOTYPE")} colSpan={1} value={data?.medical_profile?.genotype} />
          <div className="col-span-2">
            <FormField label={i18n.t("KNOWN ALLERGIES")} colSpan={2} value={data?.medical_profile?.known_allergies} />
          </div>

          <div className="col-span-2">
            <FormField label={i18n.t("CHRONIC CONDITIONS")} colSpan={2} value={data?.medical_profile?.chronic_conditions} />
          </div>
          <div className="col-span-2">
            <FormField label={i18n.t("SPECIAL MEDICAL ALERTS")} colSpan={2} value={data?.medical_profile?.special_alerts} />
          </div>
        </div>

        {/* Section D: Payer & Billing */}
        <SectionHeader char="D" title={i18n.t("BILLING / METHOD OF PAYMENT")} />

        <div className="mb-4">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-3 ms-1">{i18n.t("SELECT CATEGORY OF PAYMENT *")}</p>
          <div className="grid grid-cols-4 gap-4 bg-slate-50/50 p-4 rounded-lg border border-slate-200">
            {(payerTypes.length > 0 ? payerTypes : [
              { code: 'CASH', name: 'Cash Pay' },
              { code: 'HMO', name: 'HMO' },
              { code: 'CORPORATE', name: 'Corporate' },
              { code: 'NGO', name: 'NGO' },
              { code: 'NHIS', name: 'NHIS' },
              { code: 'PRIVATE', name: 'Private' }
            ]).map((type) => (
              <div key={type.code} className="flex items-center gap-2">
                <div className={`w-4 h-4 border ${data?.payer?.payer_type === type.code ? 'bg-[#3B309A] border-[#3B309A]' : 'border-slate-400 bg-white'} rounded flex items-center justify-center`}>
                  {data?.payer?.payer_type === type.code && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                </div>
                <span className="text-[10px] font-bold text-slate-700 uppercase">{type.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={i18n.t("PROVIDER / PAYER NAME")} value={data?.payer?.payer_name} />
          <FormField label={i18n.t("POLICY / STAFF NUMBER")} value={data?.payer?.policy_number} />
        </div>

        {/* Signatures */}
        <div className="mt-12 pt-8 border-t border-slate-200 flex justify-between">
          <div className="w-[45%]">
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-10 text-center">{i18n.t("Applicant Signature")}</p>
            <div className="border-b-2 border-slate-300 w-full mb-2"></div>
            <p className="text-[8px] font-medium text-slate-400 uppercase tracking-widest text-center">{i18n.t("Date (DD/MM/YYYY)")}</p>
          </div>
          <div className="w-[45%]">
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-10 text-center">{i18n.t("Authorizing Administrator Signature")}</p>
            <div className="border-b-2 border-slate-300 w-full mb-2"></div>
            <p className="text-[8px] font-medium text-slate-400 uppercase tracking-widest text-center">{i18n.t("Date (DD/MM/YYYY)")}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationFormPrintTemplate;
