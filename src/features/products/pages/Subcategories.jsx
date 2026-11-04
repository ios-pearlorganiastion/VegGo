import React, { useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from '../../../layouts/Sidebar';
import PageHeader from '../../../components/common/PageHeader';

import {
  Search,
  Filter,
  Plus,
  Edit3,
  Eye,
  X,
  Save,
  CheckCircle2,
  XCircle,
  Layers3,
  Loader2,
  Power,
  PowerOff,
  Upload,
  Image as ImageIcon,
  ChevronDown,
  Check
} from 'lucide-react';

import {
  searchSubcategories,
  getAllSubcategoriesAcrossCategories,
  createSubcategory,
  getSubcategoryById,
  updateSubcategory,
  moveSubcategory,
  deactivateSubcategory,
  activateSubcategory
} from '../services/subcategoryService';

import { getAllCategories } from '../services/categoryService';

import InfiniteScrollFooter from '../components/InfiniteScrollFooter';
import OrderControls from '../components/OrderControls';

const PAGE_SIZE = 20;

// UI filter label -> API `status` query value
const STATUS_PARAM = {
  All: 'all',
  Active: 'active',
  Inactive: 'inactive'
};



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

const getErrorMessage = (error, fallback) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.response?.data?.errors?.[0]?.message ||
    error?.message ||
    fallback
  );
};

const getValue = (obj, keys, fallback = '') => {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null) {
      return obj[key];
    }
  }

  return fallback;
};

const normalizeCategory = (category) => ({
  ...category,
  id: getValue(category, ['id', 'categoryId', '_id'], ''),
  name: getValue(category, ['name', 'categoryName', 'title'], '')
});

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

const normalizeSubcategory = (item, category = {}, allCategories = []) => {
  const source = item?.subcategory || item?.data || item || {};

  return {
    ...source,
    id: getValue(
      source,
      ['id', 'subcategoryId', '_id'],
      getValue(item, ['id', 'subcategoryId', '_id'], '')
    ),
    name: getValue(
      source,
      ['name', 'subcategoryName', 'title'],
      getValue(item, ['name', 'subcategoryName', 'title'], '')
    ),
    categoryId: getValue(
      source,
      ['categoryId', 'parentCategoryId'],
      getValue(item, ['categoryId', 'parentCategoryId'], category.id || '')
    ),
    categoryName: getValue(
      source,
      ['categoryName', 'parentCategoryName'],
      getValue(
        item,
        ['categoryName', 'parentCategoryName'],
        category.name || allCategories.find((c) => String(c.id) === String(source.categoryId || item.categoryId || source.parentCategoryId || item.parentCategoryId))?.name || ''
      )
    ),
    description: getValue(
      source,
      ['description', 'subcategoryDescription'],
      getValue(item, ['description', 'subcategoryDescription'], '')
    ),
    displayOrder: getValue(
      source,
      ['displayOrder', 'sortOrder', 'order'],
      getValue(item, ['displayOrder', 'sortOrder', 'order'], 1)
    ),
    active:
      source?.active !== undefined
        ? source.active
        : item?.active !== undefined
        ? item.active
        : true,
    imageUrl: getValue(
      source,
      ['imageUrl', 'image'],
      getValue(item, ['imageUrl', 'image'], '')
    )
  };
};

