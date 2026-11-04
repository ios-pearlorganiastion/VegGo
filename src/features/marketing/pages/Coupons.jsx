import { useCallback, useEffect, useRef, useState, memo } from 'react';
import {
  Ticket,
  Plus,
  Search,
  Edit3,
  Trash2,
  Power,
  PowerOff,
  X,
  Save,
  Loader2,
  Users,
  History,
  Copy,
  Check,
  EyeOff,
  Info,
} from 'lucide-react';

import PageHeader from '../../../components/common/PageHeader';
import EmptyState from '../../../components/common/EmptyState';
import ConfirmModal from '../../../components/common/ConfirmModal';
import DateTimePicker from '../../../components/common/DateTimePicker';
import PaginationBar from '../../products/components/PaginationBar';
import StatusBadge from '../components/StatusBadge';
import FilterChips from '../components/FilterChips';
import { Field, ToggleRow, inputClass, selectClass, textareaClass } from '../components/Field';

import {
  getCoupons,
  createCoupon,
  updateCoupon,
  setCouponStatus,
  deleteCoupon,
  getCouponRedemptions,
} from '../services/couponService';

import {
  AUDIENCE_LABELS,
  PERIOD_LABELS,
  extractPage,
  formatMoney,
  formatSchedule,
  formatUtcAsIst,
  fromInputDateTime,
  getErrorMessage,
  istInputToMs,
  toInputDateTime,
} from '../utils';

const PAGE_SIZE = 20;

const STATUS_FILTERS = [
  { id: 'ALL', label: 'All' },
  { id: 'LIVE', label: 'Live' },
  { id: 'SCHEDULED', label: 'Scheduled' },
  { id: 'EXPIRED', label: 'Expired' },
  { id: 'DISABLED', label: 'Disabled' },
  { id: 'USED_UP', label: 'Used up' },
];

const EMPTY_FORM = {
  code: '',
  description: '',
  discountType: 'PERCENT',
  discountValue: '',
  maxDiscount: '',
  minOrderAmount: '',
  startsAt: '',
  endsAt: '',
  audience: 'EVERYONE',
  minPreviousOrders: '1',
  totalUsageLimit: '',
  totalBudget: '',
  perCustomerLimit: '',
  perCustomerPeriod: 'LIFETIME',
  listed: true,
  enabled: true,
};

const numToStr = (v) => (v === null || v === undefined ? '' : String(v));

const couponToForm = (c) => ({
  code: c.code || '',
  description: c.description || '',
  discountType: c.discountType || 'PERCENT',
  discountValue: numToStr(c.discountValue),
  maxDiscount: c.discountType === 'PERCENT' ? numToStr(c.maxDiscount) : '',
  minOrderAmount: Number(c.minOrderAmount) > 0 ? numToStr(c.minOrderAmount) : '',
  startsAt: toInputDateTime(c.startsAtIst),
  endsAt: toInputDateTime(c.endsAtIst),
  audience: c.audience || 'EVERYONE',
  minPreviousOrders:
    c.audience === 'RETURNING_CUSTOMERS' ? numToStr(c.minPreviousOrders || 1) : '1',
  totalUsageLimit: numToStr(c.totalUsageLimit),
  totalBudget: numToStr(c.totalBudget),
  perCustomerLimit: numToStr(c.perCustomerLimit),
  perCustomerPeriod: c.perCustomerPeriod || 'LIFETIME',
  listed: c.listed !== false,
  enabled: c.enabled !== false,
});

const isPositiveInt = (v) => /^\d+$/.test(String(v).trim()) && Number(v) >= 1;

