import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { inventoryService } from "../../../services/inventory.service";
import { Loader2, AlertTriangle, Printer } from "lucide-react";

const InventoryItemLabelPrintTemplate: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<any>(null);
  const [closestExpiry, setClosestExpiry] = useState<string>("N/A");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!id) throw new Error("No item ID provided");

        // Fetch item details
        const itemsList = await inventoryService.searchItems();
        const foundItem = itemsList.find((i: any) => i.id === Number(id));

        if (!foundItem) throw new Error("Item not found");
        setItem(foundItem);

        // Fetch batches to find closest expiry
        const allBatches = await inventoryService.searchBatches();
        const itemBatches = allBatches.filter(
          (b: any) => b.item_id === Number(id) && b.is_active === 1 && b.expiry_date
        );

        if (itemBatches.length > 0) {
          // Sort by expiry date ascending
          itemBatches.sort(
            (a: any, b: any) =>
              new Date(a.expiry_date).getTime() -
              new Date(b.expiry_date).getTime()
          );
          
          const exp = itemBatches[0].expiry_date;
          // Format as DD/MM/YYYY or YYYY-MM
          const d = new Date(exp);
          const formattedExp = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
          setClosestExpiry(formattedExp);
        }

        setTimeout(() => window.print(), 800);
      } catch (err: any) {
        setError(err.message || "Could not load label data.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 size={32} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <AlertTriangle size={32} className="text-red-500 mb-2" />
        <p className="text-slate-600 font-semibold">{error || "Error"}</p>
      </div>
    );
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
    item.items_uhid || "UNKNOWN"
  )}`;

  return (
    <>
      <style>{`
        @page {
          size: 12mm 40mm;
          margin: 0;
        }
        @media print {
          body, html {
            margin: 0;
            padding: 0;
            width: 12mm;
            height: 40mm;
            background: white !important;
          }
        }
      `}</style>
      
      {/* Screen Toolbar - Hidden on Print */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-8 print:hidden z-[100] shadow-md">
        <div>
          <p className="font-black text-sm">Item Label Print Preview</p>
          <p className="text-[10px] text-slate-400 font-mono">
            {item.items_uhid} • 12mm x 40mm
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-slate-900 bg-white transition-all hover:bg-slate-200"
        >
          <Printer size={15} /> Print Label
        </button>
      </div>

      {/* Actual Label Area */}
      {/* We center it on screen, but remove all margins on print */}
      <div className="flex items-center justify-center min-h-screen bg-slate-200 print:bg-white print:min-h-0 print:block pt-16 print:pt-0">
        <div 
          className="bg-white overflow-hidden flex flex-col items-center print:border-none shadow-lg print:shadow-none"
          style={{
            width: "12mm",
            height: "40mm",
            padding: "1mm",
            boxSizing: "border-box"
          }}
        >
          {/* Top: QR Code */}
          <div className="shrink-0 w-full flex items-center justify-center mb-[1mm]">
            <img 
              src={qrUrl} 
              alt="QR" 
              className="object-contain" 
              style={{ width: "10mm", height: "10mm", mixBlendMode: "multiply" }} 
            />
          </div>

          {/* Bottom: Details (Rotated) */}
          <div 
            className="w-full flex-1 overflow-hidden"
            style={{ 
              writingMode: "vertical-rl", 
              textOrientation: "mixed",
              lineHeight: 1.1,
              paddingRight: "0.5mm"
            }}
          >
            <p className="font-black uppercase truncate text-black" style={{ fontSize: "7pt" }}>
              {item.name}
            </p>
            <p className="font-bold text-black uppercase whitespace-nowrap" style={{ fontSize: "5pt", marginRight: "1.5mm" }}>
              ID: {item.items_uhid}
            </p>
            <p className="font-bold text-black uppercase whitespace-nowrap" style={{ fontSize: "5pt", marginRight: "1.5mm" }}>
              EXP: {closestExpiry}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default InventoryItemLabelPrintTemplate;