function CategorySelect({
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
  loading = false
}) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const selectedOption = options.find(
    (option) => String(option.id) === String(value)
  );

  useEffect(() => {
    if (!open) {
      setSearchTerm(selectedOption ? selectedOption.name : '');
    }
  }, [open, value, options]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
        setSearchTerm(selectedOption ? selectedOption.name : '');
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);

    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [selectedOption]);

  const filteredOptions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return options;

    return options.filter((option) =>
      String(option.name || '').toLowerCase().includes(query)
    );
  }, [options, searchTerm]);

  const toggleDropdown = () => {
    if (disabled || loading) return;
    if (open) {
      setOpen(false);
      setSearchTerm(selectedOption ? selectedOption.name : '');
      inputRef.current?.blur();
    } else {
      setOpen(true);
      setSearchTerm('');
      inputRef.current?.focus();
    }
  };

  const handleFocus = () => {
    if (disabled || loading) return;

    setOpen(true);
    setSearchTerm('');
  };

  const handleInputChange = (event) => {
    setSearchTerm(event.target.value);

    if (!open) {
      setOpen(true);
    }
  };

  const handleSelect = (option) => {
    onChange(option);
    setSearchTerm(option?.name || '');
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      <div
        onClick={toggleDropdown}
        className={`w-full h-[38px] px-3.5 bg-slate-50 border rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
          open
            ? 'border-emerald-500 bg-white ring-2 ring-emerald-500/10'
            : 'border-slate-200 hover:border-emerald-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <Search size={14} className="text-emerald-600 shrink-0" />

        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={loading ? 'Loading...' : searchTerm}
          onClick={(e) => {
            if (open) {
              e.stopPropagation();
            }
          }}
          onFocus={handleFocus}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
            } else if (e.key === 'Escape') {
              setOpen(false);
              inputRef.current?.blur();
            }
          }}
          placeholder={placeholder}
          className="w-full min-w-0 bg-transparent text-xs font-bold text-black placeholder:text-slate-400 placeholder:font-semibold focus:outline-none disabled:cursor-not-allowed cursor-text"
        />

        {loading ? (
          <Loader2 size={14} className="animate-spin text-emerald-600 shrink-0" />
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleDropdown();
            }}
            tabIndex={-1}
            className="p-1 -mr-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer shrink-0"
            title={open ? 'Close dropdown' : 'Open dropdown'}
          >
            <ChevronDown
              size={15}
              className={`transition-transform duration-200 ${
                open ? 'rotate-180' : ''
              }`}
            />
          </button>
        )}
      </div>

      {open && !disabled && (
        <div
          className="absolute left-0 right-0 top-full z-[90] max-h-56 sm:max-h-60 overflow-y-auto rounded-xl border border-emerald-200 bg-white shadow-xl shadow-slate-900/10 p-1.5"
        >
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

                  {selected && <Check size={14} className="shrink-0 ml-2" />}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-3 text-xs font-semibold text-slate-400 text-center">
              {searchTerm
                ? `No category matches "${searchTerm}"`
                : 'No categories available'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Subcategories({ embedded = false }) {
  const [currentTab, setCurrentTab] = useState('subcategories');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  // 'all' = search and show subcategories across all categories; otherwise scoped to category ID
  const [categoryFilterId, setCategoryFilterId] = useState('all');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(null);
  const hasMore = page < totalPages - 1;
  const [movingId, setMovingId] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const fetchRequestId = useRef(0);
  const isFirstLoad = useRef(true);
  const allSubcategoriesCacheRef = useRef(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [subcategories, setSubcategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const categoryFilterOptions = useMemo(() => {
    return [
      { id: 'all', name: 'All Categories' },
      ...categories
    ];
  }, [categories]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  // true = read-only "View" panel opened from the listing, false = normal edit
  const [isViewMode, setIsViewMode] = useState(false);
  const [viewImageUrl, setViewImageUrl] = useState('');

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    categoryId: '',
    categoryName: '',
    description: '',
    status: 'Active',
    imageFile: null,
    imageUrl: ''
  });

  const fetchCategoriesList = async () => {
    setCategoriesLoading(true);

    try {
      // active categories only (same as the old default category list)
      const response = await getAllCategories('active');

      const list = extractCategories(response).map(normalizeCategory);

      setCategories(list);

      return list;
    } catch (error) {
      console.error('Failed to fetch categories:', error);

      setErrorMessage(getErrorMessage(error, 'Failed to load categories'));

      return [];
    } finally {
      setCategoriesLoading(false);
    }
  };

  // Server-side search + status filter + pagination
  // When categoryId === 'all', searches across all categories
  const fetchSubcategories = async ({
    categoryId = categoryFilterId,
    page: pageToLoad = 0,
    status = statusFilter,
    search = debouncedSearch,
    categoryList = categories,
    showLoader = false,
    isAppend = false
  } = {}) => {
    if (!categoryId) return;

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
      let content = [];
      let pages = 1;
      let total = 0;

      if (categoryId === 'all') {
        const catList = (categoryList.length > 0 ? categoryList : categories)
          .filter((c) => c && c.id && c.id !== 'all');

        let allItems = [];

        if (allSubcategoriesCacheRef.current) {
          allItems = allSubcategoriesCacheRef.current;
        } else if (catList.length > 0) {
          const aggResponse = await getAllSubcategoriesAcrossCategories(
            catList,
            'all'
          );

          if (requestId !== fetchRequestId.current) return;

          if (aggResponse?.success && Array.isArray(aggResponse.data)) {
            allSubcategoriesCacheRef.current = aggResponse.data;
            allItems = aggResponse.data;
          }
        }

        if (status && status !== 'All') {
          const isActive = status === 'Active';
          allItems = allItems.filter((item) => Boolean(item.active) === isActive);
        }

        if (search && String(search).trim()) {
          const q = String(search).trim().toLowerCase();
          allItems = allItems.filter(
            (item) =>
              String(item.name || '').toLowerCase().includes(q) ||
              String(item.categoryName || '').toLowerCase().includes(q) ||
              String(item.description || '').toLowerCase().includes(q)
          );
        }

        total = allItems.length;
        pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

        const start = pageToLoad * PAGE_SIZE;
        content = allItems.slice(start, start + PAGE_SIZE);
      } else {
        const response = await searchSubcategories({
          categoryId,
          search,
          status: STATUS_PARAM[status] || 'all',
          page: pageToLoad,
          size: PAGE_SIZE
        });

        if (response?.success) {
          const pageData = response?.data || {};
          content = Array.isArray(pageData.content) ? pageData.content : [];
          pages = Math.max(1, Number(pageData.totalPages) || 1);
          total = Number(pageData.totalElements) || 0;
        } else {
          if (isAppend) {
            setLoadMoreError(response?.message || 'Failed to load more subcategories');
          } else {
            setSubcategories([]);
            setTotalElements(0);
            setTotalPages(1);
            setErrorMessage(response?.message || 'Failed to load subcategories');
          }
          return;
        }
      }

      if (requestId !== fetchRequestId.current) return;

      const activeCategoryObj =
        categoryId === 'all'
          ? {}
          : (categoryList.length > 0 ? categoryList : categories).find(
              (c) => String(c.id) === String(categoryId)
            ) || {};

      const normalized = content.map((item) =>
        normalizeSubcategory(
          item,
          activeCategoryObj,
          categoryList.length > 0 ? categoryList : categories
        )
      );

      if (isAppend) {
        setSubcategories((prev) => {
          const existingIds = new Set(prev.map((s) => String(s.id)));
          const unique = normalized.filter((s) => s?.id && !existingIds.has(String(s.id)));
          return [...prev, ...unique];
        });
        setPage(pageToLoad);
      } else {
        setSubcategories(normalized);
        setPage(0);
      }

      setTotalElements(total);
      setTotalPages(pages);
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      if (requestId !== fetchRequestId.current) return;

      console.error('Failed to fetch subcategories:', error);
      const msg = getErrorMessage(error, 'Failed to load subcategories');

      if (isAppend) {
        setLoadMoreError(msg);
      } else {
        setSubcategories([]);
        setTotalElements(0);
        setTotalPages(1);
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

  const refreshAll = async () => {
    const list = await fetchCategoriesList();

    if (!list.length) {
      setSubcategories([]);
      setTotalElements(0);
      setTotalPages(1);
      setLoading(false);
      return;
    }

    const selectionStillValid =
      categoryFilterId === 'all' ||
      list.some((category) => String(category.id) === String(categoryFilterId));

    if (!selectionStillValid) {
      setCategoryFilterId('all');
      setPage(0);
      return;
    }

    await fetchSubcategories({ categoryId: categoryFilterId, categoryList: list, page: 0, isAppend: false });
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce the search box so we don't hit the API on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // (Re)load whenever category / search / status change
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    if (!categoryFilterId) return;

    fetchSubcategories({ page: 0, isAppend: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilterId, debouncedSearch, statusFilter]);

  const handleRefresh = () => {
    allSubcategoriesCacheRef.current = null;
    refreshAll();
  };

  const handleCategoryFilterChange = (option) => {
    const nextId = option?.id || 'all';

    if (String(nextId) === String(categoryFilterId)) return;

    setCategoryFilterId(nextId);
  };

  const handleStatusFilter = (status) => {
    if (status === statusFilter) return;

    setStatusFilter(status);
  };

  const handleLoadMore = () => {
    if (isLoadingMore || !hasMore || loading) return;
    fetchSubcategories({ page: page + 1, isAppend: true });
  };

  const handleRetryLoadMore = () => {
    if (isLoadingMore || loading) return;
    fetchSubcategories({ page: page + 1, isAppend: true });
  };

  // Reordering is only meaningful on the full, unfiltered list of a single category
  const canReorder =
    categoryFilterId !== 'all' &&
    statusFilter === 'All' &&
    !debouncedSearch &&
    !searchQuery.trim();

  const movingRef = useRef(false);

  // Move a subcategory inside its category. body = { position } or { afterId }
  // (PATCH /api/admin/catalog/subcategories/{id}/move)
  const handleMove = async (subcategory, body) => {
    if (!subcategory?.id || movingRef.current) return;

    movingRef.current = true;
    allSubcategoriesCacheRef.current = null;
    setErrorMessage('');
    setSuccessMessage('');
    setMovingId(subcategory.id);

    try {
      const response = await moveSubcategory(subcategory.id, body);

      if (response?.success === false) {
        setErrorMessage(response?.message || 'Failed to move subcategory');
        await fetchSubcategories({ page: 0, isAppend: false });
      } else {
        setSuccessMessage(
          response?.message || `"${subcategory.name}" moved successfully`
        );
        await fetchSubcategories({ page: 0, isAppend: false });
      }
    } catch (error) {
      console.error('Failed to move subcategory:', error);
      setErrorMessage(getErrorMessage(error, 'Failed to move subcategory'));
      await fetchSubcategories({ page: 0, isAppend: false });
    } finally {
      movingRef.current = false;
      setMovingId(null);
    }
  };

  const handleMoveUp = (subcategory, index) => {
    const previous = subcategories[index - 1];

    handleMove(subcategory, {
      position: previous
        ? Number(previous.displayOrder)
        : Math.max(1, Number(subcategory.displayOrder) - 1)
    });
  };

  const handleMoveDown = (subcategory, index) => {
    const next = subcategories[index + 1];

    handleMove(
      subcategory,
      next
        ? { afterId: next.id }
        : { position: Number(subcategory.displayOrder) + 1 }
    );
  };

  const handleMoveToPosition = (subcategory, targetPosition) => {
    const pos = parseInt(targetPosition, 10);
    if (!pos || pos < 1 || pos === Number(subcategory.displayOrder)) return;

    handleMove(subcategory, { position: pos });
  };

  const handleDrop = (target) => {
    const dragged = subcategories.find((item) => item.id === dragId);

    setDragId(null);
    setDragOverId(null);

    if (!canReorder || !dragged || !target || dragged.id === target.id) return;

    if (Number(dragged.displayOrder) < Number(target.displayOrder)) {
      handleMove(dragged, { afterId: target.id });
    } else {
      handleMove(dragged, { position: Number(target.displayOrder) });
    }
  };

  const getDragHandleProps = (subcategory) => ({
    onDragStart: (e) => {
      setDragId(subcategory.id);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(subcategory.id));

      const row = e.currentTarget.closest('tr');
      if (row) e.dataTransfer.setDragImage(row, 0, 0);
    },
    onDragEnd: () => {
      setDragId(null);
      setDragOverId(null);
    }
  });

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      categoryId: '',
      categoryName: '',
      description: '',
      status: 'Active',
      imageFile: null,
      imageUrl: ''
    });
  };

  const closePanel = () => {
    if (saving) return;

    if (formData.imageUrl && formData.imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(formData.imageUrl);
    }

    setIsPanelOpen(false);
    setEditingSubcategory(null);
    setIsViewMode(false);
    resetForm();
  };

  const openAddPanel = async () => {
    setEditingSubcategory(null);
    setIsViewMode(false);
    setErrorMessage('');
    setSuccessMessage('');
    resetForm();
    setIsPanelOpen(true);

    if (categories.length === 0) {
      await fetchCategoriesList();
    }
  };

  // Shared loader for both "Edit" and read-only "View" — viewOnly=true opens
  // the same panel but disabled, with no Save button.
  const openSubcategoryPanel = async (subcategory, viewOnly = false) => {
    if (!subcategory?.id) return;

    setActionLoading(subcategory.id);
    setErrorMessage('');
    setIsViewMode(viewOnly);

    try {
      const response = await getSubcategoryById(subcategory.id);

      const rawData =
        response?.data?.subcategory ||
        response?.data?.data ||
        response?.data ||
        response?.subcategory ||
        response;

      const data = normalizeSubcategory(rawData, {
        id: subcategory.categoryId,
        name: subcategory.categoryName
      });

      const existingImage =
        data?.imageUrl || subcategory?.imageUrl || subcategory?.image || '';

      const description = getValue(
        rawData,
        ['description', 'subcategoryDescription'],
        getValue(
          response?.data,
          ['description', 'subcategoryDescription'],
          subcategory?.description || ''
        )
      );

      setEditingSubcategory(data?.id || subcategory.id);

      setFormData({
        id: data?.id || subcategory.id || '',
        name: data?.name || subcategory.name || '',
        categoryId: data?.categoryId || subcategory?.categoryId || '',
        categoryName: data?.categoryName || subcategory?.categoryName || '',
        description: description || '',
        status: data?.active === true ? 'Active' : 'Inactive',
        imageFile: null,
        imageUrl: existingImage
      });

      setIsPanelOpen(true);

      if (categories.length === 0) {
        await fetchCategoriesList();
      }
    } catch (error) {
      console.error('Failed to fetch subcategory:', error);

      setErrorMessage(
        getErrorMessage(error, 'Failed to fetch subcategory details')
      );
    } finally {
      setActionLoading(null);
    }
  };

  const openEditPanel = (subcategory) => openSubcategoryPanel(subcategory, false);
  const openViewPanel = (subcategory) => openSubcategoryPanel(subcategory, true);

  const handleCategoryChange = (category) => {
    if (isViewMode) return;

    setFormData((prev) => ({
      ...prev,
      categoryId: category?.id || '',
      categoryName: category?.name || ''
    }));
  };

  const handleImageChange = (e) => {
    if (isViewMode) return;

    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image size must be less than 5MB');
      return;
    }

    setErrorMessage('');

    const previewUrl = URL.createObjectURL(file);

    if (formData.imageUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(formData.imageUrl);
    }

    setFormData((prev) => ({
      ...prev,
      imageFile: file,
      imageUrl: previewUrl
    }));
  };

  const removeImage = () => {
    if (isViewMode) return;

    if (formData.imageUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(formData.imageUrl);
    }

    setFormData((prev) => ({
      ...prev,
      imageFile: null,
      imageUrl: ''
    }));
  };

  const handleSave = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }

    if (isViewMode) return;

    const name = String(formData.name || '').trim();

    if (!name) {
      setErrorMessage('Subcategory name is required');
      return;
    }

    if (!formData.categoryId) {
      setErrorMessage('Please select a parent category');
      return;
    }

    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    const payload = new FormData();

    payload.append('categoryId', String(formData.categoryId));
    payload.append('name', name);
    // NOTE: displayOrder is no longer sent - the server appends new
    // subcategories at the bottom and only the /move endpoint changes order.

    if (formData.description && String(formData.description).trim()) {
      payload.append('description', String(formData.description).trim());
    }

    const oldSubcategory = editingSubcategory
      ? subcategories.find(
          (item) => String(item.id) === String(editingSubcategory)
        )
      : null;

    const hadImage = Boolean(oldSubcategory?.imageUrl || oldSubcategory?.image);
    const isImageRemoved = hadImage && !formData.imageUrl && !formData.imageFile;

    if (formData.imageFile) {
      payload.append('image', formData.imageFile);
    } else if (isImageRemoved) {
      payload.append('removeImage', 'true');
      payload.append('deleteImage', 'true');
      payload.append('imageUrl', '');
    }

    try {
      if (editingSubcategory) {
        if (formData.status !== undefined) {
          payload.append('active', String(formData.status === 'Active'));
        }
        await updateSubcategory(editingSubcategory, payload);

        // Explicitly activate or deactivate via status endpoint
        if (formData.status === 'Active') {
          await activateSubcategory(editingSubcategory);
        } else if (formData.status === 'Inactive') {
          await deactivateSubcategory(editingSubcategory);
        }

        setSuccessMessage('Subcategory updated successfully');

        // Optimistically update subcategory in local state so UI updates instantly without any flicker
        const matchedCategory = categories.find((c) => String(c.id) === String(formData.categoryId));
        setSubcategories((prev) =>
          prev.map((s) =>
            s.id === editingSubcategory
              ? {
                  ...s,
                  name: name,
                  categoryId: formData.categoryId,
                  categoryName: matchedCategory?.name || s.categoryName,
                  description: String(formData.description || '').trim(),
                  active: formData.status === 'Active',
                  imageUrl: formData.imageFile
                    ? formData.imageUrl
                    : isImageRemoved
                    ? ''
                    : (s.imageUrl || s.image)
                }
              : s
          )
        );
      } else {
        const createRes = await createSubcategory(payload);
        const createdId = createRes?.data?.id || createRes?.id;
        if (formData.status === 'Inactive' && createdId) {
          try {
            await deactivateSubcategory(createdId);
          } catch (e) {
            console.warn('Could not deactivate new subcategory:', e);
          }
        }
        setSuccessMessage('Subcategory created successfully');
      }

      // Close panel immediately so the user gets fast, seamless interaction
      allSubcategoriesCacheRef.current = null;
      setIsPanelOpen(false);
      setEditingSubcategory(null);
      setIsViewMode(false);
      resetForm();

      // The list is scoped to one category: if the saved subcategory belongs to
      // a different category, switch to it so the record stays visible
      // (the effect then loads it). Otherwise just re-fetch in the background.
      if (String(formData.categoryId) !== String(categoryFilterId)) {
        setCategoryFilterId(formData.categoryId);
        setPage(0);
      } else {
        fetchSubcategories();
      }
    } catch (error) {
      console.error('Failed to save subcategory:', error);

      setErrorMessage(getErrorMessage(error, 'Failed to save subcategory'));
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (subcategory) => {
    if (!subcategory?.id) return;

    const enabling = subcategory.active === false;

    setActionLoading(subcategory.id);
    setErrorMessage('');

    try {
      allSubcategoriesCacheRef.current = null;
      if (enabling) {
        await activateSubcategory(subcategory.id);
      } else {
        await deactivateSubcategory(subcategory.id);
      }

      setSubcategories((prev) =>
        prev.map((s) =>
          s.id === subcategory.id ? { ...s, active: enabling } : s
        )
      );

      setSuccessMessage(
        `Subcategory "${subcategory.name}" ${
          enabling ? 'enabled' : 'disabled'
        } successfully`
      );

      fetchSubcategories();

      if (editingSubcategory === subcategory.id) {
        closePanel();
      }
    } catch (error) {
      console.error(
        `Failed to ${enabling ? 'enable' : 'disable'} subcategory:`,
        error
      );
      setErrorMessage(
        getErrorMessage(
          error,
          `Failed to ${enabling ? 'enable' : 'disable'} subcategory`
        )
      );
    } finally {
      setActionLoading(null);
    }
  };

  const totalSubcategories = subcategories.length;

  const activeSubcategories = subcategories.filter(
    (item) => item?.active === true
  ).length;

  const inactiveSubcategories = subcategories.filter(
    (item) => item?.active === false
  ).length;

  const categoryCount = new Set(
    subcategories
      .map((item) => String(item?.categoryName || '').trim())
      .filter(Boolean)
  ).size;

  const stats = [
    {
      label: 'Total Subcategories',
      value: totalSubcategories,
      accentColor: 'bg-emerald-600',
      iconBg: 'bg-emerald-50 text-emerald-700',
      icon: Layers3,
      suffix: ' Records',
      statusTag: 'Classification',
      subLabel: `${activeSubcategories} Active • ${inactiveSubcategories} Inactive`,
      tagColor: 'text-emerald-700 bg-emerald-50/80 border-emerald-200/80',
    },
    {
      label: 'Active Subcategories',
      value: activeSubcategories,
      accentColor: 'bg-teal-600',
      iconBg: 'bg-teal-50 text-teal-700',
      icon: CheckCircle2,
      suffix: ' Active',
      statusTag: 'In Stock & Live',
      subLabel: 'Visible for Shoppers',
      tagColor: 'text-teal-700 bg-teal-50/80 border-teal-200/80',
    },
    {
      label: 'Parent Categories',
      value: categoryCount,
      accentColor: 'bg-teal-600',
      iconBg: 'bg-teal-50 text-teal-700',
      icon: Layers3,
      suffix: ' Categories',
      statusTag: 'Active Groups',
      subLabel: 'Taxonomy Departments',
      tagColor: 'text-teal-700 bg-teal-50/80 border-teal-200/80',
    },
    {
      label: 'Inactive Subcategories',
      value: inactiveSubcategories,
      accentColor: 'bg-slate-500',
      iconBg: 'bg-slate-50 text-slate-700',
      icon: XCircle,
      suffix: ' Inactive',
      statusTag: 'Delisted / Hidden',
      subLabel: 'Hidden from Catalog',
      tagColor: 'text-slate-700 bg-slate-50/80 border-slate-200/80',
    }
  ];

  return (
    <div
      className={
        embedded
          ? "w-full space-y-6 sm:space-y-8"
          : "min-h-dvh bg-[#f6f9f7] flex flex-col lg:flex-row font-sans antialiased text-slate-800 selection:bg-emerald-100 selection:text-emerald-900"
      }
    >
      {!embedded && <Sidebar />}

      <div
        className={
          embedded
            ? "w-full space-y-6 sm:space-y-8"
            : "flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pt-20 sm:pt-22 lg:pt-22 overflow-y-auto max-h-dvh w-full space-y-6 sm:space-y-8"
        }
      >
        <PageHeader
          icon={Layers3}
          badge="Product Management"
          badgeIcon={Layers3}
          title="Subcategory Catalog"
          subtitle="Manage subcategories and department mappings."
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          actionButtonText="Add Subcategory"
          actionButtonIcon={Plus}
          onActionClick={openAddPanel}
        />

        {(errorMessage || successMessage) && (
          <div
            className={`px-5 py-3.5 rounded-2xl border text-xs font-semibold ${
              errorMessage
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
          >
            {errorMessage || successMessage}
          </div>
        )}

        <section className="w-full">
          <div
            className="bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow p-5 sm:p-6"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
              {/* Left Side: Category Dropdown & Search Input */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full lg:w-auto flex-1 max-w-2xl">
                <div className="w-full sm:w-56 shrink-0">
                  <CategorySelect
                    value={categoryFilterId}
                    options={categoryFilterOptions}
                    placeholder="All Categories"
                    loading={categoriesLoading}
                    onChange={handleCategoryFilterChange}
                  />
                </div>

                <div className="relative w-full flex-1">
                  <Search className="absolute left-3.5 top-2.5 text-slate-400" size={15} />

                  <input
                    type="text"
                    placeholder="Search subcategories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-black focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Right Side: Status Filter Buttons in Emerald Green */}
              <div className="flex items-center gap-2 shrink-0">
                {['All', 'Active', 'Inactive'].map((status) => {
                  const isSelected = statusFilter === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => handleStatusFilter(status)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 border border-emerald-600'
                          : 'bg-slate-50 hover:bg-emerald-50/70 hover:text-emerald-700 text-slate-600 border border-slate-200 hover:border-emerald-200'
                      }`}
                    >
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                      <span>{status}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-[10px] font-semibold text-slate-400 mb-3">
              {categoryFilterId === 'all'
                ? 'Showing subcategories across all categories. Select a specific category from the dropdown to reorder items.'
                : canReorder
                ? 'Use the arrows (or drag the handle on desktop) to change the display order inside this category.'
                : 'Reordering is available when status is All and the search box is empty.'}
            </p>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[760px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] uppercase font-semibold tracking-wider text-black bg-slate-50/80">
                    <th className="py-3.5 px-4 rounded-l-xl">Subcategory</th>
                    <th className="py-3.5 px-4">Parent Category</th>
                    <th className="py-3.5 px-4 text-center">Display Order</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right rounded-r-xl min-w-[220px]">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center">
                        <div className="flex flex-col items-center gap-3 text-slate-400">
                          <Loader2 size={28} className="animate-spin text-emerald-600" />
                          <span className="text-xs font-semibold">
                            Loading subcategories...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : subcategories.length > 0 ? (
                    subcategories.map((subcategory, idx) => (
                      <tr
                        key={subcategory.id || idx}
                        onDragOver={(e) => {
                          if (canReorder && dragId) {
                            e.preventDefault();
                            setDragOverId(subcategory.id);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleDrop(subcategory);
                        }}
                        className={`text-xs font-semibold text-black hover:bg-emerald-50/40 transition-colors group ${
                          dragOverId === subcategory.id &&
                          dragId !== subcategory.id
                            ? 'bg-emerald-50'
                            : ''
                        } ${dragId === subcategory.id ? 'opacity-50' : ''}`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 group-hover:border-emerald-300 transition-colors overflow-hidden">
                              {subcategory.imageUrl || subcategory.image ? (
                                <img
                                  src={subcategory.imageUrl || subcategory.image}
                                  alt={subcategory.name}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <Layers3 size={17} className="text-emerald-600" />
                              )}
                            </div>

                            <div className="flex flex-col">
                              <span className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
                                {subcategory.name || '-'}
                              </span>

                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200/80 w-fit mt-0.5">
                                {String(subcategory.categoryName || '').trim() ||
                                  'Subcategory'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 align-middle">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-2xs">
                            {String(subcategory.categoryName || '').trim() || '-'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <OrderControls
                            order={subcategory.displayOrder}
                            canReorder={canReorder}
                            busy={Boolean(movingId)}
                            isMoving={movingId === subcategory.id}
                            upDisabled={idx === 0}
                            downDisabled={idx === subcategories.length - 1 && !hasMore}
                            onUp={() => handleMoveUp(subcategory, idx)}
                            onDown={() => handleMoveDown(subcategory, idx)}
                            onMoveToPosition={(pos) => handleMoveToPosition(subcategory, pos)}
                            dragHandleProps={getDragHandleProps(subcategory)}
                          />
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border transition-all duration-300 group-hover:scale-105 ${
                              subcategory.active === true
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                                : 'bg-rose-50 text-rose-700 border-rose-200/80'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                subcategory.active === true
                                  ? 'bg-emerald-500'
                                  : 'bg-rose-500'
                              }`}
                            />
                            {subcategory.active === true ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openViewPanel(subcategory)}
                              disabled={actionLoading === subcategory.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/90 hover:border-slate-300 text-xs font-bold shadow-2xs hover:shadow-xs transition-all cursor-pointer disabled:opacity-40"
                              title="View Subcategory"
                            >
                              {actionLoading === subcategory.id ? (
                                <Loader2 size={13} className="animate-spin text-emerald-600" />
                              ) : (
                                <Eye size={13} className="text-slate-500" />
                              )}
                              <span>View</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditPanel(subcategory)}
                              disabled={actionLoading === subcategory.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-200/90 hover:border-emerald-600 text-xs font-bold shadow-2xs hover:shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-40"
                              title="Edit Subcategory"
                            >
                              {actionLoading === subcategory.id ? (
                                <Loader2 size={13} className="animate-spin text-emerald-600" />
                              ) : (
                                <Edit3 size={13} />
                              )}
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStatusChange(subcategory)}
                              disabled={actionLoading === subcategory.id}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all shadow-2xs cursor-pointer disabled:opacity-40 ${
                                subcategory.active === false
                                  ? 'bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border-emerald-200/90 hover:border-emerald-600 hover:shadow-emerald-600/20'
                                  : 'bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border-rose-200/90 hover:border-rose-600 hover:shadow-rose-600/20'
                              }`}
                              title={
                                subcategory.active === false
                                  ? 'Activate Subcategory'
                                  : 'Deactivate Subcategory'
                              }
                            >
                              {actionLoading === subcategory.id ? (
                                <Loader2 size={13} className="animate-spin text-emerald-600" />
                              ) : subcategory.active === false ? (
                                <>
                                  <Power size={13} />
                                  <span>Enable</span>
                                </>
                              ) : (
                                <>
                                  <PowerOff size={13} />
                                  <span>Disable</span>
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center">
                        <Layers3 size={35} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-xs font-semibold text-slate-400">
                          No matching subcategory records found.
                        </p>
                        <button
                          type="button"
                          onClick={openAddPanel}
                          className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                        >
                          <Plus size={14} />
                          <span>Add New Subcategory</span>
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3">
              {loading ? (
                <div className="py-10 text-center text-xs font-semibold text-slate-400">
                  Loading subcategories...
                </div>
              ) : subcategories.length > 0 ? (
                subcategories.map((subcategory, idx) => (
                  <div
                    key={subcategory.id || idx}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 hover:bg-white hover:shadow-md transition-all space-y-3 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center overflow-hidden">
                          {subcategory.imageUrl || subcategory.image ? (
                            <img
                              src={subcategory.imageUrl || subcategory.image}
                              alt={subcategory.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <Layers3 size={16} />
                          )}
                        </div>

                        <div>
                          <h4 className="font-semibold text-sm text-black group-hover:text-emerald-700 transition-colors">
                            {subcategory.name || '-'}
                          </h4>

                          <p className="text-[10px] text-slate-400">
                            {String(subcategory.categoryName || '').trim() ||
                              'Subcategory'}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          subcategory.active === true
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            subcategory.active === true
                              ? 'bg-emerald-500'
                              : 'bg-rose-500'
                          }`}
                        />
                        {subcategory.active === true ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-black block">
                          Parent Category
                        </span>
                        <span className="text-slate-500 font-semibold">
                          {String(subcategory.categoryName || '').trim() || '-'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-semibold text-black block">
                          Display Order
                        </span>
                        <OrderControls
                          order={subcategory.displayOrder}
                          canReorder={canReorder}
                          busy={Boolean(movingId)}
                          isMoving={movingId === subcategory.id}
                          upDisabled={idx === 0}
                          downDisabled={idx === subcategories.length - 1 && !hasMore}
                          onUp={() => handleMoveUp(subcategory, idx)}
                          onDown={() => handleMoveDown(subcategory, idx)}
                          onMoveToPosition={(pos) => handleMoveToPosition(subcategory, pos)}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
                      <button
                        type="button"
                        onClick={() => openViewPanel(subcategory)}
                        disabled={actionLoading === subcategory.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200 text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-40"
                        title="View Subcategory"
                      >
                        {actionLoading === subcategory.id ? (
                          <Loader2 size={13} className="animate-spin text-emerald-600" />
                        ) : (
                          <Eye size={13} className="text-slate-500" />
                        )}
                        <span>View</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditPanel(subcategory)}
                        disabled={actionLoading === subcategory.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-200 text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-40"
                        title="Edit Subcategory"
                      >
                        {actionLoading === subcategory.id ? (
                          <Loader2 size={13} className="animate-spin text-emerald-600" />
                        ) : (
                          <Edit3 size={13} />
                        )}
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStatusChange(subcategory)}
                        disabled={actionLoading === subcategory.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shadow-2xs cursor-pointer disabled:opacity-40 ${
                          subcategory.active === false
                            ? 'bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border-emerald-200'
                            : 'bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border-rose-200'
                        }`}
                        title={
                          subcategory.active === false
                            ? 'Activate Subcategory'
                            : 'Deactivate Subcategory'
                        }
                      >
                        {actionLoading === subcategory.id ? (
                          <Loader2 size={13} className="animate-spin text-emerald-600" />
                        ) : subcategory.active === false ? (
                          <>
                            <Power size={13} />
                            <span>Enable</span>
                          </>
                        ) : (
                          <>
                            <PowerOff size={13} />
                            <span>Disable</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center">
                  <Layers3 size={35} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-xs font-semibold text-slate-400">
                    No subcategories found.
                  </p>
                  <button
                    type="button"
                    onClick={openAddPanel}
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add New Subcategory</span>
                  </button>
                </div>
              )}
            </div>

            <InfiniteScrollFooter
              loading={isLoadingMore}
              hasMore={hasMore}
              error={loadMoreError}
              totalElements={totalElements}
              loadedCount={subcategories.length}
              label="subcategories"
              onLoadMore={handleLoadMore}
              onRetry={handleRetryLoadMore}
            />
          </div>
        </section>
      </div>

      {isPanelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
          <div
            className="bg-white rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-6 shadow-2xl border border-slate-100 relative"
          >
              <button
                type="button"
                onClick={closePanel}
                disabled={saving}
                className="absolute right-5 top-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50 z-10"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3.5 mb-6 pr-8">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-2xl flex items-center justify-center">
                  {isViewMode ? (
                    <Eye size={20} />
                  ) : editingSubcategory ? (
                    <Edit3 size={20} />
                  ) : (
                    <Plus size={20} />
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 tracking-wider uppercase">
                    Subcategory Management
                  </span>

                  <h3 className="text-lg font-bold text-black">
                    {isViewMode
                      ? 'View Subcategory'
                      : editingSubcategory
                      ? 'Update Subcategory'
                      : 'Create Subcategory'}
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
                    Parent Category
                  </label>

                  <CategorySelect
                    value={formData.categoryId}
                    options={categories}
                    placeholder="Select category"
                    loading={categoriesLoading}
                    disabled={categoriesLoading || saving || isViewMode}
                    onChange={handleCategoryChange}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-black uppercase tracking-wider mb-1.5">
                    Subcategory Name
                  </label>

                  <input
                    required
                    type="text"
                    placeholder="e.g. Leafy Greens"
                    value={formData.name}
                    disabled={isViewMode}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full h-[38px] px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-black focus:outline-none focus:border-emerald-500 focus:bg-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div>
                      <span className="text-[10px] font-bold text-black uppercase tracking-wider block">
                        Status
                      </span>

                      <span className="text-[10px] text-slate-400">
                        {formData.status}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={isViewMode}
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          status: prev.status === 'Active' ? 'Inactive' : 'Active'
                        }))
                      }
                      className={`relative w-11 h-6 rounded-full transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                        formData.status === 'Active' ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                          formData.status === 'Active' ? 'left-6' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-bold text-black uppercase tracking-wider">
                      Subcategory Image
                    </label>

                    {!isViewMode && formData.imageUrl && (
                      <label
                        htmlFor="subcategory-image"
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                          saving
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer'
                        }`}
                      >
                        <Upload size={13} />
                        Change Image
                      </label>
                    )}
                  </div>

                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50/60">
                    {formData.imageUrl ? (
                      <div className="relative">
                        <div className="w-full h-48 rounded-xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center">
                          <img
                            src={formData.imageUrl}
                            alt={formData.name || 'Subcategory preview'}
                            className="w-full h-full object-contain"
                          />
                        </div>

                        <div className="absolute top-2 right-2 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setViewImageUrl(formData.imageUrl)}
                            className="p-1.5 rounded-md bg-white/90 text-slate-700 shadow"
                            title="View"
                          >
                            <Eye size={13} />
                          </button>

                          {!isViewMode && (
                            <button
                              type="button"
                              onClick={removeImage}
                              disabled={saving}
                              className="p-1.5 rounded-md bg-rose-500 text-white shadow disabled:opacity-50"
                              title="Remove"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>

                        {formData.imageFile && (
                          <p className="text-[10px] font-semibold text-emerald-700 truncate mt-2">
                            {formData.imageFile.name}
                          </p>
                        )}
                      </div>
                    ) : isViewMode ? (
                      <div className="py-8 flex flex-col items-center justify-center gap-2">
                        <ImageIcon size={24} className="text-slate-300" />
                        <span className="text-[10px] font-semibold text-slate-400">
                          No subcategory image
                        </span>
                      </div>
                    ) : (
                      <label
                        htmlFor="subcategory-image"
                        className="flex flex-col items-center justify-center cursor-pointer py-5"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-3">
                          <Upload size={22} />
                        </div>

                        <span className="text-xs font-bold text-slate-700">
                          Upload Subcategory Image
                        </span>

                        <span className="text-[10px] text-slate-400 mt-1">
                          PNG, JPG, JPEG or WEBP
                        </span>

                        <span className="text-[10px] text-slate-400">Maximum size 5MB</span>
                      </label>
                    )}

                    <input
                      id="subcategory-image"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleImageChange}
                      disabled={saving || isViewMode}
                      className="hidden"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={closePanel}
                    disabled={saving}
                    className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {isViewMode ? 'Close' : 'Cancel'}
                  </button>

                  {!isViewMode && (
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl flex items-center gap-1.5 text-xs font-bold shadow-sm transition-colors cursor-pointer"
                    >
                      {saving ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Save size={14} />
                      )}
                      {saving
                        ? 'Saving...'
                        : editingSubcategory
                        ? 'Update Subcategory'
                        : 'Save Subcategory'}
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