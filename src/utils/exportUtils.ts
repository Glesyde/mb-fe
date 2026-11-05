import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

/**
 * Utility to export data to CSV
 * @param data Array of objects to export
 * @param filename Name of the file without extension
 */
export const exportToCSV = (data: any[], filename: string) => {
  if (!data || !data.length) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((fieldName) => {
          let value = row[fieldName];
          if (value === null || value === undefined) {
            value = "";
          }
          // Escape quotes and wrap in quotes to handle commas within values
          return `"${String(value).replace(/"/g, '""')}"`;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Utility to export data to Excel (XLSX)
 * @param data Array of objects to export
 * @param filename Name of the file without extension
 */
export const exportToExcel = (data: any[], filename: string) => {
  if (!data || !data.length) return;
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

/**
 * Utility to export data to PDF
 * @param data Array of objects to export
 * @param filename Name of the file without extension
 * @param title Optional title for the PDF document
 */
export const exportToPDF = (data: any[], filename: string, title?: string) => {
  if (!data || !data.length) return;

  const doc = new jsPDF({ orientation: "landscape" });
  
  if (title) {
    doc.setFontSize(16);
    doc.text(title, 14, 15);
  }

  const headers = Object.keys(data[0]).map((h) => h.replace(/_/g, ' ').toUpperCase());
  
  const body = data.map(item => 
    Object.values(item).map(val => val === null || val === undefined ? "" : String(val))
  );

  (doc as any).autoTable({
    head: [headers],
    body: body,
    startY: title ? 25 : 15,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [79, 70, 229] } // Indigo 600
  });

  doc.save(`${filename}.pdf`);
};
