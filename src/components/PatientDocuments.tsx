import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  FileUp,
  Download,
  Trash2,
  Loader2,
  AlertCircle,
  File,
  Image as ImageIcon,
  FileText,
  Plus,
  X,
  CheckCircle,
  Search,
  Filter,
  MoreVertical,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Calendar,
  Layers,
  ChevronRight
} from "lucide-react";
import { useNotification } from "../context/NotificationContext";
import { BASE_URL } from "../api/client";
import { patientService } from "../services/patient.service";
import {
  PatientDocument,
  PatientDocumentType,
  PatientDocumentCategory,
} from "../types";

const CATEGORIES: { id: PatientDocumentCategory; name: string }[] = [
  { id: "lab_result", name: "Lab Result" },
  { id: "referral_letter", name: "Referral Letter" },
  { id: "lab_referral", name: "Lab Referral" },
  { id: "imaging_report", name: "Imaging Report" },
  { id: "general_document", name: "General Document" },
];

const PatientDocuments: React.FC = () => {
  const [searchParams] = useSearchParams();
  const mrn = searchParams.get("mrn");
  const { notify } = useNotification();

  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<PatientDocumentCategory | "all">("all");
  const [previewDoc, setPreviewDoc] = useState<PatientDocument | null>(null);

  // Upload State
  const [showUploadArea, setShowUploadArea] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadForm, setUploadForm] = useState<{
    fileType: PatientDocumentType;
    category: PatientDocumentCategory;
    description: string;
  }>({
    fileType: "DOCUMENT",
    category: "general_document",
    description: "",
  });

  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Patient Search State
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [patientSearchResults, setPatientSearchResults] = useState<any[]>([]);
  const latestPatientQuery = useRef("");

  const performPatientSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setPatientSearchResults([]);
      return;
    }
    latestPatientQuery.current = query;
    setIsSearchingPatient(true);
    try {
      const results = await patientService.searchPatients(query);
      if (latestPatientQuery.current === query) {
        setPatientSearchResults(results);
      }
    } catch (err) {
      console.error("Patient search failed:", err);
    } finally {
      if (latestPatientQuery.current === query) {
        setIsSearchingPatient(false);
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (patientSearchTerm.trim().length >= 3) {
        performPatientSearch(patientSearchTerm);
      } else if (patientSearchTerm.trim().length === 0) {
        setPatientSearchResults([]);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [patientSearchTerm, performPatientSearch]);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    if (!mrn) {
      setError("Patient MRN not found");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await patientService.getPatientDocuments(mrn);
      setDocuments(data);
    } catch (err) {
      console.error("Failed to fetch documents:", err);
      setError("Failed to load patient documents");
      notify("Failed to load documents", "error");
    } finally {
      setLoading(false);
    }
  }, [mrn, notify]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPendingFiles((prev) => [...prev, ...files]);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle Bulk Upload
  const handleBulkUpload = async () => {
    if (!mrn || pendingFiles.length === 0) return;

    try {
      setUploading(true);

      const filesWithBase64 = await Promise.all(
        pendingFiles.map(async (file) => ({
          file_type: uploadForm.fileType,
          category: uploadForm.category,
          description: uploadForm.description || `Uploaded ${file.name}`,
          original_name: file.name,
          file: await fileToBase64(file),
        }))
      );

      const results = await patientService.uploadBulkDocuments(mrn, filesWithBase64);

      // Ensure results is an array before spreading
      const newDocs = Array.isArray(results) ? results : [results];
      setDocuments((prev) => [...newDocs, ...prev]);
      setPendingFiles([]);
      setShowUploadArea(false);
      setUploadForm({
        fileType: "DOCUMENT",
        category: "general_document",
        description: "",
      });
      notify(`${results.length} documents uploaded successfully`, "success");
    } catch (err) {
      console.error("Upload failed:", err);
      notify("Failed to upload documents", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!mrn) return;
    if (!window.confirm("Delete this document permanently?")) return;

    try {
      setDeleting(id);
      await patientService.deleteDocument(mrn, id);
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      notify("Document deleted", "success");
    } catch (err) {
      notify("Failed to delete document", "error");
    } finally {
      setDeleting(null);
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      (doc.original_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getFileIcon = (type: PatientDocumentType) => {
    switch (type) {
      case "LAB":
        return <FileText className="text-brand-active0" />;
      case "RADIOLOGY":
        return <ImageIcon className="text-purple-500" />;
      case "IMAGE":
        return <ImageIcon className="text-pink-500" />;
      default:
        return <File className="text-slate-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "0 KB";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const getFriendlyTypeName = (mimeType: string, originalName: string) => {
    const name = originalName?.toLowerCase() || '';
    const mime = mimeType?.toLowerCase() || '';

    if (mime.includes('pdf') || name.endsWith('.pdf')) return 'PDF DOCUMENT';
    if (mime.includes('image')) return 'IMAGE';
    if (mime.includes('word') || mime.includes('officedocument') || name.endsWith('.docx') || name.endsWith('.doc')) return 'WORD DOCUMENT';
    if (mime.includes('spreadsheet') || mime.includes('excel') || name.endsWith('.xlsx') || name.endsWith('.xls')) return 'EXCEL SPREADSHEET';
    return mime.split('/').pop()?.toUpperCase() || 'DOCUMENT';
  };

  if (!mrn) {
    return (
      <div className="space-y-10 animate-in fade-in duration-500">
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[44px] border border-slate-200 shadow-sm text-center px-10">
          <div className="w-24 h-24 bg-slate-50 rounded-[40px] flex items-center justify-center mb-6 shadow-inner border border-slate-100">
            <Search size={48} className="text-slate-200" />
          </div>
          <h3 className="text-3xl font-black text-slate-800 tracking-tight">No Patient Selected</h3>
          <p className="text-slate-500 max-w-sm mx-auto mt-2 font-medium leading-relaxed">
            Please search for a patient in the Master Index to view or manage their clinical documents.
          </p>

          <div className="mt-10 w-full max-w-2xl relative">
            <div className="relative">
              <Search className={`absolute left-6 top-1/2 -translate-y-1/2 transition-colors ${isSearchingPatient ? "text-brand-primary" : "text-slate-400"}`} size={24} />
              <input
                type="text"
                placeholder="Search by Name, MRN or Phone..."
                className="w-full pl-16 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-[32px] text-lg font-bold text-slate-800 focus:bg-white focus:border-brand-active0 outline-none transition-all shadow-inner"
                value={patientSearchTerm}
                onChange={(e) => setPatientSearchTerm(e.target.value)}
                autoFocus
              />
              {isSearchingPatient && (
                <div className="absolute right-6 top-1/2 -translate-y-1/2">
                  <Loader2 size={24} className="text-brand-primary animate-spin" />
                </div>
              )}
            </div>

            {/* Results Dropdown */}
            {patientSearchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-4 bg-white border border-slate-200 rounded-[32px] shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-4 duration-300">
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Patient to Load Documents</span>
                  <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest">{patientSearchResults.length} found</span>
                </div>
                <div className="max-h-96 overflow-y-auto no-scrollbar">
                  {patientSearchResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => navigate(`/patients/documents?mrn=${p.mrn}`)}
                      className="w-full flex items-center justify-between p-6 hover:bg-brand-active/30 transition-all border-b border-slate-50 last:border-0 group text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center font-black text-slate-500 group-hover:bg-brand-primary group-hover:text-white transition-all shadow-sm">
                          {p.demographics.first_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-base font-black text-slate-800">
                            {p.demographics.first_name} {p.demographics.last_name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-black text-brand-primary bg-brand-active px-2 py-0.5 rounded border border-brand-active uppercase tracking-tighter">
                              {p.mrn}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                              {p.age}Y / {p.demographics.gender}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-brand-primary group-hover:text-white transition-all">
                        <ChevronRight size={20} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* HEADER & ACTION BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Patient Documents
            <span className="px-3 py-1 bg-brand-active text-brand-primary rounded-full text-[10px] uppercase font-black tracking-widest">
              MRN {mrn}
            </span>
          </h2>
          <p className="text-slate-500 text-sm font-bold mt-1">Manage, upload and archive clinical records</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPatientSearch(!showPatientSearch)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${showPatientSearch
                ? "bg-slate-800 text-white shadow-xl shadow-slate-200"
                : "bg-white border-2 border-slate-100 text-slate-600 hover:border-brand-primary hover:text-brand-primary"
              }`}
          >
            <Search size={16} />
            {showPatientSearch ? "Close Search" : "Search Patient"}
          </button>

          <button
            onClick={() => setShowUploadArea(!showUploadArea)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${showUploadArea
                ? "bg-slate-800 text-white shadow-xl shadow-slate-200"
                : "bg-brand-primary text-white shadow-xl shadow-brand-active hover:scale-105 active:scale-95"
              }`}
          >
            {showUploadArea ? <X size={16} /> : <Plus size={16} />}
            {showUploadArea ? "Close Upload" : "Add Documents"}
          </button>
        </div>
      </div>

      {/* PATIENT SEARCH AREA */}
      {showPatientSearch && (
        <div className="bg-white border-2 border-brand-active rounded-[40px] p-8 shadow-2xl shadow-brand-active/20 animate-in slide-in-from-top-4 duration-500">
          <div className="max-w-2xl mx-auto relative">
            <h4 className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] mb-4 text-center">Global Patient Search</h4>
            <div className="relative">
              <Search className={`absolute left-6 top-1/2 -translate-y-1/2 transition-colors ${isSearchingPatient ? "text-brand-primary" : "text-slate-400"}`} size={24} />
              <input
                type="text"
                placeholder="Search by Name, MRN or Phone..."
                className="w-full pl-16 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-[32px] text-lg font-bold text-slate-800 focus:bg-white focus:border-brand-active0 outline-none transition-all shadow-inner"
                value={patientSearchTerm}
                onChange={(e) => setPatientSearchTerm(e.target.value)}
                autoFocus
              />
              {isSearchingPatient && (
                <div className="absolute right-6 top-1/2 -translate-y-1/2">
                  <Loader2 size={24} className="text-brand-primary animate-spin" />
                </div>
              )}
            </div>

            {/* Results Dropdown */}
            {patientSearchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-4 bg-white border border-slate-200 rounded-[32px] shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-4 duration-300">
                <div className="max-h-80 overflow-y-auto no-scrollbar">
                  {patientSearchResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        navigate(`/patients/documents?mrn=${p.mrn}`);
                        setShowPatientSearch(false);
                        setPatientSearchTerm("");
                        setPatientSearchResults([]);
                      }}
                      className="w-full flex items-center justify-between p-6 hover:bg-brand-active/30 transition-all border-b border-slate-50 last:border-0 group text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center font-black text-slate-500 group-hover:bg-brand-primary group-hover:text-white transition-all shadow-sm">
                          {p.demographics.first_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-base font-black text-slate-800">
                            {p.demographics.first_name} {p.demographics.last_name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-black text-brand-primary bg-brand-active px-2 py-0.5 rounded border border-brand-active uppercase tracking-tighter">
                              {p.mrn}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                              {p.age}Y / {p.demographics.gender}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-slate-300 group-hover:text-brand-primary group-hover:translate-x-1 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* UPLOAD AREA (Glassmorphic) */}
      {showUploadArea && (
        <div className="bg-white/80 backdrop-blur-xl border-2 border-brand-active rounded-[40px] p-8 shadow-2xl shadow-brand-active/50 animate-in slide-in-from-top-4 duration-500">
          <div className="grid grid-cols-12 gap-8">
            {/* Upload Settings */}
            <div className="col-span-12 lg:col-span-4 space-y-4">
              <h4 className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em]">Upload Settings</h4>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Document Type</label>
                  <select
                    value={uploadForm.fileType}
                    onChange={(e) => setUploadForm({ ...uploadForm, fileType: e.target.value as PatientDocumentType })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black text-slate-700 outline-none focus:border-brand-primary"
                  >
                    <option value="DOCUMENT">Standard Document</option>
                    <option value="LAB">Laboratory Result</option>
                    <option value="RADIOLOGY">Radiology Report</option>
                    <option value="IMAGE">Medical Image</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Clinical Category</label>
                  <select
                    value={uploadForm.category}
                    onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value as PatientDocumentCategory })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black text-slate-700 outline-none focus:border-brand-primary"
                  >
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Batch Description</label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                    placeholder="E.g. Full blood count results from last week"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black text-slate-700 outline-none focus:border-brand-primary resize-none h-24"
                  />
                </div>
              </div>
            </div>

            {/* Drop Zone */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
              <h4 className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em]">Select Files</h4>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 border-4 border-dashed border-brand-active bg-brand-active/10 rounded-[32px] flex flex-col items-center justify-center p-12 group cursor-pointer hover:bg-brand-active/30 hover:border-brand-active transition-all"
              >
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform mb-4 text-brand-primary">
                  <FileUp size={32} />
                </div>
                <p className="text-sm font-black text-slate-700 uppercase tracking-widest">Drop files or click to browse</p>
                <p className="text-[10px] text-slate-400 font-bold mt-2">PDF, PNG, JPG, JPEG (Max 20MB per file)</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  multiple
                  className="hidden"
                />
              </div>

              {/* Pending Files List */}
              {pendingFiles.length > 0 && (
                <div className="bg-slate-50/50 rounded-3xl p-4 max-h-48 overflow-y-auto no-scrollbar">
                  <div className="flex flex-wrap gap-2">
                    {pendingFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm">
                        <span className="text-[10px] font-black text-slate-600 truncate max-w-[120px]">{f.name}</span>
                        <button onClick={(e) => { e.stopPropagation(); removePendingFile(i); }} className="text-slate-400 hover:text-rose-500">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setPendingFiles([])}
                  className="px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
                >
                  Clear All
                </button>
                <button
                  onClick={handleBulkUpload}
                  disabled={uploading || pendingFiles.length === 0}
                  className="flex items-center gap-2 px-8 py-3 bg-brand-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-active hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
                >
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  {uploading ? "Uploading..." : `Upload ${pendingFiles.length} Documents`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FILTER BAR */}
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-active0 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-[28px] text-sm font-bold text-slate-700 outline-none focus:border-brand-primary focus:shadow-xl focus:shadow-brand-active/20 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-[28px] w-full sm:w-auto">
          <div className="pl-4 pr-2 text-slate-300">
            <Filter size={18} />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as any)}
            className="bg-transparent text-sm font-black text-slate-600 outline-none pr-6 py-2.5 cursor-pointer uppercase tracking-widest"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* DOCUMENTS GRID */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="w-12 h-12 border-4 border-brand-primary/10 border-t-brand-primary rounded-full animate-spin"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Optimizing View...</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-200">
          <Layers size={40} className="text-slate-200 mb-4" />
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No documents matching your criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="group relative bg-white border border-slate-100 rounded-[32px] p-6 hover:border-brand-active hover:shadow-2xl hover:shadow-brand-active/50 transition-all duration-300"
            >
              {/* Type Accent */}
              <div className={`absolute top-0 right-0 w-32 h-32 opacity-[0.03] -mr-8 -mt-8 pointer-events-none group-hover:opacity-[0.08] transition-opacity`}>
                <File className="w-full h-full rotate-12" />
              </div>

              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform ${doc.file_type === 'LAB' ? 'bg-brand-active text-brand-primary' :
                    doc.file_type === 'RADIOLOGY' ? 'bg-purple-50 text-purple-600' :
                      doc.file_type === 'IMAGE' ? 'bg-pink-50 text-pink-600' : 'bg-slate-50 text-slate-600'
                  }`}>
                  {getFileIcon(doc.file_type)}
                </div>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-brand-primary transition-colors" title="View Preview">
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={deleting === doc.id}
                    className="p-2 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 transition-colors"
                    title="Remove"
                  >
                    {deleting === doc.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[8px] font-black uppercase tracking-tighter">
                      {doc.category.replace('_', ' ')}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400">{formatFileSize(doc.file_size)}</span>
                  </div>
                  <h3 className="text-sm font-black text-slate-800 truncate" title={doc.original_name}>
                    {doc.original_name}
                  </h3>
                  <p className="text-[11px] font-bold text-slate-400 line-clamp-2 leading-relaxed">
                    {doc.description || "No description provided"}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                      <Calendar size={12} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">
                      {new Date(doc.uploaded_at).toLocaleDateString("en-GB")}
                    </span>
                  </div>

                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-brand-primary hover:text-white text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Preview <Eye size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FULL-PAGE DOCUMENT PREVIEW */}
      {previewDoc && (
        <div className="fixed inset-0 z-[60] flex flex-col animate-in fade-in duration-300" style={{ background: '#0f172a' }}>
          {/* Top Bar */}
          <div className="bg-[#1e1b4b] text-white px-8 py-5 flex justify-between items-center relative overflow-hidden shrink-0 shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-active0/10 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none"></div>
            <div className="z-10 min-w-0 flex-1 pr-6">
              <h3 className="text-lg font-black tracking-tight uppercase italic truncate">{previewDoc.original_name}</h3>
              <p className="text-brand-primary text-[10px] font-black uppercase tracking-widest mt-0.5">
                {previewDoc.category.replace(/_/g, ' ')} &bull; {formatFileSize(previewDoc.file_size)}
              </p>
            </div>
            <div className="flex gap-3 z-10 shrink-0">
              <a
                href={previewDoc.file_path.startsWith('http') ? previewDoc.file_path : `${BASE_URL.replace(/\/$/, '')}/${previewDoc.file_path.replace(/^\//, '')}`}
                download={previewDoc.original_name}
                target="_blank"
                rel="noreferrer"
                className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/20 flex items-center gap-2"
              >
                <Download size={14} /> Download File
              </a>
              <button
                onClick={() => setPreviewDoc(null)}
                className="bg-white/10 hover:bg-rose-500 text-white p-3 rounded-2xl transition-all border border-white/20"
                title="Close Preview"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Full-height viewer body */}
          <div className="flex-1 overflow-hidden flex items-stretch justify-center bg-slate-900">
            {previewDoc.mime_type?.includes('image') ? (
              <div className="flex items-center justify-center w-full h-full p-6">
                <img
                  src={previewDoc.file_path.startsWith('http') ? previewDoc.file_path : `${BASE_URL.replace(/\/$/, '')}/${previewDoc.file_path.replace(/^\//, '')}`}
                  alt={previewDoc.original_name}
                  className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                />
              </div>
            ) : previewDoc.mime_type?.includes('pdf') ? (
              <iframe
                src={previewDoc.file_path.startsWith('http') ? previewDoc.file_path : `${BASE_URL.replace(/\/$/, '')}/${previewDoc.file_path.replace(/^\//, '')}`}
                className="w-full h-full border-0"
                title="PDF Preview"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full">
                <div className="text-center space-y-6 max-w-md p-10 bg-slate-800 rounded-[40px] shadow-2xl border border-slate-700">
                  <div className="w-24 h-24 bg-brand-active text-brand-primary rounded-[32px] flex items-center justify-center mx-auto shadow-lg">
                    <FileText size={48} />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-white uppercase italic tracking-tight">Preview Not Available</h4>
                    <p className="text-slate-400 font-bold mt-2">
                      This file type ({getFriendlyTypeName(previewDoc.mime_type, previewDoc.original_name)}) cannot be previewed directly in the browser.
                      Please download it to view on your device.
                    </p>
                  </div>
                  <a
                    href={previewDoc.file_path.startsWith('http') ? previewDoc.file_path : `${BASE_URL.replace(/\/$/, '')}/${previewDoc.file_path.replace(/^\//, '')}`}
                    download={previewDoc.original_name}
                    className="inline-flex items-center gap-3 px-10 py-5 bg-brand-primary text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-brand-active hover:scale-105 active:scale-95 transition-all"
                  >
                    <Download size={18} /> Download Now
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Slim footer */}
          <div className="py-2 px-8 bg-[#1e1b4b]/80 border-t border-white/5 flex justify-center shrink-0">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Gracespring Secure Clinical Document Viewer</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDocuments;

