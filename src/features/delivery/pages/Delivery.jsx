import React, { useEffect, useMemo, useState, useCallback } from "react";
import Sidebar from "../../../layouts/Sidebar";
import PageHeader from "../../../components/common/PageHeader";
import WorkflowRulesBar from "../../../components/common/WorkflowRulesBar";
import EmptyState from "../../../components/common/EmptyState";
import SegmentedTabs from "../../../components/common/SegmentedTabs";
import ChangeRequestsPanel from "../components/ChangeRequestsPanel";
import {
  Calendar,
  RefreshCw,
  Search,
  Bike,
  Clock,
  Eye,
  CheckCircle2,
  XCircle,
  X,
  User,
  Phone,
  FileText,
  ShieldCheck,
  AlertCircle,
  MapPin,
  Landmark,
  Check,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  FileCheck,
  AlertTriangle,
  Radio,
  Download,
  History as HistoryIcon,
  RotateCcw,
  Pencil,
  GitPullRequest,
} from "lucide-react";

import {
  getDeliveryPartners,
  getPendingDeliveryKyc,
  getDeliveryKycDetails,
  approveDeliveryKyc,
  rejectDeliveryKyc,
  exportDeliveryPdf,
} from "../services/deliveryPartnerKycService";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const APPLICATION_STATES = {
  DRAFT: {
    label: "Draft",
    badge: "bg-slate-100 text-slate-600 border border-slate-200",
    Icon: Pencil,
    iconClass: "text-slate-500",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
    Icon: Clock,
    iconClass: "text-amber-600",
  },
  APPROVED: {
    label: "Approved",
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    Icon: CheckCircle2,
    iconClass: "text-emerald-600",
  },
  REJECTED: {
    label: "Rejected",
    badge: "bg-rose-50 text-rose-700 border border-rose-200",
    Icon: XCircle,
    iconClass: "text-rose-600",
  },
};

const getStateMeta = (state) =>
  APPLICATION_STATES[state] || APPLICATION_STATES.DRAFT;

// Sections the admin can flag when rejecting (sent as `sections`)
const REJECT_SECTIONS = [
  { id: "BASIC_INFO", label: "Basic info" },
  { id: "LICENSE", label: "License" },
  { id: "VEHICLE", label: "Vehicle" },
  { id: "BANK", label: "Bank" },
];

const sectionLabel = (id) =>
  REJECT_SECTIONS.find((sec) => sec.id === id)?.label || id;

const REJECT_REASON_MAX = 500;

