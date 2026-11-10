import React, { useCallback, useEffect, useState } from "react";
import EmptyState from "../../../components/common/EmptyState";
import {
  RefreshCw,
  Clock,
  Eye,
  CheckCircle2,
  XCircle,
  X,
  Phone,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  GitPullRequest,
  Ban,
} from "lucide-react";
import {
  getChangeRequests,
  getChangeRequestDetail,
  approveChangeRequest,
  rejectChangeRequest,
} from "../services/deliveryChangeRequestService";

const REASON_MAX = 500;

const SECTIONS = {
  BASIC_INFO: "Basic info",
  LICENSE: "License",
  VEHICLE: "Vehicle",
  BANK: "Bank",
};

const FIELD_LABELS = {
  fullName: "Full name",
  cityOfOperation: "City of operation",
  licenseNumber: "License number",
  vehicleType: "Vehicle type",
  plateNumber: "Plate number",
  vehicleModel: "Vehicle model",
  manufactureYear: "Manufacture year",
  bankName: "Bank name",
  accountHolderName: "Account holder",
  accountNumber: "Account number",
  ifscCode: "IFSC code",
};

const DOC_LABELS = {
  LICENSE: "License photo",
  VEHICLE: "Insurance document",
  BANK: "Bank proof",
};

const STATUS_STYLES = {
  PENDING: { cls: "bg-amber-50 text-amber-700 border-amber-200", Icon: Clock },
  APPROVED: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: CheckCircle2 },
  REJECTED: { cls: "bg-rose-50 text-rose-700 border-rose-200", Icon: XCircle },
  CANCELLED: { cls: "bg-slate-100 text-slate-600 border-slate-200", Icon: Ban },
};

const STATUS_FILTERS = [
  { id: "", label: "Queue (Pending)" },
  { id: "APPROVED", label: "Approved" },
  { id: "REJECTED", label: "Rejected" },
  { id: "CANCELLED", label: "Cancelled" },
];

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const waitingTime = (value) => {
  if (!value) return "";
  const ms = Date.now() - new Date(value).getTime();
  if (Number.isNaN(ms) || ms < 0) return "";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m waiting`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h waiting`;
  return `${Math.floor(hrs / 24)}d waiting`;
};

const errMsg = (err, fallback) =>
  err?.response?.data?.message || err?.response?.data?.error || fallback;

const sameJson = (a, b) =>
  JSON.stringify(a || {}) === JSON.stringify(b || {});

