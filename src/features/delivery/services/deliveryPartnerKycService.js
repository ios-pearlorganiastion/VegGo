import apiClient from "../../../api/axiosInstance";
import { DELIVERY_ENDPOINTS } from "../../../constants/endpoints.constants";

// Get All Delivery Partners
// params: search, kycStatus, applicationState (DRAFT | UNDER_REVIEW | APPROVED | REJECTED),
//         isOnline, page, size, sort
// Note: if both kycStatus and applicationState are sent, applicationState wins (backend rule).
export const getDeliveryPartners = async (params = {}) => {
  const response = await apiClient.get(
    DELIVERY_ENDPOINTS.BASE,
    {
      params,
    }
  );

  return response.data;
};

// Review queue: only applications that are UNDER_REVIEW, oldest first. Drafts are never here.
export const getPendingDeliveryKyc = async (page = 0, size = 20) => {
  const queryParams = typeof page === "object" ? page : { page, size };
  const response = await apiClient.get(
    DELIVERY_ENDPOINTS.KYC_PENDING,
    {
      params: {
        page: 0,
        size: 20,
        ...queryParams,
      },
    }
  );

  return response.data;
};

// Get Delivery Partner KYC Details (any rider, including drafts) - includes history[]
export const getDeliveryKycDetails = async (
  deliveryPartnerUserId
) => {
  const response = await apiClient.get(
    DELIVERY_ENDPOINTS.KYC_DETAIL(deliveryPartnerUserId)
  );

  return response.data;
};

// Approve Delivery Partner KYC (409 KYC_NOT_UNDER_REVIEW unless the application is under review)
export const approveDeliveryKyc = async (
  deliveryPartnerUserId
) => {
  const response = await apiClient.put(
    DELIVERY_ENDPOINTS.KYC_APPROVE(deliveryPartnerUserId)
  );

  return response.data;
};

// Reject Delivery Partner KYC
// reason   : required, not blank, max 500 characters
// sections : optional array of BASIC_INFO | LICENSE | VEHICLE | BANK
//            sent as repeated params: ?reason=...&sections=LICENSE&sections=BANK
export const rejectDeliveryKyc = async (
  deliveryPartnerUserId,
  reason,
  sections = []
) => {
  const searchParams = new URLSearchParams();
  searchParams.append("reason", (reason || "").trim());
  (Array.isArray(sections) ? sections : []).forEach((section) =>
    searchParams.append("sections", section)
  );

  const response = await apiClient.put(
    DELIVERY_ENDPOINTS.KYC_REJECT(deliveryPartnerUserId),
    null,
    {
      params: searchParams,
    }
  );

  return response.data;
};

// Export Delivery Partners PDF Dossier (accepts applicationState too)
export const exportDeliveryPdf = async (params = {}) => {
  const response = await apiClient.get(
    DELIVERY_ENDPOINTS.EXPORT_PDF,
    {
      params,
      responseType: "blob",
    }
  );

  return response.data;
};
