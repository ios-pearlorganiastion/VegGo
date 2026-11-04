import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import {
  Image as ImageIcon,
  Plus,
  Search,
  Edit3,
  Trash2,
  Power,
  PowerOff,
  X,
  Save,
  Loader2,
  Upload,
  Ticket,
  Layers,
  Package,
  AlertTriangle,
  Eye,
  EyeOff,
  Calendar,
} from 'lucide-react';

import PageHeader from '../../../components/common/PageHeader';
import EmptyState from '../../../components/common/EmptyState';
import ConfirmModal from '../../../components/common/ConfirmModal';
import DateTimePicker from '../../../components/common/DateTimePicker';
import PaginationBar from '../../products/components/PaginationBar';
import StatusBadge from '../components/StatusBadge';
import FilterChips from '../components/FilterChips';
import { Field, ToggleRow, inputClass, selectClass } from '../components/Field';

import {
  getBanners,
  createBanner,
  updateBanner,
  setBannerStatus,
  deleteBanner,
} from '../services/bannerService';
import { getCoupons } from '../services/couponService';
import { getAllCategories } from '../../products/services/categoryService';
import { getProducts, getProductById } from '../../products/services/productService';

import {
  extractPage,
  formatSchedule,
  fromInputDateTime,
  getErrorMessage,
  istInputToMs,
  toInputDateTime,
} from '../utils';

const PAGE_SIZE = 12;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const STATUS_FILTERS = [
  { id: 'ALL', label: 'All' },
  { id: 'LIVE', label: 'Live' },
  { id: 'SCHEDULED', label: 'Scheduled' },
  { id: 'EXPIRED', label: 'Expired' },
  { id: 'DISABLED', label: 'Disabled' },
];

const EMPTY_FORM = {
  title: '',
  subtitle: '',
  couponCode: '',
  actionType: 'NONE',
  actionTargetId: '',
  startsAt: '',
  endsAt: '',
  displayOrder: '',
  enabled: true,
};

const bannerToForm = (b) => ({
  title: b.title || '',
  subtitle: b.subtitle || '',
  couponCode: b.couponCode || '',
  actionType: b.actionType || 'NONE',
  actionTargetId: b.actionTargetId || '',
  startsAt: toInputDateTime(b.startsAtIst),
  endsAt: toInputDateTime(b.endsAtIst),
  displayOrder: b.displayOrder === null || b.displayOrder === undefined ? '' : String(b.displayOrder),
  enabled: b.enabled !== false,
});

const validateForm = (f, { isEdit, hasImage }) => {
  if (!f.title.trim()) return 'Banner title is required';
  if (f.title.trim().length > 120) return 'Title can be at most 120 characters';
  if (f.subtitle.length > 255) return 'Subtitle can be at most 255 characters';
  if (!isEdit && !hasImage) return 'Banner image is required';

  if (f.actionType !== 'NONE' && !f.actionTargetId) {
    return `Pick the ${f.actionType === 'CATEGORY' ? 'category' : 'product'} that a tap should open`;
  }

  if (f.displayOrder !== '' && !/^\d+$/.test(f.displayOrder)) {
    return 'Display order must be a whole number, 0 or more';
  }

  if (f.startsAt && f.endsAt && istInputToMs(f.endsAt) <= istInputToMs(f.startsAt)) {
    return 'End date must be after the start date';
  }

  return '';
};

/** Why isn't this banner visible to customers right now? (null when it is) */
const getHiddenReasons = (b) => {
  if (b.showing) return [];
  const reasons = [];

  if (b.status === 'DISABLED') reasons.push('Banner is switched off');
  if (b.status === 'SCHEDULED') reasons.push('Not started yet');
  if (b.status === 'EXPIRED') reasons.push('Schedule has ended');

  if (b.couponCode) {
    if (b.couponStatus === 'MISSING') reasons.push(`Coupon ${b.couponCode} was deleted`);
    else if (b.couponStatus && b.couponStatus !== 'LIVE') {
      reasons.push(`Coupon ${b.couponCode} is ${String(b.couponStatus).toLowerCase().replace('_', ' ')}`);
    }
  }

  if (b.actionType !== 'NONE' && b.targetAvailable === false) {
    reasons.push(`The ${String(b.actionType).toLowerCase()} it opens is gone or switched off`);
  }

  return reasons;
};