const HISTORY_META = {
  SUBMITTED: { label: "Submitted", dot: "bg-amber-500" },
  WITHDRAWN: { label: "Withdrawn by rider", dot: "bg-slate-400" },
  APPROVED: { label: "Approved", dot: "bg-emerald-500" },
  REJECTED: { label: "Rejected", dot: "bg-rose-500" },
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Only the UNDER_REVIEW state can be approved or rejected
const isUnderReview = (partner) => partner?.applicationState === "UNDER_REVIEW";
const isKycApproved = (partner) => partner?.applicationState === "APPROVED";

const deriveApplicationState = (item, kyc) => {
  const explicit = String(item?.applicationState || "").toUpperCase();
  if (APPLICATION_STATES[explicit]) return explicit;
  if (kyc === "APPROVED") return "APPROVED";
  if (kyc === "REJECTED") return "REJECTED";
  return item?.submittedAt || item?.submitted ? "UNDER_REVIEW" : "DRAFT";
};

const normalizeDeliveryPartner = (item) => {
  const kyc = String(
    item?.kycStatus || item?.status || "PENDING"
  ).toUpperCase();
  const applicationState = deriveApplicationState(item, kyc);
  const submissionCount = Number(item?.submissionCount) || 0;
  const rejectionCount = Number(item?.rejectionCount) || 0;

  return {
    ...item,
    userId:
      item?.userId ||
      item?.deliveryPartnerUserId ||
      item?.deliveryUserId ||
      item?.id ||
      "",
    fullName: item?.fullName || item?.name || "-",
    phone: item?.phone || "-",
    vehicleType: item?.vehicleType || "-",
    vehicleModel: item?.vehicleModel || "-",
    plateNumber: item?.plateNumber || "-",
    licenseNumber: item?.licenseNumber || "-",
    cityOfOperation: item?.cityOfOperation || item?.city || "-",
    isOnline: Boolean(
      item?.isOnline === true ||
      item?.isOnline === "true" ||
      item?.online === true ||
      item?.online === "true"
    ),
    kycStatus: kyc,
    applicationState,
    submissionCount,
    rejectionCount,
    resubmission: Boolean(item?.resubmission) || rejectionCount > 0,
    rejectedSections: Array.isArray(item?.rejectedSections)
      ? item.rejectedSections
      : [],
    history: Array.isArray(item?.history) ? item.history : [],
    manufactureYear: item?.manufactureYear || null,
    emergencyContact: item?.emergencyContact || {},
    bank: item?.bank || null,
    onboardingStep: item?.onboardingStep ?? item?.verificationStep ?? null,
    basicInfoCompleted: Boolean(item?.basicInfoCompleted),
    // Real submission time only (drafts have none)
    submittedAt: item?.submittedAt || null,
    registeredAt: item?.registeredAt || item?.createdAt || null,
    lastUpdatedAt: item?.lastUpdatedAt || item?.updatedAt || null,
    date: item?.submittedAt
      ? formatDate(item.submittedAt)
      : formatDate(item?.registeredAt || item?.createdAt),
    documents: Array.isArray(item?.documents) ? item.documents : [],
    allDocumentsUploaded: Boolean(item?.allDocumentsUploaded),
    missingDocuments: Array.isArray(item?.missingDocuments)
      ? item.missingDocuments
      : [],
    // Status badge text comes from applicationState (not kycStatus)
    status: getStateMeta(applicationState).label,
  };
};

// Reusable status badge driven by applicationState
const StateBadge = ({ state, size = 11, className = "" }) => {
  const meta = getStateMeta(state);
  const { Icon } = meta;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${meta.badge} ${className}`}
    >
      <Icon size={size} className={meta.iconClass} />
      {meta.label}
    </span>
  );
};

const ResubmissionBadge = ({ count }) => (
  <span
    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200"
    title="This rider was rejected before and has submitted again"
  >
    <RotateCcw size={10} />
    Resubmission{count > 0 ? ` · Rejected ${count}×` : ""}
  </span>
);

// Filters shown on the "All Delivery" tab -> applicationState param
const STATE_FILTERS = [
  { id: "APPROVED", label: "Approved", Icon: CheckCircle2, iconClass: "text-emerald-600" },
  { id: "UNDER_REVIEW", label: "Under Review", Icon: Clock, iconClass: "text-amber-600" },
  { id: "REJECTED", label: "Rejected", Icon: XCircle, iconClass: "text-rose-600" },
  { id: "DRAFT", label: "Drafts", Icon: Pencil, iconClass: "text-slate-500" },
];

const deliveryTabs = [
  { id: "all", label: "All Delivery", icon: Bike },
  { id: "pending", label: "Review Queue", icon: Clock },
  { id: "changes", label: "Change Requests", icon: GitPullRequest },
];

export default function Delivery({ embedded = false }) {
  const [activeTab, setActiveTab] = useState("all"); // "all" | "pending" | "changes"
  const [stateFilter, setStateFilter] = useState(""); // "" | APPROVED | UNDER_REVIEW | REJECTED | DRAFT
  const [onlineFilter, setOnlineFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [counts, setCounts] = useState({
    total: 0,
    APPROVED: 0,
    UNDER_REVIEW: 0,
    REJECTED: 0,
    DRAFT: 0,
    online: 0,
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 20;

  // Detail Modal State
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Action States
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectSections, setRejectSections] = useState([]);
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const fetchDeliveryPartners = useCallback(
    async (
      tab = activeTab,
      stateSel = stateFilter,
      online = onlineFilter,
      page = 0,
      search = searchQuery
    ) => {
      try {
        setLoading(true);
        setError("");

        const params = {};

        if (tab === "pending") {
          params.applicationState = "UNDER_REVIEW";
        } else if (stateSel) {
          params.applicationState = stateSel;
        }

        if (tab === "all" && online) {
          params.isOnline = true;
        }

        params.page = page;
        params.size = pageSize;

        if (search && search.trim()) {
          params.search = search.trim();
        }

        let response;
        if (tab === "pending") {
          // Review queue: only submitted applications, oldest first
          try {
            response = await getPendingDeliveryKyc(page, pageSize);
          } catch (queueErr) {
            response = await getDeliveryPartners(params);
          }
        } else {
          response = await getDeliveryPartners(params);
        }

        const rawContent =
          response?.data?.content ||
          response?.data?.items ||
          response?.content ||
          (Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response)
              ? response
              : []);

        const normalized = rawContent.map(normalizeDeliveryPartner);

        setApplications(normalized);
        setTotalPages(response?.data?.totalPages || response?.totalPages || 1);
        const total =
          response?.data?.totalElements ??
          response?.totalElements ??
          normalized.length;
        setTotalElements(total);
        setCurrentPage(page);

        // Update counts intelligently
        setCounts((prev) => {
          if (tab === "all" && !stateSel && !online) {
            const byState = (st) =>
              normalized.filter((a) => a.applicationState === st).length;
            return {
              total,
              APPROVED: byState("APPROVED"),
              UNDER_REVIEW: byState("UNDER_REVIEW"),
              REJECTED: byState("REJECTED"),
              DRAFT: byState("DRAFT"),
              online: normalized.filter((a) => a.isOnline).length,
            };
          }

          const updated = { ...prev };
          if (tab === "pending") updated.UNDER_REVIEW = total;
          if (tab === "all" && stateSel && !online) updated[stateSel] = total;
          if (tab === "all" && online && !stateSel) updated.online = total;
          return updated;
        });
      } catch (err) {
        console.error("Delivery List Error:", err);
        setError(
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Unable to load delivery fleet records."
        );
        setApplications([]);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeTab, stateFilter, onlineFilter]
  );

  useEffect(() => {
    fetchDeliveryPartners("all", "", false, 0, searchQuery);
  }, []);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setCurrentPage(0);
    setStateFilter("");
    setOnlineFilter(false);
    // "Change Requests" tab loads its own data inside ChangeRequestsPanel
    if (newTab === "changes") return;
    fetchDeliveryPartners(newTab, "", false, 0, searchQuery);
  };

  const handleSelectAllInAllTab = () => {
    setStateFilter("");
    setOnlineFilter(false);
    setCurrentPage(0);
    fetchDeliveryPartners("all", "", false, 0, searchQuery);
  };

  const handleSelectState = (stateId) => {
    const nextState = stateFilter === stateId ? "" : stateId;
    setStateFilter(nextState);
    setCurrentPage(0);
    fetchDeliveryPartners("all", nextState, onlineFilter, 0, searchQuery);
  };

  const handleToggleOnline = () => {
    const nextOnline = !onlineFilter;
    setOnlineFilter(nextOnline);
    setCurrentPage(0);
    fetchDeliveryPartners("all", stateFilter, nextOnline, 0, searchQuery);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 0 || newPage >= totalPages || loading) return;
    setCurrentPage(newPage);
    fetchDeliveryPartners(activeTab, stateFilter, onlineFilter, newPage, searchQuery);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDeliveryPartners(activeTab, stateFilter, onlineFilter, currentPage, searchQuery);
  };

  const handleExportCsv = async () => {
    try {
      setIsExportingCsv(true);

      const params = {
        page: 0,
        size: 500,
      };

      if (activeTab === "pending") {
        params.applicationState = "UNDER_REVIEW";
      } else {
        if (stateFilter) {
          params.applicationState = stateFilter;
        }
        if (onlineFilter) {
          params.isOnline = true;
        }
      }

      if (searchQuery && searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      let exportList = applications;
      try {
        const response = await getDeliveryPartners(params);
        const rawContent =
          response?.data?.content ||
          response?.data?.items ||
          response?.content ||
          (Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response)
              ? response
              : []);
        if (rawContent.length > 0) {
          exportList = rawContent.map(normalizeDeliveryPartner);
        }
      } catch (fetchErr) {
        console.warn("Falling back to current delivery page records:", fetchErr);
      }

      if (!exportList || exportList.length === 0) {
        alert("No delivery partner records found to export.");
        return;
      }

      const headers = [
        "User ID",
        "Rider Name",
        "Phone",
        "Vehicle Type",
        "Vehicle Model",
        "Plate Number",
        "License Number",
        "Operating City",
        "Application State",
        "Submissions",
        "Rejections",
        "Presence Status",
        "Bank Name",
        "Account Number",
        "IFSC Code",
        "Documents Uploaded",
        "Submitted / Registered Date",
      ];

      const escapeCell = (val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const rows = exportList.map((r) => [
        escapeCell(r.userId || ""),
        escapeCell(r.fullName || ""),
        escapeCell(r.phone || ""),
        escapeCell(r.vehicleType || ""),
        escapeCell(r.vehicleModel || ""),
        escapeCell(r.plateNumber || ""),
        escapeCell(r.licenseNumber || ""),
        escapeCell(r.cityOfOperation || ""),
        escapeCell(r.status || ""),
        escapeCell(r.submissionCount ?? 0),
        escapeCell(r.rejectionCount ?? 0),
        escapeCell(r.isOnline ? "Online" : "Offline"),
        escapeCell(r.bank?.bankName || ""),
        escapeCell(r.bank?.accountNumber ? `••••${r.bank.accountNumber.slice(-4)}` : ""),
        escapeCell(r.bank?.ifscCode || ""),
        escapeCell(r.documents?.filter((d) => d.uploaded)?.length || 0),
        escapeCell(r.date || r.submittedAt || r.registeredAt || ""),
      ]);

      const csvString = [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");

      // UTF-8 BOM ensures proper Unicode handling in Microsoft Excel
      const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      link.href = url;
      link.setAttribute("download", `veggo-delivery-partners-${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export Delivery CSV Error:", err);
      alert("Failed to export delivery partners CSV. Please try again.");
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      const params = { limit: 500 };
      if (activeTab === "pending") {
        params.applicationState = "UNDER_REVIEW";
      } else {
        if (stateFilter) {
          params.applicationState = stateFilter;
        }
        if (onlineFilter) {
          params.isOnline = true;
        }
      }
      const blobData = await exportDeliveryPdf(params);
      const blob = new Blob([blobData], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      link.href = url;
      link.setAttribute("download", `veggo-delivery-partners-${dateStr}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export Delivery PDF Error:", err);
      alert(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to download delivery partner PDF ."
      );
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleViewPartner = async (partner) => {
    const userId = partner?.userId;
    if (!userId) {
      setActionError("Delivery partner User ID is missing.");
      return;
    }

    try {
      setDetailLoading(true);
      setActionError("");
      setShowDetail(true);
      setSelectedPartner(partner);
      setShowRejectBox(false);
      setRejectReason("");
      setRejectSections([]);

      const response = await getDeliveryKycDetails(userId);
      const detail = response?.data || response || {};

      setSelectedPartner(
        normalizeDeliveryPartner({
          ...partner,
          ...detail,
        })
      );
    } catch (err) {
      console.error("Delivery KYC Detail Error:", err);
      setSelectedPartner(partner);
      setActionError(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Unable to load full delivery partner KYC details."
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleRejectSection = (sectionId) => {
    setRejectSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  // Reload the open rider's detail (used after a 409 so the buttons match reality)
  const refreshSelectedPartner = async (userId) => {
    try {
      const response = await getDeliveryKycDetails(userId);
      const detail = response?.data || response || {};
      setSelectedPartner((prev) =>
        normalizeDeliveryPartner({ ...(prev || {}), ...detail })
      );
      setShowRejectBox(false);
    } catch (refreshErr) {
      console.error("Delivery KYC Refresh Error:", refreshErr);
    }
  };

  const handleApprove = async () => {
    const userId = selectedPartner?.userId;
    if (!userId) {
      setActionError("Delivery Partner User ID is missing.");
      return;
    }

    try {
      setActionLoading(true);
      setActionError("");
      await approveDeliveryKyc(userId);
      setShowDetail(false);
      setSelectedPartner(null);
      await fetchDeliveryPartners(activeTab, stateFilter, onlineFilter, currentPage, searchQuery);
    } catch (err) {
      console.error("Delivery KYC Approve Error:", err);
      if (err?.response?.status === 409) {
        // Application is no longer under review - reload the real state
        await refreshSelectedPartner(userId);
      }
      setActionError(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Unable to approve delivery partner."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const userId = selectedPartner?.userId;
    if (!userId) {
      setActionError("Delivery Partner User ID is missing.");
      return;
    }

    const reason = rejectReason.trim();
    if (!reason) {
      setActionError("Please enter a reason. It is shown to the rider.");
      return;
    }
    if (reason.length > REJECT_REASON_MAX) {
      setActionError(`Reason must be at most ${REJECT_REASON_MAX} characters.`);
      return;
    }

    try {
      setActionLoading(true);
      setActionError("");
      await rejectDeliveryKyc(userId, reason, rejectSections);
      setShowDetail(false);
      setSelectedPartner(null);
      setRejectReason("");
      setRejectSections([]);
      setShowRejectBox(false);
      await fetchDeliveryPartners(activeTab, stateFilter, onlineFilter, currentPage, searchQuery);
    } catch (err) {
      console.error("Delivery KYC Reject Error:", err);
      if (err?.response?.status === 409) {
        await refreshSelectedPartner(userId);
      }
      setActionError(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Unable to reject delivery partner application."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const filteredApplications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return applications;

    return applications.filter(
      (app) =>
        String(app.fullName || "").toLowerCase().includes(query) ||
        String(app.phone || "").toLowerCase().includes(query) ||
        String(app.cityOfOperation || "").toLowerCase().includes(query) ||
        String(app.vehicleType || "").toLowerCase().includes(query) ||
        String(app.vehicleModel || "").toLowerCase().includes(query) ||
        String(app.plateNumber || "").toLowerCase().includes(query) ||
        String(app.licenseNumber || "").toLowerCase().includes(query)
    );
  }, [applications, searchQuery]);

  const partnerDocuments = useMemo(() => {
    if (!selectedPartner) return [];
    const list = Array.isArray(selectedPartner.documents) ? selectedPartner.documents : [];
    return list.filter((doc) => {
      const rawUrl = doc?.fileUrl || doc?.documentUrl || doc?.url || "";
      const cleaned = rawUrl.replace(/^\[?([^\]]+)\]?\(?([^)]*)\)?$/, "$1").replace(/[\[\]]/g, "").trim();
      return Boolean(doc.uploaded && cleaned);
    });
  }, [selectedPartner]);

  return (
    <div className={embedded ? "w-full space-y-5 sm:space-y-6" : "min-h-dvh bg-[#f6f9f7] flex flex-col lg:flex-row font-sans antialiased text-slate-800 selection:bg-emerald-100 selection:text-emerald-900"}>
      {!embedded && <Sidebar />}

      <div className={embedded ? "w-full space-y-5 sm:space-y-6" : "flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pt-20 sm:pt-22 lg:pt-22 overflow-y-auto max-h-dvh w-full space-y-5 sm:space-y-6"}>
        {/* Top Header */}
        <PageHeader
          icon={Bike}
          title={
            activeTab === "pending"
              ? "Delivery KYC Review Queue"
              : activeTab === "changes"
                ? "Verified Details Change Requests"
                : "All Delivery Directory"
          }
          subtitle="Directory and application review for delivery partners on VegGo."
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing || loading}
          actions={
            activeTab === "changes" ? null : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={isExportingCsv}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs sm:text-sm font-bold shadow-xs cursor-pointer disabled:opacity-60"
                  title="Export delivery partners to Excel / CSV (Limit: 500)"
                >
                  <Download
                    size={15}
                    className={isExportingCsv ? "text-emerald-200" : ""}
                  />
                  <span>{isExportingCsv ? "Exporting..." : "Export CSV"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={isExportingPdf}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 active:scale-98 border border-slate-200 text-slate-700 text-xs sm:text-sm font-bold shadow-2xs cursor-pointer disabled:opacity-60"
                  title="Download Delivery Partner PDF  (Limit: 500)"
                >
                  <FileText
                    size={15}
                    className={isExportingPdf ? "animate-spin text-emerald-600" : "text-slate-600"}
                  />
                  <span>{isExportingPdf ? "Downloading..." : "Download PDF"}</span>
                </button>
              </div>
            )
          }
        />

        {/* Global Error Banner */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-xs sm:text-sm font-semibold text-rose-800 shadow-2xs">
            <AlertCircle size={18} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Segmented View Tabs Navigation (All Delivery / Review Queue) */}
        <div className="bg-white p-2 rounded-2xl border border-emerald-100/80 shadow-2xs">
          <SegmentedTabs
            tabs={deliveryTabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </div>

        {/* Sub-Filters: ONLY visible when "All Delivery" is selected */}
        {activeTab === "all" && (
          <div className="flex flex-wrap items-center gap-2.5 py-1">
            {/* 1. All */}
            <button
              type="button"
              onClick={handleSelectAllInAllTab}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${!stateFilter && !onlineFilter
                ? "bg-emerald-700 text-white shadow-xs"
                : "bg-white hover:bg-emerald-50 text-slate-700 border border-emerald-100/90 shadow-2xs"
                }`}
            >
              <Bike
                size={14}
                className={!stateFilter && !onlineFilter ? "text-emerald-100" : "text-emerald-700"}
              />
              <span>All</span>
              {counts.total > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${!stateFilter && !onlineFilter
                    ? "bg-emerald-800 text-emerald-100"
                    : "bg-slate-100 text-slate-700"
                    }`}
                >
                  {counts.total}
                </span>
              )}
            </button>

            {/* 2. Application state filters (Approved / Under Review / Rejected / Drafts) */}
            {STATE_FILTERS.map(({ id, label, Icon, iconClass }) => {
              const active = stateFilter === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleSelectState(id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${active
                    ? "bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-500/30"
                    : "bg-white hover:bg-emerald-50 text-slate-700 border border-emerald-100/90 shadow-2xs"
                    }`}
                >
                  <Icon size={14} className={active ? "text-emerald-200" : iconClass} />
                  <span>{label}</span>
                  {counts[id] > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${active
                        ? "bg-emerald-800 text-emerald-100"
                        : "bg-slate-100 text-slate-700"
                        }`}
                    >
                      {counts[id]}
                    </span>
                  )}
                </button>
              );
            })}

            {/* 3. Online */}
            <button
              type="button"
              onClick={handleToggleOnline}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${onlineFilter
                ? "bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-500/30"
                : "bg-white hover:bg-emerald-50 text-slate-700 border border-emerald-100/90 shadow-2xs"
                }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${onlineFilter ? "bg-emerald-300" : "bg-emerald-500"
                  }`}
              />
              <span>Online</span>
              {counts.online > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${onlineFilter
                    ? "bg-emerald-800 text-emerald-100"
                    : "bg-slate-100 text-slate-700"
                    }`}
                >
                  {counts.online}
                </span>
              )}
            </button>

            {/* Reset button if sub-filters are applied */}
            {(stateFilter || onlineFilter) && (
              <button
                type="button"
                onClick={handleSelectAllInAllTab}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer"
                title="Reset filters"
              >
                <X size={12} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        )}

        {activeTab === "changes" ? (
          <ChangeRequestsPanel />
        ) : (
          <>
            {/* Workflow Rules Information Bar */}
            <WorkflowRulesBar
              rulesText={
                activeTab === "pending"
                  ? "Showing only submitted applications waiting for review, oldest first. Riders who have not submitted (drafts) never appear here."
                  : stateFilter === "DRAFT"
                    ? "Showing riders who never submitted their application, or withdrew it (drafts)."
                    : stateFilter === "UNDER_REVIEW"
                      ? "Showing submitted applications waiting for admin review."
                      : stateFilter === "REJECTED"
                        ? "Showing applications sent back to the rider with a reason."
                        : stateFilter === "APPROVED" && onlineFilter
                          ? "Showing verified delivery riders with approved KYC who are currently online and ready for deliveries."
                          : stateFilter === "APPROVED"
                            ? "Showing verified delivery riders with approved KYC credentials."
                            : onlineFilter
                              ? "Showing all delivery riders currently online and active on duty."
                              : "Complete delivery fleet directory across all application states and presence statuses."
              }
              showingCount={filteredApplications.length}
              itemLabel="delivery partners"
            />

            {/* Search Bar */}
            <div className="relative w-full">
              <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search riders by name, phone, city of operation, vehicle model, plate or license number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-slate-400 shadow-2xs"
              />
            </div>

            {/* Main Content: Table on Desktop, Cards on Mobile/Tablet */}
            <section className="w-full">
              {loading ? (
                <div className="py-20 text-center text-slate-400 bg-white rounded-3xl border border-slate-200/80">
                  <div className="flex flex-col items-center justify-center gap-3 text-xs font-semibold text-slate-500">
                    <RefreshCw size={24} className="animate-spin text-emerald-600" />
                    Loading delivery partner records...
                  </div>
                </div>
              ) : filteredApplications.length === 0 ? (
                <EmptyState
                  icon={Bike}
                  title={
                    activeTab === "pending"
                      ? "No applications waiting for review"
                      : stateFilter === "APPROVED" && onlineFilter
                        ? "No online approved delivery riders found"
                        : stateFilter === "APPROVED"
                          ? "No approved delivery riders found"
                          : stateFilter === "UNDER_REVIEW"
                            ? "No applications under review"
                            : stateFilter === "REJECTED"
                              ? "No rejected applications"
                              : stateFilter === "DRAFT"
                                ? "No draft applications"
                                : onlineFilter
                                  ? "No online delivery riders found"
                                  : "No delivery partners found"
                  }
                  description={
                    searchQuery
                      ? `No riders matched "${searchQuery}". Try a different keyword.`
                      : activeTab === "pending"
                        ? "All submitted delivery partner applications have been processed."
                        : "No delivery partner records matching the selected filter criteria."
                  }
                />
              ) : (
                <div className="bg-white rounded-3xl border border-emerald-100/90 shadow-2xs overflow-hidden">
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full min-w-[900px] text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[11px] uppercase font-bold tracking-wider text-slate-500 bg-slate-50/60">
                          <th className="py-3.5 px-5">Rider / Delivery Partner</th>
                          <th className="py-3.5 px-5">Vehicle & Credentials</th>
                          <th className="py-3.5 px-5">Operating City</th>
                          <th className="py-3.5 px-5">{activeTab === "pending" ? "Submitted" : "Applied / Registered"}</th>
                          <th className="py-3.5 px-5 text-center">Rider Presence</th>
                          <th className="py-3.5 px-5 text-center">Application State</th>
                          <th className="py-3.5 px-5 text-right">Actions</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {filteredApplications.map((app, idx) => (
                          <tr
                            key={app.userId || idx}
                            className="text-xs font-semibold text-slate-800 hover:bg-emerald-50/40 group"
                          >
                            {/* 1. Rider Name with Phone Number */}
                            <td className="py-4 px-5">
                              <div className="space-y-1">
                                <span className="font-bold text-slate-900 block text-xs sm:text-sm">
                                  {app.fullName || "-"}
                                </span>
                                {app.resubmission && (
                                  <ResubmissionBadge count={app.rejectionCount} />
                                )}
                                {app.phone && app.phone !== "-" && (
                                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                                    <Phone size={11} className="text-emerald-600 shrink-0" />
                                    <span>{app.phone}</span>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* 2. Vehicle & Credentials */}
                            <td className="py-4 px-5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                  <Bike size={16} />
                                </div>
                                <div className="min-w-0">
                                  <span className="font-bold text-slate-900 block truncate">
                                    {app.vehicleType} • {app.vehicleModel}
                                  </span>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                      {app.plateNumber}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* 3. Operating City */}
                            <td className="py-4 px-5">
                              <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                                <MapPin size={12} className="text-emerald-600 shrink-0" />
                                <span>{app.cityOfOperation || "-"}</span>
                              </div>
                            </td>

                            {/* 4. Applied Date */}
                            <td className="py-4 px-5 text-slate-600 font-medium">
                              {app.date || "-"}
                            </td>

                            {/* 5. Rider Presence (Online / Offline) */}
                            <td className="py-4 px-5 text-center">
                              {app.isOnline ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Online
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                  Offline
                                </span>
                              )}
                            </td>

                            {/* 6. Application State */}
                            <td className="py-4 px-5 text-center">
                              <StateBadge state={app.applicationState} />
                            </td>

                            {/* 7. Actions */}
                            <td className="py-4 px-5 text-right">
                              {isUnderReview(app) ? (
                                <button
                                  type="button"
                                  onClick={() => handleViewPartner(app)}
                                  disabled={!app.userId}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-40 cursor-pointer font-bold text-xs shadow-2xs"
                                >
                                  <Eye size={13} />
                                  Inspect KYC
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleViewPartner(app)}
                                  disabled={!app.userId}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 text-slate-700 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all disabled:opacity-40 cursor-pointer font-bold text-xs shadow-2xs"
                                >
                                  <FileText size={13} />
                                  {isKycApproved(app) ? "View Doc" : "View Details"}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile / Tablet Card View */}
                  <div className="md:hidden p-4 space-y-3">
                    {filteredApplications.map((app, idx) => (
                      <div
                        key={app.userId || idx}
                        className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/40 hover:bg-white hover:shadow-xs transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{app.fullName || "-"}</h4>
                            {app.resubmission && (
                              <div className="mt-1">
                                <ResubmissionBadge count={app.rejectionCount} />
                              </div>
                            )}
                            {app.phone && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium mt-0.5">
                                <Phone size={11} className="text-emerald-600 shrink-0" />
                                <span>{app.phone}</span>
                              </div>
                            )}
                          </div>

                          {/* Separate Badges for Presence & KYC */}
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <StateBadge state={app.applicationState} size={10} />

                            {app.isOnline ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Online
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                Offline
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 pt-2 border-t border-slate-200/60">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                            <Bike size={15} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs text-slate-900 truncate">
                              {app.vehicleType} • {app.vehicleModel}
                            </h4>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                              <span className="font-mono font-bold bg-slate-100 px-1 py-0.2 rounded border border-slate-200">
                                {app.plateNumber}
                              </span>
                              <span>•</span>
                              <span>{app.cityOfOperation}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 text-[11px]">
                          <span className="text-slate-400 font-medium">{app.submittedAt ? "Submitted" : "Registered"} {app.date}</span>
                          {isUnderReview(app) ? (
                            <button
                              type="button"
                              onClick={() => handleViewPartner(app)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-2xs hover:bg-emerald-700 transition-colors cursor-pointer"
                            >
                              <Eye size={12} />
                              Inspect KYC
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleViewPartner(app)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs shadow-2xs hover:bg-slate-200 transition-colors cursor-pointer"
                            >
                              <FileText size={12} />
                              {isKycApproved(app) ? "View Doc" : "View Details"}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Table Footer with Pagination */}
                  {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between text-xs font-semibold text-slate-600">
                      <span>
                        Showing page <strong className="text-slate-800">{currentPage + 1}</strong> of{" "}
                        <strong className="text-slate-800">{totalPages}</strong> ({totalElements} total riders)
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={currentPage === 0 || loading}
                          onClick={() => handlePageChange(currentPage - 1)}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          title="Previous Page"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          type="button"
                          disabled={currentPage >= totalPages - 1 || loading}
                          onClick={() => handlePageChange(currentPage + 1)}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          title="Next Page"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* KYC Inspection & Full Dossier Modal */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs">
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col border border-slate-200"
          >
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/40 via-teal-50/30 to-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-sm">
                  <Bike size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      {selectedPartner?.fullName || "Delivery Partner Verification"}
                    </h3>
                    <StateBadge state={selectedPartner?.applicationState} size={10} />
                    {selectedPartner?.resubmission && (
                      <ResubmissionBadge count={selectedPartner?.rejectionCount} />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {selectedPartner?.vehicleType} • {selectedPartner?.cityOfOperation} • {selectedPartner?.submittedAt ? `Submitted ${formatDate(selectedPartner.submittedAt)}` : "Not submitted yet"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!actionLoading) {
                    setShowDetail(false);
                    setSelectedPartner(null);
                    setShowRejectBox(false);
                  }
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={19} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
              {detailLoading ? (
                <div className="py-24 text-center text-slate-400 flex flex-col items-center gap-3">
                  <RefreshCw size={28} className="animate-spin text-emerald-600" />
                  <span className="text-xs font-semibold text-slate-600">
                    Loading comprehensive delivery partner KYC dossier...
                  </span>
                </div>
              ) : (
                <>
                  {actionError && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                      <AlertCircle size={16} className="shrink-0 text-rose-600" />
                      <span>{actionError}</span>
                    </div>
                  )}

                  {/* Current rejection (only when state is REJECTED) */}
                  {selectedPartner?.applicationState === "REJECTED" && (() => {
                    const lastRejection = [...(selectedPartner.history || [])]
                      .reverse()
                      .find((h) => h.action === "REJECTED");
                    const flagged =
                      selectedPartner.rejectedSections?.length > 0
                        ? selectedPartner.rejectedSections
                        : lastRejection?.sections || [];
                    const reason = lastRejection?.reason || selectedPartner.rejectionReason;
                    return (
                      <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1.5">
                        <span className="font-bold block">Sent back to the rider</span>
                        {reason && <p className="font-medium">{reason}</p>}
                        {flagged.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {flagged.map((sec) => (
                              <span key={sec} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-rose-700 border border-rose-200">
                                {sectionLabel(sec)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {selectedPartner?.applicationState === "DRAFT" && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600 flex items-start gap-2.5">
                      <AlertCircle size={16} className="shrink-0 text-slate-500 mt-0.5" />
                      <span>This rider has not submitted the application (or withdrew it). It can be viewed but not approved or rejected.</span>
                    </div>
                  )}

                  {/* SECTION 1: Rider Profile & Contacts */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <User size={14} className="text-emerald-600" />
                      <span>Rider Identity & Contact Details</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Full Name
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-slate-900 block mt-0.5">
                          {selectedPartner?.fullName || "-"}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Phone Number
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {selectedPartner?.phone && selectedPartner?.phone !== "-" ? (
                            <>
                              <Phone size={13} className="text-emerald-600 shrink-0" />
                              <span className="text-xs sm:text-sm font-bold text-slate-900">
                                {selectedPartner.phone}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          City of Operation
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <MapPin size={13} className="text-orange-600 shrink-0" />
                          <span className="text-xs sm:text-sm font-bold text-slate-900">
                            {selectedPartner?.cityOfOperation || "-"}
                          </span>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Onboarding Progress
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-emerald-800 block mt-0.5">
                          Step {selectedPartner?.onboardingStep ?? "-"} Completed
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 block mt-0.5">
                          Submitted {selectedPartner?.submissionCount ?? 0}× • Rejected {selectedPartner?.rejectionCount ?? 0}×
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Registration Date
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Calendar size={13} className="text-slate-500 shrink-0" />
                          <span className="text-xs sm:text-sm font-bold text-slate-900">
                            {formatDate(selectedPartner?.registeredAt)}
                          </span>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Submission Date
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Clock size={13} className="text-slate-500 shrink-0" />
                          <span className="text-xs sm:text-sm font-bold text-slate-900">
                            {formatDate(selectedPartner?.submittedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: Vehicle & Transit Credentials */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <Bike size={14} className="text-emerald-600" />
                      <span>Vehicle & Transit Credentials</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Vehicle Type
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-slate-900 block mt-0.5">
                          {selectedPartner?.vehicleType || "-"}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Vehicle Model
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-slate-900 block mt-0.5">
                          {selectedPartner?.vehicleModel || "-"}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          License Plate Number
                        </span>
                        <span className="text-xs sm:text-sm font-mono font-bold text-slate-900 block mt-0.5">
                          {selectedPartner?.plateNumber || "-"}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Driving License Number
                        </span>
                        <span className="text-xs sm:text-sm font-mono font-bold text-slate-900 block mt-0.5">
                          {selectedPartner?.licenseNumber || "-"}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Manufacture Year
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-slate-900 block mt-0.5">
                          {selectedPartner?.manufactureYear || "-"}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Last Updated
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-slate-900 block mt-0.5">
                          {formatDate(selectedPartner?.lastUpdatedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: Bank & Settlement Details */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <Landmark size={14} className="text-emerald-600" />
                      <span>Payout & Settlement Bank Details</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-2xl bg-emerald-50/40 border border-emerald-100">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                          Bank Name
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-slate-900 block mt-0.5">
                          {selectedPartner?.bank?.bankName || "-"}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-emerald-50/40 border border-emerald-100">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                          Account Holder
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-slate-900 block mt-0.5">
                          {selectedPartner?.bank?.accountHolderName || "-"}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-emerald-50/40 border border-emerald-100">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                          Account Number
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono block mt-0.5">
                          {selectedPartner?.bank?.accountNumber || "-"}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-emerald-50/40 border border-emerald-100">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                          IFSC Code
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono block mt-0.5">
                          {selectedPartner?.bank?.ifscCode || "-"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold ${selectedPartner?.bank?.agreedToPayoutTerms ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                        <Check size={12} />
                        {selectedPartner?.bank?.agreedToPayoutTerms ? "Agreed to Payout Terms" : "Payout Terms Not Agreed"}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold ${selectedPartner?.bank?.provided ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600"}`}>
                        <Check size={12} />
                        {selectedPartner?.bank?.provided ? "Bank Info Provided" : "Bank Info Pending"}
                      </span>
                    </div>
                  </div>

                  {/* SECTION 4: Onboarding Verification Milestones */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <ShieldCheck size={14} className="text-emerald-600" />
                      <span>Onboarding Progress Milestones</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">Basic Registration Info</span>
                          <span className="text-[10px] text-slate-500">Name & city of operation</span>
                        </div>
                        {selectedPartner?.basicInfoCompleted ? (
                          <span className="p-1 rounded-full bg-emerald-100 text-emerald-700"><Check size={14} /></span>
                        ) : (
                          <span className="p-1 rounded-full bg-slate-200 text-slate-500"><Clock size={14} /></span>
                        )}
                      </div>

                      <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">Document Submissions</span>
                          <span className="text-[10px] text-slate-500">
                            {selectedPartner?.allDocumentsUploaded ? "All documents uploaded" : `${selectedPartner?.missingDocuments?.length || 0} documents missing`}
                          </span>
                        </div>
                        {selectedPartner?.allDocumentsUploaded ? (
                          <span className="p-1 rounded-full bg-emerald-100 text-emerald-700"><Check size={14} /></span>
                        ) : (
                          <span className="p-1 rounded-full bg-amber-100 text-amber-700"><AlertTriangle size={14} /></span>
                        )}
                      </div>
                    </div>

                    {selectedPartner?.missingDocuments?.length > 0 && (
                      <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
                        <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block">Missing Mandatory Documents:</span>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {selectedPartner.missingDocuments.map((mDoc, mIdx) => (
                              <span
                                key={mIdx}
                                className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-white text-amber-800 border border-amber-300"
                              >
                                {mDoc.replace(/_/g, " ")}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SECTION 5: Submitted KYC Documents with Visual Preview */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <FileText size={14} className="text-emerald-600" />
                        <span>Submitted KYC Documents ({partnerDocuments.length})</span>
                      </div>
                      {selectedPartner?.allDocumentsUploaded && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Check size={11} /> All Documents Complete
                        </span>
                      )}
                    </div>

                    {partnerDocuments.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 font-medium">
                        No document attachments uploaded yet.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {partnerDocuments.map((doc, dIdx) => {
                          const rawUrl = doc.fileUrl || doc.documentUrl || doc.url || "";
                          // Clean markdown link formatting if URL was enclosed in markdown
                          const docUrl = rawUrl.replace(/^\[?([^\]]+)\]?\(?([^)]*)\)?$/, "$1").replace(/[\[\]]/g, "").trim();
                          const docType = (doc.documentType || doc.type || `Document #${dIdx + 1}`).replace(/_/g, " ");

                          return (
                            <div
                              key={dIdx}
                              className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col hover:border-emerald-300 transition-all shadow-2xs group"
                            >
                              {/* Document Header */}
                              <div className="p-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                                <div className="min-w-0 pr-2">
                                  <span className="font-bold text-xs text-slate-900 block truncate capitalize">
                                    {docType}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    Uploaded {formatDate(doc.uploadedAt || doc.lastUpdatedAt)}
                                  </span>
                                </div>
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 border ${doc.status === "VERIFIED"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : doc.status === "REJECTED"
                                        ? "bg-rose-50 text-rose-700 border-rose-200"
                                        : doc.status === "EXPIRING"
                                          ? "bg-orange-50 text-orange-700 border-orange-200"
                                          : "bg-amber-50 text-amber-700 border-amber-200"
                                    }`}
                                >
                                  {doc.status || "PENDING"}
                                </span>
                              </div>

                              {/* Document Visual Preview */}
                              <div className="relative w-full h-40 bg-slate-100 flex items-center justify-center overflow-hidden">
                                <img
                                  src={docUrl}
                                  alt={docType}
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <a
                                    href={docUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 rounded-xl bg-white text-slate-900 font-bold text-xs shadow-md inline-flex items-center gap-1.5 hover:bg-emerald-50 transition-colors"
                                  >
                                    <ExternalLink size={13} />
                                    Open Full Image
                                  </a>
                                </div>
                              </div>

                              {/* Document Card Footer */}
                              <div className="p-2.5 bg-white border-t border-slate-100 flex justify-end">
                                <a
                                  href={docUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
                                >
                                  View Original File <ExternalLink size={11} />
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* SECTION 7: Verified-details change requests (approved riders) */}
                  {isKycApproved(selectedPartner) && selectedPartner?.userId && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <GitPullRequest size={14} className="text-emerald-600" />
                        <span>Change Requests (Verified Details)</span>
                      </div>
                      <ChangeRequestsPanel userId={selectedPartner.userId} compact />
                    </div>
                  )}

                  {/* SECTION 6: Application History (oldest first) */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <HistoryIcon size={14} className="text-emerald-600" />
                      <span>Application History ({selectedPartner?.history?.length || 0})</span>
                    </div>

                    {!selectedPartner?.history || selectedPartner.history.length === 0 ? (
                      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 font-medium">
                        No submission history yet.
                      </div>
                    ) : (
                      <ol className="relative border-l-2 border-slate-200 ml-2 space-y-4">
                        {selectedPartner.history.map((item, hIdx) => {
                          const meta = HISTORY_META[item.action] || { label: item.action, dot: "bg-slate-400" };
                          return (
                            <li key={hIdx} className="pl-5 relative">
                              <span className={`absolute -left-[7px] top-1 w-3 h-3 rounded-full ring-2 ring-white ${meta.dot}`} />
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                <span className="text-xs font-bold text-slate-900">
                                  {meta.label}
                                  {item.submissionNumber ? ` · Submission #${item.submissionNumber}` : ""}
                                </span>
                                <span className="text-[11px] text-slate-400 font-medium">{formatDateTime(item.at)}</span>
                              </div>
                              {item.reason && (
                                <p className="mt-1 text-xs text-slate-700 font-medium bg-rose-50/60 border border-rose-100 rounded-xl px-3 py-2">
                                  {item.reason}
                                </p>
                              )}
                              {item.sections?.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                  {item.sections.map((sec) => (
                                    <span key={sec} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-rose-700 border border-rose-200">
                                      {sectionLabel(sec)}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </div>

                  {/* Rejection Reason Form */}
                  {showRejectBox && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3">
                      <label className="block text-xs font-bold text-rose-900">
                        Reason for rejection <span className="text-rose-600">*</span>{" "}
                        <span className="font-medium text-rose-700">(shown to the rider)</span>
                      </label>
                      <textarea
                        rows={3}
                        maxLength={REJECT_REASON_MAX}
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Tell the rider what to fix (e.g., License photo is blurry, plate number does not match the insurance document)..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-rose-500"
                      />
                      <div className="text-right text-[10px] font-semibold text-rose-700">
                        {rejectReason.length}/{REJECT_REASON_MAX}
                      </div>

                      <div className="space-y-1.5">
                        <span className="block text-xs font-bold text-rose-900">
                          Sections the rider must fix <span className="font-medium text-rose-700">(optional)</span>
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {REJECT_SECTIONS.map((sec) => {
                            const checked = rejectSections.includes(sec.id);
                            return (
                              <label
                                key={sec.id}
                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${checked
                                    ? "bg-rose-600 text-white border-rose-600"
                                    : "bg-white text-slate-700 border-rose-200 hover:bg-rose-100"
                                  }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleRejectSection(sec.id)}
                                  disabled={actionLoading}
                                  className="accent-rose-600"
                                />
                                {sec.label}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowRejectBox(false)}
                          disabled={actionLoading}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleReject}
                          disabled={actionLoading || !rejectReason.trim()}
                          className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer inline-flex items-center gap-1.5 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading && <RefreshCw size={12} className="animate-spin" />}
                          Confirm Rejection
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Actions Footer */}
            {!detailLoading && !showRejectBox && (
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row items-center gap-3">
                {!isUnderReview(selectedPartner) ? (
                  <div className="w-full flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {isKycApproved(selectedPartner) ? (
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                          <CheckCircle2 size={14} className="text-emerald-600" />
                          <span>KYC Approved & Verified</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl">
                          <AlertCircle size={14} className="text-slate-500" />
                          <span>
                            {getStateMeta(selectedPartner?.applicationState).label} - approve / reject is available only while under review
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDetail(false);
                        setSelectedPartner(null);
                      }}
                      className="px-5 py-2 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer shadow-2xs shrink-0"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowRejectBox(true)}
                      disabled={actionLoading}
                      className="w-full sm:flex-1 py-3 px-4 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 text-xs font-bold transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
                    >
                      <XCircle size={16} />
                      Reject Application
                    </button>

                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer inline-flex items-center justify-center gap-2 shadow-sm"
                    >
                      {actionLoading ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                      Approve Application
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}