/** Mirrors the server rules so the admin gets instant feedback. Server stays the authority. */
const validateForm = (f, { isEdit }) => {
  const code = f.code.trim();

  if (!code) return 'Coupon code is required';
  if (!/^[A-Za-z0-9_-]{3,40}$/.test(code)) {
    return 'Code must be 3-40 characters: letters, digits, "-" or "_"';
  }
  if (f.description.length > 255) return 'Description can be at most 255 characters';

  const value = Number(f.discountValue);
  const min = f.minOrderAmount === '' ? 0 : Number(f.minOrderAmount);

  if (f.discountValue === '' || Number.isNaN(value)) return 'Discount value is required';

  if (f.discountType === 'PERCENT') {
    if (value < 1 || value > 100) return 'A percentage coupon must be between 1 and 100';
    if (f.maxDiscount === '' || Number(f.maxDiscount) <= 0) {
      return 'A percentage coupon needs a maximum discount (cap per checkout)';
    }
  } else {
    if (value <= 0) return 'Flat discount must be greater than 0';
    if (min > 0 && value > min) return 'Flat discount cannot be higher than the minimum order amount';
  }

  if (f.minOrderAmount !== '' && (Number.isNaN(min) || min < 0)) {
    return 'Minimum order amount cannot be negative';
  }

  if (f.startsAt && f.endsAt) {
    if (istInputToMs(f.endsAt) <= istInputToMs(f.startsAt)) {
      return 'End date must be after the start date';
    }
  }
  if (!isEdit && f.endsAt && istInputToMs(f.endsAt) <= Date.now()) {
    return 'End date is already in the past';
  }

  if (f.audience === 'RETURNING_CUSTOMERS' && f.minPreviousOrders !== '' && !isPositiveInt(f.minPreviousOrders)) {
    return 'Minimum previous orders must be 1 or more';
  }
  if (f.totalUsageLimit !== '' && !isPositiveInt(f.totalUsageLimit)) {
    return 'Total usage limit must be a whole number, 1 or more';
  }
  if (f.totalBudget !== '' && !(Number(f.totalBudget) > 0)) {
    return 'Total budget must be greater than 0';
  }
  if (f.perCustomerLimit !== '' && !isPositiveInt(f.perCustomerLimit)) {
    return 'Per-customer limit must be a whole number, 1 or more';
  }

  return '';
};

const buildPayload = (f) => {
  const payload = {
    code: f.code.trim(),
    discountType: f.discountType,
    discountValue: Number(f.discountValue),
    audience: f.audience,
    listed: Boolean(f.listed),
    enabled: Boolean(f.enabled),
  };

  if (f.description.trim()) payload.description = f.description.trim();
  if (f.discountType === 'PERCENT') payload.maxDiscount = Number(f.maxDiscount);
  if (f.minOrderAmount !== '' && Number(f.minOrderAmount) > 0) {
    payload.minOrderAmount = Number(f.minOrderAmount);
  }

  const startsAt = fromInputDateTime(f.startsAt);
  const endsAt = fromInputDateTime(f.endsAt);
  if (startsAt) payload.startsAt = startsAt;
  if (endsAt) payload.endsAt = endsAt;

  if (f.audience === 'RETURNING_CUSTOMERS') {
    payload.minPreviousOrders = f.minPreviousOrders === '' ? 1 : parseInt(f.minPreviousOrders, 10);
  }
  if (f.totalUsageLimit !== '') payload.totalUsageLimit = parseInt(f.totalUsageLimit, 10);
  if (f.totalBudget !== '') payload.totalBudget = Number(f.totalBudget);
  if (f.perCustomerLimit !== '') {
    payload.perCustomerLimit = parseInt(f.perCustomerLimit, 10);
    payload.perCustomerPeriod = f.perCustomerPeriod;
  }

  return payload;
};

const describeOffer = (f) => {
  const value = Number(f.discountValue);
  if (!value) return '';

  const min = Number(f.minOrderAmount) > 0 ? ` on orders of ${formatMoney(f.minOrderAmount)} or more` : '';

  if (f.discountType === 'PERCENT') {
    const cap = Number(f.maxDiscount) > 0 ? ` (up to ${formatMoney(f.maxDiscount)})` : '';
    return `${value}% off${cap}${min}`;
  }
  return `${formatMoney(value)} off${min}`;
};

