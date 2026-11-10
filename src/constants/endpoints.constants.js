/**
 * Feature-Based API Endpoints
 * Centralizes all backend REST endpoints categorized by module
 */

// Authentication & Session
export const AUTH_ENDPOINTS = Object.freeze({
  LOGIN: '/api/auth/admin/login',
});

// Admin Dashboard & Telemetry
export const DASHBOARD_ENDPOINTS = Object.freeze({
  OVERVIEW: '/api/admin/dashboard',
});

// Customer Management & Moderation
export const CUSTOMER_ENDPOINTS = Object.freeze({
  STATS: '/api/admin/customers/stats',
  BASE: '/api/admin/users/customers',
  EXPORT_PDF: '/api/admin/users/customers/export/pdf',
  LEGACY_BASE: '/api/admin/customers',
  DETAILS: (customerUserId) => `/api/admin/customers/${customerUserId}`,
  DELETE: (customerUserId) => `/api/admin/customers/${customerUserId}`,
  BLOCK: (customerUserId) => `/api/admin/customers/${customerUserId}/block`,
  UNBLOCK: (customerUserId) => `/api/admin/customers/${customerUserId}/unblock`,
  MODERATION_STATS: '/api/admin/customers/moderation/stats',
  MODERATION_LIST: '/api/admin/customers/moderation',
});

// Vendor Partner Verification & KYC
export const VENDOR_ENDPOINTS = Object.freeze({
  BASE: '/api/admin/users/vendors',
  EXPORT_PDF: '/api/admin/users/vendors/export/pdf',
  KYC_PENDING: '/api/admin/vendors/kyc/pending',
  KYC_DETAIL: (vendorShopId) => `/api/admin/vendors/kyc/${vendorShopId}`,
  KYC_APPROVE: (vendorShopId) => `/api/admin/vendors/kyc/${vendorShopId}/approve`,
  KYC_REJECT: (vendorShopId) => `/api/admin/vendors/kyc/${vendorShopId}/reject`,
});

// Delivery Fleet Verification & KYC
export const DELIVERY_ENDPOINTS = Object.freeze({
  BASE: '/api/admin/users/delivery',
  EXPORT_PDF: '/api/admin/users/delivery/export/pdf',
  KYC_PENDING: '/api/admin/delivery-partners/kyc/pending',
  KYC_DETAIL: (deliveryPartnerUserId) => `/api/admin/delivery-partners/kyc/${deliveryPartnerUserId}`,
  KYC_APPROVE: (deliveryPartnerUserId) => `/api/admin/delivery-partners/kyc/${deliveryPartnerUserId}/approve`,
  KYC_REJECT: (deliveryPartnerUserId) => `/api/admin/delivery-partners/kyc/${deliveryPartnerUserId}/reject`,
  CHANGE_REQUESTS: '/api/admin/delivery-partners/change-requests',
  CHANGE_REQUEST_DETAIL: (requestId) => `/api/admin/delivery-partners/change-requests/${requestId}`,
  CHANGE_REQUEST_APPROVE: (requestId) => `/api/admin/delivery-partners/change-requests/${requestId}/approve`,
  CHANGE_REQUEST_REJECT: (requestId) => `/api/admin/delivery-partners/change-requests/${requestId}/reject`,
});

