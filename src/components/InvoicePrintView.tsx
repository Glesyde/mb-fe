import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { billingService } from "../services/billing.service";
import PrintTemplate from "./PrintTemplate";
import { Loader2, AlertTriangle, Printer } from "lucide-react";

const InvoicePrintView: React.FC = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!type || !id) {
        setError("Invalid invoice parameters");
        setLoading(false);
        return;
      }

      try {
        const response = await billingService.getInvoiceDetails(
          type as "INVOICE" | "ADVANCE",
          parseInt(id),
        );

        if (response.status === "success" && response.data) {
          setData(response.data);
        } else {
          setError("Invoice details not found");
        }
      } catch (err: any) {
        setError(err.message || "Could not load invoice details");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [type, id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 size={48} className="animate-spin text-brand-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
          <AlertTriangle size={32} className="text-red-600 mx-auto mb-4" />
          <p className="text-slate-600 font-semibold mb-2">
            Error Loading Invoice
          </p>
          <p className="text-slate-500">
            {error || "Invoice details unavailable"}
          </p>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-NG", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "emerald";
      case "OPEN":
        return "amber";
      case "PENDING":
        return "yellow";
      case "SUCCESS":
        return "blue";
      default:
        return "slate";
    }
  };

  return (
    <div className="bg-slate-100 h-screen w-full overflow-y-auto print:bg-white print:h-auto print:overflow-visible">
      {/* Toolbar */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-8 print:hidden z-50 shadow-md">
        <p className="font-bold text-sm">Invoice: {data.header.reference}</p>
        <button
          onClick={() => window.print()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all"
        >
          <Printer size={16} /> Print Now
        </button>
      </div>

      <div className="pt-20 pb-10 print:pt-0 print:pb-0">
        <PrintTemplate
          title="Invoice"
          subtitle={`Reference: ${data.header.reference}`}
        >
          <div className="space-y-8">
            {/* Header Info Grid */}
            <div className="grid grid-cols-3 gap-6 pb-6 border-b-2 border-slate-200">
              <div>
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Invoice Reference
                </p>
                <p className="text-lg font-bold text-slate-900 mt-2">
                  {data.header.reference}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Date
                </p>
                <p className="text-lg font-bold text-slate-900 mt-2">
                  {formatDate(data.header.created_at)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Status
                </p>
                <p className="text-lg font-bold text-slate-900 mt-2">
                  {data.header.status}
                </p>
              </div>
            </div>

            {/* Patient & Clinical Info */}
            <div className="grid grid-cols-2 gap-8">
              {/* Patient */}
              <div>
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
                  Patient Information
                </h3>
                <div className="space-y-1.5">
                  <p className="text-sm">
                    <span className="font-semibold">Name:</span>{" "}
                    {data.patient_details.full_name}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">MRN:</span>{" "}
                    <span className="font-mono">
                      {data.patient_details.mrn}
                    </span>
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">DOB:</span>{" "}
                    {data.patient_details.dob}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Age:</span>{" "}
                    {data.patient_details.age}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Gender:</span>{" "}
                    {data.patient_details.gender}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Phone:</span>{" "}
                    {data.patient_details.phone}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Email:</span>{" "}
                    {data.patient_details.email}
                  </p>
                </div>
              </div>

              {/* Encounter & Provider */}
              <div>
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
                  Clinical & Billing
                </h3>
                <div className="space-y-1.5">
                  {data.encounter?.number && (
                    <>
                      <p className="text-sm">
                        <span className="font-semibold">Encounter:</span>{" "}
                        {data.encounter.number}
                      </p>
                      <p className="text-sm">
                        <span className="font-semibold">Type:</span>{" "}
                        {data.encounter.type}
                      </p>
                    </>
                  )}
                  {data.doctor && (
                    <p className="text-sm">
                      <span className="font-semibold">Doctor:</span>{" "}
                      {data.doctor}
                    </p>
                  )}
                  <p className="text-sm">
                    <span className="font-semibold">Payer:</span>{" "}
                    {data.payer.name}
                  </p>
                  {data.payer.type && (
                    <p className="text-sm">
                      <span className="font-semibold">Payer Type:</span>{" "}
                      {data.payer.type}
                    </p>
                  )}
                  {data.payer.policy_number && (
                    <p className="text-sm">
                      <span className="font-semibold">Policy #:</span>{" "}
                      {data.payer.policy_number}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            {data.items_grouped ? (
              <div className="space-y-6">
                {Object.entries(data.items_grouped).map(([category, items]: [string, any]) => {
                  if (!items || items.length === 0) return null;
                  return (
                    <div key={category}>
                      <div className="flex justify-between items-end mb-3 border-b-2 border-slate-400 bg-slate-100 p-2">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          {category}
                        </h3>
                      </div>
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-2 px-2 font-bold text-slate-600 text-xs uppercase">Description</th>
                            <th className="text-right py-2 px-2 font-bold text-slate-600 text-xs uppercase">Unit Price</th>
                            <th className="text-center py-2 px-2 font-bold text-slate-600 text-xs uppercase">Qty</th>
                            <th className="text-right py-2 px-2 font-bold text-slate-600 text-xs uppercase">Line Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item: any, idx: number) => (
                            <tr key={idx} className="border-b border-slate-100">
                              <td className="py-2 px-2">
                                <div className="text-slate-900 font-bold text-sm">
                                  {item.description || item.display_name || item.service_name || item.item_name || item.drug_name}
                                </div>
                                <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                                  {item.drug_code && <div><span className="font-semibold text-slate-600">Drug Code:</span> {item.drug_code}</div>}
                                  {item.item_code && <div><span className="font-semibold text-slate-600">Item Code:</span> {item.item_code}</div>}
                                  {item.dosage && <div><span className="font-semibold text-slate-600">Dosage:</span> {item.dosage}</div>}
                                </div>
                              </td>
                              <td className="py-2 px-2 text-right text-slate-900">{formatCurrency(item.unit_price)}</td>
                              <td className="py-2 px-2 text-center text-slate-900">{parseFloat(item.quantity).toFixed(2)}</td>
                              <td className="py-2 px-2 text-right font-semibold text-slate-900">{formatCurrency(item.line_total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {data.subtotals_by_category && data.subtotals_by_category[category] !== undefined && (
                        <div className="flex justify-end mt-2 px-2">
                          <div className="text-right bg-slate-50 px-4 py-1.5 rounded text-sm border border-slate-200">
                            <span className="text-slate-600 font-semibold mr-2">Subtotal:</span>
                            <span className="font-bold text-slate-900">{formatCurrency(data.subtotals_by_category[category])}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : data.items && data.items.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
                  Services & Items
                </h3>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-400 bg-slate-100">
                      <th className="text-left py-2.5 px-2 font-bold text-slate-800">
                        Description
                      </th>
                      <th className="text-right py-2.5 px-2 font-bold text-slate-800">
                        Unit Price
                      </th>
                      <th className="text-center py-2.5 px-2 font-bold text-slate-800">
                        Qty
                      </th>
                      <th className="text-right py-2.5 px-2 font-bold text-slate-800">
                        Line Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-200">
                        <td className="py-2 px-2">
                          <div className="text-slate-900 font-bold text-sm">
                            {item.description || item.display_name || item.service_name || item.item_name || item.drug_name}
                          </div>
                          <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                            {item.drug_code && (
                              <div>
                                <span className="font-semibold text-slate-600">Drug Code:</span> {item.drug_code}
                              </div>
                            )}
                            {item.item_code && (
                              <div>
                                <span className="font-semibold text-slate-600">Item Code:</span> {item.item_code}
                              </div>
                            )}
                            {item.dosage && (
                              <div>
                                <span className="font-semibold text-slate-600">Dosage:</span> {item.dosage}
                              </div>
                            )}
                            {item.ordered_at && (
                              <div>
                                <span className="font-semibold text-slate-600">Ordered:</span> {item.ordered_at}
                              </div>
                            )}
                            {item.order_status && (
                              <div>
                                <span className="font-semibold text-slate-600">Status:</span> {item.order_status}
                              </div>
                            )}
                            {item.dispensing_dept && (
                              <div>
                                <span className="font-semibold text-slate-600">Department:</span> {item.dispensing_dept}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right text-slate-900">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="py-2 px-2 text-center text-slate-900">
                          {parseFloat(item.quantity).toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right font-semibold text-slate-900">
                          {formatCurrency(item.line_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Financial Summary */}
            <div className="flex justify-end">
              <div className="w-96 space-y-1">
                <div className="flex justify-between py-2 border-b border-slate-300">
                  <span className="font-semibold text-slate-700">
                    Total Gross Amount
                  </span>
                  <span className="font-bold text-slate-900">
                    {formatCurrency(data.financial_summary.gross_amount)}
                  </span>
                </div>
                {parseFloat(data.financial_summary.discount) > 0 && (
                  <div className="flex justify-between py-2 border-b border-slate-300">
                    <span className="font-semibold text-slate-700">
                      Discount
                    </span>
                    <span className="font-bold text-red-600">
                      -{formatCurrency(data.financial_summary.discount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-3 border-t-2 border-b-2 border-slate-400 bg-slate-50 px-3">
                  <span className="font-bold text-slate-900">Net Payable</span>
                  <span className="font-bold text-lg text-slate-900">
                    {formatCurrency(data.financial_summary.net_amount)}
                  </span>
                </div>
                <div className="flex justify-between py-2 text-emerald-600">
                  <span className="font-bold">Paid Amount</span>
                  <span className="font-bold">
                    {formatCurrency(data.financial_summary.amount_paid ?? 0)}
                  </span>
                </div>
                {parseFloat(data.financial_summary.outstanding) > 0 && (
                  <div className="flex justify-between py-2 text-red-600">
                    <span className="font-bold">Outstanding Balance</span>
                    <span className="font-bold">
                      {formatCurrency(data.financial_summary.outstanding)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-8 border-t-2 border-slate-200 text-center text-xs text-slate-600">
              <p>
                This is an officially generated invoice from Grace Spring
                Hospitals
              </p>
              <p className="mt-1">
                Printed on: {new Date().toLocaleDateString("en-NG")} at{" "}
                {new Date().toLocaleTimeString("en-NG")}
              </p>
            </div>
          </div>
        </PrintTemplate>
      </div>
    </div>
  );
};

export default InvoicePrintView;
