import { useEffect, useMemo, useState, useCallback } from "react";
import Sidebar from "../../../layouts/Sidebar";
import PageHeader from "../../../components/common/PageHeader";
import SegmentedTabs from "../../../components/common/SegmentedTabs";
import WorkflowRulesBar from "../../../components/common/WorkflowRulesBar";
import EmptyState from "../../../components/common/EmptyState";

import {
  Calendar,
  RefreshCw,
  Search,
  Store,
  Clock,
  Eye,
  CheckCircle2,
  XCircle,
  X,
  User,
  Phone,
  Smartphone,
  Mail,
  MapPin,
  Landmark,
  ShieldCheck,
  Check,
  FileText,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Download,
} from "lucide-react";

import {
  getVendors,
  exportVendorsPdf,
  getPendingVendorKyc,
  getVendorKycDetail,
  approveVendorKyc,
  rejectVendorKyc,
} from "../services/vendorKycService";

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

const isKycApproved = (vendor) => {
  if (!vendor) return false;
  const kyc = String(vendor.kycStatus || vendor.status || "").toUpperCase();
  return kyc === "APPROVED";
};

const normalizeVendor = (item) => {
  const kyc =
    item?.kycStatus ||
    (item?.status ? String(item.status).toUpperCase() : "PENDING");
  const displayStatus =
    kyc === "APPROVED"
      ? "Approved"
      : kyc === "REJECTED"
        ? "Rejected"
        : "Pending";

  return {
    ...item,
    shopId: item?.shopId || item?.id || "",
    ownerUserId: item?.ownerUserId || item?.userId || "",
    ownerFullName:
      item?.ownerFullName ||
      item?.ownerName ||
      item?.fullName ||
      item?.name ||
      "-",
    businessPhone:
      item?.businessPhone ||
      item?.shopPhone ||
      item?.businessContact ||
      item?.phone ||
      "-",
    loginPhone:
      item?.loginPhone ||
      item?.phoneNumber ||
      item?.mobileNumber ||
      item?.user?.phone ||
      item?.user?.phoneNumber ||
      (item?.phone && item?.businessPhone && item.phone !== item.businessPhone
        ? item.phone
        : item?.loginPhone || ""),
    email: item?.email || "-",
    businessName: item?.businessName || item?.shopName || "-",
    businessType: item?.businessType || item?.category || "-",
    city: item?.city || item?.address?.city || "-",
    isOnline: Boolean(
      item?.isOnline === true ||
      item?.isOnline === "true" ||
      item?.online === true ||
      item?.online === "true"
    ),
    kycStatus: kyc,
    submittedAt: item?.submittedAt || item?.createdAt || null,
    registeredAt: item?.registeredAt || item?.createdAt || null,
    lastUpdatedAt: item?.lastUpdatedAt || item?.updatedAt || null,
    date: formatDate(
      item?.submittedAt || item?.createdAt || item?.registeredAt
    ),
    address:
      item?.address ||
      (item?.city
        ? { city: item.city, state: item?.state || "" }
        : null),
    bank: item?.bank || null,
    onboardingProgress: item?.onboardingProgress || null,
    documents: Array.isArray(item?.documents) ? item.documents : [],
    allDocumentsUploaded: Boolean(item?.allDocumentsUploaded),
    status: displayStatus,
  };
};

const vendorTabs = [
  { id: "all", label: "All Vendors", icon: Store },
  { id: "pending", label: "KYC Pending", icon: Clock },
];

