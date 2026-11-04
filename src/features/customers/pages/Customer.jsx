import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../../layouts/Sidebar";
import ConfirmModal from "../../../components/common/ConfirmModal";
import PageHeader from "../../../components/common/PageHeader";
import SegmentedTabs from "../../../components/common/SegmentedTabs";
import WorkflowRulesBar from "../../../components/common/WorkflowRulesBar";
import EmptyState from "../../../components/common/EmptyState";
import { ROUTES } from "../../../constants/routes.constants";
import {
  UI_TABLE,
  UI_BADGES,
  UI_BUTTONS,
  UI_AVATAR,
  getAvatarColor
} from "../../../constants/ui.constants";

import {
  getCustomerStats,
  getCustomers,
  searchCustomers,
  getCustomerDetails,
  deleteCustomer,
  blockCustomer,
  unblockCustomer,
  getModerationStats,
  getModerationCustomers,
  searchModerationCustomers,
  exportCustomersPdf,
} from "../services/customerService";

import {
  RefreshCw,
  UserX,
  Search,
  ShieldCheck,
  Users,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Clock,
  Flag,
  ShieldAlert,
  Eye,
  Trash2,
  ShoppingBag,
  Phone,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Check,
  X,
  Download,
  FileText,
  ArrowUpDown,
} from "lucide-react";

/**
 * Animated number counter component for executive stats
 */
