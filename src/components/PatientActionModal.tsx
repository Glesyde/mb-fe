import React, { useState } from "react";
import { X, FileText, Users, History } from "lucide-react";
import PatientDemographics from "./PatientDemographics";
import PatientDocuments from "./PatientDocuments";
import PatientHistory from "./PatientHistory";

interface PatientActionModalProps {
  isOpen: boolean;
  mrn: string;
  onClose: () => void;
}

type TabType = "details" | "documents" | "history";

const PatientActionModal: React.FC<PatientActionModalProps> = ({
  isOpen,
  mrn,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("details");

  if (!isOpen) return null;

  const tabs: { id: TabType; label: string; icon: React.ComponentType<any> }[] =
    [
      { id: "details", label: "Details", icon: Users },
      { id: "documents", label: "Documents", icon: FileText },
      { id: "history", label: "History", icon: History },
    ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Patient Information
            </h2>
            <p className="text-slate-500 text-sm mt-1">MRN: {mrn}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-8 pt-4 border-b border-slate-200 bg-slate-50/50">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-bold transition-all border-b-2 ${
                  activeTab === tab.id
                    ? "text-brand-primary border-brand-primary"
                    : "text-slate-500 border-transparent hover:text-slate-700"
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="p-8">
            {activeTab === "details" && (
              <div className="space-y-6">
                <PatientDemographics />
              </div>
            )}

            {activeTab === "documents" && (
              <div className="space-y-6">
                <PatientDocuments />
              </div>
            )}

            {activeTab === "history" && (
              <div className="space-y-6">
                <PatientHistory />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-brand-primary hover:bg-brand-primary text-white rounded-2xl font-bold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientActionModal;