export default function Vendor({ embedded = false }) {
  const [activeTab, setActiveTab] = useState("all"); // "all" | "pending"
  const [approvedFilter, setApprovedFilter] = useState(false);
  const [onlineFilter, setOnlineFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [counts, setCounts] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    online: 0,
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  // Detail Modal State
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Actions State
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const fetchVendors = useCallback(
    async (
      tab = activeTab,
      approved = approvedFilter,
      online = onlineFilter,
      page = 0,
      search = searchQuery
    ) => {
      try {
        setLoading(true);
        setError("");

        const params = {};

        if (tab === "pending") {
          params.kycStatus = "PENDING";
        } else if (approved) {
          params.kycStatus = "APPROVED";
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
        try {
          response = await getVendors(params);
        } catch (apiErr) {
          if (tab === "pending" || params.kycStatus === "PENDING") {
            response = await getPendingVendorKyc(page, pageSize);
          } else {
            throw apiErr;
          }
        }

        const rawContent =
          response?.data?.content ||
          response?.content ||
          (Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response)
              ? response
              : []);

        const normalized = rawContent.map(normalizeVendor);

        setApplications(normalized);
        setTotalPages(response?.data?.totalPages || response?.totalPages || 1);
        const total =
          response?.data?.totalElements ??
          response?.totalElements ??
          normalized.length;
        setCurrentPage(page);

        // Update counts intelligently
        setCounts((prev) => {
          if (tab === "all" && !approved && !online) {
            const appCount = normalized.filter((a) => a.kycStatus === "APPROVED").length;
            const pendCount = normalized.filter((a) => a.kycStatus === "PENDING").length;
            const onlCount = normalized.filter((a) => a.isOnline).length;
            return {
              total,
              approved: appCount,
              pending: pendCount,
              online: onlCount,
            };
          }

          const updated = { ...prev };
          if (tab === "pending") updated.pending = total;
          if (tab === "all" && approved && !online) updated.approved = total;
          if (tab === "all" && online && !approved) updated.online = total;
          return updated;
        });
      } catch (err) {
        console.error("Vendor List Error:", err);
        setError(
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Unable to load vendor records."
        );
        setApplications([]);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeTab, approvedFilter, onlineFilter]
  );

  useEffect(() => {
    fetchVendors("all", false, false, 0, searchQuery);
  }, []);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setCurrentPage(0);
    setApprovedFilter(false);
    setOnlineFilter(false);
    fetchVendors(newTab, false, false, 0, searchQuery);
  };

  const handleSelectAllInAllTab = () => {
    setApprovedFilter(false);
    setOnlineFilter(false);
    setCurrentPage(0);
    fetchVendors("all", false, false, 0, searchQuery);
  };

  const handleToggleKycApproved = () => {
    const nextApproved = !approvedFilter;
    setApprovedFilter(nextApproved);
    setCurrentPage(0);
    fetchVendors("all", nextApproved, onlineFilter, 0, searchQuery);
  };

  const handleToggleOnline = () => {
    const nextOnline = !onlineFilter;
    setOnlineFilter(nextOnline);
    setCurrentPage(0);
    fetchVendors("all", approvedFilter, nextOnline, 0, searchQuery);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 0 || newPage >= totalPages || loading) return;
    setCurrentPage(newPage);
    fetchVendors(activeTab, approvedFilter, onlineFilter, newPage, searchQuery);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchVendors(activeTab, approvedFilter, onlineFilter, currentPage, searchQuery);
  };

  const handleExportCsv = async () => {
    try {
      setIsExportingCsv(true);

      // Fetch up to 500 records from the vendors endpoint matching active filters
      const params = {
        page: 0,
        size: 500,
      };

      if (activeTab === "pending") {
        params.kycStatus = "PENDING";
      } else {
        if (approvedFilter) {
          params.kycStatus = "APPROVED";
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
        const response = await getVendors(params);
        const rawContent =
          response?.data?.content ||
          response?.content ||
          (Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response)
              ? response
              : []);
        if (rawContent.length > 0) {
          exportList = rawContent.map(normalizeVendor);
        }
      } catch (fetchErr) {
        console.warn("Falling back to current vendor page records:", fetchErr);
      }

      if (!exportList || exportList.length === 0) {
        alert("No vendor records found to export.");
        return;
      }

      const headers = [
        "Shop ID",
        "Merchant Name",
        "Business Name",
        "Business Phone",
        "Login Phone",
        "Email",
        "Category",
        "City",
        "State",
        "KYC Status",
        "Store Presence",
        "Bank Name",
        "Account Number",
        "IFSC Code",
        "Documents Attached",
        "Registered / Applied Date",
      ];

      const escapeCell = (val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const rows = exportList.map((v) => [
        escapeCell(v.shopId || v.id || ""),
        escapeCell(v.ownerFullName || v.name || ""),
        escapeCell(v.businessName || v.shopName || ""),
        escapeCell(v.businessPhone !== "-" ? v.businessPhone : (v.phone || "")),
        escapeCell(v.loginPhone || ""),
        escapeCell(v.email || ""),
        escapeCell(v.businessType || v.category || ""),
        escapeCell(v.city || v.address?.city || ""),
        escapeCell(v.address?.state || ""),
        escapeCell(v.kycStatus || v.status || ""),
        escapeCell(v.isOnline ? "Online" : "Offline"),
        escapeCell(v.bank?.bankName || ""),
        escapeCell(v.bank?.accountNumber ? `••••${v.bank.accountNumber.slice(-4)}` : ""),
        escapeCell(v.bank?.ifscCode || ""),
        escapeCell(v.documents?.length || 0),
        escapeCell(v.date || v.submittedAt || v.registeredAt || ""),
      ]);

      const csvString = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

      // UTF-8 BOM ensures proper Unicode handling in Microsoft Excel
      const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      link.href = url;
      link.setAttribute("download", `veggo-vendors-export-${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export CSV Error:", err);
      alert("Failed to export vendor CSV. Please try again.");
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      const params = { limit: 500 };
      if (activeTab === "pending") {
        params.kycStatus = "PENDING";
      } else {
        if (approvedFilter) {
          params.kycStatus = "APPROVED";
        }
        if (onlineFilter) {
          params.isOnline = true;
        }
      }
      const blobData = await exportVendorsPdf(params);
      const blob = new Blob([blobData], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      link.href = url;
      link.setAttribute("download", `veggo-vendors-${dateStr}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export PDF Error:", err);
      alert(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to download vendor PDF. Please verify your network or try again."
      );
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleViewVendor = async (application) => {
    const shopId = application?.shopId;
    if (!shopId) {
      setActionError("Shop ID is missing.");
      return;
    }

    try {
      setDetailLoading(true);
      setActionError("");
      setShowDetail(true);
      setSelectedVendor(application);
      setShowRejectBox(false);
      setRejectReason("");

      const response = await getVendorKycDetail(shopId);
      const detail = response?.data || response || {};

      setSelectedVendor(
        normalizeVendor({
          ...application,
          ...detail,
        })
      );
    } catch (err) {
      console.error("Vendor KYC Detail Error:", err);
      setSelectedVendor(application);
      setActionError(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Unable to load full vendor KYC details."
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async () => {
    const vendorShopId =
      selectedVendor?.shopId ||
      selectedVendor?.vendorShopId ||
      selectedVendor?.id;

    if (!vendorShopId) {
      setActionError("Vendor Shop ID is missing.");
      return;
    }

    try {
      setActionLoading(true);
      setActionError("");
      await approveVendorKyc(vendorShopId);
      setShowDetail(false);
      setSelectedVendor(null);
      await fetchVendors(activeTab, approvedFilter, onlineFilter, currentPage, searchQuery);
    } catch (err) {
      console.error("Vendor KYC Approve Error:", err);
      setActionError(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Unable to approve vendor application."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const vendorShopId =
      selectedVendor?.shopId ||
      selectedVendor?.vendorShopId ||
      selectedVendor?.id;

    if (!vendorShopId) {
      setActionError("Vendor Shop ID is missing.");
      return;
    }

    const reason = rejectReason.trim() || "Documents unclear or verification failed";

    try {
      setActionLoading(true);
      setActionError("");
      await rejectVendorKyc(vendorShopId, reason);
      setShowDetail(false);
      setSelectedVendor(null);
      setRejectReason("");
      setShowRejectBox(false);
      await fetchVendors(activeTab, approvedFilter, onlineFilter, currentPage, searchQuery);
    } catch (err) {
      console.error("Vendor KYC Reject Error:", err);
      setActionError(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Unable to reject vendor application."
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
        String(app.ownerFullName || app.name || "").toLowerCase().includes(query) ||
        String(app.businessPhone || app.phone || "").toLowerCase().includes(query) ||
        String(app.loginPhone || "").toLowerCase().includes(query) ||
        String(app.email || "").toLowerCase().includes(query) ||
        String(app.businessName || app.shopName || "").toLowerCase().includes(query) ||
        String(app.businessType || app.category || "").toLowerCase().includes(query) ||
        String(app.city || app.address?.city || "").toLowerCase().includes(query)
    );
  }, [applications, searchQuery]);

  // Extract documents array safely
  const vendorDocuments = useMemo(() => {
    if (!selectedVendor) return [];
    const raw =
      selectedVendor?.documents ||
      selectedVendor?.kycDocuments ||
      selectedVendor?.docs ||
      [];
    return Array.isArray(raw) ? raw : [];
  }, [selectedVendor]);

  return (
    <div className={embedded ? "w-full space-y-5 sm:space-y-6" : "min-h-dvh bg-[#f6f9f7] flex flex-col lg:flex-row font-sans antialiased text-slate-800 selection:bg-emerald-100 selection:text-emerald-900"}>
      {!embedded && <Sidebar />}

      <div className={embedded ? "w-full space-y-5 sm:space-y-6" : "flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pt-20 sm:pt-22 lg:pt-22 overflow-y-auto max-h-dvh w-full space-y-5 sm:space-y-6"}>
        {/* Top Header */}
        <PageHeader
          icon={Store}
          title="All Vendors Directory"
          subtitle="Directory and KYC status moderation for merchant shops on VegGo."
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing || loading}
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={isExportingCsv}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs sm:text-sm font-bold shadow-xs cursor-pointer disabled:opacity-60"
                title="Export vendors to Excel / CSV (Limit: 500)"
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
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 active:scale-98 border border-slate-200 text-slate-700 text-xs sm:text-sm font-bold shadow-2xs cursor-pointer disabled:opacity-60"
                title="Download Vendor PDF  (Limit: 500)"
              >
                <FileText
                  size={15}
                  className={isExportingPdf ? "animate-spin text-emerald-600" : "text-slate-600"}
                />
                <span>{isExportingPdf ? "Downloading..." : "Download PDF"}</span>
              </button>
            </div>
          }
        />

        {/* Global Error Banner */}
        {error && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold text-amber-900 shadow-2xs">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Segmented View Tabs Navigation (All Vendors / KYC Pending) - Matching Customer directory box */}
        <div className="bg-white p-2 rounded-2xl border border-emerald-100/80 shadow-2xs">
          <SegmentedTabs
            tabs={vendorTabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </div>

        {/* Sub-Filters: ONLY visible when "All Vendors" is selected */}
        {activeTab === "all" && (
          <div className="flex flex-wrap items-center gap-2.5 py-1">
            {/* 1. All */}
            <button
              type="button"
              onClick={handleSelectAllInAllTab}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${!approvedFilter && !onlineFilter
                ? "bg-emerald-700 text-white shadow-xs"
                : "bg-white hover:bg-emerald-50 text-slate-700 border border-emerald-100/90 shadow-2xs"
                }`}
            >
              <Store
                size={14}
                className={!approvedFilter && !onlineFilter ? "text-emerald-100" : "text-emerald-700"}
              />
              <span>All</span>
              {counts.total > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${!approvedFilter && !onlineFilter
                    ? "bg-emerald-800 text-emerald-100"
                    : "bg-slate-100 text-slate-700"
                    }`}
                >
                  {counts.total}
                </span>
              )}
            </button>

            {/* 2. KYC Approved */}
            <button
              type="button"
              onClick={handleToggleKycApproved}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${approvedFilter
                ? "bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-500/30"
                : "bg-white hover:bg-emerald-50 text-slate-700 border border-emerald-100/90 shadow-2xs"
                }`}
            >
              <CheckCircle2
                size={14}
                className={approvedFilter ? "text-emerald-200" : "text-emerald-600"}
              />
              <span>KYC Approved</span>
              {counts.approved > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${approvedFilter
                    ? "bg-emerald-800 text-emerald-100"
                    : "bg-slate-100 text-slate-700"
                    }`}
                >
                  {counts.approved}
                </span>
              )}
            </button>

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
            {(approvedFilter || onlineFilter) && (
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

        {/* Workflow Information Bar */}
        <WorkflowRulesBar
          rulesText={
            activeTab === "pending"
              ? "Showing merchant applications pending KYC verification and document inspection."
              : approvedFilter && onlineFilter
                ? "Showing verified merchants with approved KYC who are currently online and open for trade."
                : approvedFilter
                  ? "Showing verified merchants with approved KYC credentials."
                  : onlineFilter
                    ? "Showing all merchant shops currently online and accepting orders."
                    : "Complete merchant directory across all registration and KYC verification statuses."
          }
          showingCount={filteredApplications.length}
          itemLabel="vendors"
        />

        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by merchant name, phone, shop name, category, or city..."
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
                Loading vendor records...
              </div>
            </div>
          ) : filteredApplications.length === 0 ? (
            <EmptyState
              icon={Store}
              title={
                activeTab === "pending"
                  ? "No pending KYC applications found"
                  : approvedFilter && onlineFilter
                    ? "No online approved vendors found"
                    : approvedFilter
                      ? "No KYC approved vendors found"
                      : onlineFilter
                        ? "No online vendors found"
                        : "No vendors found"
              }
              description={
                searchQuery
                  ? `No applications matched "${searchQuery}". Try a different keyword.`
                  : activeTab === "pending"
                    ? "All vendor merchant registrations have been processed."
                    : "No merchant records matching the selected filter criteria."
              }
            />
          ) : (
            <div className="bg-white rounded-3xl border border-emerald-100/90 shadow-2xs overflow-hidden">
              {/* Desktop Table View (md and above) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[900px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] uppercase font-bold tracking-wider text-slate-500 bg-slate-50/60">
                      <th className="py-3.5 px-5">Merchant / Owner</th>
                      <th className="py-3.5 px-5">Shop & Location</th>
                      <th className="py-3.5 px-5">Category</th>
                      <th className="py-3.5 px-5">Applied Date</th>
                      <th className="py-3.5 px-5 text-center">Store Presence</th>
                      <th className="py-3.5 px-5 text-center">KYC Status</th>
                      <th className="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredApplications.map((app, idx) => (
                      <tr
                        key={app.shopId || app.id || idx}
                        className="text-xs font-semibold text-slate-800 hover:bg-emerald-50/40 group"
                      >
                        {/* 1. Merchant / Owner */}
                        <td className="py-4 px-5">
                          <div className="space-y-1.5">
                            <span className="font-bold text-slate-900 block text-xs sm:text-sm">
                              {app.ownerFullName || "-"}
                            </span>

                            {/* Business Phone */}
                            {app.businessPhone && app.businessPhone !== "-" && (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                  Bussiness
                                </span>
                                <Phone size={11} className="text-emerald-600 shrink-0" />
                                <span>{app.businessPhone}</span>
                              </div>
                            )}

                            {/* App Login Phone */}
                            {app.loginPhone && app.loginPhone !== "-" && (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                                  Login
                                </span>
                                <Smartphone size={11} className="text-blue-600 shrink-0" />
                                <span>{app.loginPhone}</span>
                              </div>
                            )}

                            {/* Email */}
                            {app.email && app.email !== "-" && (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                                <Mail size={11} className="text-slate-400 shrink-0" />
                                <span className="truncate max-w-[190px]">{app.email}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 2. Shop Details & Location */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                              <Store size={16} />
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors block truncate">
                                {app.businessName || "-"}
                              </span>
                              {app.address?.city && (
                                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium mt-0.5">
                                  <MapPin size={10} className="text-emerald-600 shrink-0" />
                                  <span className="truncate">{app.address.city}, {app.address.state}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 3. Category / Business Type */}
                        <td className="py-4 px-5">
                          <span className="bg-slate-50 text-slate-700 border border-slate-200/80 px-2.5 py-1 rounded-lg text-[10px] font-bold">
                            {app.businessType || "-"}
                          </span>
                        </td>

                        {/* 4. Applied Date */}
                        <td className="py-4 px-5 text-slate-600 font-medium">
                          {app.date || "-"}
                        </td>

                        {/* 5. Store Presence (Online / Offline) */}
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

                        {/* 6. KYC Status (Approved / Pending / Rejected) */}
                        <td className="py-4 px-5 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${app.status === "Approved"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : app.status === "Rejected"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                          >
                            {app.status === "Approved" ? (
                              <CheckCircle2 size={11} className="text-emerald-600" />
                            ) : app.status === "Rejected" ? (
                              <XCircle size={11} className="text-rose-600" />
                            ) : (
                              <Clock size={11} className="text-amber-600" />
                            )}
                            {app.status}
                          </span>
                        </td>

                        {/* 7. Actions */}
                        <td className="py-4 px-5 text-right">
                          {isKycApproved(app) ? (
                            <button
                              type="button"
                              onClick={() => handleViewVendor(app)}
                              disabled={!app.shopId && !app.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 text-slate-700 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all disabled:opacity-40 cursor-pointer font-bold text-xs shadow-2xs"
                            >
                              <FileText size={13} />
                              View Doc
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleViewVendor(app)}
                              disabled={!app.shopId && !app.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-40 cursor-pointer font-bold text-xs shadow-2xs"
                            >
                              <Eye size={13} />
                              Inspect KYC
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile / Tablet Card View (md:hidden) */}
              <div className="md:hidden p-4 space-y-3">
                {filteredApplications.map((app, idx) => (
                  <div
                    key={app.shopId || app.id || idx}
                    className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/40 hover:bg-white hover:shadow-xs transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="font-bold text-sm text-slate-900 block">
                          {app.ownerFullName || "-"}
                        </span>

                        {app.businessPhone && app.businessPhone !== "-" && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                              Bussiness
                            </span>
                            <Phone size={11} className="text-emerald-600 shrink-0" />
                            <span>{app.businessPhone}</span>
                          </div>
                        )}

                        {app.loginPhone && app.loginPhone !== "-" && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                              Login
                            </span>
                            <Smartphone size={11} className="text-blue-600 shrink-0" />
                            <span>{app.loginPhone}</span>
                          </div>
                        )}

                        {app.email && app.email !== "-" && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500">
                            <Mail size={11} className="text-slate-400 shrink-0" />
                            <span className="truncate max-w-[200px]">{app.email}</span>
                          </div>
                        )}
                      </div>

                      {/* Separate Badges for Store Presence & KYC Status */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${app.status === "Approved"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : app.status === "Rejected"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                        >
                          {app.status === "Approved" ? (
                            <CheckCircle2 size={10} className="text-emerald-600" />
                          ) : app.status === "Rejected" ? (
                            <XCircle size={10} className="text-rose-600" />
                          ) : (
                            <Clock size={10} className="text-amber-600" />
                          )}
                          {app.status}
                        </span>

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
                        <Store size={15} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-slate-900 truncate">
                          {app.businessName || "-"}
                        </h4>
                        {app.address?.city && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-500">
                            <MapPin size={10} className="text-emerald-600 shrink-0" />
                            <span>{app.address.city}, {app.address.state}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Category
                        </span>
                        <span className="font-semibold text-slate-700">
                          {app.businessType || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Applied Date
                        </span>
                        <span className="font-semibold text-slate-600">
                          {app.date || "-"}
                        </span>
                      </div>
                    </div>

                    {isKycApproved(app) ? (
                      <button
                        type="button"
                        onClick={() => handleViewVendor(app)}
                        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-all cursor-pointer shadow-xs border border-slate-200"
                      >
                        <FileText size={14} />
                        View Doc
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleViewVendor(app)}
                        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all cursor-pointer shadow-xs"
                      >
                        <Eye size={14} />
                        Inspect KYC
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Real Pagination Controls */}
              {totalPages > 1 && (
                <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/40">
                  <span className="text-xs text-slate-500 font-medium">
                    Showing page <strong className="text-slate-800">{currentPage + 1}</strong> of{" "}
                    <strong className="text-slate-800">{totalPages}</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 0 || loading}
                      className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
                      title="Previous Page"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages - 1 || loading}
                      className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
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
      </div>

      {/* KYC Inspection & Full Dossier Modal */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs">
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col border border-slate-200"
          >
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-orange-50/40 via-emerald-50/30 to-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-sm">
                  <Store size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      {selectedVendor?.businessName || selectedVendor?.shopName || "Merchant KYC Verification"}
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${isKycApproved(selectedVendor)
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : selectedVendor?.status === "Rejected" || String(selectedVendor?.kycStatus).toUpperCase() === "REJECTED"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}
                    >
                      {isKycApproved(selectedVendor) ? (
                        <CheckCircle2 size={10} className="text-emerald-600" />
                      ) : selectedVendor?.status === "Rejected" || String(selectedVendor?.kycStatus).toUpperCase() === "REJECTED" ? (
                        <XCircle size={10} className="text-rose-600" />
                      ) : (
                        <Clock size={10} className="text-amber-600" />
                      )}
                      {selectedVendor?.status || "Pending"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {selectedVendor?.businessType || "Merchant"} • Applied {formatDate(selectedVendor?.submittedAt)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!actionLoading) {
                    setShowDetail(false);
                    setSelectedVendor(null);
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
                    Loading comprehensive merchant KYC dossier...
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

                  {/* SECTION 1: Merchant Profile & Contacts */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <User size={14} className="text-emerald-600" />
                      <span>Merchant Profile & Contact Details</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Owner Full Name
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-slate-900 block mt-0.5">
                          {selectedVendor?.ownerFullName || "-"}
                        </span>
                      </div>

                      {/* Business Phone Number */}
                      <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Business Phone
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Bussiness
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          {selectedVendor?.businessPhone && selectedVendor?.businessPhone !== "-" ? (
                            <>
                              <Phone size={13} className="text-emerald-600 shrink-0" />
                              <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
                                {selectedVendor.businessPhone}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">-</span>
                          )}
                        </div>
                      </div>

                      {/* App Login Mobile Number */}
                      <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            App Login Phone
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Login
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          {selectedVendor?.loginPhone && selectedVendor?.loginPhone !== "-" ? (
                            <>
                              <Smartphone size={13} className="text-blue-600 shrink-0" />
                              <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
                                {selectedVendor.loginPhone}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">-</span>
                          )}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Email Address
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {selectedVendor?.email && selectedVendor?.email !== "-" ? (
                            <>
                              <Mail size={13} className="text-emerald-600 shrink-0" />
                              <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                {selectedVendor.email}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Shop / Business Name
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-slate-900 block mt-0.5">
                          {selectedVendor?.businessName || selectedVendor?.shopName || "-"}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Business Type
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-emerald-800 block mt-0.5">
                          {selectedVendor?.businessType || "-"}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Registration Date
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Calendar size={13} className="text-slate-500 shrink-0" />
                          <span className="text-xs sm:text-sm font-bold text-slate-900">
                            {formatDate(selectedVendor?.registeredAt || selectedVendor?.submittedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: Business Operating Address */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <MapPin size={14} className="text-orange-600" />
                      <span>Operating Business Address</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Full Address
                        </span>
                        <p className="text-xs sm:text-sm font-semibold text-slate-900 mt-0.5 leading-relaxed">
                          {selectedVendor?.address?.fullAddress || selectedVendor?.address?.streetAddress || "No address details provided."}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200/60 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block">City</span>
                          <span className="font-bold text-slate-800">{selectedVendor?.address?.city || "-"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block">State</span>
                          <span className="font-bold text-slate-800">{selectedVendor?.address?.state || "-"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block">PIN / Postal Code</span>
                          <span className="font-bold text-slate-800">{selectedVendor?.address?.zipCode || "-"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block">GPS Coordinates</span>
                          {selectedVendor?.address?.latitude && selectedVendor?.address?.longitude ? (
                            <a
                              href={`https://www.google.com/maps?q=${selectedVendor.address.latitude},${selectedVendor.address.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                            >
                              View Map <ExternalLink size={10} />
                            </a>
                          ) : (
                            <span className="font-medium text-slate-400">-</span>
                          )}
                        </div>
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
                          {selectedVendor?.bank?.bankName || "-"}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-emerald-50/40 border border-emerald-100">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                          Account Holder
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-slate-900 block mt-0.5">
                          {selectedVendor?.bank?.accountHolderName || "-"}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-emerald-50/40 border border-emerald-100">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                          Account Number
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono block mt-0.5">
                          {selectedVendor?.bank?.accountNumber || "-"}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-emerald-50/40 border border-emerald-100">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                          IFSC Code
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono block mt-0.5">
                          {selectedVendor?.bank?.ifscCode || "-"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold ${selectedVendor?.bank?.agreedToPayoutTerms ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                        <Check size={12} />
                        {selectedVendor?.bank?.agreedToPayoutTerms ? "Agreed to Payout Terms" : "Payout Terms Not Agreed"}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold ${selectedVendor?.bank?.provided ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600"}`}>
                        <Check size={12} />
                        {selectedVendor?.bank?.provided ? "Bank Info Provided" : "Bank Info Pending"}
                      </span>
                    </div>
                  </div>

                  {/* SECTION 4: Onboarding Verification Milestones */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <ShieldCheck size={14} className="text-emerald-600" />
                      <span>Onboarding Progress Milestones</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700">Basic Info</span>
                        {selectedVendor?.onboardingProgress?.basicInfoCompleted ? (
                          <span className="p-1 rounded-full bg-emerald-100 text-emerald-700"><Check size={12} /></span>
                        ) : (
                          <span className="p-1 rounded-full bg-slate-200 text-slate-500"><Clock size={12} /></span>
                        )}
                      </div>

                      <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700">Location Info</span>
                        {selectedVendor?.onboardingProgress?.businessLocationCompleted ? (
                          <span className="p-1 rounded-full bg-emerald-100 text-emerald-700"><Check size={12} /></span>
                        ) : (
                          <span className="p-1 rounded-full bg-slate-200 text-slate-500"><Clock size={12} /></span>
                        )}
                      </div>

                      <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700">Bank Details</span>
                        {selectedVendor?.onboardingProgress?.bankDetailsCompleted ? (
                          <span className="p-1 rounded-full bg-emerald-100 text-emerald-700"><Check size={12} /></span>
                        ) : (
                          <span className="p-1 rounded-full bg-slate-200 text-slate-500"><Clock size={12} /></span>
                        )}
                      </div>

                      <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700">Payment Settings</span>
                        {selectedVendor?.onboardingProgress?.paymentSettingsConfigured ? (
                          <span className="p-1 rounded-full bg-emerald-100 text-emerald-700"><Check size={12} /></span>
                        ) : (
                          <span className="p-1 rounded-full bg-slate-200 text-slate-500"><Clock size={12} /></span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SECTION 5: Submitted KYC Documents with Visual Preview */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <FileText size={14} className="text-emerald-600" />
                        <span>Submitted KYC Documents ({vendorDocuments.length})</span>
                      </div>
                      {selectedVendor?.allDocumentsUploaded && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Check size={11} /> All Documents Uploaded
                        </span>
                      )}
                    </div>

                    {vendorDocuments.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 font-medium">
                        No document attachments found for this merchant.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {vendorDocuments.map((doc, dIdx) => {
                          const rawUrl = doc.fileUrl || doc.documentUrl || doc.url || "";
                          // Clean markdown link formatting if URL was enclosed in markdown
                          const docUrl = rawUrl.replace(/^\[?([^\]]+)\]?\(?([^)]*)\)?$/, "$1").replace(/[[\]]/g, "").trim();
                          const docType = (doc.documentType || doc.type || `Document #${dIdx + 1}`).replace(/_/g, " ");

                          return (
                            <div
                              key={dIdx}
                              className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col hover:border-emerald-300 shadow-2xs group"
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
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                                  {doc.status || "PENDING"}
                                </span>
                              </div>

                              {/* Document Visual Preview */}
                              <div className="relative w-full h-40 bg-slate-100 flex items-center justify-center overflow-hidden">
                                {docUrl ? (
                                  <>
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
                                  </>
                                ) : (
                                  <div className="flex flex-col items-center gap-1.5 text-slate-400 text-xs font-semibold">
                                    <FileText size={24} />
                                    <span>No preview available</span>
                                  </div>
                                )}
                              </div>

                              {/* Document Card Footer */}
                              {docUrl && (
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
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Rejection Reason Form */}
                  {showRejectBox && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3">
                      <label className="block text-xs font-bold text-rose-900">
                        Reason for Application Rejection
                      </label>
                      <textarea
                        rows={3}
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Provide the reason for rejecting this KYC application (e.g., Unclear business license image, Tax ID mismatch, incomplete bank proof)..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-rose-500"
                      />
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
                          disabled={actionLoading}
                          className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
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
                {isKycApproved(selectedVendor) ? (
                  <div className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span>KYC Approved & Verified</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDetail(false);
                        setSelectedVendor(null);
                      }}
                      className="px-5 py-2 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
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