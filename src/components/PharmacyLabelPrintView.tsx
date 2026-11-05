import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { pharmacyService } from '../services/pharmacy.service';
import { Loader2, AlertTriangle, Printer } from 'lucide-react';

const PharmacyLabelPrintView: React.FC = () => {
  const { dispensingId } = useParams<{ dispensingId: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!dispensingId) return;
      try {
        setLoading(true);
        const response = await pharmacyService.getDispensingLabel(dispensingId);
        const labelData = response?.data;

        if (labelData) {
          setData(labelData);
          setTimeout(() => {
            window.print();
          }, 800);
        } else {
          setError('Dispensing record not found.');
        }
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Could not load dispensing details.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dispensingId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 size={48} className="animate-spin text-teal-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
          <AlertTriangle size={32} className="text-red-600 mx-auto mb-4" />
          <p className="text-slate-500">{error || 'Data unavailable.'}</p>
        </div>
      </div>
    );
  }

  const med = data.medication || data;
  const pt = data.patient || data;
  const disp = data.dispensing || data;

  const drugName = med.drug_name || 'Unknown Drug';
  const strength = med.original_strength || med.strength || '';
  const fullDrugDisplay = strength ? `${drugName} ${strength}` : drugName;


  // Build a conversational, easy-to-read sentence
  const formatDirections = () => {
    const parts: string[] = [];
    
    // 1. Calculate Human-Readable Quantity (Dosage ÷ Strength)
    let parsedDosage = med.dosage;
    if (med.dosage && strength) {
      // Extract numeric values from strings (e.g., "1000mg" -> 1000)
      const dosageNum = parseFloat(String(med.dosage).replace(/[^0-9.]/g, ''));
      const strengthNum = parseFloat(String(strength).replace(/[^0-9.]/g, ''));

      if (dosageNum && strengthNum) {
        const ratio = dosageNum / strengthNum;
        
        // Convert common ratios to words
        let amountStr = ratio.toString();
        if (ratio === 0.25) amountStr = "Quarter";
        else if (ratio === 0.5) amountStr = "Half";
        else if (ratio === 1) amountStr = "One";
        else if (ratio === 1.5) amountStr = "One and a half";
        else if (ratio === 2) amountStr = "Two";
        else if (ratio === 3) amountStr = "Three";
        else if (ratio === 4) amountStr = "Four";

        // Determine formulation type from the drug name
        let form = "unit";
        const lowerName = drugName.toLowerCase();
        if (lowerName.includes('tab')) form = "tablet";
        else if (lowerName.includes('cap')) form = "capsule";
        else if (lowerName.includes('supp')) form = "suppository";

        // Pluralize if needed (e.g., "tablets")
        if (ratio > 1 && amountStr !== "Half" && amountStr !== "Quarter") {
           form += "s"; 
        }
        
        parsedDosage = `${amountStr} ${form}`;
      }
    }

    if (parsedDosage) parts.push(parsedDosage);

    // 2. Build the rest of the sentence to match the physical label style
    if (med.route) {
      const cleanRoute = med.route.toLowerCase().includes('oral') ? 'by mouth' : med.route;
      parts.push(`to be taken ${cleanRoute}`);
    } else {
      parts.push('to be taken');
    }

    if (med.frequency) parts.push(med.frequency.toLowerCase());
    if (med.duration) parts.push(`for ${med.duration.replace(/^for\s+/i, '')}`);

    let sentence = parts.join(' ').trim();
    
    // Capitalize the first letter for proper formatting
    if (sentence) {
        sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);
    }

    const extra = med.instructions || med.special_instructions || data.instructions;
    if (extra) {
      sentence = sentence ? `${sentence}. ${extra}` : extra;
    }

    return sentence || 'Use as directed by your physician.';
  };
  
  // Build a conversational, easy-to-read sentence
  // const formatDirections = () => {
  //   const parts: string[] = [];
  //   if (med.dosage) parts.push(med.dosage);
  //   if (med.route) {
  //     const cleanRoute = med.route.toLowerCase().includes('oral') ? 'by mouth' : med.route;
  //     parts.push(cleanRoute);
  //   }
  //   if (med.frequency) parts.push(med.frequency);
  //   if (med.duration) parts.push(`for ${med.duration.replace(/^for\s+/i, '')}`);

  //   let sentence = parts.join(' ').trim();
  //   if (sentence && !/^take/i.test(sentence)) {
  //     sentence = `Take ${sentence}`;
  //   }

  //   const extra = med.instructions || med.special_instructions || data.instructions;
  //   if (extra) {
  //     sentence = sentence ? `${sentence}. ${extra}` : extra;
  //   }

  //   return sentence || 'Use as directed by your physician.';
  // };

  const patientName = pt.name || pt.patient_name || 'Unknown Patient';
  const dispDate = disp.dispensed_at ? new Date(disp.dispensed_at).toLocaleDateString('en-GB') : '';

  return (
    <div className="bg-slate-100 min-h-screen w-full flex flex-col items-center justify-center print:bg-white print:h-auto print:block font-sans">
      <style>
        {`
          @media print {
            @page { 
              size: 50mm 25mm; 
              margin: 0mm !important; 
            }
            html, body { 
              width: 50mm !important; 
              height: 25mm !important; 
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
              background: #fff !important;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            .no-print { 
              display: none !important; 
            }
            .print-container { 
              width: 50mm !important; 
              height: 25mm !important; 
              max-height: 25mm !important;
              padding: 1.2mm 1.6mm !important;
              margin: 0 !important;
              border: none !important;
              box-shadow: none !important;
              box-sizing: border-box !important;
              page-break-after: avoid !important;
              page-break-inside: avoid !important;
              overflow: hidden !important;
            }
            * { 
              color: #000 !important; 
              box-sizing: border-box !important;
              text-align: left !important;
            }
          }
        `}
      </style>

      {/* Top Navbar */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-8 no-print z-50 shadow-md">
        <p className="font-bold text-sm">Pharmacy Label Preview</p>
        <button 
          onClick={() => window.print()} 
          className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all"
        >
          <Printer size={16} /> Print Now
        </button>
      </div>

      {/* 50mm x 25mm Thermal Label Container */}
      <div className="bg-white p-[1.5mm] w-[50mm] h-[25mm] max-h-[25mm] shadow-xl print-container mt-20 border border-dashed border-gray-400 flex flex-col justify-between overflow-hidden box-border text-left">
        
        {/* Upper Block: Medication & Conversational Directions */}
        <div className="text-left">
          {/* Drug Name & Strength: High-contrast, large text */}
          <div className="font-black text-[9.5pt] leading-[1.05] uppercase border-b border-black pb-[0.3mm] mb-[0.4mm] break-words text-left">
            {fullDrugDisplay}
          </div>

          {/* Conversational Explanation */}
          <div className="text-[8pt] font-extrabold leading-[1.1] text-black break-words text-left">
            {formatDirections()}
          </div>
        </div>

        {/* Lower Block: Left-Aligned Patient Metadata */}
        <div className="mt-auto border-t border-black pt-[0.4mm] text-left">
          <div className="text-[6.5pt] font-bold text-black leading-tight truncate text-left">
            Patient: <span className="font-black">{patientName}</span>
          </div>
          <div className="text-[5.5pt] font-semibold text-black leading-tight text-left">
            {dispDate} &bull; Gracespring Hospitals Ltd
          </div>
        </div>

      </div>

      <p className="text-center text-xs text-slate-400 mt-4 no-print">Preview (50mm x 25mm thermal label)</p>
    </div>
  );
};

export default PharmacyLabelPrintView;

