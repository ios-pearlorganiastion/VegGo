import React, { useEffect, useRef, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import Sidebar from '../../../layouts/Sidebar';
import PageHeader from '../../../components/common/PageHeader';
import SegmentedTabs from '../../../components/common/SegmentedTabs';
import StatusFilterPills from '../../../components/common/StatusFilterPills';
import WorkflowRulesBar from '../../../components/common/WorkflowRulesBar';
import EmptyState from '../../../components/common/EmptyState';
import InfiniteScrollFooter from '../components/InfiniteScrollFooter';

const Categories = lazy(() => import('./Categories'));
const Subcategories = lazy(() => import('./Subcategories'));
import {
  UI_TABLE,
  UI_BADGES,
  UI_BUTTONS
} from '../../../constants/ui.constants';

import {
  Search,
  Filter,
  Plus,
  Edit3,
  X,
  Save,
  CheckCircle2,
  AlertTriangle,
  Package,
  Loader2,
  Power,
  PowerOff,
  ChevronDown,
  Check,
  Image,
  Upload,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  Tag,
  Layers
} from 'lucide-react';

import {
  getProducts,
  createProduct,
  getProductById,
  updateProduct,
  deactivateProduct,
  activateProduct,
  addProductImages,
  getProductImages,
  deleteProductImage,
  reorderProductImages
} from '../services/productService';
import { getAllCategories } from '../services/categoryService';
import { getAllSubcategories } from '../services/subcategoryService';

const UNIT_OPTIONS = [
  { id: '250g', name: '250 g' },
  { id: '500g', name: '500 g' },
  { id: '1kg', name: '1 kg' },
  { id: '2kg', name: '2 kg' },
  { id: '5kg', name: '5 kg' },
  { id: 'kg', name: 'kg' },
  { id: 'g', name: 'g' },
  { id: 'l', name: 'l' },
  { id: 'ml', name: 'ml' },
  { id: 'pcs', name: 'pcs' },
  { id: 'dozen', name: 'dozen' },
  { id: 'pack', name: 'pack' },
  { id: 'box', name: 'box' },
  { id: 'bundle', name: 'bundle' },
  { id: 'unit', name: 'unit' }
];

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;



const getValue = (obj, keys, fallback = '') => {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null) {
      return obj[key];
    }
  }

  return fallback;
};

const normalizeImageUrl = (url = '') => {
  const value = String(url || '').trim();

  const markdownMatch = value.match(/\((https?:\/\/[^)]+)\)/);

  if (markdownMatch?.[1]) {
    return markdownMatch[1];
  }

  return value;
};

const normalizeProduct = (product) => {
  const id = getValue(product, ['id', 'productId', '_id'], '');

  const name = getValue(product, ['name', 'productName', 'title'], '');

  const description = getValue(product, ['description'], '');

  const categoryId = getValue(product, ['categoryId'], '');

  const categoryName = getValue(product, ['categoryName'], '');

  const subcategoryId = getValue(product, ['subcategoryId'], '');

  const subcategoryName = getValue(product, ['subcategoryName'], '');

  const price = Number(getValue(product, ['price'], 0)) || 0;

  const originalPrice = Number(getValue(product, ['originalPrice'], 0)) || 0;

  // Admin-only: what the vendor is paid per unit. Margin = price - vendorPrice (platform's share).
  const vendorPrice = Number(getValue(product, ['vendorPrice'], 0)) || 0;

  const rawMargin = Number(getValue(product, ['margin'], NaN));

  const margin = Number.isFinite(rawMargin)
    ? rawMargin
    : vendorPrice > 0
    ? Math.max(price - vendorPrice, 0)
    : 0;

  const unit = getValue(product, ['unit'], '');

  const active = product?.active === true || product?.active === 'true';

  const imageUrl = normalizeImageUrl(getValue(product, ['imageUrl'], ''));

  const imageUrls = Array.isArray(product?.imageUrls)
    ? product.imageUrls.map(normalizeImageUrl)
    : [];

  return {
    ...product,
    id,
    name,
    description,
    categoryId,
    categoryName,
    category: categoryName,
    subcategoryId,
    subcategoryName,
    price,
    originalPrice,
    vendorPrice,
    margin,
    unit,
    active,
    status: active ? 'Active' : 'Inactive',
    imageUrl,
    imageUrls
  };
};

const extractProducts = (response) => {
  const root = response?.data;

  if (Array.isArray(root)) return root;
  if (Array.isArray(root?.content)) return root.content;
  if (Array.isArray(root?.products)) return root.products;
  if (Array.isArray(root?.items)) return root.items;
  if (Array.isArray(root?.data)) return root.data;
  if (Array.isArray(response?.products)) return response.products;
  if (Array.isArray(response?.items)) return response.items;

  return [];
};

const extractImages = (response) => {
  const root = response?.data;

  if (Array.isArray(root)) return root;
  if (Array.isArray(root?.images)) return root.images;
  if (Array.isArray(root?.content)) return root.content;
  if (Array.isArray(root?.items)) return root.items;
  if (Array.isArray(root?.data)) return root.data;
  if (Array.isArray(response?.images)) return response.images;
  if (Array.isArray(response?.items)) return response.items;

  return [];
};

const getImageId = (image) => {
  return image?.id ?? image?.productImageId ?? image?.imageId ?? image?._id;
};

const getImageUrl = (image) => {
  const url =
    image?.url ||
    image?.imageUrl ||
    image?.image_path ||
    image?.imagePath ||
    image?.path ||
    image?.src ||
    '';

  return normalizeImageUrl(url);
};

const extractCategories = (response) => {
  const root = response?.data;

  if (Array.isArray(root)) return root;
  if (Array.isArray(root?.content)) return root.content;
  if (Array.isArray(root?.categories)) return root.categories;
  if (Array.isArray(root?.items)) return root.items;
  if (Array.isArray(root?.data)) return root.data;
  if (Array.isArray(response?.categories)) return response.categories;
  if (Array.isArray(response?.items)) return response.items;

  return [];
};

const extractSubcategories = (response) => {
  const root = response?.data;

  if (Array.isArray(root)) return root;
  if (Array.isArray(root?.content)) return root.content;
  if (Array.isArray(root?.subcategories)) return root.subcategories;
  if (Array.isArray(root?.items)) return root.items;
  if (Array.isArray(root?.data)) return root.data;
  if (Array.isArray(response?.subcategories)) return response.subcategories;
  if (Array.isArray(response?.items)) return response.items;

  return [];
};

