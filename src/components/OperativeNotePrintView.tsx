import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { otService, OTSurgery } from "../services/ot.service";
import OperativeNotePrintTemplate from "./print-templates/theatre/OperativeNotePrintTemplate";
import { Loader2, AlertTriangle } from "lucide-react";

const OperativeNotePrintView: React.FC = () => {
  const { otCaseId } = useParams<{ otCaseId: string }>();
  const [noteData, setNoteData] = useState<any>(null);
  const [surgery, setSurgery] = useState<OTSurgery | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!otCaseId) return;
      try {
        const id = parseInt(otCaseId);
        
        // Fetch existing note
        const note = await otService.getOperativeNote(id);
        if (!note) {
          setError("Operative note not found.");
          setLoading(false);
          return;
        }
        setNoteData(note);

        // Fetch surgery details for the template fallback
        const surgeries = await otService.getSurgeries();
        const foundSurgery = surgeries.find((s: OTSurgery) => s.id === id);
        if (foundSurgery) {
          setSurgery(foundSurgery);
        }

        // Auto-print after a short delay
        setTimeout(() => {
          window.print();
        }, 1000);
      } catch (err) {
        console.error("Print fetch error:", err);
        setError("Could not load operative note details.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [otCaseId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-[#3B309A] mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Preparing Operative Note for printing...</p>
        </div>
      </div>
    );
  }

  if (error || !noteData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Print Error</h2>
          <p className="text-slate-500">{error || "The operative note data could not be retrieved."}</p>
          <button 
            onClick={() => window.close()}
            className="mt-6 bg-slate-800 text-white px-6 py-2 rounded-lg font-bold text-sm"
          >
            Close Window
          </button>
        </div>
      </div>
    );
  }

  return (
    <OperativeNotePrintTemplate
      isOpen={true}
      onClose={() => window.close()}
      formData={noteData}
      surgery={surgery || noteData as any} // Fallback to noteData which has patient fields
    />
  );
};

export default OperativeNotePrintView;