const StatusChip = ({ status }) => {
  const meta = STATUS_STYLES[status] || STATUS_STYLES.PENDING;
  const { Icon } = meta;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${meta.cls}`}>
      <Icon size={11} />
      {status}
    </span>
  );
};

const DocPreview = ({ title, url }) => (
  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col">
    <div className="p-2.5 border-b border-slate-100 bg-slate-50/70 text-xs font-bold text-slate-800">
      {title}
    </div>
    {url ? (
      <>
        <div className="h-44 bg-slate-100 flex items-center justify-center overflow-hidden">
          <img
            src={url}
            alt={title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
        <div className="p-2.5 border-t border-slate-100 flex justify-end">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
          >
            Open file <ExternalLink size={11} />
          </a>
        </div>
      </>
    ) : (
      <div className="h-44 flex items-center justify-center text-xs text-slate-400 font-medium">
        No document
      </div>
    )}
  </div>
);

/**
 * Change requests for verified delivery-partner details.
 * - Default: review queue (PENDING, oldest first) with status/section filters.
 * - With `userId`: that rider's full history (used inside the rider detail popup).
 */
export default function ChangeRequestsPanel({ userId = "", compact = false }) {
  const [statusFilter, setStatusFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(
    async (nextPage = 0, status = statusFilter, section = sectionFilter) => {
      try {
        setLoading(true);
        setError("");
        const params = { page: nextPage, size: 20 };
        if (userId) params.userId = userId;
        if (status) params.status = status;
        if (section) params.section = section;
        const response = await getChangeRequests(params);
        const data = response?.data || response || {};
        setItems(Array.isArray(data.content) ? data.content : Array.isArray(data) ? data : []);
        setTotalPages(data.totalPages || 1);
        setPage(nextPage);
      } catch (err) {
        console.error("Change Requests Error:", err);
        setError(errMsg(err, "Unable to load change requests."));
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [userId, statusFilter, sectionFilter]
  );

  useEffect(() => {
    load(0, statusFilter, sectionFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const changeStatus = (id) => {
    setStatusFilter(id);
    load(0, id, sectionFilter);
  };
  const changeSection = (id) => {
    const next = sectionFilter === id ? "" : id;
    setSectionFilter(next);
    load(0, statusFilter, next);
  };

  const openReview = async (item) => {
    setSelected(item);
    setActionError("");
    setShowRejectBox(false);
    setRejectReason("");
    try {
      setDetailLoading(true);
      const response = await getChangeRequestDetail(item.id);
      setSelected(response?.data || response || item);
    } catch (err) {
      setActionError(errMsg(err, "Unable to load the full change request."));
    } finally {
      setDetailLoading(false);
    }
  };

  const closeReview = () => {
    if (actionLoading) return;
    setSelected(null);
    setShowRejectBox(false);
    setRejectReason("");
    setActionError("");
  };

  const reloadSelected = async (id) => {
    try {
      const response = await getChangeRequestDetail(id);
      setSelected(response?.data || response);
    } catch (e) {
      /* keep current view */
    }
  };

  const handleApprove = async () => {
    try {
      setActionLoading(true);
      setActionError("");
      await approveChangeRequest(selected.id);
      setSelected(null);
      await load(page);
    } catch (err) {
      setActionError(errMsg(err, "Unable to approve this change request."));
      if (err?.response?.status === 409) await reloadSelected(selected.id);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const reason = rejectReason.trim();
    if (!reason) {
      setActionError("Please enter a reason. It is shown to the rider.");
      return;
    }
    try {
      setActionLoading(true);
      setActionError("");
      await rejectChangeRequest(selected.id, reason);
      setSelected(null);
      setShowRejectBox(false);
      setRejectReason("");
      await load(page);
    } catch (err) {
      setActionError(errMsg(err, "Unable to reject this change request."));
      if (err?.response?.status === 409) await reloadSelected(selected.id);
    } finally {
      setActionLoading(false);
    }
  };

  const isPending = selected?.status === "PENDING";
  const payoutsBlock =
    selected?.section === "BANK" && Number(selected?.pendingPayoutRequests) > 0;
  const drifted =
    selected && selected.previous && selected.current && !sameJson(selected.previous, selected.current);
  const fieldKeys = selected
    ? Array.from(
        new Set([
          ...Object.keys(selected.requested || {}),
          ...Object.keys(selected.current || {}),
        ])
      )
    : [];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2.5">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.id || "queue"}
            type="button"
            onClick={() => changeStatus(f.id)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              statusFilter === f.id
                ? "bg-emerald-700 text-white shadow-xs"
                : "bg-white hover:bg-emerald-50 text-slate-700 border border-emerald-100/90 shadow-2xs"
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="w-px h-5 bg-slate-200 mx-1" />
        {Object.entries(SECTIONS).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => changeSection(id)}
            className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              sectionFilter === id
                ? "bg-slate-800 text-white"
                : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => load(page)}
          className="ml-auto p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer"
          title="Refresh"
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-emerald-600" : "text-slate-600"} />
        </button>
      </div>

      {!compact && (
        <p className="text-xs font-semibold text-slate-500">
          {userId
            ? "Full change-request history for this rider."
            : "Approved riders asking to change verified details. Live details stay unchanged until you approve. Oldest first."}
        </p>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs font-semibold text-rose-800">
          <AlertCircle size={16} className="shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-14 text-center bg-white rounded-3xl border border-slate-200/80 text-xs font-semibold text-slate-500 flex flex-col items-center gap-3">
          <RefreshCw size={22} className="animate-spin text-emerald-600" />
          Loading change requests...
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={GitPullRequest}
          title={statusFilter || userId ? "No change requests found" : "No change requests waiting"}
          description="Nothing matches the current filters."
        />
      ) : (
        <div className="bg-white rounded-3xl border border-emerald-100/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase font-bold tracking-wider text-slate-500 bg-slate-50/60">
                  {!userId && <th className="py-3.5 px-5">Rider</th>}
                  <th className="py-3.5 px-5">Section</th>
                  <th className="py-3.5 px-5">Submitted</th>
                  <th className="py-3.5 px-5 text-center">Status</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} className="text-xs font-semibold text-slate-800 hover:bg-emerald-50/40">
                    {!userId && (
                      <td className="py-4 px-5">
                        <span className="font-bold text-slate-900 block text-sm">{item.fullName || "-"}</span>
                        {item.phone && (
                          <span className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                            <Phone size={11} className="text-emerald-600" />
                            {item.phone}
                          </span>
                        )}
                      </td>
                    )}
                    <td className="py-4 px-5">
                      <span className="font-bold text-slate-900">{SECTIONS[item.section] || item.section}</span>
                      {item.section === "BANK" && item.status === "PENDING" && Number(item.pendingPayoutRequests) > 0 && (
                        <span className="mt-1 flex items-center gap-1 text-[10px] font-bold text-amber-700">
                          <AlertTriangle size={11} />
                          {item.pendingPayoutRequests} payout request(s) waiting
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-5 text-slate-600 font-medium">
                      {formatDateTime(item.submittedAt)}
                      {item.status === "PENDING" && (
                        <span className="block text-[10px] text-slate-400">{waitingTime(item.submittedAt)}</span>
                      )}
                    </td>
                    <td className="py-4 px-5 text-center">
                      <StatusChip status={item.status} />
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => openReview(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer font-bold text-xs"
                      >
                        <Eye size={13} />
                        {item.status === "PENDING" ? "Review" : "View"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>
                Page <strong className="text-slate-800">{page + 1}</strong> of{" "}
                <strong className="text-slate-800">{totalPages}</strong>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page === 0 || loading}
                  onClick={() => load(page - 1)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages - 1 || loading}
                  onClick={() => load(page + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Review screen */}
      {selected && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/40 via-teal-50/30 to-white">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {SECTIONS[selected.section] || selected.section} change
                    {selected.fullName ? ` · ${selected.fullName}` : ""}
                  </h3>
                  <StatusChip status={selected.status} />
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Submitted {formatDateTime(selected.submittedAt)}
                  {selected.phone ? ` • ${selected.phone}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={closeReview}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X size={19} />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {detailLoading ? (
                <div className="py-20 text-center flex flex-col items-center gap-3 text-xs font-semibold text-slate-600">
                  <RefreshCw size={26} className="animate-spin text-emerald-600" />
                  Loading change request...
                </div>
              ) : (
                <>
                  {actionError && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                      <AlertCircle size={16} className="shrink-0 text-rose-600" />
                      <span>{actionError}</span>
                    </div>
                  )}

                  {isPending && drifted && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                      <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <span className="font-semibold">
                        The rider's live details changed after this request was sent (current differs from what the profile held at request time). Compare against the current values below before deciding.
                      </span>
                    </div>
                  )}

                  {isPending && payoutsBlock && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                      <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <span className="font-semibold">
                        This rider has {selected.pendingPayoutRequests} payout request(s) waiting. Settle them first, then approve.
                      </span>
                    </div>
                  )}

                  {/* Current vs requested */}
                  <div className="rounded-2xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-[11px] uppercase tracking-wider font-bold text-slate-500">
                          <th className="py-2.5 px-4 w-1/4">Field</th>
                          <th className="py-2.5 px-4">Current (live)</th>
                          <th className="py-2.5 px-4">Requested</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {fieldKeys.map((key) => {
                          const cur = selected.current?.[key];
                          const req = selected.requested?.[key];
                          const differs = String(cur ?? "") !== String(req ?? "");
                          return (
                            <tr key={key} className={differs ? "bg-emerald-50/50" : ""}>
                              <td className="py-2.5 px-4 font-bold text-slate-600">{FIELD_LABELS[key] || key}</td>
                              <td className={`py-2.5 px-4 font-semibold text-slate-800 ${key === "accountNumber" || key === "licenseNumber" || key === "plateNumber" || key === "ifscCode" ? "font-mono" : ""} ${differs ? "line-through decoration-rose-400/70 text-slate-500" : ""}`}>
                                {cur ?? "-"}
                              </td>
                              <td className={`py-2.5 px-4 font-bold ${key === "accountNumber" || key === "licenseNumber" || key === "plateNumber" || key === "ifscCode" ? "font-mono" : ""} ${differs ? "text-emerald-800" : "text-slate-700"}`}>
                                {req ?? "-"}
                                {differs && (
                                  <span className="ml-2 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-emerald-600 text-white align-middle">
                                    CHANGED
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Documents side by side */}
                  {selected.section !== "BASIC_INFO" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <DocPreview
                        title={`Current ${DOC_LABELS[selected.section] || "document"} (live)`}
                        url={selected.currentDocumentUrl}
                      />
                      <DocPreview
                        title={`New ${DOC_LABELS[selected.section] || "document"} (requested)`}
                        url={selected.documentUrl}
                      />
                    </div>
                  )}

                  {/* Decision */}
                  {!isPending && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                      <span className="font-bold text-slate-900 block">
                        {selected.status === "APPROVED" && "Approved"}
                        {selected.status === "REJECTED" && "Rejected"}
                        {selected.status === "CANCELLED" && "Cancelled by the rider"}
                        {selected.decidedAt ? ` · ${formatDateTime(selected.decidedAt)}` : ""}
                      </span>
                      {selected.decidedBy && (
                        <span className="text-slate-500 block">By admin {selected.decidedBy}</span>
                      )}
                      {selected.reason && <p className="font-medium text-slate-700">Reason: {selected.reason}</p>}
                    </div>
                  )}

                  {isPending && showRejectBox && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3">
                      <label className="block text-xs font-bold text-rose-900">
                        Reason for rejection <span className="text-rose-600">*</span>{" "}
                        <span className="font-medium text-rose-700">(shown to the rider)</span>
                      </label>
                      <textarea
                        rows={3}
                        maxLength={REASON_MAX}
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Tell the rider why this change was not approved (e.g., Proof does not match the account holder name)..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-rose-500"
                      />
                      <div className="text-right text-[10px] font-semibold text-rose-700">
                        {rejectReason.length}/{REASON_MAX}
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
                          className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
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

            {!detailLoading && !showRejectBox && (
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row items-center gap-3">
                {isPending ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowRejectBox(true)}
                      disabled={actionLoading}
                      className="w-full sm:flex-1 py-3 px-4 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 text-xs font-bold cursor-pointer inline-flex items-center justify-center gap-2"
                    >
                      <XCircle size={16} />
                      Reject Change
                    </button>
                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={actionLoading || payoutsBlock}
                      title={payoutsBlock ? "Settle the rider's waiting payout requests first" : ""}
                      className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer inline-flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                      Approve Change
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={closeReview}
                    className="ml-auto px-5 py-2 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-100 text-xs font-bold cursor-pointer"
                  >
                    Close
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
