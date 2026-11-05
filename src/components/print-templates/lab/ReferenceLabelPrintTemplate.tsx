import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const ReferenceLabelPrintTemplate: React.FC = () => {
  const { referenceNo } = useParams<{ referenceNo: string }>();
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    // Load from localStorage which was set before opening this window
    const saved = localStorage.getItem('printLabOrder');
    if (saved) {
      setOrder(JSON.parse(saved));
    }
    
    // Auto trigger print when loaded
    setTimeout(() => {
      window.print();
    }, 500);
  }, []);

  if (!order) return null;

  const refNo = order.reference_no || String(order.id);
  const patientName = order.patient_name || `${order.first_name || ''} ${order.last_name || ''}`.trim() || 'N/A';
  const mrn = order.mrn || 'N/A';
  const testName = order.sample_name || order.service_name || 'N/A';
  const encNum = order.encounter_number || 'N/A';

  return (
    <div 
      style={{
        fontFamily: 'monospace',
        fontSize: '8px',
        margin: 0,
        padding: '2mm',
        background: '#fff',
        color: '#000',
        width: '46mm',
        height: '21mm',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      <style>
        {`
          @page { size: 50mm 25mm; margin: 0; }
          body { margin: 0; padding: 0; }
        `}
      </style>
      <div>
        <div style={{ fontSize: '10px', fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid #000', paddingBottom: '1mm', marginBottom: '1mm' }}>
          {refNo}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1mm', fontSize: '7px', lineHeight: 1.1 }}>
          <div><span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>Pt:</span> {patientName}</div>
          <div><span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>MRN:</span> {mrn}</div>
          <div><span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>Test:</span> {testName.substring(0, 15)}</div>
          <div><span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>Enc:</span> {encNum}</div>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1mm' }}>
            {order.barcode_path && (
              <img src={`${import.meta.env.VITE_API_BASE_URL}${order.barcode_path}`} alt="Barcode" style={{ height: '6mm', width: 'auto', maxWidth: '35mm' }} />
            )}
            {order.qr_code_path && (
              <img src={`${import.meta.env.VITE_API_BASE_URL}${order.qr_code_path}`} alt="QR Code" style={{ height: '8mm', width: '8mm' }} />
            )}
          </div>
          <div style={{ fontSize: '6px', textAlign: 'center', textTransform: 'uppercase', marginTop: 'auto' }}>
            Medbookiehospitals · lab
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferenceLabelPrintTemplate;
