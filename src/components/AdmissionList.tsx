import React, { useState, useEffect } from "react";
import { Loader2, Search, Filter, RefreshCw, Bed, ChevronRight, Printer } from "lucide-react";
import { patientService } from "../services/patient.service";
import { useNotification } from "../context/NotificationContext";

export const AdmissionList: React.FC = () => {
  const { notify } = useNotification();
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchAdmissions = async () => {
    setIsLoading(true);
    try {
      const data = await patientService.getAdmissionList();
      setAdmissions(data?.results || []);
    } catch (err: any) {
      console.error("Error fetching admission list:", err);
      notify("Failed to fetch admission list", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmissions();
  }, []);

  const filteredAdmissions = admissions.filter((adm: any) => {
    const search = searchTerm.toLowerCase();
    return (
      (adm.admission_number || "").toLowerCase().includes(search) ||
      (adm.mrn || "").toLowerCase().includes(search) ||
      (adm.first_name || "").toLowerCase().includes(search) ||
      (adm.last_name || "").toLowerCase().includes(search) ||
      (adm.ward_name || "").toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-brand-primary text-white rounded-xl shadow-lg shadow-brand-active">
              <Bed size={20} />
            </div>
            Admission List
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            View all current patient admissions.
          </p>
        </div>

        <div className="bg-white rounded-[32px] border shadow-sm relative group">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
            <input
              type="text"
              placeholder="Search by Patient Name, MRN, Admission No, or Ward..."
              className="w-full pl-14 pr-6  bg-slate-50 border-2 rounded-[24px] text-lg font-bold text-slate-800 focus:bg-white focus:border-brand-active0 outline-none transition-all shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>


        <div className="flex items-center gap-3">
          <button
            onClick={fetchAdmissions}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>



      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden min-h-[100vh]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={40} className="text-brand-primary animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Loading admissions...</p>
          </div>
        ) : filteredAdmissions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Admission Details</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Patient Details</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Payer Type</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAdmissions.map((adm: any) => (
                  <tr key={adm.admission_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{adm.admission_number}</div>
                      <div className="text-sm text-slate-500">{new Date(adm.admission_date).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{adm.first_name} {adm.last_name}</div>
                      <div className="text-sm text-slate-500">MRN: {adm.mrn} • {adm.age_years}Y / {adm.gender}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{adm.ward_name || "Unassigned"}</div>
                      <div className="text-sm text-slate-500">
                        {adm.room_number ? `${adm.room_number} - ${adm.bed_number}` : "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{adm.payer_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${
                        adm.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"
                      }`}>
                        {adm.status}
                      </span>
                      {adm.discharge_stage && adm.discharge_stage !== "N/A" && (
                        <div className="mt-1 text-xs text-brand-primary font-bold">
                          {adm.discharge_stage.replace("_", " ")}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => window.open(`/print/wristband/${adm.admission_number}`, '_blank')}
                          className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-brand-primary transition-all shadow-sm"
                          title="Print Wristband"
                        >
                          <Printer size={18} />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-brand-primary transition-colors hover:bg-brand-50 rounded-lg">
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Bed size={32} className="text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No Admissions Found</h3>
            <p className="text-slate-500">There are no matching admissions at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
};
export default AdmissionList;
