// Arabic for fixed values the backend sends: statuses, roles, gender, priorities.
// Keys are normalised (lower case, "_" and "-" become spaces): "IN_PROGRESS" -> "in progress".
// Names, drug names and clinical free text are NOT translated; they are shown as entered.
// All entries are pending review by a native Arabic-speaking clinician.

export const AR_VALUES: Record<string, string> = {
  // ---- Workflow statuses ----
  "pending": "قيد الانتظار",
  "pending approval": "بانتظار الموافقة",
  "requested": "مطلوب",
  "ordered": "تم الطلب",
  "scheduled": "مجدول",
  "waiting": "في الانتظار",
  "checked in": "تم تسجيل الحضور",
  "in consultation": "في الاستشارة",
  "in progress": "قيد التنفيذ",
  "processing": "قيد المعالجة",
  "running": "قيد التشغيل",
  "started": "بدأ",
  "paused": "متوقف مؤقتًا",
  "resumed": "استُؤنف",
  "stopped": "متوقف",
  "completed": "مكتمل",
  "fulfilled": "تم التنفيذ",
  "submitted": "تم الإرسال",
  "approved": "تمت الموافقة",
  "rejected": "مرفوض",
  "cancelled": "ملغى",
  "canceled": "ملغى",
  "open": "مفتوح",
  "closed": "مغلق",
  "reopened": "أُعيد فتحه",
  "draft": "مسودة",
  "signed": "موقّع",
  "success": "تم بنجاح",
  "failed": "فشل",
  "error": "خطأ",
  "active": "نشط",
  "inactive": "غير نشط",
  "expired": "منتهي الصلاحية",

  // ---- Lab / radiology ----
  "collected": "تم سحب العينة",
  "not collected": "لم تُسحب العينة",
  "tech review": "مراجعة فنية",
  "verified": "تم التحقق",
  "released": "تم الإصدار",
  "corrected": "مُصحَّح",
  "critical": "حرج",
  "high": "مرتفع",
  "low": "منخفض",
  "normal": "طبيعي",
  "abnormal": "غير طبيعي",

  // ---- Pharmacy / blood bank / inventory ----
  "dispensed": "تم الصرف",
  "issued": "تم الصرف",
  "reserved": "محجوز",
  "matched": "متوافق",
  "mismatched": "غير متوافق",
  "sufficient": "كافٍ",
  "healthy surplus": "فائض جيد",
  "critical depletion": "نفاد حرج",
  "exhausted": "نفد",
  "empty": "فارغ",

  // ---- Billing ----
  "paid": "مدفوع",
  "unpaid": "غير مدفوع",
  "partially paid": "مدفوع جزئيًا",
  "partial": "جزئي",
  "billed": "تمت الفوترة",

  // ---- Beds / admissions ----
  "available": "متاح",
  "occupied": "مشغول",
  "maintenance": "تحت الصيانة",
  "discharged": "خرج من المستشفى",
  "admitted": "منوَّم",
  "inpatient": "مريض منوَّم",
  "outpatient": "مريض خارجي",

  // ---- Priority ----
  "routine": "روتيني",
  "urgent": "عاجل",
  "stat": "فوري",
  "emergency": "طوارئ",

  // ---- Gender ----
  "male": "ذكر",
  "female": "أنثى",

  // ---- Yes / no ----
  "yes": "نعم",
  "no": "لا",

  // ---- Staff roles (codes from the backend, e.g. "nurse_manager") ----
  "super admin": "المسؤول الأعلى",
  "admin": "مسؤول النظام",
  "hospital admin": "مدير المستشفى",
  "executive director": "المدير التنفيذي",
  "chief operating officer": "مدير العمليات",
  "doctor": "طبيب",
  "nurse": "ممرض",
  "nurse manager": "مدير التمريض",
  "accountant": "محاسب",
  "billing": "موظف الفوترة",
  "receptionist": "موظف الاستقبال",
  "front desk": "مكتب الاستقبال",
  "lab scientist": "أخصائي مختبر",
  "radiologist": "أخصائي أشعة",
  "pharmacist": "صيدلي",
  "inventory": "موظف المخزون",
  "customer service": "خدمة العملاء",
  "customer service manager": "مدير خدمة العملاء",
  "operating theater": "غرفة العمليات",
  "anesthesia technician": "فني تخدير",
  "cardiovascular perfusionist": "أخصائي التروية القلبية",
  "staff": "موظف",
};
