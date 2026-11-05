import React, { useState, useEffect } from "react";
import {
  XCircle,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  Printer,
  ArrowLeft,
} from "lucide-react";
import {
  consentService,
  Consent,
  ConsentMetadata,
  ConsentTemplate
} from "../services/consent.service";
import { otService } from "../services/ot.service";
import ConsentPrintView from "./ConsentPrintView";
import { BASE_URL } from "../api/client";
import SignaturePad from "./SignaturePad";
import { useNotification } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";
import { createPortal } from "react-dom";

// Standard Form Imports
import IvcFilterConsentForm from "./consent-templates/IvcFilterConsentForm";
import IVCFilterConsentPrintTemplate from "./print-templates/theatre/IVCFilterrConsentPrintTemplate";
import GeneralConsentForm from "./consent-templates/GeneralConsentForm";
import CsDeliveryConsentForm from "./consent-templates/CsDeliveryConsentForm";
import CsDeliveryConsentPrintTemplate from "./print-templates/theatre/CsDeliveryConsentPrintTemplate";
import ChemicalPleurodesisConsentForm from "./consent-templates/ChemicalPleurodesisConsentForm";
import ChemicalPleurodesisPrintTemplate from "./print-templates/theatre/ChemicalPleurodesisPrintTemplate";
import DynamicConsentForm from "./consent-templates/DynamicConsentForm";
import DynamicConsentPrintTemplate from "./print-templates/theatre/DynamicConsentPrintTemplate";

// Specific Custom Forms
import AtrialMyxomaConsentForm from "./consent-templates/AtrialMyxomaConsentForm";
import AtrialMyxomaConsentPrintTemplate from "./print-templates/theatre/AtrialMyxomaConsentPrintTemplate";
import AsdPdaRepairConsentForm from "./consent-templates/ASDRepairPDAClosure";
import AsdPdaRepairConsentPrintTemplate from "./print-templates/theatre/AsdPdaRepairConsentPrintTemplate";

export interface OTSurgery {
  id: number;
  order_id?: number;
  mrn: string;
  first_name: string;
  last_name: string;
  surgery_name: string;
  ot_case_number: string;
  [key: string]: any;
}

const DYNAMIC_TEMPLATE_MATCHERS: { test: (name: string) => boolean; slug: string }[] = [
  { test: (n) => n.includes("THORACOSTOMY") || n.includes("CHEST TUBE"), slug: "closed_Thoracostomy_Tube_Drainage" },
  { test: (n) => n.includes("HAEMODIALYSIS") || n.includes("HEMODIALYSIS") || n.includes("HDF") || n.includes("DIALYSIS"), slug: "Haemodialysis_HDF_Consent_Form" },
  { test: (n) => n.includes("AORTIC VALVE"), slug: "Aortic_Valve_Replacement" },
  { test: (n) => n.includes("APPENDICECTOMY") || n.includes("APPENDIX"), slug: "Appendicectomy" },
  { test: (n) => (n.includes("ATRIAL SEPTAL") || n.includes("ASD")) && !n.includes("PDA"), slug: "Atrial_Septal_Defect_(ASD)_Repair" },
  { test: (n) => n.includes("INGUINAL HERNIA"), slug: "Inguinal_Hernia_Repair" },
  { test: (n) => n.includes("COARCTATION"), slug: "Coarctation_of_the_Aorta_Repair_Consent" },
  { test: (n) => n.includes("LAPAROSCOPIC") && (n.includes("HIGH ANTERIOR") || n.includes("HAR")), slug: "Laparoscopic_High_Anterior_Resection" },
  { test: (n) => n.includes("HEMICOLECTOMY"), slug: "Laparoscopic_Right_Hemicolectomy" },
  { test: (n) => n.includes("LAPAROSCOPIC") && n.includes("CHOLECYSTECTOMY"), slug: "Laparoscopic_Cholecystectomy" },
  { test: (n) => n.includes("MITRAL VALVE"), slug: "Mitral_Valve_Repair" },
  { test: (n) => n.includes("COLECTOMY") && !n.includes("HEMICOLECTOMY") && !n.includes("LAPAROSCOPIC"), slug: "Open_Colectomy" },
  { test: (n) => n.includes("HIGH ANTERIOR") && !n.includes("LAPAROSCOPIC"), slug: "Open_High_Anterior_Resection" },
  { test: (n) => n.includes("TETRALOGY") || n.includes("FALLOT"), slug: "Tetralogy_of_Fallot_(TOF)_Repair" },
  { test: (n) => n.includes("VENTRICULAR SEPTAL") || (n.includes("VSD") && n.includes("REPAIR")), slug: "Ventricular_Septal_Defect_(VSD)_Repair" },
];

const matchDynamicTemplateSlug = (procedureName?: string): string | null => {
  if (!procedureName) return null;
  const upper = procedureName.toUpperCase();
  const match = DYNAMIC_TEMPLATE_MATCHERS.find((m) => m.test(upper));
  return match ? match.slug : null;
};

interface ConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: "SURGERY" | "GENERAL" | "LAB" | "RADIOLOGY" | "PROCEDURE";
  entityId: number;
  encounterNumber: string;
  patientName: string;
  mrn: string;
  procedureName: string;
  orderId?: number;
  surgery?: OTSurgery;
  onSuccess?: () => void;
  onBackToActions?: () => void;
}

