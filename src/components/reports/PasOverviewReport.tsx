import React, { useState, useEffect } from "react";
import { Users, Mars, Venus, Activity, Skull, Baby, Accessibility } from "lucide-react";
import apiClient from "../../api/client";
import {
  renderValue,
  TimeframeSelect,
  CustomDateInputs,
  buildTimeframeParams,
  ReportShell,
  KpiCard,
} from "./billingReportShared";

const PasOverviewReport: React.FC = () => {
  const [metadata, setMetadata] = useState<any>(null);
  const [kpis, setKpis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [timeframe, setTimeframe] = useState("all_time");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      const params = buildTimeframeParams(timeframe, dateFrom, dateTo);
      const query = params.length ? `?${params.join("&")}` : "";
      const response = await apiClient.get(`/patient-admin/overview/report${query}`);
      if (response.data && response.data.data) {
        setKpis(response.data.data.kpis || null);
        setMetadata(response.data.data.metadata || null);
      } else {
        setKpis(null);
        setMetadata(null);
      }
    } catch (error) {
      console.error("Failed to fetch Executive PAS Overview:", error);
      setKpis(null);
      setMetadata(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe, dateFrom, dateTo]);

  return (
    <ReportShell
      title="Executive PAS Overview"
      subtitle="High-level patient administration KPIs across the selected period."
      metaLine={metadata ? `Period: ${renderValue(metadata.period)}` : undefined}
      isLoading={isLoading}
      onClear={() => {
        setTimeframe("all_time");
        setDateFrom("");
        setDateTo("");
      }}
      onRefresh={fetchReportData}
      exportData={kpis ? [kpis] : []}
      exportFilename="executive_pas_overview"
      filters={
        <>
          <TimeframeSelect value={timeframe} onChange={setTimeframe} disabled={isLoading} />
          {timeframe === "custom" && (
            <CustomDateInputs dateFrom={dateFrom} dateTo={dateTo} setDateFrom={setDateFrom} setDateTo={setDateTo} disabled={isLoading} />
          )}
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Users} label="Total Registrations" value={renderValue(kpis?.total_registrations)} colorClass="bg-blue-50 border-blue-100 text-blue-900" />
        <KpiCard icon={Mars} label="Male" value={renderValue(kpis?.male_count)} colorClass="bg-sky-50 border-sky-100 text-sky-900" />
        <KpiCard icon={Venus} label="Female" value={renderValue(kpis?.female_count)} colorClass="bg-pink-50 border-pink-100 text-pink-900" />
        <KpiCard icon={Activity} label="Active Patients" value={renderValue(kpis?.active_patients)} colorClass="bg-emerald-50 border-emerald-100 text-emerald-900" />
        <KpiCard icon={Skull} label="Deceased" value={renderValue(kpis?.deceased_count)} colorClass="bg-slate-50 border-slate-200 text-slate-900" />
        <KpiCard icon={Baby} label="Pediatric" value={renderValue(kpis?.pediatric_count)} colorClass="bg-amber-50 border-amber-100 text-amber-900" />
        <KpiCard icon={Accessibility} label="Geriatric" value={renderValue(kpis?.geriatric_count)} colorClass="bg-purple-50 border-purple-100 text-purple-900" />
      </div>
    </ReportShell>
  );
};

export default PasOverviewReport;