function AnimatedValue({ value }) {
  if (value === undefined || value === null) return <span>0</span>;
  const stringValue = String(value);
  const match = stringValue.match(/([\d,.]+)\s*(.*)/);
  if (!match) return <span>{stringValue}</span>;
  const rawNumber = match[1].replace(/,/g, "");
  const targetNumber = Number(rawNumber);
  const suffix = match[2] || "";
  if (Number.isNaN(targetNumber)) return <span>{stringValue}</span>;
  const formatted = Number.isInteger(targetNumber)
    ? targetNumber.toLocaleString("en-IN")
    : targetNumber.toFixed(2);
  return <span>{`${formatted}${suffix ? ` ${suffix}` : ""}`}</span>;
}

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCurrency = (val) => {
  const num = Number(val || 0);
  return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Helper to normalize disparate backend customer DTO shapes
 */
const normalizeCustomer = (item) => {
  if (!item) return {};
  const userId =
    item.userId ||
    item.customerUserId ||
    item.id ||
    item._id ||
    item.customerId ||
    "";
  const customerId = item.customerId || item.id || item._id || userId || "-";
  const fullName =
    item.fullName ||
    item.name ||
    item.customerName ||
    item.user?.name ||
    "Customer";
  const email = item.email || item.user?.email || "";
  const phone =
    item.phone ||
    item.mobileNumber ||
    item.phoneNumber ||
    item.user?.phone ||
    "";
  const blocked = Boolean(
    item.blocked === true ||
    item.isBlocked === true ||
    item.accountState === "BLOCKED" ||
    item.accountState === "SUSPENDED"
  );
  const accountState =
    item.accountState || (blocked ? "Blocked" : "Active");
  const verified = Boolean(
    item.verified ||
    item.isVerified ||
    item.phoneVerified ||
    item.emailVerified
  );
  const registrationDate =
    item.registrationDate || item.registeredAt || item.createdAt || null;
  const totalOrders = Number(
    item.totalOrders ??
    item.completedPurchases ??
    item.ordersCount ??
    item.orders ??
    0
  );
  const totalComplaints = Number(
    item.totalComplaints ??
    item.flagsRaised ??
    item.flags ??
    item.reportCount ??
    0
  );
  const flagsRaised = totalComplaints;
  const primaryInfraction =
    item.primaryInfraction ||
    item.infractionReason ||
    item.reason ||
    (totalComplaints > 0 ? "Under Review" : "None");
  const city =
    item.city ||
    item.cityOfOperation ||
    item.address?.city ||
    item.primaryAddress?.city ||
    "-";

  return {
    ...item,
    userId,
    customerId,
    fullName,
    email,
    phone,
    accountState,
    blocked,
    verified,
    registrationDate,
    totalOrders,
    totalComplaints,
    completedPurchases: totalOrders,
    flagsRaised,
    primaryInfraction,
    city,
  };
};

export default function Customer({ embedded = false }) {
  const navigate = useNavigate();

  // Navigation & View Tabs
  const [activeCustomerTab, setActiveCustomerTab] = useState("roster");
  const [isBlockedFilter, setIsBlockedFilter] = useState(false);
  const [sortOrder, setSortOrder] = useState(null); // null | "newest" | "oldest"
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 20;

  // Data States
  const [accounts, setAccounts] = useState([]);
  const [customerStats, setCustomerStats] = useState(null);
  const [moderationStats, setModerationStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [counts, setCounts] = useState({
    total: 0,
    blocked: 0,
  });

  // Customer Details Modal State
  const [customerDetails, setCustomerDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Confirm Modal State
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    account: null,
    action: null,
  });
  const [actionLoading, setActionLoading] = useState(false);

  const customerTabs = [
    { id: "roster", label: "Customer Directory", icon: Users },
    { id: "moderation", label: "Account Moderation", icon: Flag },
  ];

  /**
   * Fetch customer data according to the active tab, sub-filters, sorting, and search query
   */
  const fetchCustomerData = useCallback(
    async (
      tab = activeCustomerTab,
      page = 0,
      search = searchQuery,
      blockedOnly = isBlockedFilter,
      sort = sortOrder
    ) => {
      setIsRefreshing(true);
      setErrorMessage("");

      try {
        // Fetch real KPIs concurrently
        const [customerStatsResponse, moderationStatsResponse] =
          await Promise.allSettled([
            getCustomerStats(),
            getModerationStats(),
          ]);

        if (customerStatsResponse.status === "fulfilled") {
          setCustomerStats(
            customerStatsResponse.value?.data ??
            customerStatsResponse.value ??
            null
          );
        }

        if (moderationStatsResponse.status === "fulfilled") {
          setModerationStats(
            moderationStatsResponse.value?.data ??
            moderationStatsResponse.value ??
            null
          );
        }

        // Fetch customer list based on tab
        const isModerationTab = tab === "moderation";
        const trimmedSearch = search.trim();
        let listResponse;

        if (isModerationTab) {
          listResponse = trimmedSearch
            ? await searchModerationCustomers(trimmedSearch, {
              page,
              size: pageSize,
            })
            : await getModerationCustomers({ page, size: pageSize });
        } else {
          // Standard customer roster, wallet, or order views
          const params = {
            page,
            size: pageSize,
          };

          if (sort === "oldest") {
            params.sort = "oldest";
          } else if (sort === "newest") {
            params.sort = "newest";
          }

          if (tab === "roster" && blockedOnly) {
            params.isBlocked = true;
          }

          if (trimmedSearch) {
            params.search = trimmedSearch;
          }

          try {
            listResponse = await getCustomers(params);
          } catch (customerFetchErr) {
            console.warn(
              "Regular customers endpoint fallback to moderation list:",
              customerFetchErr
            );
            // Fallback gracefully to moderation list if base endpoint not ready
            listResponse = trimmedSearch
              ? await searchModerationCustomers(trimmedSearch, {
                page,
                size: pageSize,
              })
              : await getModerationCustomers({ page, size: pageSize });
          }
        }

        const rawData = listResponse?.data ?? listResponse ?? {};
        let rawList = [];

        if (Array.isArray(rawData?.content)) {
          rawList = rawData.content;
        } else if (Array.isArray(rawData?.items)) {
          rawList = rawData.items;
        } else if (Array.isArray(rawData?.customers)) {
          rawList = rawData.customers;
        } else if (Array.isArray(rawData)) {
          rawList = rawData;
        }

        const normalizedList = rawList.map(normalizeCustomer);
        setAccounts(normalizedList);

        const totalPagesCount =
          rawData?.totalPages ?? rawData?.pages ?? 1;
        const totalElementsCount =
          rawData?.totalElements ??
          rawData?.totalCount ??
          normalizedList.length;

        setTotalPages(Math.max(1, totalPagesCount));
        setTotalElements(totalElementsCount);
        setCurrentPage(page);

        // Update counts intelligently
        setCounts((prev) => {
          if (tab === "roster" && !blockedOnly) {
            const bCount = normalizedList.filter((a) => a.blocked).length;
            return {
              total: totalElementsCount,
              blocked: bCount,
            };
          }

          const updated = { ...prev };
          if (blockedOnly) updated.blocked = totalElementsCount;
          return updated;
        });
      } catch (error) {
        console.error("Failed to fetch customer data:", error);
        setErrorMessage(
          error?.response?.data?.message ||
          error?.message ||
          "Failed to fetch customer data."
        );
      } finally {
        setIsRefreshing(false);
        setLoading(false);
      }
    },
    [pageSize]
  );

  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounced search query watcher
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch immediately when tab, debounced search, or filters change
  useEffect(() => {
    fetchCustomerData(
      activeCustomerTab,
      0,
      debouncedSearch,
      isBlockedFilter,
      sortOrder
    );
  }, [activeCustomerTab, debouncedSearch, isBlockedFilter, sortOrder, fetchCustomerData]);

  // Tab switch handler
  const handleTabChange = (tabId) => {
    setActiveCustomerTab(tabId);
    setCurrentPage(0);
    setIsBlockedFilter(false);
    setSortOrder(null);
  };

  const handleSelectAllInRoster = () => {
    setIsBlockedFilter(false);
    setSortOrder(null);
    setCurrentPage(0);
  };

  const handleToggleBlocked = () => {
    const nextBlocked = !isBlockedFilter;
    setIsBlockedFilter(nextBlocked);
    setCurrentPage(0);
  };

  const handleSetSortOrder = (newSort) => {
    const nextSort = sortOrder === newSort ? null : newSort;
    setSortOrder(nextSort);
    setCurrentPage(0);
    fetchCustomerData("roster", 0, searchQuery, isBlockedFilter, nextSort);
  };

  const handleRefresh = () => {
    fetchCustomerData(activeCustomerTab, currentPage, searchQuery, isBlockedFilter, sortOrder);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 0 || newPage >= totalPages || loading) return;
    fetchCustomerData(activeCustomerTab, newPage, searchQuery, isBlockedFilter, sortOrder);
  };

  // Export CSV Handler
  const handleExportCsv = async () => {
    try {
      setIsExportingCsv(true);

      const params = {
        page: 0,
        size: 500,
      };

      if (sortOrder === "oldest") {
        params.sort = "oldest";
      } else if (sortOrder === "newest") {
        params.sort = "newest";
      }

      if (activeCustomerTab === "roster") {
        if (isBlockedFilter) params.isBlocked = true;
      }

      if (searchQuery && searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      let exportList = accounts;
      try {
        const response = await getCustomers(params);
        const rawData = response?.data ?? response ?? {};
        let rawList = [];
        if (Array.isArray(rawData?.content)) rawList = rawData.content;
        else if (Array.isArray(rawData?.items)) rawList = rawData.items;
        else if (Array.isArray(rawData?.customers)) rawList = rawData.customers;
        else if (Array.isArray(rawData)) rawList = rawData;

        if (rawList.length > 0) {
          exportList = rawList.map(normalizeCustomer);
        }
      } catch (fetchErr) {
        console.warn("Falling back to current customer records:", fetchErr);
      }

      if (!exportList || exportList.length === 0) {
        alert("No customer records found to export.");
        return;
      }

      const headers = [
        "Customer ID",
        "Full Name",
        "Phone",
        "Email",
        "Account Status",
        "Verified",
        "Total Orders",
        "Total Complaints",
        "Registration Date",
      ];

      const escapeCell = (val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const rows = exportList.map((c) => [
        escapeCell(c.customerId || c.userId || ""),
        escapeCell(c.fullName || ""),
        escapeCell(c.phone || ""),
        escapeCell(c.email || ""),
        escapeCell(c.blocked ? "Blocked" : "Active"),
        escapeCell(c.verified ? "Yes" : "No"),
        escapeCell(c.totalOrders ?? 0),
        escapeCell(c.totalComplaints ?? 0),
        escapeCell(c.registrationDate || ""),
      ]);

      const csvString = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

      // UTF-8 BOM ensures proper Unicode handling in Microsoft Excel
      const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      link.href = url;
      link.setAttribute("download", `veggo-customers-${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export Customer CSV Error:", err);
      alert("Failed to export customer CSV. Please try again.");
    } finally {
      setIsExportingCsv(false);
    }
  };

  // Export PDF Handler
  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      const params = { limit: 500 };

      if (sortOrder === "oldest") {
        params.sort = "oldest";
      } else if (sortOrder === "newest") {
        params.sort = "newest";
      }

      if (activeCustomerTab === "roster") {
        if (isBlockedFilter) params.isBlocked = true;
      }

      if (searchQuery && searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const blobData = await exportCustomersPdf(params);
      const blob = new Blob([blobData], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      link.href = url;
      link.setAttribute("download", `veggo-customers-${dateStr}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export Customer PDF Error:", err);
      alert(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to download customer PDF ."
      );
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Inspect customer detail
  const handleViewCustomer = async (account) => {
    const userId = account?.userId || account?.customerId;
    if (!userId) {
      setErrorMessage("Customer User ID not found.");
      return;
    }

    try {
      setDetailsLoading(true);
      setErrorMessage("");
      const response = await getCustomerDetails(userId);
      const data = response?.data ?? response ?? account;
      setCustomerDetails(normalizeCustomer({ ...account, ...data }));
    } catch (error) {
      console.warn("Could not fetch full details, showing current record:", error);
      setCustomerDetails(normalizeCustomer(account));
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    setCustomerDetails(null);
  };

  // Initiate status or delete actions
  const initiateToggleStatus = (account) => {
    setModalConfig({
      isOpen: true,
      account,
      action: account.blocked ? "unblock" : "block",
    });
  };

  const initiateDelete = (account) => {
    setModalConfig({
      isOpen: true,
      account,
      action: "delete",
    });
  };

  const closeModal = () => {
    setModalConfig({
      isOpen: false,
      account: null,
      action: null,
    });
  };

  const handleConfirmAction = async () => {
    const account = modalConfig.account;
    const action = modalConfig.action;
    if (!account) return;

    const customerUserId = account.userId || account.customerId;
    if (!customerUserId) {
      setErrorMessage("Customer User ID is missing.");
      closeModal();
      return;
    }

    try {
      setActionLoading(true);
      setErrorMessage("");

      if (action === "block") {
        await blockCustomer(customerUserId);
      } else if (action === "unblock") {
        await unblockCustomer(customerUserId);
      } else if (action === "delete") {
        await deleteCustomer(customerUserId);
      }

      closeModal();
      if (customerDetails?.userId === customerUserId) {
        setCustomerDetails(null);
      }
      await fetchCustomerData(
        activeCustomerTab,
        currentPage,
        searchQuery,
        isBlockedFilter,
        sortOrder
      );
    } catch (error) {
      console.error(`Failed to ${action} customer:`, error);
      setErrorMessage(
        error?.response?.data?.message ||
        error?.message ||
        `Failed to ${action} customer.`
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Real KPI stats computation directly mapping to /api/admin/customers/stats
  const totalCustomersStat =
    customerStats?.totalCustomers ??
    customerStats?.totalUsers ??
    totalElements ??
    accounts.length;

  const activeThisMonthStat =
    customerStats?.activeThisMonth ??
    customerStats?.activeUsers ??
    0;

  const premiumSubscribersStat =
    customerStats?.premiumSubscribers ??
    customerStats?.highValueCustomers ??
    0;

  const suspendedOrBlockedStat =
    customerStats?.suspendedAccounts ??
    moderationStats?.suspendedOrBlocked ??
    accounts.filter((a) => a.blocked).length;

  const blockedCount = accounts.filter((a) => a.blocked).length;
  const flaggedCount = accounts.filter((a) => a.flagsRaised > 0).length;

  const filteredAccounts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return accounts;

    return accounts.filter(
      (acc) =>
        String(acc.fullName || "").toLowerCase().includes(query) ||
        String(acc.email || "").toLowerCase().includes(query) ||
        String(acc.phone || "").toLowerCase().includes(query) ||
        String(acc.customerId || "").toLowerCase().includes(query)
    );
  }, [accounts, searchQuery]);

  return (
    <div
      className={
        embedded
          ? "w-full space-y-4 sm:space-y-5"
          : "min-h-dvh w-full overflow-x-hidden bg-[#f6f9f7] flex flex-col lg:flex-row font-sans antialiased text-slate-800 selection:bg-emerald-100 selection:text-emerald-900"
      }
    >
      {!embedded && <Sidebar />}

      <div
        className={
          embedded
            ? "w-full space-y-4 sm:space-y-5"
            : "flex-1 min-w-0 w-full p-4 sm:p-6 lg:p-8 pt-20 sm:pt-22 lg:pt-22 lg:overflow-y-auto lg:max-h-dvh space-y-4 sm:space-y-5"
        }
      >
    {/* Top Executive Page Header */}
    <PageHeader
      icon={Users}
      title={
        activeCustomerTab === "roster"
          ? "Customer Directory"
          : "Account Moderation & Infractions"
      }
      subtitle="Directory, verification status, and moderation for VegGo customers."
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing || loading} actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExportingCsv}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs sm:text-sm font-bold shadow-xs cursor-pointer disabled:opacity-60"
            title="Export customers to Excel / CSV (Limit: 500)"
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
            title="Download Customer PDF  (Limit: 500)"
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
    {errorMessage && (
      <div
        className="px-4 py-3.5 rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 text-xs sm:text-sm font-semibold flex items-center gap-3 shadow-2xs"
      >
        <AlertCircle size={18} className="text-amber-600 shrink-0" />
        <span className="min-w-0 break-words flex-1">
          {errorMessage}
        </span>
        <button
          onClick={() => setErrorMessage("")}
          className="p-1 rounded-lg hover:bg-amber-100 shrink-0 cursor-pointer text-amber-700"
        >
          <X size={16} />
        </button>
      </div>
    )}

    {/* Executive Metric Stat Cards from /api/admin/customers/stats */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500">Total Customers</span>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Users size={16} />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-black text-slate-900">
          <AnimatedValue value={totalCustomersStat} />
        </div>
        <span className="text-[11px] text-slate-400 font-medium">Customer base</span>
      </div>

      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500">Active This Month</span>
          <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <CheckCircle2 size={16} />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-black text-teal-700">
          <AnimatedValue value={activeThisMonthStat} />
        </div>
        <span className="text-[11px] text-slate-400 font-medium">Active shoppers</span>
      </div>

      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500">Premium Customers</span>
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Sparkles size={16} />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-black text-amber-600">
          <AnimatedValue value={premiumSubscribersStat} />
        </div>
        <span className="text-[11px] text-slate-400 font-medium">Club members</span>
      </div>

      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500">Suspended Accounts</span>
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center ${suspendedOrBlockedStat > 0
              ? "bg-rose-50 text-rose-600"
              : "bg-slate-50 text-slate-500"
              }`}
          >
            <ShieldAlert size={16} />
          </div>
        </div>
        <div
          className={`text-2xl sm:text-3xl font-black ${suspendedOrBlockedStat > 0 ? "text-rose-600" : "text-slate-900"
            }`}
        >
          <AnimatedValue value={suspendedOrBlockedStat} />
        </div>
        <span className="text-[11px] text-slate-400 font-medium">Restricted / blocked</span>
      </div>
    </div>

    {/* Segmented View Tabs Navigation (Directory, Moderation) */}
    <div className="bg-white p-2 rounded-2xl border border-emerald-100/80 shadow-2xs">
      <SegmentedTabs
        tabs={customerTabs}
        activeTab={activeCustomerTab}
        onTabChange={handleTabChange}
      />
    </div>

    {/* Sub-Filters: ONLY visible when "Customer Directory" is selected */}
    {activeCustomerTab === "roster" && (
      <div className="flex flex-wrap items-center gap-2.5 py-1">
        {/* 1. All Customers */}
        <button
          type="button"
          onClick={handleSelectAllInRoster}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${!isBlockedFilter && !sortOrder
            ? "bg-emerald-700 text-white shadow-xs"
            : "bg-white hover:bg-emerald-50 text-slate-700 border border-emerald-100/90 shadow-2xs"
            }`}
        >
          <Users
            size={14}
            className={!isBlockedFilter && !sortOrder ? "text-emerald-100" : "text-emerald-700"}
          />
          <span>All Customers</span>
          {counts.total > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${!isBlockedFilter && !sortOrder
                ? "bg-emerald-800 text-emerald-100"
                : "bg-slate-100 text-slate-700"
                }`}
            >
              {counts.total}
            </span>
          )}
        </button>

        {/* 2. Blocked Only */}
        <button
          type="button"
          onClick={handleToggleBlocked}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${isBlockedFilter
            ? "bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-500/30"
            : "bg-white hover:bg-emerald-50 text-slate-700 border border-emerald-100/90 shadow-2xs"
            }`}
        >
          <UserX
            size={14}
            className={isBlockedFilter ? "text-emerald-200" : "text-rose-600"}
          />
          <span>Blocked Only</span>
          {counts.blocked > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${isBlockedFilter
                ? "bg-emerald-800 text-emerald-100"
                : "bg-slate-100 text-slate-700"
                }`}
            >
              {counts.blocked}
            </span>
          )}
        </button>

        {/* 3. Sort by: Newest First */}
        <button
          type="button"
          onClick={() => handleSetSortOrder("newest")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${sortOrder === "newest"
            ? "bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-500/30"
            : "bg-white hover:bg-emerald-50 text-slate-700 border border-emerald-100/90 shadow-2xs"
            }`}
          title="Sort customer records by newest registered first"
        >
          <Sparkles
            size={14}
            className={sortOrder === "newest" ? "text-emerald-200" : "text-amber-500"}
          />
          <span>Newest First</span>
        </button>

        {/* 4. Sort by: Oldest First */}
        <button
          type="button"
          onClick={() => handleSetSortOrder("oldest")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${sortOrder === "oldest"
            ? "bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-500/30"
            : "bg-white hover:bg-emerald-50 text-slate-700 border border-emerald-100/90 shadow-2xs"
            }`}
          title="Sort customer records by oldest registered first"
        >
          <Clock
            size={14}
            className={sortOrder === "oldest" ? "text-emerald-200" : "text-slate-500"}
          />
          <span>Oldest First</span>
        </button>

        {/* Reset button if any filter/sort is applied */}
        {(isBlockedFilter || sortOrder) && (
          <button
            type="button"
            onClick={handleSelectAllInRoster}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer"
            title="Reset filters"
          >
            <X size={12} />
            <span>Reset Filters</span>
          </button>
        )}
      </div>
    )}

    {/* Workflow Rules Information Bar */}
    <WorkflowRulesBar
      rulesText={
        activeCustomerTab === "moderation"
          ? "Review customer infractions, reported flags, and security actions."
          : isBlockedFilter
            ? sortOrder === "oldest"
              ? "Showing suspended or blocked customer accounts sorted from oldest first."
              : "Showing customer accounts that are currently suspended or blocked from ordering."
            : sortOrder === "oldest"
              ? "Showing customer directory sorted from oldest registered users first."
              : "Complete consumer directory across registrations, contact information, and account access."
      }
      showingCount={filteredAccounts.length}
      itemLabel={
        activeCustomerTab === "moderation"
          ? "moderated accounts"
          : "customers"
      }
    />

    {/* Search Bar */}
    <div className="relative w-full">
      <Search
        className="absolute left-4 top-3.5 text-slate-400"
        size={18}
      />
      <input
        type="text"
        placeholder={
          activeCustomerTab === "moderation"
            ? "Search flagged customers by name, phone, or infraction..."
            : "Search customers by name, phone, or email..."
        }
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-slate-400 shadow-2xs"
      />
    </div>

    {/* Main Content Section */}
    <section className="w-full">
      {loading ? (
        <div className="py-20 text-center text-slate-400 bg-white rounded-3xl border border-slate-200/80">
          <div className="flex flex-col items-center justify-center gap-3 text-xs font-semibold text-slate-500">
            <RefreshCw
              size={22}
              className="animate-spin text-emerald-600"
            />
            Loading customer records...
          </div>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <EmptyState
          icon={activeCustomerTab === "moderation" ? Flag : Users}
          title={`No ${activeCustomerTab === "moderation" ? "flagged accounts" : "customers"} found`}
          description={
            searchQuery
              ? `No records matched "${searchQuery}". Try searching with a different name, phone, or ID.`
              : isBlockedFilter
                ? "There are currently no suspended or blocked customer accounts."
                : "There are currently no customer records found matching the selected criteria."
          }
        />
      ) : (
        <div className={UI_TABLE.container}>
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full min-w-[900px] text-left border-collapse">
              <thead>
                <tr className={UI_TABLE.thead}>
                  <th className={`${UI_TABLE.th} w-[26%] min-w-[200px]`}>Customer Profile</th>

                  {activeCustomerTab === "roster" ? (
                    <>
                      <th className={`${UI_TABLE.th} w-[20%] min-w-[150px]`}>Phone Number</th>
                      <th className={`${UI_TABLE.thCenter} w-[14%] min-w-[110px]`}>Total Orders</th>
                      <th className={`${UI_TABLE.thCenter} w-[14%] min-w-[120px]`}>Total Complaints</th>
                    </>
                  ) : (
                    <>
                      <th className={`${UI_TABLE.thCenter} w-[16%] min-w-[120px]`}>Flags Raised</th>
                      <th className={`${UI_TABLE.th} w-[32%] min-w-[200px]`}>Primary Infraction</th>
                    </>
                  )}

                  <th className={`${UI_TABLE.thCenter} w-[12%] min-w-[100px]`}>Status</th>
                  <th className={`${UI_TABLE.thCenter} w-[14%] min-w-[210px]`}>Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredAccounts.map((account, index) => {
                  return (
                    <tr
                      key={account.customerId || account.userId || index}
                      className={UI_TABLE.tr}
                    >
                      {/* Common Profile Column */}
                      <td className={UI_TABLE.td}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`${UI_AVATAR.container} ${getAvatarColor(account.fullName)}`}>
                            {account.fullName?.charAt(0)?.toUpperCase() || "C"}
                          </div>
                          <div className="flex flex-col min-w-0 max-w-[180px] sm:max-w-[220px]">
                            <span
                              className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors text-xs sm:text-sm truncate block leading-tight"
                              title={account.fullName}
                            >
                              {account.fullName || "Anonymous Customer"}
                            </span>
                            {account.email && (
                              <span
                                className="text-[11px] text-slate-400 truncate block leading-tight font-normal mt-0.5"
                                title={account.email}
                              >
                                {account.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Tab-Specific Columns */}
                      {activeCustomerTab === "roster" ? (
                        <>
                          {/* Phone Number */}
                          <td className={UI_TABLE.td}>
                            <div className="flex items-center gap-2 text-slate-800 font-mono text-xs font-semibold">
                              <Phone size={13} className="text-emerald-600 shrink-0" />
                              <span>{account.phone || "-"}</span>
                            </div>
                          </td>

                          {/* Total Orders */}
                          <td className={UI_TABLE.tdCenter}>
                            <span
                              className={Number(account.totalOrders) > 0 ? UI_BADGES.counterActive : UI_BADGES.counterNeutral}
                              title={`${account.totalOrders ?? 0} total orders`}
                            >
                              {account.totalOrders ?? 0}
                            </span>
                          </td>

                          {/* Total Complaints */}
                          <td className={UI_TABLE.tdCenter}>
                            <span
                              className={Number(account.totalComplaints) > 0 ? UI_BADGES.counterAlert : UI_BADGES.counterNeutral}
                              title={`${account.totalComplaints ?? 0} total complaints`}
                            >
                              {Number(account.totalComplaints) > 0 && <AlertCircle size={11} className="mr-1 shrink-0" />}
                              {account.totalComplaints ?? 0}
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          {/* Flags Raised */}
                          <td className={UI_TABLE.tdCenter}>
                            <span
                              className={Number(account.flagsRaised) > 0 ? UI_BADGES.counterWarning : UI_BADGES.counterNeutral}
                              title={`${account.flagsRaised ?? 0} flags raised`}
                            >
                              <Flag size={11} className={`mr-1 shrink-0 ${Number(account.flagsRaised) > 0 ? "text-amber-600" : "text-slate-400"}`} />
                              <span>{account.flagsRaised ?? 0}</span>
                            </span>
                          </td>

                          {/* Primary Infraction */}
                          <td className={UI_TABLE.td}>
                            <div className="flex items-center gap-2 max-w-[240px]">
                              <span
                                className={`p-1.5 rounded-lg shrink-0 ${account.flagsRaised > 0
                                    ? "bg-rose-50 text-rose-600 border border-rose-200/80"
                                    : "bg-slate-50 text-slate-400 border border-slate-200/60"
                                  }`}
                              >
                                <ShieldAlert size={13} />
                              </span>
                              <span className="truncate text-slate-700 font-medium">
                                {account.primaryInfraction || "None"}
                              </span>
                            </div>
                          </td>
                        </>
                      )}

                      {/* Status Column */}
                      <td className={UI_TABLE.tdCenter}>
                        <span className={account.blocked ? UI_BADGES.statusBlocked : UI_BADGES.statusActive}>
                          <span className={account.blocked ? UI_BADGES.statusDotBlocked : UI_BADGES.statusDotActive} />
                          <span>{account.blocked ? "Blocked" : "Active"}</span>
                        </span>
                      </td>

                      {/* Actions Column */}
                      <td className={UI_TABLE.tdCenter}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleViewCustomer(account)}
                            disabled={isRefreshing || detailsLoading}
                            className={UI_BUTTONS.view}
                            title="View Customer Details"
                          >
                            <Eye size={13} className="text-slate-500" />
                            <span>View</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => initiateToggleStatus(account)}
                            disabled={isRefreshing}
                            className={account.blocked ? UI_BUTTONS.success : UI_BUTTONS.warning}
                            title={
                              account.blocked
                                ? "Restore Access"
                                : "Block Customer"
                            }
                          >
                            {account.blocked ? (
                              <>
                                <ShieldCheck size={13} />
                                <span>Restore</span>
                              </>
                            ) : (
                              <>
                                <UserX size={13} />
                                <span>Block</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => initiateDelete(account)}
                            disabled={isRefreshing}
                            className={UI_BUTTONS.danger}
                            title="Delete Customer Account"
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile / Tablet Responsive Cards */}
          <div className="lg:hidden p-3.5 sm:p-4 divide-y divide-slate-100">
            {filteredAccounts.map((account, index) => (
              <div
                key={account.customerId || account.userId || index}
                className="py-4 first:pt-0 last:pb-0 space-y-3"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`${UI_AVATAR.container} ${getAvatarColor(account.fullName)}`}>
                      {account.fullName?.charAt(0)?.toUpperCase() || "C"}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 truncate" title={account.fullName}>
                        {account.fullName || "Anonymous Customer"}
                      </h4>
                      {activeCustomerTab === "roster" && account.phone && (
                        <p className="text-xs text-slate-500 font-mono truncate">
                          {account.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className={`${account.blocked ? UI_BADGES.statusBlocked : UI_BADGES.statusActive} shrink-0`}>
                    <span className={account.blocked ? UI_BADGES.statusDotBlocked : UI_BADGES.statusDotActive} />
                    <span>{account.blocked ? "Blocked" : "Active"}</span>
                  </span>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  {activeCustomerTab === "roster" ? (
                    <>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          Total Orders
                        </span>
                        <span className={Number(account.totalOrders) > 0 ? UI_BADGES.counterActive : UI_BADGES.counterNeutral}>
                          {account.totalOrders ?? 0}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          Complaints
                        </span>
                        <span className={Number(account.totalComplaints) > 0 ? UI_BADGES.counterAlert : UI_BADGES.counterNeutral}>
                          {Number(account.totalComplaints) > 0 && <AlertCircle size={10} className="mr-0.5" />}
                          {account.totalComplaints ?? 0}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          Flags
                        </span>
                        <span className={Number(account.flagsRaised) > 0 ? UI_BADGES.counterWarning : UI_BADGES.counterNeutral}>
                          {account.flagsRaised ?? 0}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                          Infraction
                        </span>
                        <span className="font-bold text-slate-900 truncate block">
                          {account.primaryInfraction || "None"}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Mobile Actions */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    onClick={() => handleViewCustomer(account)}
                    disabled={isRefreshing || detailsLoading}
                    className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 transition-colors"
                  >
                    <Eye size={13} className="text-slate-500" />
                    View
                  </button>
                  <button
                    onClick={() => initiateToggleStatus(account)}
                    disabled={isRefreshing}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 transition-colors ${account.blocked
                        ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200"
                      }`}
                  >
                    {account.blocked ? (
                      <>
                        <ShieldCheck size={13} /> Restore
                      </>
                    ) : (
                      <>
                        <UserX size={13} /> Block
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => initiateDelete(account)}
                    disabled={isRefreshing}
                    className="py-2 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 transition-colors"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Table Footer with Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-slate-600">
              <span>
                Showing Page {currentPage + 1} of {totalPages} (
                {totalElements} total entries)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 0 || loading}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <ChevronLeft size={16} />
                  <span className="hidden sm:inline">Prev</span>
                </button>

                <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 font-mono">
                  {currentPage + 1}
                </span>

                <button
                  type="button"
                  disabled={currentPage >= totalPages - 1 || loading}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  </div>

  {/* Confirmation Modal for Block / Unblock / Delete */ }
  {modalConfig.isOpen && modalConfig.account && (
      <ConfirmModal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        onConfirm={handleConfirmAction}
        type={modalConfig.action === "unblock" ? "success" : "danger"}
        title={
          modalConfig.action === "delete"
            ? "Delete Customer Account"
            : modalConfig.action === "unblock"
              ? "Restore Account Access"
              : "Restrict Account Access"
        }
        message={
          modalConfig.action === "delete"
            ? `Are you sure you want to permanently delete the account of ${modalConfig.account.fullName}? This cannot be undone.`
            : modalConfig.action === "unblock"
              ? `Restore full platform privileges and ordering capability for ${modalConfig.account.fullName}?`
              : `Block and suspend access for ${modalConfig.account.fullName}? They will not be able to log in or checkout.`
        }
        confirmText={
          modalConfig.action === "delete"
            ? actionLoading
              ? "Deleting..."
              : "Yes, Delete Account"
            : modalConfig.action === "unblock"
              ? actionLoading
                ? "Restoring..."
                : "Yes, Restore Access"
              : actionLoading
                ? "Blocking..."
                : "Yes, Block Account"
        }
        cancelText="Cancel"
      />
    )}

  {/* Complete Customer Details Modal */ }
  {
    customerDetails && (
      <div
        className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={closeDetails}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 bg-white text-slate-900 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0 relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-base shrink-0">
                {customerDetails.fullName?.charAt(0)?.toUpperCase() || "C"}
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                  {customerDetails.fullName}
                </h3>
              </div>
            </div>

            <button
              onClick={closeDetails}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors shrink-0 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-5">
            {detailsLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-2 text-sm text-slate-500">
                <RefreshCw
                  size={20}
                  className="animate-spin text-emerald-600"
                />
                Loading customer dossier...
              </div>
            ) : (
              <>
                {/* Summary Banner */}
                <div className="grid grid-cols-2 gap-3 p-3.5 bg-gradient-to-r from-emerald-50/70 to-teal-50/50 rounded-2xl border border-emerald-100/80">
                  {activeCustomerTab === "roster" ? (
                    <>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">
                          Total Orders
                        </span>
                        <span className="text-sm sm:text-base font-black text-slate-900 font-mono">
                          {customerDetails.totalOrders ?? 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">
                          Total Complaints
                        </span>
                        <span className={`text-sm sm:text-base font-black font-mono ${(customerDetails.totalComplaints ?? 0) > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                          {customerDetails.totalComplaints ?? 0}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">
                          Flags Raised
                        </span>
                        <span className={`text-sm sm:text-base font-black font-mono ${(customerDetails.flagsRaised ?? 0) > 0 ? "text-amber-600" : "text-slate-900"}`}>
                          {customerDetails.flagsRaised ?? 0} Flags
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">
                          Primary Infraction
                        </span>
                        <span className="text-sm sm:text-base font-black text-slate-900 truncate block">
                          {customerDetails.primaryInfraction || "None"}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Detailed Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {customerDetails.phone ? (
                    <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Phone Number
                      </span>
                      <p className="mt-1 font-semibold text-sm text-slate-800">
                        {customerDetails.phone}
                      </p>
                    </div>
                  ) : null}

                  {customerDetails.registrationDate ? (
                    <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Registration Date
                      </span>
                      <p className="mt-1 font-semibold text-sm text-slate-800 font-mono">
                        {formatDate(customerDetails.registrationDate)}
                      </p>
                    </div>
                  ) : null}

                  <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Flags Raised
                    </span>
                    <p className="mt-1 font-semibold text-sm text-slate-800 flex items-center gap-1.5">
                      <Flag size={14} className="text-amber-500" />
                      {customerDetails.flagsRaised ?? 0} reports
                    </p>
                  </div>

                  <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Primary Infraction
                    </span>
                    <p className="mt-1 font-semibold text-sm text-slate-800 truncate">
                      {customerDetails.primaryInfraction || "None"}
                    </p>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${customerDetails.blocked
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                  >
                    {customerDetails.blocked ? (
                      <ShieldAlert size={13} />
                    ) : (
                      <CheckCircle2 size={13} />
                    )}
                    {customerDetails.blocked ? "Account Blocked" : "Active Account"}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${customerDetails.verified
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-50 text-slate-600 border-slate-200"
                      }`}
                  >
                    {customerDetails.verified ? (
                      <ShieldCheck size={13} />
                    ) : (
                      <Clock size={13} />
                    )}
                    {customerDetails.verified
                      ? "Verified Identity"
                      : "Standard Profile"}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <button
                onClick={() => initiateToggleStatus(customerDetails)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border cursor-pointer transition-all ${customerDetails.blocked
                  ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                  : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                  }`}
              >
                {customerDetails.blocked ? (
                  <ShieldCheck size={15} />
                ) : (
                  <UserX size={15} />
                )}
                {customerDetails.blocked
                  ? "Restore Access"
                  : "Block Access"}
              </button>

              <button
                onClick={() => initiateDelete(customerDetails)}
                className="px-4 py-2.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
              >
                <Trash2 size={15} />
                Delete Account
              </button>
            </div>

            <button
              onClick={closeDetails}
              className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              Close Dossier
            </button>
          </div>
        </div>
      </div>
    )}

  </div>
);
  }