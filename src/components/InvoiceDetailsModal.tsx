import React, { useEffect, useState } from "react";
import { X, Printer, AlertCircle, Loader2 } from "lucide-react";
import { billingService } from "../services/billing.service";

interface InvoiceDetailsModalProps {
  isOpen: boolean;
  recordId: number;
  recordType: "INVOICE" | "ADVANCE";
  onClose: () => void;
  onPrint: (type: "INVOICE" | "ADVANCE", id: number) => void;
}

const InvoiceDetailsModal: React.FC<InvoiceDetailsModalProps> = ({
  isOpen,
  recordId,
  recordType,
  onClose,
  onPrint,
}) => {
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await billingService.getInvoiceDetails(
          recordType,
          recordId,
        );
        if (response.status === "success" && response.data) {
          setDetails(response.data);
        } else {
          setError("Failed to load invoice details");
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch invoice details");
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [isOpen, recordId, recordType]);

  if (!isOpen) return null;

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
      month: "short",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-emerald-100 text-emerald-800 border border-emerald-300";
      case "OPEN":
        return "bg-amber-100 text-amber-800 border border-amber-300";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border border-yellow-300";
      case "SUCCESS":
        return "bg-brand-active text-brand-primary border border-brand-primary";
      default:
        return "bg-slate-100 text-slate-800 border border-slate-300";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-slate-700 to-slate-600 text-white p-6 flex items-center justify-between border-b border-slate-700">
          <div>
            <h2 className="text-2xl font-bold">Invoice Details</h2>
            {details?.header && (
              <p className="text-sm text-slate-200 mt-1">
                {details.header.reference} •{" "}
                {formatDate(details.header.created_at)}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-500 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={40} className="animate-spin text-brand-primary" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {!loading && !error && details && (
            <>
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Reference
                  </p>
                  <p className="text-lg font-bold text-slate-900 mt-1">
                    {details.header.reference}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Status
                  </p>
                  <span
                    className={`inline-block px-3 py-1.5 rounded-full text-sm font-semibold mt-1 ${getStatusColor(
                      details.header.status,
                    )}`}
                  >
                    {details.header.status}
                  </span>
                </div>
                {details.header.processed_by && (
                  <div className="col-span-2">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Processed By
                    </p>
                    <p className="text-sm font-semibold text-slate-900 mt-1">
                      {details.header.processed_by}
                    </p>
                  </div>
                )}
              </div>

              {/* Patient Details */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h3 className="font-bold text-slate-900 mb-3">
                  Patient Information
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Name
                    </p>
                    <p className="text-sm font-semibold text-slate-900 mt-1">
                      {details.patient_details.full_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      MRN
                    </p>
                    <p className="text-sm font-mono font-semibold text-slate-900 mt-1">
                      {details.patient_details.mrn}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Age
                    </p>
                    <p className="text-sm font-semibold text-slate-900 mt-1">
                      {details.patient_details.age}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Gender
                    </p>
                    <p className="text-sm font-semibold text-slate-900 mt-1">
                      {details.patient_details.gender}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Contact
                    </p>
                    <p className="text-sm text-slate-900 mt-1">
                      {details.patient_details.phone}
                    </p>
                  </div>
                </div>
              </div>

              {/* Encounter & Provider Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <h3 className="font-bold text-slate-900 mb-3 text-sm">
                    Encounter
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-slate-600 uppercase tracking-wider">
                        Number
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {details.encounter.number || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 uppercase tracking-wider">
                        Type
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {details.encounter.type || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <h3 className="font-bold text-slate-900 mb-3 text-sm">
                    Provider
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-slate-600 uppercase tracking-wider">
                        Doctor
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {details.doctor || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 uppercase tracking-wider">
                        Payer
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {details.payer.name} {details.payer.type && `(${details.payer.type})`}
                      </p>
                      {details.payer.policy_number && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          Policy: {details.payer.policy_number}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Line Items — dept-grouped provisional-bill style when available, matching
                  IPDBillingPrintTemplate.tsx's billing_groups rendering */}
              {details.items_grouped && Object.keys(details.items_grouped).length > 0 ? (
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-900">Services & Items</h3>
                  {Object.entries(details.items_grouped).map(([groupKey, group]: [string, any]) => (
                    <div key={groupKey} className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="bg-brand-active px-4 py-2 flex items-center justify-between border-b border-slate-200">
                        <h4 className="text-xs font-black text-brand-primary uppercase tracking-widest">
                          {groupKey.replace(/_/g, " ")}
                        </h4>
                        <span className="text-sm font-black text-brand-primary">
                          {formatCurrency(group.dept_total)}
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                              <th className="px-3 py-1.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Item</th>
                              <th className="px-3 py-1.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Qty</th>
                              <th className="px-3 py-1.5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rate</th>
                              <th className="px-3 py-1.5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Discount</th>
                              <th className="px-3 py-1.5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Net Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(group.items || [])
                              .flatMap((item: any) => {
                                if (item.drugs && Array.isArray(item.drugs) && item.drugs.length > 0) {
                                  return item.drugs.map((drug: any, dIdx: number) => ({
                                    id: `${item.id}-drug-${dIdx}`,
                                    item_name: `${drug.drug_name} (${drug.dosage}${drug.frequency ? ` - ${drug.frequency}` : ""})`,
                                    rate: drug.rate,
                                    nos: drug.qty,
                                    total: drug.total,
                                    fee_breakdown: null,
                                    parent_discount: item.discount_applied,
                                    requested_by: item.requested_by,
                                    cancelled_by: item.cancelled_by,
                                  }));
                                }
                                if (item.details && Array.isArray(item.details) && item.details.length > 0) {
                                  return item.details.map((detail: any, dIdx: number) => ({
                                    id: `${item.id}-detail-${dIdx}`,
                                    item_name: detail.name,
                                    rate: detail.rate,
                                    nos: detail.qty,
                                    total: detail.total,
                                    fee_breakdown: null,
                                    parent_discount: item.discount_applied,
                                    requested_by: item.requested_by,
                                    cancelled_by: item.cancelled_by,
                                  }));
                                }
                                return [{
                                  ...item,
                                  item_name: item.item_name,
                                  parent_discount: item.discount_applied,
                                }];
                              })
                              .map((row: any, idx: number) => (
                                <React.Fragment key={row.id || idx}>
                                  <tr className="border-b border-slate-100 even:bg-slate-50/40">
                                    <td className="px-3 py-1.5">
                                      <div className="font-semibold text-slate-800 text-sm">{row.item_name}</div>
                                      {(row.requested_by?.name || row.cancelled_by?.name) && (
                                        <div className="text-[10px] text-slate-400 mt-0.5 space-x-2">
                                          {row.requested_by?.name && <span>Ordered by: {row.requested_by.name}</span>}
                                          {row.cancelled_by?.name && (
                                            <span className="text-red-500">Cancelled by: {row.cancelled_by.name}</span>
                                          )}
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-3 py-1.5 text-center text-slate-600">{row.nos}</td>
                                    <td className="px-3 py-1.5 text-right text-slate-600">{formatCurrency(row.rate)}</td>
                                    <td className="px-3 py-1.5 text-right">
                                      {row.parent_discount && row.parent_discount.amount > 0 ? (
                                        <div className="flex flex-col items-end">
                                          <span className="font-semibold text-slate-700">
                                            -{formatCurrency(row.parent_discount.amount)}
                                          </span>
                                          <span className="text-[9px] text-slate-400">
                                            {row.parent_discount.type === "PERCENTAGE" ? `${row.parent_discount.value}%` : "FLAT"}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-slate-300">—</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-1.5 text-right font-bold text-slate-900">
                                      {row.parent_discount && row.parent_discount.amount > 0 ? (
                                        <div className="flex flex-col items-end">
                                          <span className="line-through text-slate-400 font-normal text-xs">
                                            {formatCurrency(row.gross_total ?? row.total)}
                                          </span>
                                          <span>{formatCurrency(row.net_total ?? (row.total - row.parent_discount.amount))}</span>
                                        </div>
                                      ) : (
                                        formatCurrency(row.total)
                                      )}
                                    </td>
                                  </tr>
                                  {row.fee_breakdown && row.fee_breakdown.length > 0 && (
                                    <tr className="bg-slate-50/30">
                                      <td colSpan={5} className="px-4 py-1.5">
                                        <div className="pl-3 border-l-2 border-brand-active space-y-0.5">
                                          {row.fee_breakdown.map((fee: any, fIdx: number) => (
                                            <div key={fIdx} className="flex justify-between text-xs text-slate-600">
                                              <span>
                                                <span className="font-semibold">{fee.component_name}</span>{" "}
                                                <span className="text-slate-400">({fee.component_type.replace(/_/g, " ")})</span>
                                              </span>
                                              <span>{formatCurrency(fee.amount)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                details.items && details.items.length > 0 && (
                  <div>
                    <h3 className="font-bold text-slate-900 mb-3">
                      Services & Items
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200">
                            <th className="px-4 py-2 text-left font-semibold text-slate-700">
                              Description
                            </th>
                            <th className="px-4 py-2 text-right font-semibold text-slate-700">
                              Unit Price
                            </th>
                            <th className="px-4 py-2 text-center font-semibold text-slate-700">
                              Qty
                            </th>
                            <th className="px-4 py-2 text-right font-semibold text-slate-700">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {details.items.map((item: any, idx: number) => (
                            <tr
                              key={idx}
                              className="border-b border-slate-100 hover:bg-slate-50"
                            >
                              <td className="px-4 py-2 text-slate-900">
                                <div className="font-bold text-sm">
                                  {item.display_name || item.description || item.service_name || item.item_name || item.drug_name}
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
                              <td className="px-4 py-2 text-right text-slate-900">
                                {formatCurrency(item.unit_price)}
                              </td>
                              <td className="px-4 py-2 text-center text-slate-900">
                                {parseFloat(item.quantity).toFixed(2)}
                              </td>
                              <td className="px-4 py-2 text-right font-semibold text-slate-900">
                                {formatCurrency(item.line_total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              )}

              {/* Financial Summary */}
              <div className="bg-brand-active rounded-lg p-4 border border-brand-active">
                <h3 className="font-bold text-slate-900 mb-3">
                  Financial Summary
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700">Total Amount</span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(details.financial_summary.gross_amount)}
                    </span>
                  </div>
                  {parseFloat(details.financial_summary.discount) > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-700">Discount</span>
                      <span className="font-bold text-slate-900">
                        -{formatCurrency(details.financial_summary.discount)}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-brand-primary pt-2 flex justify-between items-center">
                    <span className="font-semibold text-slate-800">
                      Net Payable
                    </span>
                    <span className="text-lg font-bold text-slate-900">
                      {formatCurrency(details.financial_summary.net_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-600">
                    <span className="font-semibold">Paid Amount</span>
                    <span className="font-bold">
                      {formatCurrency(details.financial_summary.amount_paid ?? 0)}
                    </span>
                  </div>
                  {parseFloat(details.financial_summary.outstanding) > 0 && (
                    <div className="flex justify-between items-center text-red-600">
                      <span className="font-semibold">Outstanding</span>
                      <span className="font-bold">
                        {formatCurrency(details.financial_summary.outstanding)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => {
              onPrint(recordType, recordId);
              onClose();
            }}
            disabled={loading || error !== null}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-brand-primary hover:bg-brand-primary rounded-lg transition-colors disabled:bg-slate-400"
          >
            <Printer size={16} />
            Print Invoice
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailsModal;