const ACTION_LABEL = { NONE: 'No action', CATEGORY: 'Opens category', PRODUCT: 'Opens product' };

function TargetPicker({ actionType, value, onChange, initialLabel }) {
  const [categories, setCategories] = useState([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');

  // label shown for the selected product: what the admin just picked, else the resolved one (edit mode)
  const productLabel = selectedLabel || initialLabel || '';
  const categoriesLoading = actionType === 'CATEGORY' && !categoriesLoaded;

  // categories: load once when needed
  useEffect(() => {
    if (actionType !== 'CATEGORY' || categoriesLoaded) return undefined;

    let cancelled = false;

    getAllCategories('active')
      .then((res) => {
        if (!cancelled && Array.isArray(res?.data)) setCategories(res.data);
      })
      .catch((err) => console.error('Failed to load categories:', err))
      .finally(() => {
        if (!cancelled) setCategoriesLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [actionType, categoriesLoaded]);

  // products: debounced server search
  useEffect(() => {
    if (actionType !== 'PRODUCT') return undefined;

    let cancelled = false;
    const t = setTimeout(async () => {
      setProductsLoading(true);
      try {
        const res = await getProducts({ search: productQuery.trim(), page: 0, size: 10 });
        if (cancelled) return;
        const list = extractPage(res).content.filter((p) => p.active !== false);
        setProductResults(list);
      } catch (err) {
        if (!cancelled) console.error('Failed to search products:', err);
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [actionType, productQuery]);

  if (actionType === 'NONE') return null;

  if (actionType === 'CATEGORY') {
    return (
      <Field label="Category to open" required>
        <select
          value={value}
          disabled={categoriesLoading}
          onChange={(e) => onChange(e.target.value)}
          className={selectClass}
        >
          <option value="">{categoriesLoading ? 'Loading categories...' : 'Select a category'}</option>
          {/* keep the current value selectable even if it is not in the active list */}
          {value && !categories.some((c) => String(c.id) === String(value)) && (
            <option value={value}>{initialLabel || value}</option>
          )}
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>
    );
  }

  return (
    <Field label="Product to open" required>
      {value && (
        <div className="mb-2 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-xs font-bold text-emerald-800">
          <span className="truncate">{productLabel || value}</span>
          <button
            type="button"
            onClick={() => {
              onChange('');
              setSelectedLabel('');
            }}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="relative">
        <Search size={14} className="absolute left-3 top-3 text-slate-400" />
        <input
          type="text"
          value={productQuery}
          onChange={(e) => setProductQuery(e.target.value)}
          placeholder="Search products by name..."
          className={`${inputClass} pl-9`}
        />
      </div>

      <div className="mt-2 max-h-40 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
        {productsLoading ? (
          <div className="p-3 flex items-center gap-2 text-[11px] font-semibold text-slate-500">
            <Loader2 size={13} className="animate-spin text-emerald-600" /> Searching...
          </div>
        ) : productResults.length === 0 ? (
          <div className="p-3 text-[11px] font-semibold text-slate-500">No active products found</div>
        ) : (
          productResults.map((p) => {
            const id = p.id || p.productId;
            const name = p.name || p.productName;
            const selected = String(id) === String(value);

            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  onChange(id);
                  setSelectedLabel(name);
                }}
                className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                  selected ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="truncate">{name}</span>
                <span className="text-[10px] text-slate-400 shrink-0">{p.categoryName || ''}</span>
              </button>
            );
          })
        )}
      </div>
    </Field>
  );
}

const BannerCard = memo(function BannerCard({ banner, busy, onEdit, onToggle, onDelete }) {
  const reasons = getHiddenReasons(banner);

  return (
    <div
      className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col"
    >
      <div className="relative aspect-[16/7] bg-slate-100">
        {banner.imageUrl ? (
          <img
            src={banner.imageUrl}
            alt={banner.title}
            className={`w-full h-full object-cover ${banner.enabled ? '' : 'grayscale opacity-70'}`}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <ImageIcon size={36} />
          </div>
        )}

        <div className="absolute top-3 left-3 flex items-center gap-2">
          <StatusBadge status={banner.status} className="bg-white/95 backdrop-blur" />
        </div>

        <div className="absolute top-3 right-3">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border backdrop-blur ${
              banner.showing
                ? 'bg-emerald-600/95 text-white border-emerald-500'
                : 'bg-white/95 text-slate-500 border-slate-200'
            }`}
            title={banner.showing ? 'Customers can see this banner right now' : 'Hidden from customers right now'}
          >
            {banner.showing ? <Eye size={11} /> : <EyeOff size={11} />}
            {banner.showing ? 'Showing' : 'Hidden'}
          </span>
        </div>

        <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded-lg bg-slate-900/70 text-white text-[10px] font-bold">
          Order #{banner.displayOrder ?? '-'}
        </span>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-black text-slate-900 truncate" title={banner.title}>{banner.title}</h3>
          {banner.subtitle && (
            <p className="text-[11px] text-slate-500 font-medium mt-0.5 line-clamp-2">{banner.subtitle}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {banner.couponCode && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border font-mono ${
                banner.couponStatus === 'LIVE' || !banner.couponStatus
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              <Ticket size={11} /> {banner.couponCode}
              {banner.couponStatus && banner.couponStatus !== 'LIVE' && (
                <span className="font-sans uppercase">· {String(banner.couponStatus).replace('_', ' ')}</span>
              )}
            </span>
          )}

          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            {banner.actionType === 'CATEGORY' ? <Layers size={11} /> : banner.actionType === 'PRODUCT' ? <Package size={11} /> : null}
            {ACTION_LABEL[banner.actionType] || banner.actionType}
          </span>
        </div>

        <p className="flex items-start gap-1.5 text-[11px] font-medium text-slate-500">
          <Calendar size={12} className="mt-0.5 shrink-0" />
          <span>{formatSchedule(banner.startsAtIst, banner.endsAtIst)} (IST)</span>
        </p>

        {reasons.length > 0 && (
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/70 text-[11px] font-semibold text-amber-800 flex gap-2">
            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
            <span>{reasons.join(' · ')}</span>
          </div>
        )}

        <div className="mt-auto grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            title="Edit banner"
            onClick={() => onEdit(banner)}
            className="h-8 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-200/90 hover:border-emerald-600 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
          >
            <Edit3 size={13} />
            <span>Edit</span>
          </button>

          <button
            type="button"
            disabled={busy}
            title={banner.enabled ? 'Switch off banner' : 'Switch on banner'}
            onClick={() => onToggle(banner)}
            className={`h-8 px-2 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all shadow-2xs border cursor-pointer disabled:opacity-50 ${
              banner.enabled
                ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200/90'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200/90'
            }`}
          >
            {busy ? (
              <Loader2 size={13} className="animate-spin text-current" />
            ) : banner.enabled ? (
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
            title="Delete banner"
            onClick={() => onDelete(banner)}
            className="h-8 px-2 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
          >
            <Trash2 size={13} />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
});

export default function Banners() {
  const [banners, setBanners] = useState([]);
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

  // panel
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [targetLabel, setTargetLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [couponOptions, setCouponOptions] = useState([]);

  // delete
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const requestIdRef = useRef(0);
  const fileInputRef = useRef(null);

  // debounce search
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

  useEffect(() => {
    if (!successMessage) return undefined;
    const t = setTimeout(() => setSuccessMessage(''), 4000);
    return () => clearTimeout(t);
  }, [successMessage]);

  // local preview URL for the picked file (revoked on change/unmount)
  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => {
    if (!imageFile) {
      setImagePreview('');
      return undefined;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const loadBanners = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setErrorMessage('');

    try {
      const response = await getBanners({
        status: statusFilter,
        search: searchQuery,
        page,
        size: PAGE_SIZE,
      });

      if (requestId !== requestIdRef.current) return;

      if (response?.success === false) {
        setErrorMessage(response.message || 'Failed to load banners');
        setBanners([]);
        return;
      }

      const result = extractPage(response);
      setBanners(result.content);
      setPageInfo({ totalElements: result.totalElements, totalPages: result.totalPages });
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      console.error('Failed to load banners:', error);
      setErrorMessage(getErrorMessage(error, 'Failed to load banners'));
      setBanners([]);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [statusFilter, searchQuery, page]);

  useEffect(() => {
    // fetch-on-change; loadBanners guards against out-of-order responses
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBanners();
  }, [loadBanners, refreshKey]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey((k) => k + 1);
  };

  const handleStatusFilter = (id) => {
    setStatusFilter(id);
    setPage(0);
  };

  // existing coupon codes for the picker (a banner can only advertise an existing coupon)
  const loadCouponOptions = useCallback(async () => {
    try {
      const response = await getCoupons({ page: 0, size: 100 });
      setCouponOptions(extractPage(response).content);
    } catch (error) {
      console.error('Failed to load coupons for picker:', error);
    }
  }, []);

  const resetImage = () => {
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openCreate = () => {
    setEditingBanner(null);
    setForm(EMPTY_FORM);
    setTargetLabel('');
    resetImage();
    setFormError('');
    setIsPanelOpen(true);
    loadCouponOptions();
  };

  const openEdit = (banner) => {
    setEditingBanner(banner);
    setForm(bannerToForm(banner));
    setTargetLabel('');
    resetImage();
    setFormError('');
    setIsPanelOpen(true);
    loadCouponOptions();

    // best-effort: show the name of the current tap target
    if (banner.actionType === 'PRODUCT' && banner.actionTargetId) {
      getProductById(banner.actionTargetId)
        .then((res) => {
          const p = res?.data?.product || res?.data;
          if (p?.name) setTargetLabel(p.name);
        })
        .catch(() => {});
    }
  };

  const closePanel = () => {
    if (saving) return;
    setIsPanelOpen(false);
    setEditingBanner(null);
    resetImage();
    setFormError('');
  };

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setFormError('Image must be a JPG, PNG or WEBP file');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setFormError('Image must be 5 MB or smaller');
      e.target.value = '';
      return;
    }

    setFormError('');
    setImageFile(file);
  };

  const handleSave = async (e) => {
    e?.preventDefault();

    const message = validateForm(form, {
      isEdit: Boolean(editingBanner),
      hasImage: Boolean(imageFile),
    });
    if (message) {
      setFormError(message);
      return;
    }

    setSaving(true);
    setFormError('');

    const data = {
      ...form,
      startsAt: fromInputDateTime(form.startsAt),
      endsAt: fromInputDateTime(form.endsAt),
    };

    try {
      const response = editingBanner
        ? await updateBanner(editingBanner.id, data, imageFile)
        : await createBanner(data, imageFile);

      setSuccessMessage(response?.message || (editingBanner ? 'Banner updated' : 'Banner created'));
      setIsPanelOpen(false);
      setEditingBanner(null);
      resetImage();

      if (!editingBanner) {
        setStatusFilter('ALL');
        setSearchInput('');
        setSearchQuery('');
        setPage(0);
      }
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error('Failed to save banner:', error);
      setFormError(getErrorMessage(error, 'Failed to save banner'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = useCallback(async (banner) => {
    setActionLoading(banner.id);
    setErrorMessage('');

    try {
      const response = await setBannerStatus(banner.id, !banner.enabled);
      const updated = response?.data;

      setBanners((prev) =>
        prev.map((b) => (b.id === banner.id ? { ...b, ...(updated || { enabled: !banner.enabled }) } : b))
      );
      setSuccessMessage(!banner.enabled ? 'Banner switched on' : 'Banner switched off');
    } catch (error) {
      console.error('Failed to change banner status:', error);
      setErrorMessage(getErrorMessage(error, 'Failed to change banner status'));
    } finally {
      setActionLoading(null);
    }
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setErrorMessage('');

    try {
      const response = await deleteBanner(deleteTarget.id);
      setSuccessMessage(response?.message || 'Banner deleted');
      setDeleteTarget(null);

      if (banners.length === 1 && page > 0) setPage((p) => p - 1);
      else setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error('Failed to delete banner:', error);
      setDeleteTarget(null);
      setErrorMessage(getErrorMessage(error, 'Failed to delete banner'));
    } finally {
      setDeleting(false);
    }
  };

  const shownImage = imagePreview || editingBanner?.imageUrl || '';

  // when editing a banner whose coupon is no longer in the picker list, keep it selectable
  const couponListHasCurrent = useMemo(
    () => !form.couponCode || couponOptions.some((c) => c.code.toLowerCase() === form.couponCode.toLowerCase()),
    [couponOptions, form.couponCode]
  );

  const liveCount = banners.filter((b) => b.showing).length;

  return (
    <div className="w-full space-y-5 sm:space-y-6">
      <PageHeader
        icon={ImageIcon}
        title="Banners"
        stats={[
          { label: 'Banners', value: pageInfo.totalElements },
          { label: 'Showing now (this page)', value: liveCount },
        ]}
        actionButtonText="New Banner"
        actionButtonIcon={Plus}
        onActionClick={openCreate}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing || loading}
      />

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
          placeholder="Search banners by title or subtitle..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-slate-400 shadow-2xs"
        />
      </div>

      {loading && banners.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs py-16 flex flex-col items-center gap-3 text-slate-400">
          <Loader2 size={32} className="animate-spin text-emerald-600" />
          <span className="text-xs font-semibold">Loading banners...</span>
        </div>
      ) : banners.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No banners found"
          description="There are no banners for this filter or search yet."
          actionText="Create Banner"
          onAction={openCreate}
        />
      ) : (
        <div className={loading ? 'opacity-70' : ''}>
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
            {banners.map((banner) => (
              <BannerCard
                key={banner.id}
                banner={banner}
                busy={actionLoading === banner.id}
                onEdit={openEdit}
                onToggle={handleToggle}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>

          <PaginationBar
            page={page}
            totalPages={pageInfo.totalPages}
            totalElements={pageInfo.totalElements}
            pageSize={PAGE_SIZE}
            itemsOnPage={banners.length}
            disabled={loading}
            label="banners"
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Create / Edit modal */}
      {isPanelOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
        >
          <div
            className="bg-white rounded-3xl w-full max-w-xl max-h-[92vh] overflow-y-auto p-6 shadow-2xl border border-slate-100 relative"
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
                  {editingBanner ? <Edit3 size={20} /> : <Plus size={20} />}
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 tracking-wider uppercase">
                    Banner Management
                  </span>
                  <h3 className="text-lg font-bold text-black">
                    {editingBanner ? 'Edit Banner' : 'Create Banner'}
                  </h3>
                </div>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                {formError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                    {formError}
                  </div>
                )}

                {editingBanner && (
                  <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 text-[11px] font-semibold text-sky-800">
                    Saving replaces the text fields: an empty subtitle, coupon, action or date is cleared.
                    The image, order and on/off keep their value unless you change them.
                  </div>
                )}

                {/* Image */}
                <Field label="Banner image" required={!editingBanner} hint="JPG, PNG or WEBP, up to 5 MB.">
                  <div className="border border-dashed border-slate-300 rounded-2xl overflow-hidden bg-slate-50">
                    {shownImage ? (
                      <div className="relative aspect-[16/7] bg-slate-100">
                        <img src={shownImage} alt="Banner preview" className="w-full h-full object-cover" />
                        {imageFile && (
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold">
                            New image
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="aspect-[16/7] flex flex-col items-center justify-center gap-1 text-slate-400">
                        <ImageIcon size={28} />
                        <span className="text-[11px] font-semibold">No image selected</span>
                      </div>
                    )}

                    <div className="p-2.5 flex items-center justify-between gap-2 bg-white border-t border-slate-200">
                      <span className="text-[11px] font-semibold text-slate-500 truncate">
                        {imageFile ? imageFile.name : editingBanner ? 'Keeping the current image' : ''}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {imageFile && (
                          <button
                            type="button"
                            onClick={resetImage}
                            className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer">
                          <Upload size={13} />
                          {shownImage ? 'Change' : 'Select'}
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleImageSelect}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </Field>

                <Field label="Title" required>
                  <input
                    type="text"
                    maxLength={120}
                    value={form.title}
                    onChange={(e) => setField('title', e.target.value)}
                    placeholder="Fresh Organic Veggies"
                    className={inputClass}
                  />
                </Field>

                <Field label="Subtitle">
                  <input
                    type="text"
                    maxLength={255}
                    value={form.subtitle}
                    onChange={(e) => setField('subtitle', e.target.value)}
                    placeholder="10% off with WELCOME10"
                    className={inputClass}
                  />
                </Field>

                <Field
                  label="Advertised coupon"
                  hint="Optional. Must be an existing coupon. The banner hides itself when the coupon is off, expired, used up or not usable by the customer."
                >
                  <select
                    value={form.couponCode}
                    onChange={(e) => setField('couponCode', e.target.value)}
                    className={selectClass}
                  >
                    <option value="">No coupon</option>
                    {!couponListHasCurrent && <option value={form.couponCode}>{form.couponCode}</option>}
                    {couponOptions.map((c) => (
                      <option key={c.id} value={c.code}>
                        {c.code}
                        {c.status && c.status !== 'LIVE' ? ` (${String(c.status).toLowerCase().replace('_', ' ')})` : ''}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="When tapped">
                    <select
                      value={form.actionType}
                      onChange={(e) => {
                        setField('actionType', e.target.value);
                        setField('actionTargetId', '');
                      }}
                      className={selectClass}
                    >
                      <option value="NONE">Do nothing</option>
                      <option value="CATEGORY">Open a category</option>
                      <option value="PRODUCT">Open a product</option>
                    </select>
                  </Field>

                  <Field label="Display order" hint="Lower comes first. Empty = at the bottom.">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.displayOrder}
                      onChange={(e) => setField('displayOrder', e.target.value)}
                      placeholder="Bottom"
                      className={inputClass}
                    />
                  </Field>
                </div>

                <TargetPicker
                  actionType={form.actionType}
                  value={form.actionTargetId}
                  onChange={(id) => setField('actionTargetId', id)}
                  initialLabel={targetLabel}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Starts at (IST)" hint="Empty = shows immediately">
                    <DateTimePicker
                      value={form.startsAt}
                      onChange={(val) => setField('startsAt', val)}
                      placeholder="Shows immediately"
                    />
                  </Field>

                  <Field label="Ends at (IST)" hint="Empty = never ends">
                    <DateTimePicker
                      value={form.endsAt}
                      onChange={(val) => setField('endsAt', val)}
                      placeholder="Never ends"
                      min={form.startsAt}
                      align="right"
                    />
                  </Field>
                </div>

                <ToggleRow
                  title="Enabled"
                  subtitle={form.enabled ? 'Banner is switched on' : 'Banner is switched off'}
                  checked={form.enabled}
                  onChange={(v) => setField('enabled', v)}
                />

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
                    {saving ? 'Saving...' : editingBanner ? 'Save Changes' : 'Create Banner'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete banner?"
        message={
          deleteTarget
            ? `"${deleteTarget.title}" will be removed from every list and its image deleted permanently.`
            : ''
        }
        confirmText={deleting ? 'Deleting...' : 'Delete'}
      />
    </div>
  );
}