const CopyCodeButton = memo(function CopyCodeButton({ code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be blocked; ignore */
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy code"
      className="p-1 rounded-md text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
    >
      {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
    </button>
  );
});

const OfferCell = memo(function OfferCell({ coupon }) {
  const isPercent = coupon.discountType === 'PERCENT';

  return (
    <div className="flex flex-col">
      <span className="text-sm font-black text-emerald-700">
        {isPercent ? `${Number(coupon.discountValue)}% OFF` : `${formatMoney(coupon.discountValue)} OFF`}
      </span>
      {isPercent && (
        <span className="text-[11px] text-slate-500 font-medium">up to {formatMoney(coupon.maxDiscount)}</span>
      )}
      <span className="text-[11px] text-slate-500 font-medium">
        {Number(coupon.minOrderAmount) > 0 ? `Min order ${formatMoney(coupon.minOrderAmount)}` : 'No minimum'}
      </span>
    </div>
  );
});

const UsageCell = memo(function UsageCell({ coupon }) {
  return (
    <div className="flex flex-col gap-0.5 text-[11px] font-medium text-slate-600">
      <span>
        <b className="text-slate-900">{coupon.usesCount ?? 0}</b>
        {' / '}
        {coupon.totalUsageLimit ?? '∞'} uses
      </span>
      <span>
        <b className="text-slate-900">{formatMoney(coupon.budgetUsed ?? 0)}</b>
        {' / '}
        {coupon.totalBudget != null ? formatMoney(coupon.totalBudget) : '∞'} given
      </span>
      <span>{coupon.customersCount ?? 0} customers</span>
    </div>
  );
});

const RulesCell = memo(function RulesCell({ coupon }) {
  return (
    <div className="flex flex-col gap-0.5 text-[11px] font-medium text-slate-600">
      <span>{AUDIENCE_LABELS[coupon.audience] || coupon.audience}</span>
      {coupon.audience === 'RETURNING_CUSTOMERS' && coupon.minPreviousOrders > 0 && (
        <span>≥ {coupon.minPreviousOrders} earlier order(s)</span>
      )}
      <span>
        {coupon.perCustomerLimit
          ? `${coupon.perCustomerLimit} per customer (${PERIOD_LABELS[coupon.perCustomerPeriod] || coupon.perCustomerPeriod})`
          : 'No per-customer limit'}
      </span>
    </div>
  );
});

const ActionButtons = memo(function ActionButtons({ coupon, busy, onEdit, onToggle, onDelete, onRedemptions, isMobile = false }) {
  if (isMobile) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 border-t border-slate-100">
        <button
          type="button"
          onClick={() => onRedemptions(coupon)}
          className="h-8.5 px-3 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
        >
          <History size={13} className="text-emerald-600" />
          <span>Usage</span>
        </button>

        <button
          type="button"
          onClick={() => onEdit(coupon)}
          className="h-8.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-200/90 hover:border-emerald-600 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
        >
          <Edit3 size={13} />
          <span>Edit</span>
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => onToggle(coupon)}
          className={`h-8.5 px-3 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all shadow-2xs border cursor-pointer disabled:opacity-50 ${coupon.enabled
              ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200/90'
              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200/90'
            }`}
        >
          {busy ? (
            <Loader2 size={13} className="animate-spin text-current" />
          ) : coupon.enabled ? (
            <>
              <PowerOff size={13} />
              <span>Disable</span>
            </>
          ) : (
            <>
              <Power size={13} />
              <span>Enable</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => onDelete(coupon)}
          className="h-8.5 px-3 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
        >
          <Trash2 size={13} />
          <span>Delete</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1.5 flex-nowrap">
      <button
        type="button"
        title="View redemptions & usage"
        onClick={() => onRedemptions(coupon)}
        className="h-8 px-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
      >
        <History size={13} className="text-emerald-600" />
        <span>Usage</span>
      </button>

      <button
        type="button"
        title="Edit coupon"
        onClick={() => onEdit(coupon)}
        className="h-8 px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-200/90 hover:border-emerald-600 text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
      >
        <Edit3 size={13} />
        <span>Edit</span>
      </button>

      <button
        type="button"
        disabled={busy}
        title={coupon.enabled ? 'Switch off coupon' : 'Switch on coupon'}
        onClick={() => onToggle(coupon)}
        className={`h-8 px-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-2xs border cursor-pointer disabled:opacity-50 ${coupon.enabled
            ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200/90'
            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200/90'
          }`}
      >
        {busy ? (
          <Loader2 size={13} className="animate-spin text-current" />
        ) : coupon.enabled ? (
          <>
            <PowerOff size={13} />
            <span>Disable</span>
          </>
        ) : (
          <>
            <Power size={13} />
            <span>Enable</span>
          </>
        )}
      </button>

      <button
        type="button"
        title="Delete coupon"
        onClick={() => onDelete(coupon)}
        className="h-8 px-2.5 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
      >
        <Trash2 size={13} />
        <span>Delete</span>
      </button>
    </div>
  );
});