const ConsentModal: React.FC<ConsentModalProps> = ({
  isOpen,
  onClose,
  entityType,
  entityId,
  encounterNumber,
  patientName,
  mrn,
  procedureName,
  orderId,
  surgery,
  onSuccess,
  onBackToActions,
}) => {
  const { notify } = useNotification();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [metadata, setMetadata] = useState<ConsentMetadata | null>(null);
  const [existingConsent, setExistingConsent] = useState<Consent | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [isPrintViewOpen, setIsPrintViewOpen] = useState(false);
  
  // Specific Form States
  const [showIvcForm, setShowIvcForm] = useState(false);
  const [ivcFormData, setIvcFormData] = useState<any>(null);
  
  const [showCsForm, setShowCsForm] = useState(false);
  const [csFormData, setCsFormData] = useState<any>(null);
  
  const [showPleurodesisForm, setShowPleurodesisForm] = useState(false);
  const [pleurodesisFormData, setPleurodesisFormData] = useState<any>(null);
  
  const [showMyxomaForm, setShowMyxomaForm] = useState(false);
  const [myxomaFormData, setMyxomaFormData] = useState<any>(null);

  const [showAsdPdaForm, setShowAsdPdaForm] = useState(false);
  const [asdPdaFormData, setAsdPdaFormData] = useState<any>(null);

  const [dynamicSlug, setDynamicSlug] = useState<string | null>(null);
  const [dynamicFormData, setDynamicFormData] = useState<any>(null);
  const [dynamicTemplate, setDynamicTemplate] = useState<ConsentTemplate | null>(null);

  // Draft States
  const [isDraft, setIsDraft] = useState(false);
  const [draftId, setDraftId] = useState<number | null>(null);

  useEffect(() => {
    const pName = procedureName?.toUpperCase() || "";
    const isIvcFilter = pName.includes("IVC") && pName.includes("FILTER");
    const isCsDelivery = pName.includes("CAESAR") || pName.includes("C/S") || pName.includes("LSCS") || pName.includes("C-SECTION") || pName.includes("DELIVERY");
    const isPleurodesis = pName.includes("PLEUROD");
    const isMyxoma = pName.includes("MYXOMA");
    const isAsdPda = pName.includes("ASD") && pName.includes("PDA");

    setShowIvcForm(isIvcFilter);
    setShowCsForm(isCsDelivery);
    setShowPleurodesisForm(isPleurodesis);
    setShowMyxomaForm(isMyxoma);
    setShowAsdPdaForm(isAsdPda);

    if (isIvcFilter || isCsDelivery || isPleurodesis || isMyxoma || isAsdPda) {
      setDynamicSlug(null);
    } else {
      setDynamicSlug(matchDynamicTemplateSlug(procedureName));
    }
  }, [procedureName]);

  useEffect(() => {
    if (isPrintViewOpen && (ivcFormData || csFormData || pleurodesisFormData || myxomaFormData || asdPdaFormData || dynamicFormData)) {
      const printId = ivcFormData ? 'ivc-print-content' : 
                      csFormData ? 'cs-print-content' : 
                      pleurodesisFormData ? 'pleurodesis-print-content' : 
                      myxomaFormData ? 'myxoma-print-content' : 
                      asdPdaFormData ? 'asd-p-print-content' : 'dynamic-print-content';
                      
      const printTitle = ivcFormData ? 'IVC Filter' : 
                         csFormData ? 'Caesarean Section' : 
                         pleurodesisFormData ? 'Chemical Pleurodesis' : 
                         myxomaFormData ? 'Atrial Myxoma' : 
                         asdPdaFormData ? 'ASD & PDA Repair' : (dynamicTemplate?.display_name || 'Procedure');
                         
      const timer = setTimeout(() => {
        const printContent = document.getElementById(printId);
        if (printContent) {
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(`
              <html>
                <head>
                  <title>${printTitle} Consent - Print</title>
                  <script src="https://cdn.tailwindcss.com"></script>
                  <style>
                    @media print {
                      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                      .page-break-before { page-break-before: always; }
                      .page-break-after { page-break-after: always; }
                    }
                  </style>
                </head>
                <body>${printContent.innerHTML}</body>
                <script>
                  window.onload = () => {
                    setTimeout(() => {
                      window.print();
                    }, 500);
                  }
                </script>
              </html>
            `);
            printWindow.document.close();
          }
        }
        setIsPrintViewOpen(false);
        onClose();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isPrintViewOpen, ivcFormData, csFormData, pleurodesisFormData, myxomaFormData, asdPdaFormData, dynamicFormData, dynamicTemplate, onClose]);

  const witnessUserId = user?.id;

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, entityId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const meta = await consentService.getStates();
      setMetadata(meta);

      const allConsents = await consentService.getAllConsents({
          encounter_number: encounterNumber,
          entity_type: entityType,
          entity_id: entityId 
      });

      let found = allConsents.find(
        (c) =>
          c.context === entityType &&
          ["SIGNED", "DRAFT"].includes(c.status_slug) &&
          (c.reference_id === orderId || c.reference_id === entityId || c.entity_id === entityId)
      );

      if (!found) {
        found = allConsents.find(
          (c) =>
            c.entity_type_slug === entityType &&
            c.entity_id === entityId &&
            ["SIGNED", "DRAFT"].includes(c.status_slug)
        );
      }

      if (!found && entityType !== "SURGERY") {
        found = allConsents.find(
          (c) =>
            c.context === entityType &&
            c.encounter_number === encounterNumber &&
            ["SIGNED", "DRAFT"].includes(c.status_slug) &&
            c.consent_form_name === `${procedureName} Consent`
        );
      }

      if (found) {
        setExistingConsent(found);
        setIsDraft(found.status_slug === "DRAFT");
        setDraftId(found.id);
      } else {
        setExistingConsent(null);
        setIsDraft(false);
        setDraftId(null);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || "Failed to load consent data";
      notify(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-10 flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-brand-primary" size={40} />
          <p className="text-slate-500 font-bold text-sm">Loading consent...</p>
        </div>
      </div>
    );
  }

  const extConsent = existingConsent as any;

  let parsedFormData: any = null;
  if (extConsent?.form_data) {
    try {
      parsedFormData = typeof extConsent.form_data === 'string' 
        ? JSON.parse(extConsent.form_data) 
        : extConsent.form_data;
    } catch (e) {
      console.error("Failed to parse consent form_data", e);
    }
  }

  // ==========================================
  // RENDER NEW OR DRAFT CONSENTS
  // ==========================================
  if (!existingConsent || (existingConsent && isDraft)) {
    
    if (showAsdPdaForm) {
      return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <AsdPdaRepairConsentForm
            orderId={orderId || 0}
            patientName={patientName}
            mrn={mrn}
            initialData={parsedFormData} 
            draftId={draftId} 
            onCancel={onClose}
            onPrint={() => {
              setAsdPdaFormData({ patient_name: patientName, mrn });
              setIsPrintViewOpen(true);
            }}
            onSuccess={(data: any) => {
              setAsdPdaFormData(data);
              if (onSuccess) onSuccess();
              setIsPrintViewOpen(true);
            }}
          />
          {isPrintViewOpen && asdPdaFormData && createPortal(
            <div className="hidden">
              <div id="asd-pda-print-content">
                 <AsdPdaRepairConsentPrintTemplate formData={asdPdaFormData} />
              </div>
            </div>,
            document.body
          )}
          {isPrintViewOpen && asdPdaFormData && (
             <div className="fixed inset-0 z-[60] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
                <div className="relative">
                  <Loader2 className="animate-spin text-[#1e40af] mb-4" size={64} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Printer className="text-[#1e40af] animate-pulse" size={24} />
                  </div>
                </div>
                <h2 className="text-2xl font-black text-[#1e40af] tracking-tighter uppercase italic">Generating Document</h2>
                <p className="text-slate-500 font-bold mt-2 animate-pulse">Syncing checkboxes and signatures...</p>
             </div>
          )}
        </div>
      );
    }

    if (showMyxomaForm) {
      return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <AtrialMyxomaConsentForm
            orderId={orderId || 0}
            patientName={patientName}
            mrn={mrn}
            initialData={parsedFormData} 
            draftId={draftId}            
            onCancel={onClose}
            onPrint={() => {
              setMyxomaFormData({ patient_name: patientName, mrn });
              setIsPrintViewOpen(true);
            }}
            onSuccess={(data: any) => {
              setMyxomaFormData(data);
              if (onSuccess) onSuccess();
              setIsPrintViewOpen(true);
            }}
          />
          {isPrintViewOpen && myxomaFormData && createPortal(
            <div className="hidden">
              <div id="myxoma-print-content">
                 <AtrialMyxomaConsentPrintTemplate formData={myxomaFormData} />
              </div>
            </div>,
            document.body
          )}
          {isPrintViewOpen && myxomaFormData && (
             <div className="fixed inset-0 z-[60] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
                <div className="relative">
                  <Loader2 className="animate-spin text-[#1e40af] mb-4" size={64} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Printer className="text-[#1e40af] animate-pulse" size={24} />
                  </div>
                </div>
                <h2 className="text-2xl font-black text-[#1e40af] tracking-tighter uppercase italic">Generating Document</h2>
                <p className="text-slate-500 font-bold mt-2 animate-pulse">Syncing checkboxes and signatures...</p>
             </div>
          )}
        </div>
      );
    }

    if (showIvcForm) {
      return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <IvcFilterConsentForm
            orderId={orderId || 0}
            patientName={patientName}
            mrn={mrn}
            initialData={parsedFormData}
            draftId={draftId}            
            onCancel={onClose}
            onPrint={() => {
              setIvcFormData({
                patient_name: patientName,
                mrn: mrn,
                procedure_name: procedureName,
                consent_date: new Date().toISOString().split('T')[0]
              });
              setIsPrintViewOpen(true);
            }}
            onSuccess={(data: any) => {
              setIvcFormData(data);
              if (onSuccess) onSuccess();
              setIsPrintViewOpen(true);
            }}
          />
          {isPrintViewOpen && ivcFormData && createPortal(
            <div className="hidden">
              <div id="ivc-print-content">
                 <IVCFilterConsentPrintTemplate formData={ivcFormData} />
              </div>
            </div>,
            document.body
          )}
          {isPrintViewOpen && ivcFormData && (
             <div className="fixed inset-0 z-[60] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
                <div className="relative">
                  <Loader2 className="animate-spin text-[#3B309A] mb-4" size={64} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Printer className="text-[#3B309A] animate-pulse" size={24} />
                  </div>
                </div>
                <h2 className="text-2xl font-black text-[#3B309A] tracking-tighter uppercase italic">Generating Document</h2>
                <p className="text-slate-500 font-bold mt-2 animate-pulse">Syncing checkboxes and signatures...</p>
             </div>
          )}
        </div>
      );
    }

    if (showCsForm) {
      return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <CsDeliveryConsentForm
            orderId={orderId || 0}
            patientName={patientName}
            mrn={mrn}
            initialData={parsedFormData}
            draftId={draftId}            
            onCancel={onClose}
            onPrint={() => {
              setCsFormData({
                mother_name: patientName,
                mrn: mrn,
              });
              setIsPrintViewOpen(true);
            }}
            onSuccess={(data: any) => { 
              setCsFormData(data);
              if (onSuccess) onSuccess();
              setIsPrintViewOpen(true);
            }}
          />
          {isPrintViewOpen && csFormData && createPortal(
            <div className="hidden">
              <div id="cs-print-content">
                 <CsDeliveryConsentPrintTemplate formData={csFormData} />
              </div>
            </div>,
            document.body
          )}
          {isPrintViewOpen && csFormData && (
             <div className="fixed inset-0 z-[60] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
                <div className="relative">
                  <Loader2 className="animate-spin text-[#7c3aed] mb-4" size={64} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Printer className="text-[#7c3aed] animate-pulse" size={24} />
                  </div>
                </div>
                <h2 className="text-2xl font-black text-[#7c3aed] tracking-tighter uppercase italic">Generating Document</h2>
                <p className="text-slate-500 font-bold mt-2 animate-pulse">Syncing checkboxes and signatures...</p>
             </div>
          )}
        </div>
      );
    }

    if (showPleurodesisForm || (entityType === "PROCEDURE" && procedureName?.toLowerCase().includes("pleurod"))) {
      return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <ChemicalPleurodesisConsentForm
            orderId={orderId!}
            patientName={patientName}
            mrn={mrn}
            initialData={parsedFormData}
            draftId={draftId}            
            onCancel={onClose}
            onPrint={() => {
              setPleurodesisFormData({
                patient_name: patientName,
                mrn: mrn,
              });
              setIsPrintViewOpen(true);
            }}
            onSuccess={(data: any) => {
              setPleurodesisFormData(data);
              if (onSuccess) onSuccess();
              setIsPrintViewOpen(true);
            }}
          />
          {isPrintViewOpen && pleurodesisFormData && createPortal(
            <div className="hidden">
              <div id="pleurodesis-print-content">
                 <ChemicalPleurodesisPrintTemplate formData={pleurodesisFormData} />
              </div>
            </div>,
            document.body
          )}
          {isPrintViewOpen && pleurodesisFormData && (
             <div className="fixed inset-0 z-[60] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
                <div className="relative">
                  <Loader2 className="animate-spin text-[#1e40af] mb-4" size={64} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Printer className="text-[#1e40af] animate-pulse" size={24} />
                  </div>
                </div>
                <h2 className="text-2xl font-black text-[#1e40af] tracking-tighter uppercase italic">Generating Document</h2>
                <p className="text-slate-500 font-bold mt-2 animate-pulse">Syncing checkboxes and signatures...</p>
             </div>
          )}
        </div>
      );
    }

    if (dynamicSlug) {
      return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <DynamicConsentForm
            slug={dynamicSlug}
            orderId={orderId!}
            patientName={patientName}
            mrn={mrn}
            initialData={parsedFormData}
            draftId={draftId}            
            onTemplateLoaded={setDynamicTemplate}
            onCancel={onClose}
            onPrint={() => {
              setDynamicFormData({ patient_name: patientName, mrn });
              setIsPrintViewOpen(true);
            }}
            onSuccess={(data: any, tmpl: ConsentTemplate) => {
              setDynamicFormData(data);
              setDynamicTemplate(tmpl);
              if (onSuccess) onSuccess();
              setIsPrintViewOpen(true);
            }}
          />
          {isPrintViewOpen && dynamicFormData && dynamicTemplate && createPortal(
            <div className="hidden">
              <div id="dynamic-print-content">
                <DynamicConsentPrintTemplate formData={dynamicFormData} templateData={dynamicTemplate} />
              </div>
            </div>,
            document.body
          )}
          {isPrintViewOpen && dynamicFormData && (
             <div className="fixed inset-0 z-[60] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
                <div className="relative">
                  <Loader2 className="animate-spin text-[#1e40af] mb-4" size={64} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Printer className="text-[#1e40af] animate-pulse" size={24} />
                  </div>
                </div>
                <h2 className="text-2xl font-black text-[#1e40af] tracking-tighter uppercase italic">Generating Document</h2>
                <p className="text-slate-500 font-bold mt-2 animate-pulse">Syncing checkboxes and signatures...</p>
             </div>
          )}
        </div>
      );
    }

    // Fallback General Form 
    return (
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
        <GeneralConsentForm
          surgery={surgery || { id: entityId, order_id: orderId, mrn, first_name: patientName.split(' ')[0], last_name: patientName.split(' ').slice(1).join(' '), surgery_name: procedureName, ot_case_number: "" } as any}
          onSuccess={() => {
            if (onSuccess) onSuccess();
          }}
          onCancel={onClose}
          viewData={parsedFormData}
        />
      </div>
    );
  }

  // ==========================================
  // RENDER EXISTING CONSENTS (READ-ONLY)
  // ==========================================
  if (existingConsent && parsedFormData && !isDraft) {

    const renderReadOnlyPrintWrapper = (ContentComponent: any, PrintTemplateComponent: any, printId: string) => (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 overflow-y-auto py-8">
        <ContentComponent
          orderId={extConsent.order_id || 0}
          patientName={extConsent.first_name + " " + extConsent.last_name}
          mrn={extConsent.mrn}
          onSuccess={() => {}}
          onCancel={onClose}
          onPrint={() => {
            setIsPrintViewOpen(true);
            setTimeout(() => {
              const printContent = document.getElementById(printId);
              if (printContent) {
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                  printWindow.document.write(`
                    <html>
                      <head>
                        <title>${extConsent.consent_form_name || 'Consent'} Print</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                        <style>
                          @media print {
                            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            .page-break-before { page-break-before: always; }
                            .page-break-after { page-break-after: always; }
                          }
                        </style>
                      </head>
                      <body>${printContent.innerHTML}</body>
                      <script>
                        window.onload = () => { 
                          setTimeout(() => {
                            window.print(); 
                          }, 500);
                        }
                      </script>
                    </html>
                  `);
                  printWindow.document.close();
                }
              }
              setTimeout(() => setIsPrintViewOpen(false), 500);
            }, 1500);
          }}
          readOnly={true}
          viewData={parsedFormData}
        />
        {isPrintViewOpen && createPortal(
          <div className="hidden">
            <div id={printId}>
              <PrintTemplateComponent formData={parsedFormData} />
            </div>
          </div>,
          document.body
        )}
        {isPrintViewOpen && (
           <div className="fixed inset-0 z-[100] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
              <div className="relative">
                <Loader2 className="animate-spin text-[#1e40af] mb-4" size={64} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Printer className="text-[#1e40af] animate-pulse" size={24} />
                </div>
              </div>
              <h2 className="text-2xl font-black text-[#1e40af] tracking-tighter uppercase italic">Generating Document</h2>
              <p className="text-slate-500 font-bold mt-2 animate-pulse">Syncing signatures and loading PDF...</p>
           </div>
        )}
      </div>
    );

    if (showAsdPdaForm) {
      return renderReadOnlyPrintWrapper(AsdPdaRepairConsentForm, AsdPdaRepairConsentPrintTemplate, 'asd-p-print-content');
    }

    if (showMyxomaForm) {
      return renderReadOnlyPrintWrapper(AtrialMyxomaConsentForm, AtrialMyxomaConsentPrintTemplate, 'myxoma-print-content');
    }

    if (showIvcForm) {
      return renderReadOnlyPrintWrapper(IvcFilterConsentForm, IVCFilterConsentPrintTemplate, 'ivc-print-content');
    } 
    
    if (showCsForm) {
      return renderReadOnlyPrintWrapper(CsDeliveryConsentForm, CsDeliveryConsentPrintTemplate, 'cs-print-content');
    } 
    
    if (showPleurodesisForm) {
      return renderReadOnlyPrintWrapper(ChemicalPleurodesisConsentForm, ChemicalPleurodesisPrintTemplate, 'pleurodesis-print-content');
    } 
    
    if (dynamicSlug) {
      return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 overflow-y-auto py-8">
          <DynamicConsentForm
            slug={dynamicSlug}
            orderId={extConsent.order_id || 0}
            patientName={extConsent.first_name + " " + extConsent.last_name}
            mrn={extConsent.mrn}
            onTemplateLoaded={setDynamicTemplate}
            onSuccess={() => {}}
            onCancel={onClose}
            onPrint={() => {
              setIsPrintViewOpen(true);
              setTimeout(() => {
                const printContent = document.getElementById('dynamic-print-content');
                if (printContent) {
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>${extConsent.consent_form_name || 'Consent'} Print</title>
                          <script src="https://cdn.tailwindcss.com"></script>
                          <style>
                            @media print {
                              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                              .page-break-before { page-break-before: always; }
                              .page-break-after { page-break-after: always; }
                            }
                          </style>
                        </head>
                        <body>${printContent.innerHTML}</body>
                        <script>
                          window.onload = () => {
                            setTimeout(() => {
                              window.print();
                            }, 500);
                          }
                        </script>
                      </html>
                    `);
                    printWindow.document.close();
                  }
                }
                setTimeout(() => setIsPrintViewOpen(false), 500);
              }, 1500);
            }}
            readOnly={true}
            viewData={parsedFormData}
          />
          {isPrintViewOpen && dynamicTemplate && createPortal(
            <div className="hidden">
              <div id="dynamic-print-content">
                <DynamicConsentPrintTemplate formData={parsedFormData} templateData={dynamicTemplate} />
              </div>
            </div>,
            document.body
          )}
          {isPrintViewOpen && (
             <div className="fixed inset-0 z-[100] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
                <div className="relative">
                  <Loader2 className="animate-spin text-[#1e40af] mb-4" size={64} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Printer className="text-[#1e40af] animate-pulse" size={24} />
                  </div>
                </div>
                <h2 className="text-2xl font-black text-[#1e40af] tracking-tighter uppercase italic">Generating Document</h2>
                <p className="text-slate-500 font-bold mt-2 animate-pulse">Syncing signatures and loading PDF...</p>
             </div>
          )}
        </div>
      );
    } 
    
    // Fallback for standard General Forms 
    const fakeSurgery = {
      id: extConsent.order_id || 0,
      mrn: extConsent.mrn,
      first_name: extConsent.first_name,
      last_name: extConsent.last_name,
    } as any;
    
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 overflow-y-auto py-8">
        <GeneralConsentForm
          surgery={fakeSurgery}
          onCancel={onClose}
          readOnly={true}
          viewData={parsedFormData}
          onSuccess={() => {}} 
        />
      </div>
    );
  }

  // ==========================================
  // RENDER FALLBACK OLD LEGACY CONSENTS
  // ==========================================
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            {onBackToActions && (
              <button
                onClick={onBackToActions}
                className="p-1.5 bg-white border border-slate-200 shadow-sm text-slate-500 rounded-lg hover:bg-slate-100 transition-colors mr-1"
                title="Back to Actions"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                <FileText className="text-brand-primary" size={20} />
                View Consent
              </h3>
              <p className="text-xs text-slate-500 font-bold uppercase">
                {extConsent?.consent_form_name || procedureName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <XCircle size={24} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <div className="text-center p-8 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm">
            Legacy consent format detected. Please view Full PDF for details.
          </div>
        </div>
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors">Close</button>
          <button onClick={() => setIsPrintViewOpen(true)} className="px-6 py-3 rounded-xl font-bold text-white bg-brand-primary hover:bg-brand-primary shadow-lg shadow-brand-active transition-all flex items-center gap-2">
            <Printer size={18} /> View Full PDF
          </button>
        </div>
      </div>
      <ConsentPrintView
        isOpen={isPrintViewOpen}
        onClose={() => setIsPrintViewOpen(false)}
        consent={existingConsent}
      />
    </div>
  );
};

export default ConsentModal;


// import React, { useState, useEffect } from "react";
// import {
//   XCircle,
//   FileText,
//   CheckCircle,
//   AlertCircle,
//   Loader2,
//   Printer,
//   ArrowLeft,
// } from "lucide-react";
// import {
//   consentService,
//   Consent,
//   ConsentMetadata,
//   ConsentTemplate
// } from "../services/consent.service";
// import { otService } from "../services/ot.service";
// import ConsentPrintView from "./ConsentPrintView";
// import { BASE_URL } from "../api/client";
// import SignaturePad from "./SignaturePad";
// import { useNotification } from "../context/NotificationContext";
// import { useAuth } from "../context/AuthContext";
// import { createPortal } from "react-dom";

// // Standard Form Imports
// import IvcFilterConsentForm from "./consent-templates/IvcFilterConsentForm";
// import IVCFilterConsentPrintTemplate from "./print-templates/theatre/IVCFilterrConsentPrintTemplate";
// import GeneralConsentForm from "./consent-templates/GeneralConsentForm";
// import CsDeliveryConsentForm from "./consent-templates/CsDeliveryConsentForm";
// import CsDeliveryConsentPrintTemplate from "./print-templates/theatre/CsDeliveryConsentPrintTemplate";
// import ChemicalPleurodesisConsentForm from "./consent-templates/ChemicalPleurodesisConsentForm";
// import ChemicalPleurodesisPrintTemplate from "./print-templates/theatre/ChemicalPleurodesisPrintTemplate";
// import DynamicConsentForm from "./consent-templates/DynamicConsentForm";
// import DynamicConsentPrintTemplate from "./print-templates/theatre/DynamicConsentPrintTemplate";

// // Specific Custom Forms
// import AtrialMyxomaConsentForm from "./consent-templates/AtrialMyxomaConsentForm";
// import AtrialMyxomaConsentPrintTemplate from "./print-templates/theatre/AtrialMyxomaConsentPrintTemplate";
// import AsdPdaRepairConsentForm from "./consent-templates/ASDRepairPDAClosure";
// import AsdPdaRepairConsentPrintTemplate from "./print-templates/theatre/AsdPdaRepairConsentPrintTemplate";

// // Resolving missing OTSurgery interface
// export interface OTSurgery {
//   id: number;
//   order_id?: number;
//   mrn: string;
//   first_name: string;
//   last_name: string;
//   surgery_name: string;
//   ot_case_number: string;
//   [key: string]: any;
// }

// // Procedures matched by name to a dedicated consent template slug
// const DYNAMIC_TEMPLATE_MATCHERS: { test: (name: string) => boolean; slug: string }[] = [
//   { test: (n) => n.includes("THORACOSTOMY") || n.includes("CHEST TUBE"), slug: "closed_Thoracostomy_Tube_Drainage" },
//   { test: (n) => n.includes("HAEMODIALYSIS") || n.includes("HEMODIALYSIS") || n.includes("HDF") || n.includes("DIALYSIS"), slug: "Haemodialysis_HDF_Consent_Form" },
//   { test: (n) => n.includes("AORTIC VALVE"), slug: "Aortic_Valve_Replacement" },
//   { test: (n) => n.includes("APPENDICECTOMY") || n.includes("APPENDIX"), slug: "Appendicectomy" },
//   { test: (n) => (n.includes("ATRIAL SEPTAL") || n.includes("ASD")) && !n.includes("PDA"), slug: "Atrial_Septal_Defect_(ASD)_Repair" },
//   { test: (n) => n.includes("INGUINAL HERNIA"), slug: "Inguinal_Hernia_Repair" },
//   { test: (n) => n.includes("COARCTATION"), slug: "Coarctation_of_the_Aorta_Repair_Consent" },
//   { test: (n) => n.includes("LAPAROSCOPIC") && (n.includes("HIGH ANTERIOR") || n.includes("HAR")), slug: "Laparoscopic_High_Anterior_Resection" },
//   { test: (n) => n.includes("HEMICOLECTOMY"), slug: "Laparoscopic_Right_Hemicolectomy" },
//   { test: (n) => n.includes("LAPAROSCOPIC") && n.includes("CHOLECYSTECTOMY"), slug: "Laparoscopic_Cholecystectomy" },
//   { test: (n) => n.includes("MITRAL VALVE"), slug: "Mitral_Valve_Repair" },
//   { test: (n) => n.includes("COLECTOMY") && !n.includes("HEMICOLECTOMY") && !n.includes("LAPAROSCOPIC"), slug: "Open_Colectomy" },
//   { test: (n) => n.includes("HIGH ANTERIOR") && !n.includes("LAPAROSCOPIC"), slug: "Open_High_Anterior_Resection" },
//   { test: (n) => n.includes("TETRALOGY") || n.includes("FALLOT"), slug: "Tetralogy_of_Fallot_(TOF)_Repair" },
//   { test: (n) => n.includes("VENTRICULAR SEPTAL") || (n.includes("VSD") && n.includes("REPAIR")), slug: "Ventricular_Septal_Defect_(VSD)_Repair" },
// ];

// const matchDynamicTemplateSlug = (procedureName?: string): string | null => {
//   if (!procedureName) return null;
//   const upper = procedureName.toUpperCase();
//   const match = DYNAMIC_TEMPLATE_MATCHERS.find((m) => m.test(upper));
//   return match ? match.slug : null;
// };

// interface ConsentModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   entityType: "SURGERY" | "GENERAL" | "LAB" | "RADIOLOGY" | "PROCEDURE";
//   entityId: number;
//   encounterNumber: string;
//   patientName: string;
//   mrn: string;
//   procedureName: string;
//   orderId?: number;
//   surgery?: OTSurgery;
//   onSuccess?: () => void;
//   onBackToActions?: () => void;
// }

// const ConsentModal: React.FC<ConsentModalProps> = ({
//   isOpen,
//   onClose,
//   entityType,
//   entityId,
//   encounterNumber,
//   patientName,
//   mrn,
//   procedureName,
//   orderId,
//   surgery,
//   onSuccess,
//   onBackToActions,
// }) => {
//   const { notify } = useNotification();
//   const { user } = useAuth();
//   const [loading, setLoading] = useState(true);
//   const [submitting, setSubmitting] = useState(false);
//   const [metadata, setMetadata] = useState<ConsentMetadata | null>(null);
//   const [existingConsent, setExistingConsent] = useState<Consent | null>(null);
//   const [signature, setSignature] = useState<string | null>(null);
//   const [isPrintViewOpen, setIsPrintViewOpen] = useState(false);
  
//   // Specific Form States
//   const [showIvcForm, setShowIvcForm] = useState(false);
//   const [ivcFormData, setIvcFormData] = useState<any>(null);
  
//   const [showCsForm, setShowCsForm] = useState(false);
//   const [csFormData, setCsFormData] = useState<any>(null);
  
//   const [showPleurodesisForm, setShowPleurodesisForm] = useState(false);
//   const [pleurodesisFormData, setPleurodesisFormData] = useState<any>(null);
  
//   const [showMyxomaForm, setShowMyxomaForm] = useState(false);
//   const [myxomaFormData, setMyxomaFormData] = useState<any>(null);

//   const [showAsdPdaForm, setShowAsdPdaForm] = useState(false);
//   const [asdPdaFormData, setAsdPdaFormData] = useState<any>(null);

//   const [dynamicSlug, setDynamicSlug] = useState<string | null>(null);
//   const [dynamicFormData, setDynamicFormData] = useState<any>(null);
//   const [dynamicTemplate, setDynamicTemplate] = useState<ConsentTemplate | null>(null);

//   // Draft States
//   const [isDraft, setIsDraft] = useState(false);
//   const [draftId, setDraftId] = useState<number | null>(null);

//   useEffect(() => {
//     const pName = procedureName?.toUpperCase() || "";
//     const isIvcFilter = pName.includes("IVC") && pName.includes("FILTER");
//     const isCsDelivery = pName.includes("CAESAR") || pName.includes("C/S") || pName.includes("LSCS") || pName.includes("C-SECTION") || pName.includes("DELIVERY");
//     const isPleurodesis = pName.includes("PLEUROD");
//     const isMyxoma = pName.includes("MYXOMA");
//     const isAsdPda = pName.includes("ASD") && pName.includes("PDA");

//     setShowIvcForm(isIvcFilter);
//     setShowCsForm(isCsDelivery);
//     setShowPleurodesisForm(isPleurodesis);
//     setShowMyxomaForm(isMyxoma);
//     setShowAsdPdaForm(isAsdPda);

//     if (isIvcFilter || isCsDelivery || isPleurodesis || isMyxoma || isAsdPda) {
//       setDynamicSlug(null);
//     } else {
//       setDynamicSlug(matchDynamicTemplateSlug(procedureName));
//     }
//   }, [procedureName]);

//   useEffect(() => {
//     if (isPrintViewOpen && (ivcFormData || csFormData || pleurodesisFormData || myxomaFormData || asdPdaFormData || dynamicFormData)) {
//       const printId = ivcFormData ? 'ivc-print-content' : 
//                       csFormData ? 'cs-print-content' : 
//                       pleurodesisFormData ? 'pleurodesis-print-content' : 
//                       myxomaFormData ? 'myxoma-print-content' : 
//                       asdPdaFormData ? 'asd-pda-print-content' : 'dynamic-print-content';
                      
//       const printTitle = ivcFormData ? 'IVC Filter' : 
//                          csFormData ? 'Caesarean Section' : 
//                          pleurodesisFormData ? 'Chemical Pleurodesis' : 
//                          myxomaFormData ? 'Atrial Myxoma' : 
//                          asdPdaFormData ? 'ASD & PDA Repair' : (dynamicTemplate?.display_name || 'Procedure');
                         
//       const timer = setTimeout(() => {
//         const printContent = document.getElementById(printId);
//         if (printContent) {
//           const printWindow = window.open('', '_blank');
//           if (printWindow) {
//             printWindow.document.write(`
//               <html>
//                 <head>
//                   <title>${printTitle} Consent - Print</title>
//                   <script src="https://cdn.tailwindcss.com"></script>
//                   <style>
//                     @media print {
//                       body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
//                       .page-break-before { page-break-before: always; }
//                       .page-break-after { page-break-after: always; }
//                     }
//                   </style>
//                 </head>
//                 <body>${printContent.innerHTML}</body>
//                 <script>
//                   window.onload = () => {
//                     setTimeout(() => {
//                       window.print();
//                     }, 500);
//                   }
//                 </script>
//               </html>
//             `);
//             printWindow.document.close();
//           }
//         }
//         setIsPrintViewOpen(false);
//         onClose();
//       }, 1500);
//       return () => clearTimeout(timer);
//     }
//   }, [isPrintViewOpen, ivcFormData, csFormData, pleurodesisFormData, myxomaFormData, asdPdaFormData, dynamicFormData, dynamicTemplate, onClose]);

//   const witnessUserId = user?.id;

//   useEffect(() => {
//     if (isOpen) {
//       fetchData();
//     }
//   }, [isOpen, entityId]);


//   const fetchData = async () => {
//     setLoading(true);
//     try {
//       const meta = await consentService.getStates();
//       setMetadata(meta);

//       const allConsents = await consentService.getAllConsents({
//           encounter_number: encounterNumber,
//           entity_type: entityType,
//           entity_id: entityId 
//       });

//       // Match SIGNED or DRAFT
//       let found = allConsents.find(
//         (c) =>
//           c.context === entityType &&
//           ["SIGNED", "DRAFT"].includes(c.status_slug) &&
//           (c.reference_id === orderId || c.reference_id === entityId || c.entity_id === entityId)
//       );

//       if (!found) {
//         found = allConsents.find(
//           (c) =>
//             c.entity_type_slug === entityType &&
//             c.entity_id === entityId &&
//             ["SIGNED", "DRAFT"].includes(c.status_slug)
//         );
//       }

//       if (!found && entityType !== "SURGERY") {
//         found = allConsents.find(
//           (c) =>
//             c.context === entityType &&
//             c.encounter_number === encounterNumber &&
//             ["SIGNED", "DRAFT"].includes(c.status_slug) &&
//             c.consent_form_name === `${procedureName} Consent`
//         );
//       }

//       if (found) {
//         setExistingConsent(found);
//         setIsDraft(found.status_slug === "DRAFT");
//         setDraftId(found.id);
//       } else {
//         setExistingConsent(null);
//         setIsDraft(false);
//         setDraftId(null);
//       }
//     } catch (error: any) {
//       const errorMsg = error.response?.data?.message || error.message || "Failed to load consent data";
//       notify(errorMsg, "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleSubmit = async () => {
//     if (!signature) {
//       notify("Please sign the consent form", "error");
//       return;
//     }
//     if (!witnessUserId) {
//       notify("Unable to determine the logged-in staff ID for the witness. Please sign in again.", "error");
//       return;
//     }

//     setSubmitting(true);
//     try {
//       if (entityType === "SURGERY" && orderId) {
//         await otService.signSurgeryConsent({
//           order_id: orderId,
//           signature: signature,
//           witness_user_id: witnessUserId,
//         });
//       } else {
//         await consentService.createConsent({
//           encounter_number: encounterNumber,
//           entity_type: entityType,
//           entity_id: entityId,
//           consent_form_name: `${procedureName} Consent`,
//           witness_user_id: witnessUserId,
//           signature: signature,
//         });
//       }

//       notify("Consent signed successfully", "success");
//       if (onSuccess) onSuccess();
//       onClose();
//     } catch (error: any) {
//       const errorMsg = error.response?.data?.message || error.message || "Failed to submit consent";
//       notify(errorMsg, "error");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   if (!isOpen) return null;

//   if (loading) {
//     return (
//       <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//         <div className="bg-white rounded-2xl shadow-2xl p-10 flex flex-col items-center gap-4">
//           <Loader2 className="animate-spin text-brand-primary" size={40} />
//           <p className="text-slate-500 font-bold text-sm">Loading consent...</p>
//         </div>
//       </div>
//     );
//   }

//   const extConsent = existingConsent as any;

//   let parsedFormData: any = null;
//   if (extConsent?.form_data) {
//     try {
//       parsedFormData = typeof extConsent.form_data === 'string' 
//         ? JSON.parse(extConsent.form_data) 
//         : extConsent.form_data;
//     } catch (e) {
//       console.error("Failed to parse consent form_data", e);
//     }
//   }


//   // ==========================================
//   // RENDER NEW OR DRAFT CONSENTS
//   // ==========================================
//   if (!existingConsent || (existingConsent && isDraft)) {
    
//     // ASD PDA Form
//     if (showAsdPdaForm) {
//       return (
//         <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
//           <AsdPdaRepairConsentForm
//             orderId={orderId || 0}
//             patientName={patientName}
//             mrn={mrn}
//             initialData={parsedFormData} 
//             draftId={draftId} 
//             onCancel={onClose}
//             onPrint={() => {
//               setAsdPdaFormData({ patient_name: patientName, mrn });
//               setIsPrintViewOpen(true);
//             }}
//             onSuccess={(data: any) => {
//               setAsdPdaFormData(data);
//               if (onSuccess) onSuccess();
//               setIsPrintViewOpen(true);
//             }}
//           />
//           {isPrintViewOpen && asdPdaFormData && createPortal(
//             <div className="hidden">
//               <div id="asd-pda-print-content">
//                  <AsdPdaRepairConsentPrintTemplate formData={asdPdaFormData} />
//               </div>
//             </div>,
//             document.body
//           )}
//           {isPrintViewOpen && asdPdaFormData && (
//              <div className="fixed inset-0 z-[60] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
//                 <div className="relative">
//                   <Loader2 className="animate-spin text-[#1e40af] mb-4" size={64} />
//                   <div className="absolute inset-0 flex items-center justify-center">
//                     <Printer className="text-[#1e40af] animate-pulse" size={24} />
//                   </div>
//                 </div>
//                 <h2 className="text-2xl font-black text-[#1e40af] tracking-tighter uppercase italic">Generating Document</h2>
//                 <p className="text-slate-500 font-bold mt-2 animate-pulse">Syncing checkboxes and signatures...</p>
//              </div>
//           )}
//         </div>
//       );
//     }

//     // Atrial Myxoma Form
//     if (showMyxomaForm) {
//       return (
//         <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
//           <AtrialMyxomaConsentForm
//             orderId={orderId || 0}
//             patientName={patientName}
//             mrn={mrn}
//             initialData={parsedFormData} 
//             draftId={draftId}            
//             onCancel={onClose}
//             onPrint={() => {
//               setMyxomaFormData({ patient_name: patientName, mrn });
//               setIsPrintViewOpen(true);
//             }}
//             onSuccess={(data: any) => {
//               setMyxomaFormData(data);
//               if (onSuccess) onSuccess();
//               setIsPrintViewOpen(true);
//             }}
//           />
//           {isPrintViewOpen && myxomaFormData && createPortal(
//             <div className="hidden">
//               <div id="myxoma-print-content">
//                  <AtrialMyxomaConsentPrintTemplate formData={myxomaFormData} />
//               </div>
//             </div>,
//             document.body
//           )}
//           {isPrintViewOpen && myxomaFormData && (
//              <div className="fixed inset-0 z-[60] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
//                 <div className="relative">
//                   <Loader2 className="animate-spin text-[#1e40af] mb-4" size={64} />
//                   <div className="absolute inset-0 flex items-center justify-center">
//                     <Printer className="text-[#1e40af] animate-pulse" size={24} />
//                   </div>
//                 </div>
//                 <h2 className="text-2xl font-black text-[#1e40af] tracking-tighter uppercase italic">Generating Document</h2>
//                 <p className="text-slate-500 font-bold mt-2 animate-pulse">Syncing checkboxes and signatures...</p>
//              </div>
//           )}
//         </div>
//       );
//     }

//     // IVC Filter Form
//     if (showIvcForm) {
//       return (
//         <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
//           <IvcFilterConsentForm
//             orderId={orderId || 0}
//             patientName={patientName}
//             mrn={mrn}
//             initialData={parsedFormData} // <-- ADDED
//             draftId={draftId}            // <-- ADDED
//             onCancel={onClose}
//             onPrint={() => {
//               setIvcFormData({
//                 patient_name: patientName,
//                 mrn: mrn,
//                 procedure_name: procedureName,
//                 consent_date: new Date().toISOString().split('T')[0]
//               });
//               setIsPrintViewOpen(true);
//             }}
//             onSuccess={(data: any) => {
//               setIvcFormData(data);
//               if (onSuccess) onSuccess();
//               setIsPrintViewOpen(true);
//             }}
//           />
//           {isPrintViewOpen && ivcFormData && createPortal(
//             <div className="hidden">
//               <div id="ivc-print-content">
//                  <IVCFilterConsentPrintTemplate formData={ivcFormData} />
//               </div>
//             </div>,
//             document.body
//           )}
//           {isPrintViewOpen && ivcFormData && (
//              <div className="fixed inset-0 z-[60] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
//                 <div className="relative">
//                   <Loader2 className="animate-spin text-[#3B309A] mb-4" size={64} />
//                   <div className="absolute inset-0 flex items-center justify-center">
//                     <Printer className="text-[#3B309A] animate-pulse" size={24} />
//                   </div>
//                 </div>
//                 <h2 className="text-2xl font-black text-[#3B309A] tracking-tighter uppercase italic">Generating Document</h2>
//                 <p className="text-slate-500 font-bold mt-2 animate-pulse">Syncing checkboxes and signatures...</p>
//              </div>
//           )}
//         </div>
//       );
//     }

//     // CS Delivery Form
//     if (showCsForm) {
//       return (
//         <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
//           <CsDeliveryConsentForm
//             orderId={orderId || 0}
//             patientName={patientName}
//             mrn={mrn}
//             initialData={parsedFormData} // <-- ADDED
//             draftId={draftId}            // <-- ADDED
//             onCancel={onClose}
//             onPrint={() => {
//               setCsFormData({
//                 mother_name: patientName,
//                 mrn: mrn,
//               });
//               setIsPrintViewOpen(true);
//             }}
//             onSuccess={(data: any) => {
//               setCsFormData(data);
//               if (onSuccess) onSuccess();
//               setIsPrintViewOpen(true);
//             }}
//           />
//           {isPrintViewOpen && csFormData && createPortal(
//             <div className="hidden">
//               <div id="cs-print-content">
//                  <CsDeliveryConsentPrintTemplate formData={csFormData} />
//               </div>
//             </div>,
//             document.body
//           )}
//           {isPrintViewOpen && csFormData && (
//              <div className="fixed inset-0 z-[60] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
//                 <div className="relative">
//                   <Loader2 className="animate-spin text-[#7c3aed] mb-4" size={64} />
//                   <div className="absolute inset-0 flex items-center justify-center">
//                     <Printer className="text-[#7c3aed] animate-pulse" size={24} />
//                   </div>
//                 </div>
//                 <h2 className="text-2xl font-black text-[#7c3aed] tracking-tighter uppercase italic">Generating Document</h2>
//                 <p className="text-slate-500 font-bold mt-2 animate-pulse">Syncing checkboxes and signatures...</p>
//              </div>
//           )}
//         </div>
//       );
//     }

//     // Chemical Pleurodesis Form
//     if (showPleurodesisForm || (entityType === "PROCEDURE" && procedureName?.toLowerCase().includes("pleurod"))) {
//       return (
//         <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
//           <ChemicalPleurodesisConsentForm
//             orderId={orderId!}
//             patientName={patientName}
//             mrn={mrn}
//             initialData={parsedFormData} // <-- ADDED
//             draftId={draftId}            // <-- ADDED
//             onCancel={onClose}
//             onPrint={() => {
//               setPleurodesisFormData({
//                 patient_name: patientName,
//                 mrn: mrn,
//               });
//               setIsPrintViewOpen(true);
//             }}
//             onSuccess={(data: any) => {
//               setPleurodesisFormData(data);
//               if (onSuccess) onSuccess();
//               setIsPrintViewOpen(true);
//             }}
//           />
//           {isPrintViewOpen && pleurodesisFormData && createPortal(
//             <div className="hidden">
//               <div id="pleurodesis-print-content">
//                  <ChemicalPleurodesisPrintTemplate formData={pleurodesisFormData} />
//               </div>
//             </div>,
//             document.body
//           )}
//           {isPrintViewOpen && pleurodesisFormData && (
//              <div className="fixed inset-0 z-[60] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
//                 <div className="relative">
//                   <Loader2 className="animate-spin text-[#1e40af] mb-4" size={64} />
//                   <div className="absolute inset-0 flex items-center justify-center">
//                     <Printer className="text-[#1e40af] animate-pulse" size={24} />
//                   </div>
//                 </div>
//                 <h2 className="text-2xl font-black text-[#1e40af] tracking-tighter uppercase italic">Generating Document</h2>
//                 <p className="text-slate-500 font-bold mt-2 animate-pulse">Syncing checkboxes and signatures...</p>
//              </div>
//           )}
//         </div>
//       );
//     }

//     // Dynamic Consent Form
//     if (dynamicSlug) {
//       return (
//         <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
//           <DynamicConsentForm
//             slug={dynamicSlug}
//             orderId={orderId!}
//             patientName={patientName}
//             mrn={mrn}
//             initialData={parsedFormData} // <-- ADDED
//             draftId={draftId}            // <-- ADDED
//             onTemplateLoaded={setDynamicTemplate}
//             onCancel={onClose}
//             onPrint={() => {
//               setDynamicFormData({ patient_name: patientName, mrn });
//               setIsPrintViewOpen(true);
//             }}
//             onSuccess={(data: any, tmpl: ConsentTemplate) => {
//               setDynamicFormData(data);
//               setDynamicTemplate(tmpl);
//               if (onSuccess) onSuccess();
//               setIsPrintViewOpen(true);
//             }}
//           />
//           {isPrintViewOpen && dynamicFormData && dynamicTemplate && createPortal(
//             <div className="hidden">
//               <div id="dynamic-print-content">
//                 <DynamicConsentPrintTemplate formData={dynamicFormData} templateData={dynamicTemplate} />
//               </div>
//             </div>,
//             document.body
//           )}
//           {isPrintViewOpen && dynamicFormData && (
//              <div className="fixed inset-0 z-[60] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
//                 <div className="relative">
//                   <Loader2 className="animate-spin text-[#1e40af] mb-4" size={64} />
//                   <div className="absolute inset-0 flex items-center justify-center">
//                     <Printer className="text-[#1e40af] animate-pulse" size={24} />
//                   </div>
//                 </div>
//                 <h2 className="text-2xl font-black text-[#1e40af] tracking-tighter uppercase italic">Generating Document</h2>
//                 <p className="text-slate-500 font-bold mt-2 animate-pulse">Syncing checkboxes and signatures...</p>
//              </div>
//           )}
//         </div>
//       );
//     }

//     // Fallback General Form
//     return (
//       <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
//         <GeneralConsentForm
//           surgery={surgery || { id: entityId, order_id: orderId, mrn, first_name: patientName.split(' ')[0], last_name: patientName.split(' ').slice(1).join(' '), surgery_name: procedureName, ot_case_number: "" } as any}
//           initialData={parsedFormData} // <-- ADDED
//           draftId={draftId}            // <-- ADDED
//           onSuccess={() => {
//             if (onSuccess) onSuccess();
//           }}
//           onCancel={onClose}
//         />
//       </div>
//     );
//   }

//   // ==========================================
//   // RENDER EXISTING CONSENTS (READ-ONLY)
//   // ==========================================
//   if (existingConsent && parsedFormData && !isDraft) {

//     const renderReadOnlyPrintWrapper = (ContentComponent: any, PrintTemplateComponent: any, printId: string) => (
//       <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 overflow-y-auto py-8">
//         <ContentComponent
//           orderId={extConsent.order_id || 0}
//           patientName={extConsent.first_name + " " + extConsent.last_name}
//           mrn={extConsent.mrn}
//           onSuccess={() => {}}
//           onCancel={onClose}
//           onPrint={() => {
//             setIsPrintViewOpen(true);
//             setTimeout(() => {
//               const printContent = document.getElementById(printId);
//               if (printContent) {
//                 const printWindow = window.open('', '_blank');
//                 if (printWindow) {
//                   printWindow.document.write(`
//                     <html>
//                       <head>
//                         <title>${extConsent.consent_form_name || 'Consent'} Print</title>
//                         <script src="https://cdn.tailwindcss.com"></script>
//                         <style>
//                           @media print {
//                             body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
//                             .page-break-before { page-break-before: always; }
//                             .page-break-after { page-break-after: always; }
//                           }
//                         </style>
//                       </head>
//                       <body>${printContent.innerHTML}</body>
//                       <script>
//                         window.onload = () => { 
//                           setTimeout(() => {
//                             window.print(); 
//                           }, 500);
//                         }
//                       </script>
//                     </html>
//                   `);
//                   printWindow.document.close();
//                 }
//               }
//               setTimeout(() => setIsPrintViewOpen(false), 500);
//             }, 1500);
//           }}
//           readOnly={true}
//           viewData={parsedFormData}
//         />
//         {isPrintViewOpen && createPortal(
//           <div className="hidden">
//             <div id={printId}>
//               <PrintTemplateComponent formData={parsedFormData} />
//             </div>
//           </div>,
//           document.body
//         )}
//         {isPrintViewOpen && (
//            <div className="fixed inset-0 z-[100] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
//               <div className="relative">
//                 <Loader2 className="animate-spin text-[#1e40af] mb-4" size={64} />
//                 <div className="absolute inset-0 flex items-center justify-center">
//                   <Printer className="text-[#1e40af] animate-pulse" size={24} />
//                 </div>
//               </div>
//               <h2 className="text-2xl font-black text-[#1e40af] tracking-tighter uppercase italic">Generating Document</h2>
//               <p className="text-slate-500 font-bold mt-2 animate-pulse">Syncing signatures and loading PDF...</p>
//            </div>
//         )}
//       </div>
//     );

//     if (showAsdPdaForm) {
//       return renderReadOnlyPrintWrapper(AsdPdaRepairConsentForm, AsdPdaRepairConsentPrintTemplate, 'asd-pda-print-content');
//     }

//     if (showMyxomaForm) {
//       return renderReadOnlyPrintWrapper(AtrialMyxomaConsentForm, AtrialMyxomaConsentPrintTemplate, 'myxoma-print-content');
//     }

//     if (showIvcForm) {
//       return renderReadOnlyPrintWrapper(IvcFilterConsentForm, IVCFilterConsentPrintTemplate, 'ivc-print-content');
//     } 
    
//     if (showCsForm) {
//       return renderReadOnlyPrintWrapper(CsDeliveryConsentForm, CsDeliveryConsentPrintTemplate, 'cs-print-content');
//     } 
    
//     if (showPleurodesisForm) {
//       return renderReadOnlyPrintWrapper(ChemicalPleurodesisConsentForm, ChemicalPleurodesisPrintTemplate, 'pleurodesis-print-content');
//     } 
    
//     if (dynamicSlug) {
//       return (
//         <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 overflow-y-auto py-8">
//           <DynamicConsentForm
//             slug={dynamicSlug}
//             orderId={extConsent.order_id || 0}
//             patientName={extConsent.first_name + " " + extConsent.last_name}
//             mrn={extConsent.mrn}
//             onTemplateLoaded={setDynamicTemplate}
//             onSuccess={() => {}}
//             onCancel={onClose}
//             onPrint={() => {
//               setIsPrintViewOpen(true);
//               setTimeout(() => {
//                 const printContent = document.getElementById('dynamic-print-content');
//                 if (printContent) {
//                   const printWindow = window.open('', '_blank');
//                   if (printWindow) {
//                     printWindow.document.write(`
//                       <html>
//                         <head>
//                           <title>${extConsent.consent_form_name || 'Consent'} Print</title>
//                           <script src="https://cdn.tailwindcss.com"></script>
//                           <style>
//                             @media print {
//                               body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
//                               .page-break-before { page-break-before: always; }
//                               .page-break-after { page-break-after: always; }
//                             }
//                           </style>
//                         </head>
//                         <body>${printContent.innerHTML}</body>
//                         <script>
//                           window.onload = () => {
//                             setTimeout(() => {
//                               window.print();
//                             }, 500);
//                           }
//                         </script>
//                       </html>
//                     `);
//                     printWindow.document.close();
//                   }
//                 }
//                 setTimeout(() => setIsPrintViewOpen(false), 500);
//               }, 1500);
//             }}
//             readOnly={true}
//             viewData={parsedFormData}
//           />
//           {isPrintViewOpen && dynamicTemplate && createPortal(
//             <div className="hidden">
//               <div id="dynamic-print-content">
//                 <DynamicConsentPrintTemplate formData={parsedFormData} templateData={dynamicTemplate} />
//               </div>
//             </div>,
//             document.body
//           )}
//           {isPrintViewOpen && (
//              <div className="fixed inset-0 z-[100] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
//                 <div className="relative">
//                   <Loader2 className="animate-spin text-[#1e40af] mb-4" size={64} />
//                   <div className="absolute inset-0 flex items-center justify-center">
//                     <Printer className="text-[#1e40af] animate-pulse" size={24} />
//                   </div>
//                 </div>
//                 <h2 className="text-2xl font-black text-[#1e40af] tracking-tighter uppercase italic">Generating Document</h2>
//                 <p className="text-slate-500 font-bold mt-2 animate-pulse">Syncing signatures and loading PDF...</p>
//              </div>
//           )}
//         </div>
//       );
//     } 
    
//     // Fallback for standard General Forms where form_data couldn't explicitly match a high-fidelity wrapper
//     const fakeSurgery = {
//       id: extConsent.order_id || 0,
//       mrn: extConsent.mrn,
//       first_name: extConsent.first_name,
//       last_name: extConsent.last_name,
//     } as any;
//     return (
//       <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 overflow-y-auto py-8">
//         <GeneralConsentForm
//           surgery={fakeSurgery}
//           onCancel={onClose}
//           readOnly={true}
//           viewData={parsedFormData}
//         />
//       </div>
//     );
//   }

//   // ==========================================
//   // RENDER FALLBACK OLD LEGACY CONSENTS
//   // ==========================================
//   return (
//     <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//       <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
//         {/* Header */}
//         <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
//           <div className="flex items-center gap-3">
//             {onBackToActions && (
//               <button
//                 onClick={onBackToActions}
//                 className="p-1.5 bg-white border border-slate-200 shadow-sm text-slate-500 rounded-lg hover:bg-slate-100 transition-colors mr-1"
//                 title="Back to Actions"
//               >
//                 <ArrowLeft size={18} />
//               </button>
//             )}
//             <div>
//               <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
//                 <FileText className="text-brand-primary" size={20} />
//                 View Consent
//               </h3>
//               <p className="text-xs text-slate-500 font-bold uppercase">
//                 {extConsent?.consent_form_name || procedureName}
//               </p>
//             </div>
//           </div>
//           <button
//             onClick={onClose}
//             className="text-slate-400 hover:text-slate-600 transition-colors"
//           >
//             <XCircle size={24} />
//           </button>
//         </div>
//         <div className="p-6 overflow-y-auto flex-1">
//           <div className="text-center p-8 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm">
//             Legacy consent format detected. Please view Full PDF for details.
//           </div>
//         </div>
//         <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
//           <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors">Close</button>
//           <button onClick={() => setIsPrintViewOpen(true)} className="px-6 py-3 rounded-xl font-bold text-white bg-brand-primary hover:bg-brand-primary shadow-lg shadow-brand-active transition-all flex items-center gap-2">
//             <Printer size={18} /> View Full PDF
//           </button>
//         </div>
//       </div>
//       <ConsentPrintView
//         isOpen={isPrintViewOpen}
//         onClose={() => setIsPrintViewOpen(false)}
//         consent={existingConsent}
//       />
//     </div>
//   );
// };

// export default ConsentModal;

// import React, { useState, useEffect } from "react";
// import {
//   XCircle,
//   FileText,
//   CheckCircle,
//   AlertCircle,
//   Loader2,
//   Printer,
//   ArrowLeft,
// } from "lucide-react";
// import {
//   consentService,
//   Consent,
//   ConsentMetadata,
//   ConsentTemplate
// } from "../services/consent.service";
// import { otService } from "../services/ot.service";
// import ConsentPrintView from "./ConsentPrintView";
// import { BASE_URL } from "../api/client";
// import SignaturePad from "./SignaturePad";
// import { useNotification } from "../context/NotificationContext";
// import { useAuth } from "../context/AuthContext";
// import { createPortal } from "react-dom";

// // Standard Form Imports
// import IvcFilterConsentForm from "./consent-templates/IvcFilterConsentForm";
// import IVCFilterConsentPrintTemplate from "./print-templates/theatre/IVCFilterrConsentPrintTemplate";
// import GeneralConsentForm from "./consent-templates/GeneralConsentForm";
// import CsDeliveryConsentForm from "./consent-templates/CsDeliveryConsentForm";
// import CsDeliveryConsentPrintTemplate from "./print-templates/theatre/CsDeliveryConsentPrintTemplate";
// import ChemicalPleurodesisConsentForm from "./consent-templates/ChemicalPleurodesisConsentForm";
// import ChemicalPleurodesisPrintTemplate from "./print-templates/theatre/ChemicalPleurodesisPrintTemplate";
// import DynamicConsentForm from "./consent-templates/DynamicConsentForm";
// import DynamicConsentPrintTemplate from "./print-templates/theatre/DynamicConsentPrintTemplate";

// // Specific Custom Forms
// import AtrialMyxomaConsentForm from "./consent-templates/AtrialMyxomaConsentForm";
// import AtrialMyxomaConsentPrintTemplate from "./print-templates/theatre/AtrialMyxomaConsentPrintTemplate";
// import AsdPdaRepairConsentForm from "./consent-templates/ASDRepairPDAClosure";

// import AsdPdaRepairConsentPrintTemplate from "./print-templates/theatre/AsdPdaRepairConsentPrintTemplate";

// // Resolving missing OTSurgery interface
// export interface OTSurgery {
//   id: number;
//   order_id?: number;
//   mrn: string;
//   first_name: string;
//   last_name: string;
//   surgery_name: string;
//   ot_case_number: string;
//   [key: string]: any;
// }

// // Procedures matched by name to a dedicated consent template slug
// const DYNAMIC_TEMPLATE_MATCHERS: { test: (name: string) => boolean; slug: string }[] = [
//   { test: (n) => n.includes("THORACOSTOMY") || n.includes("CHEST TUBE"), slug: "closed_Thoracostomy_Tube_Drainage" },
//   { test: (n) => n.includes("HAEMODIALYSIS") || n.includes("HEMODIALYSIS") || n.includes("HDF") || n.includes("DIALYSIS"), slug: "Haemodialysis_HDF_Consent_Form" },
//   { test: (n) => n.includes("AORTIC VALVE"), slug: "Aortic_Valve_Replacement" },
//   { test: (n) => n.includes("APPENDICECTOMY") || n.includes("APPENDIX"), slug: "Appendicectomy" },
//   { test: (n) => (n.includes("ATRIAL SEPTAL") || n.includes("ASD")) && !n.includes("PDA"), slug: "Atrial_Septal_Defect_(ASD)_Repair" },
//   { test: (n) => n.includes("INGUINAL HERNIA"), slug: "Inguinal_Hernia_Repair" },
//   { test: (n) => n.includes("COARCTATION"), slug: "Coarctation_of_the_Aorta_Repair_Consent" },
//   { test: (n) => n.includes("LAPAROSCOPIC") && (n.includes("HIGH ANTERIOR") || n.includes("HAR")), slug: "Laparoscopic_High_Anterior_Resection" },
//   { test: (n) => n.includes("HEMICOLECTOMY"), slug: "Laparoscopic_Right_Hemicolectomy" },
//   { test: (n) => n.includes("LAPAROSCOPIC") && n.includes("CHOLECYSTECTOMY"), slug: "Laparoscopic_Cholecystectomy" },
//   { test: (n) => n.includes("MITRAL VALVE"), slug: "Mitral_Valve_Repair" },
//   { test: (n) => n.includes("COLECTOMY") && !n.includes("HEMICOLECTOMY") && !n.includes("LAPAROSCOPIC"), slug: "Open_Colectomy" },
//   { test: (n) => n.includes("HIGH ANTERIOR") && !n.includes("LAPAROSCOPIC"), slug: "Open_High_Anterior_Resection" },
//   { test: (n) => n.includes("TETRALOGY") || n.includes("FALLOT"), slug: "Tetralogy_of_Fallot_(TOF)_Repair" },
//   { test: (n) => n.includes("VENTRICULAR SEPTAL") || (n.includes("VSD") && n.includes("REPAIR")), slug: "Ventricular_Septal_Defect_(VSD)_Repair" },
// ];

// const matchDynamicTemplateSlug = (procedureName?: string): string | null => {
//   if (!procedureName) return null;
//   const upper = procedureName.toUpperCase();
//   const match = DYNAMIC_TEMPLATE_MATCHERS.find((m) => m.test(upper));
//   return match ? match.slug : null;
// };

// interface ConsentModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   entityType: "SURGERY" | "GENERAL" | "LAB" | "RADIOLOGY" | "PROCEDURE";
//   entityId: number;
//   encounterNumber: string;
//   patientName: string;
//   mrn: string;
//   procedureName: string;
//   orderId?: number;
//   surgery?: OTSurgery;
//   onSuccess?: () => void;
//   onBackToActions?: () => void;
// }

// const ConsentModal: React.FC<ConsentModalProps> = ({
//   isOpen,
//   onClose,
//   entityType,
//   entityId,
//   encounterNumber,
//   patientName,
//   mrn,
//   procedureName,
//   orderId,
//   surgery,
//   onSuccess,
//   onBackToActions,
// }) => {
//   const { notify } = useNotification();
//   const { user } = useAuth();
//   const [loading, setLoading] = useState(true);
//   const [submitting, setSubmitting] = useState(false);
//   const [metadata, setMetadata] = useState<ConsentMetadata | null>(null);
//   const [existingConsent, setExistingConsent] = useState<Consent | null>(null);
//   const [signature, setSignature] = useState<string | null>(null);
//   const [isPrintViewOpen, setIsPrintViewOpen] = useState(false);
  
//   // Specific Form States
//   const [showIvcForm, setShowIvcForm] = useState(false);
//   const [ivcFormData, setIvcFormData] = useState<any>(null);
  
//   const [showCsForm, setShowCsForm] = useState(false);
//   const [csFormData, setCsFormData] = useState<any>(null);
  
//   const [showPleurodesisForm, setShowPleurodesisForm] = useState(false);
//   const [pleurodesisFormData, setPleurodesisFormData] = useState<any>(null);
  
//   const [showMyxomaForm, setShowMyxomaForm] = useState(false);
//   const [myxomaFormData, setMyxomaFormData] = useState<any>(null);

//   const [showAsdPdaForm, setShowAsdPdaForm] = useState(false);
//   const [asdPdaFormData, setAsdPdaFormData] = useState<any>(null);

//   const [dynamicSlug, setDynamicSlug] = useState<string | null>(null);
//   const [dynamicFormData, setDynamicFormData] = useState<any>(null);
//   const [dynamicTemplate, setDynamicTemplate] = useState<ConsentTemplate | null>(null);

//   // Add these new states right under your existing states
//   const [isDraft, setIsDraft] = useState(false);
//   const [draftId, setDraftId] = useState<number | null>(null);

//   useEffect(() => {
//     const pName = procedureName?.toUpperCase() || "";
//     const isIvcFilter = pName.includes("IVC") && pName.includes("FILTER");
//     const isCsDelivery = pName.includes("CAESAR") || pName.includes("C/S") || pName.includes("LSCS") || pName.includes("C-SECTION") || pName.includes("DELIVERY");
//     const isPleurodesis = pName.includes("PLEUROD");
//     const isMyxoma = pName.includes("MYXOMA");
//     const isAsdPda = pName.includes("ASD") && pName.includes("PDA");

//     setShowIvcForm(isIvcFilter);
//     setShowCsForm(isCsDelivery);
//     setShowPleurodesisForm(isPleurodesis);
//     setShowMyxomaForm(isMyxoma);
//     setShowAsdPdaForm(isAsdPda);

//     if (isIvcFilter || isCsDelivery || isPleurodesis || isMyxoma || isAsdPda) {
//       setDynamicSlug(null);
//     } else {
//       setDynamicSlug(matchDynamicTemplateSlug(procedureName));
//     }
//   }, [procedureName]);

//   useEffect(() => {
//     if (isPrintViewOpen && (ivcFormData || csFormData || pleurodesisFormData || myxomaFormData || asdPdaFormData || dynamicFormData)) {
//       const printId = ivcFormData ? 'ivc-print-content' : 
//                       csFormData ? 'cs-print-content' : 
//                       pleurodesisFormData ? 'pleurodesis-print-content' : 
//                       myxomaFormData ? 'myxoma-print-content' : 
//                       asdPdaFormData ? 'asd-pda-print-content' : 'dynamic-print-content';
                      
//       const printTitle = ivcFormData ? 'IVC Filter' : 
//                          csFormData ? 'Caesarean Section' : 
//                          pleurodesisFormData ? 'Chemical Pleurodesis' : 
//                          myxomaFormData ? 'Atrial Myxoma' : 
//                          asdPdaFormData ? 'ASD & PDA Repair' : (dynamicTemplate?.display_name || 'Procedure');
                         
//       const timer = setTimeout(() => {
//         const printContent = document.getElementById(printId);
//         if (printContent) {
//           const printWindow = window.open('', '_blank');
//           if (printWindow) {
//             printWindow.document.write(`
//               <html>
//                 <head>
//                   <title>${printTitle} Consent - Print</title>
//                   <script src="https://cdn.tailwindcss.com"></script>
//                   <style>
//                     @media print {
//                       body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
//                       .page-break-before { page-break-before: always; }
//                       .page-break-after { page-break-after: always; }
//                     }
//                   </style>
//                 </head>
//                 <body>${printContent.innerHTML}</body>
//                 <script>
//                   window.onload = () => {
//                     setTimeout(() => {
//                       window.print();
//                     }, 500);
//                   }
//                 </script>
//               </html>
//             `);
//             printWindow.document.close();
//           }
//         }
//         setIsPrintViewOpen(false);
//         onClose();
//       }, 1500);
//       return () => clearTimeout(timer);
//     }
//   }, [isPrintViewOpen, ivcFormData, csFormData, pleurodesisFormData, myxomaFormData, asdPdaFormData, dynamicFormData, dynamicTemplate, onClose]);

//   const witnessUserId = user?.id;

//   useEffect(() => {
//     if (isOpen) {
//       fetchData();
//     }
//   }, [isOpen, entityId]);


//   // Update your fetchData function
//   const fetchData = async () => {
//     setLoading(true);
//     try {
//       const meta = await consentService.getStates();
//       setMetadata(meta);

//       const allConsents = await consentService.getAllConsents({
//           encounter_number: encounterNumber,
//           entity_type: entityType,
//           entity_id: entityId 
//       });

//       // Match SIGNED or DRAFT
//       let found = allConsents.find(
//         (c) =>
//           c.context === entityType &&
//           ["SIGNED", "DRAFT"].includes(c.status_slug) &&
//           (c.reference_id === orderId || c.reference_id === entityId || c.entity_id === entityId)
//       );

//       if (!found) {
//         found = allConsents.find(
//           (c) =>
//             c.entity_type_slug === entityType &&
//             c.entity_id === entityId &&
//             ["SIGNED", "DRAFT"].includes(c.status_slug)
//         );
//       }

//       if (!found && entityType !== "SURGERY") {
//         found = allConsents.find(
//           (c) =>
//             c.context === entityType &&
//             c.encounter_number === encounterNumber &&
//             ["SIGNED", "DRAFT"].includes(c.status_slug) &&
//             c.consent_form_name === `${procedureName} Consent`
//         );
//       }

//       if (found) {
//         setExistingConsent(found);
//         setIsDraft(found.status_slug === "DRAFT");
//         setDraftId(found.id);
//       } else {
//         setExistingConsent(null);
//         setIsDraft(false);
//         setDraftId(null);
//       }
//     } catch (error: any) {
//       const errorMsg = error.response?.data?.message || error.message || "Failed to load consent data";
//       notify(errorMsg, "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // const fetchData = async () => {
//   //   setLoading(true);
//   //   try {
//   //     const meta = await consentService.getStates();
//   //     setMetadata(meta);

//   //     const allConsents = await consentService.getAllConsents({
//   //         encounter_number: encounterNumber,
//   //         entity_type: entityType,
//   //         entity_id: entityId 
//   //     });

//   //     let found = allConsents.find(
//   //       (c) =>
//   //         c.context === entityType &&
//   //         c.status_slug === "SIGNED" &&
//   //         (c.reference_id === orderId || c.reference_id === entityId || c.entity_id === entityId)
//   //     );

//   //     if (!found) {
//   //       found = allConsents.find(
//   //         (c) =>
//   //           c.entity_type_slug === entityType &&
//   //           c.entity_id === entityId &&
//   //           c.status_slug === "SIGNED",
//   //       );
//   //     }

//   //     if (!found && entityType !== "SURGERY") {
//   //       found = allConsents.find(
//   //         (c) =>
//   //           c.context === entityType &&
//   //           c.encounter_number === encounterNumber &&
//   //           c.status_slug === "SIGNED" &&
//   //           c.consent_form_name === `${procedureName} Consent`
//   //       );
//   //     }

//   //     setExistingConsent(found || null);
//   //   } catch (error: any) {
//   //     const errorMsg = error.response?.data?.message || error.message || "Failed to load consent data";
//   //     notify(errorMsg, "error");
//   //   } finally {
//   //     setLoading(false);
//   //   }
//   // };

//   const handleSubmit = async () => {
//     if (!signature) {
//       notify("Please sign the consent form", "error");
//       return;
//     }
//     if (!witnessUserId) {
//       notify("Unable to determine the logged-in staff ID for the witness. Please sign in again.", "error");
//       return;
//     }

//     setSubmitting(true);
//     try {
//       if (entityType === "SURGERY" && orderId) {
//         await otService.signSurgeryConsent({
//           order_id: orderId,
//           signature: signature,
//           witness_user_id: witnessUserId,
//         });
//       } else {
//         await consentService.createConsent({
//           encounter_number: encounterNumber,
//           entity_type: entityType,
//           entity_id: entityId,
//           consent_form_name: `${procedureName} Consent`,
//           witness_user_id: witnessUserId,
//           signature: signature,
//         });
//       }

//       notify("Consent signed successfully", "success");
//       if (onSuccess) onSuccess();
//       onClose();
//     } catch (error: any) {
//       const errorMsg = error.response?.data?.message || error.message || "Failed to submit consent";
//       notify(errorMsg, "error");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   if (!isOpen) return null;

//   if (loading) {
//     return (
//       <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//         <div className="bg-white rounded-2xl shadow-2xl p-10 flex flex-col items-center gap-4">
//           <Loader2 className="animate-spin text-brand-primary" size={40} />
//           <p className="text-slate-500 font-bold text-sm">Loading consent...</p>
//         </div>
//       </div>
//     );
//   }

//   const extConsent = existingConsent as any;

//   let parsedFormData: any = null;
//   if (extConsent?.form_data) {
//     try {
//       parsedFormData = typeof extConsent.form_data === 'string' 
//         ? JSON.parse(extConsent.form_data) 
//         : extConsent.form_data;
//     } catch (e) {
//       console.error("Failed to parse consent form_data", e);
//     }
//   }


//   // ==========================================
//   // RENDER NEW OR DRAFT CONSENTS
//   // ==========================================
//   if (!existingConsent || (existingConsent && isDraft)) {
//     // Note: You will pass `initialData={parsedFormData}` and `draftId={draftId}` 
//     // down to your form components so they can pre-fill the form.

//   // ==========================================
//   // RENDER NEW CONSENTS
//   // ==========================================
//   // if (!existingConsent && !loading) {
    
//     // ASD PDA Form
//     if (showAsdPdaForm) {
//       return (
//         <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">


//           <AsdPdaRepairConsentForm
//             orderId={orderId || 0}
//             patientName={patientName}
//             mrn={mrn}
//             initialData={parsedFormData} // <--- NEW
//             draftId={draftId} // <--- NEW
//             onCancel={onClose}
//             onPrint={() => {
//               setAsdPdaFormData({ patient_name: patientName, mrn });
//               setIsPrintViewOpen(true);
//             }}
//             onSuccess={(data: any) => {
//               setAsdPdaFormData(data);
//               if (onSuccess) onSuccess();
//               setIsPrintViewOpen(true);
//             }}
//           />
//           {isPrintViewOpen && asdPdaFormData && createPortal(
//             <div className="hidden">
//               <div id="asd-pda-print-content">
//                  <AsdPdaRepairConsentPrintTemplate formData={asdPdaFormData} />
//               </div>
//             </div>,
//             document.body
//           )}
//           {isPrintViewOpen && asdPdaFormData && (
//              <div className="fixed inset-0 z-[60] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
//                 <div className="relative">
//                   <Loader2 className="animate-spin text-[#1e40af] mb-4" size={64} />
//                   <div className="absolute inset-0 flex items-center justify-center">
//                     <Printer className="text-[#1e40af] animate-pulse" size={24} />
//                   </div>
//                 </div>
//                 <h2 className="text-2xl font-black text-[#1e40af] tracking-tighter uppercase italic">Generating Document</h2>
//                 <p className="text-slate-500 font-bold mt-2 animate-pulse">Syncing checkboxes and signatures...</p>
//              </div>
//           )}
//         </div>
//       );
//     }

//     if (showMyxomaForm) {
//       return (
//         <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
//           <AtrialMyxomaConsentForm
//             orderId={orderId || 0}
//             patientName={patientName}
//             mrn={mrn}
//             initialData={parsedFormData} // <--- ADD THIS
//             draftId={draftId}            // <--- ADD THIS
//             onCancel={onClose}
//             onPrint={() => {
//               setMyxomaFormData({ patient_name: patientName, mrn });
//               setIsPrintViewOpen(true);
//             }}
//             onSuccess={(data: any) => {
//               setMyxomaFormData(data);
//               if (onSuccess) onSuccess();
//               setIsPrintViewOpen(true);
//             }}
//           />
//           {isPrintViewOpen && myxomaFormData && createPortal(
//             <div className="hidden">
//               <div id="myxoma-print-content">
//                  <AtrialMyxomaConsentPrintTemplate formData={myxomaFormData} />
//               </div>
//             </div>,
//             document.body
//           )}
//           {isPrintViewOpen && myxomaFormData && (
//              <div className="fixed inset-0 z-[60] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
//                 <div className="relative">
//                   <Loader2 className="animate-spin text-[#1e40af] mb-4" size={64} />
//                   <div className="absolute inset-0 flex items-center justify-center">
//                     <Printer className="text-[#1e40af] animate-pulse" size={24} />
//                   </div>
//                 </div>
//                 <h2 className="text-2xl font-black text-[#1e40af] tracking-tighter uppercase italic">Generating Document</h2>
//                 <p className="text-slate-500 font-bold mt-2 animate-pulse">Syncing checkboxes and signatures...</p>
//              </div>
//           )}
//         </div>
//       );
//     }

//     if (showIvcForm) {
//       return (
//         <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
//           <IvcFilterConsentForm
//             orderId={orderId || 0}
//             patientName={patientName}
//             mrn={mrn}
//             onCancel={onClose}
//             onPrint={() => {
//               setIvcFormData({
//                 patient_name: patientName,
//                 mrn: mrn,
//                 procedure_name: procedureName,
//                 consent_date: new Date().toISOString().split('T')[0]
//               });
//               setIsPrintViewOpen(true);
//             }}
//             onSuccess={(data: any) => {
//               setIvcFormData(data);
//               if (onSuccess) onSuccess();
//               setIsPrintViewOpen(true);
//             }}
//           />
//           {isPrintViewOpen && ivcFormData && createPortal(
//             <div className="hidden">
//               <div id="ivc-print-content">
//                  <IVCFilterConsentPrintTemplate formData={ivcFormData} />
//               </div>
//             </div>,
//             document.body
//           )}
//           {isPrintViewOpen && ivcFormData && (
//              <div className="fixed inset-0 z-[60] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
//                 <div className="relative">
//                   <Loader2 className="animate-spin text-[#3B309A] mb-4" size={64} />
//                   <div className="absolute inset-0 flex items-center justify-center">
//                     <Printer className="text-[#3B309A] animate-pulse" size={24} />
//                   </div>
//                 </div>
//                 <h2 className="text-2xl font-black text-[#3B309A] tracking-tighter uppercase italic">Generating Document</h2>
//                 <p className="text-slate-500 font-bold mt-2 animate-pulse">Syncing checkboxes and signatures...</p>
//              </div>
//           )}
//         </div>
//       );
//     }

//     if (showCsForm) {
//       return (
//         <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
//           <CsDeliveryConsentForm
//             orderId={orderId || 0}
//             patientName={patientName}
//             mrn={mrn}
//             onCancel={onClose}
//             onPrint={() => {
//               setCsFormData({
//                 mother_name: patientName,
//                 mrn: mrn,
//               });
//               setIsPrintViewOpen(true);
//             }}
//             onSuccess={(data: any) => {
//               setCsFormData(data);
//               if (onSuccess) onSuccess();
//               setIsPrintViewOpen(true);
//             }}
//           />
//           {isPrintViewOpen && csFormData && createPortal(
//             <div className="hidden">
//               <div id="cs-print-content">
//                  <CsDeliveryConsentPrintTemplate formData={csFormData} />
//               </div>
//             </div>,
//             document.body
//           )}
//           {isPrintViewOpen && csFormData && (
//              <div className="fixed inset-0 z-[60] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
//                 <div className="relative">
//                   <Loader2 className="animate-spin text-[#7c3aed] mb-4" size={64} />
//                   <div className="absolute inset-0 flex items-center justify-center">
//                     <Printer className="text-[#7c3aed] animate-pulse" size={24} />
//                   </div>
//                 </div>
//                 <h2 className="text-2xl font-black text-[#7c3aed] tracking-tighter uppercase italic">Generating Document</h2>
//                 <p className="text-slate-500 font-bold mt-2 animate-pulse">Syncing checkboxes and signatures...</p>
//              </div>
//           )}
//         </div>
//       );
//     }

//     if (showPleurodesisForm || (entityType === "PROCEDURE" && procedureName?.toLowerCase().includes("pleurod"))) {
//       return (
//         <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
//           <ChemicalPleurodesisConsentForm
//             orderId={orderId!}
//             patientName={patientName}
//             mrn={mrn}
//             onCancel={onClose}
//             onPrint={() => {
//               setPleurodesisFormData({
//                 patient_name: patientName,
//                 mrn: mrn,
//               });
//               setIsPrintViewOpen(true);
//             }}
//             onSuccess={(data: any) => {
//               setPleurodesisFormData(data);
//               if (onSuccess) onSuccess();
//               setIsPrintViewOpen(true);
//             }}
//           />
//           {isPrintViewOpen && pleurodesisFormData && createPortal(
//             <div className="hidden">
//               <div id="pleurodesis-print-content">
//                  <ChemicalPleurodesisPrintTemplate formData={pleurodesisFormData} />
//               </div>
//             </div>,
//             document.body
//           )}
//           {isPrintViewOpen && pleurodesisFormData && (
//              <div className="fixed inset-0 z-[60] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
//                 <div className="relative">
//                   <Loader2 className="animate-spin text-[#1e40af] mb-4" size={64} />
//                   <div className="absolute inset-0 flex items-center justify-center">
//                     <Printer className="text-[#1e40af] animate-pulse" size={24} />
//                   </div>
//                 </div>
//                 <h2 className="text-2xl font-black text-[#1e40af] tracking-tighter uppercase italic">Generating Document</h2>
//                 <p className="text-slate-500 font-bold mt-2 animate-pulse">Syncing checkboxes and signatures...</p>
//              </div>
//           )}
//         </div>
//       );
//     }

//     if (dynamicSlug) {
//       return (
//         <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
//           <DynamicConsentForm
//             slug={dynamicSlug}
//             orderId={orderId!}
//             patientName={patientName}
//             mrn={mrn}
//             onTemplateLoaded={setDynamicTemplate}
//             onCancel={onClose}
//             onPrint={() => {
//               setDynamicFormData({ patient_name: patientName, mrn });
//               setIsPrintViewOpen(true);
//             }}
//             onSuccess={(data: any, tmpl: ConsentTemplate) => {
//               setDynamicFormData(data);
//               setDynamicTemplate(tmpl);
//               if (onSuccess) onSuccess();
//               setIsPrintViewOpen(true);
//             }}
//           />
//           {isPrintViewOpen && dynamicFormData && dynamicTemplate && createPortal(
//             <div className="hidden">
//               <div id="dynamic-print-content">
//                 <DynamicConsentPrintTemplate formData={dynamicFormData} templateData={dynamicTemplate} />
//               </div>
//             </div>,
//             document.body
//           )}
//           {isPrintViewOpen && dynamicFormData && (
//              <div className="fixed inset-0 z-[60] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
//                 <div className="relative">
//                   <Loader2 className="animate-spin text-[#1e40af] mb-4" size={64} />
//                   <div className="absolute inset-0 flex items-center justify-center">
//                     <Printer className="text-[#1e40af] animate-pulse" size={24} />
//                   </div>
//                 </div>
//                 <h2 className="text-2xl font-black text-[#1e40af] tracking-tighter uppercase italic">Generating Document</h2>
//                 <p className="text-slate-500 font-bold mt-2 animate-pulse">Syncing checkboxes and signatures...</p>
//              </div>
//           )}
//         </div>
//       );
//     }

//     return (
//       <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
//         <GeneralConsentForm
//           surgery={surgery || { id: entityId, order_id: orderId, mrn, first_name: patientName.split(' ')[0], last_name: patientName.split(' ').slice(1).join(' '), surgery_name: procedureName, ot_case_number: "" } as any}
//           onSuccess={() => {
//             if (onSuccess) onSuccess();
//           }}
//           onCancel={onClose}
//         />
//       </div>
//     );
//   }

//   // ==========================================
//   // RENDER EXISTING CONSENTS (READ-ONLY)
//   // ==========================================
//   if (existingConsent && parsedFormData && !isDraft) {

//     const renderReadOnlyPrintWrapper = (ContentComponent: any, PrintTemplateComponent: any, printId: string) => (
//       <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 overflow-y-auto py-8">
//         <ContentComponent
//           orderId={extConsent.order_id || 0}
//           patientName={extConsent.first_name + " " + extConsent.last_name}
//           mrn={extConsent.mrn}
//           onSuccess={() => {}}
//           onCancel={onClose}
//           onPrint={() => {
//             setIsPrintViewOpen(true);
//             setTimeout(() => {
//               const printContent = document.getElementById(printId);
//               if (printContent) {
//                 const printWindow = window.open('', '_blank');
//                 if (printWindow) {
//                   printWindow.document.write(`
//                     <html>
//                       <head>
//                         <title>${extConsent.consent_form_name || 'Consent'} Print</title>
//                         <script src="https://cdn.tailwindcss.com"></script>
//                         <style>
//                           @media print {
//                             body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
//                             .page-break-before { page-break-before: always; }
//                             .page-break-after { page-break-after: always; }
//                           }
//                         </style>
//                       </head>
//                       <body>${printContent.innerHTML}</body>
//                       <script>
//                         window.onload = () => { 
//                           setTimeout(() => {
//                             window.print(); 
//                           }, 500);
//                         }
//                       </script>
//                     </html>
//                   `);
//                   printWindow.document.close();
//                 }
//               }
//               setTimeout(() => setIsPrintViewOpen(false), 500);
//             }, 1500);
//           }}
//           readOnly={true}
//           viewData={parsedFormData}
//         />
//         {isPrintViewOpen && createPortal(
//           <div className="hidden">
//             <div id={printId}>
//               <PrintTemplateComponent formData={parsedFormData} />
//             </div>
//           </div>,
//           document.body
//         )}
//         {isPrintViewOpen && (
//            <div className="fixed inset-0 z-[100] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
//               <div className="relative">
//                 <Loader2 className="animate-spin text-[#1e40af] mb-4" size={64} />
//                 <div className="absolute inset-0 flex items-center justify-center">
//                   <Printer className="text-[#1e40af] animate-pulse" size={24} />
//                 </div>
//               </div>
//               <h2 className="text-2xl font-black text-[#1e40af] tracking-tighter uppercase italic">Generating Document</h2>
//               <p className="text-slate-500 font-bold mt-2 animate-pulse">Syncing signatures and loading PDF...</p>
//            </div>
//         )}
//       </div>
//     );

//     if (showAsdPdaForm) {
//       return renderReadOnlyPrintWrapper(AsdPdaRepairConsentForm, AsdPdaRepairConsentPrintTemplate, 'asd-pda-print-content');
//     }

//     if (showMyxomaForm) {
//       return renderReadOnlyPrintWrapper(AtrialMyxomaConsentForm, AtrialMyxomaConsentPrintTemplate, 'myxoma-print-content');
//     }

//     if (showIvcForm) {
//       return renderReadOnlyPrintWrapper(IvcFilterConsentForm, IVCFilterConsentPrintTemplate, 'ivc-print-content');
//     } 
    
//     if (showCsForm) {
//       return renderReadOnlyPrintWrapper(CsDeliveryConsentForm, CsDeliveryConsentPrintTemplate, 'cs-print-content');
//     } 
    
//     if (showPleurodesisForm) {
//       return renderReadOnlyPrintWrapper(ChemicalPleurodesisConsentForm, ChemicalPleurodesisPrintTemplate, 'pleurodesis-print-content');
//     } 
    
//     if (dynamicSlug) {
//       return (
//         <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 overflow-y-auto py-8">
//           <DynamicConsentForm
//             slug={dynamicSlug}
//             orderId={extConsent.order_id || 0}
//             patientName={extConsent.first_name + " " + extConsent.last_name}
//             mrn={extConsent.mrn}
//             onTemplateLoaded={setDynamicTemplate}
//             onSuccess={() => {}}
//             onCancel={onClose}
//             onPrint={() => {
//               setIsPrintViewOpen(true);
//               setTimeout(() => {
//                 const printContent = document.getElementById('dynamic-print-content');
//                 if (printContent) {
//                   const printWindow = window.open('', '_blank');
//                   if (printWindow) {
//                     printWindow.document.write(`
//                       <html>
//                         <head>
//                           <title>${extConsent.consent_form_name || 'Consent'} Print</title>
//                           <script src="https://cdn.tailwindcss.com"></script>
//                           <style>
//                             @media print {
//                               body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
//                               .page-break-before { page-break-before: always; }
//                               .page-break-after { page-break-after: always; }
//                             }
//                           </style>
//                         </head>
//                         <body>${printContent.innerHTML}</body>
//                         <script>
//                           window.onload = () => {
//                             setTimeout(() => {
//                               window.print();
//                             }, 500);
//                           }
//                         </script>
//                       </html>
//                     `);
//                     printWindow.document.close();
//                   }
//                 }
//                 setTimeout(() => setIsPrintViewOpen(false), 500);
//               }, 1500);
//             }}
//             readOnly={true}
//             viewData={parsedFormData}
//           />
//           {isPrintViewOpen && dynamicTemplate && createPortal(
//             <div className="hidden">
//               <div id="dynamic-print-content">
//                 <DynamicConsentPrintTemplate formData={parsedFormData} templateData={dynamicTemplate} />
//               </div>
//             </div>,
//             document.body
//           )}
//           {isPrintViewOpen && (
//              <div className="fixed inset-0 z-[100] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
//                 <div className="relative">
//                   <Loader2 className="animate-spin text-[#1e40af] mb-4" size={64} />
//                   <div className="absolute inset-0 flex items-center justify-center">
//                     <Printer className="text-[#1e40af] animate-pulse" size={24} />
//                   </div>
//                 </div>
//                 <h2 className="text-2xl font-black text-[#1e40af] tracking-tighter uppercase italic">Generating Document</h2>
//                 <p className="text-slate-500 font-bold mt-2 animate-pulse">Syncing signatures and loading PDF...</p>
//              </div>
//           )}
//         </div>
//       );
//     } 
    
//     // Fallback for standard General Forms where form_data couldn't explicitly match a high-fidelity wrapper
//     const fakeSurgery = {
//       id: extConsent.order_id || 0,
//       mrn: extConsent.mrn,
//       first_name: extConsent.first_name,
//       last_name: extConsent.last_name,
//     } as any;
//     return (
//       <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 overflow-y-auto py-8">
//         <GeneralConsentForm
//           surgery={fakeSurgery}
//           onCancel={onClose}
//           readOnly={true}
//           viewData={parsedFormData}
//         />
//       </div>
//     );
//   }

//   // ==========================================
//   // RENDER FALLBACK OLD LEGACY CONSENTS
//   // ==========================================
//   return (
//     <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//       <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
//         {/* Header */}
//         <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
//           <div className="flex items-center gap-3">
//             {onBackToActions && (
//               <button
//                 onClick={onBackToActions}
//                 className="p-1.5 bg-white border border-slate-200 shadow-sm text-slate-500 rounded-lg hover:bg-slate-100 transition-colors mr-1"
//                 title="Back to Actions"
//               >
//                 <ArrowLeft size={18} />
//               </button>
//             )}
//             <div>
//               <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
//                 <FileText className="text-brand-primary" size={20} />
//                 View Consent
//               </h3>
//               <p className="text-xs text-slate-500 font-bold uppercase">
//                 {extConsent?.consent_form_name || procedureName}
//               </p>
//             </div>
//           </div>
//           <button
//             onClick={onClose}
//             className="text-slate-400 hover:text-slate-600 transition-colors"
//           >
//             <XCircle size={24} />
//           </button>
//         </div>
//         <div className="p-6 overflow-y-auto flex-1">
//           <div className="text-center p-8 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm">
//             Legacy consent format detected. Please view Full PDF for details.
//           </div>
//         </div>
//         <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
//           <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors">Close</button>
//           <button onClick={() => setIsPrintViewOpen(true)} className="px-6 py-3 rounded-xl font-bold text-white bg-brand-primary hover:bg-brand-primary shadow-lg shadow-brand-active transition-all flex items-center gap-2">
//             <Printer size={18} /> View Full PDF
//           </button>
//         </div>
//       </div>
//       <ConsentPrintView
//         isOpen={isPrintViewOpen}
//         onClose={() => setIsPrintViewOpen(false)}
//         consent={existingConsent}
//       />
//     </div>
//   );
// };

// export default ConsentModal;
