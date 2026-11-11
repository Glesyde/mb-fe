import React, { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { IdleTimeoutProvider } from "./context/IdleTimeoutContext";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";

// Patient Administration
import PatientLayout from "./components/PatientLayout";
import PatientSearch from "./components/PatientSearch";
import PatientRegistration from "./components/PatientRegistration";
import PatientHistory from "./components/PatientHistory";
import PatientDocuments from "./components/PatientDocuments";
import AdmissionList from "./components/AdmissionList";

// Appointments & Scheduling
import AppointmentLayout from "./components/AppointmentLayout";
import DoctorSchedule from "./components/DoctorSchedule";
import AppointmentBooking from "./components/AppointmentBooking";
import ClinicQueue from "./components/ClinicQueue";

// Electronic Medical Records (EMR)
import EMRLayout from "./components/EMRLayout";
import EMRWorklist from "./components/EMRWorklist";
import EMRChart from "./components/EMRChart";
import EMROrders from "./components/EMROrders";
import ReproductivePopulationPage from "./features/reproductive/components/PopulationView";
import ReproDemoPage from "./features/reproductive/components/DemoPage";
import { isPublicDemoRoute, publicDemoFlag } from "./features/reproductive/publicDemo";

// Billing & Revenue
import BillingLayout from "./components/BillingLayout";
import OPDBilling from "./components/OPDBilling";
import IPDBilling from "./components/IPDBilling";
import BillingHistory from "./components/BillingHistory";
import BillingPricing from "./components/BillingPricing";
import AdvanceCollection from "./components/AdvanceCollection";
import RefundManagement from "./components/RefundManagement";
import BillAdjustment from "./components/BillAdjustment";
import InvoiceGeneration from "./components/InvoiceGeneration";
import CashAndInsurance from "./components/CashAndInsurance";
import ReceiptHistory from "./components/ReceiptHistory";
import OutstandingBalance from "./components/OutstandingBalance";

// HMO & Insurance
import HMOLayout from "./components/HMOLayout";
import HMOProviders from "./components/HMOProviders";
import HMOTariffs from "./components/HMOTariffs";
import HMOClaims from "./components/HMOClaims";
import HMOAuthorization from "./components/HMOAuthorization";

// Laboratory
import LabLayout from "./components/LabLayout";
import LabWorklist from "./components/LabWorklist";
import LabResultEntry from "./components/LabResultEntry";
import LabCatalog from "./components/LabCatalog";
import LabReports from "./components/LabReports";
import LabManagement from "./components/LabManagement";
import LabVerification from "./components/LabVerification";

// Blood Bank
import BloodBankLayout from "./components/BloodBankLayout";
import BloodBankRequests from "./components/BloodBankRequests";
import BloodBankIssue from "./components/BloodBankIssue";

// Radiology
import RadiologyLayout from "./components/RadiologyLayout";
import RadiologyWorklist from "./components/RadiologyWorklist";
import RadiologyResultEntry from "./components/RadiologyResultEntry";
import RadiologyCatalog from "./components/RadiologyCatalog";
import RadiologyViewer from "./components/RadiologyViewer";

// Pharmacy
import PharmacyLayout from "./components/PharmacyLayout";
import PharmacyQueue from "./components/PharmacyQueue";
import DrugCatalog from "./components/DrugCatalog";
import ExpiryTracker from "./components/ExpiryTracker";

// Operating Theatre
import TheatreLayout from "./components/TheatreLayout";
import TheatreSchedule from "./components/TheatreSchedule";
import ProcedureNotes from "./components/ProcedureNotes";
import LiveStatusBoard from "./components/LiveStatusBoard";

// Inpatient Ward
import WardLayout from "./components/WardLayout";
import BedManagement from "./components/BedManagement";
import NursingTasks from "./components/NursingTasks";
import WardAdmissions from "./components/WardAdmissions";

// Nursing & Labour
import NursingLayout from "./components/nursing/NursingLayout";
import LabourAdmissions from "./components/nursing/LabourAdmissions";
import LabourPartogram from "./components/nursing/LabourPartogram";

// Emergency
import EmergencyLayout from "./components/EmergencyLayout";
import EDTriageBoard from "./components/EDTriageBoard";
import EDFloorMap from "./components/EDFloorMap";
import EmergencyEncounter from "./components/EmergencyEncounter";
import EmergencyFloor from "./components/EmergencyFloor";

// Inventory & Procurement
import InventoryLayout from "./components/InventoryLayout";
import InventoryStockMaster from "./components/InventoryStockMaster";
import InventoryGRN from "./components/InventoryGRN";
import InventoryRequisitions from "./components/InventoryRequisitions";
import DepartmentRequisitions from "./components/DepartmentRequisitions";
import DepartmentInventory from "./components/DepartmentInventory";
import DepartmentStockInventory from "./components/DepartmentStockInventory";
import InventorySuppliers from "./components/InventorySuppliers";
import PurchaseOrderManagement from "./components/PurchaseOrderManagement";

// Fixed Assets
import AssetsLayout from "./components/assets/AssetsLayout";
import AssetMaster from "./components/assets/AssetMaster";
import AssetDashboard from "./components/assets/AssetDashboard";

// Executive Management & Governance
import ManagementLayout from "./components/ManagementLayout";
import DiscountManager from "./components/DiscountManager";
import RefundReviewManagement from "./components/RefundReviewManagement";

// System Admin & Governance
import UserManagementLayout from "./components/UserManagementLayout";
import StaffDirectory from "./components/StaffDirectory";
import AccessControl from "./components/AccessControl";
import SecurityAudit from "./components/SecurityAudit";

// Hospital Settings & Configuration
import SettingsLayout from "./components/SettingsLayout";
import FacilitySetup from "./components/FacilitySetup";
import DepartmentSetup from "./components/DepartmentSetup";
import PricingMaster from "./components/PricingMaster";
import FinancialSettings from "./components/FinancialSettings";
import SettingsHardware from "./components/SettingsHardware";

// Reporting & Intelligence
import ReportingLayout from "./components/ReportingLayout";
import HospitalOverview from "./components/HospitalOverview";
import RevenueReports from "./components/RevenueReports";
import PatientAnalytics from "./components/PatientAnalytics";
import DepartmentUsage from "./components/DepartmentUsage";
import ReportBuilder from "./components/ReportBuilder";
import AllReportsLayout from "./components/AllReportsLayout";
import ReportsLanding from "./components/reports/ReportsLanding";
import PatientAdminReport from "./components/reports/PatientAdminReport";
import AppointmentReport from "./components/reports/AppointmentReport";
import InventoryReport from "./components/reports/InventoryReport";
import InventoryMovementReport from "./components/reports/InventoryMovementReport";
import InventoryStockReport from "./components/reports/InventoryStockReport";
import InventoryValuationReport from "./components/reports/InventoryValuationReport";
import InventorySummaryReport from "./components/reports/InventorySummaryReport";
import OutpatientReport from "./components/reports/OutpatientReport";
import InpatientReport from "./components/reports/InpatientReport";
import EmergencyReport from "./components/reports/EmergencyReport";
import AncReport from "./components/reports/AncReport";
import BillingReport from "./components/reports/BillingReport";
import FinancialOverviewReport from "./components/reports/FinancialOverviewReport";
import DepositUtilizationReport from "./components/reports/DepositUtilizationReport";
import CashCollectionReport from "./components/reports/CashCollectionReport";
import AdvanceCollectionReport from "./components/reports/AdvanceCollectionReport";
import UnbilledOrdersReport from "./components/reports/UnbilledOrdersReport";
import DepartmentalRevenueReport from "./components/reports/DepartmentalRevenueReport";
import DiscountReport from "./components/reports/DiscountReport";
import PhysicianProductivityReport from "./components/reports/PhysicianProductivityReport";
import CancellationAuditReport from "./components/reports/CancellationAuditReport";
import LabDashboardReport from "./components/reports/LabDashboardReport";
import LabOperationalReport from "./components/reports/LabOperationalReport";
import LabDetailedReport from "./components/reports/LabDetailedReport";
import LabTatReport from "./components/reports/LabTatReport";
import LabAbnormalFindingsReport from "./components/reports/LabAbnormalFindingsReport";
import LabReferralReport from "./components/reports/LabReferralReport";
import LabProductivityReport from "./components/reports/LabProductivityReport";
import PharmacyDashboardReport from "./components/reports/PharmacyDashboardReport";
import PharmacyOperationalReport from "./components/reports/PharmacyOperationalReport";
import PatientDispensingReport from "./components/reports/PatientDispensingReport";
import PharmacyTatReport from "./components/reports/PharmacyTatReport";
import PharmacyCancellationsReport from "./components/reports/PharmacyCancellationsReport";
import PharmacyProductivityReport from "./components/reports/PharmacyProductivityReport";
import PharmacyTransactionBookReport from "./components/reports/PharmacyTransactionBookReport";
import RadiologyDashboardReport from "./components/reports/RadiologyDashboardReport";
import RadiologyProductivityReport from "./components/reports/RadiologyProductivityReport";
import RadiologyCancellationReport from "./components/reports/RadiologyCancellationReport";
import RadiologyReferralReport from "./components/reports/RadiologyReferralReport";
import AppointmentDashboardReport from "./components/reports/AppointmentDashboardReport";
import AppointmentLedgerReport from "./components/reports/AppointmentLedgerReport";
import AppointmentCancellationsReport from "./components/reports/AppointmentCancellationsReport";
import AppointmentStaffProductivityReport from "./components/reports/AppointmentStaffProductivityReport";
import IpdBedUtilizationReport from "./components/reports/IpdBedUtilizationReport";
import IpdDischargeTatReport from "./components/reports/IpdDischargeTatReport";
import IpdTransfusionMetricsReport from "./components/reports/IpdTransfusionMetricsReport";
import IpdMedicationAuditReport from "./components/reports/IpdMedicationAuditReport";
import IpdRevenueReport from "./components/reports/IpdRevenueReport";
import OpdFunnelReport from "./components/reports/OpdFunnelReport";
import OpdRevenueYieldReport from "./components/reports/OpdRevenueYieldReport";
import OpdPayerMixReport from "./components/reports/OpdPayerMixReport";
import PasOverviewReport from "./components/reports/PasOverviewReport";
import PasMasterPatientReport from "./components/reports/PasMasterPatientReport";
import PasPayerMarketShareReport from "./components/reports/PasPayerMarketShareReport";
import PasAgeDemographicsReport from "./components/reports/PasAgeDemographicsReport";
import PasStaffProductivityReport from "./components/reports/PasStaffProductivityReport";
import PasGeographicDistributionReport from "./components/reports/PasGeographicDistributionReport";
import PasEncounterFrequencyReport from "./components/reports/PasEncounterFrequencyReport";
import PasEmergencyContactsReport from "./components/reports/PasEmergencyContactsReport";
import PasDeceasedInactiveReport from "./components/reports/PasDeceasedInactiveReport";
import InventoryClassificationReport from "./components/reports/InventoryClassificationReport";
import InventoryTopConsumedItemsReport from "./components/reports/InventoryTopConsumedItemsReport";
import InventoryApprovedConsumptionReport from "./components/reports/InventoryApprovedConsumptionReport";
import InventoryVendorSupplyReport from "./components/reports/InventoryVendorSupplyReport";
import OtDashboardReport from "./components/reports/OtDashboardReport";
import OtCancellationsReport from "./components/reports/OtCancellationsReport";
import OtSafetyReport from "./components/reports/OtSafetyReport";
import OtTatReport from "./components/reports/OtTatReport";
import OtLedgerReport from "./components/reports/OtLedgerReport";
// NEW: Clinical Reports
import DoctorClinicalReport from "./components/reports/DoctorClinicalReport";
import NursingClinicalReport from "./components/reports/NursingClinicalReport";

// Print Templates & Utilities
import UserProfile from "./components/UserProfile";
import RegistrationFormPrintTemplate from "./components/print-templates/patient-admin/RegistrationFormPrintTemplate";
import PatientCardPrintTemplate from "./components/print-templates/patient-admin/PatientCardPrintTemplate";
import DemographicsSheetPrintTemplate from "./components/print-templates/patient-admin/DemographicsSheetPrintTemplate";
import StaffIdPrintTemplate from "./components/print-templates/users/StaffIdPrintTemplate";
import IPDBillingPrintTemplate from "./components/print-templates/billing/IPDBillingPrintTemplate";
import DischargeSummaryPrintTemplate from "./components/print-templates/ward/DischargeSummaryPrintTemplate";
import ReceiptPrintTemplate from "./components/print-templates/billing/ReceiptPrintTemplate";
import OPDBillingPrintTemplate from "./components/print-templates/billing/OPDBillingPrintTemplate";
import PrescriptionPrintTemplate from "./components/print-templates/billing/PrescriptionPrintTemplate";
import AppointmentPrintTemplate from "./components/print-templates/appointment/AppointmentPrintTemplate";
import LabReportPrintTemplate from "./components/print-templates/lab/LabReportPrintTemplate";
import ReferenceLabelPrintTemplate from "./components/print-templates/lab/ReferenceLabelPrintTemplate";
import InventoryPrintTemplate from "./components/print-templates/inventory/InventoryPrintTemplate";
import InventoryItemLabelPrintTemplate from "./components/print-templates/inventory/InventoryItemLabelPrintTemplate";
import PatientPrintView from "./components/PatientPrintView";
import BillingPrintView from "./components/BillingPrintView";
import WristbandPrintView from "./components/WristbandPrintView";
import PharmacyLabelPrintView from "./components/PharmacyLabelPrintView";
import OperativeNotePrintView from "./components/OperativeNotePrintView";
import PasswordWarningAlert from "./components/PasswordWarningAlert";
import LoadingAnimation from "./components/animations/LoadingAnimation";
import StickyNote from "./components/StickyNote";
import { NAV_PERMISSION_RULES } from "./services/constants";

const MainLayout: React.FC = () => {
  const { user, logout, loading, saveCurrentSession } = useAuth();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    if (user?.id) {
      saveCurrentSession(location.pathname, location.state);
    }
    await logout();
    setIsLoggingOut(false);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-brand-primary">
        <div className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <PasswordWarningAlert />

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className="hidden md:block h-full transition-all duration-300">
        <Sidebar
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          userRole={user.role}
        />
      </div>

      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 md:hidden ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          isCollapsed={false}
          setIsCollapsed={() => {}}
          userRole={user.role}
          closeMobileMenu={() => setIsMobileMenuOpen(false)}
        />
      </div>

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header
          toggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          user={user}
          onLogout={handleLogout}
        />

        <div id="sub-header-portal" className="w-full z-30 flex-shrink-0 relative"></div>

        <main className="flex-1 overflow-y-auto no-scrollbar">
          <div className="w-full max-w-full mx-auto pb-10">
            <IdleTimeoutProvider>
              <Outlet />
            </IdleTimeoutProvider>
          </div>
        </main>
      </div>

      {isLoggingOut && <LoadingAnimation />}
      <StickyNote />
    </div>
  );
};