export default function Coupons() {
  const [coupons, setCoupons] = useState([]);
  const [pageInfo, setPageInfo] = useState({ totalElements: 0, totalPages: 1 });
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  // create / edit panel
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // delete
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // redemptions
  const [redeemCoupon, setRedeemCoupon] = useState(null);
  const [redeemData, setRedeemData] = useState({ content: [], totalElements: 0, totalPages: 1, page: 0 });
  const [redeemPage, setRedeemPage] = useState(0);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemError, setRedeemError] = useState('');

  const requestIdRef = useRef(0);

  // ---- debounce search ----
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery((prev) => {
        const next = searchInput.trim();
        if (prev !== next) setPage(0);
        return next;
      });
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ---- auto-hide success toast ----
  useEffect(() => {
    if (!successMessage) return undefined;
    const t = setTimeout(() => setSuccessMessage(''), 4000);
    return () => clearTimeout(t);
  }, [successMessage]);

  // ---- load list ----
  const loadCoupons = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setErrorMessage('');

    try {
      const response = await getCoupons({
        status: statusFilter,
        search: searchQuery,
        page,
        size: PAGE_SIZE,
      });

      if (requestId !== requestIdRef.current) return;

      if (response?.success === false) {
        setErrorMessage(response.message || 'Failed to load coupons');
        setCoupons([]);
        return;
      }

      const result = extractPage(response);
      setCoupons(result.content);
      setPageInfo({ totalElements: result.totalElements, totalPages: result.totalPages });
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      console.error('Failed to load coupons:', error);
      setErrorMessage(getErrorMessage(error, 'Failed to load coupons'));
      setCoupons([]);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [statusFilter, searchQuery, page]);

  useEffect(() => {
    // fetch-on-change; loadCoupons guards against out-of-order responses
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCoupons();
  }, [loadCoupons, refreshKey]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey((k) => k + 1);
  };

  const handleStatusFilter = (id) => {
    setStatusFilter(id);
    setPage(0);
  };

  // ---- panel ----
  const openCreate = () => {
    setEditingCoupon(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setIsPanelOpen(true);
  };

  const openEdit = (coupon) => {
    setEditingCoupon(coupon);
    setForm(couponToForm(coupon));
    setFormError('');
    setIsPanelOpen(true);
  };

  const closePanel = () => {
    if (saving) return;
    setIsPanelOpen(false);
    setEditingCoupon(null);
    setFormError('');
  };

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async (e) => {
    e?.preventDefault();

    const message = validateForm(form, { isEdit: Boolean(editingCoupon) });
    if (message) {
      setFormError(message);
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      const payload = buildPayload(form);
      const response = editingCoupon
        ? await updateCoupon(editingCoupon.id, payload)
        : await createCoupon(payload);

      setSuccessMessage(response?.message || (editingCoupon ? 'Coupon updated' : 'Coupon created'));
      setIsPanelOpen(false);
      setEditingCoupon(null);

      if (!editingCoupon) {
        // new coupons sort first; make sure the admin can see it
        setStatusFilter('ALL');
        setSearchInput('');
        setSearchQuery('');
        setPage(0);
      }
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error('Failed to save coupon:', error);
      setFormError(getErrorMessage(error, 'Failed to save coupon'));
    } finally {
      setSaving(false);
    }
  };

  // ---- on / off ----
  const handleToggle = async (coupon) => {
    setActionLoading(coupon.id);
    setErrorMessage('');

    try {
      const response = await setCouponStatus(coupon.id, !coupon.enabled);
      const updated = response?.data;

      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, ...(updated || { enabled: !coupon.enabled }) } : c))
      );
      setSuccessMessage(
        !coupon.enabled
          ? `${coupon.code} switched on`
          : `${coupon.code} switched off - its banners are hidden too`
      );
    } catch (error) {
      console.error('Failed to change coupon status:', error);
      setErrorMessage(getErrorMessage(error, 'Failed to change coupon status'));
    } finally {
      setActionLoading(null);
    }
  };

  // ---- delete ----
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setErrorMessage('');

    try {
      const response = await deleteCoupon(deleteTarget.id);
      setSuccessMessage(response?.message || `${deleteTarget.code} deleted`);
      setDeleteTarget(null);

      if (coupons.length === 1 && page > 0) setPage((p) => p - 1);
      else setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error('Failed to delete coupon:', error);
      setDeleteTarget(null);
      setErrorMessage(getErrorMessage(error, 'Failed to delete coupon'));
    } finally {
      setDeleting(false);
    }
  };

  // ---- redemptions ----
  const loadRedemptions = useCallback(async (coupon, pageNo) => {
    setRedeemLoading(true);
    setRedeemError('');

    try {
      const response = await getCouponRedemptions(coupon.id, { page: pageNo, size: 10 });
      setRedeemData(extractPage(response));
    } catch (error) {
      console.error('Failed to load redemptions:', error);
      setRedeemError(getErrorMessage(error, 'Failed to load redemptions'));
      setRedeemData({ content: [], totalElements: 0, totalPages: 1, page: 0 });
    } finally {
      setRedeemLoading(false);
    }
  }, []);

  const openRedemptions = (coupon) => {
    setRedeemCoupon(coupon);
    setRedeemPage(0);
    loadRedemptions(coupon, 0);
  };

  const changeRedeemPage = (nextPage) => {
    setRedeemPage(nextPage);
    loadRedemptions(redeemCoupon, nextPage);
  };

  const hasBeenUsed =
    Boolean(editingCoupon) && ((editingCoupon.usesCount ?? 0) > 0 || Number(editingCoupon.budgetUsed) > 0);

  const offerPreview = describeOffer(form);

  return (
    <div className="w-full space-y-5 sm:space-y-6">
      <PageHeader
        icon={Ticket}
        title="Coupons"
        stats={[{ label: 'Coupons', value: pageInfo.totalElements }]}
        actionButtonText="New Coupon"
        actionButtonIcon={Plus}
        onActionClick={openCreate}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing || loading}
      />

      {/* Toasts */}
      {errorMessage && (
        <div
          className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center gap-3 text-xs sm:text-sm font-semibold text-amber-900 shadow-2xs"
        >
          <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
          <span className="flex-1">{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage('')} className="text-amber-700 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {successMessage && (
        <div
          className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center gap-3 text-xs sm:text-sm font-semibold text-emerald-900 shadow-2xs"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="flex-1">{successMessage}</span>
        </div>
      )}

      <FilterChips options={STATUS_FILTERS} value={statusFilter} onChange={handleStatusFilter} />

      <div className="relative w-full">
        <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Search coupons by code or description..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-slate-400 shadow-2xs"
        />
      </div>

      {/* List */}
      {loading && coupons.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs py-16 flex flex-col items-center gap-3 text-slate-400">
          <Loader2 size={32} className="animate-spin text-emerald-600" />
          <span className="text-xs font-semibold">Loading coupons...</span>
        </div>
      ) : coupons.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="No coupons found"
          description="There are no coupons for this filter or search yet."
          actionText="Create Coupon"
          onAction={openCreate}
        />
      ) : (
        <div className={`bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden ${loading ? 'opacity-70' : ''}`}>
          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full min-w-[980px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase font-semibold tracking-wider text-slate-600 bg-slate-50/80">
                  <th className="py-4 px-5">Coupon</th>
                  <th className="py-4 px-5">Offer</th>
                  <th className="py-4 px-5">Valid (IST)</th>
                  <th className="py-4 px-5">Who / limits</th>
                  <th className="py-4 px-5">Usage</th>
                  <th className="py-4 px-5 text-center">Status</th>
                  <th className="py-4 px-5 text-right min-w-[340px]">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {coupons.map((coupon) => (
                  <tr
                    key={coupon.id}
                    className="text-xs font-semibold text-black hover:bg-emerald-50/40 align-top"
                  >
                    <td className="py-4 px-5">
                      <div className="flex flex-col gap-1 max-w-[220px]">
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-black text-sm tracking-wide text-slate-900">
                            {coupon.code}
                          </span>
                          <CopyCodeButton code={coupon.code} />
                        </div>
                        {coupon.description && (
                          <span className="text-[11px] text-slate-500 font-medium line-clamp-2">
                            {coupon.description}
                          </span>
                        )}
                        {coupon.listed === false && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500">
                            <EyeOff size={11} /> Hidden code (not listed)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-5"><OfferCell coupon={coupon} /></td>
                    <td className="py-4 px-5 text-[11px] font-medium text-slate-600 max-w-[200px]">
                      {formatSchedule(coupon.startsAtIst, coupon.endsAtIst)}
                    </td>
                    <td className="py-4 px-5"><RulesCell coupon={coupon} /></td>
                    <td className="py-4 px-5"><UsageCell coupon={coupon} /></td>
                    <td className="py-4 px-5 text-center"><StatusBadge status={coupon.status} /></td>
                    <td className="py-4 px-5">
                      <ActionButtons
                        coupon={coupon}
                        busy={actionLoading === coupon.id}
                        onEdit={openEdit}
                        onToggle={handleToggle}
                        onDelete={setDeleteTarget}
                        onRedemptions={openRedemptions}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile / tablet cards */}
          <div className="lg:hidden divide-y divide-slate-100">
            {coupons.map((coupon) => (
              <div key={coupon.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-black text-sm text-slate-900">{coupon.code}</span>
                      <CopyCodeButton code={coupon.code} />
                    </div>
                    {coupon.description && (
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">{coupon.description}</p>
                    )}
                  </div>
                  <StatusBadge status={coupon.status} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <OfferCell coupon={coupon} />
                  <UsageCell coupon={coupon} />
                </div>

                <RulesCell coupon={coupon} />

                <p className="text-[11px] font-medium text-slate-500">
                  {formatSchedule(coupon.startsAtIst, coupon.endsAtIst)} (IST)
                </p>

                <ActionButtons
                  coupon={coupon}
                  busy={actionLoading === coupon.id}
                  onEdit={openEdit}
                  onToggle={handleToggle}
                  onDelete={setDeleteTarget}
                  onRedemptions={openRedemptions}
                  isMobile={true}
                />
              </div>
            ))}
          </div>

          <div className="px-5 pb-5">
            <PaginationBar
              page={page}
              totalPages={pageInfo.totalPages}
              totalElements={pageInfo.totalElements}
              pageSize={PAGE_SIZE}
              itemsOnPage={coupons.length}
              disabled={loading}
              label="coupons"
              onPageChange={setPage}
            />
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      {isPanelOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
        >
          <div
            className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 shadow-2xl border border-slate-100 relative"
          >
            <button
              type="button"
              onClick={closePanel}
              disabled={saving}
              className="absolute right-5 top-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50 z-10 cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3.5 mb-6 pr-8">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-2xl flex items-center justify-center">
                {editingCoupon ? <Edit3 size={20} /> : <Plus size={20} />}
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-400 tracking-wider uppercase">
                  Coupon Management
                </span>
                <h3 className="text-lg font-bold text-black">
                  {editingCoupon ? `Edit ${editingCoupon.code}` : 'Create Coupon'}
                </h3>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                  {formError}
                </div>
              )}

              {editingCoupon && (
                <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 text-[11px] font-semibold text-sky-800 flex gap-2">
                  <Info size={14} className="shrink-0 mt-0.5" />
                  <span>
                    Saving replaces all the rules: a limit you leave empty means &quot;no limit&quot;.
                    {hasBeenUsed && ' This coupon has been used, so its code and discount type are locked.'}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Code" required hint="3-40 chars: letters, digits, - or _. Stored in UPPER-CASE.">
                  <input
                    type="text"
                    value={form.code}
                    disabled={hasBeenUsed}
                    onChange={(e) => setField('code', e.target.value.toUpperCase())}
                    placeholder="WELCOME10"
                    maxLength={40}
                    className={`${inputClass} font-mono uppercase`}
                  />
                </Field>

                <Field label="Discount type" required>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-50 border border-slate-200 rounded-xl">
                    {['PERCENT', 'FLAT'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        disabled={hasBeenUsed}
                        onClick={() => setField('discountType', type)}
                        className={`h-[30px] rounded-lg text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${form.discountType === type
                            ? 'bg-white text-emerald-800 shadow-xs border border-emerald-200'
                            : 'text-slate-500 hover:text-slate-800'
                          }`}
                      >
                        {type === 'PERCENT' ? 'Percentage (%)' : 'Flat amount (₹)'}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>

              <Field label="Description" hint="Shown to customers in the offers list.">
                <textarea
                  rows={2}
                  maxLength={255}
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  placeholder="10% off your first order"
                  className={textareaClass}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field
                  label={form.discountType === 'PERCENT' ? 'Discount (%)' : 'Discount (₹)'}
                  required
                  hint={form.discountType === 'PERCENT' ? '1 to 100' : 'Not above the minimum order'}
                >
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.discountValue}
                    onChange={(e) => setField('discountValue', e.target.value)}
                    className={inputClass}
                  />
                </Field>

                {form.discountType === 'PERCENT' && (
                  <Field label="Max discount (₹)" required hint="Cap for one checkout">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.maxDiscount}
                      onChange={(e) => setField('maxDiscount', e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                )}

                <Field label="Min order (₹)" hint="On items total; delivery + platform fee excluded">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.minOrderAmount}
                    onChange={(e) => setField('minOrderAmount', e.target.value)}
                    placeholder="0"
                    className={inputClass}
                  />
                </Field>
              </div>

              {offerPreview && (
                <div className="px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-xs font-bold text-emerald-800">
                  Offer: {offerPreview}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Starts at (IST)" hint="Empty = starts immediately">
                  <DateTimePicker
                    value={form.startsAt}
                    onChange={(val) => setField('startsAt', val)}
                    placeholder="Starts immediately"
                  />
                </Field>

                <Field label="Ends at (IST)" hint="Empty = never ends. End moment is exclusive.">
                  <DateTimePicker
                    value={form.endsAt}
                    onChange={(val) => setField('endsAt', val)}
                    placeholder="Never ends"
                    min={form.startsAt}
                    align="right"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Audience">
                  <select
                    value={form.audience}
                    onChange={(e) => setField('audience', e.target.value)}
                    className={selectClass}
                  >
                    {Object.entries(AUDIENCE_LABELS).map(([id, label]) => (
                      <option key={id} value={id}>{label}</option>
                    ))}
                  </select>
                </Field>

                {form.audience === 'RETURNING_CUSTOMERS' && (
                  <Field label="Min previous orders" hint="Cancelled orders never count">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={form.minPreviousOrders}
                      onChange={(e) => setField('minPreviousOrders', e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Total usage limit" hint="Uses across all customers (a checkout = 1 use). Empty = unlimited.">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.totalUsageLimit}
                    onChange={(e) => setField('totalUsageLimit', e.target.value)}
                    placeholder="Unlimited"
                    className={inputClass}
                  />
                </Field>

                <Field label="Total budget (₹)" hint="Max rupees the coupon may give away. Empty = unlimited.">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.totalBudget}
                    onChange={(e) => setField('totalBudget', e.target.value)}
                    placeholder="Unlimited"
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Per-customer limit" hint="Empty = no limit per customer">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.perCustomerLimit}
                    onChange={(e) => setField('perCustomerLimit', e.target.value)}
                    placeholder="No limit"
                    className={inputClass}
                  />
                </Field>

                <Field label="Per-customer period" hint="Day = midnight-midnight, week = Mon-Sun (IST)">
                  <select
                    value={form.perCustomerPeriod}
                    disabled={form.perCustomerLimit === ''}
                    onChange={(e) => setField('perCustomerPeriod', e.target.value)}
                    className={selectClass}
                  >
                    <option value="DAY">Per day</option>
                    <option value="WEEK">Per week</option>
                    <option value="MONTH">Per month</option>
                    <option value="LIFETIME">Lifetime</option>
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ToggleRow
                  title="Listed"
                  subtitle={form.listed ? 'Shown in customers\u2019 offers list' : 'Hidden code: works only when typed'}
                  checked={form.listed}
                  onChange={(v) => setField('listed', v)}
                />
                <ToggleRow
                  title="Enabled"
                  subtitle={form.enabled ? 'Kill switch is ON' : 'Switched off: cannot be applied'}
                  checked={form.enabled}
                  onChange={(v) => setField('enabled', v)}
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={closePanel}
                  disabled={saving}
                  className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-sm rounded-2xl border border-slate-100 transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-600/15 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? 'Saving...' : editingCoupon ? 'Save Changes' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Redemptions modal */}
      {redeemCoupon && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
        >
          <div
            className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-6 shadow-2xl border border-slate-100 relative"
          >
            <button
              type="button"
              onClick={() => setRedeemCoupon(null)}
              className="absolute right-5 top-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors z-10 cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3.5 mb-5 pr-8">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-2xl flex items-center justify-center">
                <Users size={20} />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-400 tracking-wider uppercase">
                  Redemptions
                </span>
                <h3 className="text-lg font-bold text-black font-mono">{redeemCoupon.code}</h3>
              </div>
            </div>

            {redeemError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                {redeemError}
              </div>
            )}

            {redeemLoading ? (
              <div className="py-12 flex flex-col items-center gap-3 text-slate-400">
                <Loader2 size={28} className="animate-spin text-emerald-600" />
                <span className="text-xs font-semibold">Loading...</span>
              </div>
            ) : redeemData.content.length === 0 ? (
              <div className="py-12 text-center text-xs font-semibold text-slate-500">
                Nobody has used this coupon yet.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full min-w-[560px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] uppercase font-semibold tracking-wider text-slate-600 bg-slate-50/80">
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Discount</th>
                      <th className="py-3 px-4">Orders</th>
                      <th className="py-3 px-4">Used at (IST)</th>
                      <th className="py-3 px-4">State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {redeemData.content.map((r) => (
                      <tr key={r.redemptionId} className="text-xs font-semibold text-black">
                        <td className="py-3 px-4 font-mono">{r.phone || r.userId}</td>
                        <td className="py-3 px-4 font-mono">{formatMoney(r.discount)}</td>
                        <td className="py-3 px-4 text-[11px] text-slate-600 font-medium">{r.orderNumbers || '-'}</td>
                        <td className="py-3 px-4 text-[11px] text-slate-600 font-medium">{formatUtcAsIst(r.usedAt)}</td>
                        <td className="py-3 px-4">
                          {r.released ? (
                            <span
                              className="text-[11px] font-bold text-slate-500"
                              title={`Given back ${formatUtcAsIst(r.releasedAt)}`}
                            >
                              Given back
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-emerald-700">Used</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <PaginationBar
              page={redeemPage}
              totalPages={redeemData.totalPages}
              totalElements={redeemData.totalElements}
              pageSize={10}
              itemsOnPage={redeemData.content.length}
              disabled={redeemLoading}
              label="redemptions"
              onPageChange={changeRedeemPage}
            />
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete coupon?"
        message={
          deleteTarget
            ? `${deleteTarget.code} will be removed for good and its code can be reused. A coupon that has already been used cannot be deleted - switch it off instead.`
            : ''
        }
        confirmText={deleting ? 'Deleting...' : 'Delete'}
      />
    </div>
  );
}
