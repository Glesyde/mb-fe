import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../api/client';
import { Loader2, AlertTriangle, Printer } from 'lucide-react';

const WristbandPrintView: React.FC = () => {
  const { admissionId } = useParams<{ admissionId: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!admissionId) return;
      try {
        const response = await apiClient.get(`/ipd/admission/list`, {
          params: { admission_number: admissionId }
        });
        const result = response?.data?.data?.results || response?.data?.results || [];
        if (result.length > 0) {
          setData(result[0]);
          setTimeout(() => window.print(), 1000);
        } else {
          setError('Admission record not found.');
        }
      } catch (err) {
        setError('Could not load admission details.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [admissionId]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '--/--/----';
    const date = new Date(dateString);
    return `${String(date.getDate()).padStart(2, '0')}-${date.toLocaleString('default', { month: 'short' })}-${date.getFullYear()}`;
  };

  const QRPlaceholder = ({ value }: { value: string }) => (
    <svg width="22mm" height="22mm" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="30" height="30" fill="black" />
      <rect x="5" y="5" width="20" height="20" fill="white" />
      <rect x="10" y="10" width="10" height="10" fill="black" />
      <rect x="70" y="0" width="30" height="30" fill="black" />
      <rect x="75" y="5" width="20" height="20" fill="white" />
      <rect x="80" y="10" width="10" height="10" fill="black" />
      <rect x="0" y="70" width="30" height="30" fill="black" />
      <rect x="5" y="75" width="20" height="20" fill="white" />
      <rect x="10" y="80" width="10" height="10" fill="black" />
      {[35, 40, 45, 50, 55, 60, 65].map(x =>
        [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95].map(y =>
          Math.random() > 0.5 ? <rect key={`${x}-${y}`} x={x} y={y} width="5" height="5" fill="black" /> : null
        )
      )}
    </svg>
  );

  const barWidths = [3, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 2, 1, 3, 1, 2, 3, 1, 1, 2, 1, 3, 2, 1, 2, 1, 1, 3, 1, 2, 1, 2, 3, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 size={48} className="animate-spin text-[#3B309A]" />
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

  const WristbandContent = () => (
    <div className="wristband-label">
      {/* LEFT SECTION: Logo + QR codes */}
      <div className="label-left">
        <div className="hospital-logo">
          <div className="logo-icon">✦</div>
          <div className="logo-text">
            <div className="logo-name">Medbookie</div>
            <div className="logo-sub">HOSPITALS</div>
          </div>
        </div>
        <div className="qr-stack">
          <QRPlaceholder value={data?.admission_number ?? ''} />
          <QRPlaceholder value={data?.mrn ?? ''} />
        </div>
      </div>

      {/* RIGHT SECTION: Patient info + barcode */}
      <div className="label-right">
        <div className="patient-info">
          <div className="patient-name">
            {data?.last_name?.toUpperCase()}, {data?.first_name?.toUpperCase()}
          </div>
          <div className="info-row">
            <span className="info-label">MRN</span>
            <span className="info-colon">:</span>
            <span className="info-value">{data?.mrn ?? 'UNKNOWN'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">DOB</span>
            <span className="info-colon">:</span>
            <span className="info-value">
              {formatDate(data?.date_of_birth)}
              &nbsp;&nbsp;Age : {data?.age_years ?? '--'} Y
              &nbsp;&nbsp;Sex : {data?.gender?.charAt(0)?.toUpperCase() ?? 'U'}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Allergies</span>
            <span className="info-colon">:</span>
            <span className="info-value">
              {data?.known_allergies ? `ALGY ${data.known_allergies.toUpperCase()}` : 'NKDA'}
              {/* &nbsp;&nbsp;{data?.ward_name ?? '--'} / Bed {data?.bed_number ?? '--'} */}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Dr</span>
            <span className="info-colon">:</span>
            <span className="info-value">{data?.doctor_first_name} {data?.doctor_last_name}</span>
          </div>
        </div>

        {/* Barcode */}
        <div className="barcode-section">
          <div className="barcode-bars">
            {barWidths.map((w, i) => (
              <div key={i} className="barcode-bar" style={{ width: `${w * 1.2}px` }} />
            ))}
          </div>
          <div className="barcode-text">
            {data?.known_allergies ? `ALGY ${data.known_allergies.toUpperCase()}` : 'NKDA'}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        /* ═══════════════════════════════════════════
           PRINT STYLES — Brother TD-2130N
           Media: 29mm x 203mm, Portrait orientation
           Content pushed 30mm from left (glue/clasp end)
           leaving right side free for adjustable holes
        ═══════════════════════════════════════════ */
        @media print {
          @page {
            size: 203mm 29mm;
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 203mm !important;
            height: 29mm !important;
            overflow: hidden !important;
            background: white !important;
          }
          .no-print { display: none !important; }
          .screen-wrapper { all: unset !important; }

          .wristband-label {
            /*
              Total wristband: 203mm
              Left glue/clasp zone: ~30mm  → left margin
              Right holes zone:    ~20mm  → right margin
              Usable content area: ~153mm wide
            */
            width: 153mm !important;
            height: 27mm !important;
            margin: 1mm 20mm 1mm 30mm !important;
            padding: 0 !important;
            display: flex !important;
            flex-direction: row !important;
            align-items: stretch !important;
            box-sizing: border-box !important;
            background: white !important;
            overflow: hidden !important;
            transform: none !important;
            position: static !important;
          }
          .barcode-bar {
            background: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Ensure SVG QR codes print in color */
          svg rect { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }

        /* ═══════════════════════════════════════════
           SCREEN STYLES — scaled preview
           Shows the full 203mm band with glue zone
           indicated on left and holes on right
        ═══════════════════════════════════════════ */
        @media screen {
          .screen-wrapper {
            min-height: 100vh;
            background: #f1f5f9;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 80px 40px 40px;
          }

          /* Full wristband shell: 203mm × 29mm scaled ~4x */
          .wristband-outer {
            width: 812px;
            height: 116px;
            border-radius: 8px;
            border: 2px solid #cbd5e1;
            overflow: hidden;
            box-shadow: 0 8px 24px rgba(0,0,0,0.15);
            background: white;
            display: flex;
            flex-direction: row;
            align-items: stretch;
            position: relative;
          }

          /* Glue zone indicator — left ~30mm → ~120px at 4x */
          .glue-zone {
            width: 120px;
            background: #fef9c3;
            border-right: 2px dashed #fbbf24;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .glue-zone-label {
            font-size: 8px;
            font-weight: 700;
            color: #92400e;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            writing-mode: vertical-rl;
            text-orientation: mixed;
            transform: rotate(180deg);
          }

          /* Content area: 153mm → ~612px at 4x */
          .wristband-label {
            width: 612px;
            height: 100%;
            display: flex;
            flex-direction: row;
            align-items: stretch;
            background: white;
            padding: 6px 8px;
            box-sizing: border-box;
            gap: 10px;
          }

          /* Holes zone indicator — right ~20mm → ~80px at 4x */
          .holes-zone {
            flex: 1;
            background: #f8fafc;
            border-left: 2px dashed #94a3b8;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            padding: 0 6px;
            flex-wrap: wrap;
          }
          .hole {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            border: 1.5px solid #94a3b8;
            background: #f1f5f9;
            flex-shrink: 0;
          }
        }

        /* ═══════════════════════════════════════════
           SHARED CONTENT STYLES
        ═══════════════════════════════════════════ */
        .label-left {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
          border-right: 1px solid #e2e8f0;
          padding-right: 8px;
        }
        .hospital-logo {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        .logo-icon {
          font-size: 16px;
          color: #1e3a8a;
          line-height: 1;
        }
        .logo-name {
          font-size: 6.5px;
          font-weight: 900;
          color: #1e3a8a;
          letter-spacing: 0.5px;
          text-align: center;
        }
        .logo-sub {
          font-size: 5.5px;
          font-weight: 700;
          color: #1e3a8a;
          letter-spacing: 0.3px;
          text-align: center;
        }
        .qr-stack {
          display: flex;
          flex-direction: row;
          gap: 3px;
        }
        .qr-stack svg {
          width: 42px;
          height: 42px;
        }

        .label-right {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
        }
        .patient-info {
          display: flex;
          flex-direction: column;
          gap: 0.5px;
        }
        .patient-name {
          font-size: 10px;
          font-weight: 900;
          color: black;
          letter-spacing: 0.3px;
          margin-bottom: 1px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .info-row {
          display: flex;
          flex-direction: row;
          font-size: 7.5px;
          font-weight: 600;
          color: black;
          white-space: nowrap;
          overflow: hidden;
        }
        .info-label {
          width: 45px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .info-colon {
          width: 8px;
          flex-shrink: 0;
        }
        .info-value {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .barcode-section {
          display: flex;
          flex-direction: column;
          gap: 1px;
          margin-top: 2px;
        }
        .barcode-bars {
          display: flex;
          flex-direction: row;
          gap: 1px;
          height: 12px;
          align-items: stretch;
        }
        .barcode-bar {
          background: black;
          height: 100%;
          flex-shrink: 0;
        }
        .barcode-text {
          font-size: 5.5px;
          font-weight: 600;
          color: black;
          letter-spacing: 0.8px;
          text-align: left;
        }
      `}</style>

      {/* Top bar */}
      <div className="no-print" style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '56px',
        background: '#0f172a', color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', zIndex: 50
      }}>
        <span style={{ fontWeight: 700, fontSize: '14px' }}>Wristband Preview — 29mm × 203mm</span>
        <button onClick={() => window.print()} style={{
          background: '#059669', color: 'white', border: 'none',
          padding: '8px 20px', borderRadius: '8px', fontWeight: 700,
          fontSize: '12px', cursor: 'pointer', display: 'flex',
          alignItems: 'center', gap: '6px'
        }}>
          <Printer size={14} /> Print Now
        </button>
      </div>

      <div className="screen-wrapper">

        {/* Screen preview — shows glue zone, content zone, holes zone */}
        <div className="wristband-outer no-print">
          {/* Left: glue/clasp zone */}
          <div className="glue-zone">
            <span className="glue-zone-label">Glue / Clasp</span>
          </div>

          {/* Center: actual printed content */}
          <WristbandContent />

          {/* Right: adjustable holes zone */}
          <div className="holes-zone">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="hole" />
            ))}
          </div>
        </div>

        {/* Print-only label — positioned with margins via CSS */}
        <WristbandContent />

        {/* Legend */}
        <div className="no-print" style={{
          display: 'flex', gap: '24px', marginTop: '12px',
          fontSize: '11px', color: '#64748b', alignItems: 'center'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', background: '#fef9c3', border: '1.5px dashed #fbbf24', display: 'inline-block', borderRadius: '2px' }} />
            Glue / clasp zone (~30mm)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', background: 'white', border: '1.5px solid #cbd5e1', display: 'inline-block', borderRadius: '2px' }} />
            Print area (~153mm)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', background: '#f8fafc', border: '1.5px dashed #94a3b8', display: 'inline-block', borderRadius: '2px' }} />
            Adjustable holes (~20mm)
          </span>
        </div>

        <p className="no-print" style={{
          textAlign: 'center', fontSize: '11px', color: '#94a3b8', marginTop: '8px'
        }}>
          Brother TD-2130N · Portrait · 29mm × 203mm · Content margin: 30mm left, 20mm right
        </p>
      </div>
    </>
  );
};

export default WristbandPrintView;