// Produce Catalog, Categories, and Subcategories
export const CATALOG_ENDPOINTS = Object.freeze({
  PRODUCTS: '/api/admin/catalog/products',
  PRODUCT_BY_ID: (productId) => `/api/admin/catalog/products/${productId}`,
  PRODUCT_STATUS: (productId) => `/api/admin/catalog/products/${productId}/status`,
  PRODUCT_IMAGES: (productId) => `/api/admin/catalog/products/${productId}/images`,
  PRODUCT_IMAGE_DELETE: (productId, imageId) => `/api/admin/catalog/products/${productId}/images/${imageId}`,
  PRODUCT_IMAGES_REORDER: (productId) => `/api/admin/catalog/products/${productId}/images/reorder`,
  // CATEGORIES / SUBCATEGORIES are used for CREATE (POST) only.
  // Listing now goes through the paginated *_SEARCH endpoints below.
  CATEGORIES: '/api/admin/catalog/categories',
  CATEGORIES_SEARCH: '/api/admin/catalog/categories/search',
  CATEGORY_BY_ID: (categoryId) => `/api/admin/catalog/categories/${categoryId}`,
  CATEGORY_STATUS: (categoryId) => `/api/admin/catalog/categories/${categoryId}/status`,
  CATEGORY_MOVE: (categoryId) => `/api/admin/catalog/categories/${categoryId}/move`,
  SUBCATEGORIES: '/api/admin/catalog/subcategories',
  SUBCATEGORIES_SEARCH: '/api/admin/catalog/subcategories/search',
  SUBCATEGORY_BY_ID: (subcategoryId) => `/api/admin/catalog/subcategories/${subcategoryId}`,
  SUBCATEGORY_STATUS: (subcategoryId) => `/api/admin/catalog/subcategories/${subcategoryId}/status`,
  SUBCATEGORY_MOVE: (subcategoryId) => `/api/admin/catalog/subcategories/${subcategoryId}/move`,
});

// Payouts & Platform Wallet
export const PAYOUT_ENDPOINTS = Object.freeze({
  PAYOUTS: '/api/v1/admin/payouts',
  APPROVE: (payoutRequestId) => `/api/v1/admin/payouts/${payoutRequestId}/approve`,
  REJECT: (payoutRequestId) => `/api/v1/admin/payouts/${payoutRequestId}/reject`,
  WALLET_BALANCE: '/api/payment/wallet/balance',
  WALLET_TRANSACTIONS: '/api/payment/wallet/transactions',
});

// Complaints Management
export const COMPLAINT_ENDPOINTS = Object.freeze({
  STATS: '/api/admin/complaints/stats',
  BASE: '/api/admin/complaints',
  DETAILS: (complaintId) => `/api/admin/complaints/${complaintId}`,
  UPDATE_STATUS: (complaintId) => `/api/admin/complaints/${complaintId}/status`,
});

// Platform Settings
export const SETTINGS_ENDPOINTS = Object.freeze({
  SETTINGS: '/api/admin/settings',
});

// Marketing: Coupons (admin)
export const COUPON_ENDPOINTS = Object.freeze({
  BASE: '/api/admin/coupons',
  BY_ID: (couponId) => `/api/admin/coupons/${couponId}`,
  STATUS: (couponId) => `/api/admin/coupons/${couponId}/status`,
  REDEMPTIONS: (couponId) => `/api/admin/coupons/${couponId}/redemptions`,
});

// Marketing: Banners (admin)
export const BANNER_ENDPOINTS = Object.freeze({
  BASE: '/api/admin/banners',
  BY_ID: (bannerId) => `/api/admin/banners/${bannerId}`,
  STATUS: (bannerId) => `/api/admin/banners/${bannerId}/status`,
});

// Unified Endpoints Registry
export const ENDPOINTS = Object.freeze({
  AUTH: AUTH_ENDPOINTS,
  DASHBOARD: DASHBOARD_ENDPOINTS,
  CUSTOMERS: CUSTOMER_ENDPOINTS,
  VENDORS: VENDOR_ENDPOINTS,
  DELIVERY: DELIVERY_ENDPOINTS,
  CATALOG: CATALOG_ENDPOINTS,
  PAYOUTS: PAYOUT_ENDPOINTS,
  COMPLAINTS: COMPLAINT_ENDPOINTS,
  SETTINGS: SETTINGS_ENDPOINTS,
  COUPONS: COUPON_ENDPOINTS,
  BANNERS: BANNER_ENDPOINTS,
});

export default ENDPOINTS;