interface ProtectedRouteProps {
  requiredPermission?: string;
  requiredPermissions?: string[];
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requiredPermission,
  requiredPermissions,
  children,
}) => {
  const { isAuthenticated, hasPermission, hasAnyPermission, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isAllowed = requiredPermissions?.length
    ? hasAnyPermission(requiredPermissions)
    : requiredPermission
    ? hasPermission(requiredPermission)
    : true;

  if (!isAllowed) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  // Public demo for judges: outside the login and AuthProvider, only when VITE_REPRO_PUBLIC_DEMO=true.
  if (isPublicDemoRoute(window.location.pathname, publicDemoFlag())) return <ReproDemoPage />;

  return (
    <NotificationProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Standalone Print Routes */}
            <Route path="/print/lab/:referenceNo" element={<LabReportPrintTemplate />} />
            <Route path="/print/lab-label/:referenceNo" element={<ReferenceLabelPrintTemplate />} />
            <Route path="/print/patient/:mrn" element={<PatientPrintView />} />
            <Route path="/print/appointment/:appointmentId" element={<AppointmentPrintTemplate />} />
            <Route path="/print/billing/:encounterNumber" element={<BillingPrintView />} />
            <Route path="/print/billing/ipd/:encounterNumber" element={<IPDBillingPrintTemplate />} />
            <Route path="/print/billing/opd/:encounterNumber" element={<OPDBillingPrintTemplate />} />
            <Route path="/print/prescription/:encounterNumber" element={<PrescriptionPrintTemplate />} />
            <Route path="/print/discharge-summary/:encounterId" element={<DischargeSummaryPrintTemplate />} />
            <Route path="/print/invoice/:type/:id" element={<ReceiptPrintTemplate />} />
            <Route path="/print/wristband/:admissionId" element={<WristbandPrintView />} />
            <Route path="/print/pharmacy-label/:dispensingId" element={<PharmacyLabelPrintView />} />
            <Route path="/print/operative-note/:otCaseId" element={<OperativeNotePrintView />} />
            <Route path="/print/inventory/item/:id" element={<InventoryPrintTemplate type="item" />} />
            <Route path="/print/inventory/item-label/:id" element={<InventoryItemLabelPrintTemplate />} />
            <Route path="/print/inventory/batches/:id" element={<InventoryPrintTemplate type="batches" />} />
            <Route path="/print/registration" element={<RegistrationFormPrintTemplate />} />
            <Route path="/print/registration/:mrn" element={<RegistrationFormPrintTemplate />} />
            <Route path="/print/patient-card/:mrn" element={<PatientCardPrintTemplate />} />
            <Route path="/print/demographics/:mrn" element={<DemographicsSheetPrintTemplate />} />
            <Route path="/print/staff-id/:id" element={<StaffIdPrintTemplate />} />

            {/* Application Main Layout */}
            <Route path="/" element={<MainLayout />}>
              <Route
                index
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="profile"
                element={
                  <ProtectedRoute>
                    <UserProfile />
                  </ProtectedRoute>
                }
              />

              {/* Patient Administration */}
              <Route
                path="patients"
                element={
                  <ProtectedRoute requiredPermissions={NAV_PERMISSION_RULES.patients}>
                    <PatientLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="search" replace />} />
                <Route path="search" element={<PatientSearch />} />
                <Route path="demographics" element={<PatientRegistration />} />
                <Route path="history" element={<PatientHistory />} />
                <Route path="documents" element={<PatientDocuments />} />
                <Route path="admissions" element={<AdmissionList />} />
                <Route path="inventory" element={<DepartmentInventory location="PATIENTADMIN" />} />
                <Route path="stock" element={<DepartmentStockInventory location="PATIENTADMIN" />} />
                <Route path="requisitions" element={<DepartmentRequisitions allowedDepartments={["PATIENTADMIN"]} />} />
              </Route>

              {/* Appointments */}
              <Route
                path="appointments"
                element={
                  <ProtectedRoute requiredPermissions={NAV_PERMISSION_RULES.appointments}>
                    <AppointmentLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="schedule" replace />} />
                <Route path="schedule" element={<DoctorSchedule />} />
                <Route path="book" element={<AppointmentBooking />} />
                <Route path="queue" element={<ClinicQueue />} />
              </Route>

              {/* EMR */}
              <Route
                path="emr"
                element={
                  <ProtectedRoute requiredPermissions={NAV_PERMISSION_RULES.emr}>
                    <EMRLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="worklist" replace />} />
                <Route path="worklist" element={<EMRWorklist />} />
                <Route path="chart" element={<EMRChart />} />
                <Route path="orders" element={<EMROrders />} />
                <Route path="reproductive-population" element={<ReproductivePopulationPage />} />
              </Route>

              {/* Billing & Cashier */}
              <Route
                path="billing"
                element={
                  <ProtectedRoute requiredPermissions={NAV_PERMISSION_RULES.billing}>
                    <BillingLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="opd" replace />} />
                <Route path="opd" element={<OPDBilling />} />
                <Route path="ipd" element={<IPDBilling />} />
                <Route path="admissions" element={<AdmissionList />} />
                <Route path="history" element={<BillingHistory />} />
                <Route path="pricing" element={<BillingPricing />} />
                <Route path="advances" element={<AdvanceCollection />} />
                <Route path="refunds" element={<RefundManagement />} />
                <Route path="adjustments" element={<BillAdjustment />} />
                <Route path="invoices" element={<InvoiceGeneration />} />
                <Route path="payments" element={<CashAndInsurance />} />
                <Route path="receipts" element={<ReceiptHistory />} />
                <Route path="debtors" element={<OutstandingBalance />} />
                <Route path="inventory" element={<DepartmentInventory location="BILLING" />} />
                <Route path="stock" element={<DepartmentStockInventory location="BILLING" />} />
                <Route path="requisitions" element={<DepartmentRequisitions allowedDepartments={["OPD", "BILLING"]} />} />
              </Route>

              {/* HMO Management */}
              <Route
                path="hmo"
                element={
                  <ProtectedRoute requiredPermissions={NAV_PERMISSION_RULES.hmo}>
                    <HMOLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="claims" replace />} />
                <Route path="providers" element={<HMOProviders />} />
                <Route path="tariffs" element={<HMOTariffs />} />
                <Route path="claims" element={<HMOClaims />} />
                <Route path="auth" element={<HMOAuthorization />} />
              </Route>

              {/* Laboratory */}
              <Route
                path="lab"
                element={
                  <ProtectedRoute requiredPermissions={NAV_PERMISSION_RULES.lab}>
                    <LabLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="worklist" replace />} />
                <Route path="worklist" element={<LabWorklist />} />
                <Route path="results" element={<LabResultEntry />} />
                <Route
                  path="verification"
                  element={
                    <ProtectedRoute requiredPermission="lab_result_verify">
                      <LabVerification />
                    </ProtectedRoute>
                  }
                />
                <Route path="catalog" element={<LabCatalog />} />
                <Route path="reports" element={<LabReports />} />
                <Route path="inventory" element={<DepartmentInventory location="LAB" />} />
                <Route path="stock" element={<DepartmentStockInventory location="LAB" />} />
                <Route path="requisitions" element={<DepartmentRequisitions allowedDepartments={["LAB"]} />} />
                <Route path="management" element={<LabManagement />} />
              </Route>

              {/* Blood Bank */}
              <Route
                path="blood-bank"
                element={
                  <ProtectedRoute requiredPermissions={NAV_PERMISSION_RULES["blood-bank"]}>
                    <BloodBankLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="requests" replace />} />
                <Route path="requests" element={<BloodBankRequests />} />
                <Route path="issue" element={<BloodBankIssue />} />
              </Route>

              {/* Radiology */}
              <Route
                path="radiology"
                element={
                  <ProtectedRoute requiredPermissions={NAV_PERMISSION_RULES.radiology}>
                    <RadiologyLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="worklist" replace />} />
                <Route path="worklist" element={<RadiologyWorklist />} />
                <Route path="results" element={<RadiologyResultEntry />} />
                <Route path="catalog" element={<RadiologyCatalog />} />
                <Route path="view" element={<RadiologyViewer />} />
                <Route path="inventory" element={<DepartmentInventory location="RADIOLOGY" />} />
                <Route path="stock" element={<DepartmentStockInventory location="RADIOLOGY" />} />
                <Route path="requisitions" element={<DepartmentRequisitions allowedDepartments={["RADIOLOGY"]} />} />
              </Route>

              {/* Pharmacy */}
              <Route
                path="pharmacy"
                element={
                  <ProtectedRoute requiredPermissions={NAV_PERMISSION_RULES.pharmacy}>
                    <PharmacyLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="queue" replace />} />
                <Route path="queue" element={<PharmacyQueue />} />
                <Route path="catalog" element={<DrugCatalog />} />
                <Route path="expiry" element={<ExpiryTracker />} />
                <Route path="inventory" element={<DepartmentInventory location="PHARMACY" />} />
                <Route path="stock" element={<DepartmentStockInventory location="PHARMACY" />} />
                <Route path="requisitions" element={<DepartmentRequisitions allowedDepartments={["PHARMACY"]} />} />
              </Route>

              {/* Operating Theatre */}
              <Route
                path="theatre"
                element={
                  <ProtectedRoute requiredPermissions={NAV_PERMISSION_RULES.theatre}>
                    <TheatreLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="schedule" replace />} />
                <Route path="schedule" element={<TheatreSchedule />} />
                <Route path="notes" element={<ProcedureNotes />} />
                <Route path="live" element={<LiveStatusBoard />} />
                <Route path="inventory" element={<DepartmentInventory location="THEATRE" />} />
                <Route path="stock" element={<DepartmentStockInventory location="THEATRE" />} />
                <Route path="requisitions" element={<DepartmentRequisitions allowedDepartments={["THEATRE", "CSSD"]} />} />
              </Route>

              {/* Inpatient Ward */}
              <Route
                path="ward"
                element={
                  <ProtectedRoute requiredPermissions={NAV_PERMISSION_RULES.ward}>
                    <WardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="beds" replace />} />
                <Route path="beds" element={<BedManagement />} />
                <Route path="nursing" element={<NursingTasks />} />
                <Route path="admissions" element={<WardAdmissions />} />
                <Route path="inventory" element={<DepartmentInventory location="WARD" />} />
                <Route path="stock" element={<DepartmentStockInventory location="WARD" />} />
                <Route path="requisitions" element={<DepartmentRequisitions allowedDepartments={["WARD", "ICU", "HDU"]} />} />
              </Route>

              {/* Nursing & Labour */}
              <Route
                path="nursing"
                element={
                  <ProtectedRoute requiredPermissions={NAV_PERMISSION_RULES.nursing}>
                    <NursingLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="admissions" replace />} />
                <Route path="admissions" element={<LabourAdmissions />} />
                <Route path="partogram/:sessionId" element={<LabourPartogram />} />
                <Route path="inventory" element={<DepartmentInventory location="OPD" />} />
                <Route path="stock" element={<DepartmentStockInventory location="OPD" />} />
                <Route path="requisitions" element={<DepartmentRequisitions allowedDepartments={["OPD", "DIALYSIS"]} />} />
              </Route>

              {/* Emergency */}
              <Route
                path="emergency"
                element={
                  <ProtectedRoute requiredPermissions={NAV_PERMISSION_RULES.emergency}>
                    <EmergencyLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="floor" replace />} />
                <Route path="floor" element={<EmergencyFloor />} />
                <Route path="triage" element={<EDTriageBoard />} />
                <Route path="encounter" element={<EmergencyEncounter />} />
                <Route path="inventory" element={<DepartmentInventory location="ERD" />} />
                <Route path="stock" element={<DepartmentStockInventory location="ERD" />} />
                <Route path="requisitions" element={<DepartmentRequisitions allowedDepartments={["ERD"]} />} />
              </Route>

              {/* Global Inventory & Store */}
              <Route
                path="inventory"
                element={
                  <ProtectedRoute requiredPermissions={NAV_PERMISSION_RULES.inventory}>
                    <InventoryLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="master" replace />} />
                <Route path="master" element={<InventoryStockMaster />} />
                <Route path="grn" element={<InventoryGRN />} />
                <Route path="movement" element={<DepartmentInventory isGlobal={true} />} />
                <Route path="stock" element={<DepartmentStockInventory isGlobal={true} />} />
                <Route path="requests" element={<InventoryRequisitions />} />
                <Route path="purchase-orders" element={<PurchaseOrderManagement />} />
                <Route path="suppliers" element={<InventorySuppliers />} />
              </Route>

              {/* Fixed Assets Management */}
              <Route
                path="assets"
                element={
                  <ProtectedRoute requiredPermissions={NAV_PERMISSION_RULES.assets}>
                    <AssetsLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AssetDashboard />} />
                <Route path="master" element={<AssetMaster />} />
              </Route>

              {/* Executive Management */}
              <Route
                path="management"
                element={
                  <ProtectedRoute requiredPermissions={NAV_PERMISSION_RULES.management}>
                    <ManagementLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="discounts" replace />} />
                <Route path="discounts" element={<DiscountManager />} />
                <Route path="refunds" element={<RefundReviewManagement />} />
              </Route>

              {/* ==================== FINANCE MODULE ==================== */}
              <Route
                path="finance"
                element={
                  <ProtectedRoute requiredPermissions={NAV_PERMISSION_RULES.finance}>
                    <Outlet />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="chart-of-accounts" replace />} />
                <Route path="chart-of-accounts" element={<div className="p-6 font-semibold text-slate-800">Chart of Accounts View</div>} />
                <Route path="accounts-payable" element={<div className="p-6 font-semibold text-slate-800">Accounts Payable</div>} />
                <Route path="accounts-receivable" element={<div className="p-6 font-semibold text-slate-800">Accounts Receivable</div>} />
                <Route path="reconciliation" element={<div className="p-6 font-semibold text-slate-800">Bank Reconciliation</div>} />
                <Route path="petty-cash" element={<div className="p-6 font-semibold text-slate-800">Petty Cash Management</div>} />
                <Route path="statements" element={<div className="p-6 font-semibold text-slate-800">Financial Reports & Statements</div>} />
              </Route>

              {/* ==================== HR MODULE ==================== */}
              <Route
                path="hr"
                element={
                  <ProtectedRoute requiredPermissions={NAV_PERMISSION_RULES.hr}>
                    <Outlet />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="directory" replace />} />
                <Route path="directory" element={<div className="p-6 font-semibold text-slate-800">HR Staff Directory</div>} />
                <Route path="roster" element={<div className="p-6 font-semibold text-slate-800">Duty Rostering</div>} />
                <Route path="attendance" element={<div className="p-6 font-semibold text-slate-800">Staff Attendance Logs</div>} />
                <Route path="leaves" element={<div className="p-6 font-semibold text-slate-800">Leave Applications</div>} />
                <Route path="payroll" element={<div className="p-6 font-semibold text-slate-800">Payroll Processing</div>} />
              </Route>

              {/* ==================== MARKETING MODULE ==================== */}
              <Route
                path="marketing"
                element={
                  <ProtectedRoute requiredPermissions={NAV_PERMISSION_RULES.marketing}>
                    <Outlet />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="corporate-clients" replace />} />
                <Route path="corporate-clients" element={<div className="p-6 font-semibold text-slate-800">Corporate Retainer Clients</div>} />
                <Route path="partners" element={<div className="p-6 font-semibold text-slate-800">Referral Partners</div>} />
                <Route path="leads" element={<div className="p-6 font-semibold text-slate-800">Inbound Patient Leads</div>} />
                <Route path="packages" element={<div className="p-6 font-semibold text-slate-800">Health Packages</div>} />
                <Route path="campaigns" element={<div className="p-6 font-semibold text-slate-800">Outreach Campaigns</div>} />
                <Route path="feedback" element={<div className="p-6 font-semibold text-slate-800">Patient Feedback & NPS</div>} />
              </Route>

              {/* Analytics & BI Reports */}
              <Route
                path="reports"
                element={
                  <ProtectedRoute requiredPermissions={NAV_PERMISSION_RULES.reporting}>
                    <ReportingLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="overview" replace />} />
                <Route path="overview" element={<HospitalOverview />} />
                <Route path="revenue" element={<RevenueReports />} />
                <Route path="patients" element={<PatientAnalytics />} />
                <Route path="usage" element={<DepartmentUsage />} />
                <Route path="builder" element={<ReportBuilder />} />
              </Route>

              {/* All Reports Catalog */}
              <Route
                path="all-reports"
                element={

                  <ProtectedRoute>
                    <AllReportsLayout />
                  </ProtectedRoute>
                  // <ProtectedRoute requiredPermissions={NAV_PERMISSION_RULES["all-reports"]}>
                  //   <AllReportsLayout />
                  // </ProtectedRoute>
                }
              >
                {/* --- NEW CLINICAL ROUTES --- */}
                <Route path="clinical/doctor-analytics" element={<DoctorClinicalReport />} />
                <Route path="clinical/nursing-productivity" element={<NursingClinicalReport />} />
                {/* --------------------------- */}

                <Route path="patient" element={<PatientAdminReport />} />
                <Route path="patient/overview" element={<PasOverviewReport />} />
                <Route path="patient/master" element={<PasMasterPatientReport />} />
                <Route index element={<ReportsLanding />} />
                <Route path="patient" element={<PatientAdminReport />} />
                <Route path="patient/overview" element={<PasOverviewReport />} />
                <Route path="patient/master" element={<PasMasterPatientReport />} />
                <Route path="patient/payer-market-share" element={<PasPayerMarketShareReport />} />
                <Route path="patient/age-demographics" element={<PasAgeDemographicsReport />} />
                <Route path="patient/staff-productivity" element={<PasStaffProductivityReport />} />
                <Route path="patient/geographic-distribution" element={<PasGeographicDistributionReport />} />
                <Route path="patient/encounter-frequency" element={<PasEncounterFrequencyReport />} />
                <Route path="patient/emergency-contacts" element={<PasEmergencyContactsReport />} />
                <Route path="patient/deceased-inactive" element={<PasDeceasedInactiveReport />} />
                <Route path="appointment" element={<AppointmentReport />} />
                <Route path="inventory" element={<InventoryReport />} />
                <Route path="inventory/movement" element={<InventoryMovementReport />} />
                <Route path="inventory/stock" element={<InventoryStockReport />} />
                <Route path="inventory/valuation" element={<InventoryValuationReport />} />
                <Route path="inventory/summary" element={<InventorySummaryReport />} />
                <Route path="inventory/classification" element={<InventoryClassificationReport />} />
                <Route path="inventory/top-consumed" element={<InventoryTopConsumedItemsReport />} />
                <Route path="inventory/approved-consumption" element={<InventoryApprovedConsumptionReport />} />
                <Route path="inventory/vendor-supply" element={<InventoryVendorSupplyReport />} />
                <Route path="ot/dashboard" element={<OtDashboardReport />} />
                <Route path="ot/cancellations" element={<OtCancellationsReport />} />
                <Route path="ot/safety" element={<OtSafetyReport />} />
                <Route path="ot/tat" element={<OtTatReport />} />
                <Route path="ot/ledger" element={<OtLedgerReport />} />
                <Route path="operational/outpatient" element={<OutpatientReport />} />
                <Route path="operational/inpatient" element={<InpatientReport />} />
                <Route path="operational/emergency" element={<EmergencyReport />} />
                <Route path="operational/anc" element={<AncReport />} />
                <Route path="financial/billing" element={<BillingReport />} />
                <Route path="financial/billing/overview" element={<FinancialOverviewReport />} />

                
                <Route path="financial/deposit-utilization" element={<DepositUtilizationReport />} />
                <Route path="financial/cash-collection" element={<CashCollectionReport />} />
                <Route path="financial/advance-collection" element={<AdvanceCollectionReport />} />
                <Route path="financial/unbilled-orders" element={<UnbilledOrdersReport />} />
                <Route path="financial/departmental-revenue" element={<DepartmentalRevenueReport />} />
                <Route path="financial/discount" element={<DiscountReport />} />
                <Route path="financial/physician-productivity" element={<PhysicianProductivityReport />} />
                <Route path="financial/cancellation-audit" element={<CancellationAuditReport />} />
                <Route path="laboratory" element={<LabDashboardReport />} />
                <Route path="laboratory/operational" element={<LabOperationalReport />} />
                <Route path="laboratory/detailed" element={<LabDetailedReport />} />
                <Route path="laboratory/tat" element={<LabTatReport />} />
                <Route path="laboratory/abnormal-findings" element={<LabAbnormalFindingsReport />} />
                <Route path="laboratory/referrals" element={<LabReferralReport />} />
                <Route path="laboratory/productivity" element={<LabProductivityReport />} />
                <Route path="pharmacy" element={<PharmacyDashboardReport />} />
                <Route path="pharmacy/operational" element={<PharmacyOperationalReport />} />
                <Route path="pharmacy/dispense" element={<PatientDispensingReport />} />

                
                <Route path="pharmacy/tat" element={<PharmacyTatReport />} />
                <Route path="pharmacy/cancellations" element={<PharmacyCancellationsReport />} />
                <Route path="pharmacy/productivity" element={<PharmacyProductivityReport />} />
                <Route path="pharmacy/transactions" element={<PharmacyTransactionBookReport />} />
                <Route path="radiology" element={<RadiologyDashboardReport />} />
                <Route path="radiology/productivity" element={<RadiologyProductivityReport />} />
                <Route path="radiology/cancellations" element={<RadiologyCancellationReport />} />
                <Route path="radiology/referrals" element={<RadiologyReferralReport />} />
                <Route path="appointment/dashboard" element={<AppointmentDashboardReport />} />
                <Route path="appointment/ledger" element={<AppointmentLedgerReport />} />
                <Route path="appointment/cancellations" element={<AppointmentCancellationsReport />} />
                <Route path="appointment/staff-productivity" element={<AppointmentStaffProductivityReport />} />
                <Route path="ipd/bed-utilization" element={<IpdBedUtilizationReport />} />
                <Route path="ipd/discharge-tat" element={<IpdDischargeTatReport />} />
                <Route path="ipd/transfusion-metrics" element={<IpdTransfusionMetricsReport />} />
                <Route path="ipd/medication-audit" element={<IpdMedicationAuditReport />} />
                <Route path="ipd/revenue" element={<IpdRevenueReport />} />
                <Route path="opd/funnel" element={<OpdFunnelReport />} />
                <Route path="opd/revenue-yield" element={<OpdRevenueYieldReport />} />
                <Route path="opd/payer-mix" element={<OpdPayerMixReport />} />
              </Route>

              {/* User Governance & Security */}
              <Route
                path="admin/users"
                element={
                  <ProtectedRoute requiredPermissions={NAV_PERMISSION_RULES.users}>
                    <UserManagementLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="directory" replace />} />
                <Route
                  path="directory"
                  element={
                    <ProtectedRoute requiredPermissions={NAV_PERMISSION_RULES["user-dir"]}>
                      <StaffDirectory />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="access"
                  element={
                    <ProtectedRoute requiredPermissions={NAV_PERMISSION_RULES["user-access"]}>
                      <AccessControl />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="audit"
                  element={
                    <ProtectedRoute requiredPermissions={NAV_PERMISSION_RULES["user-audit"]}>
                      <SecurityAudit />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Global Settings */}
              <Route
                path="settings"
                element={
                  <ProtectedRoute requiredPermissions={NAV_PERMISSION_RULES.settings}>
                    <SettingsLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="facility" replace />} />
                <Route path="facility" element={<FacilitySetup />} />
                <Route path="departments" element={<DepartmentSetup />} />
                <Route path="pricing" element={<PricingMaster />} />
                <Route path="finance" element={<FinancialSettings />} />
                <Route path="hardware" element={<SettingsHardware />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </NotificationProvider>
  );
};

export default App;
























































































































// import React, { useState } from "react";
// import {
//   BrowserRouter,
//   Routes,
//   Route,
//   Navigate,
//   Outlet,
//   useLocation,
// } from "react-router-dom";
// import { AuthProvider, useAuth } from "./context/AuthContext";
// import { NotificationProvider } from "./context/NotificationContext";
// import { IdleTimeoutProvider } from "./context/IdleTimeoutContext";
// import Sidebar from "./components/Sidebar";
// import Header from "./components/Header";
// import Login from "./components/Login";
// import Dashboard from "./components/Dashboard";
// import PatientLayout from "./components/PatientLayout";
// import PatientSearch from "./components/PatientSearch";
// import PatientRegistration from "./components/PatientRegistration";
// import PatientHistory from "./components/PatientHistory";
// import PatientDocuments from "./components/PatientDocuments";
// import AdmissionList from "./components/AdmissionList";
// import AppointmentLayout from "./components/AppointmentLayout";
// import DoctorSchedule from "./components/DoctorSchedule";
// import AppointmentBooking from "./components/AppointmentBooking";
// import ClinicQueue from "./components/ClinicQueue";
// import EMRLayout from "./components/EMRLayout";
// import EMRWorklist from "./components/EMRWorklist";
// import PatientChart from "./components/PatientChart";
// import EMRChart from "./components/EMRChart";
// import EMROrders from "./components/EMROrders"; // Changed Import
// import BillingLayout from "./components/BillingLayout";
// import OPDBilling from "./components/OPDBilling";
// import IPDBilling from "./components/IPDBilling";
// import BillingHistory from "./components/BillingHistory";
// import BillingPricing from "./components/BillingPricing";
// import AdvanceCollection from "./components/AdvanceCollection";
// import RefundManagement from "./components/RefundManagement";
// import BillAdjustment from "./components/BillAdjustment";
// import InvoiceGeneration from "./components/InvoiceGeneration";
// import CashAndInsurance from "./components/CashAndInsurance";
// import DiscountManager from "./components/DiscountManager";
// import ManagementLayout from "./components/ManagementLayout";
// import RefundReviewManagement from "./components/RefundReviewManagement";
// import ReceiptHistory from "./components/ReceiptHistory";
// import OutstandingBalance from "./components/OutstandingBalance";
// import HMOLayout from "./components/HMOLayout";
// import HMOProviders from "./components/HMOProviders";
// import HMOTariffs from "./components/HMOTariffs";
// import HMOClaims from "./components/HMOClaims";
// import HMOAuthorization from "./components/HMOAuthorization";
// import LabLayout from "./components/LabLayout";
// import LabWorklist from "./components/LabWorklist";
// import LabResultEntry from "./components/LabResultEntry";
// import LabCatalog from "./components/LabCatalog";
// import LabReports from "./components/LabReports";
// import LabManagement from "./components/LabManagement";
// import LabVerification from "./components/LabVerification";
// import LabPrintView from "./components/LabPrintView";
// import BloodBankLayout from "./components/BloodBankLayout";
// import BloodBankRequests from "./components/BloodBankRequests";
// import BloodBankIssue from "./components/BloodBankIssue";
// import PatientPrintView from "./components/PatientPrintView";
// import AppointmentPrintView from "./components/AppointmentPrintView";
// import BillingPrintView from "./components/BillingPrintView";
// import InvoicePrintView from "./components/InvoicePrintView";
// import WristbandPrintView from "./components/WristbandPrintView";
// import OperativeNotePrintView from "./components/OperativeNotePrintView";
// import RadiologyLayout from "./components/RadiologyLayout";
// import RadiologyWorklist from "./components/RadiologyWorklist";
// import RadiologyResultEntry from "./components/RadiologyResultEntry";
// import RadiologyCatalog from "./components/RadiologyCatalog";
// import RadiologyViewer from "./components/RadiologyViewer";
// import PharmacyLayout from "./components/PharmacyLayout";
// import PharmacyQueue from "./components/PharmacyQueue";
// import PharmacyLabelPrintView from "./components/PharmacyLabelPrintView";
// import DepartmentInventory from "./components/DepartmentInventory";
// import DepartmentStockInventory from "./components/DepartmentStockInventory";
// import DrugCatalog from "./components/DrugCatalog";
// import ExpiryTracker from "./components/ExpiryTracker";
// import TheatreLayout from "./components/TheatreLayout";
// import TheatreSchedule from "./components/TheatreSchedule";
// import ProcedureNotes from "./components/ProcedureNotes";
// import LiveStatusBoard from "./components/LiveStatusBoard";
// import WardLayout from "./components/WardLayout";
// import BedManagement from "./components/BedManagement";
// import NursingTasks from "./components/NursingTasks";
// import WardAdmissions from "./components/WardAdmissions";
// import EmergencyLayout from "./components/EmergencyLayout";
// import EDTriageBoard from "./components/EDTriageBoard";
// import EDFloorMap from "./components/EDFloorMap";
// import EmergencyEncounter from "./components/EmergencyEncounter";
// import InventoryLayout from "./components/InventoryLayout";
// import InventoryStockMaster from "./components/InventoryStockMaster";
// import InventoryGRN from "./components/InventoryGRN";
// import InventoryRequisitions from "./components/InventoryRequisitions";
// import DepartmentRequisitions from "./components/DepartmentRequisitions";
// import InventorySuppliers from "./components/InventorySuppliers";
// import ReportingLayout from "./components/ReportingLayout";
// import HospitalOverview from "./components/HospitalOverview";
// import RevenueReports from "./components/RevenueReports";
// import PatientAnalytics from "./components/PatientAnalytics";
// import DepartmentUsage from "./components/DepartmentUsage";
// import ReportBuilder from "./components/ReportBuilder";
// import AllReportsLayout from "./components/AllReportsLayout";
// import ReportsLanding from "./components/reports/ReportsLanding";
// import PatientAdminReport from "./components/reports/PatientAdminReport";
// import AppointmentReport from "./components/reports/AppointmentReport";
// import InventoryReport from "./components/reports/InventoryReport";
// import InventoryMovementReport from "./components/reports/InventoryMovementReport";
// import InventoryStockReport from "./components/reports/InventoryStockReport";
// import InventoryValuationReport from "./components/reports/InventoryValuationReport";
// import InventorySummaryReport from "./components/reports/InventorySummaryReport";
// import OutpatientReport from "./components/reports/OutpatientReport";
// import InpatientReport from "./components/reports/InpatientReport";
// import EmergencyReport from "./components/reports/EmergencyReport";
// import AncReport from "./components/reports/AncReport";
// import BillingReport from "./components/reports/BillingReport";
// import DepositUtilizationReport from "./components/reports/DepositUtilizationReport";
// import CashCollectionReport from "./components/reports/CashCollectionReport";
// import AdvanceCollectionReport from "./components/reports/AdvanceCollectionReport";
// import UnbilledOrdersReport from "./components/reports/UnbilledOrdersReport";
// import DepartmentalRevenueReport from "./components/reports/DepartmentalRevenueReport";
// import DiscountReport from "./components/reports/DiscountReport";
// import PhysicianProductivityReport from "./components/reports/PhysicianProductivityReport";
// import CancellationAuditReport from "./components/reports/CancellationAuditReport";
// import LabDashboardReport from "./components/reports/LabDashboardReport";
// import LabDetailedReport from "./components/reports/LabDetailedReport";
// import LabTatReport from "./components/reports/LabTatReport";
// import LabAbnormalFindingsReport from "./components/reports/LabAbnormalFindingsReport";
// import LabReferralReport from "./components/reports/LabReferralReport";
// import LabProductivityReport from "./components/reports/LabProductivityReport";
// import PharmacyDashboardReport from "./components/reports/PharmacyDashboardReport";
// import PharmacyTatReport from "./components/reports/PharmacyTatReport";
// import PharmacyCancellationsReport from "./components/reports/PharmacyCancellationsReport";
// import PharmacyProductivityReport from "./components/reports/PharmacyProductivityReport";
// import PharmacyTransactionBookReport from "./components/reports/PharmacyTransactionBookReport";
// import RadiologyDashboardReport from "./components/reports/RadiologyDashboardReport";
// import RadiologyProductivityReport from "./components/reports/RadiologyProductivityReport";
// import RadiologyCancellationReport from "./components/reports/RadiologyCancellationReport";
// import RadiologyReferralReport from "./components/reports/RadiologyReferralReport";
// import AppointmentDashboardReport from "./components/reports/AppointmentDashboardReport";
// import AppointmentLedgerReport from "./components/reports/AppointmentLedgerReport";
// import AppointmentCancellationsReport from "./components/reports/AppointmentCancellationsReport";
// import AppointmentStaffProductivityReport from "./components/reports/AppointmentStaffProductivityReport";
// import IpdBedUtilizationReport from "./components/reports/IpdBedUtilizationReport";
// import IpdDischargeTatReport from "./components/reports/IpdDischargeTatReport";
// import IpdTransfusionMetricsReport from "./components/reports/IpdTransfusionMetricsReport";
// import IpdMedicationAuditReport from "./components/reports/IpdMedicationAuditReport";
// import IpdRevenueReport from "./components/reports/IpdRevenueReport";
// import OpdFunnelReport from "./components/reports/OpdFunnelReport";
// import OpdRevenueYieldReport from "./components/reports/OpdRevenueYieldReport";
// import OpdPayerMixReport from "./components/reports/OpdPayerMixReport";
// import PasOverviewReport from "./components/reports/PasOverviewReport";
// import PasMasterPatientReport from "./components/reports/PasMasterPatientReport";
// import PasPayerMarketShareReport from "./components/reports/PasPayerMarketShareReport";
// import PasAgeDemographicsReport from "./components/reports/PasAgeDemographicsReport";
// import PasStaffProductivityReport from "./components/reports/PasStaffProductivityReport";
// import PasGeographicDistributionReport from "./components/reports/PasGeographicDistributionReport";
// import PasEncounterFrequencyReport from "./components/reports/PasEncounterFrequencyReport";
// import PasEmergencyContactsReport from "./components/reports/PasEmergencyContactsReport";
// import PasDeceasedInactiveReport from "./components/reports/PasDeceasedInactiveReport";
// import InventoryClassificationReport from "./components/reports/InventoryClassificationReport";
// import InventoryTopConsumedItemsReport from "./components/reports/InventoryTopConsumedItemsReport";
// import InventoryApprovedConsumptionReport from "./components/reports/InventoryApprovedConsumptionReport";
// import InventoryVendorSupplyReport from "./components/reports/InventoryVendorSupplyReport";
// import OtDashboardReport from "./components/reports/OtDashboardReport";
// import OtCancellationsReport from "./components/reports/OtCancellationsReport";
// import OtSafetyReport from "./components/reports/OtSafetyReport";
// import OtTatReport from "./components/reports/OtTatReport";
// import OtLedgerReport from "./components/reports/OtLedgerReport";
// import UserManagementLayout from "./components/UserManagementLayout";
// import StaffDirectory from "./components/StaffDirectory";
// import AccessControl from "./components/AccessControl";
// import SecurityAudit from "./components/SecurityAudit";
// import SettingsLayout from "./components/SettingsLayout";
// import FacilitySetup from "./components/FacilitySetup";
// import DepartmentSetup from "./components/DepartmentSetup";
// import PricingMaster from "./components/PricingMaster";
// import FinancialSettings from "./components/FinancialSettings";
// import SettingsHardware from "./components/SettingsHardware";
// import EmergencyFloor from "./components/EmergencyFloor";
// import UserProfile from "./components/UserProfile";
// import { NAV_PERMISSION_RULES } from "./services/constants";
// import NursingLayout from "./components/nursing/NursingLayout";
// import LabourAdmissions from "./components/nursing/LabourAdmissions";
// import LabourPartogram from "./components/nursing/LabourPartogram";
// import LoadingAnimation from "./components/animations/LoadingAnimation";
// import StickyNote from "./components/StickyNote";
// import AssetsLayout from "./components/assets/AssetsLayout";
// import AssetMaster from "./components/assets/AssetMaster";
// import AssetDashboard from "./components/assets/AssetDashboard";

// import RegistrationFormPrintTemplate from "./components/print-templates/patient-admin/RegistrationFormPrintTemplate";
// import PatientCardPrintTemplate from "./components/print-templates/patient-admin/PatientCardPrintTemplate";
// import DemographicsSheetPrintTemplate from "./components/print-templates/patient-admin/DemographicsSheetPrintTemplate";
// import StaffIdPrintTemplate from "./components/print-templates/users/StaffIdPrintTemplate";
// import IPDBillingPrintTemplate from "./components/print-templates/billing/IPDBillingPrintTemplate";
// import DischargeSummaryPrintTemplate from "./components/print-templates/ward/DischargeSummaryPrintTemplate";
// import ReceiptPrintTemplate from "./components/print-templates/billing/ReceiptPrintTemplate";
// import OPDBillingPrintTemplate from "./components/print-templates/billing/OPDBillingPrintTemplate";
// import PrescriptionPrintTemplate from "./components/print-templates/billing/PrescriptionPrintTemplate";
// import AppointmentPrintTemplate from "./components/print-templates/appointment/AppointmentPrintTemplate";
// import LabReportPrintTemplate from "./components/print-templates/lab/LabReportPrintTemplate";
// import ReferenceLabelPrintTemplate from "./components/print-templates/lab/ReferenceLabelPrintTemplate";
// import InventoryPrintTemplate from "./components/print-templates/inventory/InventoryPrintTemplate";
// import InventoryItemLabelPrintTemplate from "./components/print-templates/inventory/InventoryItemLabelPrintTemplate";
// import PasswordWarningAlert from "./components/PasswordWarningAlert";



// // purchase order

// import PurchaseOrderManagement from './components/PurchaseOrderManagement';

// /**
//  * Main Layout Component
//  */
// const MainLayout: React.FC = () => {
//   const { user, logout, loading, saveCurrentSession } = useAuth();
//   const location = useLocation();
//   const [isCollapsed, setIsCollapsed] = useState(false);
//   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
//   const [isLoggingOut, setIsLoggingOut] = useState(false);

//   const handleLogout = async () => {
//     setIsLoggingOut(true);
//     // Before manually logging out, save the current route & state
//     if (user?.id) {
//       saveCurrentSession(location.pathname, location.state);
//     }
//     await logout();
//     setIsLoggingOut(false);
//   };

//   console.debug(
//     "[AUTH_DEBUG] MainLayout Render - Loading:",
//     loading,
//     "User:",
//     user?.name,
//     "Role:",
//     user?.role,
//   );

//   // Loading Guard: Prevent redirect while session is being verified
//   if (loading) {
//     return (
//       <div className="flex h-screen items-center justify-center bg-slate-50 text-brand-primary">
//         <div className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin"></div>
//       </div>
//     );
//   }

//   if (!user) {
//     console.debug(
//       "[AUTH_DEBUG] MainLayout: No user found, redirecting to /login",
//     );
//     return <Navigate to="/login" replace />;
//   }

//   return (
//     <div className="flex h-screen overflow-hidden bg-slate-50">

//       {/* --- INJECT THE PASSWORD WARNING HERE --- */}
//       <PasswordWarningAlert />
      
//       {isMobileMenuOpen && (
//         <div
//           className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 md:hidden"
//           onClick={() => setIsMobileMenuOpen(false)}
//         />
//       )}

//       <div className={`hidden md:block h-full transition-all duration-300`}>
//         <Sidebar
//           isCollapsed={isCollapsed}
//           setIsCollapsed={setIsCollapsed}
//           userRole={user.role}
//         />
//       </div>

//       <div
//         className={`
//         fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 md:hidden
//         ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
//       `}
//       >
//         <Sidebar
//           isCollapsed={false}
//           setIsCollapsed={() => { }}
//           userRole={user.role}
//           closeMobileMenu={() => setIsMobileMenuOpen(false)}
//         />
//       </div>

//       <div className="flex-1 flex flex-col h-full overflow-hidden">
//         <Header
//           toggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
//           user={user}
//           onLogout={handleLogout}
//         />
        
//         <div id="sub-header-portal" className="w-full z-30 flex-shrink-0 relative"></div>

//         <main className=" flex-1 overflow-y-auto no-scrollbar">
//           <div className="w-full max-w-full mx-auto pb-10">
//             <IdleTimeoutProvider>
//               <Outlet />
//             </IdleTimeoutProvider>
//           </div>
//         </main>
//       </div>

//       {isLoggingOut && <LoadingAnimation />}
//       <StickyNote />
//     </div>
//   );
// };

// /**
//  * Protected Route Component
//  */
// interface ProtectedRouteProps {
//   requiredPermission?: string;
//   requiredPermissions?: string[];
//   children: React.ReactNode;
// }

// const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
//   requiredPermission,
//   requiredPermissions,
//   children,
// }) => {
//   const { isAuthenticated, hasPermission, hasAnyPermission, loading } =
//     useAuth();

//   if (loading) {
//     return (
//       <div className="flex h-screen items-center justify-center bg-slate-50">
//         <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
//       </div>
//     );
//   }

//   if (!isAuthenticated) {
//     console.debug(
//       "[AUTH_DEBUG] ProtectedRoute: Not authenticated, redirecting to /login",
//     );
//     return <Navigate to="/login" replace />;
//   }

//   const isAllowed = requiredPermissions?.length
//     ? hasAnyPermission(requiredPermissions)
//     : requiredPermission
//       ? hasPermission(requiredPermission)
//       : true;

//   if (!isAllowed) {
//     console.warn(
//       `[AUTH_DEBUG] ProtectedRoute: Missing required permission. Redirecting to Dashboard.`,
//     );
//     return <Navigate to="/" replace />;
//   }

//   return <>{children}</>;
// };



// const App: React.FC = () => {
//   return (
//     <NotificationProvider>
//       <AuthProvider>
//         <BrowserRouter>
//           <Routes>
//             <Route path="/login" element={<Login />} />

//             {/* Print Routes - Standalone */}
//             <Route
//               path="/print/lab/:referenceNo"
//               element={<LabReportPrintTemplate />}
//             />
//             <Route
//               path="/print/lab-label/:referenceNo"
//               element={<ReferenceLabelPrintTemplate />}
//             />
//             <Route path="/print/patient/:mrn" element={<PatientPrintView />} />
//             <Route
//               path="/print/appointment/:appointmentId"
//               element={<AppointmentPrintTemplate />}
//             />
//             <Route
//               path="/print/billing/:encounterNumber"
//               element={<BillingPrintView />}
//             />
//             <Route
//               path="/print/billing/ipd/:encounterNumber"
//               element={<IPDBillingPrintTemplate />}
//             />
//             <Route
//               path="/print/billing/opd/:encounterNumber"
//               element={<OPDBillingPrintTemplate />}
//             />
//             <Route
//               path="/print/prescription/:encounterNumber"
//               element={<PrescriptionPrintTemplate />}
//             />
//             <Route
//               path="/print/discharge-summary/:encounterId"
//               element={<DischargeSummaryPrintTemplate />}
//             />
//             <Route
//               path="/print/invoice/:type/:id"
//               element={<ReceiptPrintTemplate />}
//             />
//             <Route
//               path="/print/wristband/:admissionId"
//               element={<WristbandPrintView />}
//             />
//             <Route
//               path="/print/pharmacy-label/:dispensingId"
//               element={<PharmacyLabelPrintView />}
//             />
//             <Route
//               path="/print/operative-note/:otCaseId"
//               element={<OperativeNotePrintView />}
//             />

//             <Route path="/print/inventory/item/:id" element={<InventoryPrintTemplate type="item" />} />
//             <Route path="/print/inventory/item-label/:id" element={<InventoryItemLabelPrintTemplate />} />
//             <Route path="/print/inventory/batches/:id" element={<InventoryPrintTemplate type="batches" />} />

//             <Route path="/print/registration" element={<RegistrationFormPrintTemplate />} />
//             <Route path="/print/registration/:mrn" element={<RegistrationFormPrintTemplate />} />
//             <Route path="/print/patient-card/:mrn" element={<PatientCardPrintTemplate />} />
//             <Route path="/print/demographics/:mrn" element={<DemographicsSheetPrintTemplate />} />
//             <Route path="/print/staff-id/:id" element={<StaffIdPrintTemplate />} />

//             <Route path="/" element={<MainLayout />}>
//               <Route
//                 index
//                 element={
//                   <ProtectedRoute>
//                     <Dashboard />
//                   </ProtectedRoute>
//                 }
//               />

//               <Route
//                 path="profile"
//                 element={
//                   <ProtectedRoute>
//                     <UserProfile />
//                   </ProtectedRoute>
//                 }
//               />

//               <Route
//                 path="patients"
//                 element={
//                   <ProtectedRoute
//                     requiredPermissions={NAV_PERMISSION_RULES.patients}
//                   >
//                     <PatientLayout />
//                   </ProtectedRoute>
//                 }
//               >
//                 <Route index element={<Navigate to="search" replace />} />
//                 <Route path="search" element={<PatientSearch />} />
//                 <Route path="demographics" element={<PatientRegistration />} />
//                 <Route path="history" element={<PatientHistory />} />
//                 <Route path="documents" element={<PatientDocuments />} />
//                 <Route path="admissions" element={<AdmissionList />} />
//                 <Route
//                   path="inventory"
//                   element={<DepartmentInventory location="PATIENTADMIN" />}
//                 />
//                 <Route
//                   path="stock"
//                   element={<DepartmentStockInventory location="PATIENTADMIN" />}
//                 />
//                 <Route
//                   path="requisitions"
//                   element={
//                     <DepartmentRequisitions allowedDepartments={["PATIENTADMIN"]} />
//                   }
//                 />
//               </Route>

//               <Route
//                 path="appointments"
//                 element={
//                   <ProtectedRoute
//                     requiredPermissions={NAV_PERMISSION_RULES.appointments}
//                   >
//                     <AppointmentLayout />
//                   </ProtectedRoute>
//                 }
//               >
//                 <Route index element={<Navigate to="schedule" replace />} />
//                 <Route path="schedule" element={<DoctorSchedule />} />
//                 <Route path="book" element={<AppointmentBooking />} />
//                 <Route path="queue" element={<ClinicQueue />} />
//               </Route>

//               <Route
//                 path="emr"
//                 element={
//                   <ProtectedRoute
//                     requiredPermissions={NAV_PERMISSION_RULES.emr}
//                   >
//                     <EMRLayout />
//                   </ProtectedRoute>
//                 }
//               >
//                 <Route index element={<Navigate to="worklist" replace />} />
//                 <Route path="worklist" element={<EMRWorklist />} />
//                 <Route path="chart" element={<EMRChart />} />
//                 <Route path="orders" element={<EMROrders />} />{" "}
//                 {/* Updated Component */}
//               </Route>

//               <Route
//                 path="billing"
//                 element={
//                   <ProtectedRoute
//                     requiredPermissions={NAV_PERMISSION_RULES.billing}
//                   >
//                     <BillingLayout />
//                   </ProtectedRoute>
//                 }
//               >
//                 <Route index element={<Navigate to="opd" replace />} />
//                 <Route path="opd" element={<OPDBilling />} />
//                 <Route path="ipd" element={<IPDBilling />} />
//                 <Route path="admissions" element={<AdmissionList />} />
//                 <Route path="history" element={<BillingHistory />} />
//                 <Route path="pricing" element={<BillingPricing />} />
//                 <Route path="advances" element={<AdvanceCollection />} />
//                 <Route path="refunds" element={<RefundManagement />} />
//                 <Route path="adjustments" element={<BillAdjustment />} />
//                 <Route path="invoices" element={<InvoiceGeneration />} />
//                 <Route path="payments" element={<CashAndInsurance />} />
//                 <Route path="receipts" element={<ReceiptHistory />} />
//                 <Route path="debtors" element={<OutstandingBalance />} />
//                 <Route
//                   path="inventory"
//                   element={<DepartmentInventory location="BILLING" />}
//                 />
//                 <Route
//                   path="stock"
//                   element={<DepartmentStockInventory location="BILLING" />}
//                 />
//                 <Route
//                   path="requisitions"
//                   element={
//                     <DepartmentRequisitions
//                       allowedDepartments={["OPD", "BILLING"]}
//                     />
//                   }
//                 />
//               </Route>

//               <Route
//                 path="hmo"
//                 element={
//                   <ProtectedRoute
//                     requiredPermissions={NAV_PERMISSION_RULES.hmo}
//                   >
//                     <HMOLayout />
//                   </ProtectedRoute>
//                 }
//               >
//                 <Route index element={<Navigate to="claims" replace />} />
//                 <Route path="providers" element={<HMOProviders />} />
//                 <Route path="tariffs" element={<HMOTariffs />} />
//                 <Route path="claims" element={<HMOClaims />} />
//                 <Route path="auth" element={<HMOAuthorization />} />
//               </Route>

//               <Route
//                 path="lab"
//                 element={
//                   <ProtectedRoute
//                     requiredPermissions={NAV_PERMISSION_RULES.lab}
//                   >
//                     <LabLayout />
//                   </ProtectedRoute>
//                 }
//               >
//                 <Route index element={<Navigate to="worklist" replace />} />
//                 <Route path="worklist" element={<LabWorklist />} />
//                 <Route path="results" element={<LabResultEntry />} />
//                 <Route
//                   path="verification"
//                   element={
//                     <ProtectedRoute requiredPermission="lab_result_verify">
//                       <LabVerification />
//                     </ProtectedRoute>
//                   }
//                 />
//                 <Route path="catalog" element={<LabCatalog />} />
//                 <Route path="reports" element={<LabReports />} />
//                 <Route
//                   path="inventory"
//                   element={<DepartmentInventory location="LAB" />}
//                 />
//                 <Route
//                   path="stock"
//                   element={<DepartmentStockInventory location="LAB" />}
//                 />
//                 <Route
//                   path="requisitions"
//                   element={
//                     <DepartmentRequisitions allowedDepartments={["LAB"]} />
//                   }
//                 />
//                 <Route path="management" element={<LabManagement />} />
//               </Route>

//               <Route
//                 path="blood-bank"
//                 element={
//                   <ProtectedRoute
//                     requiredPermissions={NAV_PERMISSION_RULES["blood-bank"]}
//                   >
//                     <BloodBankLayout />
//                   </ProtectedRoute>
//                 }
//               >
//                 <Route index element={<Navigate to="requests" replace />} />
//                 <Route path="requests" element={<BloodBankRequests />} />
//                 <Route path="issue" element={<BloodBankIssue />} />
//               </Route>

//               <Route
//                 path="radiology"
//                 element={
//                   <ProtectedRoute
//                     requiredPermissions={NAV_PERMISSION_RULES.radiology}
//                   >
//                     <RadiologyLayout />
//                   </ProtectedRoute>
//                 }
//               >
//                 <Route index element={<Navigate to="worklist" replace />} />
//                 <Route path="worklist" element={<RadiologyWorklist />} />
//                 <Route path="results" element={<RadiologyResultEntry />} />
//                 <Route path="catalog" element={<RadiologyCatalog />} />
//                 <Route path="view" element={<RadiologyViewer />} />
//                 <Route
//                   path="inventory"
//                   element={<DepartmentInventory location="RADIOLOGY" />}
//                 />
//                 <Route
//                   path="stock"
//                   element={<DepartmentStockInventory location="RADIOLOGY" />}
//                 />
//                 <Route
//                   path="requisitions"
//                   element={
//                     <DepartmentRequisitions
//                       allowedDepartments={["RADIOLOGY"]}
//                     />
//                   }
//                 />
//               </Route>

//               <Route
//                 path="pharmacy"
//                 element={
//                   <ProtectedRoute
//                     requiredPermissions={NAV_PERMISSION_RULES.pharmacy}
//                   >
//                     <PharmacyLayout />
//                   </ProtectedRoute>
//                 }
//               >
//                 <Route index element={<Navigate to="queue" replace />} />
//                 <Route path="queue" element={<PharmacyQueue />} />
//                 <Route
//                   path="inventory"
//                   element={<DepartmentInventory location="PHARMACY" />}
//                 />
//                 <Route
//                   path="stock"
//                   element={<DepartmentStockInventory location="PHARMACY" />}
//                 />
//                 <Route path="catalog" element={<DrugCatalog />} />
//                 <Route path="expiry" element={<ExpiryTracker />} />
//                 <Route
//                   path="requisitions"
//                   element={
//                     <DepartmentRequisitions allowedDepartments={["PHARMACY"]} />
//                   }
//                 />
//               </Route>

//               <Route
//                 path="theatre"
//                 element={
//                   <ProtectedRoute
//                     requiredPermissions={NAV_PERMISSION_RULES.theatre}
//                   >
//                     <TheatreLayout />
//                   </ProtectedRoute>
//                 }
//               >
//                 <Route index element={<Navigate to="schedule" replace />} />
//                 <Route path="schedule" element={<TheatreSchedule />} />
//                 <Route path="notes" element={<ProcedureNotes />} />
//                 <Route path="live" element={<LiveStatusBoard />} />
//                 <Route
//                   path="inventory"
//                   element={<DepartmentInventory location="THEATRE" />}
//                 />
//                 <Route
//                   path="stock"
//                   element={<DepartmentStockInventory location="THEATRE" />}
//                 />
//                 <Route
//                   path="requisitions"
//                   element={
//                     <DepartmentRequisitions
//                       allowedDepartments={["THEATRE", "CSSD"]}
//                     />
//                   }
//                 />
//               </Route>

//               <Route
//                 path="ward"
//                 element={
//                   <ProtectedRoute
//                     requiredPermissions={NAV_PERMISSION_RULES.ward}
//                   >
//                     <WardLayout />
//                   </ProtectedRoute>
//                 }
//               >
//                 <Route index element={<Navigate to="beds" replace />} />
//                 <Route path="beds" element={<BedManagement />} />
//                 <Route path="nursing" element={<NursingTasks />} />
//                 <Route path="admissions" element={<WardAdmissions />} />
//                 <Route
//                   path="inventory"
//                   element={<DepartmentInventory location="WARD" />}
//                 />
//                 <Route
//                   path="stock"
//                   element={<DepartmentStockInventory location="WARD" />}
//                 />
//                 <Route
//                   path="requisitions"
//                   element={
//                     <DepartmentRequisitions
//                       allowedDepartments={["WARD", "ICU", "HDU"]}
//                     />
//                   }
//                 />
//               </Route>

//               <Route
//                 path="nursing"
//                 element={
//                   <ProtectedRoute
//                     requiredPermissions={NAV_PERMISSION_RULES.nursing}
//                   >
//                     <NursingLayout />
//                   </ProtectedRoute>
//                 }
//               >
//                 <Route index element={<Navigate to="admissions" replace />} />
//                 <Route path="admissions" element={<LabourAdmissions />} />
//                 <Route path="partogram/:sessionId" element={<LabourPartogram />} />
//                 <Route
//                   path="inventory"
//                   element={<DepartmentInventory location="OPD" />}
//                 />
//                 <Route
//                   path="stock"
//                   element={<DepartmentStockInventory location="OPD" />}
//                 />
//                 <Route
//                   path="requisitions"
//                   element={
//                     <DepartmentRequisitions
//                       allowedDepartments={["OPD", "DIALYSIS"]}
//                     />
//                   }
//                 />
//               </Route>

//               <Route
//                 path="emergency"
//                 element={
//                   <ProtectedRoute
//                     requiredPermissions={NAV_PERMISSION_RULES.emergency}
//                   >
//                     <EmergencyLayout />
//                   </ProtectedRoute>
//                 }
//               >
//                 <Route index element={<Navigate to="floor" replace />} />
//                 <Route path="floor" element={<EmergencyFloor />} />
//                 <Route path="triage" element={<EDTriageBoard />} />
//                 <Route path="encounter" element={<EmergencyEncounter />} />
//                 <Route
//                   path="inventory"
//                   element={<DepartmentInventory location="ERD" />}
//                 />
//                 <Route
//                   path="stock"
//                   element={<DepartmentStockInventory location="ERD" />}
//                 />
//                 <Route
//                   path="requisitions"
//                   element={
//                     <DepartmentRequisitions allowedDepartments={["ERD"]} />
//                   }
//                 />
//               </Route>




//               <Route
//                 path="inventory"
//                 element={
//                   <ProtectedRoute
//                     requiredPermissions={NAV_PERMISSION_RULES.inventory}
//                   >
//                     <InventoryLayout />
//                   </ProtectedRoute>
//                 }
//               >

                
//                 {/* 1. Default redirect points to 'master' now */}
//                 <Route index element={<Navigate to="master" replace />} />
                
//                 {/* 2. Stock Master (creating/editing items in the catalog) */}
//                 <Route path="master" element={<InventoryStockMaster />} />
                
//                 {/* 3. Goods Received Note */}
//                 <Route path="grn" element={<InventoryGRN />} />
                
//                 {/* 4. Stock Movement (Tracking IN/OUT logs) */}
//                 {/* <Route path="movement" element={<StockMovement />} /> Adjust component name to your actual movement tracker */}


//                 <Route
//                   path="movement"
//                   element={<DepartmentInventory isGlobal={true} />}
//                 />
                
//                 {/* 5. 🔥 THE NEW GLOBAL INVENTORY COMPONENT 🔥 */}
//                 <Route 
//                   path="stock" 
//                   element={<DepartmentStockInventory isGlobal={true} />} 
//                 />
                
//                 {/* 6. Other Modules */}
//                 <Route path="requests" element={<InventoryRequisitions />} />
                
//                 <Route path="purchase-orders" element={<PurchaseOrderManagement />} />
//                 <Route path="suppliers" element={<InventorySuppliers />} />
//               </Route>

              

//               {/* <Route
//                 path="inventory"
//                 element={
//                   <ProtectedRoute
//                     requiredPermissions={NAV_PERMISSION_RULES.inventory}
//                   >
//                     <InventoryLayout />
//                   </ProtectedRoute>
//                 }
//               >
//                 <Route index element={<Navigate to="stock" replace />} />
//                 <Route path="stock" element={<InventoryStockMaster />} />
//                 <Route path="grn" element={<InventoryGRN />} />
//                 <Route
//                   path="movement"
//                   element={<DepartmentInventory isGlobal={true} />}
//                 />
//                 <Route path="requests" element={<InventoryRequisitions />} />
//                 <Route path="suppliers" element={<InventorySuppliers />} />
//               </Route> */}

//               <Route
//                 path="assets"
//                 element={
//                   <ProtectedRoute
//                     requiredPermissions={NAV_PERMISSION_RULES.assets}
//                   >
//                     <AssetsLayout />
//                   </ProtectedRoute>
//                 }
//               >
//                 <Route index element={<Navigate to="dashboard" replace />} />
//                 <Route path="dashboard" element={<AssetDashboard />} />
//                 <Route path="master" element={<AssetMaster />} />
//               </Route>

//               <Route
//                 path="reports"
//                 element={
//                   <ProtectedRoute
//                     requiredPermissions={NAV_PERMISSION_RULES.reporting}
//                   >
//                     <ReportingLayout />
//                   </ProtectedRoute>
//                 }
//               >
//                 <Route index element={<Navigate to="overview" replace />} />
//                 <Route path="overview" element={<HospitalOverview />} />
//                 <Route path="revenue" element={<RevenueReports />} />
//                 <Route path="patients" element={<PatientAnalytics />} />
//                 <Route path="usage" element={<DepartmentUsage />} />
//                 <Route path="builder" element={<ReportBuilder />} />
//               </Route>

//                 <Route
//                 path="all-reports"
//                 element={
//                   <ProtectedRoute
//                     requiredPermissions={NAV_PERMISSION_RULES["all-reports"]}
//                   >
//                     <AllReportsLayout />
//                   </ProtectedRoute>
//                 }
//               >
//                 <Route index element={<ReportsLanding />} />
//                 <Route path="patient" element={<PatientAdminReport />} />
//                 <Route path="patient/overview" element={<PasOverviewReport />} />
//                 <Route path="patient/master" element={<PasMasterPatientReport />} />
//                 <Route path="patient/payer-market-share" element={<PasPayerMarketShareReport />} />
//                 <Route path="patient/age-demographics" element={<PasAgeDemographicsReport />} />
//                 <Route path="patient/staff-productivity" element={<PasStaffProductivityReport />} />
//                 <Route path="patient/geographic-distribution" element={<PasGeographicDistributionReport />} />
//                 <Route path="patient/encounter-frequency" element={<PasEncounterFrequencyReport />} />
//                 <Route path="patient/emergency-contacts" element={<PasEmergencyContactsReport />} />
//                 <Route path="patient/deceased-inactive" element={<PasDeceasedInactiveReport />} />
//                 <Route path="appointment" element={<AppointmentReport />} />
//                 <Route path="inventory" element={<InventoryReport />} />
//                 <Route path="inventory/movement" element={<InventoryMovementReport />} />
//                 <Route path="inventory/stock" element={<InventoryStockReport />} />
//                 <Route path="inventory/valuation" element={<InventoryValuationReport />} />
//                 <Route path="inventory/summary" element={<InventorySummaryReport />} />
//                 <Route path="inventory/classification" element={<InventoryClassificationReport />} />
//                 <Route path="inventory/top-consumed" element={<InventoryTopConsumedItemsReport />} />
//                 <Route path="inventory/approved-consumption" element={<InventoryApprovedConsumptionReport />} />
//                 <Route path="inventory/vendor-supply" element={<InventoryVendorSupplyReport />} />
//                 <Route path="ot/dashboard" element={<OtDashboardReport />} />
//                 <Route path="ot/cancellations" element={<OtCancellationsReport />} />
//                 <Route path="ot/safety" element={<OtSafetyReport />} />
//                 <Route path="ot/tat" element={<OtTatReport />} />
//                 <Route path="ot/ledger" element={<OtLedgerReport />} />
//                 <Route path="operational/outpatient" element={<OutpatientReport />} />
//                 <Route path="operational/inpatient" element={<InpatientReport />} />
//                 <Route path="operational/emergency" element={<EmergencyReport />} />
//                 <Route path="operational/anc" element={<AncReport />} />
//                 <Route path="financial/billing" element={<BillingReport />} />
//                 <Route path="financial/deposit-utilization" element={<DepositUtilizationReport />} />
//                 <Route path="financial/cash-collection" element={<CashCollectionReport />} />
//                 <Route path="financial/advance-collection" element={<AdvanceCollectionReport />} />
//                 <Route path="financial/unbilled-orders" element={<UnbilledOrdersReport />} />
//                 <Route path="financial/departmental-revenue" element={<DepartmentalRevenueReport />} />
//                 <Route path="financial/discount" element={<DiscountReport />} />
//                 <Route path="financial/physician-productivity" element={<PhysicianProductivityReport />} />
//                 <Route path="financial/cancellation-audit" element={<CancellationAuditReport />} />
//                 <Route path="laboratory" element={<LabDashboardReport />} />
//                 <Route path="laboratory/detailed" element={<LabDetailedReport />} />
//                 <Route path="laboratory/tat" element={<LabTatReport />} />
//                 <Route path="laboratory/abnormal-findings" element={<LabAbnormalFindingsReport />} />
//                 <Route path="laboratory/referrals" element={<LabReferralReport />} />
//                 <Route path="laboratory/productivity" element={<LabProductivityReport />} />
//                 <Route path="pharmacy" element={<PharmacyDashboardReport />} />
//                 <Route path="pharmacy/tat" element={<PharmacyTatReport />} />
//                 <Route path="pharmacy/cancellations" element={<PharmacyCancellationsReport />} />
//                 <Route path="pharmacy/productivity" element={<PharmacyProductivityReport />} />
//                 <Route path="pharmacy/transactions" element={<PharmacyTransactionBookReport />} />
//                 <Route path="radiology" element={<RadiologyDashboardReport />} />
//                 <Route path="radiology/productivity" element={<RadiologyProductivityReport />} />
//                 <Route path="radiology/cancellations" element={<RadiologyCancellationReport />} />
//                 <Route path="radiology/referrals" element={<RadiologyReferralReport />} />
//                 <Route path="appointment/dashboard" element={<AppointmentDashboardReport />} />
//                 <Route path="appointment/ledger" element={<AppointmentLedgerReport />} />
//                 <Route path="appointment/cancellations" element={<AppointmentCancellationsReport />} />
//                 <Route path="appointment/staff-productivity" element={<AppointmentStaffProductivityReport />} />
//                 <Route path="ipd/bed-utilization" element={<IpdBedUtilizationReport />} />
//                 <Route path="ipd/discharge-tat" element={<IpdDischargeTatReport />} />
//                 <Route path="ipd/transfusion-metrics" element={<IpdTransfusionMetricsReport />} />
//                 <Route path="ipd/medication-audit" element={<IpdMedicationAuditReport />} />
//                 <Route path="ipd/revenue" element={<IpdRevenueReport />} />
//                 <Route path="opd/funnel" element={<OpdFunnelReport />} />
//                 <Route path="opd/revenue-yield" element={<OpdRevenueYieldReport />} />
//                 <Route path="opd/payer-mix" element={<OpdPayerMixReport />} />
//               </Route>

//               <Route
//                 path="management"
//                 element={
//                   <ProtectedRoute
//                     requiredPermissions={NAV_PERMISSION_RULES.management}
//                   >
//                     <ManagementLayout />
//                   </ProtectedRoute>
//                 }
//               >
//                 <Route index element={<Navigate to="discounts" replace />} />
//                 <Route path="discounts" element={<DiscountManager />} />
//                 <Route path="refunds" element={<RefundReviewManagement />} />
//               </Route>

// {/* ==================== FINANCE MODULE ==================== */}
// <Route
//   path="finance"
//   element={
//     <ProtectedRoute requiredPermissions={NAV_PERMISSION_RULES.finance}>
//       <Outlet />
//     </ProtectedRoute>
//   }
// >
//   <Route index element={<Navigate to="chart-of-accounts" replace />} />
//   <Route path="chart-of-accounts" element={<div className="p-6 font-semibold text-slate-800">Chart of Accounts View</div>} />
//   <Route path="accounts-payable" element={<div className="p-6 font-semibold text-slate-800">Accounts Payable</div>} />
//   <Route path="accounts-receivable" element={<div className="p-6 font-semibold text-slate-800">Accounts Receivable</div>} />
//   <Route path="reconciliation" element={<div className="p-6 font-semibold text-slate-800">Bank Reconciliation</div>} />
//   <Route path="petty-cash" element={<div className="p-6 font-semibold text-slate-800">Petty Cash Management</div>} />
//   <Route path="statements" element={<div className="p-6 font-semibold text-slate-800">Financial Reports & Statements</div>} />
// </Route>

// {/* ==================== HR MODULE ==================== */}
// <Route
//   path="hr"
//   element={
//     <ProtectedRoute requiredPermissions={NAV_PERMISSION_RULES.hr}>
//       <Outlet />
//     </ProtectedRoute>
//   }
// >
//   <Route index element={<Navigate to="directory" replace />} />
//   <Route path="directory" element={<div className="p-6 font-semibold text-slate-800">HR Staff Directory</div>} />
//   <Route path="roster" element={<div className="p-6 font-semibold text-slate-800">Duty Rostering</div>} />
//   <Route path="attendance" element={<div className="p-6 font-semibold text-slate-800">Staff Attendance Logs</div>} />
//   <Route path="leaves" element={<div className="p-6 font-semibold text-slate-800">Leave Applications</div>} />
//   <Route path="payroll" element={<div className="p-6 font-semibold text-slate-800">Payroll Processing</div>} />
// </Route>

// {/* ==================== MARKETING MODULE ==================== */}
// <Route
//   path="marketing"
//   element={
//     <ProtectedRoute requiredPermissions={NAV_PERMISSION_RULES.marketing}>
//       <Outlet />
//     </ProtectedRoute>
//   }
// >
//   <Route index element={<Navigate to="corporate-clients" replace />} />
//   <Route path="corporate-clients" element={<div className="p-6 font-semibold text-slate-800">Corporate Retainer Clients</div>} />
//   <Route path="partners" element={<div className="p-6 font-semibold text-slate-800">Referral Partners</div>} />
//   <Route path="leads" element={<div className="p-6 font-semibold text-slate-800">Inbound Patient Leads</div>} />
//   <Route path="packages" element={<div className="p-6 font-semibold text-slate-800">Health Packages</div>} />
//   <Route path="campaigns" element={<div className="p-6 font-semibold text-slate-800">Outreach Campaigns</div>} />
//   <Route path="feedback" element={<div className="p-6 font-semibold text-slate-800">Patient Feedback & NPS</div>} />
// </Route>
//               <Route
//                 path="admin/users"
//                 element={
//                   <ProtectedRoute
//                     requiredPermissions={NAV_PERMISSION_RULES.users}
//                   >
//                     <UserManagementLayout />
//                   </ProtectedRoute>
//                 }
//               >
//                 <Route index element={<Navigate to="directory" replace />} />
//                 <Route
//                   path="directory"
//                   element={
//                     <ProtectedRoute
//                       requiredPermissions={NAV_PERMISSION_RULES["user-dir"]}
//                     >
//                       <StaffDirectory />
//                     </ProtectedRoute>
//                   }
//                 />
//                 <Route
//                   path="access"
//                   element={
//                     <ProtectedRoute
//                       requiredPermissions={NAV_PERMISSION_RULES["user-access"]}
//                     >
//                       <AccessControl />
//                     </ProtectedRoute>
//                   }
//                 />
//                 <Route
//                   path="audit"
//                   element={
//                     <ProtectedRoute
//                       requiredPermissions={NAV_PERMISSION_RULES["user-audit"]}
//                     >
//                       <SecurityAudit />
//                     </ProtectedRoute>
//                   }
//                 />
//               </Route>

//               <Route
//                 path="settings"
//                 element={
//                   <ProtectedRoute
//                     requiredPermissions={NAV_PERMISSION_RULES.settings}
//                   >
//                     <SettingsLayout />
//                   </ProtectedRoute>
//                 }
//               >
//                 <Route index element={<Navigate to="facility" replace />} />
//                 <Route path="facility" element={<FacilitySetup />} />
//                 <Route path="departments" element={<DepartmentSetup />} />
//                 <Route path="pricing" element={<PricingMaster />} />
//                 <Route path="finance" element={<FinancialSettings />} />
//                 <Route path="hardware" element={<SettingsHardware />} />
//               </Route>

//               <Route path="*" element={<Navigate to="/" replace />} />
//             </Route>

//             <Route path="*" element={<Navigate to="/login" replace />} />
//           </Routes>
//         </BrowserRouter>
//       </AuthProvider>
//     </NotificationProvider>
//   );
// };

// export default App;