const normalizeCategory = (category) => ({
  ...category,
  id: getValue(category, ['id', 'categoryId', '_id'], ''),
  name: getValue(category, ['name', 'categoryName', 'title'], '')
});

const normalizeSubcategory = (subcategory) => ({
  ...subcategory,
  id: getValue(subcategory, ['id', 'subcategoryId', '_id'], ''),
  name: getValue(subcategory, ['name', 'subcategoryName', 'title'], '')
});

function SelectDropdown({
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
  loading = false,
  allowCustom = false
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [open]);

  const selectedOption = options.find(
    (option) => String(option.id) === String(value)
  );

  const displayLabel = selectedOption
    ? selectedOption.name
    : value
    ? String(value)
    : '';

  const filteredOptions = options.filter((option) =>
    String(option.name || '')
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const trimmedSearch = search.trim();

  const exactMatchExists = options.some(
    (option) => String(option.name || '').toLowerCase() === trimmedSearch.toLowerCase()
  );

  const showCustomOption =
    allowCustom && trimmedSearch.length > 0 && !exactMatchExists;

  const handleSelect = (option) => {
    onChange(option);
    setOpen(false);
    setSearch('');
  };

  const handleCustomSelect = () => {
    if (!trimmedSearch) return;
    onChange({ id: trimmedSearch, name: trimmedSearch });
    setOpen(false);
    setSearch('');
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();

      if (allowCustom && trimmedSearch) {
        const match = options.find(
          (option) => String(option.name || '').toLowerCase() === trimmedSearch.toLowerCase()
        );

        if (match) {
          handleSelect(match);
        } else {
          handleCustomSelect();
        }
      }
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full h-[38px] px-3.5 border rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
          disabled
            ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed shadow-none'
            : open
            ? 'border-emerald-500 bg-white ring-2 ring-emerald-500/10 text-black'
            : 'bg-slate-50 hover:bg-white border-slate-200 hover:border-emerald-300 text-black'
        }`}
      >
        <span
          className={
            displayLabel
              ? 'text-black truncate font-bold'
              : disabled
              ? 'text-slate-500 truncate font-semibold'
              : 'text-slate-600 truncate font-semibold'
          }
        >
          {loading ? 'Loading...' : displayLabel || placeholder}
        </span>

        {loading ? (
          <Loader2 size={14} className="animate-spin text-emerald-600 shrink-0" />
        ) : (
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 shrink-0 ${
              disabled ? 'text-slate-400' : 'text-emerald-600'
            } ${open ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {open && !disabled && !loading && (
        <div
          className="absolute left-0 right-0 top-full z-[90] rounded-xl border border-emerald-200 bg-white shadow-xl shadow-slate-900/10 overflow-hidden"
        >
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={
                    allowCustom
                      ? 'Type or search (e.g. 250 g, 1 kg)...'
                      : `Search ${placeholder.replace('Select ', '').replace('Enter ', '').toLowerCase()}...`
                  }
                  className="w-full h-[36px] pl-9 pr-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10"
                />
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto p-1.5">
              {showCustomOption && (
                <button
                  type="button"
                  onClick={handleCustomSelect}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold text-left mb-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all"
                >
                  <Plus size={13} className="shrink-0" />
                  <span className="truncate">Add "{trimmedSearch}"</span>
                </button>
              )}

              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => {
                  const selected = String(option.id) === String(value);

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleSelect(option)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition-all ${
                        selected
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                    >
                      <span className="truncate">{option.name}</span>

                      {selected && <Check size={14} className="shrink-0" />}
                    </button>
                  );
                })
              ) : !showCustomOption ? (
                <div className="px-3 py-5 text-xs font-semibold text-slate-400 text-center">
                  No matching options found
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    );
}

function ImageLightbox({ url, onClose }) {
  if (!url) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-5 right-5 p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
      >
        <X size={20} />
      </button>

      <img
        src={url}
        alt="Preview"
        decoding="async"
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain"
      />
    </div>
  );
}

export default function Products({ defaultTab = 'products' }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTabParam = searchParams.get('tab');

  const [currentTab, setCurrentTab] = useState(
    currentTabParam || defaultTab
  );

  useEffect(() => {
    if (currentTabParam) {
      setCurrentTab(currentTabParam);
    } else if (defaultTab) {
      setCurrentTab(defaultTab);
    }
  }, [currentTabParam, defaultTab]);

  const handleTabChange = (tabId) => {
    setCurrentTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState('All');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false);

  // Pagination State & Infinite Scrolling
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(null);
  const hasMore = currentPage < totalPages - 1;
  const fetchRequestId = useRef(0);
  const pageSize = 20;

  const [productImages, setProductImages] = useState([]);
  const [selectedImages, setSelectedImages] = useState([]);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [viewImageUrl, setViewImageUrl] = useState('');

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    categoryId: '',
    categoryName: '',
    subcategoryId: '',
    subcategoryName: '',
    price: '',
    originalPrice: '',
    vendorPrice: '',
    unit: '',
    active: true
  });

  const descriptionRef = useRef(null);

  const adjustDescriptionHeight = useCallback(() => {
    if (descriptionRef.current) {
      descriptionRef.current.style.height = 'auto';
      descriptionRef.current.style.height = `${Math.min(
        Math.max(descriptionRef.current.scrollHeight, 38),
        160
      )}px`;
    }
  }, []);

  useEffect(() => {
    if (isPanelOpen) {
      const timer = setTimeout(adjustDescriptionHeight, 0);
      return () => clearTimeout(timer);
    }
  }, [isPanelOpen, formData.description, adjustDescriptionHeight]);

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      description: '',
      categoryId: '',
      categoryName: '',
      subcategoryId: '',
      subcategoryName: '',
      price: '',
      originalPrice: '',
      vendorPrice: '',
      unit: '',
      active: true
    });
  };

  const closePanel = () => {
    if (saving || imageUploading) return;

    setIsPanelOpen(false);
    setEditingProduct(null);
    setIsViewMode(false);
    setProductImages([]);
    setSelectedImages([]);
    resetForm();
  };

  const fetchProducts = async (pageOrOptions = 0, maybeSearch = searchQuery, maybeAppend = false) => {
    let page = 0;
    let search = searchQuery;
    let isAppend = false;
    let showLoader = false;

    if (typeof pageOrOptions === 'object' && pageOrOptions !== null) {
      page = pageOrOptions.page ?? 0;
      search = pageOrOptions.search ?? searchQuery;
      isAppend = pageOrOptions.isAppend ?? false;
      showLoader = pageOrOptions.showLoader ?? false;
    } else {
      page = pageOrOptions ?? 0;
      search = maybeSearch ?? searchQuery;
      isAppend = maybeAppend ?? false;
    }

    const requestId = ++fetchRequestId.current;

    if (isAppend) {
      setIsLoadingMore(true);
      setLoadMoreError(null);
    } else {
      if (showLoader) {
        setLoading(true);
      }
      setIsRefreshing(true);
      setErrorMessage('');
    }

    try {
      const response = await getProducts({
        page,
        size: pageSize,
        search: (search || '').trim()
      });

      if (requestId !== fetchRequestId.current) return;

      const rawData = response?.data ?? response;
      const productList = extractProducts(response).map(normalizeProduct);
      const pages = Math.max(1, rawData?.totalPages ?? rawData?.pages ?? 1);
      const total =
        rawData?.totalElements ??
        rawData?.totalCount ??
        productList.length;

      if (isAppend) {
        setProducts((prev) => {
          const existingIds = new Set(prev.map((p) => String(p.id)));
          const unique = productList.filter((p) => p?.id && !existingIds.has(String(p.id)));
          return [...prev, ...unique];
        });
        setCurrentPage(page);
      } else {
        setProducts(productList);
        setCurrentPage(0);
      }

      setTotalPages(pages);
      setTotalElements(total);
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      if (requestId !== fetchRequestId.current) return;

      console.error('Failed to fetch products:', error);

      const msg =
        error?.response?.data?.message || error?.message || 'Failed to load products';

      if (isAppend) {
        setLoadMoreError(msg);
      } else {
        setProducts([]);
        setTotalPages(1);
        setTotalElements(0);
        setErrorMessage(msg);
      }
    } finally {
      if (requestId === fetchRequestId.current) {
        setLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    }
  };

  const handleLoadMore = () => {
    if (isLoadingMore || !hasMore || loading) return;
    fetchProducts({ page: currentPage + 1, search: searchQuery, isAppend: true });
  };

  const handleRetryLoadMore = () => {
    if (isLoadingMore || loading) return;
    fetchProducts({ page: currentPage + 1, search: searchQuery, isAppend: true });
  };

  const fetchCategoriesList = async () => {
    setCategoriesLoading(true);

    try {
      // Product form needs active categories only (same as the old default list)
      const response = await getAllCategories('active');
      const list = extractCategories(response).map(normalizeCategory);
      setCategories(list);
    } catch (error) {
      setCategories([]);
      setErrorMessage(
        error?.response?.data?.message || error?.message || 'Failed to load categories'
      );
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchSubcategoriesList = async (categoryId) => {
    if (!categoryId) {
      setSubcategories([]);
      return;
    }

    setSubcategoriesLoading(true);

    try {
      const response = await getAllSubcategories(categoryId, 'all');
      const list = extractSubcategories(response).map(normalizeSubcategory);
      setSubcategories(list);
    } catch (error) {
      setSubcategories([]);
      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to load subcategories'
      );
    } finally {
      setSubcategoriesLoading(false);
    }
  };

  const fetchProductImages = async (productId) => {
    if (!productId) return;

    setImageLoading(true);

    try {
      const response = await getProductImages(productId);

      setProductImages(extractImages(response));
    } catch (error) {
      setProductImages([]);

      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to load product images'
      );
    } finally {
      setImageLoading(false);
    }
  };

  const location = useLocation();

  const isFirstSearchRef = useRef(true);
  const productsLoadedRef = useRef(false);

  useEffect(() => {
    if (currentTab === 'products' && !productsLoadedRef.current) {
      productsLoadedRef.current = true;
      fetchProducts(0, '');
      fetchCategoriesList();
    }
  }, [currentTab]);

  useEffect(() => {
    if (currentTab !== 'products') return;
    if (isFirstSearchRef.current) {
      isFirstSearchRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      fetchProducts(0, searchQuery);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, currentTab]);

  useEffect(() => {
    if (location.state?.productId && products.length > 0) {
      const target = products.find(
        (p) => String(p.id) === String(location.state.productId)
      );
      if (target) {
        openProductPanel(target, true);
      }
    }
  }, [location.state?.productId, products]);

  const openAddPanel = async () => {
    setEditingProduct(null);
    setIsViewMode(false);
    setErrorMessage('');
    setProductImages([]);
    setSelectedImages([]);
    setSubcategories([]);
    resetForm();
    setIsPanelOpen(true);

    if (categories.length === 0) {
      await fetchCategoriesList();
    }
  };

  const openProductPanel = async (product, viewOnly = false) => {
    setActionLoading(product.id);
    setErrorMessage('');
    setProductImages([]);
    setSelectedImages([]);
    setIsViewMode(viewOnly);

    try {
      const response = await getProductById(product.id);

      const productData =
        response?.data?.product || response?.data || response?.product || product;

      const normalized = normalizeProduct(productData);

      setEditingProduct(normalized.id);

      setFormData({
        id: normalized.id,
        name: normalized.name || '',
        description: normalized.description || '',
        categoryId: normalized.categoryId || '',
        categoryName: normalized.categoryName || '',
        subcategoryId: normalized.subcategoryId || '',
        subcategoryName: normalized.subcategoryName || '',
        price: normalized.price !== undefined ? String(normalized.price) : '',
        originalPrice:
          normalized.originalPrice !== undefined
            ? String(normalized.originalPrice)
            : '',
        vendorPrice: normalized.vendorPrice > 0 ? String(normalized.vendorPrice) : '',
        unit: normalized.unit || '',
        active: normalized.active
      });

      setIsPanelOpen(true);

      if (normalized.categoryId) {
        await fetchSubcategoriesList(normalized.categoryId);
      } else {
        setSubcategories([]);
      }

      await fetchProductImages(normalized.id);
    } catch (error) {
      console.error('Failed to fetch product:', error);

      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to fetch product details'
      );
    } finally {
      setActionLoading(null);
    }
  };

  const openEditPanel = (product) => openProductPanel(product, false);
  const openViewPanel = (product) => openProductPanel(product, true);

  const handleCategoryChange = async (category) => {
    if (isViewMode) return;

    const categoryId = category?.id || '';
    const categoryName = category?.name || '';

    setFormData((prev) => ({
      ...prev,
      categoryId,
      categoryName,
      subcategoryId: '',
      subcategoryName: ''
    }));

    setSubcategories([]);
    setErrorMessage('');

    if (categoryId) {
      await fetchSubcategoriesList(categoryId);
    }
  };

  const handleSubcategoryChange = (subcategory) => {
    if (isViewMode) return;

    setFormData((prev) => ({
      ...prev,
      subcategoryId: subcategory?.id || '',
      subcategoryName: subcategory?.name || ''
    }));

    setErrorMessage('');
  };

  const handleUnitChange = (option) => {
    if (isViewMode) return;

    setFormData((prev) => ({
      ...prev,
      unit: option?.name || ''
    }));
  };

  const handleImageSelect = (event) => {
    const files = Array.from(event.target.files || []);

    if (!files.length) return;

    const validFiles = files.filter((file) => {
      if (!file.type.startsWith('image/')) return false;
      if (file.size > MAX_IMAGE_SIZE_BYTES) return false;
      return true;
    });

    if (!validFiles.length) {
      setErrorMessage('Please select valid image files under 5MB');
      event.target.value = '';
      return;
    }

    if (validFiles.length !== files.length) {
      setErrorMessage('Some images were skipped. Only image files under 5MB are allowed.');
    } else {
      setErrorMessage('');
    }

    setSelectedImages((prev) => [...prev, ...validFiles]);
    event.target.value = '';
  };

  const handleProductImageUpload = async () => {
    if (!editingProduct || !selectedImages.length) return;

    setImageUploading(true);
    setErrorMessage('');

    try {
      await addProductImages(editingProduct, selectedImages);

      setSelectedImages([]);

      await fetchProductImages(editingProduct);
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to upload product images'
      );
    } finally {
      setImageUploading(false);
    }
  };

  const handleDeleteProductImage = async (image) => {
    if (!editingProduct) return;

    const imageId = getImageId(image);

    if (!imageId) {
      setErrorMessage('Product image id not found');
      return;
    }

    // Every product must have at least one image on the backend
    if (productImages.length <= 1 && selectedImages.length === 0) {
      setErrorMessage(
        'Every product must have at least one image. Please click "Select Images" above to choose a new replacement image first, then delete or save.'
      );
      return;
    }

    setImageLoading(true);
    setErrorMessage('');

    try {
      // If user has chosen new image(s) and is deleting the only remaining server image,
      // upload the new image(s) first so this is no longer the last remaining image
      if (productImages.length <= 1 && selectedImages.length > 0) {
        await addProductImages(editingProduct, selectedImages);
        setSelectedImages([]);
      }

      await deleteProductImage(editingProduct, imageId);

      await fetchProductImages(editingProduct);
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to delete product image';

      if (
        msg.includes('last remaining image') ||
        error?.response?.data?.errorCode === 'CATALOG_PRODUCT_LAST_IMAGE'
      ) {
        setErrorMessage(
          'Cannot delete the only image. Every product must have at least one image. Please select a replacement image under "Select Images" first.'
        );
      } else {
        setErrorMessage(msg);
      }

      setImageLoading(false);
    }
  };

  const handleReorderProductImages = async (images) => {
    if (!editingProduct || !Array.isArray(images)) return;

    const imageIds = images
      .map((image) => getImageId(image))
      .filter((id) => id !== undefined && id !== null && id !== '');

    if (!imageIds.length) return;

    try {
      await reorderProductImages(editingProduct, imageIds);
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to reorder product images'
      );

      await fetchProductImages(editingProduct);
    }
  };

  const moveProductImage = async (index, direction) => {
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= productImages.length) return;

    const updatedImages = [...productImages];

    [updatedImages[index], updatedImages[targetIndex]] = [
      updatedImages[targetIndex],
      updatedImages[index]
    ];

    setProductImages(updatedImages);

    await handleReorderProductImages(updatedImages);
  };

  const removeSelectedImage = (index) => {
    setSelectedImages((prev) => prev.filter((_, imageIndex) => imageIndex !== index));
  };

  const handleSave = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }

    if (isViewMode) return;

    if (!formData.name.trim()) {
      setErrorMessage('Product name is required');
      return;
    }

    if (!formData.categoryId) {
      setErrorMessage('Category is required');
      return;
    }

    if (!formData.subcategoryId) {
      setErrorMessage('Subcategory is required');
      return;
    }

    if (!formData.price) {
      setErrorMessage('Product price is required');
      return;
    }

    if (formData.vendorPrice !== '') {
      const vendorPriceValue = parseFloat(formData.vendorPrice);
      const customerPriceValue = parseFloat(formData.price);

      if (!(vendorPriceValue > 0)) {
        setErrorMessage('Vendor price must be greater than 0');
        return;
      }

      if (vendorPriceValue > customerPriceValue) {
        setErrorMessage('Vendor price cannot be higher than the customer price');
        return;
      }
    }

    if (!formData.unit.trim()) {
      setErrorMessage('Product unit is required');
      return;
    }

    if (!editingProduct && selectedImages.length === 0) {
      setErrorMessage('At least one product image is required');
      return;
    }

    setSaving(true);
    setErrorMessage('');

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      categoryId: formData.categoryId,
      subcategoryId: formData.subcategoryId,
      price: parseFloat(formData.price) || 0,
      originalPrice: parseFloat(formData.originalPrice) || 0,
      unit: formData.unit.trim(),
      active: Boolean(formData.active)
    };

    // Omitted = keep current on update / same as price on create
    if (formData.vendorPrice !== '') {
      payload.vendorPrice = parseFloat(formData.vendorPrice);
    }

    try {
      if (editingProduct) {
        await updateProduct(editingProduct, payload);

        if (selectedImages.length > 0) {
          await addProductImages(editingProduct, selectedImages);
        }

        // Optimistically update the product in local state so UI updates instantly without any flicker
        const matchedCategory = categories.find((c) => String(c.id) === String(payload.categoryId));
        const matchedSubcategory = subcategories.find((s) => String(s.id) === String(payload.subcategoryId));

        setProducts((prev) =>
          prev.map((p) =>
            p.id === editingProduct
              ? {
                  ...p,
                  name: payload.name,
                  description: payload.description,
                  categoryId: payload.categoryId,
                  categoryName: matchedCategory?.name || p.categoryName,
                  subcategoryId: payload.subcategoryId,
                  subcategoryName: matchedSubcategory?.name || p.subcategoryName,
                  price: payload.price,
                  originalPrice: payload.originalPrice,
                  vendorPrice: payload.vendorPrice ?? p.vendorPrice,
                  margin:
                    payload.vendorPrice !== undefined
                      ? Math.max(payload.price - payload.vendorPrice, 0)
                      : p.margin,
                  unit: payload.unit,
                  active: payload.active
                }
              : p
          )
        );
      } else {
        await createProduct(payload, selectedImages);
      }

      // Close panel immediately so the user gets fast, seamless interaction
      setIsPanelOpen(false);
      setEditingProduct(null);
      setIsViewMode(false);
      setProductImages([]);
      setSelectedImages([]);
      resetForm();

      // Clear any navigation state that may have opened this product initially
      if (location.state?.productId) {
        window.history.replaceState({}, document.title);
      }

      // Re-fetch in background preserving current page and search without page reload
      fetchProducts(currentPage, searchQuery);
    } catch (error) {
      console.error('Failed to save product:', error);

      setErrorMessage(
        error?.response?.data?.message || error?.message || 'Failed to save product'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (product) => {
    if (!product?.id) return;

    setActionLoading(product.id);
    setErrorMessage('');

    try {
      if (product.active) {
        await deactivateProduct(product.id);
      } else {
        await activateProduct(product.id);
      }

      // Optimistically update product status in state
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id
            ? { ...p, active: !product.active, status: !product.active ? 'Active' : 'Inactive' }
            : p
        )
      );

      await fetchProducts();

      if (editingProduct === product.id) {
        closePanel();
      }
    } catch (error) {
      console.error('Failed to change product status:', error);

      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to update product status'
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStatus = handleStatusChange;

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return products.filter((prod) => {
      const name = String(prod.name || '').toLowerCase();
      const category = String(prod.categoryName || '').toLowerCase();
      const subcategory = String(prod.subcategoryName || '').toLowerCase();

      const matchesSearch =
        !query ||
        name.includes(query) ||
        category.includes(query) ||
        subcategory.includes(query);

      const matchesStatus =
        stockFilter === 'All' ||
        (stockFilter === 'Active' && prod.active) ||
        (stockFilter === 'Inactive' && !prod.active);

      return matchesSearch && matchesStatus;
    });
  }, [products, searchQuery, stockFilter]);

  const totalProductsCount = totalElements || products.length;
  const activeProducts = useMemo(() => products.filter((p) => p.active).length, [products]);
  const inactiveProducts = useMemo(() => products.filter((p) => !p.active).length, [products]);

  const productStats = [
    {
      label: 'Total Products',
      value: totalProductsCount,
      subLabel: 'Catalog Produce Items',
      accentGradient: 'from-emerald-600 to-teal-600',
      iconBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
      icon: Package,
    },
    {
      label: 'Active (In Stock)',
      value: activeProducts,
      subLabel: 'Live on Storefront',
      accentGradient: 'from-emerald-500 to-teal-500',
      iconBg: 'bg-emerald-50/90 text-emerald-800 border border-emerald-200/80',
      icon: CheckCircle2,
    },
    {
      label: 'Inactive / Hidden',
      value: inactiveProducts,
      subLabel: 'Delisted or Paused',
      accentGradient: 'from-slate-500 to-slate-600',
      iconBg: 'bg-slate-50 text-slate-700 border border-slate-200',
      icon: AlertTriangle,
    },
    {
      label: 'Categories Covered',
      value: categories.length,
      subLabel: 'Taxonomy Departments',
      accentGradient: 'from-teal-600 to-emerald-700',
      iconBg: 'bg-teal-50 text-teal-700 border border-teal-200/80',
      icon: Layers,
    },
  ];

  const priceInputClass =
    'w-full h-[38px] px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-black placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] disabled:opacity-60 disabled:cursor-not-allowed';

  const productTabs = [
    { id: 'categories', label: 'Categories', icon: Layers },
    { id: 'subcategories', label: 'Subcategories', icon: Tag },
    { id: 'products', label: 'All Products', icon: Package },
  ];

  const filterPills = [
    { id: 'All', label: 'All Products', count: totalProductsCount },
    { id: 'Active', label: 'Active (In Stock)', count: activeProducts },
    { id: 'Inactive', label: 'Inactive (Hidden)', count: inactiveProducts }
  ];

  return (
    <div className="min-h-dvh bg-[#f6f9f7] flex flex-col lg:flex-row font-sans antialiased text-slate-800 selection:bg-emerald-100 selection:text-emerald-900">
      <Sidebar />

      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pt-20 sm:pt-22 lg:pt-22 overflow-y-auto max-h-dvh w-full space-y-5 sm:space-y-6">
        {/* Horizontal Navigation Segmented Tabs Bar */}
        <div className="bg-white p-2 rounded-2xl border border-emerald-100/80 shadow-2xs">
          <SegmentedTabs
            tabs={productTabs}
            activeTab={currentTab}
            onTabChange={handleTabChange}
          />
        </div>

        {/* Tab 1: All Products View */}
        {currentTab === 'products' && (
          <div className="w-full space-y-5 sm:space-y-6">
            {/* Top Executive Header */}
            <PageHeader
              icon={Package}
              title="Produce & Inventory"
              subtitle="View and manage products, pricing, and stock levels."
              stats={[
                { label: 'Total Products', value: totalProductsCount },
                { label: 'Inactive / Hidden', value: inactiveProducts, alert: inactiveProducts > 0 }
              ]}
              actionButtonText="Add Product"
              actionButtonIcon={Plus}
              onActionClick={openAddPanel}
              onRefresh={() => fetchProducts(currentPage, searchQuery)}
              isRefreshing={isRefreshing || loading}
            />

            {/* Global Error Banner */}
            {errorMessage && (
              <div
                className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center gap-3 text-xs sm:text-sm font-semibold text-amber-900 shadow-2xs"
              >
                <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Secondary Status Filter Pills */}
            <StatusFilterPills
              filters={filterPills}
              activeFilter={stockFilter}
              onFilterChange={setStockFilter}
            />

            {/* Workflow Rules Information Bar */}
            <WorkflowRulesBar
              rulesText="Live catalog inventory management with category taxonomy, real-time pricing, and one-click stock availability toggle."
              showingCount={filteredProducts.length}
              totalCount={products.length}
              itemLabel="products"
            />

            {/* Unified Search Input Bar */}
            <div className="relative w-full">
              <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search products by item name, category, or subcategory..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-slate-400 shadow-2xs"
              />
            </div>

            {/* Data Table or Empty State Card */}
            {filteredProducts.length === 0 && !loading ? (
              <EmptyState
                icon={Package}
                title="No products found"
                description={`There are currently no products in the selected "${stockFilter}" category or matching your search.`}
                actionText="Add New Product"
                onAction={openAddPanel}
              />
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
                <div className="hidden md:block overflow-x-auto">
                  <table className={UI_TABLE.table}>
                    <thead>
                      <tr className={UI_TABLE.thead}>
                        <th className={`${UI_TABLE.th} w-[28%] min-w-[220px]`}>Product Details</th>
                        <th className={`${UI_TABLE.th} w-[18%] min-w-[140px]`}>Taxonomy / Category</th>
                        <th className={`${UI_TABLE.th} w-[18%] min-w-[150px]`}>Pricing</th>
                        <th className={`${UI_TABLE.th} w-[10%] min-w-[90px]`}>Unit Standard</th>
                        <th className={`${UI_TABLE.thCenter} w-[12%] min-w-[100px]`}>Status</th>
                        <th className={`${UI_TABLE.thRight} min-w-[200px] w-[14%]`}>Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {loading ? (
                        <tr>
                          <td colSpan="6" className="py-16 text-center">
                            <div className="flex flex-col items-center gap-3 text-slate-400">
                              <Loader2 size={32} className="animate-spin text-emerald-600" />
                              <span className="text-xs font-semibold">Loading product catalog...</span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((prod, idx) => (
                          <tr
                            key={prod.id || idx}
                            className={UI_TABLE.tr}
                          >
                            <td className={UI_TABLE.td}>
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0 group-hover:border-emerald-300 transition-colors overflow-hidden shadow-2xs">
                                  {prod.imageUrl ? (
                                    <img
                                      src={prod.imageUrl}
                                      alt={prod.name || 'Product'}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <Package size={18} className="text-emerald-600" />
                                  )}
                                </div>

                                <div className="flex flex-col min-w-0 max-w-[180px] sm:max-w-[220px] lg:max-w-[280px]">
                                  <span
                                    className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors text-xs sm:text-sm truncate block leading-tight"
                                    title={prod.name}
                                  >
                                    {prod.name || '-'}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className={UI_TABLE.td}>
                              <div className="flex flex-col gap-1.5 min-w-0 max-w-[180px] items-start">
                                <span
                                  className={UI_BADGES.category}
                                  title={prod.categoryName}
                                >
                                  {prod.categoryName || '-'}
                                </span>

                                {prod.subcategoryName ? (
                                  <span
                                    className={UI_BADGES.subcategory}
                                    title={prod.subcategoryName}
                                  >
                                    {prod.subcategoryName}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-slate-400 font-medium italic pl-0.5">
                                    No subcategory
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className={UI_TABLE.td}>
                              <div className="flex flex-col gap-0.5 font-mono">
                                <div className="flex items-baseline gap-1.5 flex-wrap">
                                  <span className="text-sm font-bold text-slate-900 tracking-tight">
                                    ₹{prod.price || 0}
                                  </span>

                                  {prod.originalPrice > prod.price && (
                                    <span
                                      className="text-[11px] text-slate-400 line-through font-medium"
                                      title={`Original: ₹${prod.originalPrice}`}
                                    >
                                      ₹{prod.originalPrice}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 leading-tight">
                                  <span title="Vendor Price">Vendor ₹{prod.vendorPrice || prod.price || 0}</span>
                                  <span className="text-slate-300">·</span>
                                  <span
                                    className={`font-semibold ${
                                      prod.margin > 0 ? 'text-emerald-700' : 'text-slate-400'
                                    }`}
                                    title="Platform Margin"
                                  >
                                    Margin ₹{Number(prod.margin || 0).toFixed(2).replace(/\.00$/, '')}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className={UI_TABLE.td}>
                              <span className={UI_BADGES.unit}>
                                {prod.unit || '-'}
                              </span>
                            </td>

                            <td className={UI_TABLE.tdCenter}>
                              <span className={prod.active ? UI_BADGES.statusActive : UI_BADGES.statusInactive}>
                                <span className={prod.active ? UI_BADGES.statusDotActive : UI_BADGES.statusDotInactive} />
                                <span>{prod.active ? 'In Stock' : 'Inactive'}</span>
                              </span>
                            </td>

                            <td className={UI_TABLE.tdRight}>
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openViewPanel(prod)}
                                  className={UI_BUTTONS.view}
                                  title="View Details"
                                >
                                  <Eye size={13} className="text-slate-500" />
                                  <span>View</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openEditPanel(prod)}
                                  className={UI_BUTTONS.edit}
                                  title="Edit Product"
                                >
                                  <Edit3 size={13} />
                                  <span>Edit</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(prod)}
                                  disabled={actionLoading === prod.id}
                                  className={prod.active ? UI_BUTTONS.danger : UI_BUTTONS.success}
                                  title={prod.active ? 'Deactivate Product' : 'Activate Product'}
                                >
                                  {actionLoading === prod.id ? (
                                    <Loader2 size={13} className="animate-spin text-emerald-600" />
                                  ) : prod.active ? (
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
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards List */}
                <div className="md:hidden p-3.5 sm:p-4 space-y-3">
                  {filteredProducts.map((prod) => (
                    <div
                      key={prod.id}
                      className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/80 text-emerald-700 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                            {prod.imageUrl ? (
                              <img
                                src={prod.imageUrl}
                                alt={prod.name || 'Product'}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <Package size={18} className="text-emerald-600" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <h4
                              className="font-bold text-sm text-slate-900 truncate"
                              title={prod.name}
                            >
                              {prod.name || '-'}
                            </h4>
                            <div className="flex items-center gap-1.5 flex-wrap mt-1">
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-950 border border-emerald-300 truncate max-w-[130px]"
                                title={prod.categoryName}
                              >
                                {prod.categoryName || 'Catalog Item'}
                              </span>
                              {prod.subcategoryName && (
                                <span
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200/90 truncate max-w-[130px]"
                                  title={prod.subcategoryName}
                                >
                                  {prod.subcategoryName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 ${
                            prod.active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                              : 'bg-rose-50 text-rose-700 border-rose-200/80'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              prod.active ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          <span>{prod.active ? 'In Stock' : 'Inactive'}</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-2.5 border-t border-slate-100 items-start">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider mb-0.5">Price</span>
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 font-mono text-sm">₹{prod.price || 0}</span>
                            {prod.originalPrice > prod.price && (
                              <span className="text-[11px] text-slate-400 line-through font-mono">₹{prod.originalPrice}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 mt-0.5 flex-wrap">
                            <span>Vendor ₹{prod.vendorPrice || prod.price || 0}</span>
                            <span className="text-slate-300">·</span>
                            <span className={`font-semibold ${prod.margin > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                              Margin ₹{Number(prod.margin || 0).toFixed(2).replace(/\.00$/, '')}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider mb-0.5">Unit</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 font-mono border border-slate-200/60">
                            {prod.unit || '-'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 pt-2.5 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => openViewPanel(prod)}
                          className="h-8 px-2.5 bg-slate-50 hover:bg-white border border-slate-200/90 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                        >
                          <Eye size={13} className="text-slate-500" /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditPanel(prod)}
                          className="h-8 px-2.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-200/90 hover:border-emerald-600 text-xs font-bold inline-flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                        >
                          <Edit3 size={13} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(prod)}
                          disabled={actionLoading === prod.id}
                          className={`h-8 px-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-all shadow-2xs border cursor-pointer disabled:opacity-50 ${
                            prod.active
                              ? 'bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border-rose-200/90 hover:border-rose-600'
                              : 'bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border-emerald-200/90 hover:border-emerald-600'
                          }`}
                        >
                          {actionLoading === prod.id ? (
                            <Loader2 size={13} className="animate-spin text-emerald-600" />
                          ) : prod.active ? (
                            <>
                              <PowerOff size={13} /> Disable
                            </>
                          ) : (
                            <>
                              <Power size={13} /> Enable
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Infinite Scroll Footer */}
                <InfiniteScrollFooter
                  loading={isLoadingMore}
                  hasMore={hasMore}
                  error={loadMoreError}
                  totalElements={totalElements}
                  loadedCount={products.length}
                  label="products"
                  onLoadMore={handleLoadMore}
                  onRetry={handleRetryLoadMore}
                />
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Categories View */}
        {currentTab === 'categories' && (
          <div className="w-full">
            <Suspense fallback={<div className="py-16 text-center text-slate-400 font-semibold text-xs">Loading categories...</div>}>
              <Categories embedded={true} />
            </Suspense>
          </div>
        )}

        {/* Tab 3: Subcategories View */}
        {currentTab === 'subcategories' && (
          <div className="w-full">
            <Suspense fallback={<div className="py-16 text-center text-slate-400 font-semibold text-xs">Loading subcategories...</div>}>
              <Subcategories embedded={true} />
            </Suspense>
          </div>
        )}
      </main>

      {isPanelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
          <div
            className="bg-white rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-6 shadow-2xl border border-slate-100 relative"
          >
              <button
                type="button"
                onClick={closePanel}
                disabled={saving || imageUploading}
                className="absolute right-5 top-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50 z-10"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3.5 mb-6 pr-8">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-2xl flex items-center justify-center">
                  {isViewMode ? (
                    <Eye size={20} />
                  ) : editingProduct ? (
                    <Edit3 size={20} />
                  ) : (
                    <Plus size={20} />
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 tracking-wider uppercase">
                    Product Management
                  </span>

                  <h3 className="text-lg font-bold text-black">
                    {isViewMode
                      ? 'View Product'
                      : editingProduct
                      ? 'Update Product'
                      : 'Create Product'}
                  </h3>
                </div>
              </div>

              <form
                action="javascript:void(0);"
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSave(e);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-[10px] font-bold text-black uppercase tracking-wider mb-1.5">
                    Product Title <span className="text-rose-500">*</span>
                  </label>

                  <input
                    required
                    type="text"
                    placeholder="e.g. Crisp Romaine Lettuce"
                    value={formData.name}
                    disabled={isViewMode}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full h-[38px] px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-black placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-black uppercase tracking-wider mb-1.5">
                    Description <span className="text-slate-400 font-medium normal-case">(Optional)</span>
                  </label>

                  <textarea
                    ref={descriptionRef}
                    rows={1}
                    placeholder="Product description"
                    value={formData.description}
                    disabled={isViewMode}
                    onInput={adjustDescriptionHeight}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    className="w-full min-h-[38px] max-h-40 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-black placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all resize-none overflow-y-auto disabled:opacity-60 disabled:cursor-not-allowed leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-black uppercase tracking-wider mb-1.5">
                      Category <span className="text-rose-500">*</span>
                    </label>

                    <SelectDropdown
                      value={formData.categoryId}
                      options={categories}
                      placeholder="Select category"
                      onChange={handleCategoryChange}
                      disabled={isViewMode}
                      loading={categoriesLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-black uppercase tracking-wider mb-1.5">
                      Subcategory <span className="text-rose-500">*</span>
                    </label>

                    <SelectDropdown
                      value={formData.subcategoryId}
                      options={subcategories}
                      placeholder={
                        formData.categoryId ? 'Select subcategory' : 'Select category first'
                      }
                      onChange={handleSubcategoryChange}
                      disabled={isViewMode || !formData.categoryId}
                      loading={subcategoriesLoading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 items-start">
                  <div>
                    <label className="block text-[10px] font-bold text-black uppercase tracking-wider mb-1.5">
                      Price (₹) <span className="text-rose-500">*</span>
                    </label>

                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Enter price"
                      value={formData.price}
                      disabled={isViewMode}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, price: e.target.value }))
                      }
                      className={priceInputClass}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-black uppercase tracking-wider mb-1.5">
                      Original Price <span className="text-slate-400 font-medium normal-case">(Optional)</span>
                    </label>

                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Enter original price"
                      value={formData.originalPrice}
                      disabled={isViewMode}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, originalPrice: e.target.value }))
                      }
                      className={priceInputClass}
                    />

                    <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                      Optional. Original price must be greater than price.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label className="block text-[10px] font-bold text-black uppercase tracking-wider">
                      Vendor Price (₹) <span className="text-slate-400 font-medium normal-case">(Optional)</span>
                    </label>

                    {(() => {
                      const customerPrice = parseFloat(formData.price);
                      const vendorPrice = parseFloat(formData.vendorPrice);

                      if (!(customerPrice > 0)) return null;

                      const effectiveVendor = vendorPrice > 0 ? vendorPrice : customerPrice;
                      const marginValue = customerPrice - effectiveVendor;

                      return (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            marginValue < 0
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : marginValue > 0
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          Platform margin: ₹{marginValue.toFixed(2).replace(/\.00$/, '')}
                        </span>
                      );
                    })()}
                  </div>

                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Same as price (no margin)"
                    value={formData.vendorPrice}
                    disabled={isViewMode}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, vendorPrice: e.target.value }))
                    }
                    className={priceInputClass}
                  />

                  <p className="text-[10px] font-medium text-slate-500 leading-snug">
                    What the vendor is paid per unit. Must be above 0 and not higher than the
                    price. The margin (price − vendor price) stays with the platform and pays for
                    coupons. Customers never see this; vendors see it as their price.
                    {editingProduct && ' Leave empty to keep the current vendor price.'}
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-black uppercase tracking-wider mb-1.5">
                    Unit Metric <span className="text-rose-500">*</span>
                  </label>

                  <SelectDropdown
                    value={formData.unit}
                    options={UNIT_OPTIONS}
                    placeholder="Select or type unit"
                    onChange={handleUnitChange}
                    disabled={isViewMode}
                    allowCustom
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold text-black uppercase tracking-wider block">
                      Product Status
                    </span>

                    <span className="text-[10px] text-slate-400">
                      {formData.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={isViewMode}
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, active: !prev.active }))
                    }
                    className={`relative w-11 h-6 rounded-full transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                      formData.active ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                        formData.active ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-bold text-black uppercase tracking-wider">
                      Product Images <span className="text-rose-500">*</span>
                    </label>

                    {!isViewMode && (
                      <label
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                          saving || imageUploading
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer'
                        }`}
                      >
                        <Upload size={13} />
                        Select Images

                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          disabled={saving || imageUploading}
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {!isViewMode && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-[10px] font-semibold text-emerald-700 mb-3">
                      {editingProduct
                        ? 'Select new images (multiple allowed, up to 5MB each) and click Upload to attach them to this product.'
                        : 'Select one or more product images (up to 5MB each). They are sent together when you save the product.'}
                    </div>
                  )}

                  {!isViewMode && selectedImages.length > 0 && (
                    <div className="mb-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold text-slate-700">
                          Selected Images ({selectedImages.length})
                        </span>

                        {editingProduct && (
                          <button
                            type="button"
                            onClick={handleProductImageUpload}
                            disabled={imageUploading || saving}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {imageUploading ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Upload size={12} />
                            )}
                            {imageUploading ? 'Uploading...' : 'Upload'}
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {selectedImages.map((file, index) => {
                          const previewUrl = URL.createObjectURL(file);

                          return (
                            <div
                              key={`${file.name}-${file.lastModified}-${index}`}
                              className="relative rounded-xl overflow-hidden border border-slate-200 bg-white group"
                            >
                              <img
                                src={previewUrl}
                                alt={file.name}
                                className="w-full aspect-square object-cover"
                              />

                              <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-between gap-1">
                                <span className="text-[9px] font-bold text-white truncate max-w-[60%]">
                                  {file.name}
                                </span>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setViewImageUrl(previewUrl)}
                                    className="p-1 rounded-md bg-white/90 text-slate-700"
                                    title="View"
                                  >
                                    <Eye size={11} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => removeSelectedImage(index)}
                                    disabled={imageUploading || saving}
                                    className="p-1 rounded-md bg-rose-500 text-white disabled:opacity-50"
                                    title="Remove"
                                  >
                                    <X size={11} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {editingProduct &&
                    (imageLoading ? (
                      <div className="py-8 flex flex-col items-center justify-center gap-2 border border-dashed border-slate-200 rounded-xl">
                        <Loader2 size={22} className="animate-spin text-emerald-600" />
                        <span className="text-[10px] font-semibold text-slate-400">
                          Loading images...
                        </span>
                      </div>
                    ) : productImages.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {productImages.map((image, index) => {
                          const imageUrl = getImageUrl(image);
                          const imageId = getImageId(image);

                          return (
                            <div
                              key={imageId || index}
                              className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group"
                            >
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={`Product ${index + 1}`}
                                  className="w-full aspect-square object-cover"
                                />
                              ) : (
                                <div className="w-full aspect-square flex items-center justify-center">
                                  <Image size={25} className="text-slate-300" />
                                </div>
                              )}

                              <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-between">
                                <span className="text-[9px] font-bold text-white">
                                  Image {index + 1}
                                </span>

                                <div className="flex items-center gap-1">
                                  {imageUrl && (
                                    <button
                                      type="button"
                                      onClick={() => setViewImageUrl(imageUrl)}
                                      className="p-1 rounded-md bg-white/90 text-slate-700"
                                      title="View"
                                    >
                                      <Eye size={11} />
                                    </button>
                                  )}

                                  {!isViewMode && (
                                    <>
                                      <button
                                        type="button"
                                        disabled={index === 0 || imageLoading}
                                        onClick={() => moveProductImage(index, -1)}
                                        className="p-1 rounded-md bg-white/90 text-slate-700 disabled:opacity-30"
                                      >
                                        <ArrowUp size={11} />
                                      </button>

                                      <button
                                        type="button"
                                        disabled={
                                          index === productImages.length - 1 || imageLoading
                                        }
                                        onClick={() => moveProductImage(index, 1)}
                                        className="p-1 rounded-md bg-white/90 text-slate-700 disabled:opacity-30"
                                      >
                                        <ArrowDown size={11} />
                                      </button>

                                      <button
                                        type="button"
                                        disabled={!imageId || imageLoading}
                                        onClick={() => handleDeleteProductImage(image)}
                                        className="p-1 rounded-md bg-rose-500 text-white disabled:opacity-30"
                                      >
                                        <Trash2 size={11} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-8 flex flex-col items-center justify-center gap-2 border border-dashed border-slate-200 rounded-xl">
                        <Image size={24} className="text-slate-300" />
                        <span className="text-[10px] font-semibold text-slate-400">
                          No product images
                        </span>
                      </div>
                    ))}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={closePanel}
                    disabled={saving || imageUploading}
                    className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {isViewMode ? 'Close' : 'Cancel'}
                  </button>

                  {!isViewMode && (
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving || imageUploading}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl flex items-center gap-1.5 text-xs font-bold shadow-sm transition-colors cursor-pointer"
                    >
                      {saving ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Save size={14} />
                      )}
                      {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Save Product'}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {viewImageUrl && (
          <ImageLightbox url={viewImageUrl} onClose={() => setViewImageUrl('')} />
        )}
      </div>
  );
}